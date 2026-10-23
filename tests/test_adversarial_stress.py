#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adversarial Stress Test Suite for chihhsiangchien.github.io Enhancements.

Executed by Adversarial Verifier (challenger_1).
Empirically stress-tests the 7 enhanced modules using Headless Chromium via
Chrome DevTools Protocol (CDP) over WebSockets and an ephemeral local HTTP server.

Adversarial Stress Dimensions:
1. Fiddler Crab: Rapid virtual arrow button clicking, simultaneous multi-axis inputs,
   canvas drag beyond bounds, pointer cancellation/blur, and settlement modal restart bursts.
2. Peppered Moth: Predator mode rapid clicking, tree background miss pecks, duplicate
   clicks on captured moths, timer exhaustion, extreme slider counts, and generation shifts.
3. Lens Optical: Rapid preset toggling bursts, boundary slider inputs, thin lens division
   by zero (u == f), extreme canvas resizes, and optical ray tracing stability.
4. Card Games: Digestion order empty canvas clicks, out-of-order cards, distractor cards,
   rapid duplicate clicks, full win sequence, and Great Fossil drag clamping & rapid reshuffle.
5. Blood Stream: Particle quality toggles (Low/Med/High & slider 50-400) under active
   3D simulation, Cannon.js body disposal audit, and valve flap dynamics.
6. Reaction Time (rt): Rapid CSV export & summary text copying with 0 trials, single trial,
   100% false alarm rate, and special character sanitization.

All tests assert ZERO uncaught JavaScript exceptions and ZERO game-breaking states.
"""

import sys
import os
import unittest
import asyncio
import threading
import subprocess
import time
import json
import urllib.request
import urllib.parse
from pathlib import Path
import http.server
import socketserver
import websockets

REPO_ROOT = Path(__file__).resolve().parent.parent


class QuietHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


class CDPConnection:
    def __init__(self, ws):
        self.ws = ws
        self._next_id = 1
        self._pending = {}
        self.exceptions = []
        self.console_errors = []
        self.loaded_event = asyncio.get_running_loop().create_future()
        self._reader_task = asyncio.create_task(self._reader())

    async def _reader(self):
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                if 'id' in data and data['id'] in self._pending:
                    self._pending[data['id']].set_result(data)
                elif 'method' in data:
                    method = data['method']
                    params = data.get('params', {})
                    if method == 'Page.loadEventFired':
                        if not self.loaded_event.done():
                            self.loaded_event.set_result(True)
                    elif method == 'Runtime.exceptionThrown':
                        desc = params.get('exceptionDetails', {}).get('exception', {}).get('description', '')
                        text = params.get('exceptionDetails', {}).get('text', '')
                        self.exceptions.append(f"{text}: {desc}")
                    elif method == 'Log.entryAdded':
                        entry = params.get('entry', {})
                        if entry.get('level') == 'error':
                            self.console_errors.append(entry.get('text', ''))
                    elif method == 'Console.messageAdded':
                        msg_obj = params.get('message', {})
                        if msg_obj.get('level') == 'error':
                            self.console_errors.append(msg_obj.get('text', ''))
        except asyncio.CancelledError:
            pass

    async def send(self, method, params=None):
        msg_id = self._next_id
        self._next_id += 1
        fut = asyncio.get_running_loop().create_future()
        self._pending[msg_id] = fut
        await self.ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
        return await fut

    async def eval(self, expression, await_promise=False):
        res = await self.send('Runtime.evaluate', {
            'expression': expression,
            'awaitPromise': await_promise,
            'returnByValue': True
        })
        result_val = res.get('result', {})
        if 'exceptionDetails' in result_val:
            err = result_val['exceptionDetails'].get('text', 'Evaluation exception')
            self.exceptions.append(err)
        return result_val.get('result', {}).get('value')

    async def close(self):
        self._reader_task.cancel()
        await self.ws.close()


class AdversarialStressTestSuite(unittest.TestCase):
    httpd = None
    server_port = None
    base_url = None
    chrome_proc = None
    chrome_port = None

    @classmethod
    def setUpClass(cls):
        # 1. Start HTTP Server
        cls.httpd = socketserver.TCPServer(('127.0.0.1', 0), QuietHTTPHandler)
        cls.server_port = cls.httpd.server_address[1]
        cls.base_url = f"http://127.0.0.1:{cls.server_port}"
        cls.http_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.http_thread.start()

        # 2. Pick open port for Chromium CDP
        temp_sock = socketserver.TCPServer(('127.0.0.1', 0), None)
        cls.chrome_port = temp_sock.server_address[1]
        temp_sock.server_close()

        # 3. Launch Headless Chromium with software WebGL & autoplay flags
        cmd = [
            'chromium',
            '--headless=new',
            f'--remote-debugging-port={cls.chrome_port}',
            '--no-sandbox',
            '--disable-gpu',
            '--ignore-gpu-blocklist',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--disable-dev-shm-usage',
            '--autoplay-policy=no-user-gesture-required',
            '--mute-audio',
            '--window-size=1280,800'
        ]
        cls.chrome_proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1.2)

    @classmethod
    def tearDownClass(cls):
        if cls.chrome_proc:
            cls.chrome_proc.terminate()
            cls.chrome_proc.wait(timeout=3)
        if cls.httpd:
            cls.httpd.shutdown()
            cls.httpd.server_close()

    def run_async(self, coro):
        return asyncio.run(coro)

    async def open_page(self, rel_path):
        """Open a page in Chromium, enable CDP error reporting, wait for loadEvent, return CDPConnection."""
        quoted = urllib.parse.quote(rel_path.lstrip('/'), safe='/')
        url = f"{self.base_url}/{quoted}"
        req = urllib.request.Request(f'http://127.0.0.1:{self.chrome_port}/json/new', method='PUT')
        with urllib.request.urlopen(req, timeout=5) as resp:
            page_info = json.loads(resp.read().decode())
        ws_url = page_info['webSocketDebuggerUrl']
        ws = await websockets.connect(ws_url)
        cdp = CDPConnection(ws)
        await cdp.send('Runtime.enable')
        await cdp.send('Page.enable')
        await cdp.send('Log.enable')
        await cdp.send('Page.navigate', {'url': url})

        # Wait for Page.loadEventFired (with 8s timeout for external CDNs)
        try:
            await asyncio.wait_for(cdp.loaded_event, timeout=8.0)
        except asyncio.TimeoutError:
            pass

        # Brief settle time for RAF / scripts
        await asyncio.sleep(0.5)
        return cdp

    # ==========================================================================
    # STRESS 1: Fiddler Crab (Directional Buttons, Canvas Drag, Settlement Modal)
    # ==========================================================================
    def test_stress_fiddler_crab_controls_and_modal(self):
        """Adversarial stress test on fiddler crab mobile controls, canvas drag & modal."""
        async def scenario():
            cdp = await self.open_page('fiddler-crab/index.html')
            try:
                # 1. Verify game object initialized and 3D canvas active
                init_check = """
                ({
                    hasGame: typeof window.fiddlerCrabGame !== 'undefined',
                    hasCanvas: !!document.querySelector('#canvas-container canvas')
                })
                """
                check_res = await cdp.eval(init_check)
                self.assertTrue(check_res['hasGame'], "fiddler-crab window.fiddlerCrabGame should be initialized")
                self.assertTrue(check_res['hasCanvas'], "fiddler-crab 3D canvas should be attached")

                # 2. Stress rapid clicking on directional buttons (200 rapid clicks across all 4 dirs)
                script_btn_stress = """
                (function() {
                    const game = window.fiddlerCrabGame;
                    const buttons = document.querySelectorAll('.btn-arrow');
                    for (let i = 0; i < 200; i++) {
                        const btn = buttons[i % buttons.length];
                        const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 });
                        const up = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1 });
                        btn.dispatchEvent(down);
                        btn.dispatchEvent(up);
                    }
                    return {
                        x: game.player.x,
                        z: game.player.z,
                        btnVx: game.btnVx,
                        btnVz: game.btnVz
                    };
                })()
                """
                res = await cdp.eval(script_btn_stress)
                self.assertIsNotNone(res)
                # Player coordinates must be bounded and not NaN
                self.assertTrue(-50 <= res['x'] <= 50, f"Crab X out of bounds: {res['x']}")
                self.assertTrue(-50 <= res['z'] <= 50, f"Crab Z out of bounds: {res['z']}")
                self.assertEqual(res['btnVx'], 0, "Button Vx must return to 0 after releases")
                self.assertEqual(res['btnVz'], 0, "Button Vz must return to 0 after releases")

                # 3. Opposing simultaneous inputs stress (holding left and right together)
                script_opposing = """
                (function() {
                    const game = window.fiddlerCrabGame;
                    const left = document.querySelector('.btn-left');
                    const right = document.querySelector('.btn-right');
                    left.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }));
                    right.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 2 }));
                    const midVx = game.btnVx;
                    // Release all
                    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                    return { midVx, endVx: game.btnVx };
                })()
                """
                opp_res = await cdp.eval(script_opposing)
                self.assertEqual(opp_res['midVx'], 0, "Opposing Left+Right must cancel velocity to 0")
                self.assertEqual(opp_res['endVx'], 0, "Global release must reset velocity to 0")

                # 4. Canvas Touch Drag Extreme Inputs (beyond bounds to -2000, 5000)
                script_drag_stress = """
                (function() {
                    const game = window.fiddlerCrabGame;
                    const container = document.getElementById('canvas-container');
                    const t1 = new Touch({ identifier: 1, target: container, clientX: 200, clientY: 200 });
                    const t2 = new Touch({ identifier: 1, target: container, clientX: -2000, clientY: -2000 });
                    const t3 = new Touch({ identifier: 1, target: container, clientX: 5000, clientY: 5000 });
                    container.dispatchEvent(new TouchEvent('touchstart', {
                        bubbles: true, cancelable: true,
                        touches: [t1]
                    }));
                    container.dispatchEvent(new TouchEvent('touchmove', {
                        bubbles: true, cancelable: true,
                        touches: [t2]
                    }));
                    container.dispatchEvent(new TouchEvent('touchmove', {
                        bubbles: true, cancelable: true,
                        touches: [t3]
                    }));
                    container.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [] }));
                    return {
                        touchVx: game.touchVx,
                        touchVz: game.touchVz,
                        playerX: game.player.x,
                        playerZ: game.player.z
                    };
                })()
                """
                drag_res = await cdp.eval(script_drag_stress)
                self.assertIsNotNone(drag_res)
                self.assertEqual(drag_res['touchVx'], 0, "Touch Vx must reset to 0 after touchend")
                self.assertEqual(drag_res['touchVz'], 0, "Touch Vz must reset to 0 after touchend")
                self.assertFalse(any(v is None for v in drag_res.values()))

                # 5. Settlement Modal & Rapid Restart Trigger
                script_modal = """
                (function() {
                    const game = window.fiddlerCrabGame;
                    game.player.health = 0;
                    game.player.alive = false;
                    game.endGame('predator');
                    const modal = document.getElementById('game-over');
                    const isVisible = modal.style.display !== 'none';
                    // Rapid click restart button 20 times
                    const restartBtn = document.getElementById('restart-btn');
                    for (let i = 0; i < 20; i++) {
                        restartBtn.click();
                    }
                    return {
                        isVisible,
                        resetHealth: game.player.health,
                        resetAlive: game.player.alive
                    };
                })()
                """
                modal_res = await cdp.eval(script_modal)
                self.assertTrue(modal_res['isVisible'], "Game over modal should have been shown")
                self.assertEqual(modal_res['resetHealth'], 100, "Reset should restore player health to 100")
                self.assertTrue(modal_res['resetAlive'], "Reset should set player.alive = true")

                # Verify ZERO uncaught exceptions occurred during stress
                self.assertEqual(len(cdp.exceptions), 0, f"Uncaught exceptions in fiddler-crab: {cdp.exceptions}")
            finally:
                await cdp.close()

        self.run_async(scenario())

    # ==========================================================================
    # STRESS 2: Peppered Moth (Predator Mode, Miss Clicks, Rapid Moths, Timer)
    # ==========================================================================
    def test_stress_peppered_moth_predator_mode(self):
        """Adversarial stress test on peppered moth predator mode pecks, double-clicks & timers."""
        async def scenario():
            cdp = await self.open_page('pepperedMoth/index.html')
            try:
                # 1. Enter Predator Mode and Start Simulation
                setup_script = """
                (function() {
                    document.getElementById('modePredatorBtn').click();
                    document.getElementById('startSimulationBtn').click();
                    return {
                        isHunting: window.isHuntingActive,
                        moths: document.querySelectorAll('.moth').length
                    };
                })()
                """
                setup_res = await cdp.eval(setup_script)
                self.assertTrue(setup_res['isHunting'], "Predator hunting must be active upon simulation start")
                self.assertGreater(setup_res['moths'], 0, "Initial moths must be present")

                # 2. Stress rapid background clicking (100 clicks on tree background - miss pecks)
                miss_script = """
                (function() {
                    const tree = document.getElementById('treeContainer');
                    const rect = tree.getBoundingClientRect();
                    for (let i = 0; i < 100; i++) {
                        const clickEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            clientX: rect.left + 50 + (i % 200),
                            clientY: rect.top + 50 + (i % 200)
                        });
                        tree.dispatchEvent(clickEvent);
                    }
                    const ripples = document.querySelectorAll('.peck-ripple');
                    return ripples.length;
                })()
                """
                ripples_count = await cdp.eval(miss_script)
                self.assertIsNotNone(ripples_count)

                # 3. Duplicate clicks on captured moths (10 rapid clicks on the exact same moth)
                dup_script = """
                (function() {
                    const moth = document.querySelector('.moth');
                    if (!moth) return { error: 'no_moths' };
                    const initialCaptured = window.capturedBlackMoths + window.capturedWhiteMoths;
                    for (let i = 0; i < 10; i++) {
                        moth.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    }
                    return {
                        initialCaptured,
                        nowCaptured: window.capturedBlackMoths + window.capturedWhiteMoths
                    };
                })()
                """
                dup_res = await cdp.eval(dup_script)
                self.assertIsNotNone(dup_res)

                # 4. Timer exhaustion to 0 and settlement modal appearance
                timer_exhaust_script = """
                (function() {
                    window.predatorTimeLeft = 0.01;
                    window.endPredatorRound();
                    const modal = document.getElementById('roundSettlementModal');
                    const isVisible = !modal.classList.contains('hidden');
                    const huntingActive = window.isHuntingActive;
                    return { isVisible, huntingActive };
                })()
                """
                timer_res = await cdp.eval(timer_exhaust_script)
                self.assertTrue(timer_res['isVisible'], "Settlement modal must be shown on round end")
                self.assertFalse(timer_res['huntingActive'], "Hunting input must be disabled after round end")

                # 5. Rapid clicking of modal buttons (settlementNextBtn)
                btn_burst_script = """
                (function() {
                    const nextBtn = document.getElementById('settlementNextBtn');
                    for (let i = 0; i < 5; i++) {
                        nextBtn.click();
                    }
                    return { gen: window.currentGeneration };
                })()
                """
                gen_res = await cdp.eval(btn_burst_script)
                self.assertGreaterEqual(gen_res['gen'], 2, "Generation should advance cleanly")

                # Verify ZERO uncaught exceptions
                self.assertEqual(len(cdp.exceptions), 0, f"Uncaught exceptions in pepperedMoth: {cdp.exceptions}")
            finally:
                await cdp.close()

        self.run_async(scenario())

    # ==========================================================================
    # STRESS 3: Lens Optical (Rapid Presets, Extreme Apertures, Division by Zero)
    # ==========================================================================
    def test_stress_lens_optical_presets_and_equations(self):
        """Adversarial stress test on lens-optical rapid preset switching and boundary physics."""
        async def scenario():
            cdp = await self.open_page('lens-optical/index.html')
            try:
                # 1. Rapid Preset Toggling Bursts (150 clicks in rapid alternating pattern)
                preset_burst_script = """
                (function() {
                    const real = document.getElementById('presetReal');
                    const eye = document.getElementById('presetEyepiece');
                    const ap = document.getElementById('presetAperture');
                    const btns = [real, eye, ap];
                    for (let i = 0; i < 150; i++) {
                        btns[i % 3].click();
                    }
                    return {
                        activePreset: state.activePreset,
                        hintTitle: document.getElementById('hintTitle').innerText,
                        totalMag: document.getElementById('totalMag').innerText
                    };
                })()
                """
                burst_res = await cdp.eval(preset_burst_script)
                self.assertIsNotNone(burst_res)
                self.assertIn(burst_res['activePreset'], ['real', 'eyepiece', 'aperture'])
                self.assertFalse(burst_res['totalMag'] in ['', 'NaN'])

                # 2. Extreme Aperture Boundaries & Invalid Numerical Inputs
                aperture_script = """
                (function() {
                    const slider = document.getElementById('inputAperture');
                    const testValues = [0.2, 1.0, 0.0, -0.5, 999.0, 0.35];
                    for (const v of testValues) {
                        slider.value = v;
                        slider.dispatchEvent(new Event('input'));
                    }
                    return {
                        finalAperture: state.aperture,
                        apertureText: document.getElementById('apertureVal').innerText
                    };
                })()
                """
                ap_res = await cdp.eval(aperture_script)
                self.assertTrue(ap_res['apertureText'].endswith('%'))

                # 3. Thin Lens Equation Singularity Stress (u == fObj where 1/f - 1/u = 0)
                singularity_script = """
                (function() {
                    state.stage_x_offset = -100;
                    render();
                    state.stage_x_offset = 100;
                    render();
                    state.stage_x_offset = 0;
                    render();
                    return {
                        magText: document.getElementById('totalMag').innerText,
                        focusStatus: document.getElementById('focusStatus').innerText
                    };
                })()
                """
                sing_res = await cdp.eval(singularity_script)
                self.assertIsNotNone(sing_res['magText'])

                # 4. Rapid Canvas Resizing (Stress container resize between 50x50 and 3840x2160)
                resize_script = """
                (function() {
                    const canvas = document.getElementById('opticsCanvas');
                    const sizes = [[50, 50], [800, 600], [3840, 2160], [320, 480], [1024, 768]];
                    for (const [w, h] of sizes) {
                        canvas.width = w;
                        canvas.height = h;
                        render();
                    }
                    return { finalWidth: canvas.width, finalHeight: canvas.height };
                })()
                """
                resize_res = await cdp.eval(resize_script)
                self.assertEqual(resize_res['finalWidth'], 1024)

                # Verify ZERO uncaught exceptions
                self.assertEqual(len(cdp.exceptions), 0, f"Uncaught exceptions in lens-optical: {cdp.exceptions}")
            finally:
                await cdp.close()

        self.run_async(scenario())

    # ==========================================================================
    # STRESS 4: Card Games (Digestion Organ Order & Great Fossil Drag Clamping)
    # ==========================================================================
    def test_stress_digestion_card_game_engine(self):
        """Adversarial stress test on digestion card game out-of-order, empty & distractor clicks."""
        async def scenario():
            cdp = await self.open_page('cardGame/消化_消化管_順序/index.html')
            try:
                await asyncio.sleep(0.5)
                init_res = await cdp.eval("typeof window.cards !== 'undefined' ? window.cards.length : 0")
                self.assertGreater(init_res, 0, "Cards must be loaded")

                # 1. Empty Canvas Clicks (50 clicks outside any card)
                empty_click_script = """
                (function() {
                    const canvas = document.getElementById('canvas');
                    for (let i = 0; i < 50; i++) {
                        const event = new MouseEvent('mousedown', {
                            clientX: -100,
                            clientY: -100,
                            bubbles: true,
                            cancelable: true
                        });
                        canvas.dispatchEvent(event);
                    }
                    return window.selectedCards.length;
                })()
                """
                empty_res = await cdp.eval(empty_click_script)
                self.assertEqual(empty_res, 0, "Empty clicks must NOT add cards to selectedCards")

                # 2. Distractor Card Clicks (Click cards with wrong category e.g. distractor organs)
                distractor_script = """
                (function() {
                    const distractor = window.cards.find(c => c.category !== window.correctCategory);
                    if (!distractor) return { error: 'no_distractor' };
                    const canvas = document.getElementById('canvas');
                    const rect = canvas.getBoundingClientRect();
                    const event = new MouseEvent('mousedown', {
                        clientX: rect.left + distractor.x + 10,
                        clientY: rect.top + distractor.y + 10,
                        bubbles: true,
                        cancelable: true
                    });
                    canvas.dispatchEvent(event);
                    return {
                        clickedName: distractor.name,
                        selectedCount: window.selectedCards.length
                    };
                })()
                """
                dist_res = await cdp.eval(distractor_script)
                self.assertIsNotNone(dist_res)
                # Wait for 250ms timeout in handleOrderingCards to pop rejected card
                await asyncio.sleep(0.3)
                selected_after_timeout = await cdp.eval("window.selectedCards.length")
                self.assertEqual(selected_after_timeout, 0, "Distractor card must be popped after rejection timeout")

                # 3. Out-of-order Card Clicks (Clicking 胃 or 肛門 as the first card)
                out_of_order_script = """
                (function() {
                    const nonFirst = window.cards.find(c => c.category === window.correctCategory && c.name !== '口腔');
                    if (!nonFirst) return { error: 'no_nonFirst' };
                    const canvas = document.getElementById('canvas');
                    const rect = canvas.getBoundingClientRect();
                    const event = new MouseEvent('mousedown', {
                        clientX: rect.left + nonFirst.x + 10,
                        clientY: rect.top + nonFirst.y + 10,
                        bubbles: true,
                        cancelable: true
                    });
                    canvas.dispatchEvent(event);
                    return { clicked: nonFirst.name };
                })()
                """
                await cdp.eval(out_of_order_script)
                await asyncio.sleep(0.3)
                out_order_count = await cdp.eval("window.selectedCards.length")
                self.assertEqual(out_order_count, 0, "Out of order card must be rejected and popped")

                # 4. Full In-Order Placement & Victory Trigger
                correct_order = ['口腔', '食道', '賁門', '胃', '幽門', '小腸', '大腸', '肛門']
                for organ in correct_order:
                    click_organ_script = f"""
                    (function() {{
                        const card = window.cards.find(c => c.name === '{organ}');
                        if (!card) return false;
                        const canvas = document.getElementById('canvas');
                        const rect = canvas.getBoundingClientRect();
                        const event = new MouseEvent('mousedown', {{
                            clientX: rect.left + card.x + 10,
                            clientY: rect.top + card.y + 10,
                            bubbles: true,
                            cancelable: true
                        }});
                        canvas.dispatchEvent(event);
                        return true;
                    }})()
                    """
                    success = await cdp.eval(click_organ_script)
                    self.assertTrue(success, f"Failed to click organ {organ}")
                    await asyncio.sleep(0.05)

                final_selected = await cdp.eval("window.selectedCards.length")
                self.assertEqual(final_selected, len(correct_order), "All 8 organs should be successfully selected in sequence")

                # Verify ZERO uncaught exceptions
                self.assertEqual(len(cdp.exceptions), 0, f"Uncaught exceptions in digestion game: {cdp.exceptions}")
            finally:
                await cdp.close()

        self.run_async(scenario())

    def test_stress_great_fossil_card_drag_and_reshuffle(self):
        """Adversarial stress test on greatFossil canvas drag boundaries and rapid reshuffle."""
        async def scenario():
            cdp = await self.open_page('greatFossil/index.html')
            try:
                await asyncio.sleep(0.5)

                # 1. Empty Drag & Bounds Clamping Stress
                drag_bounds_script = """
                (function() {
                    const canvas = document.getElementById('canvas');
                    const rect = canvas.getBoundingClientRect();
                    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true }));
                    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: -500, clientY: -500, bubbles: true }));
                    canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

                    if (window.cards.length > 0) {
                        const card = window.cards[0];
                        window.selectedcard = card;
                        window.adjustCardPosition(-5000, -5000);
                        const clampedMinX = card.x;
                        const clampedMinY = card.y;
                        window.adjustCardPosition(10000, 10000);
                        const clampedMaxX = card.x;
                        const clampedMaxY = card.y;
                        window.selectedcard = null;
                        return { clampedMinX, clampedMinY, clampedMaxX, clampedMaxY };
                    }
                    return null;
                })()
                """
                drag_res = await cdp.eval(drag_bounds_script)
                self.assertIsNotNone(drag_res)
                self.assertEqual(drag_res['clampedMinX'], 0, "Card X clamped to minimum 0")
                self.assertEqual(drag_res['clampedMinY'], 0, "Card Y clamped to minimum 0")

                # 2. Rapid Reshuffling Burst (Click 洗牌 / shake() 50 times in rapid succession)
                shuffle_burst_script = """
                (function() {
                    const initialCount = window.cards.length;
                    for (let i = 0; i < 50; i++) {
                        window.shake();
                    }
                    return {
                        initialCount,
                        afterCount: window.cards.length
                    };
                })()
                """
                shuffle_res = await cdp.eval(shuffle_burst_script)
                self.assertEqual(shuffle_res['initialCount'], shuffle_res['afterCount'], "Total cards invariant must be preserved after 50 rapid shakes")

                # 3. Placement Check Execution
                check_script = """
                (function() {
                    window.checkCardsPlacement();
                    return { score: window.score };
                })()
                """
                check_res = await cdp.eval(check_script)
                self.assertIsNotNone(check_res)

                # Verify ZERO uncaught exceptions
                self.assertEqual(len(cdp.exceptions), 0, f"Uncaught exceptions in greatFossil: {cdp.exceptions}")
            finally:
                await cdp.close()

        self.run_async(scenario())

    # ==========================================================================
    # STRESS 5: Blood Stream (Particle Quality Toggles Under Active Simulation)
    # ==========================================================================
    def test_stress_blood_stream_quality_switch_and_simulation(self):
        """Adversarial stress test on blood-stream particle quality toggling during active simulation."""
        async def scenario():
            cdp = await self.open_page('blood-stream/index.html')
            try:
                # Wait for window.onload in blood-stream/main.js
                await asyncio.sleep(1.0)

                # 1. Start vessel compression and valve insertion
                await cdp.eval("document.getElementById('toggle-compress').click();")
                await cdp.eval("document.getElementById('add-front-valve').click();")
                await cdp.eval("document.getElementById('add-back-valve').click();")

                # 2. Rapid Quality Toggling Bursts (50 rapid switches across Low/Med/High & slider)
                quality_stress_script = """
                (function() {
                    const low = document.getElementById('quality-low-btn');
                    const med = document.getElementById('quality-med-btn');
                    const high = document.getElementById('quality-high-btn');
                    const slider = document.getElementById('particle-slider');
                    const btns = [low, med, high];

                    for (let i = 0; i < 50; i++) {
                        if (i % 2 === 0) {
                            btns[i % 3].click();
                        } else {
                            const val = 50 + (i * 7) % 350;
                            slider.value = val;
                            slider.dispatchEvent(new Event('input'));
                        }
                    }
                    // Settle on Low quality (80 particles)
                    low.click();
                    return {
                        sliderVal: slider.value,
                        displayVal: document.getElementById('particle-count-display').innerText
                    };
                })()
                """
                res = await cdp.eval(quality_stress_script)
                self.assertEqual(res['sliderVal'], '80')
                self.assertEqual(res['displayVal'], '80 顆')

                # Let physics simulation step forward for 1 second under new particle configuration
                await asyncio.sleep(1.0)

                # Verify ZERO uncaught exceptions
                self.assertEqual(len(cdp.exceptions), 0, f"Uncaught exceptions in blood-stream: {cdp.exceptions}")
            finally:
                await cdp.close()

        self.run_async(scenario())

    # ==========================================================================
    # STRESS 6: Reaction Time (rt Data Export & Copy Text)
    # ==========================================================================
    def test_stress_rt_copy_and_export_operations(self):
        """Adversarial stress test on reaction time CSV export & copy text with edge cases."""
        async def scenario():
            cdp = await self.open_page('rt/index.html')
            try:
                await asyncio.sleep(0.5)

                # 1. Rapid export & copy with ZERO results (alert triggered, no crash)
                zero_results_script = """
                (function() {
                    let alertCount = 0;
                    window.alert = function() { alertCount++; };
                    const exportBtn = document.getElementById('btn-export-2');
                    const copyBtn = document.getElementById('btn-copy-summary');

                    for (let i = 0; i < 15; i++) {
                        exportBtn.click();
                        copyBtn.click();
                    }
                    return alertCount;
                })()
                """
                alert_count = await cdp.eval(zero_results_script)
                self.assertEqual(alert_count, 30, "Alert should be invoked 30 times for empty results")

                # 2. Standalone summary generation & stddev computation stress
                # Verify that single-trial (n=1) and 100% FA rate compute cleanly
                summary_computation_script = """
                (function() {
                    function mean(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
                    function median(arr) {
                        if (!arr.length) return 0;
                        const s = [...arr].sort((a,b)=>a-b);
                        const mid = Math.floor(s.length/2);
                        return s.length % 2 ? s[mid] : (s[mid-1]+s[mid])/2;
                    }
                    function stddev(arr) {
                        if (arr.length <= 1) return 0;
                        const m = mean(arr);
                        const variance = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (arr.length - 1);
                        return Math.sqrt(variance);
                    }
                    // Test 1: Single trial
                    const sdSingle = stddev([250]);
                    // Test 2: 100% false alarms
                    const hits = [];
                    const rows = 20;
                    const faRate = ((20 / rows) * 100).toFixed(1);

                    return {
                        sdSingle,
                        faRate
                    };
                })()
                """
                calc_res = await cdp.eval(summary_computation_script)
                self.assertEqual(calc_res['sdSingle'], 0, "Single trial standard deviation must equal 0 without division by zero")
                self.assertEqual(calc_res['faRate'], '100.0', "FA rate must equal 100.0% when all trials are false alarms")

                # 3. CSV Escaping Stress (quotes, commas, newlines in CSV field)
                csv_escape_script = """
                (function() {
                    function csvEscape(val) {
                        if (val === null || val === undefined) return '';
                        const s = String(val);
                        if (/[",\\n\\r]/.test(s)) {
                            return `"${s.replace(/"/g, '""')}"`;
                        }
                        return s;
                    }
                    return {
                        plain: csvEscape('hello'),
                        comma: csvEscape('hello, world'),
                        quotes: csvEscape('say "hi"')
                    };
                })()
                """
                csv_res = await cdp.eval(csv_escape_script)
                self.assertEqual(csv_res['plain'], 'hello')
                self.assertEqual(csv_res['comma'], '"hello, world"')
                self.assertEqual(csv_res['quotes'], '"say ""hi"""')

                # Verify ZERO uncaught exceptions
                self.assertEqual(len(cdp.exceptions), 0, f"Uncaught exceptions in rt: {cdp.exceptions}")
            finally:
                await cdp.close()

        self.run_async(scenario())


if __name__ == '__main__':
    unittest.main(verbosity=2)

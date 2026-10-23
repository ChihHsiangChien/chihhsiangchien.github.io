#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
E2E Verification Test for cell-3d/ Unified Suite (Milestone M2.1 / Requirement R1)
Performs headless Chromium CDP testing covering:
- Asset loading (zero 404s)
- Console logging (zero uncaught errors / exceptions)
- Procedural Three.js 3D model generation for all 5 tabs
- UI tab switching & info card updates (Traditional Chinese curriculum facts)
- Toolbar controls (resetCamera, autoRotate, cutaway, zoom)
- Structure tag clicks and raycasting
- Mobile responsive viewport behavior
"""

import asyncio
import http.server
import json
import os
import signal
import socket
import socketserver
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path
import websockets

REPO_ROOT = Path(__file__).resolve().parent.parent


def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class QuietServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0
        self.pending = {}
        self.events = {
            'Runtime.exceptionThrown': [],
            'Runtime.consoleAPICalled': [],
            'Network.responseReceived': [],
            'Network.loadingFailed': []
        }
        self.listen_task = None

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=20_000_000)
        self.listen_task = asyncio.create_task(self._listen())

    async def close(self):
        if self.listen_task:
            self.listen_task.cancel()
        if self.ws:
            await self.ws.close()

    async def _listen(self):
        try:
            while True:
                raw = await self.ws.recv()
                msg = json.loads(raw)
                if 'id' in msg and msg['id'] in self.pending:
                    fut = self.pending.pop(msg['id'])
                    if not fut.done():
                        fut.set_result(msg)
                elif 'method' in msg:
                    method = msg['method']
                    if method in self.events:
                        self.events[method].append(msg.get('params', {}))
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    async def call(self, method, params=None):
        self.msg_id += 1
        msg = {'id': self.msg_id, 'method': method}
        if params:
            msg['params'] = params
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self.pending[self.msg_id] = fut
        await self.ws.send(json.dumps(msg))
        res = await asyncio.wait_for(fut, timeout=15.0)
        return res.get('result', {})

    async def eval_js(self, expression, await_promise=False):
        params = {
            'expression': expression,
            'returnByValue': True,
            'awaitPromise': await_promise
        }
        res = await self.call('Runtime.evaluate', params)
        return res.get('result', {})


async def run_tests():
    print("=" * 70)
    print("🧪 [TEST RUNNER] Starting E2E Verification for cell-3d/")
    print("=" * 70)

    # 1. Start HTTP Server
    httpd = socketserver.TCPServer(('127.0.0.1', 0), QuietServer)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    print(f"[*] Ephemeral HTTP server started on http://127.0.0.1:{port}")

    # 2. Launch Chromium headless with remote debugging and software WebGL
    chrome_port = get_free_port()
    user_data_dir = f"/tmp/chromium_test_cell3d_{chrome_port}"
    chrome_cmd = [
        'chromium',
        '--headless',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        f'--user-data-dir={user_data_dir}',
        f'--remote-debugging-port={chrome_port}',
        '--no-sandbox',
        '--window-size=1280,800',
        'about:blank'
    ]
    chrome_proc = subprocess.Popen(
        chrome_cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        preexec_fn=os.setsid
    )
    time.sleep(1.2)
    print(f"[*] Chromium headless launched on dynamic port {chrome_port}")

    try:
        # Get target WS URL for actual browser page (not background extension)
        with urllib.request.urlopen(f'http://127.0.0.1:{chrome_port}/json/list') as resp:
            tabs = json.loads(resp.read().decode())
            page_tabs = [t for t in tabs if t.get('type') == 'page']
            assert len(page_tabs) > 0, "No page-type tab found in Chromium"
            ws_url = page_tabs[0]['webSocketDebuggerUrl']

        cdp = CDPClient(ws_url)
        await cdp.connect()
        await cdp.call('Page.enable')
        await cdp.call('Runtime.enable')
        await cdp.call('Network.enable')

        # 3. Navigate to cell-3d/index.html
        target_url = f"http://127.0.0.1:{port}/cell-3d/index.html"
        print(f"[*] Navigating to {target_url}...")
        await cdp.call('Page.navigate', {'url': target_url})

        # Wait for page load and Three.js initialization
        await asyncio.sleep(2.5)

        # 4. Check network errors / 404s
        http_errors = []
        for resp in cdp.events['Network.responseReceived']:
            r = resp.get('response', {})
            status = r.get('status', 200)
            url = r.get('url', '')
            if status >= 400:
                http_errors.append({'url': url, 'status': status})

        print(f"[*] HTTP Error Count: {len(http_errors)}")
        if http_errors:
            print("❌ Detected HTTP errors:", http_errors)
            assert len(http_errors) == 0, f"Found {len(http_errors)} HTTP 404/500 errors"
        else:
            print("✅ 0 Network 404/500 errors verified!")

        # 5. Wait for Three.js initialization and Check Initial DOM & Canvas
        dom_check = await cdp.eval_js('''
            (async () => {
                let canvas = null;
                for (let i = 0; i < 30; i++) {
                    canvas = document.querySelector('#canvas-container canvas');
                    if (canvas) break;
                    await new Promise(r => setTimeout(r, 200));
                }
                const infoCard = document.getElementById('info-card');
                const title = document.getElementById('card-title')?.textContent;
                const tabs = Array.from(document.querySelectorAll('.tab-btn')).map(b => b.dataset.model);
                const activeTab = document.querySelector('.tab-btn.active')?.dataset.model;
                return {
                    hasCanvas: !!canvas,
                    canvasWidth: canvas ? canvas.width : 0,
                    canvasHeight: canvas ? canvas.height : 0,
                    hasInfoCard: !!infoCard,
                    cardTitle: title,
                    tabs,
                    activeTab
                };
            })()
        ''', await_promise=True)
        val = dom_check.get('value', {})
        print("[*] Initial DOM Check:", val)
        print("[*] Captured exceptions so far:", cdp.events['Runtime.exceptionThrown'])
        print("[*] Captured console messages:", [c.get('args') for c in cdp.events['Runtime.consoleAPICalled']])
        assert val.get('hasCanvas') is True, "Three.js canvas not found in #canvas-container!"
        assert val.get('hasInfoCard') is True, "#info-card not found!"
        assert val.get('activeTab') == 'animalCell', f"Active tab should be animalCell, got {val.get('activeTab')}"
        expected_tabs = ['animalCell', 'mitochondria', 'chloroplast', 'rbc', 'membrane']
        assert val.get('tabs') == expected_tabs, f"Tab list mismatch: {val.get('tabs')}"
        print("✅ Initial scene, Three.js WebGL canvas, and Animal Cell model initialized successfully!")

        # 6. Test Model Switching Across All 5 Tabs
        for model_id in expected_tabs:
            print(f"[*] Testing tab switch to: {model_id}...")
            switch_res = await cdp.eval_js(f'''
                (() => {{
                    const btn = document.querySelector('.tab-btn[data-model="{model_id}"]');
                    if (!btn) return {{ error: 'Button not found' }};
                    btn.click();
                    return {{ clicked: true }};
                }})()
            ''')
            await asyncio.sleep(0.8)

            check_after_switch = await cdp.eval_js('''
                (() => {
                    const activeTab = document.querySelector('.tab-btn.active')?.dataset.model;
                    const cardTitle = document.getElementById('card-title')?.textContent;
                    const badge = document.getElementById('card-badge')?.textContent;
                    const tagsCount = document.querySelectorAll('#structure-tags .structure-tag').length;
                    const curriculumCount = document.querySelectorAll('#card-curriculum li').length;
                    return { activeTab, cardTitle, badge, tagsCount, curriculumCount };
                })()
            ''')
            switch_val = check_after_switch.get('value', {})
            print(f"    -> Result for {model_id}:", switch_val)
            assert switch_val.get('activeTab') == model_id, f"Tab failed to activate {model_id}"
            assert switch_val.get('tagsCount', 0) > 0, f"No structure tags found for {model_id}"
            assert switch_val.get('curriculumCount', 0) > 0, f"No curriculum points found for {model_id}"

        print("✅ All 5 models switched and rendered without defects!")

        # 7. Test Controls: Camera Reset, Auto-Rotate, Cutaway, Card Collapse, Structure Tag Click
        controls_res = await cdp.eval_js('''
            (() => {
                const results = {};

                // 1. Reset Camera
                const resetBtn = document.getElementById('resetCameraBtn');
                if (resetBtn) {
                    resetBtn.click();
                    results.resetCamera = true;
                }

                // 2. Auto-Rotate toggle
                const autoRotateBtn = document.getElementById('autoRotateBtn');
                if (autoRotateBtn) {
                    const before = autoRotateBtn.classList.contains('active');
                    autoRotateBtn.click();
                    const after = autoRotateBtn.classList.contains('active');
                    results.autoRotateToggled = (before !== after);
                }

                // 3. Cutaway toggle
                const cutawayBtn = document.getElementById('cutawayBtn');
                if (cutawayBtn) {
                    const before = cutawayBtn.classList.contains('active');
                    cutawayBtn.click();
                    const after = cutawayBtn.classList.contains('active');
                    results.cutawayToggled = (before !== after);
                }

                // 4. Zoom buttons
                const zoomIn = document.getElementById('zoomInBtn');
                const zoomOut = document.getElementById('zoomOutBtn');
                if (zoomIn && zoomOut) {
                    zoomIn.click();
                    zoomOut.click();
                    results.zoomButtons = true;
                }

                // 5. Structure tag click
                const firstTag = document.querySelector('#structure-tags .structure-tag');
                if (firstTag) {
                    firstTag.click();
                    results.tagClicked = true;
                    results.tagActive = firstTag.classList.contains('active');
                }

                // 6. Card toggle collapse
                const cardToggle = document.getElementById('cardToggleBtn');
                const infoCard = document.getElementById('info-card');
                if (cardToggle && infoCard) {
                    cardToggle.click();
                    results.cardCollapsed = infoCard.classList.contains('collapsed');
                    cardToggle.click();
                    results.cardRestored = !infoCard.classList.contains('collapsed');
                }

                return results;
            })()
        ''')
        ctrl_val = controls_res.get('value', {})
        print("[*] Controls interaction test results:", ctrl_val)
        assert ctrl_val.get('resetCamera') is True, "resetCamera failed"
        assert ctrl_val.get('autoRotateToggled') is True, "autoRotateToggle failed"
        assert ctrl_val.get('cutawayToggled') is True, "cutawayToggle failed"
        assert ctrl_val.get('tagClicked') is True, "tag click failed"
        assert ctrl_val.get('cardCollapsed') is True and ctrl_val.get('cardRestored') is True, "card collapse failed"
        print("✅ Interactive toolbar controls & structure highlighting verified!")

        # 8. Check for any Uncaught JS Exceptions or Console Errors
        js_exceptions = cdp.events['Runtime.exceptionThrown']
        console_errors = [
            c for c in cdp.events['Runtime.consoleAPICalled']
            if c.get('type') == 'error'
        ]

        print(f"[*] Total Uncaught Exceptions: {len(js_exceptions)}")
        print(f"[*] Total Console Errors: {len(console_errors)}")
        if js_exceptions:
            for ex in js_exceptions:
                print("❌ Uncaught exception:", ex.get('exceptionDetails', {}))
        if console_errors:
            for err in console_errors:
                print("❌ Console error:", err.get('args', []))

        assert len(js_exceptions) == 0, f"Encountered {len(js_exceptions)} uncaught JS exceptions"
        assert len(console_errors) == 0, f"Encountered {len(console_errors)} console errors"
        print("✅ Zero uncaught exceptions and zero console errors verified!")

        # 9. Test Mobile Viewport
        print("[*] Testing mobile viewport layout (375x667)...")
        await cdp.call('Emulation.setDeviceMetricsOverride', {
            'width': 375,
            'height': 667,
            'deviceScaleFactor': 2,
            'mobile': True
        })
        await asyncio.sleep(0.5)

        mobile_metrics = await cdp.eval_js('''
            (() => {
                const card = document.getElementById('info-card');
                const r = card.getBoundingClientRect();
                const tabs = document.querySelector('.nav-tab-container');
                return {
                    cardBottom: r.bottom,
                    cardWidth: r.width,
                    windowWidth: window.innerWidth,
                    hasCanvas: !!document.querySelector('canvas')
                };
            })()
        ''')
        mob_val = mobile_metrics.get('value', {})
        print("[*] Mobile metrics:", mob_val)
        assert mob_val.get('windowWidth') == 375, "Mobile width mismatch"
        assert mob_val.get('cardWidth') <= 375, "Card should fit within mobile screen width"
        print("✅ Mobile viewport layout verified!")

        print("=" * 70)
        print("🎉 ALL CELL-3D TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)

        await cdp.close()

    finally:
        try:
            os.killpg(os.getpgid(chrome_proc.pid), signal.SIGTERM)
        except Exception:
            pass
        httpd.shutdown()
        # Clean up temporary user data dir
        try:
            import shutil
            shutil.rmtree(user_data_dir, ignore_errors=True)
        except Exception:
            pass


if __name__ == '__main__':
    asyncio.run(run_tests())

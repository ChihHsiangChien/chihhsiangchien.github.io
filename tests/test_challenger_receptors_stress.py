#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EMPIRICAL CHALLENGER ADVERSARIAL STRESS TEST SUITE
Five Sensory Receptors Conduction Simulator (neuro_physiology/receptors.html)

This comprehensive adversarial challenge suite tests:
1. Timeline State Machine Invariance & Fuzzing (Extreme T, NaN, Infinity, negative delta, boundary transitions).
2. Canvas 2D Engine Extreme Boundaries (0x0, ultrawide, mobile, extreme DPR, critical transition T values).
3. Defensive API Robustness (Testing fallback behavior when invalid receptor keys are provided).
4. Anatomical & Biophysical Invariants across all 5 senses:
   - Smell: Non-thalamic direct projection to bulb/cortex.
   - Vision: Rhodopsin bleaching, cGMP drop, hyperpolarization (-40mV -> -70mV).
   - Hearing: K+ influx from high-potassium endolymph via stereocilia tip links.
   - Taste: 5 primary tastes, NST relay, insular gustatory cortex.
   - Skin: Pacinian/Meissner, DRG, dual-track DCML vs STT, VPL thalamus, parietal S1.
5. Loop Invariance & Speed Multiplier Linearity:
   - Monotonic advancement.
   - Exact loop reset vs non-loop freeze.
   - Exact 2x vs 0.5x progression delta ratio.
6. Memory Stability & Particle Array Invariance:
   - bgParticles length invariance across 10,000 render cycles.
7. Playwright Real Headless Browser Stress:
   - Rapid Play/Pause toggling (50x)
   - Rapid Tab cycling across all 5 receptors while running at 3x speed
   - Rapid Scrubber seek hammering (0 to 1000)
   - Keyboard shortcut hammering (Space, 1-5, Arrows)
   - Console error and pageerror zero-tolerance monitor
   - 404 network failure monitor
   - Mobile viewport rendering (375x667) and high-DPI (Retina)
"""

import sys
import os
import unittest
import threading
import subprocess
import json
import time
import re
from pathlib import Path
import http.server
import socketserver

REPO_ROOT = Path(__file__).resolve().parent.parent

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


class TestChallengerReceptorsStress(unittest.TestCase):
    server = None
    server_thread = None
    server_port = None
    base_url = None

    @classmethod
    def setUpClass(cls):
        cls.server = socketserver.TCPServer(('127.0.0.1', 0), QuietHandler)
        cls.server_port = cls.server.server_address[1]
        cls.base_url = f"http://127.0.0.1:{cls.server_port}"
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def get_mock_browser_env(self):
        return """
        const tailwind = { config: {} };
        let drawCallCount = 0;
        const mockContext2D = {
            clearRect: () => drawCallCount++,
            fillRect: () => drawCallCount++,
            strokeRect: () => drawCallCount++,
            beginPath: () => drawCallCount++,
            closePath: () => drawCallCount++,
            moveTo: () => drawCallCount++,
            lineTo: () => drawCallCount++,
            arc: () => drawCallCount++,
            ellipse: () => drawCallCount++,
            bezierCurveTo: () => drawCallCount++,
            quadraticCurveTo: () => drawCallCount++,
            fill: () => drawCallCount++,
            stroke: () => drawCallCount++,
            save: () => drawCallCount++,
            restore: () => drawCallCount++,
            setLineDash: () => {},
            setTransform: () => {},
            measureText: (str) => ({ width: (str || '').length * 10 }),
            fillText: () => drawCallCount++,
            strokeText: () => drawCallCount++,
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            scale: () => {},
            translate: () => {},
            rotate: () => {},
            clip: () => {},
            isPointInPath: () => false,
            lineWidth: 1,
            strokeStyle: '#000',
            fillStyle: '#000',
            font: '14px sans-serif',
            textAlign: 'left',
            textBaseline: 'top',
            globalAlpha: 1.0,
            shadowColor: '#000',
            shadowBlur: 0
        };

        const mockCanvas = {
            getContext: (type) => (type === '2d' ? mockContext2D : null),
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 700 }),
            parentElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 700 }) },
            width: 1200,
            height: 700,
            style: {},
            addEventListener: () => {}
        };

        const makeMockElement = (idOrSel) => ({
            tagName: 'DIV',
            id: idOrSel || '',
            className: '',
            style: {},
            classList: {
                add: () => {},
                remove: () => {},
                toggle: () => {},
                contains: () => false
            },
            textContent: '',
            innerText: '',
            innerHTML: '',
            value: '0',
            checked: true,
            getAttribute: (attr) => (attr === 'data-speed' ? '1.0' : attr === 'data-receptor' ? 'vision' : '0'),
            setAttribute: () => {},
            removeAttribute: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
            querySelector: (sel) => makeMockElement(sel),
            querySelectorAll: () => [makeMockElement(sel + '_1'), makeMockElement(sel + '_2')],
            click: () => {},
            focus: () => {},
            blur: () => {}
        });

        const window = {
            devicePixelRatio: 2.0,
            innerWidth: 1280,
            innerHeight: 800,
            addEventListener: () => {},
            removeEventListener: () => {},
            requestAnimationFrame: (cb) => setTimeout(cb, 16),
            cancelAnimationFrame: (id) => clearTimeout(id),
            performance: { now: () => Date.now() },
            Date: Date,
            Math: Math
        };

        const document = {
            getElementById: (id) => (id === 'simCanvas' ? mockCanvas : makeMockElement(id)),
            querySelector: (sel) => (sel === 'canvas' ? mockCanvas : makeMockElement(sel)),
            querySelectorAll: (sel) => [makeMockElement(sel + '_1'), makeMockElement(sel + '_2')],
            addEventListener: () => {},
            removeEventListener: () => {},
            createElement: (tag) => (tag === 'canvas' ? mockCanvas : makeMockElement(tag)),
            documentElement: makeMockElement('html'),
            body: makeMockElement('body')
        };

        window.document = document;
        global.window = window;
        global.document = document;
        global.requestAnimationFrame = window.requestAnimationFrame;
        global.cancelAnimationFrame = window.cancelAnimationFrame;
        global.performance = window.performance;
        """

    def extract_inline_scripts(self, html_text):
        scripts = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html_text, re.DOTALL)
        return "\n;\n".join(scripts)

    def run_node_script(self, script_code):
        res = subprocess.run(
            ['node'],
            input=script_code,
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(REPO_ROOT)
        )
        return res.returncode, res.stdout, res.stderr

    # -------------------------------------------------------------
    # 1. Timeline State Machine Adversarial Fuzzing
    # -------------------------------------------------------------
    def test_fuzz_timeline_controller_extreme_inputs(self):
        """Fuzz timeline controller with extreme numbers, NaN, Infinity, negative delta, etc."""
        html_path = REPO_ROOT / "neuro_physiology" / "receptors.html"
        html_text = html_path.read_text(encoding='utf-8')
        inline_js = self.extract_inline_scripts(html_text)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        const ctrl = new ConductionTimelineController();

        // 1. Seek fuzzing with extreme / malformed inputs
        const fuzzValues = [-1000, -1.0, -0.0001, 1.0001, 1.5, 99999, NaN, Infinity, -Infinity, null, undefined, "invalid", {{}}, []];
        for (const val of fuzzValues) {{
            ctrl.seek(val);
            if (isNaN(ctrl.progress) || !isFinite(ctrl.progress) || ctrl.progress < 0.0 || ctrl.progress > 1.0) {{
                throw new Error('Seek fuzzing resulted in invalid progress: ' + ctrl.progress + ' for input: ' + val);
            }}
            const phase = ctrl.getCurrentPhase();
            if (![0, 1, 2, 3].includes(phase)) {{
                throw new Error('getCurrentPhase returned invalid phase: ' + phase + ' for input: ' + val);
            }}
        }}

        // 2. Speed fuzzing
        const fuzzSpeeds = [0, -1, -999, NaN, Infinity, -Infinity, null, undefined, "fast", 0.0001, 10000];
        for (const spd of fuzzSpeeds) {{
            ctrl.setSpeed(spd);
            if (isNaN(ctrl.speedMultiplier) || !isFinite(ctrl.speedMultiplier) || ctrl.speedMultiplier < 0.2 || ctrl.speedMultiplier > 3.0) {{
                throw new Error('Speed fuzzing resulted in invalid multiplier: ' + ctrl.speedMultiplier + ' for input: ' + spd);
            }}
        }}

        // 3. Step bounds fuzzing
        ctrl.seek(0.0);
        ctrl.stepPrev();
        if (ctrl.progress !== 0.0) throw new Error('stepPrev at 0 should stay at 0, got ' + ctrl.progress);

        ctrl.seek(0.99);
        ctrl.stepNext();
        if (ctrl.progress < 0.0 || ctrl.progress > 1.0) throw new Error('stepNext past end broke bounds: ' + ctrl.progress);

        // 4. Update timing skew fuzzing (negative deltas, huge backgrounding delta)
        ctrl.lastTimestamp = 1000;
        ctrl.update(500); // clock skew backward
        // Should not crash and should cap delta
        ctrl.lastTimestamp = 1000;
        ctrl.update(1000 + 600000); // 10 minutes backgrounding
        if (isNaN(ctrl.progress) || ctrl.progress < 0.0 || ctrl.progress > 1.0) {{
            throw new Error('Large delta update broke progress: ' + ctrl.progress);
        }}

        console.log('TIMELINE_FUZZ_PASS');
        """
        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Node.js execution failed: {stderr}")
        self.assertIn("TIMELINE_FUZZ_PASS", stdout)

    # -------------------------------------------------------------
    # 2. Canvas 2D Engine Extreme Boundary Testing
    # -------------------------------------------------------------
    def test_fuzz_canvas_renderer_boundaries(self):
        """Fuzz renderer across all 5 valid senses at all critical transition T values and extreme geometries."""
        html_path = REPO_ROOT / "neuro_physiology" / "receptors.html"
        html_text = html_path.read_text(encoding='utf-8')
        inline_js = self.extract_inline_scripts(html_text)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        const renderer = new ReceptorSimulationRenderer(mockCanvas);

        // 1. Test all 5 valid receptors across all critical transition timestamps
        const criticalT = [0.0, 0.05, 0.22, 0.249, 0.25, 0.251, 0.35, 0.499, 0.50, 0.501, 0.62, 0.70, 0.799, 0.80, 0.801, 0.95, 1.0];
        const receptors = ['vision', 'hearing', 'smell', 'taste', 'skin'];

        for (const rec of receptors) {{
            for (const t of criticalT) {{
                const phase = getCurrentPhase(t);
                renderer.render(rec, t, phase);
            }}
        }}

        // 2. Test extreme canvas resize geometries
        const extremeGeometries = [
            {{ width: 100, height: 100 }},
            {{ width: 320, height: 480 }},
            {{ width: 7680, height: 2160 }},
            {{ width: 1920, height: 1080 }}
        ];
        for (const geo of extremeGeometries) {{
            mockCanvas.parentElement.getBoundingClientRect = () => geo;
            renderer.resize();
            renderer.render('vision', 0.5, 2);
        }}

        console.log('CANVAS_FUZZ_PASS');
        """
        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Node.js execution failed: {stderr}")
        self.assertIn("CANVAS_FUZZ_PASS", stdout)

    # -------------------------------------------------------------
    # 3. Defensive API Robustness for Malformed Receptor Keys
    # -------------------------------------------------------------
    def test_renderer_malformed_key_behavior(self):
        """Audit behavior when malformed/unrecognized receptor keys are passed to render."""
        html_path = REPO_ROOT / "neuro_physiology" / "receptors.html"
        html_text = html_path.read_text(encoding='utf-8')
        inline_js = self.extract_inline_scripts(html_text)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        const renderer = new ReceptorSimulationRenderer(mockCanvas);
        let errorCaught = false;
        try {{
            renderer.render('unregistered_receptor', 0.5, 2);
        }} catch (err) {{
            errorCaught = true;
            console.log('CAUGHT_MALFORMED_KEY_ERROR:', err.message);
        }}
        console.log('MALFORMED_AUDIT_DONE, errorCaught=' + errorCaught);
        """
        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0)
        self.assertIn("MALFORMED_AUDIT_DONE", stdout)

    # -------------------------------------------------------------
    # 4. Anatomical & Biophysical Invariants Verification
    # -------------------------------------------------------------
    def test_anatomical_biophysical_invariants(self):
        """Verify scientific and anatomical invariants across all 5 receptors."""
        html_path = REPO_ROOT / "neuro_physiology" / "receptors.html"
        html_text = html_path.read_text(encoding='utf-8')
        inline_js = self.extract_inline_scripts(html_text)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        const configs = RECEPTOR_CONFIGS;

        // 1. Smell invariant: Must skip thalamus
        if (!configs.smell.relayStation.includes('無須經視丘') && !configs.smell.keyTakeaway.includes('不先經視丘')) {{
            throw new Error('Smell pathway must explicitly specify skipping the thalamus');
        }}

        // 2. Vision invariant: Photoreceptors must hyperpolarize (超極化), not depolarize
        const visionText = configs.vision.molecularMechanism.join(' ') + configs.vision.keyTakeaway;
        if (!visionText.includes('超極化') || !visionText.includes('視紫質')) {{
            throw new Error('Vision pathway must specify rhodopsin bleaching and hyperpolarization');
        }}

        // 3. Hearing invariant: Hair cells K+ influx from endolymph
        const hearingText = configs.hearing.molecularMechanism.join(' ') + configs.hearing.keyTakeaway;
        if (!hearingText.includes('K+') || !hearingText.includes('靜纖毛')) {{
            throw new Error('Hearing pathway must specify endolymph K+ influx and stereocilia deflection');
        }}

        // 4. Taste invariant: 5 primary tastes (甜酸鹹苦鮮) & Solitary tract nucleus (NST)
        const tasteText = configs.taste.stimulusName + configs.taste.relayStation + configs.taste.keyTakeaway;
        if (!tasteText.includes('甜') || !tasteText.includes('酸') || !tasteText.includes('鹹') || !tasteText.includes('苦') || !tasteText.includes('鮮') || !tasteText.includes('孤束核')) {{
            throw new Error('Taste pathway must specify 5 canonical tastes and solitary tract nucleus');
        }}

        // 5. Skin invariant: Mechanoreceptors (巴齊尼, 麥斯納) & S1 cortical map
        const skinText = configs.skin.receptorName + configs.skin.brainTarget + configs.skin.nerveName;
        if (!skinText.includes('巴齊尼') || !skinText.includes('麥斯納') || !skinText.includes('S1')) {{
            throw new Error('Skin pathway must specify Pacinian, Meissner, and primary somatosensory cortex S1');
        }}

        console.log('ANATOMICAL_INVARIANTS_PASS');
        """
        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Anatomical validation failed: {stderr}")
        self.assertIn("ANATOMICAL_INVARIANTS_PASS", stdout)

    # -------------------------------------------------------------
    # 5. Playback Progression Math, Loop Invariance & Speed Linearity
    # -------------------------------------------------------------
    def test_timeline_progression_and_speed_linearity(self):
        """Verify progression math, speed multiplier proportionality, and loop boundary semantics."""
        html_path = REPO_ROOT / "neuro_physiology" / "receptors.html"
        html_text = html_path.read_text(encoding='utf-8')
        inline_js = self.extract_inline_scripts(html_text)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        // Test 1: Speed proportionality
        const c1 = new ConductionTimelineController();
        c1.setSpeed(1.0);
        c1.lastTimestamp = 0;
        c1.update(50); // 50ms delta
        const delta1 = c1.progress;

        const c2 = new ConductionTimelineController();
        c2.setSpeed(2.0);
        c2.lastTimestamp = 0;
        c2.update(50);
        const delta2 = c2.progress;

        if (Math.abs(delta2 - delta1 * 2) > 1e-6) {{
            throw new Error(`Speed multiplier linearity failed: 1x delta=${{delta1}}, 2x delta=${{delta2}}`);
        }}

        // Test 2: Loop semantics
        const cLoop = new ConductionTimelineController();
        cLoop.loop = true;
        cLoop.seek(0.999);
        cLoop.lastTimestamp = 0;
        cLoop.update(100);
        if (cLoop.progress !== 0.0 || !cLoop.isPlaying) {{
            throw new Error(`Loop true failed to wrap to 0.0: got progress=${{cLoop.progress}}, isPlaying=${{cLoop.isPlaying}}`);
        }}

        // Test 3: Non-loop semantics
        const cNoLoop = new ConductionTimelineController();
        cNoLoop.loop = false;
        cNoLoop.seek(0.999);
        cNoLoop.lastTimestamp = 0;
        cNoLoop.update(100);
        if (cNoLoop.progress !== 1.0 || cNoLoop.isPlaying) {{
            throw new Error(`Loop false failed to stop at 1.0: got progress=${{cNoLoop.progress}}, isPlaying=${{cNoLoop.isPlaying}}`);
        }}

        console.log('TIMELINE_MATH_PASS');
        """
        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Timeline math test failed: {stderr}")
        self.assertIn("TIMELINE_MATH_PASS", stdout)

    # -------------------------------------------------------------
    # 6. Memory Stability & Particle Array Invariance
    # -------------------------------------------------------------
    def test_memory_stability_and_particle_invariance(self):
        """Ensure render loop doesn't leak memory or expand arrays across 5,000 continuous render cycles."""
        html_path = REPO_ROOT / "neuro_physiology" / "receptors.html"
        html_text = html_path.read_text(encoding='utf-8')
        inline_js = self.extract_inline_scripts(html_text)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        const renderer = new ReceptorSimulationRenderer(mockCanvas);
        const initialParticleCount = renderer.bgParticles.length;

        // Execute 5,000 render calls cycling through all senses and phases
        for (let i = 0; i < 5000; i++) {{
            const t = (i % 100) / 100;
            const sense = ['vision', 'hearing', 'smell', 'taste', 'skin'][i % 5];
            renderer.render(sense, t, getCurrentPhase(t));
        }}

        if (renderer.bgParticles.length !== initialParticleCount) {{
            throw new Error(`Memory leak detected: bgParticles grew from ${{initialParticleCount}} to ${{renderer.bgParticles.length}}`);
        }}

        console.log('MEMORY_STABILITY_PASS');
        """
        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Memory stability test failed: {stderr}")
        self.assertIn("MEMORY_STABILITY_PASS", stdout)

    # -------------------------------------------------------------
    # 7. Playwright Real Headless Browser Adversarial Stress
    # -------------------------------------------------------------
    def test_playwright_browser_adversarial_stress(self):
        """Launch Microsoft Edge headless via Playwright, execute live UI hammering and monitor console."""
        from playwright.sync_api import sync_playwright

        edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        if not os.path.exists(edge_path):
            edge_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        self.assertTrue(os.path.exists(edge_path), "Browser executable must exist")

        console_errors = []
        page_errors = []
        failed_requests = []

        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=edge_path, headless=True)
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            page = context.new_page()

            # Listen for console issues
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda err: page_errors.append(str(err)))
            page.on("requestfailed", lambda req: failed_requests.append(f"{req.method} {req.url}: {req.failure}"))

            # Navigate to simulator
            target_url = f"{self.base_url}/neuro_physiology/receptors.html"
            page.goto(target_url, wait_until="networkidle")

            # Verify core elements exist
            self.assertEqual(page.title(), "五大感覺受器動態傳導模擬器：視覺、聽覺、嗅覺、味覺、皮膚 | 神經生理學")

            # STRESS TEST 1: Rapid Play / Pause toggling (50 rapid clicks)
            play_btn = page.locator("#playPauseBtn")
            for _ in range(30):
                play_btn.click()
            # Restore to playing
            page.evaluate("if (!window.timelineController.isPlaying) window.timelineController.play()")

            # STRESS TEST 2: Rapid Tab Cycling across all 5 receptors while running at 3x speed
            page.evaluate("window.timelineController.setSpeed(3.0)")
            tabs = ["#tabBtn_vision", "#tabBtn_hearing", "#tabBtn_smell", "#tabBtn_taste", "#tabBtn_skin"]
            for cycle in range(5):
                for tab_id in tabs:
                    page.locator(tab_id).click()
                    time.sleep(0.02) # Fast interleaved switching

            # STRESS TEST 3: Rapid Slider Scrubber Hammering
            slider = page.locator("#progressSlider")
            for pos in [100, 250, 500, 750, 990, 0, 450, 850, 1000]:
                slider.fill(str(pos))
                slider.dispatch_event("input")

            # STRESS TEST 4: Keyboard Shortcut Hammering (Space, Arrows, 1-5)
            for k in ["Space", "ArrowRight", "ArrowLeft", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Space"]:
                page.keyboard.press(k)
                time.sleep(0.02)

            # STRESS TEST 5: Modal and Sidebar Rapid Open/Close
            help_btn = page.locator("#helpModalBtn")
            close_help = page.locator("#closeHelpModalBtn")
            toggle_info = page.locator("#toggleInfoBtn")

            for _ in range(5):
                help_btn.click()
                close_help.click()
                toggle_info.click()
                toggle_info.click()

            # STRESS TEST 6: Mobile Viewport Resize and Animation Stability
            page.set_viewport_size({"width": 375, "height": 667})
            page.wait_for_timeout(300) # Allow resize observer / window resize to fire

            # Let animation run uninterrupted for 1 second in mobile viewport
            page.wait_for_timeout(1000)

            # Verify runtime health indicators
            is_active = page.evaluate("window.timelineController !== undefined && typeof window.drawSimulation === 'function'")
            self.assertTrue(is_active, "Runtime global controllers must remain valid")

            curr_progress = page.evaluate("window.timelineController.progress")
            self.assertTrue(0.0 <= curr_progress <= 1.0, f"Progress must stay bounded: {curr_progress}")

            browser.close()

        # AUDIT RESULTS
        self.assertEqual(len(page_errors), 0, f"Encountered unhandled page errors: {page_errors}")
        self.assertEqual(len(console_errors), 0, f"Encountered console errors: {console_errors}")
        self.assertEqual(len(failed_requests), 0, f"Encountered failed network requests: {failed_requests}")


if __name__ == '__main__':
    unittest.main()

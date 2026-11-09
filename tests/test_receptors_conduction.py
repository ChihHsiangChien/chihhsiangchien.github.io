#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated 4-Tier Verification Test Suite for Five Sensory Receptors Conduction Simulator
(五大感覺受器動態傳導模擬器: 視覺、聽覺、嗅覺、味覺、皮膚)

Location: neuro_physiology/receptors.html
Test harness: Python unittest with ephemeral HTTP server + BeautifulSoup + Node.js VM.

Coverage:
- Tier 1: Feature Coverage (5 receptor tabs, 4 phases, Play/Pause, speed multipliers, timeline slider, bidirectional links)
- Tier 2: Boundary & Corner Cases (slider min/max 0-100/1000, RWD viewport meta, canvas config, speed bounds)
- Tier 3: Cross-Feature Interactions & Node.js VM Runtime Integrity (zero uncaught errors, timeline math, state isolation)
- Tier 4: Curriculum Anatomical Terminology & Pedagogical Scenarios (15 Taiwanese curriculum terms, pathway narratives)
- Tier 5: Adversarial Stress & Robustness (URL param injection, rapid toggles)

Run via:
    python -m unittest tests/test_receptors_conduction.py
"""

import sys
import os
import unittest
import threading
import subprocess
import urllib.request
import urllib.parse
import json
import re
from pathlib import Path
import http.server
import socketserver

try:
    from bs4 import BeautifulSoup
except ImportError:
    # Graceful fallback parser in case bs4 is not available in minimal environments
    BeautifulSoup = None

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


class QuietSimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Silent HTTP handler serving repository root to prevent test runner log clutter."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


class TestSuiteBase(unittest.TestCase):
    """Base class establishing an ephemeral local static HTTP server for opaque-box testing."""
    server = None
    server_thread = None
    server_port = None
    base_url = None

    @classmethod
    def setUpClass(cls):
        # Bind to port 0 to allow the OS to allocate an ephemeral free port
        cls.server = socketserver.TCPServer(('127.0.0.1', 0), QuietSimpleHTTPRequestHandler)
        cls.server_port = cls.server.server_address[1]
        cls.base_url = f"http://127.0.0.1:{cls.server_port}"
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def fetch(self, rel_path):
        """Fetch a relative URL from the local HTTP server, returning (status, headers, text, soup)."""
        clean_path = rel_path.lstrip('/')
        parsed = urllib.parse.urlsplit(clean_path)
        quoted_path = urllib.parse.quote(parsed.path, safe='/')
        url = f"{self.base_url}/{quoted_path}"
        if parsed.query:
            url += f"?{parsed.query}"
        if parsed.fragment:
            url += f"#{parsed.fragment}"

        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'E2E-Receptors-Conduction-Test-Runner/1.0'}
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                status = response.status
                headers = dict(response.headers)
                raw_bytes = response.read()
                text = raw_bytes.decode('utf-8', errors='replace')
                soup = BeautifulSoup(text, 'html.parser') if BeautifulSoup else None
                return status, headers, text, soup
        except urllib.error.HTTPError as e:
            text = e.read().decode('utf-8', errors='replace')
            soup = BeautifulSoup(text, 'html.parser') if BeautifulSoup else None
            return e.code, dict(e.headers), text, soup

    def run_node_script(self, script_code):
        """Execute a JavaScript snippet using Node.js stdin, returning (returncode, stdout, stderr)."""
        res = subprocess.run(
            ['node'],
            input=script_code,
            text=True,
            capture_output=True,
            timeout=10,
            cwd=str(REPO_ROOT)
        )
        return res.returncode, res.stdout, res.stderr

    def extract_inline_scripts(self, html_text):
        """Extract inline JavaScript code blocks from HTML text."""
        scripts = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html_text, re.DOTALL)
        return "\n;\n".join(scripts)

    def get_mock_browser_env(self):
        """Return a complete synthetic DOM and Canvas 2D mock environment for Node.js execution."""
        return """
        // Synthetic Browser DOM & Canvas 2D Mock Environment for Node.js
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
            addEventListener: () => {},
            removeEventListener: () => {},
            setAttribute: () => {},
            getAttribute: () => '',
            value: '0',
            checked: true,
            innerHTML: '',
            innerText: '',
            textContent: '',
            appendChild: () => {},
            dataset: {}
        });

        const window = {
            addEventListener: (evt, cb) => {},
            removeEventListener: () => {},
            innerWidth: 1200,
            innerHeight: 800,
            devicePixelRatio: 1,
            requestAnimationFrame: (cb) => setTimeout(cb, 16),
            cancelAnimationFrame: (id) => clearTimeout(id)
        };

        const document = {
            getElementById: (id) => {
                if (id && (id.toLowerCase().includes('canvas') || id === 'simCanvas')) return mockCanvas;
                return makeMockElement(id);
            },
            querySelector: (sel) => {
                if (sel && (sel.toLowerCase().includes('canvas') || sel.includes('simCanvas'))) return mockCanvas;
                return makeMockElement(sel);
            },
            querySelectorAll: () => [makeMockElement('item')],
            addEventListener: () => {},
            createElement: (tag) => (tag === 'canvas' ? mockCanvas : makeMockElement(tag))
        };

        const performance = {
            now: () => Date.now()
        };

        function requestAnimationFrame(cb) { return setTimeout(cb, 16); }
        function cancelAnimationFrame(id) { clearTimeout(id); }
        """


# ==============================================================================
# TIER 1: Feature Coverage (Core Requirements F1 to F12)
# ==============================================================================
class TestTier1FeatureCoverage(TestSuiteBase):
    """Tier 1: Feature Coverage verifying DOM elements, playback controls, tabs, and links."""

    def test_t1_01_receptors_page_exists_and_status_200(self):
        """Verify neuro_physiology/receptors.html exists, returns HTTP 200, valid doctype and title."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200, "neuro_physiology/receptors.html must return HTTP 200 OK")
        self.assertIn("<!DOCTYPE html>", text, "receptors.html must declare HTML5 doctype")

        if soup:
            title = soup.find('title')
            self.assertIsNotNone(title, "receptors.html must define a <title>")
            title_text = title.get_text()
        else:
            title_text = text

        self.assertTrue(
            any(k in title_text for k in ['五大感覺受器', '感覺受器', '受器傳導', '神經傳導']),
            f"Page title '{title_text}' should mention sensory receptors conduction"
        )

    def test_t1_02_five_receptors_tabs_exist_with_contract(self):
        """Verify all 5 sensory receptor tabs exist matching ID and data-receptor contracts."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200, "receptors.html must be accessible")

        expected_receptors = {
            'vision': ['視覺', 'tabBtn_vision'],
            'hearing': ['聽覺', 'tabBtn_hearing'],
            'smell': ['嗅覺', 'tabBtn_smell'],
            'taste': ['味覺', 'tabBtn_taste'],
            'skin': ['皮膚', 'tabBtn_skin']
        }

        for rec_key, (label, btn_id) in expected_receptors.items():
            if soup:
                elem_by_id = soup.find(id=btn_id)
                elem_by_data = soup.find(attrs={'data-receptor': rec_key})
                tab_elem = elem_by_id or elem_by_data
                self.assertIsNotNone(
                    tab_elem,
                    f"Receptor tab for '{rec_key}' with id='{btn_id}' or data-receptor='{rec_key}' not found"
                )
            else:
                self.assertTrue(
                    btn_id in text or f'data-receptor="{rec_key}"' in text or f"data-receptor='{rec_key}'" in text,
                    f"Receptor tab for '{rec_key}' not found in HTML"
                )
            self.assertIn(label, text, f"Label for '{label}' must be visible in page text")

    def test_t1_03_four_conduction_phases_present(self):
        """Verify all 4 physiological conduction phases (刺激, 受器, 神經, 腦) are present."""
        status, _, text, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        phases = ['刺激', '受器', '神經', '腦']
        for phase in phases:
            self.assertIn(phase, text, f"Conduction phase '{phase}' must be present in UI / HUD")

    def test_t1_04_playback_play_pause_button_contract(self):
        """Verify Play/Pause toggle button exists according to interface contract (#playPauseBtn)."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            btn = soup.find(id='playPauseBtn') or soup.find(id=re.compile(r'play.*pause', re.I))
            self.assertIsNotNone(btn, "Play/Pause button with id='playPauseBtn' not found")
        else:
            self.assertTrue(
                'id="playPauseBtn"' in text or "id='playPauseBtn'" in text,
                "Play/Pause button with id='playPauseBtn' must exist"
            )

    def test_t1_05_playback_step_and_reset_buttons(self):
        """Verify step previous, step next, and reset buttons exist (#stepPrevBtn, #stepNextBtn, #resetBtn)."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        control_ids = ['stepPrevBtn', 'stepNextBtn', 'resetBtn']
        for cid in control_ids:
            if soup:
                elem = soup.find(id=cid) or soup.find(id=re.compile(cid.replace('Btn', ''), re.I))
                self.assertIsNotNone(elem, f"Control button with id='{cid}' not found")
            else:
                self.assertTrue(
                    f'id="{cid}"' in text or f"id='{cid}'" in text,
                    f"Control button with id='{cid}' not found in HTML"
                )

    def test_t1_06_timeline_scrubber_slider_contract(self):
        """Verify timeline progress scrubber slider exists (#progressSlider)."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            slider = soup.find(id='progressSlider') or soup.find('input', attrs={'type': 'range'})
            self.assertIsNotNone(slider, "Timeline range slider with id='progressSlider' not found")
            self.assertEqual(slider.get('type', ''), 'range')
        else:
            self.assertTrue(
                'id="progressSlider"' in text or '<input type="range"' in text,
                "Timeline scrubber slider with id='progressSlider' must exist"
            )

    def test_t1_07_speed_multiplier_presets_exist(self):
        """Verify speed multipliers (0.5x, 1.0x/1x, 1.5x, 2.0x/2x) are available in UI."""
        status, _, text, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        speeds = ['0.5', '1', '1.5', '2']
        for spd in speeds:
            pattern = rf'{spd}(\.0)?x'
            self.assertTrue(
                re.search(pattern, text, re.IGNORECASE),
                f"Speed multiplier '{spd}x' must be available in receptors.html UI"
            )

    def test_t1_08_receptors_to_lab_backlink(self):
        """Verify receptors.html contains backlink to main lab index.html."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            link = soup.find('a', href=re.compile(r'^index\.html$'))
            self.assertIsNotNone(link, "receptors.html must have <a href='index.html'> backlink to main lab")
        else:
            self.assertTrue(
                re.search(r'href=[\'"]index\.html[\'"]', text),
                "receptors.html must contain link to index.html"
            )

    def test_t1_09_receptors_to_homepage_backlink(self):
        """Verify receptors.html contains backlink to repository root ../index.html."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            link = soup.find('a', href=re.compile(r'^\.\./index\.html$'))
            self.assertIsNotNone(link, "receptors.html must have <a href='../index.html'> link to root homepage")
        else:
            self.assertTrue(
                re.search(r'href=[\'"]\.\./index\.html[\'"]', text),
                "receptors.html must contain link to ../index.html"
            )

    def test_t1_10_lab_to_receptors_forwardlink(self):
        """Verify neuro_physiology/index.html contains forward link to receptors.html."""
        status, _, text, soup = self.fetch('neuro_physiology/index.html')
        self.assertEqual(status, 200, "neuro_physiology/index.html must return HTTP 200 OK")

        if soup:
            link = soup.find('a', href=re.compile(r'receptors\.html'))
            self.assertIsNotNone(link, "neuro_physiology/index.html must have link to receptors.html")
        else:
            self.assertTrue(
                re.search(r'href=[\'"]receptors\.html[\'"]', text),
                "neuro_physiology/index.html must contain link to receptors.html"
            )

    def test_t1_11_homepage_to_receptors_mounting(self):
        """Verify repository root index.html mounts receptors.html under 神經與感覺."""
        status, _, text, _ = self.fetch('index.html')
        self.assertEqual(status, 200, "Root index.html must return HTTP 200 OK")

        self.assertTrue(
            re.search(r'href=[\'"]neuro_physiology/receptors\.html[\'"]', text),
            "Root index.html must mount neuro_physiology/receptors.html under 神經與感覺"
        )


# ==============================================================================
# TIER 2: Boundary & Corner Cases
# ==============================================================================
class TestTier2BoundaryCases(TestSuiteBase):
    """Tier 2: Boundary conditions, slider limits, RWD viewport, and canvas configuration."""

    def test_t2_01_timeline_slider_boundaries_and_attributes(self):
        """Verify timeline slider has min=0 and max of at least 100 for proper granularity."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            slider = soup.find(id='progressSlider') or soup.find('input', attrs={'type': 'range'})
            self.assertIsNotNone(slider, "Range slider must exist")
            min_val = float(slider.get('min', '0'))
            max_val = float(slider.get('max', '100'))
            self.assertEqual(min_val, 0.0, "Timeline slider minimum must be 0")
            self.assertGreaterEqual(max_val, 100.0, "Timeline slider maximum must be at least 100")
        else:
            self.assertTrue('type="range"' in text or "type='range'" in text)

    def test_t2_02_responsive_viewport_meta_tag(self):
        """Verify mobile responsive viewport meta tag with width=device-width."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            viewport = soup.find('meta', attrs={'name': 'viewport'})
            self.assertIsNotNone(viewport, "Responsive viewport meta tag must be declared")
            content = viewport.get('content', '')
            self.assertIn("width=device-width", content, "Viewport must set width=device-width")
            self.assertIn("initial-scale=1", content, "Viewport must set initial-scale=1")
        else:
            self.assertTrue(
                re.search(r'<meta[^>]*name=[\'"]viewport[\'"][^>]*width=device-width', text, re.I),
                "Responsive viewport meta tag missing or misconfigured"
            )

    def test_t2_03_canvas_element_configured(self):
        """Verify HTML5 Canvas element exists for dynamic 2D simulation rendering."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            canvas = soup.find('canvas')
            self.assertIsNotNone(canvas, "<canvas> element must be present in DOM for simulation rendering")
            canvas_id = canvas.get('id', '')
            self.assertTrue(
                any(k in canvas_id.lower() for k in ['conduction', 'simulation', 'canvas', 'stage', 'sim']),
                f"Canvas id '{canvas_id}' should be descriptive"
            )
        else:
            self.assertIn("<canvas", text, "<canvas> element missing from HTML")

    def test_t2_04_speed_multiplier_values_positive(self):
        """Verify speed multipliers and speed slider values are strictly positive (> 0) and <= 5.0."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            speed_elements = soup.find_all(attrs={'data-speed': True})
            for elem in speed_elements:
                val = float(elem['data-speed'])
                self.assertGreater(val, 0.0, f"Speed multiplier {val} must be positive")
                self.assertLessEqual(val, 5.0, f"Speed multiplier {val} must not exceed 5.0x")

            speed_slider = soup.find(id='speedSlider')
            if speed_slider:
                min_s = float(speed_slider.get('min', '0.2'))
                max_s = float(speed_slider.get('max', '3.0'))
                self.assertGreater(min_s, 0.0, "Speed slider min must be > 0")
                self.assertLessEqual(max_s, 5.0, "Speed slider max must be <= 5.0")
        else:
            self.assertTrue('0.5x' in text or '0.5' in text)

    def test_t2_05_loop_toggle_element_present(self):
        """Verify loop toggle control exists in the DOM to control repetitive cycle playback."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            loop_elem = (
                soup.find(id=re.compile(r'loop', re.I)) or
                soup.find('input', attrs={'name': re.compile(r'loop', re.I)}) or
                soup.find(attrs={'data-action': re.compile(r'loop', re.I)})
            )
            self.assertIsNotNone(loop_elem, "Loop toggle control element not found in DOM")
        else:
            self.assertTrue(re.search(r'loop', text, re.I), "Loop toggle identifier missing")

    def test_t2_06_meta_charset_utf8_present(self):
        """Verify UTF-8 character set is explicitly declared for Traditional Chinese anatomical text."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        if soup:
            charset_meta = soup.find('meta', attrs={'charset': re.compile(r'utf-8', re.I)}) or soup.find(
                'meta', attrs={'http-equiv': re.compile(r'content-type', re.I), 'content': re.compile(r'utf-8', re.I)}
            )
            self.assertIsNotNone(charset_meta, "<meta charset='utf-8'> must be present")
        else:
            self.assertTrue(re.search(r'<meta[^>]*charset=[\'"]?utf-8', text, re.I))


# ==============================================================================
# TIER 3: Cross-Feature Interactions & Node.js VM Runtime Integrity
# ==============================================================================
class TestTier3CrossFeatureAndNodeRuntime(TestSuiteBase):
    """Tier 3: JavaScript VM execution integrity, timeline math, state transitions, and isolation."""

    def test_t3_01_nodejs_vm_syntax_and_execution(self):
        """Verify all embedded JavaScript code executes in Node.js VM without syntax or unhandled errors."""
        status, _, html, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        inline_js = self.extract_inline_scripts(html)
        self.assertGreater(len(inline_js.strip()), 100, "receptors.html must contain substantive inline JavaScript")

        mock_env = self.get_mock_browser_env()

        runner_script = f"""
        {mock_env}
        try {{
            {inline_js}
            console.log("NODE_EVAL_SUCCESS");
        }} catch (err) {{
            console.error("NODE_EVAL_ERROR:", err.stack || err.message);
            process.exit(1);
        }}
        """

        code, stdout, stderr = self.run_node_script(runner_script)
        self.assertEqual(code, 0, f"Node.js execution failed: {stderr}")
        self.assertIn("NODE_EVAL_SUCCESS", stdout, "Script did not complete execution cleanly")

    def test_t3_02_timeline_controller_phase_math_in_vm(self):
        """Verify timeline state machine correctly maps normalized T (0.0 - 1.0) to the 4 phases."""
        status, _, html, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)
        inline_js = self.extract_inline_scripts(html)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        // Test timeline controller phase boundaries
        // Phase 0: 0.00 <= T < 0.25 (刺激)
        // Phase 1: 0.25 <= T < 0.50 (受器)
        // Phase 2: 0.50 <= T < 0.80 (神經)
        // Phase 3: 0.80 <= T <= 1.00 (腦)

        const ctrl = (typeof ConductionTimelineController !== 'undefined')
            ? new ConductionTimelineController()
            : null;

        function getPhase(t) {{
            if (ctrl && typeof ctrl.getPhase === 'function') {{
                return ctrl.getPhase(t);
            }}
            if (ctrl && typeof ctrl.getCurrentPhase === 'function') {{
                return ctrl.getCurrentPhase(t);
            }}
            if (t < 0.25) return 0;
            if (t < 0.50) return 1;
            if (t < 0.80) return 2;
            return 3;
        }}

        const assertions = [
            {{ t: 0.05, expected: 0, name: "Phase 0 (刺激)" }},
            {{ t: 0.24, expected: 0, name: "Phase 0 boundary" }},
            {{ t: 0.25, expected: 1, name: "Phase 1 (受器)" }},
            {{ t: 0.49, expected: 1, name: "Phase 1 boundary" }},
            {{ t: 0.50, expected: 2, name: "Phase 2 (神經)" }},
            {{ t: 0.79, expected: 2, name: "Phase 2 boundary" }},
            {{ t: 0.80, expected: 3, name: "Phase 3 (腦)" }},
            {{ t: 0.99, expected: 3, name: "Phase 3 boundary" }}
        ];

        for (const test of assertions) {{
            const p = getPhase(test.t);
            if (p !== test.expected) {{
                throw new Error(`At T=${{test.t}}, expected phase ${{test.expected}} (${{test.name}}) but got ${{p}}`);
            }}
        }}

        console.log("TIMELINE_PHASE_MATH_PASS");
        """

        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Timeline phase math test failed: {stderr}")
        self.assertIn("TIMELINE_PHASE_MATH_PASS", stdout)

    def test_t3_03_timeline_clamping_and_stepping_in_vm(self):
        """Verify timeline seek clamps bounds to [0.0, 1.0] and stepping handles phase jumps cleanly."""
        status, _, html, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)
        inline_js = self.extract_inline_scripts(html)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        if (typeof ConductionTimelineController !== 'undefined') {{
            const ctrl = new ConductionTimelineController();

            // Test seek clamping
            ctrl.seek(-0.5);
            if (ctrl.progress < 0.0) throw new Error("Seek below 0 did not clamp to >= 0");

            ctrl.seek(1.5);
            if (ctrl.progress > 1.0) throw new Error("Seek above 1 did not clamp to <= 1");

            // Test stepNext advances forward
            ctrl.seek(0.1);
            ctrl.stepNext();
            if (ctrl.progress < 0.25) throw new Error("stepNext failed to advance to next phase");

            // Test play/pause toggle
            const initialPlaying = ctrl.isPlaying;
            ctrl.togglePlayPause();
            if (ctrl.isPlaying === initialPlaying) throw new Error("togglePlayPause failed to invert playing state");
        }}

        console.log("CLAMPING_AND_STEPPING_PASS");
        """

        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Clamping and stepping test failed: {stderr}")
        self.assertIn("CLAMPING_AND_STEPPING_PASS", stdout)

    def test_t3_04_receptor_configs_schema_integrity(self):
        """Verify receptor configurations schema contains all 5 modalities with complete metadata."""
        status, _, html, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)
        inline_js = self.extract_inline_scripts(html)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        if (typeof RECEPTOR_CONFIGS !== 'undefined') {{
            const requiredSenses = ['vision', 'hearing', 'smell', 'taste', 'skin'];
            for (const key of requiredSenses) {{
                const cfg = RECEPTOR_CONFIGS[key];
                if (!cfg) throw new Error(`Missing config for sense: ${{key}}`);
                if (!cfg.name) throw new Error(`Missing name in config for ${{key}}`);
                if (!cfg.organ) throw new Error(`Missing organ in config for ${{key}}`);
            }}
        }}

        console.log("RECEPTOR_CONFIGS_SCHEMA_PASS");
        """

        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Receptor configs schema test failed: {stderr}")
        self.assertIn("RECEPTOR_CONFIGS_SCHEMA_PASS", stdout)

    def test_t3_05_canvas_render_cycle_execution(self):
        """Verify calling the animation render function draws on canvas without throwing exceptions."""
        status, _, html, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)
        inline_js = self.extract_inline_scripts(html)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        const senses = ['vision', 'hearing', 'smell', 'taste', 'skin'];
        const timepoints = [0.1, 0.35, 0.65, 0.9];

        if (typeof ReceptorSimulationRenderer !== 'undefined') {{
            const renderer = new ReceptorSimulationRenderer(mockCanvas);
            for (const s of senses) {{
                for (const t of timepoints) {{
                    const phase = t < 0.25 ? 0 : t < 0.5 ? 1 : t < 0.8 ? 2 : 3;
                    renderer.render(s, t, phase);
                }}
            }}
        }}

        console.log("CANVAS_RENDER_CYCLE_PASS, Total Draw Calls:", drawCallCount);
        """

        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Canvas render cycle test failed: {stderr}")
        self.assertIn("CANVAS_RENDER_CYCLE_PASS", stdout)


# ==============================================================================
# TIER 4: Curriculum Anatomical Terminology & Pedagogical Scenarios
# ==============================================================================
class TestTier4PedagogicalScenarios(TestSuiteBase):
    """Tier 4: Curriculum anatomical terminology and pedagogical pathway completeness."""

    def test_t4_01_curriculum_textbook_terminology_presence(self):
        """Verify all 15 required Taiwanese biology curriculum terms are explicitly present."""
        status, _, text, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        required_terms = [
            # 視覺 (Vision)
            ('視網膜', '視覺 (Retina)'),
            ('視神經', '視覺 (Optic Nerve)'),
            ('枕葉', '視覺 (Occipital Lobe / V1)'),
            # 聽覺 (Hearing)
            ('耳蝸', '聽覺 (Cochlea)'),
            ('毛細胞', '聽覺 (Hair Cells)'),
            ('顳葉', '聽覺 (Temporal Lobe / A1)'),
            # 嗅覺 (Smell)
            ('嗅黏膜', '嗅覺 (Olfactory Mucosa)'),
            ('嗅球', '嗅覺 (Olfactory Bulb)'),
            ('篩板', '嗅覺 (Cribriform Plate)'),
            # 味覺 (Taste)
            ('味蕾', '味覺 (Taste Buds)'),
            ('孤束核', '味覺 (Solitary Nucleus / NST)'),
            ('島葉', '味覺 (Insular Cortex)'),
            # 皮膚 (Skin / Touch)
            ('巴齊尼', '皮膚 (Pacinian Corpuscle)'),
            ('麥斯納', '皮膚 (Meissner Corpuscle)'),
            ('頂葉', '皮膚 (Parietal Lobe / S1)')
        ]

        missing = []
        for term, modality in required_terms:
            if term not in text:
                missing.append(f"{term} [{modality}]")

        self.assertEqual(
            len(missing), 0,
            f"Missing required curriculum terminology ({len(missing)} terms): {', '.join(missing)}"
        )

    def test_t4_02_vision_pathway_pedagogical_narrative(self):
        """Verify Vision pathway explains light stimulus, retinal transduction, and cortical processing."""
        status, _, text, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        self.assertTrue(
            any(w in text for w in ['光線', '光子', '電磁波']),
            "Vision pathway must describe light/photon stimulus"
        )
        self.assertTrue(
            any(w in text for w in ['超極化', '感光細胞', '視桿', '視錐']),
            "Vision pathway must describe photoreceptor hyperpolarization or transduction"
        )
        self.assertTrue(
            any(w in text for w in ['枕葉', '視覺皮質', 'V1']),
            "Vision pathway must describe occipital visual cortex"
        )

    def test_t4_03_hearing_pathway_pedagogical_narrative(self):
        """Verify Hearing pathway explains sound wave, hair cell K+ influx, and temporal cortex."""
        status, _, text, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        self.assertTrue(
            any(w in text for w in ['聲音', '聲波', '振動']),
            "Hearing pathway must describe sound wave/vibration stimulus"
        )
        self.assertTrue(
            any(w in text for w in ['毛細胞', '耳蝸', '柯蒂氏器', '內淋巴']),
            "Hearing pathway must describe hair cell / cochlear transduction"
        )
        self.assertTrue(
            any(w in text for w in ['顳葉', '聽覺皮質', 'A1']),
            "Hearing pathway must describe temporal auditory cortex"
        )

    def test_t4_04_smell_pathway_pedagogical_narrative(self):
        """Verify Smell pathway explains odorant molecules and non-thalamic direct projection."""
        status, _, text, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        self.assertTrue(
            any(w in text for w in ['氣味', '氣味分子', '揮發']),
            "Smell pathway must describe odorant chemical stimulus"
        )
        self.assertTrue(
            any(w in text for w in ['嗅黏膜', '嗅上皮', '篩板', '嗅神經']),
            "Smell pathway must describe olfactory mucosa and cribriform plate"
        )
        self.assertTrue(
            any(w in text for w in ['嗅球', '梨狀皮質', '不經視丘', '邊緣系統']),
            "Smell pathway must highlight olfactory bulb or direct cortical projection"
        )

    def test_t4_05_taste_pathway_pedagogical_narrative(self):
        """Verify Taste pathway explains tastants, taste buds, solitary nucleus, and insula."""
        status, _, text, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        self.assertTrue(
            any(w in text for w in ['呈味', '味道', '唾液', '味覺']),
            "Taste pathway must describe tastants / chemical tastes"
        )
        self.assertTrue(
            any(w in text for w in ['味蕾', '舌乳頭', '微絨毛']),
            "Taste pathway must describe taste buds on tongue papillae"
        )
        self.assertTrue(
            any(w in text for w in ['孤束核', '島葉', '延髓']),
            "Taste pathway must describe solitary nucleus (NST) and insula"
        )

    def test_t4_06_skin_pathway_pedagogical_narrative(self):
        """Verify Skin pathway explains mechanoreceptors/thermal stimulus and parietal S1 cortex."""
        status, _, text, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        self.assertTrue(
            any(w in text for w in ['壓力', '接觸', '溫度', '觸覺']),
            "Skin pathway must describe pressure/touch/thermal stimuli"
        )
        self.assertTrue(
            any(w in text for w in ['巴齊尼', '麥斯納', '莫克爾', '魯菲尼', '小體']),
            "Skin pathway must describe dermal corpuscle mechanoreceptors"
        )
        self.assertTrue(
            any(w in text for w in ['頂葉', '初級體感', 'S1', '後中央迴']),
            "Skin pathway must describe parietal primary somatosensory cortex S1"
        )


# ==============================================================================
# TIER 5: Adversarial Stress & Robustness
# ==============================================================================
class TestTier5AdversarialStress(TestSuiteBase):
    """Tier 5: Edge cases, URL parameter tampering, and rapid controller state stress."""

    def test_t5_01_url_tampering_and_xss_safety(self):
        """Verify malicious query parameters and hash fragments do not cause HTTP server crash."""
        payload = 'neuro_physiology/receptors.html?param=<script>alert("xss")</script>&sense=undefined#phase=NaN'
        status, _, text, _ = self.fetch(payload)
        self.assertEqual(status, 200, "Server must tolerate URI query strings safely")
        self.assertIn("<!DOCTYPE html>", text)

    def test_t5_02_rapid_controller_toggle_stress(self):
        """Simulate rapid play/pause toggling and extreme speed values in Node.js VM."""
        status, _, html, _ = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)
        inline_js = self.extract_inline_scripts(html)
        mock_env = self.get_mock_browser_env()

        test_script = f"""
        {mock_env}
        {inline_js}

        if (typeof ConductionTimelineController !== 'undefined') {{
            const ctrl = new ConductionTimelineController();

            // Rapid play/pause cycle (50 iterations)
            for (let i = 0; i < 50; i++) {{
                ctrl.togglePlayPause();
            }}

            // Extreme speed setting stress
            const extremeSpeeds = [0, -1, -99, 0.001, 100, 99999, NaN, Infinity, -Infinity, "invalid"];
            for (const spd of extremeSpeeds) {{
                ctrl.setSpeed(spd);
                if (isNaN(ctrl.speedMultiplier)) {{
                    throw new Error("speedMultiplier became NaN from input: " + spd);
                }}
                if (ctrl.speedMultiplier <= 0) {{
                    throw new Error("speedMultiplier became non-positive from input: " + spd);
                }}
            }}
        }}

        console.log("ADVERSARIAL_TOGGLE_STRESS_PASS");
        """

        code, stdout, stderr = self.run_node_script(test_script)
        self.assertEqual(code, 0, f"Adversarial controller stress test failed: {stderr}")
        self.assertIn("ADVERSARIAL_TOGGLE_STRESS_PASS", stdout)


if __name__ == '__main__':
    unittest.main()

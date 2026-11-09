#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Challenger 2 Empirical Adversarial Stress Test Suite
Five Sensory Receptors Conduction Simulator (五大感覺受器動態傳導模擬器)

Module: neuro_physiology/receptors.html
Role: teamwork_challenger (empirical_challenger)

This test suite executes rigorous adversarial fuzzing, runtime state mutation,
dense timeline sampling, strict Canvas 2D mock verification (detecting negative arc
radii and IndexSizeError), and DOM/integration integrity checks.

Run via:
    python -m unittest tests/test_challenger2_stress.py
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
    BeautifulSoup = None

REPO_ROOT = Path(__file__).resolve().parent.parent


class QuietSimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


class Challenger2StressBase(unittest.TestCase):
    server = None
    server_thread = None
    server_port = None
    base_url = None

    @classmethod
    def setUpClass(cls):
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
        clean_path = rel_path.lstrip('/')
        url = f"{self.base_url}/{clean_path}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Challenger2-Stress-Runner/1.0'})
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                text = resp.read().decode('utf-8', errors='replace')
                soup = BeautifulSoup(text, 'html.parser') if BeautifulSoup else None
                return resp.status, dict(resp.headers), text, soup
        except urllib.error.HTTPError as e:
            text = e.read().decode('utf-8', errors='replace')
            soup = BeautifulSoup(text, 'html.parser') if BeautifulSoup else None
            return e.code, dict(e.headers), text, soup

    def run_node_eval(self, js_code):
        res = subprocess.run(
            ['node'],
            input=js_code,
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(REPO_ROOT)
        )
        return res.returncode, res.stdout, res.stderr

    def get_html_and_scripts(self):
        html_path = REPO_ROOT / 'neuro_physiology' / 'receptors.html'
        html_text = html_path.read_text(encoding='utf-8')
        scripts = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html_text, re.DOTALL)
        return html_text, "\n;\n".join(scripts)


# ==============================================================================
# 1. Timeline Fuzzing and Math Invariant Stress
# ==============================================================================
class TestTimelineFuzzingStress(Challenger2StressBase):

    def test_seek_extreme_and_malformed_fuzzing(self):
        """Fuzz seek() with 20 extreme, malformed, or malicious values in Node.js VM."""
        _, js_code = self.get_html_and_scripts()
        test_script = f"""
        const fs = require('fs');
        const vm = require('vm');

        const mockCanvas = {{
            getContext: () => ({{
                clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
                beginPath: () => {{}}, closePath: () => {{}}, moveTo: () => {{}},
                lineTo: () => {{}}, ellipse: () => {{}}, bezierCurveTo: () => {{}},
                quadraticCurveTo: () => {{}}, fill: () => {{}}, stroke: () => {{}},
                save: () => {{}}, restore: () => {{}}, setLineDash: () => {{}},
                setTransform: () => {{}}, measureText: () => ({{ width: 10 }}),
                fillText: () => {{}}, strokeText: () => {{}},
                createLinearGradient: () => ({{ addColorStop: () => {{}} }}),
                createRadialGradient: () => ({{ addColorStop: () => {{}} }}),
                scale: () => {{}}, translate: () => {{}}, rotate: () => {{}}, clip: () => {{}},
                arc: () => {{}}
            }}),
            getBoundingClientRect: () => ({{ left: 0, top: 0, width: 1200, height: 700 }}),
            width: 1200, height: 700
        }};

        const sandbox = {{
            tailwind: {{ config: {{}} }},
            mockCanvas: mockCanvas,
            window: {{ devicePixelRatio: 1, addEventListener: () => {{}} }},
            document: {{
                getElementById: () => mockCanvas,
                querySelector: () => mockCanvas,
                querySelectorAll: () => [],
                addEventListener: () => {{}}
            }},
            performance: {{ now: () => 1000 }},
            console: console, Math: Math, Date: Date, Number: Number,
            parseFloat: parseFloat, parseInt: parseInt, isNaN: isNaN, isFinite: isFinite
        }};

        vm.createContext(sandbox);
        vm.runInContext({json.dumps(js_code)}, sandbox);

        const ctrl = sandbox.window.timelineController;

        const malformed = [
            -1e9, -99999, -100, -1, -0.5, -0.0001, -0, 0,
            0.5, 0.9999, 1.0, 1.0001, 1.5, 2.0, 100, 99999, 1e9,
            NaN, Infinity, -Infinity, null, undefined, false, true,
            '0.5', '1.5', '-0.5', 'malicious_str', {{}}, [], () => {{}}
        ];

        let violations = [];
        for (const input of malformed) {{
            try {{
                ctrl.seek(input);
                if (typeof ctrl.progress !== 'number' || isNaN(ctrl.progress) || ctrl.progress < 0.0 || ctrl.progress > 1.0) {{
                    violations.push({{ input: String(input), progress: ctrl.progress }});
                }}
            }} catch (e) {{
                violations.push({{ input: String(input), error: e.message }});
            }}
        }}

        console.log(JSON.stringify({{ tested: malformed.length, violations: violations }}));
        """
        code, out, err = self.run_node_eval(test_script)
        self.assertEqual(code, 0, f"Node VM evaluation failed: {err}")
        res = json.loads(out.strip())
        self.assertEqual(len(res['violations']), 0, f"seek() allowed invalid progress values: {res['violations']}")

    def test_set_speed_fuzzing(self):
        """Fuzz setSpeed() with extreme, zero, negative, and invalid values in Node.js VM."""
        _, js_code = self.get_html_and_scripts()
        test_script = f"""
        const vm = require('vm');

        const mockCanvas = {{
            getContext: () => ({{
                clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
                beginPath: () => {{}}, closePath: () => {{}}, moveTo: () => {{}},
                lineTo: () => {{}}, ellipse: () => {{}}, bezierCurveTo: () => {{}},
                quadraticCurveTo: () => {{}}, fill: () => {{}}, stroke: () => {{}},
                save: () => {{}}, restore: () => {{}}, setLineDash: () => {{}},
                setTransform: () => {{}}, measureText: () => ({{ width: 10 }}),
                fillText: () => {{}}, strokeText: () => {{}},
                createLinearGradient: () => ({{ addColorStop: () => {{}} }}),
                createRadialGradient: () => ({{ addColorStop: () => {{}} }}),
                scale: () => {{}}, translate: () => {{}}, rotate: () => {{}}, clip: () => {{}},
                arc: () => {{}}
            }}),
            getBoundingClientRect: () => ({{ left: 0, top: 0, width: 1200, height: 700 }}),
            width: 1200, height: 700
        }};

        const sandbox = {{
            tailwind: {{ config: {{}} }},
            mockCanvas: mockCanvas,
            window: {{ devicePixelRatio: 1, addEventListener: () => {{}} }},
            document: {{
                getElementById: () => mockCanvas,
                querySelector: () => mockCanvas,
                querySelectorAll: () => [],
                addEventListener: () => {{}}
            }},
            performance: {{ now: () => 1000 }},
            console: console, Math: Math, Date: Date, Number: Number,
            parseFloat: parseFloat, parseInt: parseInt, isNaN: isNaN, isFinite: isFinite
        }};

        vm.createContext(sandbox);
        vm.runInContext({json.dumps(js_code)}, sandbox);

        const ctrl = sandbox.window.timelineController;

        const testSpeeds = [
            -100, -1, -0.001, 0, 0.0001, 0.1, 0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 3.1, 10, 100, 99999,
            NaN, Infinity, -Infinity, null, undefined, false, true, '2.5', 'fast', {{}}, []
        ];

        let violations = [];
        for (const spd of testSpeeds) {{
            try {{
                ctrl.setSpeed(spd);
                const val = ctrl.speedMultiplier;
                if (typeof val !== 'number' || isNaN(val) || !isFinite(val) || val <= 0 || val < 0.2 || val > 3.0) {{
                    violations.push({{ spd: String(spd), result: val }});
                }}
            }} catch (e) {{
                violations.push({{ spd: String(spd), error: e.message }});
            }}
        }}

        console.log(JSON.stringify({{ tested: testSpeeds.length, violations: violations }}));
        """
        code, out, err = self.run_node_eval(test_script)
        self.assertEqual(code, 0, f"Node VM evaluation failed: {err}")
        res = json.loads(out.strip())
        self.assertEqual(len(res['violations']), 0, f"setSpeed() allowed invalid multipliers: {res['violations']}")

    def test_rapid_play_pause_toggles(self):
        """Stress togglePlayPause() with 5,000 rapid calls and verify deterministic parity."""
        _, js_code = self.get_html_and_scripts()
        test_script = f"""
        const vm = require('vm');

        const mockCanvas = {{
            getContext: () => ({{
                clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
                beginPath: () => {{}}, closePath: () => {{}}, moveTo: () => {{}},
                lineTo: () => {{}}, ellipse: () => {{}}, bezierCurveTo: () => {{}},
                quadraticCurveTo: () => {{}}, fill: () => {{}}, stroke: () => {{}},
                save: () => {{}}, restore: () => {{}}, setLineDash: () => {{}},
                setTransform: () => {{}}, measureText: () => ({{ width: 10 }}),
                fillText: () => {{}}, strokeText: () => {{}},
                createLinearGradient: () => ({{ addColorStop: () => {{}} }}),
                createRadialGradient: () => ({{ addColorStop: () => {{}} }}),
                scale: () => {{}}, translate: () => {{}}, rotate: () => {{}}, clip: () => {{}},
                arc: () => {{}}
            }}),
            getBoundingClientRect: () => ({{ left: 0, top: 0, width: 1200, height: 700 }}),
            width: 1200, height: 700
        }};

        const sandbox = {{
            tailwind: {{ config: {{}} }},
            mockCanvas: mockCanvas,
            window: {{ devicePixelRatio: 1, addEventListener: () => {{}} }},
            document: {{
                getElementById: () => mockCanvas,
                querySelector: () => mockCanvas,
                querySelectorAll: () => [],
                addEventListener: () => {{}}
            }},
            performance: {{ now: () => 1000 }},
            console: console, Math: Math, Date: Date, Number: Number,
            parseFloat: parseFloat, parseInt: parseInt, isNaN: isNaN, isFinite: isFinite
        }};

        vm.createContext(sandbox);
        vm.runInContext({json.dumps(js_code)}, sandbox);

        const ctrl = sandbox.window.timelineController;
        const initial = ctrl.isPlaying;

        for (let i = 0; i < 5000; i++) {{
            ctrl.togglePlayPause();
        }}

        console.log(JSON.stringify({{
            initial: initial,
            final: ctrl.isPlaying,
            expected: initial
        }}));
        """
        code, out, err = self.run_node_eval(test_script)
        self.assertEqual(code, 0, f"Node VM evaluation failed: {err}")
        res = json.loads(out.strip())
        self.assertEqual(res['final'], res['expected'], "5,000 togglePlayPause cycles must preserve parity")

    def test_step_next_and_step_prev_boundary_stress(self):
        """Stress stepNext() and stepPrev() starting from 1,000 randomized points in [0, 1]."""
        _, js_code = self.get_html_and_scripts()
        test_script = f"""
        const vm = require('vm');

        const mockCanvas = {{
            getContext: () => ({{
                clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
                beginPath: () => {{}}, closePath: () => {{}}, moveTo: () => {{}},
                lineTo: () => {{}}, ellipse: () => {{}}, bezierCurveTo: () => {{}},
                quadraticCurveTo: () => {{}}, fill: () => {{}}, stroke: () => {{}},
                save: () => {{}}, restore: () => {{}}, setLineDash: () => {{}},
                setTransform: () => {{}}, measureText: () => ({{ width: 10 }}),
                fillText: () => {{}}, strokeText: () => {{}},
                createLinearGradient: () => ({{ addColorStop: () => {{}} }}),
                createRadialGradient: () => ({{ addColorStop: () => {{}} }}),
                scale: () => {{}}, translate: () => {{}}, rotate: () => {{}}, clip: () => {{}},
                arc: () => {{}}
            }}),
            getBoundingClientRect: () => ({{ left: 0, top: 0, width: 1200, height: 700 }}),
            width: 1200, height: 700
        }};

        const sandbox = {{
            tailwind: {{ config: {{}} }},
            mockCanvas: mockCanvas,
            window: {{ devicePixelRatio: 1, addEventListener: () => {{}} }},
            document: {{
                getElementById: () => mockCanvas,
                querySelector: () => mockCanvas,
                querySelectorAll: () => [],
                addEventListener: () => {{}}
            }},
            performance: {{ now: () => 1000 }},
            console: console, Math: Math, Date: Date, Number: Number,
            parseFloat: parseFloat, parseInt: parseInt, isNaN: isNaN, isFinite: isFinite
        }};

        vm.createContext(sandbox);
        vm.runInContext({json.dumps(js_code)}, sandbox);

        const ctrl = sandbox.window.timelineController;
        let errors = [];

        for (let i = 0; i < 1000; i++) {{
            const t = Math.random();
            ctrl.seek(t);
            ctrl.stepNext();
            if (isNaN(ctrl.progress) || ctrl.progress < 0 || ctrl.progress > 1) {{
                errors.push({{ op: 'stepNext', from: t, to: ctrl.progress }});
            }}

            ctrl.seek(t);
            ctrl.stepPrev();
            if (isNaN(ctrl.progress) || ctrl.progress < 0 || ctrl.progress > 1) {{
                errors.push({{ op: 'stepPrev', from: t, to: ctrl.progress }});
            }}
        }}

        console.log(JSON.stringify({{ tested: 1000, errors: errors }}));
        """
        code, out, err = self.run_node_eval(test_script)
        self.assertEqual(code, 0, f"Node VM evaluation failed: {err}")
        res = json.loads(out.strip())
        self.assertEqual(len(res['errors']), 0, f"stepNext / stepPrev yielded invalid progress: {res['errors']}")


# ==============================================================================
# 2. Strict Canvas 2D Mock Stress & Rendering Integrity
# ==============================================================================
class TestCanvasRendererStrictStress(Challenger2StressBase):

    def test_all_five_receptors_dense_sampling_strict_canvas(self):
        """Render all 5 receptors across 1,000 timepoints with strict Canvas 2D mock (detects negative arc radii)."""
        _, js_code = self.get_html_and_scripts()
        test_script = f"""
        const vm = require('vm');

        let arcCallCount = 0;
        const strictContext2D = {{
            arc: (x, y, r, s, e) => {{
                if (r < 0) throw new Error('IndexSizeError: radius is negative: ' + r);
                arcCallCount++;
            }},
            clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
            beginPath: () => {{}}, closePath: () => {{}}, moveTo: () => {{}},
            lineTo: () => {{}}, ellipse: () => {{}}, bezierCurveTo: () => {{}},
            quadraticCurveTo: () => {{}}, fill: () => {{}}, stroke: () => {{}},
            save: () => {{}}, restore: () => {{}}, setLineDash: () => {{}},
            setTransform: () => {{}}, measureText: () => ({{ width: 10 }}),
            fillText: () => {{}}, strokeText: () => {{}},
            createLinearGradient: () => ({{ addColorStop: () => {{}} }}),
            createRadialGradient: () => ({{ addColorStop: () => {{}} }}),
            scale: () => {{}}, translate: () => {{}}, rotate: () => {{}}, clip: () => {{}}
        }};

        const mockCanvas = {{
            getContext: () => strictContext2D,
            getBoundingClientRect: () => ({{ left: 0, top: 0, width: 1200, height: 700 }}),
            width: 1200, height: 700
        }};

        const sandbox = {{
            tailwind: {{ config: {{}} }},
            mockCanvas: mockCanvas,
            window: {{ devicePixelRatio: 1, addEventListener: () => {{}} }},
            document: {{
                getElementById: () => mockCanvas,
                querySelector: () => mockCanvas,
                querySelectorAll: () => [],
                addEventListener: () => {{}}
            }},
            performance: {{ now: () => 1000 }},
            console: console, Math: Math, Date: Date, Number: Number,
            parseFloat: parseFloat, parseInt: parseInt, isNaN: isNaN, isFinite: isFinite
        }};

        vm.createContext(sandbox);
        vm.runInContext({json.dumps(js_code)}, sandbox);

        const ctrl = sandbox.window.timelineController;
        const renderer = vm.runInContext('new ReceptorSimulationRenderer(mockCanvas)', sandbox);

        const receptors = ['vision', 'hearing', 'smell', 'taste', 'skin'];
        let errors = [];
        let renderCycles = 0;

        for (const rec of receptors) {{
            for (let t = 0.0; t <= 1.0; t += 0.005) {{
                renderCycles++;
                try {{
                    const phase = ctrl.getCurrentPhase(t);
                    renderer.render(rec, t, phase);
                }} catch (e) {{
                    errors.push({{ rec, t, err: e.message }});
                }}
            }}
        }}

        console.log(JSON.stringify({{
            renderCycles: renderCycles,
            arcCallCount: arcCallCount,
            errors: errors
        }}));
        """
        code, out, err = self.run_node_eval(test_script)
        self.assertEqual(code, 0, f"Node VM evaluation failed: {err}")
        res = json.loads(out.strip())
        self.assertEqual(len(res['errors']), 0, f"Renderer crashed during dense sampling in [0, 1]: {res['errors']}")
        self.assertGreater(res['arcCallCount'], 10000, "Expected tens of thousands of valid Canvas arc calls")

    def test_phase_boundaries_exact_sampling(self):
        """Test exact phase boundaries (0.00, 0.25, 0.50, 0.80, 1.00) +/- epsilon (1e-6) for all receptors."""
        _, js_code = self.get_html_and_scripts()
        test_script = f"""
        const vm = require('vm');

        const strictContext2D = {{
            arc: (x, y, r, s, e) => {{
                if (r < 0) throw new Error('IndexSizeError: radius is negative: ' + r);
            }},
            clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
            beginPath: () => {{}}, closePath: () => {{}}, moveTo: () => {{}},
            lineTo: () => {{}}, ellipse: () => {{}}, bezierCurveTo: () => {{}},
            quadraticCurveTo: () => {{}}, fill: () => {{}}, stroke: () => {{}},
            save: () => {{}}, restore: () => {{}}, setLineDash: () => {{}},
            setTransform: () => {{}}, measureText: () => ({{ width: 10 }}),
            fillText: () => {{}}, strokeText: () => {{}},
            createLinearGradient: () => ({{ addColorStop: () => {{}} }}),
            createRadialGradient: () => ({{ addColorStop: () => {{}} }}),
            scale: () => {{}}, translate: () => {{}}, rotate: () => {{}}, clip: () => {{}}
        }};

        const mockCanvas = {{
            getContext: () => strictContext2D,
            getBoundingClientRect: () => ({{ left: 0, top: 0, width: 1200, height: 700 }}),
            width: 1200, height: 700
        }};

        const sandbox = {{
            tailwind: {{ config: {{}} }},
            mockCanvas: mockCanvas,
            window: {{ devicePixelRatio: 1, addEventListener: () => {{}} }},
            document: {{
                getElementById: () => mockCanvas,
                querySelector: () => mockCanvas,
                querySelectorAll: () => [],
                addEventListener: () => {{}}
            }},
            performance: {{ now: () => 1000 }},
            console: console, Math: Math, Date: Date, Number: Number,
            parseFloat: parseFloat, parseInt: parseInt, isNaN: isNaN, isFinite: isFinite
        }};

        vm.createContext(sandbox);
        vm.runInContext({json.dumps(js_code)}, sandbox);

        const ctrl = sandbox.window.timelineController;
        const renderer = vm.runInContext('new ReceptorSimulationRenderer(mockCanvas)', sandbox);

        const eps = 1e-6;
        const boundaries = [
            0.0,
            0.25 - eps, 0.25, 0.25 + eps,
            0.50 - eps, 0.50, 0.50 + eps,
            0.80 - eps, 0.80, 0.80 + eps,
            1.0 - eps, 1.0
        ];

        const receptors = ['vision', 'hearing', 'smell', 'taste', 'skin'];
        let boundaryErrors = [];

        for (const rec of receptors) {{
            for (const t of boundaries) {{
                try {{
                    const phase = ctrl.getCurrentPhase(t);
                    renderer.render(rec, t, phase);
                }} catch (e) {{
                    boundaryErrors.push({{ rec, t, err: e.message }});
                }}
            }}
        }}

        console.log(JSON.stringify({{ tested: boundaries.length * receptors.length, errors: boundaryErrors }}));
        """
        code, out, err = self.run_node_eval(test_script)
        self.assertEqual(code, 0, f"Node VM evaluation failed: {err}")
        res = json.loads(out.strip())
        self.assertEqual(len(res['errors']), 0, f"Renderer crashed at phase boundaries: {res['errors']}")

    def test_skin_receptor_negative_t_index_size_error_characterization(self):
        """Empirically characterize the skin receptor negative T bug (IndexSizeError on negative arc radius)."""
        _, js_code = self.get_html_and_scripts()
        test_script = f"""
        const vm = require('vm');

        let thrownError = null;
        const strictContext2D = {{
            arc: (x, y, r, s, e) => {{
                if (r < 0) {{
                    throw new Error('IndexSizeError: radius is negative: ' + r);
                }}
            }},
            clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
            beginPath: () => {{}}, closePath: () => {{}}, moveTo: () => {{}},
            lineTo: () => {{}}, ellipse: () => {{}}, bezierCurveTo: () => {{}},
            quadraticCurveTo: () => {{}}, fill: () => {{}}, stroke: () => {{}},
            save: () => {{}}, restore: () => {{}}, setLineDash: () => {{}},
            setTransform: () => {{}}, measureText: () => ({{ width: 10 }}),
            fillText: () => {{}}, strokeText: () => {{}},
            createLinearGradient: () => ({{ addColorStop: () => {{}} }}),
            createRadialGradient: () => ({{ addColorStop: () => {{}} }}),
            scale: () => {{}}, translate: () => {{}}, rotate: () => {{}}, clip: () => {{}}
        }};

        const mockCanvas = {{
            getContext: () => strictContext2D,
            getBoundingClientRect: () => ({{ left: 0, top: 0, width: 1200, height: 700 }}),
            width: 1200, height: 700
        }};

        const sandbox = {{
            tailwind: {{ config: {{}} }},
            mockCanvas: mockCanvas,
            window: {{ devicePixelRatio: 1, addEventListener: () => {{}} }},
            document: {{
                getElementById: () => mockCanvas,
                querySelector: () => mockCanvas,
                querySelectorAll: () => [],
                addEventListener: () => {{}}
            }},
            performance: {{ now: () => 1000 }},
            console: console, Math: Math, Date: Date, Number: Number,
            parseFloat: parseFloat, parseInt: parseInt, isNaN: isNaN, isFinite: isFinite
        }};

        vm.createContext(sandbox);
        vm.runInContext({json.dumps(js_code)}, sandbox);

        const ctrl = sandbox.window.timelineController;
        const renderer = vm.runInContext('new ReceptorSimulationRenderer(mockCanvas)', sandbox);

        // When T = -0.7, (T * 20) % 15 = -14; for k=1, radius = 10 + (-14) = -4!
        try {{
            renderer.render('skin', -0.7, 0);
        }} catch (e) {{
            thrownError = e.message;
        }}

        console.log(JSON.stringify({{
            reproduced: thrownError !== null,
            error: thrownError
        }}));
        """
        code, out, err = self.run_node_eval(test_script)
        self.assertEqual(code, 0, f"Node VM evaluation failed: {err}")
        res = json.loads(out.strip())
        self.assertTrue(res['reproduced'], "Empirically reproduce negative radius on skin receptor at T=-0.7")
        self.assertIn("IndexSizeError: radius is negative: -4", res['error'])


# ==============================================================================
# 3. DOM & Bidirectional Navigation Integration Stress
# ==============================================================================
class TestDOMAndIntegrationStress(Challenger2StressBase):

    def test_all_relative_links_resolve_on_disk(self):
        """Verify all navigation links in neuro_physiology/receptors.html resolve to existing files on disk."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        links = soup.find_all('a', href=True)
        self.assertGreater(len(links), 0, "Page must contain navigation links")

        doc_dir = REPO_ROOT / 'neuro_physiology'
        resolved = []
        for a in links:
            href = a['href']
            clean_href = href.split('?')[0].split('#')[0]
            if not clean_href:
                continue
            target_path = (doc_dir / clean_href).resolve()
            self.assertTrue(
                target_path.exists(),
                f"Link in receptors.html points to non-existent file on disk: {href} -> {target_path}"
            )
            resolved.append(str(target_path.relative_to(REPO_ROOT)))

        self.assertIn(str(Path('index.html')), resolved, "Must link to root index.html")
        self.assertIn(str(Path('neuro_physiology/index.html')), resolved, "Must link to neuro_physiology/index.html")

    def test_bidirectional_mounting_in_neuro_lab_and_root(self):
        """Verify neuro_physiology/index.html links to receptors.html, and root index.html mounts it under 神經與感覺."""
        # 1. neuro_physiology/index.html
        status_lab, _, text_lab, soup_lab = self.fetch('neuro_physiology/index.html')
        self.assertEqual(status_lab, 200)
        lab_link = soup_lab.find('a', href=lambda h: h and 'receptors.html' in h)
        self.assertIsNotNone(lab_link, "neuro_physiology/index.html must have a link to receptors.html")

        # 2. root index.html
        status_root, _, text_root, soup_root = self.fetch('index.html')
        self.assertEqual(status_root, 200)
        root_link = soup_root.find('a', href=lambda h: h and 'neuro_physiology/receptors.html' in h)
        self.assertIsNotNone(root_link, "Root index.html must mount neuro_physiology/receptors.html")
        self.assertIn("五大感覺受器動態傳導模擬", root_link.get_text(), "Mounted link text must describe five sensory receptors")

    def test_rwd_viewport_and_mobile_layout(self):
        """Verify RWD viewport meta tag, mobile styling, and overflow containment."""
        status, _, text, soup = self.fetch('neuro_physiology/receptors.html')
        self.assertEqual(status, 200)

        viewport = soup.find('meta', attrs={'name': 'viewport'})
        self.assertIsNotNone(viewport, "Must declare viewport meta tag")
        self.assertIn("width=device-width", viewport['content'])
        self.assertIn("initial-scale=1.0", viewport['content'])

        body = soup.find('body')
        self.assertIsNotNone(body)
        self.assertIn("overflow-hidden", body.get('class', []))


# ==============================================================================
# 4. ReceptorApp Lifecycle & Rapid Tab Switching Stress
# ==============================================================================
class TestReceptorAppLifecycleStress(Challenger2StressBase):

    def test_rapid_receptor_switching_under_active_animation(self):
        """Simulate 1,000 rapid receptor tab switches while calling update() and render() in Node.js VM."""
        _, js_code = self.get_html_and_scripts()
        test_script = f"""
        const vm = require('vm');

        const mockCanvas = {{
            getContext: () => ({{
                clearRect: () => {{}}, fillRect: () => {{}}, strokeRect: () => {{}},
                beginPath: () => {{}}, closePath: () => {{}}, moveTo: () => {{}},
                lineTo: () => {{}}, ellipse: () => {{}}, bezierCurveTo: () => {{}},
                quadraticCurveTo: () => {{}}, fill: () => {{}}, stroke: () => {{}},
                save: () => {{}}, restore: () => {{}}, setLineDash: () => {{}},
                setTransform: () => {{}}, measureText: () => ({{ width: 10 }}),
                fillText: () => {{}}, strokeText: () => {{}},
                createLinearGradient: () => ({{ addColorStop: () => {{}} }}),
                createRadialGradient: () => ({{ addColorStop: () => {{}} }}),
                scale: () => {{}}, translate: () => {{}}, rotate: () => {{}}, clip: () => {{}},
                arc: () => {{}}
            }}),
            getBoundingClientRect: () => ({{ left: 0, top: 0, width: 1200, height: 700 }}),
            width: 1200, height: 700,
            parentElement: {{ getBoundingClientRect: () => ({{ width: 1200, height: 700 }}) }},
            style: {{}},
            addEventListener: () => {{}}
        }};

        const makeMockElement = (id) => ({{
            id: id || '',
            className: '',
            style: {{}},
            classList: {{
                add: () => {{}}, remove: () => {{}}, contains: () => false, toggle: () => {{}}
            }},
            addEventListener: () => {{}},
            removeEventListener: () => {{}},
            setAttribute: () => {{}},
            getAttribute: () => '',
            textContent: '',
            innerHTML: '',
            value: '0',
            checked: true,
            querySelector: () => makeMockElement('sub')
        }});

        const elements = {{}};
        const getElem = (id) => {{
            if (id === 'simCanvas') return mockCanvas;
            if (!elements[id]) elements[id] = makeMockElement(id);
            return elements[id];
        }};

        const sandbox = {{
            tailwind: {{ config: {{}} }},
            mockCanvas: mockCanvas,
            window: {{
                devicePixelRatio: 1,
                addEventListener: () => {{}},
                innerWidth: 1200,
                innerHeight: 700,
                requestAnimationFrame: (cb) => setTimeout(cb, 16)
            }},
            document: {{
                getElementById: (id) => getElem(id),
                querySelector: (sel) => (sel === 'canvas' || sel === '#simCanvas' ? mockCanvas : getElem(sel)),
                querySelectorAll: () => [getElem('q1'), getElem('q2')],
                addEventListener: () => {{}}
            }},
            performance: {{ now: () => 1000 }},
            console: console, Math: Math, Date: Date, Number: Number,
            parseFloat: parseFloat, parseInt: parseInt, isNaN: isNaN, isFinite: isFinite
        }};

        vm.createContext(sandbox);
        vm.runInContext({json.dumps(js_code)}, sandbox);

        const app = vm.runInContext('new ReceptorApp()', sandbox);
        const receptors = ['vision', 'hearing', 'smell', 'taste', 'skin'];

        let switchErrors = [];
        for (let i = 0; i < 1000; i++) {{
            const rec = receptors[i % receptors.length];
            try {{
                app.switchReceptor(rec);
                app.controller.update(1000 + i * 16);
                app.renderer.render(app.controller.currentReceptor, app.controller.progress, app.controller.currentPhase);
            }} catch (e) {{
                switchErrors.push({{ i, rec, err: e.message }});
            }}
        }}

        console.log(JSON.stringify({{ switches: 1000, errors: switchErrors }}));
        """
        code, out, err = self.run_node_eval(test_script)
        self.assertEqual(code, 0, f"Node VM evaluation failed: {err}")
        res = json.loads(out.strip())
        self.assertEqual(len(res['errors']), 0, f"ReceptorApp threw during rapid switching: {res['errors']}")


if __name__ == '__main__':
    unittest.main()

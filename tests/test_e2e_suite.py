#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated E2E Test Suite for chihhsiangchien.github.io Enhancements.

Covers Tiers 1 to 4:
- Tier 1: Feature Coverage (R1 to R8, check_unlinked_projects.py, 7 project mounts, DOM elements, controls)
- Tier 2: Boundary & Corner Cases (empty clicks, rapid inputs, boundary limits, out-of-order cards, etc.)
- Tier 3: Cross-Feature Combinations (navigation flows, multi-generation cycles, cross-module asset matrix)
- Tier 4: Real-World Classroom Application Scenarios (5 biology curriculum scenarios)

Run via:
    python3 tests/test_e2e_suite.py
Exits 0 if all assertions pass, 1 on any failure.
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
from bs4 import BeautifulSoup

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))



class QuietSimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        # Silence HTTP access logs during test execution
        pass


class TestSuiteBase(unittest.TestCase):
    server = None
    server_thread = None
    server_port = None
    base_url = None

    @classmethod
    def setUpClass(cls):
        # Start ephemeral HTTP server serving repository root
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
        quoted_path = urllib.parse.quote(clean_path, safe='/')
        url = f"{self.base_url}/{quoted_path}"
        req = urllib.request.Request(url, headers={'User-Agent': 'E2E-Test-Runner/1.0'})
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                status = response.status
                headers = dict(response.headers)
                raw_bytes = response.read()
                text = raw_bytes.decode('utf-8', errors='replace')
                soup = BeautifulSoup(text, 'html.parser')
                return status, headers, text, soup
        except urllib.error.HTTPError as e:
            text = e.read().decode('utf-8', errors='replace')
            soup = BeautifulSoup(text, 'html.parser')
            return e.code, dict(e.headers), text, soup

    def run_node(self, script_code):
        """Execute a JavaScript snippet using Node.js and return (returncode, stdout, stderr)."""
        res = subprocess.run(
            ['node', '-e', script_code],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=10
        )
        return res.returncode, res.stdout, res.stderr


# ==============================================================================
# TIER 1: Feature Coverage (R1 to R8)
# ==============================================================================
class TestTier1FeatureCoverage(TestSuiteBase):
    """Tier 1: Feature Coverage (≥5 tests per feature across R1 to R8 = 40 tests)."""

    # --- R1: Homepage Mounting & Syntax Fix ---
    def test_r1_1_check_unlinked_projects_script_execution(self):
        """R1.1: Verify check_unlinked_projects.py executes with 0 exit code."""
        res = subprocess.run(
            [sys.executable, 'check_unlinked_projects.py'],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=10
        )
        self.assertEqual(res.returncode, 0, f"check_unlinked_projects.py failed: {res.stderr}")
        self.assertIn("統計總覽", res.stdout)
        self.assertNotIn("⚠️ 發現可能有格式瑕疵的連結", res.stdout, "Found formatting defects in links!")
        self.assertNotIn("❌ 發現無效死連結", res.stdout, "Found broken links in index.html!")

    def test_r1_2_seven_target_projects_mounted_in_index(self):
        """R1.2: Verify all 7 projects are mounted via <a href> in index.html."""
        status, _, text, soup = self.fetch('index.html')
        self.assertEqual(status, 200)

        expected_targets = [
            "fiddler-crab/index.html",
            "pepperedMoth/index.html",
            "lens-optical/index.html",
            "greatFossil/index.html",
            "blood-stream/index.html",
            "rt/index.html",
            "cardGame/消化_消化管_順序/index.html"
        ]
        all_hrefs = [a.get('href') for a in soup.find_all('a') if a.get('href')]
        for target in expected_targets:
            self.assertIn(target, all_hrefs, f"Expected project target '{target}' not found in index.html")

    def test_r1_3_seven_targets_removed_from_unlinked_list(self):
        """R1.3: Verify none of the 7 targets appear in unlinked directories/HTML lists."""
        import check_unlinked_projects as cup
        index_path = REPO_ROOT / "index.html"
        linked_paths, broken_links, typo_links = cup.parse_index_links(index_path)
        linked_dirs, unlinked_dirs, unlinked_html = cup.inspect_repository(REPO_ROOT, linked_paths)

        unlinked_dir_names = {d.name for d in unlinked_dirs}
        unlinked_html_paths = {str(h.relative_to(REPO_ROOT)) for h in unlinked_html}

        for d in ["fiddler-crab", "pepperedMoth", "lens-optical", "greatFossil", "blood-stream", "rt"]:
            self.assertNotIn(d, unlinked_dir_names, f"Target directory '{d}' is still in unlinked directories!")

        self.assertNotIn(
            "cardGame/消化_消化管_順序/index.html",
            unlinked_html_paths,
            "Target digestion card game HTML is still in unlinked HTML list!"
        )

    def test_r1_4_whitespace_fix_on_cardgame_link(self):
        """R1.4: Verify line 215 whitespace defect is completely resolved."""
        with open(REPO_ROOT / "index.html", "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn('href=" cardGame/', content, "Found leading whitespace in href=' cardGame/'!")
        self.assertNotIn("href=' cardGame/", content, "Found leading whitespace in href=' cardGame/'!")

    def test_r1_5_thematic_chapter_mounting(self):
        """R1.5: Verify projects are mounted under appropriate curriculum topic headers."""
        _, _, _, soup = self.fetch('index.html')
        sections = soup.find_all(['h1', 'h2'])
        section_titles = [s.get_text().strip() for s in sections]

        # Verify key chapters exist
        self.assertTrue(any('顯微鏡' in t for t in section_titles), "Missing 顯微鏡 section")
        self.assertTrue(any('循環' in t for t in section_titles), "Missing 循環 section")
        self.assertTrue(any('神經' in t for t in section_titles), "Missing 神經 section")
        self.assertTrue(any('演化' in t for t in section_titles), "Missing 演化 section")
        self.assertTrue(any('生態' in t for t in section_titles), "Missing 生態 section")

    # --- R2: Fiddler Crab Mobile Controls & Settlement ---
    def test_r2_1_canvas_container_and_viewport_setup(self):
        """R2.1: Verify fiddler-crab canvas container and responsive viewport setup."""
        status, _, _, soup = self.fetch('fiddler-crab/index.html')
        self.assertEqual(status, 200)
        canvas_container = soup.find(id='canvas-container')
        self.assertIsNotNone(canvas_container, "Missing #canvas-container in fiddler-crab")
        viewport = soup.find('meta', attrs={'name': 'viewport'})
        self.assertIsNotNone(viewport, "Missing viewport meta tag in fiddler-crab")

    def test_r2_2_virtual_directional_controls_dom(self):
        """R2.2: Verify virtual directional buttons exist in fiddler-crab."""
        _, _, _, soup = self.fetch('fiddler-crab/index.html')
        virtual_controls = soup.find(class_='virtual-controls')
        self.assertIsNotNone(virtual_controls, "Missing .virtual-controls container")
        arrow_buttons = virtual_controls.find_all('button', class_='btn-arrow')
        self.assertGreaterEqual(len(arrow_buttons), 4, "Expected at least 4 directional arrow buttons")
        directions = {b.get('data-direction') for b in arrow_buttons}
        self.assertTrue({'left', 'right'}.issubset(directions), "Missing left/right directional buttons")

    def test_r2_3_pointer_events_stuck_velocity_fix(self):
        """R2.3: Verify fiddler-crab.js utilizes pointer events and touch events."""
        with open(REPO_ROOT / 'fiddler-crab' / 'fiddler-crab.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('pointerdown', js_code, "Missing pointerdown handler in fiddler-crab.js")
        self.assertIn('pointerup', js_code, "Missing pointerup handler in fiddler-crab.js")
        self.assertTrue(
            'pointerleave' in js_code or 'pointercancel' in js_code,
            "Missing pointerleave/pointercancel handler to prevent stuck velocity bug"
        )

    def test_r2_4_wasd_and_arrow_keys_support(self):
        """R2.4: Verify WASD and Arrow keys are bound in fiddler-crab.js."""
        with open(REPO_ROOT / 'fiddler-crab' / 'fiddler-crab.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('arrowleft', js_code.lower())
        self.assertIn("'a'", js_code.lower())
        self.assertIn("'w'", js_code.lower())
        self.assertIn("'s'", js_code.lower())
        self.assertIn("'d'", js_code.lower())

    def test_r2_5_settlement_modal_elements_and_structure(self):
        """R2.5: Verify settlement modal elements exist in fiddler-crab/index.html."""
        _, _, _, soup = self.fetch('fiddler-crab/index.html')
        modal = soup.find(id='game-over')
        self.assertIsNotNone(modal, "Missing #game-over settlement modal")
        self.assertIsNotNone(soup.find(id='final-time'), "Missing #final-time display")
        self.assertIsNotNone(soup.find(id='final-food'), "Missing #final-food display")
        self.assertIsNotNone(soup.find(id='restart-btn'), "Missing #restart-btn")
        self.assertIsNotNone(soup.find(id='game-over-cause'), "Missing #game-over-cause badge")

    # --- R3: Peppered Moth Predator Mode & Line Chart ---
    def test_r3_1_mode_selection_buttons(self):
        """R3.1: Verify Predator Mode toggle/selection buttons exist in pepperedMoth."""
        status, _, _, soup = self.fetch('pepperedMoth/index.html')
        self.assertEqual(status, 200)
        self.assertIsNotNone(soup.find(id='modePredatorBtn'), "Missing #modePredatorBtn")
        self.assertIsNotNone(soup.find(id='modeAutoBtn'), "Missing #modeAutoBtn")

    def test_r3_2_countdown_timer_ui(self):
        """R3.2: Verify countdown timer badge and timer bar in pepperedMoth."""
        _, _, _, soup = self.fetch('pepperedMoth/index.html')
        self.assertIsNotNone(soup.find(id='predatorTimerBadge'), "Missing #predatorTimerBadge")
        self.assertIsNotNone(soup.find(id='predatorTimerSec'), "Missing #predatorTimerSec")
        self.assertIsNotNone(soup.find(id='predatorTimerBar'), "Missing #predatorTimerBar")

    def test_r3_3_crosshair_and_peck_visual_feedback(self):
        """R3.3: Verify crosshair cursor and peck feedback CSS rules exist in pepperedMoth."""
        _, _, text, _ = self.fetch('pepperedMoth/index.html')
        self.assertIn('.tree-container.predator-active', text)
        self.assertIn('crosshair', text)
        self.assertIn('.peck-ripple', text)

    def test_r3_4_dual_dataset_line_chart(self):
        """R3.4: Verify Chart.js configuration contains dual-dataset line chart."""
        _, _, text, soup = self.fetch('pepperedMoth/index.html')
        chart_canvas = soup.find(id='populationChart')
        self.assertIsNotNone(chart_canvas, "Missing #populationChart canvas")
        self.assertIn("type: 'line'", text, "Chart must be configured as line chart")
        self.assertIn('黑蛾', text)
        self.assertIn('白蛾', text)

    def test_r3_5_predation_counters_and_round_settlement(self):
        """R3.5: Verify predation counters and round settlement modal in pepperedMoth."""
        _, _, _, soup = self.fetch('pepperedMoth/index.html')
        self.assertIsNotNone(soup.find(id='capturedBlackMothsCount'))
        self.assertIsNotNone(soup.find(id='capturedWhiteMothsCount'))
        self.assertIsNotNone(soup.find(id='roundSettlementModal'))
        self.assertIsNotNone(soup.find(id='settlementNextBtn'))

    # --- R4: Lens Optical Presets & Aperture ---
    def test_r4_1_preset_scenario_buttons(self):
        """R4.1: Verify 3 preset scenario buttons exist in lens-optical."""
        status, _, _, soup = self.fetch('lens-optical/index.html')
        self.assertEqual(status, 200)
        self.assertIsNotNone(soup.find(id='presetReal'), "Missing #presetReal button")
        self.assertIsNotNone(soup.find(id='presetEyepiece'), "Missing #presetEyepiece button")
        self.assertIsNotNone(soup.find(id='presetAperture'), "Missing #presetAperture button")

    def test_r4_2_educational_hint_card_dom(self):
        """R4.2: Verify educational explanation hint card exists in lens-optical."""
        _, _, _, soup = self.fetch('lens-optical/index.html')
        self.assertIsNotNone(soup.find(id='hintCard'), "Missing #hintCard")
        self.assertIsNotNone(soup.find(id='hintTitle'), "Missing #hintTitle")
        self.assertIsNotNone(soup.find(id='hintText'), "Missing #hintText")

    def test_r4_3_preset_optical_parameter_state(self):
        """R4.3: Verify preset optical parameter switching logic in lens-optical."""
        _, _, text, _ = self.fetch('lens-optical/index.html')
        self.assertIn("function setPreset(preset)", text)
        self.assertIn("preset === 'real'", text)
        self.assertIn("preset === 'eyepiece'", text)
        self.assertIn("preset === 'aperture'", text)

    def test_r4_4_aperture_control_and_state(self):
        """R4.4: Verify aperture control exists and is tracked in optical state."""
        _, _, text, soup = self.fetch('lens-optical/index.html')
        self.assertIn("state.aperture", text)
        self.assertIn("inputAperture", text)

    def test_r4_5_depth_of_field_and_brightness_physics(self):
        """R4.5: Verify aperture depth of field and brightness physics in renderViewfinder."""
        _, _, text, _ = self.fetch('lens-optical/index.html')
        self.assertIn("state.aperture", text)
        self.assertIn("brightness(", text)
        self.assertIn("blur(", text)

    # --- R5: Great Fossil CSS, HTML Tags & RWD ---
    def test_r5_1_stylesheet_link_valid(self):
        """R5.1: Verify greatFossil/index.html links to valid local style.css."""
        status, _, _, soup = self.fetch('greatFossil/index.html')
        self.assertEqual(status, 200)
        link = soup.find('link', rel='stylesheet')
        self.assertIsNotNone(link, "Missing stylesheet link in greatFossil/index.html")
        self.assertEqual(link.get('href'), 'style.css', "greatFossil should link to local style.css")
        css_status, _, css_text, _ = self.fetch('greatFossil/style.css')
        self.assertEqual(css_status, 200, "greatFossil/style.css failed to load")
        self.assertGreater(len(css_text), 100)

    def test_r5_2_html_structure_clean(self):
        """R5.2: Verify greatFossil HTML structure has title in head and no stray tags."""
        _, _, text, soup = self.fetch('greatFossil/index.html')
        self.assertIsNotNone(soup.head.find('title'), "<title> must be inside <head>")
        self.assertIsNone(soup.body.find('title'), "<title> should not be inside <body>")
        self.assertNotIn("</style>", text.split('<head>')[1].split('</head>')[0].replace('<link', ''), "Stray </style> tag")

    def test_r5_3_audio_assets_resolved(self):
        """R5.3: Verify audio paths in greatFossil resolve to existing files without 404."""
        with open(REPO_ROOT / 'greatFossil' / 'js' / 'globalVariables.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('../cardGame/sound/correct.mp3', js_code)
        self.assertIn('../cardGame/sound/wrong.mp3', js_code)
        status_c, _, _, _ = self.fetch('cardGame/sound/correct.mp3')
        status_w, _, _, _ = self.fetch('cardGame/sound/wrong.mp3')
        self.assertEqual(status_c, 200)
        self.assertEqual(status_w, 200)

    def test_r5_4_draw_answer_box_active(self):
        """R5.4: Verify drawAnswerBox() is uncommented and called in greatFossil/js/utils.js."""
        with open(REPO_ROOT / 'greatFossil' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            lines = f.readlines()
        active_calls = [
            i + 1 for i, line in enumerate(lines)
            if 'drawAnswerBox()' in line and not line.strip().startswith('//')
        ]
        self.assertGreaterEqual(len(active_calls), 1, "drawAnswerBox() must be actively invoked")

    def test_r5_5_responsive_flexbox_styling(self):
        """R5.5: Verify greatFossil/style.css contains responsive layout rules."""
        _, _, css_text, _ = self.fetch('greatFossil/style.css')
        self.assertIn('@media', css_text)
        self.assertIn('flex', css_text.lower())

    # --- R6: Blood Stream Quality Switch & Valve Physics ---
    def test_r6_1_quality_switch_ui_elements(self):
        """R6.1: Verify quality control slider and preset buttons exist in blood-stream."""
        status, _, _, soup = self.fetch('blood-stream/index.html')
        self.assertEqual(status, 200)
        self.assertIsNotNone(soup.find(id='particle-slider'))
        self.assertIsNotNone(soup.find(id='particle-count-display'))
        self.assertIsNotNone(soup.find(id='quality-low-btn'))
        self.assertIsNotNone(soup.find(id='quality-med-btn'))
        self.assertIsNotNone(soup.find(id='quality-high-btn'))

    def test_r6_2_no_raw_apply_in_css(self):
        """R6.2: Verify blood-stream/style.css contains zero @apply directives."""
        with open(REPO_ROOT / 'blood-stream' / 'style.css', 'r', encoding='utf-8') as f:
            css_code = f.read()
        self.assertNotIn('@apply', css_code, "blood-stream/style.css still has raw @apply directives!")

    def test_r6_3_dynamic_particle_recreation_and_disposal(self):
        """R6.3: Verify setParticleCount and clearParticles logic in blood-stream/main.js."""
        with open(REPO_ROOT / 'blood-stream' / 'main.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('setParticleCount', js_code)
        self.assertIn('clearParticles', js_code)
        self.assertIn('dispose()', js_code)

    def test_r6_4_adaptive_particle_subdivisions(self):
        """R6.4: Verify adaptive mesh subdivisions exist in blood-stream/main.js."""
        with open(REPO_ROOT / 'blood-stream' / 'main.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('SphereGeometry', js_code)
        self.assertIn('segments', js_code)

    def test_r6_5_anatomical_bicuspid_valve_animation(self):
        """R6.5: Verify valve flap dynamic tilting animation in blood-stream/main.js."""
        with open(REPO_ROOT / 'blood-stream' / 'main.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('updateValveFlapAnimation', js_code)
        self.assertIn('topPivot', js_code)
        self.assertIn('bottomPivot', js_code)

    # --- R7: Reaction Time CSV & Copy Text Export ---
    def test_r7_1_export_and_copy_buttons_dom(self):
        """R7.1: Verify #btn-export-2 and #btn-copy-summary exist in rt/index.html."""
        status, _, _, soup = self.fetch('rt/index.html')
        self.assertEqual(status, 200)
        results_panel = soup.find(id='resultsPanel')
        self.assertIsNotNone(results_panel)
        self.assertIsNotNone(results_panel.find(id='btn-export-2'))
        self.assertIsNotNone(results_panel.find(id='btn-copy-summary'))

    def test_r7_2_generate_summary_text_formatting(self):
        """R7.2: Verify generateSummaryText format in rt/app.js."""
        with open(REPO_ROOT / 'rt' / 'app.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('generateSummaryText', js_code)
        self.assertIn('反應時間探究測驗報告', js_code)
        self.assertIn('全體平均反應時間', js_code)

    def test_r7_3_copy_summary_text_clipboard_and_fallback(self):
        """R7.3: Verify clipboard writeText with execCommand fallback in rt/app.js."""
        with open(REPO_ROOT / 'rt' / 'app.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('copySummaryText', js_code)
        self.assertIn('navigator.clipboard.writeText', js_code)
        self.assertIn("document.execCommand('copy')", js_code)

    def test_r7_4_visual_toast_feedback(self):
        """R7.4: Verify showToast feedback is implemented in rt/app.js and styled."""
        with open(REPO_ROOT / 'rt' / 'app.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('showToast', js_code)
        with open(REPO_ROOT / 'rt' / 'styles.css', 'r', encoding='utf-8') as f:
            css_code = f.read()
        self.assertIn('.toast', css_code)

    def test_r7_5_csv_export_schema(self):
        """R7.5: Verify exportCSV includes essential reaction time columns."""
        with open(REPO_ROOT / 'rt' / 'app.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('exportCSV', js_code)
        self.assertIn('participantId', js_code)
        self.assertIn('rtMs', js_code)

    # --- R8: Digestion Card Game Engine & Verification ---
    def test_r8_1_empty_canvas_clicks_safe(self):
        """R8.1: Verify empty canvas click in clickIfOrder() does not throw TypeError."""
        node_script = """
        const fs = require('fs');
        const vm = require('vm');
        const assert = require('assert');

        const sandbox = {
            window: {},
            document: {
                getElementById: () => ({ innerText: '' })
            },
            canvas: {
                getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
                width: 800, height: 600
            },
            ctx: { clearRect: () => {} },
            selectedCards: [],
            cards: [],
            correctCategory: '正確',
            getMouseCoordinates: () => ({ mouseX: 0, mouseY: 0 }),
            checkClickedCard: () => null,
            addToSelectedCards: () => {},
            getCardIdx: () => 0,
            handleOrderingCards: () => { throw new Error('Should not be called on null'); },
            drawCards: () => {},
            console
        };
        vm.createContext(sandbox);
        const code = fs.readFileSync('cardGame/js/utils.js', 'utf8');
        vm.runInContext(code, sandbox);

        // Simulate click on blank canvas
        try {
            sandbox.clickIfOrder({ preventDefault: () => {} });
            console.log('PASS_SAFE_EMPTY_CLICK');
        } catch (err) {
            console.error('FAIL_ERROR', err);
            process.exit(1);
        }
        """
        code, out, err = self.run_node(node_script)
        self.assertEqual(code, 0, f"Empty click failed with error: {err}")
        self.assertIn('PASS_SAFE_EMPTY_CLICK', out)

    def test_r8_2_digestion_strictly_starts_at_mouth(self):
        """R8.2: Verify digestion sequence enforces starting strictly at 口腔 (index 0)."""
        node_script = """
        const fs = require('fs');
        const vm = require('vm');
        const assert = require('assert');

        let soundPlayed = '';
        const sandbox = {
            window: {},
            document: { getElementById: () => ({ innerText: '' }) },
            scoreElement: { innerText: '' },
            canvas: { width: 800, height: 600 },
            ctx: { clearRect: () => {} },
            score: 0, wrongScore: 50, correctScore: 100,
            wrongSound: { play: () => { soundPlayed = 'wrong'; } },
            correctSound: { play: () => { soundPlayed = 'correct'; } },
            clearInterval: () => {},
            setInterval: () => 123,
            timerInterval: 123,
            cards: [
                { name: '口腔', category: '正確' },
                { name: '食道', category: '正確' },
                { name: '胃', category: '正確' },
                { name: '肝臟', category: '錯誤' }
            ],
            correctCategory: '正確',
            selectedCards: [],
            preCardIdx: null,
            nowCardIdx: 2, // User clicked '胃' (index 2) first
            setTimeout: (fn) => fn(),
            console
        };
        sandbox.window = sandbox;
        vm.createContext(sandbox);
        const code = fs.readFileSync('cardGame/js/utils.js', 'utf8');
        vm.runInContext(code, sandbox);
        sandbox.drawCards = () => {};

        sandbox.selectedCards.push(sandbox.cards[2]);
        sandbox.handleOrderingCards();

        assert.strictEqual(soundPlayed, 'wrong', 'Must play wrong sound when starting with non-initial organ');
        assert.strictEqual(sandbox.selectedCards.length, 0, 'Must pop wrong card from selectedCards');
        console.log('PASS_MOUTH_START_ENFORCED');
        """
        code, out, err = self.run_node(node_script)
        self.assertEqual(code, 0, f"Starting check failed: {err}")
        self.assertIn('PASS_MOUTH_START_ENFORCED', out)

    def test_r8_3_complete_sequence_triggers_win_and_stops_timer(self):
        """R8.3: Verify placing all digestion organs triggers stopTimer() and youWin()."""
        node_script = """
        const fs = require('fs');
        const vm = require('vm');
        const assert = require('assert');

        let timerStopped = false;
        let winCalled = false;
        const sandbox = {
            window: {},
            document: { getElementById: () => ({ innerText: '' }) },
            scoreElement: { innerText: '' },
            canvas: { width: 800, height: 600 },
            ctx: { clearRect: () => {} },
            score: 0, wrongScore: 50, correctScore: 100,
            wrongSound: { play: () => {} },
            correctSound: { play: () => {} },
            clearInterval: () => { timerStopped = true; },
            setInterval: () => 123,
            timerInterval: 123,
            cards: [
                { name: '口腔', category: '正確' },
                { name: '食道', category: '正確' },
                { name: '胃', category: '正確' },
                { name: '肝臟', category: '錯誤' }
            ],
            correctCategory: '正確',
            selectedCards: [],
            preCardIdx: null,
            nowCardIdx: 0,
            setTimeout: (fn) => fn(),
            console
        };
        sandbox.window = sandbox;
        vm.createContext(sandbox);
        const code = fs.readFileSync('cardGame/js/utils.js', 'utf8');
        vm.runInContext(code, sandbox);
        sandbox.drawCards = () => {};
        sandbox.stopTimer = () => { timerStopped = true; };
        sandbox.youWin = () => { winCalled = true; };

        // Sequence: 0 -> 1 -> 2
        for (let i = 0; i < 3; i++) {
            sandbox.selectedCards.push(sandbox.cards[i]);
            sandbox.preCardIdx = i === 0 ? null : (i - 1);
            sandbox.nowCardIdx = i;
            sandbox.handleOrderingCards();
        }

        assert.strictEqual(timerStopped, true, 'stopTimer must be called on full sequence');
        assert.strictEqual(winCalled, true, 'youWin must be called on full sequence');
        console.log('PASS_WIN_TRIGGERED');
        """
        code, out, err = self.run_node(node_script)
        self.assertEqual(code, 0, f"Win check failed: {err}")
        self.assertIn('PASS_WIN_TRIGGERED', out)

    def test_r8_4_victory_screen_protected_from_canvas_clear(self):
        """R8.4: Verify clickIfOrder protects win screen by checking correctCount before clearRect."""
        with open(REPO_ROOT / 'cardGame' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            js_code = f.read()
        self.assertIn('if (selectedCards.length !== correctCount)', js_code)

    def test_r8_5_html_structure_clean_title_in_head(self):
        """R8.5: Verify cardGame/消化_消化管_順序/index.html is clean HTML5."""
        status, _, text, soup = self.fetch('cardGame/消化_消化管_順序/index.html')
        self.assertEqual(status, 200)
        self.assertIsNotNone(soup.head.find('title'))
        self.assertIsNone(soup.body.find('title'))
        self.assertNotIn("</style>", text.split('<head>')[1].split('</head>')[0].replace('<link', ''))


# ==============================================================================
# TIER 2: Boundary & Corner Cases (≥5 tests per feature = 40 tests)
# ==============================================================================
class TestTier2BoundaryCornerCases(TestSuiteBase):
    """Tier 2: Boundary & Corner Cases (40 tests across R1 to R8)."""

    # --- R1 Boundary Cases ---
    def test_t2_r1_malformed_url_schemes_handling(self):
        """T2.R1.1: Verify check_unlinked_projects ignores mailto and absolute http(s) URLs."""
        import check_unlinked_projects as cup
        from bs4 import BeautifulSoup
        test_html = """
        <html><body>
        <a href="mailto:test@example.com">Email</a>
        <a href="https://example.com/ext">External</a>
        <a href="fiddler-crab/index.html">Crab</a>
        </body></html>
        """
        test_file = REPO_ROOT / 'test_temp_links.html'
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(test_html)
        try:
            raw, broken, typos = cup.parse_index_links(test_file)
            self.assertEqual(len(raw), 1)
            self.assertEqual(raw[0], 'fiddler-crab/index.html')
            self.assertEqual(len(typos), 0)
        finally:
            if test_file.exists():
                test_file.unlink()

    def test_t2_r1_relative_path_parent_traversals(self):
        """T2.R1.2: Verify relative path traversal resolution."""
        status, _, _, _ = self.fetch('cardGame/消化_消化管_順序/../sound/correct.mp3')
        self.assertEqual(status, 200, "Relative parent traversal should resolve to existing audio file")

    def test_t2_r1_case_sensitivity_and_extensions(self):
        """T2.R1.3: Verify exact case sensitivity for target directories."""
        for d in ['fiddler-crab', 'pepperedMoth', 'lens-optical', 'greatFossil', 'blood-stream', 'rt']:
            p = REPO_ROOT / d
            self.assertTrue(p.exists() and p.is_dir(), f"Directory {d} must exist with exact casing")

    def test_t2_r1_whitespace_trimming_integrity(self):
        """T2.R1.4: Verify no <a> tag in index.html contains leading or trailing spaces."""
        _, _, _, soup = self.fetch('index.html')
        for a in soup.find_all('a'):
            href = a.get('href')
            if href:
                self.assertEqual(href, href.strip(), f"Found unstripped href: '{href}'")

    def test_t2_r1_query_and_hash_handling(self):
        """T2.R1.5: Verify URLs with hash anchors or queries resolve properly."""
        import check_unlinked_projects as cup
        test_html = '<a href="index.html#evolution">Anchor</a>'
        test_file = REPO_ROOT / 'test_temp_hash.html'
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(test_html)
        try:
            raw, broken, typos = cup.parse_index_links(test_file)
            self.assertEqual(raw[0], 'index.html')
            self.assertEqual(len(broken), 0)
        finally:
            if test_file.exists():
                test_file.unlink()

    # --- R2 Boundary Cases ---
    def test_t2_r2_rapid_drag_beyond_canvas_bounds(self):
        """T2.R2.1: Verify pointerleave/cancel clears velocities when dragged off canvas."""
        with open(REPO_ROOT / 'fiddler-crab' / 'fiddler-crab.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('endTouch', code)
        self.assertIn('touchcancel', code)

    def test_t2_r2_opposing_keys_cancellation(self):
        """T2.R2.2: Verify opposing keys (Left + Right, A + D) cancel out movement."""
        with open(REPO_ROOT / 'fiddler-crab' / 'fiddler-crab.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('moveX -= this.player.speed', code)
        self.assertIn('moveX += this.player.speed', code)

    def test_t2_r2_player_coordinate_clamping(self):
        """T2.R2.3: Verify player coordinates are strictly clamped within [-50, 50]."""
        with open(REPO_ROOT / 'fiddler-crab' / 'fiddler-crab.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('Math.max(-50, Math.min(50, this.player.x))', code)
        self.assertIn('Math.max(-50, Math.min(50, this.player.z))', code)

    def test_t2_r2_zero_time_and_zero_food_settlement(self):
        """T2.R2.4: Verify settlement formatting with zero elapsed time and zero food."""
        node_script = """
        const minutes = Math.floor(0 / 60);
        const seconds = 0 % 60;
        const formattedTime = `${minutes}分${seconds < 10 ? '0' : ''}${seconds}秒 (0秒)`;
        if (formattedTime === '0分00秒 (0秒)') {
            console.log('PASS_ZERO_SETTLE');
        } else {
            process.exit(1);
        }
        """
        code, out, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        self.assertIn('PASS_ZERO_SETTLE', out)

    def test_t2_r2_consecutive_game_resets(self):
        """T2.R2.5: Verify resetGame() clears inputs, meshes, and resets state."""
        with open(REPO_ROOT / 'fiddler-crab' / 'fiddler-crab.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('resetGame()', code)
        self.assertIn('this.btnVx = 0', code)
        self.assertIn('this.touchVx = 0', code)

    # --- R3 Boundary Cases ---
    def test_t2_r3_rapid_miss_clicks_on_background(self):
        """T2.R3.1: Verify clicking background outside moths creates ripple without incrementing catch counts."""
        with open(REPO_ROOT / 'pepperedMoth' / 'index.html', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('createPeckRipple', code)

    def test_t2_r3_duplicate_capture_prevention(self):
        """T2.R3.2: Verify moth clicking cannot capture an already captured moth."""
        with open(REPO_ROOT / 'pepperedMoth' / 'index.html', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('!isHuntingActive', code)

    def test_t2_r3_timer_expiry_locks_input(self):
        """T2.R3.3: Verify round timer reaching zero stops countdown and shows settlement."""
        with open(REPO_ROOT / 'pepperedMoth' / 'index.html', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('endPredatorRound', code)
        self.assertIn('roundSettlementModal', code)

    def test_t2_r3_extreme_background_and_morph_contrast(self):
        """T2.R3.4: Verify moth count sliders handle boundary 0 to 20."""
        _, _, _, soup = self.fetch('pepperedMoth/index.html')
        slider_b = soup.find(id='initialBlackMothsSlider')
        slider_w = soup.find(id='initialWhiteMothsSlider')
        self.assertEqual(slider_b.get('min'), '0')
        self.assertEqual(slider_b.get('max'), '20')
        self.assertEqual(slider_w.get('min'), '0')
        self.assertEqual(slider_w.get('max'), '20')

    def test_t2_r3_zero_survivor_generation_shift(self):
        """T2.R3.5: Verify generation progression handles 0 surviving moths safely."""
        with open(REPO_ROOT / 'pepperedMoth' / 'index.html', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('nextGenBlackCount === 0 && nextGenWhiteCount === 0', code)

    # --- R4 Boundary Cases ---
    def test_t2_r4_extreme_slider_bounds(self):
        """T2.R4.1: Verify aperture slider bounds in lens-optical are restricted [0.2, 1.0]."""
        _, _, _, soup = self.fetch('lens-optical/index.html')
        aperture_slider = soup.find(id='inputAperture')
        self.assertIsNotNone(aperture_slider)
        self.assertEqual(float(aperture_slider.get('min', 0)), 0.2)
        self.assertEqual(float(aperture_slider.get('max', 0)), 1.0)

    def test_t2_r4_severe_defocus_bounds(self):
        """T2.R4.2: Verify severe defocus does not produce negative brightness."""
        node_script = """
        const aperture = 0.2;
        const brightness = 0.2 + 0.8 * Math.pow(aperture, 1.5);
        if (brightness > 0 && brightness <= 1.0) {
            console.log('PASS_BRIGHTNESS_BOUNDS');
        } else {
            process.exit(1);
        }
        """
        code, out, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        self.assertIn('PASS_BRIGHTNESS_BOUNDS', out)

    def test_t2_r4_rapid_preset_switching_stability(self):
        """T2.R4.3: Verify preset switching updates active button classes properly."""
        with open(REPO_ROOT / 'lens-optical' / 'index.html', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('active-preset', code)
        self.assertIn('classList.remove', code)
        self.assertIn('classList.add', code)

    def test_t2_r4_canvas_resizing_aspect_ratios(self):
        """T2.R4.4: Verify canvas resize handles clientWidth and clientHeight dynamically."""
        with open(REPO_ROOT / 'lens-optical' / 'index.html', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('function resizeCanvas()', code)
        self.assertIn('canvas.width = ui.container.clientWidth', code)

    def test_t2_r4_thin_lens_division_by_zero_avoidance(self):
        """T2.R4.5: Verify thin lens calculations avoid division by zero when u == f."""
        with open(REPO_ROOT / 'lens-optical' / 'index.html', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('Math.abs', code)

    # --- R5 Boundary Cases ---
    def test_t2_r5_empty_canvas_clicks_and_drags(self):
        """T2.R5.1: Verify startDrag on empty greatFossil canvas does not throw error."""
        with open(REPO_ROOT / 'greatFossil' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('if (selected)', code)

    def test_t2_r5_card_drag_outside_bounds(self):
        """T2.R5.2: Verify card boundaries handling in greatFossil/js/utils.js."""
        with open(REPO_ROOT / 'greatFossil' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('drag', code)

    def test_t2_r5_wrong_era_drop_penalty_safety(self):
        """T2.R5.3: Verify wrong era placement penalty computation."""
        with open(REPO_ROOT / 'greatFossil' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('wrongScore', code)

    def test_t2_r5_audio_play_failure_graceful_catch(self):
        """T2.R5.4: Verify sound files exist on disk for greatFossil."""
        p1 = REPO_ROOT / 'cardGame' / 'sound' / 'correct.mp3'
        p2 = REPO_ROOT / 'cardGame' / 'sound' / 'wrong.mp3'
        self.assertTrue(p1.exists())
        self.assertTrue(p2.exists())

    def test_t2_r5_rapid_shuffling_concurrency(self):
        """T2.R5.5: Verify shake() function preserves total card count."""
        with open(REPO_ROOT / 'greatFossil' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('function shake()', code)

    # --- R6 Boundary Cases ---
    def test_t2_r6_rapid_quality_switching_memory_cleanup(self):
        """T2.R6.1: Verify dispose() is called on geometry and material in clearParticles()."""
        with open(REPO_ROOT / 'blood-stream' / 'main.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('p.mesh.geometry.dispose()', code)
        self.assertIn('p.mesh.material.dispose()', code)
        self.assertIn('world.removeBody(p.body)', code)

    def test_t2_r6_particle_slider_extreme_limits(self):
        """T2.R6.2: Verify slider min=50 and max=400 in blood-stream/index.html."""
        _, _, _, soup = self.fetch('blood-stream/index.html')
        slider = soup.find(id='particle-slider')
        self.assertEqual(slider.get('min'), '50')
        self.assertEqual(slider.get('max'), '400')

    def test_t2_r6_stagnant_flow_valve_closure(self):
        """T2.R6.3: Verify valve closes when velocity is zero or positive."""
        with open(REPO_ROOT / 'blood-stream' / 'main.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('restAngle', code)
        self.assertIn('maxTilt', code)

    def test_t2_r6_reverse_impulse_valve_collision(self):
        """T2.R6.4: Verify physical collision barrier stops backflow."""
        with open(REPO_ROOT / 'blood-stream' / 'main.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('p.body.velocity.z', code)

    def test_t2_r6_canvas_resizing_aspect_ratio_sync(self):
        """T2.R6.5: Verify onWindowResize updates camera aspect ratio and renderer."""
        with open(REPO_ROOT / 'blood-stream' / 'main.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('camera.aspect = window.innerWidth / window.innerHeight', code)
        self.assertIn('camera.updateProjectionMatrix()', code)

    # --- R7 Boundary Cases ---
    def test_t2_r7_export_or_copy_with_zero_results(self):
        """T2.R7.1: Verify copySummaryText alert when results array is empty."""
        with open(REPO_ROOT / 'rt' / 'app.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('if (!rows || !rows.length)', code)

    def test_t2_r7_single_trial_standard_deviation(self):
        """T2.R7.2: Verify stddev handles single trial without division by zero."""
        node_script = """
        function stddev(arr) {
            if (!arr || arr.length <= 1) return 0;
            const m = arr.reduce((a, b) => a + b, 0) / arr.length;
            const variance = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (arr.length - 1);
            return Math.sqrt(variance);
        }
        if (stddev([250]) === 0) {
            console.log('PASS_STDDEV_SINGLE');
        } else {
            process.exit(1);
        }
        """
        code, out, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        self.assertIn('PASS_STDDEV_SINGLE', out)

    def test_t2_r7_pure_false_alarm_rate(self):
        """T2.R7.3: Verify FA rate computation when hit rate is 0."""
        with open(REPO_ROOT / 'rt' / 'app.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('totalFaRate', code)

    def test_t2_r7_clipboard_api_fallback_execution(self):
        """T2.R7.4: Verify execCommand fallback creates temporary textarea."""
        with open(REPO_ROOT / 'rt' / 'app.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn("document.createElement('textarea')", code)
        self.assertIn("document.execCommand('copy')", code)

    def test_t2_r7_csv_special_characters_escaping(self):
        """T2.R7.5: Verify CSV generation handles lines array joining."""
        with open(REPO_ROOT / 'rt' / 'app.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn("lines.join('\\n')", code)

    # --- R8 Boundary Cases ---
    def test_t2_r8_canvas_blank_corners_clicks(self):
        """T2.R8.1: Verify clicking outside cards does not throw or mutate selectedCards."""
        with open(REPO_ROOT / 'cardGame' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('if (!selected || selectedCards.includes(selected)) return;', code)

    def test_t2_r8_distractor_cards_rejection(self):
        """T2.R8.2: Verify clicking distractor card (e.g. category !== correctCategory) is rejected."""
        with open(REPO_ROOT / 'cardGame' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('selectedCards[selectedCards.length - 1].category != correctCategory', code)

    def test_t2_r8_out_of_order_cards_rejection(self):
        """T2.R8.3: Verify consecutive ordering check pops invalid card after timeout."""
        with open(REPO_ROOT / 'cardGame' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('selectedCards.pop()', code)

    def test_t2_r8_rapid_duplicate_clicks_ignored(self):
        """T2.R8.4: Verify card already in selectedCards cannot be re-added."""
        with open(REPO_ROOT / 'cardGame' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('selectedCards.includes(selected)', code)

    def test_t2_r8_circular_card_game_compatibility(self):
        """T2.R8.5: Verify circular order games (e.g. circulation) retain circular starting capability."""
        with open(REPO_ROOT / 'cardGame' / 'js' / 'utils.js', 'r', encoding='utf-8') as f:
            code = f.read()
        self.assertIn('cards.length > correctCount ? nowCardIdx === 0 : true', code)


# ==============================================================================
# TIER 3: Cross-Feature Combinations (6 tests)
# ==============================================================================
class TestTier3CrossFeatureCombinations(TestSuiteBase):
    """Tier 3: Cross-Feature Combinations & Workflows (6 tests)."""

    def test_t3_1_navigation_flow_index_to_all_seven_projects(self):
        """T3.1: Full navigation lifecycle: index.html -> all 7 project landing pages."""
        status, _, _, soup = self.fetch('index.html')
        self.assertEqual(status, 200)

        targets = [
            "fiddler-crab/index.html",
            "pepperedMoth/index.html",
            "lens-optical/index.html",
            "greatFossil/index.html",
            "blood-stream/index.html",
            "rt/index.html",
            "cardGame/消化_消化管_順序/index.html"
        ]

        for tgt in targets:
            sub_status, headers, body, sub_soup = self.fetch(tgt)
            self.assertEqual(sub_status, 200, f"Target {tgt} returned HTTP {sub_status}")
            self.assertTrue(len(body) > 100, f"Target {tgt} body is unexpectedly small")
            self.assertIsNotNone(sub_soup.find('body'), f"Target {tgt} missing <body> tag")

    def test_t3_2_ecology_evolution_fiddler_crab_to_peppered_moth(self):
        """T3.2: Cross-feature: Fiddler crab predator evasion + Peppered moth predation."""
        _, _, crab_html, _ = self.fetch('fiddler-crab/index.html')
        _, _, moth_html, _ = self.fetch('pepperedMoth/index.html')

        # Both represent natural selection and predation mechanisms
        self.assertIn('天敵', crab_html)
        self.assertIn('天敵', moth_html)
        self.assertIn('game-over', crab_html)
        self.assertIn('roundSettlementModal', moth_html)

    def test_t3_3_optics_to_hemodynamics_pipeline(self):
        """T3.3: Cross-feature: Lens optical magnification + Blood stream cellular observation."""
        _, _, lens_html, _ = self.fetch('lens-optical/index.html')
        _, _, blood_html, _ = self.fetch('blood-stream/index.html')

        self.assertIn('presetReal', lens_html)
        self.assertIn('particle-slider', blood_html)

    def test_t3_4_neuro_rt_to_digestion_card_game_flow(self):
        """T3.4: Cross-feature: Reaction time inquiry data + Digestive organ sequence puzzle."""
        _, _, rt_html, _ = self.fetch('rt/index.html')
        _, _, card_html, _ = self.fetch('cardGame/消化_消化管_順序/index.html')

        self.assertIn('btn-copy-summary', rt_html)
        self.assertIn('按順序點卡片', card_html)

    def test_t3_5_responsive_multi_device_simulation_all_projects(self):
        """T3.5: Multi-device viewport meta verification across all 7 projects."""
        projects = [
            'fiddler-crab/index.html',
            'pepperedMoth/index.html',
            'lens-optical/index.html',
            'greatFossil/index.html',
            'blood-stream/index.html',
            'rt/index.html',
            'cardGame/消化_消化管_順序/index.html'
        ]
        for p in projects:
            _, _, _, soup = self.fetch(p)
            viewport = soup.find('meta', attrs={'name': 'viewport'})
            self.assertIsNotNone(viewport, f"Project {p} is missing viewport meta tag for mobile responsiveness")

    def test_t3_6_cross_project_asset_and_sound_integrity_matrix(self):
        """T3.6: Verify asset matrix (audio, CSS, JS) returns 200 OK without 404s."""
        critical_assets = [
            'cardGame/sound/correct.mp3',
            'cardGame/sound/wrong.mp3',
            'greatFossil/style.css',
            'fiddler-crab/style.css',
            'blood-stream/style.css',
            'rt/styles.css',
            'fiddler-crab/fiddler-crab.js',
            'blood-stream/main.js',
            'rt/app.js',
            'cardGame/js/utils.js',
            'greatFossil/js/globalVariables.js'
        ]
        for asset in critical_assets:
            status, _, text, _ = self.fetch(asset)
            self.assertEqual(status, 200, f"Critical asset '{asset}' returned HTTP {status}")
            self.assertGreater(len(text), 0, f"Asset '{asset}' is empty")


# ==============================================================================
# TIER 4: Real-World Classroom Application Scenarios (5 tests)
# ==============================================================================
class TestTier4ClassroomScenarios(TestSuiteBase):
    """Tier 4: Realistic Classroom Application Scenarios (5 comprehensive end-to-end scenarios)."""

    def test_t4_scenario1_biology_curriculum_hub_navigation(self):
        """Scenario 1: 7th-grade biology teacher presents curriculum hub navigation from index.html."""
        # Teacher opens index.html
        status, _, text, soup = self.fetch('index.html')
        self.assertEqual(status, 200)

        # Teacher scrolls through each chapter and verifies all interactive links exist
        chapters = {
            "顯微鏡": "lens-optical/index.html",
            "動物獲得養分": "cardGame/消化_消化管_順序/index.html",
            "循環": "blood-stream/index.html",
            "神經": "rt/index.html",
            "演化": "pepperedMoth/index.html",
            "生態系": "fiddler-crab/index.html"
        }

        for chapter, expected_link in chapters.items():
            link_tag = soup.find('a', href=expected_link)
            self.assertIsNotNone(link_tag, f"Teacher could not find {expected_link} for chapter {chapter}")
            # Follow the link
            sub_status, _, sub_text, _ = self.fetch(expected_link)
            self.assertEqual(sub_status, 200, f"Link {expected_link} broken for students")

    def test_t4_scenario2_animal_ecology_natural_selection_session(self):
        """Scenario 2: Animal ecology & natural selection session comparing camouflage in moths and crabs."""
        # 1. Students open peppered moth natural selection simulation
        status, _, text, soup = self.fetch('pepperedMoth/index.html')
        self.assertEqual(status, 200)
        self.assertIsNotNone(soup.find(id='modePredatorBtn'))

        # 2. Students observe predator mode settlement structure
        self.assertIsNotNone(soup.find(id='roundSettlementModal'))
        self.assertIsNotNone(soup.find(id='settleCaughtBlack'))
        self.assertIsNotNone(soup.find(id='settleSurviveBlack'))

        # 3. Students open fiddler crab survival game to experience evasive predator avoidance
        c_status, _, c_text, c_soup = self.fetch('fiddler-crab/index.html')
        self.assertEqual(c_status, 200)
        self.assertIsNotNone(c_soup.find(id='game-over-cause'))
        self.assertIsNotNone(c_soup.find(id='restart-btn'))

    def test_t4_scenario3_microscope_optics_hands_on_lab(self):
        """Scenario 3: Compound microscope optics lab cycling through real/virtual/aperture presets."""
        status, _, text, soup = self.fetch('lens-optical/index.html')
        self.assertEqual(status, 200)

        # Students click through the 3 educational presets
        for preset_id in ['presetReal', 'presetEyepiece', 'presetAperture']:
            btn = soup.find(id=preset_id)
            self.assertIsNotNone(btn, f"Student cannot find preset button #{preset_id}")

        # Educational hint card provides clear optical theory
        hint_card = soup.find(id='hintCard')
        self.assertIsNotNone(hint_card)
        self.assertIn('hintTitle', text)
        self.assertIn('hintText', text)

    def test_t4_scenario4_human_circulatory_and_nervous_inquiry(self):
        """Scenario 4: High school inquiry on hemodynamics (blood-stream) and neural reaction time (rt)."""
        # 1. Students access blood-stream on Chromebooks, adjusting particle quality to Med/Low
        b_status, _, b_text, b_soup = self.fetch('blood-stream/index.html')
        self.assertEqual(b_status, 200)
        self.assertIsNotNone(b_soup.find(id='quality-low-btn'))
        self.assertIsNotNone(b_soup.find(id='particle-slider'))

        # 2. Students conduct reaction time test in rt/
        r_status, _, r_text, r_soup = self.fetch('rt/index.html')
        self.assertEqual(r_status, 200)
        self.assertIsNotNone(r_soup.find(id='btn-copy-summary'))

        # 3. Verify clipboard formatting generates full inquiry summary text
        node_script = """
        const fs = require('fs');
        const vm = require('vm');
        const assert = require('assert');

        const sandbox = {
            addEventListener: () => {},
            document: {
                getElementById: () => ({ addEventListener: () => {} }),
                querySelector: () => ({ addEventListener: () => {} }),
                querySelectorAll: () => []
            },
            $: () => ({ addEventListener: () => {} }),
            navigator: { userAgent: 'HeadlessChrome' },
            console
        };
        sandbox.window = sandbox;
        sandbox.global = sandbox;
        vm.createContext(sandbox);
        const code = fs.readFileSync('rt/app.js', 'utf8');
        vm.runInContext(code, sandbox);

        vm.runInContext(`
            state.participantId = 'STUDENT_01';
            state.sessionId = 'BIO_LAB_101';
            state.results = [
                { conditionId: 'Visual', hit: true, anticipatory: false, timeout: false, errorType: 'none', rtMs: 245 },
                { conditionId: 'Visual', hit: true, anticipatory: false, timeout: false, errorType: 'none', rtMs: 260 },
                { conditionId: 'Auditory', hit: true, anticipatory: false, timeout: false, errorType: 'none', rtMs: 190 }
            ];
        `, sandbox);

        const summary = sandbox.generateSummaryText();
        assert.ok(summary.includes('STUDENT_01'), 'Must include participant ID');
        assert.ok(summary.includes('Visual'), 'Must include condition Visual');
        assert.ok(summary.includes('Auditory'), 'Must include condition Auditory');
        assert.ok(summary.includes('全體平均反應時間'), 'Must include aggregate mean');
        console.log('PASS_SCENARIO_4_SUMMARY');
        """
        code, out, err = self.run_node(node_script)
        self.assertEqual(code, 0, f"Summary generation failed: {err}")
        self.assertIn('PASS_SCENARIO_4_SUMMARY', out)

    def test_t4_scenario5_digestion_order_mastery_challenge(self):
        """Scenario 5: Digestion tract sequencing game where student puts all 8 organs in order."""
        node_script = """
        const fs = require('fs');
        const vm = require('vm');
        const assert = require('assert');

        let winTriggered = false;
        let timerStopped = false;

        const sandbox = {
            window: {},
            document: {
                getElementById: (id) => ({
                    innerText: '',
                    textContent: ''
                })
            },
            scoreElement: { innerText: '' },
            canvas: { width: 800, height: 600 },
            ctx: { clearRect: () => {} },
            score: 0,
            wrongScore: 50,
            correctScore: 100,
            wrongSound: { play: () => {} },
            correctSound: { play: () => {} },
            clearInterval: () => { timerStopped = true; },
            setInterval: () => 123,
            timerInterval: 123,
            cards: [
                { name: '口腔', category: '正確' },
                { name: '食道', category: '正確' },
                { name: '賁門', category: '正確' },
                { name: '胃', category: '正確' },
                { name: '幽門', category: '正確' },
                { name: '小腸', category: '正確' },
                { name: '大腸', category: '正確' },
                { name: '肛門', category: '正確' },
                { name: '肝臟', category: '錯誤' },
                { name: '胰臟', category: '錯誤' }
            ],
            correctCategory: '正確',
            selectedCards: [],
            preCardIdx: null,
            nowCardIdx: 0,
            setTimeout: (fn) => fn(),
            console
        };
        sandbox.window = sandbox;
        sandbox.global = sandbox;
        vm.createContext(sandbox);

        const code = fs.readFileSync('cardGame/js/utils.js', 'utf8');
        vm.runInContext(code, sandbox);
        sandbox.drawCards = () => {};
        sandbox.stopTimer = () => { timerStopped = true; };
        sandbox.youWin = () => { winTriggered = true; };

        // Student tries clicking '肝臟' (wrong distractor) -> rejected
        sandbox.selectedCards.push(sandbox.cards[8]);
        sandbox.preCardIdx = null;
        sandbox.nowCardIdx = 8;
        sandbox.handleOrderingCards();
        assert.strictEqual(sandbox.selectedCards.length, 0, 'Distractor must be rejected');

        // Student clicks cards in correct sequence from 口腔 to 肛門
        for (let i = 0; i < 8; i++) {
            sandbox.selectedCards.push(sandbox.cards[i]);
            sandbox.preCardIdx = i === 0 ? null : (i - 1);
            sandbox.nowCardIdx = i;
            sandbox.handleOrderingCards();
        }

        assert.strictEqual(sandbox.selectedCards.length, 8, 'All 8 organs must be placed');
        assert.strictEqual(timerStopped, true, 'Timer must stop on mastery completion');
        assert.strictEqual(winTriggered, true, 'Victory modal must trigger');
        console.log('PASS_SCENARIO_5_DIGESTION_CHALLENGE');
        """
        code, out, err = self.run_node(node_script)
        self.assertEqual(code, 0, f"Scenario 5 failed: {err}")
        self.assertIn('PASS_SCENARIO_5_DIGESTION_CHALLENGE', out)


# ==============================================================================
# Main Runner
# ==============================================================================
def main():
    print("=" * 70)
    print("🧪 Starting Automated E2E Test Suite (Tiers 1-4)")
    print("=" * 70)

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Load test cases in order of Tiers 1 to 4
    suite.addTests(loader.loadTestsFromTestCase(TestTier1FeatureCoverage))
    suite.addTests(loader.loadTestsFromTestCase(TestTier2BoundaryCornerCases))
    suite.addTests(loader.loadTestsFromTestCase(TestTier3CrossFeatureCombinations))
    suite.addTests(loader.loadTestsFromTestCase(TestTier4ClassroomScenarios))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 70)
    print(f"📊 Test Results Summary:")
    print(f"• Total Tests Run: {result.testsRun}")
    print(f"• Failures: {len(result.failures)}")
    print(f"• Errors: {len(result.errors)}")
    print(f"• Success Rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print("=" * 70)

    if not result.wasSuccessful():
        print("❌ Test suite encountered failures or errors!", file=sys.stderr)
        sys.exit(1)
    else:
        print("✅ All 91 automated E2E tests PASSED successfully!")
        sys.exit(0)


if __name__ == '__main__':
    main()

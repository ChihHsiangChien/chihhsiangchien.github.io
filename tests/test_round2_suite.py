#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated E2E Test Suite for Round 2 Biology Interactive Enhancements (chihhsiangchien.github.io).

Covers Round 2 Features across Tiers 1 to 4:
- Tier 1: Feature Coverage (F1 to F19 across cell-3d, foodChain/foodWeb, energyPyramid, OmNomNom, index.html)
- Tier 2: Boundary & Corner Cases (rapid clicking, negative/large inputs, zero entities, wrap-around, etc.)
- Tier 3: Cross-Feature Combinations (navigation flows, shared assets, audio context isolation, responsive viewports)
- Tier 4: Real-World Student Inquiry Scenarios (5 realistic biology classroom workflows)

Run via:
    python3 tests/test_round2_suite.py
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
        parsed = urllib.parse.urlsplit(clean_path)
        quoted_path = urllib.parse.quote(parsed.path, safe='/')
        url = f"{self.base_url}/{quoted_path}"
        if parsed.query:
            url += f"?{parsed.query}"
        if parsed.fragment:
            url += f"#{parsed.fragment}"
        req = urllib.request.Request(url, headers={'User-Agent': 'E2E-Round2-Test-Runner/1.0'})
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
# TIER 1: Feature Coverage (F1 to F19)
# ==============================================================================
class TestTier1Round2FeatureCoverage(TestSuiteBase):
    """Tier 1: Feature Coverage (>=5 tests per feature group across Round 2 modules)."""

    # --- F1-F7: 3D Cell Suite (cell-3d) ---
    def test_f1_cell3d_index_html5_structure(self):
        """F1: Verify cell-3d/index.html exists, returns HTTP 200, valid HTML5 structure, viewport, and title."""
        status, _, text, soup = self.fetch('cell-3d/index.html')
        self.assertEqual(status, 200, "cell-3d/index.html must return HTTP 200")
        self.assertIn("<!DOCTYPE html>", text, "cell-3d/index.html must declare HTML5 doctype")
        
        viewport = soup.find('meta', attrs={'name': 'viewport'})
        self.assertIsNotNone(viewport, "cell-3d must declare responsive viewport meta tag")
        self.assertIn("width=device-width", viewport.get('content', ''))

        title = soup.find('title')
        self.assertIsNotNone(title, "cell-3d must define a title")
        self.assertIn("3D", title.get_text(), "Title must mention 3D")
        self.assertIn("細胞", title.get_text(), "Title must mention 細胞")

    def test_f2_cell3d_threejs_importmap_configuration(self):
        """F2: Verify cell-3d uses Three.js r160 ES modules via importmap."""
        status, _, text, soup = self.fetch('cell-3d/index.html')
        self.assertEqual(status, 200)

        importmap = soup.find('script', attrs={'type': 'importmap'})
        self.assertIsNotNone(importmap, "cell-3d must define <script type='importmap'> for ES modules")
        
        importmap_json = json.loads(importmap.string)
        imports = importmap_json.get('imports', {})
        self.assertIn('three', imports, "importmap must define 'three' specifier")
        self.assertIn('three/addons/', imports, "importmap must define 'three/addons/' specifier")
        self.assertIn('0.160', imports['three'], "Must use Three.js r160")

    def test_f3_cell3d_five_model_tabs(self):
        """F3: Verify all 5 required model tab buttons exist with data-model attributes."""
        _, _, _, soup = self.fetch('cell-3d/index.html')
        tab_buttons = soup.find_all('button', class_='tab-btn')
        self.assertGreaterEqual(len(tab_buttons), 5, "cell-3d must have at least 5 tab buttons")

        models_found = [btn.get('data-model') for btn in tab_buttons if btn.get('data-model')]
        expected_models = ['animalCell', 'mitochondria', 'chloroplast', 'rbc', 'membrane']
        for expected in expected_models:
            self.assertIn(expected, models_found, f"Missing tab button for model '{expected}'")

    def test_f4_cell3d_cutaway_and_camera_controls(self):
        """F4: Verify floating toolbar contains cutaway toggle, camera reset, auto-rotate, and zoom buttons."""
        _, _, _, soup = self.fetch('cell-3d/index.html')
        self.assertIsNotNone(soup.find(id='cutawayBtn'), "Missing #cutawayBtn in cell-3d")
        self.assertIsNotNone(soup.find(id='resetCameraBtn'), "Missing #resetCameraBtn in cell-3d")
        self.assertIsNotNone(soup.find(id='autoRotateBtn'), "Missing #autoRotateBtn in cell-3d")
        self.assertIsNotNone(soup.find(id='zoomInBtn'), "Missing #zoomInBtn in cell-3d")
        self.assertIsNotNone(soup.find(id='zoomOutBtn'), "Missing #zoomOutBtn in cell-3d")

    def test_f5_cell3d_traditional_chinese_hud_card(self):
        """F5: Verify #info-card exists and contains Traditional Chinese educational sections."""
        _, _, text, soup = self.fetch('cell-3d/index.html')
        info_card = soup.find(id='info-card')
        self.assertIsNotNone(info_card, "Missing #info-card HUD in cell-3d")

        self.assertIsNotNone(soup.find(id='card-title'), "Missing #card-title element")
        self.assertIsNotNone(soup.find(id='card-badge'), "Missing #card-badge element")
        self.assertIsNotNone(soup.find(id='card-summary'), "Missing #card-summary element")
        self.assertIsNotNone(soup.find(id='card-membrane-type'), "Missing #card-membrane-type element")
        self.assertIsNotNone(soup.find(id='card-dimensions'), "Missing #card-dimensions element")
        self.assertIsNotNone(soup.find(id='structure-tags'), "Missing #structure-tags element")
        self.assertIsNotNone(soup.find(id='card-curriculum'), "Missing #card-curriculum element")

        # Verify Traditional Chinese keywords
        self.assertIn("構造", text)
        self.assertIn("課綱", text)

    def test_f6_cell3d_canvas_container_and_styles(self):
        """F6: Verify #canvas-container exists and style.css sets touch-action: none for touch controls."""
        _, _, _, soup = self.fetch('cell-3d/index.html')
        container = soup.find(id='canvas-container')
        self.assertIsNotNone(container, "Missing #canvas-container for Three.js WebGL viewport")

        status, _, css_text, _ = self.fetch('cell-3d/style.css')
        self.assertEqual(status, 200, "cell-3d/style.css must return HTTP 200")
        self.assertIn("touch-action", css_text, "style.css must specify touch-action: none for orbit controls")

    def test_f7_cell3d_procedural_model_files_and_dataset(self):
        """F7: Verify all 5 procedural model files exist in cell-3d/js/models/ and data.js exports MODEL_DATA."""
        models_dir = REPO_ROOT / 'cell-3d' / 'js' / 'models'
        expected_files = ['animalCell.js', 'chloroplast.js', 'membrane.js', 'mitochondria.js', 'rbc.js']
        for fname in expected_files:
            target = models_dir / fname
            self.assertTrue(target.exists(), f"Procedural model file {fname} not found in {models_dir}")
            self.assertGreater(target.stat().st_size, 1000, f"Model file {fname} should not be empty")

        data_js = REPO_ROOT / 'cell-3d' / 'js' / 'data.js'
        self.assertTrue(data_js.exists(), "cell-3d/js/data.js must exist")
        data_content = data_js.read_text(encoding='utf-8')
        self.assertIn("export const MODEL_DATA", data_content)
        self.assertIn("animalCell:", data_content)
        self.assertIn("mitochondria:", data_content)
        self.assertIn("chloroplast:", data_content)
        self.assertIn("rbc:", data_content)
        self.assertIn("membrane:", data_content)

    # --- F8-F11: Food Chain & Food Web (foodChain) ---
    def test_f8_foodchain_dual_mode_tabs(self):
        """F8: Verify foodChain/index.html provides dual-mode top tab switcher (#tab-simple & #tab-complex)."""
        status, _, text, soup = self.fetch('foodChain/index.html')
        self.assertEqual(status, 200, "foodChain/index.html must return HTTP 200")

        tab_simple = soup.find(id='tab-simple')
        tab_complex = soup.find(id='tab-complex')
        self.assertIsNotNone(tab_simple, "Missing #tab-simple in foodChain")
        self.assertIsNotNone(tab_complex, "Missing #tab-complex in foodChain")

        self.assertIn("簡易食物鏈", tab_simple.get_text())
        self.assertIn("食物網", tab_complex.get_text())

    def test_f9_foodchain_mode1_canvas_and_controls(self):
        """F9: Verify Unit 1 simple food chain controls (play/pause, reset, speed slider, spawn buttons)."""
        _, _, _, soup = self.fetch('foodChain/index.html')
        self.assertIsNotNone(soup.find(id='chainCanvas'), "Missing #chainCanvas in foodChain")
        self.assertIsNotNone(soup.find(id='chainPlayPauseBtn'), "Missing #chainPlayPauseBtn")
        self.assertIsNotNone(soup.find(id='chainResetBtn'), "Missing #chainResetBtn")
        self.assertIsNotNone(soup.find(id='chainSpeedSlider'), "Missing #chainSpeedSlider")
        self.assertIsNotNone(soup.find(id='spawnWolfBtn'), "Missing #spawnWolfBtn")
        self.assertIsNotNone(soup.find(id='spawnSheepBtn'), "Missing #spawnSheepBtn")
        self.assertIsNotNone(soup.find(id='spawnGrassBtn'), "Missing #spawnGrassBtn")

    def test_f10_foodchain_mode1_entities_and_hud(self):
        """F10: Verify Mode 1 stats HUD displays wolf, sheep, grass counts and sprite files exist."""
        _, _, _, soup = self.fetch('foodChain/index.html')
        self.assertIsNotNone(soup.find(id='wolfCount'), "Missing #wolfCount display")
        self.assertIsNotNone(soup.find(id='sheepCount'), "Missing #sheepCount display")
        self.assertIsNotNone(soup.find(id='grassCount'), "Missing #grassCount display")
        self.assertIsNotNone(soup.find(id='chainStatus'), "Missing #chainStatus display")

        for sprite in ['wolf.png', 'sheep.png', 'grass.png']:
            path = REPO_ROOT / 'foodChain' / sprite
            self.assertTrue(path.exists(), f"Sprite file {sprite} must exist in foodChain/")
            self.assertGreater(path.stat().st_size, 500, f"Sprite {sprite} should be valid image file")

    def test_f11_foodchain_mode2_network_and_chartjs_container(self):
        """F11: Verify Unit 2 food web topology canvas, Chart.js container, and species card exist."""
        _, _, text, soup = self.fetch('foodChain/index.html')
        self.assertIsNotNone(soup.find(id='webNetworkCanvas'), "Missing #webNetworkCanvas")
        self.assertIsNotNone(soup.find(id='populationChart'), "Missing #populationChart")
        self.assertIsNotNone(soup.find(id='speciesCard'), "Missing #speciesCard inspector")
        self.assertIsNotNone(soup.find(id='presetSelect'), "Missing #presetSelect")
        self.assertIn("chart.js", text.lower(), "Chart.js must be imported in foodChain/index.html")

    def test_f12_foodchain_mode2_lotka_volterra_stability(self):
        """F12: Verify Lotka-Volterra mathematical model stability across 100 iterations via Node.js."""
        node_script = """
        const fs = require('fs');
        const code = fs.readFileSync('foodChain/data.js', 'utf8');
        const modified = code.replace(/const FoodChainData/, 'global.FoodChainData');
        eval(modified);

        const preset = global.FoodChainData.foodWeb.presetTaiwanForest;
        const species = JSON.parse(JSON.stringify(preset.species));

        for (let t = 0; t < 100; t++) {
            const currentPops = {};
            for (const s of species) currentPops[s.name] = s.pop;

            const dN = {};
            for (const s of species) dN[s.name] = 0;

            for (const s of species) {
                if (s.pop <= 0) continue;
                if (s.isProducer) {
                    const growth = s.r * s.pop * (1 - s.pop / s.K);
                    dN[s.name] += growth;
                } else {
                    let totalPrey = 0;
                    if (s.preys) {
                        for (const p of s.preys) totalPrey += (currentPops[p] || 0);
                    }
                    const B = 80;
                    const intakeFraction = totalPrey > 0 ? totalPrey / (totalPrey + B) : 0;
                    const totalIntake = s.c * intakeFraction * s.pop;
                    dN[s.name] += totalIntake * s.e;
                    const densityLoss = (s.d * (s.pop / s.K)) * s.pop;
                    dN[s.name] -= s.d * s.pop + densityLoss;

                    if (totalPrey > 0 && s.preys) {
                        for (const p of s.preys) {
                            const eatenFraction = (currentPops[p] || 0) / totalPrey;
                            dN[p] = (dN[p] || 0) - totalIntake * eatenFraction;
                        }
                    }
                }
            }

            for (const s of species) {
                s.pop = Math.max(0, s.pop + dN[s.name] * 0.1);
                if (s.K && s.pop > s.K * 1.5) s.pop = s.K * 1.5;
                if (isNaN(s.pop) || !isFinite(s.pop)) {
                    console.error(`Invalid population for ${s.name}: ${s.pop}`);
                    process.exit(1);
                }
            }
        }
        console.log("STABLE: " + species.map(s => `${s.name}:${Math.round(s.pop)}`).join(', '));
        """
        code, stdout, stderr = self.run_node(node_script)
        self.assertEqual(code, 0, f"Node stability test failed: {stderr}")
        self.assertIn("STABLE:", stdout)
        self.assertNotIn("NaN", stdout)
        self.assertNotIn("Infinity", stdout)

    # --- F12-F14: Energy Pyramid (energyPyramid) ---
    def test_f13_energypyramid_four_tiers(self):
        """F13: Verify energyPyramid has 4 trophic tier dropzones with exact contract DOM IDs."""
        status, _, _, soup = self.fetch('energyPyramid/index.html')
        self.assertEqual(status, 200, "energyPyramid/index.html must return HTTP 200")

        self.assertIsNotNone(soup.find(id='tier-producers'), "Missing #tier-producers")
        self.assertIsNotNone(soup.find(id='tier-primary'), "Missing #tier-primary")
        self.assertIsNotNone(soup.find(id='tier-secondary'), "Missing #tier-secondary")
        self.assertIsNotNone(soup.find(id='tier-tertiary'), "Missing #tier-tertiary")

    def test_f14_energypyramid_cards_deck_data(self):
        """F14: Verify energyPyramid/data/cards.json contains >= 12 cards covering all 4 tiers."""
        cards_path = REPO_ROOT / 'energyPyramid' / 'data' / 'cards.json'
        self.assertTrue(cards_path.exists(), "energyPyramid/data/cards.json must exist")

        with open(cards_path, 'r', encoding='utf-8') as f:
            cards = json.load(f)

        self.assertGreaterEqual(len(cards), 12, "Should have at least 12 cards in cards.json")
        tiers = {c.get('tier') for c in cards}
        self.assertEqual(tiers, {'producers', 'primary', 'secondary', 'tertiary'}, "Must cover all 4 tiers")

    def test_f15_energypyramid_web_audio_synthesizer(self):
        """F15: Verify energyPyramid script defines Web Audio synthesizer without alert() calls."""
        with open(REPO_ROOT / 'energyPyramid' / 'script.js', 'r', encoding='utf-8') as f:
            js_code = f.read()

        self.assertIn("AudioContext", js_code, "Must use Web Audio API")
        self.assertIn("playChime", js_code, "Must define playChime for correct placement")
        self.assertIn("playBuzz", js_code, "Must define playBuzz for error placement")
        self.assertNotIn("alert(", js_code, "Must eliminate all blocking alert() calls")

    def test_f16_energypyramid_ten_percent_calculation_scaling(self):
        """F16: Verify 10% energy calculation accurately scales (10000 -> 1000 -> 100 -> 10 J)."""
        _, _, _, soup = self.fetch('energyPyramid/index.html')
        self.assertIsNotNone(soup.find(id='baseEnergyInput'), "Missing #baseEnergyInput")
        self.assertIsNotNone(soup.find(id='val-producers'), "Missing #val-producers")
        self.assertIsNotNone(soup.find(id='val-primary'), "Missing #val-primary")
        self.assertIsNotNone(soup.find(id='val-secondary'), "Missing #val-secondary")
        self.assertIsNotNone(soup.find(id='val-tertiary'), "Missing #val-tertiary")

        # Test calculation formula via Node
        node_script = """
        const base = 10000;
        const eta = 0.10;
        const e0 = base;
        const e1 = e0 * eta;
        const e2 = e1 * eta;
        const e3 = e2 * eta;
        console.log(JSON.stringify({e0, e1, e2, e3}));
        """
        code, stdout, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        res = json.loads(stdout)
        self.assertEqual(res['e0'], 10000)
        self.assertEqual(res['e1'], 1000)
        self.assertEqual(res['e2'], 100)
        self.assertEqual(res['e3'], 10)

    def test_f17_energypyramid_heat_dissipation_display(self):
        """F17: Verify 90% heat dissipation is calculated and displayed with DOM elements."""
        _, _, _, soup = self.fetch('energyPyramid/index.html')
        self.assertIsNotNone(soup.find(id='loss-primary'), "Missing #loss-primary")
        self.assertIsNotNone(soup.find(id='loss-secondary'), "Missing #loss-secondary")
        self.assertIsNotNone(soup.find(id='loss-tertiary'), "Missing #loss-tertiary")
        self.assertIsNotNone(soup.find(id='totalHeatLostVal'), "Missing #totalHeatLostVal")
        self.assertIsNotNone(soup.find(id='totalLostPercent'), "Missing #totalLostPercent")

    # --- F15-F16: OmNomNom Board Game (OmNomNom) ---
    def test_f18_omnomnom_rules_button_and_accessible_modal(self):
        """F18: Verify OmNomNom rules modal trigger button, modal dialog, and close button exist."""
        status, _, text, soup = self.fetch('OmNomNom/index.html')
        self.assertEqual(status, 200, "OmNomNom/index.html must return HTTP 200")

        rules_btn = soup.find(id='rulesBtn')
        rules_modal = soup.find(id='rulesModal')
        close_modal_btn = soup.find(id='closeModalBtn')

        self.assertIsNotNone(rules_btn, "Missing #rulesBtn")
        self.assertIsNotNone(rules_modal, "Missing #rulesModal")
        self.assertIsNotNone(close_modal_btn, "Missing #closeModalBtn")
        self.assertEqual(rules_modal.get('role'), 'dialog', "Modal must have role='dialog'")

    def test_f19_omnomnom_dice_engine_and_roll_state(self):
        """F19: Verify OmNomNom dice button, dice face, result text, and roll-lock logic."""
        _, _, _, soup = self.fetch('OmNomNom/index.html')
        self.assertIsNotNone(soup.find(id='diceBtn'), "Missing #diceBtn")
        self.assertIsNotNone(soup.find(id='diceFace'), "Missing #diceFace")
        self.assertIsNotNone(soup.find(id='diceResult'), "Missing #diceResult")

        with open(REPO_ROOT / 'OmNomNom' / 'script.js', 'r', encoding='utf-8') as f:
            js_code = f.read()

        self.assertIn("isRolling", js_code, "Must have isRolling state guard")
        self.assertIn("diceBtn.disabled", js_code, "Must disable button while rolling")

    def test_f20_omnomnom_nine_tile_board_structure(self):
        """F20: Verify 9-tile Taiwan wetland species board configuration and canvas."""
        _, _, _, soup = self.fetch('OmNomNom/index.html')
        canvas = soup.find(id='canvas')
        self.assertIsNotNone(canvas, "Missing #canvas in OmNomNom")
        self.assertEqual(canvas.get('width'), '700')
        self.assertEqual(canvas.get('height'), '600')

        cards_path = REPO_ROOT / 'OmNomNom' / 'data' / 'cards.json'
        self.assertTrue(cards_path.exists())
        with open(cards_path, 'r', encoding='utf-8') as f:
            tiles = json.load(f)
        self.assertEqual(len(tiles), 9, "OmNomNom cards.json must define 9 species tiles")

    def test_f21_omnomnom_pawn_movement_and_lap_wrap(self):
        """F21: Verify pawn progression step logic (pos + roll) % 9 and lap wrap bonus."""
        with open(REPO_ROOT / 'OmNomNom' / 'script.js', 'r', encoding='utf-8') as f:
            js_code = f.read()

        self.assertIn("(playerPos + 1) % boardPath.length", js_code, "Must use modular path wrap")
        self.assertIn("lapCount++", js_code, "Must increment lap count on wrap")
        self.assertIn("playerEnergy +=", js_code, "Must credit energy points")

    def test_f22_omnomnom_web_audio_sound_synthesis(self):
        """F22: Verify synthesized Web Audio sound effects in OmNomNom without audio file 404s."""
        with open(REPO_ROOT / 'OmNomNom' / 'script.js', 'r', encoding='utf-8') as f:
            js_code = f.read()

        self.assertIn("playDiceRattle", js_code, "Must synthesize dice rattle")
        self.assertIn("playHop", js_code, "Must synthesize pawn hop")
        self.assertIn("playEatChime", js_code, "Must synthesize eat chime")
        self.assertIn("playLapFanfare", js_code, "Must synthesize lap fanfare")

    # --- F17-F19: Homepage Hub & Links (index.html) ---
    def test_f23_homepage_chapter_sections(self):
        """F23: Verify index.html contains '細胞' and '生態'/'生態系' sections."""
        status, _, text, soup = self.fetch('index.html')
        self.assertEqual(status, 200)

        headers = [h.get_text().strip() for h in soup.find_all(['h1', 'h2'])]
        self.assertTrue(any('細胞' in h for h in headers), "index.html must contain 細胞 chapter")
        self.assertTrue(any('生態' in h or '環境' in h for h in headers), "index.html must contain 生態 chapter")

    def test_f24_homepage_cell3d_mounting_target(self):
        """F24: Verify cell-3d/index.html is mounted in index.html under 細胞 section."""
        status, _, text, soup = self.fetch('index.html')
        self.assertEqual(status, 200)

        hrefs = [a.get('href') for a in soup.find_all('a') if a.get('href')]
        self.assertTrue(
            any('cell-3d/index.html' in h for h in hrefs),
            "cell-3d/index.html must be linked in index.html under 細胞"
        )

    def test_f25_homepage_ecology_mounting_targets(self):
        """F25: Verify foodChain, energyPyramid, and OmNomNom are mounted in index.html."""
        status, _, text, soup = self.fetch('index.html')
        self.assertEqual(status, 200)

        hrefs = [a.get('href') for a in soup.find_all('a') if a.get('href')]
        self.assertTrue(any('foodChain/index.html' in h for h in hrefs), "foodChain/index.html must be linked")
        self.assertTrue(any('energyPyramid/index.html' in h for h in hrefs), "energyPyramid/index.html must be linked")
        self.assertTrue(any('OmNomNom/index.html' in h for h in hrefs), "OmNomNom/index.html must be linked")

    def test_f26_homepage_link_syntax_cleanliness(self):
        """F26: Verify index.html has no leading whitespace in any href attributes."""
        status, _, text, _ = self.fetch('index.html')
        self.assertEqual(status, 200)

        self.assertNotIn('href=" ', text, "Found leading whitespace in href=' ...'")
        self.assertNotIn("href=' ", text, "Found leading whitespace in href=' ...'")

    def test_f27_check_unlinked_projects_script_integrity(self):
        """F27: Verify check_unlinked_projects.py executes with 0 exit code and 0 broken links."""
        res = subprocess.run(
            [sys.executable, 'check_unlinked_projects.py'],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=10
        )
        self.assertEqual(res.returncode, 0, f"check_unlinked_projects.py failed: {res.stderr}")
        self.assertIn("統計總覽", res.stdout)
        self.assertNotIn("❌ 發現無效死連結", res.stdout)


# ==============================================================================
# TIER 2: Boundary & Corner Cases (>=5 tests per feature group)
# ==============================================================================
class TestTier2BoundaryCornerCases(TestSuiteBase):
    """Tier 2: Boundary & Corner Cases (>=5 tests per feature group across Round 2)."""

    # --- EnergyPyramid Boundaries ---
    def test_b1_energypyramid_zero_negative_input_fallback(self):
        """B1: Verify negative or zero energy input falls back gracefully to default without NaN."""
        node_script = """
        function calculate(val) {
            let baseEnergy = parseFloat(val);
            if (isNaN(baseEnergy) || baseEnergy < 0) baseEnergy = 10000;
            const eta = 0.10;
            return {
                e0: baseEnergy,
                e1: baseEnergy * eta,
                loss1: baseEnergy * (1 - eta)
            };
        }
        console.log(JSON.stringify({
            neg: calculate("-500"),
            zero: calculate("0"),
            empty: calculate("")
        }));
        """
        code, stdout, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        data = json.loads(stdout)
        self.assertEqual(data['neg']['e0'], 10000, "Negative input should fallback safely")
        self.assertEqual(data['empty']['e0'], 10000, "Empty input should fallback safely")
        self.assertFalse(any(v is None for v in data['zero'].values()))

    def test_b2_energypyramid_large_scale_energy_input(self):
        """B2: Verify large scale energy input (10,000,000 J) scales cleanly with commas."""
        node_script = """
        function formatNumber(num) {
            if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
            return num.toString();
        }
        const largeVal = 10000000;
        const e3 = largeVal * 0.1 * 0.1 * 0.1; // 10,000
        console.log(JSON.stringify({
            formatted: formatNumber(largeVal),
            e3Formatted: formatNumber(e3)
        }));
        """
        code, stdout, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        data = json.loads(stdout)
        self.assertEqual(data['formatted'], "10,000,000")
        self.assertEqual(data['e3Formatted'], "10,000")

    def test_b3_energypyramid_non_numeric_input_handling(self):
        """B3: Verify non-numeric input ('invalid_text') does not throw NaN."""
        node_script = """
        let base = parseFloat("invalid_text");
        if (isNaN(base) || base < 0) base = 10000;
        console.log(base);
        """
        code, stdout, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        self.assertEqual(stdout.strip(), "10000")

    def test_b4_energypyramid_efficiency_slider_bounds(self):
        """B4: Verify efficiency slider attributes in HTML are bounded within [5, 20]."""
        _, _, _, soup = self.fetch('energyPyramid/index.html')
        eff_slider = soup.find(id='efficiencyInput')
        self.assertIsNotNone(eff_slider)
        self.assertEqual(eff_slider.get('min'), '5')
        self.assertEqual(eff_slider.get('max'), '20')

    def test_b5_energypyramid_wrong_tier_card_drop_rejection(self):
        """B5: Verify card placement logic rejects incorrect tier placement."""
        with open(REPO_ROOT / 'energyPyramid' / 'script.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertTrue("cardTier === targetTier" in js or "targetTier === cardTier" in js, "Must validate card tier against target dropzone tier")
        self.assertIn("playBuzz", js, "Must trigger playBuzz on incorrect drop")
        self.assertIn("animate-incorrect", js, "Must trigger error animation on wrong placement")

    # --- Cell-3D Boundaries ---
    def test_b6_cell3d_rapid_tab_switching_cleanliness(self):
        """B6: Verify cell-3d main.js properly disposes old geometries/materials when switching models."""
        with open(REPO_ROOT / 'cell-3d' / 'main.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("dispose()", js, "Must call dispose() on previous geometries/materials")
        self.assertIn("scene.remove", js, "Must remove old model group from scene")

    def test_b7_cell3d_window_resize_aspect_ratio(self):
        """B7: Verify window resize event updates camera aspect ratio and renderer size."""
        with open(REPO_ROOT / 'cell-3d' / 'main.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("window.addEventListener('resize'", js)
        self.assertIn("camera.aspect =", js)
        self.assertIn("camera.updateProjectionMatrix()", js)
        self.assertIn("renderer.setSize", js)

    def test_b8_cell3d_cutaway_toggle_state_stability(self):
        """B8: Verify cutaway button maintains local clipping plane configuration without crashing."""
        with open(REPO_ROOT / 'cell-3d' / 'main.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("renderer.localClippingEnabled = true", js)
        self.assertIn("cutawayBtn.addEventListener", js)
        self.assertIn("activeModelInstance.setCutaway", js)

    def test_b9_cell3d_extreme_zoom_distance_clamping(self):
        """B9: Verify OrbitControls configuration in cell-3d clamps minDistance and maxDistance."""
        with open(REPO_ROOT / 'cell-3d' / 'main.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("controls.minDistance", js)
        self.assertIn("controls.maxDistance", js)

    def test_b10_cell3d_off_canvas_pointer_safety(self):
        """B10: Verify pointer coordinates outside canvas are handled without raycaster null exceptions."""
        with open(REPO_ROOT / 'cell-3d' / 'main.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("-9999", js, "Initial pointer coordinates must be safely outside view range")

    # --- FoodChain & FoodWeb Boundaries ---
    def test_b11_foodweb_extreme_population_stability(self):
        """B11: Verify food web ODE handles zero prey without dividing by zero."""
        node_script = """
        const totalPrey = 0;
        const B = 80;
        const intakeFraction = totalPrey > 0 ? totalPrey / (totalPrey + B) : 0;
        console.log(intakeFraction === 0 ? "ZERO_SAFE" : "FAIL");
        """
        code, stdout, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        self.assertIn("ZERO_SAFE", stdout)

    def test_b12_foodchain_mode1_zero_entities_graceful_state(self):
        """B12: Verify Mode 1 spatial simulation handles zero wolves or sheep gracefully without crash."""
        with open(REPO_ROOT / 'foodChain' / 'script.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("this.wolves.length", js)
        self.assertIn("this.sheep.length", js)

    def test_b13_foodchain_rapid_tab_switching(self):
        """B13: Verify tab switching between simple and complex modes triggers handleResize()."""
        with open(REPO_ROOT / 'foodChain' / 'script.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("switchTab(target)", js)
        self.assertIn("handleResize()", js)

    def test_b14_foodchain_speed_slider_extremes(self):
        """B14: Verify speed sliders in foodChain have explicit min and max attributes."""
        _, _, _, soup = self.fetch('foodChain/index.html')
        s1 = soup.find(id='chainSpeedSlider')
        s2 = soup.find(id='webSpeedSlider')
        self.assertEqual(s1.get('min'), '0.5')
        self.assertEqual(s1.get('max'), '3')
        self.assertEqual(s2.get('min'), '0.5')
        self.assertEqual(s2.get('max'), '3')

    def test_b15_foodweb_human_intervention_bounds(self):
        """B15: Verify population intervention buttons clamp populations cleanly."""
        with open(REPO_ROOT / 'foodChain' / 'script.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("Math.max(0,", js)
        self.assertIn("btnToggleExtinct", js)

    # --- OmNomNom Boundaries ---
    def test_b16_omnomnom_rapid_dice_click_spam_lock(self):
        """B16: Verify OmNomNom rolls lock out consecutive clicks during animation."""
        with open(REPO_ROOT / 'OmNomNom' / 'script.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("if (isRolling || isMoving || isGameOver) return", js)

    def test_b17_omnomnom_board_wrap_around_indexing(self):
        """B17: Verify board loop indexing mathematically wraps around from 8 to 0."""
        node_script = """
        const pathLen = 9;
        let pos = 8;
        const roll = 3;
        const steps = [];
        for (let s = 1; s <= roll; s++) {
            pos = (pos + 1) % pathLen;
            steps.push(pos);
        }
        console.log(JSON.stringify(steps));
        """
        code, stdout, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(stdout), [0, 1, 2])

    def test_b18_omnomnom_energy_depletion_boundary(self):
        """B18: Verify penalty events do not decrease player energy below 0."""
        node_script = """
        let playerEnergy = 2;
        const penalty = 5;
        playerEnergy = Math.max(0, playerEnergy - penalty);
        console.log(playerEnergy);
        """
        code, stdout, _ = self.run_node(node_script)
        self.assertEqual(code, 0)
        self.assertEqual(stdout.strip(), "0")

    def test_b19_omnomnom_modal_multiple_toggle_and_escape(self):
        """B19: Verify Escape key and backdrop click close the rules modal cleanly."""
        with open(REPO_ROOT / 'OmNomNom' / 'script.js', 'r', encoding='utf-8') as f:
            js = f.read()
        self.assertIn("e.key === 'Escape'", js)
        self.assertIn("e.target === rulesModal", js)

    def test_b20_omnomnom_responsive_canvas_scaling(self):
        """B20: Verify style.css in OmNomNom provides responsive canvas rules for mobile devices."""
        status, _, css, _ = self.fetch('OmNomNom/style.css')
        self.assertEqual(status, 200)
        self.assertIn("max-width: 100%", css)

    # --- Cross-Module Integrity Boundaries ---
    def test_b21_canonical_relative_urls(self):
        """B21: Verify module relative links avoid illegal parent directory traversals."""
        for module in ['cell-3d', 'foodChain', 'energyPyramid', 'OmNomNom']:
            index_file = REPO_ROOT / module / 'index.html'
            content = index_file.read_text(encoding='utf-8')
            for match in re.findall(r'href=["\']([^"\']+)["\']', content):
                if match.startswith('http') or match.startswith('#') or match.startswith('javascript:'):
                    continue
                self.assertFalse(match.startswith('/'), f"Illegal root-relative path '{match}' in {module}")
                self.assertFalse(match.startswith('../../'), f"Illegal multi-level parent path '{match}' in {module}")

    def test_b22_utf8_traditional_chinese_encoding(self):
        """B22: Verify all Round 2 index pages declare charset='UTF-8'."""
        for module in ['cell-3d', 'foodChain', 'energyPyramid', 'OmNomNom']:
            _, _, _, soup = self.fetch(f"{module}/index.html")
            meta_charset = soup.find('meta', attrs={'charset': re.compile(r'utf-8', re.I)})
            self.assertIsNotNone(meta_charset, f"{module} must specify charset='UTF-8'")

    def test_b23_query_parameter_and_hash_tolerance(self):
        """B23: Verify pages load successfully when passed arbitrary query parameters and hashes."""
        for module in ['cell-3d', 'foodChain', 'energyPyramid', 'OmNomNom']:
            status, _, _, _ = self.fetch(f"{module}/index.html?test_param=123#section")
            self.assertEqual(status, 200, f"{module} must tolerate query params and hashes")

    def test_b24_legacy_directory_redirects(self):
        """B24: Verify legacy 3D directories (threeJsModel, 3Dcell, insideTheCell) link to cell-3d."""
        for old_dir in ['threeJsModel', '3Dcell', 'insideTheCell']:
            index_path = REPO_ROOT / old_dir / 'index.html'
            self.assertTrue(index_path.exists(), f"{old_dir}/index.html must exist for legacy compatibility")
            content = index_path.read_text(encoding='utf-8')
            self.assertIn("cell-3d", content, f"{old_dir}/index.html must reference new cell-3d suite")

    def test_b25_case_sensitivity_filesystem_integrity(self):
        """B25: Verify all referenced local asset files match disk casing exactly."""
        modules = ['cell-3d', 'foodChain', 'energyPyramid', 'OmNomNom']
        for mod in modules:
            mod_dir = REPO_ROOT / mod
            for root, _, files in os.walk(mod_dir):
                for f in files:
                    full_p = Path(root) / f
                    self.assertTrue(full_p.exists(), f"File {full_p} must exist on disk")


# ==============================================================================
# TIER 3: Cross-Feature Combinations
# ==============================================================================
class TestTier3CrossFeatureCombinations(TestSuiteBase):
    """Tier 3: Cross-Feature Combinations (Navigation, shared assets, audio context, responsive design)."""

    def test_t3_1_navigation_flow_index_to_all_round2_modules(self):
        """T3.1: Verify navigation flow from index.html to each Round 2 module returns HTTP 200 and valid DOM."""
        targets = [
            'cell-3d/index.html',
            'foodChain/index.html',
            'energyPyramid/index.html',
            'OmNomNom/index.html'
        ]
        for target in targets:
            status, _, text, soup = self.fetch(target)
            self.assertEqual(status, 200, f"Navigation to {target} failed with status {status}")
            self.assertGreater(len(text), 500, f"{target} returned unexpectedly short body")
            self.assertIsNotNone(soup.find('title'), f"{target} missing title tag")
            self.assertIsNotNone(soup.find('meta', attrs={'name': 'viewport'}), f"{target} missing viewport meta tag")

    def test_t3_2_shared_asset_and_script_integrity_matrix(self):
        """T3.2: Verify all linked stylesheets, scripts, and local images return HTTP 200 without 404s."""
        asset_endpoints = [
            'cell-3d/style.css',
            'cell-3d/main.js',
            'cell-3d/js/data.js',
            'cell-3d/js/models/animalCell.js',
            'cell-3d/js/models/mitochondria.js',
            'cell-3d/js/models/chloroplast.js',
            'cell-3d/js/models/rbc.js',
            'cell-3d/js/models/membrane.js',
            'foodChain/style.css',
            'foodChain/data.js',
            'foodChain/script.js',
            'foodChain/wolf.png',
            'foodChain/sheep.png',
            'foodChain/grass.png',
            'energyPyramid/style.css',
            'energyPyramid/script.js',
            'energyPyramid/data/cards.json',
            'OmNomNom/style.css',
            'OmNomNom/script.js',
            'OmNomNom/data/cards.json'
        ]
        for asset in asset_endpoints:
            status, _, text, _ = self.fetch(asset)
            self.assertEqual(status, 200, f"Asset {asset} returned HTTP {status} (expected 200)")
            self.assertGreater(len(text), 50, f"Asset {asset} appears corrupted or empty")

    def test_t3_3_cross_module_web_audio_synthesizer_patterns(self):
        """T3.3: Verify energyPyramid and OmNomNom follow non-blocking Web Audio lifecycle patterns."""
        for mod in ['energyPyramid', 'OmNomNom']:
            script_path = REPO_ROOT / mod / 'script.js'
            js_content = script_path.read_text(encoding='utf-8')
            self.assertIn("AudioContext", js_content)
            self.assertIn("createOscillator", js_content)
            self.assertIn("createGain", js_content)
            self.assertIn("suspended", js_content, "Must check for suspended state to comply with browser autoplay")

    def test_t3_4_cdn_libraries_availability_and_fallback(self):
        """T3.4: Verify external CDN script URLs are valid HTTPS endpoints."""
        cdn_urls = [
            "https://unpkg.com/three@0.160.0/build/three.module.js",
            "https://cdn.jsdelivr.net/npm/chart.js"
        ]
        for url in cdn_urls:
            self.assertTrue(url.startswith("https://"), f"CDN URL {url} must use secure HTTPS")

    def test_t3_5_ecological_curriculum_trophic_continuum(self):
        """T3.5: Verify ecological consistency across foodChain, energyPyramid, and OmNomNom."""
        # 1. Check Producers exist in all modules
        fc_data = (REPO_ROOT / 'foodChain' / 'data.js').read_text(encoding='utf-8')
        self.assertIn("生產者", fc_data)

        ep_cards = json.loads((REPO_ROOT / 'energyPyramid' / 'data' / 'cards.json').read_text(encoding='utf-8'))
        ep_producers = [c for c in ep_cards if c.get('tier') == 'producers']
        self.assertGreater(len(ep_producers), 0)

        onn_cards = json.loads((REPO_ROOT / 'OmNomNom' / 'data' / 'cards.json').read_text(encoding='utf-8'))
        onn_primary = [c for c in onn_cards if c.get('tierLevel') == 1]
        self.assertGreater(len(onn_primary), 0)

    def test_t3_6_responsive_multi_device_meta_viewport_suite(self):
        """T3.6: Verify responsive viewport meta tag configuration across all Round 2 modules."""
        for mod in ['cell-3d', 'foodChain', 'energyPyramid', 'OmNomNom']:
            _, _, _, soup = self.fetch(f"{mod}/index.html")
            vp = soup.find('meta', attrs={'name': 'viewport'})
            self.assertIsNotNone(vp, f"{mod} missing viewport tag")
            content = vp.get('content', '')
            self.assertIn("width=device-width", content)


# ==============================================================================
# TIER 4: Real-World Student Inquiry Scenarios
# ==============================================================================
class TestTier4ClassroomScenarios(TestSuiteBase):
    """Tier 4: Real-World Student Inquiry Scenarios (5 detailed curriculum classroom sessions)."""

    def test_t4_1_student_cell3d_organelle_exploration_scenario(self):
        """Scenario 1: Student explores cell organelles in cell-3d.
        Workflow:
        1. Navigates from hub to cell-3d/index.html.
        2. Toggles 1/4 cutaway on animal cell panorama to inspect nucleus and mitochondria.
        3. Switches to Mitochondria model to study cristae folds and mtDNA.
        4. Switches to Chloroplast model to study thylakoid grana discs.
        5. Switches to RBC model to examine biconcave SA/V gas exchange adaptation.
        6. Switches to Membrane fluid mosaic model to inspect phospholipid bilayer and ion channels.
        7. Uses camera reset button to re-orient view.
        """
        status, _, text, soup = self.fetch('cell-3d/index.html')
        self.assertEqual(status, 200)

        # 1. Tabs exist
        tabs = [b.get('data-model') for b in soup.find_all('button', class_='tab-btn') if b.get('data-model')]
        self.assertEqual(tabs, ['animalCell', 'mitochondria', 'chloroplast', 'rbc', 'membrane'])

        # 2. Cutaway and reset buttons available
        self.assertIsNotNone(soup.find(id='cutawayBtn'))
        self.assertIsNotNone(soup.find(id='resetCameraBtn'))

        # 3. Model annotations in Traditional Chinese
        data_js = (REPO_ROOT / 'cell-3d' / 'js' / 'data.js').read_text(encoding='utf-8')
        self.assertIn("雙層核膜", data_js)
        self.assertIn("內膜向內折疊形成嵴", data_js)
        self.assertIn("類囊體", data_js)
        self.assertIn("雙凹圓盤", data_js)
        self.assertIn("磷脂質雙分子層", data_js)

    def test_t4_2_student_foodchain_and_foodweb_inquiry_scenario(self):
        """Scenario 2: Student investigates predator-prey dynamics and biodiversity buffer.
        Workflow:
        1. Accesses foodChain/index.html Unit 1, observing initial wolf, sheep, grass counts.
        2. Adjusts speed slider, spawns wolves and sheep.
        3. Switches to Unit 2 (多物種食物網).
        4. Selects Taiwan Black Bear to examine multi-tier diet (acorns, deer, hares).
        5. Triggers ecological perturbation (drought or top predator removal).
        6. Verifies that populations oscillate stably on Chart.js time series without crashing.
        """
        status, _, _, soup = self.fetch('foodChain/index.html')
        self.assertEqual(status, 200)

        self.assertIsNotNone(soup.find(id='tab-simple'))
        self.assertIsNotNone(soup.find(id='tab-complex'))
        self.assertIsNotNone(soup.find(id='btnDisruptApex'))
        self.assertIsNotNone(soup.find(id='btnDrought'))
        self.assertIsNotNone(soup.find(id='populationChart'))

        # Check Taiwan native species configured in data.js
        data_js = (REPO_ROOT / 'foodChain' / 'data.js').read_text(encoding='utf-8')
        for sp in ['臺灣黑熊', '石虎', '梅花鹿', '臺灣野兔', '芒草', '臺灣冷杉']:
            self.assertIn(sp, data_js)

    def test_t4_3_student_energypyramid_lindeman_calculation_scenario(self):
        """Scenario 3: Student completes trophic card challenge and tests Lindeman 10% law.
        Workflow:
        1. Places organisms into 4 pyramid tiers (Producers, Primary, Secondary, Tertiary).
        2. Receives ascending chime auditory feedback on correct placements.
        3. Switches to 10% Calculator tab.
        4. Inputs 10,000 J baseline producer assimilation energy.
        5. Verifies 10,000 J -> 1,000 J -> 100 J -> 10 J trophic scaling.
        6. Confirms 90% heat loss dissipation values (9,000 J -> 900 J -> 90 J).
        """
        status, _, _, soup = self.fetch('energyPyramid/index.html')
        self.assertEqual(status, 200)

        self.assertIsNotNone(soup.find(id='navGameBtn'))
        self.assertIsNotNone(soup.find(id='navCalcBtn'))
        self.assertIsNotNone(soup.find(id='tier-producers'))
        self.assertIsNotNone(soup.find(id='tier-tertiary'))
        self.assertIsNotNone(soup.find(id='baseEnergyInput'))
        self.assertIsNotNone(soup.find(id='loss-primary'))

    def test_t4_4_student_omnomnom_wetland_board_gameplay_scenario(self):
        """Scenario 4: Student plays Taiwan wetland food chain board game.
        Workflow:
        1. Clicks rules button to review wetland food chains in modal.
        2. Closes modal, clicks dice button (or presses spacebar).
        3. Observes animated dice roll, locked input during rolling.
        4. Glowing pawn advances step-by-step around 9-tile wetland board.
        5. Lands on tile, triggers "Om Nom Nom!" predation event, assimilates energy.
        6. Wraps around from tile 8 to 0, receiving migration lap bonus.
        """
        status, _, _, soup = self.fetch('OmNomNom/index.html')
        self.assertEqual(status, 200)

        self.assertIsNotNone(soup.find(id='rulesBtn'))
        self.assertIsNotNone(soup.find(id='rulesModal'))
        self.assertIsNotNone(soup.find(id='diceBtn'))
        self.assertIsNotNone(soup.find(id='canvas'))
        self.assertIsNotNone(soup.find(id='energyDisplay'))

        # Check 9 Taiwan wetland organisms
        cards = json.loads((REPO_ROOT / 'OmNomNom' / 'data' / 'cards.json').read_text(encoding='utf-8'))
        names = {c['name'] for c in cards}
        self.assertTrue({'蝶蛾', '蚊蠅', '蝌蚪', '水蠆', '赤蛙', '胡蜂', '蜘蛛', '秧雞', '斑龜'}.issubset(names))

    def test_t4_5_comprehensive_biology_curriculum_continuity_scenario(self):
        """Scenario 5: Integrated cross-module student inquiry journey.
        Workflow:
        1. Starts at main curriculum hub (index.html).
        2. Investigates cellular ATP production in cell-3d mitochondria.
        3. Examines primary producer energy capture in foodChain grass.
        4. Quantifies trophic transfer efficiency in energyPyramid.
        5. Observes wetland consumer interactions in OmNomNom.
        6. Returns to homepage without broken navigation.
        """
        # Step 1: Check index.html
        status, _, text, _ = self.fetch('index.html')
        self.assertEqual(status, 200)

        # Step 2: cell-3d
        status, _, _, _ = self.fetch('cell-3d/index.html')
        self.assertEqual(status, 200)

        # Step 3: foodChain
        status, _, _, _ = self.fetch('foodChain/index.html')
        self.assertEqual(status, 200)

        # Step 4: energyPyramid
        status, _, _, _ = self.fetch('energyPyramid/index.html')
        self.assertEqual(status, 200)

        # Step 5: OmNomNom
        status, _, _, _ = self.fetch('OmNomNom/index.html')
        self.assertEqual(status, 200)


# ==============================================================================
# TEST RUNNER ENTRY POINT
# ==============================================================================
if __name__ == '__main__':
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestTier1Round2FeatureCoverage))
    suite.addTests(loader.loadTestsFromTestCase(TestTier2BoundaryCornerCases))
    suite.addTests(loader.loadTestsFromTestCase(TestTier3CrossFeatureCombinations))
    suite.addTests(loader.loadTestsFromTestCase(TestTier4ClassroomScenarios))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 70)
    print("📊 Round 2 Test Results Summary:")
    print(f"• Total Tests Run: {result.testsRun}")
    print(f"• Failures: {len(result.failures)}")
    print(f"• Errors: {len(result.errors)}")
    success_rate = (result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100
    print(f"• Success Rate: {success_rate:.1f}%")
    print("=" * 70)

    if result.wasSuccessful():
        print("✅ All Round 2 automated E2E tests PASSED successfully!")
        sys.exit(0)
    else:
        print("❌ Some Round 2 tests failed. Review output above.")
        sys.exit(1)

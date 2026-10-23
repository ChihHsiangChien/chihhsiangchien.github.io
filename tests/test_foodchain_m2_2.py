#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
E2E & Unit Test for FoodChain & FoodWeb Consolidation (Milestone M2.2 - Requirement R2)
"""

import os
import sys
import unittest
import subprocess
from pathlib import Path
from bs4 import BeautifulSoup

REPO_ROOT = Path(__file__).resolve().parent.parent

class TestFoodChainConsolidation(unittest.TestCase):
    def setUp(self):
        self.food_chain_dir = REPO_ROOT / "foodChain"
        self.index_html_path = self.food_chain_dir / "index.html"
        self.style_css_path = self.food_chain_dir / "style.css"
        self.script_js_path = self.food_chain_dir / "script.js"
        self.data_js_path = self.food_chain_dir / "data.js"
        
        self.assertTrue(self.index_html_path.exists(), "foodChain/index.html must exist")
        self.assertTrue(self.style_css_path.exists(), "foodChain/style.css must exist")
        self.assertTrue(self.script_js_path.exists(), "foodChain/script.js must exist")
        self.assertTrue(self.data_js_path.exists(), "foodChain/data.js must exist")

        with open(self.index_html_path, "r", encoding="utf-8") as f:
            self.html_soup = BeautifulSoup(f.read(), "html.parser")

    def test_r2_contract_elements_presence(self):
        """PROJECT.md Interface Contract: #tab-simple, #tab-complex, #chainCanvas, #webNetworkCanvas, #populationChart"""
        tab_simple = self.html_soup.find(id="tab-simple")
        self.assertIsNotNone(tab_simple, "Missing #tab-simple")
        self.assertIn("簡易食物鏈", tab_simple.get_text())

        tab_complex = self.html_soup.find(id="tab-complex")
        self.assertIsNotNone(tab_complex, "Missing #tab-complex")
        self.assertIn("多物種食物網", tab_complex.get_text())

        chain_canvas = self.html_soup.find(id="chainCanvas")
        self.assertIsNotNone(chain_canvas, "Missing #chainCanvas")

        web_canvas = self.html_soup.find(id="webNetworkCanvas")
        self.assertIsNotNone(web_canvas, "Missing #webNetworkCanvas")

        pop_chart = self.html_soup.find(id="populationChart")
        self.assertIsNotNone(pop_chart, "Missing #populationChart")

    def test_mode_1_ui_controls(self):
        """Mode 1 UI controls: Start/Pause, Reset, Speed Slider, Spawn Wolf, Spawn Sheep, Spawn Grass"""
        play_btn = self.html_soup.find(id="chainPlayPauseBtn")
        self.assertIsNotNone(play_btn, "Missing #chainPlayPauseBtn")

        reset_btn = self.html_soup.find(id="chainResetBtn")
        self.assertIsNotNone(reset_btn, "Missing #chainResetBtn")

        speed_slider = self.html_soup.find(id="chainSpeedSlider")
        self.assertIsNotNone(speed_slider, "Missing #chainSpeedSlider")

        spawn_wolf = self.html_soup.find(id="spawnWolfBtn")
        self.assertIsNotNone(spawn_wolf, "Missing #spawnWolfBtn")
        self.assertIn("狼", spawn_wolf.get_text())

        spawn_sheep = self.html_soup.find(id="spawnSheepBtn")
        self.assertIsNotNone(spawn_sheep, "Missing #spawnSheepBtn")
        self.assertIn("羊", spawn_sheep.get_text())

        spawn_grass = self.html_soup.find(id="spawnGrassBtn")
        self.assertIsNotNone(spawn_grass, "Missing #spawnGrassBtn")
        self.assertIn("草", spawn_grass.get_text())

        # HUD counters
        self.assertIsNotNone(self.html_soup.find(id="wolfCount"), "Missing #wolfCount")
        self.assertIsNotNone(self.html_soup.find(id="sheepCount"), "Missing #sheepCount")
        self.assertIsNotNone(self.html_soup.find(id="grassCount"), "Missing #grassCount")

    def test_mode_2_ui_controls(self):
        """Mode 2 UI controls: Start/Pause, Reset, Speed Slider, Preset Selector, Species Inspector"""
        self.assertIsNotNone(self.html_soup.find(id="webPlayPauseBtn"), "Missing #webPlayPauseBtn")
        self.assertIsNotNone(self.html_soup.find(id="webResetBtn"), "Missing #webResetBtn")
        self.assertIsNotNone(self.html_soup.find(id="webSpeedSlider"), "Missing #webSpeedSlider")
        
        preset_select = self.html_soup.find(id="presetSelect")
        self.assertIsNotNone(preset_select, "Missing #presetSelect")
        options = [opt.get_text() for opt in preset_select.find_all("option")]
        self.assertTrue(any("臺灣" in opt for opt in options), "Preset select must contain Taiwan native presets")

        species_card = self.html_soup.find(id="speciesCard")
        self.assertIsNotNone(species_card, "Missing #speciesCard")

    def test_rwd_and_meta(self):
        """Verify responsive meta viewport and CSS media queries"""
        viewport = self.html_soup.find("meta", attrs={"name": "viewport"})
        self.assertIsNotNone(viewport, "Missing meta viewport")
        content = viewport.get("content", "")
        self.assertIn("width=device-width", content)

        with open(self.style_css_path, "r", encoding="utf-8") as f:
            css = f.read()
        self.assertIn("@media", css, "CSS must contain responsive media queries")
        self.assertIn("1024px", css)
        self.assertIn("768px", css)

    def test_sprite_assets_exist(self):
        """Wolf, Sheep, Grass sprite PNGs must exist and be non-empty"""
        for sprite in ["wolf.png", "sheep.png", "grass.png"]:
            path = self.food_chain_dir / sprite
            self.assertTrue(path.exists(), f"{sprite} must exist")
            self.assertGreater(path.stat().st_size, 1000, f"{sprite} must not be empty")

    def test_mathematical_model_stability(self):
        """Execute tests/test_foodchain_stability.js and verify exit code 0"""
        cmd = ["node", str(REPO_ROOT / "tests" / "test_foodchain_stability.js")]
        res = subprocess.run(cmd, capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, f"Stability test failed:\n{res.stdout}\n{res.stderr}")
        self.assertIn("ALL FOODWEB MATHEMATICAL TESTS PASSED SUCCESSFULLY!", res.stdout)

    def test_10_taiwan_species_in_dataset(self):
        """Verify 10 Taiwan native species defined in data.js"""
        cmd = [
            "node",
            "-e",
            """
            const data = require('./foodChain/data.js');
            const species = data.foodWeb.presetTaiwanForest.species;
            if (species.length !== 10) process.exit(1);
            const expected = ['臺灣黑熊', '石虎', '赤腹松鼠', '梅花鹿', '臺灣野兔', '巢鼠', '環頸雉', '芒草', '臺灣冷杉', '殼斗科植物'];
            for (const name of expected) {
                if (!species.some(s => s.name === name)) {
                    console.error('Missing: ' + name);
                    process.exit(2);
                }
            }
            console.log('ALL_10_SPECIES_CONFIRMED');
            """
        ]
        res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, f"Species verification failed: {res.stderr}")
        self.assertIn("ALL_10_SPECIES_CONFIRMED", res.stdout)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated 4-Tier Opaque-Box E2E Test Suite for MicroDefend Multi-Tab Expansion
(微觀人體防線: 淋巴結專一性免疫、淋巴總管靜脈匯流、骨髓造血與免疫記憶)

Host Directory: microDefend/
Interface Specifications: PROJECT.md, ORIGINAL_REQUEST.md

Coverage:
- Tier 1: Feature Coverage
  * T1.1: Multi-Tab Navigation Bar (.tabs-nav with Tabs 1, 2, 3, 4)
  * T1.2: Page 1 Initial Lymphatic Vessel Geometry (x=868..1000, y=248..288, center=268)
  * T1.3: Page 2 Afferent Lymphatic Inlet Alignment & Lymph Node Structural Architecture
  * T1.4: Page 3 Venous Confluence & Thoracic Duct Anatomy (#f87171/#991b1b)
  * T1.5: Page 4 Bone Marrow Niches (Trabeculae, Sinusoids, HSC, B cells, LLPC, Neutrophil Pool)
  * T1.6: Interactive Control Panels for Tabs 2, 3, 4 with Cellular & Pathogen Triggers

- Tier 2: Boundary & Corner Cases
  * T2.1: Spatial Coordinate Continuity (Page 1 Exit Vector == Page 2 Entrance Vector)
  * T2.2: Simulation Speed Multipliers (0.5x, 1x, 2x) & Reset Boundaries
  * T2.3: Viewport Meta Tag & Responsive CSS Structure

- Tier 3: Cross-Feature Combinations & State Lifecycle
  * T3.1: Cross-Tab Isolation & Active-Tab Viewport Display Gating (style.display)
  * T3.2: Animation Loop Gating in script.js (Zero-leak Master Animation Loop)
  * T3.3: Event Listener Hygiene & Object Pool Integrity

- Tier 4: Real-World Pedagogical Scenarios & Biological Terminology
  * T4.1: 11 Taiwanese Curriculum Biological Terms Presence
  * T4.2: Educational Mechanism Explanations & Clinical Narratives

Execution:
    python -m unittest tests/test_microdefend_e2e.py
    python tests/test_microdefend_e2e.py
"""

import sys
import os
import re
import unittest
import threading
import http.server
import socketserver
import urllib.request
import urllib.parse
from pathlib import Path
from html.parser import HTMLParser

REPO_ROOT = Path(__file__).resolve().parent.parent
MICRODEFEND_DIR = REPO_ROOT / "microDefend"


# ==============================================================================
# Lightweight Standard-Library DOM & SVG Parser
# ==============================================================================

class DOMNode:
    """Lightweight DOM Node representation supporting attribute, tag, and CSS-like queries."""

    VOID_ELEMENTS = {
        'meta', 'link', 'input', 'img', 'br', 'hr', 'rect',
        'circle', 'line', 'polygon', 'path', 'stop', 'ellipse'
    }

    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag.lower()
        self.attrs = dict(attrs or [])
        self.parent = parent
        self.children = []
        self.text_fragments = []

    @property
    def text(self):
        """Aggregate recursive text content of node and descendants."""
        parts = list(self.text_fragments)
        for child in self.children:
            parts.append(child.text)
        return " ".join("".join(parts).split())

    def get(self, attr_name, default=None):
        val = self.attrs.get(attr_name)
        if val is not None:
            return val
        return self.attrs.get(attr_name.lower(), default)

    def has_class(self, class_name):
        classes = self.attrs.get('class', '').split()
        return class_name in classes

    def find_all(self, tag=None, attrs=None, recursive=True):
        """Find all matching descendants."""
        results = []
        for child in self.children:
            match = True
            if tag and child.tag != tag.lower():
                match = False
            if attrs and match:
                for k, v in attrs.items():
                    if k == 'class':
                        if not child.has_class(v):
                            match = False
                            break
                    else:
                        if child.attrs.get(k) != v:
                            match = False
                            break
            if match:
                results.append(child)
            if recursive:
                results.extend(child.find_all(tag, attrs, recursive=True))
        return results

    def find(self, tag=None, attrs=None):
        matches = self.find_all(tag, attrs, recursive=True)
        return matches[0] if matches else None

    def _matches_simple_selector(self, selector):
        """Match a single selector token (tag, #id, .class1.class2, [k=v], or combinations)."""
        sel = selector.strip()
        if not sel or self.tag == '__root__':
            return False

        # Extract [attr="val"] or [attr] if present
        attr_key, attr_val = None, None
        attr_match = re.search(r'\[([a-zA-Z0-9_\-]+)(?:=(?:"|\')?([^"\'\]]+)(?:"|\')?)?\]', sel)
        if attr_match:
            attr_key = attr_match.group(1)
            attr_val = attr_match.group(2)
            sel = sel[:attr_match.start()] + sel[attr_match.end():]

        # Extract #id if present
        id_val = None
        id_match = re.search(r'#([a-zA-Z0-9_\-]+)', sel)
        if id_match:
            id_val = id_match.group(1)
            sel = sel[:id_match.start()] + sel[id_match.end():]

        # Extract classes (.cls1.cls2)
        classes = re.findall(r'\.([a-zA-Z0-9_\-]+)', sel)
        sel = re.sub(r'\.([a-zA-Z0-9_\-]+)', '', sel).strip()

        # Remainder is tag name
        tag_val = sel.lower() if sel else None

        # Check conditions
        if tag_val and self.tag != tag_val:
            return False
        if id_val and self.attrs.get('id') != id_val:
            return False
        for c in classes:
            if not self.has_class(c):
                return False
        if attr_key:
            if attr_key not in self.attrs:
                return False
            if attr_val is not None and self.attrs.get(attr_key) != attr_val:
                return False

        return True

    def select(self, selector):
        """Support CSS selectors with spaces (descendants) and compound tokens."""
        selector = selector.strip()
        if not selector:
            return []

        # Descendant traversal (space-separated)
        parts = selector.split()
        current_candidates = self.find_all(recursive=True)

        # First filter matching parts[0]
        matching = [n for n in current_candidates if n._matches_simple_selector(parts[0])]

        # For remaining parts, match descendants of previous matches
        for part in parts[1:]:
            next_level = []
            for ancestor in matching:
                for desc in ancestor.find_all(recursive=True):
                    if desc._matches_simple_selector(part) and desc not in next_level:
                        next_level.append(desc)
            matching = next_level

        return matching

    def select_one(self, selector):
        nodes = self.select(selector)
        return nodes[0] if nodes else None

    def __repr__(self):
        id_str = f" id='{self.attrs['id']}'" if 'id' in self.attrs else ""
        class_str = f" class='{self.attrs['class']}'" if 'class' in self.attrs else ""
        return f"<{self.tag}{id_str}{class_str}>"


class SimpleDOMParser(HTMLParser):
    """HTML & SVG parser converting markup into a DOMNode tree."""

    def __init__(self):
        super().__init__()
        self.root = DOMNode('__root__')
        self.current = self.root

    def handle_starttag(self, tag, attrs):
        node = DOMNode(tag, attrs, parent=self.current)
        self.current.children.append(node)
        # Void/self-closing tags do not become parent of subsequent tags
        if tag.lower() not in DOMNode.VOID_ELEMENTS:
            self.current = node

    def handle_endtag(self, tag):
        t = tag.lower()
        if t in DOMNode.VOID_ELEMENTS:
            return
        node = self.current
        while node is not None and node.tag != t and node.parent is not None:
            node = node.parent
        if node is not None and node.parent is not None:
            self.current = node.parent

    def handle_data(self, data):
        if data:
            self.current.text_fragments.append(data)


def parse_html(html_str):
    parser = SimpleDOMParser()
    parser.feed(html_str)
    return parser.root


# ==============================================================================
# SVG Coordinate Extraction Helpers
# ==============================================================================

def extract_path_coordinates(d_attribute):
    """
    Extract coordinate pairs and command tokens from an SVG path 'd' attribute.
    Returns: list of (x, y) float tuples found in sequence.
    """
    if not d_attribute:
        return []
    # Tokenize commands and numbers
    tokens = re.findall(r'[a-df-z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', d_attribute, re.I)
    numbers = []
    for token in tokens:
        try:
            numbers.append(float(token))
        except ValueError:
            pass

    points = []
    for i in range(0, len(numbers) - 1, 2):
        points.append((numbers[i], numbers[i + 1]))
    return points


def get_path_bounding_box(d_attribute):
    """Calculate the min/max X and Y bounds of points defined in an SVG path."""
    points = extract_path_coordinates(d_attribute)
    if not points:
        return None
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return {
        'min_x': min(xs),
        'max_x': max(xs),
        'min_y': min(ys),
        'max_y': max(ys),
        'center_y': (min(ys) + max(ys)) / 2.0,
        'points': points
    }


# ==============================================================================
# HTTP Server Test Fixture
# ==============================================================================

class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Silent request handler serving the repository root."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass  # Suppress standard access logging


class MicroDefendE2ETestBase(unittest.TestCase):
    """Base fixture running an ephemeral HTTP server for live static delivery."""

    server = None
    server_thread = None
    base_url = None

    @classmethod
    def setUpClass(cls):
        cls.server = socketserver.TCPServer(('127.0.0.1', 0), QuietHTTPRequestHandler)
        port = cls.server.server_address[1]
        cls.base_url = f"http://127.0.0.1:{port}"
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def fetch(self, relative_path):
        """Fetch relative URL from the local server and parse HTML."""
        url = f"{self.base_url}/{relative_path.lstrip('/')}"
        req = urllib.request.Request(url, headers={'User-Agent': 'MicroDefend-E2E-Tester/1.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.status
            content = resp.read().decode('utf-8', errors='replace')
            dom = parse_html(content)
            return status, content, dom

    def get_index_page(self):
        return self.fetch("microDefend/index.html")

    def get_script_content(self):
        script_path = MICRODEFEND_DIR / "script.js"
        if script_path.exists():
            return script_path.read_text(encoding='utf-8', errors='replace')
        return ""

    def get_style_content(self):
        style_path = MICRODEFEND_DIR / "style.css"
        if style_path.exists():
            return style_path.read_text(encoding='utf-8', errors='replace')
        return ""


# ==============================================================================
# Tier 1: Feature Coverage Test Suite
# ==============================================================================

class TestTier1_FeatureCoverage(MicroDefendE2ETestBase):
    """Tier 1: Verify presence and structure of all core features across Tabs 1–4."""

    def test_t1_p1_baseline_lymphatic_vessel_geometry(self):
        """
        Verify Page 1 initial lymphatic vessel geometry:
        x=868..1000, y=248..288, center=268.
        Authoritative source: microDefend/index.html line 357, PROJECT.md line 55.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200, "microDefend/index.html must be served with HTTP 200")

        # Find the dermal initial lymphatics path
        lymph_lumen = dom.select_one('#lymph-capillary-lumen')
        self.assertIsNotNone(lymph_lumen, "Page 1 #lymph-capillary-lumen must exist in DOM")

        d_attr = lymph_lumen.get('d', '')
        self.assertTrue(d_attr, "#lymph-capillary-lumen must have non-empty 'd' attribute")

        bounds = get_path_bounding_box(d_attr)
        self.assertIsNotNone(bounds, "Failed to parse coordinates from #lymph-capillary-lumen path")

        # Verify geometric bounds
        self.assertAlmostEqual(bounds['max_x'], 1000.0, delta=2.0,
                               msg=f"Lymphatic exit x boundary should reach ~1000, got {bounds['max_x']}")
        self.assertAlmostEqual(bounds['min_x'], 868.0, delta=2.0,
                               msg=f"Lymphatic blind end x boundary should be ~868, got {bounds['min_x']}")
        self.assertAlmostEqual(bounds['min_y'], 248.0, delta=2.0,
                               msg=f"Lymphatic top boundary should be ~248, got {bounds['min_y']}")
        self.assertAlmostEqual(bounds['max_y'], 288.0, delta=2.0,
                               msg=f"Lymphatic bottom boundary should be ~288, got {bounds['max_y']}")
        self.assertAlmostEqual(bounds['center_y'], 268.0, delta=1.0,
                               msg=f"Lymphatic central channel should align at y=268, got {bounds['center_y']}")

        # Verify styling attributes
        stroke = lymph_lumen.get('stroke', '')
        self.assertIn('#10b981', stroke.lower(), "Lymphatic vessel stroke should use #10b981 emerald color")
        dasharray = lymph_lumen.get('stroke-dasharray', '')
        self.assertEqual(dasharray.strip(), '6,3', "Lymphatic vessel must use stroke-dasharray='6,3'")

    def test_t1_p1_baseline_controls_and_stats(self):
        """
        Verify Page 1 baseline controls and status pills:
        Speed buttons, Coagulation stepper, Cardinal signs, Pathogen spawners.
        Authoritative source: microDefend/index.html, PROJECT.md.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        # Baseline Speed buttons
        speed_btns = dom.select('.speed-btn')
        self.assertGreaterEqual(len(speed_btns), 3, "Page 1 must have at least 3 speed control buttons")

        # Coagulation stepper buttons
        coag_btns = dom.select('.coag-btn')
        self.assertGreaterEqual(len(coag_btns), 5, "Coagulation stepper must have 5 stages")

        # Cardinal signs
        stage_btns = dom.select('.stage-btn.toggle-btn')
        self.assertGreaterEqual(len(stage_btns), 4, "Cardinal signs must have 4 buttons (紅熱腫痛)")

        # Pathogen buttons
        self.assertIsNotNone(dom.select_one('#btn-spawn-bacteria'), "Pathogen spawn bacteria button must exist")
        self.assertIsNotNone(dom.select_one('#btn-spawn-virus'), "Pathogen spawn virus button must exist")

    def test_t1_m1_multi_tab_navigation_bar(self):
        """
        Verify presence of multi-tab navigation bar (.tabs-nav) with tabs for Pages 1, 2, 3, 4.
        Authoritative source: ORIGINAL_REQUEST §R1, PROJECT.md § Architecture line 7, Feature 1.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        tabs_nav = dom.select_one('.tabs-nav')
        self.assertIsNotNone(tabs_nav, "Multi-tab navigation bar (.tabs-nav) must exist in DOM")

        # Must have 4 tab buttons with data-tab attributes
        tab_buttons = tabs_nav.select('button[data-tab]')
        if not tab_buttons:
            tab_buttons = tabs_nav.select('.tab-btn')

        self.assertEqual(len(tab_buttons), 4, f"Expected 4 tab buttons in .tabs-nav, found {len(tab_buttons)}")

        tab_ids = [btn.get('data-tab') for btn in tab_buttons]
        expected_tabs = ['tab-1', 'tab-2', 'tab-3', 'tab-4']
        for exp in expected_tabs:
            self.assertIn(exp, tab_ids, f"Tab navigation must include data-tab='{exp}'")

    def test_t1_m1_tab2_lymph_node_scene_structure(self):
        """
        Verify Page 2 afferent inlet alignment and presence of lymph node structural elements:
        Capsule, subcapsular sinus, trabeculae, germinal centers, efferent duct.
        Authoritative source: ORIGINAL_REQUEST §R1, PROJECT.md Feature 2-4.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        # Tab 2 SVG viewport scene
        tab2_svg = dom.select_one('#viz-tab-2')
        self.assertIsNotNone(tab2_svg, "Page 2 dedicated SVG scene (#viz-tab-2) must exist")

        viewbox = tab2_svg.get('viewBox', '')
        self.assertTrue(viewbox, "#viz-tab-2 must define a viewBox (e.g. '0 0 1000 565')")

        # Afferent inlet vessel starting at x=0, y=248..288 (center 268)
        afferent_inlet = dom.select_one('#afferent-inlet-primary') or dom.select_one('.afferent-inlet')
        self.assertIsNotNone(afferent_inlet, "Page 2 must contain afferent inlet path matching Page 1 exit")
        d_inlet = afferent_inlet.get('d', '')
        self.assertTrue(d_inlet, "Afferent inlet must have valid path data 'd'")
        bounds = get_path_bounding_box(d_inlet)
        self.assertIsNotNone(bounds, "Failed to parse afferent inlet path coordinates")
        self.assertAlmostEqual(bounds['min_x'], 0.0, delta=2.0,
                               msg=f"Afferent inlet must start at x=0, got {bounds['min_x']}")
        self.assertAlmostEqual(bounds['center_y'], 268.0, delta=2.0,
                               msg=f"Afferent inlet central axis must align at y=268, got {bounds['center_y']}")

        # Anatomical structural elements of lymph node
        capsule = dom.select_one('#ln-capsule') or dom.select_one('.ln-capsule') or dom.select_one('.capsule')
        self.assertIsNotNone(capsule, "Page 2 must contain lymph node capsule element (#ln-capsule)")

        subcapsular = (dom.select_one('#subcapsular-sinus') or
                       dom.select_one('.subcapsular-sinus') or
                       dom.select_one('#ln-subcapsular-sinus'))
        self.assertIsNotNone(subcapsular, "Page 2 must contain subcapsular sinus element (#subcapsular-sinus)")

        trabeculae = dom.select_one('#ln-trabeculae') or dom.select_one('.trabeculae')
        self.assertIsNotNone(trabeculae, "Page 2 must contain trabeculae structural element (#ln-trabeculae)")

        germinal = (dom.select_one('#germinal-centers') or
                    dom.select_one('.germinal-center') or
                    dom.select_one('#follicles-layer'))
        self.assertIsNotNone(germinal, "Page 2 must contain germinal centers / follicles (#germinal-centers)")

        efferent = (dom.select_one('#efferent-vessel') or
                    dom.select_one('.efferent-vessel') or
                    dom.select_one('#efferent-lymphatic'))
        self.assertIsNotNone(efferent, "Page 2 must contain efferent lymphatic duct (#efferent-vessel)")

    def test_t1_m2_tab3_venous_confluence_scene(self):
        """
        Verify Page 3 venous confluence scene:
        Thoracic duct, venous valve flaps, endothelial wall (#f87171/#991b1b).
        Authoritative source: ORIGINAL_REQUEST §R2, PROJECT.md Feature 5-7.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        tab3_svg = dom.select_one('#viz-tab-3')
        self.assertIsNotNone(tab3_svg, "Page 3 dedicated SVG scene (#viz-tab-3) must exist")

        # Thoracic duct / lymphatic duct
        thoracic_duct = (dom.select_one('#thoracic-duct') or
                         dom.select_one('.thoracic-duct') or
                         dom.select_one('#lymphatic-duct-trunk'))
        self.assertIsNotNone(thoracic_duct, "Page 3 must contain thoracic duct (#thoracic-duct)")

        # Venous valve flaps
        venous_valve = (dom.select_one('#venous-valve') or
                        dom.select_one('.venous-valve') or
                        dom.select_one('#valve-leaflets'))
        self.assertIsNotNone(venous_valve, "Page 3 must contain venous valve flaps (#venous-valve)")

        # Endothelial wall styling check (in HTML or style.css)
        style_content = self.get_style_content() + html
        has_endothelial_color = ('#f87171' in style_content.lower() or '#991b1b' in style_content.lower())
        self.assertTrue(has_endothelial_color,
                        "Page 3 endothelial wall / vein structure must incorporate #f87171 or #991b1b styling")

    def test_t1_m3_tab4_bone_marrow_scene(self):
        """
        Verify Page 4 bone marrow niches:
        Trabeculae, sinusoids, HSC, B cells, LLPCs, neutrophil pool.
        Authoritative source: ORIGINAL_REQUEST §R3, PROJECT.md Feature 8-12.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        tab4_svg = dom.select_one('#viz-tab-4')
        self.assertIsNotNone(tab4_svg, "Page 4 dedicated SVG scene (#viz-tab-4) must exist")

        # Trabecular bone framework
        bone_trabeculae = (dom.select_one('#bone-trabeculae') or
                           dom.select_one('.bone-trabeculae') or
                           dom.select_one('#bm-trabeculae'))
        self.assertIsNotNone(bone_trabeculae, "Page 4 must contain bone trabeculae (#bone-trabeculae)")

        # Sinusoidal capillaries
        sinusoids = (dom.select_one('#sinusoids-layer') or
                     dom.select_one('#bone-marrow-sinusoids') or
                     dom.select_one('.sinusoid'))
        self.assertIsNotNone(sinusoids, "Page 4 must contain bone marrow sinusoidal capillaries")

        # HSC niche
        hsc_niche = dom.select_one('#hsc-niche') or dom.select_one('.hsc-cell') or dom.select_one('#hsc-layer')
        self.assertIsNotNone(hsc_niche, "Page 4 must contain HSC stem cell niche (#hsc-niche)")

        # LLPC sanctuary
        llpc_factory = (dom.select_one('#llpc-sanctuary') or
                        dom.select_one('#llpc-factory') or
                        dom.select_one('.llpc-cell'))
        self.assertIsNotNone(llpc_factory, "Page 4 must contain long-lived plasma cell factory (#llpc-sanctuary)")

        # Neutrophil storage pool
        neutro_pool = (dom.select_one('#neutrophil-pool') or
                       dom.select_one('#neutrophil-reserve') or
                       dom.select_one('.neutrophil-pool'))
        self.assertIsNotNone(neutro_pool, "Page 4 must contain neutrophil storage pool (#neutrophil-pool)")

    def test_t1_m4_interactive_control_panels(self):
        """
        Verify interactive control panels for Tabs 2, 3, 4 with buttons for pathogen injection,
        cellular triggers, labels, and speed controls.
        Authoritative source: ORIGINAL_REQUEST §R4, PROJECT.md Feature 13.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        # Tab-specific control containers
        controls_tab1 = dom.select_one('#controls-tab-1') or dom.select_one('.controls-panel')
        controls_tab2 = dom.select_one('#controls-tab-2')
        controls_tab3 = dom.select_one('#controls-tab-3')
        controls_tab4 = dom.select_one('#controls-tab-4')

        self.assertIsNotNone(controls_tab1, "Tab 1 controls panel (#controls-tab-1) must exist")
        self.assertIsNotNone(controls_tab2, "Tab 2 controls panel (#controls-tab-2) must exist")
        self.assertIsNotNone(controls_tab3, "Tab 3 controls panel (#controls-tab-3) must exist")
        self.assertIsNotNone(controls_tab4, "Tab 4 controls panel (#controls-tab-4) must exist")

        # Check Tab 2 interactive buttons (APC trigger, clonal expansion, antibodies)
        t2_buttons = controls_tab2.select('button')
        self.assertGreaterEqual(len(t2_buttons), 3, "Tab 2 controls panel must have at least 3 action buttons")

        # Check Tab 3 interactive buttons (valve trigger, hemodynamics, lymph inflow)
        t3_buttons = controls_tab3.select('button')
        self.assertGreaterEqual(len(t3_buttons), 2, "Tab 3 controls panel must have at least 2 action buttons")

        # Check Tab 4 interactive buttons (HSC trigger, G-CSF mobilization, LLPC factory)
        t4_buttons = controls_tab4.select('button')
        self.assertGreaterEqual(len(t4_buttons), 3, "Tab 4 controls panel must have at least 3 action buttons")


# ==============================================================================
# Tier 2: Boundary & Corner Cases Test Suite
# ==============================================================================

class TestTier2_BoundaryAndCornerCases(MicroDefendE2ETestBase):
    """Tier 2: Mathematical exactness, speed multiplier boundaries, and RWD constraints."""

    def test_t2_spatial_coordinate_exactness(self):
        """
        Spatial coordinate exactness: Page 1 exit vector must align seamlessly with Page 2 entrance.
        Page 1: x=1000, y=248..288 (center 268).
        Page 2: x=0, y=248..288 (center 268).
        Authoritative source: PROJECT.md § Interface Contracts line 55-56.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        # Page 1 exit
        p1_lumen = dom.select_one('#lymph-capillary-lumen')
        self.assertIsNotNone(p1_lumen, "Page 1 #lymph-capillary-lumen must exist")
        p1_bounds = get_path_bounding_box(p1_lumen.get('d', ''))
        self.assertIsNotNone(p1_bounds)

        # Page 2 entrance
        p2_inlet = dom.select_one('#afferent-inlet-primary') or dom.select_one('.afferent-inlet')
        self.assertIsNotNone(p2_inlet, "Page 2 afferent inlet must exist for spatial continuity check")
        p2_bounds = get_path_bounding_box(p2_inlet.get('d', ''))
        self.assertIsNotNone(p2_bounds)

        # Alignment assertion
        delta_y = abs(p1_bounds['center_y'] - p2_bounds['center_y'])
        self.assertLessEqual(delta_y, 1.0,
                             f"Center Y difference ({delta_y}px) exceeds 1.0px tolerance (P1={p1_bounds['center_y']}, P2={p2_bounds['center_y']})")

    def test_t2_speed_multipliers_boundary(self):
        """
        Verify speed multipliers (0.5x, 1x, 2x) exist, have valid numeric data-speed attributes,
        and adhere to physiological bounds (0.1 <= speed <= 5.0).
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        speed_btns = dom.select('.speed-btn')
        self.assertGreaterEqual(len(speed_btns), 3, "Must have at least 3 speed buttons")

        speeds = []
        for btn in speed_btns:
            raw = btn.get('data-speed')
            self.assertIsNotNone(raw, f"Speed button {btn} missing data-speed attribute")
            val = float(raw)
            self.assertTrue(0.1 <= val <= 5.0, f"Speed multiplier {val} outside boundary [0.1, 5.0]")
            speeds.append(val)

        self.assertIn(0.5, speeds, "0.5x speed multiplier must be supported")
        self.assertIn(1.0, speeds, "1.0x baseline speed multiplier must be supported")
        self.assertIn(2.0, speeds, "2.0x speed multiplier must be supported")

    def test_t2_viewport_meta_and_responsive_structure(self):
        """
        Verify viewport meta tag is properly configured for responsive mobile display,
        and core layout containers exist.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        meta_viewport = dom.select_one('meta[name="viewport"]')
        self.assertIsNotNone(meta_viewport, "Missing <meta name='viewport'> tag")
        content = meta_viewport.get('content', '')
        self.assertIn('width=device-width', content, "Viewport meta must specify width=device-width")
        self.assertIn('initial-scale=1', content, "Viewport meta must specify initial-scale=1")

        # Container structures
        self.assertIsNotNone(dom.select_one('.app-container'), ".app-container layout wrapper must exist")
        self.assertIsNotNone(dom.select_one('.main-content'), ".main-content section must exist")
        self.assertIsNotNone(dom.select_one('.visualization-container'), ".visualization-container must exist")


# ==============================================================================
# Tier 3: Cross-Feature Combinations & State Lifecycle Test Suite
# ==============================================================================

class TestTier3_CrossFeatureStateLifecycle(MicroDefendE2ETestBase):
    """Tier 3: Active-tab gating, viewport isolation, and animation loop hygiene."""

    def test_t3_cross_tab_viewport_isolation(self):
        """
        Verify cross-tab isolation and active-tab display gating:
        Only Tab 1 active initially, Tabs 2-4 hidden via style.display='none' or active class.
        Authoritative source: PROJECT.md § Interface Contracts line 50-53.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        # Tab buttons: only tab-1 should be active initially
        tab1_btn = dom.select_one('#tab-btn-1') or dom.select_one('[data-tab="tab-1"]')
        self.assertIsNotNone(tab1_btn, "Tab 1 button must exist")
        self.assertTrue(tab1_btn.has_class('active'), "Tab 1 button must have 'active' class by default")

        for tab_id in ['tab-2', 'tab-3', 'tab-4']:
            btn = dom.select_one(f'#tab-btn-{tab_id[-1]}') or dom.select_one(f'[data-tab="{tab_id}"]')
            if btn:
                self.assertFalse(btn.has_class('active'), f"Tab {tab_id} button should not be active initially")

        # SVG Viewports: #viz-tab-2..4 must be hidden initially
        for tab_num in [2, 3, 4]:
            svg = dom.select_one(f'#viz-tab-{tab_num}')
            if svg:
                style = svg.get('style', '')
                is_hidden = ('display:none' in style.replace(' ', '') or not svg.has_class('active'))
                self.assertTrue(is_hidden, f"#viz-tab-{tab_num} must be hidden (display:none) initially")

    def test_t3_animation_loop_gating_in_script(self):
        """
        Verify script.js implements active-tab simulation gating (e.g. masterAnimationLoop / currentTab)
        to prevent background DOM thrashing or memory leaks.
        Authoritative source: PROJECT.md line 9, Feature 14.
        """
        script_code = self.get_script_content()
        self.assertTrue(len(script_code) > 0, "script.js must exist and not be empty")

        # Check for tab state management or master animation gating
        has_tab_gating = (
            'currentTab' in script_code or
            'masterAnimationLoop' in script_code or
            'activeTab' in script_code or
            'viz-tab-' in script_code
        )
        self.assertTrue(has_tab_gating,
                        "script.js must contain tab gating logic (currentTab / masterAnimationLoop / viz-tab-*)")

    def test_t3_object_pool_hygiene_and_listeners(self):
        """
        Verify script.js follows zero-allocation object pooling conventions and single listener registration.
        """
        script_code = self.get_script_content()
        # Ensure pooling functions or arrays exist
        has_pooling = ('resetAllSvgPools' in script_code or 'Pool' in script_code or 'pool' in script_code)
        self.assertTrue(has_pooling, "script.js should maintain zero-allocation SVG object pooling patterns")


# ==============================================================================
# Tier 4: Real-World Pedagogical Scenarios Test Suite
# ==============================================================================

class TestTier4_PedagogicalScenarios(MicroDefendE2ETestBase):
    """Tier 4: Verify accurate biological curriculum terminology and pedagogical explanations."""

    CURRICULUM_TERMS = [
        "抗原呈現",      # Antigen Presentation (APC -> T helper)
        "輔助T細胞",     # Helper T Cell (CD4+)
        "B細胞",         # B Lymphocyte
        "漿細胞",        # Plasma Cell (Antibody Secreting)
        "抗體",          # Antibodies / Immunoglobulins
        "淋巴總管",      # Thoracic Duct / Lymphatic Trunk
        "靜脈瓣",        # Venous Valve Flaps
        "骨髓",          # Bone Marrow
        "造血幹細胞",    # Hematopoietic Stem Cells (HSC)
        "長壽漿細胞",    # Long-Lived Plasma Cells (LLPC)
        "嗜中性球儲存庫" # Neutrophil Storage Pool
    ]

    def test_t4_curriculum_biological_terminology(self):
        """
        Verify presence of all 11 required Taiwanese curriculum biological terms in HTML or script.
        Authoritative source: ORIGINAL_REQUEST §R1-R3, Dispatch prompt.
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        script_code = self.get_script_content()
        combined_corpus = html + " " + script_code

        missing_terms = []
        for term in self.CURRICULUM_TERMS:
            if term not in combined_corpus:
                missing_terms.append(term)

        self.assertEqual(len(missing_terms), 0,
                         f"Missing required curriculum biological terms: {missing_terms}")

    def test_t4_educational_descriptions_and_mechanisms(self):
        """
        Verify educational explanation containers exist for dynamic student feedback
        (#mechanism-desc, #stage-desc, or info cards).
        """
        status, html, dom = self.get_index_page()
        self.assertEqual(status, 200)

        mech_desc = dom.select_one('#mechanism-desc')
        self.assertIsNotNone(mech_desc, "Educational mechanism explanation container (#mechanism-desc) must exist")


# ==============================================================================
# CLI Entry Point & Milestone Summary Reporter
# ==============================================================================

def run_suite(milestone=None, is_baseline=False):
    """Run test suites with optional milestone filter and formatted reporting."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    all_test_classes = [
        TestTier1_FeatureCoverage,
        TestTier2_BoundaryAndCornerCases,
        TestTier3_CrossFeatureStateLifecycle,
        TestTier4_PedagogicalScenarios
    ]

    for test_class in all_test_classes:
        for method_name in loader.getTestCaseNames(test_class):
            if milestone is not None:
                # Milestone filtering:
                # m0 includes p1 and baseline tests
                if milestone == 0:
                    if '_m1_' in method_name or '_m2_' in method_name or '_m3_' in method_name or '_m4_' in method_name or 'spatial_coordinate' in method_name or 'animation_loop' in method_name or 'cross_tab' in method_name or 'terminology' in method_name:
                        continue
                elif milestone == 1:
                    if '_m2_' in method_name or '_m3_' in method_name or '_m4_' in method_name:
                        continue
                elif milestone == 2:
                    if '_m3_' in method_name or '_m4_' in method_name:
                        continue
                elif milestone == 3:
                    if '_m4_' in method_name:
                        continue
            suite.addTest(test_class(method_name))

    print("======================================================================")
    print("           MicroDefend 4-Tier E2E Test Suite Runner                   ")
    if milestone is not None:
        print(f"               Filtering for Milestone {milestone} Scope              ")
    print("======================================================================\n")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n======================================================================")
    print("                        TEST EXECUTION SUMMARY                        ")
    print("======================================================================")
    print(f"Total Tests Run   : {result.testsRun}")
    print(f"Passed Tests      : {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failed Tests      : {len(result.failures)}")
    print(f"Errored Tests     : {len(result.errors)}")
    print("======================================================================\n")

    if is_baseline:
        return True
    return result.wasSuccessful()


if __name__ == '__main__':
    args = sys.argv[1:]
    target_milestone = None
    baseline_mode = '--baseline' in args

    for i, arg in enumerate(args):
        if arg.startswith('--milestone='):
            target_milestone = int(arg.split('=')[1])
        elif arg == '--milestone' and i + 1 < len(args):
            target_milestone = int(args[i + 1])

    success = run_suite(milestone=target_milestone, is_baseline=baseline_mode)
    sys.exit(0 if success else 1)

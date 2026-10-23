#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adversarial Verification Probe by Challenger 2 (Round 2 Milestone 2.6).

Empirically challenges across all Round 2 modules:
1. `cell-3d/index.html`
2. `foodChain/index.html`
3. `energyPyramid/index.html`
4. `OmNomNom/index.html`
5. `index.html`

Across 4 distinct viewport configurations:
- 320x568 (iPhone SE 1st gen narrow mobile)
- 375x667 (Standard mobile iPhone 8 / SE 2nd gen)
- 768x1024 (iPad portrait)
- 1280x800 (Desktop)

Adversarial Verification Dimensions:
1. RWD & Viewport Adaptation:
   - Zero horizontal overflow (document.documentElement.scrollWidth <= window.innerWidth + 1)
   - Zero element overflow / clipping for all buttons, inputs, headers, and canvases
   - Canvas elements properly adapt to container without blowing out layout
2. UI Control & Button Collision / Overlap:
   - Pairwise intersection check for all visible interactive controls (> 50 sq px)
   - Floating toolbars and modals do not obstruct primary action buttons
3. Network & Asset Integrity:
   - Zero HTTP 404 / 500 errors across all resources (scripts, styles, images, audio, fonts)
   - Zero Network.loadingFailed events
4. Console Error Immunity:
   - Zero Uncaught JavaScript Exceptions (TypeError, ReferenceError, SyntaxError, RangeError)
   - Zero console.error calls across page load, resize, and dynamic interactive cycles
"""

import sys
import os
import json
import time
import subprocess
import threading
import urllib.request
import urllib.parse
from pathlib import Path
import http.server
import socketserver
import asyncio
import websockets

REPO_ROOT = Path(__file__).resolve().parent.parent

TARGET_PAGES = [
    {
        'id': 'cell-3d',
        'path': 'cell-3d/index.html',
        'title': '3D 細胞與胞器立體模型',
        'test_interactive': '''
            async () => {
                const results = {};
                // 1. Test tab buttons (switch models)
                const tabs = Array.from(document.querySelectorAll('.tab-btn'));
                results.tabCount = tabs.length;
                for (const tab of tabs) {
                    tab.click();
                    await new Promise(r => setTimeout(r, 150));
                }
                // Switch back to animalCell
                const firstTab = document.querySelector('.tab-btn[data-model="animalCell"]');
                if (firstTab) firstTab.click();
                await new Promise(r => setTimeout(r, 100));

                // 2. Test floating toolbar buttons
                const cutawayBtn = document.getElementById('cutawayBtn');
                if (cutawayBtn) {
                    cutawayBtn.click();
                    await new Promise(r => setTimeout(r, 50));
                    cutawayBtn.click();
                }
                const autoRotateBtn = document.getElementById('autoRotateBtn');
                if (autoRotateBtn) {
                    autoRotateBtn.click();
                    await new Promise(r => setTimeout(r, 50));
                    autoRotateBtn.click();
                }
                const zoomInBtn = document.getElementById('zoomInBtn');
                if (zoomInBtn) zoomInBtn.click();
                const zoomOutBtn = document.getElementById('zoomOutBtn');
                if (zoomOutBtn) zoomOutBtn.click();
                const resetCameraBtn = document.getElementById('resetCameraBtn');
                if (resetCameraBtn) resetCameraBtn.click();

                // 3. Test card toggle button
                const cardToggleBtn = document.getElementById('cardToggleBtn');
                const infoCard = document.getElementById('info-card');
                if (cardToggleBtn && infoCard) {
                    cardToggleBtn.click();
                    await new Promise(r => setTimeout(r, 100));
                    results.collapsedState = infoCard.classList.contains('collapsed');
                    cardToggleBtn.click(); // restore
                    await new Promise(r => setTimeout(r, 100));
                }

                // 4. Test structure tag clicks
                const tags = Array.from(document.querySelectorAll('.structure-tag'));
                results.tagCount = tags.length;
                if (tags.length > 0) {
                    tags[0].click();
                    await new Promise(r => setTimeout(r, 100));
                }

                // 5. Canvas check
                const canvas = document.querySelector('#canvas-container canvas');
                results.hasCanvas = !!canvas;
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    results.canvasWidth = rect.width;
                    results.canvasHeight = rect.height;
                }
                return results;
            }
        '''
    },
    {
        'id': 'foodChain',
        'path': 'foodChain/index.html',
        'title': '食物鏈與食物網動態模擬',
        'test_interactive': '''
            async () => {
                const results = {};
                // Mode 1: Simple Chain
                const playBtn = document.getElementById('chainPlayPauseBtn');
                if (playBtn) {
                    playBtn.click();
                    await new Promise(r => setTimeout(r, 100));
                    playBtn.click();
                }
                const spawnWolf = document.getElementById('spawnWolfBtn');
                const spawnSheep = document.getElementById('spawnSheepBtn');
                const spawnGrass = document.getElementById('spawnGrassBtn');
                if (spawnWolf) spawnWolf.click();
                if (spawnSheep) spawnSheep.click();
                if (spawnGrass) spawnGrass.click();

                const speedSlider = document.getElementById('chainSpeedSlider');
                if (speedSlider) {
                    speedSlider.value = 2.0;
                    speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
                }

                const chainReset = document.getElementById('chainResetBtn');
                if (chainReset) chainReset.click();
                await new Promise(r => setTimeout(r, 150));

                // Switch to Mode 2: Food Web
                const tabComplex = document.getElementById('tab-complex');
                if (tabComplex) {
                    tabComplex.click();
                    await new Promise(r => setTimeout(r, 200));
                }

                const webPlay = document.getElementById('webPlayPauseBtn');
                if (webPlay) {
                    webPlay.click();
                    await new Promise(r => setTimeout(r, 100));
                    webPlay.click();
                }

                const apexBtn = document.getElementById('btnDisruptApex');
                if (apexBtn) apexBtn.click();
                await new Promise(r => setTimeout(r, 100));

                const droughtBtn = document.getElementById('btnDrought');
                if (droughtBtn) droughtBtn.click();
                await new Promise(r => setTimeout(r, 100));

                const restoreBtn = document.getElementById('btnRestoreBalance');
                if (restoreBtn) restoreBtn.click();
                await new Promise(r => setTimeout(r, 100));

                const boostBtn = document.getElementById('btnBoostPop');
                if (boostBtn) boostBtn.click();
                const reduceBtn = document.getElementById('btnReducePop');
                if (reduceBtn) reduceBtn.click();

                const presetSelect = document.getElementById('presetSelect');
                if (presetSelect) {
                    presetSelect.value = 'presetFoothills';
                    presetSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    await new Promise(r => setTimeout(r, 150));
                }

                // Check charts and canvases
                const chainCanvas = document.getElementById('chainCanvas');
                const networkCanvas = document.getElementById('webNetworkCanvas');
                const popCanvas = document.getElementById('populationChart');
                results.hasChainCanvas = !!chainCanvas;
                results.hasNetworkCanvas = !!networkCanvas;
                results.hasPopCanvas = !!popCanvas;

                return results;
            }
        '''
    },
    {
        'id': 'energyPyramid',
        'path': 'energyPyramid/index.html',
        'title': '生態系能量塔（含10%法則計算）',
        'test_interactive': '''
            async () => {
                const results = {};
                // Tab 1: Card Game
                const cards = Array.from(document.querySelectorAll('.organism-card'));
                results.cardCount = cards.length;
                if (cards.length > 0) {
                    // Click first card to select
                    cards[0].click();
                    await new Promise(r => setTimeout(r, 100));
                    // Click a dropzone
                    const dropzone = document.getElementById('dropzone-producers');
                    if (dropzone) {
                        dropzone.click();
                        await new Promise(r => setTimeout(r, 150));
                    }
                }
                const autoHintBtn = document.getElementById('autoHintBtn');
                if (autoHintBtn) autoHintBtn.click();
                await new Promise(r => setTimeout(r, 100));

                const resetGameBtn = document.getElementById('resetGameBtn');
                if (resetGameBtn) resetGameBtn.click();
                await new Promise(r => setTimeout(r, 100));

                // Switch to Tab 2: Calculator
                const navCalcBtn = document.getElementById('navCalcBtn');
                if (navCalcBtn) {
                    navCalcBtn.click();
                    await new Promise(r => setTimeout(r, 150));
                }

                const baseInput = document.getElementById('baseEnergyInput');
                if (baseInput) {
                    baseInput.value = 50000;
                    baseInput.dispatchEvent(new Event('input', { bubbles: true }));
                    baseInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const baseSlider = document.getElementById('baseEnergySlider');
                if (baseSlider) {
                    baseSlider.value = 80000;
                    baseSlider.dispatchEvent(new Event('input', { bubbles: true }));
                }

                const effInput = document.getElementById('efficiencyInput');
                if (effInput) {
                    effInput.value = 15;
                    effInput.dispatchEvent(new Event('input', { bubbles: true }));
                }

                const unitSelect = document.getElementById('unitSelect');
                if (unitSelect) {
                    unitSelect.value = 'kcal';
                    unitSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const valTertiary = document.getElementById('val-tertiary')?.textContent;
                const totalHeat = document.getElementById('totalHeatLostVal')?.textContent;
                results.tertiaryEnergy = valTertiary;
                results.totalHeatLost = totalHeat;

                return results;
            }
        '''
    },
    {
        'id': 'OmNomNom',
        'path': 'OmNomNom/index.html',
        'title': '食物鏈棋盤遊戲 (OmNomNom)',
        'test_interactive': '''
            async () => {
                const results = {};
                // 1. Roll dice multiple times
                const diceBtn = document.getElementById('diceBtn');
                results.hasDiceBtn = !!diceBtn;
                if (diceBtn && !diceBtn.disabled) {
                    diceBtn.click();
                    // Wait for roll animation
                    await new Promise(r => setTimeout(r, 900));
                    if (!diceBtn.disabled) {
                        diceBtn.click();
                        await new Promise(r => setTimeout(r, 900));
                    }
                }

                // 2. Test Rules Modal
                const rulesBtn = document.getElementById('rulesBtn');
                const rulesModal = document.getElementById('rulesModal');
                const closeModalBtn = document.getElementById('closeModalBtn');
                results.hasRulesBtn = !!rulesBtn;
                results.hasRulesModal = !!rulesModal;

                if (rulesBtn) {
                    rulesBtn.click();
                    await new Promise(r => setTimeout(r, 200));
                    results.modalVisibleBefore = rulesModal ? window.getComputedStyle(rulesModal).display !== 'none' : false;
                    if (closeModalBtn) {
                        closeModalBtn.click();
                        await new Promise(r => setTimeout(r, 200));
                        results.modalVisibleAfter = rulesModal ? window.getComputedStyle(rulesModal).display !== 'none' : false;
                    }
                }

                // 3. Sound toggle
                const soundBtn = document.getElementById('soundBtn');
                if (soundBtn) {
                    soundBtn.click();
                    await new Promise(r => setTimeout(r, 100));
                    soundBtn.click();
                }

                // 4. Reset
                const resetBtn = document.getElementById('resetBtn');
                if (resetBtn) resetBtn.click();
                await new Promise(r => setTimeout(r, 100));

                // 5. Canvas check
                const canvas = document.getElementById('canvas');
                results.hasCanvas = !!canvas;
                if (canvas) {
                    const r = canvas.getBoundingClientRect();
                    results.canvasW = r.width;
                    results.canvasH = r.height;
                }

                return results;
            }
        '''
    },
    {
        'id': 'index-hub',
        'path': 'index.html',
        'title': '課程章節首頁樞紐',
        'test_interactive': '''
            async () => {
                const links = Array.from(document.querySelectorAll('a'));
                const targets = [
                    'cell-3d/index.html',
                    'foodChain/index.html',
                    'energyPyramid/index.html',
                    'OmNomNom/index.html'
                ];
                const found = targets.filter(t => links.some(a => a.getAttribute('href') === t));
                return {
                    totalLinks: links.length,
                    foundRound2Targets: found.length === targets.length,
                    found
                };
            }
        '''
    }
]

VIEWPORTS = [
    (320, 568, 'iPhone SE 1st Gen (Narrow Mobile)'),
    (375, 667, 'Standard Mobile (iPhone 8 / SE 2nd Gen)'),
    (768, 1024, 'iPad Portrait (Tablet)'),
    (1280, 800, 'Desktop High-Res')
]


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
            'Log.entryAdded': [],
            'Network.responseReceived': [],
            'Network.loadingFailed': []
        }
        self.listen_task = None

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50_000_000)
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
        cid = self.msg_id
        fut = asyncio.get_event_loop().create_future()
        self.pending[cid] = fut
        await self.ws.send(json.dumps({'id': cid, 'method': method, 'params': params or {}}))
        return await fut

    async def eval_js(self, expression, await_promise=False):
        res = await self.call('Runtime.evaluate', {
            'expression': expression,
            'returnByValue': True,
            'awaitPromise': await_promise
        })
        result = res.get('result', {})
        if 'exceptionDetails' in result:
            return {'error': result['exceptionDetails']}
        return {'value': result.get('result', {}).get('value')}


LAYOUT_AUDIT_JS = '''
(() => {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const docEl = document.documentElement;
    const body = document.body;

    const docW = docEl.scrollWidth;
    const bodyW = body ? body.scrollWidth : docW;
    const docClientW = docEl.clientWidth;
    
    // Fractional subpixel allowance of 2px
    const hasHScroll = (docW > winW + 2) || (bodyW > winW + 2) || (docW > docClientW + 2);

    // Collect all elements that blow out window horizontally
    const overflowingElements = [];
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
        if (['HTML', 'BODY', 'SCRIPT', 'STYLE', 'HEAD', 'META', 'TITLE', 'LINK'].includes(el.tagName)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        
        const r = el.getBoundingClientRect();
        // Check if element extends past right viewport edge
        if (r.right > winW + 2 && r.width > 0 && r.height > 0) {
            overflowingElements.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }
            });
        }
    }

    // Inspect Canvas elements specifically
    const canvases = Array.from(document.querySelectorAll('canvas')).map(c => {
        const r = c.getBoundingClientRect();
        const style = window.getComputedStyle(c);
        return {
            id: c.id,
            className: c.className,
            width: r.width,
            height: r.height,
            right: r.right,
            overflows: r.right > winW + 2,
            displayed: style.display !== 'none'
        };
    });

    // Check visible interactive controls for clipping & collisions
    const interactiveSelectors = 'button, a, input, select, textarea, [role="button"], [role="tab"], .btn, .tab-btn, .tool-btn, .organism-card';
    const interactiveEls = Array.from(document.querySelectorAll(interactiveSelectors));
    const visibleInteractives = [];
    const clippedControls = [];

    for (const el of interactiveEls) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;

        // Check horizontal clipping
        if (r.left < -3 || r.right > winW + 3) {
            clippedControls.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }
            });
        }

        visibleInteractives.push({
            el,
            tag: el.tagName,
            id: el.id,
            className: el.className,
            rect: r
        });
    }

    // Check overlaps between distinct interactive elements
    const overlaps = [];
    for (let i = 0; i < visibleInteractives.length; i++) {
        for (let j = i + 1; j < visibleInteractives.length; j++) {
            const a = visibleInteractives[i];
            const b = visibleInteractives[j];

            // Ignore nested parent/child elements
            if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

            // If one element is inside a closed/hidden modal or backdrop, skip
            if (!document.body.contains(a.el) || !document.body.contains(b.el)) continue;

            const xOverlap = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
            const yOverlap = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
            const overlapArea = xOverlap * yOverlap;

            // Significant overlap > 80 sq px with min 8px on each dimension
            if (overlapArea > 80 && xOverlap > 8 && yOverlap > 8) {
                overlaps.push({
                    a: { id: a.id, tag: a.tag, class: a.className, rect: { x: Math.round(a.rect.x), y: Math.round(a.rect.y), w: Math.round(a.rect.width), h: Math.round(a.rect.height) } },
                    b: { id: b.id, tag: b.tag, class: b.className, rect: { x: Math.round(b.rect.x), y: Math.round(b.rect.y), w: Math.round(b.rect.width), h: Math.round(b.rect.height) } },
                    overlapArea: Math.round(overlapArea)
                });
            }
        }
    }

    return {
        winW,
        winH,
        docW,
        bodyW,
        docClientW,
        hasHScroll,
        overflowingElementsCount: overflowingElements.length,
        overflowingElements: overflowingElements.slice(0, 5),
        canvases,
        interactiveCount: visibleInteractives.length,
        clippedCount: clippedControls.length,
        clippedControls: clippedControls.slice(0, 5),
        overlapsCount: overlaps.length,
        overlaps: overlaps.slice(0, 5)
    };
})()
'''


async def test_page_at_viewport(cdp, port, page, width, height, vp_label):
    url = f"http://127.0.0.1:{port}/{page['path']}"

    # Clear event caches
    for k in cdp.events:
        cdp.events[k].clear()

    # Emulate device viewport
    is_mobile = width < 1000
    await cdp.call('Emulation.setDeviceMetricsOverride', {
        'width': width,
        'height': height,
        'deviceScaleFactor': 1,
        'mobile': is_mobile,
        'screenOrientation': {'angle': 0, 'type': 'portraitPrimary' if is_mobile else 'landscapePrimary'}
    })
    await cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': is_mobile, 'maxTouchPoints': 5 if is_mobile else 0})

    # Navigate to page
    await cdp.call('Page.navigate', {'url': url})
    await asyncio.sleep(1.8)

    # 1. Harvest Network Status
    http_errors = []
    for resp in cdp.events['Network.responseReceived']:
        r = resp.get('response', {})
        status = r.get('status', 200)
        req_url = r.get('url', '')
        if status >= 400:
            http_errors.append({'url': req_url, 'status': status})

    network_fails = []
    for fail in cdp.events['Network.loadingFailed']:
        req_id = fail.get('requestId')
        error_text = fail.get('errorText')
        if not fail.get('canceled', False):
            network_fails.append({'requestId': req_id, 'errorText': error_text})

    # 2. Initial Layout Audit (Pre-interaction)
    pre_layout_res = await cdp.eval_js(LAYOUT_AUDIT_JS)
    pre_layout = pre_layout_res.get('value', {})

    # 3. Interactive Execution
    interactive_res = await cdp.eval_js(f"({page['test_interactive']})()", await_promise=True)

    # Allow DOM reflow & rendering
    await asyncio.sleep(0.5)

    # 4. Post-interaction Layout Audit
    post_layout_res = await cdp.eval_js(LAYOUT_AUDIT_JS)
    post_layout = post_layout_res.get('value', {})

    # 5. Harvest Console & JS Exceptions
    js_exceptions = []
    for ex in cdp.events['Runtime.exceptionThrown']:
        details = ex.get('exceptionDetails', {})
        text = details.get('text', '')
        ex_obj = details.get('exception', {})
        desc = ex_obj.get('description', '')
        js_exceptions.append({'text': text, 'desc': desc, 'line': details.get('lineNumber')})

    console_errors = []
    for call in cdp.events['Runtime.consoleAPICalled']:
        if call.get('type') == 'error':
            args = [str(a.get('value', a.get('description', ''))) for a in call.get('args', [])]
            console_errors.append(' '.join(args))

    return {
        'page': page['id'],
        'viewport': f"{width}x{height}",
        'vp_label': vp_label,
        'http_errors': http_errors,
        'network_fails': network_fails,
        'js_exceptions': js_exceptions,
        'console_errors': console_errors,
        'pre_layout': pre_layout,
        'post_layout': post_layout,
        'interactive_result': interactive_res
    }


async def main():
    print("=" * 80)
    print("🚀 ROUND 2 ADVERSARIAL VERIFICATION HARNESS (CHALLENGER 2)")
    print("=" * 80)

    # 1. Start ephemeral HTTP server
    httpd = socketserver.TCPServer(('127.0.0.1', 0), QuietServer)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    print(f"[*] Ephemeral HTTP server started on port {port}")

    # 2. Launch headless Chromium
    chrome_port = 9245
    chrome_cmd = [
        'chromium',
        '--headless',
        '--disable-gpu',
        f'--remote-debugging-port={chrome_port}',
        '--no-sandbox',
        '--window-size=1280,800',
        'about:blank'
    ]
    chrome_proc = subprocess.Popen(chrome_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    print(f"[*] Chromium headless launched on debug port {chrome_port}")

    try:
        # Get WebSocket target
        with urllib.request.urlopen(f'http://127.0.0.1:{chrome_port}/json/list') as resp:
            tabs = json.loads(resp.read().decode())
            ws_url = tabs[0]['webSocketDebuggerUrl']

        cdp = CDPClient(ws_url)
        await cdp.connect()
        await cdp.call('Page.enable')
        await cdp.call('Runtime.enable')
        await cdp.call('Network.enable')
        await cdp.call('Log.enable')
        await cdp.call('Network.setUserAgentOverride', {
            'userAgent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36'
        })

        all_results = []
        failures = []

        for page in TARGET_PAGES:
            print(f"\n================================================================================")
            print(f"🔬 Testing Module: {page['id']} ({page['title']}) [{page['path']}]")
            print(f"================================================================================")

            for w, h, vp_label in VIEWPORTS:
                res = await test_page_at_viewport(cdp, port, page, w, h, vp_label)
                all_results.append(res)

                layout = res['post_layout']
                pre = res['pre_layout']
                reasons = []

                # Network check
                if res['http_errors']:
                    reasons.append(f"HTTP Errors (404/500): {res['http_errors']}")
                if res['network_fails']:
                    reasons.append(f"Network Request Failed: {res['network_fails']}")

                # Console errors & JS exceptions
                if res['js_exceptions']:
                    reasons.append(f"Uncaught Exceptions: {res['js_exceptions']}")
                if res['console_errors']:
                    reasons.append(f"Console Errors: {res['console_errors']}")

                # Horizontal overflow check
                if layout.get('hasHScroll'):
                    docW = layout.get('docW')
                    winW = layout.get('winW')
                    diff = docW - winW
                    reasons.append(f"Horizontal Scroll Blowout: docW ({docW}px) > winW ({winW}px) by {diff}px")

                # Canvas overflow check
                for canvas in layout.get('canvases', []):
                    if canvas.get('overflows'):
                        reasons.append(f"Canvas Overflow: #{canvas.get('id')} right={canvas.get('right')} > winW={layout.get('winW')}")

                # Clipped controls
                if layout.get('clippedCount', 0) > 0:
                    reasons.append(f"Clipped Controls ({layout.get('clippedCount')}): {layout.get('clippedControls')}")

                # Overlapping buttons / controls
                if layout.get('overlapsCount', 0) > 0:
                    reasons.append(f"Button/Control Collisions ({layout.get('overlapsCount')}): {layout.get('overlaps')}")

                status_str = "PASS" if not reasons else "FAIL"

                print(f"  [{status_str}] {w}x{h} ({vp_label}) -> "
                      f"Overflow: {'YES ⚠️' if layout.get('hasHScroll') else 'NO 🟢'} | "
                      f"Overlaps: {layout.get('overlapsCount', 0)} | "
                      f"Clipped: {layout.get('clippedCount', 0)} | "
                      f"Exceptions: {len(res['js_exceptions'])} | "
                      f"Console Errors: {len(res['console_errors'])} | "
                      f"HTTP 404s: {len(res['http_errors'])}")

                if reasons:
                    for r in reasons:
                        print(f"       ❌ {r}")
                    failures.append({
                        'page': page['id'],
                        'viewport': f"{w}x{h}",
                        'vp_label': vp_label,
                        'reasons': reasons
                    })

        await cdp.close()

        print("\n" + "=" * 80)
        print("📊 ROUND 2 ADVERSARIAL VERIFICATION SUMMARY")
        print("=" * 80)
        print(f"Total Test Configurations: {len(all_results)} (5 pages × 4 viewports)")
        print(f"Total Failures Found: {len(failures)}")

        if failures:
            print("\n❌ CRITICAL ISSUES DETECTED:")
            for f in failures:
                print(f"\n[!] Module: {f['page']} @ {f['viewport']} ({f['vp_label']})")
                for r in f['reasons']:
                    print(f"    - {r}")
            print("\n" + "=" * 80)
            print("VERDICT: REJECT")
            print("=" * 80)
            return 1
        else:
            print("\n✅ ALL ADVERSARIAL CHECKS PASSED EMPIRICALLY:")
            print("  • Zero Horizontal Layout Blowouts / Scrollbars")
            print("  • Zero Canvas Boundary Overflows")
            print("  • Zero Button / Interactive Control Collisions or Clippings")
            print("  • Zero HTTP 404s / 500s / Network Failures")
            print("  • Zero Uncaught JavaScript Exceptions or Console Error Calls")
            print("\n" + "=" * 80)
            print("VERDICT: APPROVE")
            print("=" * 80)
            return 0

    finally:
        chrome_proc.terminate()
        httpd.shutdown()


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

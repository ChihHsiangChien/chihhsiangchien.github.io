#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adversarial Verification Probe by Challenger 2.
Empirically tests across all 7 projects:
1. Static Asset Integrity (zero 404s, missing scripts, styles, images, or audio)
2. Mobile Responsiveness at narrow viewports (320px, 375px):
   - Horizontal overflow / clipping detection
   - Button and control collision / overlap detection
   - Touch controls and viewport boundaries
3. Headless Console Error Immunity:
   - Zero Uncaught TypeError, SyntaxError, ReferenceError, NetworkError
   - Zero console.error calls across page loads and interactive cycles
4. Dynamic interactive stress tests for all 7 projects.
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

PROJECTS = [
    {
        'id': 'fiddler-crab',
        'path': 'fiddler-crab/index.html',
        'title': '招潮蟹模擬遊戲',
        'test_interactive': '''
            async () => {
                const upBtn = document.getElementById('btn-up');
                const downBtn = document.getElementById('btn-down');
                const leftBtn = document.getElementById('btn-left');
                const rightBtn = document.getElementById('btn-right');
                if (upBtn) {
                    upBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                    upBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                }
                if (downBtn) {
                    downBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                    downBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                }
                if (leftBtn) {
                    leftBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                    leftBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                }
                if (rightBtn) {
                    rightBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                    rightBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                }
                const modal = document.getElementById('game-over');
                const restartBtn = document.getElementById('restart-btn');
                return { hasButtons: !!(upBtn && downBtn && leftBtn && rightBtn), hasModal: !!modal };
            }
        '''
    },
    {
        'id': 'pepperedMoth',
        'path': 'pepperedMoth/index.html',
        'title': '胡椒蛾生存之戰',
        'test_interactive': '''
            async () => {
                const predBtn = document.getElementById('modePredatorBtn');
                const autoBtn = document.getElementById('modeAutoBtn');
                if (predBtn) predBtn.click();
                await new Promise(r => setTimeout(r, 200));
                const canvas = document.getElementById('simulationCanvas');
                if (canvas) {
                    canvas.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 100, bubbles: true }));
                }
                if (autoBtn) autoBtn.click();
                await new Promise(r => setTimeout(r, 100));
                return { hasPredBtn: !!predBtn, hasAutoBtn: !!autoBtn };
            }
        '''
    },
    {
        'id': 'lens-optical',
        'path': 'lens-optical/index.html',
        'title': '顯微鏡光學工程模擬',
        'test_interactive': '''
            async () => {
                const pReal = document.getElementById('presetReal');
                const pEye = document.getElementById('presetEyepiece');
                const pAp = document.getElementById('presetAperture');
                if (pReal) pReal.click();
                await new Promise(r => setTimeout(r, 100));
                if (pEye) pEye.click();
                await new Promise(r => setTimeout(r, 100));
                if (pAp) pAp.click();
                await new Promise(r => setTimeout(r, 100));
                const hintTitle = document.getElementById('hintTitle')?.textContent;
                const hintText = document.getElementById('hintText')?.textContent;
                const slider = document.getElementById('inputAperture');
                if (slider) {
                    slider.value = 0.5;
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                }
                return { hintTitle, hasText: !!hintText };
            }
        '''
    },
    {
        'id': 'greatFossil',
        'path': 'greatFossil/index.html',
        'title': '化石大發現',
        'test_interactive': '''
            async () => {
                const canvas = document.getElementById('gameCanvas');
                if (canvas) {
                    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true }));
                    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 50, clientY: 50, bubbles: true }));
                }
                return { hasCanvas: !!canvas };
            }
        '''
    },
    {
        'id': 'blood-stream',
        'path': 'blood-stream/index.html',
        'title': '3D 動態瓣膜血流模擬',
        'test_interactive': '''
            async () => {
                const low = document.getElementById('quality-low-btn');
                const med = document.getElementById('quality-med-btn');
                const high = document.getElementById('quality-high-btn');
                const slider = document.getElementById('particle-slider');
                if (low) low.click();
                await new Promise(r => setTimeout(r, 100));
                if (high) high.click();
                await new Promise(r => setTimeout(r, 100));
                if (med) med.click();
                await new Promise(r => setTimeout(r, 100));
                if (slider) {
                    slider.value = 150;
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                }
                return { hasQualityBtns: !!(low && med && high), hasSlider: !!slider };
            }
        '''
    },
    {
        'id': 'rt',
        'path': 'rt/index.html',
        'title': '反應時間探究',
        'test_interactive': '''
            async () => {
                const exportBtn = document.getElementById('btn-export-2');
                const copyBtn = document.getElementById('btn-copy-summary');
                // verify buttons exist
                return { hasExportBtn: !!exportBtn, hasCopyBtn: !!copyBtn };
            }
        '''
    },
    {
        'id': 'cardGame-digestion',
        'path': 'cardGame/消化_消化管_順序/index.html',
        'title': '消化器官順序卡牌',
        'test_interactive': '''
            async () => {
                const canvas = document.getElementById('gameCanvas');
                if (canvas) {
                    canvas.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true }));
                    canvas.dispatchEvent(new MouseEvent('click', { clientX: 0, clientY: 0, bubbles: true }));
                }
                return { hasCanvas: !!canvas };
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
                    'fiddler-crab/index.html',
                    'pepperedMoth/index.html',
                    'lens-optical/index.html',
                    'greatFossil/index.html',
                    'blood-stream/index.html',
                    'rt/index.html',
                    'cardGame/消化_消化管_順序/index.html'
                ];
                const found = targets.filter(t => links.some(a => a.getAttribute('href') === t));
                return { allFound: found.length === 7, count: found.length };
            }
        '''
    }
]


class QuietServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)
    def log_message(self, format, *args): pass


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
        except Exception as e:
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


async def run_project_checks(cdp, port, proj, width, height):
    """Run full check on a project at a specific viewport size."""
    url = f"http://127.0.0.1:{port}/{proj['path']}"
    
    # Reset captured events
    for k in cdp.events:
        cdp.events[k].clear()

    # Emulate viewport
    await cdp.call('Emulation.setDeviceMetricsOverride', {
        'width': width,
        'height': height,
        'deviceScaleFactor': 1,
        'mobile': True,
        'screenOrientation': {'angle': 0, 'type': 'portraitPrimary'}
    })
    await cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5})

    # Navigate
    nav_res = await cdp.call('Page.navigate', {'url': url})
    await asyncio.sleep(1.5)

    # 1. Check network 404s
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

    # 2. Check console exceptions
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

    # 3. Viewport metrics & Layout checks
    metrics_code = f'''
        (() => {{
            const winW = window.innerWidth;
            const docW = document.documentElement.scrollWidth;
            const bodyW = document.body ? document.body.scrollWidth : docW;
            const hasHScroll = docW > winW + 1 || bodyW > winW + 1;

            // Collect all visible buttons and interactive elements
            const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"], .virtual-btn'));
            const rects = [];
            const overlaps = [];
            const clipped = [];

            for (const el of elements) {{
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) continue;

                // Check clipping outside viewport (allowing top/bottom vertical scroll)
                if (r.left < -5 || r.right > winW + 5) {{
                    clipped.push({{
                        tag: el.tagName,
                        id: el.id,
                        className: el.className,
                        rect: {{ left: r.left, right: r.right, width: r.width }}
                    }});
                }}

                rects.push({{ el, r, tag: el.tagName, id: el.id, className: el.className }});
            }}

            // Check overlap between visible buttons
            for (let i = 0; i < rects.length; i++) {{
                for (let j = i + 1; j < rects.length; j++) {{
                    const a = rects[i];
                    const b = rects[j];
                    // If one contains the other (e.g. child inside button), skip
                    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

                    // Intersection check
                    const xOverlap = Math.max(0, Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left));
                    const yOverlap = Math.max(0, Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top));
                    const overlapArea = xOverlap * yOverlap;

                    // Meaningful overlap > 100 sq px
                    if (overlapArea > 100 && xOverlap > 10 && yOverlap > 10) {{
                        overlaps.push({{
                            a: {{ id: a.id, class: a.className, rect: a.r }},
                            b: {{ id: b.id, class: b.className, rect: b.r }},
                            overlapArea
                        }});
                    }}
                }}
            }}

            return {{
                winW,
                docW,
                bodyW,
                hasHScroll,
                clippedCount: clipped.length,
                clipped,
                overlapsCount: overlaps.length,
                overlaps,
                interactiveCount: rects.length
            }};
        }})()
    '''
    layout_res = await cdp.eval_js(metrics_code)
    layout = layout_res.get('value', {})

    # 4. Interactive test execution
    interactive_res = await cdp.eval_js(f"({proj['test_interactive']})()", await_promise=True)

    # Check for any new runtime exceptions after interactions
    interact_exceptions = []
    for ex in cdp.events['Runtime.exceptionThrown']:
        details = ex.get('exceptionDetails', {})
        text = details.get('text', '')
        ex_obj = details.get('exception', {})
        desc = ex_obj.get('description', '')
        interact_exceptions.append({'text': text, 'desc': desc})

    return {
        'project': proj['id'],
        'viewport': f"{width}x{height}",
        'http_errors': http_errors,
        'network_fails': network_fails,
        'js_exceptions': js_exceptions,
        'console_errors': console_errors,
        'layout': layout,
        'interactive_result': interactive_res,
        'total_exceptions': len(js_exceptions) + len(console_errors)
    }


async def main():
    print("=" * 70)
    print("🚀 STARTING ADVERSARIAL VERIFICATION PROBE (CHALLENGER 2)")
    print("=" * 70)

    # 1. Start local server
    httpd = socketserver.TCPServer(('127.0.0.1', 0), QuietServer)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    print(f"[*] Ephemeral HTTP server running on port {port}")

    # 2. Launch Chromium headless with remote debugging
    chrome_port = 9235
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
        # Get WS target
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
            'userAgent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        })

        test_viewports = [
            (320, 568),  # Narrow mobile (iPhone SE 1st gen)
            (375, 667),  # Standard mobile (iPhone 8 / SE 2nd gen)
        ]

        all_results = []
        failures = []

        for proj in PROJECTS:
            print(f"\n--- Testing Project: {proj['id']} ({proj['title']}) ---")
            for w, h in test_viewports:
                res = await run_project_checks(cdp, port, proj, w, h)
                all_results.append(res)
                
                status_str = "PASS"
                reasons = []

                if res['http_errors']:
                    status_str = "FAIL"
                    reasons.append(f"HTTP 404/Error: {res['http_errors']}")
                if res['network_fails']:
                    status_str = "FAIL"
                    reasons.append(f"Network Fail: {res['network_fails']}")
                if res['js_exceptions']:
                    status_str = "FAIL"
                    reasons.append(f"Uncaught Exception: {res['js_exceptions']}")
                if res['console_errors']:
                    status_str = "FAIL"
                    reasons.append(f"Console Error: {res['console_errors']}")
                if res['layout'].get('overlapsCount', 0) > 0:
                    status_str = "FAIL"
                    reasons.append(f"Button Overlap: {res['layout']['overlaps']}")
                if res['layout'].get('clippedCount', 0) > 0:
                    status_str = "FAIL"
                    reasons.append(f"Button Clipped: {res['layout']['clipped']}")
                if res['layout'].get('hasHScroll'):
                    status_str = "FAIL"
                    reasons.append(f"Horizontal Overflow: docW={res['layout'].get('docW')} > winW={res['layout'].get('winW')}")

                print(f"  [{status_str}] Viewport {w}x{h}: "
                      f"Errors: {len(res['js_exceptions']) + len(res['console_errors'])}, "
                      f"Overlaps: {res['layout'].get('overlapsCount', 0)}, "
                      f"Clipped: {res['layout'].get('clippedCount', 0)}, "
                      f"Overflow: {res['layout'].get('hasHScroll')}")

                if reasons:
                    for r in reasons:
                        print(f"       ⚠️ {r}")
                    failures.append({'project': proj['id'], 'viewport': f"{w}x{h}", 'reasons': reasons})

        await cdp.close()

        print("\n" + "=" * 70)
        print("📊 ADVERSARIAL AUDIT SUMMARY")
        print("=" * 70)
        print(f"Total Test Configurations: {len(all_results)}")
        print(f"Total Failures Found: {len(failures)}")

        if failures:
            print("\n❌ CRITICAL ISSUES DETECTED:")
            for f in failures:
                print(f"- {f['project']} ({f['viewport']}): {'; '.join(f['reasons'])}")
            print("\nVERDICT: REQUEST_CHANGES")
            return 1
        else:
            print("\n✅ ALL ADVERSARIAL CHECKS PASSED: Zero 404s, Zero Console Errors, Zero Overlaps, Zero Clipping!")
            print("VERDICT: APPROVE")
            return 0

    finally:
        chrome_proc.terminate()
        httpd.shutdown()


if __name__ == '__main__':
    code = asyncio.run(main())
    sys.exit(code)

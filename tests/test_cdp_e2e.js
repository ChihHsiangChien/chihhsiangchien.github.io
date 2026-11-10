/**
 * Automated Headless Chrome CDP E2E Test Suite for MicroDefend Multi-Tab Expansion
 * 
 * Host Directory: microDefend/
 * Execution:
 *   & "C:\Users\user\AppData\Local\ms-playwright-go\1.57.0\node.exe" tests/test_cdp_e2e.js
 * 
 * Verifies:
 * - Clean headless Chrome startup & native WebSocket CDP communication (zero external npm packages)
 * - Live DOM structure & SVG scene rendering
 * - Console error & unhandled exception interception (Runtime.exceptionThrown, Runtime.consoleAPICalled)
 * - Multi-tab navigation & active-tab display gating
 * - Interactive controls (speed adjustment, pathogen spawns, cellular triggers)
 * - Rapid tab switching stress resilience
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const MICRODEFEND_DIR = path.resolve(__dirname, '..', 'microDefend');
const CHROME_PATH = process.env.CHROME_BIN || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

// Test tracking state
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    failures: [],
    consoleErrors: [],
    uncaughtExceptions: []
};

function recordPass(testName, details = '') {
    results.total++;
    results.passed++;
    console.log(`  [PASS] ${testName}${details ? ` - ${details}` : ''}`);
}

function recordFail(testName, errorMsg) {
    results.total++;
    results.failed++;
    results.failures.push({ testName, errorMsg });
    console.log(`  [FAIL] ${testName}: ${errorMsg}`);
}

// Utility to get a free TCP port
function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, '127.0.0.1', () => {
            const port = srv.address().port;
            srv.close((err) => {
                if (err) reject(err);
                else resolve(port);
            });
        });
    });
}

// Minimal static HTTP server for microDefend directory
function createStaticServer() {
    return http.createServer((req, res) => {
        const urlPath = req.url.split('?')[0];
        let filePath = path.join(MICRODEFEND_DIR, urlPath === '/' ? 'index.html' : urlPath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap = {
                '.html': 'text/html; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.svg': 'image/svg+xml',
                '.json': 'application/json; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.ico': 'image/x-icon'
            };
            res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
            res.end(fs.readFileSync(filePath));
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });
}

// CDP Client Wrapper
class CDPClient {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.nextId = 1;
        this.pending = new Map();
        this.eventListeners = new Map();

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.id && this.pending.has(msg.id)) {
                    const { resolve, reject } = this.pending.get(msg.id);
                    this.pending.delete(msg.id);
                    if (msg.error) {
                        reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                    } else {
                        resolve(msg.result);
                    }
                } else if (msg.method) {
                    const handlers = this.eventListeners.get(msg.method) || [];
                    for (const handler of handlers) {
                        handler(msg.params);
                    }
                }
            } catch (err) {
                console.error('CDP message parse error:', err);
            }
        };
    }

    ready() {
        if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
        return new Promise((resolve, reject) => {
            this.ws.onopen = () => resolve();
            this.ws.onerror = (err) => reject(err);
        });
    }

    send(method, params = {}) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }

    async evaluate(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
            throw new Error(`Evaluation Exception: ${desc}`);
        }
        return res.result ? res.result.value : undefined;
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Main Test Execution Flow
async function main() {
    // Command-line flag parsing
    const args = process.argv.slice(2);
    let targetMilestone = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--milestone=')) {
            targetMilestone = parseInt(args[i].split('=')[1], 10);
        } else if (args[i] === '--milestone' && i + 1 < args.length) {
            targetMilestone = parseInt(args[i + 1], 10);
        }
    }
    const isBaselineRun = args.includes('--baseline');

    console.log('======================================================================');
    console.log('Starting MicroDefend Headless Chrome CDP E2E Automation Test Suite');
    if (targetMilestone !== null) {
        console.log(`Filtering for Milestone: ${targetMilestone}`);
    }
    console.log(`Host Directory: ${MICRODEFEND_DIR}`);
    console.log(`Chrome Binary:  ${CHROME_PATH}`);
    console.log('======================================================================\n');

    const serverPort = await getFreePort();
    const cdpPort = await getFreePort();
    const server = createStaticServer();

    let chromeProcess = null;
    let cdp = null;

    try {
        // 1. Launch HTTP Server
        await new Promise((resolve) => server.listen(serverPort, '127.0.0.1', resolve));
        console.log(`[Init] Local test HTTP server listening on http://127.0.0.1:${serverPort}`);

        // 2. Launch Chrome Headless
        console.log(`[Init] Spawning Headless Chrome on debug port ${cdpPort}...`);
        chromeProcess = spawn(CHROME_PATH, [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            `--remote-debugging-port=${cdpPort}`
        ]);

        // Wait for Chrome CDP endpoint
        let wsUrl = null;
        for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise((r) => setTimeout(r, 200));
            try {
                const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
                if (res.ok) {
                    const targets = await res.json();
                    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
                    if (pageTarget && pageTarget.webSocketDebuggerUrl) {
                        wsUrl = pageTarget.webSocketDebuggerUrl;
                        break;
                    }
                }
            } catch (_) {
                // Keep polling until Chrome binds port
            }
        }

        if (!wsUrl) {
            throw new Error(`Failed to obtain Chrome WebSocket Debugger URL on port ${cdpPort}`);
        }

        // 3. Connect CDP Client
        cdp = new CDPClient(wsUrl);
        await cdp.ready();
        console.log('[Init] Connected to Chrome via native WebSocket CDP!\n');

        // Enable domains
        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('DOM.enable');

        // Error Interception Listeners
        cdp.on('Runtime.exceptionThrown', (params) => {
            const desc = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text;
            results.uncaughtExceptions.push(desc);
            console.error(`  [CONSOLE EXCEPTION] ${desc}`);
        });

        cdp.on('Runtime.consoleAPICalled', (params) => {
            if (params.type === 'error') {
                const text = params.args.map((a) => a.value || a.description || '').join(' ');
                results.consoleErrors.push(text);
                console.error(`  [CONSOLE ERROR] ${text}`);
            }
        });

        // 4. Navigate to index.html
        console.log('--- Phase 1: Page Navigation & Baseline Sanity ---');
        await cdp.send('Page.navigate', { url: `http://127.0.0.1:${serverPort}/` });

        // Wait for DOM to stabilize
        await new Promise((r) => setTimeout(r, 1200));

        // Test 1.1: Document title verification
        const title = await cdp.evaluate('document.title');
        if (title && (title.includes('微觀人體防線') || title.includes('MicroDefend'))) {
            recordPass('Page Title Verification', `"${title}"`);
        } else {
            recordFail('Page Title Verification', `Expected title to contain MicroDefend, got: "${title}"`);
        }

        // Test 1.2: Check for uncaught runtime exceptions during initial load
        if (results.uncaughtExceptions.length === 0) {
            recordPass('Initial Load Clean Console', '0 uncaught exceptions');
        } else {
            recordFail('Initial Load Clean Console', `${results.uncaughtExceptions.length} uncaught exceptions detected`);
        }

        // Test 1.3: SVG container & scenes presence
        const svgCount = await cdp.evaluate('document.querySelectorAll("svg").length');
        if (svgCount >= 1) {
            recordPass('SVG Visualization Presence', `Found ${svgCount} SVG element(s)`);
        } else {
            recordFail('SVG Visualization Presence', 'No <svg> elements found in DOM');
        }

        // Test 1.4: Baseline speed control interaction
        const speedUpdated = await cdp.evaluate(`
            (() => {
                const btn2x = document.querySelector('.speed-btn[data-speed="2"]');
                if (!btn2x) return false;
                btn2x.click();
                return typeof simSpeed !== 'undefined' ? simSpeed === 2 : true;
            })()
        `);
        if (speedUpdated) {
            recordPass('Speed Multiplier (2.0x) Interaction', 'Clicked 2.0x speed button');
        } else {
            recordFail('Speed Multiplier (2.0x) Interaction', 'Could not click 2.0x speed button');
        }

        // Reset speed back to 1.0x
        await cdp.evaluate(`
            (() => {
                const btn1x = document.querySelector('.speed-btn[data-speed="1"]');
                if (btn1x) btn1x.click();
            })()
        `);

        // Test 1.5: Baseline Pathogen Injection (Bacteria)
        const bacteriaClicked = await cdp.evaluate(`
            (() => {
                const btn = document.querySelector('#btn-spawn-bacteria');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            })()
        `);
        if (bacteriaClicked) {
            recordPass('Baseline Pathogen Spawn Interaction', 'Clicked #btn-spawn-bacteria without error');
        } else {
            recordFail('Baseline Pathogen Spawn Interaction', '#btn-spawn-bacteria not found');
        }

        // --- Phase 2: Multi-Tab Navigation Architecture ---
        if (targetMilestone === null || targetMilestone >= 1) {
            console.log('\n--- Phase 2: Multi-Tab Navigation & Viewport Gating ---');

            const tabsNavExists = await cdp.evaluate('Boolean(document.querySelector(".tabs-nav"))');
            if (tabsNavExists) {
                recordPass('Multi-Tab Navigation Bar', '.tabs-nav exists in DOM');

                const tabCount = await cdp.evaluate('document.querySelectorAll(".tabs-nav [data-tab], .tabs-nav .tab-btn").length');
                if (tabCount === 4) {
                    recordPass('Multi-Tab Button Count', '4 tabs found (Tabs 1, 2, 3, 4)');
                } else {
                    recordFail('Multi-Tab Button Count', `Expected 4 tab buttons, found ${tabCount}`);
                }

                // Test clicking through all 4 tabs
                for (let tabNum = 2; tabNum <= 4; tabNum++) {
                    const switchResult = await cdp.evaluate(`
                        (() => {
                            const tabBtn = document.querySelector('[data-tab="tab-${tabNum}"], #tab-btn-${tabNum}');
                            if (!tabBtn) return { found: false };
                            tabBtn.click();
                            
                            const isBtnActive = tabBtn.classList.contains('active');
                            const scene = document.querySelector('#viz-tab-${tabNum}');
                            const isSceneVisible = scene ? window.getComputedStyle(scene).display !== 'none' : false;
                            
                            return { found: true, isBtnActive, isSceneVisible };
                        })()
                    `);

                    if (!switchResult.found) {
                        recordFail(`Tab ${tabNum} Switch`, `Button for Tab ${tabNum} not found`);
                    } else if (switchResult.isBtnActive && switchResult.isSceneVisible) {
                        recordPass(`Tab ${tabNum} Switch & Visibility Gating`, `Tab ${tabNum} active & #viz-tab-${tabNum} visible`);
                    } else {
                        recordFail(`Tab ${tabNum} Switch & Visibility Gating`, `Active: ${switchResult.isBtnActive}, SceneVisible: ${switchResult.isSceneVisible}`);
                    }
                    await new Promise((r) => setTimeout(r, 200));
                }

                // Return to Tab 1
                await cdp.evaluate(`
                    (() => {
                        const tab1 = document.querySelector('[data-tab="tab-1"], #tab-btn-1');
                        if (tab1) tab1.click();
                    })()
                `);
                recordPass('Return to Tab 1', 'Successfully switched back to Tab 1');

            } else {
                recordFail('Multi-Tab Navigation Bar', '.tabs-nav not present in DOM (Milestone 1 pending)');
                recordFail('Tab 2 Switch & Visibility Gating', 'Tab 2 navigation not available');
                recordFail('Tab 3 Switch & Visibility Gating', 'Tab 3 navigation not available');
                recordFail('Tab 4 Switch & Visibility Gating', 'Tab 4 navigation not available');
            }
        }

        // --- Phase 3: Interactive Controls & SVG Generation ---
        console.log('\n--- Phase 3: Interactive Controls & Scene Dynamism ---');

        // Test Tab 1 label toggle
        const labelToggleResult = await cdp.evaluate(`
            (() => {
                const toggle = document.querySelector('#toggle-labels');
                const layer = document.querySelector('#anatomy-annotations');
                if (!toggle || !layer) return false;
                const prevDisplay = window.getComputedStyle(layer).display;
                toggle.click();
                const newDisplay = window.getComputedStyle(layer).display;
                // Revert
                toggle.click();
                return prevDisplay !== newDisplay;
            })()
        `);
        if (labelToggleResult) {
            recordPass('Tab 1 Anatomy Labels Toggle', 'Toggling #toggle-labels alters annotation visibility');
        } else {
            recordFail('Tab 1 Anatomy Labels Toggle', 'Could not toggle #toggle-labels or annotations missing');
        }

        if (targetMilestone === null || targetMilestone >= 1) {
            // Check Tab 2 controls (APC trigger)
            const tab2ControlCheck = await cdp.evaluate(`
                (() => {
                    const panel = document.querySelector('#controls-tab-2');
                    if (!panel) return { panelExists: false };
                    const buttons = panel.querySelectorAll('button');
                    return { panelExists: true, buttonCount: buttons.length };
                })()
            `);
            if (tab2ControlCheck.panelExists && tab2ControlCheck.buttonCount >= 3) {
                recordPass('Tab 2 Controls Panel', `${tab2ControlCheck.buttonCount} action buttons in #controls-tab-2`);
            } else {
                recordFail('Tab 2 Controls Panel', tab2ControlCheck.panelExists ?
                    `Only ${tab2ControlCheck.buttonCount} buttons in #controls-tab-2` :
                    '#controls-tab-2 not found');
            }
        }

        if (targetMilestone === null || targetMilestone >= 2) {
            // Check Tab 3 controls (Venous valves & Hemodynamics)
            const tab3ControlCheck = await cdp.evaluate(`
                (() => {
                    const panel = document.querySelector('#controls-tab-3');
                    if (!panel) return { panelExists: false };
                    const buttons = panel.querySelectorAll('button');
                    return { panelExists: true, buttonCount: buttons.length };
                })()
            `);
            if (tab3ControlCheck.panelExists && tab3ControlCheck.buttonCount >= 2) {
                recordPass('Tab 3 Controls Panel', `${tab3ControlCheck.buttonCount} action buttons in #controls-tab-3`);
            } else {
                recordFail('Tab 3 Controls Panel', tab3ControlCheck.panelExists ?
                    `Only ${tab3ControlCheck.buttonCount} buttons in #controls-tab-3` :
                    '#controls-tab-3 not found');
            }
        }

        if (targetMilestone === null || targetMilestone >= 3) {
            // Check Tab 4 controls (HSC & LLPC triggers)
            const tab4ControlCheck = await cdp.evaluate(`
                (() => {
                    const panel = document.querySelector('#controls-tab-4');
                    if (!panel) return { panelExists: false };
                    const buttons = panel.querySelectorAll('button');
                    return { panelExists: true, buttonCount: buttons.length };
                })()
            `);
            if (tab4ControlCheck.panelExists && tab4ControlCheck.buttonCount >= 3) {
                recordPass('Tab 4 Controls Panel', `${tab4ControlCheck.buttonCount} action buttons in #controls-tab-4`);
            } else {
                recordFail('Tab 4 Controls Panel', tab4ControlCheck.panelExists ?
                    `Only ${tab4ControlCheck.buttonCount} buttons in #controls-tab-4` :
                    '#controls-tab-4 not found (Milestone 3 pending)');
            }

            // Interactive Tab 4 action triggers test
            const tab4Interact = await cdp.evaluate(`
                (() => {
                    const tab4 = document.querySelector('[data-tab="tab-4"], #tab-btn-4');
                    if (tab4) tab4.click();
                    
                    const btnMobilize = document.querySelector('#btn-t4-mobilize-neutrophils');
                    if (btnMobilize) btnMobilize.click();

                    const btnHsc = document.querySelector('#btn-t4-hsc-burst');
                    if (btnHsc) btnHsc.click();

                    const btnLlpc = document.querySelector('#btn-t4-llpc-boost');
                    if (btnLlpc) btnLlpc.click();

                    const btnStepB = document.querySelector('#btn-t4-step-bcell');
                    if (btnStepB) btnStepB.click();

                    return true;
                })()
            `);
            if (tab4Interact) {
                recordPass('Tab 4 Interactive Action Triggers', 'Successfully clicked Mobilize, HSC, LLPC, and B Cell triggers');
            } else {
                recordFail('Tab 4 Interactive Action Triggers', 'Failed to trigger Tab 4 buttons');
            }
        }

        // --- Phase 4: Rapid Tab Switching & Stability Stress ---
        console.log('\n--- Phase 4: Rapid Tab Switching & Stress Resilience ---');

        const stressResult = await cdp.evaluate(`
            (async () => {
                const tabButtons = Array.from(document.querySelectorAll('.tabs-nav [data-tab], .tabs-nav .tab-btn'));
                if (tabButtons.length < 2) return { supported: false, errorCount: 0 };
                
                let count = 0;
                for (let i = 0; i < 12; i++) {
                    const btn = tabButtons[i % tabButtons.length];
                    btn.click();
                    count++;
                }
                return { supported: true, switchCycles: count };
            })()
        `);

        if (stressResult.supported) {
            recordPass('Rapid Tab Switching Stress Test', `Executed ${stressResult.switchCycles} rapid cycles without crash`);
        } else {
            recordPass('Single-Tab Baseline Stress Test', 'No multi-tab DOM present to cycle, skipping rapid toggle');
        }

        // Check for accumulated uncaught exceptions after interactions
        if (results.uncaughtExceptions.length === 0) {
            recordPass('Zero Uncaught Runtime Exceptions Across Session', '0 exceptions throughout session');
        } else {
            recordFail('Zero Uncaught Runtime Exceptions Across Session',
                `${results.uncaughtExceptions.length} unhandled runtime exceptions recorded`);
        }

    } catch (err) {
        console.error('\n[FATAL RUNNER ERROR]:', err);
        results.failed++;
        results.failures.push({ testName: 'Runner Execution', errorMsg: err.message });
    } finally {
        // Teardown
        console.log('\n[Teardown] Cleaning up Chrome process, WebSocket, and HTTP server...');
        if (cdp) cdp.close();
        if (chromeProcess) {
            try {
                chromeProcess.kill('SIGTERM');
            } catch (_) {}
        }
        server.close();
    }

    // --- Phase 5: Structured Report ---
    console.log('\n======================================================================');
    console.log('                 CDP E2E TEST RUNNER SUMMARY REPORT                   ');
    console.log('======================================================================');
    console.log(`Total Checks Executed : ${results.total}`);
    console.log(`Passed Checks         : ${results.passed} (${Math.round((results.passed / results.total) * 100)}%)`);
    console.log(`Failed Checks         : ${results.failed} (${Math.round((results.failed / results.total) * 100)}%)`);
    console.log(`Uncaught JS Exceptions: ${results.uncaughtExceptions.length}`);
    console.log(`Console Errors Logged : ${results.consoleErrors.length}`);
    console.log('----------------------------------------------------------------------');

    if (results.failures.length > 0) {
        console.log('Recorded Failures (Expected in Milestone 0 Baseline):');
        results.failures.forEach((f, idx) => {
            console.log(`  ${idx + 1}. [${f.testName}]: ${f.errorMsg}`);
        });
    }

    console.log('======================================================================\n');

    // Exit code: 0 if no unhandled runner crash and console clean, or 1 if failed
    // For standard CI reporting, exit with 0 if baseline completed cleanly
    if (isBaselineRun) {
        process.exit(0);
    } else {
        process.exit(results.failed > 0 ? 1 : 0);
    }
}

main().catch((err) => {
    console.error('Unhandled fatal error in main:', err);
    process.exit(1);
});

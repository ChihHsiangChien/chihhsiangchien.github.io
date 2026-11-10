// Independent Adversarial Stress Test Suite for MicroDefend
// Auditor: auditor_1 (teamwork_auditor)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CHROME_PATH = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const HOST_DIR = "C:\\Users\\user\\Documents\\GitHub\\chihhsiangchien.github.io\\microDefend";
const PORT = 57199;
const DEBUG_PORT = 57200;

// Simple HTTP static server
const server = http.createServer((req, res) => {
    let filePath = path.join(HOST_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not Found");
        return;
    }
    const ext = path.extname(filePath);
    const mimeMap = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', async () => {
    console.log(`[Stress Test] HTTP server listening on http://127.0.0.1:${PORT}`);
    
    // Spawn Headless Chrome
    const chrome = spawn(CHROME_PATH, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        `--remote-debugging-port=${DEBUG_PORT}`,
        '--remote-allow-origins=*',
        `http://127.0.0.1:${PORT}/index.html`
    ]);

    // Give Chrome a moment to spin up
    await new Promise(r => setTimeout(r, 1200));

    // Connect to CDP
    try {
        const versionRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
        const targets = await versionRes.json();
        const pageTarget = targets.find(t => t.type === 'page');
        if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
            throw new Error("No page target WebSocket debugger URL found");
        }

        const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
        let idCounter = 1;
        const pending = new Map();
        const exceptions = [];
        const consoleErrors = [];

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.id && pending.has(data.id)) {
                const resolver = pending.get(data.id);
                pending.delete(data.id);
                resolver(data.result);
            }
            if (data.method === 'Runtime.exceptionThrown') {
                const details = data.params.exceptionDetails;
                exceptions.push(details.text || details.exception.description);
                console.error("  [UNCAUGHT EXCEPTION]", details.text || details.exception.description);
            }
            if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
                consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
                console.error("  [CONSOLE ERROR]", ...data.params.args);
            }
        };

        const sendCmd = (method, params = {}) => {
            return new Promise((resolve) => {
                const id = idCounter++;
                pending.set(id, resolve);
                ws.send(JSON.stringify({ id, method, params }));
            });
        };

        await new Promise((resolve) => { ws.onopen = resolve; });
        await sendCmd('Runtime.enable');
        await sendCmd('Page.enable');

        console.log("[Stress Test] Connected to Chrome DevTools Protocol.");

        const evalJs = async (expr) => {
            const res = await sendCmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
            return res.result ? res.result.value : null;
        };

        // 1. Initial State Check
        const initialTitle = await evalJs("document.title");
        console.log(`[Check 1] Page Title: ${initialTitle}`);

        // 2. Tab Navigation High-Frequency Fuzzing
        console.log("[Check 2] Stress-testing rapid tab cycling (40 switches)...");
        for (let i = 0; i < 40; i++) {
            const tabNum = (i % 4) + 1;
            await evalJs(`document.querySelector('.tab-btn[data-tab="tab-${tabNum}"]').click()`);
        }
        await new Promise(r => setTimeout(r, 200));

        // 3. Pathogen Injection & Burst Mobilization Flood
        console.log("[Check 3] Flooding simulation with burst events on all tabs...");
        // Tab 1 flood
        await evalJs(`document.querySelector('.tab-btn[data-tab="tab-1"]').click()`);
        for (let i = 0; i < 15; i++) {
            await evalJs("document.getElementById('btn-spawn-bacteria').click()");
            await evalJs("document.getElementById('btn-spawn-virus').click()");
        }
        // Tab 2 flood
        await evalJs(`document.querySelector('.tab-btn[data-tab="tab-2"]').click()`);
        for (let i = 0; i < 10; i++) {
            await evalJs("document.getElementById('btn-t2-step-inflow').click()");
            await evalJs("document.getElementById('btn-t2-step-clonal').click()");
        }
        // Tab 3 flood
        await evalJs(`document.querySelector('.tab-btn[data-tab="tab-3"]').click()`);
        for (let i = 0; i < 10; i++) {
            await evalJs("document.getElementById('btn-t3-step-confluence').click()");
            await evalJs("document.getElementById('btn-t3-toggle-valve').click()");
        }
        // Tab 4 flood
        await evalJs(`document.querySelector('.tab-btn[data-tab="tab-4"]').click()`);
        for (let i = 0; i < 10; i++) {
            await evalJs("document.getElementById('btn-t4-step-hsc').click()");
            await evalJs("document.getElementById('btn-t4-step-bcell').click()");
            await evalJs("document.getElementById('btn-t4-step-storage').click()");
            await evalJs("document.getElementById('btn-t4-step-llpc').click()");
        }

        // Wait 1500ms for animation loop ticks
        console.log("[Check 4] Letting simulation tick under heavy load for 1500ms...");
        await new Promise(r => setTimeout(r, 1500));

        // 4. Measure DOM node count stability (Object Pool Verification)
        const nodeCountAfterFlood = await evalJs("document.querySelectorAll('*').length");
        console.log(`[Check 5] Total DOM nodes after burst: ${nodeCountAfterFlood}`);

        // Wait another 1500ms and verify node count does not continuously explode
        await new Promise(r => setTimeout(r, 1500));
        const nodeCountAfterSustained = await evalJs("document.querySelectorAll('*').length");
        console.log(`[Check 6] Total DOM nodes after sustained run: ${nodeCountAfterSustained}`);
        const nodeDiff = Math.abs(nodeCountAfterSustained - nodeCountAfterFlood);
        console.log(`[Check 7] Node count difference between frames: ${nodeDiff} (Zero-Allocation Pool stability confirmed if small)`);

        // 5. Final Exception and Error Verification
        console.log(`[Final Verdict Summary]`);
        console.log(`  Uncaught Exceptions: ${exceptions.length}`);
        console.log(`  Console Errors: ${consoleErrors.length}`);

        if (exceptions.length === 0 && consoleErrors.length === 0 && nodeDiff < 30) {
            console.log(">>> ADVERSARIAL STRESS TEST: CLEAN PASS <<<");
        } else {
            console.error(">>> ADVERSARIAL STRESS TEST: FAILED <<<");
            process.exitCode = 1;
        }

        ws.close();
    } catch (err) {
        console.error("Stress Test Error:", err);
        process.exitCode = 1;
    } finally {
        chrome.kill();
        server.close();
    }
});

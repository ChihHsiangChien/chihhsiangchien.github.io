const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const server = http.createServer((req, res) => {
    let p = path.join('c:/Users/user/Documents/GitHub/chihhsiangchien.github.io/microDefend', req.url.split('?')[0]);
    if (p.endsWith('/') || p.endsWith('\\')) p = path.join(p, 'index.html');
    if (fs.existsSync(p)) {
        res.writeHead(200);
        res.end(fs.readFileSync(p));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(61299, async () => {
    const chrome = spawn('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', [
        '--headless=new',
        '--remote-debugging-port=61300',
        '--disable-gpu',
        '--no-sandbox',
        'http://127.0.0.1:61299/index.html'
    ]);

    await new Promise(r => setTimeout(r, 1500));
    const targets = await (await fetch('http://127.0.0.1:61300/json')).json();
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (method, params = {}) => new Promise(r => {
        const cur = id++;
        const fn = (e) => {
            const m = JSON.parse(e.data);
            if (m.id === cur) { ws.removeEventListener('message', fn); r(m.result); }
        };
        ws.addEventListener('message', fn);
        ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Runtime.enable');
    await send('Runtime.evaluate', { expression: 'document.querySelector(\'.tab-btn[data-tab="tab-4"]\').click()' });

    console.log('Tab 4 active. Waiting 5s for steady-state stream...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Sampling DOM counts every 500ms across 5 intervals:');
    for (let i = 1; i <= 5; i++) {
        await new Promise(r => setTimeout(r, 500));
        const res = await send('Runtime.evaluate', {
            expression: '({ total: document.querySelectorAll("*").length, poolLength: document.querySelectorAll("#p4-antibodies-layer path").length, hidden: document.querySelectorAll("#p4-antibodies-layer path[style*=\\"display: none\\"]").length })',
            returnByValue: true
        });
        console.log(`Interval ${i}: `, res.result.value);
    }

    ws.close();
    chrome.kill();
    server.close();
    process.exit(0);
});

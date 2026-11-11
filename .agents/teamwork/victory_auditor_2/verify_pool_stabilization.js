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

server.listen(61234, async () => {
    const chrome = spawn('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', [
        '--headless=new',
        '--remote-debugging-port=61235',
        '--disable-gpu',
        '--no-sandbox',
        'http://127.0.0.1:61234/index.html'
    ]);

    await new Promise(r => setTimeout(r, 1200));

    const httpGet = (url) => new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });

    const targets = await httpGet('http://127.0.0.1:61235/json');
    const wsUrl = targets[0].webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);

    await new Promise(resolve => ws.onopen = resolve);

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
        const m = JSON.parse(event.data);
        if (m.id && pending.has(m.id)) {
            const resolve = pending.get(m.id);
            pending.delete(m.id);
            resolve(m.result);
        }
    };
    const send = (method, params = {}) => new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    await new Promise(async (resolve) => {
        const handler = (data) => {
            const m = JSON.parse(data.data);
            if (m.method === 'Page.loadEventFired') {
                ws.removeEventListener('message', handler);
                resolve();
            }
        };
        ws.addEventListener('message', handler);
        await send('Page.navigate', { url: 'http://127.0.0.1:61234/index.html' });
    });

    console.log('Page loaded successfully. Switching to Tab 4...');
    await new Promise(r => setTimeout(r, 500));
    await send('Runtime.evaluate', { expression: "document.querySelector('.tab-btn[data-tab=\"tab-4\"]').click()" });

    console.log('Tracking Tab 4 DOM nodes, SVG nodes, and p4AntibodiesLayer elements every 1s for 10 seconds...');
    for (let sec = 1; sec <= 10; sec++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await send('Runtime.evaluate', {
            expression: '(() => ({ total: document.querySelectorAll("*").length, svg: document.querySelectorAll("svg *").length, p4AbCount: document.querySelectorAll("#p4-antibodies-layer path").length, hiddenP4Ab: document.querySelectorAll("#p4-antibodies-layer path[style*=\\"display: none\\"]").length }))()',
            returnByValue: true
        });
        const v = res.result.value;
        console.log(`Sec ${sec}: Total=${v.total}, SVG=${v.svg}, p4AbCount=${v.p4AbCount}, hiddenP4Ab=${v.hiddenP4Ab}`);
    }

    ws.close();
    chrome.kill();
    server.close();
});

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

server.listen(58711, async () => {
    const chrome = spawn('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', [
        '--headless=new',
        '--remote-debugging-port=58712',
        '--disable-gpu',
        '--no-sandbox',
        'http://127.0.0.1:58711/index.html'
    ]);

    await new Promise(r => setTimeout(r, 1500));
    const targets = await (await fetch('http://127.0.0.1:58712/json')).json();
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
        ws.send(JSON.stringify({ id: cur, method, params }));
    });

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://127.0.0.1:58711/index.html' });
    await new Promise(r => setTimeout(r, 1000));

    // Switch to tab 4
    await send('Runtime.evaluate', { expression: 'document.querySelector(\'.tab-btn[data-tab="tab-4"]\').click()' });

    console.log('Running Tab 4 for 8 seconds and measuring p4AbPool length each second:');
    for (let sec = 1; sec <= 8; sec++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await send('Runtime.evaluate', {
            expression: `(() => ({ sec: ${sec}, totalNodes: document.querySelectorAll("*").length, abPoolLen: document.querySelectorAll("#p4-antibodies-layer path").length, hiddenAbs: document.querySelectorAll("#p4-antibodies-layer path[style*=\\"display: none\\"]").length }))()`,
            returnByValue: true
        });
        console.log(JSON.stringify(res.result.value));
    }

    ws.close();
    chrome.kill();
    server.close();
});

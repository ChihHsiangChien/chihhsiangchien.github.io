const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const microDefendDir = 'c:\\Users\\user\\Documents\\GitHub\\chihhsiangchien.github.io\\microDefend';

const server = http.createServer((req, res) => {
    let filePath = path.join(microDefendDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const mimeMap = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8'
        };
        res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
        res.end(fs.readFileSync(filePath));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    const chrome = spawn('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless=new',
        '--disable-gpu',
        '--remote-debugging-port=9456'
    ]);

    setTimeout(async () => {
        try {
            const listRes = await fetch('http://127.0.0.1:9456/json/list');
            const listData = await listRes.json();
            const pageTarget = listData.find(t => t.type === 'page') || listData[0];
            const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

            ws.onopen = async () => {
                let id = 1;
                function send(method, params = {}) {
                    return new Promise((resolve, reject) => {
                        const curId = id++;
                        const handler = (msg) => {
                            const data = JSON.parse(msg.data);
                            if (data.id === curId) {
                                ws.removeEventListener('message', handler);
                                if (data.error) reject(data.error);
                                else resolve(data.result);
                            }
                        };
                        ws.addEventListener('message', handler);
                        ws.send(JSON.stringify({ id: curId, method, params }));
                    });
                }

                try {
                    await send('Page.enable');
                    await send('Runtime.enable');
                    await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
                    await new Promise(r => setTimeout(r, 1000));

                    const titleEval = await send('Runtime.evaluate', { expression: 'document.title' });
                    console.log('PAGE TITLE:', titleEval.result.value);

                    const btnCount = await send('Runtime.evaluate', { expression: 'document.querySelectorAll("button").length' });
                    console.log('BUTTON COUNT:', btnCount.result.value);

                    const svgCount = await send('Runtime.evaluate', { expression: 'document.querySelectorAll("svg").length' });
                    console.log('SVG COUNT:', svgCount.result.value);

                    console.log('CDP AUTOMATION SUCCESSFUL!');
                } catch (err) {
                    console.error('CDP Error:', err);
                } finally {
                    ws.close();
                    chrome.kill();
                    server.close();
                    process.exit(0);
                }
            };
        } catch (err) {
            console.error('Connection error:', err);
            chrome.kill();
            server.close();
            process.exit(1);
        }
    }, 1500);
});

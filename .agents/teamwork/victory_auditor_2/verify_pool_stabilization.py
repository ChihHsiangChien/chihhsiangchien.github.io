import urllib.request, json, time, subprocess

# Start server
server = subprocess.Popen(['python', '-m', 'http.server', '61456', '--directory', 'microDefend'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

# Start chrome
chrome = subprocess.Popen(['C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '--headless=new', '--remote-debugging-port=61457', '--disable-gpu', '--no-sandbox', 'http://127.0.0.1:61456/index.html'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)

import websocket
targets = json.loads(urllib.request.urlopen('http://127.0.0.1:61457/json').read())
ws = websocket.create_connection(targets[0]['webSocketDebuggerUrl'])

msg_id = 0
def send(method, params={}):
    global msg_id
    msg_id += 1
    ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params}))
    while True:
        res = json.loads(ws.recv())
        if res.get('id') == msg_id:
            return res.get('result', {})

send('Runtime.enable')

# Click tab 4
send('Runtime.evaluate', {'expression': 'document.querySelector(\'[data-tab="tab-4"]\').click()'})

print('Tracking Tab 4 DOM nodes and SVG nodes every 1 second for 8 seconds...')
for i in range(1, 9):
    time.sleep(1)
    res = send('Runtime.evaluate', {
        'expression': 'JSON.stringify({ total: document.querySelectorAll("*").length, svg: document.querySelectorAll("svg *").length, p4AbCount: document.querySelectorAll("#p4-antibodies-layer path").length })',
        'returnByValue': True
    })
    val = json.loads(res['result']['value'])
    print(f'Sec {i}: Total={val["total"]}, SVG={val["svg"]}, p4AntibodiesLayer paths={val["p4AbCount"]}')

ws.close()
chrome.kill()
server.kill()

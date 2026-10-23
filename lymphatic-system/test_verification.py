import json
import urllib.request
import asyncio
import websockets
import time

async def run_tests():
    res = urllib.request.urlopen("http://localhost:9225/json").read()
    tabs = json.loads(res.decode('utf-8'))
    ws_url = tabs[0]['webSocketDebuggerUrl']

    async with websockets.connect(ws_url) as ws:
        async def send(method, params=None):
            msg = {"id": int(time.time()*1000) % 100000, "method": method, "params": params or {}}
            await ws.send(json.dumps(msg))
            while True:
                resp = json.loads(await ws.recv())
                if resp.get("id") == msg["id"]:
                    return resp

        await send("Page.enable")
        await send("Runtime.enable")
        await asyncio.sleep(1)

        # 1. 檢查有無 Console 報錯
        eval_err = await send("Runtime.evaluate", {
            "expression": "window.__errors = []; window.addEventListener('error', e => window.__errors.push(e.message));"
        })

        # 2. 測試：構造標示 Toggle 控制標籤
        # 預設構造標示為勾選 (chkLabels.checked == true)
        s1 = await send("Runtime.evaluate", {"expression": "document.getElementById('chkLabels').checked"})
        print("Initial chkLabels:", s1.get('result', {}).get('result', {}).get('value'))

        # 截圖 1: 構造標示開啟時
        shot1 = await send("Page.captureScreenshot", {"format": "png"})
        import base64
        with open("/home/pancala/.gemini/antigravity-cli/brain/b93ef535-e94a-4cbb-8ea1-64bf2f95b82e/test_labels_on.png", "wb") as f:
            f.write(base64.b64decode(shot1['result']['data']))

        # 關閉構造標示
        await send("Runtime.evaluate", {"expression": "document.getElementById('chkLabels').click()"})
        await asyncio.sleep(0.5)
        s2 = await send("Runtime.evaluate", {"expression": "document.getElementById('chkLabels').checked"})
        print("After click chkLabels:", s2.get('result', {}).get('result', {}).get('value'))

        # 截圖 2: 構造標示關閉時 (畫面應無文字標籤氣泡與HUD)
        shot2 = await send("Page.captureScreenshot", {"format": "png"})
        with open("/home/pancala/.gemini/antigravity-cli/brain/b93ef535-e94a-4cbb-8ea1-64bf2f95b82e/test_labels_off.png", "wb") as f:
            f.write(base64.b64decode(shot2['result']['data']))

        # 恢復開啟構造標示
        await send("Runtime.evaluate", {"expression": "document.getElementById('chkLabels').click()"})
        await asyncio.sleep(0.3)

        # 3. 測試：暫停動畫對分頁 1 粒子的凍結效果
        # 先獲取當前第一個 RBC 的 t 值與第一個水分粒子的 x 值
        # 注意 t1RbcList 與 t1PlasmaLeakList 是在 app.js 閉包內，我們可以評估畫布截圖或者在暫停時前後比較
        await send("Runtime.evaluate", {"expression": "document.getElementById('chkPause').click()"})
        await asyncio.sleep(0.3)
        pause_state = await send("Runtime.evaluate", {"expression": "document.getElementById('chkPause').checked"})
        print("Pause checked:", pause_state.get('result', {}).get('result', {}).get('value'))

        # 截圖 A (暫停中)
        shot_pause_a = await send("Page.captureScreenshot", {"format": "png"})
        await asyncio.sleep(0.8) # 等待 800ms
        # 截圖 B (依然暫停中)
        shot_pause_b = await send("Page.captureScreenshot", {"format": "png"})

        # 比對兩個 base64 是否一致或者完全靜止
        data_a = shot_pause_a['result']['data']
        data_b = shot_pause_b['result']['data']
        is_identical = (data_a == data_b)
        print("During pause, screenshots identical (completely frozen):", is_identical)

        with open("/home/pancala/.gemini/antigravity-cli/brain/b93ef535-e94a-4cbb-8ea1-64bf2f95b82e/test_paused.png", "wb") as f:
            f.write(base64.b64decode(data_a))

        # 4. 檢查 DOM 是否已無 inspectBox
        inspect_exists = await send("Runtime.evaluate", {"expression": "!!document.getElementById('inspectBox')"})
        print("InspectBox exists in DOM:", inspect_exists.get('result', {}).get('result', {}).get('value'))

        tags1_exists = await send("Runtime.evaluate", {"expression": "!!document.getElementById('tagsTab1')"})
        print("TagsTab1 exists in DOM:", tags1_exists.get('result', {}).get('result', {}).get('value'))

asyncio.run(run_tests())

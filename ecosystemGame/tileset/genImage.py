import os
import requests
import base64
import time

# 從環境變數讀取 API 金鑰
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("未設定 OPENAI_API_KEY 環境變數")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# 要產生的生態系清單
biomes = [
    "forest", "grassland", "mountain", "plain",
    "intertidal zone", "ocean", "desert", "tundra",
    "coniferous forest", "deciduous forest"
]

# prompt 模板
prompt_template = (
    "a top-down pixel art tileset for a {biome} environment, arranged as a 32x32 pixel grid tileset, "
    "sprite sheet format, showing exactly 8x8 tiles (64 tiles), each tile clearly separated and aligned, "
    "seamless edges, clean consistent lighting, no shadows, 8-bit retro style, game-ready, transparent background"
)

def generate_image(biome, retries=3, cooldown=20):
    prompt = prompt_template.format(biome=biome)
    print(f"\n🖼️ Generating for {biome}...")

    json_data = {
        "model": "gpt-image-1",
        "prompt": prompt,
        "size": "1024x1024",
        "quality":"high",
        "background": "transparent"
    }

    for attempt in range(retries):
        response = requests.post("https://api.openai.com/v1/images/generations", headers=headers, json=json_data)

        if response.ok:
            b64_image = response.json()["data"][0]["b64_json"]
            image_bytes = base64.b64decode(b64_image)

            filename = f"{biome.replace(' ', '_')}_tileset.png"
            with open(filename, "wb") as f:
                f.write(image_bytes)

            print(f"✅ Saved {filename}")
            return
        else:
            print(f"⚠️ Error on attempt {attempt + 1} for {biome}: {response.status_code}")
            print(response.text)
            if response.status_code == 429:
                print("⏳ Hit rate limit, waiting before retry...")
                time.sleep(cooldown)
            else:
                print("🛑 Non-retryable error.")
                break

    print(f"❌ Failed to generate {biome} after {retries} attempts.")

# 主執行區域：依序處理所有生態系
for biome in biomes[0:1]:
    generate_image(biome)
    time.sleep(20)  # 主動 cooldown，每次請求間隔 20 秒（可調整）

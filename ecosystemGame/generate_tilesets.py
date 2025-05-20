import json
import base64
import mimetypes
import os
import time
from google import genai
from google.genai import types

# === 讀取 Gemini API 金鑰 ===
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("未設定 GEMINI_API_KEY 環境變數")

client = genai.Client(api_key=api_key)

# === 儲存圖片 ===
def save_binary_file(file_name, data, mime_type):
    file_extension = mimetypes.guess_extension(mime_type) or ".png"
    full_name = f"{file_name}{file_extension}"
    with open(full_name, "wb") as f:
        f.write(data)
    print(f"✅ 圖像已儲存：{full_name}")

# === 從外部 JSON 載入生態系資料 ===
def load_biome_data(json_path="biomes.json"):
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

# === 產生圖像 ===
def generate_tileset(biome, index, model="gemini-2.0-flash-preview-image-generation"):
    biome_name = biome["name"]
    biome_prompt = biome["description"]
    full_prompt = (
        f"A pixel art sprite sheet of {biome_prompt} "
        f"Retro 8-bit pixel style, vivid but natural colors, transparent PNG."
        f"A perfectly aligned 8x8 sprite sheet, each tile exactly 32x32 pixels, with clear grid alignment and no overlapping or blending between tiles."
        f"Designed for use in Tiled Map Editor."
        f"Each tile must be fully contained and cleanly separated in a grid. No anti-aliasing. Strict pixel-art style."
    )

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=full_prompt)],
        )
    ]

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        response_mime_type="text/plain",
    )

    output_name = f"{biome_name.replace(' ', '_')}_tileset_{index:02d}"

    try:
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config,
        ):
            parts = chunk.candidates[0].content.parts
            if parts and parts[0].inline_data:
                inline_data = parts[0].inline_data
                save_binary_file(output_name, inline_data.data, inline_data.mime_type)
            else:
                print(f"⚠️ 無圖像產生：{output_name}")
    except Exception as e:
        print(f"❌ 錯誤：{output_name} → {str(e)}")

# === 批次處理所有生態系 ===
if __name__ == "__main__":
    biomes = load_biome_data("biomes.json")
    for biome in biomes:
        for i in range(3):  # 每種生態系產生 3 種不同圖像
            print(f"\n🌍 [{biome['name'].capitalize()} Tileset {i+1}/3] Generating...")
            generate_tileset(biome, i + 1)
            print("⏳ 等待 7 秒避免觸發速率限制...")
            time.sleep(7)

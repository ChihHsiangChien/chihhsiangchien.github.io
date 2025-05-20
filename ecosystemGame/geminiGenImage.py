# pip install google-genai

import base64
import mimetypes
import os
import time
from google import genai
from google.genai import types

# 讀取 Gemini API 金鑰
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("未設定 GEMINI_API_KEY 環境變數")

client = genai.Client(api_key=api_key)

def save_binary_file(file_name, data, mime_type):
    file_extension = mimetypes.guess_extension(mime_type) or ".png"
    full_name = f"{file_name}{file_extension}"
    with open(full_name, "wb") as f:
        f.write(data)
    print(f"✅ 圖像已儲存：{full_name}")

def generate_tileset(biome_name, model="gemini-2.0-flash-preview-image-generation"):
    prompt = (
        f"A pixel art sprite sheet of a top-down 8x8 tileset representing a {biome_name} biome environment. "
        f"Each tile is 32x32 pixels, arranged in a grid, total 64 tiles. Sprite sheet layout, retro 8-bit style, "
        f"no background, transparent PNG, vivid but natural colors."
    )

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        )
    ]

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        response_mime_type="text/plain",
    )

    try:
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config,
        ):
            parts = chunk.candidates[0].content.parts
            if parts and parts[0].inline_data:
                inline_data = parts[0].inline_data
                save_binary_file(f"{biome_name.replace(' ', '_')}_tileset", inline_data.data, inline_data.mime_type)
            else:
                print(f"⚠️ 無圖像產生：{biome_name}")
    except Exception as e:
        print(f"❌ 錯誤：{biome_name} → {str(e)}")

if __name__ == "__main__":
    biomes_temp = [
        "forest", "grassland", "mountain", "plain",
        "intertidal zone", "ocean", "desert", "tundra",
        "coniferous forest", "deciduous forest"
    ]

    biomes = [
        "grassland", 
        "mountain", 
        "plain",
        "intertidal zone", 
        "desert", 
        "tundra",
        "coniferous forest", 
        "deciduous forest"
    ]
    for index, biome in enumerate(biomes):
        print(f"\n🖼️ [{index+1}/{len(biomes)}] 正在生成：{biome} tileset...")
        generate_tileset(biome)

        # 避免超出 10 RPM 限制
        print("⏳ 等待 7 秒避免觸發速率限制...")
        time.sleep(7)

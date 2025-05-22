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

# === 設定區 (Configuration) ===
API_MODEL = "gemini-2.0-flash-preview-image-generation" 
OUTPUT_FOLDER = "generated_tilesets"
IMAGES_PER_BIOME = 3                  # 每個生態系要產生的圖像數量
WAIT_TIME_SECONDS = 7 # 每次 API 呼叫後的等待時間 (秒)

# === 儲存圖片 ===
def save_binary_file(file_name, data, mime_type):
    # 確保輸出資料夾存在
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
        print(f"📁 已建立資料夾：{OUTPUT_FOLDER}")

    file_extension = mimetypes.guess_extension(mime_type) or ".png"
    full_path = os.path.join(OUTPUT_FOLDER, f"{file_name}{file_extension}")
    with open(full_path, "wb") as f:
        f.write(data)
    print(f"✅ 圖像已儲存：{full_path}")

# === 從外部 JSON 載入生態系資料 ===
def load_biome_data(json_path="biomes.json"):
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

# === 產生單一圖像 ===
def generate_single_tileset_image(biome, index, model=API_MODEL):
    biome_name = biome["name"]
    biome_prompt = biome["description"]
    full_prompt = (
        f"A retro 8-bit pixel art tyle of {biome_prompt} ,"
        f"vivid but natural colors."
        f"No anti-aliasing."
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

    output_name = f"{biome_name.replace(' ', '_')}_{index:02d}"

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
        for i in range(IMAGES_PER_BIOME):  # 每種生態系產生指定數量的圖像
            print(f"\n🌍 [{biome['name'].capitalize()} Tileset {i+1}/{IMAGES_PER_BIOME}] Generating...")
            generate_single_tileset_image(biome, i + 1) # 使用更新後的函數名稱和預設模型
            print(f"⏳ 等待 {WAIT_TIME_SECONDS} 秒避免觸發速率限制...")
            time.sleep(WAIT_TIME_SECONDS)

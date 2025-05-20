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

# 🌱 生態系敘述模板（可擴充）
def biome_description(biome_name):
    biome_name = biome_name.lower()
    if biome_name == "ocean":
        return (
            "a side-view 8x8 tileset representing a full ocean ecosystem. "
            "Each tile is 32x32 pixels, arranged in a grid, total 64 tiles. "
            "The tileset depicts zones from top to bottom: intertidal zone, shallow coastal waters, "
            "continental shelf, open ocean (epipelagic zone), twilight zone (mesopelagic), "
            "midnight zone (bathypelagic), and abyssal depths (abyssopelagic)."
        )
    elif biome_name == "intertidal zone":
        return (
            "a top-down view 8x8 tileset representing a rocky and sandy intertidal zone. "
            "Each tile is 32x32 pixels, arranged in a grid, total 64 tiles. "            
            "Includes features such as tide pools, barnacles, mussels, seaweed, crabs, and wave-washed rocks."
        )        
    elif biome_name == "desert":
        return (
            "a top-down view 8x8 tileset representing a desert biome. "
            "Each tile is 32x32 pixels, arranged in a grid, total 64 tiles. "
            "The tileset includes features such as sand dunes, rocky plateaus, oases, cacti, and desert wildlife."
        )
    elif biome_name == "forest":
        return (
            "a side-view 8x8 tileset representing a forest biome. "
            "Each tile is 32x32 pixels, arranged in a grid, total 64 tiles. "
            "The tileset shows forest floor, underbrush, tree trunks, canopy, animals, and mushrooms."
        )
        
    elif biome_name == "coniferous forest":
        return (
            "a side-view 8x8 tileset of a coniferous forest biome. "
            "Includes pine trees, moss-covered ground, fallen logs, and snow patches."
        )        
    elif biome_name == "deciduous forest":
        return (
            "a side-view 8x8 tileset of a deciduous forest biome. "
            "Includes broadleaf trees, leaf litter, small streams, and autumn foliage."
        )
    elif biome_name == "grassland":
        return (
            "a side-view 8x8 tileset of a temperate grassland biome. "
            "Includes tall grasses, scattered shrubs, wildflowers, and burrowing animals."
        )                
    elif biome_name == "tundra":
        return (
            "a side-view 8x8 tileset representing a tundra biome. "
            "The tileset includes permafrost layers, moss, lichen, low shrubs, and Arctic wildlife."
        )        
    else:
        return (
            f"a side-view 8x8 tileset representing a {biome_name} biome. "
            "Each tile is 32x32 pixels, arranged in a grid, total 64 tiles. "
            "Retro 8-bit style, natural colors, transparent background (PNG)."
        )

def generate_tileset(biome_name, index, model="gemini-2.0-flash-preview-image-generation"):
    biome_prompt = biome_description(biome_name)
    full_prompt = (
        f"A pixel art sprite sheet of {biome_prompt} "
        "Retro 8-bit pixel style, vivid but natural colors, transparent PNG."
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

# 🔁 批次執行不同 biome
if __name__ == "__main__":
    biomes = [
        ["ocean","side-view"],
        ["estuary","side-view"],
        ["mangrove swamp","top-down"],
        ["intertidal zone","top-down"],
        ["stream","top-down"],
        ["river","top-down"],
        ["lake","side-view"],
        ["pond","top-down"],
        ["desert","top-down"],
        ["grassland","top-down"],
        ["evergreen needleleaf forest","side-view"],
        ["evergreen broadleaf forest","side-view"],
        ["deciduous forest","side-view"],
        ["plain","top-down"],
        ["tundra","top-down"],
        ["alpine grasslands","top-down"]
        ]
    for biome in biomes:
        for i in range(3):  # 每個 biome 產生 3 次不同版本
            print(f"\n🌍 [{biome.capitalize()} Tileset {i+1}/3] Generating...")
            generate_tileset(biome, i + 1)
            print("⏳ 等待 7 秒避免觸發速率限制...")
            time.sleep(7)

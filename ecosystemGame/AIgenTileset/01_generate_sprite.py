import base64
import mimetypes
import os
import time

# Assuming X.AI's SDK is OpenAI compatible
from openai import OpenAI

# === 讀取 XAI_API_KEY API 金鑰 ===
api_key = os.getenv("XAI_API_KEY")
if not api_key:
    raise ValueError("未設定 XAI_API_KEY 環境變數")
client = OpenAI(base_url="https://api.x.ai/v1", api_key=api_key)

WAIT_TIME_SECONDS = 7 # 每次 API 呼叫後的等待時間
OUTPUT_FOLDER = "generated_sprites" # 指定儲存圖片的資料夾名稱


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


# === 產生圖像 ===
def generate_sprite(item_name_for_prompt: str, item_name_for_filename: str, image_index: int, model: str = "grok-2-image"):
    """
    Generates a single sprite image for the given item.
    - item_name_for_prompt: The name of the item to use in the generation prompt (e.g., "駱駝").
    - item_name_for_filename: A sanitized version of the item name for use in filenames (e.g., "駱駝").
    - image_index: An index for the image, used to differentiate multiple images of the same item.
    - model: The model to use for image generation.
    """
    print(f"ℹ️  Preparing to generate sprite for: {item_name_for_prompt} (File index: {image_index})")

    full_prompt = (
        f"A single, retro 8-bit pixel art sprite of a {item_name_for_prompt}. "
        f"The sprite should be clearly defined. Common views: side view for animals, top-down for some insects/plants, or front view. Prioritize clarity for game use. "
        f"Use a transparent background (PNG format). If transparency is not possible, use a solid pure white background (RGB 255, 255, 255) that can be easily removed. No shadows. "
        f"The {item_name_for_prompt} should be the sole subject, isolated, with no other elements or complex scenery. "
        f"Strict pixel-art style, no anti-aliasing. Colors should be vivid yet natural for the subject. "
        f"Designed for use as a 2D game asset. Target sprite dimensions around 32x32 pixels or 64x64 pixels. The generated image can be larger (e.g., 256x256 or 512x512) but the subject should be clear and scalable to these target dimensions."
    )

    # output_name_base will be used to form the final filename for each generated image variant

    try:
        print(f"⏳ Calling API for {item_name_for_prompt} (index {image_index}) with model {model}...")
        response = client.images.generate(
            model=model,
            prompt=full_prompt,
            n=2,  
            response_format="b64_json"  # Request base64 encoded JSON
        )

        if response.data:
            for i, image_object in enumerate(response.data):
                if image_object.b64_json:
                    image_data_b64 = image_object.b64_json
                    image_data_bytes = base64.b64decode(image_data_b64)
                    # Create a unique name for each image variant, e.g., item_sprite_01_v1.png, item_sprite_01_v2.png
                    variant_output_name = f"{item_name_for_filename}_sprite_{image_index:02d}_v{i+1}"
                    save_binary_file(variant_output_name, image_data_bytes, "image/png") # Assume PNG for transparency
                else:
                    print(f"⚠️ 無圖像資料於回應中第 {i+1} 個項目：{item_name_for_filename}")
        else:
            print(f"⚠️ API 未回傳任何圖像資料：{item_name_for_filename}")

    except Exception as e:
        print(f"❌ 錯誤於 {item_name_for_filename} (index {image_index}): {str(e)}")

# === 產生動畫 Sprite Sheet ===
def generate_animation_sprite_sheet(item_name_for_prompt: str, item_name_for_filename: str, image_index: int, model: str = "grok-2-image"):
    """
    Generates an animation sprite sheet for the given item.
    - item_name_for_prompt: The name of the item for the prompt.
    - item_name_for_filename: Sanitized item name for filename.
    - image_index: Index for differentiating multiple items of the same name (from the input list).
    - model: Model for image generation.
    """
    print(f"ℹ️  Preparing to generate animation sprite sheet for: {item_name_for_prompt} (File index: {image_index})")

    full_prompt = (
        f"A retro 8-bit pixel art animation sprite sheet for a {item_name_for_prompt}. "
        f"The sheet should contain multiple animation frames for a common action (e.g., walking, idle, or a characteristic movement). "
        f"Typically 4-8 frames, arranged horizontally in a single row. "
        f"Each frame should be clearly defined and separated, ideally around 32x32 or 64x64 pixels per frame. "
        f"Use a transparent background (PNG format). If transparency is not possible, use a solid pure white background (RGB 255, 255, 255). No shadows. "
        f"The {item_name_for_prompt} in each frame should be the sole subject. "
        f"Strict pixel-art style, no anti-aliasing. Colors should be vivid yet natural. "
        f"Designed for 2D game animation."
    )

    try:
        print(f"⏳ Calling API for {item_name_for_prompt} animation sheet (index {image_index}) with model {model}...")
        response = client.images.generate(
            model=model,
            prompt=full_prompt,
            n=2,  # 通常 sprite sheet 一次請求一張
            response_format="b64_json"
        )

        if response.data:
            for i, image_object in enumerate(response.data):
                if image_object.b64_json:
                    image_data_b64 = image_object.b64_json
                    image_data_bytes = base64.b64decode(image_data_b64)
                    # 為每個動畫 sprite sheet 版本建立唯一的檔案名稱
                    # 例如：item_anim_sheet_01_v1.png, item_anim_sheet_01_v2.png
                    variant_sheet_output_name = f"{item_name_for_filename}_anim_sheet_{image_index:02d}_v{i+1}"
                    save_binary_file(variant_sheet_output_name, image_data_bytes, "image/png")
                else:
                    print(f"⚠️ 動畫 sprite sheet 回應中第 {i+1} 個項目無圖像資料：{item_name_for_filename}")
        else:
            print(f"⚠️ API 未回傳任何動畫 sprite sheet 資料：{item_name_for_filename}")
    except Exception as e:
        print(f"❌ 產生動畫 sprite sheet 錯誤於 {item_name_for_filename} (index {image_index}), variant {i+1}: {str(e)}")

if __name__ == "__main__":
    items_to_generate = [
    "Taiwan Barbet",              # 五色鳥（Psilopogon nuchalis）
    "Pangolin",                   # 穿山甲（中華穿山甲：Manis pentadactyla）
    "Formosan Sambar Deer",       # 台灣水鹿（Rusa unicolor swinhoei）
    "Thomson's gazelle",                   # 羚羊（泛指，例：Thomson's gazelle）
    "Zebra",                      # 斑馬（常指 Plains zebra）
    "Giraffe",                    # 長頸鹿（Giraffa camelopardalis）
    "Warthog",                    # 疣豬（Phacochoerus africanus）
    "Lion",                       # 獅子（Panthera leo）
    "Spotted hyena"
]

    # Keeps track of how many times an item name (for filename) has been processed
    # to ensure unique filenames like item_01.png, item_02.png for repeated names in the list.
    item_generation_counter = {}

    for item_name in items_to_generate:
        print(item_name)

        file_name_base = item_name.replace(' ', '_').replace('/', '_') # Basic sanitization for filename
        current_occurrence_index = item_generation_counter.get(file_name_base, 0) + 1
        item_generation_counter[file_name_base] = current_occurrence_index

        # --- 產生單張 Sprite (使用第一個 prompt) ---
        print(f"\n🎨 Processing individual sprites for: {item_name} (Occurrence {current_occurrence_index} in list)")
        generate_sprite(item_name_for_prompt=item_name, 
                        item_name_for_filename=file_name_base, 
                        image_index=current_occurrence_index,
                        model="grok-2-image") # Specify your desired model
        
        print(f"⏳ 等待 {WAIT_TIME_SECONDS} 秒避免觸發速率限制...")
        time.sleep(WAIT_TIME_SECONDS)

        # --- 產生動畫 Sprite Sheet (使用第二個 prompt) ---
        '''
        print(f"\n🎞️ Processing animation sprite sheet for: {item_name} (Occurrence {current_occurrence_index} in list)")
        generate_animation_sprite_sheet(item_name_for_prompt=item_name,
                                        item_name_for_filename=file_name_base,
                                        image_index=current_occurrence_index,
                                        model="grok-2-image")
        print(f"⏳ 等待 {WAIT_TIME_SECONDS} 秒避免觸發速率限制...")
        time.sleep(WAIT_TIME_SECONDS)
        '''

    print("\n✅ 所有項目處理完成。")

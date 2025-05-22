import os
import io
from PIL import Image
import numpy as np
import cv2
from rembg import remove

# === 可自訂參數 ===
INPUT_FOLDER = "input_images"      # 輸入資料夾
OUTPUT_FOLDER = "output_images"    # 輸出資料夾
OUTPUT_SUFFIX = "_pixel"           # 輸出圖檔後綴
PIXEL_SIZE = 48                    # 最終像素化尺寸 (寬高)
COLOR_COUNT = 32                   # 顏色數限制
SCALE_FACTOR = 5                  # 縮放倍率
ENABLE_BACKGROUND_REMOVAL = False  # 啟用去背
ENABLE_EDGE_ENHANCEMENT = True    # 啟用邊緣強化

# === 允許的圖片副檔名 ===
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}

# === 確保輸出資料夾存在 ===
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def pil_to_cv(img):
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGBA2BGRA)

def cv_to_pil(img):
    return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGRA2RGBA))

def process_image(input_path, output_path):
    with open(input_path, 'rb') as f:
        raw = f.read()

    # 移除背景（如果啟用）
    if ENABLE_BACKGROUND_REMOVAL:
        raw = remove(raw)

    image = Image.open(io.BytesIO(raw)).convert("RGBA")

    # 邊緣加強
    if ENABLE_EDGE_ENHANCEMENT:
        cv_img = pil_to_cv(image)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGRA2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        cv_img[edges != 0] = [0, 0, 0, 255] # Make edges black
        image = cv_to_pil(cv_img)

    # 縮小 -> 減色
    small = image.resize((PIXEL_SIZE, PIXEL_SIZE), Image.BILINEAR)
    quantized = small.convert("P", palette=Image.ADAPTIVE, colors=COLOR_COUNT).convert("RGBA")

    # By assigning quantized to final_image, the output dimensions will be PIXEL_SIZE x PIXEL_SIZE.
    # The SCALE_FACTOR variable will no longer influence the final output dimensions.
    # If PIXEL_SIZE is small (e.g., 48), the output image will also be small.
    final_image = quantized
    final_image.save(output_path)
    print(f"✅ 完成：{output_path}")

# === 處理所有圖片 ===
for filename in os.listdir(INPUT_FOLDER):
    name, ext = os.path.splitext(filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        continue

    input_path = os.path.join(INPUT_FOLDER, filename)
    output_filename = f"{name}{OUTPUT_SUFFIX}.png"
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    try:
        process_image(input_path, output_path)
    except Exception as e:
        print(f"⚠️ 錯誤處理 {filename}: {e}")

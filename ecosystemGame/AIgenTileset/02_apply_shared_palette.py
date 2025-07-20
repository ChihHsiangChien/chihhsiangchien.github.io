import os
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans

INPUT_FOLDER = "input_images"
OUTPUT_FOLDER = "output_images"
TEMP_SIMPLIFIED_FOLDER = "temp_simplified"
NUM_COLORS = 16

os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(TEMP_SIMPLIFIED_FOLDER, exist_ok=True)

simplified_pixels = []
images = []
filenames = []

# 第一步：先把每張圖縮成 16 色，避免色彩雜訊
print("步驟一：簡化各圖為 16 色...")
for filename in os.listdir(INPUT_FOLDER):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        path = os.path.join(INPUT_FOLDER, filename)
        img = Image.open(path).convert("RGB")
        img_small = img.quantize(colors=NUM_COLORS, method=2).convert("RGB")  # Pillow 的 quantize
        img_small.save(os.path.join(TEMP_SIMPLIFIED_FOLDER, filename))
        simplified_pixels.append(np.array(img_small).reshape(-1, 3))
        images.append(img)
        filenames.append(filename)

# 第二步：用所有簡化過的像素建立共用 palette
print("步驟二：建立共用 palette...")
all_pixels = np.concatenate(simplified_pixels, axis=0)
kmeans = KMeans(n_clusters=NUM_COLORS, random_state=0).fit(all_pixels)
palette = np.round(kmeans.cluster_centers_).astype(np.uint8)

# 第三步：將原圖轉換為共用 palette
def quantize_with_palette(img, palette):
    data = np.array(img).reshape(-1, 3)
    distances = np.linalg.norm(data[:, None] - palette[None, :], axis=2)
    nearest = np.argmin(distances, axis=1)
    quantized = palette[nearest]
    return Image.fromarray(quantized.reshape(img.size[1], img.size[0], 3), 'RGB')

print("步驟三：轉換所有原圖到共用 palette...")
for img, name in zip(images, filenames):
    quantized = quantize_with_palette(img, palette)
    quantized.save(os.path.join(OUTPUT_FOLDER, name))

print("完成！每張圖都使用乾淨且統一的 16 色 palette。")

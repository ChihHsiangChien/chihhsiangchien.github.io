import requests
import os
import re
import csv
import json

# --- Configuration ---
# WARNING: Avoid hardcoding API keys. Use environment variables or a secure method.
API_KEY = "API_KEY_HERE"  # <--- 請務必將此處替換為您真實的 Grok API 金鑰
if API_KEY == "API_KEY_HERE":
    print("提醒：請將腳本中的 API_KEY_HERE 替換為您真實的 Grok API 金鑰。")
    # 如果希望強制替換金鑰才能執行，可以取消下面這行的註解
    # raise ValueError("API key not set. Replace 'API_KEY_HERE' in the script.")

API_BASE_URL = "https://api.x.ai/v1"
IMAGE_GENERATION_ENDPOINT = f"{API_BASE_URL}/images/generations"

CSV_FILENAME = "events.csv"
IMAGE_OUTPUT_DIR = "images"  # 儲存生成圖片的資料夾
JSON_OUTPUT_FILENAME = "penicillin_data.json" # 輸出的 JSON 檔案名稱

# JSON 檔案的內容 (符合 script.js 期望的結構)
PAGE_TITLE = "青黴素與二戰：互動時間軸"
MAIN_HEADING = "🔬 青黴素與二戰：從實驗室到戰場的奇蹟旅程 ⛑️"

# vvv --- 定義統一的圖片風格 --- vvv
# 範例：你可以改成 "watercolor painting", "anime style", "photorealistic", "vintage photograph", "Studio Ghibli style animation", "pixel art" 等等
# 請根據你的需求修改此處的風格描述
IMAGE_STYLE_DESCRIPTOR = "in a detailed, slightly vintage illustration style"
# ^^^ --------------------------------- ^^^

# 視覺化區塊的標準 HTML 模板 (使用陣列格式以提高可讀性)
VISUALIZATION_HTML_TEMPLATE = [
    "<div style='display: flex; align-items: center; gap: 15px; flex-wrap: wrap;'>", # 添加 flex-wrap 以便換行
    "  <span>{descriptionSnippet}</span>", # 簡短描述的佔位符
    "  <img src='{imageUrl}' alt='{altText}' style='max-width: 150px; height: auto; border-radius: 5px; margin-top: 5px;'>", # 調整圖片樣式
    "</div>"
]
# --- End Configuration ---

# API 請求標頭
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def sanitize_filename(date_str):
    """將日期字串清理成適合做為檔案名的格式。"""
    # 移除檔名中可能無效的字元
    safe_str = re.sub(r'[\\/*?:"<>|]', '_', date_str)
    # 替換日期/範圍中常見的特定字元
    safe_str = safe_str.replace('.', '_').replace('–', '_').replace('(', '_').replace(')', '').replace(' ', '')
    # 移除可能產生的結尾底線
    safe_str = safe_str.strip('_')
    return f"{safe_str}.jpg"

def generate_image(event_date_str, prompt_text, output_dir, filename):
    """
    使用 Grok API 根據提示生成圖片並儲存。
    會應用定義好的 IMAGE_STYLE_DESCRIPTOR。

    Args:
        event_date_str (str): 原始日期字串，用於日誌記錄。
        prompt_text (str): 作為圖片生成提示的描述文字。
        output_dir (str): 儲存圖片的目錄。
        filename (str): 清理過的圖片檔名。

    Returns:
        bool: 圖片生成或跳過是否成功。
    """
    print(f"--- Generating image for: {event_date_str} ---")

    # --- 組合 Prompt 和風格描述 ---
    # 將事件描述和風格描述結合起來作為最終的 Prompt
    final_prompt = f"{prompt_text}, {IMAGE_STYLE_DESCRIPTOR}"
    print(f"Style: {IMAGE_STYLE_DESCRIPTOR}")
    print(f"Combined Prompt: {final_prompt}")
    # --- ---

    filepath = os.path.join(output_dir, filename)

    # 如果圖片已存在，則跳過生成
    if os.path.exists(filepath):
        print(f"Image {filepath} already exists. Skipping generation.")
        return True # 表示成功 (或跳過)

    payload = {
        "model": "grok-2-image",
        # --- 使用組合後的 Prompt ---
        "prompt": final_prompt,
        # --- ---
        "n": 1,
        "response_format": "url"
    }

    try:
        response = requests.post(IMAGE_GENERATION_ENDPOINT, headers=headers, json=payload, timeout=180) # 增加超時時間
        response.raise_for_status() # 檢查 HTTP 錯誤
        data = response.json()

        # 檢查 API 回應結構是否符合預期
        if not data.get("data") or not isinstance(data["data"], list) or len(data["data"]) == 0:
             print(f"Error: Unexpected API response structure for event {event_date_str}.")
             print(f"API Response: {data}")
             return False

        image_info = data["data"][0]
        image_url = image_info.get("url")
        revised_prompt = image_info.get("revised_prompt", "N/A") # 獲取 API 修訂後的提示

        if not image_url:
            print(f"Error: No image URL returned in the response for event {event_date_str}.")
            print(f"API Response: {data}")
            return False

        print(f"Revised Prompt by API: {revised_prompt}") # 觀察 API 如何修改你的 Prompt
        print(f"Image URL received: {image_url}")

        # 下載圖片
        image_response = requests.get(image_url, timeout=60)
        image_response.raise_for_status()

        # 儲存圖片
        with open(filepath, "wb") as f:
            f.write(image_response.content)
        print(f"Image successfully saved: {filepath}")
        return True # 表示成功

    except requests.exceptions.Timeout:
        print(f"Error: Request timed out for event {event_date_str}.")
    except requests.exceptions.HTTPError as http_err:
        print(f"Error: HTTP error occurred for event {event_date_str}: {http_err}")
        try:
            # 嘗試印出 API 回應的錯誤訊息
            print(f"API Response Body: {response.text}")
        except Exception: pass
    except requests.exceptions.RequestException as req_err:
        print(f"Error: Request exception occurred for event {event_date_str}: {req_err}")
    except Exception as e:
        print(f"Error: An unexpected error occurred during image generation/saving for event {event_date_str}: {e}")
    finally:
        # 印出分隔線
        print("-" * (len(f"--- Generating image for: {event_date_str} ---") + 4))

    return False # 表示失敗

# --- 主執行區塊 ---
if __name__ == "__main__":
    print("Starting event processing workflow...")
    print(f"Reading data from: {CSV_FILENAME}")
    print(f"Image output directory: {IMAGE_OUTPUT_DIR}")
    print(f"JSON output file: {JSON_OUTPUT_FILENAME}")
    print(f"Applying image style: {IMAGE_STYLE_DESCRIPTOR}")

    # 如果圖片輸出目錄不存在，則創建它
    os.makedirs(IMAGE_OUTPUT_DIR, exist_ok=True)

    timeline_events_data = [] # 儲存所有事件資料的列表
    processed_count = 0       # 已處理的事件計數
    image_generation_success_count = 0 # 圖片生成成功計數
    image_generation_failed = []       # 圖片生成失敗的事件列表

    try:
        # 讀取 CSV 檔案
        with open(CSV_FILENAME, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            # 檢查 CSV 標頭是否包含必要的欄位
            if not all(field in reader.fieldnames for field in ['Year', 'Icon', 'Description']):
                raise ValueError("CSV file must contain 'Year', 'Icon', and 'Description' columns.")

            # 逐行處理 CSV 資料
            for row in reader:
                processed_count += 1
                year = row['Year'].strip()
                icon = row['Icon'].strip()
                description = row['Description'].strip() # 保留原始描述中的 HTML 標籤 (如 <i>)

                print(f"\nProcessing event {processed_count}: {year} - {description[:50]}...")

                # 1. 生成圖片檔名和相對路徑
                image_filename = sanitize_filename(year)
                # 在 JSON 中儲存相對路徑，確保網頁能正確引用
                image_path = os.path.join(IMAGE_OUTPUT_DIR, image_filename).replace("\\", "/") # 使用正斜線

                # 2. 生成圖片的替代文字 (Alt Text)
                alt_text = f"{year} 事件示意圖, {IMAGE_STYLE_DESCRIPTOR}" # Alt text 也可加入風格描述

                # 3. 準備視覺化區塊的 HTML 內容
                # 從完整描述中提取簡短片段用於 HTML 模板
                description_snippet = description.split('。')[0][:30] + ('...' if len(description) > 30 else '')
                # 移除片段中的 HTML 標籤，避免在 span 中顯示標籤本身
                description_snippet = re.sub('<[^>]*>', '', description_snippet)
                # 將片段填入 HTML 模板
                html_content = [line.replace('{descriptionSnippet}', description_snippet) for line in VISUALIZATION_HTML_TEMPLATE]

                # 4. 建立該事件的資料結構，準備寫入 JSON
                event_data = {
                    "year": year,
                    "icon": icon,
                    "description": description, # JSON 中儲存包含 HTML 的完整描述
                    "visualization": {
                        "image": image_path,    # 圖片的相對路徑
                        "altText": alt_text,    # 圖片的替代文字
                        "htmlContent": html_content # HTML 模板陣列
                    }
                }
                timeline_events_data.append(event_data)

                # 5. 調用函數生成圖片
                # 將原始描述傳遞給 generate_image 作為 prompt 基礎
                if generate_image(year, description, IMAGE_OUTPUT_DIR, image_filename):
                     image_generation_success_count += 1
                else:
                     image_generation_failed.append(year)

    except FileNotFoundError:
        print(f"錯誤：找不到 CSV 檔案 '{CSV_FILENAME}'。")
        exit(1)
    except ValueError as ve:
        print(f"讀取 CSV 時發生錯誤: {ve}")
        exit(1)
    except Exception as e:
        print(f"處理 CSV 時發生未預期的錯誤: {e}")
        exit(1)

    # --- 生成 JSON 檔案 ---
    print(f"\n已處理 {processed_count} 個事件。")
    print(f"成功生成/找到 {image_generation_success_count} 張圖片。")
    if image_generation_failed:
        print(f"以下事件的圖片生成失敗: {', '.join(image_generation_failed)}")

    # 組合最終的 JSON 資料結構
    page_data = {
        "pageTitle": PAGE_TITLE,
        "mainHeading": MAIN_HEADING,
        "timelineEvents": timeline_events_data
    }

    try:
        # 將資料寫入 JSON 檔案
        with open(JSON_OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
            # 使用 indent=2 讓 JSON 檔案格式化，更易讀
            # ensure_ascii=False 確保中文字符能正確寫入
            json.dump(page_data, f, ensure_ascii=False, indent=2)
        print(f"\n成功生成 JSON 資料檔案: {JSON_OUTPUT_FILENAME}")
    except Exception as e:
        print(f"寫入 JSON 檔案時發生錯誤: {e}")

    print("\n工作流程執行完畢！")

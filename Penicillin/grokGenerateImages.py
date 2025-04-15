import requests
import os
import re

# Your xAI Grok API key
# WARNING: Avoid hardcoding API keys in scripts. Use environment variables.
# API_KEY = os.getenv("XAI_API_KEY") # Recommended way
API_KEY = "API_KEY_HERE" # Replace with your actual API key if not using env vars

if not API_KEY:
    raise ValueError("API key not found. Set the XAI_API_KEY environment variable.")

# Base URL for the Grok API
API_BASE_URL = "https://api.x.ai/v1"
# Correct image generation endpoint
IMAGE_GENERATION_ENDPOINT = f"{API_BASE_URL}/images/generations"

# List of events (your original Chinese descriptions)
events = [
    "1928.09 🧪 亞歷山大·弗萊明在倫敦聖瑪麗醫院實驗室工作時，發現一個忘記蓋蓋子的培養皿上長出了青黴菌（Penicillium notatum），周圍的葡萄球菌被溶解。他命名其產物為「青黴素（Penicillin）」。這是一個偶然但革命性的發現。",
    "1929 📝 弗萊明發表論文，描述青黴素具有抗菌能力，但因為當時無法純化、不穩定且難以保存，這一發現未引起太多關注。",
    "1939 ⚗️ 牛津大學的霍華德·弗洛里與恩斯特·錢恩開始重新研究青黴素，並成功提取、穩定與測試其抗菌效果。",
    "1940 🧬 青黴素首次在老鼠身上成功試驗。當年也進行了第一例人類臨床實驗，效果良好，但藥量嚴重不足。",
    "1940.06 ⚠️ 倫敦遭德軍空襲。為保研究安全，研究團隊將青黴菌塗在衣服內裡偷偷運往美國。",
    "1941.03 🤝 美國通過《租借法案》，開始援助英國，包括科研合作，標誌著美國雖未參戰，但積極支持反法西斯陣營。",
    "1941（中） 🍈 在美國伊利諾伊州皮奧里亞，研究員瑪麗·亨特在市場找到一顆發霉的哈密瓜，發現一種高產青黴素的Penicillium chrysogenum菌株，遠勝於弗萊明原菌。",
    "1941.12.07 💥 珍珠港事件後，美國正式加入二戰。此後青黴素成為美軍重點醫療技術之一。",
    "1942 ⚡ 美國透過紫外線與 X 射線誘變，讓哈密瓜菌株突變，大幅提升青黴素產量。",
    "1943 🏭 美國開始工業化大規模生產青黴素，輝瑞等公司採用深層發酵法，大量供應軍隊使用。",
    "1944.06.06 ⚔️ 諾曼第登陸：青黴素被列為優先配給前線部隊的戰略藥品，大量用於治療槍傷、感染與梅毒。", # Note the full date
    "1945.05–08 🕊️ 德國與日本相繼投降，二戰結束。青黴素成功拯救無數傷患，名聲大噪。",
    "1945（末） 🏅 弗萊明、弗洛里與錢恩獲得諾貝爾生理醫學獎，表彰他們對青黴素發現與應用的歷史性貢獻。"
]

# Headers for the API request
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Directory to save images
output_dir = "images"
os.makedirs(output_dir, exist_ok=True)

# Regex to extract date and description
# Group 1: Date/Year part (updated to capture full date like YYYY.MM.DD)
# Group 2: The actual description text after the date and optional emoji/symbol
event_pattern = re.compile(r"(\d{4}(?:\.\d{2}(?:\.\d{2})?)?(?:–\d{2})?(?:（[^)]+）)?)\s*[^\w\s]*\s*(.*)")

# Function to generate and save an image
def generate_image(event_date_str, prompt_text):
    """
    Generates an image using the Grok API based on the prompt and saves it.

    Args:
        event_date_str (str): The string representing the date/year (used for filename).
        prompt_text (str): The description text to use as the image generation prompt.
    """
    print(f"--- Generating image for: {event_date_str} ---")
    # Use the raw description as the prompt, API will revise it
    print(f"Prompt: {prompt_text}")

    # Prepare the payload - REMOVED 'size' parameter
    payload = {
        "model": "grok-2-image", # Correct model for image generation
        "prompt": prompt_text,   # Use raw description
        # "size": "1024x768", # REMOVED: Not supported by xAI API
        "n": 1,                  # Number of images to generate (default 1)
        "response_format": "url" # Explicitly request URL (default)
    }

    try:
        # Send request to the specific image generation API endpoint
        response = requests.post(IMAGE_GENERATION_ENDPOINT, headers=headers, json=payload, timeout=180) # Increased timeout slightly
        response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
        data = response.json()

        # Check if the expected data structure and URL are present
        # API returns list in 'data', each item has 'url' or 'b64_json'
        if not data.get("data") or not isinstance(data["data"], list) or len(data["data"]) == 0:
             print(f"Error: Unexpected API response structure for event {event_date_str}.")
             print(f"API Response: {data}")
             return

        image_info = data["data"][0]
        image_url = image_info.get("url")
        revised_prompt = image_info.get("revised_prompt", "N/A") # Get revised prompt if available

        if not image_url:
            print(f"Error: No image URL returned in the response for event {event_date_str}.")
            print(f"API Response: {data}")
            return

        print(f"Revised Prompt by API: {revised_prompt}")
        print(f"Image URL received: {image_url}")

        # Download the image
        image_response = requests.get(image_url, timeout=60)
        image_response.raise_for_status()

        # Format filename (replace potentially invalid characters)
        # Use the original event_date_str for consistency
        safe_date_str = re.sub(r'[\\/*?:"<>|]', '_', event_date_str) # Remove more invalid chars
        # Replace . and other specific chars AFTER general sanitization
        filename = f"{safe_date_str.replace('.', '_').replace('–', '_').replace('（', '_').replace('）', '')}.jpg"
        filepath = os.path.join(output_dir, filename)

        # Save the image
        with open(filepath, "wb") as f:
            f.write(image_response.content)
        print(f"Image successfully saved: {filepath}")

    except requests.exceptions.Timeout:
        print(f"Error: Request timed out for event {event_date_str}.")
    except requests.exceptions.HTTPError as http_err:
        print(f"Error: HTTP error occurred for event {event_date_str}: {http_err}")
        # Try to print the response body if available, might contain API error details
        try:
            print(f"API Response Body: {response.text}")
        except Exception:
            pass # Ignore if response object doesn't exist or has no text
    except requests.exceptions.RequestException as req_err:
        print(f"Error: Request exception occurred for event {event_date_str}: {req_err}")
    except Exception as e:
        print(f"Error: An unexpected error occurred during image generation/saving for event {event_date_str}: {e}")
    finally:
        print("-" * (len(f"--- Generating image for: {event_date_str} ---") + 4)) # Adjusted separator length


# --- Main Execution ---
print(f"Starting image generation. Saving images to: {output_dir}")

for i, event_string in enumerate(events):
    print(f"\nProcessing event {i+1}/{len(events)}: {event_string[:60]}...") # Print progress

    match = event_pattern.match(event_string)
    if match:
        event_date = match.group(1).strip()
        description = match.group(2).strip()
        # Call generate_image with the extracted parts
        generate_image(event_date, description)
    else:
        # Fallback if regex doesn't match - use the whole string as prompt, 'unknown' as date
        print(f"Warning: Could not parse date/description structure for event: '{event_string}'. Using full string as prompt and 'unknown_{i+1}' as date.")
        generate_image(f"unknown_{i+1}", event_string.strip())


print("\nImage generation process complete!")

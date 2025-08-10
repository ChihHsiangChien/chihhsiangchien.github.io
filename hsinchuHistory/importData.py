#%%
import pandas as pd
import json


# Google Sheet CSV 匯出網址
url = "https://docs.google.com/spreadsheets/d/1l1JQiqgLSbSyjhP6k87KpN0Uy0bUMpXklOne5N2Gzi4/export?format=csv&gid=0"

#%%
# 讀取試算表
df = pd.read_csv(url)

# 篩選「要放」欄為全形 V（strip() 去掉空白）
filtered = df[df['要放'].astype(str).str.strip() == 'Ｖ']


# -------------------------
# 建立 locations（地點不重複）
# -------------------------
locations_dict = {}
for _, row in filtered.iterrows():
    location_name = str(row['地點']).strip()
    coords_str = str(row['經緯度']).strip()
    region = str(row['區域']).strip()

    # 跳過空地點或空座標
    if location_name and coords_str and coords_str.lower() != 'nan':
        lat, lon = map(float, coords_str.split(','))
        if location_name not in locations_dict:
            locations_dict[location_name] = {
                "location_id": location_name,
                "name": location_name,
                "center": [lat, lon],
                "region": region,
                "radius": 50  # 預設值，你可以改

            }

locations = list(locations_dict.values())

# -------------------------
# 建立 events
# -------------------------
events = []
for _, row in filtered.iterrows():
    title = str(row['事件']).strip()
    location_name = str(row['地點']).strip()
    year = str(row['年代']).strip()

    # start_time = 年代 + "-01-01T00:00:00Z"
    start_time = f"{year}-01-01T00:00:00Z" if year.lower() != 'nan' else None

    # description = 說明
    description = str(row['說明']).strip()

    # region = 區域
    region = str(row['區域']).strip()


    # Links
    links = []
    for i in range(1, 4):
        link_url = str(row.get(f'連結{i}', '')).strip()
        if link_url and link_url.lower() != 'nan':
            links.append({
                "name": f"連結{i}",
                "url": link_url
            })

    event_data = {
        "event_id": title,
        "title": title,
        "location_id": location_name,
        "event_type": "single",  # 預設為 single
        "start_time": start_time,
        "description": description,
        "region": region
    }
    if links:
        event_data["links"] = links

    events.append(event_data)

# -------------------------
# 合併成最終 JSON
# -------------------------
final_data = {
    "locations": locations,
    "events": events
}

# 儲存成檔案
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(final_data, f, ensure_ascii=False, indent=4)

print(json.dumps(final_data, ensure_ascii=False, indent=4))
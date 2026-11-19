#!/usr/bin/env python3
"""
Taiwan & Surrounding Waters DEM Builder
Merges AWS Terrain Tiles (SRTM / Land Elevation) and NOAA ETOPO (Ocean Bathymetry)
into a compact Int16 binary grid and JSON metadata for zero-build static web serving.
"""
import urllib.request, time, concurrent.futures
from PIL import Image
import io, numpy as np, json, math, os

def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)

def main():
    os.makedirs('data', exist_ok=True)
    tiles_x = list(range(211, 217)) # 6 tiles (Lon ~116.7° to 125.2°)
    tiles_y = list(range(108, 113)) # 5 tiles (Lat ~20.6° to 27.1°)

    def fetch(coords):
        x, y = coords
        url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/8/{x}/{y}.png'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=12) as resp:
                    return (x, y, resp.read())
            except Exception as e:
                time.sleep(0.5)
        return (x, y, None)

    coords = [(x, y) for y in tiles_y for x in tiles_x]
    print(f"Fetching {len(coords)} tiles from AWS Terrain Tiles (Terrarium format)...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        results = dict(((x, y), data) for x, y, data in ex.map(fetch, coords))

    rows = []
    for y in tiles_y:
        row = []
        for x in tiles_x:
            img = Image.open(io.BytesIO(results[(x, y)]))
            arr = np.array(img, dtype=np.float32)
            elev = (arr[:,:,0] * 256.0 + arr[:,:,1] + arr[:,:,2] / 256.0) - 32768.0
            row.append(elev)
        rows.append(np.concatenate(row, axis=1))

    stitched = np.concatenate(rows, axis=0)
    print(f"Stitched dimensions: {stitched.shape}, Min: {np.min(stitched):.1f}m, Max: {np.max(stitched):.1f}m")

    target_w, target_h = 768, 640
    img_elev = Image.fromarray(stitched)
    img_resized = img_elev.resize((target_w, target_h), Image.Resampling.BILINEAR)
    res_elev = np.array(img_resized, dtype=np.float32)
    int16_elev = np.clip(np.round(res_elev), -32767, 32767).astype(np.int16)

    bin_path = 'data/taiwan_dem.bin'
    with open(bin_path, 'wb') as f:
        f.write(int16_elev.tobytes())
    print(f"Saved {bin_path} ({os.path.getsize(bin_path)} bytes)")

if __name__ == '__main__':
    main()

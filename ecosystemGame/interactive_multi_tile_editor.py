import os
from PIL import Image
import matplotlib.pyplot as plt
from matplotlib.widgets import Button, TextBox
from matplotlib.patches import Rectangle
import numpy as np
import sys # Added for sys.exit

# === 設定 ===
image_folder = "tileset3"  # ← 替換成你圖片所在資料夾
output_folder = os.path.join(image_folder, "output")  # Output directory for saved tiles
target_tile_size = (32, 32)
tiles_per_row = 8

# Create output directory if it doesn't exist
if not os.path.exists(image_folder):
    print(f"Error: Image folder '{image_folder}' does not exist!")
    sys.exit(1)
os.makedirs(output_folder, exist_ok=True)

# === 初始參數 ===
params = {
    "origin_x": 0,
    "origin_y": 0,
    "tile_w": 40,
    "tile_h": 40,
    "offset_x": 0,
    "offset_y": 0,
}
slider_config = {
    "origin_x": [0, 300, 1],
    "origin_y": [0, 300, 1],
    "tile_w": [16, 128, 1],
    "tile_h": [16, 128, 1],
    "offset_x": [0, 20, 1],
    "offset_y": [0, 20, 1],
}

# === 載入所有圖片 ===
image_files = [f for f in os.listdir(image_folder) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
if not image_files:
    print(f"Error: No image files found in '{image_folder}'!")
    sys.exit(1)

image_paths = [os.path.join(image_folder, f) for f in image_files]
current_index = 0

# === UI State Variables ===
show_grid = True
ax_img_original_xlim = None
ax_img_original_ylim = None
current_ax_img_xlim = None
current_ax_img_ylim = None
current_img_size = None # To store the size of the currently loaded image

# === 操作圖像 ===
def crop_tiles(img):
    try:
        img_w, img_h = img.size
        tiles = []
        y = params["origin_y"]
        while y + params["tile_h"] <= img_h:
            x = params["origin_x"]
            while x + params["tile_w"] <= img_w:
                tile = img.crop((x, y, x + params["tile_w"], y + params["tile_h"]))
                tile = tile.resize(target_tile_size, Image.Resampling.NEAREST)
                tiles.append(tile)
                x += params["tile_w"] + params["offset_x"]
            y += params["tile_h"] + params["offset_y"]
        return tiles
    except Exception as e:
        print(f"Error processing image: {e}")
        return []

# 新增：僅為預覽獲取有限數量的瓦片，並進行處理
def get_preview_display_tiles(img, max_display_tiles=16):
    try:
        img_w, img_h = img.size
        preview_tiles = []
        count = 0
        y = params["origin_y"]
        while y + params["tile_h"] <= img_h:
            x = params["origin_x"]
            while x + params["tile_w"] <= img_w:
                if count >= max_display_tiles:
                    return preview_tiles # 已獲取足夠的預覽瓦片
                
                tile = img.crop((x, y, x + params["tile_w"], y + params["tile_h"]))
                tile = tile.resize(target_tile_size, Image.Resampling.NEAREST)
                preview_tiles.append(tile)
                count += 1
                x += params["tile_w"] + params["offset_x"]
            y += params["tile_h"] + params["offset_y"]
        return preview_tiles
    except Exception as e:
        print(f"Error generating preview display tiles: {e}")
        return []

def build_tileset_image(tiles):
    if not tiles:
        return Image.new("RGBA", target_tile_size)
    rows = (len(tiles) + tiles_per_row - 1) // tiles_per_row
    new_img = Image.new("RGBA", (tiles_per_row * target_tile_size[0], rows * target_tile_size[1]))
    for i, tile in enumerate(tiles):
        px = (i % tiles_per_row) * target_tile_size[0]
        py = (i // tiles_per_row) * target_tile_size[1]
        new_img.paste(tile, (px, py))
    return new_img

def draw_grid(ax, img_size):
    # 清除舊的網格
    # ax.patches directly refers to the list of patches. Iterate over a copy if modifying.
    for patch in list(ax.patches): # Iterate over a copy
        if isinstance(patch, Rectangle): # Only remove our grid rectangles
            patch.remove()
    
    if not show_grid: # Only draw if show_grid is True
        return
    w, h = img_size
    x = params["origin_x"]
    while x < w:
        y = params["origin_y"]
        while y < h:
            # 為每個 tile 繪製矩形框
            rect = Rectangle((x, y), params["tile_w"], params["tile_h"],
                           fill=False, color='red', linewidth=1)
            ax.add_patch(rect)
            y += params["tile_h"] + params["offset_y"]
        x += params["tile_w"] + params["offset_x"]

def refresh_preview():
    global ax_img_original_xlim, ax_img_original_ylim, current_ax_img_xlim, current_ax_img_ylim
    global current_img_size
    try:
        # 圖片預覽區域
        ax_img.clear()
        img = Image.open(image_paths[current_index]) # 載入當前圖片
        current_img_size = img.size # Store current image size
        ax_img.imshow(img)
        
        # Capture original extents if not already captured for this image view (or if image changed)
        ax_img.set_title(f"Original with grid: {image_files[current_index]}")
        ax_img.axis('on') # 確保原圖區域的座標軸是可見的 (如果需要)
        
        # --- Tiles 預覽區域 (顯示最多16個切割後的小瓦片) ---
        # 1. 移除 ax_tiles 之前可能包含的子 axes (由 inset_axes 創建)
        while ax_tiles.child_axes:
            ax_tiles.child_axes[0].remove()
        
        # 2. 清除 ax_tiles 本身的 artists (如之前的 imshow 或 text)
        ax_tiles.clear()
        
        # Handle zoom state for ax_img
        if ax_img_original_xlim is None or ax_img_original_ylim is None: # First load or image changed
            ax_img_original_xlim = ax_img.get_xlim()
            ax_img_original_ylim = ax_img.get_ylim()
            # Ensure current zoom is also reset to full view if it was from a previous image
            current_ax_img_xlim = ax_img_original_xlim 
            current_ax_img_ylim = ax_img_original_ylim

        ax_img.set_xlim(current_ax_img_xlim if current_ax_img_xlim else ax_img_original_xlim)
        ax_img.set_ylim(current_ax_img_ylim if current_ax_img_ylim else ax_img_original_ylim)

        # 修改此處：使用新的輕量級函數獲取預覽瓦片
        preview_display_tiles = get_preview_display_tiles(img, max_display_tiles=16)
        ax_tiles.set_title("16 Tiles Preview") # 設定右側區域的標題
        ax_tiles.axis('off') # 關閉 ax_tiles 自身的主座標軸和刻度 (因為我們要用 inset_axes)

        if preview_display_tiles:
            num_cols = 4
            num_rows = 4
            
            # 計算每個小瓦片 inset_axes 的相對大小和位置
            # 留一點點 padding
            padding_ratio = 0.02 
            base_w_ratio = (1.0 / num_cols)
            base_h_ratio = (1.0 / num_rows)
            draw_w_ratio = base_w_ratio * (1 - padding_ratio * 2)
            draw_h_ratio = base_h_ratio * (1 - padding_ratio * 2)

            # 直接迭代 preview_display_tiles，它已經被限制了數量
            for i, tile_img in enumerate(preview_display_tiles):
                r = i // num_cols  # 當前行 (0-indexed)
                c = i % num_cols   # 當前列 (0-indexed)
                
                # 計算 inset_axes 的 bounds: [x, y, width, height] (比例值)
                # y 軸是從下往上算的
                x_pos_ratio = c * base_w_ratio + (base_w_ratio * padding_ratio)
                y_pos_ratio = (num_rows - 1 - r) * base_h_ratio + (base_h_ratio * padding_ratio)
                
                ax_one_tile = ax_tiles.inset_axes([x_pos_ratio, y_pos_ratio, draw_w_ratio, draw_h_ratio])
                ax_one_tile.imshow(tile_img)
                ax_one_tile.axis('off')
        else:
            ax_tiles.text(0.5, 0.5, "No tiles extracted", ha='center', va='center', transform=ax_tiles.transAxes)
        
        # Draw grid last, after zoom is set, so it aligns with the image content
        if show_grid:
            draw_grid(ax_img, current_img_size)
        fig.canvas.draw_idle()
    except Exception as e:
        print(f"Error refreshing preview: {e}")

def save(event):
    try:
        img = Image.open(image_paths[current_index])
        tiles = crop_tiles(img) # 存檔時，我們需要處理所有瓦片
        result = build_tileset_image(tiles)
        filename = os.path.splitext(image_files[current_index])[0] + "_tileset.png"
        save_path = os.path.join(output_folder, filename)
        result.save(save_path)
        print(f"saved:{save_path}")
    except Exception as e:
        print(f"Error saving tileset: {e}")

def next_image(event):
    global current_index, ax_img_original_xlim, ax_img_original_ylim, current_ax_img_xlim, current_ax_img_ylim
    current_index = (current_index + 1) % len(image_paths)
    ax_img_original_xlim, ax_img_original_ylim = None, None # Reset for new image
    current_ax_img_xlim, current_ax_img_ylim = None, None   # Reset zoom for new image
    refresh_preview()

def prev_image(event):
    global current_index, ax_img_original_xlim, ax_img_original_ylim, current_ax_img_xlim, current_ax_img_ylim
    current_index = (current_index - 1) % len(image_paths)
    ax_img_original_xlim, ax_img_original_ylim = None, None # Reset for new image
    current_ax_img_xlim, current_ax_img_ylim = None, None   # Reset zoom for new image
    refresh_preview()


def on_key_press(event):
    if event.key == 'right':
        next_image(None)
    elif event.key == 'left':
        prev_image(None)
    elif event.key == 's':
        save(None)

def toggle_grid_visibility(event):
    global show_grid
    show_grid = not show_grid
    
    # Clear existing grid patches first
    for patch in list(ax_img.patches): # Iterate over a copy
         if isinstance(patch, Rectangle):
            patch.remove()
            
    if show_grid and current_img_size:
        draw_grid(ax_img, current_img_size) # Redraw if toggled on
    
    btn_toggle_grid.label.set_text(f"Grid: {'ON' if show_grid else 'OFF'}")
    fig.canvas.draw_idle()

def zoom_original_image(event, direction):
    global current_ax_img_xlim, current_ax_img_ylim, ax_img_original_xlim, ax_img_original_ylim

    if ax_img_original_xlim is None or ax_img_original_ylim is None:
        print("Original image extents not yet available for zoom.")
        return

    zoom_step = 1.2
    
    # Use current view for zoom base, or original if no zoom applied yet
    base_xlim = current_ax_img_xlim if current_ax_img_xlim else ax_img_original_xlim
    base_ylim = current_ax_img_ylim if current_ax_img_ylim else ax_img_original_ylim

    xc = (base_xlim[0] + base_xlim[1]) / 2
    yc = (base_ylim[0] + base_ylim[1]) / 2
    
    current_width = base_xlim[1] - base_xlim[0]
    current_height = base_ylim[0] - base_ylim[1] # Assuming inverted y: ylim[0] > ylim[1]

    if direction == "in":
        new_width = current_width / zoom_step
        new_height = current_height / zoom_step
    else: # "out"
        new_width = current_width * zoom_step
        new_height = current_height * zoom_step

        # Prevent zooming out beyond original image
        original_width = ax_img_original_xlim[1] - ax_img_original_xlim[0]
        original_height = ax_img_original_ylim[0] - ax_img_original_ylim[1]
        if new_width >= original_width or new_height >= original_height:
            current_ax_img_xlim = ax_img_original_xlim
            current_ax_img_ylim = ax_img_original_ylim
            ax_img.set_xlim(current_ax_img_xlim)
            ax_img.set_ylim(current_ax_img_ylim)
            if show_grid and current_img_size: # Redraw grid if visible
                draw_grid(ax_img, current_img_size)
            fig.canvas.draw_idle()
            return

    current_ax_img_xlim = [xc - new_width / 2, xc + new_width / 2]
    current_ax_img_ylim = [yc + new_height / 2, yc - new_height / 2] # Maintain y-axis inversion

    ax_img.set_xlim(current_ax_img_xlim)
    ax_img.set_ylim(current_ax_img_ylim)
    if show_grid and current_img_size: # Redraw grid if visible
        draw_grid(ax_img, current_img_size)
    fig.canvas.draw_idle()

# UI 控制元件
def create_param_controls():
    controls = {}
    base_y = 0.35
    for i, (name, (minv, maxv, step)) in enumerate(slider_config.items()):
        # 文字輸入框
        ax_text = plt.axes([0.25, base_y - i * 0.04, 0.2, 0.03])
        text_box = TextBox(ax_text, name, initial=str(params[name]))
        text_box.ax.set_facecolor('0.15')  # 設定 TextBox 背景色
        text_box.label.set_color('cyan')    # 設定 TextBox 標籤文字顏色 (e.g., "origin_x")
        text_box.text_disp.set_color('yellow') # 設定 TextBox 輸入文字顏色

        
        # 增加/減少按鈕
        ax_minus = plt.axes([0.46, base_y - i * 0.04, 0.05, 0.03])
        ax_plus = plt.axes([0.52, base_y - i * 0.04, 0.05, 0.03])
        btn_minus = Button(ax_minus, '-')
        btn_plus = Button(ax_plus, '+')
        btn_minus.color = '0.2'  # 設定背景色
        btn_minus.hovercolor = '0.3' # 設定滑鼠懸停背景色
        btn_minus.label.set_color('white') # 設定文字顏色
        btn_plus.color = '0.2'
        btn_plus.hovercolor = '0.3'
        btn_plus.label.set_color('white')
        
        def make_update_func(param_name, is_plus):
            def update(event):
                try:
                    current = int(controls[param_name]["text"].text)
                    step = slider_config[param_name][2]
                    new_val = current + step if is_plus else current - step
                    if slider_config[param_name][0] <= new_val <= slider_config[param_name][1]:
                        controls[param_name]["text"].set_val(str(new_val))
                        params[param_name] = new_val
                        refresh_preview()
                except ValueError:
                    print(f"Invalid value for {param_name}")
            return update

        def make_text_update(param_name):
            def update(text):
                try:
                    val = int(text)
                    if slider_config[param_name][0] <= val <= slider_config[param_name][1]:
                        params[param_name] = val
                        refresh_preview()
                except ValueError:
                    print(f"Invalid value for {param_name}")
            return update

        btn_minus.on_clicked(make_update_func(name, False))
        btn_plus.on_clicked(make_update_func(name, True))
        text_box.on_submit(make_text_update(name))
        
        controls[name] = {
            "text": text_box,
            "plus": btn_plus,
            "minus": btn_minus
        }
    return controls

# === UI 介面 ===
plt.style.use('dark_background')

# 創建兩個子圖：原圖預覽和 tiles 預覽
fig = plt.figure(figsize=(15, 10))
ax_img = plt.subplot(121)  # 左側原圖
ax_tiles = plt.subplot(122)  # 右側 tiles
plt.subplots_adjust(left=0.05, right=0.95, bottom=0.40, top=0.95) # Adjusted bottom for more controls

# 創建控制元件
controls = create_param_controls()

# 按鈕：儲存、下一張、上一張
button_y_pos1 = 0.08 # For Save, Next, Prev
button_y_pos2 = 0.02 # For Grid, Zoom

save_ax = plt.axes([0.25, button_y_pos1, 0.15, 0.05])
next_ax = plt.axes([0.43, button_y_pos1, 0.15, 0.05])
prev_ax = plt.axes([0.61, button_y_pos1, 0.15, 0.05])

btn_save = Button(save_ax, 'Save Tileset (S)', color='0.25', hovercolor='0.35') # Darker green
btn_save.label.set_color('lightgreen')
btn_save.on_clicked(save)

btn_next = Button(next_ax, 'Next (->)', color='0.25', hovercolor='0.35') # Darker blue
btn_next.label.set_color('skyblue')
btn_next.on_clicked(next_image)

btn_prev = Button(prev_ax, 'Previous (<-)', color='0.25', hovercolor='0.35') # Darker blue
btn_prev.label.set_color('skyblue')
btn_prev.on_clicked(prev_image)

# Grid Toggle and Zoom Buttons
toggle_grid_ax = plt.axes([0.10, button_y_pos2, 0.12, 0.05])
btn_toggle_grid = Button(toggle_grid_ax, f"Grid: {'ON' if show_grid else 'OFF'}", color='0.25', hovercolor='0.35')
btn_toggle_grid.label.set_color('white')
btn_toggle_grid.on_clicked(toggle_grid_visibility)

zoom_in_ax = plt.axes([0.25, button_y_pos2, 0.1, 0.05])
btn_zoom_in = Button(zoom_in_ax, '+ Zoom', color='0.25', hovercolor='0.35')
btn_zoom_in.label.set_color('white')
btn_zoom_in.on_clicked(lambda event: zoom_original_image(event, "in"))

zoom_out_ax = plt.axes([0.38, button_y_pos2, 0.1, 0.05])
btn_zoom_out = Button(zoom_out_ax, '- Zoom', color='0.25', hovercolor='0.35')
btn_zoom_out.label.set_color('white')
btn_zoom_out.on_clicked(lambda event: zoom_original_image(event, "out"))

fig.canvas.mpl_connect('key_press_event', on_key_press) # Ensure key press is connected
refresh_preview()
plt.show()

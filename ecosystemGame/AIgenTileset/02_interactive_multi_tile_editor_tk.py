import os
import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk
from typing import List, Optional
import sys

class Config:
    """Configuration settings for the Tile Editor."""
    IMAGE_FOLDER_DEFAULT: str = "generated_tilesets"
    OUTPUT_FOLDER_NAME: str = "generated_tilesets_output"  # Name of the subfolder for output
    TARGET_TILE_SIZE: tuple[int, int] = (48, 48)
    ALLOWED_EXTENSIONS: tuple[str, ...] = (".png", ".jpg", ".jpeg")

    # Initial parameters for tile cutting
    INITIAL_PARAMS: dict[str, int] = {
        "origin_x": 0,
        "origin_y": 0,
        "tile_w": 40,
        "tile_h": 40,
        "offset_x": 0,
        "offset_y": 0,
    }

    # Preview settings
    PREVIEW_TILE_DISPLAY_SIZE: int = 50
    PREVIEW_GRID_COLS: int = 4
    PREVIEW_GRID_ROWS: int = 4
    PREVIEW_TILE_LIMIT: int = PREVIEW_GRID_COLS * PREVIEW_GRID_ROWS # Max tiles in preview

    # UI and Interaction
    ZOOM_MIN: float = 0.1
    ZOOM_MAX: float = 5.0
    ZOOM_STEP_MULTIPLIER: float = 0.9 # For zooming out, 1/0.9 for zooming in


class TileEditor:
    def __init__(self, image_folder: str = Config.IMAGE_FOLDER_DEFAULT):
        self.image_folder = image_folder
        self.output_folder = os.path.join(self.image_folder, Config.OUTPUT_FOLDER_NAME)
        self.target_tile_size = Config.TARGET_TILE_SIZE

        # Create output directory if needed
        if not os.path.exists(self.image_folder):
            print(f"Error: Image folder '{self.image_folder}' does not exist!")
            sys.exit(1)
        os.makedirs(self.output_folder, exist_ok=True)

        self.params = Config.INITIAL_PARAMS.copy()

        # Load all image files
        self.image_files = [f for f in os.listdir(self.image_folder)
                           if f.lower().endswith(Config.ALLOWED_EXTENSIONS)]
        if not self.image_files:
            print(f"Error: No image files found in '{self.image_folder}'!")
            sys.exit(1)

        self.image_paths = [os.path.join(self.image_folder, f) for f in self.image_files]
        self.current_index = 0
        
        # Initialize main window
        self.root = tk.Tk()
        self.root.title("Tile Editor")
        self.save_filename_var = tk.StringVar() # Moved here
        self.setup_ui()
        
        # Pan and zoom variables
        self.pan_start_x = 0
        self.pan_start_y = 0
        self.zoom_factor = 1.0
        self.image_offset_x = 0 
        self.image_offset_y = 0

        # Add grid visibility toggle
        self.show_grid = True

        # Load first image
        self.load_current_image()

    def setup_ui(self):
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(expand=True, fill='both', padx=10, pady=10)

        # Left panel - Controls
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(side='left', fill='y', padx=(0, 10))        # Parameter controls

        # Frame to hold the two columns of parameters
        params_columns_frame = ttk.Frame(control_frame)
        params_columns_frame.pack(fill='x', pady=5, anchor='n')

        param_col1_frame = ttk.Frame(params_columns_frame)
        param_col1_frame.pack(side='left', padx=(0, 5), anchor='n') # anchor to top

        param_col2_frame = ttk.Frame(params_columns_frame)
        param_col2_frame.pack(side='left', padx=(5, 0), anchor='n') # anchor to top

        self.param_vars = {}

        params_col1_names = ["origin_x", "tile_w", "offset_x"]
        params_col2_names = ["origin_y", "tile_h", "offset_y"]

        def create_param_control(parent_frame, name):
            # Row frame for one parameter (Label, Entry, Buttons)
            param_row_frame = ttk.Frame(parent_frame)
            param_row_frame.pack(fill='x', pady=2, anchor='n')

            # Label for the parameter (e.g., "origin_x:")
            ttk.Label(param_row_frame, text=f"{name}:", width=10, anchor='w').pack(side='left', padx=(0, 2))
            
            var = tk.StringVar(value=str(self.params[name]))
            self.param_vars[name] = var

            # Entry for the parameter value
            entry = ttk.Entry(param_row_frame, textvariable=var, width=6)
            entry.pack(side='left', padx=(0, 5))
            
            # Frame for Up/Down buttons
            btn_frame = ttk.Frame(param_row_frame)
            btn_frame.pack(side='left')
            ttk.Button(btn_frame, text="▲", width=2, command=lambda n=name: self.adjust_param(n, 1)).pack(side='top', pady=(0,1))
            ttk.Button(btn_frame, text="▼", width=2, command=lambda n=name: self.adjust_param(n, -1)).pack(side='bottom')
            
            var.trace_add('write', lambda *args, n=name, v=var: self.update_param(n, v))

        for name in params_col1_names:
            if name in self.params:
                create_param_control(param_col1_frame, name)
        for name in params_col2_names:
            if name in self.params:
                create_param_control(param_col2_frame, name)

        # Navigation buttons
        nav_frame = ttk.Frame(control_frame)
        nav_frame.pack(fill='x', pady=10)
        ttk.Button(nav_frame, text="Previous", command=self.prev_image).pack(side='left', padx=5)
        ttk.Button(nav_frame, text="Next", command=self.next_image).pack(side='left', padx=5)
        # Removed Save button from here, will be added to its own frame
        ttk.Button(nav_frame, text="Toggle Grid", 
                  command=self.toggle_grid).pack(side='left', padx=5)

        # Save options frame
        save_options_frame = ttk.Frame(control_frame)
        save_options_frame.pack(fill='x', pady=10, side='bottom') # Place at the bottom of control_frame

        ttk.Label(save_options_frame, text="Filename:").pack(side='left', padx=(0, 5))
        save_filename_entry = ttk.Entry(save_options_frame, textvariable=self.save_filename_var, width=30)
        save_filename_entry.pack(side='left', expand=True, fill='x', padx=(0,5))

        ttk.Button(save_options_frame, text="Save Tileset", command=self.save_tileset).pack(side='left')

        # Right panel - Image viewers
        viewer_frame = ttk.Frame(main_frame)
        viewer_frame.pack(side='left', expand=True, fill='both')

        # Original image canvas
        self.main_canvas = tk.Canvas(viewer_frame, background='gray90')
        self.main_canvas.pack(side='left', expand=True, fill='both')

        # Preview canvas
        self.preview_canvas = tk.Canvas(viewer_frame, width=200, background='gray90')
        self.preview_canvas.pack(side='left', fill='y')

        # Bind mouse events for pan and zoom
        self.main_canvas.bind("<ButtonPress-1>", self.start_pan)
        self.main_canvas.bind("<B1-Motion>", self.pan)
        self.main_canvas.bind("<ButtonRelease-1>", self.stop_pan)
        self.main_canvas.bind("<MouseWheel>", self.zoom)  # Windows
        self.main_canvas.bind("<Button-4>", self.zoom)    # Linux scroll up
        self.main_canvas.bind("<Button-5>", self.zoom)    # Linux scroll down

    def update_param(self, name: str, var: tk.StringVar):
        try:
            value = int(var.get())
            self.params[name] = value
            self.refresh_display()
        except ValueError:
            pass

    def adjust_param(self, name: str, delta: int):
        """Adjust a parameter value by the given delta"""
        try:
            current = int(self.param_vars[name].get())
            new_value = current + delta
            self.param_vars[name].set(str(new_value))
            self.params[name] = new_value
            self.refresh_display()
        except ValueError:
            pass

    def load_current_image(self):
        """Load and display the current image"""
        try:
            if not self.image_paths:
                return
            self.current_image = Image.open(self.image_paths[self.current_index])
            self._update_default_save_filename()
            self.refresh_display()
        except Exception as e:
            print(f"Error loading image: {e}")

    def _update_default_save_filename(self):
        default_filename = os.path.splitext(self.image_files[self.current_index])[0] + "_tileset.png"
        self.save_filename_var.set(default_filename)

    def refresh_display(self):
        """Update both the main image and preview display"""
        if not hasattr(self, 'current_image'):
            return

        # Prepare zoom-adjusted image for main display
        display_image = self.current_image.copy()
        
        # Apply zoom
        new_size = (int(display_image.width * self.zoom_factor), 
                   int(display_image.height * self.zoom_factor))
        display_image = display_image.resize(new_size)

        # Convert to PhotoImage and store reference
        self.display_photo = ImageTk.PhotoImage(display_image)
        
        # Update main canvas
        self.main_canvas.delete("all")
        self.main_canvas.create_image(
            self.image_offset_x, self.image_offset_y,
            image=self.display_photo, anchor='nw')
        
        # Draw grid on main display if enabled
        if self.show_grid: # Grid is now always drawn if toggled on, regardless of zoom level
            self.draw_grid()

        # Draw capture area box
        self.draw_capture_area()

        # Update preview
        self.update_preview()

    def draw_grid(self):
        """Draw the tile cutting grid on the main canvas"""
        x = self.params["origin_x"] * self.zoom_factor + self.image_offset_x
        y = self.params["origin_y"] * self.zoom_factor + self.image_offset_y
        w = self.params["tile_w"] * self.zoom_factor
        h = self.params["tile_h"] * self.zoom_factor
        off_x = self.params["offset_x"] * self.zoom_factor
        off_y = self.params["offset_y"] * self.zoom_factor

        while y < self.main_canvas.winfo_height():
            curr_x = x
            while curr_x < self.main_canvas.winfo_width():
                self.main_canvas.create_rectangle(
                    curr_x, y, curr_x + w, y + h,
                    outline='red', width=1)
                curr_x += w + off_x
            y += h + off_y

    def draw_capture_area(self):
        """Draw a box showing the area that will be captured for preview"""
        canvas_width = self.main_canvas.winfo_width()
        canvas_height = self.main_canvas.winfo_height()
        
        # Calculate center of view
        center_x = canvas_width / 2
        center_y = canvas_height / 2
        
        # Calculate size of capture area (4x4 tiles)
        capture_width = 4 * (self.params["tile_w"] + self.params["offset_x"]) * self.zoom_factor
        capture_height = 4 * (self.params["tile_h"] + self.params["offset_y"]) * self.zoom_factor
        
        # Draw rectangle centered on view
        self.main_canvas.create_rectangle(
            center_x - capture_width/2, center_y - capture_height/2,
            center_x + capture_width/2, center_y + capture_height/2,
            outline='blue', width=2, dash=(5, 5))

    def update_preview(self):
        """Generate and display preview tiles"""
        preview_tiles = self.get_preview_tiles()
        if not preview_tiles:
            return

        # Clear preview canvas
        self.preview_canvas.delete("all")
        
        # Calculate tile placement
        tile_display_size = Config.PREVIEW_TILE_DISPLAY_SIZE
        margin = 2
        cols = Config.PREVIEW_GRID_COLS
        # rows = Config.PREVIEW_GRID_ROWS # Not strictly needed if using PREVIEW_TILE_LIMIT
        
        # Store PhotoImage references
        self.preview_photos = []
        
        for i, tile in enumerate(preview_tiles[:Config.PREVIEW_TILE_LIMIT]):
            # Resize tile for preview
            preview_tile = tile.resize((tile_display_size, tile_display_size))
            photo = ImageTk.PhotoImage(preview_tile)
            self.preview_photos.append(photo)
            
            # Calculate position
            row = i // cols
            col = i % cols
            x = col * (tile_display_size + margin)
            y = row * (tile_display_size + margin)
            
            # Display tile
            self.preview_canvas.create_image(x, y, image=photo, anchor='nw')

    def get_preview_tiles(self) -> List[Image.Image]:
        """Extract tiles from the center of the current view"""
        try:
            canvas_width = self.main_canvas.winfo_width()
            canvas_height = self.main_canvas.winfo_height()
            
            # Calculate center of view in image coordinates
            view_center_x = (canvas_width/2 - self.image_offset_x) / self.zoom_factor
            view_center_y = (canvas_height/2 - self.image_offset_y) / self.zoom_factor

            # Calculate starting point for Config.PREVIEW_GRID_COLS x Config.PREVIEW_GRID_ROWS grid centered on view
            half_preview_grid_width_tiles = Config.PREVIEW_GRID_COLS / 2
            half_preview_grid_height_tiles = Config.PREVIEW_GRID_ROWS / 2
            start_x = view_center_x - (half_preview_grid_width_tiles * (self.params["tile_w"] + self.params["offset_x"]))
            start_y = view_center_y - (half_preview_grid_height_tiles * (self.params["tile_h"] + self.params["offset_y"]))
            
            # Adjust to nearest tile boundary
            start_x = ((start_x - self.params["origin_x"]) // 
                      (self.params["tile_w"] + self.params["offset_x"]) * 
                      (self.params["tile_w"] + self.params["offset_x"]) + 
                      self.params["origin_x"])
            start_y = ((start_y - self.params["origin_y"]) // 
                      (self.params["tile_h"] + self.params["offset_y"]) * 
                      (self.params["tile_h"] + self.params["offset_y"]) + 
                      self.params["origin_y"])
            
            tiles = []
            img_w, img_h = self.current_image.size
            
            for row in range(Config.PREVIEW_GRID_ROWS):
                y = start_y + row * (self.params["tile_h"] + self.params["offset_y"])
                if y < 0 or y + self.params["tile_h"] > img_h:
                    continue
                    
                for col in range(Config.PREVIEW_GRID_COLS):
                    x = start_x + col * (self.params["tile_w"] + self.params["offset_x"])
                    if x < 0 or x + self.params["tile_w"] > img_w:
                        continue
                        
                    tile = self.current_image.crop(
                        (x, y, x + self.params["tile_w"], y + self.params["tile_h"]))
                    tile = tile.resize(self.target_tile_size, Image.Resampling.NEAREST)
                    tiles.append(tile)
            
            return tiles
        except Exception as e:
            print(f"Error generating preview tiles: {e}")
            return []

    def start_pan(self, event):
        """Record initial pan position"""
        self.pan_start_x = event.x - self.image_offset_x
        self.pan_start_y = event.y - self.image_offset_y
        
    def pan(self, event):
        """Update image position based on mouse drag"""
        self.image_offset_x = event.x - self.pan_start_x
        self.image_offset_y = event.y - self.pan_start_y
        self.refresh_display()
        
    def stop_pan(self, event):
        """Clean up after panning"""
        self.pan_start_x = None
        self.pan_start_y = None

    def zoom(self, event):
        """Handle zoom events from mouse wheel"""
        if event.num == 5 or event.delta < 0:  # Zoom out
            self.zoom_factor = max(Config.ZOOM_MIN, self.zoom_factor * Config.ZOOM_STEP_MULTIPLIER)
        else:  # Zoom in
            self.zoom_factor = min(Config.ZOOM_MAX, self.zoom_factor / Config.ZOOM_STEP_MULTIPLIER)
        
        self.refresh_display()

    def next_image(self):
        """Load next image in sequence"""
        self.current_index = (self.current_index + 1) % len(self.image_paths)
        self.zoom_factor = 1.0  # Reset zoom
        self.image_offset_x = 0  # Reset pan
        self.image_offset_y = 0
        self.load_current_image()

    def prev_image(self):
        """Load previous image in sequence"""
        self.current_index = (self.current_index - 1) % len(self.image_paths)
        self.zoom_factor = 1.0  # Reset zoom
        self.image_offset_x = 0  # Reset pan
        self.image_offset_y = 0
        self.load_current_image()

    def toggle_grid(self):
        """Toggle grid visibility"""
        self.show_grid = not self.show_grid
        self.refresh_display()

    def save_tileset(self):
        """Save the current tileset, preserving the relative positions of tiles from the source."""
        try:
            filename_to_save = self.save_filename_var.get()
            if not filename_to_save:
                messagebox.showerror("Error", "Filename cannot be empty.")
                return
            if not filename_to_save.lower().endswith(Config.ALLOWED_EXTENSIONS):
                filename_to_save += ".png"

            img_w, img_h = self.current_image.size
            orig_x = self.params["origin_x"]
            orig_y = self.params["origin_y"]
            tile_w_src = self.params["tile_w"]
            tile_h_src = self.params["tile_h"]
            offset_x_src = self.params["offset_x"]
            offset_y_src = self.params["offset_y"]
            
            target_w, target_h = self.target_tile_size

            if tile_w_src <= 0 or tile_h_src <= 0:
                messagebox.showerror("Error", "Tile width (tile_w) and Tile height (tile_h) must be positive.")
                return

            # Effective step size in the source image
            step_w_src = tile_w_src + offset_x_src
            step_h_src = tile_h_src + offset_y_src

            # --- Determine the number of rows and columns of tiles to extract ---
            extracted_rows_data = [] # To store lists of resized tiles per row
            
            current_y_scan = orig_y
            max_cols_in_any_row = 0

            while current_y_scan + tile_h_src <= img_h:
                current_row_tiles = []
                current_x_scan = orig_x
                while current_x_scan + tile_w_src <= img_w:
                    tile = self.current_image.crop((
                        current_x_scan, 
                        current_y_scan, 
                        current_x_scan + tile_w_src, 
                        current_y_scan + tile_h_src
                    ))
                    resized_tile = tile.resize(self.target_tile_size, Image.Resampling.NEAREST)
                    current_row_tiles.append(resized_tile)
                    
                    if step_w_src <= 0: # Avoid infinite loop if step is not positive
                        break 
                    current_x_scan += step_w_src
                
                if current_row_tiles:
                    extracted_rows_data.append(current_row_tiles)
                    if len(current_row_tiles) > max_cols_in_any_row:
                        max_cols_in_any_row = len(current_row_tiles)
                
                if step_h_src <= 0: # Avoid infinite loop if step is not positive
                    break
                current_y_scan += step_h_src

            if not extracted_rows_data or max_cols_in_any_row == 0:
                messagebox.showinfo("Info", "No tiles to save with current parameters.")
                return

            num_rows_extracted = len(extracted_rows_data)
            num_cols_to_render = max_cols_in_any_row

            output_image_width = num_cols_to_render * target_w
            output_image_height = num_rows_extracted * target_h
            result_image = Image.new("RGBA", (output_image_width, output_image_height))

            for r_idx, row_of_tiles in enumerate(extracted_rows_data):
                for c_idx, tile_image in enumerate(row_of_tiles):
                    paste_x = c_idx * target_w
                    paste_y = r_idx * target_h
                    result_image.paste(tile_image, (paste_x, paste_y))
            
            save_path = os.path.join(self.output_folder, filename_to_save)
            result_image.save(save_path)
            print(f"Saved: {save_path}")
            messagebox.showinfo("Success", f"Tileset saved to {save_path}")

        except Exception as e:
            import traceback
            print(f"Error saving tileset: {e}\n{traceback.format_exc()}")
            messagebox.showerror("Error", f"An error occurred while saving: {e}")

    def run(self):
        """Start the application"""
        self.root.mainloop()

if __name__ == "__main__":
    # You can specify a different image folder when creating the editor
    # For example: editor = TileEditor(image_folder="my_other_tilesets")
    # If no argument is provided, it uses Config.IMAGE_FOLDER_DEFAULT
    editor = TileEditor() 
    editor.run()

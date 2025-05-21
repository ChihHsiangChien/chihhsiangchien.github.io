import os
import io
from PIL import Image, UnidentifiedImageError
from rembg import remove # For background removal

# --- Configuration ---
INPUT_FOLDER = "sprites"  # Folder containing your original images
OUTPUT_FOLDER = "processed_sprites_transparent" # Folder to save processed images
TARGET_SIZES = {
    "landscape": (96, 48), # (width, height) for wide subjects
    "portrait": (48, 96),  # (width, height) for tall subjects
    "square": (48, 48),    # (width, height) for square-ish subjects
}
# This threshold determines how much wider/taller an image needs to be
# to be classified as landscape/portrait.
# e.g., if 1.3, an image 1.3 times wider than tall is "landscape".
# An image 1.3 times taller than wide is "portrait".
# Otherwise, it's "square".
ASPECT_RATIO_THRESHOLD = 1.3

def ensure_output_folder():
    """Creates the output folder if it doesn't exist."""
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
        print(f"📁 Created output folder: '{OUTPUT_FOLDER}'")

def process_single_image(image_path, output_path):
    """
    Processes a single image: removes background, resizes based on content, and saves.
    """
    try:
        print(f"Processing '{image_path}'...")
        with open(image_path, "rb") as img_file:
            input_bytes = img_file.read()

        # 1. Remove background using rembg
        # This returns bytes of the image with background removed (transparent PNG format)
        output_bytes_nobg = remove(input_bytes)

        # 2. Load the background-removed image with Pillow
        # Convert to RGBA to ensure it has an alpha channel for transparency
        processed_image = Image.open(io.BytesIO(output_bytes_nobg)).convert("RGBA")

        # 3. Get the bounding box of the non-transparent content
        # This helps to isolate the actual subject from surrounding transparency
        bbox = processed_image.getbbox()

        if bbox is None:
            print(f"⚠️ Warning: No content found in '{os.path.basename(image_path)}' after background removal. Skipping.")
            # Optionally, you could save an empty transparent image of a default size here
            # For example:
            # default_empty_size = TARGET_SIZES["square"]
            # empty_img = Image.new("RGBA", default_empty_size, (0, 0, 0, 0))
            # empty_img.save(output_path, format="PNG")
            # print(f"Saved empty image for '{os.path.basename(image_path)}' as it was blank after processing.")
            return

        # 4. Crop the image to the subject's bounding box
        subject_image = processed_image.crop(bbox)
        subject_width, subject_height = subject_image.size

        # Handle cases where the cropped subject might be empty (e.g., a 1-pixel line)
        if subject_width == 0 or subject_height == 0:
            print(f"⚠️ Warning: Subject dimensions are zero for '{os.path.basename(image_path)}' after crop. Skipping.")
            return

        # 5. Determine the target CANVAS size based on the subject's aspect ratio
        subject_aspect_ratio = subject_width / subject_height
        
        # Determine which target canvas aspect ratio to use (1:1, 2:1, or 1:2)
        chosen_canvas_type = "square" # Default
        if subject_aspect_ratio > ASPECT_RATIO_THRESHOLD: # Wider than tall
            chosen_canvas_type = "landscape"
        elif (1 / subject_aspect_ratio) > ASPECT_RATIO_THRESHOLD: # Taller than wide (aspect_ratio < 1/THRESHOLD)
            chosen_canvas_type = "portrait"
        
        target_canvas_dimensions = TARGET_SIZES[chosen_canvas_type]
        
        print(f"   Subject original size: {subject_width}x{subject_height}, Aspect Ratio: {subject_aspect_ratio:.2f}")
        print(f"   Chosen canvas type: {chosen_canvas_type}, Target canvas dimensions: {target_canvas_dimensions}")

        # 6. Resize the cropped subject image to fit within the target_canvas_dimensions, maintaining aspect ratio
        canvas_w, canvas_h = target_canvas_dimensions
        
        # Calculate scaling factor to fit subject into canvas while maintaining aspect ratio
        scale_factor = min(canvas_w / subject_width, canvas_h / subject_height)
        
        resized_subject_width = int(subject_width * scale_factor)
        resized_subject_height = int(subject_height * scale_factor)
        
        # Ensure at least 1x1 pixel for resized subject if original was not 0 and scaling made it 0
        if resized_subject_width == 0 and subject_width > 0: resized_subject_width = 1
        if resized_subject_height == 0 and subject_height > 0: resized_subject_height = 1

        # If either dimension became zero after scaling (and wasn't zero before), it's problematic.
        if (resized_subject_width == 0 or resized_subject_height == 0) and \
           not (subject_width == 0 or subject_height == 0) :
            print(f"⚠️ Warning: Resized subject dimensions became zero ({resized_subject_width}x{resized_subject_height}) for '{os.path.basename(image_path)}'. Skipping.")
            return

        resized_subject_image = subject_image.resize((resized_subject_width, resized_subject_height), Image.Resampling.LANCZOS)
        print(f"   Resized subject to: {resized_subject_width}x{resized_subject_height} (maintaining aspect ratio)")

        # 7. Create a new transparent canvas with the target_canvas_dimensions
        final_image = Image.new("RGBA", target_canvas_dimensions, (0, 0, 0, 0))

        # 8. Calculate position to paste the resized subject onto the center of the canvas
        paste_x = (canvas_w - resized_subject_width) // 2
        paste_y = (canvas_h - resized_subject_height) // 2
        
        # 9. Paste the resized subject onto the canvas (using its alpha channel as a mask)
        final_image.paste(resized_subject_image, (paste_x, paste_y), resized_subject_image)

        # 10. Save the final processed image as PNG
        final_image.save(output_path, format="PNG")
        print(f"✅ Processed and saved: '{output_path}' (Canvas: {target_canvas_dimensions}, Subject on canvas: {resized_subject_width}x{resized_subject_height})")

    except UnidentifiedImageError:
        print(f"❌ Error: Cannot identify image file '{os.path.basename(image_path)}'. Is it a valid image? Skipping.")
    except FileNotFoundError:
        print(f"❌ Error: Image file not found '{image_path}'. Skipping.")
    except Exception as e:
        print(f"❌ An unexpected error occurred while processing '{os.path.basename(image_path)}': {e}")

def main():
    """
    Main function to find images in the input folder and process them.
    """
    if not os.path.exists(INPUT_FOLDER):
        print(f"❌ Error: Input folder '{INPUT_FOLDER}' not found. Please create it and add your images.")
        return

    ensure_output_folder()

    image_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff')
    image_files = [f for f in os.listdir(INPUT_FOLDER)
                   if os.path.isfile(os.path.join(INPUT_FOLDER, f)) and f.lower().endswith(image_extensions)]

    if not image_files:
        print(f"ℹ️ No image files found in '{INPUT_FOLDER}'.")
        return

    print(f"Found {len(image_files)} images to process in '{INPUT_FOLDER}'.")

    for filename in image_files:
        image_path = os.path.join(INPUT_FOLDER, filename)
        
        # Create a new filename for the output, ensuring it's a .png
        output_filename = os.path.splitext(filename)[0] + ".png"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        process_single_image(image_path, output_path)

    print("\n✨ All images processed.")

if __name__ == "__main__":
    main()

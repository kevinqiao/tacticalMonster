import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow library is required for image slicing.")
    print("Please install it by running: pip install Pillow")
    sys.exit(1)

def slice_image(image_path, output_dir):
    if not os.path.exists(image_path):
        print(f"Error: Mockup image not found at {image_path}")
        return False
        
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        img = Image.open(image_path)
        print(f"Successfully loaded image. Size: {img.size}, Format: {img.format}")
        
        # We will dynamically adjust bounding boxes based on the actual resolution of the user's mockup.
        # Below is a default coordinate mapping assuming a standard 1024x1024 output.
        # [label, (left, top, right, bottom)]
        slices = {
            # Background Pattern (Tileable)
            "bg_checkerboard": (0, 0, 120, 120),
            
            # Hero / Title Banner elements
            "solitaire_header_title": (200, 120, 824, 250),
            "solitaire_fanning_cards": (400, 30, 624, 120),
            
            # Icons
            "icon_target": (120, 320, 200, 400),
            "icon_swords": (520, 320, 600, 400),
            
            # 3D Main CTA Buttons
            "btn_challenge_green": (100, 460, 424, 530),
            "btn_compete_pink": (500, 460, 824, 530),
            
            # Gold Shop Pill
            "btn_shop_gold": (700, 20, 850, 70),
            
            # History Parchment Board
            "bg_history_parchment": (80, 580, 844, 780)
        }
        
        width, height = img.size
        # Scaled mapping helper if image is not exactly 1024x1024
        scale_x = width / 1024.0
        scale_y = height / 1024.0
        
        print("\nSlicing progress:")
        for name, box in slices.items():
            scaled_box = (
                int(box[0] * scale_x),
                int(box[1] * scale_y),
                int(box[2] * scale_x),
                int(box[3] * scale_y)
            )
            
            # Crop and save slice
            cropped = img.crop(scaled_box)
            out_path = os.path.join(output_dir, f"{name}.png")
            cropped.save(out_path, "PNG")
            print(f"  - Extracted '{name}' -> {out_path} (Size: {cropped.size})")
            
        print("\nSlicing completed! All sliced assets are saved in the output directory.")
        return True
    except Exception as e:
        print(f"An error occurred during slicing: {e}")
        return False

if __name__ == "__main__":
    # Default target locations
    default_mockup = "public/assets/solitaire_main.png"
    default_out_dir = "src/component/lobby/portal/assets"
    
    mockup_path = sys.argv[1] if len(sys.argv) > 1 else default_mockup
    out_dir = sys.argv[2] if len(sys.argv) > 2 else default_out_dir
    
    print("=== Solitaire 3D Mockup Auto-Slicer (legacy) ===")
    print("Prefer: node scripts/slice-solitaire-mockup.mjs")
    slice_image(mockup_path, out_dir)

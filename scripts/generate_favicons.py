import os
import base64
import shutil
from PIL import Image, ImageDraw

LOGO_PATH = 'e:/milo/public/LOGO.png'
PUBLIC_DIR = 'e:/milo/public'
MILO_GREEN = (0, 128, 55, 255) # Màu xanh thương hiệu MILO #008037

def generate():
    if not os.path.exists(LOGO_PATH):
        print(f"Error: {LOGO_PATH} not found!")
        return

    logo = Image.open(LOGO_PATH).convert('RGBA')

    def make_icon(size):
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        radius = max(2, int(size * 0.20))
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=MILO_GREEN)
        
        if size <= 32:
            padding = 1
        elif size <= 64:
            padding = 2
        else:
            padding = int(size * 0.04)
            
        target_w = size - 2 * padding
        scale = target_w / logo.width
        new_w = int(logo.width * scale)
        new_h = int(logo.height * scale)
        resized = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
        x = (size - new_w) // 2
        y = (size - new_h) // 2
        canvas.paste(resized, (x, y), resized)
        return canvas

    # Tạo các kích thước
    img_16 = make_icon(16)
    img_32 = make_icon(32)
    img_48 = make_icon(48)
    img_180 = make_icon(180)
    img_192 = make_icon(192)
    img_512 = make_icon(512)

    # Lưu PNG
    img_16.save(os.path.join(PUBLIC_DIR, 'favicon-16x16.png'))
    img_32.save(os.path.join(PUBLIC_DIR, 'favicon-32x32.png'))
    img_180.save(os.path.join(PUBLIC_DIR, 'apple-touch-icon.png'))
    img_192.save(os.path.join(PUBLIC_DIR, 'android-chrome-192x192.png'))
    img_512.save(os.path.join(PUBLIC_DIR, 'android-chrome-512x512.png'))

    # Lưu ICO (chứa 16, 32, 48)
    img_32.save(
        os.path.join(PUBLIC_DIR, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[img_16, img_48]
    )

    # Lưu SVG
    with open(os.path.join(PUBLIC_DIR, 'android-chrome-512x512.png'), 'rb') as f:
        b64_data = base64.b64encode(f.read()).decode('utf-8')

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image width="512" height="512" href="data:image/png;base64,{b64_data}" />
</svg>
'''
    with open(os.path.join(PUBLIC_DIR, 'favicon.svg'), 'w', encoding='utf-8') as f:
        f.write(svg_content.strip())

    # Dọn dẹp thư mục tạm
    temp_dir = os.path.join(PUBLIC_DIR, 'temp_favicons')
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)

    print("Success: Generated all Milo favicons successfully!")

if __name__ == '__main__':
    generate()

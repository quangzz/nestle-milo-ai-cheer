import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from PIL import Image, ImageDraw, ImageOps, ImageFilter
import numpy as np
import cv2
import rembg

def process_head(input_path, output_path, target_height=234):
    """
    Quy trình bóc tách đầu và khuôn mặt đỉnh cao:
    1. Tách sạch 100% phông nền đằng sau trên toàn bộ ảnh gốc bằng Rembg AI (U2Net)
    2. Nhận diện khuôn mặt chính xác bằng OpenCV Haar Cascade
    3. Cắt trọn vòm tóc dày ở trên (crop_top = fy - 0.70 * fh)
    4. Bo cong quai hàm theo viền cằm tự nhiên, loại bỏ 100% áo vest/áo len bên dưới
    5. Trim viền trong suốt và resize về chiều cao chuẩn 234px
    6. Lưu input_head.png
    """
    try:
        print(f"[HEAD_PROC] Đang tải ảnh: {input_path}")
        orig_img = Image.open(input_path).convert("RGBA")
        w_orig, h_orig = orig_img.size

        # 1. Tách nền toàn bộ ảnh gốc trước bằng Rembg AI (đảm bảo giữ trọn vẹn tóc đen)
        print("[HEAD_PROC] Đang bóc tách nền toàn diện bằng Rembg AI...")
        nobg_full = rembg.remove(orig_img)

        # 2. Nhận diện khuôn mặt
        img_bgr = cv2.imread(input_path)
        if img_bgr is not None:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
        else:
            faces = []

        if len(faces) > 0:
            fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
            print(f"[HEAD_PROC] Đã nhận diện khuôn mặt: X={fx}, Y={fy}, W={fw}, H={fh}")

            # 2.1 Phát hiện góc nghiêng khuôn mặt qua mắt để nắn thẳng đầu về trục OY chuẩn
            tilt_angle = 0.0
            try:
                eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
                eye_tree_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml')
                
                e_y1 = fy + int(fh * 0.15)
                e_y2 = fy + int(fh * 0.65)
                e_x1 = fx + int(fw * 0.10)
                e_x2 = fx + int(fw * 0.90)
                
                if e_y2 > e_y1 and e_x2 > e_x1:
                    roi_eyes = gray[e_y1:e_y2, e_x1:e_x2]
                    eyes = eye_cascade.detectMultiScale(roi_eyes, scaleFactor=1.1, minNeighbors=3, minSize=(int(fw*0.10), int(fh*0.10)), maxSize=(int(fw*0.45), int(fh*0.45)))
                    if len(eyes) < 2:
                        eyes = eye_tree_cascade.detectMultiScale(roi_eyes, scaleFactor=1.1, minNeighbors=3, minSize=(int(fw*0.10), int(fh*0.10)), maxSize=(int(fw*0.45), int(fh*0.45)))
                    
                    if len(eyes) >= 2:
                        eyes = sorted(eyes, key=lambda e: e[0])
                        e_left, e_right = eyes[0], eyes[-1]
                        c_left = (e_x1 + e_left[0] + e_left[2] / 2.0, e_y1 + e_left[1] + e_left[3] / 2.0)
                        c_right = (e_x1 + e_right[0] + e_right[2] / 2.0, e_y1 + e_right[1] + e_right[3] / 2.0)
                        
                        dx = c_right[0] - c_left[0]
                        dy = c_right[1] - c_left[1]
                        
                        if dx > fw * 0.20:
                            calc_ang = np.degrees(np.arctan2(dy, dx))
                            if -45.0 <= calc_ang <= 45.0:
                                tilt_angle = calc_ang
            except Exception as eye_err:
                print(f"[HEAD_PROC_WARN] Lỗi phát hiện góc mắt: {eye_err}, giữ nguyên góc 0")

            face_center = (fx + fw / 2.0, fy + fh / 2.0)
            if abs(tilt_angle) >= 0.8:
                print(f"[HEAD_PROC] Phát hiện đầu nghiêng {tilt_angle:.2f}°. Đang nắn thẳng đầu về trục OY chuẩn...")
                nobg_full = nobg_full.rotate(tilt_angle, center=face_center, resample=Image.Resampling.BICUBIC)

            # Mở rộng vùng đỉnh đầu để lấy trọn vòm tóc
            crop_top = max(0, int(fy - fh * 0.70))
            crop_bottom = min(h_orig, int(fy + fh * 1.05))
            crop_left = max(0, int(fx - fw * 0.35))
            crop_right = min(w_orig, int(fx + fw * 1.35))

            head_cropped = nobg_full.crop((crop_left, crop_top, crop_right, crop_bottom))
            
            # Bo viền cằm dưới để loại bỏ 100% áo sơ mi/áo vest
            hc_w, hc_h = head_cropped.size
            mask = Image.new("L", (hc_w, hc_h), 255)
            draw = ImageDraw.Draw(mask)
            
            # Cắt đáy và bo elip cằm
            draw.rectangle([(0, int(hc_h * 0.68)), (hc_w, hc_h)], fill=0)
            
            # Căn tâm elip cằm theo vị trí khuôn mặt
            face_rel_cx = (fx + fw / 2 - crop_left) / float(hc_w)
            chin_w_ratio = (fw * 0.90) / float(hc_w)
            
            el_left = int(hc_w * max(0.05, face_rel_cx - chin_w_ratio * 0.60))
            el_right = int(hc_w * min(0.95, face_rel_cx + chin_w_ratio * 0.60))
            
            chin_ellipse = (el_left, int(hc_h * 0.35), el_right, int(hc_h * 0.98))
            draw.ellipse(chin_ellipse, fill=255)
            draw.rectangle([(0, 0), (hc_w, int(hc_h * 0.68))], fill=255)
            
            r, g, b, a = head_cropped.split()
            final_a = Image.composite(a, Image.new("L", (hc_w, hc_h), 0), mask)
            head_cropped.putalpha(final_a)
        else:
            print("[HEAD_PROC_WARN] Không nhận diện được mặt tự động, crop nửa trên")
            crop_top = 0
            crop_bottom = int(h_orig * 0.50)
            crop_left = int(w_orig * 0.15)
            crop_right = int(w_orig * 0.85)
            head_cropped = nobg_full.crop((crop_left, crop_top, crop_right, crop_bottom))

        # 3. Trim viền trong suốt
        bbox = head_cropped.getbbox()
        if bbox:
            head_cropped = head_cropped.crop(bbox)

        # 4. Tăng cường độ sáng mặt & làm đẹp da tự nhiên (Smart Skin Brightening & Clarity Filter)
        from PIL import ImageEnhance, ImageFilter
        
        # Tách kênh màu RGB và kênh trong suốt Alpha
        r, g, b, a = head_cropped.split()
        rgb = Image.merge("RGB", (r, g, b))
        
        # 4.1 Lớp lọc làm sáng khuôn mặt (Gamma Lift & Tone da hồng hào tự nhiên)
        rgb_arr = np.array(rgb, dtype=np.float32)
        # Nâng sáng midtones & shadows (gamma 0.85 khử bóng tối và sạm da)
        rgb_lifted = 255.0 * ((rgb_arr / 255.0) ** 0.85)
        # Bổ sung tone da ấm hồng hào hòa nhập phong cách Milo
        rgb_lifted[:, :, 0] = np.clip(rgb_lifted[:, :, 0] * 1.05 + 8, 0, 255)
        rgb_lifted[:, :, 1] = np.clip(rgb_lifted[:, :, 1] * 1.03 + 5, 0, 255)
        rgb_lifted[:, :, 2] = np.clip(rgb_lifted[:, :, 2] * 1.01 + 2, 0, 255)
        
        bright_rgb = Image.fromarray(rgb_lifted.astype(np.uint8))

        # 4.2 Tăng độ chi tiết và sắc sảo đường nét
        enhancer = ImageEnhance.Sharpness(bright_rgb)
        crisp_rgb = enhancer.enhance(1.45)
        
        contrast_enhancer = ImageEnhance.Contrast(crisp_rgb)
        crisp_rgb = contrast_enhancer.enhance(1.05)
        
        # Lọc Unsharp Mask để lông mi, mắt, chân mày và góc cạnh rõ nét
        unsharp_rgb = crisp_rgb.filter(ImageFilter.UnsharpMask(radius=1.8, percent=140, threshold=1))
        
        r_sharp, g_sharp, b_sharp = unsharp_rgb.split()
        head_enhanced = Image.merge("RGBA", (r_sharp, g_sharp, b_sharp, a))

        # 5. Resize chiều cao về đúng target_height (234px) với thuật toán Lanczos chống vỡ hạt
        cur_w, cur_h = head_enhanced.size
        if cur_h > 0:
            scale = target_height / float(cur_h)
            new_w = max(1, int(cur_w * scale))
            final_head = head_enhanced.resize((new_w, target_height), Image.Resampling.LANCZOS)
        else:
            final_head = head_enhanced

        # 6. Lưu file kết quả
        final_head.save(output_path, "PNG")
        print(f"[HEAD_PROC_SUCCESS] Đầu và khuôn mặt siêu nét đã được hoàn thiện: {output_path} ({new_w}x{target_height})")
        return True
    except Exception as e:
        print(f"[HEAD_PROC_ERROR] {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_head.py <input_path> <output_path> [target_height]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    height = int(sys.argv[3]) if len(sys.argv) > 3 else 234
    
    success = process_head(input_file, output_file, height)
    sys.exit(0 if success else 1)

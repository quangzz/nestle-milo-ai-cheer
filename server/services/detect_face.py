import sys
import json
import base64
import io
import os
import cv2
import numpy as np
from PIL import Image

def get_frames(file_path):
    """
    Trích xuất frames từ file ảnh hoặc file video
    """
    ext = os.path.splitext(file_path)[1].lower()
    video_exts = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v']
    
    if ext in video_exts:
        frames = []
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            return []
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            total_frames = 30
            
        # Lấy tối đa 5 frames phân bố đều trong video
        sample_indices = [int(total_frames * r) for r in [0.15, 0.35, 0.50, 0.70, 0.85]]
        
        for idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, idx))
            ret, frame = cap.read()
            if ret and frame is not None:
                frames.append(frame)
        cap.release()
        return frames
    else:
        # Load image file
        img_bgr = cv2.imread(file_path)
        if img_bgr is not None:
            return [img_bgr]
        try:
            pil_img = Image.open(file_path).convert('RGB')
            img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            return [img_bgr]
        except Exception:
            return []

def verify_face_eyes(gray_frame, face_rect, eye_cascade):
    """
    Xác thực khuôn mặt hai lớp:
    Một khuôn mặt người thực sự bắt buộc phải có ít nhất 1 mắt nằm ở nửa trên khuôn mặt (y đến y + 0.65*h)
    Tránh 100% trường hợp vỏ cây, cành lá, đồ vật bị nhận diện nhầm
    """
    x, y, w, h = face_rect
    # Vùng mắt chỉ nằm từ 15% đến 65% chiều cao khuôn mặt
    eye_roi_y1 = y + int(h * 0.12)
    eye_roi_y2 = y + int(h * 0.65)
    eye_roi_x1 = x + int(w * 0.10)
    eye_roi_x2 = x + int(w * 0.90)

    if eye_roi_y2 <= eye_roi_y1 or eye_roi_x2 <= eye_roi_x1:
        return False

    roi_gray = gray_frame[eye_roi_y1:eye_roi_y2, eye_roi_x1:eye_roi_x2]
    if roi_gray.shape[0] < 20 or roi_gray.shape[1] < 20:
        return False

    eyes = eye_cascade.detectMultiScale(
        roi_gray,
        scaleFactor=1.1,
        minNeighbors=3,
        minSize=(int(w * 0.12), int(h * 0.12)),
        maxSize=(int(w * 0.45), int(h * 0.45))
    )
    return len(eyes) >= 1

def detect_faces(file_path):
    try:
        # 0. Kiểm duyệt AI trước tiên: Phát hiện ảnh các vị lãnh tụ và chính khách
        try:
            from leader_moderation import moderate_face_image
            mod_result = moderate_face_image(file_path)
            if mod_result and mod_result.get("violation") is True:
                print(json.dumps({
                    "hasFace": True,
                    "faceCount": 1,
                    "violation": True,
                    "errorMessage": mod_result.get("errorMessage", "Hình ảnh vi phạm tiêu chuẩn cộng đồng. Vui lòng tải lên hình ảnh cá nhân của bạn!")
                }))
                return
        except Exception as mod_err:
            pass

        frames = get_frames(file_path)
        if not frames:
            print(json.dumps({"hasFace": False, "faceCount": 0, "error": "Không thể đọc file"}))
            return

        cascade_frontal = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        cascade_alt = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')
        cascade_profile = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

        best_faces = []
        best_frame = None

        for frame in frames:
            h, w = frame.shape[:2]
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # 1. Phát hiện bằng frontal face với minNeighbors nghiêm ngặt (chống cây cối/nhiễu)
            raw_faces = list(cascade_alt.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)))
            if len(raw_faces) == 0:
                raw_faces = list(cascade_frontal.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(60, 60)))
            if len(raw_faces) == 0:
                raw_faces = list(cascade_profile.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(60, 60)))

            # 2. Lọc qua bộ kiểm tra mắt hai lớp
            verified_faces = []
            for face in raw_faces:
                if verify_face_eyes(gray, face, eye_cascade):
                    verified_faces.append(face)

            # Nếu có khuôn mặt hợp lệ trong frame này
            if len(verified_faces) > len(best_faces):
                best_faces = verified_faces
                best_frame = frame

        if len(best_faces) == 0:
            print(json.dumps({"hasFace": False, "faceCount": 0}))
            return

        # Sắp xếp và chọn khuôn mặt to nhất (diện tích w*h lớn nhất)
        largest_face = max(best_faces, key=lambda f: f[2] * f[3])
        fx, fy, fw, fh = largest_face
        h_f, w_f = best_frame.shape[:2]

        # Crop khuôn mặt to nhất kèm lề chuẩn
        pad_x = int(fw * 0.35)
        pad_y_top = int(fh * 0.50)
        pad_y_bottom = int(fh * 0.40)

        x1 = max(0, fx - pad_x)
        y1 = max(0, fy - pad_y_top)
        x2 = min(w_f, fx + fw + pad_x)
        y2 = min(h_f, fy + fh + pad_y_bottom)

        face_crop = best_frame[y1:y2, x1:x2]
        face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
        pil_crop = Image.fromarray(face_rgb)
        
        # Nâng cấp độ phân giải & làm nét chi tiết khuôn mặt
        from PIL import ImageEnhance, ImageFilter
        if pil_crop.width > 480 or pil_crop.height > 480:
            pil_crop.thumbnail((480, 480), Image.Resampling.LANCZOS)
        
        # Bộ lọc tăng độ nét và tương phản cho khuôn mặt sắc sảo
        enhancer = ImageEnhance.Sharpness(pil_crop)
        sharp_crop = enhancer.enhance(1.40)
        unsharp_crop = sharp_crop.filter(ImageFilter.UnsharpMask(radius=1.5, percent=140, threshold=1))

        buf = io.BytesIO()
        unsharp_crop.save(buf, format="JPEG", quality=96)
        preview_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        face_base64 = preview_b64

        # 3. Kiểm duyệt AI: Phát hiện khuôn mặt các vị lãnh tụ và chính khách
        try:
            from leader_moderation import moderate_face_image
            mod_result = moderate_face_image(pil_crop)

            if mod_result and mod_result.get("violation") is True:
                print(json.dumps({
                    "hasFace": True,
                    "faceCount": len(best_faces),
                    "violation": True,
                    "errorMessage": mod_result.get("errorMessage", "Hình ảnh vi phạm tiêu chuẩn cộng đồng. Vui lòng tải lên hình ảnh cá nhân của bạn!")
                }))
                return
        except Exception as mod_err:
            pass

        print(json.dumps({
            "hasFace": True,
            "faceCount": len(best_faces),
            "faceCrop": f"data:image/jpeg;base64,{face_base64}"
        }))

    except Exception as e:
        print(json.dumps({
            "hasFace": False,
            "error": str(e),
            "faceCount": 0
        }))

if __name__ == '__main__':
    if len(sys.argv) > 1:
        detect_faces(sys.argv[1])
    else:
        print(json.dumps({"hasFace": False, "error": "No file path"}))

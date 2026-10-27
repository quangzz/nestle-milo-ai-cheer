"""
Script kiểm tra độ khớp của chuyển động đầu trên các frame thực tế của 3 chủ đề: Study, Office, Workout
"""
import os
import sys
import json
import cv2
import numpy as np
from PIL import Image

def apply_neck_feathering(head_img, fade_height_ratio=0.08):
    """Làm mờ chuyển tiếp êm dịu (feathering) ở chân cổ để đầu chìm tự nhiên vào cổ áo"""
    img = head_img.copy()
    w, h = img.size
    fade_px = max(6, int(h * fade_height_ratio))
    
    # Lấy kênh alpha
    r, g, b, a = img.split()
    a_arr = np.array(a, dtype=np.float32)
    
    # Tạo gradient giảm dần ở đáy
    for i in range(fade_px):
        y = h - fade_px + i
        factor = (fade_px - i) / float(fade_px)
        # Factor giảm dần về 0 ở hàng cuối cùng
        a_arr[y, :] *= (1.0 - factor * 0.85)
        
    a_new = Image.fromarray(np.clip(a_arr, 0, 255).astype(np.uint8))
    img.putalpha(a_new)
    return img

def test_composite():
    sample_head_path = "e:/milo/server/jobs/job_1786766069982_tn4p/input_head.png"
    if not os.path.exists(sample_head_path):
        print(f"Không tìm thấy {sample_head_path}")
        return

    frames_base = "e:/milo/MILO-20260815T030710Z-1-001/MILO/milo_material/frames"
    services_dir = "e:/milo/server/services"
    out_dir = "e:/milo/server/test_composite_output"
    os.makedirs(out_dir, exist_ok=True)

    configs = {
        'study': {
            'scale': 1.15,
            'y_offset': 6,
            'track_file': os.path.join(services_dir, 'neck_motion_study.json'),
            'frames_dir': os.path.join(frames_base, 'study'),
            'test_frames': [1, 120, 240, 360]
        },
        'office': {
            'scale': 1.05,
            'y_offset': 4,
            'track_file': os.path.join(services_dir, 'neck_motion_office.json'),
            'frames_dir': os.path.join(frames_base, 'office'),
            'test_frames': [1, 120, 240, 360]
        },
        'workout': {
            'scale': 1.05,
            'y_offset': 12,
            'track_file': os.path.join(services_dir, 'neck_motion_workout.json'),
            'frames_dir': os.path.join(frames_base, 'workout'),
            'test_frames': [1, 120, 240, 360]
        }
    }

    raw_head = Image.open(sample_head_path).convert("RGBA")

    for topic, cfg in configs.items():
        with open(cfg['track_file'], 'r', encoding='utf-8') as f:
            track_data = json.load(f)

        # Scale head
        s = cfg['scale']
        scaled_head = raw_head.resize((int(raw_head.width * s), int(raw_head.height * s)), Image.Resampling.LANCZOS)
        feathered_head = apply_neck_feathering(scaled_head, fade_height_ratio=0.08)

        hw, hh = feathered_head.size
        pad = 60
        canv_w, canv_h = hw + 2 * pad, hh + 2 * pad
        head_padded = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))
        head_padded.paste(feathered_head, (pad, pad))

        # Điểm neo khớp cổ trên canvas đệm
        neck_pv_x = pad + hw / 2.0
        neck_pv_y = pad + hh * 0.90

        for f_num in cfg['test_frames']:
            fname = f"frame_{f_num:04d}.png"
            fpath = os.path.join(cfg['frames_dir'], fname)
            if not os.path.exists(fpath):
                continue

            frame_img = Image.open(fpath).convert("RGBA")
            td = track_data[f_num - 1]

            neck_x = td['neck_x']
            neck_y = td['neck_y']
            neck_angle = td['neck_angle']

            # Xoay quanh khớp cổ
            if abs(neck_angle) > 0.1:
                head_rot = head_padded.rotate(-neck_angle, center=(neck_pv_x, neck_pv_y), resample=Image.Resampling.BILINEAR)
            else:
                head_rot = head_padded

            # Gắn vào đúng tọa độ cổ
            paste_x = int(neck_x - neck_pv_x)
            paste_y = int(neck_y - neck_pv_y + cfg['y_offset'])

            frame_img.paste(head_rot, (paste_x, paste_y), head_rot)

            # Crop vùng cận cảnh đầu (ROI 500x600 quanh cổ) để kiểm tra chi tiết
            roi_x1 = max(0, int(neck_x - 220))
            roi_y1 = max(0, int(neck_y - 300))
            roi_x2 = min(frame_img.width, roi_x1 + 440)
            roi_y2 = min(frame_img.height, roi_y1 + 450)
            crop_preview = frame_img.crop((roi_x1, roi_y1, roi_x2, roi_y2))

            out_crop_path = os.path.join(out_dir, f"{topic}_f{f_num}_crop.jpg")
            crop_preview.convert("RGB").save(out_crop_path, "JPEG", quality=95)
            print(f"Saved: {out_crop_path} (Neck: ({neck_x:.1f}, {neck_y:.1f}), Angle: {neck_angle:.2f}°)")

if __name__ == '__main__':
    test_composite()

"""
==============================================================================
SCRIPT TRÍCH XUẤT TỌA ĐỘ CỔ VÀ GÓC NGHIÊNG CỔ TỪNG FRAME (MILO BASE VIDEOS)
==============================================================================
Script này phân tích trực tiếp 1.464 file ảnh PNG gốc (1080x1920) trong:
  - frames/study/frame_*.png
  - frames/office/frame_*.png
  - frames/workout/frame_*.png

Nhiệm vụ:
  1. Xác định tọa độ Chấm Đỏ (dot_x, dot_y)
  2. Xác định tọa độ Khớp Cổ / Đuôi gạch đỏ (neck_x, neck_y)
  3. Tính toán góc nghiêng cổ so với trục thẳng đứng Oy (neck_angle)
  4. Xuất file JSON chi tiết từng frame phục vụ bám dính chuyển động đầu và cổ.
"""

import sys
import os
import cv2
import numpy as np
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Cấu hình ROI (Vùng tìm kiếm Dấu Ghim Đỏ cổ áo cho từng chủ đề)
TOPIC_CONFIGS = {
    'study': {
        'name': 'Học tập (Study)',
        'roi': (450, 300, 680, 560),
        'collar_offset': 8,
        'json_filename': 'track_study.json',
        'detail_json_filename': 'neck_motion_study.json'
    },
    'office': {
        'name': 'Công sở (Office)',
        'roi': (440, 300, 660, 560),
        'collar_offset': 5,
        'json_filename': 'track_office.json',
        'detail_json_filename': 'neck_motion_office.json'
    },
    'workout': {
        'name': 'Thể thao (Workout)',
        'roi': (480, 300, 680, 560),
        'collar_offset': 18,
        'json_filename': 'track_workout.json',
        'detail_json_filename': 'neck_motion_workout.json'
    }
}

def extract_neck_data_from_frames(frames_dir, topic_key, fps=30.0):
    cfg = TOPIC_CONFIGS[topic_key]
    rx1, ry1, rx2, ry2 = cfg['roi']
    
    files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    total_frames = len(files)
    print(f"\n=======================================================")
    print(f"🎬 Đang phân tích chủ đề: {cfg['name']}")
    print(f"📁 Thư mục frame: {frames_dir}")
    print(f"📊 Tổng số frame: {total_frames} frames")
    print(f"=======================================================")
    
    raw_data = []
    last_dot_x = (rx1 + rx2) / 2.0
    last_dot_y = (ry1 + ry2) / 2.0 - 20.0
    last_neck_x = last_dot_x
    last_neck_y = last_dot_y + 35.0
    last_angle = 0.0

    for idx, fname in enumerate(files):
        img_path = os.path.join(frames_dir, fname)
        frame = cv2.imread(img_path)
        if frame is None:
            raw_data.append({
                'frame': idx + 1,
                'file_name': fname,
                'time_seconds': round(idx / fps, 4),
                'neck_x': last_neck_x,
                'neck_y': last_neck_y,
                'neck_angle': last_angle,
                'dot_x': last_dot_x,
                'dot_y': last_dot_y,
                'chin_x': last_neck_x,
                'chin_y': last_neck_y,
                'angle': last_angle
            })
            continue

        roi = frame[ry1:ry2, rx1:rx2]
        b = roi[:, :, 0].astype(int)
        g = roi[:, :, 1].astype(int)
        r = roi[:, :, 2].astype(int)

        # Lọc pixel đỏ rực của Dấu Ghim Đỏ
        red_mask = ((r > 150) & (r - g > 65) & (r - b > 65)).astype(np.uint8)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(red_mask)

        best_comp = None
        best_y = 9999
        for i in range(1, num_labels):
            x, y, w, h, area = stats[i]
            # Kích thước ghim đỏ chuẩn: w: 15..65px, h: 25..125px, area: 200..2800px
            if 200 <= area <= 2800 and 15 <= w <= 65 and 25 <= h <= 125:
                if y < best_y:
                    best_y = y
                    best_comp = i

        if best_comp is not None:
            comp_mask = (labels == best_comp)
            ys, xs = np.where(comp_mask)
            abs_xs = rx1 + xs
            abs_ys = ry1 + ys

            min_y = np.min(ys)
            max_y = np.max(ys)

            # 1. Tọa độ tâm Chấm Đỏ (nửa trên của dấu ghim)
            top_half = ys < (min_y + 35)
            if np.any(top_half):
                dot_x = float(np.mean(abs_xs[top_half]))
                dot_y = float(np.mean(abs_ys[top_half]))
            else:
                dot_x = float(np.mean(abs_xs))
                dot_y = float(ry1 + min_y + 15)

            # 2. Tọa độ Khớp Cổ / Cổ áo (đuôi gạch đỏ ở đáy)
            bot_half = ys >= (max_y - 15)
            if np.any(bot_half):
                neck_x = float(np.mean(abs_xs[bot_half]))
                neck_y = float(np.max(abs_ys[bot_half]))
            else:
                neck_x = dot_x
                neck_y = float(ry1 + max_y)

            # 3. Góc nghiêng của Cổ so với trục thẳng đứng Oy (0° là thẳng đứng tuyệt đối)
            dx = neck_x - dot_x
            dy = max(1.0, neck_y - dot_y)
            neck_angle = float(np.degrees(np.arctan2(-dx, dy)))

            last_dot_x, last_dot_y = dot_x, dot_y
            last_neck_x, last_neck_y = neck_x, neck_y
            last_angle = neck_angle
        else:
            dot_x, dot_y = last_dot_x, last_dot_y
            neck_x, neck_y = last_neck_x, last_neck_y
            neck_angle = last_angle

        raw_data.append({
            'frame': idx + 1,
            'file_name': fname,
            'time_seconds': round(idx / fps, 4),
            'neck_x': neck_x,
            'neck_y': neck_y,
            'neck_angle': neck_angle,
            'dot_x': dot_x,
            'dot_y': dot_y,
            'chin_x': neck_x,
            'chin_y': neck_y,
            'angle': neck_angle
        })

    # Làm mịn Moving Average (window=3) để chuyển động đạt độ mượt chuẩn điện ảnh
    smoothed_data = []
    for i in range(len(raw_data)):
        s_i = max(0, i - 1)
        e_i = min(len(raw_data), i + 2)
        sub = raw_data[s_i:e_i]

        avg_dot_x = sum(d['dot_x'] for d in sub) / len(sub)
        avg_dot_y = sum(d['dot_y'] for d in sub) / len(sub)
        avg_neck_x = sum(d['neck_x'] for d in sub) / len(sub)
        avg_neck_y = sum(d['neck_y'] for d in sub) / len(sub)
        avg_angle = sum(d['neck_angle'] for d in sub) / len(sub)

        dx = avg_neck_x - avg_dot_x
        dy = avg_neck_y - avg_dot_y
        vec_len = np.sqrt(dx**2 + dy**2)

        entry = {
            'frame': raw_data[i]['frame'],
            'file_name': raw_data[i]['file_name'],
            'time_seconds': raw_data[i]['time_seconds'],
            'neck_x': round(avg_neck_x, 2),
            'neck_y': round(avg_neck_y, 2),
            'neck_angle': round(avg_angle, 2),
            'dot_x': round(avg_dot_x, 2),
            'dot_y': round(avg_dot_y, 2),
            'chin_x': round(avg_neck_x, 2),
            'chin_y': round(avg_neck_y, 2),
            'angle': round(avg_angle, 2),
            'vector_collar_to_head': {
                'dx': round(dx, 2),
                'dy': round(dy, 2),
                'distance': round(vec_len, 2)
            }
        }
        smoothed_data.append(entry)

    # Thống kê phân tích
    neck_xs = [d['neck_x'] for d in smoothed_data]
    neck_ys = [d['neck_y'] for d in smoothed_data]
    angles = [d['neck_angle'] for d in smoothed_data]
    dot_xs = [d['dot_x'] for d in smoothed_data]
    dot_ys = [d['dot_y'] for d in smoothed_data]

    print(f"✅ Hoàn tất phân tích {len(smoothed_data)} frames:")
    print(f"  • Tọa độ Cổ (Neck X):    Min={min(neck_xs):.2f}, Max={max(neck_xs):.2f} (Biên độ lắc: {max(neck_xs)-min(neck_xs):.2f}px)")
    print(f"  • Tọa độ Cổ (Neck Y):    Min={min(neck_ys):.2f}, Max={max(neck_ys):.2f} (Biên độ nhún: {max(neck_ys)-min(neck_ys):.2f}px)")
    print(f"  • Góc nghiêng Cổ (Oy):   Min={min(angles):.2f}°, Max={max(angles):.2f}° (Góc lắc: {max(angles)-min(angles):.2f}°)")
    print(f"  • Tọa độ Chấm Đỏ (X):    Min={min(dot_xs):.2f}, Max={max(dot_xs):.2f}")
    print(f"  • Tọa độ Chấm Đỏ (Y):    Min={min(dot_ys):.2f}, Max={max(dot_ys):.2f}")

    return smoothed_data

def run_extraction():
    base_material_dir = os.environ.get('MATERIAL_DIR', 'e:/milo/MILO-20260815T030710Z-1-001/MILO')
    frames_dir_candidate = os.path.join(base_material_dir, 'milo_material', 'frames')
    if not os.path.exists(frames_dir_candidate):
        frames_dir_candidate = os.path.join(base_material_dir, 'frames')

    services_dir = os.path.dirname(os.path.abspath(__file__))

    topics_to_process = list(TOPIC_CONFIGS.keys())
    if len(sys.argv) > 1 and sys.argv[1].lower() in TOPIC_CONFIGS:
        topics_to_process = [sys.argv[1].lower()]

    for t_key in topics_to_process:
        cfg = TOPIC_CONFIGS[t_key]
        t_frames_dir = os.path.join(frames_dir_candidate, t_key)
        
        if not os.path.exists(t_frames_dir):
            print(f"[WARN] Thư mục không tồn tại: {t_frames_dir}")
            continue

        result_data = extract_neck_data_from_frames(t_frames_dir, t_key)

        # 1. Lưu file tracking chuẩn cho hệ thống render (track_*.json)
        dest_track_json = os.path.join(services_dir, cfg['json_filename'])
        with open(dest_track_json, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, indent=2)
        print(f"💾 Đã lưu dữ liệu tracking hệ thống: {dest_track_json}")

        # 2. Lưu file JSON chi tiết từng frame (neck_motion_*.json) trong thư mục services
        dest_detail_json = os.path.join(services_dir, cfg['detail_json_filename'])
        with open(dest_detail_json, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, indent=2)
        print(f"💾 Đã lưu file JSON chi tiết tọa độ cổ: {dest_detail_json}")

        # 3. Đồng thời lưu một bản trực tiếp vào thư mục frames/{topic} để dễ dàng tra cứu
        dest_frames_json = os.path.join(t_frames_dir, cfg['detail_json_filename'])
        with open(dest_frames_json, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, indent=2)
        print(f"💾 Đã lưu file JSON trong thư mục frames: {dest_frames_json}")

if __name__ == '__main__':
    run_extraction()

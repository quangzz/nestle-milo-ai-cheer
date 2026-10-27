import sys
import os
import cv2
import numpy as np
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def track_frames_from_png(frames_dir, output_json, roi_box, fps=30.0):
    rx1, ry1, rx2, ry2 = roi_box
    files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    total_frames = len(files)
    print(f"[TRACK_PNG] Đang quét {total_frames} frames PNG trong: {os.path.basename(frames_dir)}...")
    
    data = []
    last_dot_x, last_dot_y = (rx1 + rx2) / 2.0, (ry1 + ry2) / 2.0 - 30.0
    last_chin_x, last_chin_y = last_dot_x, last_dot_y + 45.0
    last_angle = 0.0
    
    for f_idx, fname in enumerate(files):
        img_path = os.path.join(frames_dir, fname)
        frame = cv2.imread(img_path)
        if frame is None:
            data.append({
                'frame': f_idx,
                'time': round(f_idx / fps, 4),
                'dot_x': round(last_dot_x, 2),
                'dot_y': round(last_dot_y, 2),
                'chin_x': round(last_chin_x, 2),
                'chin_y': round(last_chin_y, 2),
                'angle': round(last_angle, 2)
            })
            continue
            
        roi = frame[ry1:ry2, rx1:rx2]
        b = roi[:, :, 0].astype(int)
        g = roi[:, :, 1].astype(int)
        r = roi[:, :, 2].astype(int)
        
        # Nhận diện màu đỏ rực của chấm đỏ và gạch đỏ
        red_mask = ((r > 150) & (r - g > 65) & (r - b > 65)).astype(np.uint8)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(red_mask)
        
        # Lọc đúng cụm Dấu Ghim Đỏ (bỏ qua áo đấu đỏ, đồ họa nền)
        best_comp = None
        best_y = 9999
        for i in range(1, num_labels):
            x, y, w, h, area = stats[i]
            # Kích thước ghim đỏ chuẩn: w từ 15..65px, h từ 25..125px, diện tích 200..2800px
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
            
            # Chấm đỏ tròn (ở nửa trên của cụm ghim đỏ)
            top_half = ys < (min_y + 35)
            if np.any(top_half):
                dot_x = float(np.mean(abs_xs[top_half]))
                dot_y = float(np.mean(abs_ys[top_half]))
            else:
                dot_x = float(np.mean(abs_xs))
                dot_y = float(ry1 + min_y + 15)
                
            # Đuôi gạch đỏ (điểm chạm cằm/cổ áo ở đáy)
            bot_half = ys >= (max_y - 15)
            if np.any(bot_half):
                chin_x = float(np.mean(abs_xs[bot_half]))
                chin_y = float(np.max(abs_ys[bot_half]))
            else:
                chin_x = dot_x
                chin_y = float(ry1 + max_y)
                
            # Góc nghiêng so với trục thẳng đứng Oy (Oy chuẩn là 0 độ)
            # Vector từ Đuôi gạch đỏ lên Chấm đỏ: dx = dot_x - chin_x, dy = dot_y - chin_y
            # Khi thân nghiêng sang phải (Chấm đỏ lệch phải so với cổ): angle > 0
            dx = chin_x - dot_x
            dy = max(1.0, chin_y - dot_y)
            angle_oy = float(np.degrees(np.arctan2(-dx, dy)))
            
            last_dot_x, last_dot_y = dot_x, dot_y
            last_chin_x, last_chin_y = chin_x, chin_y
            last_angle = angle_oy
        else:
            dot_x, dot_y = last_dot_x, last_dot_y
            chin_x, chin_y = last_chin_x, last_chin_y
            angle_oy = last_angle
            
        data.append({
            'frame': f_idx,
            'time': round(f_idx / fps, 4),
            'dot_x': dot_x,
            'dot_y': dot_y,
            'chin_x': chin_x,
            'chin_y': chin_y,
            'angle': round(angle_oy, 2)
        })
        
    # Làm mịn chuyển động (Moving Average 3 frames) để loại bỏ rung giật sub-pixel
    smoothed = []
    for i in range(len(data)):
        s_i = max(0, i - 1)
        e_i = min(len(data), i + 2)
        sub = data[s_i:e_i]
        
        avg_dot_x = sum(d['dot_x'] for d in sub) / len(sub)
        avg_dot_y = sum(d['dot_y'] for d in sub) / len(sub)
        avg_chin_x = sum(d['chin_x'] for d in sub) / len(sub)
        avg_chin_y = sum(d['chin_y'] for d in sub) / len(sub)
        avg_angle = sum(d['angle'] for d in sub) / len(sub)
        
        smoothed.append({
            'frame': data[i]['frame'],
            'time': data[i]['time'],
            'dot_x': round(avg_dot_x, 2),
            'dot_y': round(avg_dot_y, 2),
            'chin_x': round(avg_chin_x, 2),
            'chin_y': round(avg_chin_y, 2),
            'angle': round(avg_angle, 2)
        })
        
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(smoothed, f, indent=2)
    print(f"[TRACK_PNG_SUCCESS] Đã lưu {len(smoothed)} frames bám dính Dấu Đỏ & góc Oy vào {output_json}")

if __name__ == '__main__':
    base_dir = os.environ.get('MATERIAL_DIR', 'e:/milo/MILO-20260815T030710Z-1-001/MILO')
    frames_dir = os.path.join(base_dir, 'milo_material', 'frames') if os.path.exists(os.path.join(base_dir, 'milo_material', 'frames')) else os.path.join(base_dir, 'frames')
    services_dir = os.path.dirname(os.path.abspath(__file__))
    
    track_frames_from_png(os.path.join(frames_dir, 'study'), os.path.join(services_dir, 'track_study.json'), (450, 300, 680, 560))
    track_frames_from_png(os.path.join(frames_dir, 'office'), os.path.join(services_dir, 'track_office.json'), (440, 300, 660, 560))
    track_frames_from_png(os.path.join(frames_dir, 'workout'), os.path.join(services_dir, 'track_workout.json'), (480, 300, 680, 560))

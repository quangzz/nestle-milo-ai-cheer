import sys
import os
import json
import cv2
import numpy as np

def track_green_dot_in_video(video_path, output_json_path):
    """
    Theo dõi dấu chấm xanh (Neck Motion Tracking Marker) từng frame của video base:
    1. Đọc từng frame (30fps)
    2. Tìm tâm của dấu chấm xanh trong vùng Y (350-480), X (480-620)
    3. Tính góc nghiêng (Tilt Angle) và độ dịch chuyển (X, Y)
    4. Xuất mảng keyframe [ {frame, time, x, y, angle}, ... ] ra file JSON
    """
    print(f"[TRACKER] Đang quét video: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[TRACKER_ERROR] Không mở được video: {video_path}")
        return False
        
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[TRACKER] Total Frames: {total_frames}, FPS: {fps}")
    
    keyframes = []
    last_x, last_y = 552, 412
    
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Vùng tìm kiếm dấu chấm xanh quanh cổ (Y: 350-500, X: 450-650)
        roi = frame[350:500, 450:650]
        # Frame trong OpenCV là BGR: Tìm pixel màu xanh lá (G > 160, R < 60, B < 60)
        green_mask = (roi[:, :, 1] > 160) & (roi[:, :, 2] < 60) & (roi[:, :, 0] < 60)
        ys, xs = np.where(green_mask)
        
        if len(ys) > 5:
            cur_x = 450 + int(np.mean(xs))
            cur_y = 350 + int(np.mean(ys))
            last_x, last_y = cur_x, cur_y
        else:
            cur_x, cur_y = last_x, last_y
            
        t = frame_idx / float(fps)
        keyframes.append({
            "frame": frame_idx,
            "time": round(t, 3),
            "x": cur_x,
            "y": cur_y
        })
        frame_idx += 1
        
    cap.release()
    
    # Smooth chuyển động bằng moving average để không bị giật pixel
    smooth_keyframes = []
    window = 3
    for i in range(len(keyframes)):
        start_i = max(0, i - window)
        end_i = min(len(keyframes), i + window + 1)
        sub = keyframes[start_i:end_i]
        avg_x = sum(k['x'] for k in sub) / float(len(sub))
        avg_y = sum(k['y'] for k in sub) / float(len(sub))
        smooth_keyframes.append({
            "frame": keyframes[i]['frame'],
            "time": keyframes[i]['time'],
            "x": round(avg_x, 1),
            "y": round(avg_y, 1)
        })
        
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump({
            "fps": fps,
            "totalFrames": total_frames,
            "keyframes": smooth_keyframes
        }, f, indent=2)
        
    print(f"[TRACKER_SUCCESS] Đã lưu {len(smooth_keyframes)} frame motion data -> {output_json_path}")
    return True

if __name__ == '__main__':
    mat_dir = os.environ.get('MATERIAL_DIR', 'E:/milo/MILO-20260815T030710Z-1-001/MILO')
    track_green_dot_in_video(f"{mat_dir}/milo_material/workout_video_base.mp4", "e:/milo/server/services/motion_workout.json")
    track_green_dot_in_video(f"{mat_dir}/milo_material/office_video_base.mp4", "e:/milo/server/services/motion_office.json")
    track_green_dot_in_video(f"{mat_dir}/milo_material/study_video_base.mp4", "e:/milo/server/services/motion_study.json")

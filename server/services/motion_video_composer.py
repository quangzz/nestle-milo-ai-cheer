import sys
import os
import json
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def make_text_layer(text, font, text_color, shadow_color=(0, 0, 0), shadow_offset=(2, 2)):
    """Tạo trước ảnh RGBA chứa text và drop shadow sắc nét"""
    bbox = font.getbbox(text)
    w = bbox[2] - bbox[0] + 16
    h = bbox[3] - bbox[1] + 16
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ox = -bbox[0] + 4
    oy = -bbox[1] + 4
    d.text((ox + shadow_offset[0], oy + shadow_offset[1]), text, font=font, fill=shadow_color)
    d.text((ox, oy), text, font=font, fill=text_color)
    return img, ox, oy

def apply_face_brightening_filter_v2(img_rgba):
    """
    Bộ lọc Beauty Skin Glow Filter V2:
    1. Tách kênh alpha
    2. Nâng sáng midtones & shadows (Gamma 0.85 lift) khử sạm da và bóng tối
    3. Thêm sắc hồng ấm tự nhiên (R*1.05 + 8, G*1.03 + 5, B*1.01 + 2)
    4. Tăng nhẹ độ tương phản và độ nét (Contrast & Sharpness) để mắt và nét mặt rạng rỡ
    """
    from PIL import ImageEnhance
    r, g, b, a = img_rgba.split()
    rgb = Image.merge("RGB", (r, g, b))
    
    rgb_arr = np.array(rgb, dtype=np.float32)
    rgb_lifted = 255.0 * ((rgb_arr / 255.0) ** 0.85)
    rgb_lifted[:, :, 0] = np.clip(rgb_lifted[:, :, 0] * 1.05 + 8, 0, 255)
    rgb_lifted[:, :, 1] = np.clip(rgb_lifted[:, :, 1] * 1.03 + 5, 0, 255)
    rgb_lifted[:, :, 2] = np.clip(rgb_lifted[:, :, 2] * 1.01 + 2, 0, 255)
    
    img_lifted = Image.fromarray(rgb_lifted.astype(np.uint8))
    img_lifted = ImageEnhance.Contrast(img_lifted).enhance(1.05)
    img_lifted = ImageEnhance.Sharpness(img_lifted).enhance(1.20)
    
    r_out, g_out, b_out = img_lifted.split()
    return Image.merge("RGBA", (r_out, g_out, b_out, a))

def compose_motion_video(base_video_path, head_png_path, audio_path, output_video_path, topic, recipient_name, tracking_json_path, font_path):
    """
    Trình dựng video Motion Tracking SIÊU TỐC ĐỘ:
    1. Pre-render 100% tiêu đề & các trạng thái phụ đề Karaoke trước vòng lặp
    2. Gắn đầu avatar bám sát dấu chấm cổ & góc nghiêng tracking
    3. Mã hóa FFmpeg chuẩn ultrafast -rgb24 stream trực tiếp
    """
    print(f"[MOTION_COMPOSER] Bắt đầu dựng video với Motion Tracking tối ưu siêu tốc...")
    
    # 1. Tải dữ liệu tracking
    with open(tracking_json_path, 'r', encoding='utf-8') as f:
        track_data = json.load(f)
        
    # 2. Tải đầu avatar PNG & áp dụng Filter V2 làm sáng mặt, hồng hào tự nhiên
    head_pil = Image.open(head_png_path).convert("RGBA")
    head_pil = apply_face_brightening_filter_v2(head_pil)

    if 'STUDY' in topic.upper():
        head_scale = 1.15
        y_shift = -65  # Nâng đầu lên trên để lộ hoàn toàn phần cổ tự nhiên
    elif 'WORKOUT' in topic.upper():
        head_scale = 1.10
        y_shift = -65  # Nâng đầu lên trên để lộ hoàn toàn phần cổ tự nhiên
    else: # OFFICE / WORK
        head_scale = 1.10
        y_shift = -68  # Nâng đầu lên trên để lộ rõ cổ áo sơ mi & cà vạt

    head_pil = head_pil.resize(
        (int(head_pil.width * head_scale), int(head_pil.height * head_scale)),
        Image.Resampling.LANCZOS
    )
    hw, hh = head_pil.size
    
    # 3. Tải font chữ RoadRage
    title_font = ImageFont.truetype(font_path, 70)
    lyrics_font = ImageFont.truetype(font_path, 65)
    
    # 4. Chuẩn bị text tiêu đề & lời bài hát
    name_upper = recipient_name.upper().strip()
    topic_verb = 'HỌC' if 'STUDY' in topic.upper() else ('TẬP' if 'WORKOUT' in topic.upper() else 'LÀM')
    title_text = f"CỔ VŨ {name_upper} {topic_verb} TỚI CÙNG"
    
    if 'WORKOUT' in topic.upper():
        k1_lines = [
            f"{name_upper} ƠI CỐ LÊN! 1…2…1…2!",
            "CHẠY CÀNG THÊM HĂNG, CHẶNG CÀNG THÊM HAY!",
            "THÊM MỘT HIỆP NỮA, GẦN TỚI ĐÍCH RỒI!",
            "ĐỘ THÊM TÍ NỮA, DÁNG ĐẸP THIỆT RỒI!"
        ]
        k2_lines = [
            "1…2…1…2!",
            "RÁNG TẬP TỚI CÙNG NHAAA,",
            "PHẢI TẬP TỚI CÙNGGGG NHA!"
        ]
    elif 'STUDY' in topic.upper():
        k1_lines = [
            f"{name_upper} ƠI CỐ LÊN! 1…2…1…2!",
            "LỊCH THI CỰC SIẾT! NHƯNG KHÔNG KIỆT SỨC!",
            "CỐ THÊM CHÚT NỮA, SẮP RA CHƠI RỒI!",
            "THÊM CÂU CUỐI THÔI, RA ĐÁP ÁN RỒI!"
        ]
        k2_lines = [
            "1…2…1…2!",
            "RÁNG HỌC TỚI CÙNG NHAAA,",
            "PHẢI HỌC TỚI CÙNGGGG NHA!"
        ]
    else: # WORK / OFFICE
        k1_lines = [
            f"{name_upper} ƠI CỐ LÊN! 1…2…1…2!",
            "TỪ GIỜ TĂNG CA, CHẢ LÀM TA CĂNG!?",
            "CỐ THÊM TASK NỮA, SẮP TAN CA RỒI",
            "RÁNG THÊM TÍ NỮA, SẮP TĂNG LƯƠNG RỒI!"
        ]
        k2_lines = [
            "1…2…1…2!",
            "RÁNG LÀM TỚI CÙNG NHAAA,",
            "PHẢI LÀM TỚI CÙNGGGG NHA!"
        ]

    # Màu sắc chữ
    ACTIVE_COLOR = (255, 255, 255) # Trắng sáng
    WAITING_COLOR = (38, 67, 24)    # Xanh lá sẫm #264318
    TITLE_COLOR = (253, 238, 155)  # Vàng #fdee9b
    SHADOW_COLOR = (0, 0, 0)

    # 5. PRE-RENDER TẤT CẢ TEXT LAYERS (Tiết kiệm 80% thời gian render từng frame)
    title_layer, t_ox, t_oy = make_text_layer(title_text, title_font, TITLE_COLOR, SHADOW_COLOR)
    title_pos = (345 - t_ox, 1030 - t_oy)

    lyric_x = 200
    start_y = 1399
    line_spacing = 80

    # Pre-render trạng thái chờ của Khổ 1 (trước 0.8s khi giọng đọc chưa cất lên)
    k1_waiting_overlay = Image.new("RGBA", (1080, 450), (0, 0, 0, 0))
    for idx, line in enumerate(k1_lines):
        line_img, l_ox, l_oy = make_text_layer(line, lyrics_font, WAITING_COLOR, SHADOW_COLOR)
        k1_waiting_overlay.paste(line_img, (lyric_x - l_ox, idx * line_spacing - l_oy), line_img)

    # Pre-render 4 trạng thái của Khổ 1 (mỗi trạng thái là 1 ảnh overlay hoàn chỉnh)
    k1_state_overlays = []
    for active_idx in range(len(k1_lines)):
        overlay = Image.new("RGBA", (1080, 450), (0, 0, 0, 0))
        for idx, line in enumerate(k1_lines):
            col = ACTIVE_COLOR if idx == active_idx else WAITING_COLOR
            line_img, l_ox, l_oy = make_text_layer(line, lyrics_font, col, SHADOW_COLOR)
            overlay.paste(line_img, (lyric_x - l_ox, idx * line_spacing - l_oy), line_img)
        k1_state_overlays.append(overlay)

    # Pre-render 3 trạng thái của Khổ 2
    k2_state_overlays = []
    for active_idx in range(len(k2_lines)):
        overlay = Image.new("RGBA", (1080, 450), (0, 0, 0, 0))
        for idx, line in enumerate(k2_lines):
            col = ACTIVE_COLOR if idx == active_idx else WAITING_COLOR
            line_img, l_ox, l_oy = make_text_layer(line, lyrics_font, col, SHADOW_COLOR)
            overlay.paste(line_img, (lyric_x - l_ox, idx * line_spacing - l_oy), line_img)
        k2_state_overlays.append(overlay)

    cap = cv2.VideoCapture(base_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Đo thời lượng thực tế của file âm thanh để không bao giờ bị cắt cụt đuôi video
    audio_duration = 0.0
    try:
        probe_res = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audio_path],
            capture_output=True, text=True, check=True
        )
        audio_duration = float(probe_res.stdout.strip())
        print(f"[MOTION_COMPOSER] Thời lượng audio: {audio_duration:.2f}s, video gốc: {total_frames / fps:.2f}s ({total_frames} frames)")
    except Exception as e_dur:
        print(f"[MOTION_COMPOSER_WARN] Không đo được thời lượng audio: {e_dur}")

    # Đảm bảo video kéo dài đủ để phát trọn vẹn audio (đặc biệt chủ đề học dài 17-18s)
    if audio_duration > 0:
        required_frames = int(np.ceil((audio_duration + 0.15) * fps))
        total_target_frames = max(total_frames, required_frames)
    else:
        total_target_frames = total_frames

    print(f"[MOTION_COMPOSER] Tổng số frames render: {total_target_frames} frames ({total_target_frames / fps:.2f}s)")
    
    # 6. Khởi động tiến trình FFmpeg siêu tốc (rgb24 + ultrafast + 4 threads cho máy 8 vCPU)
    ffmpeg_cmd = [
        'ffmpeg', '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{w}x{h}',
        '-pix_fmt', 'rgb24',
        '-r', str(fps),
        '-i', '-',
        '-i', audio_path,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'fastdecode',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-threads', '4',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        output_video_path
    ]
    
    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)
    thumb_saved = False

    # Chuẩn bị ảnh đầu với đệm viền (Padding) để xoay mượt mà quanh tâm mặt không bị giật OY
    hw, hh = head_pil.size
    pad = 60
    canv_w, canv_h = hw + 2 * pad, hh + 2 * pad
    head_padded = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))
    head_padded.paste(head_pil, (pad, pad))

    # Tọa độ tâm mặt trên canvas đệm (chuẩn 52% chiều cao, khớp hoàn hảo với chấm đỏ và cổ)
    pv_x = pad + hw / 2.0
    pv_y = pad + hh * 0.52

    # Cấu hình timing karaoke theo topic
    # Riêng chủ đề STUDY: Chậm hơn 0.5s theo yêu cầu để khớp chuẩn xác từng nhịp hát
    if 'STUDY' in topic.upper():
        k1_wait_t = 2.1    # 1.6 + 0.5s
        k1_line1_t = 4.3   # 3.8 + 0.5s (LỊCH THI CỰC SIẾT! NHƯNG KHÔNG KIỆT SỨC!)
        k1_line2_t = 6.3   # 5.8 + 0.5s (CỐ THÊM CHÚT NỮA, SẮP RA CHƠI RỒI!)
        k1_line3_t = 8.3   # 7.8 + 0.5s (THÊM CÂU CUỐI THÔI, RA ĐÁP ÁN RỒI!)
        k2_start_t = 10.4  # 9.9 + 0.5s (Chuyển sang Khổ 2)
        k2_line1_t = 12.6  # 12.1 + 0.5s
        k2_line2_t = 14.9  # 14.4 + 0.5s (PHẢI HỌC TỚI CÙNGGGG NHA!)
    else:
        k1_wait_t = 1.6
        k1_line1_t = 3.8
        k1_line2_t = 5.8
        k1_line3_t = 7.8
        k2_start_t = 9.9
        k2_line1_t = 12.1
        k2_line2_t = 14.4

    last_frame_bytes = None
    for f_idx in range(total_target_frames):
        if f_idx < total_frames:
            ret, frame_bgr = cap.read()
            if not ret:
                if last_frame_bytes is not None:
                    try:
                        proc.stdin.write(last_frame_bytes)
                    except (BrokenPipeError, IOError):
                        break
                continue
                
            t = f_idx / float(fps)
            
            # Chuyển frame sang PIL Image RGBA
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            frame_pil = Image.fromarray(frame_rgb).convert("RGBA")
            
            # 1. Gắn đầu avatar bám dính 100% Khớp Cổ & Dấu Đỏ & Thân Người trên trục OY
            if f_idx < len(track_data):
                td = track_data[f_idx]
                dot_x = td.get('dot_x', td.get('neck_x', td.get('x', 540)))
                dot_y = td.get('dot_y', td.get('neck_y', td.get('y', 412)))
                angle = td.get('neck_angle', td.get('angle', 0.0))
            else:
                dot_x, dot_y = 540, 412
                angle = 0.0

            # Xoay đầu quanh tâm mặt bám dính theo góc nghiêng trục Oy của cổ
            if abs(angle) > 0.1:
                head_rotated = head_padded.rotate(-angle, center=(pv_x, pv_y), resample=Image.Resampling.BILINEAR)
            else:
                head_rotated = head_padded

            # Khóa trực tiếp trục OY và OX theo Dấu Đỏ & Khớp Cổ Thân Người
            paste_x = int(dot_x - pv_x)
            paste_y = int(dot_y - pv_y + y_shift)
            frame_pil.paste(head_rotated, (paste_x, paste_y), head_rotated)
            
            # 2. Dán Tiêu Đề đã Pre-render (X = 345, Y = 1030)
            frame_pil.paste(title_layer, title_pos, title_layer)
            
            # 3. Dán Phụ Đề Karaoke đã Pre-render (Chạy theo mốc timing đã căn chỉnh chính xác)
            if t < k2_start_t:
                # Khổ 1
                if t < k1_wait_t:
                    frame_pil.paste(k1_waiting_overlay, (0, start_y), k1_waiting_overlay)
                else:
                    k1_idx = 0
                    if t >= k1_line3_t: k1_idx = 3
                    elif t >= k1_line2_t: k1_idx = 2
                    elif t >= k1_line1_t: k1_idx = 1
                    frame_pil.paste(k1_state_overlays[k1_idx], (0, start_y), k1_state_overlays[k1_idx])
            else:
                # Khổ 2 (Slide Up thay thế Khổ 1)
                k2_idx = 0
                if t >= k2_line2_t: k2_idx = 2
                elif t >= k2_line1_t: k2_idx = 1
                frame_pil.paste(k2_state_overlays[k2_idx], (0, start_y), k2_state_overlays[k2_idx])
                    
            # 4. Chuyển thẳng RGB gửi qua Pipe cho FFmpeg (Không qua numpy/cvtColor BGR thừa)
            final_rgb = frame_pil.convert("RGB")
            last_frame_bytes = final_rgb.tobytes()

            # Lưu Thumbnail Poster tại 0:01s (t >= 1.0s)
            if not thumb_saved and t >= 1.0:
                thumb_path = os.path.join(os.path.dirname(output_video_path), 'thumbnail.jpg')
                try:
                    final_rgb.save(thumb_path, "JPEG", quality=92)
                    thumb_saved = True
                    print(f"[MOTION_COMPOSER_THUMB] Đã lưu thumbnail video tại 0:01s -> {thumb_path}")
                except Exception as e_th:
                    print(f"[MOTION_COMPOSER_THUMB_ERR] Lỗi lưu thumbnail: {e_th}")

            try:
                proc.stdin.write(last_frame_bytes)
            except (BrokenPipeError, IOError):
                print("[INFO] FFmpeg closed pipe (video finished). Exiting loop.")
                break
        else:
            # Video gốc đã hết nhưng audio vẫn còn: Giữ nguyên frame cuối (Hold Frame)
            if last_frame_bytes is not None:
                try:
                    proc.stdin.write(last_frame_bytes)
                except (BrokenPipeError, IOError):
                    print("[INFO] FFmpeg closed pipe (audio finished). Exiting loop.")
                    break
        
    cap.release()
    try:
        proc.stdin.close()
    except Exception:
        pass
    proc.wait()

    # Đảm bảo thumbnail luôn tồn tại dù video kết thúc sớm
    thumb_path = os.path.join(os.path.dirname(output_video_path), 'thumbnail.jpg')
    if not os.path.exists(thumb_path) and 'final_rgb' in locals():
        try:
            final_rgb.save(thumb_path, "JPEG", quality=92)
            print(f"[MOTION_COMPOSER_THUMB_FALLBACK] Đã lưu thumbnail fallback -> {thumb_path}")
        except Exception:
            pass

    print(f"[MOTION_COMPOSER_SUCCESS] Video Full HD hoàn tất: {output_video_path}")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 8:
        print("Usage: python motion_video_composer.py <base_v> <head_p> <audio_p> <out_v> <topic> <name> <track_j> <font_p>")
        sys.exit(1)
        
    b_v, h_p, a_p, o_v, top, rec_name, tr_j, fnt_p = sys.argv[1:9]
    success = compose_motion_video(b_v, h_p, a_p, o_v, top, rec_name, tr_j, fnt_p)
    sys.exit(0 if success else 1)

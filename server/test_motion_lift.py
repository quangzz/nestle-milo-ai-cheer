from PIL import Image
import json
import os

head_orig = Image.open('e:/milo/server/jobs/job_1786766069982_tn4p/input_head.png').convert('RGBA')

configs = {
    'study': {'scale': 1.15, 'shift': -65, 'track': 'e:/milo/server/services/neck_motion_study.json', 'frames': 'e:/milo/MILO-20260815T030710Z-1-001/MILO/milo_material/frames/study'},
    'office': {'scale': 1.10, 'shift': -68, 'track': 'e:/milo/server/services/neck_motion_office.json', 'frames': 'e:/milo/MILO-20260815T030710Z-1-001/MILO/milo_material/frames/office'},
    'workout': {'scale': 1.10, 'shift': -65, 'track': 'e:/milo/server/services/neck_motion_workout.json', 'frames': 'e:/milo/MILO-20260815T030710Z-1-001/MILO/milo_material/frames/workout'}
}

for top, cfg in configs.items():
    s = cfg['scale']
    head = head_orig.resize((int(head_orig.width * s), int(head_orig.height * s)), Image.Resampling.LANCZOS)
    hw, hh = head.size
    pad = 60
    padded = Image.new('RGBA', (hw + 2*pad, hh + 2*pad), (0,0,0,0))
    padded.paste(head, (pad, pad))
    pv_x = pad + hw / 2.0
    pv_y = pad + hh * 0.52

    with open(cfg['track'], 'r', encoding='utf-8') as f:
        track = json.load(f)

    for f_idx in [1, 150, 300]:
        td = track[f_idx - 1]
        dot_x, dot_y, angle = td['dot_x'], td['dot_y'], td['neck_angle']

        rot = padded.rotate(-angle, center=(pv_x, pv_y), resample=Image.Resampling.BILINEAR)

        frame_path = os.path.join(cfg['frames'], f'frame_{f_idx:04d}.png')
        frame = Image.open(frame_path).convert('RGBA')
        paste_x = int(dot_x - pv_x)
        paste_y = int(dot_y - pv_y + cfg['shift'])
        frame.paste(rot, (paste_x, paste_y), rot)

        crop = frame.crop((int(dot_x - 220), int(dot_y - 250), int(dot_x + 220), int(dot_y + 250)))
        crop.convert('RGB').save(f'e:/milo/server/test_composite_output/motion_{top}_f{f_idx}.jpg', quality=95)

print('Done rendering multiple motion frames!')

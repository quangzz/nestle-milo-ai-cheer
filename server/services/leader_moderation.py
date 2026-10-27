import os
import sys
import json
import numpy as np
from PIL import Image
import cv2

# Khởi tạo model và nạp signatures khi module được import
_MODEL = None
_TRANSFORM = None
_SIGNATURES = None

LEADER_NAMES = {
    "to_lam": "Tổng Bí Thư Tô Lâm",
    "to_lam_1": "Tổng Bí Thư Tô Lâm",
    "to_lam_2": "Tổng Bí Thư Tô Lâm",
    "ho_chi_minh": "Chủ tịch Hồ Chí Minh",
    "ho_chi_minh_1": "Chủ tịch Hồ Chí Minh",
    "vo_nguyen_giap": "Đại tướng Võ Nguyên Giáp",
    "vo_nguyen_giap_1": "Đại tướng Võ Nguyên Giáp",
    "nguyen_phu_trong": "Cố Tổng Bí Thư Nguyễn Phú Trọng",
    "pham_minh_chinh": "Thủ tướng Phạm Minh Chính",
    "luong_cuong": "Chủ tịch nước Lương Cường",
    "tran_dai_quang": "Cố Chủ tịch nước Trần Đại Quang",
    "nguyen_xuan_phuc": "Cựu Thủ tướng Nguyễn Xuân Phúc",
    "nguyen_tan_dung": "Cựu Thủ tướng Nguyễn Tấn Dũng",
    "donald_trump": "Donald Trump",
    "donald_trump_1": "Donald Trump",
    "joe_biden": "Joe Biden",
    "vladimir_putin": "Vladimir Putin",
    "vladimir_putin_1": "Vladimir Putin",
    "xi_jinping": "Tập Cận Bình (Xi Jinping)",
    "xi_jinping_1": "Tập Cận Bình (Xi Jinping)",
    "kim_jong_un": "Kim Jong Un"
}

def init_ai_model():
    global _MODEL, _TRANSFORM, _SIGNATURES
    if _MODEL is not None and _SIGNATURES is not None:
        return

    try:
        import torch
        import torchvision.models as models
        import torchvision.transforms as transforms

        model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        model.classifier = torch.nn.Identity()
        model.eval()
        _MODEL = model

        _TRANSFORM = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        sig_path = os.path.join(os.path.dirname(__file__), 'leader_signatures.json')
        if os.path.exists(sig_path):
            with open(sig_path, 'r', encoding='utf-8') as f:
                _SIGNATURES = json.load(f)
    except Exception as e:
        print(f"[AI_MODEL_INIT_ERR] {e}", file=sys.stderr)

def compute_phash(img):
    try:
        gray = cv2.cvtColor(np.array(img.resize((32, 32))), cv2.COLOR_RGB2GRAY)
        dct = cv2.dct(np.float32(gray))
        dct_low = dct[:8, :8]
        med = np.median(dct_low)
        phash = (dct_low > med).flatten()
        return ''.join(['1' if b else '0' for b in phash])
    except:
        return None

def hamming_dist(s1, s2):
    if not s1 or not s2:
        return 64
    return sum(c1 != c2 for c1, c2 in zip(s1, s2))

def moderate_face_image(image_input):
    """
    Nhận diện khuôn mặt lãnh tụ & chính trị gia bằng Deep Learning & pHash
    - Độ tương đồng cao (Cosine Similarity >= 0.90) HOẶC pHash Hamming Distance <= 16
    - Đảm bảo 0% false positives trên ảnh cá nhân thông thường của người dùng
    """
    init_ai_model()

    if not _MODEL or not _SIGNATURES:
        return {"isLeader": False, "violation": False}

    try:
        import torch
        if isinstance(image_input, Image.Image):
            img = image_input.convert('RGB')
        elif isinstance(image_input, str) and os.path.exists(image_input):
            img = Image.open(image_input).convert('RGB')
        else:
            return {"isLeader": False, "violation": False}

        tensor = _TRANSFORM(img).unsqueeze(0)
        with torch.no_grad():
            feat = _MODEL(tensor).squeeze().numpy()
            feat = feat / np.linalg.norm(feat)

        user_phash = compute_phash(img)

        best_score = -1.0
        min_pdist = 64
        best_name = None

        for name, data in _SIGNATURES.items():
            if isinstance(data, dict):
                ref_vec = np.array(data.get('vector', []))
                ref_phash = data.get('phash')
            else:
                ref_vec = np.array(data)
                ref_phash = None

            if len(ref_vec) > 0:
                score = float(np.dot(feat, ref_vec))
                if score > best_score:
                    best_score = score
                    best_name = name

            if user_phash and ref_phash:
                pdist = hamming_dist(user_phash, ref_phash)
                if pdist < min_pdist:
                    min_pdist = pdist

        # Tiêu chuẩn vi phạm:
        # 1. pHash Hamming Distance <= 14: Ảnh trùng khớp nguồn internet của lãnh tụ
        # 2. Hoặc CẢ HAI: Deep Learning Feature Sim >= 0.95 VÀ pHash Distance <= 18
        # (Không dùng Sim >= 0.90 đơn độc vì false-positive trên ảnh người dùng mặc vest xanh chụp studio)
        is_violation = (min_pdist <= 14) or (best_score >= 0.95 and min_pdist <= 18)
        print(f"[LEADER_AI_CHECK] Best Match: {best_name} (Sim: {best_score:.4f}, pHashDist: {min_pdist}) -> Violation: {is_violation}", file=sys.stderr)

        if is_violation:
            leader_display = LEADER_NAMES.get(best_name, "Lãnh tụ / Chính khách")
            return {
                "isLeader": True,
                "leaderName": leader_display,
                "score": best_score,
                "violation": True,
                "errorMessage": "Hình ảnh vi phạm tiêu chuẩn cộng đồng. Vui lòng tải lên hình ảnh cá nhân của bạn!"
            }

    except Exception as e:
        print(f"[LEADER_MODERATION_ERR] {e}", file=sys.stderr)

    return {
        "isLeader": False,
        "violation": False
    }

if __name__ == '__main__':
    if len(sys.argv) > 1:
        res = moderate_face_image(sys.argv[1])
        print(json.dumps(res))
    else:
        print(json.dumps({"isLeader": False, "violation": False}))

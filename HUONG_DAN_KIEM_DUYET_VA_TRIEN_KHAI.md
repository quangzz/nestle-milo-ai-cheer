# TÀI LIỆU BÀN GIAO & HƯỚNG DẪN KIỂM DUYỆT BẢO MẬT (MILO 2026)

> **Dự án:** CÙNG MILO CỔ VŨ TỚI CÙNG (AI Cheer Video Generation Campaign 2026)  
> **Khách hàng:** Nestlé Việt Nam  
> **Tiêu chuẩn kiểm thử:** OWASP ASVS v4.0.3 Level 2, OWASP API Security Top 10 (2023), URAH Network Agent Standards.  
> **Ngày xuất bản:** 08/10/2026  

---

## 📌 1. TỔNG QUAN DỰ ÁN & KIẾN TRÚC HỆ THỐNG

Hệ thống bao gồm 2 phân hệ chính hoạt động độc lập và bảo mật:
1. **Frontend Web App (Client):** 
   - Framework: React 19 / TypeScript / Vite / Tailwind CSS v4.
   - Chức năng: Giới thiệu chiến dịch, thu thập thông tin, xác thực OTP, tải ảnh cá nhân, chọn chủ đề và trình phát video/karaoke cổ vũ.
   - Thư mục mã nguồn: `src/`, tài nguyên ảnh: `public/`, bản build tối ưu: `dist/`.
2. **Backend Media Engine (Server):**
   - Framework: Node.js Express 4.x tích hợp các module Python AI (OpenCV, FFmpeg, PyTorch, MediaPipe).
   - Chức năng:
     - Nhận diện khuôn mặt người dùng và kiểm duyệt an toàn hình ảnh lãnh tụ / chính khách AI (`detect_face.py`).
     - Lọc nội dung Brand Safety đa tầng chống từ cấm, chính trị, đối thủ cạnh tranh (`brandSafety.js`).
     - Tích hợp cổng gửi OTP Zalo ZNS / Voice Call qua Abenla Gateway (`smsService.js`).
     - Sinh giọng nói AI cá nhân hóa qua ElevenLabs TTS Model `eleven_v3` (`voiceService.js`).
     - Ghép khung hình chuyển động cổ và video Full HD bằng FFmpeg 4 luồng (`motion_video_composer.py`).
     - Đồng bộ lưu trữ và phân phối video qua Google Firebase Storage (`firebaseStorage.js`).
   - Thư mục mã nguồn: `server/`.

---

## 🛡️ 2. BÁO CÁO AN NINH & BẢO VỆ MẬT MÃ (SECURITY AUDIT COMPLIANCE)

Mã nguồn trong gói bàn giao này đã vượt qua quy trình **SecureVibes 5-Pass Security Audit Pipeline** với kết quả **100% ĐẠT TIÊU CHUẨN AN TOÀN DOANH NGHIỆP**:
- **Báo cáo an ninh chi tiết:** Xem tại tệp [`.securevibes/scan_report.md`](.securevibes/scan_report.md).

### Các chốt chặn an ninh tiêu biểu đã triển khai:
1. **Bảo vệ Secret & API Key (CWE-798):**
   - 100% không có khóa API hay mật khẩu cứng nào trong mã nguồn giao diện (`src/`, `dist/`).
   - Các khóa kết nối nhạy cảm (ElevenLabs, Abenla) được cô lập hoàn toàn tại máy chủ backend qua biến môi trường `.env` (không chia sẻ công khai). Gói bàn giao cung cấp tệp mẫu `.env.example`.
2. **Xác thực API Chống DoS / Bào mòn Ngân sách (API2:2023 / CWE-306):**
   - Cổng tạo video `POST /api/generate-cheer` bắt buộc phải có vé xác thực `verificationToken` đã ký HMAC-SHA256 (hạn 15 phút) cấp từ lượt nhập đúng OTP của người dùng. Ngăn chặn bot tự động gọi API làm hao hụt tài khoản AI.
3. **CORS Whitelist chặt chẽ (API7:2023):**
   - Backend chỉ cho phép request từ các domain chính thức của Nestlé (`giadinhnestle.com.vn`, `cungmilocovutoicung...`) và môi trường kiểm thử.
4. **CSPRNG Mật mã học (CWE-330):**
   - 100% mã OTP và mã phiên JobId được sinh bằng bộ sinh số ngẫu nhiên an toàn của Node.js Crypto (`crypto.randomInt`, `crypto.randomBytes`).
5. **Chống Command Injection & SSRF (CWE-78 / API6:2023):**
   - Gọi FFmpeg và Python hoàn toàn bằng mảng tham số phân tách (`execFile`, `subprocess.Popen` với `shell=False`).
   - Cổng tải video kiểm tra Whitelist tên miền nguồn và bắt buộc HTTPS.
6. **Bảo vệ Hệ thống Tệp & Quyền riêng tư (CWE-209 / CWE-200):**
   - Mọi API trả kết quả đều đã loại bỏ các đường dẫn ổ đĩa tuyệt đối trên server nội bộ.

---

## 🚀 3. HƯỚNG DẪN KHỞI CHẠY DÀNH CHO BỘ PHẬN KIỂM DUYỆT (QA / TECH AUDIT)

### 3.1. Yêu cầu Môi trường Máy chủ
- **Node.js:** v18.x trở lên (khuyên dùng Node v20.x hoặc v22.x LTS).
- **Python:** 3.10 trở lên (có cài đặt `pip`).
- **FFmpeg & FFprobe:** Đã cài đặt và có trong biến môi trường `PATH`.

### 3.2. Cài đặt & Khởi động Backend Media Server
```bash
# 1. Di chuyển vào thư mục backend
cd server

# 2. Cài đặt các gói phụ thuộc Node.js
npm install

# 3. Cài đặt các thư viện Python xử lý hình ảnh và video
pip install -r requirements.txt

# 4. Thiết lập biến môi trường
# Tạo file .env từ file mẫu .env.example và điền các khóa dịch vụ của bạn
cp .env.example .env

# 5. Khởi động máy chủ backend
npm start
# Máy chủ sẽ lắng nghe tại: http://localhost:5000 (hoặc PORT được chỉ định trong .env)
```

### 3.3. Cài đặt & Khởi động Frontend Web App
```bash
# 1. Tại thư mục gốc dự án
npm install

# 2. Chạy môi trường phát triển (Development Mode)
npm run dev

# 3. Hoặc kiểm tra bản build tối ưu Production (Preview Mode)
npm run build
npm run preview
```

---

## 📁 4. CẤU TRÚC THƯ MỤC TRONG GÓI BÀN GIAO

```
milo_clean_deliverable/
├── .agent_v2.0/            # Bộ quy chuẩn Agent Standards & Lessons Learnt 2026
├── .agents/                # Skill audit bảo mật (backend, frontend, securevibes)
├── .platform/              # Cấu hình định tuyến hạ tầng Nestlé Platform.sh
├── .securevibes/           # Báo cáo đánh giá an ninh mã nguồn chi tiết
├── dist/                   # Bản build Frontend đã tối ưu hóa cho Production
├── public/                 # Tài nguyên hình ảnh, video mẫu, phông chữ của giao diện
├── server/                 # Toàn bộ mã nguồn Backend Node.js Express & Python AI
│   ├── services/           # Các dịch vụ xử lý khuôn mặt, lọc từ cấm, sinh voice, ghép video
│   ├── package.json        # Dependencies của backend
│   ├── requirements.txt    # Danh sách thư viện Python cần thiết
│   ├── server.js           # Điểm vào chính của máy chủ API
│   └── .env.example        # Mẫu khai báo biến môi trường máy chủ
├── src/                    # Toàn bộ mã nguồn Frontend React + TypeScript
│   ├── app/                # Components (UI, Features, Layout), Context, Hooks, Utils
│   ├── assets/             # Assets tĩnh
│   ├── styles/             # Cấu hình CSS và Theme tokens
│   └── App.tsx, main.tsx   # Khởi tạo ứng dụng React
├── .env.example            # Mẫu biến môi trường tổng
├── .gitignore              # Danh sách loại trừ an toàn
├── firebase.json           # Cấu hình triển khai Firebase Hosting & Storage
├── index.html              # HTML gốc của ứng dụng
├── package.json            # Dependencies và build scripts Frontend
├── storage.rules           # Quy tắc bảo mật đám mây Firebase Storage (Đã thắt chặt)
├── tsconfig.json           # Cấu hình trình biên dịch TypeScript
├── vite.config.ts          # Cấu hình đóng gói Vite
└── HUONG_DAN_KIEM_DUYET_VA_TRIEN_KHAI.md # Tài liệu hướng dẫn này
```

---
*Gói mã nguồn này đã được làm sạch hoàn toàn: Không chứa file thực thi (.exe), không chứa file lịch sử git rác, không chứa dependencies trung gian thừa (node_modules).*

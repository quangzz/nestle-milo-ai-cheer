# HƯỚNG DẪN TRIỂN KHAI BACKEND MILO LÊN MÁY CHỦ VM (UBUNTU / DEBIAN / DOCKER)

---

## 🌟 TỔNG QUAN HỆ THỐNG
Milo Backend Engine bao gồm:
- **Node.js (Express):** Điều phối API, xác thực Zalo/Voice OTP qua Abenla, quản lý Jobs.
- **Python 3 (PyTorch + OpenCV + Rembg):** Bóc tách khuôn mặt AI, nhận diện & chặn vi phạm lãnh tụ, Motion Tracking & Render video Full HD.
- **FFmpeg:** Xử lý ghép âm thanh và xuất video MP4.

---

## 🚀 CÁCH 1: CÀI ĐẶT TỰ ĐỘNG 1 LỆNH TRÊN UBUNTU / DEBIAN (KHUYÊN DÙNG)

### Bước 1: Đẩy mã nguồn lên máy chủ VM
Trên máy tính cá nhân, bạn có thể đẩy toàn bộ thư mục dự án lên VM qua Git hoặc lệnh `scp` / `rsync`:
```bash
# Ví dụ đẩy qua SCP (thay user và ip của VM bạn):
scp -r e:/milo user@your-vm-ip:/var/www/milo
```
*Hoặc clone từ Git Repository vào thư mục `/var/www/milo`.*

---

### Bước 2: Chạy Script Cài đặt Tự Động
Đăng nhập SSH vào máy chủ VM và chạy:
```bash
cd /var/www/milo
chmod +x setup_ubuntu_vm.sh
bash setup_ubuntu_vm.sh
```
*Script sẽ tự động cài đặt:*
- `FFmpeg`, `Python 3`, `pip`, `Node.js v20 LTS`, `PM2`, `Nginx`.
- `PyTorch CPU`, `torchvision`, `OpenCV`, `Rembg`, `onnxruntime`.
- Cài đặt `npm dependencies` và khởi chạy máy chủ ngầm với **PM2**.

---

### Bước 3: Quản lý Backend với PM2
- Xem trạng thái server: `pm2 status`
- Xem log thời gian thực: `pm2 logs milo-backend`
- Khởi động lại: `pm2 restart milo-backend`
- Dừng server: `pm2 stop milo-backend`

---

## 🐳 CÁCH 2: TRIỂN KHAI BẰNG DOCKER & DOCKER-COMPOSE (1 LỆNH)

Nếu máy chủ của bạn đã có Docker:
```bash
cd /var/www/milo
docker-compose up -d --build
```
- Kiểm tra logs: `docker-compose logs -f`
- Dừng container: `docker-compose down`

---

## 🔒 BƯỚC 4: CẤU HÌNH DOMAIN & HTTPS (SSL MIỄN PHÍ)

### 1. Cấu hình Nginx Reverse Proxy
```bash
sudo cp /var/www/milo/nginx_milo.conf /etc/nginx/sites-available/milo.conf
sudo ln -s /etc/nginx/sites-available/milo.conf /etc/nginx/sites-enabled/
# Mở file và sửa domain của bạn:
sudo nano /etc/nginx/sites-available/milo.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Cài đặt chứng chỉ SSL HTTPS miễn phí với Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## 🌐 BƯỚC 5: KẾT NỐI FRONTEND VỚI BACKEND VM MỚI
Khi có IP hoặc Domain của VM (VD: `https://api.yourdomain.com`), bạn chỉ cần cập nhật URL này vào 3 file Frontend:
1. `src/app/utils/faceApi.ts`
2. `src/app/utils/otpApi.ts`
3. `src/app/context/CheerCampaignContext.tsx`

Sau đó chạy `npm run build && npx firebase deploy --only hosting` là hệ thống Web Live sẽ kết nối trực tiếp đến máy chủ VM của bạn!

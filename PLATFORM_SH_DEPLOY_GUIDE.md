# HƯỚNG DẪN ĐẨY TRANG WEB LÊN NESTLÉ WEBCMS PLATFORM.SH

- **Project URL:** `https://console.nestle.platform.sh/nestle-webcms/ljf6eaf47kp6q`
- **Project ID:** `ljf6eaf47kp6q`

---

## 🚀 HƯỚNG DẪN THỰC HIỆN ĐẨY CODE (GIT DEPLOYMENT)

### Bước 1: Mở Terminal tại thư mục dự án `e:\milo`

---

### Bước 2: Thêm Git Remote của Nestlé Platform.sh
Chạy lệnh sau để gắn remote repository của Nestlé Platform.sh:
```bash
git remote add platform ljf6eaf47kp6q@git.nestle.platform.sh:ljf6eaf47kp6q.git
```
*(Nếu remote `platform` đã tồn tại từ trước, bạn có thể kiểm tra bằng `git remote -v` hoặc đổi URL bằng `git remote set-url platform ljf6eaf47kp6q@git.nestle.platform.sh:ljf6eaf47kp6q.git`)*

---

### Bước 3: Commit toàn bộ mã nguồn & tệp cấu hình Platform.sh
```bash
git add .
git commit -m "feat: deploy Milo web app to Nestle WebCMS Platform.sh"
```

---

### Bước 4: Đẩy mã nguồn lên nhánh chính của Platform.sh
```bash
git push platform main
```
*(Hoặc `git push platform master` tùy theo tên nhánh mặc định của dự án trên Platform.sh Console).*

---

### Bước 5: Cấu hình biến môi trường an toàn trên Console Nestlé
Truy cập **Settings -> Variables** trên trang quản trị dự án `https://console.nestle.platform.sh/nestle-webcms/ljf6eaf47kp6q` và thêm các biến bảo mật từ tệp `.env`:
- `env:ELEVENLABS_API_KEY` = `<YOUR_ELEVENLABS_API_KEY>`
- `env:ABENLA_LOGIN_NAME` = `<YOUR_ABENLA_LOGIN_NAME>`
- `env:ABENLA_PASSWORD` = `<YOUR_ABENLA_PASSWORD>`
- `env:ABENLA_SERVICE_TYPE_ID` = `537`
- `env:ABENLA_BRAND_NAME` = `ZOTP`

---

### Bước 6: Nghiệm thu & Kiểm tra
1. Platform.sh sẽ tự động biên dịch `npm run build` và khởi động container web server.
2. Tự động cấp phát chứng chỉ SSL/TLS 1.3 và định tuyến tên miền chính thức của Nestlé.
3. Truy cập đường link dự án hiển thị trên Console để kiểm tra toàn bộ 9 bước trải nghiệm mượt mà!

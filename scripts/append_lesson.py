import os

lesson = """
---

## 20. Giải Pháp Tải Video & Ảnh Trực Tiếp Vào Album Ảnh (Photos / Camera Roll) Trên Safari iOS
- **Hạn chế cố hữu của Safari trên iOS:** Thẻ `<a href="..." download="...">` trên iOS Safari KHÔNG thể tự động ghi file vào ứng dụng Ảnh (Photos / Cuộn camera), mà chỉ lưu vào ứng dụng **Tệp (Files)** ở thư mục *Tải về*, gây khó khăn cho người dùng khi muốn tìm lại video để đăng mạng xã hội.
- **Giải pháp chính thống chuẩn Apple:**
  1. Sử dụng **Web Share API** với đối tượng file (`navigator.canShare({ files: [videoFile] })`).
  2. Khi người dùng nhấn nút Tải xuống:
     - `fetch()` nội dung video thành `Blob`, bọc thành `File([blob], fileName, { type: 'video/mp4' })`.
     - Kích hoạt `navigator.share({ files: [file], title, text })` để mở Native Action Sheet của iOS.
     - iOS sẽ cung cấp sẵn tùy chọn **"Lưu video" (Save Video)** / **"Lưu hình ảnh" (Save Image)** để người dùng lưu trực tiếp vào Thư viện ảnh (Photos) của iPhone/iPad chỉ với 1 chạm.
  3. **Cơ chế Fallback & UX:**
     - Hiển thị Toast hướng dẫn tinh tế trên iOS: *"Nhấn 'Lưu video' trong menu chia sẻ để lưu vào Album ảnh"*.
     - Bắt lỗi `AbortError` khi người dùng chủ động đóng menu chia sẻ (không hiển thị thông báo lỗi).
     - Đối với Desktop / trình duyệt không hỗ trợ Web Share File: Tự động Fallback sang tạo Blob Object URL (`URL.createObjectURL`) và kích hoạt thẻ tải về bình thường.
"""

target = 'e:/ntf2026/.agents/lessons.md'
if os.path.exists(target):
    with open(target, 'a', encoding='utf-8') as f:
        f.write(lesson)
    print("Lesson saved to ntf2026/.agents/lessons.md")

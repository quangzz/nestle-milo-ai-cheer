# PULL REQUEST & QUALITY GUARDRAILS (BẮT BUỘC)

## 1. Nguyên tắc kích thước
- Giữ PR cực kỳ nhỏ và tập trung (tối đa 5-10 files thay đổi).
- Không trộn lẫn nhiều tính năng/sửa lỗi khác nhau vào chung một PR.

## 2. Minh chứng thực thi (Evidence of Success)
- KHÔNG chỉ báo cáo là "đã chạy thử". Mọi PR bắt buộc phải ghi lại evidence rõ ràng trong `artifacts/`.
- Nếu có thay đổi giao diện (UI): Phải dùng công cụ quay màn hình/chụp ảnh để lưu kết quả vào thư mục artifacts.
- Nếu là logic backend/API: Phải chạy test suite hoặc ghi lại console log kết quả chạy thực tế.

## 3. Nhật ký quyết định (Decision Log)
- Giải trình ngắn gọn trong báo cáo/PR (ví dụ trong `walkthrough.md` hoặc PR description):
  1. Tại sao lại sửa/làm theo cách này? (Mục đích kinh doanh/kỹ thuật)
  2. Quyết định kiến trúc/công nghệ cốt lõi nào đã được đưa ra?
  3. Rủi ro hoặc tác động của thay đổi này là gì?

## 4. Liêm chính trong Testing (No Cheating Tests)
- Nghiêm cấm mock qua loa hoặc sửa test case một cách gian lận chỉ để pass CI.
- Đọc kỹ phần test diff khi review để phát hiện "mẹo" của AI bypass test.

---
trigger: always_on
---

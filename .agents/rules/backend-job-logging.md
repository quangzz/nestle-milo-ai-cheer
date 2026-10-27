# Quy tắc Logging Backend theo Job (Phiên làm việc)

Mỗi phiên làm việc (hoặc một request cycle quan trọng) trên Backend **BẮT BUỘC** phải được lưu trữ dưới dạng một thư mục riêng trong thư mục `jobs/` ở thư mục gốc của backend.

## Cấu trúc thư mục Job
Cấu trúc cho mỗi job folder `jobs/<job_id>/`:
- `status.json` / `status.txt`: Trạng thái hiện tại của job (VD: PENDING, RUNNING, SUCCESS, FAILED).
- `log.txt`: Chứa toàn bộ console.log và stderr diễn ra trong phiên.
- `llm_calls.json`: Logs chi tiết các lời gọi LLM (prompt, response, tokens) nếu có.
- `api_calls.json`: Logs chi tiết các lời gọi external API hoặc internal call quan trọng.
- `result.json`: Kết quả cuối cùng trả về.

## Yêu cầu triển khai
Tất cả các kết quả làm đến đâu phải được write/append vào file tương ứng đến đó để dễ dàng tra cứu và debug, ngay cả khi server crash giữa chừng.

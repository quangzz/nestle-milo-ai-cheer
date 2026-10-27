# AGENTIC ENGINEERING DISCIPLINE & PRACTICAL RULES (BẮT BUỘC)

## 1. HARNESS & SPEC-DRIVEN DEVELOPMENT (Chống Vibe Coding tự phát)
* **Luật cứng**: Cấm sửa code bừa bãi và cấm bàn giao code khi chưa chạy thử thành công. Code chỉ là một phiên bản triển khai tạm thời, **Tài liệu Đặc tả (Spec) mới là nguồn tri thức thực tế duy nhất (Source of Truth)**.
* **Quy trình**:
  1. **Plan Phase**: Với tác vụ lớn/refactor, bắt buộc đọc hoặc cập nhật tài liệu thiết kế trong `/specs/` (ví dụ: `technical_design.md` hoặc các file `.feature.md` dạng BDD Gherkin) trước khi viết code.
  2. **Execution Phase**: Khi viết code, bắt buộc chạy thử lệnh compile/test (`npm run build`, `tsc --noEmit` hoặc `pytest`). Nếu lỗi, Agent phải tự đọc log và sửa (Error-Loop Recovery) tối đa 3 lần trước khi hỏi User.
  3. **Sync Phase**: Khi code thay đổi cấu trúc database/API, Agent bắt buộc phải tự động cập nhật lại các tệp spec tương ứng trong `/specs/` và tự viết thêm test case để chứng minh.

## 2. FILE BUS & POINTER PASSING (Chống tràn Context Window)
* **Luật cứng**: Không nhồi nhét log thô hoặc cục JSON dữ liệu lớn vào Prompt/Context.
* **Quy trình**: 
  1. Khi chạy job nặng, ghi toàn bộ log thô vào file `/jobs/<job_id>/log.txt`.
  2. Giữa các Agent hoặc các bước xử lý, chỉ truyền đường dẫn file tham chiếu (Pointer): `{ status: "success", logUrl: "/jobs/123/log.txt" }` thay vì truyền text thô.

## 3. PROJECT WIKI - LLM WIKI & HYBRID INFERENCE (Chống trôi kiến trúc)
* **Luật cứng**: Mọi tri thức dự án phải được lưu trữ tập trung tại thư mục `.agents/wiki/` tại root.
* **Cấu trúc**: `.agents/wiki/raw/` (specs thô bất biến), `.agents/wiki/docs/` (tài liệu thiết kế động), `index.md` & `log.md`.
* **Định tuyến thông minh (Hybrid Inference)**: Trong các hệ thống tích hợp AI, ưu tiên dùng mô hình local/nhẹ (on-device/lightweight) làm router phân loại nhanh yêu cầu, chỉ gửi lên mô hình cloud cao cấp khi thực sự cần xử lý tác vụ phức tạp/codebase lớn để tối ưu chi phí.

## 4. RISK-BASED PR & VIBE DIFF (Bảo mật & Phê duyệt)
* **Luật cứng**:
  1. Khi gửi code cho User duyệt, Agent phải viết tóm tắt bằng ngôn ngữ tự nhiên (Vibe Diff) giải thích rõ: "File nào đổi, thay đổi logic gì, có rủi ro gì không?".
  2. Phân lớp phê duyệt PR:
     - **Low Risk (Typo, minor patches)**: Auto-merge khi pass 100% CI.
     - **Medium Risk (Local logic)**: Gom theo lô (batch digest) để User duyệt nhanh một lượt hàng ngày.
     - **High Risk (Architectural/Security changes)**: Bắt buộc User review thủ công chi tiết.
  3. Người dùng chuyển trọng tâm từ review từng dòng code thô (code syntax) sang review các ca kiểm thử hành vi (behavioral tests/assertions) do Agent viết để chứng minh code chạy đúng.

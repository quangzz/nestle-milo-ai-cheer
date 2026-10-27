---
name: securevibes-audit
description: Quy trình kiểm thử an ninh chuyên sâu đa tác tử (Multi-Agent 5-Pass Security Audit) theo chuẩn SecureVibes (Anshuman Bhartiya). Thực hiện 5 lượt thẩm định độc lập từ Architecture Discovery, STRIDE Threat Modeling, Deep Code Review, False-Positive Elimination đến xuất báo cáo chuẩn tại `.securevibes/scan_report.md`.
---

# Skill: SecureVibes Multi-Agent Security Audit (5-Pass Pipeline)

Skill này hướng dẫn AI Coding Agent thực hiện quy trình kiểm thử bảo mật chuyên sâu mô phỏng kiến trúc đa tác tử của **SecureVibes** (phát triển bởi Anshuman Bhartiya - AppSec Tech Lead tại Lyft). Mục tiêu là phát hiện triệt để các lỗ hổng logic nghiệp vụ, phân quyền phức tạp (IDOR/BOLA) và các rủi ro trong ứng dụng "vibe-coded" mà các bộ linter truyền thống thường bỏ sót.

---

## 🧭 I. QUY TRÌNH 5 LƯỢT THẨM ĐỊNH ĐỘC LẬP (5 INDEPENDENT PASSES)

Khi nhận lệnh kích hoạt audit bảo mật chuyên sâu, Agent **BẮT BUỘC** thực hiện tuần tự qua 5 lượt thẩm định sau:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SECUREVIBES 5-PASS AUDIT WORKFLOW                                    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PASS 1: Architecture & Attack Surface Discovery  ──► Nhận diện cấu trúc, định tuyến, auth gateways    │
│ PASS 2: STRIDE Threat Modeling                   ──► Lập mô hình đe dọa (Spoofing, Tampering, EoP...) │
│ PASS 3: Deep Source-Code Review                  ──► Quét logic nghiệp vụ, IDOR, Injection, Mass Assign│
│ PASS 4: False-Positive Elimination (Verification)──► Đọc FULL context mã nguồn, loại bỏ cảnh báo sai   │
│ PASS 5: Executive Report Compilation             ──► Xuất báo cáo cấu trúc vào .securevibes/report.md  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Pass 1 — Architecture & Attack Surface Discovery
* Phân tích cấu trúc thư mục, `package.json`, framework (`NestJS`, `Express`, `Next.js`, `FastAPI`, v.v.).
* Xác định các điểm vào (Entry Points): Controllers, Routes, Middleware, Edge Handlers, Public Endpoints.
* Phân loại vùng tin cậy (Trust Boundaries): Client Component, Server Component, Private Backend API, External Webhook.

### 2. Pass 2 — STRIDE Threat Modeling
Áp dụng mô hình STRIDE của Microsoft trên từng thành phần hệ thống:
* **S (Spoofing):** Giả mạo người dùng, giả mạo Webhook, bypass header định danh.
* **T (Tampering):** Thay đổi tham số giá tiền, số lượng, quyền hạn trong request payload.
* **R (Repudiation):** Thiếu audit trail hoặc log truy vết các hành động quan trọng (đổi mật khẩu, xóa dữ liệu).
* **I (Information Disclosure):** Rò rỉ thông tin cấu hình nội bộ, PII khách hàng, secret key trong client bundle.
* **D (Denial of Service / Wallet):** Lặp vô hạn, cạn kiệt tài nguyên máy chủ hoặc tài khoản LLM AI.
* **E (Elevation of Privilege):** Leo thang đặc quyền ngang (IDOR) hoặc dọc (User lên Admin).

### 3. Pass 3 — Deep Source-Code Review
Đọc chi tiết mã nguồn trên các vị trí nhạy cảm:
* **Access Control:** Kiểm tra từng endpoint xem ID truyền vào (`id`, `userId`) có được validate dựa trên `req.user.id` từ Token hay không.
* **Input & Mass Assignment:** Có class DTO với validator (`class-validator`, `zod`) không, hay dùng object tự do.
* **Client Security:** Tìm `localStorage` chứa token, `dangerouslySetInnerHTML`, `target="_blank"` thiếu `noopener`.

### 4. Pass 4 — False-Positive Elimination & Ground Truth Verification (BẮT BUỘC)
* **Quy tắc vàng:** Không bao giờ kết luận lỗi chỉ dựa trên 1 dòng code hoặc grep regex đơn thuần.
* **Đọc Full Context:** Agent phải đọc toàn bộ file chứa đoạn code đó, kiểm tra xem tầng trên có:
  * Global Guard (`ValidationPipe({ whitelist: true })`, `JwtAuthGuard`) ở `main.ts` hoặc controller-level?
  * Middleware (`middleware.ts`) chặn tại Edge?
  * Lớp sanitize dữ liệu trước khi lưu DB?
* Chỉ giữ lại các phát hiện đã được xác minh là lỗi thực tế (Exploitable) kèm bằng chứng mã nguồn rõ ràng.

### 5. Pass 5 — Executive Report Compilation
Tạo thư mục `.securevibes/` trong thư mục gốc dự án và ghi kết quả vào tệp `.securevibes/scan_report.md`.

---

## 📝 II. CHUẨN ĐẦU RA BÁO CÁO (`.securevibes/scan_report.md`)

Báo cáo xuất ra **BẮT BUỘC** có cấu trúc chuẩn như sau:

````markdown
# SecureVibes Security Assessment Report

> *Compiled from `.securevibes/scan_report.md` via 5 independent source-code verification passes (backend/frontend read in full for each cited finding).*

## 📊 1. Executive Summary
- **Target Project:** [Tên dự án]
- **Assessment Date:** YYYY-MM-DD
- **Total Verified Findings:** [Số lượng]
- **Risk Severity Breakdown:**
  - 🔴 **Critical:** X
  - 🟠 **High:** Y
  - 🟡 **Medium:** Z
  - 🔵 **Low / Informational:** N

---

## 🎯 2. Attack Surface & Architecture Overview
- **Backend Architecture:** [NestJS / Express / Prisma ...]
- **Frontend Architecture:** [Next.js App Router / React ...]
- **Authentication Mechanism:** [HttpOnly Cookie / JWT / OAuth ...]
- **Database & State:** [PostgreSQL / Redis ...]

---

## 🔍 3. Detailed Vulnerability Findings

### [VULN-01] [Tên lỗ hổng ngắn gọn]
- **Severity:** `Critical` | `High` | `Medium` | `Low`
- **OWASP Category:** API1:2023 (BOLA) / CWE-522 / ...
- **Affected File:** `path/to/file.ts#L42-L58`
- **Description & Vulnerability Analysis:**
  [Giải thích chi tiết tại sao đây là lỗ hổng và kịch bản khai thác]
- **Vulnerable Code Snippet:**
  ```typescript
  // Đoạn mã vi phạm trích xuất trực tiếp
  ```
- **Remediation & Secure Code Template:**
  ```typescript
  // Đoạn mã an toàn mẫu đã được sửa
  ```

---

## 🛠️ 4. Actionable Remediation Roadmap
- [ ] Bước 1: Khắc phục khẩn cấp các lỗi Critical & High.
- [ ] Bước 2: Bổ sung Unit test / Pentest automation ngăn ngừa tái phát.
- [ ] Bước 3: Cấu hình CI/CD Gate kiểm tra an ninh trước khi merge PR.
````

---

## 💻 III. TÍCH HỢP CÙNG CÔNG CỤ CLI CHÍNH THỨC

Ngoài việc để AI Agent chạy native 5-pass, bạn có thể chạy song song SecureVibes CLI chính thức:

### 1. Cài đặt SecureVibes CLI:
```bash
pip install securevibes
```

### 2. Chạy quét trực tiếp từ Terminal:
```bash
# Cấu hình API Key (Anthropic Claude hoặc OpenAI)
export ANTHROPIC_API_KEY="sk-ant-api..."

# Thực hiện quét thư mục dự án
securevibes scan .
```

### 3. Đọc và thẩm định kết quả:
Khi file `.securevibes/scan_report.md` được sinh ra, gọi Agent:
> *"Hãy đọc file `.securevibes/scan_report.md` và tiến hành Pass 4 (loại bỏ cảnh báo giả) và lập kế hoạch sửa code."*

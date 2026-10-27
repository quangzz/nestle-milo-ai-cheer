---
name: frontend-security-audit
description: Quy trình tự động rà soát an toàn mã nguồn Frontend Next.js/React theo tiêu chuẩn hiện đại (CWE-522, CWE-79, CWE-284, CWE-200). Cung cấp ma trận kiểm thử, bộ lệnh SAST Grep tự động, Gold Standard Code Templates và Pre-flight Checklist.
---

# Skill: Frontend Security Audit & Guardrails (Enterprise Standard 2026)

Skill này cung cấp quy chuẩn rà soát an toàn mã nguồn tĩnh (**SAST**) và các quy tắc phòng thủ chiều sâu (**Defense in Depth**) dành cho AI Agent và Developer khi xây dựng các ứng dụng Web Next.js (App Router) / React / Tailwind CSS.

### 📚 Tài Liệu Tiêu Chuẩn Quốc Tế Bắt Buộc Tham Chiếu:
1. **OWASP WSTG v4.2 (Client-Side Testing & Session Management):** `https://owasp.org/www-project-web-security-testing-guide/v42/`
2. **OWASP ASVS v4.0.3 (Level 2 - Web Frontend Verification):** `https://owasp.org/www-project-application-security-verification-standard/`
3. **Quy chuẩn nội bộ doanh nghiệp:** [QUY_CHUAN_VA_HUONG_DAN_PENTEST_DOANH_NGHIEP.md](../../docs/QUY_CHUAN_VA_HUONG_DAN_PENTEST_DOANH_NGHIEP.md)

---

## 🧭 I. MA TRẬN TIÊU CHUẨN AN NINH FRONTEND TRỌNG YẾU

| STT | Lỗ Hổng / Rủi Ro An Ninh | Dấu Hiệu Vi Phạm Trong Code (Anti-Patterns) | Tiêu Chuẩn Khắc Phục Bắt Buộc (Remediation) |
| :---: | :--- | :--- | :--- |
| **1** | **Rò rỉ JWT Token tại Client (CWE-522)** | Dùng `localStorage.setItem('token', ...)` hoặc tự động gắn `Authorization: Bearer <token>` từ localStorage. | **100% DỰA VÀO HTTP-ONLY COOKIE** do Backend cấp phát. Mọi API fetch dùng `credentials: 'include'`. Tích hợp logic auto-wipe xóa sạch token cũ trong localStorage khi app khởi chạy. |
| **2** | **Bảo vệ Route Yếu tại Client (CWE-284)** | Dùng `useEffect` ở trang Admin để check quyền và redirect (`router.push('/login')`). | **BẮT BUỘC** chặn tại tầng Server / Edge: Sử dụng Next.js `middleware.ts` giải mã token cookie và kiểm tra `role` (`super_admin`, `admin`, `staff`) trước khi render bất kỳ HTML/JS bundle nào của `/admin/*`. |
| **3** | **Tấn công Cross-Site Scripting (DOM XSS - CWE-79)** | Sử dụng `dangerouslySetInnerHTML={{ __html: userContent }}` mà không qua làm sạch. | Tuyệt đối tránh `dangerouslySetInnerHTML`. Nếu bắt buộc phải render HTML động, phải dùng thư viện `DOMPurify` (`DOMPurify.sanitize(...)`) để lọc bỏ tag `<script>`, `onerror`, `onload`. |
| **4** | **Lộ Thông Tin Nhạy Cảm trong Client Bundle (CWE-200)** | Đặt API Key của bên thứ 3 (OpenAI Key, Service Account, Secret Key) trong biến `NEXT_PUBLIC_*`. | Các Secret Key nhạy cảm **TUYỆT ĐỐI KHÔNG** dùng prefix `NEXT_PUBLIC_`. Mọi tác vụ gọi API AI hoặc Secret I/O phải đi qua Backend Gateway / Route Handlers. |
| **5** | **Rò rỉ Dữ liệu Nhạy Cảm qua Hydration State (`__NEXT_DATA__`)** | Truyền toàn bộ object DB (chứa passwordHash, admin notes, SĐT đầy đủ) vào props của Server Component / Client Component. | Áp dụng **Data Projection**: Chỉ truyền các trường cần hiển thị UI. Tuyệt đối không pass raw database entity xuống client props. |
| **6** | **Chuyển Hướng Không An Toàn (Open Redirect - CWE-601)** | Đọc tham số `?redirect=...` từ URL và gán thẳng `window.location.href = redirectUrl`. | Chỉ cho phép chuyển hướng nội bộ (`redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')`). Nếu chuyển hướng domain ngoài, phải so khớp với whitelist domain đã kiểm duyệt. |
| **7** | **Tấn công Reverse Tabnabbing (CWE-1022)** | Dùng `<a target="_blank">` mà không có `rel="noopener noreferrer"`. | Mọi liên kết mở tab mới **BẮT BUỘC** có `rel="noopener noreferrer"` để ngăn trang đích chiếm quyền điều khiển `window.opener`. |
| **8** | **Giao Tiếp Cửa Sổ Không An Toàn (PostMessage Insecurity)** | Lắng nghe `window.addEventListener('message')` mà không kiểm tra `event.origin`. | **BẮT BUỘC** so khớp `event.origin === 'https://your-domain.com'` hoặc whitelist trước khi xử lý `event.data`. |
| **9** | **Tấn công Chèn Khung Hình (Clickjacking / Framing)** | Không cấu hình HTTP Security Headers bảo vệ trang Web. | Cấu hình `headers` trong `next.config.ts`: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. |

---

## ⚡ II. BỘ LỆNH QUÉT TĨNH TỰ ĐỘNG (AUTOMATED SAST GREP MATRIX)

Khi thực hiện audit Frontend, AI Agent có thể chạy ngay các mẫu regex sau để phát hiện 100% rủi ro:

```bash
# 1. Quét tìm rò rỉ lưu JWT Token vào LocalStorage (CWE-522)
grep -rnE "localStorage\.setItem\(['\"](token|accessToken|jwt|auth)" frontend/src/

# 2. Quét tìm nguy cơ DOM XSS (CWE-79)
grep -rnE "dangerouslySetInnerHTML" frontend/src/

# 3. Quét tìm rò rỉ Secret Key trong biến môi trường client (CWE-200)
grep -rnE "NEXT_PUBLIC_(SECRET|KEY|PRIVATE|TOKEN|PASSWORD)" frontend/

# 4. Quét tìm Reverse Tabnabbing (Thiếu rel="noopener noreferrer")
grep -rnE "target=['\"]_blank['\"]" frontend/src/

# 5. Quét tìm Open Redirect không kiểm tra path nội bộ (CWE-601)
grep -rnE "window\.location\.href\s*=\s*(router\.query|searchParams|redirect)" frontend/src/

# 6. Quét tìm PostMessage thiếu kiểm tra Origin
grep -rnE "addEventListener\(['\"]message['\"]" frontend/src/

# 7. Quét tìm các đường dẫn HTTP không an toàn trong mã nguồn
grep -rnE "['\"]http://(?!localhost|127\.0\.0\.1)" frontend/src/
```

---

## 🏆 III. MẪU CODE CHUẨN MỰC FRONTEND (GOLD STANDARD CODE TEMPLATES)

### 1. Template: API Client An Toàn Tuyệt Đối (`src/lib/api-client.ts`)
```typescript
/**
 * Chuẩn kết nối API Frontend an toàn:
 * - 100% không chạm vào localStorage để lấy JWT token.
 * - Tự động đính kèm credentials: 'include' để trình duyệt gửi HttpOnly cookie.
 * - Xử lý 401 tự động chuyển hướng và xóa sạch session tạm.
 */

const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.yourdomain.com/api';
};

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // [SECURITY] Dựa hoàn toàn vào HTTP-only cookie do trình duyệt quản lý
  options.credentials = 'include';

  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        // Auto-wipe thông tin hiển thị nếu phiên hết hạn
        localStorage.removeItem('app_user_session');
        localStorage.removeItem('user');
        sessionStorage.clear();

        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error (${res.status})`);
  }

  return res.json();
}
```

### 2. Template: Edge Middleware Bảo Vệ Đa Tầng (`src/middleware.ts`)
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Bảo vệ vùng quản trị Admin
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Giải mã Payload JWT (Phần Base64 giữa)
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

      const allowedRoles = ['super_admin', 'admin', 'campaign_manager', 'staff', 'editor', 'cskh'];
      if (!payload.role || !allowedRoles.includes(payload.role)) {
        // Chặn người dùng thông thường (customer) vào Admin
        return NextResponse.redirect(new URL('/login?error=forbidden', request.url));
      }
    } catch (err) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/vault/:path*', '/wallet/:path*'],
};
```

### 3. Template: Lắng nghe Message An Toàn (Safe Cross-Window Communication)
```typescript
import { useEffect } from 'react';

const ALLOWED_ORIGINS = [
  'https://app.yourdomain.com',
  'https://yourdomain.com',
  'https://api.yourdomain.com',
];

export function useSafeMessageListener(onData: (data: any) => void) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // [SECURITY] Kiểm tra origin nguồn bắt buộc
      if (!ALLOWED_ORIGINS.includes(event.origin)) {
        console.warn(`[SECURITY] Blocked message from untrusted origin: ${event.origin}`);
        return;
      }
      onData(event.data);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onData]);
}
```

---

## ✅ IV. PRE-FLIGHT SECURITY CHECKLIST CHO FRONTEND DEVELOPER

Trước khi commit mã nguồn Frontend mới:

- [ ] **1. No localStorage JWT:** Tìm kiếm `localStorage.setItem('token'` xem có bất kỳ file nào lưu JWT không (Kết quả phải = 0).
- [ ] **2. Credentials Included:** Mọi hàm gọi `fetch()` hoặc client API đều có `credentials: 'include'` chưa?
- [ ] **3. Edge RBAC Guard:** File `middleware.ts` có lọc Role đối với route `/admin/*` chưa?
- [ ] **4. No Secret Leak:** Không có secret key nào bị đặt biến `NEXT_PUBLIC_*`.
- [ ] **5. No Raw dangerouslySetInnerHTML:** Không chèn HTML thô từ người dùng mà chưa qua `DOMPurify`.
- [ ] **6. Safe Redirects:** Mọi URL chuyển hướng tham số đều đã được kiểm tra bắt đầu bằng dấu gạch chéo `/`.
- [ ] **7. Reverse Tabnabbing:** 100% thẻ `<a target="_blank">` đều có `rel="noopener noreferrer"` chưa?
- [ ] **8. No Raw DB Props:** Các Server Component props có lọc bỏ `passwordHash`, token và PII chưa?

---

## 🎯 V. BÀI HỌC BẢO MẬT & CẠM BẪY ĐẶC THÙ FRONTEND PRODUCTION

Đây là các cạm bẫy kỹ thuật thực chiến **thường gặp trên Frontend Next.js / React Enterprise** mà lập trình viên và AI Agent cần đặc biệt lưu ý:

### 1. Cạm bẫy iOS HEIC Image Upload (Gây đơ quét QR và upload ảnh)
- **Vấn đề:** Trình duyệt iOS Safari mặc định chụp ảnh ở định dạng HEIC/HEIF. Trình duyệt web và thư viện giải mã `jsQR` không thể đọc file HEIC, dẫn đến tình trạng chọn ảnh từ thư viện nhưng web "không có phản hồi gì" hoặc ảnh preview bị đen.
- **Quy tắc:** Thẻ input tải ảnh bắt buộc phải định danh cụ thể mime types để ép iOS tự động chuyển đổi sang JPEG:
  ```html
  <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />
  ```

### 2. Cạm bẫy Range Requests Video gây Crash Cloud Run HTTP 500 (DoS)
- **Vấn đề:** Đặt video MP4 tĩnh (30-40MB) trong thư mục `public/videos/` khiến thiết bị iPhone gửi liên tục các HTTP Range Requests tải từng phân đoạn. Next.js trên container Cloud Run không được thiết kế cho việc stream video lớn, dẫn tới cạn kiệt bộ nhớ và ném ra lỗi HTTP 500.
- **Quy tắc:** Tuyệt đối không lưu file video lớn trong mã nguồn Next.js. Chuyển video lên Cloud Storage/CDN và luôn thiết lập thuộc tính `preload="none"` trên thẻ `<video>`.

### 3. Cạm bẫy Vòng lặp Redirect Loop 401 trên Thẻ QR mới tạo
- **Vấn đề:** Khi khách hàng quét thẻ QR mới (`NEW` hoặc `CREATED`), Frontend tự động gọi API `/pipeline/status/:qrId` (vốn yêu cầu đăng nhập). Nếu token hết hạn, API trả về 401 khiến user bị đá văng vào trang Login liên tục mà không thể xem được giao diện Pre-gate giới thiệu.
- **Quy tắc:** Bỏ qua gọi API authenticated nếu QR mới tạo. Chỉ kích hoạt gọi `/pipeline/status` khi mã QR đã bước vào trạng thái `SOLD` hoặc `IN_PROGRESS`.

### 4. Cạm bẫy React Hydration Mismatch (#418)
- **Vấn đề:** Render trạng thái đăng nhập khác nhau giữa Server SSR (`user=null`) và Client CSR (`user` đọc từ cookie/session) khiến React văng cảnh báo Hydration Error #418.
- **Quy tắc:** Luôn sử dụng cờ `const [mounted, setMounted] = useState(false)` và `useEffect(() => setMounted(true), [])` trước khi render các khối giao diện nhạy cảm theo phiên làm việc.

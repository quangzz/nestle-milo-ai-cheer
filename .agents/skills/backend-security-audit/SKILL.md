---
name: backend-security-audit
description: Quy trình tự động rà soát an toàn mã nguồn Backend NestJS/Express theo chuẩn OWASP API Security Top 10 (2023), OWASP LLM Applications (2025) và ASVS v4.0.3 Level 2. Cung cấp ma trận kiểm thử, bộ lệnh SAST Grep tự động, Gold Standard Code Templates và Pre-flight Checklist.
---

# Skill: Backend Security Audit & Pentest Scanner (Enterprise Standard 2026)

Skill này cung cấp quy chuẩn rà soát an toàn mã nguồn tĩnh (**SAST**) và kiểm thử động (**DAST**) chuyên sâu dành cho AI Agent khi phát triển, tối ưu và kiểm thử các dịch vụ Backend Node.js / NestJS / Prisma / Cloud Run.

### 📚 Tài Liệu Tiêu Chuẩn Quốc Tế Bắt Buộc Tham Chiếu:
1. **OWASP WSTG v4.2 (Web Security Testing Guide):** `https://owasp.org/www-project-web-security-testing-guide/v42/`
2. **OWASP ASVS v4.0.3 (Application Security Verification Standard - Level 2):** `https://owasp.org/www-project-application-security-verification-standard/`
3. **OWASP API Security Top 10 (2023):** `https://owasp.org/API-Security/editions/2023/en/0x11-t10/`
4. **OWASP Top 10 for LLM Applications (2025):** `https://owasp.org/www-project-top-10-for-large-language-model-applications/`
5. **Quy chuẩn nội bộ doanh nghiệp:** [QUY_CHUAN_VA_HUONG_DAN_PENTEST_DOANH_NGHIEP.md](../../docs/QUY_CHUAN_VA_HUONG_DAN_PENTEST_DOANH_NGHIEP.md)

---

## 🧭 I. MA TRẬN TIÊU CHUẨN AN NINH OWASP API TOP 10 (2023) & OWASP LLM (2025)

| Mã Chuẩn | Tên Lỗ Hổng / Rủi Ro | Dấu Hiệu Vi Phạm Trong Code (Anti-Patterns) | Tiêu Chuẩn Khắc Phục Bắt Buộc (Remediation) |
| :--- | :--- | :--- | :--- |
| **API1:2023** | **Broken Object Level Authorization (BOLA / IDOR)** | Dùng `@Param('id')`, `@Query('userId')`, `@Body('userId')` để truy vấn hoặc cập nhật dữ liệu cá nhân của người dùng. | **BẮT BUỘC** trích xuất danh tính từ JWT Token đã xác thực: `req.user.sub` hoặc `req.user.id`. Tuyệt đối không tin tưởng ID từ client. |
| **API2:2023** | **Broken Authentication** | Thiếu `@UseGuards(JwtAuthGuard)` trên endpoint bảo mật; dùng mật khẩu yếu; không có reCAPTCHA chống brute-force. | Bọc `@UseGuards(JwtAuthGuard)` trên mọi route nhạy cảm. Áp dụng Google reCAPTCHA v3 và Throttling trên các cổng đăng nhập. |
| **API3:2023** | **Broken Object Property Auth (Mass Assignment)** | Sử dụng object literal inline dạng `@Body() body: any` hoặc `@Body() body: { name: string }`. | **BẮT BUỘC** định nghĩa Class DTO độc lập với decorator từ `class-validator` (`@IsString()`, `@IsOptional()`, `@IsInt()`). Kích hoạt `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`. |
| **API4:2023** | **Unrestricted Resource Consumption (DoS / DoW)** | API danh sách (`findMany`) không có phân trang; vòng lặp gọi AI LLM vô hạn; không giới hạn dung lượng upload. | Áp dụng `@Query('page')` và `@Query('limit')` với trần cố định `Math.min(limit, 100)`. Thiết lập `AbortController` timeout 45s cho các luồng xử lý AI. |
| **API5:2023** | **Broken Function Level Authorization (BFLA)** | API Admin/Staff không kiểm tra Role hoặc chỉ kiểm tra ở tầng Frontend UI. | Kết hợp `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('super_admin', 'admin')` để phân quyền chặt chẽ tại tầng Controller. |
| **API6:2023** | **Server-Side Request Forgery (SSRF)** | Server gọi `fetch(url)` hoặc `axios.get(url)` với `url` do client/webhook truyền lên mà không kiểm tra tên miền và IP private. | Whitelist danh sách domain cho phép (GCS, Firebase Storage). Chặn đứng `localhost`, `127.0.0.1`, RFC1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) và Cloud Metadata `169.254.169.254`. |
| **API7:2023** | **Security Misconfiguration** | CORS mở `origin: '*'`; ghi lộ thông tin nhạy cảm (PII, Token, Prompt) trong log console Production. | Khóa CORS theo whitelist domain của dự án (`*.your-domain.com`). Sử dụng hàm mask/redact thông tin nhạy cảm trước khi ghi log. |
| **API8:2023** | **Lack of Protection from Automated Threats** | Không có cơ chế chống bot cào quét dữ liệu, spam tạo mã QR rác, spam gửi OTP. | Tích hợp Throttling theo IP / User ID kết hợp reCAPTCHA v3 trên mọi form tương tác công khai. |
| **API9:2023** | **Improper Inventory Management** | Tồn tại các route thử nghiệm, debug, control-plane bị bỏ quên không có bảo vệ. | Rà soát và xóa bỏ các endpoint thừa thãi; nhóm version API tường minh (`/api/v1/...`). |
| **API10:2023** | **Unsafe Consumption of Third-Party APIs** | Tin tưởng tuyệt đối dữ liệu trả về từ LLM (Gemini/OpenAI) mà không validate schema trước khi lưu DB. | Dùng `zod`, `class-validator` hoặc JSON Schema parse kết quả của AI trước khi ghi vào Database. |
| **CWE-200** | **Information Disclosure (System Config & Secrets)** | Endpoint cấu hình `/api/system-configs` mở public hoặc thiếu phân quyền Admin; API trả về `bypassPasskey`, `systemPrompt` của AI, hoặc danh sách blacklist từ khóa cấm; rò rỉ metadata cấu hình nội bộ. | **BẮT BUỘC** khóa `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('super_admin', 'admin')`. Loại bỏ hoàn toàn passkey khỏi response; cấu hình `isSecret: true` cho bảng brand safety; mask/sanitize mọi trường nhạy cảm. |
| **CWE-200:Pipeline** | **Information Disclosure (AI Prompts, Pipeline Structure & Financial Data)** | Endpoint public `/api/campaign/slug/:slug` hoặc `/api/public/campaign/:code` trả về `pipelineSteps` chứa `promptTemplate`, `config`, tên model AI, hoặc dữ liệu tài chính nội bộ `budgetVnd`. Kẻ tấn công đọc trộm cấu trúc pipeline, bí quyết prompt AI và cấu hình kỹ thuật. | **Loại bỏ triệt để `pipelineSteps` khỏi API Public**: Do Frontend End-user đã chuyển sang dùng 100% câu quote tĩnh (`ROTATING_QUOTES`) và % tiến trình từ SSE/Polling, API Public loại bỏ hoàn toàn `pipelineSteps` khỏi câu query `include` và response (vừa tối ưu tốc độ DB vừa giấu kín 100% cấu trúc). Backend Pipeline Orchestrator khi thực thi tự query DB nội bộ để nhận 100% prompt và config. |
| **API2:ZeroTrust** | **Unauthenticated Public Endpoints (Broken Auth)** | Mở public tùy tiện các endpoint Master Data (`/campaign/branches`, `/campaign/collections`), luồng quét/nhận quà QR (`/qr/*`), luồng submit AI Pipeline mà không yêu cầu Token đăng nhập. | **Mặc định 100% endpoint là Private (bọc JwtAuthGuard)**. Chỉ cho phép mở Public các route nằm trong `APPROVED_PUBLIC_WHITELIST` được phê chuẩn chính thức (Auth, Landing Page, Legal, Telemetry) và **BẮT BUỘC** có Rate Limiting (`@Throttle`). |
| **CWE-434:Upload** | **Unrestricted File Upload & Storage Exhaustion (DoS)** | Mở public endpoint tải ảnh/media (`/uploads/base64`, `/uploads/photos`) không yêu cầu Auth hoặc thiếu Rate Limiting, cho phép bot spam làm cạn kiệt ổ đĩa VPS/Cloud Storage. | **BẮT BUỘC** bọc `@UseGuards(JwtAuthGuard)` trên các cổng upload media cá nhân, kèm Rate Limiting `@Throttle({ default: { limit: 15, ttl: 60000 } })`. Sanitize tên tệp chống Path Traversal và xác thực Magic Bytes nhị phân. |
| **LLM01/04** | **Prompt Injection & Model Denial of Wallet** | Cộng chuỗi trực tiếp input người dùng vào System Prompt; không giới hạn độ dài input văn bản/ảnh/audio. | Tách biệt `systemInstruction` và `userContent`. Giới hạn ký tự tối đa (VD: max 1000 ký tự prompt, max 5 ảnh). OCR/ASR tiền kiểm tra trước khi nạp vào mô hình đa phương thức. |
| **CWE-22** | **Path Traversal & Zip Slip (CWE-29)** | Dùng `path.join(baseDir, userInput)` mà không làm sạch input; giải nén zip không kiểm tra canonical path. | Sử dụng regex gắt gao `/[^a-zA-Z0-9_-]/g` (loại bỏ dấu chấm `.`) và kiểm tra `path.resolve(basePath, cleanId).startsWith(basePath)`. |
| **CWE-330** | **Weak Randomness & Predictable Tokens** | Sử dụng `Math.random()` để sinh mã Token xác thực, mã OTP, mã QR ID hoặc mã mở quà. | **BẮT BUỘC** sử dụng CSPRNG: `crypto.randomBytes(8).toString('hex')`, `crypto.randomInt(100000, 1000000)` hoặc `crypto.randomUUID()`. |
| **CWE-362** | **Race Condition & Concurrency (TOC/TOU)** | Kiểm tra số dư / trạng thái thẻ quà và cập nhật không bọc trong Database Transaction. | **BẮT BUỘC** bọc trong `prisma.$transaction()` kết hợp Unique Constraints hoặc Row-Level Locking để chống Double-Claim / Double-Spend. |
| **CWE-434** | **Unrestricted File Upload & SVG Stored XSS** | Cho phép upload tệp SVG không làm sạch XML hoặc không kiểm tra Magic Bytes. | Kiểm tra Magic Bytes 4-12 bytes nhị phân. Cấm hoặc sanitize triệt để thẻ `<script>` trong tệp SVG. Giới hạn pixel (max 4096x4096) chống Decompression Bomb. |

---

## ⚡ II. BỘ LỆNH QUÉT TĨNH TỰ ĐỘNG (AUTOMATED SAST GREP MATRIX)

Khi thực hiện audit Backend, AI Agent có thể chạy ngay các mẫu regex sau để phát hiện 100% rủi ro:

```bash
# 0. QUÉT AST TỰ ĐỘNG 100% CONTROLLER ENDPOINTS (BẮT BUỘC - CI/CD GATE)
# Chạy Linter AST quét toàn bộ 23 Controllers, chặn đứng endpoint thiếu Auth ngoài Whitelist
npm run test:auth-audit

# 1. Quét tìm sinh token / OTP yếu (CWE-330)
grep -rnE "Math\.random\(" backend/src/

# 2. Quét tìm Mass Assignment / Thiếu DTO Class trong Controller (API3:2023)
grep -rnE "@Body\(\)\s+[a-zA-Z0-9_]+\s*:\s*(any|\{[^}]*\})" backend/src/

# 3. Quét tìm SQL Injection thô hoặc Unsafe queries
grep -rnE "(\$queryRawUnsafe|\$executeRawUnsafe)" backend/src/

# 4. Quét tìm Controller Admin thiếu Guard hoặc Role (API5:2023)
grep -rnE "@Controller\(['\"]admin" backend/src/

# 5. Quét tìm CORS wildcard nguy hiểm (API7:2023)
grep -rnE "origin:\s*['\"]?\*['\"]?" backend/src/

# 6. Quét tìm Path Traversal / Nối chuỗi file thiếu sanitize (CWE-22)
grep -rnE "path\.join\(.*(req\.|body\.|query\.|params\.)" backend/src/

# 7. Quét tìm URL fetch không qua whitelist SSRF (API6:2023)
grep -rnE "fetch\((req\.|body\.|query\.)" backend/src/

# 8. Quét tìm Rò rỉ Thông tin Nhạy cảm (CWE-200: Passkey, Prompt, Blacklist lộ ra API)
grep -rnE "(bypassPasskey|systemPrompt|obsceneBlacklist|politicalBlacklist|competitorBlacklist)" backend/src/modules/system-config/

# 9. Quét tìm Endpoint Public thiếu Rate Limiting Throttler (API8:2023)
grep -rnE "@Controller\(['\"](auth|analytics/telemetry)" backend/src/

# 10. Quét tìm Rò rỉ Prompt AI & Budget trong API Public (CWE-200: Pipeline Steps & Campaign)
grep -rnE "(promptTemplate|brandSafetyPrompt|budgetVnd)" backend/src/modules/public-campaign/ backend/src/modules/campaign/campaign.service.ts

# 11. Quét tìm Cổng Upload File thiếu JwtAuthGuard hoặc thiếu Rate Limiting (CWE-434 / DoS)
grep -rnE "@Post\(['\"](base64|photos|upload)" backend/src/modules/uploads/
```

---

## 🏆 III. MẪU CODE CHUẨN MỰC (GOLD STANDARD CODE TEMPLATES)

### 1. Template: Controller Chuẩn Bảo Mật & Phân Quyền Đa Tầng
```typescript
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateUserProfileDto, QueryPaginationDto } from './dto/user.dto';
import { UserService } from './user.service';

@ApiTags('User Profile Management')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 1. Chống IDOR: Lấy userId trực tiếp từ JWT Payload đã xác thực
  @Put('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân của chính mình' })
  async updateProfile(@Request() req: any, @Body() body: UpdateUserProfileDto) {
    const currentUserId = req.user.sub || req.user.id;
    return this.userService.updateProfile(currentUserId, body);
  }

  // 2. Chống DoS: Bắt buộc phân trang và giới hạn trần bản ghi
  @Get('admin/list')
  @Roles('super_admin', 'admin')
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Lấy danh sách người dùng dành cho Admin' })
  async getAllUsers(@Query() query: QueryPaginationDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return this.userService.findAllPaginated(page, limit);
  }
}
```

### 2. Template: Class DTO Chuẩn (Secure Validation DTO)
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength, MinLength, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên khách hàng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Địa chỉ email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ example: '0912345678', description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class QueryPaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

### 3. Template: Xử Lý I/O, Chống Path Traversal & Sinh Mã CSPRNG
```typescript
import * as path from 'path';
import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';

export class SafeStorageHelper {
  private static readonly BASE_DIR = path.resolve(process.cwd(), 'storage_vault');

  public static sanitizeIdentifier(rawId: string): string {
    if (!rawId || typeof rawId !== 'string') {
      throw new BadRequestException('Mã định danh không hợp lệ');
    }
    // Loại bỏ hoàn toàn dấu chấm, slash, backslash, ký tự shell độc hại
    const clean = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (clean.length === 0 || clean.length > 128) {
      throw new BadRequestException('Độ dài mã định danh không hợp lệ');
    }
    
    // Kiểm tra Canonical Path an toàn
    const resolvedPath = path.resolve(this.BASE_DIR, clean);
    if (!resolvedPath.startsWith(this.BASE_DIR)) {
      throw new BadRequestException('Phát hiện tấn công Path Traversal');
    }
    return clean;
  }

  // Sinh Token bí mật chuẩn mật mã học (CSPRNG)
  public static generateSecureToken(prefix: string = 'token'): string {
    return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
  }

  // Sinh OTP 6 chữ số chuẩn CSPRNG
  public static generateSecureOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }
}
```

### 4. Template: Chống Race Condition trong Giao dịch / Đổi Thưởng
```typescript
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SecureTransactionService {
  constructor(private prisma: PrismaService) {}

  async claimReward(userId: string, rewardPoolId: string) {
    // Bọc trong transaction cấp cao để chống Race Condition (TOC/TOU)
    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra tồn kho và lock bản ghi
      const pool = await tx.rewardPool.findUnique({
        where: { id: rewardPoolId },
      });

      if (!pool || pool.currentStock <= 0) {
        throw new BadRequestException('Phần thưởng đã hết số lượng');
      }

      // 2. Trừ tồn kho có điều kiện nguyên tử (Atomic Update)
      const updated = await tx.rewardPool.updateMany({
        where: { id: rewardPoolId, currentStock: { gt: 0 } },
        data: { currentStock: { decrement: 1 } },
      });

      if (updated.count === 0) {
        throw new ConflictException('Phần thưởng vừa được nhận bởi người dùng khác. Vui lòng thử lại.');
      }

      // 3. Ghi nhận lịch sử nhận quà của user
      return tx.userReward.create({
        data: {
          userId,
          rewardPoolId,
          claimedAt: new Date(),
        },
      });
    });
  }
}
```

---

## ✅ IV. PRE-FLIGHT SECURITY CHECKLIST CHO DEVELOPER / AI AGENT

Trước khi bàn giao hoặc đánh dấu hoàn thành bất kỳ tính năng Backend nào, **BẮT BUỘC** đối soát qua 11 câu hỏi:

- [ ] **1. Authentication:** Mọi route không phải public đều có `@UseGuards(JwtAuthGuard)` chưa?
- [ ] **2. IDOR:** Có endpoint nào đọc `userId` từ `body`/`param` thay vì `req.user.sub` không?
- [ ] **3. DTO Validation:** 100% `@Body()` đã dùng Class DTO với `@IsString`, `@IsOptional` chưa? (Không còn object `{}` inline).
- [ ] **4. Pagination:** Các API danh sách Admin đã có `take`/`skip` với trần `limit <= 100` chưa?
- [ ] **5. Token Entropy:** Đã thay thế 100% `Math.random()` bằng `crypto.randomBytes()` / `crypto.randomInt()` chưa?
- [ ] **6. SSRF & Path Traversal:** Các hàm đọc URL và I/O thư mục đã qua whitelist và `sanitizeId` chưa?
- [ ] **7. Concurrency & Race Condition:** Các tác vụ trừ kho/đổi quà/nhận thưởng đã bọc trong `prisma.$transaction()` chưa?
- [ ] **8. PII Masking:** API danh sách quầy đã ẩn token và che số điện thoại đối với nhân viên chưa?
- [ ] **9. AST Auth Linter:** Đã chạy `npm run test:auth-audit` và đạt 0 vi phạm (100% endpoint được bảo vệ hoặc nằm trong Whitelist phê duyệt)?
- [ ] **10. Secret Sanitization & CWE-200:** Đã kiểm tra không có API nào trả về `bypassPasskey`, `systemPrompt`, hay danh sách `blacklist` ra phía client?
- [ ] **11. Rate Limiting:** Các endpoint public (auth, telemetry, pre-check AI) đã gắn decorator `@Throttle` chưa?
- [ ] **12. Public Campaign Sanitization:** Các API công khai chiến dịch (`/campaign/slug/:slug`, `/public-campaign/:code`) đã lọc bỏ `promptTemplate`, `config`, `brandSafetyPrompt` và `budgetVnd` chưa?
- [ ] **13. Media Upload Guarding:** Các endpoint tải ảnh/tệp (`/uploads/base64`, `/uploads/photos`) đã bọc `@UseGuards(JwtAuthGuard)` và `@Throttle(15 req/phút)` chưa?

---

## 🎯 V. BÀI HỌC BẢO MẬT & CẠM BẪY ĐẶC THÙ THỰC CHIẾN HỆ THỐNG DOANH NGHIỆP

Đây là các lỗ hổng và cạm bẫy kỹ thuật **đã từng thực tế xảy ra trong môi trường Production quy mô lớn**, nằm ngoài các sách giáo khoa lý thuyết thông thường mà AI Agent & Developer BẮT BUỘC phải tuân thủ:

### 1. Cạm bẫy Crash Prisma do chuỗi Placeholder (`?collectionId=ALL`)
- **Vấn đề:** Frontend truyền param lọc `?collectionId=ALL` hoặc `""`. Nếu truyền trực tiếp vào câu lệnh `where: { collectionId }` của Prisma, Prisma sẽ ném ngoại lệ `Invalid UUID string` gây **HTTP 500 Crash**.
- **Quy tắc:** Mọi query param dạng UUID bắt buộc phải lọc bỏ giá trị placeholder (`"ALL"`, `""`) hoặc kiểm tra Regex UUID trước khi đưa vào Prisma filter:
  ```typescript
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
  const filter = (param && param !== 'ALL' && isUUID) ? { collectionId: param } : {};
  ```

### 2. Lỗ hổng Stateless JWT không thu hồi được phiên (Session Invalidation Bypass)
- **Vấn đề:** Khi quản trị viên khóa tài khoản hoặc người dùng đổi mật khẩu, JWT Token cũ vẫn có thể tiếp tục gửi request nếu hệ thống chỉ kiểm tra chữ ký tĩnh.
- **Quy tắc:** Bắt buộc duy trì bảng `user_sessions` trong PostgreSQL. `JwtStrategy` phải đối soát `sessionId` và kiểm tra trường `revokedAt === null`. Khi logout hoặc đổi pass, kích hoạt `revokedAt = new Date()`.

### 3. Cạm bẫy Lộ Swagger Docs trên Production (Information Disclosure)
- **Vấn đề:** Mặc định NestJS Swagger để lộ toàn bộ 191 API endpoints và schema cơ sở dữ liệu tại `/api/docs`.
- **Quy tắc:** Chỉ khởi tạo Swagger khi `process.env.NODE_ENV !== 'production'`. Nếu cần dùng ở môi trường Staging/Dev, bắt buộc bọc middleware HTTP Basic Auth.

### 4. Nguy cơ Tràn Bộ Nhớ OOM khi chuyển sang Server Nội Bộ On-Premise (BullMQ / Redis)
- **Vấn đề:** Hiện tại trên Cloud Run / Serverless, hàng đợi AI Pipeline đang chạy in-memory. Khi chuyển giao hệ thống sang VPS On-Premise / Private Cloud với lượng truy cập cao, chạy in-memory sẽ làm crash tiến trình Node.js (Out Of Memory).
- **Quy tắc:** Khi deploy lên Server On-Premise / Production, bắt buộc bổ sung container Redis trong `docker-compose.yml` và phục hồi lại `this.aiPipelineQueue.add('execute')` trong `pipeline.service.ts`.

### 5. Cạm bẫy Model AI Lạc Hậu (Gemini 2026 Frontier Standard)
- **Vấn đề:** Sử dụng các model cũ (Gemini 1.5, 2.5 đã ngừng hỗ trợ) dẫn tới lỗi 404 từ Google AI Studio.
- **Quy tắc:** Hệ thống 2026 chỉ được phép sử dụng: `gemini-3.7-flash` (mặc định), `gemini-3.7-thinking`, `gemini-3.5-flash-lite`, `gemini-omni-flash`.

### 6. Sự cố Pentest Lộ Cấu Hình AI Prompt & Passkey Bảo Trì trên `/api/system-configs` (Tháng 09/2026)
- **Vấn đề (CWE-200 / Information Disclosure):** Endpoint `GET /api/system-configs` và `GET /api/system-configs/:key` ban đầu mở public không có Auth, dẫn đến việc Pentest quét và đọc được toàn bộ:
  1. `systemPrompt` của AI kiểm duyệt nội dung an toàn thương hiệu.
  2. Toàn bộ danh sách đen từ khóa cấm (`obsceneBlacklist`, `politicalBlacklist`, `competitorBlacklist`).
  3. Mật khẩu bí mật vượt rào bảo trì (`bypassPasskey: "your-strong-internal-secret-token"`).
- **Quy tắc bắt buộc:**
  1. **Khóa cứng Auth Admin:** Mọi route xem/sửa cấu hình hệ thống (`/system-configs*`) bắt buộc bọc `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('super_admin', 'admin')`. Không có ngoại lệ.
  2. **Zero Client Secret:** API public kiểm tra trạng thái bảo trì (`/system-configs/maintenance`) tuyệt đối **KHÔNG** trả về trường `bypassPasskey`. Mật khẩu vượt bảo trì chỉ được đối soát nội bộ trên server.
  3. **Đánh dấu bí mật trong Database:** Các cấu hình an toàn AI (`brand_safety_config`) phải lưu cờ `isSecret: true` và lọc bỏ khỏi mọi response chung.

### 7. Nguyên tắc Zero-Trust Whitelist & Khóa Auth Bắt Buộc Toàn Bộ Endpoint Nghiệp Vụ
- **Vấn đề (Broken Auth / API2:2023):** Các endpoint Master Data danh mục chi nhánh (`/campaign/branches`), bộ sưu tập (`/campaign/collections`), hay luồng quét nhận/trao quà QR (`/qr/*`) từng bị mở public, cho phép kẻ tấn công và bot cào dữ liệu hoặc kích hoạt logic nghiệp vụ không cần đăng nhập.
- **Quy tắc bắt buộc:**
  1. **Mặc định Private:** 100% endpoint mới trong Controller phải được xem là Private, bọc `@UseGuards(JwtAuthGuard)`.
  2. **Bắt buộc Đăng nhập:** Người dùng trước khi quét nhận quà, cào thưởng, mở hòm ký ức hoặc tạo thiệp AI đều phải đăng nhập để có Bearer Token.
  3. **Phê duyệt Whitelist chính thức:** Chỉ những route bắt buộc (Auth login/register, Landing Page, Legal terms, Telemetry) mới được đưa vào `APPROVED_PUBLIC_WHITELIST` của file `scripts/audit-endpoint-auth.js` và bắt buộc có `@Throttle`.
  4. **Tự động hóa CI/CD:** Lệnh `npm run test:auth-audit` phải là chốt chặn bắt buộc trước khi build hoặc deploy staging/production.

### 8. Tách Biệt Tuyệt Đối Tầng API Public DTO và Tầng Xử Lý AI Orchestrator (CWE-200: Pipeline Steps)
- **Vấn đề:** Khi mở API công khai chi tiết chiến dịch `GET /api/campaign/slug/:slug` cho khách hàng xem landing page, nếu câu lệnh `include: { pipelineSteps: true }` không được gỡ bỏ hoặc map DTO, toàn bộ `promptTemplate`, `config`, tên model AI và thứ tự các bước AI (Brand Safety, Story Generation, Video Composite) sẽ bị phơi bày trên DevTools.
- **Quy tắc bắt buộc:**
  1. **Loại bỏ triệt để khỏi API Public:** Do Frontend End-user đã chuyển dịch hoàn toàn sang dùng 5 câu quote cảm xúc xoay vòng (`ROTATING_QUOTES`) và % tiến độ từ SSE, Client không hề cần đến `pipelineSteps`. Vì vậy, câu lệnh query `getCampaignBySlug` loại bỏ hoàn toàn `pipelineSteps` khỏi khối `include` và xóa bỏ khỏi JSON response.
  2. **Bảo toàn CSDL & Không ảnh hưởng Backend:** Trong CSDL PostgreSQL, `promptTemplate` và `config` vẫn được lưu trữ đầy đủ. Khi khách hàng bấm submit form (`POST /api/pipeline/submit/:qrId`), Backend Orchestrator tự động query trực tiếp từ CSDL (`this.prisma.qrCode.findFirst({ include: { campaign: { include: { pipelineSteps: true } } } })`) và gọi `this.systemConfig.getBrandSafetyConfig()`. Toàn bộ luồng kiểm duyệt an toàn thương hiệu và sinh lời chúc AI chạy phía server, độc lập 100% với dữ liệu trả về trình duyệt.
  3. **Giữ nguyên cho Quản trị viên CMS:** API Admin `getCampaignById(id: string)` vẫn giữ nguyên `include: { pipelineSteps: true }` có xác thực Token Admin để Super Admin xem và tùy biến prompt/config bình thường.

### 9. Phòng Chống Tấn Công DoS Ổ Đĩa Qua Cổng Upload Media Cá Nhân (CWE-434 / Storage Exhaustion)
- **Vấn đề:** Các endpoint upload ảnh như `/api/uploads/base64` và `/api/uploads/photos` nếu không có Auth sẽ bị bot khai thác gửi hàng ngàn tệp rác, gây tràn ổ cứng VPS (`No space left on device`), dẫn đến crash toàn bộ dịch vụ backend và CSDL.
- **Quy tắc bắt buộc:**
  1. Bắt buộc gắn `@UseGuards(JwtAuthGuard)` trên tất cả endpoint upload tệp người dùng.
  2. Áp dụng Rate Limiting khắt khe `@Throttle({ default: { limit: 15, ttl: 60000 } })` (tối đa 15 file/phút/user).
  3. Kiểm tra Magic Bytes nhị phân (chỉ chấp nhận JPEG, PNG, WebP) và làm sạch tên file chống Path Traversal (`filename.replace(/[^a-zA-Z0-9._-]/g, '')`).


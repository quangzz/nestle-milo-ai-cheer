# LATEST VERSION POLICY — Luôn dùng công nghệ mới nhất

## Nguyên tắc cốt lõi
**BẮT BUỘC** sử dụng phiên bản mới nhất (latest stable) cho TẤT CẢ dependencies, frameworks, tools, và runtime trong mọi dự án.

## Quy tắc cụ thể

### 1. Khi khởi tạo dự án mới
```
Rule: LUÔN dùng @latest khi install
✅ npm create vite@latest
✅ npx -y create-next-app@latest
✅ npm install react@latest react-dom@latest
❌ npm install react (không chỉ định → có thể cũ do cache)
❌ Hardcode version cụ thể trừ khi có lý do breaking change
```

### 2. Khi thêm dependency mới
```
Rule: Kiểm tra version mới nhất TRƯỚC khi install
- Dùng `npm view <package> version` hoặc search web để xác nhận latest stable
- Ưu tiên ESM modules over CommonJS khi có
- Ưu tiên packages có TypeScript types built-in
```

### 3. Các công nghệ phải luôn cập nhật mới nhất
```
┌─────────────────────┬───────────────────────────────────┐
│ Category            │ Technologies                      │
├─────────────────────┼───────────────────────────────────┤
│ Runtime             │ Node.js (LTS), Bun               │
│ Frontend Framework  │ React, Next.js, Vite              │
│ Language            │ TypeScript                        │
│ Styling             │ Tailwind CSS                      │
│ Backend             │ Firebase SDK, Cloud Functions     │
│ Router              │ React Router                      │
│ Build Tools         │ Vite, esbuild, SWC                │
│ Package Manager     │ npm, pnpm                         │
│ Testing             │ Vitest, Playwright                │
│ Linting             │ ESLint, Prettier                  │
│ Icons               │ Lucide React                      │
│ Charts              │ Recharts, Chart.js                │
│ Animation           │ Motion (framer-motion)            │
│ Forms               │ React Hook Form + Zod             │
└─────────────────────┴───────────────────────────────────┘
```

### 4. Quy trình kiểm tra version
```
Trước khi code:
1. Kiểm tra package.json hiện tại
2. So sánh với latest versions trên npm
3. Nếu major version mới → search web kiểm tra breaking changes
4. Cập nhật và test trước khi tiếp tục

Khi phát hiện outdated:
- Chủ động đề xuất upgrade
- Liệt kê breaking changes (nếu có)
- Update code theo migration guide
```

### 5. Ngoại lệ cho phép
```
CHỈ giữ version cũ khi:
- Package mới có known critical bug chưa fix
- Breaking change quá lớn, cần migration plan riêng
- Dependency conflict không resolve được
→ PHẢI ghi rõ lý do trong package.json comments hoặc README
```

---
trigger: always_on
---

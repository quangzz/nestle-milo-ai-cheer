# Styleguide - Coding Conventions & Methodology

## Mục đích
Quy tắc chung về coding conventions, quy trình phát triển, và code quality cho mọi dự án. Áp dụng bất kể tech stack nào.

---

## 1. QUY TRÌNH PHÁT TRIỂN (7 Giai đoạn)

1. **Discovery** — Đọc yêu cầu, xác định personas, requirements, constraints
2. **Classification** — Đánh giá complexity (pages, data, real-time, auth, integrations)
3. **Design** — Architecture, component design, DB schema
4. **Implementation** — Setup → Backend → Core UI → Features → Polish → Test
5. **Testing** — Functionality, UI/UX, Performance (<3s load), Accessibility, Security
6. **Iteration** — User feedback loop, refactoring
7. **Delivery** — Documentation, code comments, handoff

---

## 2. NAMING CONVENTIONS

```
Component files:     PascalCase.tsx    → Button.tsx, UserProfile.tsx
Non-component files: kebab-case.ts     → utils.ts, api-client.ts
Styles:              kebab-case.css    → theme.css, fonts.css
Hooks:               camelCase.ts      → useAuth.ts, useFetch.ts

Variables & Functions: camelCase — descriptive (isLoading, userId)
Boolean: is*, has*, should*, can*
Constants: UPPER_SNAKE_CASE — MAX_RETRIES, API_ENDPOINT
Components: PascalCase — UserProfileCard
Types/Interfaces: PascalCase — interface UserProfile { }
```

---

## 3. IMPORT ORDER

```
1. React / framework imports
2. Third-party libraries
3. Internal components
4. Utils / helpers
5. Types
6. Styles / assets
```

---

## 4. REFACTORING TRIGGERS

```
1. Code Duplication     → Same code 3+ places → Extract
2. Large Components     → >300 lines → Split
3. Complex Functions    → >50 lines → Break down
4. Props Drilling       → >3 levels → Use Context
5. Performance Issues   → Slow renders → Memoization
6. Hard to Test         → Tightly coupled → Extract to hooks
```

---

## 5. CODE QUALITY PRINCIPLES

```
1. DRY  — Don't Repeat Yourself → Extract reusable code
2. KISS — Keep It Simple → Simplest solution that works
3. YAGNI — You Aren't Gonna Need It → Don't add unused features
4. Single Responsibility → One component = one purpose
5. Composition over Inheritance → Compose small parts
```

---

## 6. ANTI-PATTERNS TO AVOID

```
❌ Prop Drilling Hell       → Use Context
❌ Massive Components       → Split
❌ Unnecessary Re-renders   → Proper state management
❌ Mixing Concerns          → Separate UI + API + logic
❌ No Error Handling        → Try-catch everywhere
❌ Hardcoded Values         → Env vars, constants
❌ No Loading States        → Spinners, skeletons
```

---

## 7. RIGHT-SIZING

```
❌ Over-Engineering: Firebase cho single-user todo | Redux cho counter | Router cho 2 pages
❌ Under-Engineering: localStorage cho multi-user | No validation | No error handling
✅ Right: Start simple → add complexity when needed → built-in first → library nếu phức tạp
```

---
trigger: always_on
---

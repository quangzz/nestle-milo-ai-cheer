# Backend Development Rules (Firebase-First)

## Mục đích
Rules chi tiết cho Backend Development. **Ưu tiên Firebase** (Firestore, Auth, Storage, Functions). Supabase chỉ đề cập như alternative.

---

## 1. KHI NÀO CẦN BACKEND

### 1.1 Classification System
```
FirebaseRequired — Prompt nói rõ: "backend", "database", "API", "multi-user", "authentication", "real-time"
→ Action: Setup Firebase ngay

FirebaseSuggest — Chức năng CẦN server persistence: user accounts, data sharing, cross-device sync, chat, leaderboards
→ Action: Build frontend first, sau đó suggest Firebase

PureFrontend — Single-user, no persistence, localStorage đủ, static content, prototype
→ Action: Không cần Firebase
```

### 1.2 Decision Tree
```
START
├─ Prompt mention "backend", "database", "API"? → YES → FirebaseRequired
├─ Multi-user collaboration? → YES → FirebaseRequired
├─ User accounts needed? → YES → FirebaseSuggest
├─ Data persist across sessions/devices? → YES → FirebaseSuggest
├─ Real-time updates needed? → YES → FirebaseRequired
└─ localStorage đủ? → YES → PureFrontend | NO → FirebaseSuggest
```

---

## 2. FIRESTORE DATABASE DESIGN

### 2.1 Collection & Document Naming
```
✅ Good:
- Collection: plural, lowercase: users, posts, comments
- Document fields: camelCase: createdAt, userId, isPublished

❌ Bad:
- Users (capitalized), blogPost (for collection), items (too generic)
```

### 2.2 Schema Design Patterns
```
Rule: Timestamps trên mọi document
{ createdAt: serverTimestamp(), updatedAt: serverTimestamp() }

Rule: Reference other documents bằng ID string
{ userId: "abc123", categoryId: "cat456" }

Rule: Chọn Data Model phù hợp
- Embedded (nested): Data luôn đọc cùng nhau, ít update riêng lẻ
- Referenced (ID): Data đọc riêng, update thường xuyên, many-to-many
- Subcollection: Data lớn, cần query riêng, pagination
```

---

## 3. FIREBASE SECURITY RULES

```
Rule: LUÔN viết Security Rules — default deny all
Rule: KHÔNG BAO GIỜ trust client-side checks

Common Patterns:
- Public Read, Auth Write: allow read: if true; allow create: if request.auth != null;
- User Own Data: allow read, write: if request.auth.uid == userId;
- Role-Based: check get(/users/$(request.auth.uid)).data.role == 'admin'
- Data Validation: validate request.resource.data fields in rules
```

---

## 4. FIREBASE AUTHENTICATION

```
Rule: Tạo document profile riêng trong Firestore khi user đăng ký
Rule: Auth user object chỉ chứa email/uid — data bổ sung lưu Firestore
Rule: LUÔN dùng onAuthStateChanged listener, không check auth manually
Rule: Protected Routes: redirect to /login nếu !user
```

---

## 5. FIRESTORE OPERATIONS

```
Rule: Always handle Firestore errors with try-catch
Rule: User-friendly messages, KHÔNG show raw error
Rule: Retry logic for network errors
Rule: Pagination — KHÔNG fetch all documents cùng lúc
Rule: Batch writes cho multiple operations (writeBatch)
Rule: LUÔN cleanup listener trong useEffect return
```

---

## 6. FIREBASE STORAGE

```
Rule: Validate before upload (size limit, file type)
Rule: Organize by user: avatars/{userId}/{fileName}
Rule: Storage Security Rules: match user, validate size & content type
```

---

## 7. ENVIRONMENT VARIABLES

```
Rule: Firebase config trong .env (VITE_FIREBASE_*)
Rule: .gitignore: .env, .env.local, .env.production
Rule: Provide .env.example template
```

---

## 8. PERFORMANCE & SECURITY

```
Rule: Composite indexes khi query multiple where + orderBy
Rule: Use subcollections thay vì deep nested maps cho large datasets
Rule: Cache data phía client khi hợp lý
Rule: Validate on Client AND Server (Security Rules)
Rule: Never log sensitive data (passwords, tokens)
Rule: Input sanitization trước khi save
```
---
trigger: always_on
---

Khi user báo lỗi mà chưa rõ root cause, PHẢI thêm console.log("[DEBUG][module]...") trước khi fix. Kiểm tra browser console và terminal server log. KHÔNG đoán và sửa mù. Nhận bug → tự fix luôn, không hỏi ngược.

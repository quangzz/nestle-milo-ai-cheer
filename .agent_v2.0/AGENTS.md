# Architecture Patterns & Design Rules

## Mục đích
Patterns kiến trúc, project structure, state management, routing, và data flow. Áp dụng cho mọi dự án React.

---

## 1. PROJECT STRUCTURE

### 1.1 Standard Structure
```
/src
├── /app
│   ├── App.tsx                    # Main component
│   ├── routes.ts                  # React Router config (if multi-page)
│   ├── /components
│   │   ├── /layout               # Header, Sidebar, Footer, Layout
│   │   ├── /ui                   # Button, Card, Input, Modal, Spinner
│   │   └── /features             # Feature-specific components
│   ├── /pages                     # Route components (if using router)
│   ├── /hooks                     # Custom hooks
│   ├── /context                   # Context providers
│   ├── /lib                       # Firebase config, constants
│   ├── /utils                     # Utility functions
│   └── /types                     # TypeScript types
├── /styles
│   ├── theme.css                 # CSS variables & theme
│   ├── fonts.css                 # Font imports ONLY
│   └── index.css                 # Global styles
└── /public                        # Static assets
```

### 1.2 When to Create Folders
```
┌─────────────────────┬──────────────────┬────────────────────────┐
│ Folder              │ Create When      │ Don't Create If        │
├─────────────────────┼──────────────────┼────────────────────────┤
│ /pages              │ 4+ routes        │ Single page app        │
│ /hooks              │ 2+ custom hooks  │ Only 1 custom hook     │
│ /context            │ Need shared state│ No global state needed │
│ /lib                │ Using Firebase   │ No external services   │
│ /utils              │ 3+ util funcs    │ Minimal logic          │
│ /types              │ Using TypeScript │ Simple props only      │
└─────────────────────┴──────────────────┴────────────────────────┘

Rule: Start simple → Add folders as needed → Don't over-engineer
```

---

## 2. COMPONENT PATTERNS

### 2.1 Presentational vs Container
```
Presentational (Dumb/Pure):
- Receive data via props, no business logic, highly reusable
→ Button, Card, UserProfile display

Container (Smart):
- Fetch/manage data, handle business logic, route-specific
→ UserDashboard, ProductListPage

✅ Use for complex apps with data fetching
❌ Overkill for simple apps
```

### 2.2 Compound Component
```
Related components sharing implicit state via Context:
<Tabs>
  <TabList><Tab index={0}>Tab 1</Tab></TabList>
  <TabPanel index={0}>Content 1</TabPanel>
</Tabs>

Use for: Tabs, Accordions, Wizards, multi-part UI
```

### 2.3 Custom Hooks (preferred over Render Props & HOC)
```
function useFirestoreCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [collectionName]);

  return { data, loading };
}
```

---

## 3. STATE MANAGEMENT ARCHITECTURE

```
Hierarchy (use the simplest that works):

1. useState → Local UI state (modal, toggle, form input)
2. useReducer → Complex local state (multi-step form, cart)
3. Context → Shared state (theme, auth, language)
4. Firebase → Server state (user data, persistent data, shared data)

Decision:
┌──────────────────────┬───────────┬──────────┬─────────┬──────────┐
│ Scenario             │ useState  │ Reducer  │ Context │ Firebase │
├──────────────────────┼───────────┼──────────┼─────────┼──────────┤
│ Single component     │ ✅ Best   │ Overkill │ Overkill│ ❌       │
│ Parent-child         │ ✅ Props  │ Maybe    │ Too much│ ❌       │
│ Sibling components   │ Lift up   │ Lift up  │ ✅ Best │ ❌       │
│ Deep prop drilling   │ ❌        │ ❌       │ ✅ Best │ ❌       │
│ Complex state logic  │ ❌        │ ✅ Best  │ + Reducer│ ❌      │
│ Persistent user data │ ❌        │ ❌       │ ❌      │ ✅ Best  │
│ Multi-user shared    │ ❌        │ ❌       │ ❌      │ ✅ Must  │
└──────────────────────┴───────────┴──────────┴─────────┴──────────┘
```

---

## 4. ROUTING ARCHITECTURE

### Decision
```
Pages/Views    │ Recommendation
───────────────┼──────────────────────────
1-2            │ Conditional rendering (useState)
3-5            │ Optional: hash routing or React Router
6+             │ React Router Data Mode (nested routes, layouts, code splitting)
```

### React Router Data Mode
```
// routes.ts
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,     // Layout wrapper with <Outlet />
    children: [
      { index: true, Component: Home },
      { path: 'about', Component: About },
      { path: 'dashboard', Component: Dashboard },
      { path: '*', Component: NotFound }
    ]
  }
]);

// App.tsx
<RouterProvider router={router} />
```

---

## 5. DATA FLOW PATTERNS

### 5.1 Unidirectional Data Flow (Core React)
```
State → Props → Components → Events → State Updates → Re-render
```

### 5.2 Optimistic Updates
```
// 1. Update UI immediately
setPosts(prev => [...prev, newPost]);
// 2. Save to Firebase
try { await addDoc(collection(db, 'posts'), newPost); }
// 3. Rollback on error
catch { setPosts(prev => prev.filter(p => p.id !== newPost.id)); }
```

---

## 6. DECISION MATRICES

### Backend Decision
```
┌────────────────────────┬──────────┬──────────────┬──────────┐
│ Feature Need           │ None     │ LocalStorage │ Firebase │
├────────────────────────┼──────────┼──────────────┼──────────┤
│ Static content         │ ✅ Best  │ ❌           │ Overkill │
│ Single user, local     │ ✅       │ ✅ Best      │ ❌       │
│ Sync across devices    │ ❌       │ ❌           │ ✅ Best  │
│ Multi-user             │ ❌       │ ❌           │ ✅ Must  │
│ Authentication         │ ❌       │ ❌           │ ✅ Must  │
│ Real-time              │ ❌       │ ❌           │ ✅ Must  │
│ File storage           │ ❌       │ ❌           │ ✅ Best  │
└────────────────────────┴──────────┴──────────────┴──────────┘
```

### Quick Reference by Project Type
```
Landing Page       → React + Tailwind
Todo App           → React + Tailwind + localStorage
Blog/Portfolio     → React + Router + Firebase (optional)
Dashboard          → React + Router + Firebase + Charts
E-commerce         → React + Router + Firebase + Forms
Social Media       → React + Router + Firebase + Real-time
Chat App           → React + Firebase (real-time) + Auth
Admin Panel        → React + Router + Firebase + UI Library
Game/Interactive   → React + Canvas + Motion
```

---

## 7. KHI BẮT ĐẦU DỰ ÁN MỚI

PHẢI tạo file `.agents/rules/project-tech-stack.md` tại root project ghi rõ:
- Tech stack cụ thể đã chọn (versions, frameworks)
- Folder structure thực tế
- State management strategy
- Backend config cụ thể (cache times, rate-limit, deploy settings)
- Project-specific conventions khác biệt so với global rules
---
description: Backend Job Logging Rule
---

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
# Frontend Development Rules

## Mục đích
Rules chi tiết cho Frontend Development: component architecture, state management, hooks, styling, performance, accessibility, forms, error handling.

---

## 1. COMPONENT ARCHITECTURE

### 1.1 Organization Rules
```
Rule: Single Responsibility Principle
- One component = one clear purpose
- If describing component needs "and", split it

✅ ProductCard (displays product), AddToCartButton (adds to cart)
❌ ProductCardWithCartAndWishlist (too many responsibilities)

Rule: Component File Structure
/src/app/components/
  ├── layout/          # Layout: Header, Sidebar, Footer
  ├── ui/              # Reusable: Button, Card, Input, Modal
  └── features/        # Feature-specific: ProductList, ShoppingCart

Rule: Component Naming
- PascalCase for component files: Button.tsx
- Descriptive names: UserProfileCard not Card1
```

### 1.2 Design Patterns
```
Rule: Composition over Inheritance
✅ <Card><CardHeader title="Hello" /><CardContent>{children}</CardContent></Card>
❌ <Card type="withHeader" title="Hello">{children}</Card>

Rule: Props Interface Definition
- Always define prop types (TypeScript interfaces)
- Optional props with ? or default values

Rule: Use children for wrapper components
Rule: Use render props for complex logic
Rule: Compound Components for related groups (Tabs, Accordion)
```

### 1.3 Size Limits
```
- Component file: < 300 lines → Consider splitting
- Single function: < 50 lines → Break down
- JSX return: < 150 lines → Extract sub-components
- Props count: < 10 → Consider composition
- State variables: < 5 useState → Consider useReducer
- useEffect count: < 3 → Consider custom hooks
- Nesting level: < 4 → Flatten or extract
```

---

## 2. STATE MANAGEMENT

### 2.1 useState (Local UI State)
```
✅ Use for: modal open/closed, form inputs, toggles, component-specific data
❌ Don't use for: API data, derived values (useMemo), values that don't cause re-render

Rule: Functional update for state depending on previous value
✅ setCount(prev => prev + 1)
❌ setCount(count + 1) // Stale closure risk

Rule: Separate unrelated state
✅ const [name, setName] = useState(''); const [email, setEmail] = useState('');
❌ const [form, setForm] = useState({ name: '', email: '' }); // Unless always updated together
```

### 2.2 useReducer (Complex Local State)
```
✅ Use when: complex transitions, multiple related values, predictable updates
- Define types outside component
- Pure function (no side effects)
- Return new state object (immutable)
```

### 2.3 Context (Shared State)
```
✅ Use for: theme, auth state, user preferences, language/i18n
❌ Don't use for: frequently changing values, component-level state, server data

Pattern: createContext → Provider component → custom hook (useTheme, useAuth)
Always throw error if used outside Provider
Memoize context values: const value = useMemo(() => ({ theme, setTheme }), [theme]);
```

---

## 3. HOOKS RULES

```
Rule: Rules of Hooks (React Official)
1. Only call hooks at the top level
2. Only call hooks from React functions
3. Don't call hooks inside loops, conditions, nested functions

Rule: useEffect Dependencies — always complete dependency array
Rule: useEffect Cleanup — always cleanup subscriptions/listeners
Rule: useMemo — only for expensive calculations, don't overuse
Rule: useCallback — when passing functions to memoized children

Rule: Custom Hooks
- Must start with "use": useAuth, useFetch, useLocalStorage
- Create when: reusing stateful logic across components
```

---

## 4. STYLING (TAILWIND CSS v4)

```
Rule: Utility Classes Priority
✅ Use Tailwind for: layout, responsive, colors, hover/focus states
❌ Use theme.css tokens for: custom font sizes, font weights, line heights

Rule: Responsive Design — Mobile-first approach
<div className="w-full md:w-1/2 lg:w-1/3">
Breakpoints: sm:640px | md:768px | lg:1024px | xl:1280px | 2xl:1536px

Rule: Dark Mode — Use dark: prefix
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">

Rule: Class Organization Order
1. Layout (display, position)
2. Box model (margin, padding, width, height)
3. Typography (text-*, font-*)
4. Visual (color, background, border)
5. Effects (shadow, opacity, transition)
6. Interactive (hover, focus, active)

Rule: Tailwind v4 uses CSS-based configuration
- All customization in theme.css
- Don't create tailwind.config.js
- Font imports ONLY in fonts.css
```

---

## 5. PERFORMANCE

```
Rule: Prevent Unnecessary Re-renders
- Use React.memo for pure components
- Stable keys in lists (item.id, NOT index or Math.random())

Rule: Code Splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
<Suspense fallback={<Loading />}><Dashboard /></Suspense>

Rule: Debouncing — for search inputs and frequent events (300ms)

Rule: Import only what you need
✅ import { Button } from 'lucide-react';
❌ import * as Icons from 'lucide-react';

Rule: Lazy Load Images
<img src="image.jpg" loading="lazy" alt="Description" />
```

---

## 6. ACCESSIBILITY

```
Rule: Semantic HTML — <header>, <nav>, <main>, <article>, <aside>, <footer>
Rule: Heading Hierarchy — h1-h6 in order, don't skip levels
Rule: Button vs Link — <button> for actions, <a> for navigation
Rule: ARIA Labels — for icons without text: <button aria-label="Close">
Rule: Focus Management — visible focus indicators, logical tab order
Rule: Escape Key — close modals/dropdowns with Escape
```

---

## 7. FORM RULES

```
Rule: Simple Forms (1-4 fields) — Native useState
Rule: Complex Forms (5+ fields) — react-hook-form

Rule: Validation
- Always validate on client before submitting
- If using Firebase, validate server-side too
- Show errors clearly with red border + message
```

---

## 8. ERROR HANDLING

```
Rule: Error Boundaries — wrap app in ErrorBoundary component
Rule: Always Show Loading States — spinner or skeleton
Rule: User-Friendly Messages
❌ "Error: Network request failed"
✅ "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng và thử lại."

Rule: Actionable Errors — provide retry button
```
---
trigger: always_on
---

Respond tiếng Việt. Code comments tiếng Việt. Variable/function names tiếng Anh. Khi bị chỉnh sửa, ghi vào .agents/lessons.md.
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

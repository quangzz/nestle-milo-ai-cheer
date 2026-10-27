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

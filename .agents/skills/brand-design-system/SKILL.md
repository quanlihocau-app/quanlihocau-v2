---
name: brand-design-system
description: >
  Hệ thống thiết kế thương hiệu chính thức của ứng dụng Quản Lý Hồ Câu.
  Áp dụng bắt buộc cho mọi màn hình, popup, dialog, component mới hoặc sửa đổi.
  Kích hoạt skill này trước khi viết bất kỳ UI nào.
---

# 🎨 Brand Design System — Quản Lý Hồ Câu

> **QUAN TRỌNG:** Mọi UI component, trang, popup của app đều PHẢI tuân theo hệ thống này.
> Không dùng màu neon, gradient tím, shadow nặng, hay card bo tròn vô nghĩa.

---

## 1. Color Tokens

| Token | Hex | Tailwind | Dùng cho |
|-------|-----|----------|---------|
| `--brand-primary` | `#1B3B2B` | `bg-[#1B3B2B]` | Header, logo, tiêu đề trang, bảng số liệu |
| `--brand-cta` | `#15803D` | `bg-[#15803D]` | Nút CTA chính (quy tắc bút dạ 10%, tương phản WCAG AA) |
| `--brand-accent` | `#E8F0EC` | `bg-[#E8F0EC]` | Trạng thái active, nút phụ, card nhẹ |
| `--brand-bg` | `#FFFFFF` | `bg-white` | Nền trang chính |
| `--brand-surface` | `#F8FAF8` | `bg-[#F8FAF8]` | Nền row/card phụ |
| `--brand-text` | `#111827` | `text-[#111827]` | Chữ chính, tương phản cao |
| `--brand-text-muted` | `#4B5563` | `text-[#4B5563]` | Chữ phụ, nhãn |
| `--brand-border` | `#E5E7EB` | `border-[#E5E7EB]` | Viền 1px phân cấp layout |
| `--brand-danger` | `#B91C1C` | `text-[#B91C1C]` | Lỗi, xóa, cảnh báo nguy hiểm |
| `--brand-warning` | `#92400E` | `text-[#92400E]` | Cảnh báo vàng |
| `--brand-success` | `#166534` | `text-[#166534]` | Thành công, thu tiền |

---

## 2. Typography

### Font Stack
- **Heading (Serif):** `"Times New Roman", Times, serif` → class: `font-serif`
- **Body (Sans-serif):** `"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif` → class: `font-sans`

> Font "Be Vietnam Pro" được load qua Google Fonts trong root layout.

### Scale
| Cấp độ | Size | Weight | Font | Class Tailwind |
|--------|------|--------|------|---------------|
| Page Title | 24–28px | Bold | Serif | `text-2xl sm:text-3xl font-bold font-serif text-[#111827]` |
| Section Header | 18–20px | Semibold | Serif/Sans | `text-lg sm:text-xl font-semibold font-serif text-[#111827]` |
| Body Text | 16–18px | Medium | Sans | `text-base sm:text-lg font-medium leading-relaxed text-[#111827]` |
| Subtext / Label | 14px | Medium | Sans | `text-sm font-medium text-[#4B5563]` |
| Financial Figure | 20–32px | Bold | Serif | `font-serif font-bold tabular-nums` |

---

## 3. Accessibility & Touch Targets

- **Minimum touch target:** `min-h-12` (48px) cho mọi button, input, icon clickable.
- **Spacing giữa các element:** 16px–24px (`gap-4` đến `gap-6`) để tránh bấm nhầm.
- **Border structure:** Dùng `border border-[#E5E7EB]` + `bg-[#F8FAF8]` thay vì shadow.
- **Focus ring:** `focus-visible:ring-2 focus-visible:ring-[#1B3B2B] focus-visible:ring-offset-1`
- **Icons:** Luôn đi kèm text label. Size icon: `w-5 h-5` (20px).

---

## 4. Component Patterns

### 4.1 Primary Button
```tsx
// Variant: primary — rounded-lg (8px), vuông vắn sang trọng
className="inline-flex items-center justify-center gap-2
  min-h-12 px-5 rounded-lg
  bg-[#1B3B2B] text-white text-sm font-semibold
  hover:bg-[#142d20] active:scale-[0.98]
  focus-visible:ring-2 focus-visible:ring-[#1B3B2B]
  transition-all cursor-pointer disabled:opacity-40"
```

### 4.2 Secondary Button
```tsx
className="inline-flex items-center justify-center gap-2
  min-h-12 px-5 rounded-lg
  bg-[#E8F0EC] text-[#1B3B2B] text-sm font-semibold
  border border-[#E5E7EB]
  hover:bg-[#dceae3] active:scale-[0.98]
  transition-all cursor-pointer"
```

### 4.3 Outline / Ghost Button
```tsx
className="inline-flex items-center justify-center gap-2
  min-h-12 px-5 rounded-lg
  bg-white text-[#111827] text-sm font-medium
  border border-[#E5E7EB]
  hover:bg-[#F8FAF8] active:scale-[0.98]
  transition-all cursor-pointer"
```

### 4.4 Page Header (trong app)
```tsx
<header className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
  {/* Back button: 48x48, rounded-lg */}
  <button className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#111827]">
    <ChevronLeft className="w-5 h-5" />
  </button>
  <h1 className="text-xl font-bold font-serif text-[#111827]">Tên trang</h1>
</header>
```

### 4.5 Data Row / List Item
```tsx
<div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E5E7EB] bg-white hover:bg-[#F8FAF8]">
  <span className="text-sm font-medium text-[#111827]">Label</span>
  <span className="text-sm font-semibold text-[#4B5563]">Value</span>
</div>
```

### 4.6 Modal / Dialog
```tsx
// Overlay
<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
  // Panel
  <div className="w-full max-w-md bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
    // Header
    <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
      <h2 className="text-lg font-bold font-serif text-[#111827]">Tiêu đề</h2>
      <button className="flex h-10 w-10 items-center justify-center rounded-xl text-[#4B5563] hover:bg-[#F8FAF8]">
        <X className="w-5 h-5" />
      </button>
    </div>
    // Body (scrollable)
    <div className="px-5 py-4 overflow-y-auto max-h-[60dvh]">...</div>
    // Footer
    <div className="flex gap-3 px-5 py-4 border-t border-[#E5E7EB]">...</div>
  </div>
</div>
```

### 4.7 Input Field
```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-[#111827]">Nhãn</label>
  <input className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4
    text-sm text-[#111827] placeholder:text-[#4B5563]
    focus:outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]
    transition-colors" />
</div>
```

### 4.8 Badge / Status Chip
```tsx
// Active / Positive
<span className="inline-flex items-center gap-1 rounded-full bg-[#E8F0EC] px-2.5 py-1 text-xs font-semibold text-[#1B3B2B]">
  ● Hoạt động
</span>
// Danger
<span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#B91C1C]">
  ● Quá hạn
</span>
```

### 4.9 Section Card / Summary Block
```tsx
<div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
  <div className="px-4 py-3 bg-[#F8FAF8] border-b border-[#E5E7EB]">
    <h3 className="text-sm font-semibold font-serif text-[#111827]">Tên section</h3>
  </div>
  <div className="divide-y divide-[#E5E7EB]">
    {/* rows */}
  </div>
</div>
```

### 4.10 Financial Figure Display
```tsx
<p className="font-serif text-2xl font-bold tabular-nums text-[#111827]">
  1.250.000 ₫
</p>
<p className="text-sm font-medium text-[#4B5563]">Doanh thu hôm nay</p>
```

---

## 5. Layout Rules

- **Page padding:** `px-4 pb-24` (để tránh bottom nav), hoặc `px-4 sm:px-6`
- **Max width nội dung:** `max-w-2xl mx-auto` cho mobile-first
- **Nền trang chính:** `bg-white` hoặc `bg-[#F8FAF8]`
- **Bottom nav clearance:** `pb-24` hoặc `pb-28` (cho iPhone home indicator)
- **Safe area:** Dùng `env(safe-area-inset-*)` qua CSS hoặc Tailwind `pb-safe`

---

## 5.5 Border Radius — Vuông vắn, sang trọng

> **Triết lý:** Bo góc nhẹ nhàng như tài liệu tài chính cao cấp — không tròn trĩnh như app trẻ em, không vuông cứng như DOS terminal.

| Element | Class Tailwind | px | Ghi chú |
|---------|---------------|-----|---------|
| Button (mọi size) | `rounded-lg` | 8px | Vuông vắn, ngón tay dễ bấm |
| Input / Select | `rounded-lg` | 8px | Đồng bộ với button |
| Back button | `rounded-lg` | 8px | Cùng hệ |
| Badge / Chip | `rounded-md` | 6px | Vuông hơn, không oval |
| Card / Section block | `rounded-xl` | 12px | Container nhẹ |
| Modal / Dialog panel | `rounded-xl` | 12px | Không dùng rounded-2xl, rounded-3xl |
| Bottom sheet | `rounded-t-xl` | 12px | Chỉ bo trên |
| Avatar / Icon button tròn | `rounded-full` | — | CHỈ dùng cho avatar |

❌ Không dùng `rounded-2xl`, `rounded-3xl` cho button hay modal thông thường  
❌ Không dùng `rounded-full` cho button dạng chữ nhật  

---

## 6. Anti-patterns — KHÔNG được làm
❌ Không dùng `shadow-xl`, `shadow-2xl` trên card thông thường  
❌ Không dùng gradient purple/neon (`from-purple-*`, `from-pink-*`, v.v.)  
❌ Không dùng `rounded-3xl` hay `rounded-full` cho container lớn  
❌ Không dùng màu nền tối (`bg-gray-900`, `bg-slate-800`) cho trang nội dung  
❌ Không đặt text nhỏ hơn 14px (`text-xs` chỉ dùng cho badge/chip)  
❌ Không để touch target nhỏ hơn 48px  
❌ Không dùng `min-h-[48px]` — dùng `min-h-12` (canonical Tailwind)  

---

## 7. File References

| File | Vai trò |
|------|---------|
| `src/styles/brand-tokens.css` | CSS custom properties (design tokens) |
| `src/app/layout.tsx` | Load font Be Vietnam Pro, apply body classes |
| `src/components/ui/button.tsx` | Button primitives |
| `src/components/ui/page-header.tsx` | Page header với back button |
| `src/components/ui/modal-portal.tsx` | Modal overlay wrapper |
| `src/components/ui/bottom-sheet.tsx` | Bottom sheet / drawer |
| `src/components/ui/input.tsx` | Input fields |
| `src/components/ui/badge.tsx` | Status badges |


## 2025-08-24 - Calendar Navigation Icon Buttons Accessibility
**Learning:** Icon-only navigation buttons (e.g. ChevronLeft/ChevronRight in week switchers) in calendar components lack default accessible text, causing screen readers to announce unlabelled controls.
**Action:** Always supply explicit `aria-label` and `title` tooltips on icon-only control buttons and `aria-expanded` on accordion group headers.

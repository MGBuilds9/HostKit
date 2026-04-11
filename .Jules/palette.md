## 2026-04-11 - Add ARIA labels to icon-only buttons
**Learning:** Found multiple instances of icon-only delete buttons (`Trash2` and `X`) missing `aria-label` attributes in property forms. Dynamic tags require dynamic labels (e.g., `Remove ${tag}`).
**Action:** When implementing repeating form elements or tags, always verify that delete/remove actions are accessible to screen readers by providing clear, context-specific `aria-label` attributes.

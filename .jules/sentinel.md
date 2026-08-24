
## 2026-03-30 - Fix BOLA / IDOR in GET /api/cleaners/[id]
**Vulnerability:** Broken Object Level Authorization (BOLA/IDOR) on `GET /api/cleaners/[id]` endpoint allowing authenticated cleaners to read other cleaners' profile data.
**Learning:** Route authorization checks must handle role-specific resource ownership (e.g. `cleaner.userId === session.user.id`) rather than relying solely on top-level role checks.
**Prevention:** Always verify object ownership when allowing lower-privileged roles access to parameterized REST endpoints.

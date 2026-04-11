## 2024-05-14 - Replace N+1 Queries in Owner Properties Page
**Learning:** Resolving N+1 queries in Next.js Server Components. Even though Prisma/Drizzle can optimize some queries, calling nested queries in a map with `Promise.all` can still result in multiple separate calls and linear latency scaling.
**Action:** Use batched queries. Execute one top-level query for the main records, and a single batched query using the `inArray` operator for all related records, then group them in memory using a hash map or reduce function.

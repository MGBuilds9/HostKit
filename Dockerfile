FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# node-ical lazily require()s temporal-polyfill; on Node 22 that resolves via the
# package "module-sync"/"import" condition to index.js, but Next's standalone
# tracer only ships index.cjs -> the iCal sync 500s in prod ("Cannot find module
# temporal-polyfill/index.js"). Overwrite the incomplete traced package subdirs
# with full real dirs from the deps stage (cp -rL follows pnpm relative symlinks).
# COPY each full package dir from the deps stage straight over the traced
# (incomplete) standalone location. cp -rL follows the pnpm symlink target.
USER root
COPY --from=deps /app/node_modules/.pnpm /deps-pnpm
RUN set -eux; \
  pkgnvs="node-ical@0.26.0 temporal-polyfill@0.3.2 rrule-temporal@1.5.2 @js-temporal+polyfill@0.5.1"; \
  subs="node-ical temporal-polyfill rrule-temporal @js-temporal/polyfill"; \
  set -- $subs; \
  for pkgnv in $pkgnvs; do \
    subpath="$1"; shift; \
    src="/deps-pnpm/$pkgnv/node_modules/$subpath"; \
    dest="/app/node_modules/.pnpm/$pkgnv/node_modules/$subpath"; \
    rm -rf "$dest"; \
    mkdir -p "$(dirname "$dest")"; \
    cp -rL "$src" "$dest"; \
  done; \
  rm -rf /deps-pnpm; \
  chown -R nextjs:nodejs /app/node_modules/.pnpm
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]

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
# temporal-polyfill/index.js"). Replace the traced (incomplete) package subdirs
# with the full real dirs from the deps stage (cp -L follows pnpm symlinks).
USER root
RUN set -eux; \
  for spec in \
    "node-ical@0.26.0 node-ical" \
    "temporal-polyfill@0.3.2 temporal-polyfill" \
    "rrule-temporal@1.5.2 rrule-temporal" \
    "@js-temporal+polyfill@0.5.1 @js-temporal/polyfill" \
  ; do \
    pkgnv="${spec%% *}"; subpath="${spec#* }"; \
    dest="/app/node_modules/.pnpm/$pkgnv/node_modules/$subpath"; \
    rm -rf "$dest"; \
    mkdir -p "/app/node_modules/.pnpm/$pkgnv/node_modules"; \
    cp -aL "/app/node_modules/.pnpm/$pkgnv/node_modules/$subpath" "$dest"; \
  done; \
  chown -R nextjs:nodejs /app/node_modules/.pnpm
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]

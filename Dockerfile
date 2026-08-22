# Production image for the Next.js app (standalone output). Multi-stage → small final image.
# Build:  docker build -t np-coaches-web .
# Used by the production and Coolify Compose stacks. Development uses docker-compose.yml.

# ---- deps: install production-ready node_modules ----
FROM node:22.23.1-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the app ----
FROM node:22.23.1-alpine3.24 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Public env needed at build time (baked into the client bundle). Override at build with
# --build-arg, or rely on runtime for server-only vars.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DIRECTUS_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
RUN npm run build

# ---- runner: minimal runtime ----
FROM node:22.23.1-alpine3.24 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone server + static assets + public dir.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

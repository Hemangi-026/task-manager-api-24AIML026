# =============================================================================
# Practical 11 — Frontend Dockerfile (Multi-stage build)
#
# Stage 1 (builder): Node 20 installs deps and runs `vite build`
# Stage 2 (production): Lightweight Nginx serves the compiled static files
#
# Why multi-stage?
#   The builder stage needs Node + all devDependencies (~450 MB).
#   The production stage only needs the compiled /dist folder + Nginx (~25 MB).
#   Docker discards the builder stage entirely in the final image.
# =============================================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first — Docker caches this layer and skips npm ci
# on subsequent builds if neither file changed.
COPY package.json package-lock.json ./

RUN npm ci

# Build-time argument: the browser needs to know where the API lives.
# Passed in from docker-compose.yml via `args:`.
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Copy source files and build production assets
COPY . .
RUN npm run build

# ---- Stage 2: Production (Nginx) ----
FROM nginx:alpine AS production

# Remove default Nginx placeholder page
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled Vite output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config (supports React Router client-side routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check — confirms Nginx is serving the app
HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

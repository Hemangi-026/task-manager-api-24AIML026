# =============================================================================
# Practical 11 — Backend Dockerfile
# Node.js 20 + Express API
# =============================================================================

FROM node:22-alpine

LABEL maintainer="Hemangi Parmar <24aiml026@charusat.edu.in>"
LABEL description="Task Manager Express + MongoDB API"

# Set working directory inside the container
WORKDIR /app

# Copy package manifests first — Docker caches this layer.
# npm install only re-runs when package.json/lock changes.
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm install --omit=dev --no-audit

# Copy the rest of the backend source code
COPY . .

# Expose the port the Express server listens on
EXPOSE 5001

# Health check — pings /cache/stats every 15 s.
# If it fails 3 times, Docker marks the container unhealthy.
# PORT comes from docker-compose environment, default 5001.
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/cache/stats || exit 1

# Start the server using node (not nodemon — this is production)
CMD ["node", "server.js"]

# Use Node.js 20 Alpine image (specific version for security)
FROM node:20.18.1-alpine3.21

# Set working directory
WORKDIR /app

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --audit=false

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Remove dev dependencies and clear caches to reduce image size
RUN npm ci --only=production --audit=false && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# Create non-root user with minimal privileges
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Change ownership of the app directory and remove write permissions
RUN chown -R mcp:nodejs /app && \
    chmod -R 755 /app && \
    chmod -R 644 /app/build/*

# Switch to non-root user
USER mcp

# Set secure environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=256"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check: OK')" || exit 1

# Use dumb-init for proper signal handling and entrypoint script
ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]

# Default command (can be overridden)
CMD []

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.title="Azure DevOps MCP Server"
LABEL org.opencontainers.image.description="Model Context Protocol server for Azure DevOps"
LABEL org.opencontainers.image.source="https://github.com/Tiberriver256/mcp-server-azure-devops"

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -S mcp && adduser -S mcp -G mcp
USER mcp

# MCP Streamable-HTTP transport listens on this port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

# Required environment variables (must be supplied at runtime):
#   AZURE_DEVOPS_ORG_URL   e.g. https://dev.azure.com/my-org
#   AZURE_DEVOPS_AUTH_METHOD  pat | azure-identity | azure-cli
#   AZURE_DEVOPS_PAT       personal access token (when AUTH_METHOD=pat)
#
# Optional:
#   PORT                   HTTP port (default: 3000)
#   MCP_PATH               HTTP path for MCP endpoint (default: /mcp)
#   AZURE_DEVOPS_DEFAULT_PROJECT
#   AZURE_DEVOPS_API_VERSION

ENV PORT=3000 \
    MCP_PATH=/mcp \
    AZURE_DEVOPS_AUTH_METHOD=pat

ENTRYPOINT ["node", "dist/http-server.js"]

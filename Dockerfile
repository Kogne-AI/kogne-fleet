# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.23.3
ARG BUN_VERSION=1.4.2

FROM oven/bun:${BUN_VERSION} AS bun

FROM node:${NODE_VERSION}-bookworm-slim AS runtime-base

# Coding sessions need these tools as well as the image's native-addon build.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential ca-certificates git libgomp1 openssh-client python3 ripgrep tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

# This is a separate executable from the SDK pinned by package-lock.json.
ARG CLAUDE_CODE_VERSION=2.1.300
RUN npm install --global --omit=dev --no-audit --no-fund \
        @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
    && npm cache clean --force \
    && ln -s /usr/local/bin/bun /usr/local/bin/bunx

FROM runtime-base AS build
WORKDIR /app
ENV HUSKY=0 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    WALNUT_REQUIRE_BUN=1

# postinstall needs src/, patches/ and web/ present; root npm ci also runs web npm ci.
COPY . .
RUN npm ci --no-audit --no-fund
RUN npm run build
RUN cd web && npx --no-install vite build
# Keep optional native dependencies and the SDK patch; avoid rerunning postinstall.
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

FROM runtime-base AS runtime
ARG CAPROVER_GIT_COMMIT_SHA
LABEL org.opencontainers.image.revision="${CAPROVER_GIT_COMMIT_SHA}"
ENV NODE_ENV=production \
    HOME=/home/node \
    OPEN_WALNUT_HOME=/home/node/.open-walnut \
    WALNUT_DAEMON_DIR=/home/node/.open-walnut/daemon \
    WALNUT_NO_AUTO_UPDATE=1 \
    WALNUT_NO_UPDATE_CHECK=1
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/bin ./bin
COPY --from=build /app/packages ./packages
# The daemon's version check and source fallback read the matching source tree.
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/patches ./patches
COPY --from=build /app/README.md /app/LICENSE ./

RUN ln -s /app/bin/open-walnut.js /usr/local/bin/walnut \
    && ln -s /app/bin/open-walnut.js /usr/local/bin/open-walnut \
    && install -d -m 700 -o node -g node \
        /home/node/.open-walnut /home/node/.open-walnut/daemon \
        /home/node/.claude /home/node/workspaces \
    && chown node:node /home/node \
    && chmod 700 /home/node

USER node:node
VOLUME ["/home/node"]
EXPOSE 3456

# Public identity only: no credentials, local-trust exception, or model request.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD ["node", "--input-type=module", "-e", "const r=await fetch('http://127.0.0.1:3456/api/v1/instance',{signal:AbortSignal.timeout(4000)});const b=await r.json();if(!r.ok||b.mode!=='LIVE'||typeof b.instance!=='string'||!b.instance)process.exit(1)"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/cli.js", "web", "--port", "3456"]

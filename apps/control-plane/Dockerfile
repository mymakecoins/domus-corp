# syntax=docker/dockerfile:1.7
FROM node:22.18.0-alpine3.22 AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/control-plane/package.json apps/control-plane/package.json
RUN pnpm install --frozen-lockfile
COPY apps/control-plane apps/control-plane
RUN pnpm --filter @domus/control-plane build && pnpm --filter @domus/control-plane deploy --prod /opt/control-plane

FROM node:22.18.0-alpine3.22 AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /opt/control-plane ./
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

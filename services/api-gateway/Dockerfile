FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api-gateway/package.json ./services/api-gateway/

RUN npm install

COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY services/api-gateway/src ./services/api-gateway/src
COPY services/api-gateway/tsconfig.json ./services/api-gateway/
COPY tsconfig.base.json ./

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/api-gateway

FROM node:20-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api-gateway/package.json ./services/api-gateway/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "services/api-gateway/dist/index.js"]

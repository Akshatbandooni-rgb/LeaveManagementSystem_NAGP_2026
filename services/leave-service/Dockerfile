FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/leave-service/package.json ./services/leave-service/

RUN npm install

COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY services/leave-service/src ./services/leave-service/src
COPY services/leave-service/tsconfig.json ./services/leave-service/
COPY tsconfig.base.json ./

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/leave-service

FROM node:20-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/leave-service/package.json ./services/leave-service/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/leave-service/dist ./services/leave-service/dist

USER appuser

EXPOSE 3002

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "services/leave-service/dist/index.js"]

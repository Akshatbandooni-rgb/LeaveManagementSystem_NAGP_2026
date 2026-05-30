FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/user-service/package.json ./services/user-service/

RUN npm install

COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/
COPY services/user-service/src ./services/user-service/src
COPY services/user-service/tsconfig.json ./services/user-service/
COPY tsconfig.base.json ./

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=services/user-service

FROM node:20-alpine AS production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/user-service/package.json ./services/user-service/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/user-service/dist ./services/user-service/dist

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "services/user-service/dist/index.js"]

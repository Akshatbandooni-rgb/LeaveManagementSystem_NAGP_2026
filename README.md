# Leave Management System

A microservices-based backend for managing employee leave requests. Employees apply for leave, managers approve or reject requests, and notifications are logged automatically via RabbitMQ. No frontend — all interaction is through REST APIs.

---

## Quick Start

```bash
git clone https://github.com/Akshatbandooni-rgb/LeaveManagementSystem_NAGP_2026.git
cd leave-management-system
cp .env.example .env
docker-compose up
```

> **Windows PowerShell:** use `Copy-Item .env.example .env` instead of `cp`.

> **No `--build` needed.** Images are pre-published on Docker Hub and pulled automatically.

Wait about 60 seconds for all services to become healthy, then verify:

```bash
curl http://localhost:3000/health
```

---

## First API Call

If you see a token in the response below, the system is working.

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@company.com","password":"password123"}'
```

Expected response:

```json
{
  "token": "eyJhbGci...",
  "userId": "emp-001",
  "role": "EMPLOYEE",
  "expiresIn": "8h"
}
```

---

## Pre-requisites

| Tool | Verify |
|---|---|
| Node.js 20+ | `node --version` |
| Docker Desktop or Rancher Desktop | `docker --version` |
| Docker Compose | `docker-compose --version` |
| Git | `git --version` |
| Postman | Open and confirm it launches |

---

## Environment Variables

Create `.env` at the repository root before starting. Copy from `.env.example`:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Signs and verifies JWT tokens |
| `INTERNAL_SECRET` | Yes | Shared secret between Gateway and services |
| `RABBITMQ_URL` | Yes | RabbitMQ connection — auto-overridden inside Docker |
| `CONSUL_URL` | Yes | Consul connection — auto-overridden inside Docker |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | Jaeger OTLP endpoint for tracing |

The `.env.example` file contains working local values. Inside Docker, `RABBITMQ_URL` and `CONSUL_URL` are automatically overridden to use Docker service names.

---

## Running the System

### Option A — Docker (Recommended)

```bash
docker-compose up
```

This pulls pre-built images from Docker Hub and starts all seven containers. No Node.js or npm installation required on your machine.

To stop:

```bash
docker-compose down
```

To stop and remove all volumes (use this if RabbitMQ fails to start):

```bash
docker-compose down -v
```

### Option B — Local Development

Run infrastructure in Docker and app services locally with `npm run dev`.

```bash
# Step 1 — start infrastructure only
docker-compose up consul rabbitmq jaeger -d

# Step 2 — install dependencies
npm install

# Step 3 — start services in separate terminals, in this order
cd services/user-service && npm run dev
cd services/leave-service && npm run dev
cd services/notification-service && npm run dev
cd services/api-gateway && npm run dev
```

Start order matters. Always start `user-service` first and `api-gateway` last.

---

## Verify the System is Running

| Component | URL | What to Check |
|---|---|---|
| Gateway health | `http://localhost:3000/health` | Returns `200` with circuit states |
| Consul UI | `http://localhost:8500` | All three services show green |
| RabbitMQ UI | `http://localhost:15672` | Login: `admin` / `admin` |
| Jaeger UI | `http://localhost:16686` | Services appear after first API call |

---

## Project Structure

```
leave-management-system/
├── docker-compose.yml
├── package.json
├── tsconfig.base.json
├── .env.example
├── postman-collection.json
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── constants/
│           │   └── leave.constants.ts
│           ├── errors/
│           │   └── AppError.ts
│           └── types/
│               ├── events.types.ts
│               ├── leave.types.ts
│               └── user.types.ts
└── services/
    ├── api-gateway/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── config.ts
    │       ├── index.ts
    │       ├── lib/
    │       │   ├── circuitBreaker.ts
    │       │   ├── logger.ts
    │       │   ├── proxy.ts
    │       │   ├── serviceRegistry.ts
    │       │   └── tracing.ts
    │       ├── middleware/
    │       │   ├── auth.middleware.ts
    │       │   ├── correlationId.middleware.ts
    │       │   ├── enrichRequest.middleware.ts
    │       │   └── errorHandler.middleware.ts
    │       └── routes/
    │           └── proxy.routes.ts
    ├── user-service/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── config.ts
    │       ├── index.ts
    │       ├── controllers/
    │       │   ├── auth.controller.ts
    │       │   └── user.controller.ts
    │       ├── lib/
    │       │   ├── consul.ts
    │       │   ├── logger.ts
    │       │   ├── rabbitmq.ts
    │       │   └── tracing.ts
    │       ├── middleware/
    │       │   ├── errorHandler.middleware.ts
    │       │   ├── internalAuth.middleware.ts
    │       │   ├── requireRole.middleware.ts
    │       │   └── validate.middleware.ts
    │       ├── repositories/
    │       │   └── user.repository.ts
    │       ├── routes/
    │       │   ├── auth.routes.ts
    │       │   └── user.routes.ts
    │       ├── services/
    │       │   ├── auth.service.ts
    │       │   └── user.service.ts
    │       └── validators/
    │           ├── auth.validators.ts
    │           └── user.validators.ts
    ├── leave-service/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── config.ts
    │       ├── index.ts
    │       ├── controllers/
    │       │   ├── balance.controller.ts
    │       │   └── leave.controller.ts
    │       ├── events/
    │       │   └── consumer/
    │       │       └── user.consumer.ts
    │       ├── lib/
    │       │   ├── consul.ts
    │       │   ├── logger.ts
    │       │   ├── rabbitmq.ts
    │       │   └── tracing.ts
    │       ├── middleware/
    │       │   ├── correlationId.middleware.ts
    │       │   ├── errorHandler.middleware.ts
    │       │   ├── internalAuth.middleware.ts
    │       │   ├── requireRole.middleware.ts
    │       │   └── validate.middleware.ts
    │       ├── repositories/
    │       │   ├── balance.repository.ts
    │       │   └── leave.repository.ts
    │       ├── routes/
    │       │   ├── balance.routes.ts
    │       │   └── leave.routes.ts
    │       ├── services/
    │       │   ├── balance.service.ts
    │       │   └── leave.service.ts
    │       └── validators/
    │           └── leave.validators.ts
    └── notification-service/
        ├── Dockerfile
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── config.ts
            ├── index.ts
            ├── consumers/
            │   └── leave.consumer.ts
            └── lib/
                ├── consul.ts
                ├── logger.ts
                └── tracing.ts
```

---

## Seeded Test Users

Available immediately on startup. No setup required.

| Name | Email | Password | Role | ID |
|---|---|---|---|---|
| Alice Johnson | `alice@company.com` | `password123` | EMPLOYEE | `emp-001` |
| Bob Smith | `bob@company.com` | `password123` | EMPLOYEE | `emp-002` |
| Charlie Manager | `charlie@company.com` | `password123` | MANAGER | `mgr-001` |

Alice and Bob start with `CASUAL: 12`, `SICK: 10`, `PRIVILEGE: 15`.

---

## API Endpoints

All requests go through the Gateway at `http://localhost:3000`.

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login and receive JWT token |
| GET | `/users/:id` | Authenticated | Get user by ID |
| GET | `/users` | Manager only | List all users |
| POST | `/users` | Manager only | Create new user |
| GET | `/balances/my-balance` | Employee only | View own leave balance |
| POST | `/leaves` | Employee only | Apply for leave |
| GET | `/leaves/my-requests` | Employee only | View own leave history |
| GET | `/leaves/pending` | Manager only | View team pending requests |
| PATCH | `/leaves/:id/approve` | Manager only | Approve a leave request |
| PATCH | `/leaves/:id/reject` | Manager only | Reject a leave request |
| GET | `/health` | Public | Gateway health and circuit states |

All protected endpoints require:

```
Authorization: Bearer <token>
```

All error responses follow this shape:

```json
{
  "error": "message here",
  "details": [],
  "correlationId": "uuid"
}
```

---

## Testing with Postman

Import `NAGP_Microservices_PostmanCollection_2026.json` from the repository root into Postman.

Create a Postman environment with these two variables:

| Variable | Value |
|---|---|
| `gatewayBaseUrl` | `http://localhost:3000` |
| `managerUserId` | `mgr-001` |

Run these four requests first, in this order. All other requests depend on the tokens and IDs they capture:

1. **Login - Alice (Employee)** — captures `employeeToken`
2. **Login - Charlie (Manager)** — captures `managerToken`
3. **Apply Leave - Success** — captures `pendingLeaveRequestId`
4. **Apply Leave To Reject Later** — captures `rejectedLeaveRequestId`

After these four, run all remaining requests in any order.

---

## Useful Commands

| Command | What It Does |
|---|---|
| `docker-compose up` | Start the entire system using Docker Hub images |
| `docker-compose down` | Stop all containers |
| `docker-compose down -v` | Stop all containers and remove volumes |
| `docker-compose pull` | Pull latest images from Docker Hub |
| `docker-compose ps` | Check container health status |
| `docker-compose logs -f leave-service` | Follow Leave Service logs |
| `docker-compose logs notification-service` | Check notification output |
| `docker-compose stop leave-service` | Stop one service (circuit breaker demo) |
| `docker-compose start leave-service` | Restart a stopped service |
| `docker-compose restart leave-service` | Restart without rebuilding |

---

## Docker Hub Images

All images are publicly available. No build step required.

| Service | Image |
|---|---|
| API Gateway | `akshatbandooni333/lms-api-gateway:latest` |
| User Service | `akshatbandooni333/lms-user-service:latest` |
| Leave Service | `akshatbandooni333/lms-leave-service:latest` |
| Notification Service | `akshatbandooni333/lms-notification-service:latest` |



---

## Evaluator Quick Start

```bash
git clone https://github.com/Akshatbandooni-rgb/LeaveManagementSystem_NAGP_2026.git
cd leave-management-system
cp .env.example .env
docker-compose up
```

After startup:
- Gateway health: `http://localhost:3000/health`
- Import `postman-collection.json` into Postman
- Run Login requests first, then all other requests

Fresh machine checklist:
1. Docker Desktop or Rancher Desktop is running
2. Ports `3000`, `3001`, `3002`, `3003`, `4318`, `5672`, `8500`, `15672`, `16686` are free
3. `.env` exists at the repository root with non-empty `JWT_SECRET` and `INTERNAL_SECRET`

Demo video: `[link placeholder]`

---

## Troubleshooting

### Services fail to start immediately

Check that `.env` exists at the repository root and that `JWT_SECRET` and `INTERNAL_SECRET` are not empty. These two variables are required by the Gateway, User Service, and Leave Service on boot. The services will exit immediately if either value is missing.

### RabbitMQ fails with `.erlang.cookie` or `BOOT FAILED` or `eacces` error

A stale RabbitMQ volume from a previous run has a different Erlang cookie than the new container expects. Fix it with:

```bash
docker-compose down -v
docker-compose up
```

> **Important:** the `-v` flag removes the RabbitMQ volume only. All application data — users, leave requests, balances — lives in service memory, not in RabbitMQ. Nothing important is lost. Do not add `--build` after this; images are pulled from Docker Hub and nothing needs to be rebuilt.

This issue usually happens after running `docker-compose down` without `-v` and then restarting. Always use `docker-compose down -v` when tearing down completely.

### Port already in use

Ports used by this project:

| Port | Service |
|---|---|
| 3000 | API Gateway |
| 3001 | User Service |
| 3002 | Leave Service |
| 3003 | Notification Service |
| 4318 | Jaeger OTLP |
| 5672 | RabbitMQ |
| 8500 | Consul |
| 15672 | RabbitMQ Management UI |
| 16686 | Jaeger UI |

Check what is using a port:

```bash
# macOS / Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

### Consul shows services as unhealthy right after startup

Health checks need up to 30 seconds to pass after containers start. Wait and then refresh the Consul UI at `http://localhost:8500`.

### docker-compose up pulls old images

Force a fresh pull before starting:

```bash
docker-compose pull
docker-compose up
```
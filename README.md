# Leave Management System

## Section 1 - Project Overview

The Leave Management System is a microservices-based backend system for managing employee leave requests inside an organization. It supports the core business process where employees submit leave requests, managers review those requests, and notifications are generated asynchronously when leave activity happens.

This project has no frontend UI. All interaction is done through REST APIs exposed by the API Gateway on port `3000`. External clients such as Postman, curl, or a future web/mobile frontend should call the Gateway only. The Gateway validates authentication and forwards requests to the correct internal service.

The three main user flows are:

1. Employee leave application: an employee logs in, checks their leave balance, and applies for leave by selecting a leave type, date range, number of days, reason, and manager.
2. Manager approval or rejection: a manager logs in, views pending requests assigned to them, approves valid requests, or rejects requests with a rejection reason.
3. Automated notification system: leave application, approval, and rejection events are published to RabbitMQ by the Leave Service and consumed by the Notification Service, which logs structured notification messages.

## Section 2 - Architecture Overview

```text
                                      +----------------------+
                                      |      Client          |
                                      | Postman / curl / API |
                                      +----------+-----------+
                                                 |
                                                 | REST HTTP
                                                 v
                                      +----------------------+
                                      |   API Gateway        |
                                      |   Port: 3000         |
                                      |   JWT validation     |
                                      |   Circuit breakers   |
                                      +----+------------+----+
                                           |            |
                         sync HTTP         |            | sync HTTP
                                           |            |
                                           v            v
                              +----------------+   +----------------+
                              | User Service   |   | Leave Service  |
                              | Port: 3001     |   | Port: 3002     |
                              | Users + auth   |   | Leave rules    |
                              +-------+--------+   +---+--------+---+
                                      |                ^        |
                                      | async publish  | async  | async publish
                                      v                | consume v
                              +---------------------------------------+
                              |              RabbitMQ                 |
                              | Port: 5672, UI: 15672                |
                              | Exchange: user.events                |
                              | Queue: leave-service.user.created    |
                              | Exchange: leave.events               |
                              | Queue: notification.queue            |
                              +-------------------+-------------------+
                                                  |
                                                  | async consume
                                                  v
                                      +----------------------+
                                      | Notification Service |
                                      | Port: 3003           |
                                      | Event consumer only  |
                                      +----------------------+

        +---------------------------------------------------------------+
        | Consul - Port: 8500                                           |
        | Backend services register health checks; Gateway discovers    |
        | user-service and leave-service dynamically.                   |
        +---------------------------------------------------------------+

        +---------------------------------------------------------------+
        | Jaeger + OpenTelemetry                                        |
        | OTLP: 4318, UI: 16686                                         |
        | All services export distributed traces.                       |
        +---------------------------------------------------------------+
```

API Gateway (port 3000): the API Gateway is the only public entry point for clients. It validates JWT tokens, strips the raw `Authorization` header before forwarding, adds trusted internal headers such as `X-User-Id`, `X-User-Role`, `X-Internal-Secret`, and `X-Correlation-Id`, resolves downstream service addresses using Consul, and wraps downstream calls with Opossum circuit breakers. It does not contain business logic for users, leave balances, approvals, or notifications.

User Service (port 3001): the User Service owns identity data, login, JWT issuance, seeded users, and user CRUD. It validates login credentials with `bcryptjs`, issues 8-hour JWTs with `jsonwebtoken`, and publishes a `user.created` event when a new employee is created so the Leave Service can initialize leave balances.

Leave Service (port 3002): the Leave Service is the most complex service. It owns leave requests, leave balances, leave history, manager approval and rejection, overlap checks, date checks, balance checks, and balance deduction. It consumes `user.created` from RabbitMQ to initialize balances for new employees and publishes `leave.applied`, `leave.approved`, and `leave.rejected` events for notifications.

Notification Service (port 3003): the Notification Service has no business HTTP API except `/health`. It consumes leave events from RabbitMQ and logs structured notification messages. It does not block leave operations because notifications are processed asynchronously.

RabbitMQ: RabbitMQ is the message broker for asynchronous communication. The `user.events` topic exchange carries `user.created` events from User Service to Leave Service. The `leave.events` topic exchange carries `leave.applied`, `leave.approved`, and `leave.rejected` events from Leave Service to Notification Service.

Consul: Consul is the service registry. Backend services register themselves and health checks on startup. The Gateway uses Consul to resolve healthy service addresses dynamically instead of hardcoding service URLs.

Jaeger: Jaeger receives OpenTelemetry traces from every service. The UI at `http://localhost:16686` lets an evaluator inspect end-to-end traces across Gateway, User Service, Leave Service, and Notification Service.

## Section 3 - Tech Stack

| Technology | Purpose | Why Chosen |
|---|---|---|
| Node.js 20 | JavaScript runtime for all services | Current LTS-grade runtime with strong ecosystem support and good Docker support |
| Express.js | HTTP server and routing | Small, predictable, and easy to compose with middleware |
| TypeScript (strict mode) | Static typing | Catches contract errors early and makes shared DTOs reliable across services |
| In-memory Map | Data storage | Keeps the assignment lightweight and easy to run without a database |
| jsonwebtoken | JWT signing and verification | Standard JWT library used by User Service and Gateway |
| bcryptjs | Password hashing and comparison | Provides safe password hashing without native build requirements |
| Zod | Request validation | Produces explicit runtime validation for request bodies and query parameters |
| Pino | Structured JSON logging | Fast logger that produces machine-readable logs for demos and debugging |
| Opossum | Circuit breaker | Protects the Gateway from repeatedly waiting on unhealthy downstream services |
| amqp-connection-manager | RabbitMQ connection handling | Adds automatic reconnect behavior for AMQP publishers and consumers |
| RabbitMQ | Asynchronous messaging | Decouples user creation and notification workflows from synchronous APIs |
| Consul | Service registry and discovery | Lets services register health checks and lets Gateway resolve healthy instances |
| Jaeger + OpenTelemetry | Distributed tracing | Shows request flow and timing across service boundaries |
| Docker + Docker Compose | Local orchestration | Starts infrastructure and services with one command |

## Section 4 - Project Structure

```text
leave-management-system/
|-- README.md
|-- ARCHITECTURE.md
|-- docker-compose.yml
|-- package.json
|-- package-lock.json
|-- postman-collection.json
|-- tsconfig.base.json
|-- .env.example
|-- packages/
|   `-- shared/
|       |-- package.json
|       |-- tsconfig.json
|       `-- src/
|           |-- index.ts
|           |-- constants/
|           |   `-- leave.constants.ts
|           |-- errors/
|           |   `-- AppError.ts
|           `-- types/
|               |-- events.types.ts
|               |-- leave.types.ts
|               `-- user.types.ts
`-- services/
    |-- api-gateway/
    |   |-- Dockerfile
    |   |-- package.json
    |   |-- tsconfig.json
    |   `-- src/
    |       |-- config.ts
    |       |-- index.ts
    |       |-- lib/
    |       |   |-- circuitBreaker.ts
    |       |   |-- logger.ts
    |       |   |-- proxy.ts
    |       |   |-- serviceRegistry.ts
    |       |   `-- tracing.ts
    |       |-- middleware/
    |       |   |-- auth.middleware.ts
    |       |   |-- correlationId.middleware.ts
    |       |   |-- enrichRequest.middleware.ts
    |       |   `-- errorHandler.middleware.ts
    |       |-- routes/
    |       |   `-- proxy.routes.ts
    |       `-- types/
    |           `-- express.ts
    |-- user-service/
    |   |-- Dockerfile
    |   |-- package.json
    |   |-- tsconfig.json
    |   `-- src/
    |       |-- config.ts
    |       |-- index.ts
    |       |-- controllers/
    |       |   |-- auth.controller.ts
    |       |   `-- user.controller.ts
    |       |-- lib/
    |       |   |-- consul.ts
    |       |   |-- logger.ts
    |       |   |-- rabbitmq.ts
    |       |   `-- tracing.ts
    |       |-- middleware/
    |       |   |-- errorHandler.middleware.ts
    |       |   |-- internalAuth.middleware.ts
    |       |   |-- requireRole.middleware.ts
    |       |   `-- validate.middleware.ts
    |       |-- repositories/
    |       |   `-- user.repository.ts
    |       |-- routes/
    |       |   |-- auth.routes.ts
    |       |   `-- user.routes.ts
    |       |-- services/
    |       |   |-- auth.service.ts
    |       |   `-- user.service.ts
    |       |-- types/
    |       |   `-- express.ts
    |       `-- validators/
    |           |-- auth.validators.ts
    |           `-- user.validators.ts
    |-- leave-service/
    |   |-- Dockerfile
    |   |-- package.json
    |   |-- tsconfig.json
    |   `-- src/
    |       |-- config.ts
    |       |-- index.ts
    |       |-- controllers/
    |       |   |-- balance.controller.ts
    |       |   `-- leave.controller.ts
    |       |-- events/
    |       |   `-- consumer/
    |       |       `-- user.consumer.ts
    |       |-- lib/
    |       |   |-- consul.ts
    |       |   |-- logger.ts
    |       |   |-- rabbitmq.ts
    |       |   `-- tracing.ts
    |       |-- middleware/
    |       |   |-- correlationId.middleware.ts
    |       |   |-- errorHandler.middleware.ts
    |       |   |-- internalAuth.middleware.ts
    |       |   |-- requireRole.middleware.ts
    |       |   `-- validate.middleware.ts
    |       |-- repositories/
    |       |   |-- balance.repository.ts
    |       |   `-- leave.repository.ts
    |       |-- routes/
    |       |   |-- balance.routes.ts
    |       |   `-- leave.routes.ts
    |       |-- services/
    |       |   |-- balance.service.ts
    |       |   `-- leave.service.ts
    |       |-- types/
    |       |   `-- express.ts
    |       `-- validators/
    |           `-- leave.validators.ts
    `-- notification-service/
        |-- Dockerfile
        |-- package.json
        |-- tsconfig.json
        `-- src/
            |-- config.ts
            |-- index.ts
            |-- consumers/
            |   `-- leave.consumer.ts
            `-- lib/
                |-- consul.ts
                |-- logger.ts
                `-- tracing.ts
```

Layering rules:

Routes only define URL patterns and middleware chains. They do not contain validation details beyond attaching validation middleware, and they do not contain business decisions.

Controllers only handle HTTP input and output. They read path parameters, query parameters, request bodies, and authenticated user context, call services, and return HTTP responses.

Services contain all business logic. Leave date checks, overlap checks, balance checks, approval rules, rejection rules, and event publishing decisions live in service functions.

Repositories are the only layer that touches the in-memory `Map` stores. They create, read, update, and query users, leave requests, and balances.

The shared package contains only shared types, interfaces, enums, constants, and `AppError`. It contains no business logic and imports nothing from service folders.

## Section 5 - Pre-requisites

Install these tools before running the project:

| Tool | Required Version | Verify |
|---|---:|---|
| Node.js | 20 or higher | `node --version` |
| Rancher Desktop or Docker Desktop | Current stable version | `docker --version` and `docker-compose --version` |
| Git | Current stable version | `git --version` |
| Postman | Current stable version | Open Postman and confirm it launches |

Rancher Desktop is a free Docker-compatible option. Docker Desktop also works.

## Section 6 - Environment Variables

| Variable | Required | Default | Description | Which Services Use It |
|---|---|---|---|---|
| `JWT_SECRET` | Yes | None | Signs and verifies JWT tokens | API Gateway, User Service |
| `INTERNAL_SECRET` | Yes | None | Shared secret added by Gateway and checked by downstream services to prevent direct service access | API Gateway, User Service, Leave Service |
| `RABBITMQ_URL` | Yes | `amqp://admin:admin@localhost:5672` | RabbitMQ connection string | User Service, Leave Service, Notification Service |
| `CONSUL_URL` | Yes | `http://localhost:8500` | Consul connection for service discovery and service registration | API Gateway, User Service, Leave Service, Notification Service |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | `http://localhost:4318` | Jaeger OTLP endpoint for distributed tracing | API Gateway, User Service, Leave Service, Notification Service |
| `PORT` | No | Varies by service | HTTP port the service listens on | Each service |

The `.env` file is required at runtime and is intentionally not committed to Git. A fresh clone contains `.env.example`, but it does not contain `.env`. Create `.env` at the monorepo root before starting the system.

On macOS, Linux, or Git Bash:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

The checked-in `.env.example` contains demo-safe local values:

```bash
JWT_SECRET=dev-jwt-secret-local
INTERNAL_SECRET=dev-internal-secret-local
RABBITMQ_URL=amqp://admin:admin@localhost:5672
CONSUL_URL=http://localhost:8500
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Inside Docker, RabbitMQ and Consul are reached through Docker service names. `RABBITMQ_URL` becomes `amqp://admin:admin@rabbitmq:5672` and `CONSUL_URL` becomes `http://consul:8500`. The `docker-compose.yml` file handles this override automatically for containers. `JWT_SECRET` and `INTERNAL_SECRET` still come from `.env`, so the services will not start correctly on another machine until `.env` exists.

## Section 7 - Running the System

### 7a - Single Command (Docker - Recommended)

1. Clone the repository and enter the project folder:

```bash
git clone https://github.com/Akshatbandooni-rgb/LeaveManagementSystem_NAGP_2026.git
cd leave-management-system
```

2. Create `.env` at the root. This step is required on a fresh evaluator machine because `.env` is ignored by Git:

On macOS, Linux, or Git Bash:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Start everything:

```bash
docker-compose up --build
```

This command builds all four application images locally from the Dockerfiles in the repository. Node.js and `npm install` are not required on the evaluator machine for this Docker-based path because the build happens inside Docker.

4. Wait until all service health checks report healthy:

```bash
docker-compose ps
```

5. Verify the Gateway health endpoint:

```bash
curl -i http://localhost:3000/health
```

If startup fails immediately, first verify that `.env` exists and contains non-empty `JWT_SECRET` and `INTERNAL_SECRET` values. Those two variables are required by the API Gateway, User Service, and Leave Service during boot.

If RabbitMQ fails with an Erlang cookie permission error such as `Error when reading /var/lib/rabbitmq/.erlang.cookie: eacces`, remove the old RabbitMQ volume and start again:

```bash
docker-compose down -v
docker-compose up --build
```

This deletes local RabbitMQ container data only. The application itself uses in-memory service data, so there is no project database to migrate.

### 7b - Local Development (without Docker for app services)

Infrastructure still runs in Docker. The four Node.js app services can run locally with `npm run dev`.

1. Start infrastructure only:

```bash
docker-compose up consul rabbitmq jaeger -d
```

2. Install workspace dependencies at the root:

```bash
npm install
```

3. Start User Service first:

```bash
cd services/user-service
npm run dev
```

4. Start Leave Service second in a new terminal:

```bash
cd services/leave-service
npm run dev
```

5. Start Notification Service third in a new terminal:

```bash
cd services/notification-service
npm run dev
```

6. Start API Gateway last in a new terminal:

```bash
cd services/api-gateway
npm run dev
```

Start order matters for the cleanest demo: `user-service`, then `leave-service`, then `notification-service`, then `api-gateway`.

## Section 8 - Verifying the System is Running

| Component | URL or Command | Expected Result |
|---|---|---|
| Gateway health check | `curl -i http://localhost:3000/health` | HTTP `200` with Gateway status and circuit states |
| Consul UI | `http://localhost:8500` | `user-service`, `leave-service`, and `notification-service` show green health checks |
| RabbitMQ Management UI | `http://localhost:15672` | Login with `admin` / `admin`; exchanges `user.events` and `leave.events` are visible after services start |
| Jaeger UI | `http://localhost:16686` | Services appear in the service dropdown after API traffic is generated |

Gateway health command:

```bash
curl -i http://localhost:3000/health
```

Expected response shape:

```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2026-05-31T00:00:00.000Z",
  "circuits": {
    "user-service": "closed",
    "leave-service": "closed"
  }
}
```

On a completely fresh Gateway process, `circuits` may be `{}` until the first proxied request creates circuit breaker instances.

## Section 9 - API Documentation

All external API calls go through the Gateway at `http://localhost:3000`. Downstream service ports are internal implementation details.

All error responses use this shape:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ],
  "correlationId": "0f80e0dc-3a4b-47e6-a4fa-cd80fd76d61b"
}
```

Authenticated requests require this header:

```text
Authorization: Bearer <JWT_TOKEN_FROM_LOGIN>
```

### Authentication

#### POST /auth/login

| Field | Value |
|---|---|
| Access | Public |
| Headers | `Content-Type: application/json` |
| Body | `email`, `password` |

Request body:

```json
{
  "email": "alice@company.com",
  "password": "password123"
}
```

Success response, HTTP `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "emp-001",
  "role": "EMPLOYEE",
  "expiresIn": "8h"
}
```

Failure responses:

| Status | Example |
|---:|---|
| 400 | `{"error":"Validation failed","details":[{"field":"email","message":"Invalid email"}],"correlationId":"..."}` |
| 401 | `{"error":"Invalid credentials","correlationId":"..."}` |

### User Management

#### GET /users/:id

| Field | Value |
|---|---|
| Access | Authenticated employee or manager |
| Headers | `Authorization: Bearer <token>` |
| Path parameter | `id`, for example `emp-001` |

Success response, HTTP `200`:

```json
{
  "id": "emp-001",
  "name": "Alice Johnson",
  "email": "alice@company.com",
  "role": "EMPLOYEE",
  "managerId": "mgr-001",
  "createdAt": "2026-05-31T00:00:00.000Z"
}
```

Failure responses:

| Status | Example |
|---:|---|
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 404 | `{"error":"User not found","correlationId":"..."}` |

#### GET /users

| Field | Value |
|---|---|
| Access | Manager only |
| Headers | `Authorization: Bearer <manager token>` |

Success response, HTTP `200`:

```json
[
  {
    "id": "emp-001",
    "name": "Alice Johnson",
    "email": "alice@company.com",
    "role": "EMPLOYEE",
    "managerId": "mgr-001",
    "createdAt": "2026-05-31T00:00:00.000Z"
  },
  {
    "id": "mgr-001",
    "name": "Charlie Manager",
    "email": "charlie@company.com",
    "role": "MANAGER",
    "createdAt": "2026-05-31T00:00:00.000Z"
  }
]
```

Failure responses:

| Status | Example |
|---:|---|
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 403 | `{"error":"Access denied","correlationId":"..."}` |

#### POST /users

| Field | Value |
|---|---|
| Access | Authenticated manager only |
| Headers | `Authorization: Bearer <manager token>`, `Content-Type: application/json` |
| Body | `name`, `email`, `password`, `role`, optional `managerId` |

Request body:

```json
{
  "name": "Diana Employee",
  "email": "diana.employee@example.com",
  "password": "password123",
  "role": "EMPLOYEE",
  "managerId": "mgr-001"
}
```

Success response, HTTP `201`:

```json
{
  "id": "9d35a74d-9132-4e72-8b19-bbd81b99d505",
  "name": "Diana Employee",
  "email": "diana.employee@example.com",
  "role": "EMPLOYEE",
  "managerId": "mgr-001",
  "createdAt": "2026-05-31T00:00:00.000Z"
}
```

Failure responses:

| Status | Example |
|---:|---|
| 400 | `{"error":"Validation failed","details":[{"field":"password","message":"String must contain at least 6 character(s)"}],"correlationId":"..."}` |
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 403 | `{"error":"Access denied","correlationId":"..."}` |
| 409 | `{"error":"Email already in use","correlationId":"..."}` |

### Leave Balance

#### GET /balances/my-balance

| Field | Value |
|---|---|
| Access | Employee only |
| Headers | `Authorization: Bearer <employee token>` |

Success response, HTTP `200`:

```json
{
  "employeeId": "emp-001",
  "CASUAL": 12,
  "SICK": 10,
  "PRIVILEGE": 15
}
```

Failure responses:

| Status | Example |
|---:|---|
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 403 | `{"error":"Access denied","correlationId":"..."}` |
| 404 | `{"error":"Leave balance not found","correlationId":"..."}` |

### Leave Requests

#### POST /leaves

| Field | Value |
|---|---|
| Access | Employee only |
| Headers | `Authorization: Bearer <employee token>`, `Content-Type: application/json` |
| Body | `leaveType`, `startDate`, `endDate`, `numberOfDays`, `reason`, `managerId` |

Request body:

```json
{
  "leaveType": "CASUAL",
  "startDate": "2030-07-07",
  "endDate": "2030-07-08",
  "numberOfDays": 2,
  "reason": "Family function leave",
  "managerId": "mgr-001"
}
```

Success response, HTTP `201`:

```json
{
  "id": "b3f81c8a-0d58-43a9-9f93-a1a81cf45dd1",
  "employeeId": "emp-001",
  "managerId": "mgr-001",
  "leaveType": "CASUAL",
  "startDate": "2030-07-07",
  "endDate": "2030-07-08",
  "numberOfDays": 2,
  "reason": "Family function leave",
  "status": "PENDING",
  "createdAt": "2026-05-31T00:00:00.000Z",
  "updatedAt": "2026-05-31T00:00:00.000Z"
}
```

Failure responses:

| Status | Example |
|---:|---|
| 400 | `{"error":"Start date cannot be in the past","correlationId":"..."}` |
| 400 | `{"error":"Start date must be before or equal to end date","correlationId":"..."}` |
| 400 | `{"error":"numberOfDays must be 2 for the selected date range","correlationId":"..."}` |
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 403 | `{"error":"Access denied","correlationId":"..."}` |
| 409 | `{"error":"An overlapping leave request already exists for this period","correlationId":"..."}` |
| 422 | `{"error":"Insufficient leave balance","details":{"available":12,"requested":20,"leaveType":"CASUAL"},"correlationId":"..."}` |

#### GET /leaves/my-requests

| Field | Value |
|---|---|
| Access | Employee only |
| Headers | `Authorization: Bearer <employee token>` |
| Query parameters | `page`, `limit`, optional `status` |

Example path:

```text
/leaves/my-requests?page=1&limit=10&status=APPROVED
```

Success response, HTTP `200`:

```json
{
  "data": [
    {
      "id": "b3f81c8a-0d58-43a9-9f93-a1a81cf45dd1",
      "employeeId": "emp-001",
      "managerId": "mgr-001",
      "leaveType": "CASUAL",
      "startDate": "2030-07-07",
      "endDate": "2030-07-08",
      "numberOfDays": 2,
      "reason": "Family function leave",
      "status": "APPROVED",
      "createdAt": "2026-05-31T00:00:00.000Z",
      "updatedAt": "2026-05-31T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

Failure responses:

| Status | Example |
|---:|---|
| 400 | `{"error":"Validation failed","details":[{"field":"limit","message":"Number must be less than or equal to 50"}],"correlationId":"..."}` |
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 403 | `{"error":"Access denied","correlationId":"..."}` |

#### GET /leaves/pending

| Field | Value |
|---|---|
| Access | Manager only |
| Headers | `Authorization: Bearer <manager token>` |
| Query parameters | Optional `status`, `employeeId`, `fromDate`, `toDate` |

Example path:

```text
/leaves/pending?status=PENDING&employeeId=emp-001&fromDate=2030-07-01&toDate=2030-07-31
```

Success response, HTTP `200`:

```json
[
  {
    "id": "b3f81c8a-0d58-43a9-9f93-a1a81cf45dd1",
    "employeeId": "emp-001",
    "managerId": "mgr-001",
    "leaveType": "CASUAL",
    "startDate": "2030-07-07",
    "endDate": "2030-07-08",
    "numberOfDays": 2,
    "reason": "Family function leave",
    "status": "PENDING",
    "createdAt": "2026-05-31T00:00:00.000Z",
    "updatedAt": "2026-05-31T00:00:00.000Z"
  }
]
```

Failure responses:

| Status | Example |
|---:|---|
| 400 | `{"error":"Validation failed","details":[{"field":"status","message":"Invalid enum value"}],"correlationId":"..."}` |
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 403 | `{"error":"Access denied","correlationId":"..."}` |

#### PATCH /leaves/:id/approve

| Field | Value |
|---|---|
| Access | Manager only |
| Headers | `Authorization: Bearer <manager token>` |
| Path parameter | Leave request `id` |

Success response, HTTP `200`:

```json
{
  "id": "b3f81c8a-0d58-43a9-9f93-a1a81cf45dd1",
  "employeeId": "emp-001",
  "managerId": "mgr-001",
  "leaveType": "CASUAL",
  "startDate": "2030-07-07",
  "endDate": "2030-07-08",
  "numberOfDays": 2,
  "reason": "Family function leave",
  "status": "APPROVED",
  "createdAt": "2026-05-31T00:00:00.000Z",
  "updatedAt": "2026-05-31T00:00:00.000Z"
}
```

Failure responses:

| Status | Example |
|---:|---|
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 403 | `{"error":"Access denied","correlationId":"..."}` |
| 404 | `{"error":"Leave request not found","correlationId":"..."}` |
| 409 | `{"error":"Leave request is not in Pending status","correlationId":"..."}` |
| 422 | `{"error":"Insufficient leave balance","correlationId":"..."}` |

#### PATCH /leaves/:id/reject

| Field | Value |
|---|---|
| Access | Manager only |
| Headers | `Authorization: Bearer <manager token>`, `Content-Type: application/json` |
| Path parameter | Leave request `id` |
| Body | `rejectionReason` |

Request body:

```json
{
  "rejectionReason": "Team coverage is too low for these dates"
}
```

Success response, HTTP `200`:

```json
{
  "id": "c96d06ef-ef37-4c2d-b61c-9039fb153ad1",
  "employeeId": "emp-001",
  "managerId": "mgr-001",
  "leaveType": "SICK",
  "startDate": "2030-09-01",
  "endDate": "2030-09-01",
  "numberOfDays": 1,
  "reason": "Medical consultation",
  "status": "REJECTED",
  "rejectionReason": "Team coverage is too low for these dates",
  "createdAt": "2026-05-31T00:00:00.000Z",
  "updatedAt": "2026-05-31T00:00:00.000Z"
}
```

Failure responses:

| Status | Example |
|---:|---|
| 400 | `{"error":"Validation failed","details":[{"field":"rejectionReason","message":"Rejection reason required"}],"correlationId":"..."}` |
| 401 | `{"error":"Authorization token required","correlationId":"..."}` |
| 403 | `{"error":"Access denied","correlationId":"..."}` |
| 404 | `{"error":"Leave request not found","correlationId":"..."}` |
| 409 | `{"error":"Leave request is not in Pending status","correlationId":"..."}` |

### Health Checks

#### GET /health

| Service | Path | Access | Success |
|---|---|---|---|
| API Gateway | `http://localhost:3000/health` | Public | HTTP `200` with service name, timestamp, and circuit states |
| User Service | `http://localhost:3001/health` | Public in local dev | HTTP `200` with status |
| Leave Service | `http://localhost:3002/health` | Public in local dev | HTTP `200` with service name and timestamp |
| Notification Service | `http://localhost:3003/health` | Public in local dev | HTTP `200` with service name and timestamp |

Gateway success response:

```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2026-05-31T00:00:00.000Z",
  "circuits": {
    "user-service": "closed",
    "leave-service": "closed"
  }
}
```

## Section 10 - Seeded Test Users

These users are seeded in memory when User Service starts and are available immediately without any setup.

| Name | Email | Password | Role | Manager |
|---|---|---|---|---|
| Alice Johnson | `alice@company.com` | `password123` | `EMPLOYEE` | Charlie Manager (`mgr-001`) |
| Bob Smith | `bob@company.com` | `password123` | `EMPLOYEE` | Charlie Manager (`mgr-001`) |
| Charlie Manager | `charlie@company.com` | `password123` | `MANAGER` | None |

Seeded employee IDs are stable:

| Name | ID |
|---|---|
| Alice Johnson | `emp-001` |
| Bob Smith | `emp-002` |
| Charlie Manager | `mgr-001` |

Alice and Bob have leave balances available immediately when Leave Service starts: `CASUAL: 12`, `SICK: 10`, and `PRIVILEGE: 15`.

## Section 11 - Testing with Postman

A complete Postman collection is included at `postman-collection.json` in the project root.

### Import Collection

1. Open Postman.
2. Click **Import**.
3. Select `postman-collection.json` from the repository root.

### Create Environment

Create a Postman environment named **Leave Management Local**.

Add the following variables **exactly before running anything**:

| Variable | Value |
| --- | --- |
| `gatewayBaseUrl` | `http://localhost:3000` |
| `managerUserId` | `mgr-001` |

### Variables Set Automatically

The following variables are set automatically by the **Tests** scripts as you run requests:

- `employeeToken`
- `managerToken`
- `pendingLeaveRequestId`
- `rejectedLeaveRequestId`
- `newUserToken`
- `newUserId`

Do **not** set these manually.

### Select Environment

Select **Leave Management Local** as the active Postman environment before sending any request.

### Required Run Order

Run the requests in the following exact sequence. This order is required for everything to work because later requests depend on values captured from earlier responses.

1. **Login - Alice (Employee)** — sets `employeeToken`
2. **Login - Charlie (Manager)** — sets `managerToken`
3. **Apply Leave - Success** — sets `pendingLeaveRequestId`
4. **Apply Leave To Reject Later** — sets `rejectedLeaveRequestId`

After these four requests, you can run all other requests in any order.

### Recommended Verification Flow

1. Run **Login - Alice** and verify a token is received.
2. View Alice's leave balance and verify:
   - `CASUAL: 12`
   - `SICK: 10`
   - `PRIVILEGE: 15`
3. Run **Apply Leave - Success** and verify the leave ID is stored in `pendingLeaveRequestId`.
4. Run **Apply Leave To Reject Later** and verify the leave ID is stored in `rejectedLeaveRequestId`.
5. Try applying overlapping dates and verify HTTP `409`.
6. Try applying with insufficient balance and verify HTTP `422`.
7. Run **Login - Charlie** and verify `managerToken` is received.
8. View pending requests and verify Alice's request appears.
9. Approve Alice's leave and verify the status changes to `APPROVED`.
10. Reject the second leave request with a reason and verify the status changes to `REJECTED`.
11. View Alice's leave history and verify both `APPROVED` and `REJECTED` requests appear.
12. Try approving with Alice's employee token and verify HTTP `403`.
13. Try approving an already approved leave and verify HTTP `409`.


## Section 12 - Cross-Cutting Concerns

JWT Authentication: the Gateway validates all JWTs. The JWT secret is shared only between Gateway and User Service. Downstream services never receive or parse the raw JWT. They receive trusted headers from the Gateway: `X-User-Id`, `X-User-Role`, `X-Internal-Secret`, and `X-Correlation-Id`. To verify, send a protected request without a token and confirm HTTP `401`. Send an expired or invalid token and confirm HTTP `401`.

Role-Based Authorization: authorization has two layers. The first layer is role middleware, such as employee-only balance and leave application routes or manager-only approval routes. The second layer is resource ownership inside service logic, such as requiring the approving manager to match the `managerId` stored on the leave request. To verify, call a manager endpoint with Alice's token and confirm HTTP `403`. Create a leave assigned to one manager and try approving it with another manager token to confirm HTTP `403`.

Correlation ID: every request gets a unique UUID in `X-Correlation-Id`. It appears in response headers and in error responses. Services forward the same ID across internal calls and event payloads. To verify, make any request, copy the `X-Correlation-Id` response header, then search logs with `docker-compose logs | grep <correlationId>`.

Circuit Breaker: Opossum wraps every downstream call in the Gateway. Each circuit has a 5-second timeout, 5-request volume threshold, 50 percent error threshold, and 30-second reset timeout. To verify, stop Leave Service with `docker-compose stop leave-service`, send at least 6 leave requests through the Gateway, and check `GET /health`. The `leave-service` circuit changes from `closed` to `open` and responses become immediate HTTP `503`.

Structured Logging: every service uses Pino to produce JSON logs. Logs include service identity, timestamp, level, message, and correlation context where applicable. To verify, run `docker-compose logs leave-service` and inspect that log lines are JSON-formatted.

Distributed Tracing: OpenTelemetry instruments HTTP calls and exports traces to Jaeger. To verify, make an API request, open `http://localhost:16686`, select `api-gateway`, and click `Find Traces`. The trace shows timing across service boundaries.

Global Error Handling: each HTTP service has centralized error middleware. Expected errors are returned as `{ error, details, correlationId }`. Unexpected errors are logged and returned as HTTP `500`. To verify, send an invalid request body and confirm the error response shape is consistent.

Async Notification: notifications are event-driven. The Leave Service publishes `leave.applied`, `leave.approved`, and `leave.rejected` events to RabbitMQ and does not wait for Notification Service work to finish. To verify, stop Notification Service, approve or reject a leave, restart Notification Service, and confirm the queued event is processed from RabbitMQ.

## Section 13 - RabbitMQ Event Reference

| Event Name | Exchange | Routing Key | Published By | Consumed By | Trigger | Payload Fields |
|---|---|---|---|---|---|---|
| `user.created` | `user.events` | `user.created` | User Service | Leave Service | New `EMPLOYEE` created | `userId`, `role`, `correlationId` |
| `leave.applied` | `leave.events` | `leave.applied` | Leave Service | Notification Service | Employee submits leave request | `leaveRequest`, `managerId`, `correlationId` |
| `leave.approved` | `leave.events` | `leave.approved` | Leave Service | Notification Service | Manager approves request | `leaveRequest`, `employeeId`, `correlationId` |
| `leave.rejected` | `leave.events` | `leave.rejected` | Leave Service | Notification Service | Manager rejects request | `leaveRequest`, `employeeId`, `rejectionReason`, `correlationId` |

RabbitMQ topology:

| Exchange | Type | Queue | Binding Key | Purpose |
|---|---|---|---|---|
| `user.events` | `topic` | `leave-service.user.created` | `user.created` | Initialize leave balances for new employees |
| `leave.events` | `topic` | `notification.queue` | `leave.applied` | Notify manager about a new leave request |
| `leave.events` | `topic` | `notification.queue` | `leave.approved` | Notify employee that leave was approved |
| `leave.events` | `topic` | `notification.queue` | `leave.rejected` | Notify employee that leave was rejected |

## Section 14 - Business Rules Reference

1. Start date cannot be in the past.
2. Start date must be less than or equal to end date.
3. `numberOfDays` must exactly match the inclusive date range from `startDate` to `endDate`.
4. Employee must have sufficient balance for the requested leave type and number of days.
5. No two leave requests for the same employee can overlap in dates. This includes `PENDING` and `APPROVED` requests, but excludes `REJECTED` and `CANCELLED` requests.
6. Only `PENDING` leave requests can be approved or rejected. Attempting to change an already `APPROVED` or `REJECTED` request returns HTTP `409`.
7. Only the assigned manager, meaning the `managerId` stored on the leave request, can approve or reject that request.
8. Balance deduction happens atomically with status change on approval. If deduction fails, approval fails.
9. When a new employee is created, leave balances are automatically initialized to `CASUAL: 12`, `SICK: 10`, and `PRIVILEGE: 15` via the `user.created` RabbitMQ event.
10. Balance initialization is idempotent. If `user.created` is delivered twice, the existing balance is returned and the balance is not doubled.
11. Employees can only view their own leave history and balance.
12. Managers can view leave requests for their team only because manager queries are filtered by authenticated manager ID.
13. Only managers can list all users.
14. Only managers can create new users through the Gateway.
15. Downstream services reject direct protected API calls unless the request includes the correct internal secret from the Gateway.

## Section 15 - Useful Commands Reference

| Command | What It Does |
|---|---|
| `docker-compose up --build` | Start the entire system from scratch and rebuild images |
| `docker-compose up consul rabbitmq jaeger -d` | Start infrastructure only for local app development |
| `docker-compose down` | Stop all containers |
| `docker-compose down -v` | Stop all containers and remove volumes |
| `docker-compose logs -f leave-service` | Follow logs for Leave Service |
| `docker-compose logs notification-service` | Check notification output |
| `docker-compose ps` | Check which containers are running and healthy |
| `docker-compose restart leave-service` | Restart Leave Service without rebuilding |
| `docker-compose stop leave-service` | Stop Leave Service for the circuit breaker demo |
| `docker-compose start leave-service` | Start Leave Service again |
| `npm install` | Install all workspace dependencies from the monorepo root |
| `npx tsc --noEmit` | Type check without building when run inside a service folder |

## Section 16 - Demo Script Summary

1. Show `docker-compose up --build`, then explain that the complete system starts with one command.
2. Open Consul UI at `http://localhost:8500`, show registered services, and explain service registration and discovery.
3. Open RabbitMQ UI at `http://localhost:15672`, log in with `admin` / `admin`, show exchanges and queues, and explain async messaging.
4. Call `http://localhost:3000/health`, show circuit states, and explain Gateway circuit breakers.
5. Run `Login - Alice` in Postman, show the JWT token, and explain that it contains user ID, role, email, and expiry. Decode it at `https://jwt.io` during the demo if internet access is available.
6. Show Alice's balance and explain automatic initialization for employees.
7. Apply leave as Alice, show `PENDING` status, then show Notification Service logs containing the `leave.applied` notification.
8. Apply overlapping dates as Alice and show HTTP `409`, then explain overlap detection.
9. Apply leave with insufficient balance and show HTTP `422` with available and requested details.
10. Login as Charlie, approve Alice's leave, show `APPROVED`, show Alice's balance decreased, and show the `leave.approved` notification in logs.
11. Apply another leave as Alice, reject it as Charlie with a reason, show `REJECTED`, and show the notification containing the reason.
12. Show leave history with pagination and filtering using `/leaves/my-requests?page=1&limit=10&status=APPROVED`.
13. Demonstrate the circuit breaker by stopping Leave Service, sending repeated leave requests, showing the circuit opening in `/health`, restarting Leave Service, waiting for the reset timeout, and showing the circuit closing.
14. Show correlation ID by making a request, copying `X-Correlation-Id`, and searching Docker logs for the same ID across services.
15. Open Jaeger UI at `http://localhost:16686`, find the approve leave trace, and show the waterfall with timings across services.
16. Demonstrate HTTP `403` scenarios by using Alice's employee token on a manager endpoint and by explaining the assigned-manager ownership check.

## Section 18 - Repository Structure for Evaluator

| Item | Location |
|---|---|
| GitHub repo link | `(leave placeholder)` |
| Postman collection | `postman-collection.json` at the repository root |
| Docker image - API Gateway | `(leave placeholder: docker.io/<username>/leave-api-gateway:<tag>)` |
| Docker image - User Service | `(leave placeholder: docker.io/<username>/leave-user-service:<tag>)` |
| Docker image - Leave Service | `(leave placeholder: docker.io/<username>/leave-service:<tag>)` |
| Docker image - Notification Service | `(leave placeholder: docker.io/<username>/leave-notification-service:<tag>)` |
| Single command to run everything after `.env` is created | `docker-compose up --build` |
| Demo video link | `(leave placeholder)` |

The Docker image rows above are placeholders until the four service images are pushed to Docker Hub. The provided `docker-compose.yml` is still fully runnable from source because it uses `build:` entries for every application service. If Docker Hub images are published, replace the placeholders with the real image paths and optionally add `image:` entries to `docker-compose.yml` or provide a separate compose file for pulling images.

Evaluator quick start from a fresh clone:

```bash
git clone https://github.com/Akshatbandooni-rgb/LeaveManagementSystem_NAGP_2026.git
cd leave-management-system
cp .env.example .env
docker-compose up --build
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp .env.example .env`.

After startup, open `http://localhost:3000/health`, import `postman-collection.json`, login as Alice and Charlie, and run the documented Postman sequence.

Fresh machine checklist:

1. Docker Desktop or Rancher Desktop is running.
2. Ports `3000`, `5672`, `8500`, `15672`, `16686`, and `4318` are free.
3. `.env` exists at the repository root.
4. `.env` contains non-empty `JWT_SECRET` and `INTERNAL_SECRET` values.
5. Run `docker-compose up --build` from the repository root.

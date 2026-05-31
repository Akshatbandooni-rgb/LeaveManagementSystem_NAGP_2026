# Point 1 - Microservices Design Document

## Project Name

Leave Management System

## Purpose

The Leave Management System is a backend-only microservices project that manages employee leave requests. Employees can log in, check leave balances, and apply for leave. Managers can review leave requests assigned to them and approve or reject those requests. Notifications are handled asynchronously through RabbitMQ so the leave workflow is not blocked by notification processing.

There is no frontend UI in this project. All users interact with the system through REST APIs exposed by the API Gateway.

## Architecture Diagram

The editable draw.io source diagram is available here:

```text
docs/point-1-microservices-architecture.drawio
```

Open this file in diagrams.net / draw.io to view or edit the architecture. The file has two pages:

1. `Service Communication` - shows only business/service calls so the flow is easy to read.
2. `Platform Services` - shows Consul, Jaeger/OpenTelemetry, and RabbitMQ platform responsibilities separately.

## High-Level Architecture

```text
Client / Postman
      |
      | REST API
      v
API Gateway :3000
      |
      |-------------------- sync HTTP --------------------|
      |                                                   |
      v                                                   v
User Service :3001                              Leave Service :3002
      |                                                   |
      | async user.created                               | async leave events
      v                                                   v
RabbitMQ <---------------------------------------- RabbitMQ
      |
      | async consume
      v
Notification Service :3003

All services register with Consul.
All services export traces to Jaeger through OpenTelemetry.
```

## Main Components

| Component | Port | Responsibility |
|---|---:|---|
| API Gateway | `3000` | Single public entry point, JWT validation, request forwarding, service discovery, circuit breaker |
| User Service | `3001` | User identity, login, JWT issuance, user CRUD, `user.created` event publishing |
| Leave Service | `3002` | Leave requests, leave balances, business rules, approvals, rejections, leave event publishing |
| Notification Service | `3003` | Consumes leave events and logs notification messages |
| RabbitMQ | `5672`, UI `15672` | Message broker for asynchronous communication |
| Consul | `8500` | Service registry and health-based service discovery |
| Jaeger | UI `16686`, OTLP `4318` | Distributed tracing and request flow visualization |

## Service Responsibilities

### API Gateway

The API Gateway is the only public HTTP entry point for external clients. It validates JWT tokens, removes the raw `Authorization` header before forwarding, enriches downstream requests with trusted headers, resolves service locations through Consul, and applies circuit breakers for downstream service calls.

The Gateway does not contain business logic. It does not decide whether leave can be approved, whether balances are sufficient, or whether a user can own a resource. Those decisions belong to downstream services.

### User Service

The User Service owns user identity. It stores seeded users in memory, validates login credentials, issues JWT tokens, exposes user APIs, and publishes a `user.created` event when a new employee is created.

The service owns user data such as name, email, role, manager assignment, password hash, and creation timestamp.

### Leave Service

The Leave Service owns the leave domain. It stores leave requests and leave balances in memory. It enforces all leave business rules, including date validation, overlap detection, sufficient balance checks, manager ownership checks, and balance deduction during approval.

It consumes `user.created` events from RabbitMQ to initialize balances for new employees. It publishes `leave.applied`, `leave.approved`, and `leave.rejected` events after leave workflow changes.

### Notification Service

The Notification Service is an event-driven consumer. It does not expose business APIs. Its only HTTP endpoint is `/health`. It consumes leave events from RabbitMQ and logs structured notification messages for leave application, approval, and rejection.

## Data Ownership

| Data | Owning Service | Storage |
|---|---|---|
| Users | User Service | In-memory `Map` |
| Password hashes | User Service | In-memory `Map` |
| JWT issuance | User Service | Generated at login |
| Leave requests | Leave Service | In-memory `Map` |
| Leave balances | Leave Service | In-memory `Map` |
| Notifications | Notification Service | Structured logs |

Each service owns its own data. Other services do not directly read or write another service's repository.

## Communication Design

| Source | Target | Type | Purpose |
|---|---|---|---|
| Client | API Gateway | Synchronous HTTP | Public API access |
| API Gateway | User Service | Synchronous HTTP | Login and user management |
| API Gateway | Leave Service | Synchronous HTTP | Leave balance and leave request APIs |
| User Service | RabbitMQ | Asynchronous event | Publish `user.created` |
| RabbitMQ | Leave Service | Asynchronous event | Consume `user.created` and initialize balance |
| Leave Service | RabbitMQ | Asynchronous event | Publish leave workflow events |
| RabbitMQ | Notification Service | Asynchronous event | Consume leave events and log notifications |
| Services | Consul | HTTP registration | Service registration and health checks |
| Services | Jaeger | OTLP trace export | Distributed tracing |

## Authentication and Authorization Design

1. The client logs in through `POST /auth/login`.
2. User Service validates credentials and returns a JWT.
3. The client sends the JWT to the API Gateway using `Authorization: Bearer <token>`.
4. The API Gateway validates the JWT.
5. The API Gateway forwards only trusted identity headers to downstream services:
   - `X-User-Id`
   - `X-User-Role`
   - `X-Internal-Secret`
   - `X-Correlation-Id`
6. Downstream services authorize requests using role middleware and service-level ownership checks.

## Business Capability Mapping

| Business Capability | Service |
|---|---|
| Login | User Service |
| JWT generation | User Service |
| JWT validation | API Gateway |
| View users | User Service |
| Create users | User Service |
| View leave balance | Leave Service |
| Apply for leave | Leave Service |
| View leave history | Leave Service |
| View pending team requests | Leave Service |
| Approve leave | Leave Service |
| Reject leave | Leave Service |
| Send notification | Notification Service |

## Deployment View

The system is designed to run locally through Docker Compose. Docker Compose starts the infrastructure services first and then starts the application services.

| Container | Purpose |
|---|---|
| `consul` | Service registry |
| `rabbitmq` | Message broker and management UI |
| `jaeger` | Distributed tracing UI and OTLP collector |
| `user-service` | User identity service |
| `leave-service` | Leave domain service |
| `notification-service` | Async notification consumer |
| `api-gateway` | Public API entry point |

The single command startup is:

```bash
docker-compose up --build
```

## Key Design Decisions

1. The system uses an API Gateway so clients have only one public entry point.
2. Authentication happens at the Gateway to keep JWT parsing out of downstream services.
3. Downstream services receive trusted identity headers instead of raw JWT tokens.
4. Leave rules are centralized in the Leave Service because it owns the leave domain.
5. RabbitMQ is used for workflows that should not block HTTP responses.
6. Consul is used so the Gateway can discover healthy services dynamically.
7. Jaeger and OpenTelemetry are used to make cross-service request flow visible.
8. In-memory `Map` storage is used to keep the assignment simple and runnable without a database.

## Basic Architecture Summary

This design separates the system into focused services. The Gateway handles entry, security, routing, discovery, and resilience. The User Service owns identity. The Leave Service owns leave workflow and rules. The Notification Service reacts to events. RabbitMQ decouples asynchronous workflows, Consul supports service discovery, and Jaeger provides observability.

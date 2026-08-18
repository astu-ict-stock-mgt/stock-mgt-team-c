# Detailed SRS-style Specification — ASTU Stock Management System

This file expands the project overview into a detailed Software Requirements Specification (SRS)-style document with precise field-level constraints, API and UI workflows, data models, business rules, validation rules, test mappings, and deployment instructions suitable for handoffs and presentations.

If you want this exported as slides or a PDF, pick that at the end and I'll produce it.

---
## 1. System Overview
- Purpose: manage suppliers, inventory, receipts, requisitions, transfers, and audit logs for ASTU. The system provides role-based access, reporting, and traceability.
- Components:
  - Frontend: Next.js application located at `src/` (app router). UI components: `src/components`, client API helpers: `src/lib/api`.
  - Backend: Express REST API at `backend/src/` with `routes`, `services`, `middleware`, `config`, `utils`, and Prisma ORM (`backend/prisma/schema.prisma`).
  - Database: relational database managed via Prisma (Postgres/MySQL supported). Prisma schemas at `prisma/schema.prisma` and `backend/prisma/schema.prisma`.

## 2. Actors & Roles
- System actors:
  - End user (role: `user`): view inventory, submit requisitions, view receipts.
  - Storekeeper (role: `storekeeper`): receive goods, update inventory, generate receipts.
  - Supervisor (role: `supervisor`): approve requisitions, run reports.
  - Admin (role: `admin`): manage users, roles, suppliers, and system config.
  - Auditor (role: `auditor`): view audit logs, download reports.

## 3. Functional Requirements (Detailed)
Each requirement includes fields, validation, and related files.

- FR-AUTH-01: User registration
  - Purpose: create a new user account with role assignment by an admin or self-registration (depending on config).
  - Endpoint: `POST /auth/register` (`backend/src/routes/auth.ts`).
  - Request body fields:
    - `email`: string, required, format: valid email, max 254 chars.
    - `password`: string, required, min 10 chars, max 128 chars, must include letters and numbers; recommend at least one uppercase and one symbol.
    - `fullName`: string, required, min 1, max 120 chars.
    - `username`: string, optional, unique, alphanumeric + underscore, 3-30 chars.
    - `role`: string, optional (if provided by admin), allowed values: `user|storekeeper|supervisor|admin|auditor`.
  - Validation: Zod schema (`backend/src/validators` — find registration schema near `auth` routes).
  - Responses:
    - 201 Created: `{ id, email, fullName, role }`.
    - 400 Bad Request: validation error with field-level messages.
    - 409 Conflict: email or username already exists.

- FR-AUTH-02: Login
  - Endpoint: `POST /auth/login`.
  - Request body:
    - `email` or `username`: required.
    - `password`: required.
  - Authentication:
    - Verify hashed password (bcryptjs).
    - Issue JWT access token (short expiry, e.g., 15m) and refresh token (longer expiry, e.g., 7d) if implemented.
  - Response: 200 OK with `{ accessToken, expiresIn, user: { id, email, role } }`.

- FR-USERS-01: Manage users (Admin)
  - Endpoints: `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`.
  - Constraints: Admin-only actions guarded by `backend/src/middleware/auth.ts` and `backend/src/config/permissions.ts`.

- FR-SUPPLIERS-01: Supplier CRUD
  - Endpoints: `GET /suppliers`, `GET /suppliers/:id`, `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id`.
  - Supplier fields:
    - `name`: string, required, max 200 chars.
    - `code`: string, optional unique, 2-20 chars.
    - `address`: string, optional, max 500 chars.
    - `contactPerson`: string, optional, max 120 chars.
    - `phone`: string, optional, E.164 format preferred, max 20 chars.
    - `email`: string, optional, valid email.
  - Validation: Zod schema in `backend/src/validators`.

- FR-INVENTORY-01: Inventory item lifecycle
  - Models: `InventoryItem` with fields:
    - `id`: UUID/auto-increment.
    - `sku`: string, required, unique, 3-64 chars.
    - `name`: string, required, max 256 chars.
    - `description`: string, optional, max 2000 chars.
    - `unit`: string, required (e.g., `pcs`, `kg`), max 20 chars.
    - `reorderLevel`: integer, optional, >= 0.
    - `quantityOnHand`: decimal/float, >= 0.
  - Endpoints: CRUD under `backend/src/routes/inventory.ts` with list pagination and filters.

- FR-RECEIPTS-01: Receive stock
  - Endpoint: `POST /receipts` to record received goods and update inventory with FIFO batches.
  - Request body:
    - `supplierId`: required.
    - `items`: array of `{ sku, quantity, unitPrice, batchNo?, expiryDate? }`.
    - `receivedBy`: user id.
  - Business rule: increments `quantityOnHand`; create receipt and batch records.

- FR-ISSUE-01: Issue/consume stock (FIFO)
  - Endpoint: `POST /issues` (or `POST /requisitions/:id/approve` then issue).
  - Business rule: consume oldest batch entries first (FIFO); return error if insufficient stock unless negative stock allowed by config.

- FR-AUDIT-01: Audit logs
  - Every critical action (create/update/delete on suppliers, inventory, receipts, users, roles) must create an `AuditLog` record.
  - Fields: `id, actorId, actionType, resourceType, resourceId, timestamp, details`.

## 4. Data Model (Field-level)
Below are the primary entities and key constraints. Use Prisma schema as source of truth at `prisma/schema.prisma` and `backend/prisma/schema.prisma`.

- User
  - `id`: string (UUID) or int.
  - `email`: string, unique, max 254.
  - `username`: string, unique, 3-30.
  - `passwordHash`: string, bcrypt, not exposed.
  - `fullName`: string, max 120.
  - `roleId`: foreign key to `Role`.

- Role
  - `id`, `name` (e.g., `admin`, `user`), `permissions` (json or relation to Permission model).

- Supplier
  - `id`, `name`, `code`, `address`, `contactPerson`, `phone`, `email`.

- InventoryItem
  - `id`, `sku`, `name`, `description`, `unit`, `reorderLevel`, `quantityOnHand`.

- Batch (for FIFO)
  - `id`, `inventoryItemId`, `batchNo`, `quantity`, `receivedAt`, `expiresAt`, `unitPrice`.

- Receipt
  - `id`, `supplierId`, `createdBy`, `items` (relation to Batch/ReceiptItem), `totalAmount`, `createdAt`.

- Requisition / Issue
  - `id`, `requestedBy`, `approvedBy`, `items`, `status: [draft|submitted|approved|rejected|issued]`.

- AuditLog
  - `id`, `actorId`, `actionType`, `resourceType`, `resourceId`, `oldValue?`, `newValue?`, `timestamp`.

## 5. API Endpoint Summary (Key endpoints)
This is not exhaustive; inspect `backend/src/routes` for full list. Example endpoints:

- `POST /auth/register` — register user (see FR-AUTH-01).
- `POST /auth/login` — login and issue JWT.
- `GET /users` — list users (admin).
- `POST /suppliers` — create supplier.
- `GET /suppliers` — list suppliers (pagination: `?page=1&limit=20`).
- `POST /inventory` — create inventory item.
- `POST /receipts` — record stock receipt and create batches.
- `POST /issues` — issue stock (consume FIFO batches).

Each endpoint uses Zod validation and returns standardized success/error shapes via `backend/src/utils/response.ts`.

## 6. UI Workflows — Step-by-step (detailed)
For each, I specify UI steps, validations, API calls, and expected outcomes.

- Workflow: User registration (self-service)
  1. User opens registration page: `/auth/register`.
  2. UI fields: `fullName` (1–120 chars), `email` (valid), `username` (3–30 chars), `password` (min 10, complexity), `confirmPassword`.
  3. Client-side validation: check password match, email format, username pattern.
  4. Submit to `POST /auth/register`.
  5. Server validates via Zod; on success: create user, send 201 and (optional) send verification email (if implemented).
  6. On error: show field errors from response (400) or conflict (409).

- Workflow: Login
  1. UI: `/auth/login` with `email/username` and `password`.
  2. Submit to `POST /auth/login`.
  3. On success: store `accessToken` in memory (not localStorage unless necessary) and `refreshToken` in httpOnly cookie if used.
  4. Redirect to dashboard; fetch user profile via `GET /users/me`.

- Workflow: Add supplier (Admin)
  1. Open admin → suppliers → Add.
  2. Fields: `name` (required), `code` (optional unique), `phone`, `email`, `address`.
  3. Client validation (required fields, lengths), submit to `POST /suppliers`.
  4. On 201: add to local list and show toast.
  5. Server records an `AuditLog` entry for create.

- Workflow: Receive stock (Storekeeper)
  1. Open Receipts → New Receipt.
  2. Enter `supplier` (select), `items` rows with `sku` (auto-complete), `quantity` (>0), `unitPrice` (>=0), optional `batchNo`, optional `expiryDate`.
  3. Validate each row; compute total on client.
  4. Submit to `POST /receipts`.
  5. Server persists `Receipt`, creates `Batch` records; updates `InventoryItem.quantityOnHand` by summing batch quantities.
  6. On success: show receipt view with batch-level details.

- Workflow: Issue stock for requisition
  1. Requester creates requisition with items and quantities (`POST /requisitions`).
  2. Supervisor approves (`PUT /requisitions/:id/approve`) which triggers `POST /issues` to consume stock.
  3. Issue service consumes FIFO batches and reduces `quantityOnHand`.
  4. If insufficient stock: either block approval or create backorder record depending on config.

- Workflow: View audit logs (Auditor)
  1. Open `Audit Logs` page with filters: `actor`, `resourceType`, `actionType`, `dateRange`.
  2. Request `GET /audit-logs?actor=&resource=&from=&to=&page=&limit=`.
  3. View paginated table; click a row to see `details` JSON with `oldValue` and `newValue`.

## 7. Business Rules & Edge Cases (explicit)
- FIFO consumption: always consume oldest `Batch.receivedAt` first for the same `sku`.
- Negative stock handling: configurable; default = disallow. If allowed, issue records may create negative `quantityOnHand` and an `Outstanding` record is created.
- Concurrency & race conditions: use DB transactions in service layer (Prisma `transaction`) for receipts and issues to ensure atomicity.
- Batch expiry: if `expiryDate` provided, notify via dashboard when near expiry (e.g., 30 days before).
- Price rounding: currency values stored as integers (cents) or decimal with 2 fixed places; prefer using integer cents in DB for safety.

## 8. Validation Rules (Field-level summary)
- `email`: RFC5322-like regex, max 254.
- `password`: min 10, max 128, includes at least one lowercase, one uppercase, one digit, one symbol (recommend enforcement at server); store bcrypt hash with salt rounds (e.g., 12).
- `username`: /^[A-Za-z0-9_]{3,30}$/.
- `sku`: /^[A-Za-z0-9-_]{3,64}$/.
- `quantity`: numeric, >= 0 (unless negative stock allowed configuration true).

## 9. Security & Auth
- Password hashing: bcrypt (see `backend/package.json` dependency `bcryptjs`).
- Tokens: JWT via `jsonwebtoken` dependency; set `JWT_SECRET` in env. Access token expiry: 15m; refresh token expiry: 7d (if implemented).
- Transport: enforce HTTPS in production and set secure, httpOnly flags on cookies for refresh tokens.
- Rate limiting: `express-rate-limit` is present; configure for auth endpoints to mitigate brute-force.

## 10. Error Handling & Response Patterns
- Standard response shape: `{ success: boolean, data?: any, error?: { code, message, details? } }` (see `backend/src/utils/response.ts`).
- Common HTTP codes used:
  - 200 OK — success.
  - 201 Created — resource created.
  - 400 Bad Request — validation error (return field errors).
  - 401 Unauthorized — missing/invalid token.
  - 403 Forbidden — insufficient permissions.
  - 404 Not Found — resource not found.
  - 409 Conflict — uniqueness constraint violated.
  - 500 Internal Server Error — unexpected.

## 11. Non-functional Requirements
- Performance: list endpoints paginate (default limit 20). Aim for 95th percentile < 300ms for simple GET queries with appropriate DB indexes.
- Scalability: stateless backend, scale horizontally; use connection pooling for DB.
- Observability: use `morgan` for request logs; consider adding structured logs and metrics.
- Backup & Recovery: database backups scheduled; have migration rollback plan.

## 12. Testing Matrix (mapping requirements → tests)
- FR-AUTH-01: unit tests for `auth` service (password hashing, email uniqueness), integration tests for `POST /auth/register`, E2E sign-up.
- FR-RECEIPTS-01: unit test for receipt service updating batches and quantities, integration test for `POST /receipts`.
- FR-ISSUE-01: unit test for FIFO consumption across batches, integration test for `POST /issues`.
- FR-AUDIT-01: unit test ensuring audit record created on create/update/delete actions.

Run tests using Vitest:

```bash
npm test
cd backend && npm test
```

## 13. Deployment & Run Steps (concise)
- Development quickstart:

```bash
# root
npm install
npm run dev           # frontend

# backend
cd backend
npm install
npm run dev           # backend, tsx watch
```

- Production build:

```bash
# frontend
npm run build
npm start

# backend
cd backend
npm run build
npm start
```

Environment variables required (minimum):
- `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production` for prod, and optional `PORT` overrides.

## 14. Files of Interest (quick links)
- `backend/src/server.ts` — app bootstrap and middleware.
- `backend/src/app.ts` — Express app setup.
- `backend/src/routes/` — route handlers.
- `backend/src/services/` — business logic.
- `backend/src/middleware/auth.ts` — JWT verification and role checks.
- `prisma/schema.prisma` and `backend/prisma/schema.prisma` — DB models.

## 15. Glossary
- SKU — Stock Keeping Unit, unique identifier for inventory item.
- FIFO — First-In, First-Out; inventory consumption policy.
- Receipt — record of goods received from supplier.
- Requisition — internal request to issue items.

---
I expanded the document with precise field constraints, API endpoints, UI workflows, business rules, testing mapping, and deployment checklist. Which next deliverable would you like?
- A detailed Mermaid sequence diagram of the Login and Receive-Stock flows.
- A slide deck (MD → PDF) using these sections.
- A per-file SRS mapping (one-line summary and related FR tags for each file in `backend/src`).

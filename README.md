# ASTU Stock Management System

A full-stack stock management application for ASTU with a Next.js frontend and a separate Express + Prisma backend. The project includes role-based access control, inventory and supplier administration, stock receiving and issuing workflows, requisitions, reports, and audit tracking.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- State/data: TanStack Query, Zustand
- Backend: Express.js, TypeScript, Prisma ORM
- Database: SQLite for local development
- Auth: bcrypt password hashing with database-backed bearer sessions
- Validation: Zod
- Charts: Recharts

## Project structure

```text
.
├── backend/                     # Express API server
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── prisma/                      # Root Prisma schema and seed for the frontend app
│   ├── schema.prisma
│   └── seed.ts
├── src/                         # Next.js frontend app
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── stores/
│   └── ...
├── .env.example
├── package.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── components.json
├── README.md
└── public/
```

## What this app includes

- User authentication and RBAC
- Users, roles, and permissions management
- Suppliers, categories, units of measure, and warehouses
- Inventory tracking with stock quantities and thresholds
- Stock receipts, issues, and transfers
- Requisition workflow and approvals
- Dashboard and summary reports
- Audit logs and system activity tracking
- Demo user seed data for testing roles and permissions

## Required environment

- Node.js 20+
- npm
- SQLite support via Prisma

## Setup

1. Install dependencies in the root app:

```bash
npm install
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Create environment files from the examples:

```bash
copy .env.example .env
copy backend\.env.example backend\.env
```

The root app expects a frontend URL and database settings. The backend expects its own database and JWT settings.

Example values:

- Root `.env`

```env
DATABASE_URL="file:./db/custom.db"
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

- Backend `backend/.env`

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-to-a-secure-secret-in-production"
JWT_REFRESH_SECRET="change-this-to-another-secure-secret-in-production"
JWT_EXPIRES_IN="12h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Database setup

Generate Prisma client and apply the schema:

```bash
# root app
npx prisma generate
npm run db:push

# backend
cd backend
npx prisma generate
npm run db:push
```

Seed demo data:

```bash
# root app
npm run db:seed

# backend
cd backend
npm run db:seed
```

## Run the app

Start the backend API:

```bash
cd backend
npm run dev
```

The API runs on:

- http://localhost:5000
- health endpoint: http://localhost:5000/api/v1/health

Start the frontend app:

```bash
npm run dev
```

The frontend runs on:

- http://localhost:3000

## Demo accounts

Password for all demo accounts: `Password@123`

| Email | Role | Notes |
|---|---|---|
| `admin@sms.et` | Administrator | Full access |
| `pao@sms.et` | Property Admin Officer | Approves and monitors stock activity |
| `storekeeper@sms.et` | Storekeeper | Handles receipts, issues, transfers |
| `clerk@sms.et` | Stock Clerk | Stock record and basic operational access |
| `accountant@sms.et` | Accountant | Financial and valuation views |
| `depthead@sms.et` | Department Head | Requests and approvals |
| `security@sms.et` | Security Officer | Gate pass and material exit control |
| `supplier@sms.et` | Supplier | Limited supplier-facing view |

## Main frontend modules

The root app includes role-aware UI sections such as:

- Dashboard
- Inventory
- Suppliers
- Warehouses
- Categories
- Receipts
- Issues
- Requisitions
- Roles and permissions
- Audit logs
- Reports
- Settings

## Main backend modules

The backend under `backend/src` includes API routes and services for:

- Authentication and sessions
- User and role management
- Suppliers
- Inventory and warehouse operations
- Receipts and issues
- Transfers
- Requisitions
- Dashboard stats
- Notifications
- Reports and audit logs

## Notes

This repository intentionally contains two related but separate application layers:

- the Next.js frontend at the project root
- the Express API at `backend/`

Both must be running together for the full application to work correctly.

## Useful commands

```bash
# frontend
npm run dev
npm run build
npm run lint
npm run test

# backend
cd backend
npm run dev
npm run build
npm run lint
npm run test
```

### Stock Taking & Reconciliation
```
Create stock-take session → Select warehouse + items
→ Enter physical counts → System calculates variance
→ Approval → BEGIN TRANSACTION
    → Create adjustment transactions (ADJUSTMENT_IN / ADJUSTMENT_OUT)
    → Update warehouse stock
    → Update FIFO layers (if positive: create new layer; if negative: consume)
COMMIT
→ Audit log (STOCK_ADJUSTED) → Reconciliation report
```

## Audit Logging

Every important mutation calls `recordAudit(...)` after the transaction commits:

```ts
{
  userId, action: "STOCK_RECEIVED", module: "receipts",
  entity: "receipt", entityId,
  oldValue: null, newValue: { code, supplierId, totalAmount, ... },
  ipAddress, description, timestamp
}
```

Audit logs are append-only and cannot be edited or deleted through any API. The `audit.view` permission gates read access.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Database | Prisma ORM + SQLite (PostgreSQL-compatible schema) |
| Auth | bcrypt password hashing + opaque session tokens |
| Validation | Zod (shared schemas between client & server) |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod resolver |
| UI | shadcn/ui (60+ components), Tailwind CSS 4 |
| Icons | lucide-react |
| Charts | Recharts |
| State | Zustand (client UI state only) |
| Notifications | sonner (toasts) |

## What's Implemented vs Deferred

### ✅ Implemented (full workflow)
- Authentication (login / logout / session / lockout)
- RBAC (8 roles, 30+ permissions, server-side enforcement)
- User management (CRUD + role assignment + soft delete)
- Supplier management (CRUD + receipt history)
- Categories + Units of Measure
- Warehouses (CRUD + stock snapshot)
- Inventory items (CRUD + reorder rules + status)
- Stock receipts (with FIFO layer creation, stock transaction log, audit)
- Stock issues (with FIFO consumption, COGS computation, audit)
- Stock transaction ledger (immutable)
- Audit logs (filterable, paginated)
- Role-aware dashboards (5 KPI sets, 4 chart types)
- Reports: inventory, FIFO valuation, stock movement, audit
- Health check endpoint

### 🟡 Schema ready, UI deferred
- Stock transfers (Prisma models + service scaffolding exist; UI not built)
- Requisitions (Prisma models + workflow doc; UI shows the workflow status)
- Stock taking & reconciliation (Prisma models exist; UI not built)
- Damaged / Obsolete stock (Prisma models exist; UI not built)
- Gate passes (Prisma models exist; UI not built)

### ⏳ Not in scope
- Full test suite (unit / integration / E2E)
- OpenAPI/Swagger UI (the API is documented in `docs/api.md`)
- Docker compose file (single-process Next.js runs natively in this sandbox)
- Production deployment guide (the sandbox auto-deploys)

## License

Internal project — built per the SRS.docx specification.

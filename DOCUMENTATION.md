# ASTU Stock Management System — Project Documentation

**Adama Science and Technology University (ASTU)**
A web-based system for managing university store/warehouse inventory: receiving goods, issuing them to departments, tracking stock levels and value, controlling requests and approvals, and keeping a full audit trail.

> This document explains **what the system is, what every part does, and how to use it** — written for a project review with an advisor/instructor. Terms like *Stock Receipt*, *Stock Issue*, *Requisition*, and *FIFO* are all defined in the glossary (Section 3).

---

## 1. Executive Summary

The ASTU Stock Management System (SMS) replaces manual, paper-based store records with a secure, role-based web application. It answers the everyday questions a university store must handle:

- **What did we receive, from which supplier, and at what cost?** → *Stock Receipts*
- **What did we give out, to which department, and what did it cost us?** → *Stock Issues*
- **What do departments need, and who approved it?** → *Requisitions*
- **How much stock do we have right now, and what is it worth?** → *Inventory + FIFO valuation*
- **Who did what, and when?** → *Audit Logs*

Every stock movement is costed automatically using the **FIFO (First-In, First-Out)** method and recorded in an immutable ledger, so the inventory's quantity **and monetary value** are always accurate.

---

## 2. Purpose & Scope

University stores receive equipment and supplies (laptops, monitors, paper, furniture, cleaning materials, tools) from suppliers, hold them in one or more warehouses, and issue them to academic and administrative departments on request. Doing this on paper is slow and error-prone: stock counts drift, costs are guessed, and there is no reliable record of approvals or who handled what.

**The system's goals:**

1. Keep an accurate, real-time record of stock quantity **and value** in every warehouse.
2. Enforce a proper approval chain for requests (a department can't just take stock).
3. Cost every issue correctly using FIFO, so financial reports are trustworthy.
4. Restrict each user to only what their **role** allows (a storekeeper ≠ an accountant ≠ a department head).
5. Log every action for accountability and auditing.

**In scope:** users & roles, suppliers, categories, warehouses, inventory items, stock receipts, stock issues, requisitions, FIFO valuation, dashboards, reports, notifications, and audit logs.

**Modeled for completeness / future extension** (present in the database design, not all surfaced in the current UI): stock transfers between warehouses, physical stock-taking (counting) with variance reconciliation, damaged/obsolete stock disposal, and gate passes for material exit control.

---

## 3. Key Concepts (Glossary)

| Term | Meaning in this system |
|---|---|
| **Inventory Item** | A stockable product (e.g. "Dell Latitude 5520 Laptop"), identified by a unique **item code / SKU**, belonging to a **category** and measured in a **unit of measure**. |
| **Warehouse** | A physical storage location (e.g. *Main Warehouse*, *IT Storage*). Stock quantities are tracked **per item, per warehouse**. |
| **Stock Receipt (GRN)** | The act of **receiving goods into a warehouse** from a supplier. Records what came in, the quantity, and the **unit cost** paid. Also called a *Goods Received Note*. Code format `GRN-YYYYMMDD-XXXX`. |
| **Stock Issue** | The act of **giving stock out** of a warehouse — to a department or another location. Records quantity and the **cost of what left** (COGS). Code `ISS-YYYYMMDD-XXXX`. |
| **Requisition** | A formal **request for items** raised by a department, which must be **approved** before stock is issued against it. Code `REQ-YYYYMMDD-XXXX`. |
| **FIFO (First-In, First-Out)** | The costing rule: the **oldest stock is issued first**. Because different batches can be bought at different prices, FIFO decides which price applies to each issue. |
| **FIFO Layer** | One batch of stock created by a receipt, holding *original qty*, *remaining qty*, and *unit cost*. Issues consume the oldest layers first. |
| **COGS (Cost of Goods Sold)** | The total cost of the items on an issue, computed by consuming FIFO layers (quantity × the unit cost of each layer used). |
| **Unit Cost** | The price of one unit. Stored on each receipt line and on each FIFO layer; the item also carries a display average cost. |
| **Stock Transaction (Ledger)** | An **immutable record of every movement** (receipt, issue, transfer, adjustment…), with the running balance **before and after**. This is the system's "single source of truth" for stock history. |
| **Reorder Level / Safety Stock / Min / Max** | Planning thresholds on each item that flag when stock is **low** and should be reordered. |
| **Gate Pass** | An authorization document (approved by a **Security Officer**) that permits physical materials to **leave the premises**, linked to a stock issue. Code `GP-YYYYMMDD-XXXX`. |
| **Stock Take** | A **physical count** exercise comparing counted quantity vs. system quantity; the difference is the **variance**, which is then reconciled. Code `ST-YYYYMMDD-XXXX`. |
| **Audit Log** | A timestamped record of who performed what action on which entity (with before/after values). |
| **RBAC** | Role-Based Access Control — permissions are granted to **roles**, and users are assigned roles. |

---

## 4. User Roles (RBAC)

The system ships with **8 roles**. Permissions are named `module.action` (e.g. `stock.receive`, `requisition.approve`) and grouped into roles. A user only sees the menu items and actions their role permits; the **Administrator** sees everything.

| Role | Purpose | What they can do (summary) |
|---|---|---|
| **Administrator** | Full system access | Everything — all modules, all actions, user & role management. |
| **PAO** (Property Administration Officer) | Oversight & approvals | View dashboard/reports/audit; manage suppliers; **approve requisitions**, stock-takes and gate passes; oversee inventory; export reports. |
| **Storekeeper** | Day-to-day store operations | **Receive, issue and transfer stock**; update inventory; start stock-takes; manage damaged/obsolete; request gate passes; view reports. |
| **Stock Clerk** | Records & support | Read-only across catalog/inventory/requisitions; prepare/view reports. |
| **Accountant** | Valuation & finance | View inventory & valuation; **view and export reports**; view audit logs. |
| **Department Head** | Requesting department | **Create and approve requisitions** for their department; view inventory & reports. |
| **Security Officer** | Exit control | **Approve gate passes** and confirm material exit; view inventory; view audit logs. |
| **Supplier** | External, limited | Dashboard view only (limited external access). |

**Permission catalogue (modules):** users, roles, permissions, suppliers, categories, warehouses, inventory, **stock** (receive/issue/transfer/adjust), **requisition** (create/approve/read), stocktake, damaged, obsolete, **gatepass**, reports, audit, dashboard.

*(Source: `src/lib/constants/permissions.ts` — the role→permission matrix; `prisma/seed.ts` — role creation.)*

---

## 5. System Architecture

The system is a **two-tier web application** with a clear separation between the user interface and the business logic/database.

```
┌─────────────────────────────┐        HTTPS / JSON            ┌──────────────────────────────┐
│   FRONTEND  (Next.js 16)     │   Bearer-token (JWT) auth      │   BACKEND  (Express.js API)   │
│   React 19 · TypeScript      │  ───────────────────────────► │   REST API on port 5000        │
│   runs on port 3000          │                                │                                │
│                              │                                │  routes → services → Prisma    │
│  • shadcn/ui + Tailwind CSS  │  ◄───────────────────────────  │  JWT auth · RBAC · Zod         │
│  • TanStack Query (data)     │        JSON responses          │  validation · rate limiting    │
│  • Zustand (UI state)        │                                │  helmet · CORS · audit logs    │
│  • Recharts (charts)         │                                │                                │
└─────────────────────────────┘                                └───────────────┬────────────────┘
                                                                                │ Prisma ORM
                                                                                ▼
                                                                   ┌────────────────────────┐
                                                                   │   Database (SQLite)     │
                                                                   │   via Prisma schema     │
                                                                   └────────────────────────┘
```

### Frontend (`/` root project — port 3000)
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript.
- **UI:** shadcn/ui components, Tailwind CSS v4, lucide-react icons, a custom **"Ledger"** design system with light/dark themes.
- **Data fetching:** **TanStack Query** hooks (`src/lib/api/hooks.ts`) → a single **API client** (`src/lib/api/client.ts`) that attaches the JWT and calls the backend at `http://localhost:5000`.
- **State:** **Zustand** store drives the single-page navigation (which module is shown); forms use **react-hook-form + Zod**.
- The frontend **never touches the database directly** — it only speaks to the backend API.

### Backend (`/backend` — port 5000)
- **Framework:** Express.js REST API (TypeScript), entry `backend/src/server.ts` → `app.ts`.
- **Layered design:** `routes/` (HTTP endpoints) → `services/` (business logic) → **Prisma** (database).
  - Routes present: `auth`, `users`, `roles`, `suppliers`, `inventory`, `receipts`, `issues`, `transfers`, `requisitions`, `reports`, `audit-logs`, `notifications`, `dashboard`.
- **Security middleware:** `helmet` (secure headers), `cors`, `compression`, `morgan` (request logging), `express-rate-limit` (throttling), `jsonwebtoken` (JWT), `bcryptjs` (password hashing), **Zod** validators.
- **Auth middleware** enforces a valid JWT **and** the required permission on every protected route.

### Database
- **SQLite** accessed through the **Prisma ORM** (`prisma/schema.prisma`). Easy to run locally; the same schema can target PostgreSQL/MySQL by changing the datasource.

### Tech stack at a glance
`Next.js 16` · `React 19` · `TypeScript` · `Tailwind CSS v4` · `shadcn/ui` · `TanStack Query` · `Zustand` · `Recharts` · `React Hook Form` · `Zod` — frontend.
`Express.js` · `Prisma` · `SQLite` · `JWT` · `bcrypt` · `Helmet` · `Zod` — backend.
`Vitest` + `Playwright` — testing.

---

## 6. Data Model (Database Design)

The Prisma schema defines the following entities, grouped by area. (Full definitions in `prisma/schema.prisma`.)

**Authentication & RBAC**
- `User` — account with email, username, hashed password, status, **failed-login count + lock-until** (account lockout), department, last login.
- `UserSession` — issued access/refresh tokens with expiry, IP and user-agent.
- `Role`, `Permission`, `RolePermission`, `UserRole` — the many-to-many RBAC wiring (users ↔ roles ↔ permissions).

**Master data (Catalog)**
- `Supplier` — vendor with contact details and status (`ACTIVE / INACTIVE / BLACKLISTED`).
- `Category` — item grouping; supports **sub-categories** (self-referencing tree).
- `UnitOfMeasure` — e.g. Each, Box, Kg, Liter, Meter, Packet.
- `Warehouse` — storage location with status.
- `InventoryItem` — the product: code, name, category, unit, status, **min/max/safety/reorder levels**, display unit cost.

**Stock position & valuation**
- `WarehouseStock` — current quantity (and reserved qty) of an item **in a specific warehouse**.
- `FifoLayer` — one costed batch per receipt (original qty, remaining qty, unit cost) — the heart of FIFO valuation.

**Operations**
- `StockReceipt` + `StockReceiptItem` — goods received (with inspection flags), lines with quantity & unit cost.
- `StockIssue` + `StockIssueItem` — goods issued, lines with quantity, unit cost and **COGS**; can link to a requisition and a gate pass.
- `StockTransfer` + `StockTransferItem` — warehouse-to-warehouse movement.
- `StockTransaction` — the **immutable ledger**: one signed row per movement, with `balanceBefore`/`balanceAfter` and a reference to its source document.

**Requests & governance**
- `Requisition` + `RequisitionItem` + `RequisitionApproval` — department requests, requested vs. **fulfilled** quantities, and approval records.
- `StockTake` + `StockTakeItem` — physical counts with system qty, physical qty and variance.
- `DamagedStock` / `ObsoleteStock` — items flagged for disposal, with disposition status.
- `GatePass` — exit authorization tied to an issue, approved by a security officer.
- `AuditLog` — every action with module, entity, before/after JSON, user, IP and timestamp.

**Key enumerations (statuses):**
- Receipt: `DRAFT → INSPECTING → CONFIRMED → CANCELLED`
- Issue: `PENDING → COMPLETED → CANCELLED`
- Requisition: `DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED / REJECTED → PARTIALLY_FULFILLED → FULFILLED → CANCELLED`
- Transfer: `PENDING → IN_TRANSIT → COMPLETED → CANCELLED`
- Gate Pass: `PENDING → APPROVED → EXIT_CONFIRMED / REJECTED / CANCELLED`
- Stock Take: `DRAFT → IN_PROGRESS → COMPLETED → RECONCILED`
- Transaction types: `OPENING, RECEIPT, ISSUE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, DAMAGE, OBSOLETE, DISPOSAL`

---

## 7. The Application — Module by Module

The app is a single screen with a left **sidebar** grouping 13 modules; the top bar shows a **theme toggle**, a **notifications bell** (role-aware alerts, e.g. low stock / pending approvals), and the **user menu** (profile, change password, log out). Menu items appear only if your role has permission.

### Overview
1. **Dashboard** — role-aware landing page. KPI tiles (stock value, item counts, low-stock alerts, etc.), a **30-day stock-movement trend** chart, breakdown charts (inventory by status, stock value by category and by warehouse), and recent-activity tables (recent transactions, receipts, issues, requisitions).

### Operations
2. **Stock Receipts** — record goods received from suppliers into a warehouse (creates FIFO layers and updates stock). *(See workflow §8.2.)*
3. **Stock Issues** — issue stock out to a department, automatically FIFO-costed. *(See §8.3.)*
4. **Requisitions** — department requests and the approval chain. *(See §8.4.)*

### Catalog (master data)
5. **Inventory** — the item catalog with current quantities, stock status (Available / Low / Out of stock), and stock levels. The reference list of everything that can be stocked.
6. **Suppliers** — vendor directory (contact info, status). Suppliers are chosen when receiving stock.
7. **Categories** — item groupings (supports sub-categories) used to organize and report on inventory.
8. **Warehouses** — storage locations; stock is tracked per warehouse.

### Insights
9. **Reports** — inventory valuation, stock movement, receipts/issues summaries, etc.; certain roles can **export**.
10. **Audit Logs** — searchable trail of every recorded action (who/what/when, before/after).

### Administration
11. **Users** — create/edit users, assign roles, manage account status (active/locked).
12. **Roles & Permissions** — view roles and the permissions attached to each.
13. **Settings** — profile and security (change password), plus system preferences.

---

## 8. How It Works — Core Workflows (Step by Step)

### 8.1 Logging in
1. Open the app (frontend on `http://localhost:3000`).
2. Enter email + password. The backend verifies the password (bcrypt), and on success returns a **JWT access token** (stored client-side) used for every subsequent request.
3. Repeated wrong passwords increase a **failed-login counter**; too many **locks the account** until a cooldown passes — a real security control.
4. The interface then shows only the modules your **role** allows.

*(Demo accounts are in Section 11.)*

### 8.2 Receiving stock (Stock Receipt / GRN)
**Who:** Storekeeper / PAO / Administrator (permission `stock.receive`).
1. Choose the **supplier** and the **destination warehouse**.
2. Add one or more **items**, each with a **quantity** and **unit cost** (optionally inspection notes).
3. On confirm, the system atomically (in one database transaction):
   - creates the **StockReceipt** (`GRN-…`) and its line items;
   - creates a **FIFO layer** for each line (remaining qty = received qty, at that unit cost);
   - **increases WarehouseStock** for the item in that warehouse;
   - writes a **StockTransaction** of type `RECEIPT` (with balance before/after);
   - writes an **audit log** entry.

**Result:** stock quantity and value go up, and a new priced batch is available for future issues.

### 8.3 Issuing stock (Stock Issue) + how FIFO/COGS is computed
**Who:** Storekeeper / PAO / Administrator (permission `stock.issue`).
1. Choose the **source warehouse**, the **department** receiving the goods, and the **items + quantities** (optionally linked to an approved requisition).
2. For each item, the FIFO engine (`consumeFifoTx`) consumes the **oldest layers first**:
   - it checks there is enough stock (otherwise it rejects with *insufficient stock*);
   - it walks layers by age, taking from each until the requested quantity is met;
   - **COGS = Σ (quantity taken from a layer × that layer's unit cost)**; the issue's unit cost is the weighted average.
3. It then **decreases WarehouseStock**, writes a **StockTransaction** of type `ISSUE`, and an **audit log** entry.

#### Worked example (from the seeded demo data)
Two receipts of laptops arrive into *IT Storage*:
- Batch 1: **20 laptops @ ETB 35,000**
- Batch 2: **10 laptops @ ETB 36,500**

Now **12 laptops are issued** to the IT department. FIFO consumes the **oldest** batch first:
- Take 12 from Batch 1 → **COGS = 12 × 35,000 = ETB 420,000**

Remaining stock afterwards:
- Batch 1: 8 laptops @ 35,000 (= 280,000)
- Batch 2: 10 laptops @ 36,500 (= 365,000)
- **On-hand: 18 laptops, valued at ETB 645,000.**

This is why FIFO matters: the cost charged to the department (420,000) reflects the actual price of the oldest stock, not a guess — and the remaining inventory value is exact.

### 8.4 Requisition lifecycle (request → approve → fulfill)
**Who requests:** Department Head (permission `requisition.create`). **Who approves:** Department Head / PAO (permission `requisition.approve`).
1. A department head creates a requisition (`REQ-…`) listing items and quantities, with a **required-by date**, and **submits** it (`SUBMITTED → PENDING_APPROVAL`).
2. An approver **approves or rejects** it; the decision (with comments) is stored as a **RequisitionApproval** record → status becomes `APPROVED` or `REJECTED`.
3. Approved requisitions are fulfilled by issuing stock against them; each line tracks **fulfilled vs. requested** quantity, so a requisition can be `PARTIALLY_FULFILLED` or `FULFILLED`.

### 8.5 Stock transfer (warehouse → warehouse)
Moves items from one warehouse to another (`TRF-…`), recorded as `TRANSFER_OUT` at the source and `TRANSFER_IN` at the destination in the ledger. *(Backend service present; used for rebalancing stock between stores.)*

### 8.6 Gate pass (material exit control)
For goods physically leaving the premises, a **gate pass** (`GP-…`) is linked to an issue: requested by store staff, **approved by a Security Officer**, then **exit-confirmed** (with carrier/vehicle details) when the goods actually leave. *(Modeled in the database and roles; part of the exit-control design.)*

### 8.7 Reporting & audit
- **Reports** aggregate the ledger and stock data into valuation and movement summaries; eligible roles can export.
- **Audit Logs** record every create/update/delete and every stock action with before/after snapshots — the accountability backbone.

---

## 9. Security Features

- **Authentication:** JWT access tokens; passwords stored as **bcrypt** hashes (never plaintext); refresh/session tracking with expiry.
- **Authorization (RBAC):** every backend route requires a specific permission; the frontend also hides unauthorized modules. Administrator bypasses to full access.
- **Account protection:** failed-login counter + **automatic lockout**; user statuses `ACTIVE / INACTIVE / LOCKED / PENDING`.
- **Hardening:** Helmet secure headers, CORS, request rate-limiting, input validation with **Zod** on every endpoint.
- **Auditability:** immutable **stock-transaction ledger** + full **audit log** of user actions.
- **Data integrity:** stock mutations run inside **database transactions**, so a receipt/issue either fully succeeds or fully rolls back (no half-updated stock).

---

## 10. How to Run It (for a live demo)

**Prerequisites:** Node.js (with npm), and the repo on disk.

**A. Start the backend (REST API, port 5000)**
```bash
cd backend
npm install
npm run db:push      # create the SQLite database from the Prisma schema
npm run db:seed      # load demo data + the 8 demo users
npm run dev          # start the API on http://localhost:5000
```

**B. Start the frontend (UI, port 3000)** — in a second terminal
```bash
# from the project root
npm install
npm run dev          # start the app on http://localhost:3000
```

**C. Open** `http://localhost:3000` and log in with a demo account (Section 11).

*Notes:* The frontend targets the API via `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:5000`). Both servers must be running. Automated tests exist via **Vitest** (unit/API) and **Playwright** (end-to-end): `npm run test`, `npm run test:e2e`.

---

## 11. Demo Accounts

All demo users share the password **`Password@123`**. Each represents one role, so you can show how the interface changes per role.

| Email | Role | Good for showing… |
|---|---|---|
| `admin@sms.et` | Administrator | Everything (full menu, users & roles). |
| `pao@sms.et` | PAO | Approvals, oversight, reports/audit. |
| `storekeeper@sms.et` | Storekeeper | Receiving & issuing stock. |
| `clerk@sms.et` | Stock Clerk | Read-only records & reports. |
| `accountant@sms.et` | Accountant | Valuation & exportable reports. |
| `depthead@sms.et` | Department Head | Creating & approving requisitions. |
| `security@sms.et` | Security Officer | Gate passes / exit control. |
| `supplier@sms.et` | Supplier | Limited external view. |

**Seeded sample data:** 6 categories, 6 units of measure, 3 warehouses, 5 suppliers, 12 inventory items, 3 stock receipts (which create the FIFO layers), 2 stock issues (which compute COGS), and 3 requisitions in different approval states.

---

## 12. Suggested 5-Minute Demo Script (for your advisor)

1. **Log in as `storekeeper@sms.et`** → point out the sidebar is limited to store operations (RBAC in action).
2. Open **Dashboard** → explain the KPI tiles, the 30-day movement trend, and stock-value-by-category chart.
3. Open **Stock Receipts** → explain: *"this is how goods enter — supplier, warehouse, quantity, unit cost; it creates a priced FIFO batch."*
4. Open **Stock Issues** → explain: *"this is how goods go out to a department; the system uses FIFO to cost them, so we always know COGS."* Use the laptop example from §8.3.
5. **Log out and log in as `depthead@sms.et`** → create a **Requisition**; then **log in as `pao@sms.et`** and **approve** it → shows the request/approval chain.
6. Finish on **Audit Logs** → *"every action is recorded — who, what, when."*
7. **One-line summary:** *"It's a role-based inventory system that tracks stock quantity and value with FIFO costing, enforces an approval workflow, and keeps a full audit trail."*

---

*Prepared from the project source: `prisma/schema.prisma` (data model), `src/lib/constants/permissions.ts` (RBAC), `src/lib/services/fifo.ts` (valuation engine), `prisma/seed.ts` (demo data), `backend/` (Express API), and `src/components/app/` (UI).*

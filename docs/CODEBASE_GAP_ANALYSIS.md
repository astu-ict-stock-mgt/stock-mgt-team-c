# Codebase Gap Analysis Report

## 1. EXECUTIVE SUMMARY

The existing Stock Management System codebase provides a basic, functional inventory framework but currently falls short of the detailed workflows required by the Master Software Requirements Specification (SRS) and the 26 mandatory instructor use cases. 

**Current Architecture:** The system uses a monorepo-style structure, though loosely organized. It features an Express.js backend exposing REST APIs and a Next.js frontend that is currently implemented primarily as a Single Page Application (SPA) using component sections rather than full Next.js App Router pages. It uses Prisma as the ORM.

**What Works:** Basic authentication, RBAC foundations, inventory item definitions, simple warehouse setup, and basic receipt/issue/transfer records exist. The `seed.ts` file provides a solid starting point for demo data. A basic FIFO valuation layer is implemented in the database schema.

**What is Incomplete:** The system lacks granular storage tracking (Locations/Shelves/Bins), complex document workflows (Technical Evaluation, GRN vs Receipt distinction, Store Returns, Disposal Workflows, SIV preliminary/amendment stages), and Fixed Asset/User Card tracking. The frontend is heavily simplified and does not match the deep routing structure requested in the SRS.

**Major Risks:** 
- The physical storage model is flat (`Warehouse` only) and cannot support the required `Bin` operations.
- Document workflows (Receipts, Issues) bypass critical approval and evaluation states required by the Master SRS.
- The frontend is built as a single-page dashboard with monolithic section components, which will not scale to the complex routing requirements of the SRS.

**Overall Readiness:** The codebase is a good prototype but requires significant structural refactoring in the database and a complete overhaul of the frontend routing to meet the Master SRS requirements.

---

## 2. CURRENT TECHNOLOGY STACK

**Frontend:** Next.js 16 (React 19), Tailwind CSS v4, Radix UI (Shadcn components), Zustand, React Hook Form, Zod.
**Backend:** Node.js, Express.js (v4.21), TypeScript.
**Database:** PostgreSQL (Note: The prompt indicates a migration from SQLite is needed, and while `schema.prisma` specifies `postgresql`, previous iterations likely relied on SQLite. True PostgreSQL features are not yet heavily utilized).
**ORM:** Prisma v6.11.1.
**Authentication:** Custom JWT with `bcryptjs`.
**Authorization:** Custom Role-Based Access Control (RBAC) via Prisma relationships.
**Validation:** Zod.
**Testing:** Vitest, Playwright (configured, but frontend tests are likely minimal).
**Other important libraries:** `cors`, `helmet`, `morgan`, `express-rate-limit`, `lucide-react`, `recharts`.

---

## 3. CURRENT PROJECT ARCHITECTURE

**Frontend ↓**
A Next.js application that ignores standard routing. `src/app/page.tsx` loads a monolithic SPA shell (`src/components/app/app-shell.tsx`), which conditionally renders massive section components (e.g., `inventory-section.tsx`). 

**API ↓**
Express REST API located in `backend/src/routes`. Routes are grouped by entity (e.g., `auth.ts`, `inventory.ts`, `requisitions.ts`).

**Backend ↓**
Standard Node/Express setup running from `backend/src/server.ts`. 

**Service/business layer ↓**
Business logic is somewhat separated into `backend/src/services/` (e.g., `receipts.ts`, `issues.ts`, `fifo-consume.ts`), encapsulating database logic away from controllers.

**Prisma ↓**
`prisma/schema.prisma` acts as the single source of truth for the database schema.

**Database**
PostgreSQL database.

---

## 4. CURRENT DATABASE AUDIT

| Existing Entity | Purpose | Relationships | Relevant SRS Requirement | Action |
|---|---|---|---|---|
| User / UserSession | Authentication & session tracking | Roles, Audits, Transactions, Documents | Authentication | KEEP |
| Role / Permission | RBAC Definitions | UserRole, RolePermission | RBAC | KEEP |
| Supplier | Source of received goods | StockReceipt | Supplier Management | KEEP |
| Category / UnitOfMeasure | Item classifications | InventoryItem | Item Categories | KEEP |
| Warehouse | High-level storage facility | Stock, Receipts, Issues, Transfers | Manage Store Information | EXTEND |
| InventoryItem | Master material definition | WarehouseStock, Documents | Items/Materials | EXTEND |
| WarehouseStock | Flat stock quantity by warehouse | Item, Warehouse | Stock Tracking | EXTEND |
| FifoLayer | FIFO cost tracking | Item, Warehouse, Receipt | FIFO Valuation | KEEP |
| StockReceipt / Item | Inbound goods document | Supplier, Warehouse, Fifo | Goods Receipt Record | REFACTOR |
| StockIssue / Item | Outbound goods document | Source/Dest Warehouse | Final SIV/ISIV (Model 22) | REFACTOR |
| StockTransfer / Item | Warehouse-to-Warehouse movement | Source/Dest Warehouse | Material Transfer Request | REFACTOR |
| StockTransaction | Immutable stock ledger | Item, Warehouse | Auto-Update Stock Card | EXTEND |
| Requisition / Item / Appr | Store Requisition workflow | RequestedBy, Approvals | Manage Store Requisition | KEEP |
| StockTake / Item | Physical counting | Warehouse, Conductor | Stocktaking | KEEP |
| DamagedStock / Obsolete | Basic disposal tracking | Item | Flag Items for Disposal | REFACTOR |
| GatePass | Security exit control | Issue, RequestedBy | Gate Officer | KEEP |
| AuditLog | System activity history | User | Auditability | KEEP |

**Identified Problems:**
- **Missing Entities:** `Location`, `Shelf`, `Bin`, `BinCard`, `BinStock`, `TechnicalEvaluation`, `TechnicalEvaluationResult`, `GRN`, `StoreReturnNote` (SRN), `FixedAsset`, `UserCard`, `DisposalRequest`.
- **Location/Bin Modeling Problems:** Entirely missing. `WarehouseStock` stores flat quantities per warehouse.
- **Document/Workflow Modeling Problems:** `StockReceipt` acts as both the receipt and the GRN. `StockIssue` acts as both the request and the final Model 22. Preliminary states are missing.
- **Stock-related Modeling Problems:** Lack of separation between physical bins and overall warehouse stock.

---

## 5. CURRENT SEED DATA AUDIT

The `prisma/seed.ts` file provides realistic data:
- **Roles & Permissions:** Creates 8 roles (ADMINISTRATOR, PAO, STOREKEEPER, STOCK_CLERK, ACCOUNTANT, DEPARTMENT_HEAD, SECURITY_OFFICER, SUPPLIER). **Action:** KEEP, but need to add TEC and Auditor.
- **Users:** 8 demo users mapping to the roles. **Action:** KEEP/EXTEND.
- **Categories & UOMs:** 6 categories (ELEC, STAT, FURN, etc.) and 6 UOMs. **Action:** KEEP.
- **Warehouses:** 3 stores (Main, IT, Stationery). **Action:** EXTEND to add Locations, Shelves, Bins inside these stores.
- **Suppliers:** 5 realistic suppliers. **Action:** KEEP.
- **Items:** 12 items with min/max stock levels. **Action:** KEEP.
- **Transactions:** Seeds requisitions, 3 sample receipts (creates FIFO layers), and 1 issue (tests COGS). **Action:** REFACTOR to align with new document workflows (TEC, GRN, SIV).

---

## 6. CURRENT RBAC AUDIT

**Existing Roles:** ADMINISTRATOR, PAO (Property Admin Officer), STOREKEEPER, STOCK_CLERK, ACCOUNTANT, DEPARTMENT_HEAD, SECURITY_OFFICER, SUPPLIER.

**Mapping to Master SRS Actors:**
- Administrator → ADMINISTRATOR (Match)
- Store Head → PAO / DEPARTMENT_HEAD (Partial match, PAO acts as approver)
- Storekeeper → STOREKEEPER (Match)
- Stock Clerk / Property Registration Officer → STOCK_CLERK (Match)
- TEC → **MISSING** (Needs new role or permission set)
- Requester → Handled by DEPARTMENT_HEAD / standard users (Match)
- Approver → Handled by PAO / DEPARTMENT_HEAD (Match)
- Fixed Asset / Property Officer → **MISSING**
- Accountant → ACCOUNTANT (Match)
- Auditor → **MISSING**
- Supplier → SUPPLIER (Match)

**Conclusion:** We need to add `TEC`, `FIXED_ASSET_OFFICER`, and `AUDITOR` roles. Existing roles can represent the remaining actors.

---

## 7. FRONTEND AUDIT

The current frontend ignores Next.js App Router best practices, rendering a monolithic application inside `src/app/page.tsx` and relying on state-driven component swapping (`src/components/app/sections/*.tsx`).

| Page | Existing? | Functional? | SRS Use Case | Missing Work |
|---|---|---|---|---|
| `/dashboard` | YES (SPA) | Yes | Overview | Convert to Next.js route |
| `/stores` | YES (SPA) | Yes | UC-01 | Convert to route, add Bin management |
| `/categories` | YES (SPA) | Yes | UC-02 | Convert to route |
| `/locations` | NO | No | UC-03 | Build complete pages |
| `/receipts` | YES (SPA) | Yes | UC-04 | Convert to route, add evaluation flow |
| `/tec-evaluations`| NO | No | UC-05, UC-19 | Build complete pages |
| `/grns` | NO | No | UC-06 | Build complete pages |
| `/inventory/...`| NO | No | UC-07, UC-08 | Build explicit stock card pages |
| `/bins` | NO | No | UC-09, UC-10 | Build complete pages |
| `/requisitions` | YES (SPA) | Yes | UC-11, UC-12 | Convert to route |
| `/siv` | NO | No | UC-13, UC-14, UC-15| Build complete pages |
| `/fixed-assets` | NO | No | UC-16 | Build complete pages |
| `/user-cards` | NO | No | UC-17 | Build complete pages |
| `/returns` | NO | No | UC-18, UC-20 | Build complete pages |
| `/transfers` | YES (SPA) | Basic | UC-21, UC-22 | Build workflow pages |
| `/shelf-life` | NO | No | UC-23 | Build monitoring dashboard |
| `/disposals` | NO | No | UC-24, UC-25, UC-26| Build workflow pages |

**Verdict:** The entire frontend must be refactored into proper Next.js App Router pages (`src/app/(dashboard)/...`) to meet the SRS specifications.

---

## 8. BACKEND/API AUDIT

**Existing Backend Modules:**
- `auth.ts`, `users.ts`, `roles.ts`: Handles RBAC.
- `inventory.ts`, `categories.ts`: Item management.
- `receipts.ts`: Handles direct receipt to stock (bypasses TEC and GRN).
- `issues.ts`: Handles direct issue (bypasses preliminary SIV).
- `requisitions.ts`: Handles request and approval workflow.
- `transfers.ts`: Handles direct warehouse-to-warehouse transfers.
- `reports.ts`, `audit-logs.ts`: Basic reporting.

**Gap:** The backend APIs are too direct. They immediately mutate stock quantities upon receipt or issue creation. They must be refactored to support intermediate states (Draft -> Evaluation -> Approved -> Final Document -> Stock Update).

---

## 9. INSTRUCTOR USE CASE GAP MATRIX

| # | Instructor Use Case | Existing Support | Status | Required Work |
|---|---|---|---|---|
| 1 | Manage Store Information | Basic Warehouse entity | PARTIAL | Add Location, Shelf, Bin hierarchy. |
| 2 | Maintain Item Categories | Category entity exists | COMPLETE | - |
| 3 | Maintain Item Locations | None | MISSING | Create physical storage schema and UI. |
| 4 | Goods Receipt Record | StockReceipt exists | PARTIAL | Separate temporary receipt from GRN. |
| 5 | Evaluate Materials for Acceptance | Inspected boolean only | MISSING | Create Technical Evaluation workflow. |
| 6 | Generate Goods Receiving Note (GRN) | None | MISSING | Create GRN entity linked to Receipt. |
| 7 | Auto-Update Stock Card | StockTransaction exists | PARTIAL | Ensure UI matches Stock Card format. |
| 8 | View Stock Card | Basic transaction view | PARTIAL | Build explicit Stock Card UI. |
| 9 | Manage Bin Card | None | MISSING | Create BinCard entity and UI. |
| 10| Stock Transfer Between Bins | Warehouse transfer only | MISSING | Implement internal bin-to-bin transfers. |
| 11| Manage Store Requisition | Requisition exists | COMPLETE | - |
| 12| Approve/Reject Store Requisition| RequisitionApproval exists| COMPLETE | - |
| 13| Create Preliminary SIV/ISIV | None | MISSING | Create SIV entity distinct from Issue. |
| 14| Approve/Amend SIV/ISIV | None | MISSING | Add SIV approval workflow. |
| 15| Generate Final SIV/ISIV (Model 22)| StockIssue exists | PARTIAL | Link StockIssue to approved SIV. |
| 16| Manage Fixed Assets Registration | None | MISSING | Create FixedAsset entity. |
| 17| Manage User Card | None | MISSING | Create UserCard entity. |
| 18| Create Material Return Request / SRN| None | MISSING | Create ReturnRequest / SRN entity. |
| 19| Record Technical Evaluation Result| None | MISSING | Extend TEC module for returns. |
| 20| Approve/Reject Store Return | None | MISSING | Add return approval workflow. |
| 21| Initiate Material Transfer Request| StockTransfer exists | PARTIAL | Add Request phase before execution. |
| 22| Approve/Reject Material Transfer| Status field only | PARTIAL | Add dedicated approval workflow. |
| 23| Auto-Monitor Shelf Life and Status| None | MISSING | Add expiry dates to InventoryItem/Fifo. |
| 24| Flag Items for Disposal | DamagedStock exists | PARTIAL | Add explicit disposal flags to items. |
| 25| Manage Disposal Request | None | MISSING | Create DisposalRequest entity. |
| 26| Manage Disposal Workflow | None | MISSING | Implement disposal approval and execution. |

---

## 10. BUSINESS WORKFLOW AUDIT

**A. RECEIVING:** 
*SRS:* Delivery → Receipt Record → Eval → Accept → GRN → Stock/Bin Card.
*Current:* Delivery → StockReceipt → Immediate Stock Update.
*Gap:* Missing Evaluation, missing separate GRN, missing Bin Card updates.

**B. ISSUE:**
*SRS:* Requisition → Approval → Preliminary SIV → Approval → Final Model 22 → Stock/Bin Update.
*Current:* Requisition → Approval. Then separately, StockIssue → Immediate Stock Update.
*Gap:* SIV workflow is entirely missing. Issue is disconnected from Requisition lifecycle natively.

**C. RETURN:**
*SRS:* SRN → TEC Eval → Approval → Return to Stock.
*Current:* Missing.

**D. TRANSFER:**
*SRS:* Transfer Request → Approval → Source Out → Dest In.
*Current:* StockTransfer instantly executes transfer. Missing request/approval stages.

**E. DISPOSAL:**
*SRS:* Flag → Request → Approval → Disposal Transaction.
*Current:* User directly adds to `DamagedStock` or `ObsoleteStock`. No workflow.

---

## 11. STOCK ACCOUNTING AUDIT

- **Stock Quantity:** Stored flat in `WarehouseStock`. Needs to be distributed to `BinStock`.
- **FIFO:** `FifoLayer` is implemented and consumed during `StockIssue`. This is a strong point.
- **Immutability:** `StockTransaction` acts as an immutable ledger, which is good.
- **Negative Stock:** Needs strict prevention constraints during the SIV/Issue execution step.

---

## 12. DATABASE MIGRATION ANALYSIS

- **Current State:** `schema.prisma` defines `provider = "postgresql"`. The instruction notes an existing SQLite development setup.
- **Action:** Ensure no SQLite specific functions are used in queries. Update `.env` to point to a PostgreSQL instance. The schema itself is compatible with PostgreSQL. 
- **Recommendation:** Do not run migrations until the new master data models (Locations, Bins, GRNs, etc.) are added to `schema.prisma`.

---

## 13. MASTER DATA MODEL GAP

**Required Hierarchy:** Organization → Department → Store → Location → Shelf → Bin → Item → Bin Stock → Bin Card.
**Existing:** Store (Warehouse) → Item → Warehouse Stock.
**Gap:** Extremely severe. The physical modeling of the warehouse is entirely missing.

---

## 14. DOCUMENT WORKFLOW GAP

**Missing entirely:**
- Technical Evaluation
- GRN / Model 19
- SR / Model 20 (Partially exists as Requisition)
- SIV / ISIV
- SRN
- Transfer Request
- Disposal Request

---

## 15. AUDITABILITY GAP

`AuditLog` exists and captures actor, action, entity, and values. This provides a good foundation, but it needs to be hooked up to the new document workflows to capture approvals, rejections, and state changes.

---

## 16. REQUIRED DATABASE CHANGES

**KEEP:** User, Role, Permission, Category, Supplier, StockTransaction, AuditLog.
**EXTEND:** 
- `Warehouse`: Rename to `Store`, link to departments.
- `InventoryItem`: Add shelf-life, expiry tracking, material type.
**REFACTOR:** 
- `StockReceipt`: Split into `TemporaryReceipt` and `GRN`.
- `StockIssue`: Split into `SIV` and `FinalIssue`.
**CREATE:** 
- `Location`, `Shelf`, `Bin`.
- `BinStock`, `BinCard`.
- `TechnicalEvaluation`.
- `FixedAsset`, `UserCard`.
- `StoreReturnNote` (SRN).
- `DisposalRequest`.

---

## 17. REQUIRED FRONTEND CHANGES

**Phase 1 (Structural):** Dismantle the SPA sections in `src/components/app/sections/` and rebuild them using Next.js App Router standard directory structure (`src/app/(dashboard)/...`).
**Phase 2 (Master Data):** Build pages for Store Locations, Shelves, and Bins.
**Phase 3 (Workflows):** Build multi-step pages for Receiving (Receipt -> TEC -> GRN) and Issuing (Requisition -> SIV -> Issue).
**Phase 4 (Reporting):** Build detailed Stock Card and Bin Card views.

---

## 18. REQUIRED BACKEND CHANGES

**Phase 1:** Add CRUD APIs for Location, Shelf, Bin.
**Phase 2:** Refactor `receipts.ts` to implement the Temporary Receipt -> TEC -> GRN state machine.
**Phase 3:** Create `siv.ts` API to handle preliminary SIVs and link them to final Issues.
**Phase 4:** Create `returns.ts`, `assets.ts`, and `disposals.ts`.

---

## 19. IMPLEMENTATION DEPENDENCY ORDER

1. **Frontend Restructuring:** Migrate SPA to Next.js App Router (non-destructive UI mapping).
2. **Master Data Expansion:** Implement Stores, Locations, Shelves, and Bins in Prisma, Backend, and Frontend.
3. **Authentication/RBAC Updates:** Add TEC, Auditor, Fixed Asset Officer roles.
4. **Receiving & TEC Workflow:** Refactor Receipts, add TEC Evaluation and GRN generation.
5. **Stock & Bin Cards:** Refactor stock transactions to update Bin Cards.
6. **Requisition & SIV Workflow:** Implement SIV approval and Model 22 issuance.
7. **Returns Workflow:** Implement SRN and return evaluations.
8. **Transfers Workflow:** Add Request and Approval stages to Transfers.
9. **Fixed Assets & User Cards:** Implement asset registration.
10. **Shelf Life & Disposal:** Implement disposal flags and workflows.

---

## 20. CRITICAL RISKS

1. **Database Schema Locking:** If we start generating production data before restructuring `WarehouseStock` into `BinStock`, the migration will be extremely painful. We must fix the Master Data model immediately.
2. **Frontend Scaling:** Continuing with the monolithic SPA architecture will make implementing 26 complex use cases impossible to maintain.

---

## 21. RECOMMENDED PHASE 1

**Do not start implementation yet.**
The mandatory next step is **Phase 1: Project Restructuring and Master Data Model Expansion**.
We must update `schema.prisma` to include the Location/Shelf/Bin hierarchy, update the routing architecture of the Next.js frontend to use standard App Router pages, and prepare the database for PostgreSQL migration. Only after the physical storage model is correct can we build the complex workflows on top of it.

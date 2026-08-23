# Phase 2: Backend Master Data & RBAC API Implementation

## Overview
Phase 2 focused exclusively on establishing the Master Data foundations for the physical storage hierarchy (`Store -> Location -> Shelf -> Bin`) and updating the underlying Role-Based Access Control (RBAC) to support this structure. Legacy logic dependent on the deprecated SQLite models (`Warehouse`, `StockReceipt`, `StockIssue`) was safely stubbed out.

## 1. RBAC & Permissions Updates
The legacy `warehouses.*` permissions were entirely removed from `backend/src/config/permissions.ts`.

### New Permissions Introduced:
- `stores.read`, `stores.create`, `stores.update`, `stores.delete`
- `locations.read`, `locations.create`, `locations.update`, `locations.delete`
- `shelves.read`, `shelves.create`, `shelves.update`, `shelves.delete`
- `bins.read`, `bins.create`, `bins.update`, `bins.delete`

### Role Mapping:
- **PAO**: Granted full management access across Stores, Locations, Shelves, and Bins.
- **STOREKEEPER, STOCK_CLERK, ACCOUNTANT**: Granted `*.read` access to the full storage hierarchy.
- **NEW ROLES**: `TEC`, `FIXED_ASSET_OFFICER`, and `AUDITOR` were added to the `ROLE_PERMISSIONS` dictionary to match Phase 1 seed logic.

## 2. API Endpoints Created
All APIs follow the established response convention using `ok()` and `fail()` helpers and use strictly typed Zod validations.

### Store API (`/api/v1/stores`)
- `GET /api/v1/stores`: Lists stores with optional `search` and `status` filtering.
- `GET /api/v1/stores/:id`: Returns Store details, cascading down to Location count.
- `POST /api/v1/stores`: Creates a new store.
- `PATCH /api/v1/stores/:id`: Updates store properties.
- `DELETE /api/v1/stores/:id`: Soft-deletes a store (sets `status` to `INACTIVE` and assigns `deletedAt`), but *strictly rejects* deletion if the store has associated `receipts`, `sivs`, or `stockTransactions` to prevent destruction of historical data.

### Location API (`/api/v1/locations` & `/api/v1/stores/:storeId/locations`)
- `GET /api/v1/stores/:storeId/locations`: Lists locations within a specific store.
- `POST /api/v1/stores/:storeId/locations`: Creates a location directly tied to a store.
- `GET /api/v1/locations/:id`: Retrieves location info and nested shelf counts.
- `PATCH /api/v1/locations/:id`: Updates location.
- `DELETE /api/v1/locations/:id`: Deletes location, but *rejects* if it contains active shelves.

### Shelf API (`/api/v1/shelves` & `/api/v1/locations/:locationId/shelves`)
- `GET /api/v1/locations/:locationId/shelves`: Lists shelves for a location.
- `POST /api/v1/locations/:locationId/shelves`: Creates a shelf.
- `GET /api/v1/shelves/:id`: Retrieves shelf.
- `PATCH /api/v1/shelves/:id`: Updates shelf.
- `DELETE /api/v1/shelves/:id`: Deletes shelf, but *rejects* if it contains active bins.

### Bin API (`/api/v1/bins` & `/api/v1/shelves/:shelfId/bins`)
- `GET /api/v1/shelves/:shelfId/bins`: Lists bins.
- `POST /api/v1/shelves/:shelfId/bins`: Creates a bin.
- `GET /api/v1/bins/:id`: Retrieves bin.
- `PATCH /api/v1/bins/:id`: Updates bin.
- `DELETE /api/v1/bins/:id`: Deletes bin, but *rejects* if the bin has active `BinStock` or historical `BinCards`.

## 3. Legacy Code Cleanup (Phase 2.7)
All `@ts-nocheck` directives related to legacy `Warehouse` or `StockReceipt` logic were permanently removed to ensure 100% type safety. 

Because the complete Goods Receipt / SIV / Transfer workflows belong to Phase 3/4, the legacy logic was replaced with explicit **501 Not Implemented** stubs:
- `backend/src/services/receipts.ts`
- `backend/src/services/issues.ts`
- `backend/src/services/transfers.ts`
- `backend/src/services/dashboard.ts`
- `backend/src/services/fifo.ts` & `fifo-consume.ts`
- Associated routes (`/receipts`, `/issues`, `/transfers`) were explicitly stubbed to return `HTTP 501 Not Implemented`.

## 4. Verification & Testing
1. **Type Safety**: `npm run typecheck` passes with zero errors (`Exit code: 0`).
2. **Build**: `npm run build` succeeds.
3. **API Tests**: `stores.test.ts` implemented using Vitest and Supertest to validate:
   - Successful creation of the entire hierarchy (Store -> Location -> Shelf -> Bin).
   - Fetching nested structure.
   - Enforcement of foreign keys and custom cascade protection logic (e.g., rejecting deletion of a shelf containing bins).

## Conclusion
The backend is completely fully type-safe, legacy warehouse artifacts have been neutralized, and a resilient, production-ready Master Data API for the storage hierarchy is now active. 

**STATUS: PASS.** Phase 2 is complete.

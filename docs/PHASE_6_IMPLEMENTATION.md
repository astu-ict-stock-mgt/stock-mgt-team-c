# Phase 6 Implementation — Physical Inventory Counting & Stock Adjustments

## Takeover Audit

### Completed by Antigravity
- Gap analysis and implementation plan documents
- Prisma models: `StockTake`, `StockTakeItem` (with `binId`), `StockAdjustment`, `StockAdjustmentItem`
- Extended `StockTakeStatus` workflow enum
- Backend service skeleton in `backend/src/services/stocktakes.ts` (create, add items, start, count, submit, review, recount, reject, approve)
- Validators in `backend/src/validators/stocktakes.ts`
- RBAC permissions in `backend/src/config/permissions.ts`
- Utility scripts: `clear_stocktake.ts`, `drop_stocktake.ts`

### Incomplete / missing before this continuation
- Phase 6 database migration (schema ahead of applied migrations)
- REST routes and `app.ts` registration
- `StockAdjustment` service (approve / reject / post with FIFO + ledgers)
- List/get/update/resume APIs
- Integration tests
- Frontend pages and API hooks
- Frontend permission naming alignment (`stocktake.*` vs `stocktakes.*`)
- Documentation artifact for completed phase

### Fixed / completed in this continuation
- Migration `20260824120000_phase6_inventory_counting`
- Full stock take and stock adjustment API routes
- Atomic adjustment posting with delta application against **current** stock
- FIFO consume (OUT) and layer creation (IN) with cost resolution rules
- Frontend **Stock Takes** section (list, create, count, review, adjustment approve/post)
- Integration tests in `backend/tests/stocktakes.test.ts`
- TypeScript `moduleResolution` deprecation fix (`node` → `node16`)

---

## Backend

### Models
- `StockTake` / `StockTakeItem` — bin-level counting, baseline `systemQty` captured at **start** only
- `StockAdjustment` / `StockAdjustmentItem` — authorized mutation voucher linked 1:1 to approved stock take

### Services
- `stocktakes.ts` — full workflow through adjustment generation
- `stockadjustments.ts` — approve (with cost overrides), reject, post
- `stores.listStoreBinStocks` — bin stock picker for create UI

### Routes
| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/api/v1/stock-takes` | read / create |
| GET/PATCH | `/api/v1/stock-takes/:id` | read / update |
| POST | `/api/v1/stock-takes/:id/items` | update |
| POST | `/api/v1/stock-takes/:id/start` | update |
| POST | `/api/v1/stock-takes/:id/resume` | update |
| PATCH | `/api/v1/stock-takes/:id/count` | update |
| POST | `/api/v1/stock-takes/:id/submit` | submit |
| POST | `/api/v1/stock-takes/:id/review` | review |
| POST | `/api/v1/stock-takes/:id/recount` | recount |
| POST | `/api/v1/stock-takes/:id/approve` | review |
| POST | `/api/v1/stock-takes/:id/reject` | review |
| GET | `/api/v1/stock-adjustments` | stockadjustments.read |
| GET | `/api/v1/stock-adjustments/:id` | stockadjustments.read |
| POST | `/api/v1/stock-adjustments/:id/approve` | stockadjustments.approve |
| POST | `/api/v1/stock-adjustments/:id/reject` | stockadjustments.approve |
| POST | `/api/v1/stock-adjustments/:id/post` | stockadjustments.post |

### Stock mutation rules
- **No mutation** during create / start / count / submit / review
- **Posting only** mutates `BinStock`, `StoreStock`, `FifoLayer`, `StockTransaction`, `StockCard`, `BinCard`
- Variance applied as **delta** against current stock (not snapshot overwrite)

### Concurrency
- Adjustment post uses `updateMany` with `status: APPROVED` → `POSTED` atomic transition
- Duplicate post returns 409
- Decrement checks prevent negative stock within transaction

---

## Frontend

### Pages / sections
- `Stock Takes` nav item → `stock-takes-section.tsx`
  - Dashboard list with search and status filter
  - Create dialog (store + bin stock multi-select)
  - Detail/count view with variance highlighting
  - Review actions (approve / reject / recount)
  - Adjustment review with cost override and post confirmation

### Integration
- TanStack Query hooks in `src/lib/api/hooks.ts`
- Permissions aligned to backend `stocktakes.*` / `stockadjustments.*`
- Notifications link to `stock-takes` section

---

## Tests
Run: `cd backend && npm test`

Covers:
- No stock mutation on create/start/count/submit
- Submitted counts not editable
- Negative variance delta against stock moved during count
- Positive variance FIFO cost default
- Duplicate posting blocked

---

## Technical debt
- `stores/:storeId/bin-stocks` route must be registered **before** `/:id` in Express (currently after — may need reorder if conflicts arise)
- Phase 3–5 regression tests not duplicated in stock take suite (rely on existing test files)
- `src/lib/services/notifications.ts` (Next.js side) updated but may be unused if notifications come from backend API only

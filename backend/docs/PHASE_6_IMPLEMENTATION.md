# PHASE 6: PHYSICAL INVENTORY COUNTING & STOCK ADJUSTMENTS — IMPLEMENTATION NOTES

## 1. Schema Changes

### Modified: `StockTakeStatus` enum
Extended with new lifecycle states:
```
DRAFT → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED / RECOUNT_REQUIRED / REJECTED → RECONCILED
```
`COMPLETED` retained for backward compatibility.

### Modified: `StockTakeItem`
- Added `binId String` — required; links count to exact bin
- `systemQty Float?` — now nullable; captured at `IN_PROGRESS` transition (not at creation)
- Added `unitCostOverride Float?` — optional cost override for positive variances
- Added unique constraint: `@@unique([stockTakeId, itemId, binId])`
- Added relation: `bin Bin`

### Modified: `StockTake`
- Added `adjustment StockAdjustment?` back-relation

### New: `StockAdjustment`
| Field | Notes |
|---|---|
| `code` | ADJ-YYYYMMDD-XXXX, unique |
| `storeId` | FK to Store |
| `stockTakeId?` | optional FK to StockTake (1:1) |
| `requestedById` | FK to User |
| `approvedById?` | FK to User |
| `status` | DRAFT → SUBMITTED → APPROVED → POSTED / REJECTED |

### New: `StockAdjustmentItem`
| Field | Notes |
|---|---|
| `variance` | Signed delta: negative = OUT, positive = IN |
| `unitCost?` | Applied cost (persisted after posting) |

---

## 2. State Machine

### StockTake
```
DRAFT → (add items) → start → IN_PROGRESS
IN_PROGRESS → (record counts) → submit → SUBMITTED
SUBMITTED → review → UNDER_REVIEW
UNDER_REVIEW → approve → APPROVED (creates StockAdjustment DRAFT)
UNDER_REVIEW → recount → RECOUNT_REQUIRED → resume → IN_PROGRESS
UNDER_REVIEW / SUBMITTED → reject → REJECTED
APPROVED (when StockAdjustment is POSTED) → RECONCILED
```

### StockAdjustment
```
DRAFT → approve → APPROVED
APPROVED → post → POSTED (triggers stock mutation + StockTake = RECONCILED)
DRAFT / SUBMITTED / APPROVED → reject → REJECTED
```

---

## 3. API Surface

### Stock Takes
| Method | Endpoint | Permission | Notes |
|---|---|---|---|
| POST | `/api/v1/stock-takes` | `stocktakes.create` | Create DRAFT |
| GET | `/api/v1/stock-takes` | `stocktakes.read` | List with filters |
| GET | `/api/v1/stock-takes/:id` | `stocktakes.read` | Get with items + adjustment |
| PATCH | `/api/v1/stock-takes/:id` | `stocktakes.update` | Update notes (DRAFT only) |
| POST | `/api/v1/stock-takes/:id/items` | `stocktakes.update` | Add count items (DRAFT only) |
| POST | `/api/v1/stock-takes/:id/start` | `stocktakes.update` | Snapshot systemQty + → IN_PROGRESS |
| POST | `/api/v1/stock-takes/:id/resume` | `stocktakes.update` | RECOUNT_REQUIRED → IN_PROGRESS |
| PATCH | `/api/v1/stock-takes/:id/count` | `stocktakes.update` | Record physicalQty |
| POST | `/api/v1/stock-takes/:id/submit` | `stocktakes.submit` | → SUBMITTED |
| POST | `/api/v1/stock-takes/:id/review` | `stocktakes.review` | → UNDER_REVIEW |
| POST | `/api/v1/stock-takes/:id/recount` | `stocktakes.recount` | → RECOUNT_REQUIRED |
| POST | `/api/v1/stock-takes/:id/approve` | `stocktakes.review` | → APPROVED; creates StockAdjustment |
| POST | `/api/v1/stock-takes/:id/reject` | `stocktakes.review` | → REJECTED |

### Stock Adjustments
| Method | Endpoint | Permission | Notes |
|---|---|---|---|
| GET | `/api/v1/stock-adjustments` | `stockadjustments.read` | List |
| GET | `/api/v1/stock-adjustments/:id` | `stockadjustments.read` | Get detail |
| POST | `/api/v1/stock-adjustments/:id/approve` | `stockadjustments.approve` | → APPROVED; accepts unitCost overrides |
| POST | `/api/v1/stock-adjustments/:id/reject` | `stockadjustments.approve` | → REJECTED |
| POST | `/api/v1/stock-adjustments/:id/post` | `stockadjustments.post` | → POSTED; executes all stock mutations |

---

## 4. RBAC

| Role | Permissions |
|---|---|
| STOREKEEPER | `stocktakes.create`, `.read`, `.update`, `.submit` |
| PAO | `stocktakes.read`, `.review`, `.recount`, `stockadjustments.read`, `.approve`, `.post` |
| ADMINISTRATOR | All permissions |

---

## 5. Stock Mutation Rules (Golden Rule Enforced)

These operations do **NOT** mutate stock:
- StockTake creation, start, count entry, submit, review, recount, reject

Only **`POST /api/v1/stock-adjustments/:id/post`** mutates stock.

---

## 6. Snapshot Strategy

- `systemQty` is captured at `IN_PROGRESS` transition (not at creation)
- Example: Batch created Monday, physical count starts Thursday — Thursday's quantity is used as baseline
- Adjustments apply **variance as a delta** against current stock, not as an absolute replacement

### Delta Application Example
```
Baseline (captured at IN_PROGRESS): 100
Physical count recorded:              95
Variance:                             -5
GRN arrives during count:           +20
Current stock at posting time:       120
Adjustment posts (120 - 5):          115 ✓  (not 95)
```

---

## 7. FIFO Behavior

### Negative Variance (`physicalQty < systemQty`) → ADJUSTMENT_OUT
- Consumes FIFO layers oldest-first
- Blended unit cost calculated from consumed layers
- `StockTransaction`, `StockCard`, `BinCard` written with computed unit cost

### Positive Variance (`physicalQty > systemQty`) → ADJUSTMENT_IN
- Default cost: most recent FIFO layer unit cost for item in store
- Override: `unitCost` may be supplied during `approveStockAdjustment`
- If no FIFO history exists: API returns 400 requiring explicit cost before posting
- New `FifoLayer` created with the applied cost
- `StockTransaction`, `StockCard`, `BinCard` written
- `StockAdjustmentItem.unitCost` persisted for full auditability

---

## 8. Concurrency Protections

- **StockAdjustment posting** uses atomic `updateMany` with `status: APPROVED` condition
  - If two concurrent POST requests arrive, exactly one will match the `updateMany` → the other gets a 409
  - This is the same battle-tested pattern used for SIV finalization (Phase 4)
- **Negative variance check**: `BinStock.quantity < delta` guard before mutation
- Post-update quantity checked for `< 0` to detect concurrent mutations

---

## 9. Test Results

```
Test Files  7 passed (7)
Tests       42 passed (42)
Duration    ~14s

tests/stocktakes.test.ts — 6 PASS
  ✓ creating and starting a stock take does not mutate stock
  ✓ records count and submits without mutating stock
  ✓ blocks count edits after submit
  ✓ approves stock take and creates adjustment draft
  ✓ simulates stock movement during count and posts delta against current stock
    (concurrent GRN adds 20: baseline 100, physical 95, result 115)
  ✓ handles positive variance with fifo-derived cost

Phase 3 (receipts)    — PASS
Phase 4 (SIV/ISIV)    — PASS
Phase 5 (returns, transfers, bin transfers) — PASS
```

---

## 10. Known Technical Debt

- `stores.test.ts` generates benign audit log FK warnings: the stores test uses an unauthenticated user context where `userId` is null. `AuditLog` requires a valid FK. The audit service gracefully swallows the error, and all test assertions still pass. This is pre-existing and unrelated to Phase 6.
- A `prisma migrate dev` was not possible in the current non-interactive CI environment; `prisma db push --accept-data-loss` was used instead. A migration file should be created before production deployment.
- Temporary debug scripts (`clear_stocktake.ts`, `drop_stocktake.ts`) should be deleted before deployment.

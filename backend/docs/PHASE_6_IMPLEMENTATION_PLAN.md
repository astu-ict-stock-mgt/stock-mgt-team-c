# PHASE 6 IMPLEMENTATION PLAN: INVENTORY COUNTS & STOCK ADJUSTMENTS

## 1. Schema Changes

Based on the gap analysis, the following modifications to `prisma/schema.prisma` are required:

### Modified Models
- **`StockTakeItem`**:
  - Add `binId String` (Required). Ensures the system knows exactly which bin is being counted and adjusted.
  - Add `relation` to `Bin` model.
  - Consider adding `unitCost Float?` to capture user-inputted costs for positive variances (new stock discoveries).

- **`StockTake`**:
  - Extend scoping capabilities if required by SRS: Add `locationId`, `shelfId`, `binId` as optional filters, or add a `scope` enum (`STORE`, `LOCATION`, `BIN`).

### Proposed New Models
- **`StockAdjustment`**:
  - To maintain strict separation of duties, it is recommended to introduce a `StockAdjustment` model.
  - A `StockTake` can produce a `StockAdjustment` containing the approved variances.
  - *Alternatively*, we can handle this entirely within `StockTake` by using statuses `APPROVED` and `REJECTED`, and bypassing a separate table. (See Open Questions).

---

## 2. API Routes & Services

### `POST /api/v1/stock-takes` (Create)
- **Role**: Storekeeper / Admin
- **Action**: Initializes a count session.
- **Logic**: No stock mutation. Creates `StockTake` in `DRAFT`. Generates `StockTakeItem` rows with `systemQty` snapped from current `BinStock`.

### `POST /api/v1/stock-takes/:id/start` (Start)
- Transitions status to `IN_PROGRESS`. Marks the official start of counting.

### `PATCH /api/v1/stock-takes/:id/count` (Record Count)
- **Role**: Storekeeper
- **Action**: Updates `physicalQty` on specific `StockTakeItem`s. Calculates `variance` dynamically or stores it.

### `POST /api/v1/stock-takes/:id/submit` (Submit)
- **Role**: Storekeeper
- **Action**: Transitions to `SUBMITTED`. Prevents further editing of physical quantities.

### `POST /api/v1/stock-takes/:id/approve` (Approve & Execute)
- **Role**: Approver / Finance / Admin
- **Action**: Evaluates all variances and executes the ledger adjustment.
- **Logic**: 
  - Iterates through items with `variance !== 0`.
  - If Negative (Physical < System): Atomic decrement of `BinStock`/`StoreStock`, consumes FIFO, creates `ADJUSTMENT_OUT` ledger entries.
  - If Positive (Physical > System): Atomic increment of `BinStock`/`StoreStock`, creates new FIFO layer (using defined cost strategy), creates `ADJUSTMENT_IN` ledger entries.
  - Updates status to `RECONCILED`.

---

## 3. RBAC Permissions

New permissions to be seeded:
- `stocktakes.create`
- `stocktakes.read`
- `stocktakes.update` (for inputting counts)
- `stocktakes.submit`
- `stockadjustments.approve` (high-privilege, required to post financial/physical changes)

---

## 4. Transaction Boundaries & Concurrency

- **Snapshotting**: `systemQty` is captured at the moment of `StockTake` creation.
- **Atomic Locks**: During approval, the system must utilize `updateMany` with `status: SUBMITTED` to ensure double-posting is impossible.
- **Stale Data Prevention**: When executing the adjustment, the math must be calculated as a delta (`increment` or `decrement` by the `variance` amount), rather than setting the absolute value, to prevent wiping out concurrent GRN or SIV activity that occurred during the count.
  - *Example*: System was 100. Counted 95. Variance is -5. During the week of counting, a GRN added +20 (current DB = 120). The adjustment executes `decrement: 5`, resulting in a correct final balance of 115.

---

## 5. Integration Test Strategy

- `stocktakes.test.ts`
  - Verify `DRAFT` counts do not alter `BinStock`.
  - Verify `SUBMITTED` counts cannot be edited.
  - Verify `APPROVED` executes exactly once (test concurrent approval requests).
  - Verify negative variance correctly consumes FIFO.
  - Verify positive variance creates FIFO.
  - Verify all ledger logs (`StockCard`, `BinCard`, `StockTransaction`, `AuditLog`) are written.

---

## 6. OPEN QUESTIONS (REQUIRES USER APPROVAL)

Please review the following ambiguities and provide your decision:

1. **Missing `binId` in `StockTakeItem`**
   - *Issue*: `StockTakeItem` currently lacks a `binId`. Since stock is tracked in specific bins, we must know exactly which bin was counted to adjust `BinStock`. 
   - *Recommendation*: Add `binId String` to `StockTakeItem`. **Do you approve this schema change?**

2. **Positive Variance Valuation Strategy**
   - *Issue*: If we find 5 extra items (positive variance), we must add them to stock and create a FIFO layer. What should the `unitCost` be?
   - *Option A*: Prompt the user to enter a unit cost for positive variances during the count/approval process.
   - *Option B*: Automatically use the unit cost of the most recent FIFO layer for that item.
   - *Recommendation*: Option B for automation, with an optional override field if they want to specify a cost. **Which approach do you prefer?**

3. **Separate StockAdjustment Model vs. StockTake Status**
   - *Issue*: The current schema has `StockTake` with a `RECONCILED` status. Does the SRS require a separate, explicit `StockAdjustment` model/table to act as a financial voucher, or is executing the adjustments directly upon approving a `StockTake` sufficient?
   - *Recommendation*: Execute adjustments directly upon `StockTake` approval (less schema overhead, perfectly captures the workflow). **Do you approve reusing the `StockTake` model for the adjustment execution phase?**

4. **Snapshot vs Lock**
   - *Issue*: Should the system physically lock a store from SIV/GRN operations while a stock take is active?
   - *Recommendation*: Do not lock the store. Instead, capture the `systemQty` baseline at start, calculate the `variance`, and apply the *variance delta* (+5 or -3) to the current stock upon approval. **Do you agree with the delta application strategy without hard locking?**

I await your decisions on these four points before proceeding.

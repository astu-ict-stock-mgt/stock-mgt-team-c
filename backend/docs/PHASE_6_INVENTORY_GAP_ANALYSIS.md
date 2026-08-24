# PHASE 6: PHYSICAL INVENTORY COUNTING & STOCK ADJUSTMENTS GAP ANALYSIS

## 1. Existing Schema Audit

I performed a comprehensive audit of `prisma/schema.prisma` targeting physical inventory, counting, and adjustment workflows. 

### What exists:
- **`StockTake` model**: Contains `id`, `code`, `storeId`, `conductedById`, `status` (`StockTakeStatus`), `startDate`, `endDate`, and `notes`.
- **`StockTakeStatus` enum**: Contains `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `RECONCILED`.
- **`StockTakeItem` model**: Links to `StockTake` and `InventoryItem`. Contains `systemQty`, `physicalQty`, `variance`, and `remarks`.
- **`TransactionType` enum**: Already includes `ADJUSTMENT_IN` and `ADJUSTMENT_OUT`, perfectly matching the need for ledger entries.
- **Stock tracking**: Full ledger (`StockTransaction`, `StockCard`, `BinCard`) and live tables (`StoreStock`, `BinStock`, `FifoLayer`) exist and are proven through prior phases.

### What is missing (The Gaps):
1. **Missing `binId` in `StockTakeItem`**: The system tracks inventory at both the `StoreStock` and `BinStock` levels. However, `StockTakeItem` lacks a `binId`. Without it, the system cannot know *which bin* had the discrepancy, making it impossible to perform accurate `BinStock` adjustments.
2. **Missing Count Scope / Granularity**: `StockTake` is currently limited to `storeId`. In large warehouses, counts are usually scoped down to specific locations, shelves, or even individual bins.
3. **Missing `StockAdjustment` / Approval Workflow**: While `StockTake` tracks the count and variance, there is no dedicated `StockAdjustment` model. If a count results in variances, there is typically a secondary review/approval step specifically for the *financial and physical adjustment* of stock. Using `StockTake.status = RECONCILED` merges the "Counting" workflow with the "Adjustment Approval" workflow, which are usually handled by different personnel (Counters vs. Store Managers/Finance).
4. **Missing Snapshot/Freeze Mechanism**: The schema has `systemQty` which acts as a snapshot, but does not define at what point `systemQty` is snapshotted or if bins are locked during counting to prevent concurrent mutations.

---

## 2. Business Rules & Stock Mutation (Golden Rule)

Following the Golden Stock Rule established in previous phases:
- **No mutations during counting**: Creating a `StockTake`, starting it, and recording physical counts must **NEVER** modify `StoreStock`, `BinStock`, `FifoLayer`, or the ledger.
- **Explicit Adjustment Execution**: Stock mutations must solely occur when an authorized user explicitly approves/posts the adjustments resulting from the count.

---

## 3. Concurrency & Snapshot Integrity Analysis

When a count session is created, the system must capture a baseline against which to compare physical counts.
- **Option A (Strict Lock)**: Lock the bin/store from all incoming/outgoing transactions (SIV, GRN) while the count is `IN_PROGRESS`. This ensures the physical reality matches the system state exactly but halts warehouse operations.
- **Option B (Timestamp Snapshot)**: When the count transitions to `IN_PROGRESS`, we snapshot the current `StoreStock` and `BinStock` into `StockTakeItem.systemQty`. Any transactions happening *during* the count must be manually factored in by the reconciliation team, or the system throws a warning if stock mutated during the count window.

**Recommendation:** Timestamp Snapshot (Option B) combined with organizational procedures (tell staff not to move items being counted). Strict locking in the DB level for days during a major count is often too disruptive to business operations.

---

## 4. FIFO & Costing Strategy for Adjustments

When variances occur, we must adjust the ledger.
- **Negative Adjustments (`ADJUSTMENT_OUT`)**: When `physicalQty < systemQty`, we are removing stock. The system should consume the oldest available `FifoLayer`(s) exactly as it does for SIV Finalization or Transfer Dispatch.
- **Positive Adjustments (`ADJUSTMENT_IN`)**: When `physicalQty > systemQty`, we are discovering stock. 
  - **Gap**: What unit cost should this newly discovered stock have? 
  - **Recommendation**: Create a new `FifoLayer`. The unit cost should either be user-inputted during the adjustment review, or default to the *last known unit cost* (the most recent FIFO layer for that item) or average cost.

---

## 5. Ledger & Transaction Strategy

When an adjustment is posted:
- **For Positive Variances**:
  - `StoreStock` / `BinStock` incremented.
  - New `FifoLayer` created.
  - `StockTransaction` created (`type: ADJUSTMENT_IN`).
  - `StockCard` and `BinCard` created (`transactionType: ADJUSTMENT_IN`).
- **For Negative Variances**:
  - `StoreStock` / `BinStock` decremented.
  - Existing `FifoLayer`s consumed.
  - `StockTransaction` created (`type: ADJUSTMENT_IN`? No, `ADJUSTMENT_OUT`).
  - `StockCard` and `BinCard` created (`transactionType: ADJUSTMENT_OUT`).

---

## 6. RBAC Strategy

New permissions are needed to enforce separation of duties between counters and approvers:
- `stocktakes.create` / `stocktakes.read`
- `stocktakes.count` (ability to input physical quantities)
- `stockadjustments.review` (ability to review variances)
- `stockadjustments.approve` (ability to post changes to the ledger)

---

## 7. Next Steps

I have prepared the Phase 6 Implementation Plan based on this gap analysis. It contains specific recommendations and open questions requiring your approval before proceeding with schema changes.

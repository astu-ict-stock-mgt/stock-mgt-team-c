# PHASE 5.1 — RETURNS, TRANSFERS & STOCK CONTROL GAP ANALYSIS

## 1. STORE RETURN NOTE (SRN)
### Existing Models
- `StoreReturnNote`: Contains `id`, `code`, `requestedById`, `status` (DRAFT, SUBMITTED, UNDER_EVALUATION, APPROVED, REJECTED, POSTED), `date`, `notes`.
- `StoreReturnItem`: Contains `srnId`, `itemId`, `quantity`, `reason`, `condition`.
### Gap Analysis
- **Missing Fields:**
  - No connection to the specific `Store` receiving the return. (A return must go to a specific store).
  - `StoreReturnItem` lacks `acceptedQty` vs `rejectedQty` for partial approvals.
  - Missing relation to source department or user returning the item. (Can use `requestedBy` for the user, but what if they represent a department?).
  - Missing destination bin allocation (`ReturnBinAllocation`) to define exactly *which* bins the returned stock is placed into during execution (similar to `SIVBinAllocation` but inbound).
- **Lifecycle:** The existing `ReturnStatus` enum matches the SRS `DRAFT → SUBMITTED → UNDER_EVALUATION → APPROVED / REJECTED → POSTED`. However, we might need a `RECEIVED` state before `POSTED`, or we treat `POSTED` as the execution of the physical return.

## 2. RETURN STOCK MUTATION RULE
- **Principle:** Creating, submitting, evaluating, and approving a return request **MUST NOT** mutate physical `StoreStock` or `BinStock`.
- **Execution:** A dedicated execution endpoint (`POST /api/returns/:id/receive` or `finalize`) will atomically increase `BinStock` and `StoreStock`.
- **Valuation / FIFO:** When items are returned to the store, they are typically entering as "used" or "excess" items. They should ideally **create a new FIFO layer** (Option A). The unit cost of this layer should either be 0 (if treated as free salvaged material) or ideally inherit the average cost at the time they were issued. For strict FIFO compliance, they create a new layer at the bottom of the stack with the configured return valuation. Re-entering an old, already-consumed layer (Option B) breaks immutability of historical costing. **Recommendation: Create a new FIFO layer** per accepted return item.

## 3. PARTIAL RETURNS
- **Requirement:** User requests returning 100, evaluator accepts 80 and rejects 20 due to damage.
- **Gap:** `StoreReturnItem` currently only has `quantity`. It needs `acceptedQty` (Float).
- **Execution Rule:** The execution step only increments physical stock by `acceptedQty`. Damaged/rejected quantities are disposed of or handled out-of-band and do not increase the available stock.

## 4. INTER-STORE TRANSFERS
### Existing Models
- `TransferRequest`: `fromStoreId`, `toStoreId`, `requestedById`, `status`, `reason`, `notes`.
- `TransferStatus`: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `DISPATCHED`, `RECEIVED`, `COMPLETED`.
- `TransferRequestItem`: `transferId`, `itemId`, `quantity`.
### Gap Analysis
- **Missing Relationships:**
  - How do we know *which bins* the stock is taken from in `fromStore`? We need `TransferOutBinAllocation`.
  - How do we know *which bins* the stock is placed into in `toStore`? We need `TransferInBinAllocation`.
- **Lifecycle:** Matches SRS expectation.

## 5. TRANSFER QUANTITY & DISCREPANCIES
- **Requirement:** Requested = 100, Dispatched = 100, Received = 95.
- **Gap:** `TransferRequestItem` only has `quantity` (requested). We need:
  - `dispatchedQty` (Float, updated at dispatch).
  - `receivedQty` (Float, updated at receipt).
- **Handling Discrepancy:** If `receivedQty < dispatchedQty`, the remaining 5 units must be accounted for. They shouldn't vanish. They should be written off via an automatic `StockAdjustment` or flagged for investigation.

## 6. TRANSFER STOCK RULES
- **At Dispatch (`DISPATCHED`):**
  - `StoreStock` at `fromStore` decreases.
  - `BinStock` at `fromStore` decreases.
  - `InTransit` stock (a new field or tracking mechanism) increases, OR a new "Transit Store" paradigm is used. Alternatively, we track the dispatched quantity logically on the `TransferRequest` itself.
- **At Receipt (`RECEIVED`):**
  - `StoreStock` at `toStore` increases.
  - `BinStock` at `toStore` increases.
  - `InTransit` stock is cleared.
- **FIFO:**
  - Dispatch consumes FIFO layers from `fromStore` (recording the average cost).
  - Receipt creates a NEW FIFO layer in `toStore` carrying the exact cost from the dispatch.

## 7. INTERNAL BIN TRANSFER
- **Requirement:** Move stock from Bin A1 to Bin A2 within the same Store.
- **Gap:** The `TransferRequest` model is overkill and conceptually wrong for this (it's inter-store). We need a dedicated `BinTransfer` model.
- **Required Model:** `BinTransfer` (id, storeId, itemId, fromBinId, toBinId, quantity, requestedById, status, createdAt).
- **Stock Movement:** Purely affects `BinStock` (decrement fromBin, increment toBin). `StoreStock` is untouched. `FIFO` is untouched. `BinCard` is updated.

## 8. FIFO / COSTING
- **SRN:** Creates a new FIFO layer for the accepted quantity at the original issue cost (or 0 if fully depreciated).
- **Inter-store Transfer:** Consumes FIFO layers in the source store. Creates a new FIFO layer in the destination store with the blended cost.
- **Internal Bin Transfer:** No effect on FIFO. FIFO is tracked at the `Store` level, not the `Bin` level.

## 9. LEDGER & STOCK CARDS
- **SRN:** Generates `StockTransaction` (type `RETURN`), updates `StockCard` (inQty) and `BinCard` (inQty).
- **Inter-store Transfer Dispatch:** Generates `StockTransaction` (type `TRANSFER_OUT`), updates `StockCard` (outQty) and `BinCard` (outQty).
- **Inter-store Transfer Receipt:** Generates `StockTransaction` (type `TRANSFER_IN`), updates `StockCard` (inQty) and `BinCard` (inQty).
- **Internal Bin Transfer:** No `StockTransaction` or `StockCard` required (overall store balance unchanged). ONLY updates `BinCard` (outQty for source bin, inQty for destination bin).

## 10. RBAC
- **SRN:** `returns.create`, `returns.evaluate`, `returns.approve`, `returns.receive`.
- **Transfers:** `transfers.create`, `transfers.approve`, `transfers.dispatch`, `transfers.receive`.
- **Bin Transfers:** `binTransfers.create`, `binTransfers.execute`.
- These will be mapped to standard roles (STORE_HEAD, STOREKEEPER).

## 11. CONCURRENCY & TRANSACTIONS
- **Risk:** Read-modify-write lost updates during stock deductions.
- **Strategy:** All stock mutation endpoints (SRN receive, Transfer dispatch/receive, Bin transfer execute) will use Prisma `$transaction`.
- **Protection:** 
  1. Atomic status transitions via `updateMany` (e.g., locking `status: APPROVED` to `DISPATCHED`).
  2. Post-update constraint checks (e.g., verifying `updatedBinStock.quantity >= 0`).

## 12. EXISTING CODE AUDIT
- **Exists but Incomplete:** `StoreReturnNote`, `TransferRequest` exist in Prisma schema but lack fields for partial handling, discrepancies, and bin allocations.
- **Missing:** `BinTransfer` model is completely missing.
- **Missing API/Services:** No routes or services exist for Returns, Transfers, or Bin Transfers.

## 13. TEST STRATEGY
- **Returns:** Test partial returns, rejection of returns, over-returns, FIFO layer creation, Ledger verification.
- **Inter-store:** Test standard transfer, discrepancy handling, dispatch without receipt, receipt with partial damage.
- **Internal Bin:** Test bin-to-bin movement verifying StoreStock remains identical.
- **Concurrency:** Execute `Promise.all()` double-dispatch and double-receipt attempts to verify database locks.

## 14. DATABASE CHANGE DISCIPLINE
- **Why?** We need to update the schema to support destination stores for returns, discrepancy tracking for transfers, and bin-level movements.
- No migrations will be executed until the implementation plan is fully approved.

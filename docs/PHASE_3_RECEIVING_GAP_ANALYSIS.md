# Phase 3: Receiving Workflow Gap Analysis

## 1. Current Receiving Models
The existing Prisma schema provides a solid baseline for the receiving workflow but lacks a few granular details required by the Master SRS.

- **GoodsReceipt**: Captures `code`, `supplier`, `store`, `receivedBy`, `status`, `deliveryNote`, `purchaseOrder`, `inspectionNotes`, and `receiptDate`. Statuses include `DRAFT`, `SUBMITTED`, `UNDER_EVALUATION`, `ACCEPTED`, `REJECTED`, `GRN_GENERATED`.
- **GoodsReceiptItem**: Captures `quantity`, `unitCost`, and `remarks`.
- **TechnicalEvaluation**: Captures `decision`, `comments`, and links to `GoodsReceipt` and the `evaluator`.
- **GRN**: Links to `GoodsReceipt`, captures `generatedBy`, `date`, and `notes`.
- **StockTransaction**: Ready for recording `RECEIPT` type transactions.
- **StoreStock / BinStock**: Ready for quantity increments.
- **StockCard / BinCard**: Ready for historical ledger entries.

## 2. Missing Fields & Relationships

### `GoodsReceiptItem`
- **Missing `condition`**: The SRS requires capturing the physical condition of the received goods (e.g., "Good", "Damaged").
- **Missing `binId`**: The SRS requires specifying the "intended bin/storage location where applicable" for put-away upon GRN generation. Needs a relation to `Bin`.

### `TechnicalEvaluation`
- **Missing Line-Item Evaluation**: The current model evaluates the entire receipt at once. The SRS requires recording "evaluated items, rejected quantities where applicable, conditions". 
  - *Proposed Solution*: We need to add a `TechnicalEvaluationItem` model or extend `GoodsReceiptItem` to include `acceptedQuantity` and `rejectedQuantity`, allowing partial acceptance.

### `FifoLayer`
- The current `FifoLayer` model already has `grnId`, `originalQty`, `remainingQty`, `unitCost`, `storeId`, `itemId`. This is well-suited for Phase 3.

## 3. Required API Endpoints

### Goods Receipts
- `GET /api/v1/goods-receipts`
- `POST /api/v1/goods-receipts`
- `GET /api/v1/goods-receipts/:id`
- `PATCH /api/v1/goods-receipts/:id`
- `POST /api/v1/goods-receipts/:id/submit`

### Technical Evaluations
- `GET /api/v1/goods-receipts/:id/evaluation`
- `POST /api/v1/goods-receipts/:id/evaluation`
- `PATCH /api/v1/goods-receipts/:id/evaluation`
- `POST /api/v1/goods-receipts/:id/evaluation/approve`
- `POST /api/v1/goods-receipts/:id/evaluation/reject`

### GRN (Model 19)
- `GET /api/v1/grns`
- `POST /api/v1/goods-receipts/:id/grn`
- `GET /api/v1/grns/:id`

## 4. Required Permissions

We must add the following permissions to `backend/src/config/permissions.ts` and assign them to the appropriate roles (`PAO`, `STOREKEEPER`, `TEC`, `ADMINISTRATOR`):

- `goods_receipts.read`
- `goods_receipts.create`
- `goods_receipts.update`
- `goods_receipts.submit`
- `technical_evaluations.read`
- `technical_evaluations.create`
- `technical_evaluations.approve`
- `technical_evaluations.reject`
- `grns.read`
- `grns.create`

## 5. Stock Mutation Rules (The "Golden Rules")

1. **Goods Receipt Creation / Submission**: NO stock change.
2. **Technical Evaluation**: NO stock change.
3. **GRN Generation**: STOCK INCREASES.
4. **Transaction Atomicity**: The GRN generation and stock mutation MUST occur within a single `$transaction`.
5. **Partial Acceptance**: If TEC rejects some quantities, only the *accepted* quantity is mutated during GRN.
6. **Bin Put-away**: BinStock is updated based on the `binId` defined in the `GoodsReceiptItem`. If no `binId` is defined, only `StoreStock` increases (though typically both should increase).
7. **Ledger Updates**: `StockTransaction`, `StockCard`, and `BinCard` must be written alongside the stock increment.
8. **Duplicate Protection**: A `GoodsReceipt` can only generate ONE `GRN`.

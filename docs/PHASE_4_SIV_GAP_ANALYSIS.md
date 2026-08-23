# Phase 4: SIV / ISIV Workflow Gap Analysis

## 1. Current Models Overview
The existing database schema provides the skeleton for requisitions and SIVs, but requires extensions to support granular Bin allocation and Inter-Store Issue Vouchers (ISIV).

### Existing Structure
- **Requisition**: Captures `code`, `requestedBy`, `department`, `status`, `requiredDate`, `purpose`. Statuses range from `DRAFT` to `CANCELLED`.
- **RequisitionItem**: Captures requested `quantity` and `fulfilledQty`.
- **RequisitionApproval**: Tracks approval steps (Approved/Rejected/Returned).
- **StoreIssueVoucher (SIV)**: Captures `code`, `requisitionId`, `storeId` (source), `createdBy`, `approvedBy`, `status`, `issueDate`. Statuses range from `DRAFT` to `ISSUED`.
- **SIVItem**: Captures `quantity`, `approvedQty`, `issuedQty`, `unitCost`.

## 2. Missing Fields & Relationships

### Requisition
- **Destination Department**: The SRS requires capturing the "destination/receiving department". Currently, `department` exists (presumably the requesting one). We may need `destinationDepartment` or just clarify usage.

### StoreIssueVoucher (SIV)
- **Voucher Type**: Needs a field to distinguish between standard `SIV` (Model 22) and `ISIV` (Inter-Store Issue Voucher, Model 20/22). e.g., `enum VoucherType { SIV, ISIV }`.
- **Destination Store (For ISIV)**: Needs `destinationStoreId` to link to the receiving `Store` when the type is `ISIV`.

### SIV Bin Allocations
- **Missing `SIVBinAllocation` Model**: The SRS dictates that an `SIVItem` can be fulfilled from multiple bins (e.g., 60 from BIN-A, 40 from BIN-B). Currently, `SIVItem` has no relation to `Bin`. We must create a 1-to-Many relation from `SIVItem` to a new `SIVBinAllocation` model.
  - `SIVBinAllocation`: `sivItemId`, `binId`, `quantity`.

## 3. Stock Reservation Strategy
- The current `StoreStock` and `BinStock` models have a `reservedQty` field.
- **Reservation Trigger**: When an SIV is generated (PRELIMINARY) and bin allocations are defined, the allocated quantities must be ADDED to `reservedQty` on both `BinStock` and `StoreStock`.
- **Validation**: `availableQty = physicalQty - reservedQty`. The system must validate that `requested allocation <= availableQty`.
- **Finalization (Model 22)**: Upon finalization, the `reservedQty` is decreased AND the physical `quantity` is decreased simultaneously.

## 4. Status Transitions
### Requisition
`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` (or `REJECTED`)
*No stock mutation during any of these states.*

### Store Issue Voucher (SIV/ISIV)
`DRAFT` → `PRELIMINARY` (Bins allocated, Stock Reserved) → `UNDER_APPROVAL` → `APPROVED` (or `AMENDMENT_REQUIRED`) → `FINALIZED/ISSUED` (Stock Decreased).
*Stock is only strictly DECREASED upon transition to `FINALIZED/ISSUED`.*

## 5. Required API Endpoints
### Requisitions
- `POST /api/v1/requisitions`
- `GET /api/v1/requisitions`
- `GET /api/v1/requisitions/:id`
- `PATCH /api/v1/requisitions/:id`
- `POST /api/v1/requisitions/:id/submit`
- `GET /api/v1/requisitions/:id/approvals`
- `POST /api/v1/requisitions/:id/approve`
- `POST /api/v1/requisitions/:id/reject`

### SIVs
- `GET /api/v1/sivs`
- `POST /api/v1/sivs` (Create preliminary SIV with bin allocations)
- `GET /api/v1/sivs/:id`
- `PATCH /api/v1/sivs/:id`
- `POST /api/v1/sivs/:id/submit`
- `POST /api/v1/sivs/:id/approve`
- `POST /api/v1/sivs/:id/request-amendment`
- `POST /api/v1/sivs/:id/reject`
- `POST /api/v1/sivs/:id/finalize` (Atomic mutation execution)

## 6. Required Permissions
- `requisitions.read`, `requisitions.create`, `requisitions.update`, `requisitions.submit`, `requisitions.approve`, `requisitions.reject`
- `sivs.read`, `sivs.create`, `sivs.update`, `sivs.submit`, `sivs.approve`, `sivs.amend`, `sivs.reject`, `sivs.finalize`

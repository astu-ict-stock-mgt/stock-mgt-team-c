# STOCK MANAGEMENT SYSTEM
## Master Software Requirements Specification (SRS)

**Document:** `STOCK_MANAGEMENT_SYSTEM_MASTER_SRS.md`  
**Project Title:** Stock Management System  
**Version:** 1.0  
**Status:** Development Baseline  
**Frontend:** Next.js + TypeScript  
**Backend:** Node.js + Express.js + TypeScript  
**Database:** PostgreSQL  
**API:** REST  
**Authorization:** Role-Based Access Control (RBAC)

---

# 1. Document Purpose

This document is the master specification for the Stock Management System.

It is intended to be the single source of truth for:

- business analysis;
- functional requirements;
- use cases;
- stock workflows;
- roles and permissions;
- database design;
- backend architecture;
- frontend architecture;
- API design;
- validation;
- auditability;
- testing;
- phased implementation;
- AI coding-agent instructions.

The system is designed as a **general-purpose organizational stock-management system**. It is not presented as a claim that it exactly reproduces the internal stock procedures of ASTU or another specific organization.

The system nevertheless preserves the terminology and workflows required by the project instructor, including Store Head, Technical Evaluation Committee (TEC), Goods Receiving Note (GRN/Model 19), Store Requisition (SR/Model 20), Store Issue Voucher (SIV/ISIV/Model 22), Stock Record Card (SRC), Bin Card, Store Return Note (SRN), fixed-asset registration, user cards, material transfer, shelf-life monitoring, and disposal workflows.

---

# 2. Requirement Sources and Interpretation

The requirements for this master SRS are based on three primary sources supplied for the project:

1. The project instructor's required system use cases.
2. The existing student-produced Stock Management System SRS.
3. The supplied stock-management reference/manual.

## 2.1 Instructor Requirements

The instructor's list is treated as the primary project-specific functional baseline. It requires use cases covering:

- Store Information;
- Item Categories;
- Item Locations;
- Goods Receipt;
- Technical Evaluation;
- GRN / Model 19;
- automatic Stock Card updates;
- Stock Card viewing;
- Bin Card management;
- bin transfers;
- Store Requisition;
- SR approval/rejection;
- preliminary SIV/ISIV;
- SIV/ISIV approval and amendment;
- final SIV/ISIV / Model 22;
- Fixed Asset Registration;
- User Card;
- Material Return Request / SRN;
- Technical Evaluation Result;
- Store Return approval/rejection;
- Material Transfer Request;
- Material Transfer approval/rejection;
- Shelf-Life and Status monitoring;
- Disposal flagging;
- Disposal requests;
- Disposal workflow;
- and related supporting functions.

## 2.2 Existing Student SRS

The existing SRS provides broader system scope including authentication, user management, supplier management, item categories, inventory, receiving, issuing, inventory tracking, stock control, stock taking, reports, audit logs, notifications, security, performance, reliability, usability, scalability and maintainability.

This master SRS retains useful requirements from that document but reorganizes them around the instructor's required use cases.

## 2.3 Reference Stock-Management Material

The supplied reference material provides operational concepts concerning:

- store organization;
- receiving;
- inspection;
- accepted/rejected materials;
- Model 19;
- requisition and issue documentation;
- stock records;
- bin/storage records;
- stocktaking;
- stock control;
- stock discrepancies;
- returns;
- disposal;
- fixed assets;
- segregation of responsibilities.

Where the sources do not specify an implementation detail, this SRS labels the decision as a system-design decision rather than claiming it is an organizational rule.

---

# 3. Product Vision

The Stock Management System shall provide a controlled digital lifecycle for organizational materials and assets.

The system shall make it possible to answer:

- What material exists?
- Where is it stored?
- How much is available?
- How much is reserved?
- How much has been received?
- How much has been issued?
- Who requested it?
- Who approved it?
- Who issued it?
- Which document authorized the movement?
- Which store/bin contains it?
- What is its transaction history?
- What is its current value where valuation applies?
- Is it damaged, expired, obsolete, or flagged for disposal?
- Which user is accountable for an issued fixed asset?
- What happened to a stock quantity at every point in its lifecycle?

The system must maintain traceability from source document to physical stock and from physical stock back to the recorded transaction.

---

# 4. Scope

## 4.1 In Scope

The system includes:

- authentication;
- users, roles and permissions;
- stores;
- departments;
- item categories;
- items/materials;
- units of measure;
- locations, shelves and bins;
- suppliers;
- goods receipt;
- supporting purchase/donation documents;
- temporary receipt records;
- technical evaluation;
- GRN / Model 19;
- Stock Record Cards;
- Bin Cards;
- store requisitions;
- SR approval/rejection;
- preliminary SIV/ISIV;
- SIV/ISIV approval/amendment;
- final SIV/ISIV / Model 22;
- stock issue;
- fixed asset registration;
- user cards;
- material return requests / SRN;
- return evaluation;
- material transfer requests;
- transfer approval/rejection;
- stock transfer between bins;
- shelf-life monitoring;
- item status monitoring;
- disposal flagging;
- disposal requests;
- disposal workflow;
- stocktaking;
- reconciliation;
- controlled stock adjustments;
- inventory/stock valuation;
- reports;
- notifications;
- audit logging.

## 4.2 Out of Scope Unless Later Requested

The system is not initially a complete:

- procurement ERP;
- accounting ERP;
- payroll system;
- human-resource system;
- full fixed-asset accounting system;
- supplier payment system;
- financial ledger.

Integration points may be added later.

---

# 5. Terminology

| Term | Meaning |
|---|---|
| Store | A physical organizational storage facility. |
| Main Store | A primary organizational store; configurable rather than hard-coded to a particular institution. |
| Department Store | A store associated with a department. |
| Bin | A defined physical storage position within a store/location structure. |
| Item/Material | A material managed by the system. |
| Stock | Physical quantity of an item held by the organization. |
| SRC | Stock Record Card; digital item/store stock history and balance record. |
| Bin Card | Digital record of stock movements and balance at a specific storage/bin level. |
| SR | Store Requisition. |
| SIV | Store Issue Voucher. |
| ISIV | Inter Store Issue Voucher. |
| GRN | Goods Receiving Note. |
| SRN | Store Return Note / Store Return documentation. |
| TEC | Technical Evaluation Committee. |
| Store Head | Person responsible for store-level management/approval activities as configured. |
| Stock Clerk | User responsible for stock records and related record-keeping. |
| Storekeeper | User responsible for physical custody and store operations. |
| Fixed Asset | An asset requiring fixed-asset registration/accountability. |
| FIFO | First-In, First-Out inventory valuation/consumption method. |

---

# 6. Actors

## 6.1 System Administrator

Responsibilities:

- manage users;
- manage roles;
- manage permissions;
- configure system;
- manage master data;
- view audit logs;
- maintain system settings.

The administrator must not bypass normal stock workflows merely because they have technical privileges, unless a specifically audited administrative function permits it.

## 6.2 Store Head

Responsibilities may include:

- supervising store operations;
- reviewing receiving;
- initiating/monitoring technical evaluation;
- approving store operations assigned to the role;
- reviewing requisitions/issues/returns/transfers;
- supervising stocktaking and reconciliation.

Exact approval authority shall be configurable.

## 6.3 Storekeeper

Responsibilities:

- receive physical deliveries;
- inspect/count against documentation;
- store accepted materials;
- maintain physical custody;
- prepare authorized issues;
- receive approved returns;
- perform authorized bin transfers;
- participate in stocktaking.

## 6.4 Stock Clerk / Property Registration Officer

Responsibilities may include:

- maintain stock records;
- register accepted materials;
- update/verify stock records;
- maintain transaction records;
- support valuation;
- support reconciliation;
- generate reports.

## 6.5 Technical Evaluation Committee

Responsibilities:

- evaluate materials requiring technical evaluation;
- record evaluation result;
- approve or reject material;
- provide evaluation remarks/evidence.

## 6.6 Requester

Responsibilities:

- create store requisitions;
- state required materials and quantities;
- provide purpose;
- submit requests;
- monitor request status;
- initiate return requests where permitted.

## 6.7 Approver

Responsibilities:

- review requisitions;
- approve/reject requisitions;
- review issue documents;
- approve/reject returns;
- approve/reject transfers;
- approve adjustments/disposals according to assigned permissions.

## 6.8 Fixed Asset Officer / Property Officer

Responsibilities:

- register accepted fixed assets;
- maintain asset identifiers;
- assign accountability;
- maintain user-card relationships.

## 6.9 Security/Gate Officer

Responsibilities:

- verify authorized outgoing material documentation;
- verify gate passes where required;
- record dispatch verification.

## 6.10 Auditor / Read-Only User

Responsibilities:

- view records;
- inspect transaction history;
- inspect approvals;
- inspect audit logs;
- generate reports.

---

# 7. Role-Based Access Control

Permissions shall be granular.

Example permission categories:

```text
STORE_VIEW
STORE_CREATE
STORE_UPDATE

ITEM_VIEW
ITEM_CREATE
ITEM_UPDATE
ITEM_DEACTIVATE

RECEIPT_CREATE
RECEIPT_VIEW
RECEIPT_SUBMIT
RECEIPT_EVALUATE
RECEIPT_ACCEPT
RECEIPT_REJECT
GRN_GENERATE

STOCK_VIEW
STOCK_LEDGER_VIEW
BIN_VIEW
BIN_TRANSFER

REQUISITION_CREATE
REQUISITION_SUBMIT
REQUISITION_APPROVE
REQUISITION_REJECT

SIV_CREATE
SIV_VIEW
SIV_APPROVE
SIV_AMEND
SIV_FINALIZE

RETURN_CREATE
RETURN_EVALUATE
RETURN_APPROVE
RETURN_REJECT

TRANSFER_CREATE
TRANSFER_APPROVE
TRANSFER_REJECT
TRANSFER_EXECUTE

ASSET_REGISTER
USER_CARD_MANAGE

DISPOSAL_FLAG
DISPOSAL_REQUEST
DISPOSAL_APPROVE
DISPOSAL_EXECUTE

STOCKTAKE_CREATE
STOCKTAKE_COUNT
STOCKTAKE_RECONCILE
ADJUSTMENT_APPROVE

REPORT_VIEW
AUDIT_VIEW
USER_MANAGE
ROLE_MANAGE
```

The backend must enforce permissions. Hiding a button in the frontend is not an authorization mechanism.

---

# 8. Organizational Model

The system shall support:

```text
Organization
    |
    +-- Departments
    |
    +-- Stores
          |
          +-- Locations
                |
                +-- Shelves
                      |
                      +-- Bins
```

Stores shall be configurable.

Example demo configuration:

```text
Main Store
Department Store
Cafe Store
```

These are demonstration examples, not claims about any specific organization's actual structure.

---

# 9. Item Classification

Each item shall have:

- unique item code;
- item name;
- category;
- unit of measure;
- description;
- material type;
- store/category relationship;
- minimum level;
- reorder level;
- maximum level where applicable;
- shelf-life information where applicable;
- expiry information where applicable;
- status;
- active/inactive state.

Material type may include:

```text
CONSUMABLE
NON_CONSUMABLE
FIXED_ASSET
OTHER
```

The exact classification must remain configurable.

---

# 10. Store Information

## Use Case UC-01: Manage Store Information

### Goal

Create and maintain organizational physical stores.

### Inputs

- store code;
- store name;
- store type;
- department;
- address/location;
- responsible Store Head;
- status;
- description.

### Main Flow

1. Authorized user opens Stores.
2. User creates or selects a store.
3. User enters store information.
4. System validates uniqueness of store code.
5. System saves store.
6. System records audit event.

### Rules

- Store code must be unique.
- Inactive stores cannot receive new stock.
- A store with historical transactions should normally be deactivated rather than deleted.

---

# 11. Item Categories

## Use Case UC-02: Maintain Item Category

Categories organize materials.

Category may be associated with:

- general item group;
- store applicability;
- material type;
- shelf-life requirements;
- fixed-asset behavior.

Example:

```text
Office Supplies
Cleaning Materials
IT Equipment
Furniture
Cafeteria Supplies
Maintenance Materials
```

The system must not hard-code these examples.

---

# 12. Item Locations

## Use Case UC-03: Maintain Item Location

The system shall manage the physical location of materials.

Example:

```text
Store A
  Section 01
    Shelf A01
      Bin A01-01
```

A material may have stock in multiple bins.

The system shall support:

- assigning stock to a location;
- changing location;
- moving stock between bins;
- viewing current location;
- viewing location history.

---

# 13. GOODS RECEIPT

## Use Case UC-04: Goods Receipt Record

### Goal

Record materials physically received from a supplier, donor, or other authorized source and verify them against supporting documents.

### Supporting documents may include

- purchase order;
- delivery note;
- donation document;
- supplier invoice;
- other authorized reference.

### Main Flow

```text
Delivery
   ↓
Goods Receipt Record
   ↓
Document Verification
   ↓
Temporary Receipt
   ↓
Store Head / responsible officer
   ↓
TEC notification where technical evaluation is required
```

### Important Rule

A temporary receipt is **not automatically available stock**.

---

# 14. Technical Evaluation

## Use Case UC-05: Evaluate Materials for Acceptance

### Actors

- TEC member(s);
- authorized evaluator.

### Main Flow

1. Receipt record reaches evaluation stage.
2. System notifies TEC.
3. TEC reviews material.
4. TEC records:
   - decision;
   - comments;
   - date;
   - evaluator(s);
   - evidence/attachments where applicable.
5. Decision is recorded.

Possible results:

```text
APPROVED
REJECTED
APPROVED_WITH_CONDITIONS
PENDING
```

Only an approved/accepted material proceeds to final receiving according to the configured workflow.

---

# 15. Technical Evaluation Result

## Use Case UC-06: Record Technical Evaluation Result

The system shall maintain a permanent evaluation record linked to:

- receipt;
- item;
- evaluator;
- decision;
- reason;
- supporting evidence;
- timestamp.

The system shall prevent unauthorized alteration of completed evaluations.

Corrections should be handled through an audited correction/re-evaluation process.

---

# 16. GRN / MODEL 19

## Use Case UC-07: Generate Goods Receiving Note

A GRN / Model 19 record shall be generated for materials accepted through the required receiving and evaluation workflow.

The GRN shall include:

- GRN number;
- receipt reference;
- supplier/source;
- date;
- store;
- items;
- accepted quantities;
- units;
- relevant costs where applicable;
- supporting documents;
- responsible users;
- status.

The system shall not generate a final GRN for rejected material.

---

# 17. STOCK RECORD CARD

## Use Case UC-08: Auto-Update Stock Card

The system shall maintain a digital Stock Record Card for every material/store combination where stock is held.

Stock Card records shall be updated by approved stock transactions including:

- receipt;
- issue;
- return;
- transfer;
- adjustment;
- disposal;
- other configured stock movements.

A Stock Card should provide:

```text
Date
Reference
Transaction Type
Receipt Qty
Issue Qty
Return Qty
Transfer Qty
Adjustment Qty
Balance
Unit Cost where applicable
Value where applicable
```

The Stock Card is not manually edited to change a balance.

Stock transactions update it.

---

# 18. VIEW STOCK CARD

## Use Case UC-09: View Stock Card

Authorized users shall be able to view:

- current quantity;
- transaction history;
- opening balance;
- receipts;
- issues;
- returns;
- transfers;
- adjustments;
- disposal;
- current balance;
- relevant valuation information.

Users should be able to filter by:

- date;
- store;
- item;
- transaction type;
- reference.

---

# 19. BIN CARD

## Use Case UC-10: Manage Bin Card

The system shall maintain a digital bin-level record.

A Bin Card shall identify:

- store;
- location;
- bin;
- item;
- transaction date;
- transaction type;
- supporting document;
- inbound quantity;
- outbound quantity;
- balance.

The system shall create/activate a bin-item record when stock is introduced into a previously unused bin-item combination.

The system shall update the bin balance after every approved transaction.

---

# 20. STOCK TRANSFER BETWEEN BINS

## Use Case UC-11: Stock Transfer Between Bins

This is an internal storage-location operation.

Example:

```text
Bin A-01: 100
Transfer: 20
Bin B-02: 30

After:
Bin A-01: 80
Bin B-02: 50
```

The system shall create linked transfer-out and transfer-in records.

Both sides must succeed or neither side should be committed.

---

# 21. STORE REQUISITION

## Use Case UC-12: Manage Store Requisition

A requester shall create an SR.

Fields include:

- requisition number;
- requester;
- department;
- store;
- date;
- purpose;
- requested items;
- quantities;
- remarks;
- status.

Statuses:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
PARTIALLY_FULFILLED
FULFILLED
CANCELLED
```

Creating an SR does not reduce stock.

---

# 22. APPROVE / REJECT STORE REQUISITION

## Use Case UC-13

Authorized approvers shall:

- approve;
- reject;
- return for correction where configured.

The approval action must record:

- approver;
- date/time;
- decision;
- comment.

A user must not approve their own request where separation of duties is enabled.

---

# 23. PRELIMINARY SIV / ISIV

## Use Case UC-14

After an SR is approved, the store may prepare a preliminary Store Issue Voucher or Inter Store Issue Voucher.

The preliminary document shall:

- reference the SR;
- reference the requesting department/store;
- list approved quantities;
- show available quantities;
- identify source store/bin;
- remain editable only by authorized users before finalization.

---

# 24. APPROVE / AMEND SIV / ISIV

## Use Case UC-15

Authorized users shall review preliminary SIV/ISIV.

Possible actions:

```text
APPROVE
REJECT
RETURN_FOR_AMENDMENT
```

Amendments must be audited.

The system must preserve the fact that an amendment occurred.

---

# 25. FINAL SIV / ISIV / MODEL 22

## Use Case UC-16

After required approval, the system generates the final issue voucher.

The final document shall have:

- unique number;
- source store;
- destination department/store;
- requester;
- approving officer;
- storekeeper;
- item details;
- approved quantity;
- issued quantity;
- date;
- signatures/approval records as represented digitally;
- supporting references.

The final issue operation is the event that causes stock reduction.

---

# 26. MATERIAL ISSUE

The issue workflow is:

```text
Approved SR
    ↓
Preliminary SIV/ISIV
    ↓
Approval/Amendment
    ↓
Final SIV/ISIV / Model 22
    ↓
Pick Stock
    ↓
Verify Quantity
    ↓
Post Issue
    ↓
Stock Card Decrease
    ↓
Bin Card Decrease
    ↓
Inventory Balance Update
    ↓
Dispatch / Gate Verification where required
```

The system must prevent issuing more than available quantity unless a separately configured policy explicitly permits it.

---

# 27. FIXED ASSET REGISTRATION

## Use Case UC-17

Accepted fixed assets shall be registered with:

- asset number;
- item;
- description;
- serial number where applicable;
- acquisition information;
- receiving reference;
- GRN reference;
- cost/value where applicable;
- location;
- responsible user;
- status.

The fixed-asset module in this project is limited to the required registration/accountability functionality unless extended later.

---

# 28. USER CARD

## Use Case UC-18: Manage User Card

A User Card shall maintain materials/assets assigned to an individual user.

It should show:

- user;
- department;
- item/asset;
- quantity;
- issue document;
- issue date;
- return date;
- current accountability status.

This is especially relevant to fixed assets and accountable non-consumable materials.

---

# 29. MATERIAL RETURN / SRN

## Use Case UC-19

A requester/user shall initiate a return request.

The request shall contain:

- requester;
- department;
- original issue reference;
- material;
- quantity;
- reason;
- condition;
- date.

The system creates an SRN/return record.

---

# 30. RETURN EVALUATION

## Use Case UC-20

Returned material may require technical evaluation.

Possible result:

```text
ACCEPTED_GOOD
ACCEPTED_DAMAGED
REJECTED
PENDING
```

Good material may return to available stock.

Damaged material must be placed in an appropriate damaged/hold status.

---

# 31. APPROVE / REJECT STORE RETURN

## Use Case UC-21

Authorized users shall approve/reject return requests.

On accepted return:

```text
Return
 ↓
Stock Card +
Bin Card +
Inventory
```

On rejected return:

```text
Return Request
 ↓
Rejected
 ↓
Reason recorded
```

No stock balance should change merely because a return request was created.

---

# 32. MATERIAL TRANSFER REQUEST

## Use Case UC-22

A transfer request shall be used when material is transferred between stores or organizational locations.

Fields:

- source store;
- destination store;
- requested items;
- quantities;
- reason;
- requester;
- date;
- status.

---

# 33. APPROVE / REJECT MATERIAL TRANSFER

## Use Case UC-23

Authorized users shall:

- approve;
- reject;
- return for correction.

After approval, the transfer can be executed.

The system shall not alter stock merely because a transfer request was submitted.

---

# 34. MATERIAL TRANSFER EXECUTION

```text
Approved Transfer
      ↓
Prepare Transfer Document
      ↓
Source Store Dispatch
      ↓
TRANSFER_OUT
      ↓
Destination Store Receipt
      ↓
TRANSFER_IN
```

For an atomic internal transfer, both source and destination balances shall be updated consistently.

If the business requires an in-transit state, the system shall support:

```text
APPROVED
DISPATCHED
IN_TRANSIT
RECEIVED
COMPLETED
```

---

# 35. SHELF-LIFE AND STATUS MONITORING

## Use Case UC-24

Items with shelf-life information shall be monitored automatically.

Relevant fields may include:

- batch/lot;
- manufacture date;
- expiry date;
- shelf-life duration;
- status.

Possible statuses:

```text
NORMAL
EXPIRING_SOON
EXPIRED
DAMAGED
OBSOLETE
QUARANTINED
DISPOSED
```

Warning thresholds must be configurable.

The system shall notify authorized users when items reach configured thresholds.

---

# 36. DISPOSAL FLAGGING

## Use Case UC-25

The system may flag stock for disposal when:

- expired;
- damaged beyond use;
- obsolete;
- unusable;
- otherwise eligible according to configured policy.

A flag does not itself remove stock.

It creates a review/disposal workflow.

---

# 37. DISPOSAL REQUEST

## Use Case UC-26

Authorized users shall create disposal requests.

The request shall contain:

- item;
- quantity;
- location;
- reason;
- condition;
- supporting evidence;
- requested disposal method;
- requester;
- date.

---

# 38. DISPOSAL WORKFLOW

## Use Case UC-27

```text
Flag
 ↓
Disposal Request
 ↓
Review
 ↓
Approval
 ↓
Disposal Action
 ↓
Stock Card Decrease
 ↓
Bin Card Decrease
 ↓
Inventory Update
 ↓
Audit Record
```

The system must preserve disposal history.

Historical stock transactions must not be deleted.

---

# 39. STOCKTAKING

The system shall support controlled stocktaking.

Workflow:

```text
Create Stocktake
 ↓
Select Store/Bins
 ↓
Freeze/count rules as configured
 ↓
Generate count list
 ↓
Physical count
 ↓
Enter count
 ↓
Compare system vs physical
 ↓
Investigate differences
 ↓
Record explanation
 ↓
Approve reconciliation
 ↓
Create controlled adjustment
```

Stocktaking must not silently overwrite inventory.

---

# 40. RECONCILIATION

For every discrepancy:

```text
System Quantity
Physical Quantity
Difference
Reason
Evidence
Investigation
Decision
Adjustment
```

Possible discrepancy causes:

- posting error;
- damage;
- spoilage;
- measurement difference;
- unauthorized issue;
- loss/theft;
- counting error;
- other documented reason.

---

# 41. STOCK CONTROL

The system shall support:

- minimum stock level;
- reorder level;
- maximum level;
- safety stock where configured;
- low-stock alerts;
- stock movement monitoring;
- slow-moving identification;
- obsolete identification.

The system should distinguish:

```text
ON_HAND
RESERVED
AVAILABLE
DAMAGED
QUARANTINED
IN_TRANSIT
```

A simple available-stock calculation may be:

```text
AVAILABLE = ON_HAND - RESERVED - QUARANTINED - DAMAGED
```

The exact formula shall depend on configured status semantics.

---

# 42. FIFO VALUATION

Where FIFO valuation is required, accepted receipt quantities shall create cost layers.

Example:

```text
Receipt A: 100 × 10
Receipt B: 200 × 12

Issue: 150

Consumed:
100 × 10
50 × 12

Issue value = 1600
```

The database must preserve receipt/cost layers.

Stock issue must consume eligible FIFO layers in order.

---

# 43. STOCK TRANSACTION MODEL

All stock quantity changes shall be represented by controlled stock transactions.

Supported transaction types:

```text
RECEIPT
ISSUE
RETURN
TRANSFER_OUT
TRANSFER_IN
ADJUSTMENT_IN
ADJUSTMENT_OUT
DISPOSAL
```

The exact enum can be extended.

No ordinary frontend operation should directly overwrite stock balances.

---

# 44. STOCK BALANCE PRINCIPLE

Conceptually:

```text
Opening Balance
+ Receipts
+ Returns
+ Transfer In
+ Adjustment In
- Issues
- Transfer Out
- Disposal
- Adjustment Out
= Closing Balance
```

The application may maintain materialized balances for performance, but the transaction history must remain authoritative and auditable.

---

# 45. STOCK CARD VS BIN CARD

## Stock Record Card

Answers:

> What is the stock history and balance of this material in the relevant store?

## Bin Card

Answers:

> What quantity of this material is physically recorded in this exact bin/location?

Both shall be linked to the same underlying stock transaction where appropriate.

---

# 46. DOCUMENT RELATIONSHIPS

The major document chain is:

```text
Purchase/Donation Source
        ↓
Goods Receipt
        ↓
Technical Evaluation
        ↓
GRN / Model 19
        ↓
Stock Card + Bin Card
        ↓
Store Requisition / Model 20
        ↓
SIV / ISIV
        ↓
Model 22 / Final Issue
        ↓
Stock Card + Bin Card
```

Return:

```text
Issue
 ↓
Return Request
 ↓
SRN
 ↓
Evaluation
 ↓
Return Approval
 ↓
Stock Update
```

Transfer:

```text
Transfer Request
 ↓
Approval
 ↓
Transfer Document
 ↓
Source OUT
 ↓
Destination IN
```

Disposal:

```text
Disposal Flag
 ↓
Disposal Request
 ↓
Approval
 ↓
Disposal
 ↓
Stock Update
```

---

# 47. STATUS MACHINES

## Receipt

```text
DRAFT
 ↓
SUBMITTED
 ↓
UNDER_EVALUATION
 ↓
ACCEPTED / REJECTED
 ↓
GRN_GENERATED
 ↓
POSTED
```

## Requisition

```text
DRAFT
 ↓
SUBMITTED
 ↓
UNDER_REVIEW
 ↓
APPROVED / REJECTED / RETURNED
 ↓
PARTIALLY_FULFILLED / FULFILLED
```

## SIV

```text
DRAFT
 ↓
PRELIMINARY
 ↓
UNDER_APPROVAL
 ↓
AMENDMENT_REQUIRED
 ↓
APPROVED
 ↓
FINALIZED
 ↓
ISSUED
```

## Return

```text
DRAFT
 ↓
SUBMITTED
 ↓
UNDER_EVALUATION
 ↓
APPROVED / REJECTED
 ↓
POSTED
```

## Transfer

```text
DRAFT
 ↓
SUBMITTED
 ↓
APPROVED / REJECTED
 ↓
DISPATCHED
 ↓
RECEIVED
 ↓
COMPLETED
```

## Disposal

```text
FLAGGED
 ↓
REQUESTED
 ↓
UNDER_REVIEW
 ↓
APPROVED / REJECTED
 ↓
EXECUTED
```

---

# 48. DATABASE DESIGN

The implementation shall use PostgreSQL.

Core tables/entities shall include, at minimum:

```text
users
roles
permissions
role_permissions
user_roles

organizations
departments

stores
store_locations
shelves
bins

item_categories
units
items

suppliers

purchase_orders
purchase_order_items

goods_receipts
goods_receipt_items
technical_evaluations
technical_evaluation_items
grns

inventory_balances
stock_transactions
stock_layers
stock_cards
bin_cards

requisitions
requisition_items
approvals

siv_documents
siv_items

issues
issue_items

fixed_assets
user_cards
user_card_items

return_requests
return_items
return_evaluations

transfer_requests
transfer_request_items
transfers
transfer_items

stocktakes
stocktake_items
stock_adjustments

disposal_flags
disposal_requests
disposal_items
disposal_actions

notifications
audit_logs
```

The exact schema shall be normalized and reviewed before implementation.

---

# 49. DATABASE PRINCIPLES

1. Use primary keys for every entity.
2. Use foreign keys for relationships.
3. Use unique constraints for codes/document numbers.
4. Use indexes on frequently queried foreign keys and transaction fields.
5. Use database transactions for multi-step stock operations.
6. Do not physically delete posted stock transactions.
7. Use status fields for lifecycle management.
8. Preserve historical references.
9. Store timestamps consistently.
10. Use decimal/numeric types for monetary values.
11. Use suitable numeric types for quantities.
12. Use migrations for schema changes.
13. Seed development/demo data separately from production data.

---

# 50. BACKEND ARCHITECTURE

Suggested structure:

```text
backend/
  src/
    config/
    controllers/
    routes/
    services/
    repositories/
    middleware/
    validators/
    schemas/
    types/
    enums/
    utils/
    jobs/
    database/
    app.ts
    server.ts
```

Controllers should remain thin.

Business rules should primarily live in services.

Example:

```text
IssueController
      ↓
IssueService
      ↓
Authorization
      ↓
Validation
      ↓
Availability Check
      ↓
FIFO Layer Consumption
      ↓
Issue Record
      ↓
Stock Transaction
      ↓
Balance Update
      ↓
Audit Log
```

---

# 51. REST API

API routes shall follow a consistent REST convention.

Examples:

```text
POST   /api/auth/login
GET    /api/auth/me

GET    /api/stores
POST   /api/stores
GET    /api/stores/:id
PATCH  /api/stores/:id

GET    /api/items
POST   /api/items
GET    /api/items/:id
PATCH  /api/items/:id

GET    /api/receipts
POST   /api/receipts
GET    /api/receipts/:id
POST   /api/receipts/:id/submit
POST   /api/receipts/:id/evaluate
POST   /api/receipts/:id/accept
POST   /api/receipts/:id/reject
POST   /api/receipts/:id/generate-grn

GET    /api/stock
GET    /api/stock/:itemId/card
GET    /api/bins/:binId/cards

GET    /api/requisitions
POST   /api/requisitions
POST   /api/requisitions/:id/submit
POST   /api/requisitions/:id/approve
POST   /api/requisitions/:id/reject

GET    /api/siv
POST   /api/siv
POST   /api/siv/:id/approve
POST   /api/siv/:id/amend
POST   /api/siv/:id/finalize

GET    /api/returns
POST   /api/returns
POST   /api/returns/:id/evaluate
POST   /api/returns/:id/approve
POST   /api/returns/:id/reject

GET    /api/transfers
POST   /api/transfers
POST   /api/transfers/:id/approve
POST   /api/transfers/:id/reject
POST   /api/transfers/:id/dispatch
POST   /api/transfers/:id/receive

GET    /api/stocktakes
POST   /api/stocktakes
POST   /api/stocktakes/:id/count
POST   /api/stocktakes/:id/reconcile

GET    /api/disposals
POST   /api/disposals
POST   /api/disposals/:id/approve
POST   /api/disposals/:id/execute

GET    /api/reports/*
GET    /api/audit-logs
```

The final endpoint list shall be generated from the approved use cases rather than invented independently by the coding agent.

---

# 52. FRONTEND ARCHITECTURE

Use Next.js + TypeScript.

Suggested organization:

```text
frontend/
  src/
    app/
    components/
    features/
    hooks/
    lib/
    services/
    schemas/
    stores/
    types/
    utils/
```

The UI shall be a responsive administrative application.

Primary layout:

```text
Sidebar
Topbar
Breadcrumbs
Page Content
Notifications
User Menu
```

---

# 53. FRONTEND PAGES

Minimum page structure:

```text
/login
/forgot-password
/reset-password

/dashboard

/stores
/stores/new
/stores/[id]
/stores/[id]/locations

/departments

/categories

/items
/items/new
/items/[id]
/items/[id]/edit

/suppliers

/receipts
/receipts/new
/receipts/[id]
/receipts/[id]/evaluation

/grns
/grns/[id]

/inventory
/inventory/[itemId]
/inventory/[itemId]/stock-card

/bins
/bins/[id]
/bins/[id]/card
/bins/transfer

/requisitions
/requisitions/new
/requisitions/[id]

/approvals

/siv
/siv/new
/siv/[id]

/issues
/issues/[id]

/fixed-assets
/fixed-assets/new
/fixed-assets/[id]

/user-cards
/user-cards/[userId]

/returns
/returns/new
/returns/[id]

/transfers
/transfers/new
/transfers/[id]

/stock-control
/shelf-life
/disposal
/disposal/[id]

/stocktakes
/stocktakes/new
/stocktakes/[id]

/reconciliation

/reports
/reports/inventory
/reports/receipts
/reports/issues
/reports/transfers
/reports/returns
/reports/stocktaking
/reports/disposal
/reports/valuation

/users
/roles
/permissions

/audit-logs
/notifications
/profile
/settings
```

---

# 54. UI COMPONENTS

Reusable components should include:

- data table;
- search;
- filter;
- pagination;
- form;
- modal;
- confirmation dialog;
- status badge;
- approval panel;
- timeline;
- document preview;
- stock movement table;
- stock card;
- bin card;
- quantity input;
- date picker;
- item selector;
- store selector;
- location selector;
- notification;
- toast;
- empty state;
- loading state;
- error state.

---

# 55. DASHBOARD

Dashboard content must be role-aware.

Possible metrics:

```text
Total Items
Total Stock Quantity
Inventory Value
Low Stock
Expiring Soon
Pending Receipts
Pending TEC Evaluations
Pending Requisitions
Pending SIV Approvals
Pending Returns
Pending Transfers
Pending Disposals
Recent Transactions
```

---

# 56. AUTHENTICATION

Authentication shall support:

- login;
- logout;
- password hashing;
- access tokens;
- refresh strategy where selected;
- current-user endpoint;
- password reset flow where implemented;
- account status;
- session security.

Passwords must never be stored in plain text.

---

# 57. AUTHORIZATION

Authorization must occur on the server.

Every protected endpoint shall verify:

1. authenticated user;
2. active account;
3. required permission;
4. relevant store/department scope where applicable;
5. lifecycle state;
6. business rules.

---

# 58. AUDIT LOG

Important operations must create immutable audit records.

Audit fields:

```text
id
actorUserId
action
entityType
entityId
oldValue
newValue
timestamp
ipAddress where available
userAgent where available
reason where required
```

Examples:

```text
RECEIPT_CREATED
RECEIPT_ACCEPTED
RECEIPT_REJECTED
GRN_GENERATED
REQUISITION_APPROVED
SIV_AMENDED
SIV_FINALIZED
ISSUE_POSTED
RETURN_APPROVED
TRANSFER_APPROVED
DISPOSAL_EXECUTED
USER_ROLE_CHANGED
```

---

# 59. NOTIFICATIONS

Notifications may be generated for:

- pending TEC evaluation;
- pending approval;
- low stock;
- expiring stock;
- expired stock;
- rejected receipt;
- rejected requisition;
- return decision;
- transfer decision;
- disposal approval;
- stocktaking discrepancy.

Notifications should link to the relevant record.

---

# 60. REPORTS

Minimum reports:

### Inventory

- current inventory;
- inventory by store;
- inventory by category;
- inventory by location;
- inventory valuation.

### Movement

- receipts;
- issues;
- returns;
- transfers;
- adjustments;
- disposal.

### Control

- low stock;
- expiring items;
- expired items;
- damaged stock;
- stock discrepancies;
- stocktaking results.

### Accountability

- user-card report;
- fixed assets by user;
- fixed assets by location.

### Audit

- user activities;
- approvals;
- changes to master data;
- stock transactions.

Reports should support filtering and export where required.

---

# 61. VALIDATION RULES

Examples:

- quantity must be greater than zero;
- item must exist;
- store must exist and be active;
- bin must belong to the selected store;
- source and destination bins cannot be identical;
- approval must be performed by authorized user;
- issue requires approved SIV/ISIV;
- issue cannot exceed available quantity;
- disposal requires approval;
- transfer requires approval;
- rejected receipt cannot generate final GRN;
- posted transactions cannot be edited directly;
- document numbers must be unique;
- expired stock must not be issued where policy prohibits it;
- inactive items cannot be used in new transactions.

---

# 62. ATOMIC STOCK OPERATIONS

Critical stock operations shall use database transactions.

Example issue:

```text
BEGIN

validate SIV
validate permission
validate quantity
consume FIFO layers
create issue
create stock transaction
update balance
update stock card
update bin card
create audit event

COMMIT
```

If any step fails:

```text
ROLLBACK
```

The system must never leave a partially completed stock movement.

---

# 63. ERROR HANDLING

The API shall use consistent HTTP responses.

Examples:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

The frontend shall provide clear user-facing messages without exposing sensitive server details.

---

# 64. SECURITY

Requirements:

- secure password hashing;
- environment variables;
- no secrets committed to Git;
- server-side authorization;
- input validation;
- parameterized database operations;
- secure authentication;
- audit logs;
- controlled file uploads if attachments are implemented;
- protection against common web vulnerabilities;
- least-privilege access.

---

# 65. PERFORMANCE

Normal CRUD/API operations should target responsive interaction.

Heavy reports may take longer.

Performance practices:

- pagination;
- indexes;
- selective queries;
- server-side filtering;
- database transactions;
- avoiding unnecessary N+1 queries;
- appropriate caching only where safe.

---

# 66. BACKUP AND RECOVERY

Production deployment should provide:

- scheduled database backups;
- backup retention;
- restore procedure;
- migration history;
- environment-variable backup procedure;
- disaster-recovery documentation.

---

# 67. TESTING STRATEGY

Testing shall include:

## Unit tests

Business services:

- FIFO;
- quantity validation;
- availability;
- status transitions;
- permissions.

## Integration tests

- receipt posting;
- issue posting;
- transfer;
- return;
- adjustment.

## API tests

- authentication;
- authorization;
- CRUD;
- workflow transitions.

## UI tests

- forms;
- tables;
- approval flows;
- error states.

## End-to-End tests

At minimum:

### Scenario A: Receipt

```text
Create receipt
→ evaluate
→ accept
→ generate GRN
→ stock increases
→ Stock Card updated
→ Bin Card updated
```

### Scenario B: Issue

```text
Create SR
→ approve
→ create SIV
→ approve
→ finalize
→ issue
→ stock decreases
→ Stock Card updated
→ Bin Card updated
```

### Scenario C: Return

```text
Create SRN
→ evaluate
→ approve
→ stock increases
```

### Scenario D: Transfer

```text
Create transfer
→ approve
→ dispatch
→ receive
→ source decreases
→ destination increases
```

### Scenario E: Disposal

```text
Flag
→ request
→ approve
→ execute
→ stock decreases
```

---

# 68. SEED DATA

Development seed data should include:

### Users

- admin;
- Store Head;
- storekeeper;
- stock clerk;
- TEC member;
- requester;
- approver;
- fixed-asset officer;
- auditor.

### Stores

- Main Store;
- Department Store;
- Cafe Store.

### Categories

- Office Supplies;
- IT Equipment;
- Cleaning Materials;
- Furniture;
- Maintenance;
- Cafeteria Supplies.

### Items

Include both:

- consumables;
- fixed assets.

Include examples with and without shelf life.

---

# 69. ENVIRONMENT SETUP

Required development environment:

```text
Node.js
npm
Git
PostgreSQL
VS Code or equivalent IDE
```

Example:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/stock_management
JWT_SECRET=development-secret
PORT=5000
```

Never commit real secrets.

A `.env.example` file must be committed.

---

# 70. PostgreSQL Setup

The developer is expected to install PostgreSQL locally.

Default port:

```text
5432
```

Example development database:

```text
stock_management
```

The AI coding agent may create:

- schema;
- migrations;
- seed scripts;
- indexes;
- constraints;
- ORM configuration.

The developer must verify PostgreSQL connectivity before database-dependent development begins.

---

# 71. GIT/GITHUB WORKFLOW

Use:

```text
main
develop
feature/*
```

Feature branches should be focused.

Example:

```text
feature/auth
feature/database-schema
feature/stores
feature/receiving
feature/stock-card
feature/bin-card
feature/requisitions
feature/siv
feature/returns
feature/transfers
feature/fixed-assets
feature/disposal
feature/reports
```

Workflow:

```text
Create branch
↓
Implement
↓
Test
↓
Commit
↓
Push
↓
Pull Request
↓
Review
↓
Merge
```

Never commit:

- `.env`;
- passwords;
- database credentials;
- private keys;
- generated secrets.

---

# 72. DEVELOPMENT PHASES

## Phase 0 — Specification

- review SRS;
- identify contradictions;
- approve architecture;
- approve database ERD;
- define API contract.

## Phase 1 — Project Setup

- Next.js;
- Express;
- TypeScript;
- PostgreSQL;
- ORM/migrations;
- linting;
- formatting;
- environment configuration.

## Phase 2 — Authentication and RBAC

- users;
- roles;
- permissions;
- login;
- authorization middleware.

## Phase 3 — Master Data

- stores;
- departments;
- categories;
- units;
- items;
- suppliers;
- locations;
- shelves;
- bins.

## Phase 4 — Receiving

- goods receipt;
- temporary receipt;
- TEC;
- evaluation;
- GRN;
- stock posting.

## Phase 5 — Stock Records

- inventory;
- Stock Card;
- Bin Card;
- transaction ledger;
- FIFO layers.

## Phase 6 — Requisition and Issue

- SR;
- approval;
- preliminary SIV/ISIV;
- amendment;
- final SIV/ISIV;
- issue;
- Model 22 representation.

## Phase 7 — Returns

- SRN;
- evaluation;
- approval;
- stock posting.

## Phase 8 — Transfers

- bin transfers;
- material transfer requests;
- approval;
- dispatch;
- receipt.

## Phase 9 — Fixed Assets and User Cards

- registration;
- asset identifiers;
- accountability;
- user cards.

## Phase 10 — Stock Control

- shelf life;
- low stock;
- status monitoring;
- alerts.

## Phase 11 — Stocktaking and Reconciliation

- stocktake;
- physical count;
- discrepancy;
- reconciliation;
- adjustment.

## Phase 12 — Disposal

- flags;
- disposal request;
- approval;
- execution.

## Phase 13 — Reports and Audit

- reports;
- exports;
- audit logs;
- dashboards.

## Phase 14 — Testing and Hardening

- unit tests;
- integration tests;
- end-to-end tests;
- security review;
- performance review;
- UI review.

---

# 73. DEFINITION OF DONE

A feature is not complete merely because its page exists.

A feature is complete when:

- frontend exists;
- backend endpoint exists;
- validation exists;
- authorization exists;
- database model exists;
- business rules are implemented;
- stock transaction behavior is correct where applicable;
- audit logging exists where applicable;
- loading state exists;
- empty state exists;
- error handling exists;
- tests exist;
- feature works end-to-end;
- documentation is updated;
- code is committed;
- branch is pushed;
- review is completed.

---

# 74. AI CODING AGENT INSTRUCTIONS

This document is the primary specification.

The coding agent MUST:

1. Read this document before implementation.
2. Never invent business workflows when the specification already defines them.
3. Identify contradictions before implementing them.
4. Ask for clarification when a requirement is genuinely ambiguous.
5. Keep frontend, backend and database consistent.
6. Enforce business rules on the backend.
7. Use database transactions for critical stock operations.
8. Preserve historical stock transactions.
9. Never silently overwrite stock history.
10. Use migrations for database changes.
11. Use seed data only for development.
12. Keep secrets outside source control.
13. Write modular, maintainable TypeScript.
14. Implement features in phases.
15. Test each completed phase before moving forward.
16. Do not generate the entire system blindly in one pass.
17. Do not change the project title to an ASTU-specific title.
18. Treat ASTU only as the internship/testing context, not as an assumed business workflow.
19. Preserve instructor-required terminology such as GRN, Model 19, SR, Model 20, SIV/ISIV, Model 22, SRN, SRC, Bin Card and TEC.
20. Distinguish source-derived requirements from technical implementation decisions when documenting architecture.

---

# 75. FIRST INSTRUCTION TO THE AI CODING AGENT

When this SRS is first provided to an AI coding agent, it should NOT immediately build the complete application.

The first task shall be:

```text
1. Read the SRS completely.
2. Summarize the architecture.
3. Identify ambiguities and contradictions.
4. Propose the database ERD.
5. Propose the backend module structure.
6. Propose the API modules.
7. Propose the frontend route/module structure.
8. Map each required use case to:
   - actor;
   - pages;
   - API endpoints;
   - database entities;
   - business rules.
9. Identify dependencies between use cases.
10. Wait for approval before implementing the next phase.
```

---

# 76. USE CASE DEPENDENCY MAP

The major dependency chain is:

```text
Authentication
      ↓
Users/Roles
      ↓
Stores/Departments
      ↓
Categories/Items
      ↓
Locations/Bins
      ↓
Suppliers
      ↓
Receiving
      ↓
TEC Evaluation
      ↓
GRN
      ↓
Stock Card/Bin Card
      ↓
Store Requisition
      ↓
SR Approval
      ↓
SIV/ISIV
      ↓
Issue
```

Parallel workflows:

```text
Stock Card/Bin Card
      ├── Returns
      ├── Transfers
      ├── Stocktaking
      ├── Adjustments
      ├── Shelf-Life
      └── Disposal
```

Fixed assets:

```text
Receiving
 ↓
GRN
 ↓
Fixed Asset Registration
 ↓
User Card
```

---

# 77. MASTER STOCK FLOW

The complete conceptual flow is:

```text
                     SUPPLIER / DONOR
                           |
                           v
                  GOODS RECEIPT RECORD
                           |
                           v
                 DOCUMENT VERIFICATION
                           |
                           v
                    TEMPORARY RECEIPT
                           |
                           v
                     STORE HEAD / TEC
                           |
                 +---------+---------+
                 |                   |
              REJECT               ACCEPT
                 |                   |
                 v                   v
          RETURN/REPORT        GRN / MODEL 19
                                     |
                         +-----------+-----------+
                         |                       |
                       STOCK                 FIXED ASSET
                         |                       |
                         v                       v
                    STOCK CARD          ASSET REGISTRATION
                         |                       |
                         v                       v
                     BIN CARD               USER CARD
                         |
                         v
                    STORED STOCK
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
     REQUISITION      TRANSFER        RETURN
          |              |              |
          v              v              v
      APPROVAL        APPROVAL         SRN
          |              |              |
          v              v              v
       SIV/ISIV       TRANSFER       EVALUATION
          |                            |
          v                         APPROVAL
       MODEL 22                        |
          |                            v
          v                        STOCK IN
      STOCK OUT
          |
          v
    STOCK CARD/BIN CARD
          |
          +-------------------+
          |                   |
          v                   v
     STOCK CONTROL        STOCKTAKING
          |                   |
          v                   v
    LOW/EXPIRING          RECONCILIATION
          |                   |
          v                   v
       DISPOSAL            ADJUSTMENT
```

This diagram is the primary mental model for the development team.

---

# 78. CRITICAL BUSINESS PRINCIPLES

1. A request is not an issue.
2. An approval is not a stock movement.
3. A preliminary SIV is not a final issue.
4. A temporary receipt is not final accepted stock.
5. A technical evaluation decision must be recorded.
6. A GRN represents accepted receiving.
7. Stock quantities change through controlled transactions.
8. Stock Card and Bin Card are generated/updated from transactions.
9. Historical transactions must remain traceable.
10. Returns require controlled acceptance.
11. Transfers require controlled authorization.
12. Disposal requires controlled authorization.
13. Fixed assets require registration/accountability.
14. User cards track assigned accountable materials/assets.
15. Frontend restrictions do not replace backend authorization.
16. Critical multi-step operations must be atomic.
17. Every important workflow transition must be auditable.
18. Stock must not become negative under normal configuration.
19. Document references must connect related business events.
20. The system must distinguish physical location from item identity.
21. The system must distinguish stock quantity from stock transaction history.
22. The system must distinguish consumable stock from fixed assets where required.
23. The system must support configurable stores rather than hard-coded ASTU stores.
24. The system must preserve the instructor's required document terminology.
25. The system must be implemented incrementally and tested after each phase.

---

# 79. FUTURE ENHANCEMENTS

Potential future additions:

- barcode scanning;
- QR codes;
- mobile storekeeper interface;
- supplier portal;
- procurement integration;
- accounting integration;
- email/SMS notifications;
- advanced analytics;
- demand forecasting;
- multi-organization tenancy;
- offline warehouse operations;
- electronic signatures;
- document storage;
- automated reorder proposals.

These are not required for the initial implementation unless explicitly approved.

---

# 80. FINAL PROJECT DEFINITION

The Stock Management System is a general-purpose web application for controlled management of organizational materials and assets.

Its central responsibility is to maintain a reliable connection between:

```text
BUSINESS DOCUMENTS
        ↕
AUTHORIZATION
        ↕
PHYSICAL STOCK
        ↕
STOCK TRANSACTIONS
        ↕
STOCK CARD
        ↕
BIN CARD
        ↕
INVENTORY BALANCE
        ↕
AUDIT HISTORY
```

The application shall implement the instructor-required use cases while remaining configurable enough to represent different organizational store structures.

Implementation shall proceed from this SRS through architecture review, database design, phased development, testing, review, and controlled GitHub integration.

# ASTU Stock Management System — What To Do Next

A review of the whole project (code + SRS), tested on a running copy of the app.
Date: 25 August 2026.

**How to read this:** every item says what is wrong, why it matters, and where to look in the code.
Tags: **[P0]** = fix first · **[P1]** = fix soon · Size = Small / Medium / Large.

---

# Part 1 — Things that are missing

## 1.1 Four features that do not exist yet

The database tables and the permissions for these are already written. Only the API and the screens are missing.

- [ ] **Stock taking (physical counting)** — Size: Large
  Count real items in the store, compare with the system, fix the difference, print a report.
  The SRS says this must happen at least once every year. Nothing is built.

- [ ] **Damaged and obsolete items** — Size: Medium
  Report a broken or too-old item, get approval, then dispose of it.
  The admin dashboard already shows a counter for these, but there is no way to add any.

- [ ] **Gate pass (items leaving the campus)** — Size: Medium
  Request a pass, security approves it, security confirms the exit.
  This is the **whole job of the Security Officer role**. Their dashboard points to a feature that does not exist.

- [ ] **Export and print reports** — Size: Medium
  Save reports as CSV or PDF, and print the GRN (goods receiving note), issue voucher, and requisition form.
  The `reports.export` permission is already given to Admin, PAO and Accountant, but there is no export button and no export API.

You can check this yourself — all of these return "404 Not Found":
```
/api/v1/stocktakes    /api/v1/gate-passes    /api/v1/damaged
/api/v1/obsolete      /api/v1/uoms
```

## 1.2 Easy wins — the backend is finished, only the screen is missing

These are the fastest things to deliver.

- [ ] **Stock transfer screen** — Size: Small
  `backend/src/routes/transfers.ts` and `services/transfers.ts` are complete and correct. Nobody built the page.

- [ ] **Edit and deactivate users** — Size: Small
  The API for editing and deleting a user works. The Users page can only *list* and *create*.

- [ ] **Edit and delete an inventory item** — Size: Small
  The API works. The helper function `useUpdateItem` is already written in `src/lib/api/hooks.ts:263` and no page uses it.

## 1.3 Missing API endpoints

The permissions exist, but the endpoints were never written.

- [ ] Edit and delete a **category**
- [ ] Edit and delete a **store**
- [ ] Add, edit, delete a **unit of measure** (`/api/v1/uoms` returns 404, so units can only be created by the seed script)
- [ ] **Reset a user's password** — the function is already written at `backend/src/services/users.ts:109`, but no endpoint calls it, so it can never run
- [ ] **Unlock a locked user** — there is no way to do this at all (see bug P0-5)
- [ ] Requisition: view one by ID, edit a draft, cancel

## 1.4 Basic things the app still needs

- [ ] **Page addresses (URL routing)** — Size: Medium
  The app is one single page. Section changes are kept in memory only. So:
  you cannot share a link to a page, the browser Back button does nothing, and pressing Refresh always sends you back to the Dashboard.

- [ ] **Forgot my password** — the SRS asks for password management. A user who forgets their password has no way to recover.

- [ ] **Check goods before storing them** — the SRS rule is "all received goods must be inspected before being stored".
  Right now a receipt is saved as already confirmed and already inspected (`backend/src/services/receipts.ts:70`). The states `DRAFT → INSPECTING → CONFIRMED` already exist in the database but are never used.

- [ ] **Do not allow issuing without an approved requisition** — this is a clear SRS rule. Today any storekeeper can issue anything to anyone.

- [ ] **Add starting stock to the seed data** — Size: Small
  The seed creates 0 receipts and 0 issues. So the stock value is **0** everywhere and the FIFO and valuation reports are empty. A demo looks broken.
  Also `supplier@sms.et` is written in the README but is never created (7 users exist, not 8).

---

# Part 2 — Things that are broken

## Fix these first [P0]

### P0-1. Item status is never updated
**What is wrong:** an item's status stays `AVAILABLE` forever. Nothing ever changes it to `LOW_STOCK` or `OUT_OF_STOCK`.

**Why it matters:** the app disagrees with itself on screen. At the same moment:
- Dashboard says: *Out of Stock = 0*
- Notification bell says: *6 items are out of stock*
- Inventory list says: *all 6 items have quantity 0, status AVAILABLE*

Every KPI card and filter based on status is dead.

**Where:** status is only written in `backend/src/services/inventory.ts:125`. The broken readers are `backend/src/services/dashboard.ts:16-17` and `:78`.

**Fix:** update the status inside the receipt / issue / transfer transaction, or calculate it live and stop saving it.

### P0-2. A requisition can never be completed
**What is wrong:** there is no "fulfil" endpoint. `fulfilledQty` is never filled in. An approved requisition can be issued again and again with no limit. `StockIssue.requisitionId` is just a text field with no real link to the requisition table (`backend/prisma/schema.prisma:353`).

**Why it matters:** this is the main business process in the SRS (request → approve → issue) and it never finishes. The `FULFILLED` and `PARTIALLY_FULFILLED` filters in the UI can never show anything.

**Fix:** add a real database link, update `fulfilledQty` and the status inside the issue transaction, and block issuing more than what was approved.

### P0-3. Two people saving at the same time creates duplicate document numbers
**What is wrong:** the codes `GRN-`, `ISS-`, `TRF-` and `TXN-` are made by counting existing rows and adding 1. For the first three, the counting even happens *outside* the safe transaction.

**Why it matters:** if two storekeepers press Save at the same second, both get the same code and one gets an error.

**Where:** `receipts.ts:62`, `issues.ts:59`, `transfers.ts:59`, `fifo-consume.ts:44`.

**Fix:** use a counter table, or catch the duplicate error and retry.

### P0-4. Bad page numbers crash the server and leak information
**What is wrong:** the page and limit values from the URL are never checked.

```
?page=0        →  HTTP 500 (server error)
?limit=-5      →  works, but returns the list backwards
?limit=100000  →  works, returns everything with no limit
```

Worse: the `page=0` error message sent back to the browser contains the **full folder path on the server** and a piece of the source code, because `backend/src/app.ts:126` returns the raw error message when not in production mode.

**Where:** `backend/src/utils/query.ts:11-16`.

**Fix:** check and limit these values in one place (page ≥ 1, limit between 1 and 100).

### P0-5. A locked user can never be unlocked
**What is wrong:** after 5 wrong passwords an account locks. There is no endpoint to unlock it. And if an admin sets the status back to ACTIVE with `PATCH /users/:id`, the failed-attempt counter is **not** reset — so the user locks again on their very first typing mistake.

**Why it matters:** this really happened during this review. The `admin@sms.et` demo account was locked and had to be fixed directly in the database file.

**Where:** `backend/src/services/users.ts:78-94`.

**Fix:** add an unlock endpoint, and reset `failedLoginCount` and `lockedUntil` whenever the status becomes ACTIVE.

### P0-6. A dangerous unused file that will block all users
**What is wrong:** `backend/src/constants/permissions.ts` contains permission names like `MANAGE_USERS` and `VIEW_ITEMS`. The real system uses different names (`users.read`, `inventory.read`). No file imports it.

**Why it matters:** the first developer who uses it, thinking it is correct, will silently block **every non-admin user** from that page. Admins skip permission checks, so the developer will not notice the problem while testing.

**Fix:** delete the file (or replace the real list with it — but pick one, not both).

## Fix soon [P1]

- [ ] **P1-7. Login limit is too strict.** Only 5 login attempts per 15 minutes **per IP address** (`backend/src/app.ts:36-41`). All ASTU users share one internet address, so after 5 logins the whole campus is blocked for 15 minutes. Count attempts per IP **and** per email instead.

- [ ] **P1-8. The refresh token does nothing.** The login gives the browser a refresh token and saves it, but no endpoint accepts it. So every user is logged out after exactly 12 hours with no warning. Either build the refresh endpoint or stop sending the token.

- [ ] **P1-9. The permission list is copied in 4 places** and they will slowly become different: `backend/src/config/permissions.ts` (the real one), `src/lib/constants/permissions.ts` (unused), a hard-coded copy in `src/components/app/sections/roles-section.tsx:23-36`, and the database table. The endpoint `GET /api/v1/roles/permissions` already returns the correct list — the UI should just call it.

- [ ] **P1-10. An admin can lock everyone out** by deleting their own account or removing the last ADMINISTRATOR role (`backend/src/services/users.ts:100`). Add a guard.

- [ ] **P1-11. Real passwords are shown on the login page.** `src/components/app/login-page.tsx:40` fills in `admin@sms.et` / `Password@123` automatically and lists demo accounts. Hide this unless a setting turns it on.

- [ ] **P1-12. The password rule is written in 3 places and does not match our own spec.** The code asks for 8+ characters with 3 character types (`backend/src/validators/index.ts:5`, `settings-section.tsx:22`, `users-section.tsx:27`). But `.kiro/specs/password-validation-enhancement/requirements.md` asks for 10+ characters with 4 types. Decide one rule, put it in one shared file, and update the spec.

- [ ] **P1-13. Requisition approval rules are hidden in the code.** It needs exactly 2 approvals (`backend/src/routes/requisitions.ts:285`), nobody checks the approver's department, and the person who created the requisition is allowed to approve it. The team should decide the real rule and write it down.

- [ ] **P1-14. Three smaller data problems:**
  - Old expired sessions are never deleted from the database, so the table grows forever.
  - Item unit cost is averaged across **all** stores (`receipts.ts:102`), but stock is taken out per store — so the cost slowly becomes wrong.
  - The audit log usually saves `ipAddress` as empty, because most services never pass it.

---

# Part 3 — Things to improve

## 3.1 There are no tests at all

This is the biggest quality problem. The project has vitest, playwright, and 5 test commands in `package.json` — and **zero test files**. `vitest.config.ts` also points to a missing file (`tests/global-setup.ts`) and to a folder from someone else's computer (`/home/z/my-project/db/test.db`).

The SRS promises unit, integration, system, user acceptance, performance and security testing.

Good places to start:
1. FIFO taking stock from several layers, and refusing when stock is not enough
2. A receipt that fails halfway must undo everything
3. Account lock after 5 wrong passwords
4. Each of the 8 roles against each endpoint
5. One full end-to-end test: login → receive → issue → report

## 3.2 The safety checks are turned off

| Check | Current state |
|---|---|
| Frontend type checking | `next.config.ts` has `ignoreBuildErrors: true`, which hides 27 real errors |
| Frontend lint | 4 errors and 2 warnings — `npm run lint` fails |
| Backend lint | **No ESLint config file exists.** 2,500 lines are never checked; `npm run lint` succeeds without doing anything |
| CI (automatic checks on GitHub) | Does not exist. Nothing stops a broken pull request |

## 3.3 The app will get slow

For every single item, the code runs a separate database query to calculate its stock value. This happens in 6 places: `inventory.ts:55`, `reports.ts:13` and `:39`, `dashboard.ts:32` and `:138`, `notifications.ts:21`.

With 6 items it is fine. With 2,000 items it becomes thousands of queries per page load. The SRS requires a response in under 3 seconds. Replace it with one grouped query on the `FifoLayer` table.

## 3.4 Delete the old dead code (about 2,500 lines)

These files are left over from before the project was split into frontend + backend. Nothing uses them:
`src/lib/services/*`, `src/lib/middleware/*`, the root `prisma/` folder, `src/lib/constants/permissions.ts`, `backend/src/constants/*`.

`LEGACY.md` already promised to delete them ("Phase 3"). All 27 type errors are inside these files, so deleting them also lets us turn type checking back on.

## 3.5 Database

- **SQLite cannot handle many users writing at once.** Only one write can happen at a time. The SRS requires many users at the same time, and the README already claims PostgreSQL. We should move to PostgreSQL.
- **There is no migrations folder.** Everything uses `prisma db push`, which can delete data. We cannot safely change the schema of a live system this way.
- **Money is stored as a decimal number** (`unitCost`, `totalAmount`, `cogs`). This causes small rounding errors. Fix it before real data exists.

## 3.6 Repository cleanup

- 4 SQLite database files (about 2.5 MB, containing password hashes) are committed to git. They should be removed.
- `.gitignore` has broken text at the end of the file.
- The `backend/` folder has **two** lock files: `bun.lock` and `package-lock.json`. Team members will install different versions. Choose one package manager.

## 3.7 The documentation is wrong

- `docs/PROJECT_OVERVIEW.md` describes a **different system**: JWT tokens, roles called `user` / `supervisor` / `auditor`, a `/auth/register` endpoint. None of this exists in our code. It will confuse every new team member. Rewrite it or delete it.
- The README is wrong about the demo accounts (lists 8, only 7 exist), about "PostgreSQL-compatible", and about which features are finished.

## 3.8 Operations

There is no proper logging, no metrics, no backup plan, no recovery plan and no deployment guide — while the SRS promises the system will be available 24 hours a day with backup and recovery.

---

# Part 4 — Who does what

| Role | Sprint 1 | Sprint 2 |
|---|---|---|
| Backend | Bugs P0-1 to P0-6 | Stock taking, damaged/obsolete |
| Frontend | Transfer screen, edit item, hide demo passwords (P1-11) | User admin screen, P1-9, URL routing |
| Database | Add missing table links, plan PostgreSQL + first migration | Fix money fields |
| Tester | Set up the test folder + tests for FIFO, roles, account lock | Full end-to-end test |
| Analyst | Decide the approval rule (P1-13), the password rule (P1-12), inspection and requisition rules | Write UAT test scripts |
| Documentation | Fix or delete `PROJECT_OVERVIEW.md`, fix README | Write the user manual |
| Project manager | Set up CI, delete dead code, clean the repository | Track the 4 missing modules |

**Best value for the least work:** the transfer screen (backend is already done), bugs P0-1, P0-4 and P0-5 (small changes, very visible), and deleting the dead code.

**Most dangerous to ignore:** P0-3 (wrong document numbers in real use), P0-2 (the main workflow never finishes), and having no tests (we cannot prove any fix above actually works).

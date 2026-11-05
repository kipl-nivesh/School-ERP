# Financial data and transaction design — proposed

## Step 8 authoritative update

Super Admin module access never permits rewriting issued/settled records, deleting audit events, self-approval or bypassing balanced integer-money transactions. Only controlled append-only correction commands may adjust final facts. Account/role provisioning is Super Admin-only and does not imply unrestricted financial posting. Local policy checks cannot replace DB locks, independent approval or immutable persistence.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

This is a future domain design, not bookkeeping performed on real accounts. Existing Step 6 fixtures remain unchanged. Canonical proposed tables and fields are in [schema section I](DATABASE-SCHEMA-BLUEPRINT.md); audit/least-privilege rules are in [RLS](RLS-SECURITY-BLUEPRINT.md).

## Source of truth and money

Use PostgreSQL **bigint paise** with positive stored face amounts plus explicit direction/status/reversal references. All prices/credits/allocations/disbursements must be exact integer paise. No REAL/DOUBLE PRECISION, binary-float summation, or rupee-number interchange with mock helpers. Validate bounded decimal strings at transport; server converts to bigint, checks bounds and formats INR. Serialize bigint as decimal strings in DTOs; only use JS Number if checked safe. Decimal percentages/marks are not monetary storage.

Line gross minus approved preissue concession yields issued net face value. If quantities/percentage concessions are later needed, use exact numeric intermediary and a documented round-to-paise rule at line finalization; allocate residual paise deterministically. Do not recalculate issued lines with a changed tariff. Currency initially INR only; no exchange rates/multi-currency module without a separate approval.

Master fee structures version by year/class; student_fee_assignments bind enrollment. Issued invoice/line snapshots preserve category, year, due date and pricing even after promotion. Student, Parent, Accountant and Admin ultimately consume projections over these same invoice/payment facts; they must not store duplicate UI totals or apply independent financial formulas.

## Distinct measures and scopes

For an invoice cohort selected by issue date/year, evaluated at as-of time A:

```text
gross billed = sum issued invoice line gross
net issued billed = gross billed - preissue line concessions
adjusted obligation = net issued billed + posted debit notes - posted credit notes
net allocations = allocation entries - reversal entries through A
outstanding = adjusted obligation - net allocations
overdue = outstanding on due dates before the as-of school date
```

No negative outstanding is silently clamped. Reject overpayment allocation or create separately identified unapplied credit, never negative invoice debt. Draft/void invoices are excluded according to audited lifecycle; issued cancellation is a credit/reversal, not deletion. If a credit would make adjusted obligation lower than existing allocations, reverse/reclassify allocations in the same transaction before posting.

For a **cash reporting interval**, independently of invoice issue cohort:

```text
cash collected (gross) = settled payments by settled_at within interval
cash refunded = paid refunds by paid_at within interval
net fee cash = cash collected - cash refunded
cash expenses paid = expense_payments minus valid disbursement reversals in interval
net cash flow = cash collected - cash refunded - cash expenses paid
```

Also show unapplied credit = settled payment less paid refunds less current net allocations (nonnegative). For mixed historical flows, `billed = period cash collected + outstanding` is **not** generally true. Reconcile invoice cohort to its net allocations; reconcile period cash to payments/refunds independently. Include opening balance movements when producing a statement of account. Collection rate for an invoice cohort uses its net allocations divided by adjusted obligation, not unrelated cash receipts in the same month. Report definitions must name gross/net and issue/settlement/as-of scopes.

Unpaid expenses are obligations, not cash outflows. Approved expense incurred_on supports obligation reporting; expense_payments.paid_at supports cash flow. This dashboard does not yet require a full statutory general ledger, accrual profit/loss, tax or payroll accounting. Approve those separately with a qualified accountant if required.

## Cross-period and refund examples — design checks

All examples are hypothetical, INR shown for clarity; storage remains paise.

1. Invoice issued January ₹100, payment ₹60 in February: January cohort at February end has ₹60 allocations and ₹40 outstanding. February cash collected ₹60 with ₹0 new January-cohort billing in February. Do not force ₹0 = ₹60 + outstanding for February's issue scope.
2. Above invoice receives a posted ₹20 credit note: adjusted obligation ₹80; allocations ₹60; outstanding ₹20. Refund ₹10 from allocated cash requires a ₹10 allocation reversal and paid refund: allocations ₹50, outstanding ₹30, net cash retained ₹50. A refund does not automatically create a second credit note. If the credit was intended to settle the obligation instead, choose/approve the corresponding credit-note workflow explicitly.
3. Invoice ₹100; payment ₹120: allocate at most ₹100, track ₹20 unapplied. Refunding that ₹20 unapplied credit reduces cash/credit but does not reopen the invoice.
4. Payment ₹60 allocated ₹40 to invoice A and ₹20 to invoice B for the SAME student: allocation sum equals receipt, both invoice balances reconcile. This initial design uses one student per settled payment. Cross-sibling/bulk receipts require separately approved allocation/payer privacy rules, not an implicit extension.
5. Pending/failed attempt ₹500 never counts as cash; a verified later settlement creates one payment with an idempotent attempt/provider reference. Replayed callback creates no second payment/receipt.

These examples are reviewable arithmetic design cases, **not executed database tests**. Future property/concurrency tests must cover them and exact paise rounding.

## Posting workflow: one database transaction per command

1. Server authenticates, checks live account/session role and `fees.collect`/equivalent grant, MFA, expected context_version and valid input. Caller never chooses the authoritative actor.
2. Begin DB command; insert/lock operation_keys by actor+kind+idempotency key. Same key with different payload hash is a conflict; same committed payload returns the original result. Settlement provider/reference uniqueness provides a second dedup boundary. No side effect before the authoritative idempotency check.
3. Lock relevant student/invoices, original payments/allocations and receipt counter in a deterministic order. Check issued status, same student, permissions and period lock. Compute available cash/balances inside the transaction; browser-supplied totals are not trusted.
4. Insert immutable payment, bounded allocations, receipt identity/snapshot, financial_events and audit_events. Reserve a unique year/series/sequence while holding the receipt counter lock. Counter advance and cash posting commit together. No reuse/renumbering after issue, including voided/failed render; record any numbering gaps/reasons.
5. Insert outbox PDF job in the same transaction; commit. PDF/email/storage calls do not run within DB lock duration. A receipt can be issued with document pending; do not roll back posted cash because rendering failed. Idempotent worker generates a new immutable object/hash, updates only allowed artifact linkage, audits, and retries safely.
6. Return committed receipt/payment references; only then show real success in a future implementation. Step 7 creates no such action.

Serializable isolation or explicit row locks plus unique constraints are required for competing allocations/refunds/receipt numbering. Retry serialization/deadlock failures a bounded number with the same idempotency key and jitter. Do not retry validation, permission, closed-period or mismatched-key conflicts automatically. Test simultaneous partial collections against the same last balance and duplicate external settlements.

## Approvals and immutable corrections

Draft invoice/expense edits use optimistic versions. Issued invoices, settled payments, receipt snapshots, posted allocations and financial_events cannot be updated/deleted by ordinary runtime roles. Correction is a linked debit/credit/reversal event with reason, independent approval where required, timestamp and actor. Ledger cash/allocations and audit evidence are committed together.

Concessions: independent approver; either preissue line discount or postissue credit note, never both. Refund: request → approve by different user → actual paid evidence → append refund + associated allocation reversals atomically when recorded; do not count requested/approved-unpaid refunds as cash. Lock original receipt and ensure lifetime paid refunds never exceed settled payment; allocated refund links cannot exceed original net allocations.

Expense: draft → submitted → approved by another user → one/many partial expense_payments with exact remaining cap. Refund/reversal of expense payment is explicit and linked. Payroll later posts through this expense bridge, not a second independent cash total. Bank import/gateway integration is deferred; no invented confirmation or provider data.

Reconciliation: run by date/account scope, link each cash fact to unique minimized statement evidence, investigate unmatched/duplicate/fee/timing differences, record reviewer and close. Bank charges are expenses, not silent reductions to tuition receipts. Closed periods reject ordinary posting; exceptional reopen/corrective-period entry is separately approved and audited. No accounting backdating without a documented rule.

## Parent, Accountant and Admin consistency

Proposed query contracts (names are design labels, not created views): invoice_balance_as_of(student,as_of), family_fee_statement(authorized_child,as_of), finance_cash_interval(from,to), invoice_cohort_summary(issue_window,as_of), class_fee_summary(year,cohort,as_of), expense_cash_interval(from,to). Each authorizes before aggregating. Parent data is constrained by live student_guardians.fee_access; Accountant receives only fee identifiers/grades and authorized money records. Posted facts and definitions are shared, not client-side totals copied across dashboards.

Use enrollment at invoice issue for historical class reports; do not silently regroup old debt into a student's promoted class. Display a deliberate current-class grouping only if separately labeled. Report cutoffs use school business date and timestamptz half-open intervals for exact instants; define inclusive end-of-day conversion server-side. Statements reconcile opening obligation/credit, period postings, payments/refunds and closing debt/credit.

## Verification and accounting decisions to approve

Future tests: every invoice's adjusted obligation = allocations + outstanding; overdue subset and exclusive aging sum; payments = net allocations + unapplied + paid refunds; receipt allocation snapshots/history coherent; all class groups match same cohort; paid categories match expense payments; interval cash flow includes refunds/reversals; no pending/failed cash; duplicate and concurrent requests idempotent; cross-year balances preserved; correction audit immutable; money never unsafe-float JSON.

Open decisions: receipt series/fiscal year/reset/void convention, prepayment/unapplied-credit policy, cross-sibling/bulk payment support, discount/refund authority and limits, closed-period/backdate rules, opening balance import evidence, required statutory accounting/tax/payroll scope, reconciliation cadence and retention. They require school finance approval; this proposal does not assert financial or legal compliance. No real accounting changelog was created because no actual account/record was changed.

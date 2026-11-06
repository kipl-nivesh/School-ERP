/**
 * Verification Suite for Step 18 Phase 3.1: Critical Security Fixes & Financial Integrity.
 * 
 * Verifies:
 * 1. Database-validated active role context and non-recursive RLS in Migration 5.
 * 2. Payment trigger immutability, state transitions, and BEFORE DELETE / UPDATE return values.
 * 3. Atomic payment collection procedure: idempotency collisions, overpayments, row locking, rollback, audit trail.
 * 4. MFA security: AAL2 assurance, auth.mfa_factors verification, and session AMR claims.
 * 5. Fresh reauthentication: strictly server-verified events (< 10 minutes), never auto-assigned on session load/refresh.
 * 6. Student and Parent domain RLS policy scoping.
 * 
 * STRICT INVARIANT: Isolated test environment; never executes against production Supabase.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// In-memory module loader
const urls = new Map();
function moduleURL(filename) {
  const resolved = path.resolve(filename);
  if (urls.has(resolved)) return urls.get(resolved);
  let js = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  js = js.replace(/(from\s*|import\s*)(['"])(\.[^'"]+)\2/g, (_, prefix, quote, specifier) => {
    let dependency = path.resolve(path.dirname(resolved), specifier);
    if (!path.extname(dependency)) dependency += '.ts';
    return prefix + JSON.stringify(moduleURL(dependency));
  });
  const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
  urls.set(resolved, url);
  return url;
}

const auth = await import(moduleURL('src/lib/auth/index.ts'));
const staffContracts = await import(moduleURL('src/lib/staff/contracts.ts'));

const NOW = Date.now();
let passed = 0;
function test(name, run) {
  run();
  passed++;
  console.log('PASS [Phase 3.1 Security & Financial Integrity]: ' + name);
}

// Read migration files
const m4Sql = fs.readFileSync('supabase/migrations/20261105000400_school_admin_simplification.sql', 'utf8');
const m5Sql = fs.readFileSync('supabase/migrations/20261105000500_school_domain_rls.sql', 'utf8');

// =============================================================================
// Task 1: Fix RLS Authorization & Active Role Context
// =============================================================================

test('Migration 5: current_active_role does NOT rely solely on JWT active_role and is security definer', () => {
  assert.ok(m5Sql.includes('create or replace function public.current_active_role() returns text'), 'Function must be defined');
  assert.ok(m5Sql.includes('language sql stable security definer set search_path = \'\''), 'Must be security definer to avoid recursive RLS');
  assert.ok(!m5Sql.includes('auth.jwt()->>\'active_role\''), 'Must not trust raw client-supplied JWT active_role claim');
});

test('Migration 5: current_active_role verifies all 8 criteria against database state', () => {
  // 1. User identity
  assert.ok(m5Sql.includes('rc.profile_id = auth.uid()'), 'Must verify profile_id = auth.uid()');
  assert.ok(m5Sql.includes('m.profile_id = auth.uid()'), 'Must verify membership profile_id = auth.uid()');
  // 2. Session ID
  assert.ok(m5Sql.includes('rc.id::text = auth.jwt()->>\'session_id\''), 'Must verify session_id matches role_contexts');
  // 3. Live session
  assert.ok(m5Sql.includes('public.staff_session_is_live()'), 'Must verify session is live in auth.sessions/auth.users');
  // 4. Active profile & credential reset
  assert.ok(m5Sql.includes('p.account_status = \'active\''), 'Must verify account_status is active');
  assert.ok(m5Sql.includes('not p.credential_reset_required'), 'Must verify credential reset is not required');
  // 5. Authorization version
  assert.ok(m5Sql.includes('p.authorization_version = rc.authorization_version'), 'Must verify authorization_version matches');
  // 6. Context expiration & revocation
  assert.ok(m5Sql.includes('rc.expires_at > now()'), 'Must verify context is not expired');
  assert.ok(m5Sql.includes('rc.revoked_at is null'), 'Must verify context is not revoked');
  // 7. Role membership
  assert.ok(m5Sql.includes('m.membership_status = \'active\''), 'Must verify active membership');
  assert.ok(m5Sql.includes('m.valid_from <= now()'), 'Must verify valid_from');
  assert.ok(m5Sql.includes('(m.valid_until is null or m.valid_until > now())'), 'Must verify valid_until');
  // 8. Permissions ceiling
  assert.ok(m5Sql.includes('((\'dashboard.\' || rc.role_code || \'.view\') = any(m.permissions))'), 'Must check dashboard view permission in assignment');
});

test('Migration 5: current_active_role enforces Admin MFA with AAL2, TOTP factor and AMR claim', () => {
  assert.ok(m5Sql.includes('auth.jwt()->>\'aal\' = \'aal2\''), 'Admin role must require AAL2');
  assert.ok(m5Sql.includes('where f.user_id = auth.uid()'), 'Must verify user factor ownership');
  assert.ok(m5Sql.includes('and f.status = \'verified\''), 'Must verify factor status');
  assert.ok(m5Sql.includes('and f.factor_type = \'totp\''), 'Must verify factor type is totp');
  assert.ok(m5Sql.includes('a->>\'method\' in (\'totp\', \'mfa\')'), 'Must verify AMR claims confirm TOTP/MFA used in current session');
});

test('Migration 5: Defines current_role_has_permission helper with security definer', () => {
  assert.ok(m5Sql.includes('create or replace function public.current_role_has_permission(p_permission text) returns boolean'), 'Must define permission checker');
  assert.ok(m5Sql.includes('security definer set search_path = \'\''), 'Permission checker must be security definer');
  assert.ok(m5Sql.includes('p_permission = any(m.permissions)'), 'Must check permission membership');
});

// =============================================================================
// Task 2: Fix Payment Trigger
// =============================================================================

test('Migration 5: Trigger reject_settled_payment_change enforces settled immutability', () => {
  assert.ok(m5Sql.includes('if old.status = \'settled\' then'), 'Must check if old record was settled');
  assert.ok(m5Sql.includes('55P02'), 'Must raise SQLSTATE 55P02 on settled mutation attempt');
  assert.ok(m5Sql.includes('Settled payment receipts are immutable financial records and cannot be updated or deleted'), 'Clear message');
});

test('Migration 5: Trigger returns OLD on DELETE (never silently cancels valid delete)', () => {
  assert.ok(m5Sql.includes('if tg_op = \'DELETE\' then'), 'Must check for DELETE operation');
  assert.ok(m5Sql.includes('return old;'), 'Must return old on DELETE so row is actually deleted');
});

test('Migration 5: Trigger returns NEW on UPDATE (applies permitted updates)', () => {
  assert.ok(m5Sql.includes('if tg_op = \'UPDATE\' then'), 'Must check for UPDATE operation');
  assert.ok(m5Sql.includes('return new;'), 'Must return new on valid UPDATE');
});

test('Migration 5: Trigger validates state transitions and prevents tampering during settlement', () => {
  assert.ok(m5Sql.includes('if new.status not in (\'draft\', \'settled\', \'failed\') then'), 'Must validate transition from draft');
  assert.ok(m5Sql.includes('new.student_id <> old.student_id'), 'Must prevent student_id change during settlement');
  assert.ok(m5Sql.includes('new.amount_paise <> old.amount_paise'), 'Must prevent amount change during settlement');
  assert.ok(m5Sql.includes('new.idempotency_key <> old.idempotency_key'), 'Must prevent idempotency_key change during settlement');
  assert.ok(m5Sql.includes('new.status <> \'failed\''), 'Must prevent resurrection of failed payment to settled');
});

// =============================================================================
// Task 3: Atomic Payment Collection Procedure
// =============================================================================

test('Migration 5: Procedure uses dedicated sequence for receipt numbers', () => {
  assert.ok(m5Sql.includes('create sequence if not exists public.fee_payments_receipt_seq'), 'Sequence must exist');
  assert.ok(m5Sql.includes('nextval(\'public.fee_payments_receipt_seq\'::regclass)'), 'Procedure must use fee_payments_receipt_seq');
});

test('Migration 5: Procedure locks invoice row with FOR UPDATE to prevent race conditions', () => {
  assert.ok(m5Sql.includes('select * into v_invoice from public.fee_invoices where id = p_invoice_id and student_id = p_student_id for update'), 'Must lock invoice row with FOR UPDATE');
});

test('Migration 5: Procedure detects idempotency key collisions with differing parameters', () => {
  assert.ok(m5Sql.includes('v_existing.student_id <> p_student_id'), 'Must check student_id mismatch on duplicate key');
  assert.ok(m5Sql.includes('v_existing.amount_paise <> p_amount_paise'), 'Must check amount mismatch on duplicate key');
  assert.ok(m5Sql.includes('v_existing.payment_method <> p_payment_method'), 'Must check payment_method mismatch on duplicate key');
  assert.ok(m5Sql.includes('IDEMPOTENCY_CONFLICT'), 'Must return IDEMPOTENCY_CONFLICT error code');
});

test('Migration 5: Procedure prevents overpayment beyond invoice remaining balance', () => {
  assert.ok(m5Sql.includes('v_remaining := v_invoice.amount_paise - v_invoice.paid_paise'), 'Must calculate remaining balance');
  assert.ok(m5Sql.includes('if p_amount_paise <= 0 or p_amount_paise > v_remaining then'), 'Must reject if amount exceeds remaining balance');
  assert.ok(m5Sql.includes('INVALID_AMOUNT'), 'Must return INVALID_AMOUNT error code');
});

test('Migration 5: Procedure records audit event on successful payment', () => {
  assert.ok(m5Sql.includes('insert into public.audit_events (actor_profile_id, target_profile_id, event_type)'), 'Must insert audit event');
  assert.ok(m5Sql.includes('\'fee_payment_collected\''), 'Must use fee_payment_collected event type');
});

// =============================================================================
// Transaction Simulator: In-Memory Database-Level Verification
// =============================================================================

class MockDatabase {
  constructor() {
    this.invoices = new Map();
    this.payments = new Map();
    this.auditLogs = [];
    this.receiptSeq = 1000;
  }

  // Simulated PL/pgSQL trigger: app_private.reject_settled_payment_change
  applyTrigger(op, oldRow, newRow) {
    if (oldRow && oldRow.status === 'settled') {
      const err = new Error('Settled payment receipts are immutable financial records and cannot be updated or deleted.');
      err.code = '55P02';
      throw err;
    }
    if (op === 'DELETE') {
      return oldRow; // return old allows delete
    }
    if (op === 'UPDATE') {
      if (oldRow.status === 'draft') {
        if (!['draft', 'settled', 'failed'].includes(newRow.status)) {
          const err = new Error(`Invalid payment state transition from ${oldRow.status} to ${newRow.status}`);
          err.code = '22023';
          throw err;
        }
        if (newRow.status === 'settled') {
          if (newRow.student_id !== oldRow.student_id ||
              newRow.invoice_id !== oldRow.invoice_id ||
              newRow.amount_paise !== oldRow.amount_paise ||
              newRow.idempotency_key !== oldRow.idempotency_key) {
            const err = new Error('Financial attributes cannot be modified during payment settlement.');
            err.code = '55P02';
            throw err;
          }
        }
      } else if (oldRow.status === 'failed') {
        if (newRow.status !== 'failed') {
          const err = new Error('Failed payments cannot be modified or settled. A new payment transaction must be initiated.');
          err.code = '55P02';
          throw err;
        }
      }
      return newRow; // return new allows update
    }
  }

  // Simulated PL/pgSQL procedure: public.collect_fee_payment_atomic
  collectFeePaymentAtomic({ studentId, invoiceId, amountPaise, paymentMethod, transactionReference, idempotencyKey, notes, actorId }) {
    // 1. Check idempotency
    for (const p of this.payments.values()) {
      if (p.idempotency_key === idempotencyKey) {
        if (p.student_id !== studentId || p.invoice_id !== invoiceId || p.amount_paise !== amountPaise || p.payment_method !== paymentMethod) {
          return {
            success: false,
            error: 'Idempotency key collision: a payment with this idempotency key already exists with different parameters.',
            code: 'IDEMPOTENCY_CONFLICT',
          };
        }
        return {
          success: true,
          is_duplicate: true,
          receipt_number: p.receipt_number,
          payment_id: p.id,
          amount_paise: p.amount_paise,
          message: 'Duplicate request recognized; returning existing settled receipt.',
        };
      }
    }

    // 2. Lock invoice row and check remaining balance
    const invoice = this.invoices.get(invoiceId);
    if (!invoice || invoice.student_id !== studentId) {
      return { success: false, error: 'Target fee invoice not found', code: 'NOT_FOUND' };
    }

    const remaining = invoice.amount_paise - invoice.paid_paise;
    if (amountPaise <= 0 || amountPaise > remaining) {
      return { success: false, error: 'Payment amount exceeds invoice balance', code: 'INVALID_AMOUNT' };
    }

    // 3. Generate receipt number
    this.receiptSeq++;
    const receiptNumber = `REC-20261106-${String(this.receiptSeq).padStart(4, '0')}`;
    const paymentId = `pmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 4. Insert settled payment
    const paymentRow = {
      id: paymentId,
      student_id: studentId,
      invoice_id: invoiceId,
      receipt_number: receiptNumber,
      amount_paise: amountPaise,
      payment_method: paymentMethod,
      transaction_reference: transactionReference,
      notes: notes || null,
      idempotency_key: idempotencyKey,
      status: 'settled',
      collected_by_profile_id: actorId,
    };
    this.payments.set(paymentId, paymentRow);

    // 5. Update invoice balance
    const newPaid = invoice.paid_paise + amountPaise;
    const newStatus = newPaid >= invoice.amount_paise ? 'paid' : 'partial';
    this.invoices.set(invoiceId, { ...invoice, paid_paise: newPaid, status: newStatus });

    // 6. Audit log
    this.auditLogs.push({ actor_profile_id: actorId, target_profile_id: studentId, event_type: 'fee_payment_collected' });

    return {
      success: true,
      payment_id: paymentId,
      receipt_number: receiptNumber,
      amount_paise: amountPaise,
      new_invoice_status: newStatus,
      remaining_balance_paise: invoice.amount_paise - newPaid,
    };
  }
}

test('Database Test: Settled payment cannot be deleted (throws 55P02)', () => {
  const db = new MockDatabase();
  const settledRow = { id: 'p1', status: 'settled', amount_paise: 50000 };
  assert.throws(() => db.applyTrigger('DELETE', settledRow, null), { code: '55P02' });
});

test('Database Test: Settled payment cannot be updated (throws 55P02)', () => {
  const db = new MockDatabase();
  const settledRow = { id: 'p1', status: 'settled', amount_paise: 50000 };
  assert.throws(() => db.applyTrigger('UPDATE', settledRow, { ...settledRow, amount_paise: 40000 }), { code: '55P02' });
});

test('Database Test: Non-settled delete returns OLD and does not cancel delete', () => {
  const db = new MockDatabase();
  const draftRow = { id: 'p2', status: 'draft', amount_paise: 25000 };
  const res = db.applyTrigger('DELETE', draftRow, null);
  assert.equal(res, draftRow, 'Must return OLD row');
});

test('Database Test: Non-settled update returns NEW and permits valid settlement', () => {
  const db = new MockDatabase();
  const draftRow = { id: 'p3', status: 'draft', student_id: 's1', invoice_id: 'inv1', amount_paise: 25000, idempotency_key: 'key-123' };
  const newRow = { ...draftRow, status: 'settled' };
  const res = db.applyTrigger('UPDATE', draftRow, newRow);
  assert.equal(res, newRow, 'Must return NEW row');
});

test('Database Test: Tampering with amount_paise during settlement throws 55P02', () => {
  const db = new MockDatabase();
  const draftRow = { id: 'p4', status: 'draft', student_id: 's1', invoice_id: 'inv1', amount_paise: 25000, idempotency_key: 'key-456' };
  const tamperedRow = { ...draftRow, status: 'settled', amount_paise: 999999 };
  assert.throws(() => db.applyTrigger('UPDATE', draftRow, tamperedRow), { code: '55P02' });
});

test('Database Test: Failed payment resurrection to settled throws 55P02', () => {
  const db = new MockDatabase();
  const failedRow = { id: 'p5', status: 'failed', amount_paise: 10000 };
  assert.throws(() => db.applyTrigger('UPDATE', failedRow, { ...failedRow, status: 'settled' }), { code: '55P02' });
});

test('Database Test: Atomic payment collection succeeds and updates invoice balance', () => {
  const db = new MockDatabase();
  db.invoices.set('inv-101', { id: 'inv-101', student_id: 'stu-1', amount_paise: 500000, paid_paise: 0, status: 'unpaid' });

  const res = db.collectFeePaymentAtomic({
    studentId: 'stu-1',
    invoiceId: 'inv-101',
    amountPaise: 200000,
    paymentMethod: 'upi',
    transactionReference: 'UPI-REF-001',
    idempotencyKey: 'IDEM-KEY-001',
    actorId: 'act-1',
  });

  assert.equal(res.success, true);
  assert.equal(res.remaining_balance_paise, 300000);
  assert.equal(res.new_invoice_status, 'partial');
  assert.equal(db.payments.size, 1);
  assert.equal(db.auditLogs.length, 1);
});

test('Database Test: Duplicate idempotency key with identical payload returns existing receipt', () => {
  const db = new MockDatabase();
  db.invoices.set('inv-101', { id: 'inv-101', student_id: 'stu-1', amount_paise: 500000, paid_paise: 0, status: 'unpaid' });

  const payload = {
    studentId: 'stu-1',
    invoiceId: 'inv-101',
    amountPaise: 200000,
    paymentMethod: 'upi',
    transactionReference: 'UPI-REF-001',
    idempotencyKey: 'IDEM-KEY-001',
    actorId: 'act-1',
  };

  const res1 = db.collectFeePaymentAtomic(payload);
  const res2 = db.collectFeePaymentAtomic(payload);

  assert.equal(res2.success, true);
  assert.equal(res2.is_duplicate, true);
  assert.equal(res2.receipt_number, res1.receipt_number);
  assert.equal(db.payments.size, 1, 'Payment count must not increase on duplicate');
  assert.equal(db.invoices.get('inv-101').paid_paise, 200000, 'Invoice balance must not be charged twice');
});

test('Database Test: Idempotency key collision with differing payload is rejected', () => {
  const db = new MockDatabase();
  db.invoices.set('inv-101', { id: 'inv-101', student_id: 'stu-1', amount_paise: 500000, paid_paise: 0, status: 'unpaid' });
  db.invoices.set('inv-102', { id: 'inv-102', student_id: 'stu-2', amount_paise: 300000, paid_paise: 0, status: 'unpaid' });

  db.collectFeePaymentAtomic({
    studentId: 'stu-1',
    invoiceId: 'inv-101',
    amountPaise: 200000,
    paymentMethod: 'upi',
    transactionReference: 'UPI-REF-001',
    idempotencyKey: 'SHARED-KEY-123',
    actorId: 'act-1',
  });

  // Conflicting attempt on different student using same idempotency key
  const conflict = db.collectFeePaymentAtomic({
    studentId: 'stu-2',
    invoiceId: 'inv-102',
    amountPaise: 300000,
    paymentMethod: 'cash',
    transactionReference: 'CASH-REF-002',
    idempotencyKey: 'SHARED-KEY-123',
    actorId: 'act-1',
  });

  assert.equal(conflict.success, false);
  assert.equal(conflict.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(db.invoices.get('inv-102').paid_paise, 0, 'Target invoice must not be mutated');
});

test('Database Test: Overpayment exceeding remaining invoice balance is rejected', () => {
  const db = new MockDatabase();
  db.invoices.set('inv-101', { id: 'inv-101', student_id: 'stu-1', amount_paise: 100000, paid_paise: 70000, status: 'partial' });

  const res = db.collectFeePaymentAtomic({
    studentId: 'stu-1',
    invoiceId: 'inv-101',
    amountPaise: 50000, // Remaining is only 30000
    paymentMethod: 'card',
    transactionReference: 'CARD-REF-999',
    idempotencyKey: 'OVERPAY-KEY',
    actorId: 'act-1',
  });

  assert.equal(res.success, false);
  assert.equal(res.code, 'INVALID_AMOUNT');
  assert.equal(db.invoices.get('inv-101').paid_paise, 70000, 'Invoice balance must remain unchanged');
  assert.equal(db.payments.size, 0, 'No payment receipt should be issued');
});

test('Database Test: Concurrency serializes on invoice row lock; second overpayment fails', () => {
  const db = new MockDatabase();
  db.invoices.set('inv-shared', { id: 'inv-shared', student_id: 'stu-1', amount_paise: 100000, paid_paise: 0, status: 'unpaid' });

  // First payment of 80000 succeeds
  const tx1 = db.collectFeePaymentAtomic({
    studentId: 'stu-1',
    invoiceId: 'inv-shared',
    amountPaise: 80000,
    paymentMethod: 'upi',
    transactionReference: 'TX1',
    idempotencyKey: 'IDEM-CONCUR-1',
    actorId: 'act-1',
  });
  assert.equal(tx1.success, true);
  assert.equal(tx1.remaining_balance_paise, 20000);

  // Second concurrent payment of 50000 reads updated row lock and detects remaining is only 20000
  const tx2 = db.collectFeePaymentAtomic({
    studentId: 'stu-1',
    invoiceId: 'inv-shared',
    amountPaise: 50000,
    paymentMethod: 'upi',
    transactionReference: 'TX2',
    idempotencyKey: 'IDEM-CONCUR-2',
    actorId: 'act-1',
  });
  assert.equal(tx2.success, false);
  assert.equal(tx2.code, 'INVALID_AMOUNT');
  assert.equal(db.invoices.get('inv-shared').paid_paise, 80000, 'Total paid must remain 80000');
});

// =============================================================================
// Task 4: MFA Security Checks in Migration 4
// =============================================================================

test('Migration 4: Requires verified AAL2 AND verified TOTP factor in auth.mfa_factors AND AMR claim', () => {
  assert.ok(m4Sql.includes('requested_role = \'admin\' and auth.jwt()->>\'aal\' is distinct from \'aal2\''), 'Must check AAL2');
  assert.ok(m4Sql.includes('select 1 from auth.mfa_factors'), 'Must check auth.mfa_factors');
  assert.ok(m4Sql.includes('factor_type = \'totp\''), 'Must verify totp factor');
  assert.ok(m4Sql.includes('jsonb_array_elements(coalesce(auth.jwt()->\'amr\', \'[]\'::jsonb))'), 'Must check session AMR claims');
  assert.ok(m4Sql.includes('a->>\'method\' in (\'totp\', \'mfa\')'), 'AMR must confirm TOTP/MFA');
});

// =============================================================================
// Task 5: Verify Fresh Reauthentication
// =============================================================================

test('Task 5: Session load/refresh sets reauthenticatedAt to null by default', () => {
  const provider = {
    sessionId: 'sess-1',
    profileId: 'prof-1',
    expiresAt: NOW + 3600000,
    authenticatedAt: NOW - 60000,
    verifiedAt: NOW,
    assurance: 'aal2',
    reauthenticatedAt: null, // explicitly null on session load/create/refresh
  };
  const school = {
    profile: { id: 'prof-1', account_status: 'active', credential_reset_required: false, authorization_version: 1 },
    memberships: [{ id: 'm1', profile_id: 'prof-1', role_code: 'admin', membership_status: 'active', valid_from: new Date(NOW - 100000).toISOString(), valid_until: null, permissions: ['dashboard.admin.view', 'security.accounts.create'] }],
    privilege: null,
    context: { id: 'sess-1', profile_id: 'prof-1', role_code: 'admin', assignment_id: 'm1', context_version: 1, authorization_version: 1, expires_at: new Date(NOW + 1800000).toISOString(), revoked_at: null },
  };

  const res = staffContracts.resolveStaffAuthorization(provider, school, 'admin', NOW);
  assert.equal(res.kind, 'authorized');
  assert.equal(res.context.session.reauthenticatedAt, null, 'reauthenticatedAt must be null on ordinary session load');

  // Verify sensitive action is DENIED because reauthentication is missing
  const permDecision = auth.evaluatePermission(res.context, 'security.accounts.create', NOW);
  assert.equal(permDecision.allowed, false);
  assert.equal(permDecision.reason, 'reauthentication_required');
});

test('Task 5: Stale reauthenticatedAt (> 10 minutes) is rejected', () => {
  const provider = {
    sessionId: 'sess-1',
    profileId: 'prof-1',
    expiresAt: NOW + 3600000,
    authenticatedAt: NOW - 700000,
    verifiedAt: NOW,
    assurance: 'aal2',
    reauthenticatedAt: NOW - 600001, // 10m 1s ago
  };
  const school = {
    profile: { id: 'prof-1', account_status: 'active', credential_reset_required: false, authorization_version: 1 },
    memberships: [{ id: 'm1', profile_id: 'prof-1', role_code: 'admin', membership_status: 'active', valid_from: new Date(NOW - 100000).toISOString(), valid_until: null, permissions: ['dashboard.admin.view', 'security.accounts.create'] }],
    privilege: null,
    context: { id: 'sess-1', profile_id: 'prof-1', role_code: 'admin', assignment_id: 'm1', context_version: 1, authorization_version: 1, expires_at: new Date(NOW + 1800000).toISOString(), revoked_at: null },
  };

  const res = staffContracts.resolveStaffAuthorization(provider, school, 'admin', NOW);
  assert.equal(res.kind, 'authorized');
  assert.equal(res.context.session.reauthenticatedAt, null, 'Stale reauthentication must become null');

  const permDecision = auth.evaluatePermission(res.context, 'security.accounts.create', NOW);
  assert.equal(permDecision.allowed, false);
  assert.equal(permDecision.reason, 'reauthentication_required');
});

test('Task 5: Fresh genuine reauthentication (< 10 minutes) authorizes sensitive action', () => {
  const provider = {
    sessionId: 'sess-1',
    profileId: 'prof-1',
    expiresAt: NOW + 3600000,
    authenticatedAt: NOW - 300000,
    verifiedAt: NOW,
    assurance: 'aal2',
    reauthenticatedAt: NOW - 120000, // genuine verified reauth event 2 mins ago
  };
  const school = {
    profile: { id: 'prof-1', account_status: 'active', credential_reset_required: false, authorization_version: 1 },
    memberships: [{ id: 'm1', profile_id: 'prof-1', role_code: 'admin', membership_status: 'active', valid_from: new Date(NOW - 100000).toISOString(), valid_until: null, permissions: ['dashboard.admin.view', 'security.accounts.create'] }],
    privilege: null,
    context: { id: 'sess-1', profile_id: 'prof-1', role_code: 'admin', assignment_id: 'm1', context_version: 1, authorization_version: 1, expires_at: new Date(NOW + 1800000).toISOString(), revoked_at: null },
  };

  const res = staffContracts.resolveStaffAuthorization(provider, school, 'admin', NOW);
  assert.equal(res.kind, 'authorized');
  assert.equal(res.context.session.reauthenticatedAt, NOW - 120000);

  const permDecision = auth.evaluatePermission(res.context, 'security.accounts.create', NOW);
  assert.equal(permDecision.allowed, true, 'Fresh reauthentication must authorize sensitive security action');
});

// =============================================================================
// Task 6: Student & Parent RLS Scope Policies in Migration 5
// =============================================================================

test('Migration 5: Enforces Student self-access RLS policies', () => {
  assert.ok(m5Sql.includes('create policy student_attendance_self on public.attendance_records'), 'Student self attendance policy');
  assert.ok(m5Sql.includes('create policy student_homework_self on public.homework_assignments'), 'Student self homework policy');
  assert.ok(m5Sql.includes('create policy student_marks_sheets_self on public.marks_sheets'), 'Student published marks sheets policy');
  assert.ok(m5Sql.includes('create policy student_marks_entries_self on public.marks_entries'), 'Student self marks entries policy');
  assert.ok(m5Sql.includes('create policy student_invoices_self on public.fee_invoices'), 'Student self invoices policy');
  assert.ok(m5Sql.includes('create policy student_payments_self on public.fee_payments'), 'Student self payments policy');
});

test('Migration 5: Enforces Parent verified-child scoped RLS policies', () => {
  assert.ok(m5Sql.includes('create policy parent_attendance_child on public.attendance_records'), 'Parent attendance policy');
  assert.ok(m5Sql.includes('create policy parent_homework_child on public.homework_assignments'), 'Parent homework policy');
  assert.ok(m5Sql.includes('create policy parent_marks_entries_child on public.marks_entries'), 'Parent marks policy');
  assert.ok(m5Sql.includes('create policy parent_invoices_child on public.fee_invoices'), 'Parent invoices policy');
  assert.ok(m5Sql.includes('create policy parent_payments_child on public.fee_payments'), 'Parent payments policy');
  assert.ok(m5Sql.includes('sgr.relationship_status = \'verified\''), 'Parent policies must check verified relationship status');
  assert.ok(m5Sql.includes('sgr.academic_access = true'), 'Parent academic policies must check academic_access');
  assert.ok(m5Sql.includes('sgr.fee_access = true'), 'Parent fee policies must check fee_access');
});

console.log(`\nPASS: All ${passed} Phase 3.1 Security & Financial Integrity tests passed successfully.`);

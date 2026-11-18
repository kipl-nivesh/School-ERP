/**
 * =============================================================================
 * BRIGHTCAMP SCHOOL ERP — STUDENT SUBSCRIPTION SERVICE
 * Step 22 / Phase 5: Multi-School SaaS & Student Subscription Architecture
 * =============================================================================
 */

import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
  type StudentSubscriptionState,
  type SubscriptionLedgerEntry,
  type SubscriptionAccessDecision,
  type SubscriptionExtensionResult,
  type ParentChildSubscriptionSummary,
  CONSOLIDATED_BILLING_RULES,
  calculateSchoolConsolidatedInvoice,
  type SchoolConsolidatedBillingInvoice,
} from './contracts';

export {
  CONSOLIDATED_BILLING_RULES,
  calculateSchoolConsolidatedInvoice,
  type SchoolConsolidatedBillingInvoice,
};

// In-memory persistent state backing isolated tests and development DAL
const subscriptionStore = new Map<string, {
  studentId: string;
  schoolId: string;
  trialActivated: boolean;
  trialStartedAt: number | null;
  trialEndsAt: number | null;
  currentPeriodExpiresAt: number | null;
  statusOverride: 'suspended' | 'exempt' | null;
  createdAt: number;
  updatedAt: number;
}>();

const ledgerStore: SubscriptionLedgerEntry[] = [];
const idempotencyRegistry = new Map<string, SubscriptionLedgerEntry>();
const gatewayRegistry = new Map<string, SubscriptionLedgerEntry>();

let paymentDeferredAccessMode = false; // Server-controlled feature flag for pre-gateway launch period

/**
 * Configure server-controlled Payment-Deferred Access Mode.
 */
export function setPaymentDeferredAccessMode(enabled: boolean): void {
  paymentDeferredAccessMode = enabled;
}

export function isPaymentDeferredAccessMode(): boolean {
  return paymentDeferredAccessMode;
}

const TRIAL_DURATION_MS = 240 * 60 * 60 * 1000; // Exactly 240 hours

/**
 * Activate student free trial.
 * Rules:
 * 1. Begins only when student account is activated.
 * 2. Exactly 240 hours duration.
 * 3. Immutable: Trial must NEVER reset after subsequent logins, PIN changes, or profile edits.
 */
export async function activateStudentTrial(
  studentId: string,
  schoolId: string,
  now: number = Date.now()
): Promise<{ trialStartedAt: string; trialEndsAt: string; alreadyActive: boolean }> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  if (!studentId || !schoolId) {
    throw new Error('studentId and schoolId are required to activate student trial.');
  }

  const existing = subscriptionStore.get(studentId);

  // If already activated, return existing immutable timestamps without modifying them
  if (existing?.trialActivated && existing.trialStartedAt && existing.trialEndsAt) {
    return {
      trialStartedAt: new Date(existing.trialStartedAt).toISOString(),
      trialEndsAt: new Date(existing.trialEndsAt).toISOString(),
      alreadyActive: true,
    };
  }

  const trialStartedAt = now;
  const trialEndsAt = trialStartedAt + TRIAL_DURATION_MS;

  const record = {
    studentId,
    schoolId,
    trialActivated: true,
    trialStartedAt,
    trialEndsAt,
    currentPeriodExpiresAt: null,
    statusOverride: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  subscriptionStore.set(studentId, record);

  return {
    trialStartedAt: new Date(trialStartedAt).toISOString(),
    trialEndsAt: new Date(trialEndsAt).toISOString(),
    alreadyActive: false,
  };
}

/**
 * Retrieve current student subscription state with query-time evaluation.
 * Note: Never uses now() in stored database columns; time-dependent status is computed at query time.
 */
export async function getStudentSubscription(
  studentId: string,
  now: number = Date.now()
): Promise<StudentSubscriptionState | null> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const record = subscriptionStore.get(studentId);
  if (!record) {
    return null;
  }

  const access = calculateSubscriptionAccess(record, now);

  return {
    studentId: record.studentId,
    schoolId: record.schoolId,
    trialActivated: record.trialActivated,
    trialStartedAt: record.trialStartedAt ? new Date(record.trialStartedAt).toISOString() : null,
    trialEndsAt: record.trialEndsAt ? new Date(record.trialEndsAt).toISOString() : null,
    currentPeriodExpiresAt: record.currentPeriodExpiresAt ? new Date(record.currentPeriodExpiresAt).toISOString() : null,
    statusOverride: record.statusOverride,
    status: access.status,
    isAccessGranted: access.isAccessGranted,
    remainingSeconds: access.remainingSeconds,
  };
}

/**
 * Check whether a student has authorized access to student/parent portal data.
 */
export async function getSubscriptionAccess(
  studentId: string,
  now: number = Date.now()
): Promise<SubscriptionAccessDecision> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const record = subscriptionStore.get(studentId);
  if (!record) {
    return {
      studentId,
      schoolId: '',
      isAccessGranted: false,
      status: 'unregistered',
      trialEndsAt: null,
      expiresAt: null,
      remainingSeconds: 0,
      requiresRenewal: true,
    };
  }

  return calculateSubscriptionAccess(record, now);
}

/**
 * Pure calculation helper for query-time access decision.
 */
function calculateSubscriptionAccess(
  record: NonNullable<ReturnType<typeof subscriptionStore.get>>,
  now: number
): SubscriptionAccessDecision {
  if (record.statusOverride === 'suspended') {
    return {
      studentId: record.studentId,
      schoolId: record.schoolId,
      isAccessGranted: false,
      status: 'suspended',
      trialEndsAt: record.trialEndsAt ? new Date(record.trialEndsAt).toISOString() : null,
      expiresAt: record.currentPeriodExpiresAt ? new Date(record.currentPeriodExpiresAt).toISOString() : null,
      remainingSeconds: 0,
      requiresRenewal: false,
    };
  }

  if (record.statusOverride === 'exempt') {
    return {
      studentId: record.studentId,
      schoolId: record.schoolId,
      isAccessGranted: true,
      status: 'exempt',
      trialEndsAt: record.trialEndsAt ? new Date(record.trialEndsAt).toISOString() : null,
      expiresAt: record.currentPeriodExpiresAt ? new Date(record.currentPeriodExpiresAt).toISOString() : null,
      remainingSeconds: 8640000,
      requiresRenewal: false,
    };
  }

  const effectiveExpiry = Math.max(
    record.currentPeriodExpiresAt ?? 0,
    record.trialEndsAt ?? 0
  );

  const isGranted = effectiveExpiry > now;
  const remainingSeconds = isGranted ? Math.floor((effectiveExpiry - now) / 1000) : 0;

  let status: StudentSubscriptionState['status'];
  if (!isGranted) {
    if (paymentDeferredAccessMode) {
      return {
        studentId: record.studentId,
        schoolId: record.schoolId,
        isAccessGranted: true,
        status: 'payment_deferred_access',
        trialEndsAt: record.trialEndsAt ? new Date(record.trialEndsAt).toISOString() : null,
        expiresAt: effectiveExpiry > 0 ? new Date(effectiveExpiry).toISOString() : null,
        remainingSeconds: 8640000,
        requiresRenewal: false,
      };
    }
    status = 'expired';
  } else if (record.currentPeriodExpiresAt && record.currentPeriodExpiresAt > now) {
    status = 'subscription_active';
  } else if (record.trialEndsAt && record.trialEndsAt > now) {
    status = 'trial_active';
  } else {
    status = 'expired';
  }

  return {
    studentId: record.studentId,
    schoolId: record.schoolId,
    isAccessGranted: isGranted,
    status,
    trialEndsAt: record.trialEndsAt ? new Date(record.trialEndsAt).toISOString() : null,
    expiresAt: effectiveExpiry > 0 ? new Date(effectiveExpiry).toISOString() : null,
    remainingSeconds,
    requiresRenewal: !isGranted,
  };
}

/**
 * Calculate subscription extension mathematics.
 * Rule: Stacks on top of max(currentExpiry, now). Never shortens an existing subscription.
 */
export function calculateSubscriptionExtension(
  currentExpiryMs: number | null,
  planId: SubscriptionPlanId,
  now: number = Date.now()
): { baseTimeMs: number; durationMs: number; newExpiryMs: number; amountPaise: number } {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    throw new Error(`Unknown subscription plan: ${planId}`);
  }

  const durationMs = plan.durationHours * 60 * 60 * 1000;
  const baseTimeMs = Math.max(currentExpiryMs ?? 0, now);
  const newExpiryMs = baseTimeMs + durationMs;

  return {
    baseTimeMs,
    durationMs,
    newExpiryMs,
    amountPaise: plan.amountPaise,
  };
}

/**
 * Atomically extend a student's subscription.
 * Handles:
 * 1. Replay attack and idempotency defense (duplicate idempotency key returns existing record)
 * 2. Cumulative stacking (adds 24h or 720h to later of current expiry and now)
 * 3. Immutable financial ledger recording
 */
export async function extendStudentSubscription(
  studentId: string,
  schoolId: string,
  planId: SubscriptionPlanId,
  idempotencyKey: string,
  gatewayPaymentId?: string,
  now: number = Date.now()
): Promise<SubscriptionExtensionResult> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  if (!studentId || !schoolId || !planId || !idempotencyKey) {
    return {
      success: false,
      studentId,
      planId,
      previousExpiry: null,
      newExpiry: '',
      amountPaise: 0,
      isDuplicate: false,
      error: 'Missing required subscription parameters.',
    };
  }

  // 1. Idempotency Check & Replay Defense
  const existingLedger = idempotencyRegistry.get(idempotencyKey) ?? (gatewayPaymentId ? gatewayRegistry.get(gatewayPaymentId) : undefined);
  if (existingLedger) {
    // Check for idempotency payload collision (tampering defense)
    if (existingLedger.studentId !== studentId || existingLedger.schoolId !== schoolId || existingLedger.planId !== planId) {
      return {
        success: false,
        studentId,
        planId,
        previousExpiry: null,
        newExpiry: '',
        amountPaise: 0,
        isDuplicate: true,
        error: 'Idempotency payload collision: key or payment ID already registered with different parameters.',
      };
    }

    return {
      success: true,
      studentId,
      planId: existingLedger.planId,
      previousExpiry: existingLedger.previousExpiry,
      newExpiry: existingLedger.newExpiry,
      amountPaise: existingLedger.amountPaise,
      isDuplicate: true,
    };
  }

  // 2. Fetch or create subscription record
  let record = subscriptionStore.get(studentId);
  if (!record) {
    record = {
      studentId,
      schoolId,
      trialActivated: false,
      trialStartedAt: null,
      trialEndsAt: null,
      currentPeriodExpiresAt: null,
      statusOverride: null,
      createdAt: now,
      updatedAt: now,
    };
    subscriptionStore.set(studentId, record);
  }

  // 3. Compute extension (stacks on top of later of trial or current subscription)
  const currentEntitlementMs = Math.max(
    record.currentPeriodExpiresAt ?? 0,
    record.trialEndsAt ?? 0
  );

  const { newExpiryMs, amountPaise } = calculateSubscriptionExtension(
    currentEntitlementMs > 0 ? currentEntitlementMs : null,
    planId,
    now
  );

  const previousExpiryStr = record.currentPeriodExpiresAt
    ? new Date(record.currentPeriodExpiresAt).toISOString()
    : null;
  const newExpiryStr = new Date(newExpiryMs).toISOString();

  // 4. Update record
  record.currentPeriodExpiresAt = newExpiryMs;
  record.updatedAt = now;

  // 5. Append to ledger
  const ledgerEntry: SubscriptionLedgerEntry = {
    id: `sub-ledg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    studentId,
    schoolId,
    planId,
    amountPaise,
    durationHours: SUBSCRIPTION_PLANS[planId].durationHours,
    paymentMethod: 'upi',
    gatewayPaymentId: gatewayPaymentId ?? null,
    idempotencyKey,
    previousExpiry: previousExpiryStr,
    newExpiry: newExpiryStr,
    createdAt: new Date(now).toISOString(),
  };

  ledgerStore.push(ledgerEntry);
  idempotencyRegistry.set(idempotencyKey, ledgerEntry);
  if (gatewayPaymentId) {
    gatewayRegistry.set(gatewayPaymentId, ledgerEntry);
  }

  return {
    success: true,
    studentId,
    planId,
    previousExpiry: previousExpiryStr,
    newExpiry: newExpiryStr,
    amountPaise,
    isDuplicate: false,
  };
}

/**
 * Multi-child parent portal subscription evaluator.
 * Evaluates subscription separately for each child so that Child A active and Child B expired
 * produce distinct access states without cross-child bleed.
 */
export async function getParentChildSubscriptionAccess(
  guardianProfileId: string,
  schoolId: string,
  linkedStudents: ReadonlyArray<{ studentId: string; studentName: string; registrationNumber: string }>,
  now: number = Date.now()
): Promise<ParentChildSubscriptionSummary> {
  if (process.env.NODE_ENV === 'production') throw new Error('In-memory workflow disabled in production; database integration required.');
  const childrenWithAccess = await Promise.all(
    linkedStudents.map(async (child) => {
      const access = await getSubscriptionAccess(child.studentId, now);
      return {
        studentId: child.studentId,
        studentName: child.studentName,
        registrationNumber: child.registrationNumber,
        access,
      };
    })
  );

  return {
    guardianProfileId,
    schoolId,
    children: childrenWithAccess,
  };
}

/**
 * Reset in-memory store for isolated tests.
 */
export function resetSubscriptionTestStore(): void {
  subscriptionStore.clear();
  ledgerStore.length = 0;
  idempotencyRegistry.clear();
  gatewayRegistry.clear();
  paymentDeferredAccessMode = false;
}

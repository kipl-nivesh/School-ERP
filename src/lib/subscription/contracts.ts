/**
 * =============================================================================
 * BRIGHTCAMP SCHOOL ERP — STUDENT SUBSCRIPTION CONTRACTS
 * Step 22 / Phase 5: Multi-School SaaS & Student Subscription Architecture
 * =============================================================================
 */

export type SubscriptionPlanId = 'daily' | 'monthly';

export interface SubscriptionPlan {
  readonly id: SubscriptionPlanId;
  readonly name: string;
  readonly durationHours: number;
  readonly amountPaise: number; // Daily: 100 paise (INR 1), Monthly: 3000 paise (INR 30)
  readonly currency: 'INR';
  readonly isActive: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  daily: {
    id: 'daily',
    name: 'Daily Access Pass',
    durationHours: 24,
    amountPaise: 100, // INR 1
    currency: 'INR',
    isActive: true,
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Access Pass (30 Days)',
    durationHours: 720, // 30 * 24 = 720 hours
    amountPaise: 3000, // INR 30
    currency: 'INR',
    isActive: true,
  },
} as const;

export type SubscriptionAccessStatus =
  | 'trial_active'
  | 'subscription_active'
  | 'payment_deferred_access'
  | 'expired'
  | 'suspended'
  | 'exempt'
  | 'unregistered';

export interface StudentSubscriptionState {
  readonly studentId: string;
  readonly schoolId: string;
  readonly trialActivated: boolean;
  readonly trialStartedAt: string | null;
  readonly trialEndsAt: string | null;
  readonly currentPeriodExpiresAt: string | null;
  readonly statusOverride: 'suspended' | 'exempt' | null;
  readonly status: SubscriptionAccessStatus;
  readonly isAccessGranted: boolean;
  readonly remainingSeconds: number;
}

export interface SubscriptionLedgerEntry {
  readonly id: string;
  readonly studentId: string;
  readonly schoolId: string;
  readonly planId: SubscriptionPlanId;
  readonly amountPaise: number;
  readonly durationHours: number;
  readonly paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet' | 'manual_grant';
  readonly gatewayPaymentId: string | null;
  readonly idempotencyKey: string;
  readonly previousExpiry: string | null;
  readonly newExpiry: string;
  readonly createdAt: string;
}

export interface SubscriptionAccessDecision {
  readonly studentId: string;
  readonly schoolId: string;
  readonly isAccessGranted: boolean;
  readonly status: SubscriptionAccessStatus;
  readonly trialEndsAt: string | null;
  readonly expiresAt: string | null;
  readonly remainingSeconds: number;
  readonly requiresRenewal: boolean;
}

export interface ParentChildSubscriptionSummary {
  readonly guardianProfileId: string;
  readonly schoolId: string;
  readonly children: ReadonlyArray<{
    readonly studentId: string;
    readonly studentName: string;
    readonly registrationNumber: string;
    readonly access: SubscriptionAccessDecision;
  }>;
}

export interface SubscriptionExtensionResult {
  readonly success: boolean;
  readonly studentId: string;
  readonly planId: SubscriptionPlanId;
  readonly previousExpiry: string | null;
  readonly newExpiry: string;
  readonly amountPaise: number;
  readonly isDuplicate: boolean;
  readonly error?: string;
}

/**
 * =============================================================================
 * BRIGHTCAMP SCHOOL CONSOLIDATED BILLING CONTRACT (PHASE 12.3)
 * Offline billing contract invariants:
 * 1. 15-day free trial across the institution.
 * 2. Flat rate: INR 1 (100 paise) per active student per day.
 * 3. One consolidated school subscription invoice.
 * 4. School Admin is the sole authorized payer.
 * 5. Student and parent interfaces have zero payment gateways.
 * 6. Flat unit economics: strictly NO tiered pricing.
 * =============================================================================
 */

export const CONSOLIDATED_BILLING_RULES = {
  trialDays: 15,
  trialDurationHours: 15 * 24, // 360 hours
  ratePerStudentPerDayPaise: 100, // INR 1.00
  ratePerStudentPerDayRupees: 1,
  currency: 'INR' as const,
  payerRole: 'admin' as const,
  hasStudentPaymentGateway: false,
  hasParentPaymentGateway: false,
  isTieredPricing: false,
} as const;

export interface SchoolConsolidatedBillingInvoice {
  readonly schoolId: string;
  readonly invoiceNumber: string;
  readonly activeStudentCount: number;
  readonly billedDays: number;
  readonly ratePerStudentPerDayPaise: number;
  readonly totalAmountPaise: number;
  readonly totalAmountRupees: number;
  readonly currency: 'INR';
  readonly payerRole: 'admin';
  readonly trialDaysRemaining: number;
  readonly isTrialActive: boolean;
  readonly generatedAt: string;
  readonly status: 'trial' | 'pending' | 'settled';
}

export function calculateSchoolConsolidatedInvoice(params: {
  schoolId: string;
  activeStudentCount: number;
  billedDays: number;
  schoolRegistrationDate: Date | string;
  currentDate?: Date | string;
}): SchoolConsolidatedBillingInvoice {
  const regDate = typeof params.schoolRegistrationDate === 'string'
    ? new Date(params.schoolRegistrationDate)
    : params.schoolRegistrationDate;
  const now = params.currentDate
    ? (typeof params.currentDate === 'string' ? new Date(params.currentDate) : params.currentDate)
    : new Date();

  const elapsedMs = Math.max(0, now.getTime() - regDate.getTime());
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const trialDaysRemaining = Math.max(0, CONSOLIDATED_BILLING_RULES.trialDays - elapsedDays);
  const isTrialActive = trialDaysRemaining > 0;

  const validStudentCount = Math.max(0, Math.floor(params.activeStudentCount));
  const validDays = Math.max(0, Math.floor(params.billedDays));
  const billableDays = isTrialActive ? 0 : validDays;

  const totalAmountPaise = validStudentCount * billableDays * CONSOLIDATED_BILLING_RULES.ratePerStudentPerDayPaise;
  const totalAmountRupees = totalAmountPaise / 100;

  return {
    schoolId: params.schoolId,
    invoiceNumber: `INV-BC-${params.schoolId.slice(0, 8).toUpperCase()}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`,
    activeStudentCount: validStudentCount,
    billedDays: validDays,
    ratePerStudentPerDayPaise: CONSOLIDATED_BILLING_RULES.ratePerStudentPerDayPaise,
    totalAmountPaise,
    totalAmountRupees,
    currency: 'INR',
    payerRole: 'admin',
    trialDaysRemaining,
    isTrialActive,
    generatedAt: now.toISOString(),
    status: isTrialActive ? 'trial' : 'pending',
  };
}

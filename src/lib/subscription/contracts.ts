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

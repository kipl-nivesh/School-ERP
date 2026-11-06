import type { PrimaryRole } from './roles';
import type { PermissionId, SecurityPermission } from './permissions';

export type AccountStatus = 'invited' | 'active' | 'suspended' | 'disabled';
export type AdminPrivilegeTier = 'ordinary' | 'super_admin';
export type LoginMethodId = 'email_password' | 'student_registration_pin' | 'parent_registration_pin';
export type AssuranceLevel = 'aal1' | 'aal2';
export interface RoleAssignment {
  readonly id: string;
  readonly profileId: string;
  readonly role: PrimaryRole;
  readonly status: 'active' | 'revoked';
  readonly validFrom: number;
  readonly validUntil: number | null;
  readonly permissions: readonly PermissionId[];
}
export interface SuperAdminPrivilege {
  readonly tier: 'super_admin';
  readonly profileId: string;
  readonly status: 'active' | 'revoked';
  readonly validFrom: number;
  readonly validUntil: number | null;
}
export interface ActiveRoleContext {
  readonly sessionId: string;
  readonly profileId: string;
  readonly role: PrimaryRole;
  readonly assignmentId: string;
  readonly version: number;
  readonly currentVersion: number;
  readonly expiresAt: number;
  readonly revoked: boolean;
}

declare const verifiedServerContext: unique symbol;
/**
 * Opaque INPUT to policy evaluation, not proof that an object/JWT is valid.
 * Only a future server adapter, AFTER actual provider verification + live DB lookups,
 * may supply this type. No constructor/parser/identity provider exists in Step 8.
 * Never cast request JSON to this type. Type assertions are not authentication.
 * All timestamps are epoch milliseconds; the caller supplies the trusted current time.
 */
export interface VerifiedServerContext {
  readonly [verifiedServerContext]: true;
  readonly source: 'verified-server-session';
  readonly profileId: string;
  readonly accountStatus: AccountStatus;
  readonly credentialResetRequired: boolean;
  readonly authorizationVersion: number;
  readonly currentAuthorizationVersion: number;
  readonly session: {
    readonly id: string;
    readonly profileId: string;
    readonly verifiedAt: number;
    readonly authenticatedAt: number;
    readonly expiresAt: number;
    readonly revoked: boolean;
    readonly assurance: AssuranceLevel;
    readonly reauthenticatedAt: number | null;
  };
  readonly activeRole: ActiveRoleContext;
  readonly assignments: readonly RoleAssignment[];
  readonly superAdminPrivilege?: SuperAdminPrivilege | null;
}
export interface UntrustedClientClaims {
  readonly source: 'untrusted-client';
  readonly role?: unknown;
  readonly privilege?: unknown;
  readonly profileId?: unknown;
}
export type PolicyContext = VerifiedServerContext | UntrustedClientClaims | null | undefined;
export type DenialReason = 'unverified_identity' | 'invalid_context' | 'inactive_account' |
  'reset_required' | 'invalid_session' | 'expired_session' | 'stale_authorization' |
  'unknown_role' | 'inactive_role' | 'unknown_permission' | 'permission_denied' |
  'mfa_required' | 'reauthentication_required' | 'invalid_target' | 'approval_required' |
  'last_admin' | 'last_super_admin' | 'relationship_denied' | 'immutable_record' | 'integrity_required';
export type PolicyDecision = { readonly allowed: true } | { readonly allowed: false; readonly reason: DenialReason };
export type AuthenticationResult =
  | { readonly state: 'unauthenticated' }
  | { readonly state: 'invalid_credentials' }
  | { readonly state: 'throttled'; readonly retryAfterSeconds: number }
  | { readonly state: 'mfa_required' }
  | { readonly state: 'reset_required' }
  | { readonly state: 'integration_unavailable' }
  | { readonly state: 'authenticated'; readonly identity: VerifiedServerContext };
// No Step 8 function returns an authenticated result or creates a session.

export interface VerifiedGuardianRelationship {
  readonly guardianProfileId: string;
  readonly studentId: string;
  readonly status: 'verified' | 'pending' | 'revoked';
  readonly validFrom: number;
  readonly validUntil: number | null;
  readonly academicAccess: boolean;
  readonly feeAccess: boolean;
}
/** Metadata only; contains neither a PIN nor a hash and performs no credential verification. */
export interface PinCredentialBinding {
  readonly identityProfileId: string;
  readonly credentialId: string;
  readonly role: 'student' | 'parent';
  readonly method: 'student_registration_pin' | 'parent_registration_pin';
  readonly status: 'active' | 'revoked';
}
export interface SecurityChangeTarget {
  readonly profileId: string;
  readonly role?: unknown;
  readonly isAdmin?: boolean;
  readonly isSuperAdmin?: boolean;
  /** Live count resolved on the server, ultimately checked under a DB lock. */
  readonly activeAdminCount?: number;
  readonly activeSuperAdminCount?: number;
  /** Independent approval resolved/verified by the server, never a request-body boolean. */
  readonly independentApproverProfileId?: string | null;
}
export interface SecurityChangeRequest {
  readonly permission: SecurityPermission;
  readonly target: SecurityChangeTarget;
}
export interface RecordMutationEvidence {
  readonly permission: 'fees.write' | 'payments.record' | 'expenses.write';
  readonly kind: 'audit' | 'financial';
  readonly state: 'draft' | 'issued' | 'settled';
  readonly operation: 'update' | 'delete' | 'append_correction';
  /** Future transactional validator evidence, not supplied by a client. */
  readonly integrityVerified: boolean;
}

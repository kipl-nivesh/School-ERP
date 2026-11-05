import type { FamilyInputResult, FamilyRole } from './input-contracts';
import { isBoundProviderSubject, resolveInitialParent } from './parent-identity';
import type { ProviderSubject, TrustedParentLookupSnapshot } from './parent-identity';
import { credentialBindingMatches } from './login-methods';
import { evaluateDashboardAccess, evaluateParentChildAccess } from './authorization';
import type { PinCredentialBinding, VerifiedServerContext, VerifiedGuardianRelationship } from './types';

export const LIVE_AUTHENTICATION_ENABLED = false as const;
type AcceptedInput = Extract<FamilyInputResult, { accepted: true }>;
declare const trustedIdentity: unique symbol;
declare const admittedAttempt: unique symbol;
declare const verifiedCredential: unique symbol;
declare const verifiedProviderSession: unique symbol;

export interface AttemptBinding {
  readonly attemptId: string;
  readonly registration: string;
  readonly profileId: string;
  readonly role: FamilyRole;
  readonly provider: ProviderSubject;
}
/** No constructor exists. Future adapter must resolve live protected school facts. */
export interface TrustedFamilyIdentity extends AttemptBinding {
  readonly [trustedIdentity]: true;
  readonly source: 'trusted-school-identity';
  readonly studentId: string;
  readonly studentProfileId: string;
  readonly studentProvider: ProviderSubject;
  readonly accountStatus: 'active' | 'suspended' | 'disabled' | 'invited';
  readonly studentStatus: 'active' | 'withdrawn' | 'inactive';
  readonly provisionedByTier: 'super_admin';
  readonly provisioningStatus: 'approved' | 'pending' | 'revoked';
  readonly credentialResetRequired: boolean;
  readonly version: number;
  readonly currentVersion: number;
  readonly credentialVersion: number;
  readonly currentCredentialVersion: number;
  readonly credential: PinCredentialBinding;
  readonly observedAt: number;
  readonly expiresAt: number;
  readonly parentLookup: TrustedParentLookupSnapshot | null;
}
export interface DurableAttemptAdmission extends AttemptBinding {
  readonly [admittedAttempt]: true;
  readonly source: 'durable-limiter';
  readonly decision: 'admitted' | 'rejected' | 'unavailable';
  readonly durable: true;
  readonly policyId: string;
  readonly admittedAt: number;
  readonly expiresAt: number;
}
export interface ApprovedCredentialEvidence extends AttemptBinding {
  readonly [verifiedCredential]: true;
  readonly source: 'approved-provider';
  readonly outcome: 'verified' | 'rejected' | 'unavailable';
  readonly credentialId: string;
  readonly credentialVersion: number;
  readonly verifiedAt: number;
  readonly expiresAt: number;
}
export interface VerifiedProviderSessionEvidence extends AttemptBinding {
  readonly [verifiedProviderSession]: true;
  readonly source: 'verified-provider-session';
  /** Cryptographic checks by a future adapter, never a request-body flag. */
  readonly signatureVerified: true;
  readonly audience: readonly string[];
  readonly sessionId: string;
  readonly authenticatedAt: number;
  readonly verifiedAt: number;
  readonly expiresAt: number;
  readonly revoked: boolean;
}
export interface ProviderVerificationPolicy { readonly issuer: string; readonly audience: string }
export interface FutureFamilyProviderAdapter {
  // Declaration only: no network client, secret verifier or issuer is implemented.
  verifySession(): Promise<VerifiedProviderSessionEvidence | null>;
}
export type ProviderFailureCategory = 'unavailable' | 'invalid_credentials' | 'throttled' | 'invalid_session' | 'revoked' | 'stale_context';
export interface AuthenticationAttemptEvidence {
  readonly attemptId: string;
  readonly input: FamilyInputResult;
  readonly identity?: TrustedFamilyIdentity | null;
  readonly admission?: DurableAttemptAdmission | null;
  readonly credential?: ApprovedCredentialEvidence | null;
  readonly session?: VerifiedProviderSessionEvidence | null;
  readonly context?: VerifiedServerContext | null;
  readonly relationship?: VerifiedGuardianRelationship | null;
  readonly parentPurpose?: 'academic' | 'fees';
  /** Current relationship version from the same live authorization read, not the client. */
  readonly liveRelationshipVersion?: number;
}
export type AuthenticationContractStage = 'input_received' | 'input_format_accepted' | 'trusted_identity_resolved' |
  'attempt_admitted' | 'credential_verified' | 'provider_session_established' | 'session_evidence_verified' | 'live_context_authorized';
export type AuthenticationContractResult =
  | { readonly state: 'denied'; readonly reason: 'invalid_input' | 'missing_identity' | 'invalid_identity' | 'attempt_denied' | 'credential_unverified' | 'invalid_provider_session' | 'context_denied'; readonly completed: readonly AuthenticationContractStage[]; readonly liveAuthenticationEnabled: false }
  | { readonly state: 'contract_access_granted'; readonly completed: readonly AuthenticationContractStage[]; readonly liveAuthenticationEnabled: false };
const time = (n: number) => Number.isSafeInteger(n) && n >= 0;
const version = (n: number) => Number.isSafeInteger(n) && n > 0;
const sameProvider = (a: ProviderSubject, b: ProviderSubject) => isBoundProviderSubject(a) && isBoundProviderSubject(b) && a.issuer === b.issuer && a.subject === b.subject;
const windowValid = (at: number, expires: number, now: number) => time(at) && at <= now && time(expires) && expires > now;
const bound = (a: AttemptBinding, b: AttemptBinding) => a.attemptId === b.attemptId && a.registration === b.registration &&
  a.profileId === b.profileId && a.role === b.role && sameProvider(a.provider, b.provider);

/**
 * Deterministic ordered evidence assessment ONLY. Does not issue or verify a session.
 * Even contract_access_granted is a local model result, never AuthenticationResult/authenticated.
 * Brands and source strings are not runtime provenance checks; never deserialize client JSON here.
 */
export function evaluateAuthenticationAttempt(e: AuthenticationAttemptEvidence, policy: ProviderVerificationPolicy, now: number): AuthenticationContractResult {
  const completed: AuthenticationContractStage[] = ['input_received'];
  const deny = (reason: Extract<AuthenticationContractResult, { state: 'denied' }>['reason']): AuthenticationContractResult =>
    ({ state: 'denied', reason, completed: Object.freeze([...completed]), liveAuthenticationEnabled: false });
  if (!e || !time(now) || !e.attemptId || !e.input || e.input.accepted !== true) return deny('invalid_input');
  const input: AcceptedInput = e.input;
  if ((input.role !== 'student' && input.role !== 'parent') || !input.registration || !input.policyId) return deny('invalid_input');
  completed.push('input_format_accepted');
  const id = e.identity;
  if (!id || id.source !== 'trusted-school-identity') return deny('missing_identity');
  if (id.attemptId !== e.attemptId || id.role !== input.role || id.registration !== input.registration || !id.profileId ||
    !id.studentId || !id.studentProfileId || !isBoundProviderSubject(id.provider) || !isBoundProviderSubject(id.studentProvider) ||
    id.accountStatus !== 'active' || id.studentStatus !== 'active' || id.provisionedByTier !== 'super_admin' ||
    id.provisioningStatus !== 'approved' || id.credentialResetRequired !== false || !version(id.version) || id.version !== id.currentVersion ||
    !version(id.credentialVersion) || id.credentialVersion !== id.currentCredentialVersion || !windowValid(id.observedAt, id.expiresAt, now) ||
    !id.credential || !credentialBindingMatches(input.role === 'parent' ? 'parent_registration_pin' : 'student_registration_pin', id.profileId, id.credential)) return deny('invalid_identity');
  let resolvedRelationshipVersion: number | null = null;
  if (id.role === 'parent') {
    const resolved = resolveInitialParent(id.parentLookup, input.registration, now);
    if (resolved.kind !== 'resolved_contract' || resolved.profileId !== id.profileId || resolved.studentId !== id.studentId ||
      !sameProvider(resolved.provider, id.provider) || id.parentLookup?.student.profileId !== id.studentProfileId ||
      !sameProvider(id.parentLookup.student.provider, id.studentProvider)) return deny('invalid_identity');
    resolvedRelationshipVersion = resolved.relationshipVersion;
  } else if (id.parentLookup !== null || id.profileId !== id.studentProfileId || !sameProvider(id.provider, id.studentProvider)) return deny('invalid_identity');
  completed.push('trusted_identity_resolved');
  const admission = e.admission;
  if (!admission || admission.source !== 'durable-limiter' || admission.decision !== 'admitted' || admission.durable !== true ||
    !admission.policyId || !bound(id, admission) || !windowValid(admission.admittedAt, admission.expiresAt, now) || admission.admittedAt < id.observedAt) return deny('attempt_denied');
  completed.push('attempt_admitted');
  const credential = e.credential;
  if (!credential || credential.source !== 'approved-provider' || credential.outcome !== 'verified' || !bound(id, credential) ||
    credential.credentialId !== id.credential.credentialId || credential.credentialVersion !== id.credentialVersion ||
    !windowValid(credential.verifiedAt, credential.expiresAt, now) || credential.verifiedAt < admission.admittedAt) return deny('credential_unverified');
  completed.push('credential_verified');
  const session = e.session;
  if (!session || session.source !== 'verified-provider-session' || !session.sessionId || !bound(id, session)) return deny('invalid_provider_session');
  completed.push('provider_session_established');
  if (!policy || !policy.issuer || !policy.audience || session.provider.issuer !== policy.issuer || !Array.isArray(session.audience) ||
    !session.audience.includes(policy.audience) || session.signatureVerified !== true || session.revoked !== false ||
    !windowValid(session.verifiedAt, session.expiresAt, now) || !time(session.authenticatedAt) ||
    session.authenticatedAt < credential.verifiedAt || session.authenticatedAt > session.verifiedAt) return deny('invalid_provider_session');
  completed.push('session_evidence_verified');
  const context = e.context;
  if (!context || context.profileId !== id.profileId || context.activeRole?.role !== id.role || context.session?.id !== session.sessionId ||
    context.authorizationVersion !== id.version || context.session.authenticatedAt !== session.authenticatedAt ||
    context.session.verifiedAt < session.verifiedAt || context.session.expiresAt > session.expiresAt ||
    !evaluateDashboardAccess(context, id.role, now).allowed) return deny('context_denied');
  if (id.role === 'parent' && (!e.relationship || (e.parentPurpose !== 'academic' && e.parentPurpose !== 'fees') ||
    e.liveRelationshipVersion !== resolvedRelationshipVersion ||
    !evaluateParentChildAccess(context, id.studentId, e.parentPurpose, e.relationship, now).allowed)) return deny('context_denied');
  completed.push('live_context_authorized');
  return { state: 'contract_access_granted', completed: Object.freeze([...completed]), liveAuthenticationEnabled: false };
}

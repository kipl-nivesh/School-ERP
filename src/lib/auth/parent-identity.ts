import type { AccountStatus } from './types';

export interface ProviderSubject { readonly issuer: string; readonly subject: string }
export interface InitialStudentIdentity {
  readonly studentId: string;
  readonly profileId: string;
  readonly provider: ProviderSubject;
  readonly accountStatus: AccountStatus;
  readonly enrollmentStatus: 'active' | 'withdrawn' | 'inactive';
}
export interface ParentLoginCandidate {
  readonly profileId: string;
  readonly provider: ProviderSubject;
  readonly role: 'parent';
  readonly accountStatus: AccountStatus;
  readonly loginEligible: boolean;
  readonly relationshipStatus: 'verified' | 'pending' | 'revoked';
  readonly provisionedByTier?: 'super_admin' | 'admin' | string;
  readonly provisionedByRole?: 'admin';
  readonly provisioningStatus: 'approved' | 'pending' | 'revoked';
  /** Complete current reverse login-eligibility scope from trusted storage, not browser-selected children. */
  readonly loginStudentIds: readonly string[];
  readonly relationshipVersion: number;
  readonly currentRelationshipVersion: number;
}
declare const trustedParentLookup: unique symbol;
/** Future trusted server lookup input only. Brand/source cannot authenticate JSON. */
export interface TrustedParentLookupSnapshot {
  readonly [trustedParentLookup]: true;
  readonly source: 'trusted-school-lookup';
  readonly registration: string;
  readonly student: InitialStudentIdentity;
  readonly candidates: readonly ParentLoginCandidate[];
  readonly complete: true;
  readonly observedAt: number;
  readonly expiresAt: number;
  readonly version: number;
  readonly currentVersion: number;
}
export interface ParentIdentityLookup {
  lookupInitialParent(registration: string): Promise<TrustedParentLookupSnapshot | null>;
}
export type ParentResolution =
  | { readonly kind: 'resolved_contract'; readonly profileId: string; readonly provider: ProviderSubject; readonly studentId: string; readonly relationshipVersion: number }
  | { readonly kind: 'denied'; readonly reason: 'missing_binding' | 'invalid_snapshot' | 'inactive_student' | 'no_eligible_parent' | 'ambiguous_parent' | 'inactive_parent' | 'inconsistent_relationship' | 'stale_relationship' };
const validTime = (n: number) => Number.isSafeInteger(n) && n >= 0;
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
export const isBoundProviderSubject = (p: ProviderSubject | null | undefined): p is ProviderSubject =>
  !!p && typeof p.issuer === 'string' && p.issuer.length > 0 && typeof p.subject === 'string' && p.subject.length > 0;

/** Pure cardinality decision over assumed trusted lookup evidence; does NOT look up or authenticate anyone. */
export function resolveInitialParent(snapshot: TrustedParentLookupSnapshot | null | undefined, registration: string, now: number): ParentResolution {
  const deny = (reason: Extract<ParentResolution, { kind: 'denied' }>['reason']): ParentResolution => ({ kind: 'denied', reason });
  if (!snapshot || snapshot.source !== 'trusted-school-lookup') return deny('missing_binding');
  if (!validTime(now) || snapshot.complete !== true || !registration || snapshot.registration !== registration ||
    !snapshot.student || !Array.isArray(snapshot.candidates) || !validTime(snapshot.observedAt) || snapshot.observedAt > now ||
    !validTime(snapshot.expiresAt) || snapshot.expiresAt <= now || !positive(snapshot.version) || snapshot.version !== snapshot.currentVersion) return deny('invalid_snapshot');
  const student = snapshot.student;
  if (!student.studentId || !student.profileId || !isBoundProviderSubject(student.provider)) return deny('missing_binding');
  if (student.accountStatus !== 'active' || student.enrollmentStatus !== 'active') return deny('inactive_student');
  if (snapshot.candidates.some(c => !c || !c.profileId || typeof c.loginEligible !== 'boolean') ||
    new Set(snapshot.candidates.map(c => c.profileId)).size !== snapshot.candidates.length) return deny('inconsistent_relationship');
  const eligible = snapshot.candidates.filter(c => c.loginEligible === true);
  if (eligible.length === 0) return deny('no_eligible_parent');
  if (eligible.length !== 1) return deny('ambiguous_parent');
  const parent = eligible[0];
  if (parent.accountStatus !== 'active') return deny('inactive_parent');
  if (!isBoundProviderSubject(parent.provider) || parent.profileId === student.profileId ||
    (parent.provider.issuer === student.provider.issuer && parent.provider.subject === student.provider.subject)) return deny('missing_binding');
  if (parent.role !== 'parent' || parent.relationshipStatus !== 'verified' ||
    (parent.provisionedByTier !== 'super_admin' && parent.provisionedByTier !== 'admin' && parent.provisionedByRole !== 'admin') ||
    parent.provisioningStatus !== 'approved' || !Array.isArray(parent.loginStudentIds) || parent.loginStudentIds.length !== 1 ||
    parent.loginStudentIds[0] !== student.studentId) return deny('inconsistent_relationship');
  if (!positive(parent.relationshipVersion) || parent.relationshipVersion !== parent.currentRelationshipVersion) return deny('stale_relationship');
  return { kind: 'resolved_contract', profileId: parent.profileId, provider: { ...parent.provider }, studentId: student.studentId, relationshipVersion: parent.relationshipVersion };
}

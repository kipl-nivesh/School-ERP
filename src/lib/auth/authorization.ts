import { isPrimaryRole } from './roles';
import { getPermissionCeiling, isPermissionId, isSecurityPermission } from './permissions';
import type { PermissionId } from './permissions';
import type { DenialReason, PolicyContext, PolicyDecision, RecordMutationEvidence, SecurityChangeRequest, VerifiedGuardianRelationship, VerifiedServerContext } from './types';

/** PURE POLICY ONLY: never validates a JWT, proves guardianship, grants a role, or writes data. */
const deny = (reason: DenialReason): PolicyDecision => ({ allowed: false, reason });
const allow: PolicyDecision = Object.freeze({ allowed: true });
const time = (value: number) => Number.isSafeInteger(value) && value >= 0;
const current = (from: number, until: number | null, now: number) => time(from) && from <= now &&
  (until === null || (time(until) && until > now));
const validVersion = (value: number) => Number.isSafeInteger(value) && value > 0;

function baseDecision(context: PolicyContext, now: number): PolicyDecision {
  if (!context || context.source !== 'verified-server-session') return deny('unverified_identity');
  if (!time(now) || !context.profileId || !context.session || !context.activeRole || !Array.isArray(context.assignments)) return deny('invalid_context');
  if (context.assignments.some(a => !a || typeof a.id !== 'string' || !a.id || typeof a.profileId !== 'string') ||
    new Set(context.assignments.map(a => a.id)).size !== context.assignments.length) return deny('invalid_context');
  if (context.accountStatus !== 'active') return deny('inactive_account');
  if (context.credentialResetRequired !== false) return deny('reset_required');
  const session = context.session;
  if (!session.id || session.profileId !== context.profileId || session.revoked !== false ||
    !time(session.authenticatedAt) || session.authenticatedAt > now || !time(session.verifiedAt) ||
    session.verifiedAt < session.authenticatedAt || session.verifiedAt > now || !time(session.expiresAt) ||
    (session.assurance !== 'aal1' && session.assurance !== 'aal2')) return deny('invalid_session');
  if (session.expiresAt <= now) return deny('expired_session');
  if (!validVersion(context.authorizationVersion) || context.authorizationVersion !== context.currentAuthorizationVersion) return deny('stale_authorization');
  const active = context.activeRole;
  if (!isPrimaryRole(active.role)) return deny('unknown_role');
  if (active.profileId !== context.profileId || active.sessionId !== session.id || active.revoked !== false ||
    !time(active.expiresAt) || active.expiresAt <= now) return deny('invalid_context');
  if (!validVersion(active.version) || active.version !== active.currentVersion) return deny('stale_authorization');
  const assignment = context.assignments.find(a => a.id === active.assignmentId && a.profileId === context.profileId && a.role === active.role);
  if (!assignment || assignment.status !== 'active' || !current(assignment.validFrom, assignment.validUntil, now) || !Array.isArray(assignment.permissions)) return deny('inactive_role');
  if (active.role === 'admin' && session.assurance !== 'aal2') return deny('mfa_required');
  const privilege = context.superAdminPrivilege;
  if (privilege) {
    if (privilege.tier !== 'super_admin' || privilege.profileId !== context.profileId || privilege.status !== 'active' ||
      !current(privilege.validFrom, privilege.validUntil, now)) return deny('stale_authorization');
    if (!context.assignments.some(a => a.profileId === context.profileId && a.role === 'admin' && a.status === 'active' && current(a.validFrom, a.validUntil, now))) return deny('inactive_role');
    if (session.assurance !== 'aal2') return deny('mfa_required');
  }
  return allow;
}

/** Caller must obtain context from actual server verification; no public route uses this evaluator yet. */
export function evaluatePermission(context: PolicyContext, permission: unknown, now: number): PolicyDecision {
  const base = baseDecision(context, now);
  if (!base.allowed) return base;
  if (!isPermissionId(permission)) return deny('unknown_permission');
  const verified = context as VerifiedServerContext; // narrowed after baseDecision; never a request parser
  if (!getPermissionCeiling(verified.activeRole.role).includes(permission)) return deny('permission_denied');
  const activeAssignment = verified.assignments.find(a => a.id === verified.activeRole.assignmentId && a.profileId === verified.profileId && a.role === verified.activeRole.role);
  if (!activeAssignment?.permissions.includes(permission)) return deny('permission_denied');
  if (isSecurityPermission(permission) || permission === 'reports.export' || permission === 'marks.publish') {
    if (verified.session.assurance !== 'aal2') return deny('mfa_required');
    const at = verified.session.reauthenticatedAt;
    if (at === null || !time(at) || at > now || now - at > 10 * 60 * 1000) return deny('reauthentication_required');
  }
  return allow;
}

export function evaluateDashboardAccess(context: PolicyContext, role: unknown, now: number): PolicyDecision {
  if (!isPrimaryRole(role)) return deny('unknown_role');
  return evaluatePermission(context, `dashboard.${role}.view`, now);
}

export function evaluateSecurityChange(context: PolicyContext, request: SecurityChangeRequest, now: number): PolicyDecision {
  if (!request || !isPermissionId(request.permission) || !isSecurityPermission(request.permission)) return deny('unknown_permission');
  const permission = evaluatePermission(context, request.permission, now);
  if (!permission.allowed) return permission;
  const verified = context as VerifiedServerContext, target = request.target;
  if (!target || !target.profileId || target.profileId === verified.profileId ||
    (target.role !== undefined && !isPrimaryRole(target.role))) return deny('invalid_target');
  if ((request.permission === 'security.roles.assign' || request.permission === 'security.roles.revoke') && !isPrimaryRole(target.role)) return deny('invalid_target');
  const isAdminTarget = target.role === 'admin' || target.isAdmin === true || target.isSuperAdmin === true;
  if (isAdminTarget) {
    const adminCount = target.activeAdminCount ?? target.activeSuperAdminCount;
    if (request.permission === 'security.accounts.suspend' || request.permission === 'security.roles.revoke' || request.permission === 'security.credentials.reset') {
      if (adminCount !== undefined && (!Number.isSafeInteger(adminCount) || adminCount <= 1)) {
        return deny(target.isSuperAdmin ? 'last_super_admin' : 'last_admin');
      }
    }
  }
  return allow;
}

export function evaluateParentChildAccess(context: PolicyContext, studentId: string,
  purpose: 'academic' | 'fees', relationship: VerifiedGuardianRelationship | null, now: number): PolicyDecision {
  if (purpose !== 'academic' && purpose !== 'fees') return deny('relationship_denied');
  const permission = evaluatePermission(context, purpose === 'academic' ? 'children.academics.read' : 'children.fees.read', now);
  if (!permission.allowed) return permission;
  const verified = context as VerifiedServerContext;
  // Super Admin module review is a separate Admin query, never a fabricated Parent identity/link.
  if (verified.activeRole.role !== 'parent' || !relationship || !studentId || relationship.studentId !== studentId ||
    relationship.guardianProfileId !== verified.profileId || relationship.status !== 'verified' ||
    !current(relationship.validFrom, relationship.validUntil, now) ||
    (purpose === 'academic' ? relationship.academicAccess !== true : relationship.feeAccess !== true)) return deny('relationship_denied');
  return allow;
}

export function evaluateRecordMutation(context: PolicyContext, evidence: RecordMutationEvidence, now: number): PolicyDecision {
  if (!evidence || !['fees.write','payments.record','expenses.write'].includes(evidence.permission)) return deny('unknown_permission');
  const permission = evaluatePermission(context, evidence.permission, now);
  if (!permission.allowed) return permission;
  if (evidence.kind === 'audit') return deny('immutable_record');
  if (evidence.kind !== 'financial' || !['draft','issued','settled'].includes(evidence.state) ||
    !['update','delete','append_correction'].includes(evidence.operation)) return deny('invalid_target');
  if (evidence.state !== 'draft' && evidence.operation !== 'append_correction') return deny('immutable_record');
  if (evidence.integrityVerified !== true) return deny('integrity_required');
  return allow; // Future DB command must still lock/revalidate balances and append immutable audit.
}

export const isKnownPolicyPermission = (value: unknown): value is PermissionId => isPermissionId(value);

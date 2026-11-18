import 'server-only';
import { bindParentPortalSession, bindStudentPortalSession, matchParentLoginBinding, verifyPortalSupabaseSession } from './portal-session';
import type { VerifiedPortalSession } from './portal-session';
import type { ProviderSubject, TrustedParentLookupSnapshot } from './parent-identity';
import { validateGuardianRelationship } from '../parent/dashboard-repository';
import type { VerifiedParentDashboardRequest } from '../parent/dashboard-repository';

export type PortalCallback = { transactionId: string; state: string; code: string };
type Role = 'student' | 'parent';
type AuthReader = Parameters<typeof verifyPortalSupabaseSession>[0];
type SessionLookup = Parameters<typeof verifyPortalSupabaseSession>[1]['readLiveSession'];
type StudentBinding = NonNullable<Parameters<typeof bindStudentPortalSession>[1]>;

export type NativePortalExchange = {
  transactionId: string;
  role: Role;
  purpose: 'login';
  consumed: boolean;
  createdAt: number;
  expiresAt: number;
  expectedProfileId: string;
  expectedSchoolId: string;
  provider: ProviderSubject;
  /** Request-bound native SDK client, never a JSON object supplied by the browser. */
  auth: AuthReader;
};

export type PortalContextEvidence = {
  sessionId: string; profileId: string; schoolId: string; role: Role;
  version: number; currentVersion: number; expiresAt: number; revoked: boolean;
};

export type StudentAuthenticationState = {
  binding: StudentBinding;
  context: PortalContextEvidence;
  /** Derived by the trusted verifier from the same code exchange and consumed PIN proof. */
  pin: {
    signatureVerified: boolean; consumed: boolean; transactionId: string;
    verifiedAt: number; expiresAt: number; credentialVersion: number;
  };
  credential: {
    version: number; status: 'active' | 'locked' | 'revoked';
    lockedUntil: number | null; expiresAt: number | null;
  };
};

export type ParentAuthenticationState = {
  request: VerifiedParentDashboardRequest;
  context: PortalContextEvidence;
  login: { schoolId: string; registration: string; snapshot: TrustedParentLookupSnapshot };
};

export interface PortalAuthenticationDependencies {
  nativeIssuer: string;
  studentProviderIssuer: string;
  /**
   * Atomically consume the server-held state and PKCE transaction. Exchange only
   * with native Supabase Auth. Validate the upstream provider identity and correlate
   * Student PIN proof with this exact exchange. No local password or PIN fallback.
   */
  exchange(role: Role, callback: PortalCallback): Promise<NativePortalExchange | null>;
  readLiveSession: SessionLookup;
  /** Recheck the current credential, identity, context and proof in trusted storage. */
  readStudent(session: VerifiedPortalSession, transactionId: string): Promise<StudentAuthenticationState | null>;
  /** Load the canonical guardian, complete current relationships and effective grants. */
  readParent(session: VerifiedPortalSession): Promise<ParentAuthenticationState | null>;
  /** Compensate only this exchange's issued native session after any failed binding. */
  revokeIssuedSession(exchange: NativePortalExchange): Promise<boolean>;
  now?: () => number;
}

const denied = { kind: 'denied' } as const;
const blocked = { kind: 'blocked', reason: 'session_revocation_unconfirmed' } as const;
const timestamp = (value: number) => Number.isSafeInteger(value) && value >= 0;
const positive = (value: number) => Number.isSafeInteger(value) && value > 0;
const sameProvider = (a: ProviderSubject, b: ProviderSubject) =>
  !!a && !!b && a.issuer === b.issuer && a.subject === b.subject;

function validCallback(callback: PortalCallback) {
  return callback && ['transactionId', 'state', 'code'].every(key => {
    const value = callback[key as keyof PortalCallback];
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,512}$/.test(value);
  });
}

function currentContext(context: PortalContextEvidence, session: VerifiedPortalSession, now: number) {
  return context && context.role === session.role && context.sessionId === session.sessionId &&
    context.profileId === session.profileId && context.schoolId === session.schoolId &&
    context.revoked === false && positive(context.version) && context.version === context.currentVersion &&
    timestamp(context.expiresAt) && context.expiresAt > now && session.expiresAt > now;
}

/** Server composition only. No production factory or login route installs these dependencies. */
export function createPortalAuthenticationAdapter(deps: PortalAuthenticationDependencies) {
  const now = deps.now ?? Date.now;

  async function finish(role: Role, callback: PortalCallback) {
    if (!validCallback(callback)) return denied;
    let exchange: NativePortalExchange | null = null;
    let accepted = false;
    const result = await (async () => {
    try {
      exchange = await deps.exchange(role, callback);
      if (!exchange) return denied;
      const observed = now();
      if (exchange.transactionId !== callback.transactionId || exchange.role !== role || exchange.purpose !== 'login' ||
        exchange.consumed !== true || !timestamp(exchange.createdAt) || exchange.createdAt > observed ||
        !timestamp(exchange.expiresAt) || exchange.expiresAt <= observed ||
        exchange.expiresAt - exchange.createdAt > 5 * 60 * 1000) return denied;

      const session = await verifyPortalSupabaseSession(exchange.auth, {
        issuer: deps.nativeIssuer, readLiveSession: deps.readLiveSession,
      }, role, now);
      if (!session || session.profileId !== exchange.expectedProfileId || session.schoolId !== exchange.expectedSchoolId) return denied;

      if (role === 'student') {
        const state = await deps.readStudent(session, exchange.transactionId);
        const checked = now();
        if (!state || !currentContext(state.context, session, checked) ||
          state.pin.signatureVerified !== true || state.pin.consumed !== true ||
          state.pin.transactionId !== exchange.transactionId || !timestamp(state.pin.verifiedAt) ||
          state.pin.verifiedAt < exchange.createdAt || state.pin.verifiedAt > checked ||
          !timestamp(state.pin.expiresAt) || state.pin.expiresAt <= checked ||
          checked - state.pin.verifiedAt > 2 * 60 * 1000 ||
          !positive(state.credential.version) || state.credential.status !== 'active' ||
          (state.credential.lockedUntil !== null && (!timestamp(state.credential.lockedUntil) || state.credential.lockedUntil > checked)) ||
          (state.credential.expiresAt !== null && (!timestamp(state.credential.expiresAt) || state.credential.expiresAt <= checked)) ||
          state.pin.credentialVersion !== state.credential.version ||
          state.binding.currentCredentialVersion !== state.credential.version ||
          !sameProvider(state.binding.provider, exchange.provider)) return denied;
        const bound = bindStudentPortalSession(session, state.binding, deps.studentProviderIssuer, checked);
        if (!bound || exchange.expiresAt <= now() || session.expiresAt <= now()) return denied;
        accepted = true;
        return { kind: 'student', session, binding: bound } as const;
      }

      const state = await deps.readParent(session);
      const checked = now();
      if (!state || !currentContext(state.context, session, checked) ||
        !matchParentLoginBinding(session, state.login, state.login.registration, exchange.provider, checked)) return denied;
      const request = bindParentPortalSession(session, state.request, exchange.provider, checked);
      if (!request || !request.permissions.includes('dashboard.parent.view') ||
        new Set(request.relationships.map(link => link.id)).size !== request.relationships.length ||
        request.relationships.some(link => link.guardianId !== request.guardian.id) ||
        !request.relationships.some(link => link.guardianId === request.guardian.id &&
          validateGuardianRelationship(link, session.schoolId, checked, request.permissions).valid) ||
        exchange.expiresAt <= now() || session.expiresAt <= now()) return denied;
      accepted = true;
      return { kind: 'parent', session, request } as const;
    } catch {
      return denied;
    }
    })();
    if (exchange && !accepted) {
      try {
        if (!await deps.revokeIssuedSession(exchange)) return blocked;
      } catch { return blocked; }
    }
    return result;
  }

  return {
    completeStudent: (callback: PortalCallback) => finish('student', callback),
    completeParent: (callback: PortalCallback) => finish('parent', callback),
  };
}

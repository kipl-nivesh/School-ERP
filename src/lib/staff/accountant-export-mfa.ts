import { evaluatePermission } from '../auth/authorization';
import type { VerifiedServerContext } from '../auth/types';

const freshWindowMs = 10 * 60 * 1000;

export function accountantExportAuthentication(amr: readonly unknown[], now: number) {
  const timestamp = (method: string) => {
    let latest: number | null = null;
    for (const entry of amr) {
      if (!entry || typeof entry !== 'object') continue;
      const value = entry as { method?: unknown; timestamp?: unknown };
      if (value.method !== method || typeof value.timestamp !== 'number' || !Number.isSafeInteger(value.timestamp)) continue;
      const ms = value.timestamp * 1000;
      if (ms > now || ms < now - freshWindowMs || ms <= 0) continue;
      if (latest === null || ms > latest) latest = ms;
    }
    return latest;
  };
  const passwordAt = timestamp('password');
  const totpAt = timestamp('totp');
  return { passwordAt, freshMfa: passwordAt !== null && totpAt !== null && totpAt >= passwordAt };
}

/** Eligibility to start Auth step-up only. Export still requires the full policy and RPC checks. */
export function accountantMayRequestExport(context: VerifiedServerContext, now: number): boolean {
  if (context.activeRole.role !== 'accountant' || !context.schoolId ||
      !evaluatePermission(context, 'reports.read', now).allowed ||
      !evaluatePermission(context, 'fees.read', now).allowed) return false;
  return context.assignments.some(row => row.id === context.activeRole.assignmentId &&
    row.profileId === context.profileId && row.role === 'accountant' && row.permissions.includes('reports.export'));
}

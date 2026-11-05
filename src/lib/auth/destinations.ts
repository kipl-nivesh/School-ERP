import { PRIMARY_ROLES } from './roles';
import type { PrimaryRole } from './roles';
import type { PolicyContext } from './types';
import { evaluateDashboardAccess } from './authorization';
export type DashboardPath = `/${PrimaryRole}/dashboard`;
export interface AuthorizedDashboardDestination { readonly role: PrimaryRole; readonly href: DashboardPath }

/** Returns navigation policy results only; never redirects or logs in a user. */
export function authorizedDashboardDestinations(context: PolicyContext, now: number): readonly AuthorizedDashboardDestination[] {
  return PRIMARY_ROLES.filter(role => evaluateDashboardAccess(context, role, now).allowed)
    .map(role => ({ role, href: `/${role}/dashboard` as DashboardPath }));
}

import assert from 'node:assert/strict';
import fs from 'node:fs';

export const paths = [
  "20261105000100_identity_foundation.sql",
  "20261105000200_school_domain.sql",
  "20261105000300_staff_security.sql",
  "20261105000400_school_admin_simplification.sql",
  "20261105000500_school_domain_rls.sql",
  "20261105000600_pin_authentication_and_rate_limiting.sql",
  "20261105000700_multi_tenant_foundation.sql",
  "20261105000800_student_subscription_foundation.sql",
  "20261105000900_school_onboarding_and_management.sql",
  "20261106001000_baseline_access_hardening.sql",
  "20261106001100_onboarding_transactions.sql",
  "20261106001200_tenant_settings.sql",
  "20261106001300_verified_identity_binding.sql",
  "20261107001400_subscription_context_scope.sql",
  "20261107001500_portal_subscription_rls.sql",
  "20261107001600_hashed_staff_invitations.sql",
  "20261111001700_financial_authorization_hardening.sql",
  "20261111001800_operational_staff_policies.sql",
  "20261111001900_atomic_student_admission.sql",
  "20261111002000_parent_access_purposes.sql",
  "20261111002100_onboarding_invitation_boundary.sql",
  "20261111002200_admission_retry_safety.sql",
  "20261111002300_academic_write_commands.sql",
  "20261111002400_academic_management.sql",
  "20261112002500_staff_recovery_scope.sql",
  "20261112002600_staff_invitation_issuance.sql"
];
export function verifyMigrationInventory() {
  assert.deepEqual(fs.readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort(), paths);
}

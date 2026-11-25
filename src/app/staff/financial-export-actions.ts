'use server';

import { evaluatePermission } from '@/lib/auth/authorization';
import { validAttendanceDate } from '@/lib/services/attendance-fields';
import { loadStaffResolution, staffClient } from '@/lib/staff/server';
import { accountantExportAuthentication, accountantMayRequestExport } from '@/lib/staff/accountant-export-mfa';
import { isStaffUuid } from '@/lib/staff/contracts';
import { parseTotpSetup } from '@/lib/staff/mfa-setup';

type ExportState = { message: string; csv?: string; factorId?: string; qrDataUri?: string; secret?: string; passwordRequired?: true };
const headers = ['number','issued','due','status','billed_paise','paid_paise','outstanding_paise'] as const;

export async function exportFinancialInvoices(_state: ExportState, form: FormData): Promise<ExportState> {
  const from = form.get('from'), to = form.get('to'), school = form.get('school');
  const intent = form.get('intent');
  if (typeof from !== 'string' || typeof to !== 'string' || !validAttendanceDate(from) ||
      !validAttendanceDate(to) || from > to || Date.parse(to) - Date.parse(from) > 365 * 86_400_000) {
    return { message: 'Select a valid issue-date range of at most one year.' };
  }
  const failed = { message: 'Export unavailable. Check your school access and financial export permission.' };
  if (!isStaffUuid(school) || (intent !== 'prepare' && intent !== 'verify')) return failed;
  try {
    const client = await staffClient(true);
    const resolve = () => loadStaffResolution(client);
    let access = await resolve();
    if (access.kind !== 'authorized' || access.context.schoolId !== school ||
      !accountantMayRequestExport(access.context, Date.now())) return failed;
    const original = access.context;
    if (intent === 'verify' || !evaluatePermission(access.context, 'reports.export', Date.now()).allowed) {
      const claims = await client.auth.getClaims();
      const jwt = claims.data?.claims;
      if (claims.error || !jwt || jwt.sub !== original.profileId || jwt.session_id !== original.session.id) return failed;
      const amr = Array.isArray(jwt.amr) ? jwt.amr : [];
      if (accountantExportAuthentication(amr, Date.now()).passwordAt === null) {
        return { message: 'Sign in again with your password, then return here to verify with your authenticator.', passwordRequired: true };
      }
      const factors = await client.auth.mfa.listFactors();
      if (factors.error) return { message: 'Authenticator details could not be loaded. Try again.' };
      const verified = factors.data.totp.filter(factor => factor.status === 'verified');
      if (intent === 'prepare') {
        if (verified.length) return { factorId: verified[0].id, message: 'Enter the code from your Brightcamp authenticator.' };
        if (factors.data.all.some(factor => factor.status === 'verified')) {
          return { message: 'Your existing MFA method does not support this export. Contact your school administrator.' };
        }
        const enrollment = await client.auth.mfa.enroll({ factorType: 'totp' });
        const setup = !enrollment.error && enrollment.data ? parseTotpSetup(enrollment.data) : undefined;
        return setup ? { ...setup, message: 'Scan the QR code or enter the setup key, then verify with a code.' } :
          { message: 'Authenticator setup was not completed. Try again or contact your school administrator.' };
      }
      const factorId = form.get('factorId'), code = form.get('code');
      if (!isStaffUuid(factorId) || !(verified.length ? verified : factors.data.all).some(factor =>
        factor.id === factorId && factor.factor_type === 'totp') ||
        (verified.length === 0 && factors.data.all.some(factor => factor.status === 'verified'))) return failed;
      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        return { factorId, message: 'Enter the six-digit authenticator code.' };
      }
      const verification = await client.auth.mfa.challengeAndVerify({ factorId, code });
      if (verification.error) return { factorId, message: 'Code verification failed. Try the current code in your authenticator.' };
      access = await resolve();
    }
    if (access.kind !== 'authorized' || access.context.schoolId !== school ||
        access.context.profileId !== original.profileId || access.context.session.id !== original.session.id ||
        !accountantMayRequestExport(access.context, Date.now()) ||
        !evaluatePermission(access.context, 'reports.export', Date.now()).allowed) return failed;
    const { data, error } = await client.rpc('export_school_finance_invoices', {
      p_school: school, p_from: from, p_to: to,
    });
    if (error?.code === '54000' || error?.code === '22023') return { message: 'Use a date range of at most one year and 500 invoices.' };
    if (error || !Array.isArray(data) || data.length > 500) return failed;
    const lines = data.map(row => headers.map(name => {
      const raw: unknown = row?.[name];
      if (typeof raw !== 'string') throw new Error('Invalid export row');
      const safe = /^[\s\p{C}]*[=+\-@]/u.test(raw) ? "'" + raw : raw;
      return '"' + safe.replaceAll('"', '""') + '"';
    }).join(','));
    return { message: `${lines.length} invoices exported.`, csv: [headers.join(','), ...lines].join('\r\n') };
  } catch { return failed; }
}

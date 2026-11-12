'use server';
import { staffClient } from '@/lib/staff/server';
import { registrationStatus } from '@/lib/onboarding/database';
export type ApplicantMfaState = { message: string; factor?: string; qr?: string };
export async function applicantMfa(_previous: ApplicantMfaState, form: FormData): Promise<ApplicantMfaState> {
  try {
    const id = form.get('registration');
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid registration');
    const status = await registrationStatus(id);
    if (status?.status !== 'pending') throw new Error('Pending application required');
    const client = await staffClient(true);
    const factors = await client.auth.mfa.listFactors();
    if (factors.error) throw new Error('Unavailable');
    if (form.get('intent') === 'enroll') {
      if (factors.data.all.some(f => f.status === 'verified')) throw new Error('Existing factor');
      const enrolled = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'School application authenticator' });
      if (enrolled.error || enrolled.data.type !== 'totp') throw new Error('Unavailable');
      const svg = enrolled.data.totp.qr_code.replace(/^data:image\/svg\+xml;utf-8,/, '');
      return { message: 'Scan the code, then verify. Operator approval is still required.', factor: enrolled.data.id, qr: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64') };
    }
    const factor = form.get('factor'), code = form.get('code');
    if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code) || typeof factor !== 'string' || !factors.data.all.some(f => f.id === factor && f.factor_type === 'totp')) throw new Error('Invalid factor');
    const verified = await client.auth.mfa.challengeAndVerify({ factorId: factor, code });
    if (verified.error) throw new Error('Unavailable');
    return { message: 'Authenticator verified. School access remains pending operator approval.' };
  } catch { return { message: 'Unable to complete authenticator setup. Sign in with your confirmed account or contact support.' }; }
}

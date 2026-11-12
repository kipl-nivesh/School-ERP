'use server';
import { staffClient } from '@/lib/staff/server';
import { validateStaffInput } from '@/lib/staff/contracts';
export async function acceptInvitation(_state: { message: string }, form: FormData) {
  try {
    const token = form.get('token');
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) throw new Error('Invalid token');
    const client = await staffClient(true);
    const email = form.get('email'), password = form.get('password');
    if (email || password) {
      if (typeof email !== 'string' || typeof password !== 'string' || !validateStaffInput(email, password, 'teacher')) throw new Error('Invalid credentials');
      const signIn = await client.auth.signInWithPassword({ email, password });
      if (signIn.error) throw new Error('Sign-in failed');
    }
    const result = await client.rpc('accept_staff_invitation', { p_token: token });
    if (result.error || result.data !== true) throw new Error('Invitation unavailable');
    return { message: 'Invitation accepted. Select your school from the staff workspace.' };
  } catch { return { message: 'Unable to accept invitation. Use the confirmed account matching the invitation, or contact your school.' }; }
}

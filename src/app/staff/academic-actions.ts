'use server';
import { staffWorkspaceWritesEnabled } from '@/lib/services/staff-workspace-policy';
import { revalidatePath } from 'next/cache';
import { getStaffAccess, staffClient } from '@/lib/staff/server';
import { executeAcademic } from '@/lib/services/academic-commands';
import type { AcademicInput } from '@/lib/services/academic-commands';

export async function saveAcademic(_state: { ok: boolean; message: string }, form: FormData) {
  if (!staffWorkspaceWritesEnabled()) return { ok: false, message: "Academic changes are unavailable during read-only recovery." };
  const field = (key: string) => typeof form.get(key) === 'string' ? String(form.get(key)).trim() : '';
  const kind = field('kind');
  if (kind !== 'attendance' && kind !== 'homework') return { ok: false, message: 'Invalid operation.' };
  const input: AcademicInput = kind === 'attendance'
    ? { kind, section: field('section'), student: field('student'), status: field('status'), remarks: field('remarks') }
    : { kind, id: field('id'), section: field('section'), subject: field('subject'), title: field('title'), description: field('description'), due: field('due'), points: Number(field('points')) };
  const ok = await executeAcademic(input, {
    context: async () => (await getStaffAccess())?.context,
    execute: async (name, args) => (await staffClient(true)).rpc(name, args),
  });
  if (ok) revalidatePath('/staff/[role]', 'page');
  return { ok, message: ok ? 'Record saved.' : 'Record could not be saved. Check your assignment, access and entries.' };
}

'use server';
import { staffWorkspaceWritesEnabled } from '@/lib/services/staff-workspace-policy';
import { revalidatePath } from 'next/cache';
import { getStaffAccess } from '@/lib/staff/server';
import { AccountantSupabaseService, SchoolAdminSupabaseService } from '@/lib/services/supabase-dal';
import type { CollectPaymentInput, NewStudentAdmissionInput } from '@/lib/domain/dashboard-contracts';

export type RecordActionState = { ok: boolean; message: string; admissionNumber?: string };
const failed: RecordActionState = { ok: false, message: 'The record could not be saved. Check your access and entries.' };
const value = (form: FormData, key: string) => typeof form.get(key) === 'string' ? String(form.get(key)).trim() : '';

export async function saveAdmission(_state: RecordActionState, form: FormData): Promise<RecordActionState> {
  const access = await getStaffAccess('admin');
  if (!access) return failed;
  const input = Object.fromEntries(['requestId','fullName','dateOfBirth','gender','classId','sectionId','guardianName','guardianPhone','guardianEmail']
    .map(key => [key, value(form,key)])) as unknown as NewStudentAdmissionInput;
  try {
    const result = await SchoolAdminSupabaseService.createStudentAdmission(access.context, input);
    if (!result.success) return failed;
    revalidatePath('/staff/admin');
    return {
      ok: true,
      admissionNumber: result.data.admissionNumber,
      message: `Admission saved: ${result.data.admissionNumber}. Portal activation is separate.`,
    };
  } catch { return failed; }
}

export async function saveCollection(_state: RecordActionState, form: FormData): Promise<RecordActionState> {
  if (!staffWorkspaceWritesEnabled()) return { ok: false, message: "Record writes are unavailable during read-only recovery." };
  const access = await getStaffAccess();
  if (!access || !['admin','accountant'].includes(access.role)) return failed;
  const amount = value(form,'amountPaise');
  if (!/^[1-9][0-9]*$/.test(amount) || !Number.isSafeInteger(Number(amount))) return failed;
  const input: CollectPaymentInput = {
    studentId: value(form,'studentId'), invoiceId: value(form,'invoiceId'), amountPaise: Number(amount),
    paymentMethod: value(form,'paymentMethod') as CollectPaymentInput['paymentMethod'],
    transactionReference: value(form,'transactionReference'), idempotencyKey: value(form,'idempotencyKey'), notes: value(form,'notes'),
  };
  try {
    const result = await AccountantSupabaseService.collectPayment(access.context, input);
    if (!result.success) return failed;
    revalidatePath(`/staff/${access.role}`);
    return { ok: true, message: `Payment saved. Receipt: ${result.data.receiptNumber}. Keep the same request key when retrying this payment.` };
  } catch { return failed; }
}

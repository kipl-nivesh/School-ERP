import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isStaffUuid } from '@/lib/staff/contracts';
import { getStudentPortalAccess } from '@/lib/student/live-dashboard';
import { PrintStudentReceipt } from './print-receipt';

export const metadata = { title: 'Student receipt' };

export default async function StudentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getStudentPortalAccess();
  if (!access) redirect('/login/student');
  const { id } = await params;
  if (!isStaffUuid(id)) notFound();
  const { client, identity } = access;
  const result = await client.from('fee_payments')
    .select('school_id,student_id,receipt_number,payment_date,amount_paise,payment_method,status')
    .eq('id', id).eq('school_id', identity.school_id).eq('student_id', identity.student_id)
    .eq('status', 'settled').maybeSingle();
  const receipt = result.data;
  if (result.error || !receipt || receipt.school_id !== identity.school_id || receipt.student_id !== identity.student_id ||
      receipt.status !== 'settled' || !Number.isSafeInteger(receipt.amount_paise) || receipt.amount_paise < 0) notFound();

  return <main className="mx-auto max-w-xl space-y-5 p-6">
    <header><p>{identity.school_name}</p><h1 className="text-2xl font-semibold">Payment receipt</h1></header>
    <dl className="space-y-3">
      <div><dt>Receipt number</dt><dd>{receipt.receipt_number}</dd></div>
      <div><dt>Student</dt><dd>{identity.display_name} · {identity.registration_number}</dd></div>
      <div><dt>Paid on</dt><dd>{receipt.payment_date}</dd></div>
      <div><dt>Payment method</dt><dd>{receipt.payment_method.replaceAll('_', ' ')}</dd></div>
      <div><dt>Amount</dt><dd>₹{Math.floor(receipt.amount_paise / 100).toLocaleString('en-IN')}.{String(receipt.amount_paise % 100).padStart(2, '0')}</dd></div>
    </dl>
    <div className="flex flex-wrap gap-4 print:hidden"><Link href="/student/dashboard#fees">Back to fees</Link><PrintStudentReceipt /></div>
  </main>;
}

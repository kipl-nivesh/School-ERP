import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isStaffUuid } from '@/lib/staff/contracts';
import { getParentPortalAccess } from '@/lib/parent/server';
import { PrintStudentReceipt } from '@/app/(dashboard)/student/receipts/[id]/print-receipt';

export const metadata = { title: 'Parent payment receipt' };
export const dynamic = 'force-dynamic';

export default async function ParentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getParentPortalAccess();
  if (!access) redirect('/login/parent');

  const { id } = await params;
  if (!isStaffUuid(id)) notFound();

  const { client, identity } = access;
  const result = await client
    .from('fee_payments')
    .select('school_id,student_id,receipt_number,payment_date,amount_paise,payment_method,status')
    .eq('id', id)
    .eq('school_id', identity.school_id)
    .eq('status', 'settled')
    .maybeSingle();

  const receipt = result.data;
  if (
    result.error ||
    !receipt ||
    receipt.school_id !== identity.school_id ||
    receipt.status !== 'settled' ||
    !Number.isSafeInteger(receipt.amount_paise) ||
    receipt.amount_paise < 0
  ) {
    notFound();
  }

  const child = identity.children.find((c) => c.student_id === receipt.student_id && c.fee_access);
  if (!child) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 p-6">
      <header>
        <p>{identity.school_name}</p>
        <h1 className="text-2xl font-semibold">Payment receipt</h1>
      </header>
      <dl className="space-y-3">
        <div><dt>Receipt number</dt><dd>{receipt.receipt_number}</dd></div>
        <div><dt>Student</dt><dd>{child.full_name || child.student_name} · {child.registration_number}</dd></div>
        <div><dt>Paid on</dt><dd>{receipt.payment_date}</dd></div>
        <div><dt>Payment method</dt><dd>{receipt.payment_method.replaceAll('_', ' ')}</dd></div>
        <div><dt>Amount</dt><dd>₹{Math.floor(receipt.amount_paise / 100).toLocaleString('en-IN')}.{String(receipt.amount_paise % 100).padStart(2, '0')}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-4 print:hidden">
        <Link href={`/parent/dashboard?workspace=fees&child=${encodeURIComponent(child.student_id)}`}>
          Back to fees
        </Link>
        <PrintStudentReceipt />
      </div>
    </main>
  );
}

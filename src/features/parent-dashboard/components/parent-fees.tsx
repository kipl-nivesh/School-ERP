import { CheckCircle2, Clock3, CircleAlert, Circle, Wallet, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Child } from '../types';
import { feeSummary, formatINR, formatDate } from '../lib/calculations';
import { parentProfile } from '../data/mock-dashboard';
import { ParentSection } from './section';
import { ParentProgress } from './motion';

export function ParentFees({ child }: { child: Child }) {
  const isLive = child.id === 'student_a1';
  const fees = feeSummary(child.installments, child.payments, parentProfile.referenceDate);

  if (isLive && child.installments.length === 0 && child.payments.length === 0) {
    return (
      <ParentSection
        id="parent-fees"
        title="Fee Details & Receipts"
        description={child.firstName + ' · Assessed school fees · INR'}
        badge="Verified Ledger"
      >
        <div className="pd-fee-totals">
          <div><span>Total fees</span><strong>₹0</strong></div>
          <div><span>Paid</span><strong>₹0</strong></div>
          <div><span>Outstanding</span><strong>₹0</strong></div>
        </div>
        <p className="pd-fee-equation">₹0 total = ₹0 paid + ₹0 outstanding</p>
        <div className="pd-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <Wallet size={36} style={{ margin: '0 auto 12px', color: 'var(--muted-foreground)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No outstanding fee dues or receipts on record</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            All assessed fee obligations for {child.firstName} are clear, or fee structures have not yet been assigned for this term.
          </p>
        </div>
        <p className="pd-panel-note">Official fee records and payment invoices are verified by the school accounts office.</p>
      </ParentSection>
    );
  }

  return (
    <ParentSection
      id="parent-fees"
      title="Fee details, clearly laid out"
      description={child.firstName + ' · full academic-year assessed fees · INR'}
      badge={isLive ? 'Verified Ledger' : 'Fictional ledger'}
    >
      <div className="pd-fee-totals">
        <div><span>Total fees</span><strong>{formatINR(fees.total)}</strong></div>
        <div><span>Paid</span><strong>{formatINR(fees.paid)}</strong></div>
        <div><span>Outstanding</span><strong>{formatINR(fees.outstanding)}</strong></div>
      </div>
      <p className="pd-fee-equation">{formatINR(fees.total)} total = {formatINR(fees.paid)} paid + {formatINR(fees.outstanding)} outstanding</p>
      <div className="pd-progress-caption"><span>{fees.percentage.toFixed(1)}% paid</span><span>Academic year {parentProfile.academicYear}</span></div>
      <div className="pd-progress pd-tone-emerald" role="progressbar" aria-label={child.firstName + ' fees paid'} aria-valuenow={Number(fees.percentage.toFixed(1))} aria-valuemin={0} aria-valuemax={100}>
        <ParentProgress value={fees.percentage} />
      </div>
      <div className="pd-fee-dates">
        {fees.next ? (
          <p><Clock3 size={15} /><span>Next due: <strong>{formatDate(fees.next.dueDate)} · {formatINR(fees.next.outstanding)}</strong><small>{fees.next.title} · remaining installment balance</small></span></p>
        ) : (
          <p>No future unpaid installments.</p>
        )}
        {fees.overdue > 0 && (
          <p className="pd-overdue-note"><CircleAlert size={15} /><span>Overdue: <strong>{formatINR(fees.overdue)}</strong><small>Included in outstanding balance</small></span></p>
        )}
      </div>
      <div className="pd-installments">
        <h3>Installment breakdown</h3>
        {fees.rows.map(item => {
          const Icon = item.status === 'Paid' ? CheckCircle2 : item.status === 'Overdue' ? CircleAlert : item.status === 'Partially paid' ? Clock3 : Circle;
          return (
            <article key={item.id} data-installment-id={item.id}>
              <div>
                <strong>{item.title}</strong>
                <small>Due {formatDate(item.dueDate)} · {formatINR(item.amount)} total</small>
                <span className={'pd-status pd-status-' + item.status.toLowerCase().replace(' ', '-')}>
                  <Icon size={13} />{item.status}
                </span>
              </div>
              <div className="pd-installment-amounts">
                <span>{formatINR(item.paid)} paid</span>
                <strong>{formatINR(item.outstanding)} left</strong>
              </div>
            </article>
          );
        })}
      </div>
      <details className="pd-details">
        <summary>View {isLive ? 'payment history' : 'fictional payment history'} ({child.payments.length})</summary>
        <div className="pd-payment-history">
          {[...child.payments].sort((a, b) => b.date.localeCompare(a.date)).map(p => (
            <article key={p.id} data-payment-id={p.id}>
              <Wallet size={17} />
              <div>
                <strong>{formatINR(p.amount)} · {formatDate(p.date)}</strong>
                <span>{child.installments.find(i => i.id === p.installmentId)?.title}</span>
                <small>{p.id} · {p.method}</small>
              </div>
              <span className="pd-label">{isLive ? 'Settled' : 'Sample record'}</span>
            </article>
          ))}
        </div>
      </details>
      <div className="pd-payment-action">
        <Button disabled><LockKeyhole size={15} />Pay fees · Coming soon</Button>
        <p>{isLive ? 'Online fee payment gateway integration is currently in rollout.' : 'Demo balances only. Payments and receipt downloads are unavailable.'}</p>
      </div>
    </ParentSection>
  );
}

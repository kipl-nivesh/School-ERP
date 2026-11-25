'use client';

import { useActionState, useRef, useState } from 'react';
import { saveStaffExpense } from '@/app/staff/expense-actions';

export type ExpenseFields = {
  category: string; payee: string; amount_paise: string; expense_date: string; payment_method: string; description: string;
};

const names = {
  create: 'Save draft',
  edit: 'Update draft',
  submit: 'Submit for approval',
  cancel: 'Cancel draft',
  approve: 'Approve and post',
} as const;

const confirmPrompts: Record<'submit' | 'cancel' | 'approve', { prompt: string; action: string }> = {
  submit: {
    prompt: 'Submit this expense draft for school Admin approval? Once submitted, the draft cannot be edited until reviewed.',
    action: 'Confirm submission',
  },
  cancel: {
    prompt: 'Cancel this expense draft? This draft will be archived as cancelled.',
    action: 'Confirm cancellation',
  },
  approve: {
    prompt: 'Approve this expense and post it to the general ledger? This action will post the transaction.',
    action: 'Confirm approval & post',
  },
};

export function ExpenseDraftForm({ school, id, revision, intent, fields }: {
  school: string; id: string; revision?: number; intent: keyof typeof names; fields?: ExpenseFields;
}) {
  const [confirming, setConfirming] = useState(false);
  const submittingRef = useRef(false);
  const [state, action, pending] = useActionState(async (previous: Parameters<typeof saveStaffExpense>[0], form: FormData) => {
    try {
      return await saveStaffExpense(previous, form);
    } finally {
      submittingRef.current = false;
    }
  }, { ok: false, message: '' });

  const requiresConfirm = intent === 'submit' || intent === 'cancel' || intent === 'approve';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (submittingRef.current || pending || state.ok) {
      e.preventDefault();
      return;
    }
    submittingRef.current = true;
  };

  const isBusy = pending;
  const isDone = state.ok;

  return (
    <form action={action} onSubmit={handleSubmit} aria-busy={isBusy}>
      <input type="hidden" name="school" value={school} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision ?? ''} />
      <input type="hidden" name="intent" value={intent} />

      <fieldset disabled={isBusy || isDone} className="grid gap-2" style={{ border: 'none', padding: 0, margin: 0 }}>
        {(intent === 'create' || intent === 'edit') && (
          <>
            <label>Category
              <select name="category" defaultValue={fields?.category ?? 'other'}>
                {['utilities','supplies','maintenance','salaries','events','other'].map(value => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>Payee<input name="payee" required maxLength={160} defaultValue={fields?.payee} /></label>
            <label>Amount (paise)<input name="amount" inputMode="numeric" maxLength={16} required defaultValue={fields?.amount_paise} /></label>
            <label>Expense date<input name="date" type="date" required defaultValue={fields?.expense_date} /></label>
            <label>Payment method
              <select name="method" defaultValue={fields?.payment_method ?? 'cash'}>
                {['cash','upi','card','bank_transfer','cheque'].map(value => (
                  <option key={value} value={value}>{value.replaceAll('_',' ')}</option>
                ))}
              </select>
            </label>
            <label>Description<textarea name="description" required maxLength={2000} defaultValue={fields?.description} /></label>
          </>
        )}

        {requiresConfirm && confirming && !isDone ? (
          <div
            role="region"
            aria-label="Action confirmation"
            style={{
              padding: '0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fff8e6',
              border: '1px solid #f0b429',
              margin: '0.5rem 0',
            }}
          >
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#744210' }}>
              {confirmPrompts[intent].prompt}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={isBusy}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.25rem',
                  fontWeight: 600,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  backgroundColor: intent === 'cancel' ? '#e53e3e' : '#3182ce',
                  color: '#fff',
                  border: 'none',
                }}
              >
                {isBusy ? 'Processing…' : confirmPrompts[intent].action}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setConfirming(false)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.25rem',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  backgroundColor: '#edf2f7',
                  border: '1px solid #cbd5e0',
                  color: '#4a5568',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          !isDone && (
            <button
              type={requiresConfirm ? 'button' : 'submit'}
              disabled={isBusy}
              onClick={requiresConfirm ? () => setConfirming(true) : undefined}
            >
              {isBusy ? 'Saving…' : names[intent]}
            </button>
          )
        )}
      </fieldset>

      {state.message && (
        <p
          role={state.ok ? 'status' : 'alert'}
          style={{
            marginTop: '0.5rem',
            color: state.ok ? '#276749' : '#c53030',
            fontWeight: 500,
          }}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

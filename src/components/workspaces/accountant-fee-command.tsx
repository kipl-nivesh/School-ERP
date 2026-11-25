'use client';

import { useActionState } from 'react';
import { saveFeeConfiguration } from '@/app/staff/fee-configuration-actions';
import styles from './live-accountant-dashboard.module.css';

type Fields = { kind: 'create'; classes: { id: string; name: string }[] } |
  { kind: 'edit'; amount: string; due: string } | { kind: 'assign'; due: string };

export function AccountantFeeCommand({ school, id, fields }: { school: string; id: string; fields: Fields }) {
  const [state, action, pending] = useActionState(saveFeeConfiguration, { ok: false, message: '' });
  const title = { create: 'Create fee structure', edit: 'Edit amount or due date', assign: 'Assign fee to student' }[fields.kind];
  return <details>
    <summary>{title}</summary>
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="school" value={school} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={fields.kind} />
      {fields.kind === 'edit' && <>
        <input type="hidden" name="expected" value={fields.amount} />
        <input type="hidden" name="expectedDue" value={fields.due} />
      </>}
      <fieldset disabled={pending || state.ok} className={styles.filters}>
        {fields.kind === 'create' && <>
          <label>Class<select name="classId" defaultValue="" required>
            <option value="" disabled>Select class</option>
            {fields.classes.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
          <label>Category<select name="category" required>
            {['tuition','laboratory','library','sports','transport','admission','examination','other'].map(value =>
              <option key={value}>{value}</option>)}
          </select></label>
          <label>Frequency<select name="frequency" required>{['monthly','quarterly','annual','one_time'].map(value =>
            <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
        </>}
        {fields.kind === 'assign' ? <label>Student ID<input name="student" required maxLength={36} /></label> :
          <label>Amount (paise)<input name="amount" inputMode="numeric" required maxLength={16}
            defaultValue={fields.kind === 'edit' ? fields.amount : undefined} /></label>}
        <label>Due date<input name="due" type="date" required defaultValue={fields.kind !== 'create' ? fields.due : undefined} /></label>
        <button type="submit">{pending ? 'Saving…' : title}</button>
      </fieldset>
      {state.message && <p role={state.ok ? 'status' : 'alert'}>{state.message}</p>}
    </form>
  </details>;
}

export function PrintAccountantReceipt() {
  return <button type="button" onClick={() => window.print()}>Print receipt</button>;
}

'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { exportFinancialInvoices } from '@/app/staff/financial-export-actions';

export function FinancialExportForm({ school }: { school: string }) {
  // Keep the previous result (which can contain a setup key or CSV) in the browser.
  const [state, action, pending] = useActionState(
    async (previous: Awaited<ReturnType<typeof exportFinancialInvoices>>, form: FormData) => {
      const result = await exportFinancialInvoices({ message: '' }, form);
      if (result.factorId && result.factorId === previous.factorId && !result.qrDataUri && previous.qrDataUri) {
        return { ...result, qrDataUri: previous.qrDataUri, secret: previous.secret };
      }
      return result;
    },
    { message: '' },
  );
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return <form action={action} aria-busy={pending}>
    <input type="hidden" name="school" value={school} />
    <input type="hidden" name="intent" value={state.factorId ? 'verify' : 'prepare'} />
    <fieldset disabled={pending} className="flex flex-wrap gap-2">
      <legend>Export invoices by issue date</legend>
      <label>From<input type="date" name="from" required value={from} readOnly={!!state.factorId}
        onChange={event => setFrom(event.target.value)} /></label>
      <label>To<input type="date" name="to" required value={to} readOnly={!!state.factorId}
        onChange={event => setTo(event.target.value)} /></label>
      {state.factorId ? <>
        <input type="hidden" name="factorId" value={state.factorId} />
        {state.qrDataUri && <div className="w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- Transient sanitized TOTP SVG data URI. */}
          <img src={state.qrDataUri} width={180} height={180} alt="Authenticator enrollment QR code" />
          {state.secret && <details><summary>Show manual setup key</summary><code>{state.secret}</code></details>}
        </div>}
        <label>Authenticator code<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
          maxLength={6} pattern="[0-9]{6}" required /></label>
        <button type="submit">{pending ? 'Verifying…' : 'Verify and prepare export'}</button>
      </> : !state.passwordRequired &&
        <button type="submit">{pending ? 'Preparing…' : 'Prepare invoice CSV'}</button>}
    </fieldset>
    {state.message && <p role="status">{state.message}</p>}
    {state.passwordRequired && <Link href="/login/staff?role=accountant">Sign in again</Link>}
    {state.csv && <button type="button" onClick={() => {
      const url = URL.createObjectURL(new Blob([state.csv!], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'brightcamp-invoices.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }}>Download invoice CSV</button>}
  </form>;
}

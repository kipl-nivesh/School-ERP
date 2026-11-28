'use client';

import { useActionState, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  inviteOrLinkParentAction,
  manageParentPinAction,
  revokeParentSessionsAction,
  setParentAccountStatusAction,
  updateParentRelationshipAction,
  type AdminParentAccountItem,
  type AdminParentChildItem,
  type ParentAdminActionState,
} from '@/app/staff/parent-management-actions';
import styles from './live-admin-dashboard.module.css';

const INITIAL_STATE: ParentAdminActionState = { ok: false, message: '' };

function CopyParentIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy Parent Login ID ${value}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
    >
      {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function RelationshipRow({ rel }: { rel: AdminParentChildItem }) {
  const [state, action, pending] = useActionState(updateParentRelationshipAction, INITIAL_STATE);

  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-2">
      <input type="hidden" name="relationshipId" value={rel.relationship_id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-slate-900">{rel.student_name}</strong>
          <span className="text-slate-600 font-mono text-xs">Parent Login ID: {rel.registration_number}</span>
          <CopyParentIdButton value={rel.registration_number} />
        </div>
        <span className="text-xs font-medium text-slate-600">v{rel.relationship_version}</span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5">
          <span>Status:</span>
          <select
            name="status"
            defaultValue={rel.relationship_status}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="revoked">Revoked</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="academicAccess" defaultChecked={rel.academic_access} />
          <span>Academic access</span>
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="feeAccess" defaultChecked={rel.fee_access} />
          <span>Fee access</span>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Update link'}
        </button>
      </div>
      {state.message && (
        <p role="status" className={state.ok ? 'text-xs text-emerald-700' : 'text-xs text-rose-700'}>
          {state.message}
        </p>
      )}
    </form>
  );
}

function ParentAccountCard({ parent }: { parent: AdminParentAccountItem }) {
  const [statusState, statusAction, statusPending] = useActionState(setParentAccountStatusAction, INITIAL_STATE);
  const [pinState, pinAction, pinPending] = useActionState(manageParentPinAction, INITIAL_STATE);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeParentSessionsAction, INITIAL_STATE);
  const isSuspended = parent.account_status === 'suspended' || parent.membership_status === 'suspended';
  const pinStatus = parent.pin_status ?? 'not_set';
  const hasPin = pinStatus === 'active' || pinStatus === 'locked';

  const pinBadgeLabel =
    pinStatus === 'active'
      ? 'PIN active'
      : pinStatus === 'locked'
        ? 'PIN locked'
        : pinStatus === 'revoked'
          ? 'PIN revoked'
          : 'PIN not set';

  return (
    <article className={styles.record}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{parent.display_name}</h3>
          <p className="text-sm text-slate-600">{parent.email ?? 'No email linked'}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-0.5 font-medium ${isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {isSuspended ? 'Suspended' : 'Active'}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 font-medium ${parent.email_confirmed ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>
              {parent.email_confirmed ? 'Email confirmed' : 'Pending email confirmation'}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 font-medium ${pinStatus === 'active' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}`}>
              {pinBadgeLabel}
            </span>
          </div>
        </div>

        {parent.profile_id && (
          <div className="flex flex-wrap items-center gap-2">
            <form action={revokeAction}>
              <input type="hidden" name="profileId" value={parent.profile_id} />
              <button
                type="submit"
                disabled={revokePending}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {revokePending ? 'Revoking…' : 'Revoke sessions'}
              </button>
            </form>
            <form action={statusAction}>
              <input type="hidden" name="profileId" value={parent.profile_id} />
              <input type="hidden" name="status" value={isSuspended ? 'active' : 'suspended'} />
              <button
                type="submit"
                disabled={statusPending}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${isSuspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {statusPending ? 'Updating…' : isSuspended ? 'Reactivate parent' : 'Suspend & revoke sessions'}
              </button>
            </form>
          </div>
        )}
      </div>

      {(statusState.message || revokeState.message) && (
        <p role="status" className={`mt-2 text-xs ${(statusState.message ? statusState.ok : revokeState.ok) ? 'text-emerald-700' : 'text-rose-700'}`}>
          {statusState.message || revokeState.message}
        </p>
      )}

      {parent.profile_id && !isSuspended && parent.email_confirmed && (
        <form action={pinAction} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input type="hidden" name="profileId" value={parent.profile_id} />
          <input type="hidden" name="intent" value={hasPin ? 'reset' : 'activate'} />
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-slate-700">
              {hasPin ? 'Reset 6-digit Parent PIN' : 'Set 6-digit Parent PIN'}
            </span>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              minLength={6}
              maxLength={6}
              required
              placeholder="6 digits (e.g. 042819)"
              autoComplete="new-password"
              className="w-44 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={pinPending}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pinPending ? 'Saving PIN…' : hasPin ? 'Reset Parent PIN' : 'Set Parent PIN'}
          </button>
          {pinState.message && (
            <p role="status" className={`w-full text-xs ${pinState.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              {pinState.message}
            </p>
          )}
        </form>
      )}

      <div className="mt-3 space-y-2">
        {parent.children.map((rel) => (
          <RelationshipRow key={rel.relationship_id} rel={rel} />
        ))}
      </div>
    </article>
  );
}

export function ParentManagement({
  parents,
  students,
}: {
  parents: AdminParentAccountItem[];
  students: { id: string; display_name: string; registration_number: string }[];
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(inviteOrLinkParentAction, INITIAL_STATE);

  return (
    <div className="space-y-6">
      <article className={styles.record}>
        <h2>Invite or link verified guardian</h2>
        <p className="text-sm text-slate-600 mb-4">
          Invite a new guardian email or link an existing verified guardian to an active student (multi-child supported).
        </p>
        <form action={inviteAction} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Student</span>
            <select name="studentId" required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">Select active student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name} ({s.registration_number})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Guardian display name</span>
            <input name="guardianName" type="text" required minLength={2} maxLength={160} placeholder="e.g. Meena Devi" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Guardian email</span>
            <input name="email" type="email" required placeholder="guardian@example.com" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <div className="flex items-end gap-4 pb-2 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="academicAccess" defaultChecked />
              <span>Academic access</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="feeAccess" defaultChecked />
              <span>Fee access</span>
            </label>
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={invitePending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {invitePending ? 'Processing…' : 'Invite / Link Guardian'}
            </button>
            {inviteState.message && (
              <p role="status" className={`text-sm ${inviteState.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                {inviteState.message}
              </p>
            )}
          </div>
        </form>
      </article>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Managed guardian accounts ({parents.length})</h2>
        {!parents.length ? (
          <p className={styles.empty}>No guardian accounts linked in this school yet.</p>
        ) : (
          parents.map((p) => <ParentAccountCard key={p.guardian_id} parent={p} />)
        )}
      </div>
    </div>
  );
}

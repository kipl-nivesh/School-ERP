import { randomUUID } from 'node:crypto';
import { evaluatePermission } from '@/lib/auth/authorization';
import { formatPaise, parsePaise } from '@/lib/services/accountant-finance-fields';
import { getAccountantRenderAccess, getStaffAccess, staffClient } from '@/lib/staff/server';
import { ExpenseDraftForm } from './expense-draft-form';
import styles from './live-admin-dashboard.module.css';

async function readExpenseDrafts(school: string, profile: string, role: 'admin' | 'accountant') {
  try {
    const client = await staffClient();
    let query = client.from('staff_expense_drafts')
      .select('id,school_id,created_by,category,payee,amount_paise::text,expense_date,payment_method,description,status,revision')
      .eq('school_id', school);
    query = role === 'admin' ? query.eq('status', 'submitted') : query.eq('created_by', profile);
    const { data, error } = await query.order('updated_at', { ascending: false }).order('id').limit(26);
    return error || !data || data.some(row => row.school_id !== school) ? null : data.map(row => {
      const paise = parsePaise(row.amount_paise);
      return { ...row, amount_paise: paise.toString(), formattedAmount: formatPaise(paise) };
    });
  } catch { return null; }
}

export async function StaffExpenseDrafts({ role }: { role: 'admin' | 'accountant' }) {
  const access = await (role === 'accountant' ? getAccountantRenderAccess() : getStaffAccess(role));
  const school = access?.context.schoolId;
  if (!access || access.role !== role || !school ||
      !evaluatePermission(access.context, 'expenses.read', access.context.session.verifiedAt).allowed) return null;
  const canWrite = evaluatePermission(access.context, 'expenses.write', access.context.session.verifiedAt).allowed;
  const canApprove = canWrite && role === 'admin';
  const data = await readExpenseDrafts(school, access.context.profileId, role);
  if (!data) return <p role="alert">Expense drafts could not be loaded.</p>;
  return <section className={styles.record} aria-labelledby="staff-expense-drafts">
      <h2 id="staff-expense-drafts">{role === 'admin' ? 'Expense approvals' : 'My expense drafts'}</h2>
      {canWrite && role === 'accountant' && <details><summary>Create expense draft</summary>
        <ExpenseDraftForm school={school} id={randomUUID()} intent="create" />
      </details>}
      {data.length > 25 && <p>Showing the 25 most recently updated matching drafts.</p>}
      {data.length ? <ul>{data.slice(0, 25).map(row => <li key={row.id} className={styles.record}>
        <h3>{row.payee} · {row.formattedAmount}</h3>
        <p>{row.category} · {row.expense_date} · {row.status}</p><p>{row.description}</p>
        {canWrite && role === 'accountant' && row.status === 'draft' && <>
          <details><summary>Edit draft</summary><ExpenseDraftForm school={school} id={row.id} revision={row.revision}
            intent="edit" fields={row} key={row.revision} /></details>
          <ExpenseDraftForm school={school} id={row.id} revision={row.revision} intent="submit" />
        </>}
        {role === 'accountant' && row.status === 'submitted' &&
          <p role="status">Submitted for school Admin approval.</p>}
        {canWrite && role === 'accountant' && ['draft','submitted'].includes(row.status) &&
          <ExpenseDraftForm school={school} id={row.id} revision={row.revision} intent="cancel" />}
        {canApprove && row.created_by !== access.context.profileId &&
          <ExpenseDraftForm school={school} id={row.id} revision={row.revision} intent="approve" />}
      </li>)}</ul> : <p>No matching expense drafts.</p>}
    </section>;
}

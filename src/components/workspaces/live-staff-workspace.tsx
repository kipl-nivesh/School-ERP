import { readLiveWorkspace } from '@/lib/services/live-workspace';
import type { StaffRole } from '@/lib/staff/contracts';
import { LiveAdmissionForm, LiveCollectionForm } from './live-record-forms';
import { LiveAcademicForm } from './live-academic-form';
import { LiveManagementForm } from './live-management-form';
import { isManagementKind } from '@/lib/services/management-contracts';
import { LiveInvitationForm } from './live-invitation-form';
import { readReportsWorkspace } from '@/lib/services/report-workspace';
import { ReportManagement } from './report-management';

export async function LiveStaffWorkspace({ role }: { role: StaffRole }) {
  const { records: modules, canAdmit, canCollect, admissionRequestId, canAttend, canAssignHomework, homeworkRequestId, canManageAcademics, managementIds } = await readLiveWorkspace(role);
  const financeFilter = new FormData();
  financeFilter.set('category', 'finance');
  const reports = role === 'admin' ? await readReportsWorkspace(financeFilter) : null;
  return <div className="space-y-6">
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-950">
      <h1 className="text-xl font-bold">School records</h1>
      <p className="mt-2 text-sm">Records available to your current school membership. Each list shows up to 50 records.</p>
    </div>
    {modules.length === 0 && <p>No record permissions are assigned to this membership. Contact your school administrator.</p>}
    {canAdmit && <LiveAdmissionForm initialRequestId={admissionRequestId} />}
    {role === 'admin' && <LiveInvitationForm />}
    {canCollect && <LiveCollectionForm />}
    {reports && reports.kind !== 'denied' && <ReportManagement initial={reports} />}
    {canAttend && <LiveAcademicForm kind="attendance" requestId={homeworkRequestId} />}
    {canAssignHomework && <LiveAcademicForm kind="homework" requestId={homeworkRequestId} />}
    {managementIds.map(item => isManagementKind(item.kind) && (item.kind === 'homework' ? canAssignHomework : canManageAcademics) && <LiveManagementForm key={item.kind} kind={item.kind} requestId={item.requestId} recordId={item.recordId} />)}
    {modules.map(module => <section key={module.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{module.title}</h2>
      {module.unavailable ? <p role="status">These records could not be loaded. Contact your school administrator.</p> :
        module.rows.length === 0 ? <p>No accessible records.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr>{module.columns.map(column => <th key={column} scope="col" className="border-b p-2">{column.replaceAll('_', ' ')}</th>)}</tr></thead>
          <tbody>{module.rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column} className="border-b p-2">{cell}</td>)}</tr>)}</tbody>
        </table></div>}
    </section>)}
  </div>;
}

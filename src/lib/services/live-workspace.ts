import 'server-only';
import { randomUUID } from 'node:crypto';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import type { StaffRole } from '../staff/contracts';
import type { PermissionId } from '../auth/permissions';

const modules: readonly { title: string; table: string; columns: string; permission: PermissionId }[] = [
  { title: 'Students', table: 'students', columns: 'id,registration_number,display_name,enrollment_status', permission: 'students.read' },
  { title: 'Staff', table: 'staff_profiles', columns: 'display_name,employee_code,department,is_active', permission: 'staff.read' },
  { title: 'Classes', table: 'classes', columns: 'id,name', permission: 'academics.manage' },
  { title: 'Sections', table: 'sections', columns: 'id,class_id,academic_year_id,name', permission: 'academics.manage' },
  { title: 'Academic years', table: 'academic_years', columns: 'id,label,starts_on,ends_on', permission: 'academics.manage' },
  { title: 'Teacher assignments', table: 'teacher_assignments', columns: 'teacher_profile_id,section_id,subject_code,valid_from,valid_until', permission: 'students.read' },
  { title: 'Timetable', table: 'timetable_slots', columns: 'id,revision,section_id,day_of_week,period_number,subject_code,start_time,end_time', permission: 'students.read' },
  { title: 'Attendance', table: 'attendance_records', columns: 'student_id,attendance_date,status', permission: 'attendance.read' },
  { title: 'Homework', table: 'homework_assignments', columns: 'id,revision,title,subject_code,due_date,status', permission: 'homework.read' },
  { title: 'Exams', table: 'marks_sheets', columns: 'exam_name,subject_code,exam_date,is_published', permission: 'marks.read' },
  { title: 'Invoices', table: 'fee_invoices', columns: 'id,student_id,invoice_number,amount_paise,paid_paise,status', permission: 'fees.read' },
  { title: 'Receipts', table: 'fee_payments', columns: 'receipt_number,amount_paise,payment_date,payment_method,status', permission: 'receipts.read' },
  { title: 'Expenses', table: 'operating_expenses', columns: 'voucher_number,category,payee,amount_paise,expense_date', permission: 'expenses.read' },
  { title: 'Announcements', table: 'announcements', columns: 'title,content,published_at', permission: 'announcements.read' },
  { title: 'Audit', table: 'audit_events', columns: 'event_type,occurred_at', permission: 'audit.read' },
];

/** Request-local authorization; no context or table names are accepted from the browser. */
export async function readLiveWorkspace(role: StaffRole) {
  const access = await getStaffAccess(role);
  if (!access?.context.schoolId) throw new Error('Authorized school session required');
  const client = await staffClient();
  const permitted = modules.filter(m => evaluatePermission(access.context, m.permission, Date.now()).allowed);
  const records = await Promise.all(permitted.map(async module => {
    const columns = module.columns.split(',');
    try {
      const { data, error } = await client.from(module.table).select(module.columns)
        .eq('school_id', access.context.schoolId!).order(columns[0]).limit(50);
      if (error) throw new Error('Read unavailable');
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      return { title: module.title, columns, unavailable: false,
        rows: rows.map(row => columns.map(column => row[column] == null ? '—' : String(row[column]))) };
    } catch {
      return { title: module.title, columns, unavailable: true, rows: [] as string[][] };
    }
  }));
  return { records, admissionRequestId: randomUUID(), homeworkRequestId: randomUUID(),
    managementIds: ['class','section','assignment','timetable','homework'].map(kind => ({ kind, requestId:randomUUID(),recordId:randomUUID() })),
    canManageAcademics: access.role === 'admin' && evaluatePermission(access.context, 'academics.manage', Date.now()).allowed,
    canAttend: evaluatePermission(access.context, 'attendance.write', Date.now()).allowed,
    canAssignHomework: evaluatePermission(access.context, 'homework.write', Date.now()).allowed,
    canAdmit: access.role === 'admin' && evaluatePermission(access.context, 'admissions.write', Date.now()).allowed,
    canCollect: evaluatePermission(access.context, 'payments.record', Date.now()).allowed,
  };
}

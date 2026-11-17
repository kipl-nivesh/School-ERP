import 'server-only';

import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import {
  isValidDateString,
  isValidUuid,
  reportCategories,
  REPORT_PAGE_SIZE,
  MAX_REPORT_PAGE,
  type AttendanceReportMetrics,
  type EnrollmentReportMetrics,
  type ExamReportMetrics,
  type FinanceReportMetrics,
  type ReportCategory,
  type ReportFilters,
  type ReportOptions,
  type ReportPage,
  type ReportPermissions,
  type ReportTableRow,
  type StaffReportMetrics,
} from './report-fields';
import type { InvoiceStatus } from './fee-fields';
import { calculateFinanceReport, checkedFinanceRows, FINANCE_REPORT_LIMIT, reportInvoiceBalance } from './finance-report-calculation';

export * from './report-fields';

const EXPORT_LOCKED_NOTICE =
  'Report Export Notice: Secure server-side export RPC with fresh reauthentication evidence (reports.export) is not currently deployed. Reports are presented in authorized view-only mode to prevent unbounded or unauthenticated data exfiltration.';

interface SectionRaw {
  id: string;
  name: string;
  school_id: string;
  class_id: string;
  academic_year_id: string;
  classroom: { name: string; school_id: string } | null;
  year: { label: string; school_id: string } | null;
}

interface EnrollmentSectionRow {
  section_id: string;
  section: {
    class_id: string;
    classroom: { id: string; name: string; school_id: string } | null;
  } | null;
}

interface StudentQueryResult {
  id: string;
  display_name: string;
  registration_number: string;
  enrollment_status: 'active' | 'inactive' | 'withdrawn';
  school_id: string;
  enrollment?: {
    school_id: string;
    section?: {
      id: string;
      name: string;
      class_id: string;
      school_id: string;
      classroom?: { name: string; school_id: string } | null;
      year?: { label: string; school_id: string } | null;
    } | null;
  }[];
}

interface AttendanceQueryResult {
  id: string;
  student_id: string;
  section_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string | null;
  school_id: string;
  student?: { display_name: string; registration_number: string; school_id: string } | null;
  section?: { name: string; school_id: string; classroom?: { name: string; school_id: string } | null } | null;
}

interface InvoiceQueryResult {
  id: string;
  student_id: string;
  invoice_number: string;
  title: string;
  due_date: string;
  amount_paise: string;
  paid_paise: string;
  status: InvoiceStatus;
  school_id: string;
  student?: { display_name: string; registration_number: string; school_id: string } | null;
}

interface MarksEntryRaw {
  marks_obtained: number;
  marks_sheet?: {
    school_id: string;
    max_marks: number;
    passing_marks: number;
  } | null;
}

interface ExamEntryQueryResult {
  id: string;
  student_id: string;
  marks_obtained: number;
  student?: { display_name: string; registration_number: string; school_id: string } | null;
  sheet?: {
    id: string;
    exam_name: string;
    subject_code: string;
    exam_date: string;
    max_marks: number;
    passing_marks: number;
    is_published: boolean;
    school_id: string;
    section?: {
      name: string;
      school_id: string;
      classroom?: { name: string; school_id: string } | null;
    } | null;
  } | null;
}

interface StaffQueryResult {
  profile_id: string;
  display_name: string;
  employee_code: string;
  department: string | null;
  is_active: boolean;
  school_id: string;
}

export async function readReportOptions(schoolId: string): Promise<ReportOptions> {
  const fallback: ReportOptions = { years: [], classes: [], sections: [] };
  try {
    const client = await staffClient();
    const [yearsRes, classesRes, sectionsRes] = await Promise.all([
      client.from('academic_years').select('id,label,school_id').eq('school_id', schoolId).order('starts_on', { ascending: false }).limit(50),
      client.from('classes').select('id,name,school_id').eq('school_id', schoolId).order('name').limit(100),
      client.from('sections').select(
        'id,name,school_id,class_id,academic_year_id,classroom:classes!sections_class_school_fkey(name,school_id),year:academic_years!sections_academic_year_school_fkey(label,school_id)'
      ).eq('school_id', schoolId).order('name').limit(150).overrideTypes<SectionRaw[], { merge: false }>(),
    ]);

    const years = (yearsRes.data ?? [])
      .filter(y => y.school_id === schoolId)
      .map(y => ({ id: y.id, label: y.label }));

    const classes = (classesRes.data ?? [])
      .filter(c => c.school_id === schoolId)
      .map(c => ({ id: c.id, label: c.name }));

    const sections = (sectionsRes.data ?? [])
      .filter(s => s.school_id === schoolId && s.classroom?.school_id === schoolId)
      .map(s => ({
        id: s.id,
        name: s.name,
        classId: s.class_id,
        className: s.classroom?.name || 'Class',
        yearId: s.academic_year_id,
      }));

    return { years, classes, sections };
  } catch {
    return fallback;
  }
}

function parseReportFilters(form: FormData): ReportFilters | null {
  const categoryRaw = (form.get('category') ?? 'enrollment') as string;
  const category = (reportCategories.includes(categoryRaw as ReportCategory) ? categoryRaw : 'enrollment') as ReportCategory;

  const academicYearId = ((form.get('academicYearId') ?? '') as string).trim();
  const classId = ((form.get('classId') ?? '') as string).trim();
  const sectionId = ((form.get('sectionId') ?? '') as string).trim();
  const dateFrom = ((form.get('dateFrom') ?? '') as string).trim();
  const dateTo = ((form.get('dateTo') ?? '') as string).trim();
  const search = ((form.get('search') ?? '') as string).trim();
  const status = ((form.get('status') ?? '') as string).trim();
  const pageRaw = ((form.get('page') ?? '1') as string).trim();

  if (academicYearId && !isValidUuid(academicYearId)) return null;
  if (classId && !isValidUuid(classId)) return null;
  if (sectionId && !isValidUuid(sectionId)) return null;

  if (dateFrom && !isValidDateString(dateFrom)) return null;
  if (dateTo && !isValidDateString(dateTo)) return null;
  if (dateFrom && dateTo && dateTo < dateFrom) return null;

  if (search.length > 80 || !/^[\p{L}\p{M}\p{N} .'-]*$/u.test(search)) return null;
  if (status.length > 40 || !/^[a-zA-Z0-9_-]*$/.test(status)) return null;

  if (!/^[1-9]\d{0,3}$/.test(pageRaw)) return null;
  const page = Number(pageRaw);
  if (page < 1 || page > MAX_REPORT_PAGE) return null;

  return {
    category,
    academicYearId,
    classId,
    sectionId,
    dateFrom,
    dateTo,
    search,
    status,
    page,
  };
}

export async function readReportsWorkspace(form = new FormData()): Promise<ReportPage> {
  const access = await getStaffAccess('admin');
  const schoolId = access?.context.schoolId;
  if (!access || !schoolId) {
    return { kind: 'denied', reason: 'Active school session required to access reports.' };
  }

  const allowed = (permission: string) => evaluatePermission(access.context, permission, Date.now()).allowed;
  const canReadReports = allowed('reports.read');
  const canReadStudents = allowed('students.read');
  const canReadAttendance = allowed('attendance.read');
  const canReadFees = allowed('fees.read');
  const canReadReceipts = allowed('receipts.read');
  const canReadMarks = allowed('marks.read');
  const canReadStaff = allowed('staff.read');
  const canExportReports = allowed('reports.export');

  if (!canReadReports) {
    return { kind: 'denied', reason: 'You do not have permission to view reporting and analytics workspaces.' };
  }

  const filters = parseReportFilters(form);
  if (!filters) {
    return { kind: 'invalid', message: 'Invalid report query or filter parameters.' };
  }

  const permissions: ReportPermissions = {
    canReadReports,
    canReadStudents,
    canReadAttendance,
    canReadFees,
    canReadReceipts,
    canReadMarks,
    canReadStaff,
    canExportReports,
  };

  const options = await readReportOptions(schoolId);

  // Validate that provided classId or sectionId exist in this school's options
  if (filters.classId && !options.classes.some(c => c.id === filters.classId)) {
    return { kind: 'invalid', message: 'Selected class does not exist in this school.' };
  }
  if (filters.sectionId && !options.sections.some(s => s.id === filters.sectionId)) {
    return { kind: 'invalid', message: 'Selected section does not exist in this school.' };
  }
  if (filters.academicYearId && !options.years.some(y => y.id === filters.academicYearId)) {
    return { kind: 'invalid', message: 'Selected academic year does not exist in this school.' };
  }

  const client = await staffClient();
  const start = (filters.page - 1) * REPORT_PAGE_SIZE;

  try {
    switch (filters.category) {
      case 'enrollment': {
        if (!canReadStudents) {
          return { kind: 'denied', reason: 'Student enrollment reports require the students.read permission.' };
        }

        // Aggregate true counts across all students in school (not just paginated slice)
        const [allStudentsRes, classesCountRes, sectionsCountRes, enrollmentsRes] = await Promise.all([
          client.from('students').select('id, enrollment_status').eq('school_id', schoolId),
          client.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
          client.from('sections').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
          client.from('enrollments').select(
            'section_id, section:sections!inner(class_id, classroom:classes!inner(id, name, school_id))'
          ).eq('school_id', schoolId).is('valid_until', null).overrideTypes<EnrollmentSectionRow[], { merge: false }>(),
        ]);

        const allStudents = allStudentsRes.data ?? [];
        const activeCount = allStudents.filter(s => s.enrollment_status === 'active').length;
        const inactiveCount = allStudents.filter(s => s.enrollment_status === 'inactive').length;
        const withdrawnCount = allStudents.filter(s => s.enrollment_status === 'withdrawn').length;

        // Class distribution
        const classMap = new Map<string, { className: string; count: number }>();
        options.classes.forEach(c => classMap.set(c.id, { className: c.label, count: 0 }));
        (enrollmentsRes.data ?? []).forEach(row => {
          const cId = row.section?.class_id;
          const cName = row.section?.classroom?.name;
          if (cId && cName) {
            const entry = classMap.get(cId) ?? { className: cName, count: 0 };
            entry.count += 1;
            classMap.set(cId, entry);
          }
        });
        const classDistribution = Array.from(classMap.entries()).map(([classId, data]) => ({
          classId,
          className: data.className,
          count: data.count,
        }));

        const enrollmentMetrics: EnrollmentReportMetrics = {
          totalStudents: allStudents.length,
          activeCount,
          inactiveCount,
          withdrawnCount,
          totalClasses: classesCountRes.count ?? 0,
          totalSections: sectionsCountRes.count ?? 0,
          classDistribution,
        };

        // Paginated rows
        const today = new Date().toISOString().slice(0, 10);
        const sectionMatch = (filters.classId || filters.sectionId) ? '!inner' : '';
        const enrollmentEmbed = `enrollment:enrollments!enrollments_student_school_fkey${sectionMatch}(school_id,section:sections!enrollments_section_year_school_fkey${sectionMatch}(id,name,class_id,school_id,classroom:classes!sections_class_school_fkey(name,school_id),year:academic_years!sections_academic_year_school_fkey(label,school_id)))`;

        let query = client
          .from('students')
          .select(`id,display_name,registration_number,enrollment_status,school_id,${enrollmentEmbed}`, { count: 'exact' })
          .eq('school_id', schoolId)
          .eq('enrollment.school_id', schoolId)
          .lte('enrollment.valid_from', today)
          .or(`valid_until.is.null,valid_until.gte.${today}`, { referencedTable: 'enrollment' })
          .order('registration_number')
          .order('id')
          .range(start, start + REPORT_PAGE_SIZE);

        if (filters.search) {
          const pattern = `"%${filters.search}%"`;
          query = query.or(`display_name.ilike.${pattern},registration_number.ilike.${pattern}`);
        }
        if (filters.status) {
          query = query.eq('enrollment_status', filters.status);
        }
        if (filters.classId) {
          query = query.eq('enrollment.section.class_id', filters.classId);
        }
        if (filters.sectionId) {
          query = query.eq('enrollment.section.id', filters.sectionId);
        }

        const result = await query.overrideTypes<StudentQueryResult[], { merge: false }>();
        if (result.error) return { kind: 'error', message: 'Failed to retrieve enrollment records.' };

        const totalRows = result.count ?? 0;
        const students = result.data ?? [];
        const hasNext = students.length > REPORT_PAGE_SIZE && filters.page < MAX_REPORT_PAGE;

        const rows: ReportTableRow[] = students.slice(0, REPORT_PAGE_SIZE).map(s => {
          const enrollment = (s.enrollment ?? []).find(e => e.school_id === schoolId && e.section?.school_id === schoolId);
          const section = enrollment?.section;
          return {
            reportKind: 'enrollment' as const,
            id: s.id,
            studentId: s.id,
            studentName: s.display_name,
            registrationNumber: s.registration_number,
            status: s.enrollment_status,
            className: section?.classroom?.school_id === schoolId ? section.classroom.name : undefined,
            sectionName: section?.name,
            academicYear: section?.year?.school_id === schoolId ? section.year.label : undefined,
          };
        });

        return {
          kind: 'ready',
          category: 'enrollment',
          filters,
          enrollmentMetrics,
          rows,
          totalRows,
          page: filters.page,
          pageSize: REPORT_PAGE_SIZE,
          hasNext,
          permissions,
          options,
          exportNotice: EXPORT_LOCKED_NOTICE,
        };
      }

      case 'attendance': {
        if (!canReadAttendance) {
          return { kind: 'denied', reason: 'Attendance reports require the attendance.read permission.' };
        }

        // Base filter query for true aggregate attendance metrics
        let statsQuery = client.from('attendance_records').select('status').eq('school_id', schoolId);
        if (filters.sectionId) statsQuery = statsQuery.eq('section_id', filters.sectionId);
        if (filters.dateFrom) statsQuery = statsQuery.gte('attendance_date', filters.dateFrom);
        if (filters.dateTo) statsQuery = statsQuery.lte('attendance_date', filters.dateTo);

        const statsRes = await statsQuery;
        const allAttendance = statsRes.data ?? [];
        const totalRecords = allAttendance.length;
        const presentCount = allAttendance.filter(r => r.status === 'present').length;
        const absentCount = allAttendance.filter(r => r.status === 'absent').length;
        const lateCount = allAttendance.filter(r => r.status === 'late').length;
        const excusedCount = allAttendance.filter(r => r.status === 'excused').length;

        const presentRatePercent = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
        const effectiveRatePercent = totalRecords > 0 ? ((presentCount + lateCount) / totalRecords) * 100 : 0;

        const attendanceMetrics: AttendanceReportMetrics = {
          totalRecords,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          presentRatePercent,
          effectiveRatePercent,
          denominatorNote:
            'Rates calculated over total recorded attendance sessions (Present Rate = Present ÷ Total; Effective Rate = [Present + Late] ÷ Total).',
        };

        // Paginated rows
        const studentEmbed = canReadStudents
          ? ',student:students!attendance_student_school_fkey(display_name,registration_number,school_id)'
          : '';
        const sectionEmbed = ',section:sections!attendance_records_section_id_fkey(name,school_id,classroom:classes!sections_class_school_fkey(name,school_id))';

        let listQuery = client
          .from('attendance_records')
          .select(`id,student_id,section_id,attendance_date,status,remarks,school_id${studentEmbed}${sectionEmbed}`, { count: 'exact' })
          .eq('school_id', schoolId);

        if (filters.sectionId) listQuery = listQuery.eq('section_id', filters.sectionId);
        if (filters.status) listQuery = listQuery.eq('status', filters.status);
        if (filters.dateFrom) listQuery = listQuery.gte('attendance_date', filters.dateFrom);
        if (filters.dateTo) listQuery = listQuery.lte('attendance_date', filters.dateTo);

        if (filters.search) {
          if (canReadStudents) {
            const pattern = `"%${filters.search}%"`;
            listQuery = listQuery.or(`display_name.ilike.${pattern},registration_number.ilike.${pattern}`, { referencedTable: 'student' });
          } else if (isValidUuid(filters.search)) {
            listQuery = listQuery.eq('student_id', filters.search);
          }
        }

        listQuery = listQuery
          .order('attendance_date', { ascending: false })
          .order('id')
          .range(start, start + REPORT_PAGE_SIZE);

        const listRes = await listQuery.overrideTypes<AttendanceQueryResult[], { merge: false }>();
        if (listRes.error) return { kind: 'error', message: 'Failed to retrieve attendance records.' };

        const totalRows = listRes.count ?? 0;
        const rowsRaw = listRes.data ?? [];
        const hasNext = rowsRaw.length > REPORT_PAGE_SIZE && filters.page < MAX_REPORT_PAGE;

        const rows: ReportTableRow[] = rowsRaw.slice(0, REPORT_PAGE_SIZE).map(r => {
          const student = r.student?.school_id === schoolId ? r.student : null;
          const section = r.section?.school_id === schoolId ? r.section : null;
          return {
            reportKind: 'attendance' as const,
            id: r.id,
            date: r.attendance_date,
            studentId: r.student_id,
            studentName: canReadStudents && student ? student.display_name : undefined,
            registrationNumber: canReadStudents && student ? student.registration_number : undefined,
            className: section?.classroom?.name,
            sectionName: section?.name,
            status: r.status,
            remarks: r.remarks,
          };
        });

        return {
          kind: 'ready',
          category: 'attendance',
          filters,
          attendanceMetrics,
          rows,
          totalRows,
          page: filters.page,
          pageSize: REPORT_PAGE_SIZE,
          hasNext,
          permissions,
          options,
          exportNotice: EXPORT_LOCKED_NOTICE,
        };
      }

      case 'finance': {
        if (!canReadFees) {
          return { kind: 'denied', reason: 'Finance reports require fees.read permission.' };
        }

        let financeMetrics: FinanceReportMetrics | undefined;
        if (canReadReceipts || allowed('payments.read')) {
          const [invoices, payments] = await Promise.all([
            client.from('fee_invoices').select('amount_paise::text,paid_paise::text,due_date,status', { count: 'exact' })
              .eq('school_id', schoolId).limit(FINANCE_REPORT_LIMIT),
            client.from('fee_payments').select('amount_paise::text,payment_method,status', { count: 'exact' })
              .eq('school_id', schoolId).eq('status', 'settled').limit(FINANCE_REPORT_LIMIT),
          ]);
          try {
            // The schema has no verified school timezone. Withhold overdue totals until one is available.
            financeMetrics = calculateFinanceReport(invoices, payments, null);
          } catch {
            return { kind: 'error', message: 'Finance totals are unavailable because the complete records could not be verified.' };
          }
        }
        // Paginated rows: fee_invoices
        const studentEmbed = canReadStudents
          ? ',student:students!fee_invoices_student_school_fkey(display_name,registration_number,school_id)'
          : '';

        let invoiceQuery = client
          .from('fee_invoices')
          .select(`id,student_id,invoice_number,title,due_date,amount_paise::text,paid_paise::text,status,school_id${studentEmbed}`, { count: 'exact' })
          .eq('school_id', schoolId);

        if (filters.status) invoiceQuery = invoiceQuery.eq('status', filters.status);
        if (filters.dateFrom) invoiceQuery = invoiceQuery.gte('issue_date', filters.dateFrom);
        if (filters.dateTo) invoiceQuery = invoiceQuery.lte('issue_date', filters.dateTo);

        if (filters.search) {
          if (canReadStudents) {
            const pattern = `"%${filters.search}%"`;
            invoiceQuery = invoiceQuery.or(`invoice_number.ilike.${pattern},title.ilike.${pattern},display_name.ilike.${pattern}`, {
              referencedTable: 'student',
            });
          } else {
            const pattern = `"%${filters.search}%"`;
            invoiceQuery = invoiceQuery.or(`invoice_number.ilike.${pattern},title.ilike.${pattern}`);
          }
        }

        invoiceQuery = invoiceQuery
          .order('issue_date', { ascending: false })
          .order('id')
          .range(start, start + REPORT_PAGE_SIZE);

        const invoiceRes = await invoiceQuery.overrideTypes<InvoiceQueryResult[], { merge: false }>();
        const rowsRaw = checkedFinanceRows(invoiceRes, start, REPORT_PAGE_SIZE + 1);
        const totalRows = invoiceRes.count!;
        const hasNext = rowsRaw.length > REPORT_PAGE_SIZE && filters.page < MAX_REPORT_PAGE;
        const rows: ReportTableRow[] = rowsRaw.slice(0, REPORT_PAGE_SIZE).map(inv => {
          const student = inv.student?.school_id === schoolId ? inv.student : null;
          const { amount, paid, outstanding } = reportInvoiceBalance(inv);
          return {
            reportKind: 'finance' as const,
            id: inv.id,
            studentId: inv.student_id,
            studentName: canReadStudents && student ? student.display_name : undefined,
            registrationNumber: canReadStudents && student ? student.registration_number : undefined,
            invoiceNumber: inv.invoice_number,
            title: inv.title,
            dueDate: inv.due_date,
            amountPaise: amount.toString(),
            paidPaise: paid.toString(),
            balancePaise: outstanding.toString(),
            status: inv.status,
          };
        });

        return {
          kind: 'ready',
          category: 'finance',
          filters,
          financeMetrics,
          rows,
          totalRows,
          page: filters.page,
          pageSize: REPORT_PAGE_SIZE,
          hasNext,
          permissions,
          options,
          exportNotice: EXPORT_LOCKED_NOTICE,
        };
      }

      case 'exams': {
        if (!canReadMarks) {
          return { kind: 'denied', reason: 'Exam and academic performance reports require marks.read permission.' };
        }

        // Aggregate exam sheets and score entries
        const [sheetsRes, entriesRes] = await Promise.all([
          client.from('marks_sheets').select('id,is_published,max_marks,passing_marks').eq('school_id', schoolId),
          client.from('marks_entries').select('marks_obtained, marks_sheet:marks_sheets!inner(school_id,max_marks,passing_marks)').eq('marks_sheet.school_id', schoolId).overrideTypes<MarksEntryRaw[], { merge: false }>(),
        ]);

        const sheets = sheetsRes.data ?? [];
        const entries = entriesRes.data ?? [];

        const totalExams = sheets.length;
        const publishedExams = sheets.filter(s => s.is_published).length;
        const totalEntries = entries.length;

        let passingEntries = 0;
        let scorePercentSum = 0;
        entries.forEach(e => {
          const obtained = Number(e.marks_obtained || 0);
          const maxMarks = Number(e.marks_sheet?.max_marks || 100);
          const passingMarks = Number(e.marks_sheet?.passing_marks || 40);
          if (obtained >= passingMarks) passingEntries += 1;
          if (maxMarks > 0) scorePercentSum += (obtained / maxMarks) * 100;
        });

        const passRatePercent = totalEntries > 0 ? (passingEntries / totalEntries) * 100 : 0;
        const averageScorePercent = totalEntries > 0 ? scorePercentSum / totalEntries : 0;

        const examMetrics: ExamReportMetrics = {
          totalExams,
          publishedExams,
          totalEntries,
          passingEntries,
          passRatePercent,
          averageScorePercent,
        };

        // Paginated rows: marks_entries joined with marks_sheets
        const studentEmbed = canReadStudents
          ? ',student:students!marks_entries_student_id_fkey(display_name,registration_number,school_id)'
          : '';
        const sheetEmbed = ',sheet:marks_sheets!inner(id,exam_name,subject_code,exam_date,max_marks,passing_marks,is_published,school_id,section:sections!marks_sheets_section_id_fkey(name,school_id,classroom:classes!sections_class_school_fkey(name,school_id)))';

        let entriesQuery = client
          .from('marks_entries')
          .select(`id,student_id,marks_obtained${studentEmbed}${sheetEmbed}`, { count: 'exact' })
          .eq('sheet.school_id', schoolId);

        if (filters.sectionId) entriesQuery = entriesQuery.eq('sheet.section_id', filters.sectionId);
        if (filters.search) {
          const pattern = `"%${filters.search}%"`;
          if (canReadStudents) {
            entriesQuery = entriesQuery.or(`display_name.ilike.${pattern},registration_number.ilike.${pattern}`, { referencedTable: 'student' });
          }
        }

        entriesQuery = entriesQuery
          .order('id')
          .range(start, start + REPORT_PAGE_SIZE);

        const entriesQueryRes = await entriesQuery.overrideTypes<ExamEntryQueryResult[], { merge: false }>();
        if (entriesQueryRes.error) return { kind: 'error', message: 'Failed to retrieve exam records.' };

        const totalRows = entriesQueryRes.count ?? 0;
        const rowsRaw = entriesQueryRes.data ?? [];
        const hasNext = rowsRaw.length > REPORT_PAGE_SIZE && filters.page < MAX_REPORT_PAGE;

        const rows: ReportTableRow[] = rowsRaw.slice(0, REPORT_PAGE_SIZE).map(entry => {
          const student = entry.student?.school_id === schoolId ? entry.student : null;
          const sheet = entry.sheet;
          const section = sheet?.section;
          const obtained = Number(entry.marks_obtained || 0);
          const maxMarks = Number(sheet?.max_marks || 100);
          const passingMarks = Number(sheet?.passing_marks || 40);
          return {
            reportKind: 'exams' as const,
            id: entry.id,
            sheetId: sheet?.id || '',
            examName: sheet?.exam_name || 'Exam',
            subjectCode: sheet?.subject_code || '',
            examDate: sheet?.exam_date || '',
            className: section?.classroom?.name,
            sectionName: section?.name,
            studentName: canReadStudents && student ? student.display_name : undefined,
            registrationNumber: canReadStudents && student ? student.registration_number : undefined,
            maxMarks,
            passingMarks,
            marksObtained: obtained,
            isPassing: obtained >= passingMarks,
            isPublished: Boolean(sheet?.is_published),
          };
        });

        return {
          kind: 'ready',
          category: 'exams',
          filters,
          examMetrics,
          rows,
          totalRows,
          page: filters.page,
          pageSize: REPORT_PAGE_SIZE,
          hasNext,
          permissions,
          options,
          exportNotice: EXPORT_LOCKED_NOTICE,
        };
      }

      case 'staff': {
        if (!canReadStaff) {
          return { kind: 'denied', reason: 'Staff and operations reports require staff.read permission.' };
        }

        const [staffRes, assignmentsRes] = await Promise.all([
          client.from('staff_profiles').select('profile_id,display_name,employee_code,department,is_active,school_id').eq('school_id', schoolId),
          client.from('teacher_assignments').select('id,teacher_profile_id,school_id').eq('school_id', schoolId),
        ]);

        const allStaff = staffRes.data ?? [];
        const assignments = assignmentsRes.data ?? [];

        const totalStaff = allStaff.length;
        const activeStaff = allStaff.filter(s => s.is_active).length;
        const inactiveStaff = totalStaff - activeStaff;

        const deptMap = new Map<string, number>();
        allStaff.forEach(s => {
          const dept = s.department || 'General';
          deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
        });
        const departmentBreakdown = Array.from(deptMap.entries()).map(([department, count]) => ({
          department,
          count,
        }));

        const staffMetrics: StaffReportMetrics = {
          totalStaff,
          activeStaff,
          inactiveStaff,
          totalTeacherAssignments: assignments.length,
          departmentBreakdown,
        };

        // Paginated rows
        let staffQuery = client
          .from('staff_profiles')
          .select('profile_id,display_name,employee_code,department,is_active,school_id', { count: 'exact' })
          .eq('school_id', schoolId);

        if (filters.search) {
          const pattern = `"%${filters.search}%"`;
          staffQuery = staffQuery.or(`display_name.ilike.${pattern},employee_code.ilike.${pattern},department.ilike.${pattern}`);
        }
        if (filters.status === 'active') staffQuery = staffQuery.eq('is_active', true);
        if (filters.status === 'inactive') staffQuery = staffQuery.eq('is_active', false);

        staffQuery = staffQuery
          .order('display_name')
          .order('profile_id')
          .range(start, start + REPORT_PAGE_SIZE);

        const listRes = await staffQuery.overrideTypes<StaffQueryResult[], { merge: false }>();
        if (listRes.error) return { kind: 'error', message: 'Failed to retrieve staff profiles.' };

        const totalRows = listRes.count ?? 0;
        const rowsRaw = listRes.data ?? [];
        const hasNext = rowsRaw.length > REPORT_PAGE_SIZE && filters.page < MAX_REPORT_PAGE;

        const assignmentCountMap = new Map<string, number>();
        assignments.forEach(a => {
          assignmentCountMap.set(a.teacher_profile_id, (assignmentCountMap.get(a.teacher_profile_id) ?? 0) + 1);
        });

        const rows: ReportTableRow[] = rowsRaw.slice(0, REPORT_PAGE_SIZE).map(st => ({
          reportKind: 'staff' as const,
          profileId: st.profile_id,
          displayName: st.display_name,
          employeeCode: st.employee_code,
          department: st.department || 'General',
          isActive: Boolean(st.is_active),
          assignedSectionsCount: assignmentCountMap.get(st.profile_id) ?? 0,
        }));

        return {
          kind: 'ready',
          category: 'staff',
          filters,
          staffMetrics,
          rows,
          totalRows,
          page: filters.page,
          pageSize: REPORT_PAGE_SIZE,
          hasNext,
          permissions,
          options,
          exportNotice: EXPORT_LOCKED_NOTICE,
        };
      }

      default:
        return { kind: 'invalid', message: 'Unsupported report category.' };
    }
  } catch {
    return { kind: 'error', message: 'An unexpected error occurred while generating reports.' };
  }
}

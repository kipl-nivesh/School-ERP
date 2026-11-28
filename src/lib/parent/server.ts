import 'server-only';
import { cache } from 'react';
import { isStaffUuid } from '@/lib/staff/contracts';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validAttendanceDate } from '@/lib/services/attendance-fields';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';
import type { ParentWorkspaceKey } from './parent-workspace';

export type ParentChildSummary = {
  relationship_id: string;
  student_id: string;
  student_name: string;
  full_name: string;
  registration_number: string;
  academic_access: boolean;
  fee_access: boolean;
  relationship_version: number;
  section_id: string | null;
  academic_year_id: string | null;
  class_name: string | null;
  section_name: string | null;
  academic_year: string | null;
};

export type ParentIdentity = {
  guardian_id: string;
  profile_id: string;
  school_id: string;
  school_name: string;
  display_name: string;
  database_date: string;
  children: ParentChildSummary[];
};

export type ParentAttendanceRow = {
  id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
};

export type ParentTimetableRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_code: string;
  room_number: string | null;
};

export type ParentHomeworkRow = {
  id: string;
  title: string;
  subject_code: string;
  due_date: string;
  description: string | null;
};

export type ParentExamScheduleRow = {
  id: string;
  title: string;
  subject_code: string;
  exam_date: string;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
};

export type ParentMarkRow = {
  id: string;
  marks_sheet_id: string;
  marks_obtained: number | null;
  exam_name: string;
  subject_code: string;
  max_marks: number;
  passing_marks: number;
  exam_date: string;
};

export type ParentInvoiceRow = {
  id: string;
  invoice_number: string;
  title: string;
  due_date: string;
  amount_paise: number;
  status: string;
};

export type ParentPaymentRow = {
  id: string;
  receipt_number: string;
  payment_date: string;
  amount_paise: number;
  payment_method: string;
  status: string;
};

export type ParentMaterialRow = {
  id: string;
  title: string;
  kind: 'document' | 'study_material';
  audience: 'school' | 'class' | 'section' | 'student';
  updated_at: string;
};

export type ParentAnnouncementRow = {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  published_at: string;
};

export type ParentModuleData = {
  workspace: ParentWorkspaceKey;
  selectedChild: ParentChildSummary | null;
  invalidChildRequested: boolean;
  overview?: {
    attendancePresent: number;
    attendanceTotal: number;
    activeHomeworkCount: number;
    upcomingExamsCount: number;
    outstandingPaise: number;
    recentAnnouncements: ParentAnnouncementRow[];
    upcomingExams: ParentExamScheduleRow[];
    dueHomework: ParentHomeworkRow[];
  };
  attendance?: {
    accessDenied: boolean;
    summary: { present: number; absent: number; late: number; excused: number; total: number };
    records: ParentAttendanceRow[];
  };
  timetable?: {
    accessDenied: boolean;
    slots: ParentTimetableRow[];
  };
  homework?: {
    accessDenied: boolean;
    items: ParentHomeworkRow[];
  };
  exams?: {
    accessDenied: boolean;
    schedule: ParentExamScheduleRow[];
    results: ParentMarkRow[];
  };
  fees?: {
    accessDenied: boolean;
    totalBilledPaise: number;
    totalPaidPaise: number;
    outstandingPaise: number;
    invoices: ParentInvoiceRow[];
    payments: ParentPaymentRow[];
  };
  materials?: {
    accessDenied: boolean;
    items: ParentMaterialRow[];
  };
  announcements?: {
    items: ParentAnnouncementRow[];
  };
};

export const getParentPortalAccess = cache(async () => {
  const config = getSupabasePublicConfiguration();
  if (!config.configured) return null;

  try {
    const client = await createServerSupabaseClient({ cookieWrites: 'read-only', httpOnlyCookies: true });
    const session = await client.auth.getClaims();
    if (session.error || !session.data?.claims) return null;

    const result = await client.rpc('read_parent_portal_identity');
    if (result.error || !Array.isArray(result.data) || result.data.length !== 1) return null;

    const row = result.data[0] as Partial<ParentIdentity> | null;
    if (
      !row ||
      !isStaffUuid(row.guardian_id) ||
      !isStaffUuid(row.profile_id) ||
      !isStaffUuid(row.school_id) ||
      typeof row.school_name !== 'string' ||
      typeof row.display_name !== 'string' ||
      typeof row.database_date !== 'string' ||
      !validAttendanceDate(row.database_date) ||
      !Array.isArray(row.children)
    ) {
      return null;
    }

    const children = (row.children as ParentChildSummary[]).filter(
      (c) =>
        c &&
        isStaffUuid(c.student_id) &&
        isStaffUuid(c.relationship_id) &&
        typeof c.student_name === 'string' &&
        typeof c.registration_number === 'string'
    );
    if (!children.length) return null;

    const identity: ParentIdentity = {
      guardian_id: row.guardian_id,
      profile_id: row.profile_id,
      school_id: row.school_id,
      school_name: row.school_name,
      display_name: row.display_name,
      database_date: row.database_date,
      children,
    };

    return { client, identity };
  } catch {
    return null;
  }
});

export function resolveSelectedChild(
  identity: ParentIdentity,
  requestedChild?: string | string[] | null,
): { child: ParentChildSummary | null; invalidChildRequested: boolean } {
  const raw = typeof requestedChild === 'string' ? requestedChild.trim() : '';
  if (!raw) {
    return { child: identity.children[0] ?? null, invalidChildRequested: false };
  }
  if (!isStaffUuid(raw)) {
    return { child: null, invalidChildRequested: true };
  }
  const match = identity.children.find((c) => c.student_id === raw) ?? null;
  return { child: match, invalidChildRequested: !match };
}

export async function readParentModuleData(
  access: NonNullable<Awaited<ReturnType<typeof getParentPortalAccess>>>,
  workspace: ParentWorkspaceKey,
  requestedChild?: string | string[] | null,
): Promise<ParentModuleData> {
  const { client, identity } = access;
  const { child, invalidChildRequested } = resolveSelectedChild(identity, requestedChild);
  if (invalidChildRequested || !child) {
    return { workspace, selectedChild: null, invalidChildRequested: true };
  }

  const school = identity.school_id;
  const student = child.student_id;
  const today = identity.database_date;

  if (workspace === 'children') {
    return { workspace, selectedChild: child, invalidChildRequested: false };
  }

  if (workspace === 'attendance') {
    if (!child.academic_access) {
      return {
        workspace,
        selectedChild: child,
        invalidChildRequested: false,
        attendance: { accessDenied: true, summary: { present: 0, absent: 0, late: 0, excused: 0, total: 0 }, records: [] },
      };
    }
    const res = await client
      .from('attendance_records')
      .select('id,attendance_date,status')
      .eq('school_id', school)
      .eq('student_id', student)
      .order('attendance_date', { ascending: false })
      .limit(200);
    const records = (res.data ?? []) as ParentAttendanceRow[];
    const summary = { present: 0, absent: 0, late: 0, excused: 0, total: records.length };
    for (const r of records) {
      if (r.status === 'present') summary.present += 1;
      else if (r.status === 'absent') summary.absent += 1;
      else if (r.status === 'late') summary.late += 1;
      else if (r.status === 'excused') summary.excused += 1;
    }
    return {
      workspace,
      selectedChild: child,
      invalidChildRequested: false,
      attendance: { accessDenied: false, summary, records },
    };
  }

  if (workspace === 'timetable') {
    if (!child.academic_access || !child.section_id) {
      return {
        workspace,
        selectedChild: child,
        invalidChildRequested: false,
        timetable: { accessDenied: !child.academic_access, slots: [] },
      };
    }
    const res = await client
      .from('timetable_slots')
      .select('day_of_week,start_time,end_time,subject_code,room_number')
      .eq('school_id', school)
      .eq('section_id', child.section_id)
      .order('day_of_week')
      .order('start_time')
      .limit(200);
    return {
      workspace,
      selectedChild: child,
      invalidChildRequested: false,
      timetable: { accessDenied: false, slots: (res.data ?? []) as ParentTimetableRow[] },
    };
  }

  if (workspace === 'homework') {
    if (!child.academic_access || !child.section_id) {
      return {
        workspace,
        selectedChild: child,
        invalidChildRequested: false,
        homework: { accessDenied: !child.academic_access, items: [] },
      };
    }
    const res = await client
      .from('homework_assignments')
      .select('id,title,subject_code,due_date,description')
      .eq('school_id', school)
      .eq('section_id', child.section_id)
      .eq('status', 'active')
      .order('due_date', { ascending: true })
      .limit(100);
    return {
      workspace,
      selectedChild: child,
      invalidChildRequested: false,
      homework: { accessDenied: false, items: (res.data ?? []) as ParentHomeworkRow[] },
    };
  }

  if (workspace === 'exams') {
    if (!child.academic_access) {
      return {
        workspace,
        selectedChild: child,
        invalidChildRequested: false,
        exams: { accessDenied: true, schedule: [], results: [] },
      };
    }
    const [schedRes, marksRes] = await Promise.all([
      child.section_id
        ? client
            .from('student_exam_schedule')
            .select('id,title,subject_code,exam_date,starts_at,ends_at,venue')
            .eq('school_id', school)
            .eq('section_id', child.section_id)
            .eq('status', 'published')
            .order('exam_date', { ascending: true })
            .limit(100)
        : Promise.resolve({ data: [] }),
      client
        .from('marks_entries')
        .select('id,marks_sheet_id,marks_obtained,marks_sheets:marks_sheets!marks_entries_sheet_school_fkey!inner(exam_name,subject_code,max_marks,passing_marks,exam_date,is_published)')
        .eq('school_id', school)
        .eq('student_id', student)
        .eq('marks_sheets.is_published', true)
        .limit(100),
    ]);
    const results: ParentMarkRow[] = ((marksRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const sheet = (Array.isArray(row.marks_sheets) ? row.marks_sheets[0] : row.marks_sheets) as Record<string, unknown>;
      return {
        id: String(row.id),
        marks_sheet_id: String(row.marks_sheet_id),
        marks_obtained: typeof row.marks_obtained === 'number' ? row.marks_obtained : null,
        exam_name: String(sheet?.exam_name ?? ''),
        subject_code: String(sheet?.subject_code ?? ''),
        max_marks: Number(sheet?.max_marks ?? 100),
        passing_marks: Number(sheet?.passing_marks ?? 35),
        exam_date: String(sheet?.exam_date ?? ''),
      };
    });
    return {
      workspace,
      selectedChild: child,
      invalidChildRequested: false,
      exams: {
        accessDenied: false,
        schedule: (schedRes.data ?? []) as ParentExamScheduleRow[],
        results,
      },
    };
  }

  if (workspace === 'fees') {
    if (!child.fee_access) {
      return {
        workspace,
        selectedChild: child,
        invalidChildRequested: false,
        fees: { accessDenied: true, totalBilledPaise: 0, totalPaidPaise: 0, outstandingPaise: 0, invoices: [], payments: [] },
      };
    }
    const [invRes, payRes] = await Promise.all([
      client
        .from('fee_invoices')
        .select('id,invoice_number,title,due_date,amount_paise,status')
        .eq('school_id', school)
        .eq('student_id', student)
        .order('due_date', { ascending: false })
        .limit(100),
      client
        .from('fee_payments')
        .select('id,receipt_number,payment_date,amount_paise,payment_method,status')
        .eq('school_id', school)
        .eq('student_id', student)
        .eq('status', 'settled')
        .order('payment_date', { ascending: false })
        .limit(100),
    ]);
    const invoices = (invRes.data ?? []) as ParentInvoiceRow[];
    const payments = (payRes.data ?? []) as ParentPaymentRow[];
    const totalBilledPaise = invoices.filter((i) => i.status !== 'void').reduce((s, i) => s + Number(i.amount_paise || 0), 0);
    const totalPaidPaise = payments.reduce((s, p) => s + Number(p.amount_paise || 0), 0);
    return {
      workspace,
      selectedChild: child,
      invalidChildRequested: false,
      fees: {
        accessDenied: false,
        totalBilledPaise,
        totalPaidPaise,
        outstandingPaise: Math.max(0, totalBilledPaise - totalPaidPaise),
        invoices,
        payments,
      },
    };
  }

  if (workspace === 'materials') {
    if (!child.academic_access) {
      return {
        workspace,
        selectedChild: child,
        invalidChildRequested: false,
        materials: { accessDenied: true, items: [] },
      };
    }
    const res = await client
      .from('student_portal_materials')
      .select('id,title,kind,audience,updated_at')
      .eq('school_id', school)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(100);
    return {
      workspace,
      selectedChild: child,
      invalidChildRequested: false,
      materials: { accessDenied: false, items: (res.data ?? []) as ParentMaterialRow[] },
    };
  }

  if (workspace === 'announcements') {
    const res = await client
      .from('announcements')
      .select('id,title,content,target_audience,published_at')
      .eq('school_id', school)
      .in('target_audience', ['all', 'parents'])
      .order('published_at', { ascending: false })
      .limit(50);
    return {
      workspace,
      selectedChild: child,
      invalidChildRequested: false,
      announcements: { items: (res.data ?? []) as ParentAnnouncementRow[] },
    };
  }

  // Default: overview — bounded, parallel summary queries scoped to selected child
  const [attRes, hwRes, exRes, invRes, payRes, annRes] = await Promise.all([
    child.academic_access
      ? client.from('attendance_records').select('status').eq('school_id', school).eq('student_id', student).limit(200)
      : Promise.resolve({ data: [] }),
    child.academic_access && child.section_id
      ? client.from('homework_assignments').select('id,title,subject_code,due_date,description').eq('school_id', school).eq('section_id', child.section_id).eq('status', 'active').gte('due_date', today).order('due_date').limit(5)
      : Promise.resolve({ data: [] }),
    child.academic_access && child.section_id
      ? client.from('student_exam_schedule').select('id,title,subject_code,exam_date,starts_at,ends_at,venue').eq('school_id', school).eq('section_id', child.section_id).eq('status', 'published').gte('exam_date', today).order('exam_date').limit(5)
      : Promise.resolve({ data: [] }),
    child.fee_access
      ? client.from('fee_invoices').select('amount_paise,status').eq('school_id', school).eq('student_id', student).limit(100)
      : Promise.resolve({ data: [] }),
    child.fee_access
      ? client.from('fee_payments').select('amount_paise').eq('school_id', school).eq('student_id', student).eq('status', 'settled').limit(100)
      : Promise.resolve({ data: [] }),
    client.from('announcements').select('id,title,content,target_audience,published_at').eq('school_id', school).in('target_audience', ['all', 'parents']).order('published_at', { ascending: false }).limit(4),
  ]);

  const attRows = (attRes.data ?? []) as Array<{ status: string }>;
  const attendancePresent = attRows.filter((r) => r.status === 'present').length;
  const totalBilled = ((invRes.data ?? []) as Array<{ amount_paise: number; status: string }>)
    .filter((i) => i.status !== 'void')
    .reduce((s, i) => s + Number(i.amount_paise || 0), 0);
  const totalPaid = ((payRes.data ?? []) as Array<{ amount_paise: number }>)
    .reduce((s, p) => s + Number(p.amount_paise || 0), 0);

  return {
    workspace: 'overview',
    selectedChild: child,
    invalidChildRequested: false,
    overview: {
      attendancePresent,
      attendanceTotal: attRows.length,
      activeHomeworkCount: (hwRes.data ?? []).length,
      upcomingExamsCount: (exRes.data ?? []).length,
      outstandingPaise: Math.max(0, totalBilled - totalPaid),
      recentAnnouncements: (annRes.data ?? []) as ParentAnnouncementRow[],
      upcomingExams: (exRes.data ?? []) as ParentExamScheduleRow[],
      dueHomework: (hwRes.data ?? []) as ParentHomeworkRow[],
    },
  };
}

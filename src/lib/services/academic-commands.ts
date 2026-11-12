import type { PolicyContext } from '../auth/types';
import { evaluatePermission } from '../auth/authorization';

const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
export type AcademicInput =
  | { kind: 'attendance'; section: string; student: string; status: string; remarks: string }
  | { kind: 'homework'; id: string; section: string; subject: string; title: string; description: string; due: string; points: number };
export interface AcademicDependencies {
  context(): Promise<PolicyContext>;
  execute(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}
/** Dependency injection tests the orchestration; the server adapter owns session provenance. */
export async function executeAcademic(input: AcademicInput, deps: AcademicDependencies): Promise<boolean> {
  if (!uuid(input.section)) return false;
  if (input.kind === 'attendance') {
    if (!uuid(input.student) || !['present','absent','late','excused'].includes(input.status) || input.remarks.length > 1000) return false;
  } else if (!uuid(input.id) || !input.title.trim() || input.title.length > 200 || !input.subject.trim() || input.subject.length > 80 ||
    input.description.length > 10000 || !/^\d{4}-\d{2}-\d{2}$/.test(input.due) || !Number.isInteger(input.points) || input.points < 1 || input.points > 10000) return false;
  try {
    const context = await deps.context();
    if (context?.source !== 'verified-server-session' || !context.schoolId ||
      !evaluatePermission(context, input.kind === 'attendance' ? 'attendance.write' : 'homework.write', Date.now()).allowed) return false;
    const result = input.kind === 'attendance'
      ? await deps.execute('save_attendance_atomic', { p_school_id: context.schoolId, p_section: input.section,
        p_entries: [{ studentId: input.student, status: input.status, remarks: input.remarks }] })
      : await deps.execute('create_homework_atomic', { p_school_id: context.schoolId, p_id: input.id, p_section: input.section,
        p_subject: input.subject.trim(), p_title: input.title.trim(), p_description: input.description, p_due: input.due, p_points: input.points });
    return !result.error && (input.kind === 'attendance' ? result.data === 1 : result.data === input.id);
  } catch { return false; }
}

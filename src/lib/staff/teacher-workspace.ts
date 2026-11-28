export type TeacherWorkspaceKey =
  | 'overview'
  | 'classes'
  | 'timetable'
  | 'attendance'
  | 'homework'
  | 'exams'
  | 'announcements'
  | 'reports';

export function resolveTeacherWorkspace(raw?: string | string[] | null): TeacherWorkspaceKey {
  const val = typeof raw === 'string' ? raw : '';
  if (
    val === 'classes' ||
    val === 'timetable' ||
    val === 'attendance' ||
    val === 'homework' ||
    val === 'exams' ||
    val === 'announcements' ||
    val === 'reports'
  ) {
    return val;
  }
  return 'overview';
}

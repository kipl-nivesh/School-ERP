export type StudentWorkspaceKey =
  | 'overview'
  | 'profile'
  | 'timetable'
  | 'attendance'
  | 'homework'
  | 'exams'
  | 'fees'
  | 'materials'
  | 'announcements';

export function resolveStudentWorkspace(raw?: string | string[] | null): StudentWorkspaceKey {
  const val = typeof raw === 'string' ? raw : '';
  if (
    val === 'profile' ||
    val === 'timetable' ||
    val === 'attendance' ||
    val === 'homework' ||
    val === 'exams' ||
    val === 'fees' ||
    val === 'materials' ||
    val === 'announcements'
  ) {
    return val;
  }
  return 'overview';
}

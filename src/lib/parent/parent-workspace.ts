export type ParentWorkspaceKey =
  | 'overview'
  | 'children'
  | 'attendance'
  | 'timetable'
  | 'homework'
  | 'exams'
  | 'fees'
  | 'materials'
  | 'announcements';

export function resolveParentWorkspace(raw?: string | string[] | null): ParentWorkspaceKey {
  const val = typeof raw === 'string' ? raw : '';
  if (
    val === 'children' ||
    val === 'attendance' ||
    val === 'timetable' ||
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

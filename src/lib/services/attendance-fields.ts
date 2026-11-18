export const attendanceStatuses = ['present', 'absent', 'late', 'excused'] as const;
export const attendanceId = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function validAttendanceDate(value: string) {
  const date = new Date(value + 'T00:00:00Z');
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) && !value.startsWith('0000') &&
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function attendanceEntryErrors(form: FormData) {
  const errors: Record<string, string> = {};
  if (!attendanceId.test(String(form.get('section') ?? '').trim())) errors.section = 'Enter a valid section ID.';
  if (!attendanceId.test(String(form.get('student') ?? '').trim())) errors.student = 'Select a student or enter a valid student ID.';
  if (!attendanceStatuses.some(status => status === form.get('status'))) errors.status = 'Select an attendance status.';
  if (String(form.get('remarks') ?? '').length > 1000) errors.remarks = 'Use at most 1,000 characters.';
  return errors;
}

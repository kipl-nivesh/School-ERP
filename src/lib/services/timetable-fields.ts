import { isRecordId } from './management-contracts';

export const timetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function timetableErrors(fields: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of ['sectionId', 'teacherId']) {
    if (!isRecordId(fields[field] ?? '')) errors[field] = 'Enter a valid record ID.';
  }
  if (!timetableDays.some(day => day === fields.day)) errors.day = 'Select a school day.';
  if (!/^(?:[1-9]|10)$/.test(fields.period ?? '')) errors.period = 'Enter a period from 1 to 10.';
  for (const field of ['subject', 'room']) {
    if (!fields[field]?.trim() || Array.from(fields[field].trim()).length > 80) errors[field] = 'Enter between 1 and 80 characters.';
  }
  const time = /^(?:(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?|24:00(?::00(?:\.0{1,6})?)?)$/;
  const seconds = (value: string) => {
    const [hours, minutes, seconds = '0'] = value.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  };
  if (!time.test(fields.start ?? '')) errors.start = 'Enter a valid start time.';
  if (!time.test(fields.end ?? '')) errors.end = 'Enter a valid end time.';
  else if (!errors.start && seconds(fields.end) <= seconds(fields.start)) errors.end = 'The end time must be after the start time.';
  if (!/^\d{1,10}$/.test(fields.revision ?? '') || Number(fields.revision) > 2147483647) errors.revision = 'Enter a valid nonnegative revision. Use 0 for a new slot.';
  return errors;
}

export function timetableFailure(error: { code?: string; message?: string }): string {
  if (error.code === '40001' && error.message === 'Stale timetable revision') return 'This slot changed. Reload the timetable and reopen the latest revision.';
  if (error.code === '23505' && error.message === 'Request conflict') return 'This request ID was used with different values. Reload the timetable and check the slot before starting a new request.';
  if (error.code === '23505') return 'The teacher or section already has an overlapping time or conflicting period number.';
  if (error.code === '42501' && error.message === 'Current subject assignment required') return 'A current teaching assignment is required for this teacher, section, and subject.';
  if (error.code === '42501' && error.message === 'Teacher unavailable') return 'The teacher is unavailable for this school. Check the teacher profile ID and assignment.';
  if (error.code === '42501') return 'You are not authorized to change this slot, or its section is unavailable in this school.';
  if (error.code === '22007' || error.code === '22008' || (error.code === '22023' && error.message === 'Invalid slot')) return 'Check the time range and room. End time must be after start time.';
  return 'The save could not be confirmed. Check the timetable before retrying. Keep this form open to retain the request ID.';
}

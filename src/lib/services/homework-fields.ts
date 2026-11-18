import { validAttendanceDate } from './attendance-fields';
import { isRecordId } from './management-contracts';

export function homeworkErrors(form: FormData, editing: boolean, assignedDate?: string) {
  const errors: Record<string, string> = {};
  const value = (field: string) => String(form.get(field) ?? '').trim();
  if (!value('title') || Array.from(value('title')).length > 200) errors.title = 'Enter a title of 1–200 characters.';
  if (Array.from(value('description')).length > 10000) errors.description = 'Enter instructions of at most 10,000 characters.';
  if (!validAttendanceDate(value('due')) || (assignedDate && value('due') < assignedDate)) errors.due = 'Enter a valid due date on or after the assigned date.';
  if (!/^\d{1,5}$/.test(value('points')) || Number(value('points')) < 1 || Number(value('points')) > 10000) errors.points = 'Enter a whole number from 1 to 10,000.';
  if (editing) {
    if (!isRecordId(value('recordId'))) errors.recordId = 'Enter a valid homework ID.';
    if (!/^[1-9]\d{0,9}$/.test(value('revision')) || Number(value('revision')) >= 2147483647) errors.revision = 'Enter the current positive revision.';
    if (!['active', 'closed'].includes(value('status'))) errors.status = 'Select Active or Closed.';
  } else {
    if (!isRecordId(value('section'))) errors.section = 'Select a section or enter its valid ID.';
    if (!value('subject') || Array.from(value('subject')).length > 80) errors.subject = 'Enter a subject code of 1–80 characters.';
  }
  return errors;
}

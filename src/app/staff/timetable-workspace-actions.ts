'use server';

import { readTimetable, type TimetableResult } from '@/lib/services/timetable-workspace';

export async function filterTimetable(_previous: TimetableResult, form: FormData) {
  return readTimetable(form);
}

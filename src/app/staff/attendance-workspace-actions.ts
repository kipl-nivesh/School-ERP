'use server';

import { readAttendance, type AttendanceResult } from '@/lib/services/attendance-workspace';

export async function filterAttendance(_previous: AttendanceResult, form: FormData) {
  return readAttendance(form);
}

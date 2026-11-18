'use server';

import { readStaffDirectory, type StaffDirectoryResult } from '@/lib/services/staff-directory';

export async function filterStaffDirectory(_previous: StaffDirectoryResult, form: FormData) {
  return readStaffDirectory(form);
}

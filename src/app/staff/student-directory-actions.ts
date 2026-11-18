'use server';

import { readStudentDirectory, type DirectoryResult } from '@/lib/services/student-directory';

export async function filterStudentDirectory(_previous: DirectoryResult, form: FormData): Promise<DirectoryResult> {
  return readStudentDirectory(form);
}

export async function filterAdmissionEnrollments(_previous: DirectoryResult, form: FormData): Promise<DirectoryResult> {
  return readStudentDirectory(form, 'admissions');
}

'use server';

import { readAcademicPage, type AcademicPage } from '@/lib/services/academic-directory';

export async function filterAcademicRecords(_previous: AcademicPage, form: FormData): Promise<AcademicPage> {
  return readAcademicPage(form.get('dataset'), form);
}

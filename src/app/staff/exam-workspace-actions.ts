'use server';

import { readExams, type ExamPage } from '@/lib/services/exam-workspace';

export async function filterExams(_previous: ExamPage, form: FormData) {
  return readExams(form);
}

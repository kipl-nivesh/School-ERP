'use server';

import { readHomework, type HomeworkPage } from '@/lib/services/homework-workspace';

export async function filterHomework(_previous: HomeworkPage, form: FormData): Promise<HomeworkPage> {
  return readHomework(form);
}

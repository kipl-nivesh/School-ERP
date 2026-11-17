'use server';

import { readReportsWorkspace, type ReportPage } from '@/lib/services/report-workspace';

export async function filterReports(
  _previous: ReportPage,
  form: FormData
): Promise<ReportPage> {
  return readReportsWorkspace(form);
}

'use server';

import { updateSchoolProfileName, type SettingsActionResult } from '@/lib/services/school-settings-workspace';

export async function updateSchoolNameAction(
  _previous: SettingsActionResult,
  form: FormData
): Promise<SettingsActionResult> {
  return updateSchoolProfileName(form);
}

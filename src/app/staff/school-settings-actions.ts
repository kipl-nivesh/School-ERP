'use server';

import {
  updateSchoolProfileName,
  updateSchoolTimezone,
  type SettingsActionResult,
} from '@/lib/services/school-settings-workspace';

export async function updateSchoolNameAction(
  _previous: SettingsActionResult,
  form: FormData
): Promise<SettingsActionResult> {
  return updateSchoolProfileName(form);
}

export async function updateSchoolTimezoneAction(
  _previous: SettingsActionResult,
  form: FormData
): Promise<SettingsActionResult> {
  return updateSchoolTimezone(form);
}

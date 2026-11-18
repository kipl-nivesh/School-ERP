'use server';

import { readAnnouncements, type AnnouncementPage } from '@/lib/services/announcement-workspace';

export interface AnnouncementActionState {
  readonly ok: boolean;
  readonly message: string;
}

export async function filterAnnouncements(
  _previous: AnnouncementPage,
  form: FormData
): Promise<AnnouncementPage> {
  return readAnnouncements(form);
}

'use server';

import { staffWorkspaceWritesEnabled } from '@/lib/services/staff-workspace-policy';
import { readAnnouncements, publishAnnouncement, type AnnouncementPage } from '@/lib/services/announcement-workspace';

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

export async function publishAnnouncementAction(
  _previous: AnnouncementActionState,
  form: FormData
): Promise<AnnouncementActionState> {
  if (!staffWorkspaceWritesEnabled()) {
    return { ok: false, message: 'Announcement publishing is unavailable during read-only recovery.' };
  }
  return publishAnnouncement(form);
}

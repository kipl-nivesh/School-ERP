export type AnnouncementAudience = 'all' | 'staff' | 'students' | 'parents';
export type AnnouncementStatus = 'active' | 'expired' | 'scheduled';
export type AnnouncementUrgency = 'urgent' | 'standard';

export interface AnnouncementRow {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly targetAudience: AnnouncementAudience;
  readonly category: string;
  readonly isUrgent: boolean;
  readonly publishedAt: string;
  readonly expiresAt: string | null;
  readonly authorProfileId: string;
  readonly authorName?: string;
  readonly authorEmployeeCode?: string;
  readonly authorDepartment?: string;
  readonly status: AnnouncementStatus;
}

export interface AnnouncementSummary {
  readonly totalCount: number;
  readonly activeCount: number;
  readonly urgentCount: number;
  readonly expiredCount: number;
}

export interface AnnouncementFilters {
  readonly search: string;
  readonly audience: string;
  readonly category: string;
  readonly urgency: string;
  readonly status: string;
  readonly dateFrom: string;
  readonly dateTo: string;
}

export type AnnouncementPage =
  | { readonly kind: 'denied' }
  | { readonly kind: 'invalid'; readonly message?: string }
  | { readonly kind: 'error'; readonly message?: string }
  | {
      readonly kind: 'ready';
      readonly rows: readonly AnnouncementRow[];
      readonly summary: AnnouncementSummary;
      readonly selectedAnnouncement?: AnnouncementRow;
      readonly filters: AnnouncementFilters;
      readonly page: number;
      readonly next: boolean;
      readonly canWrite: boolean;
    };

/** Formats ISO timestamp into readable date and time string in IST (Indian Standard Time). */
export function formatAnnouncementDateTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** Formats ISO timestamp into short date string (DD Mon YYYY). */
export function formatAnnouncementDate(isoString: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

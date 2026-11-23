import 'server-only';
import { staffWorkspaceWritesEnabled } from './staff-workspace-policy';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import { isRecordId } from './management-contracts';
import type {
  AnnouncementAudience,
  AnnouncementFilters,
  AnnouncementPage,
  AnnouncementRow,
  AnnouncementStatus,
  AnnouncementSummary,
} from './announcement-fields';

export * from './announcement-fields';

export async function readAnnouncements(form = new FormData()): Promise<AnnouncementPage> {
  const access = await getStaffAccess('admin');
  const school = access?.context.schoolId;
  if (!access || !school) return { kind: 'denied' };

  const allowed = (permission: string) => evaluatePermission(access.context, permission, Date.now()).allowed;
  if (!allowed('announcements.read')) {
    return { kind: 'denied' };
  }

  const field = (name: string) => {
    const val = form.get(name);
    return typeof val === 'string' ? val.trim() : '';
  };

  const rawSearch = field('search');
  const audience = field('audience');
  const category = field('category');
  const urgency = field('urgency');
  const status = field('status');
  const dateFrom = field('dateFrom');
  const dateTo = field('dateTo');
  const rawPage = field('page');
  const selectedId = field('announcementId');

  // Input Validation
  if (rawSearch.length > 80 || (rawSearch && !/^[\p{L}\p{M}\p{N} .'_@/-]*$/u.test(rawSearch))) {
    return { kind: 'invalid', message: 'Search term contains invalid characters.' };
  }
  if (audience && !['all', 'staff', 'students', 'parents'].includes(audience)) {
    return { kind: 'invalid', message: 'Invalid audience filter.' };
  }
  if (category.length > 50 || /[\x00-\x1f\x7f]/.test(category)) {
    return { kind: 'invalid', message: 'Invalid category filter.' };
  }
  if (urgency && !['urgent', 'standard'].includes(urgency)) {
    return { kind: 'invalid', message: 'Invalid urgency filter.' };
  }
  if (status && !['active', 'expired'].includes(status)) {
    return { kind: 'invalid', message: 'Invalid status filter.' };
  }
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    return { kind: 'invalid', message: 'Invalid start date format (YYYY-MM-DD).' };
  }
  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return { kind: 'invalid', message: 'Invalid end date format (YYYY-MM-DD).' };
  }
  if (selectedId && !isRecordId(selectedId)) {
    return { kind: 'invalid', message: 'Invalid announcement identifier.' };
  }

  const page = Number(rawPage || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000) {
    return { kind: 'invalid', message: 'Invalid page number.' };
  }
  const offset = (page - 1) * 25;

  const filters: AnnouncementFilters = {
    search: rawSearch,
    audience,
    category,
    urgency,
    status,
    dateFrom,
    dateTo,
  };

  try {
    const client = await staffClient();
    const nowIso = new Date().toISOString();

    // 1. School-wide Summary Metrics Calculation
    let totalCount = 0;
    let activeCount = 0;
    let urgentCount = 0;
    let expiredCount = 0;

    const summaryRes = await client
      .from('announcements')
      .select('id,is_urgent,published_at,expires_at,school_id')
      .eq('school_id', school);

    if (summaryRes.data) {
      for (const row of summaryRes.data) {
        if (row.school_id !== school) continue;
        totalCount++;
        const isExpired = row.expires_at ? row.expires_at <= nowIso : false;
        const isPublished = row.published_at <= nowIso;

        if (isExpired) {
          expiredCount++;
        } else if (isPublished) {
          activeCount++;
          if (row.is_urgent) {
            urgentCount++;
          }
        }
      }
    }

    const summary: AnnouncementSummary = {
      totalCount,
      activeCount,
      urgentCount,
      expiredCount,
    };

    // 2. Directory Query with 25-Row Server-Side Pagination
    const columns = [
      'id',
      'title',
      'content',
      'target_audience',
      'category',
      'is_urgent',
      'published_at',
      'expires_at',
      'author_profile_id',
      'school_id',
      'author:staff_profiles!announcements_author_fkey(display_name,employee_code,department,school_id)',
    ].join(',');

    let query = client
      .from('announcements')
      .select(columns)
      .eq('school_id', school);

    if (audience) {
      query = query.eq('target_audience', audience);
    }
    if (category) {
      query = query.ilike('category', category);
    }
    if (urgency === 'urgent') {
      query = query.eq('is_urgent', true);
    } else if (urgency === 'standard') {
      query = query.eq('is_urgent', false);
    }
    if (status === 'active') {
      query = query.lte('published_at', nowIso).or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    } else if (status === 'expired') {
      query = query.not('expires_at', 'is', null).lte('expires_at', nowIso);
    }
    if (dateFrom) {
      query = query.gte('published_at', `${dateFrom}T00:00:00Z`);
    }
    if (dateTo) {
      query = query.lte('published_at', `${dateTo}T23:59:59Z`);
    }
    if (rawSearch) {
      query = query.ilike('title', `%${rawSearch}%`);
    }

    query = query
      .order('published_at', { ascending: false })
      .order('id')
      .range(offset, offset + 25);

    const res = await query;
    if (res.error) {
      return { kind: 'error', message: 'Announcements could not be loaded.' };
    }

    const rawRows = (res.data ?? []) as unknown as Record<string, unknown>[];
    const tenantRows = rawRows.filter(r => r.school_id === school);
    const hasNext = tenantRows.length > 25 && page < 1000;

    const mapRow = (r: Record<string, unknown>): AnnouncementRow => {
      const pubAt = String(r.published_at);
      const expAt = r.expires_at ? String(r.expires_at) : null;
      let rowStatus: AnnouncementStatus = 'active';
      if (expAt && expAt <= nowIso) {
        rowStatus = 'expired';
      } else if (pubAt > nowIso) {
        rowStatus = 'scheduled';
      }

      const author = r.author as { display_name?: string; employee_code?: string; department?: string; school_id?: string } | undefined;
      const authorValid = author && (!author.school_id || author.school_id === school);

      return {
        id: String(r.id),
        title: String(r.title),
        content: String(r.content),
        targetAudience: String(r.target_audience) as AnnouncementAudience,
        category: String(r.category || 'general'),
        isUrgent: Boolean(r.is_urgent),
        publishedAt: pubAt,
        expiresAt: expAt,
        authorProfileId: String(r.author_profile_id),
        authorName: authorValid ? author?.display_name : undefined,
        authorEmployeeCode: authorValid ? author?.employee_code : undefined,
        authorDepartment: authorValid ? author?.department : undefined,
        status: rowStatus,
      };
    };

    const rows: AnnouncementRow[] = tenantRows.slice(0, 25).map(mapRow);

    // 3. Detail Selection Lookup
    let selectedAnnouncement: AnnouncementRow | undefined;
    if (selectedId) {
      selectedAnnouncement = rows.find(r => r.id === selectedId);
      if (!selectedAnnouncement) {
        const singleRes = (await client
          .from('announcements')
          .select(columns)
          .eq('school_id', school)
          .eq('id', selectedId)
          .maybeSingle()) as { data: Record<string, unknown> | null; error: unknown };

        if (singleRes.data && singleRes.data.school_id === school) {
          selectedAnnouncement = mapRow(singleRes.data);
        }
      }
    }

    const canWrite = allowed('announcements.write');

    return {
      kind: 'ready',
      rows,
      summary,
      selectedAnnouncement,
      filters,
      page,
      next: hasNext,
      canWrite,
    };
  } catch {
    return { kind: 'error', message: 'Announcements workspace could not be loaded.' };
  }
}

export async function publishAnnouncement(form: FormData): Promise<{ ok: boolean; message: string }> {
  if (!staffWorkspaceWritesEnabled()) {
    return { ok: false, message: 'Announcement publishing is unavailable during read-only recovery.' };
  }
  const access = await getStaffAccess('admin');
  const school = access?.context.schoolId;
  if (!access || !school) return { ok: false, message: 'Access denied: Admin access required.' };

  const allowed = (permission: string) => evaluatePermission(access.context, permission, Date.now()).allowed;
  if (!allowed('announcements.write')) {
    return { ok: false, message: 'Unauthorized: announcements.write permission required.' };
  }

  const field = (name: string) => {
    const val = form.get(name);
    return typeof val === 'string' ? val.trim() : '';
  };

  const title = field('title');
  const content = field('content');
  const category = field('category') || 'general';
  const isUrgent = field('isUrgent') === 'true';
  const targetAudience = field('targetAudience') || 'all';

  if (!title || title.length < 3) return { ok: false, message: 'Title must be at least 3 characters.' };
  if (!content || content.length < 5) return { ok: false, message: 'Content must be at least 5 characters.' };

  try {
    const client = await staffClient(true);
    const { error } = await client.from('announcements').insert({
      school_id: school,
      title,
      content,
      category,
      is_urgent: isUrgent,
      target_audience: targetAudience,
      author_profile_id: access.context.profileId,
      published_at: new Date().toISOString(),
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Announcement published successfully.' };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

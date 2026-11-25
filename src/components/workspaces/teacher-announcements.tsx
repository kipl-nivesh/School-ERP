import { randomUUID } from 'node:crypto';
import { evaluatePermission } from '@/lib/auth/authorization';
import { staffClient, type getStaffAccess } from '@/lib/staff/server';
import { TeacherAnnouncementForm } from './teacher-announcement-form';
import styles from './live-admin-dashboard.module.css';

async function readAnnouncements(school: string) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await (await staffClient()).from('announcements')
      .select('id,school_id,title,content,target_audience,author_profile_id')
      .eq('school_id', school).in('target_audience', ['staff', 'all'])
      .lte('published_at', now)
      .or('expires_at.is.null,expires_at.gt.' + now)
      .order('published_at', { ascending: false }).order('id').limit(25);
    return error || !data || data.some(row => row.school_id !== school) ? null : data;
  } catch { return null; }
}

export async function TeacherAnnouncements({ access }: { access: NonNullable<Awaited<ReturnType<typeof getStaffAccess>>> }) {
  const { context } = access;
  const school = context.schoolId;
  if (access.role !== 'teacher' || !school || !evaluatePermission(context, 'announcements.read', context.session.verifiedAt).allowed) {
    return <p role="status">Your membership does not grant announcement access.</p>;
  }
  const canWrite = evaluatePermission(context, 'announcements.write', context.session.verifiedAt).allowed;
  const data = await readAnnouncements(school);
  if (!data) return <p role="alert">Announcements could not be loaded.</p>;
  return <section className={styles.record} aria-labelledby="teacher-announcements">
      <h1 id="teacher-announcements">Staff announcements</h1>
      {canWrite && <TeacherAnnouncementForm school={school} id={randomUUID()} />}
      {data.length ? <ul>{data.map(row => <li key={row.id}>
        <h2>{row.title}</h2><p className="whitespace-pre-wrap break-words">{row.content}</p>
        {canWrite && row.author_profile_id === context.profileId && row.target_audience === 'staff' &&
          <TeacherAnnouncementForm school={school} id={row.id} archive />}
      </li>)}</ul> : <p>No current announcements.</p>}
    </section>;
}

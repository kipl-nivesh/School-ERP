export const COMMON_SCHOOL_TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
] as const;

export function isValidIanaTimezone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone || typeof timeZone !== 'string') return false;
  const trimmed = timeZone.trim();
  if (!trimmed || trimmed.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function schoolCalendarDate(now: Date, verifiedTimeZone: string | null): string | null {
  if (!verifiedTimeZone || !isValidIanaTimezone(verifiedTimeZone)) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: verifiedTimeZone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const date = ['year', 'month', 'day']
      .map((part) => parts.find((p) => p.type === part)?.value)
      .join('-');
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  } catch {
    return null;
  }
}

export function formatSchoolDateDDMMYYYY(
  isoDateOrTimestamp: string | Date,
  timeZone: string | null
): string {
  if (typeof isoDateOrTimestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDateOrTimestamp)) {
    const [y, m, d] = isoDateOrTimestamp.split('-');
    return `${d}-${m}-${y}`;
  }
  const date = isoDateOrTimestamp instanceof Date ? isoDateOrTimestamp : new Date(isoDateOrTimestamp);
  if (Number.isNaN(date.getTime())) {
    return typeof isoDateOrTimestamp === 'string' ? isoDateOrTimestamp : '';
  }
  const tz = isValidIanaTimezone(timeZone) ? timeZone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const d = parts.find((p) => p.type === 'day')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  return d && m && y ? `${d}-${m}-${y}` : date.toISOString().slice(0, 10);
}

export function formatSchoolTime12h(
  isoTimestamp: string | Date,
  timeZone: string | null
): string {
  const date = isoTimestamp instanceof Date ? isoTimestamp : new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  const tz = isValidIanaTimezone(timeZone) ? timeZone : 'UTC';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function getTimezoneOffsetLabel(now: Date, timeZone: string | null): string {
  if (!isValidIanaTimezone(timeZone)) return 'Unverified';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(now);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

import type { staffClient } from '../staff/server';

export type SchoolTimezoneClient = Awaited<ReturnType<typeof staffClient>>;

export async function readVerifiedSchoolTimezone(
  client: SchoolTimezoneClient,
  schoolId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('schools')
    .select('id,timezone,timezone_verified')
    .eq('id', schoolId)
    .maybeSingle();

  if (error || !data || data.id !== schoolId || data.timezone_verified !== true) {
    return null;
  }
  return isValidIanaTimezone(data.timezone) ? data.timezone : null;
}

export async function readSchoolTodayDate(
  client: SchoolTimezoneClient,
  schoolId: string,
  now: Date = new Date()
): Promise<string> {
  const verifiedTz = await readVerifiedSchoolTimezone(client, schoolId);
  return schoolCalendarDate(now, verifiedTz) ?? now.toISOString().slice(0, 10);
}

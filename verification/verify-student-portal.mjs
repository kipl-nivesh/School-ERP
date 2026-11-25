import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(path, 'utf8');
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
function load(path, imports = {}) {
  let source = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/import ['"]server-only['"];?/g, '');
  for (const [specifier, url] of Object.entries(imports)) {
    source = source.replaceAll("'" + specifier + "'", JSON.stringify(url));
  }
  return moduleUrl(source);
}

const dates = load('src/lib/services/attendance-fields.ts');
const identity = load('src/lib/student/identity-contracts.ts', { '../services/attendance-fields': dates });
const { projectStudentDashboard } = await import(load('src/lib/student/dashboard-repository.ts', {
  '../services/attendance-fields': dates, './identity-contracts': identity,
}));

const scope = { schoolId: 'school-a', studentId: 'student-a' };
const owner = { school_id: scope.schoolId, student_id: scope.studentId };
const section = { school_id: scope.schoolId, section_id: 'section-a' };
const profile = { displayName: 'Test Student', registration: 'TEST', schoolName: 'Test School', status: 'active' };
const date = '2026-11-25';
const exam = { ...section, id: 'exam', exam_name: 'Mathematics', subject_code: 'MATH', exam_date: date, is_published: true, max_marks: 100, passing_marks: 40 };
const base = {
  databaseDate: date,
  enrollments: [{ ...scope, sectionId: 'section-a', academicYearId: 'year-a', validFrom: '2026-01-01', validUntil: null }],
  placement: { ...section, class_name: 'Class A', section_name: 'Section A', academic_year_id: 'year-a', academic_year: '2026' },
  attendance: null, timetable: [], homework: [], examSchedule: [exam], results: [], announcements: [], invoices: [], receipts: [],
};
const project = snapshot => projectStudentDashboard(scope, profile, { ...base, ...snapshot }, Date.parse(date), 'students', true);

test('Student timetable covers the week and excludes a mismatched section', () => {
  const monday = { ...section, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', subject_code: 'MATH', room_number: '' };
  assert.deepEqual(project({ timetable: [{ ...monday, day_of_week: 'Friday' }, monday] }).timetable.data.map(value => value.day), ['Monday', 'Friday']);
  assert.equal(project({ timetable: [{ ...monday, section_id: 'other' }] }).timetable.kind, 'unavailable');
});

test('Student only receives their own published marks and financial records', () => {
  const result = { ...owner, exam, marks_obtained: 68 };
  const draft = { ...result, exam: { ...exam, is_published: false }, marks_obtained: 100 };
  const receipt = { ...owner, id: 'receipt-a', receipt_number: 'R-1', payment_date: date, amount_paise: 1200, status: 'settled' };
  assert.deepEqual(project({ results: [result, draft] }).results.data.map(value => value.score), [68]);
  assert.equal(project({ results: [{ ...result, student_id: 'another-student' }] }).results.kind, 'unavailable');
  assert.equal(project({ receipts: [receipt, { ...receipt, status: 'refunded' }] }).fees.data.receipts.length, 1);
  assert.equal(project({ receipts: [{ ...receipt, school_id: 'other-school' }] }).fees.kind, 'unavailable');
});

test('Student retains own published results after a section transfer', () => {
  const historical = { ...owner, exam: { ...exam, section_id: 'former-section', exam_date: '2026-10-01' }, marks_obtained: 71 };
  const draft = { ...historical, exam: { ...historical.exam, is_published: false } };
  assert.deepEqual(project({ results: [historical, draft] }).results.data.map(value => value.score), [71]);
  assert.equal(project({ results: [{ ...historical, exam: { ...historical.exam, school_id: 'other-school' } }] }).results.kind, 'unavailable');
});

test('Student projection denies an ambiguous current enrollment', () => {
  const duplicate = { ...base.enrollments[0], sectionId: 'section-b' };
  const result = project({ enrollments: [...base.enrollments, duplicate] });
  assert.equal(result.placement.kind, 'ambiguous');
  assert.equal(result.timetable.kind, 'unavailable');
});

test('Live route and PIN broker fail closed and do not use fixture fallbacks', () => {
  const action = read('src/app/login/student/actions.ts');
  const route = read('src/app/(dashboard)/student/dashboard/page.tsx');
  const sql = read('supabase/migrations/20261125004200_student_portal_access.sql');
  assert.doesNotMatch(action, /TEST_STUDENT|\.env\.test|\.ilike\(/);
  assert.ok(action.indexOf('begin_student_pin_attempt') < action.indexOf('verifyPinHash(pin,'));
  assert.ok(action.indexOf('bind_student_pin_session') < action.indexOf('client.auth.setSession('));
  assert.match(route, /export const dynamic = 'force-dynamic'/);
  assert.match(route, /if \(!access\) redirect\('\/login\/student'\)/);
  assert.match(sql, /bind_student_pin_session\(uuid,uuid,uuid,uuid,integer\) to service_role/);
  assert.match(sql, /p\.authorization_version = rc\.authorization_version/);
  assert.match(sql, /c\.credential_version = rc\.context_version/);
  assert.match(sql, /m?embership_status = 'active'/);
  assert.match(sql, /student_no_insert/);
  assert.match(sql, /student_no_update/);
  assert.match(sql, /student_no_delete/);
});

test('Schedule and material publication stays separate from marks and is read-only for Students', () => {
  const sql = read('supabase/migrations/20261125004300_student_portal_publications.sql');
  const view = read('src/lib/student/live-dashboard.ts');
  const download = read('src/app/(dashboard)/student/materials/[id]/route.ts');
  assert.doesNotMatch(sql, /alter table public\.marks_(?:sheets|entries)/);
  assert.match(sql, /student_exam_schedule force row level security/);
  assert.match(sql, /student_portal_materials force row level security/);
  assert.match(sql, /grant select on public\.student_exam_schedule,public\.student_portal_materials to authenticated/);
  assert.match(sql, /audience='student' and me\.student_id=student_portal_materials\.student_id/);
  assert.match(sql, /status='published' and public\.current_active_role\(\)='student'/);
  assert.match(view, /from\('student_exam_schedule'\)/);
  assert.match(view, /from\('marks_entries'\)[\s\S]*?eq\('exam.is_published', true\)/);
  const historicalGuard = read('supabase/migrations/20261125004800_student_historical_published_marks.sql');
  assert.match(historicalGuard, /entry\.school_id = me\.school_id and entry\.student_id = me\.student_id/);
  assert.match(historicalGuard, /ms\.is_published is true/);
  assert.match(historicalGuard, /enrollment\.section_id = ms\.section_id[\s\S]*?enrollment\.valid_from <= ms\.exam_date[\s\S]*?enrollment\.valid_until >= ms\.exam_date/);
  assert.match(download, /private, no-store/);
  assert.match(download, /text\/plain/);
  assert.match(download, /nosniff/);
});

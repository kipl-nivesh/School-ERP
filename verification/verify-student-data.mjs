import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const transpile = filename => ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleURL = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const helperURL = moduleURL(transpile('src/features/student-dashboard/lib/calculations.ts'));
const calculations = await import(helperURL);
const source = transpile('src/features/student-dashboard/data/mock-dashboard.ts').replace(/(['"])\.\.\/lib\/calculations\1/g, JSON.stringify(helperURL));
const data = await import(moduleURL(source));
const { studentProfile: profile } = data;

assert.equal(new Set(data.studentSubjects.map(subject => subject.id)).size, 5);
assert.equal(data.studentTimetable.length, 6);
assert.deepEqual(data.studentTimetable.map(period => calculations.studentPeriodStatus(period, profile.referenceTime)), ['Completed', 'Completed', 'Current', 'Upcoming', 'Upcoming', 'Upcoming']);
for (const [index, period] of data.studentTimetable.entries()) {
  assert.ok(calculations.getStudentSubject(period.subjectId, data.studentSubjects));
  assert.ok(calculations.minutes(period.start) < calculations.minutes(period.end));
  if (index) assert.ok(calculations.minutes(data.studentTimetable[index - 1].end) <= calculations.minutes(period.start));
}
assert.equal(calculations.studentPeriodStatus({ start: '10:20', end: '11:00' }, '10:20'), 'Current');
assert.equal(calculations.studentPeriodStatus({ start: '09:20', end: '10:20' }, '10:20'), 'Completed');
assert.equal(calculations.studentPeriodStatus({ start: '10:21', end: '11:00' }, '10:20'), 'Upcoming');
assert.equal(new Set(data.studentAttendance.map(record => record.date)).size, data.studentAttendance.length);
assert.equal(data.attendanceSummary.scheduled, 93);
assert.equal(data.attendanceSummary.present, 88);
assert.equal(data.attendanceSummary.absent, 5);
assert.equal(data.attendanceSummary.percentage.toFixed(1), '94.6');
assert.equal(data.studentAttendance.at(-1).date, profile.referenceDate);
assert.equal(data.studentAttendance.at(-1).status, 'Present');
for (const record of data.studentAttendance) assert.ok(record.date <= profile.referenceDate && record.date >= '2026-07-01');
assert.deepEqual(data.attendanceMonths.map(month => [month.scheduled, month.present, month.absent]), [[23,22,1],[21,20,1],[22,20,2],[24,23,1],[3,3,0]]);
assert.equal(data.attendanceMonths.reduce((sum, month) => sum + month.scheduled, 0), data.attendanceSummary.scheduled);
assert.equal(data.attendanceMonths.reduce((sum, month) => sum + month.present, 0), data.attendanceSummary.present);
for (const month of data.attendanceMonths) assert.equal(month.present + month.absent, month.scheduled);
assert.deepEqual(data.homeworkSummary, { total: 6, completed: 3, pending: 3 });
assert.equal(calculations.filterStudentHomework(data.studentHomework, 'all').length, 6);
assert.equal(calculations.filterStudentHomework(data.studentHomework, 'pending').length, 3);
assert.equal(calculations.filterStudentHomework(data.studentHomework, 'completed').length, 3);
assert.deepEqual(data.studentHomework.map(item => calculations.homeworkStatus(item, profile.referenceDate)), ['Overdue', 'Due soon', 'Pending', 'Completed', 'Completed', 'Completed']);
for (const item of data.studentHomework) {
  assert.ok(calculations.getStudentSubject(item.subjectId, data.studentSubjects));
  assert.ok(item.assignedDate <= item.dueDate && item.assignedDate <= profile.referenceDate);
  assert.ok(item.progress >= 0 && item.progress <= 100);
  if (item.completedDate) {
    assert.ok(item.completedDate >= item.assignedDate && item.completedDate <= profile.referenceDate);
    assert.equal(item.progress, 100);
  }
}
assert.equal(calculations.daysBetween('2026-11-04', '2026-11-04'), 0);
assert.equal(calculations.daysBetween('2026-03-28', '2026-03-30'), 2);
assert.deepEqual(data.studentExams.map(exam => calculations.daysBetween(profile.referenceDate, exam.date)), [6,7,9]);
for (const exam of data.studentExams) {
  assert.ok(exam.date > profile.referenceDate);
  assert.ok(calculations.minutes(exam.start) < calculations.minutes(exam.end));
  assert.ok(calculations.getStudentSubject(exam.subjectId, data.studentSubjects));
}
assert.equal(data.academicSummary.obtained, 413);
assert.equal(data.academicSummary.maximum, 500);
assert.equal(data.academicSummary.percentage, 82.6);
assert.equal(data.academicSummary.strongest.subjectId, 'computer-science');
assert.equal(data.academicSummary.focus.subjectId, 'social-science');
assert.equal(new Set(data.studentMarks.map(mark => mark.subjectId)).size, data.studentSubjects.length);
for (const mark of data.studentMarks) {
  assert.ok(mark.obtained >= 0 && mark.obtained <= mark.maximum && mark.maximum > 0);
  assert.ok(mark.date <= profile.referenceDate);
}
const weighted = calculations.summarizeMarks([{ obtained: 10, maximum: 20 }, { obtained: 90, maximum: 100 }]);
assert.ok(Math.abs(weighted.percentage - 100 / 120 * 100) < 1e-10);
assert.equal(data.studentAchievements.length, 5);
assert.equal(data.earnedBadgeCount, 3);
assert.deepEqual(data.studentAchievements.filter(badge => badge.earned).map(badge => badge.id), ['attendance', 'homework', 'science']);
assert.deepEqual(data.studentAchievements.filter(badge => !badge.earned).map(badge => badge.id), ['reading', 'mathematics']);
assert.equal(data.studentAchievements.find(badge => badge.id === 'attendance').earned, data.attendanceSummary.percentage >= 90);
assert.equal(data.studentAchievements.find(badge => badge.id === 'homework').earned, data.homeworkSummary.completed >= 3);
assert.equal(data.studentAchievements.find(badge => badge.id === 'reading').earned, data.readingChapters.length >= 6);
for (const goal of data.studentGoals) assert.ok(goal.current >= 0 && goal.current <= goal.target && goal.target > 0);
assert.equal(data.studentGoals.find(goal => goal.id === 'homework-goal').current, data.homeworkSummary.completed);
assert.equal(data.studentGoals.find(goal => goal.id === 'homework-goal').target, data.homeworkSummary.total);
assert.equal(data.studentGoals.find(goal => goal.id === 'reading-goal').current, data.readingChapters.length);
assert.equal(data.studentGoals.find(goal => goal.id === 'science-goal').current, data.sciencePractice.length);
for (const item of [...data.readingChapters, ...data.sciencePractice]) assert.ok(item.date <= profile.referenceDate);
assert.ok(data.studentAnnouncements.every(item => item.date > profile.referenceDate));
assert.deepEqual(data.studentStats.map(stat => stat.value), ['94.6%', '82.6%', '3', '3', '3', '6']);
assert.equal(new Set(data.studentQuickLinks.map(link => link.target)).size, 6);
console.log('PASS: fixed timetable statuses/boundaries, 93-day attendance calendar and monthly totals, homework partitions/statuses, weighted marks, exact 6/7/9-day countdowns, earned/locked badges, learning goals, and all six derived statistics.');

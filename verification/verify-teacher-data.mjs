import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/features/teacher-dashboard/data/mock-dashboard.ts', 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const data = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
const { assignedClasses, timetable, teacherProfile, getTeacherClass } = data;
assert.equal(new Set(assignedClasses.map(group => group.id)).size, assignedClasses.length);
assert.equal(data.totalStudents, 120);
assert.equal(data.presentToday, 114);
assert.equal(data.attendancePercent, 95);
for (const group of assignedClasses) assert.ok(group.present >= 0 && group.present <= group.students);
for (const day of data.weeklyAttendance) {
  assert.equal(day.present + day.absent, data.totalStudents);
  assert.ok(day.date <= teacherProfile.referenceDate && day.present >= 0 && day.absent >= 0);
}
assert.equal(data.weeklyAttendance.at(-1).present, data.presentToday);
assert.equal(data.weeklyAttendance.at(-1).date, teacherProfile.referenceDate);
assert.equal(data.weeklyAttendancePercent.toFixed(1), '93.5');
assert.equal(new Set(timetable.map(period => period.period)).size, timetable.length);
for (const [index, period] of timetable.entries()) {
  assert.ok(getTeacherClass(period.classId));
  assert.ok(data.toMinutes(period.start) < data.toMinutes(period.end));
  if (index) assert.ok(data.toMinutes(timetable[index - 1].end) <= data.toMinutes(period.start));
}
assert.deepEqual(timetable.map(data.periodStatus), ['Completed', 'Completed', 'Current', 'Upcoming', 'Upcoming']);
assert.equal(data.periodStatus({ start: '10:20', end: '11:00' }), 'Current');
assert.equal(data.periodStatus({ start: '09:30', end: '10:20' }), 'Completed');
assert.equal(data.periodStatus({ start: '10:21', end: '11:00' }), 'Upcoming');
for (const assignment of data.homework) {
  const group = getTeacherClass(assignment.classId);
  assert.ok(assignment.reviewed >= 0 && assignment.reviewed <= assignment.submitted && assignment.submitted <= group.students);
  assert.equal(assignment.reviewed + (assignment.submitted - assignment.reviewed) + (group.students - assignment.submitted), group.students);
}
assert.deepEqual(data.homeworkTotals, { expected: 120, submitted: 108, reviewed: 74, pending: 34 });
for (const exam of data.upcomingExams) {
  assert.ok(getTeacherClass(exam.classId));
  assert.ok(exam.date > teacherProfile.referenceDate);
  assert.ok(data.toMinutes(exam.start) < data.toMinutes(exam.end));
}
for (const [index, exam] of data.upcomingExams.entries()) {
  for (const next of data.upcomingExams.slice(index + 1)) {
    if (next.date === exam.date) assert.ok(data.toMinutes(exam.end) <= data.toMinutes(next.start) || data.toMinutes(next.end) <= data.toMinutes(exam.start));
  }
}
for (const item of data.performance) {
  assert.equal(item.scores.reduce((n, group) => n + group.count, 0), getTeacherClass(item.classId).students);
  assert.ok(item.scores.every(group => group.score >= 0 && group.score <= 100 && group.count >= 0));
  assert.ok(data.classAverage(item) >= 0 && data.classAverage(item) <= 100);
}
assert.equal(data.performanceTotalMarks, 8880);
assert.equal(data.overallAverage, 74);
assert.deepEqual(data.performanceBands.map(band => band.count), [40, 44, 27, 9]);
assert.equal(data.performanceBands.reduce((n, band) => n + band.count, 0), data.totalStudents);
assert.equal(data.studentsNeedingSupport, 9);
const referenceTimestamp = teacherProfile.referenceDate + 'T' + teacherProfile.referenceTime + ':00+05:30';
for (const [index, activity] of data.activities.entries()) {
  assert.ok(activity.timestamp.startsWith(teacherProfile.referenceDate));
  assert.ok(activity.timestamp <= referenceTimestamp);
  if (index) assert.ok(data.activities[index - 1].timestamp >= activity.timestamp);
}
assert.ok(data.announcements.every(item => item.date > teacherProfile.referenceDate));
assert.equal(data.teacherStats.find(stat => stat.icon === 'classes').value, String(assignedClasses.length));
assert.equal(data.teacherStats.find(stat => stat.icon === 'students').value, String(data.totalStudents));
assert.equal(data.teacherStats.find(stat => stat.icon === 'attendance').value, '95.0%');
assert.equal(data.teacherStats.find(stat => stat.icon === 'homework').value, String(data.homeworkTotals.pending));
assert.equal(data.teacherStats.find(stat => stat.icon === 'exams').value, String(data.upcomingExams.length));
assert.equal(data.teacherStats.find(stat => stat.icon === 'periods').value, String(timetable.length));
console.log('PASS: class enrollment, daily/weekly attendance, all six statistics, fixed timetable statuses and boundaries, schedule conflicts, homework counts, exam dates, weighted performance, score bands, and activity timestamps.');

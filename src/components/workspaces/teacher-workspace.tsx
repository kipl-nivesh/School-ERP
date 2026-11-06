'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  CheckCircle,
  FileText,
  Award,
  Calendar,
  Bell,
  BarChart3,
  Plus,
  Save,
  Send,
  AlertCircle,
} from 'lucide-react';
import {
  MetricCard,
  StatusBadge,
  ModalDialog,
} from './workspace-ui';
import { TeacherService } from '@/lib/services/development-adapter';
import type { PolicyContext } from '@/lib/auth/types';
import type { AttendanceEntryItem } from '@/lib/domain/dashboard-contracts';

// Development context with Teacher permissions
const devTeacherContext: PolicyContext = {
  source: 'verified-server-session' as const,
  profileId: 'stf-tch-1',
  accountStatus: 'active' as const,
  credentialResetRequired: false,
  authorizationVersion: 1,
  currentAuthorizationVersion: 1,
  session: {
    id: 'dev-teacher-session',
    profileId: 'stf-tch-1',
    verifiedAt: Date.now(),
    authenticatedAt: Date.now() - 60000,
    expiresAt: Date.now() + 3600000,
    revoked: false,
    assurance: 'aal1' as const,
    reauthenticatedAt: Date.now() - 1000,
  },
  activeRole: {
    sessionId: 'dev-teacher-session',
    profileId: 'stf-tch-1',
    role: 'teacher' as const,
    assignmentId: 'mem-teacher',
    version: 1,
    currentVersion: 1,
    expiresAt: Date.now() + 1800000,
    revoked: false,
  },
  assignments: [
    {
      id: 'mem-teacher',
      profileId: 'stf-tch-1',
      role: 'teacher' as const,
      status: 'active' as const,
      validFrom: Date.now() - 3600000,
      validUntil: null,
      permissions: [
        'dashboard.teacher.view',
        'students.read',
        'attendance.read',
        'attendance.write',
        'homework.read',
        'homework.write',
        'marks.read',
        'marks.write',
        'marks.publish',
        'reports.read',
        'announcements.read',
        'announcements.write',
        'documents.read',
      ],
    },
  ],
} as unknown as PolicyContext;

type TeacherTab =
  | 'classes'
  | 'roster'
  | 'attendance'
  | 'homework'
  | 'marks'
  | 'timetable'
  | 'announcements'
  | 'performance';

export function TeacherWorkspace({ context }: { context?: PolicyContext } = {}) {
  const activeContext = context || devTeacherContext;
  const [activeTab, setActiveTab] = useState<TeacherTab>('classes');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active assigned class selection
  const assignedClassesResult = TeacherService.getAssignedClasses(activeContext, 'stf-tch-1');
  const assignedClasses = assignedClassesResult.success ? assignedClassesResult.data : [];
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const activeClass = assignedClasses[selectedClassIndex] || assignedClasses[0];

  // Roster
  const rosterResult = activeClass
    ? TeacherService.getStudentRoster(activeContext, activeClass.classId, activeClass.sectionId, 'stf-tch-1')
    : { success: false, data: [] };
  const roster = rosterResult.success ? rosterResult.data : [];

  // Attendance Entry State
  const [attendanceDate, setAttendanceDate] = useState('2026-11-05');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({
    'stu-101': 'present',
    'stu-102': 'present',
    'stu-103': 'late',
  });

  // Homework State
  const homeworkResult = activeClass
    ? TeacherService.listHomework(activeContext, activeClass.classId, activeClass.sectionId)
    : { success: false, data: [] };
  const homeworkList = homeworkResult.success ? homeworkResult.data : [];
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwDueDate, setHwDueDate] = useState('2026-11-10');

  // Marks Entry State
  const [examName, setExamName] = useState('Unit Test 2');
  const [maxMarks, setMaxMarks] = useState(25);
  const [marksInputs, setMarksInputs] = useState<Record<string, number>>({
    'stu-101': 23,
    'stu-102': 25,
    'stu-103': 19,
  });

  // Timetable
  const timetableResult = TeacherService.getTeacherTimetable(activeContext, 'stf-tch-1');
  const timetable = timetableResult.success ? timetableResult.data : null;

  // Handlers
  const handleSaveAttendance = () => {
    if (!activeClass) return;
    const entries: AttendanceEntryItem[] = roster.map(s => ({
      studentId: s.id,
      rollNumber: s.rollNumber,
      studentName: s.fullName,
      status: attendanceRecords[s.id] || 'present',
    }));

    const res = TeacherService.recordAttendance(
      activeContext,
      activeClass.classId,
      activeClass.sectionId,
      attendanceDate,
      entries,
      'stf-tch-1'
    );

    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Attendance saved successfully' });
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  const handleCreateHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    const res = TeacherService.createHomework(
      activeContext,
      activeClass.classId,
      activeClass.sectionId,
      activeClass.subjectName,
      hwTitle,
      hwDesc,
      hwDueDate,
      'stf-tch-1'
    );

    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Homework published successfully' });
      setIsHomeworkModalOpen(false);
      setHwTitle('');
      setHwDesc('');
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  const handleSaveMarksDraft = () => {
    if (!activeClass) return;
    const entries = roster.map(s => ({
      studentId: s.id,
      marksObtained: marksInputs[s.id] || 0,
    }));

    const res = TeacherService.recordMarksDraft(
      activeContext,
      activeClass.classId,
      activeClass.sectionId,
      examName,
      activeClass.subjectName,
      maxMarks,
      entries,
      'stf-tch-1'
    );

    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Marks draft saved' });
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  const handlePublishMarks = () => {
    // Publish ms-01
    const res = TeacherService.publishMarks(activeContext, 'ms-01', 'stf-tch-1');
    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Marks published to student portal' });
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  return (
    <div className="space-y-6">
      {/* Dev Mode Banner */}
      <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 flex items-center justify-between text-xs text-sky-900">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
          <span className="font-semibold">Educator Workspace</span>
          <span className="text-sky-600 font-normal">| Connected to Development Service Adapter (Class-Scoped)</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-medium">Logged in: Pooja Verma (Senior Teacher)</span>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="font-bold hover:opacity-75">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-medium text-slate-600">
        {[
          { id: 'classes', label: 'My Assigned Classes', icon: BookOpen },
          { id: 'roster', label: 'Student Roster', icon: Users },
          { id: 'attendance', label: 'Attendance Register', icon: CheckCircle },
          { id: 'homework', label: 'Homework & Assignments', icon: FileText },
          { id: 'marks', label: 'Marks & Assessment', icon: Award },
          { id: 'timetable', label: 'Weekly Timetable', icon: Calendar },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'performance', label: 'Performance Analytics', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TeacherTab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                isActive ? 'bg-slate-900 text-white font-semibold' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ASSIGNED CLASSES */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Assigned Classes & Subjects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedClasses.map((ac, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-slate-900">{ac.className} - Section {ac.sectionName}</h3>
                  {ac.isClassTeacher && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Class Teacher
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-600 font-semibold mb-1">Subject: {ac.subjectName}</p>
                <p className="text-xs text-slate-500 mb-3">{ac.studentCount} Students Enrolled</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedClassIndex(idx);
                      setActiveTab('attendance');
                    }}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-semibold"
                  >
                    Take Attendance
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClassIndex(idx);
                      setActiveTab('homework');
                    }}
                    className="px-2.5 py-1 border border-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
                  >
                    Assign Homework
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ROSTER */}
      {activeTab === 'roster' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Student Roster — {activeClass?.className}-{activeClass?.sectionName}
              </h2>
              <p className="text-xs text-slate-500">Subject: {activeClass?.subjectName} ({roster.length} students)</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Roll No</th>
                  <th className="py-2 px-3">Student Name</th>
                  <th className="py-2 px-3">Gender</th>
                  <th className="py-2 px-3">Guardian Name</th>
                  <th className="py-2 px-3">Guardian Phone</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-medium">{s.rollNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{s.fullName}</td>
                    <td className="py-2.5 px-3 capitalize">{s.gender}</td>
                    <td className="py-2.5 px-3">{s.guardianName}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{s.guardianPhone}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE ENTRY */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Daily Attendance Register — {activeClass?.className}-{activeClass?.sectionName}
              </h2>
              <p className="text-xs text-slate-500">Record and verify daily attendance for your section.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800"
              />
              <button
                onClick={handleSaveAttendance}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Attendance</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {roster.map(s => {
              const currentStatus = attendanceRecords[s.id] || 'present';
              return (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                  <div>
                    <span className="font-mono text-slate-400 mr-2">{s.rollNumber}</span>
                    <span className="font-semibold text-slate-900">{s.fullName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['present', 'late', 'absent', 'excused'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => setAttendanceRecords({ ...attendanceRecords, [s.id]: st })}
                        className={`px-3 py-1 rounded-md capitalize font-semibold transition-colors ${
                          currentStatus === st
                            ? st === 'present'
                              ? 'bg-emerald-600 text-white'
                              : st === 'late'
                              ? 'bg-amber-600 text-white'
                              : st === 'absent'
                              ? 'bg-rose-600 text-white'
                              : 'bg-sky-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: HOMEWORK */}
      {activeTab === 'homework' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Homework & Assignments — {activeClass?.className}-{activeClass?.sectionName}
              </h2>
              <p className="text-xs text-slate-500">Create, schedule, and review homework submissions.</p>
            </div>
            <button
              onClick={() => setIsHomeworkModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              <span>New Assignment</span>
            </button>
          </div>

          <div className="space-y-3">
            {homeworkList.map(hw => (
              <div key={hw.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-slate-900">{hw.title}</h3>
                  <StatusBadge status={hw.status} />
                </div>
                <p className="text-xs text-slate-600 mb-2">{hw.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-2">
                  <span>Assigned: {hw.assignedDate} | Due: <strong className="text-slate-700">{hw.dueDate}</strong></span>
                  <span className="font-semibold text-slate-800">{hw.submissionsCount} / {hw.totalStudents} Submitted</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MARKS ENTRY */}
      {activeTab === 'marks' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Marks & Assessment Register — {activeClass?.className}-{activeClass?.sectionName}
              </h2>
              <p className="text-xs text-slate-500">Record scores out of max marks and publish verified marks.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveMarksDraft}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
              <button
                onClick={handlePublishMarks}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Marks</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 mr-2">Assessment Name:</label>
              <input
                type="text"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                className="p-1 border border-slate-200 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 mr-2">Max Marks:</label>
              <input
                type="number"
                min="1"
                value={maxMarks}
                onChange={e => setMaxMarks(parseInt(e.target.value) || 25)}
                className="p-1 border border-slate-200 rounded w-16 text-slate-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Score (out of {maxMarks})</th>
                  <th className="py-2.5 px-3">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map(s => {
                  const score = marksInputs[s.id] !== undefined ? marksInputs[s.id] : 0;
                  const pct = maxMarks > 0 ? ((score / maxMarks) * 100).toFixed(1) : 0;
                  return (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-mono">{s.rollNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{s.fullName}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          max={maxMarks}
                          value={score}
                          onChange={e =>
                            setMarksInputs({
                              ...marksInputs,
                              [s.id]: Math.min(maxMarks, Math.max(0, parseInt(e.target.value) || 0)),
                            })
                          }
                          className="w-20 p-1 border border-slate-200 rounded text-center font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Weekly Teaching Timetable</h2>
          <div className="space-y-3">
            {timetable?.days.map(d => (
              <div key={d.dayOfWeek} className="border border-slate-200 rounded-xl p-3 bg-slate-50/40">
                <h3 className="font-bold text-xs text-slate-800 mb-2">{d.dayOfWeek}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {d.slots.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-white border border-slate-100">
                      <div>
                        <span className="font-bold text-indigo-700">Period {s.period}</span>
                        <span className="text-slate-500 ml-2">({s.startTime} – {s.endTime})</span>
                        <p className="font-semibold text-slate-900">{s.subject} - {s.className} ({s.sectionName})</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">{s.roomNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Class & Staff Announcements</h2>
          <div className="space-y-2">
            {[
              { title: 'Parent-Teacher Meeting (Term 2)', date: '02 Nov 2026', prio: 'urgent', text: 'PTM for Classes 6 to 10 is scheduled for Saturday, 21 November.' },
              { title: 'Annual Sports Meet Notice', date: '04 Nov 2026', prio: 'important', text: 'Track event registrations open this Monday in the PE office.' },
            ].map((a, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">{a.title}</span>
                  <StatusBadge status={a.prio} />
                </div>
                <p className="text-xs text-slate-600">{a.text}</p>
                <p className="text-[10px] text-slate-400 mt-1">{a.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: PERFORMANCE ANALYTICS */}
      {activeTab === 'performance' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Student Performance Analytics</h2>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard title="Class Average" value="86.0%" tone="indigo" />
            <MetricCard title="Highest Score" value="94.0%" tone="emerald" subtext="Diya Patel" />
            <MetricCard title="Passing Rate" value="100%" tone="sky" subtext="3 of 3 Passed" />
          </div>
        </div>
      )}

      {/* MODAL: NEW HOMEWORK */}
      <ModalDialog
        isOpen={isHomeworkModalOpen}
        onClose={() => setIsHomeworkModalOpen(false)}
        title={`New Homework Assignment — ${activeClass?.className}-${activeClass?.sectionName}`}
      >
        <form onSubmit={handleCreateHomework} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assignment Title *</label>
            <input
              type="text"
              required
              value={hwTitle}
              onChange={e => setHwTitle(e.target.value)}
              placeholder="e.g. Linear Equations Practice"
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description & Instructions *</label>
            <textarea
              required
              rows={3}
              value={hwDesc}
              onChange={e => setHwDesc(e.target.value)}
              placeholder="Enter instructions, questions to attempt, and submission guidelines..."
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
            <input
              type="date"
              required
              value={hwDueDate}
              onChange={e => setHwDueDate(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsHomeworkModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Publish Homework
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

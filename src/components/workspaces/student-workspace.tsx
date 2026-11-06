'use client';

import React, { useState } from 'react';
import {
  User,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Bell,
  IndianRupee,
} from 'lucide-react';
import { MetricCard, StatusBadge } from './workspace-ui';
import { StudentPortalService } from '@/lib/services/development-adapter';
import type { PolicyContext } from '@/lib/auth/types';

// Development context with Student permissions
const devStudentContext: PolicyContext = {
  source: 'verified-server-session' as const,
  profileId: 'stu-101',
  accountStatus: 'active' as const,
  credentialResetRequired: false,
  authorizationVersion: 1,
  currentAuthorizationVersion: 1,
  session: {
    id: 'dev-student-session',
    profileId: 'stu-101',
    verifiedAt: Date.now(),
    authenticatedAt: Date.now() - 60000,
    expiresAt: Date.now() + 3600000,
    revoked: false,
    assurance: 'aal1' as const,
    reauthenticatedAt: null,
  },
  activeRole: {
    sessionId: 'dev-student-session',
    profileId: 'stu-101',
    role: 'student' as const,
    assignmentId: 'mem-student',
    version: 1,
    currentVersion: 1,
    expiresAt: Date.now() + 1800000,
    revoked: false,
  },
  assignments: [
    {
      id: 'mem-student',
      profileId: 'stu-101',
      role: 'student' as const,
      status: 'active' as const,
      validFrom: Date.now() - 3600000,
      validUntil: null,
      permissions: [
        'dashboard.student.view',
        'students.read',
        'attendance.read',
        'homework.read',
        'homework.write',
        'marks.read',
        'announcements.read',
        'documents.read',
      ],
    },
  ],
} as unknown as PolicyContext;

type StudentTab =
  | 'overview'
  | 'attendance'
  | 'timetable'
  | 'homework'
  | 'marks'
  | 'announcements'
  | 'fees';

export function StudentWorkspace({ context }: { context?: PolicyContext } = {}) {
  const activeContext = context || devStudentContext;
  const [activeTab, setActiveTab] = useState<StudentTab>('overview');

  const profileResult = StudentPortalService.getProfileOverview(activeContext, 'stu-101');
  const profile = profileResult.success ? profileResult.data : null;

  const attendanceResult = StudentPortalService.getAttendanceHistory(activeContext, 'stu-101');
  const attendanceDays = attendanceResult.success ? attendanceResult.data : [];

  const resultsResult = StudentPortalService.getExamResults(activeContext, 'stu-101');
  const results = resultsResult.success ? resultsResult.data : [];

  return (
    <div className="space-y-6">
      {/* Dev Mode Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
          <span className="font-semibold">Student Portal Workspace</span>
          <span className="text-amber-700 font-normal">| Live PIN login disabled in local environment. Scoped to Aarav Sharma.</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">Class 10-A | Roll: 10-A-01</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-medium text-slate-600">
        {[
          { id: 'overview', label: 'My Overview', icon: User },
          { id: 'attendance', label: 'Attendance Record', icon: Calendar },
          { id: 'timetable', label: 'My Timetable', icon: Clock },
          { id: 'homework', label: 'Homework & Tasks', icon: BookOpen },
          { id: 'marks', label: 'Marks & Results', icon: Award },
          { id: 'announcements', label: 'Notices', icon: Bell },
          { id: 'fees', label: 'Fee Dues & Receipts', icon: IndianRupee },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StudentTab)}
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

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="Attendance" value={`${profile?.attendancePercentage || 0}%`} tone="emerald" icon={Calendar} />
            <MetricCard title="Class Rank" value={`#${profile?.currentRank || 2}`} tone="indigo" icon={Award} />
            <MetricCard title="Pending Tasks" value={profile?.pendingHomeworkCount || 0} tone="amber" icon={BookOpen} />
            <MetricCard
              title="Fee Dues"
              value={`₹${((profile?.feeDuesPaise || 0) / 100).toLocaleString('en-IN')}`}
              tone="rose"
              icon={IndianRupee}
            />
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Student Identity & Enrollment Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Student Name:</span>
                <p className="font-bold text-slate-900">{profile?.fullName}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Admission Number:</span>
                <p className="font-mono font-bold text-slate-900">{profile?.admissionNumber}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Class & Section:</span>
                <p className="font-bold text-slate-900">{profile?.className} - {profile?.sectionName}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">House:</span>
                <p className="font-semibold text-indigo-700">{profile?.house}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Blood Group:</span>
                <p className="font-semibold text-rose-700">{profile?.bloodGroup}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Date of Birth:</span>
                <p className="font-medium text-slate-700">{profile?.dateOfBirth}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Attendance History — November 2026</h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {profile?.attendancePercentage}% Present
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {attendanceDays.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                <span className="font-mono text-slate-700 font-medium">{d.date}</span>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Daily Subject Timetable</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { p: 1, time: '08:30 – 09:15', sub: 'Mathematics', teacher: 'Pooja Verma', room: 'Room 204' },
              { p: 2, time: '09:15 – 10:00', sub: 'Physics', teacher: 'Dr. Sunita Rao', room: 'Room 204' },
              { p: 3, time: '10:15 – 11:00', sub: 'English Literature', teacher: 'Shalini Nair', room: 'Room 204' },
              { p: 4, time: '11:00 – 11:45', sub: 'Chemistry', teacher: 'Karan Joshi', room: 'Science Lab 2' },
            ].map(slot => (
              <div key={slot.p} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-700">Period {slot.p}</span>
                  <span className="text-slate-400 ml-2">({slot.time})</span>
                  <p className="font-bold text-slate-900 mt-1">{slot.sub}</p>
                  <p className="text-slate-500 text-[11px]">{slot.teacher}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">
                  {slot.room}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HOMEWORK */}
      {activeTab === 'homework' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Active Homework & Assignments</h2>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Quadratic Equations Exercise 4.2</h3>
              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Due: 08 Nov 2026
              </span>
            </div>
            <p className="text-slate-600">Solve questions 1 through 10 from NCERT textbook Chapter 4.</p>
            <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-100">
              <span>Subject: Mathematics</span>
              <span className="font-semibold text-slate-700">Max Score: 20 pts</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MARKS */}
      {activeTab === 'marks' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Published Term Examination Results</h2>
          <div className="space-y-3">
            {results.map((res, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{res.subject}</h3>
                    <p className="text-slate-500 text-[11px]">{res.examName} ({res.examDate})</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-700">{res.marksObtained}</span>
                    <span className="text-slate-400"> / {res.maxMarks}</span>
                    <span className="ml-2 font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{res.grade}</span>
                  </div>
                </div>
                {res.teacherFeedback && (
                  <p className="p-2 bg-white rounded border border-slate-100 text-slate-600 italic">
                    &ldquo;{res.teacherFeedback}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: NOTICES */}
      {activeTab === 'announcements' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">School Notices & Circulars</h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-900">Annual Sports Meet 2026</span>
              <p className="text-slate-600 mt-1">Track event registrations open this Monday in the PE office.</p>
              <span className="text-[10px] text-slate-400 mt-1 block">04 Nov 2026</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: FEES */}
      {activeTab === 'fees' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Student Fee Account & Payment History</h2>
          <div className="grid grid-cols-3 gap-3 text-xs mb-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <span className="text-slate-500">Total Billed</span>
              <p className="font-bold text-slate-900 text-base">₹50,000.00</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
              <span className="text-emerald-700">Paid Amount</span>
              <p className="font-bold text-emerald-900 text-base">₹35,000.00</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 text-center">
              <span className="text-rose-700">Balance Due</span>
              <p className="font-bold text-rose-900 text-base">₹15,000.00</p>
            </div>
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-slate-800 mb-2">Paid Receipt</h4>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono">
              <div>
                <span className="font-bold text-slate-900">#RCP-2026-0042</span>
                <span className="text-slate-500 ml-2">10 Oct 2026 | UPI</span>
              </div>
              <span className="font-bold text-emerald-700 font-sans">₹35,000.00 (Settled)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

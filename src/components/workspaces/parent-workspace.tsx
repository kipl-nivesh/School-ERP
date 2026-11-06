'use client';

import React, { useState } from 'react';
import {
  Users,
  Calendar,
  BookOpen,
  Award,
  IndianRupee,
  Bell,
} from 'lucide-react';
import { MetricCard, StatusBadge } from './workspace-ui';
import { ParentPortalService } from '@/lib/services/development-adapter';
import type { PolicyContext } from '@/lib/auth/types';

const devParentContext: PolicyContext = {
  source: 'verified-server-session' as const,
  profileId: 'parent-rajesh-1',
  accountStatus: 'active' as const,
  credentialResetRequired: false,
  authorizationVersion: 1,
  currentAuthorizationVersion: 1,
  session: {
    id: 'dev-parent-session',
    profileId: 'parent-rajesh-1',
    verifiedAt: Date.now(),
    authenticatedAt: Date.now() - 60000,
    expiresAt: Date.now() + 3600000,
    revoked: false,
    assurance: 'aal1' as const,
    reauthenticatedAt: null,
  },
  activeRole: {
    sessionId: 'dev-parent-session',
    profileId: 'parent-rajesh-1',
    role: 'parent' as const,
    assignmentId: 'mem-parent',
    version: 1,
    currentVersion: 1,
    expiresAt: Date.now() + 1800000,
    revoked: false,
  },
  assignments: [
    {
      id: 'mem-parent',
      profileId: 'parent-rajesh-1',
      role: 'parent' as const,
      status: 'active' as const,
      validFrom: Date.now() - 3600000,
      validUntil: null,
      permissions: [
        'dashboard.parent.view',
        'children.academics.read',
        'children.fees.read',
        'announcements.read',
        'documents.read',
        'receipts.read',
      ],
    },
  ],
} as unknown as PolicyContext;

type ParentTab = 'overview' | 'attendance' | 'homework' | 'marks' | 'fees' | 'announcements';

export function ParentWorkspace({ context }: { context?: PolicyContext } = {}) {
  const activeContext = context || devParentContext;
  const [activeTab, setActiveTab] = useState<ParentTab>('overview');

  // Linked children query
  const childrenResult = ParentPortalService.getLinkedChildren(activeContext, 'parent-rajesh-1');
  const children = childrenResult.success ? childrenResult.data : [];

  // Active child switcher
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.studentId || 'stu-101');
  const activeChild = children.find(c => c.studentId === selectedChildId) || children[0];

  // Selected child report query
  const reportResult = ParentPortalService.getChildAcademicReport(
    activeContext,
    'parent-rajesh-1',
    selectedChildId
  );
  const report = reportResult.success ? reportResult.data : null;

  return (
    <div className="space-y-6">
      {/* Dev Mode Banner */}
      <div className="bg-violet-50/70 border border-violet-200 rounded-xl p-3 flex items-center justify-between text-xs text-violet-900">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
          <span className="font-semibold">Parent & Guardian Portal</span>
          <span className="text-violet-700 font-normal">| Live PIN login disabled. Verified Guardian: Rajesh Sharma</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-medium">2 Verified Children</span>
      </div>

      {/* Child Switcher Component */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-violet-600" />
            Switch Active Child Profile
          </span>
          <span className="text-[11px] text-slate-400">Restricted to verified guardian relationship</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {children.map(child => {
            const isSelected = child.studentId === selectedChildId;
            return (
              <button
                key={child.studentId}
                onClick={() => setSelectedChildId(child.studentId)}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-violet-600 bg-violet-50/40 shadow-xs ring-1 ring-violet-500'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div>
                  <p className="font-bold text-sm text-slate-900">{child.fullName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {child.className} - {child.sectionName} | Roll: {child.rollNumber}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-emerald-700 block">{child.attendancePercentage}% Attendance</span>
                  {child.feeDuePaise > 0 ? (
                    <span className="text-rose-600 font-medium text-[11px]">Due: ₹{(child.feeDuePaise / 100).toLocaleString('en-IN')}</span>
                  ) : (
                    <span className="text-emerald-600 font-medium text-[11px]">Fees Cleared</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-medium text-slate-600">
        {[
          { id: 'overview', label: `${activeChild?.fullName || 'Child'}'s Overview`, icon: Users },
          { id: 'attendance', label: 'Attendance', icon: Calendar },
          { id: 'homework', label: 'Homework & Tasks', icon: BookOpen },
          { id: 'marks', label: 'Marks & Report Cards', icon: Award },
          { id: 'fees', label: 'Fee Payments', icon: IndianRupee },
          { id: 'announcements', label: 'Parent Circulars', icon: Bell },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ParentTab)}
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
            <MetricCard
              title="Attendance Rate"
              value={`${activeChild?.attendancePercentage || 0}%`}
              tone="emerald"
              icon={Calendar}
            />
            <MetricCard
              title="Class & Section"
              value={`${activeChild?.className || ''}-${activeChild?.sectionName || ''}`}
              tone="indigo"
              icon={Users}
            />
            <MetricCard
              title="Pending Homework"
              value={activeChild?.pendingHomeworkCount || 0}
              tone="amber"
              icon={BookOpen}
            />
            <MetricCard
              title="Fee Dues"
              value={`₹${((activeChild?.feeDuePaise || 0) / 100).toLocaleString('en-IN')}`}
              tone={activeChild?.feeDuePaise ? 'rose' : 'emerald'}
              icon={IndianRupee}
            />
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 text-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Academic Snapshot — {activeChild?.fullName}</h3>
            <p className="text-slate-600">
              {activeChild?.fullName} is currently enrolled in {activeChild?.className} ({activeChild?.sectionName}) for the 2026–2027 academic session. All guardian verified access controls are active.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Attendance Calendar & Record</h2>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-xs">
            <span className="font-bold text-emerald-900 text-sm">Overall Attendance: {report?.attendanceRate}%</span>
            <p className="text-emerald-700 mt-1">Excellent attendance record. Meets CBSE minimum requirement of 75%.</p>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { d: '2026-11-05', st: 'present' },
              { d: '2026-11-04', st: 'present' },
              { d: '2026-11-03', st: 'present' },
              { d: '2026-11-02', st: 'present' },
            ].map((row, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-mono text-slate-700">{row.d}</span>
                <StatusBadge status={row.st} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HOMEWORK */}
      {activeTab === 'homework' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Daily Homework & Assignments</h2>
          {report?.homework && report.homework.length > 0 ? (
            <div className="space-y-3 text-xs">
              {report.homework.map(hw => (
                <div key={hw.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">{hw.title}</span>
                    <span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Due: {hw.dueDate}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-2">{hw.description}</p>
                  <p className="text-slate-400 text-[11px]">Subject: {hw.subject}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No pending homework assigned for this section.</p>
          )}
        </div>
      )}

      {/* TAB 4: MARKS */}
      {activeTab === 'marks' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Published Assessment Report</h2>
          <div className="space-y-3 text-xs">
            {report?.results.map((res, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{res.subject}</h3>
                    <p className="text-slate-400 text-[11px]">{res.examName} ({res.examDate})</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-700">{res.marksObtained}</span>
                    <span className="text-slate-400"> / {res.maxMarks}</span>
                    <span className="ml-2 px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">{res.grade}</span>
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

      {/* TAB 5: FEES */}
      {activeTab === 'fees' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Fee Invoices & Payments</h2>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Outstanding Balance:</span>
              <p className="text-xl font-bold text-slate-900">
                ₹{((activeChild?.feeDuePaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            {activeChild?.feeDuePaise ? (
              <button className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">
                Pay Online
              </button>
            ) : (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold">All Dues Cleared</span>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Parent Notices & Circulars</h2>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
            <span className="font-bold text-slate-900">Parent-Teacher Meeting (Term 2)</span>
            <p className="text-slate-600 mt-1">PTM for Classes 6 to 10 is scheduled for Saturday, 21 November from 9:00 AM to 1:00 PM.</p>
            <span className="text-[10px] text-slate-400 mt-1 block">02 Nov 2026</span>
          </div>
        </div>
      )}
    </div>
  );
}

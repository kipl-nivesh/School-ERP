'use client';

import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  Briefcase,
  Layers,
  Calendar,
  BookOpen,
  CheckCircle,
  IndianRupee,
  Settings,
  ShieldAlert,
  Plus,
  AlertCircle,
} from 'lucide-react';
import {
  MetricCard,
  StatusBadge,
  SearchFilterBar,
  PaginationControls,
  EmptySectionState,
  ModalDialog,
} from './workspace-ui';
import { SchoolAdminService } from '@/lib/services/development-adapter';
import type { PolicyContext } from '@/lib/auth/types';
import type {
  NewStudentAdmissionInput,
  NewStaffInput,
  SchoolSettingsRecord,
} from '@/lib/domain/dashboard-contracts';

// Development context with School Admin permissions
const devAdminContext: PolicyContext = {
  source: 'verified-server-session' as const,
  profileId: 'principal-usr-1',
  accountStatus: 'active' as const,
  credentialResetRequired: false,
  authorizationVersion: 2,
  currentAuthorizationVersion: 2,
  session: {
    id: 'dev-admin-session',
    profileId: 'principal-usr-1',
    verifiedAt: Date.now(),
    authenticatedAt: Date.now() - 60000,
    expiresAt: Date.now() + 3600000,
    revoked: false,
    assurance: 'aal2' as const,
    reauthenticatedAt: Date.now() - 1000,
  },
  activeRole: {
    sessionId: 'dev-admin-session',
    profileId: 'principal-usr-1',
    role: 'admin' as const,
    assignmentId: 'mem-admin',
    version: 1,
    currentVersion: 1,
    expiresAt: Date.now() + 1800000,
    revoked: false,
  },
  assignments: [
    {
      id: 'mem-admin',
      profileId: 'principal-usr-1',
      role: 'admin' as const,
      status: 'active' as const,
      validFrom: Date.now() - 3600000,
      validUntil: null,
      permissions: [
        'dashboard.admin.view',
        'school.settings.read',
        'school.settings.write',
        'admissions.read',
        'admissions.write',
        'students.read',
        'staff.read',
        'academics.manage',
        'attendance.read',
        'attendance.write',
        'fees.read',
        'fees.write',
        'payments.read',
        'payments.record',
        'reports.read',
        'reports.export',
        'audit.read',
        'security.accounts.create',
        'security.accounts.update',
        'security.accounts.suspend',
        'security.roles.assign',
      ],
    },
  ],
} as unknown as PolicyContext;

type AdminTab =
  | 'overview'
  | 'admissions'
  | 'staff'
  | 'classes'
  | 'academics'
  | 'assignments'
  | 'attendance'
  | 'fees'
  | 'settings'
  | 'audit';

export function SchoolAdminWorkspace({ context }: { context?: PolicyContext } = {}) {
  const activeContext = context || devAdminContext;
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  // Search & filter states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [studentPage, setStudentPage] = useState(1);

  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');
  const [staffPage, setStaffPage] = useState(1);

  const [auditSearch, setAuditSearch] = useState('');

  // Service Data Queries
  const metricsResult = SchoolAdminService.getOverviewMetrics(activeContext);
  const metrics = metricsResult.success ? metricsResult.data : null;

  const studentsResult = SchoolAdminService.listStudents(activeContext, {
    page: studentPage,
    pageSize: 5,
    search: studentSearch,
    filter: studentClassFilter,
  });
  const studentsData = studentsResult.success ? studentsResult.data : null;

  const staffResult = SchoolAdminService.listStaff(activeContext, {
    page: staffPage,
    pageSize: 5,
    search: staffSearch,
    filter: staffRoleFilter,
  });
  const staffData = staffResult.success ? staffResult.data : null;

  const classesResult = SchoolAdminService.listClasses(activeContext);
  const classes = classesResult.success ? classesResult.data : [];

  const academicYearsResult = SchoolAdminService.listAcademicYears(activeContext);
  const academicYears = academicYearsResult.success ? academicYearsResult.data : [];

  const assignmentsResult = SchoolAdminService.listTeacherAssignments(activeContext);
  const teacherAssignments = assignmentsResult.success ? assignmentsResult.data : [];

  const attendanceSummaryResult = SchoolAdminService.getAttendanceSummary(activeContext, '2026-11-05');
  const attendanceSummary = attendanceSummaryResult.success ? attendanceSummaryResult.data : null;

  const settingsResult = SchoolAdminService.getSchoolSettings(activeContext);
  const [settingsForm, setSettingsForm] = useState<SchoolSettingsRecord>(
    settingsResult.success
      ? settingsResult.data
      : {
          schoolName: 'Brightcamp Senior Secondary School',
          affiliationCode: 'CBSE/AFF/2026/89412',
          board: 'CBSE',
          email: 'contact@brightcamp.edu.invalid',
          phone: '+91 11 2345 6789',
          address: 'Sector 14, Knowledge Park, Gurugram, Haryana 122001',
          website: 'https://brightcamp.edu.invalid',
          academicYearId: 'ay-2026',
          currencyCode: 'INR',
          currencySymbol: '₹',
          operationalHours: '08:00 AM – 03:00 PM (Mon–Fri)',
          emergencyContact: '+91 99999 88888',
        }
  );

  const auditResult = SchoolAdminService.listAuditTrail(activeContext, { search: auditSearch, pageSize: 8 });
  const auditData = auditResult.success ? auditResult.data : null;

  // New Student Form State
  const [newStudent, setNewStudent] = useState<NewStudentAdmissionInput>({
    fullName: '',
    dateOfBirth: '2012-01-01',
    gender: 'male',
    classId: 'cls-10',
    sectionId: 'sec-10a',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  });

  // New Staff Form State
  const [newStaff, setNewStaff] = useState<NewStaffInput>({
    fullName: '',
    email: '',
    phone: '',
    role: 'teacher',
    department: 'Science',
    designation: 'Assistant Teacher',
    qualification: 'B.Sc., B.Ed.',
  });

  // New Class Form State
  const [newClassName, setNewClassName] = useState('Class 11');
  const [newGradeLevel, setNewGradeLevel] = useState(11);
  const [newSectionName, setNewSectionName] = useState('A');

  // New Assignment Form State
  const [asgTeacherId, setAsgTeacherId] = useState('stf-tch-1');
  const [asgClassId, setAsgClassId] = useState('cls-10');
  const [asgSectionId, setAsgSectionId] = useState('sec-10a');
  const [asgSubject, setAsgSubject] = useState('Science');
  const [asgPeriods, setAsgPeriods] = useState(5);

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const res = SchoolAdminService.createStudentAdmission(activeContext, newStudent);
    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Student admitted successfully' });
      setIsAdmissionModalOpen(false);
      setNewStudent({
        fullName: '',
        dateOfBirth: '2012-01-01',
        gender: 'male',
        classId: 'cls-10',
        sectionId: 'sec-10a',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
      });
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const res = SchoolAdminService.createStaffMember(activeContext, newStaff);
    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Staff member created successfully' });
      setIsStaffModalOpen(false);
      setNewStaff({
        fullName: '',
        email: '',
        phone: '',
        role: 'teacher',
        department: 'Science',
        designation: 'Assistant Teacher',
        qualification: 'B.Sc., B.Ed.',
      });
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    const res = SchoolAdminService.createClass(activeContext, newClassName, newGradeLevel, newSectionName);
    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Class created successfully' });
      setIsClassModalOpen(false);
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  const handleAssignTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const res = SchoolAdminService.assignTeacher(activeContext, asgTeacherId, asgClassId, asgSectionId, asgSubject, asgPeriods);
    if (res.success) {
      setNotice({ type: 'success', text: res.message || 'Teacher assigned successfully' });
      setIsAssignmentModalOpen(false);
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const res = SchoolAdminService.updateSchoolSettings(activeContext, settingsForm);
    if (res.success) {
      setNotice({ type: 'success', text: 'School settings saved successfully' });
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  return (
    <div className="space-y-6">
      {/* Dev Mode Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-center justify-between text-xs text-indigo-900">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span className="font-semibold">School Admin Workspace</span>
          <span className="text-indigo-600 font-normal">| Connected to Development Service Adapter (Phase 2 Functional)</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-medium">AAL2 Verified</span>
      </div>

      {/* Dismissible Notice */}
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
          <button onClick={() => setNotice(null)} className="font-bold hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-medium text-slate-600">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'admissions', label: 'Admissions & Students', icon: Users },
          { id: 'staff', label: 'Staff Management', icon: Briefcase },
          { id: 'classes', label: 'Classes & Sections', icon: GraduationCap },
          { id: 'academics', label: 'Academic Years', icon: Calendar },
          { id: 'assignments', label: 'Teacher Mapping', icon: BookOpen },
          { id: 'attendance', label: 'Attendance Monitor', icon: CheckCircle },
          { id: 'fees', label: 'Fee Structures', icon: IndianRupee },
          { id: 'settings', label: 'School Settings', icon: Settings },
          { id: 'audit', label: 'Audit Trail', icon: ShieldAlert },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
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
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Active Students" value={metrics?.totalStudents || 0} icon={Users} tone="indigo" />
            <MetricCard title="Staff Members" value={metrics?.totalStaff || 0} icon={Briefcase} tone="sky" />
            <MetricCard title="Total Classes" value={metrics?.totalClasses || 0} icon={GraduationCap} tone="emerald" />
            <MetricCard title="Attendance Rate" value={`${metrics?.attendanceRate || 0}%`} icon={CheckCircle} tone="amber" />
            <MetricCard
              title="Fees Collected"
              value={`₹${((metrics?.totalFeeCollectedPaise || 0) / 100).toLocaleString('en-IN')}`}
              icon={IndianRupee}
              tone="emerald"
            />
            <MetricCard
              title="Pending Fees"
              value={`₹${((metrics?.totalFeePendingPaise || 0) / 100).toLocaleString('en-IN')}`}
              icon={IndianRupee}
              tone="rose"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Recent Student Admissions</span>
                <button onClick={() => setActiveTab('admissions')} className="text-xs text-indigo-600 hover:underline">
                  View all
                </button>
              </h3>
              <div className="space-y-2 text-xs">
                {studentsData?.items.slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-800">{s.fullName}</p>
                      <p className="text-slate-500">{s.className} - {s.sectionName} | Roll: {s.rollNumber}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Recent Administrative Activity</span>
                <button onClick={() => setActiveTab('audit')} className="text-xs text-indigo-600 hover:underline">
                  Audit log
                </button>
              </h3>
              <div className="space-y-2 text-xs">
                {auditData?.items.slice(0, 3).map(a => (
                  <div key={a.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-800">{a.description}</p>
                    <p className="text-slate-400 text-[10px]">{new Date(a.timestamp).toLocaleTimeString()} by {a.actorName}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMISSIONS & STUDENTS */}
      {activeTab === 'admissions' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Directory & Admissions</h2>
              <p className="text-xs text-slate-500">Manage enrolled student profiles, admission numbers, and guardianship contacts.</p>
            </div>
            <button
              onClick={() => setIsAdmissionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Admission</span>
            </button>
          </div>

          <SearchFilterBar
            searchPlaceholder="Search student name, roll, or admission number..."
            onSearch={setStudentSearch}
            filterOptions={[
              { label: 'Class 10', value: 'cls-10' },
              { label: 'Class 6', value: 'cls-6' },
            ]}
            selectedFilter={studentClassFilter}
            onFilterChange={setStudentClassFilter}
          />

          {studentsData && studentsData.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Admission No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Class & Section</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Guardian</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsData.items.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{s.admissionNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{s.fullName}</td>
                      <td className="py-2.5 px-3">{s.className} - {s.sectionName}</td>
                      <td className="py-2.5 px-3 font-mono">{s.rollNumber}</td>
                      <td className="py-2.5 px-3">{s.guardianName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.guardianPhone}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                page={studentPage}
                totalPages={studentsData.totalPages}
                totalItems={studentsData.total}
                onPageChange={setStudentPage}
              />
            </div>
          ) : (
            <EmptySectionState
              title="No students found"
              description="No student records match the active search and filter filters."
              action={
                <button
                  onClick={() => setIsAdmissionModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Admit First Student
                </button>
              }
            />
          )}
        </div>
      )}

      {/* TAB 3: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Staff & Faculty Management</h2>
              <p className="text-xs text-slate-500">Manage school educators, administrators, and accounts personnel.</p>
            </div>
            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <SearchFilterBar
            searchPlaceholder="Search staff name, email, department..."
            onSearch={setStaffSearch}
            filterOptions={[
              { label: 'Admin', value: 'admin' },
              { label: 'Teacher', value: 'teacher' },
              { label: 'Accountant', value: 'accountant' },
            ]}
            selectedFilter={staffRoleFilter}
            onFilterChange={setStaffRoleFilter}
          />

          {staffData && staffData.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Emp Code</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffData.items.map(stf => (
                    <tr key={stf.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-medium">{stf.employeeCode}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{stf.fullName}</td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-indigo-700">{stf.role}</td>
                      <td className="py-2.5 px-3">{stf.department}</td>
                      <td className="py-2.5 px-3">{stf.designation}</td>
                      <td className="py-2.5 px-3 text-slate-500">{stf.email}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={stf.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                page={staffPage}
                totalPages={staffData.totalPages}
                totalItems={staffData.total}
                onPageChange={setStaffPage}
              />
            </div>
          ) : (
            <EmptySectionState title="No staff records found" />
          )}
        </div>
      )}

      {/* TAB 4: CLASSES & SECTIONS */}
      {activeTab === 'classes' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Class & Section Structure</h2>
              <p className="text-xs text-slate-500">Configure academic grades, sections, room allocations, and class teachers.</p>
            </div>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map(c => (
              <div key={c.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-slate-900">{c.name}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Grade {c.gradeLevel}
                  </span>
                </div>
                <div className="space-y-2 mt-3 text-xs">
                  {c.sections.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800">Section {s.name}</span>
                        <span className="text-slate-400 text-[11px] ml-2">({s.roomNumber})</span>
                        {s.classTeacherName && (
                          <p className="text-[11px] text-slate-500 mt-0.5">Teacher: {s.classTeacherName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-700">{s.currentEnrollment}</span>
                        <span className="text-slate-400"> / {s.capacity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ACADEMICS & YEARS */}
      {activeTab === 'academics' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Academic Year Management</h2>
          <div className="space-y-3">
            {academicYears.map(ay => (
              <div key={ay.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50/40">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">Academic Year {ay.name}</h3>
                    {ay.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Current Session
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{ay.startDate} to {ay.endDate}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {ay.terms.map(t => (
                    <span key={t.id} className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: TEACHER MAPPING */}
      {activeTab === 'assignments' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Teacher Subject Assignments</h2>
              <p className="text-xs text-slate-500">Maps educators to specific classes, sections, and subjects.</p>
            </div>
            <button
              onClick={() => setIsAssignmentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              <span>Map Teacher</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Teacher</th>
                  <th className="py-2.5 px-3">Class & Section</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Periods / Week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherAssignments.map(asg => (
                  <tr key={asg.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{asg.teacherName}</td>
                    <td className="py-2.5 px-3">{asg.className} - {asg.sectionName}</td>
                    <td className="py-2.5 px-3 font-medium text-indigo-700">{asg.subjectName}</td>
                    <td className="py-2.5 px-3">{asg.periodsPerWeek} periods</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: ATTENDANCE MONITOR */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">School Attendance Monitor</h2>
              <p className="text-xs text-slate-500">Daily roll summary and section-wise attendance metrics.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              Date: 05 Nov 2026
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-xs text-emerald-700 font-semibold">Present</span>
              <p className="text-xl font-bold text-emerald-900">{attendanceSummary?.presentCount || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center">
              <span className="text-xs text-amber-700 font-semibold">Late</span>
              <p className="text-xl font-bold text-amber-900">{attendanceSummary?.lateCount || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-center">
              <span className="text-xs text-rose-700 font-semibold">Absent</span>
              <p className="text-xl font-bold text-rose-900">{attendanceSummary?.absentCount || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-center">
              <span className="text-xs text-indigo-700 font-semibold">Attendance Rate</span>
              <p className="text-xl font-bold text-indigo-900">{attendanceSummary?.overallPercentage || 0}%</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Class-Level Drill Down</h4>
            {attendanceSummary?.classBreakdown.map((b, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{b.className} - {b.sectionName}</span>
                  <span className="text-slate-500 ml-2">({b.present} / {b.total} Present)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${b.percentage}%` }} />
                  </div>
                  <span className="font-bold text-slate-800 w-10 text-right">{b.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: FEE OVERVIEW */}
      {activeTab === 'fees' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Fee Structures & Policies</h2>
          <p className="text-xs text-slate-500">Scheduled fee heads, installment frequencies, and approved class fees.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Fee Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Next Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { id: '1', class: 'Class 10', cat: 'Tuition Fee', amt: '₹45,000.00', freq: 'Quarterly', due: '15 Nov 2026' },
                  { id: '2', class: 'Class 10', cat: 'Laboratory Fee', amt: '₹5,000.00', freq: 'Quarterly', due: '15 Nov 2026' },
                  { id: '3', class: 'Class 6', cat: 'Tuition Fee', amt: '₹35,000.00', freq: 'Quarterly', due: '15 Nov 2026' },
                ].map(f => (
                  <tr key={f.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{f.class}</td>
                    <td className="py-2.5 px-3 capitalize">{f.cat}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-emerald-700">{f.amt}</td>
                    <td className="py-2.5 px-3">{f.freq}</td>
                    <td className="py-2.5 px-3 text-slate-500">{f.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: SCHOOL SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Institution Configuration</h2>
              <p className="text-xs text-slate-500">Official registration, board affiliation, and contact details.</p>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
            >
              Save Configuration
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Name</label>
              <input
                type="text"
                value={settingsForm.schoolName}
                onChange={e => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Affiliation Code</label>
              <input
                type="text"
                value={settingsForm.affiliationCode}
                onChange={e => setSettingsForm({ ...settingsForm, affiliationCode: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={settingsForm.email}
                onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={settingsForm.phone}
                onChange={e => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Campus Address</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operational Hours</label>
              <input
                type="text"
                value={settingsForm.operationalHours}
                onChange={e => setSettingsForm({ ...settingsForm, operationalHours: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emergency Contact Hotline</label>
              <input
                type="text"
                value={settingsForm.emergencyContact}
                onChange={e => setSettingsForm({ ...settingsForm, emergencyContact: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 10: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Security & Administrative Audit Log</h2>
            <p className="text-xs text-slate-500">Immutable chronological trail of security, staff, and admission events.</p>
          </div>

          <SearchFilterBar
            searchPlaceholder="Search event type, description, actor..."
            onSearch={setAuditSearch}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Origin IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditData?.items.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{new Date(a.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-xs font-semibold text-indigo-700">{a.eventType}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{a.actorName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{a.description}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{a.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: NEW STUDENT ADMISSION */}
      <ModalDialog
        isOpen={isAdmissionModalOpen}
        onClose={() => setIsAdmissionModalOpen(false)}
        title="Student Admission Registration"
      >
        <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Student Full Name *</label>
            <input
              type="text"
              required
              value={newStudent.fullName}
              onChange={e => setNewStudent({ ...newStudent, fullName: e.target.value })}
              placeholder="e.g. Rohan Verma"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={newStudent.dateOfBirth}
                onChange={e => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={newStudent.gender}
                onChange={e => setNewStudent({ ...newStudent, gender: e.target.value as NewStudentAdmissionInput['gender'] })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Class</label>
              <select
                value={newStudent.classId}
                onChange={e => setNewStudent({ ...newStudent, classId: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="cls-10">Class 10</option>
                <option value="cls-6">Class 6</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Section</label>
              <select
                value={newStudent.sectionId}
                onChange={e => setNewStudent({ ...newStudent, sectionId: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="sec-10a">Section A</option>
                <option value="sec-6b">Section B</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Guardian Name *</label>
            <input
              type="text"
              required
              value={newStudent.guardianName}
              onChange={e => setNewStudent({ ...newStudent, guardianName: e.target.value })}
              placeholder="e.g. Vikram Verma"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Guardian Phone *</label>
              <input
                type="text"
                required
                value={newStudent.guardianPhone}
                onChange={e => setNewStudent({ ...newStudent, guardianPhone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Guardian Email</label>
              <input
                type="email"
                value={newStudent.guardianEmail}
                onChange={e => setNewStudent({ ...newStudent, guardianEmail: e.target.value })}
                placeholder="parent@example.com"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdmissionModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Complete Admission
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 2: ADD STAFF */}
      <ModalDialog
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title="Register New Staff Member"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={newStaff.fullName}
              onChange={e => setNewStaff({ ...newStaff, fullName: e.target.value })}
              placeholder="e.g. Shalini Nair"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Staff Role *</label>
              <select
                value={newStaff.role}
                onChange={e => setNewStaff({ ...newStaff, role: e.target.value as NewStaffInput['role'] })}
                className="w-full p-2 border border-slate-200 rounded-lg uppercase font-semibold"
              >
                <option value="teacher">Teacher</option>
                <option value="accountant">Accountant</option>
                <option value="admin">School Admin</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={newStaff.department}
                onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}
                placeholder="e.g. English"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                value={newStaff.email}
                onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="staff@school.edu"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={newStaff.phone}
                onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                placeholder="+91 98123 45678"
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={newStaff.designation}
                onChange={e => setNewStaff({ ...newStaff, designation: e.target.value })}
                placeholder="e.g. PGT Teacher"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Qualification</label>
              <input
                type="text"
                value={newStaff.qualification}
                onChange={e => setNewStaff({ ...newStaff, qualification: e.target.value })}
                placeholder="e.g. M.A., B.Ed."
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Add Staff Member
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 3: CREATE CLASS */}
      <ModalDialog
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Create New Class & Section"
      >
        <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Class Name (e.g. Class 11)</label>
            <input
              type="text"
              required
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Grade Level (1–12)</label>
              <input
                type="number"
                min="1"
                max="12"
                required
                value={newGradeLevel}
                onChange={e => setNewGradeLevel(parseInt(e.target.value) || 1)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Section</label>
              <input
                type="text"
                required
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                placeholder="A"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsClassModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Create Class
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 4: MAP TEACHER */}
      <ModalDialog
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        title="Map Teacher to Class & Subject"
      >
        <form onSubmit={handleAssignTeacher} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Teacher</label>
            <select
              value={asgTeacherId}
              onChange={e => setAsgTeacherId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            >
              <option value="stf-tch-1">Pooja Verma (Mathematics)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Class</label>
              <select
                value={asgClassId}
                onChange={e => setAsgClassId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="cls-10">Class 10</option>
                <option value="cls-6">Class 6</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Section</label>
              <select
                value={asgSectionId}
                onChange={e => setAsgSectionId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="sec-10a">Section A</option>
                <option value="sec-6b">Section B</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={asgSubject}
                onChange={e => setAsgSubject(e.target.value)}
                placeholder="e.g. Physics"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Periods / Week</label>
              <input
                type="number"
                min="1"
                max="30"
                value={asgPeriods}
                onChange={e => setAsgPeriods(parseInt(e.target.value) || 5)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAssignmentModalOpen(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Save Assignment
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

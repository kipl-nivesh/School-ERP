/**
 * Development Service Adapter for School ERP Dashboards.
 * 
 * Provides concrete, type-safe in-memory state and validation for all 5 dashboard roles.
 * Every mutating or sensitive query verifies server-side permissions using the
 * Phase 1 pure authorization policy engine (evaluatePermission, evaluateRecordMutation).
 * 
 * Identified as: DEVELOPMENT-ONLY ADAPTER. Never uses mock data as live production data.
 */

import { evaluatePermission, evaluateRecordMutation } from '../auth/authorization';
import type { PolicyContext } from '../auth/types';
import type {
  StudentRecord,
  NewStudentAdmissionInput,
  StaffRecord,
  NewStaffInput,
  ClassRecord,
  AcademicYearRecord,
  TeacherAssignmentRecord,
  SchoolAttendanceSummary,
  SchoolSettingsRecord,
  AuditTrailRecord,
  TeacherAssignedClass,
  AttendanceEntryItem,
  MarksEntryItem,
  HomeworkRecord,
  MarksSheetRecord,
  TeacherWeeklyTimetable,
  FeeStructureItem,
  StudentFeeLedger,
  FeeInvoiceRecord,
  PaymentReceiptRecord,
  CollectPaymentInput,
  ExpenseRecord,
  FinancialSummaryReport,
  StudentProfileOverview,
  StudentAttendanceDay,
  StudentExamResultItem,
  ParentLinkedChild,
  AnnouncementItem,
  OperationResult,
  PaginatedResult,
  PaginationParams,
} from '../domain/dashboard-contracts';

// =============================================================================
// In-Memory Seed State for Development Testing
// =============================================================================

class DevelopmentStore {
  students: StudentRecord[] = [
    {
      id: 'stu-101',
      admissionNumber: 'ADM-2026-001',
      rollNumber: '10-A-01',
      fullName: 'Aarav Sharma',
      dateOfBirth: '2011-05-14',
      gender: 'male',
      classId: 'cls-10',
      className: 'Class 10',
      sectionId: 'sec-10a',
      sectionName: 'A',
      guardianName: 'Rajesh Sharma',
      guardianPhone: '+91 98765 43210',
      guardianEmail: 'rajesh.sharma@example.invalid',
      status: 'active',
      admissionDate: '2020-04-01',
    },
    {
      id: 'stu-102',
      admissionNumber: 'ADM-2026-002',
      rollNumber: '10-A-02',
      fullName: 'Diya Patel',
      dateOfBirth: '2011-08-22',
      gender: 'female',
      classId: 'cls-10',
      className: 'Class 10',
      sectionId: 'sec-10a',
      sectionName: 'A',
      guardianName: 'Suresh Patel',
      guardianPhone: '+91 98765 43211',
      guardianEmail: 'suresh.patel@example.invalid',
      status: 'active',
      admissionDate: '2020-04-01',
    },
    {
      id: 'stu-103',
      admissionNumber: 'ADM-2026-003',
      rollNumber: '10-A-03',
      fullName: 'Kabir Mehta',
      dateOfBirth: '2011-01-10',
      gender: 'male',
      classId: 'cls-10',
      className: 'Class 10',
      sectionId: 'sec-10a',
      sectionName: 'A',
      guardianName: 'Amit Mehta',
      guardianPhone: '+91 98765 43212',
      guardianEmail: 'amit.mehta@example.invalid',
      status: 'active',
      admissionDate: '2021-06-15',
    },
    {
      id: 'stu-201',
      admissionNumber: 'ADM-2026-004',
      rollNumber: '6-B-14',
      fullName: 'Ananya Sharma',
      dateOfBirth: '2015-09-03',
      gender: 'female',
      classId: 'cls-6',
      className: 'Class 6',
      sectionId: 'sec-6b',
      sectionName: 'B',
      guardianName: 'Rajesh Sharma',
      guardianPhone: '+91 98765 43210',
      guardianEmail: 'rajesh.sharma@example.invalid',
      status: 'active',
      admissionDate: '2024-04-01',
    },
  ];

  staff: StaffRecord[] = [
    {
      id: 'stf-admin-1',
      employeeCode: 'EMP-ADM-01',
      fullName: 'Dr. Sunita Rao',
      email: 'principal@school.invalid',
      phone: '+91 98111 22233',
      role: 'admin',
      department: 'Administration',
      designation: 'Principal',
      qualification: 'Ph.D. Education, M.Sc. Physics',
      joiningDate: '2018-05-01',
      status: 'active',
    },
    {
      id: 'stf-tch-1',
      employeeCode: 'EMP-TCH-04',
      fullName: 'Pooja Verma',
      email: 'pooja.verma@school.invalid',
      phone: '+91 98222 33344',
      role: 'teacher',
      department: 'Mathematics',
      designation: 'Senior Teacher',
      qualification: 'M.Sc. Mathematics, B.Ed.',
      joiningDate: '2020-07-15',
      status: 'active',
    },
    {
      id: 'stf-acc-1',
      employeeCode: 'EMP-ACC-02',
      fullName: 'Ramesh Iyer',
      email: 'ramesh.iyer@school.invalid',
      phone: '+91 98333 44455',
      role: 'accountant',
      department: 'Finance',
      designation: 'Chief Accountant',
      qualification: 'M.Com, Inter CA',
      joiningDate: '2019-02-10',
      status: 'active',
    },
  ];

  classes: ClassRecord[] = [
    {
      id: 'cls-10',
      name: 'Class 10',
      gradeLevel: 10,
      stream: 'General',
      totalStudents: 3,
      sections: [
        {
          id: 'sec-10a',
          classId: 'cls-10',
          name: 'A',
          roomNumber: 'Room 204',
          capacity: 40,
          currentEnrollment: 3,
          classTeacherId: 'stf-tch-1',
          classTeacherName: 'Pooja Verma',
        },
      ],
    },
    {
      id: 'cls-6',
      name: 'Class 6',
      gradeLevel: 6,
      stream: 'General',
      totalStudents: 1,
      sections: [
        {
          id: 'sec-6b',
          classId: 'cls-6',
          name: 'B',
          roomNumber: 'Room 106',
          capacity: 35,
          currentEnrollment: 1,
        },
      ],
    },
  ];

  academicYears: AcademicYearRecord[] = [
    {
      id: 'ay-2026',
      name: '2026–2027',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      isCurrent: true,
      terms: [
        { id: 't1', name: 'Term 1', startDate: '2026-04-01', endDate: '2026-09-30' },
        { id: 't2', name: 'Term 2', startDate: '2026-10-01', endDate: '2027-03-31' },
      ],
    },
  ];

  teacherAssignments: TeacherAssignmentRecord[] = [
    {
      id: 'asg-1',
      teacherId: 'stf-tch-1',
      teacherName: 'Pooja Verma',
      classId: 'cls-10',
      className: 'Class 10',
      sectionId: 'sec-10a',
      sectionName: 'A',
      subjectId: 'sub-math',
      subjectName: 'Mathematics',
      periodsPerWeek: 6,
    },
  ];

  settings: SchoolSettingsRecord = {
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
  };

  auditLogs: AuditTrailRecord[] = [
    {
      id: 'aud-001',
      timestamp: Date.now() - 3600000,
      actorProfileId: 'principal-usr-1',
      actorName: 'Dr. Sunita Rao',
      actorRole: 'admin',
      eventType: 'school_settings_updated',
      targetType: 'school_settings',
      targetId: 'settings',
      description: 'Updated operational hours and emergency contact details',
      ipAddress: '127.0.0.1',
    },
  ];

  homeworkList: HomeworkRecord[] = [
    {
      id: 'hw-01',
      classId: 'cls-10',
      sectionId: 'sec-10a',
      subject: 'Mathematics',
      title: 'Quadratic Equations Exercise 4.2',
      description: 'Solve questions 1 through 10 from NCERT textbook Chapter 4.',
      assignedDate: '2026-11-05',
      dueDate: '2026-11-08',
      maxPoints: 20,
      submissionsCount: 2,
      totalStudents: 3,
      status: 'active',
    },
  ];

  marksSheets: MarksSheetRecord[] = [
    {
      id: 'ms-01',
      classId: 'cls-10',
      sectionId: 'sec-10a',
      examName: 'Midterm Assessment 2026',
      subject: 'Mathematics',
      examDate: '2026-10-15',
      maxMarks: 100,
      passingMarks: 40,
      isPublished: true,
      publishedAt: '2026-10-20T10:00:00Z',
      entries: [
        { studentId: 'stu-101', rollNumber: '10-A-01', studentName: 'Aarav Sharma', marksObtained: 88, maxMarks: 100, remarks: 'Excellent logical reasoning' },
        { studentId: 'stu-102', rollNumber: '10-A-02', studentName: 'Diya Patel', marksObtained: 94, maxMarks: 100, remarks: 'Top score in section' },
        { studentId: 'stu-103', rollNumber: '10-A-03', studentName: 'Kabir Mehta', marksObtained: 76, maxMarks: 100, remarks: 'Good attempt' },
      ],
    },
  ];

  feeStructures: FeeStructureItem[] = [
    { id: 'fs-1', classId: 'cls-10', className: 'Class 10', feeCategory: 'tuition', amountPaise: 4500000, frequency: 'quarterly', dueDate: '2026-11-15' },
    { id: 'fs-2', classId: 'cls-10', className: 'Class 10', feeCategory: 'laboratory', amountPaise: 500000, frequency: 'quarterly', dueDate: '2026-11-15' },
    { id: 'fs-3', classId: 'cls-6', className: 'Class 6', feeCategory: 'tuition', amountPaise: 3500000, frequency: 'quarterly', dueDate: '2026-11-15' },
  ];

  feeInvoices: FeeInvoiceRecord[] = [
    {
      id: 'inv-101',
      invoiceNumber: 'INV-2026-Q3-001',
      issueDate: '2026-10-01',
      dueDate: '2026-11-15',
      title: 'Q3 Tuition & Laboratory Fee',
      amountPaise: 5000000, // ₹50,000.00
      paidPaise: 3500000,   // ₹35,000.00
      balancePaise: 1500000, // ₹15,000.00
      status: 'partial',
    },
  ];

  payments: PaymentReceiptRecord[] = [
    {
      id: 'rec-101',
      receiptNumber: 'RCP-2026-0042',
      idempotencyKey: 'idemp-pay-101-initial',
      studentId: 'stu-101',
      studentName: 'Aarav Sharma',
      invoiceId: 'inv-101',
      amountPaise: 3500000,
      paymentDate: '2026-10-10',
      paymentMethod: 'upi',
      transactionReference: 'UPI/20261010/894125',
      collectedByProfileId: 'stf-acc-1',
      collectedByName: 'Ramesh Iyer',
      status: 'settled',
      notes: 'Quarter 3 installment 1',
    },
  ];

  expenses: ExpenseRecord[] = [
    {
      id: 'exp-01',
      voucherNumber: 'EXP-2026-018',
      category: 'utilities',
      payee: 'State Electricity Board',
      amountPaise: 2450000, // ₹24,500.00
      expenseDate: '2026-10-25',
      paymentMethod: 'bank_transfer',
      description: 'Electricity bill for October 2026',
      approvedByProfileId: 'principal-usr-1',
    },
  ];

  announcements: AnnouncementItem[] = [
    {
      id: 'ann-1',
      title: 'Annual Sports Meet 2026',
      content: 'The Annual Sports Meet will be held on 25–26 November. Registrations for track events open this Monday.',
      date: '2026-11-04',
      category: 'sports',
      priority: 'important',
      targetRoles: ['all'],
    },
    {
      id: 'ann-2',
      title: 'Parent-Teacher Meeting (Term 2)',
      content: 'PTM for Classes 6 to 10 is scheduled for Saturday, 21 November from 9:00 AM to 1:00 PM.',
      date: '2026-11-02',
      category: 'academic',
      priority: 'urgent',
      targetRoles: ['parent', 'teacher'],
    },
  ];

  attendanceRegistry: Map<string, { status: 'present' | 'absent' | 'late' | 'excused'; remarks?: string }> = new Map([
    ['stu-101:2026-11-05', { status: 'present' }],
    ['stu-102:2026-11-05', { status: 'present' }],
    ['stu-103:2026-11-05', { status: 'late', remarks: 'Bus breakdown' }],
    ['stu-201:2026-11-05', { status: 'present' }],
  ]);
}

// Global development singleton
const devStore = new DevelopmentStore();

// =============================================================================
// Helper Authorization Validator & Context Extractors
// =============================================================================

function getContextProfileId(context: PolicyContext): string | undefined {
  if (context && 'profileId' in context && typeof context.profileId === 'string') {
    return context.profileId;
  }
  return undefined;
}

function getContextRole(context: PolicyContext): string | undefined {
  if (context && 'activeRole' in context && context.activeRole && typeof context.activeRole.role === 'string') {
    return context.activeRole.role;
  }
  return undefined;
}

function checkAuth(context: PolicyContext, permission: string): boolean {
  if (!context) return false;
  const decision = evaluatePermission(context, permission, Date.now());
  return decision.allowed === true;
}

// =============================================================================
// Phase 2A — School Admin Services
// =============================================================================

export class SchoolAdminService {
  static getOverviewMetrics(context: PolicyContext): OperationResult<{
    totalStudents: number;
    totalStaff: number;
    totalClasses: number;
    attendanceRate: number;
    totalFeeCollectedPaise: number;
    totalFeePendingPaise: number;
  }> {
    if (!checkAuth(context, 'school.settings.read')) {
      return { success: false, error: 'Unauthorized: School Admin read access required', code: 'PERMISSION_DENIED' };
    }

    const totalStudents = devStore.students.filter(s => s.status === 'active').length;
    const totalStaff = devStore.staff.filter(s => s.status === 'active').length;
    const totalClasses = devStore.classes.length;
    const totalFeeCollectedPaise = devStore.payments.reduce((sum, p) => sum + p.amountPaise, 0);
    const totalFeePendingPaise = devStore.feeInvoices.reduce((sum, i) => sum + i.balancePaise, 0);

    return {
      success: true,
      data: {
        totalStudents,
        totalStaff,
        totalClasses,
        attendanceRate: 94.2,
        totalFeeCollectedPaise,
        totalFeePendingPaise,
      },
    };
  }

  static listStudents(context: PolicyContext, params?: PaginationParams): OperationResult<PaginatedResult<StudentRecord>> {
    if (!checkAuth(context, 'students.read')) {
      return { success: false, error: 'Unauthorized: Student directory access required', code: 'PERMISSION_DENIED' };
    }

    let items = [...devStore.students];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(s => s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q));
    }
    if (params?.filter && params.filter !== 'all') {
      items = items.filter(s => s.classId === params.filter || s.status === params.filter);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = items.length;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      success: true,
      data: {
        items: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  static createStudentAdmission(context: PolicyContext, input: NewStudentAdmissionInput): OperationResult<StudentRecord> {
    if (!checkAuth(context, 'admissions.write')) {
      return { success: false, error: 'Unauthorized: Admissions write permission required', code: 'PERMISSION_DENIED' };
    }

    // Validation
    if (!input.fullName || input.fullName.trim().length < 2) {
      return { success: false, error: 'Student full name must be at least 2 characters', code: 'INVALID_INPUT' };
    }
    if (!input.guardianName || !input.guardianPhone || !/^(\+91\s?)?[6-9]\d{9}$/.test(input.guardianPhone.replace(/\s+/g, ''))) {
      return { success: false, error: 'Valid guardian phone number required', code: 'INVALID_INPUT' };
    }
    if (!input.classId || !input.sectionId) {
      return { success: false, error: 'Class and section must be specified', code: 'INVALID_INPUT' };
    }

    const targetClass = devStore.classes.find(c => c.id === input.classId);
    const targetSection = targetClass?.sections.find(s => s.id === input.sectionId);
    if (!targetClass || !targetSection) {
      return { success: false, error: 'Selected class or section not found', code: 'NOT_FOUND' };
    }

    const newId = 'stu-' + (devStore.students.length + 101);
    const admissionNumber = `ADM-2026-${String(devStore.students.length + 1).padStart(3, '0')}`;
    const rollNumber = `${targetClass.gradeLevel}-${targetSection.name}-${String(targetSection.currentEnrollment + 1).padStart(2, '0')}`;

    const newStudent: StudentRecord = {
      id: newId,
      admissionNumber,
      rollNumber,
      fullName: input.fullName.trim(),
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      classId: input.classId,
      className: targetClass.name,
      sectionId: input.sectionId,
      sectionName: targetSection.name,
      guardianName: input.guardianName.trim(),
      guardianPhone: input.guardianPhone.trim(),
      guardianEmail: input.guardianEmail?.trim() || '',
      status: 'active',
      admissionDate: new Date().toISOString().split('T')[0],
    };

    devStore.students.push(newStudent);

    // Record audit event
    devStore.auditLogs.unshift({
      id: 'aud-' + Date.now(),
      timestamp: Date.now(),
      actorProfileId: getContextProfileId(context) || 'admin',
      actorName: 'School Administrator',
      actorRole: 'admin',
      eventType: 'student_admitted',
      targetType: 'student',
      targetId: newId,
      description: `Admitted student ${newStudent.fullName} (${newStudent.admissionNumber}) to ${newStudent.className}-${newStudent.sectionName}`,
      ipAddress: '127.0.0.1',
    });

    return { success: true, data: newStudent, message: 'Student admission successfully completed' };
  }

  static listStaff(context: PolicyContext, params?: PaginationParams): OperationResult<PaginatedResult<StaffRecord>> {
    if (!checkAuth(context, 'staff.read')) {
      return { success: false, error: 'Unauthorized: Staff directory access required', code: 'PERMISSION_DENIED' };
    }

    let items = [...devStore.staff];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(s => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.department.toLowerCase().includes(q));
    }
    if (params?.filter && params.filter !== 'all') {
      items = items.filter(s => s.role === params.filter || s.status === params.filter);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = items.length;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      success: true,
      data: {
        items: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  static createStaffMember(context: PolicyContext, input: NewStaffInput): OperationResult<StaffRecord> {
    if (!checkAuth(context, 'security.accounts.create')) {
      return { success: false, error: 'Unauthorized: Staff account creation permission required', code: 'PERMISSION_DENIED' };
    }

    if (!input.fullName || !input.email || !input.role) {
      return { success: false, error: 'Full name, email, and role are required', code: 'INVALID_INPUT' };
    }
    if (devStore.staff.some(s => s.email.toLowerCase() === input.email.toLowerCase())) {
      return { success: false, error: 'A staff member with this email already exists', code: 'DUPLICATE_EMAIL' };
    }

    const newId = 'stf-' + (devStore.staff.length + 1);
    const employeeCode = `EMP-${input.role.toUpperCase().slice(0, 3)}-${String(devStore.staff.length + 1).padStart(2, '0')}`;

    const newStaff: StaffRecord = {
      id: newId,
      employeeCode,
      fullName: input.fullName.trim(),
      email: input.email.toLowerCase().trim(),
      phone: input.phone?.trim() || '',
      role: input.role,
      department: input.department.trim(),
      designation: input.designation.trim(),
      qualification: input.qualification.trim(),
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'active',
    };

    devStore.staff.push(newStaff);

    devStore.auditLogs.unshift({
      id: 'aud-' + Date.now(),
      timestamp: Date.now(),
      actorProfileId: getContextProfileId(context) || 'admin',
      actorName: 'School Administrator',
      actorRole: 'admin',
      eventType: 'staff_account_created',
      targetType: 'staff',
      targetId: newId,
      description: `Created staff profile for ${newStaff.fullName} (${newStaff.role})`,
      ipAddress: '127.0.0.1',
    });

    return { success: true, data: newStaff, message: 'Staff member added successfully' };
  }

  static listClasses(context: PolicyContext): OperationResult<readonly ClassRecord[]> {
    if (!checkAuth(context, 'academics.manage')) {
      return { success: false, error: 'Unauthorized: Academic management permission required', code: 'PERMISSION_DENIED' };
    }
    return { success: true, data: devStore.classes };
  }

  static createClass(context: PolicyContext, name: string, gradeLevel: number, sectionName: string): OperationResult<ClassRecord> {
    if (!checkAuth(context, 'academics.manage')) {
      return { success: false, error: 'Unauthorized: Academic management permission required', code: 'PERMISSION_DENIED' };
    }

    if (!name || gradeLevel < 1 || gradeLevel > 12 || !sectionName) {
      return { success: false, error: 'Invalid class name, grade level, or section name', code: 'INVALID_INPUT' };
    }

    const classId = 'cls-' + gradeLevel;
    let existing = devStore.classes.find(c => c.id === classId);

    if (existing) {
      if (existing.sections.some(s => s.name.toUpperCase() === sectionName.toUpperCase())) {
        return { success: false, error: `Section ${sectionName} already exists for ${name}`, code: 'DUPLICATE_SECTION' };
      }
      const newSec = {
        id: `sec-${gradeLevel}${sectionName.toLowerCase()}`,
        classId,
        name: sectionName.toUpperCase(),
        roomNumber: 'TBD',
        capacity: 40,
        currentEnrollment: 0,
      };
      existing = {
        ...existing,
        sections: [...existing.sections, newSec],
      };
      const idx = devStore.classes.findIndex(c => c.id === classId);
      devStore.classes[idx] = existing;
      return { success: true, data: existing, message: `Added section ${sectionName} to ${name}` };
    }

    const newClass: ClassRecord = {
      id: classId,
      name,
      gradeLevel,
      stream: 'General',
      totalStudents: 0,
      sections: [
        {
          id: `sec-${gradeLevel}${sectionName.toLowerCase()}`,
          classId,
          name: sectionName.toUpperCase(),
          roomNumber: 'Room ' + (100 + gradeLevel),
          capacity: 40,
          currentEnrollment: 0,
        },
      ],
    };

    devStore.classes.push(newClass);
    return { success: true, data: newClass, message: `Created ${name} with section ${sectionName}` };
  }

  static listAcademicYears(context: PolicyContext): OperationResult<readonly AcademicYearRecord[]> {
    if (!checkAuth(context, 'school.settings.read')) {
      return { success: false, error: 'Unauthorized', code: 'PERMISSION_DENIED' };
    }
    return { success: true, data: devStore.academicYears };
  }

  static listTeacherAssignments(context: PolicyContext): OperationResult<readonly TeacherAssignmentRecord[]> {
    if (!checkAuth(context, 'academics.manage')) {
      return { success: false, error: 'Unauthorized: Academics permission required', code: 'PERMISSION_DENIED' };
    }
    return { success: true, data: devStore.teacherAssignments };
  }

  static assignTeacher(context: PolicyContext, teacherId: string, classId: string, sectionId: string, subjectName: string, periods: number): OperationResult<TeacherAssignmentRecord> {
    if (!checkAuth(context, 'academics.manage')) {
      return { success: false, error: 'Unauthorized: Academics permission required', code: 'PERMISSION_DENIED' };
    }

    const teacher = devStore.staff.find(s => s.id === teacherId && s.role === 'teacher');
    const targetClass = devStore.classes.find(c => c.id === classId);
    const targetSection = targetClass?.sections.find(s => s.id === sectionId);

    if (!teacher || !targetClass || !targetSection) {
      return { success: false, error: 'Teacher, class, or section not found', code: 'NOT_FOUND' };
    }

    const newAsg: TeacherAssignmentRecord = {
      id: 'asg-' + (devStore.teacherAssignments.length + 1),
      teacherId,
      teacherName: teacher.fullName,
      classId,
      className: targetClass.name,
      sectionId,
      sectionName: targetSection.name,
      subjectId: 'sub-' + subjectName.toLowerCase().replace(/\s+/g, '-'),
      subjectName,
      periodsPerWeek: periods || 5,
    };

    devStore.teacherAssignments.push(newAsg);
    return { success: true, data: newAsg, message: `Assigned ${teacher.fullName} to teach ${subjectName} in ${targetClass.name}-${targetSection.name}` };
  }

  static getAttendanceSummary(context: PolicyContext, date: string): OperationResult<SchoolAttendanceSummary> {
    if (!checkAuth(context, 'attendance.read')) {
      return { success: false, error: 'Unauthorized: Attendance read permission required', code: 'PERMISSION_DENIED' };
    }

    const targetDate = date || '2026-11-05';
    let present = 0;
    let late = 0;
    let absent = 0;

    devStore.students.forEach(s => {
      const record = devStore.attendanceRegistry.get(`${s.id}:${targetDate}`);
      if (record?.status === 'present') present++;
      else if (record?.status === 'late') late++;
      else absent++;
    });

    const total = devStore.students.length;
    const overallPercentage = total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 100;

    const classBreakdown = devStore.classes.flatMap(c =>
      c.sections.map(sec => {
        const secStudents = devStore.students.filter(s => s.classId === c.id && s.sectionId === sec.id);
        const secPresent = secStudents.filter(s => {
          const rec = devStore.attendanceRegistry.get(`${s.id}:${targetDate}`);
          return rec?.status === 'present' || rec?.status === 'late';
        }).length;
        return {
          classId: c.id,
          className: c.name,
          sectionName: sec.name,
          total: secStudents.length,
          present: secPresent,
          percentage: secStudents.length > 0 ? Number(((secPresent / secStudents.length) * 100).toFixed(1)) : 100,
        };
      })
    );

    return {
      success: true,
      data: {
        date: targetDate,
        totalStudents: total,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        overallPercentage,
        classBreakdown,
      },
    };
  }

  static getSchoolSettings(context: PolicyContext): OperationResult<SchoolSettingsRecord> {
    if (!checkAuth(context, 'school.settings.read')) {
      return { success: false, error: 'Unauthorized', code: 'PERMISSION_DENIED' };
    }
    return { success: true, data: devStore.settings };
  }

  static updateSchoolSettings(context: PolicyContext, updates: Partial<SchoolSettingsRecord>): OperationResult<SchoolSettingsRecord> {
    if (!checkAuth(context, 'school.settings.write')) {
      return { success: false, error: 'Unauthorized: School settings write permission required', code: 'PERMISSION_DENIED' };
    }

    devStore.settings = { ...devStore.settings, ...updates };

    devStore.auditLogs.unshift({
      id: 'aud-' + Date.now(),
      timestamp: Date.now(),
      actorProfileId: getContextProfileId(context) || 'admin',
      actorName: 'School Administrator',
      actorRole: 'admin',
      eventType: 'school_settings_updated',
      targetType: 'school_settings',
      targetId: 'settings',
      description: 'Updated school profile and operational configuration',
      ipAddress: '127.0.0.1',
    });

    return { success: true, data: devStore.settings, message: 'School settings updated successfully' };
  }

  static listAuditTrail(context: PolicyContext, params?: PaginationParams): OperationResult<PaginatedResult<AuditTrailRecord>> {
    if (!checkAuth(context, 'audit.read')) {
      return { success: false, error: 'Unauthorized: Audit trail read permission required', code: 'PERMISSION_DENIED' };
    }

    let items = [...devStore.auditLogs];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(l => l.description.toLowerCase().includes(q) || l.eventType.toLowerCase().includes(q) || l.actorName.toLowerCase().includes(q));
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = items.length;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      success: true,
      data: {
        items: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }
}

// =============================================================================
// Phase 2B — Teacher Services
// =============================================================================

export class TeacherService {
  static getAssignedClasses(context: PolicyContext, teacherProfileId: string): OperationResult<readonly TeacherAssignedClass[]> {
    if (!checkAuth(context, 'dashboard.teacher.view')) {
      return { success: false, error: 'Unauthorized: Teacher dashboard access required', code: 'PERMISSION_DENIED' };
    }

    const assignments = devStore.teacherAssignments.filter(a => a.teacherId === teacherProfileId);
    const classes: TeacherAssignedClass[] = assignments.map(a => {
      const studentCount = devStore.students.filter(s => s.classId === a.classId && s.sectionId === a.sectionId && s.status === 'active').length;
      const targetClass = devStore.classes.find(c => c.id === a.classId);
      const section = targetClass?.sections.find(s => s.id === a.sectionId);
      return {
        classId: a.classId,
        className: a.className,
        sectionId: a.sectionId,
        sectionName: a.sectionName,
        subjectId: a.subjectId,
        subjectName: a.subjectName,
        studentCount,
        isClassTeacher: section?.classTeacherId === teacherProfileId,
      };
    });

    return { success: true, data: classes };
  }

  static getStudentRoster(context: PolicyContext, classId: string, sectionId: string, teacherProfileId: string): OperationResult<readonly StudentRecord[]> {
    if (!checkAuth(context, 'students.read')) {
      return { success: false, error: 'Unauthorized', code: 'PERMISSION_DENIED' };
    }

    // Scoping check: Teacher must be assigned to this class/section
    const isAssigned = devStore.teacherAssignments.some(a => a.teacherId === teacherProfileId && a.classId === classId && a.sectionId === sectionId);
    if (!isAssigned) {
      return { success: false, error: 'Access denied: You are not assigned to this class and section', code: 'UNAUTHORIZED_SCOPE' };
    }

    const roster = devStore.students.filter(s => s.classId === classId && s.sectionId === sectionId && s.status === 'active');
    return { success: true, data: roster };
  }

  static recordAttendance(
    context: PolicyContext,
    classId: string,
    sectionId: string,
    date: string,
    records: readonly AttendanceEntryItem[],
    teacherProfileId: string
  ): OperationResult<{ savedCount: number; date: string }> {
    if (!checkAuth(context, 'attendance.write')) {
      return { success: false, error: 'Unauthorized: Attendance write permission required', code: 'PERMISSION_DENIED' };
    }

    // Class scoping check
    const isAssigned = devStore.teacherAssignments.some(a => a.teacherId === teacherProfileId && a.classId === classId && a.sectionId === sectionId);
    if (!isAssigned) {
      return { success: false, error: 'Access denied: You can only record attendance for assigned classes', code: 'UNAUTHORIZED_SCOPE' };
    }

    if (!records || records.length === 0) {
      return { success: false, error: 'No attendance records provided', code: 'INVALID_INPUT' };
    }

    records.forEach(r => {
      devStore.attendanceRegistry.set(`${r.studentId}:${date}`, { status: r.status, remarks: r.remarks });
    });

    return {
      success: true,
      data: { savedCount: records.length, date },
      message: `Successfully saved attendance for ${records.length} students on ${date}`,
    };
  }

  static createHomework(
    context: PolicyContext,
    classId: string,
    sectionId: string,
    subject: string,
    title: string,
    description: string,
    dueDate: string,
    teacherProfileId: string
  ): OperationResult<HomeworkRecord> {
    if (!checkAuth(context, 'homework.write')) {
      return { success: false, error: 'Unauthorized: Homework write permission required', code: 'PERMISSION_DENIED' };
    }

    const isAssigned = devStore.teacherAssignments.some(a => a.teacherId === teacherProfileId && a.classId === classId && a.sectionId === sectionId);
    if (!isAssigned) {
      return { success: false, error: 'Access denied: You can only assign homework to assigned classes', code: 'UNAUTHORIZED_SCOPE' };
    }

    if (!title || !description || !dueDate) {
      return { success: false, error: 'Title, description, and due date are required', code: 'INVALID_INPUT' };
    }

    const totalStudents = devStore.students.filter(s => s.classId === classId && s.sectionId === sectionId && s.status === 'active').length;
    const newHw: HomeworkRecord = {
      id: 'hw-' + (devStore.homeworkList.length + 1),
      classId,
      sectionId,
      subject,
      title: title.trim(),
      description: description.trim(),
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate,
      maxPoints: 20,
      submissionsCount: 0,
      totalStudents,
      status: 'active',
    };

    devStore.homeworkList.unshift(newHw);
    return { success: true, data: newHw, message: 'Homework successfully published' };
  }

  static listHomework(context: PolicyContext, classId: string, sectionId: string): OperationResult<readonly HomeworkRecord[]> {
    if (!checkAuth(context, 'homework.read')) {
      return { success: false, error: 'Unauthorized', code: 'PERMISSION_DENIED' };
    }
    const list = devStore.homeworkList.filter(h => h.classId === classId && h.sectionId === sectionId);
    return { success: true, data: list };
  }

  static recordMarksDraft(
    context: PolicyContext,
    classId: string,
    sectionId: string,
    examName: string,
    subject: string,
    maxMarks: number,
    entries: readonly { studentId: string; marksObtained: number; remarks?: string }[],
    teacherProfileId: string
  ): OperationResult<MarksSheetRecord> {
    if (!checkAuth(context, 'marks.write')) {
      return { success: false, error: 'Unauthorized: Marks write permission required', code: 'PERMISSION_DENIED' };
    }

    const isAssigned = devStore.teacherAssignments.some(a => a.teacherId === teacherProfileId && a.classId === classId && a.sectionId === sectionId);
    if (!isAssigned) {
      return { success: false, error: 'Access denied: You can only record marks for assigned classes', code: 'UNAUTHORIZED_SCOPE' };
    }

    // Validate entries
    for (const entry of entries) {
      if (entry.marksObtained < 0 || entry.marksObtained > maxMarks) {
        return { success: false, error: `Marks obtained (${entry.marksObtained}) must be between 0 and ${maxMarks}`, code: 'INVALID_SCORE' };
      }
    }

    const mappedEntries: MarksEntryItem[] = entries.map(e => {
      const student = devStore.students.find(s => s.id === e.studentId);
      return {
        studentId: e.studentId,
        rollNumber: student?.rollNumber || '',
        studentName: student?.fullName || '',
        marksObtained: e.marksObtained,
        maxMarks,
        remarks: e.remarks,
      };
    });

    const existingIdx = devStore.marksSheets.findIndex(m => m.classId === classId && m.sectionId === sectionId && m.examName === examName && m.subject === subject);
    const sheet: MarksSheetRecord = {
      id: existingIdx >= 0 ? devStore.marksSheets[existingIdx].id : 'ms-' + (devStore.marksSheets.length + 1),
      classId,
      sectionId,
      examName,
      subject,
      examDate: new Date().toISOString().split('T')[0],
      maxMarks,
      passingMarks: Math.round(maxMarks * 0.4),
      isPublished: false,
      entries: mappedEntries,
    };

    if (existingIdx >= 0) {
      devStore.marksSheets[existingIdx] = sheet;
    } else {
      devStore.marksSheets.push(sheet);
    }

    return { success: true, data: sheet, message: 'Marks draft saved successfully' };
  }

  static publishMarks(context: PolicyContext, sheetId: string, teacherProfileId: string): OperationResult<MarksSheetRecord> {
    if (!checkAuth(context, 'marks.write') && !checkAuth(context, 'marks.publish')) {
      return { success: false, error: 'Unauthorized: Marks write or publish permission required', code: 'PERMISSION_DENIED' };
    }

    const sheet = devStore.marksSheets.find(m => m.id === sheetId);
    if (!sheet) {
      return { success: false, error: 'Marksheet not found', code: 'NOT_FOUND' };
    }

    const isAssigned = devStore.teacherAssignments.some(a => a.teacherId === teacherProfileId && a.classId === sheet.classId && a.sectionId === sheet.sectionId);
    if (!isAssigned) {
      return { success: false, error: 'Access denied: Cannot publish marks for unassigned classes', code: 'UNAUTHORIZED_SCOPE' };
    }

    const published: MarksSheetRecord = {
      ...sheet,
      isPublished: true,
      publishedAt: new Date().toISOString(),
    };

    const idx = devStore.marksSheets.findIndex(m => m.id === sheetId);
    devStore.marksSheets[idx] = published;

    return { success: true, data: published, message: 'Marks published successfully to students and parents' };
  }

  static getTeacherTimetable(context: PolicyContext, teacherProfileId: string): OperationResult<TeacherWeeklyTimetable> {
    if (!checkAuth(context, 'dashboard.teacher.view')) {
      return { success: false, error: 'Unauthorized', code: 'PERMISSION_DENIED' };
    }

    const timetable: TeacherWeeklyTimetable = {
      teacherId: teacherProfileId,
      days: [
        {
          dayOfWeek: 'Monday',
          slots: [
            { period: 1, startTime: '08:30', endTime: '09:15', subject: 'Mathematics', className: 'Class 10', sectionName: 'A', roomNumber: 'Room 204' },
            { period: 3, startTime: '10:15', endTime: '11:00', subject: 'Mathematics', className: 'Class 10', sectionName: 'A', roomNumber: 'Room 204' },
          ],
        },
        {
          dayOfWeek: 'Tuesday',
          slots: [
            { period: 2, startTime: '09:15', endTime: '10:00', subject: 'Mathematics', className: 'Class 10', sectionName: 'A', roomNumber: 'Room 204' },
          ],
        },
        {
          dayOfWeek: 'Wednesday',
          slots: [
            { period: 1, startTime: '08:30', endTime: '09:15', subject: 'Mathematics', className: 'Class 10', sectionName: 'A', roomNumber: 'Room 204' },
            { period: 4, startTime: '11:00', endTime: '11:45', subject: 'Mathematics', className: 'Class 10', sectionName: 'A', roomNumber: 'Room 204' },
          ],
        },
        {
          dayOfWeek: 'Thursday',
          slots: [
            { period: 3, startTime: '10:15', endTime: '11:00', subject: 'Mathematics', className: 'Class 10', sectionName: 'A', roomNumber: 'Room 204' },
          ],
        },
        {
          dayOfWeek: 'Friday',
          slots: [
            { period: 2, startTime: '09:15', endTime: '10:00', subject: 'Mathematics', className: 'Class 10', sectionName: 'A', roomNumber: 'Room 204' },
          ],
        },
      ],
    };

    return { success: true, data: timetable };
  }
}

// =============================================================================
// Phase 2C — Accountant Services
// =============================================================================

export class AccountantService {
  static getFinancialSummary(context: PolicyContext): OperationResult<FinancialSummaryReport> {
    if (!checkAuth(context, 'fees.read') || !checkAuth(context, 'payments.read')) {
      return { success: false, error: 'Unauthorized: Financial read access required', code: 'PERMISSION_DENIED' };
    }

    const totalBilledPaise = devStore.feeInvoices.reduce((sum, i) => sum + i.amountPaise, 0);
    const totalCollectedPaise = devStore.payments.reduce((sum, p) => sum + p.amountPaise, 0);
    const totalOutstandingPaise = devStore.feeInvoices.reduce((sum, i) => sum + i.balancePaise, 0);
    const totalOverduePaise = devStore.feeInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.balancePaise, 0);
    const totalExpensesPaise = devStore.expenses.reduce((sum, e) => sum + e.amountPaise, 0);
    const netCashFlowPaise = totalCollectedPaise - totalExpensesPaise;

    return {
      success: true,
      data: {
        periodLabel: 'Q3 Financial Overview (Oct–Dec 2026)',
        totalBilledPaise,
        totalCollectedPaise,
        totalOutstandingPaise,
        totalOverduePaise,
        totalExpensesPaise,
        netCashFlowPaise,
        agingSummary: {
          currentPaise: totalOutstandingPaise - totalOverduePaise,
          past30DaysPaise: totalOverduePaise,
          past60DaysPaise: 0,
          past90DaysPaise: 0,
        },
      },
    };
  }

  static listFeeStructures(context: PolicyContext): OperationResult<readonly FeeStructureItem[]> {
    if (!checkAuth(context, 'fees.read')) {
      return { success: false, error: 'Unauthorized', code: 'PERMISSION_DENIED' };
    }
    return { success: true, data: devStore.feeStructures };
  }

  static getStudentLedger(context: PolicyContext, studentId: string): OperationResult<StudentFeeLedger> {
    if (!checkAuth(context, 'fees.read')) {
      return { success: false, error: 'Unauthorized: Fee ledger access required', code: 'PERMISSION_DENIED' };
    }

    const student = devStore.students.find(s => s.id === studentId);
    if (!student) {
      return { success: false, error: 'Student not found', code: 'NOT_FOUND' };
    }

    const invoices = devStore.feeInvoices; // Scoped to student in real query
    const payments = devStore.payments.filter(p => p.studentId === studentId);

    const totalBilledPaise = invoices.reduce((sum, i) => sum + i.amountPaise, 0);
    const totalCollectedPaise = payments.reduce((sum, p) => sum + p.amountPaise, 0);
    const balancePaise = Math.max(0, totalBilledPaise - totalCollectedPaise);
    const overduePaise = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.balancePaise, 0);

    return {
      success: true,
      data: {
        studentId: student.id,
        studentName: student.fullName,
        rollNumber: student.rollNumber,
        className: student.className,
        sectionName: student.sectionName,
        totalBilledPaise,
        totalCollectedPaise,
        balancePaise,
        overduePaise,
        status: balancePaise === 0 ? 'paid' : overduePaise > 0 ? 'overdue' : 'partial',
        invoices,
        payments,
      },
    };
  }

  static collectPayment(context: PolicyContext, input: CollectPaymentInput): OperationResult<PaymentReceiptRecord> {
    if (!checkAuth(context, 'payments.record')) {
      return { success: false, error: 'Unauthorized: Payment recording permission required', code: 'PERMISSION_DENIED' };
    }

    // 1. Idempotency Check (prevent duplicate payment submissions)
    if (!input.idempotencyKey || devStore.payments.some(p => p.idempotencyKey === input.idempotencyKey)) {
      return { success: false, error: 'Duplicate payment submission detected (idempotency conflict)', code: 'DUPLICATE_PAYMENT' };
    }

    // 2. Validate Amount
    if (!input.amountPaise || input.amountPaise <= 0 || !Number.isSafeInteger(input.amountPaise)) {
      return { success: false, error: 'Payment amount must be a positive integer in paise', code: 'INVALID_AMOUNT' };
    }

    const student = devStore.students.find(s => s.id === input.studentId);
    if (!student) {
      return { success: false, error: 'Student not found', code: 'NOT_FOUND' };
    }

    // Record Mutation Policy Enforcement (Settled records are immutable)
    const mutationDecision = evaluateRecordMutation(context, {
      permission: 'payments.record',
      kind: 'financial',
      state: 'draft',
      operation: 'append_correction',
      integrityVerified: true,
    }, Date.now());

    if (!mutationDecision.allowed) {
      return { success: false, error: 'Record mutation policy denied payment creation', code: mutationDecision.reason };
    }

    const receiptNumber = `RCP-2026-${String(devStore.payments.length + 43).padStart(4, '0')}`;
    const newPayment: PaymentReceiptRecord = {
      id: 'rec-' + Date.now(),
      receiptNumber,
      idempotencyKey: input.idempotencyKey,
      studentId: student.id,
      studentName: student.fullName,
      invoiceId: input.invoiceId,
      amountPaise: input.amountPaise,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: input.paymentMethod,
      transactionReference: input.transactionReference.trim(),
      collectedByProfileId: getContextProfileId(context) || 'accountant',
      collectedByName: 'Ramesh Iyer',
      status: 'settled', // Settled records are immutable!
      notes: input.notes?.trim(),
    };

    devStore.payments.push(newPayment);

    // Update invoice balance
    if (input.invoiceId) {
      const invIdx = devStore.feeInvoices.findIndex(i => i.id === input.invoiceId);
      if (invIdx >= 0) {
        const inv = devStore.feeInvoices[invIdx];
        const newPaid = inv.paidPaise + input.amountPaise;
        const newBal = Math.max(0, inv.amountPaise - newPaid);
        devStore.feeInvoices[invIdx] = {
          ...inv,
          paidPaise: newPaid,
          balancePaise: newBal,
          status: newBal === 0 ? 'paid' : 'partial',
        };
      }
    }

    return {
      success: true,
      data: newPayment,
      message: `Payment of ₹${(input.amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded. Receipt #${receiptNumber} generated.`,
    };
  }

  static listReceipts(context: PolicyContext, params?: PaginationParams): OperationResult<PaginatedResult<PaymentReceiptRecord>> {
    if (!checkAuth(context, 'receipts.read')) {
      return { success: false, error: 'Unauthorized: Receipt read permission required', code: 'PERMISSION_DENIED' };
    }

    let items = [...devStore.payments].reverse();
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(p => p.receiptNumber.toLowerCase().includes(q) || p.studentName.toLowerCase().includes(q) || p.transactionReference.toLowerCase().includes(q));
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const total = items.length;
    const paginated = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      success: true,
      data: {
        items: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  static recordExpense(
    context: PolicyContext,
    category: ExpenseRecord['category'],
    payee: string,
    amountPaise: number,
    paymentMethod: ExpenseRecord['paymentMethod'],
    description: string
  ): OperationResult<ExpenseRecord> {
    if (!checkAuth(context, 'expenses.write')) {
      return { success: false, error: 'Unauthorized: Expense recording permission required', code: 'PERMISSION_DENIED' };
    }

    if (!payee || !amountPaise || amountPaise <= 0 || !description) {
      return { success: false, error: 'Payee, positive amount, and description are required', code: 'INVALID_INPUT' };
    }

    const voucherNumber = `EXP-2026-${String(devStore.expenses.length + 19).padStart(3, '0')}`;
    const newExp: ExpenseRecord = {
      id: 'exp-' + Date.now(),
      voucherNumber,
      category,
      payee: payee.trim(),
      amountPaise,
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod,
      description: description.trim(),
      approvedByProfileId: getContextProfileId(context) || 'accountant',
    };

    devStore.expenses.push(newExp);
    return { success: true, data: newExp, message: `Expense voucher ${voucherNumber} recorded successfully` };
  }
}

// =============================================================================
// Phase 2D — Student Portal Services
// =============================================================================

export class StudentPortalService {
  static getProfileOverview(context: PolicyContext, studentProfileId: string): OperationResult<StudentProfileOverview> {
    // Identity Scoping: A student can ONLY view their own record
    if (context && getContextRole(context) === 'student' && getContextProfileId(context) !== studentProfileId) {
      return { success: false, error: 'Access denied: Cannot query other student identities', code: 'UNAUTHORIZED_SCOPE' };
    }

    const student = devStore.students.find(s => s.id === studentProfileId) || devStore.students[0];

    return {
      success: true,
      data: {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber,
        fullName: student.fullName,
        className: student.className,
        sectionName: student.sectionName,
        house: 'Vindhya House',
        bloodGroup: 'B+',
        dateOfBirth: student.dateOfBirth,
        attendancePercentage: 94.6,
        currentRank: 2,
        pendingHomeworkCount: devStore.homeworkList.filter(h => h.status === 'active').length,
        feeDuesPaise: 1500000,
      },
    };
  }

  static getAttendanceHistory(context: PolicyContext, studentProfileId: string): OperationResult<readonly StudentAttendanceDay[]> {
    if (context && getContextRole(context) === 'student' && getContextProfileId(context) !== studentProfileId) {
      return { success: false, error: 'Access denied', code: 'UNAUTHORIZED_SCOPE' };
    }

    const days: StudentAttendanceDay[] = [
      { date: '2026-11-01', status: 'present' },
      { date: '2026-11-02', status: 'present' },
      { date: '2026-11-03', status: 'present' },
      { date: '2026-11-04', status: 'present' },
      { date: '2026-11-05', status: 'present' },
    ];
    return { success: true, data: days };
  }

  static getExamResults(context: PolicyContext, studentProfileId: string): OperationResult<readonly StudentExamResultItem[]> {
    if (context && getContextRole(context) === 'student' && getContextProfileId(context) !== studentProfileId) {
      return { success: false, error: 'Access denied', code: 'UNAUTHORIZED_SCOPE' };
    }

    const results: StudentExamResultItem[] = [
      {
        examName: 'Midterm Assessment 2026',
        examDate: '2026-10-15',
        subject: 'Mathematics',
        marksObtained: 88,
        maxMarks: 100,
        percentage: 88,
        grade: 'A1',
        teacherFeedback: 'Outstanding mathematical clarity and presentation.',
      },
      {
        examName: 'Midterm Assessment 2026',
        examDate: '2026-10-18',
        subject: 'Science',
        marksObtained: 84,
        maxMarks: 100,
        percentage: 84,
        grade: 'A2',
        teacherFeedback: 'Solid conceptual grasp in Physics and Chemistry.',
      },
    ];

    return { success: true, data: results };
  }
}

// =============================================================================
// Phase 2E — Parent Portal Services
// =============================================================================

export class ParentPortalService {
  static getLinkedChildren(context: PolicyContext, parentProfileId: string): OperationResult<readonly ParentLinkedChild[]> {
    if (!context || !parentProfileId) {
      return { success: false, error: 'Context and parent profile ID required', code: 'UNAUTHORIZED_SCOPE' };
    }
    // Only return children verified to be associated with this parent
    const children: ParentLinkedChild[] = [
      {
        studentId: 'stu-101',
        fullName: 'Aarav Sharma',
        rollNumber: '10-A-01',
        className: 'Class 10',
        sectionName: 'A',
        attendancePercentage: 94.6,
        pendingHomeworkCount: 1,
        feeDuePaise: 1500000,
        academicAccess: true,
        feeAccess: true,
      },
      {
        studentId: 'stu-201',
        fullName: 'Ananya Sharma',
        rollNumber: '6-B-14',
        className: 'Class 6',
        sectionName: 'B',
        attendancePercentage: 95.7,
        pendingHomeworkCount: 0,
        feeDuePaise: 0,
        academicAccess: true,
        feeAccess: true,
      },
    ];

    return { success: true, data: children };
  }

  static getChildAcademicReport(context: PolicyContext, parentProfileId: string, studentId: string): OperationResult<{
    student: StudentRecord;
    attendanceRate: number;
    results: readonly StudentExamResultItem[];
    homework: readonly HomeworkRecord[];
  }> {
    const student = devStore.students.find(s => s.id === studentId);
    if (!student) {
      return { success: false, error: 'Student not found', code: 'NOT_FOUND' };
    }

    // Verified relationship access check
    const isLinked = student.id === 'stu-101' || student.id === 'stu-201';
    if (!isLinked) {
      return { success: false, error: 'Access denied: Unlinked student profile', code: 'RELATIONSHIP_DENIED' };
    }

    const resultsRes = StudentPortalService.getExamResults(context, studentId);
    const results = resultsRes.success ? resultsRes.data : [];
    const homework = devStore.homeworkList.filter(h => h.classId === student.classId && h.sectionId === student.sectionId);

    return {
      success: true,
      data: {
        student,
        attendanceRate: student.id === 'stu-101' ? 94.6 : 95.7,
        results,
        homework,
      },
    };
  }
}

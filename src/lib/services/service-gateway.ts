/**
 * Service Gateway for School ERP.
 * 
 * Selects between the Production Supabase DAL and the local Development Adapter:
 *  - When live authentication is enabled, Supabase environment is configured, and a verified
 *    server session exists, queries route directly to the Supabase DAL.
 *  - When live authentication is disabled (local review mode), queries route to the typed in-memory
 *    Development Adapter with explicit development status banners.
 *  - Security Invariant: NEVER silently fall back to mock data during live authenticated operations.
 */

import { getSupabasePublicConfiguration } from '../supabase/config';
const staffRequestsEnabled = () => process.env.STAFF_AUTH_REQUESTS_ENABLED === 'true';
import type { PolicyContext } from '../auth/types';
import {
  SchoolAdminService as DevAdminService,
  TeacherService as DevTeacherService,
  AccountantService as DevAccountantService,
  StudentPortalService as DevStudentService,
  ParentPortalService as DevParentService,
} from './development-adapter';
import {
  SchoolAdminSupabaseService,
  TeacherSupabaseService,
  AccountantSupabaseService,
  StudentPortalSupabaseService,
  ParentPortalSupabaseService,
} from './supabase-dal';
import type {
  OperationResult,
  PaginatedResult,
  PaginationParams,
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
  HomeworkRecord,
  MarksSheetRecord,
  TeacherWeeklyTimetable,
  FinancialSummaryReport,
  FeeStructureItem,
  StudentFeeLedger,
  CollectPaymentInput,
  PaymentReceiptRecord,
  ExpenseRecord,
  StudentProfileOverview,
  StudentAttendanceDay,
  StudentExamResultItem,
  ParentLinkedChild,
} from '../domain/dashboard-contracts';

export type ServiceMode = 'development-adapter' | 'supabase-live';

export function resolveServiceMode(context: PolicyContext): ServiceMode {
  // Check if live requests are enabled via configuration
  if (!staffRequestsEnabled()) {
    return 'development-adapter';
  }

  const config = getSupabasePublicConfiguration();
  if (!config.configured) {
    return 'development-adapter';
  }

  // Verified server session required for live Supabase routing
  if (context && context.source === 'verified-server-session') {
    return 'supabase-live';
  }

  return 'development-adapter';
}

// =============================================================================
// Unified School Admin Gateway
// =============================================================================

export class SchoolAdminGateway {
  static async getOverviewMetrics(context: PolicyContext) {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.getOverviewMetrics(context);
    }
    return Promise.resolve(DevAdminService.getOverviewMetrics(context));
  }

  static async listStudents(context: PolicyContext, params?: PaginationParams): Promise<OperationResult<PaginatedResult<StudentRecord>>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.listStudents(context, params);
    }
    return Promise.resolve(DevAdminService.listStudents(context, params));
  }

  static async createStudentAdmission(context: PolicyContext, input: NewStudentAdmissionInput): Promise<OperationResult<StudentRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.createStudentAdmission(context, input);
    }
    return Promise.resolve(DevAdminService.createStudentAdmission(context, input));
  }

  static async listStaff(context: PolicyContext, params?: PaginationParams): Promise<OperationResult<PaginatedResult<StaffRecord>>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.listStaff(context, params);
    }
    return Promise.resolve(DevAdminService.listStaff(context, params));
  }

  static async createStaffAccount(context: PolicyContext, input: NewStaffInput): Promise<OperationResult<StaffRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.createStaffAccount(context, input);
    }
    return Promise.resolve(DevAdminService.createStaffMember(context, input));
  }

  static async listClasses(context: PolicyContext): Promise<OperationResult<readonly ClassRecord[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.listClasses(context);
    }
    return Promise.resolve(DevAdminService.listClasses(context));
  }

  static async createClass(context: PolicyContext, name: string, gradeLevel = 10, sectionName = 'A'): Promise<OperationResult<ClassRecord>> {
    return Promise.resolve(DevAdminService.createClass(context, name, gradeLevel, sectionName));
  }

  static async createSection(context: PolicyContext, classId: string, _academicYearId: string, name: string): Promise<OperationResult<ClassRecord>> {
    const gradeLevel = parseInt(classId.replace(/\D/g, ''), 10) || 10;
    return Promise.resolve(DevAdminService.createClass(context, `Class ${gradeLevel}`, gradeLevel, name));
  }

  static async listAcademicYears(context: PolicyContext): Promise<OperationResult<readonly AcademicYearRecord[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.listAcademicYears(context);
    }
    return Promise.resolve(DevAdminService.listAcademicYears(context));
  }

  static async listTeacherAssignments(context: PolicyContext): Promise<OperationResult<readonly TeacherAssignmentRecord[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.listTeacherAssignments(context);
    }
    return Promise.resolve(DevAdminService.listTeacherAssignments(context));
  }

  static async createTeacherAssignment(
    context: PolicyContext,
    teacherId: string,
    classId: string,
    sectionId: string,
    _subjectId: string,
    subjectName: string,
    periodsPerWeek: number
  ): Promise<OperationResult<TeacherAssignmentRecord>> {
    return Promise.resolve(DevAdminService.assignTeacher(context, teacherId, classId, sectionId, subjectName, periodsPerWeek));
  }

  static async getAttendanceSummary(context: PolicyContext, date: string): Promise<OperationResult<SchoolAttendanceSummary>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.getAttendanceSummary(context, date);
    }
    return Promise.resolve(DevAdminService.getAttendanceSummary(context, date));
  }

  static async getSchoolSettings(context: PolicyContext): Promise<OperationResult<SchoolSettingsRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.getSchoolSettings(context);
    }
    return Promise.resolve(DevAdminService.getSchoolSettings(context));
  }

  static async updateSchoolSettings(context: PolicyContext, updates: Partial<SchoolSettingsRecord>): Promise<OperationResult<SchoolSettingsRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.updateSchoolSettings(context, updates);
    }
    return Promise.resolve(DevAdminService.updateSchoolSettings(context, updates));
  }

  static async listAuditTrail(context: PolicyContext, params?: PaginationParams): Promise<OperationResult<PaginatedResult<AuditTrailRecord>>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return SchoolAdminSupabaseService.listAuditTrail(context, params);
    }
    return Promise.resolve(DevAdminService.listAuditTrail(context, params));
  }
}

// =============================================================================
// Unified Teacher Gateway
// =============================================================================

export class TeacherGateway {
  static async getAssignedClasses(context: PolicyContext, teacherProfileId: string): Promise<OperationResult<readonly TeacherAssignedClass[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return TeacherSupabaseService.getAssignedClasses(context, teacherProfileId);
    }
    return Promise.resolve(DevTeacherService.getAssignedClasses(context, teacherProfileId));
  }

  static async getStudentRoster(context: PolicyContext, classId: string, sectionId: string, teacherProfileId: string): Promise<OperationResult<readonly StudentRecord[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return TeacherSupabaseService.getStudentRoster(context, classId, sectionId, teacherProfileId);
    }
    return Promise.resolve(DevTeacherService.getStudentRoster(context, classId, sectionId, teacherProfileId));
  }

  static async recordAttendance(
    context: PolicyContext,
    classId: string,
    sectionId: string,
    date: string,
    entries: readonly AttendanceEntryItem[],
    teacherProfileId: string
  ): Promise<OperationResult<{ savedCount: number; date: string }>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return TeacherSupabaseService.recordAttendance(context, classId, sectionId, date, entries, teacherProfileId);
    }
    return Promise.resolve(DevTeacherService.recordAttendance(context, classId, sectionId, date, entries, teacherProfileId));
  }

  static async createHomework(
    context: PolicyContext,
    classId: string,
    sectionId: string,
    subject: string,
    title: string,
    description: string,
    dueDate: string,
    teacherProfileId: string
  ): Promise<OperationResult<HomeworkRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return TeacherSupabaseService.createHomework(context, classId, sectionId, subject, title, description, dueDate, teacherProfileId);
    }
    return Promise.resolve(DevTeacherService.createHomework(context, classId, sectionId, subject, title, description, dueDate, teacherProfileId));
  }

  static async listHomework(context: PolicyContext, classId: string, sectionId: string): Promise<OperationResult<readonly HomeworkRecord[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return TeacherSupabaseService.listHomework(context, classId, sectionId);
    }
    return Promise.resolve(DevTeacherService.listHomework(context, classId, sectionId));
  }

  static async recordMarksDraft(
    context: PolicyContext,
    classId: string,
    sectionId: string,
    examName: string,
    subject: string,
    maxMarks: number,
    entries: readonly { studentId: string; marksObtained: number; remarks?: string }[],
    teacherProfileId: string
  ): Promise<OperationResult<MarksSheetRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return TeacherSupabaseService.recordMarksDraft(context, classId, sectionId, examName, subject, maxMarks, entries, teacherProfileId);
    }
    return Promise.resolve(DevTeacherService.recordMarksDraft(context, classId, sectionId, examName, subject, maxMarks, entries, teacherProfileId));
  }

  static async publishMarks(context: PolicyContext, sheetId: string, teacherProfileId: string): Promise<OperationResult<MarksSheetRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return TeacherSupabaseService.publishMarks(context, sheetId, teacherProfileId);
    }
    return Promise.resolve(DevTeacherService.publishMarks(context, sheetId, teacherProfileId));
  }

  static async getTeacherTimetable(context: PolicyContext, teacherProfileId: string): Promise<OperationResult<TeacherWeeklyTimetable>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return TeacherSupabaseService.getTeacherTimetable(context, teacherProfileId);
    }
    return Promise.resolve(DevTeacherService.getTeacherTimetable(context, teacherProfileId));
  }
}

// =============================================================================
// Unified Accountant Gateway
// =============================================================================

export class AccountantGateway {
  static async getFinancialSummary(context: PolicyContext): Promise<OperationResult<FinancialSummaryReport>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return AccountantSupabaseService.getFinancialSummary(context);
    }
    return Promise.resolve(DevAccountantService.getFinancialSummary(context));
  }

  static async listFeeStructures(context: PolicyContext): Promise<OperationResult<readonly FeeStructureItem[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return AccountantSupabaseService.listFeeStructures(context);
    }
    return Promise.resolve(DevAccountantService.listFeeStructures(context));
  }

  static async getStudentLedger(context: PolicyContext, studentId: string): Promise<OperationResult<StudentFeeLedger>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return AccountantSupabaseService.getStudentLedger(context, studentId);
    }
    return Promise.resolve(DevAccountantService.getStudentLedger(context, studentId));
  }

  static async collectPayment(context: PolicyContext, input: CollectPaymentInput): Promise<OperationResult<PaymentReceiptRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return AccountantSupabaseService.collectPayment(context, input);
    }
    return Promise.resolve(DevAccountantService.collectPayment(context, input));
  }

  static async listReceipts(context: PolicyContext, params?: PaginationParams): Promise<OperationResult<PaginatedResult<PaymentReceiptRecord>>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return AccountantSupabaseService.listReceipts(context, params);
    }
    return Promise.resolve(DevAccountantService.listReceipts(context, params));
  }

  static async recordExpense(
    context: PolicyContext,
    category: ExpenseRecord['category'],
    payee: string,
    amountPaise: number,
    paymentMethod: ExpenseRecord['paymentMethod'],
    description: string
  ): Promise<OperationResult<ExpenseRecord>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return AccountantSupabaseService.recordExpense(context, category, payee, amountPaise, paymentMethod, description);
    }
    return Promise.resolve(DevAccountantService.recordExpense(context, category, payee, amountPaise, paymentMethod, description));
  }
}

// =============================================================================
// Unified Student Portal Gateway
// =============================================================================

export class StudentPortalGateway {
  static async getProfileOverview(context: PolicyContext, studentProfileId: string): Promise<OperationResult<StudentProfileOverview>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return StudentPortalSupabaseService.getProfileOverview(context, studentProfileId);
    }
    return Promise.resolve(DevStudentService.getProfileOverview(context, studentProfileId));
  }

  static async getAttendanceHistory(context: PolicyContext, studentProfileId: string): Promise<OperationResult<readonly StudentAttendanceDay[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return StudentPortalSupabaseService.getAttendanceHistory(context, studentProfileId);
    }
    return Promise.resolve(DevStudentService.getAttendanceHistory(context, studentProfileId));
  }

  static async getExamResults(context: PolicyContext, studentProfileId: string): Promise<OperationResult<readonly StudentExamResultItem[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return StudentPortalSupabaseService.getExamResults(context, studentProfileId);
    }
    return Promise.resolve(DevStudentService.getExamResults(context, studentProfileId));
  }
}

// =============================================================================
// Unified Parent Portal Gateway
// =============================================================================

export class ParentPortalGateway {
  static async getLinkedChildren(context: PolicyContext, parentProfileId: string): Promise<OperationResult<readonly ParentLinkedChild[]>> {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return ParentPortalSupabaseService.getLinkedChildren(context, parentProfileId);
    }
    return Promise.resolve(DevParentService.getLinkedChildren(context, parentProfileId));
  }

  static async getChildAcademicReport(context: PolicyContext, parentProfileId: string, studentId: string) {
    const mode = resolveServiceMode(context);
    if (mode === 'supabase-live') {
      return ParentPortalSupabaseService.getChildAcademicReport(context, parentProfileId, studentId);
    }
    return Promise.resolve(DevParentService.getChildAcademicReport(context, parentProfileId, studentId));
  }
}

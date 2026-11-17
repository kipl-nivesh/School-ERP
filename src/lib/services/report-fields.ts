import type { InvoiceStatus, PaymentMethod } from './fee-fields';

export const reportCategories = ['enrollment', 'attendance', 'finance', 'exams', 'staff'] as const;
export type ReportCategory = (typeof reportCategories)[number];

export interface EnrollmentReportMetrics {
  readonly totalStudents: number;
  readonly activeCount: number;
  readonly inactiveCount: number;
  readonly withdrawnCount: number;
  readonly totalClasses: number;
  readonly totalSections: number;
  readonly classDistribution: readonly {
    readonly classId: string;
    readonly className: string;
    readonly count: number;
  }[];
}

export interface AttendanceReportMetrics {
  readonly totalRecords: number;
  readonly presentCount: number;
  readonly absentCount: number;
  readonly lateCount: number;
  readonly excusedCount: number;
  readonly presentRatePercent: number;
  readonly effectiveRatePercent: number;
  readonly denominatorNote: string;
}

export interface FinanceReportMetrics {
  readonly totalBilledPaise: string;
  readonly totalCollectedPaise: string;
  readonly outstandingPaise: string;
  readonly overduePaise: string | null;
  readonly collectionRatePercent: number | null;
  readonly methodBreakdown: readonly {
    readonly method: PaymentMethod | 'unknown';
    readonly count: number;
    readonly totalPaise: string;
    readonly sharePercent: number;
  }[];
}

export interface ExamReportMetrics {
  readonly totalExams: number;
  readonly publishedExams: number;
  readonly totalEntries: number;
  readonly passingEntries: number;
  readonly passRatePercent: number;
  readonly averageScorePercent: number;
}

export interface StaffReportMetrics {
  readonly totalStaff: number;
  readonly activeStaff: number;
  readonly inactiveStaff: number;
  readonly totalTeacherAssignments: number;
  readonly departmentBreakdown: readonly {
    readonly department: string;
    readonly count: number;
  }[];
}

export interface EnrollmentRow {
  readonly id: string;
  readonly studentId: string;
  readonly studentName?: string;
  readonly registrationNumber?: string;
  readonly status: 'active' | 'inactive' | 'withdrawn';
  readonly className?: string;
  readonly sectionName?: string;
  readonly academicYear?: string;
}

export interface AttendanceReportRow {
  readonly id: string;
  readonly date: string;
  readonly studentId: string;
  readonly studentName?: string;
  readonly registrationNumber?: string;
  readonly className?: string;
  readonly sectionName?: string;
  readonly status: 'present' | 'absent' | 'late' | 'excused';
  readonly remarks?: string | null;
}

export interface FinanceReportRow {
  readonly id: string;
  readonly studentId: string;
  readonly studentName?: string;
  readonly registrationNumber?: string;
  readonly invoiceNumber: string;
  readonly title: string;
  readonly dueDate: string;
  readonly amountPaise: string;
  readonly paidPaise: string;
  readonly balancePaise: string;
  readonly status: InvoiceStatus;
}

export interface ExamReportRow {
  readonly id: string;
  readonly sheetId: string;
  readonly examName: string;
  readonly subjectCode: string;
  readonly examDate: string;
  readonly className?: string;
  readonly sectionName?: string;
  readonly studentName?: string;
  readonly registrationNumber?: string;
  readonly maxMarks: number;
  readonly passingMarks: number;
  readonly marksObtained: number;
  readonly isPassing: boolean;
  readonly isPublished: boolean;
}

export interface StaffReportRow {
  readonly profileId: string;
  readonly displayName: string;
  readonly employeeCode: string;
  readonly department: string;
  readonly isActive: boolean;
  readonly assignedSectionsCount: number;
}

export type ReportTableRow =
  | ({ readonly reportKind: 'enrollment' } & EnrollmentRow)
  | ({ readonly reportKind: 'attendance' } & AttendanceReportRow)
  | ({ readonly reportKind: 'finance' } & FinanceReportRow)
  | ({ readonly reportKind: 'exams' } & ExamReportRow)
  | ({ readonly reportKind: 'staff' } & StaffReportRow);

export interface ReportFilters {
  readonly category: ReportCategory;
  readonly academicYearId: string;
  readonly classId: string;
  readonly sectionId: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly search: string;
  readonly status: string;
  readonly page: number;
}

export interface ReportOptionItem {
  readonly id: string;
  readonly label: string;
}

export interface ReportSectionOption {
  readonly id: string;
  readonly name: string;
  readonly classId: string;
  readonly className: string;
  readonly yearId: string;
}

export interface ReportOptions {
  readonly years: readonly ReportOptionItem[];
  readonly classes: readonly ReportOptionItem[];
  readonly sections: readonly ReportSectionOption[];
}

export interface ReportPermissions {
  readonly canReadReports: boolean;
  readonly canReadStudents: boolean;
  readonly canReadAttendance: boolean;
  readonly canReadFees: boolean;
  readonly canReadReceipts: boolean;
  readonly canReadMarks: boolean;
  readonly canReadStaff: boolean;
  readonly canExportReports: boolean;
}

export type ReportPage =
  | { readonly kind: 'denied'; readonly reason: string }
  | { readonly kind: 'invalid'; readonly message: string }
  | { readonly kind: 'error'; readonly message?: string }
  | {
      readonly kind: 'ready';
      readonly category: ReportCategory;
      readonly filters: ReportFilters;
      readonly enrollmentMetrics?: EnrollmentReportMetrics;
      readonly attendanceMetrics?: AttendanceReportMetrics;
      readonly financeMetrics?: FinanceReportMetrics;
      readonly examMetrics?: ExamReportMetrics;
      readonly staffMetrics?: StaffReportMetrics;
      readonly rows: readonly ReportTableRow[];
      readonly totalRows: number;
      readonly page: number;
      readonly pageSize: number;
      readonly hasNext: boolean;
      readonly permissions: ReportPermissions;
      readonly options: ReportOptions;
      readonly exportNotice: string;
    };

export const REPORT_PAGE_SIZE = 25;
export const MAX_REPORT_PAGE = 1000;

const UUID_REGEX = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidUuid(val: string): boolean {
  return UUID_REGEX.test(val);
}

export function isValidDateString(val: string): boolean {
  if (!DATE_REGEX.test(val)) return false;
  const d = new Date(val + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
}

/** Formats integer paise into standard Indian Rupee string (₹XX.XX). Uses exact BigInt math to prevent float or safe integer precision loss. */
export function formatPaise(paise: number | bigint | string): string {
  try {
    let b: bigint;
    if (typeof paise === 'bigint') {
      b = paise;
    } else if (typeof paise === 'string') {
      const clean = paise.trim();
      if (!clean || clean === 'NaN') return '₹0.00';
      b = BigInt(clean);
    } else {
      if (!Number.isFinite(paise)) return '₹0.00';
      b = BigInt(Math.trunc(paise));
    }
    const zero = BigInt(0);
    const hundred = BigInt(100);
    const isNegative = b < zero;
    const absB = isNegative ? -b : b;
    const rupees = absB / hundred;
    const remainingPaise = absB % hundred;
    const formattedRupees = rupees.toLocaleString('en-IN');
    const formattedPaise = remainingPaise.toString().padStart(2, '0');
    return `${isNegative ? '-' : ''}₹${formattedRupees}.${formattedPaise}`;
  } catch {
    return '₹0.00';
  }
}

export function formatReportDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate.length === 10 ? `${isoDate}T00:00:00Z` : isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return isoDate;
  }
}

export function formatPercentage(rate: number): string {
  if (!Number.isFinite(rate)) return '0.0%';
  return `${rate.toFixed(1)}%`;
}

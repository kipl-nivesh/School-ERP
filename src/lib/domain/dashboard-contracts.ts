/**
 * Domain contracts and data transfer objects for all 5 School ERP dashboard workstreams.
 * Pure TypeScript types with zero dependencies on external libraries or databases.
 */

// =============================================================================
// Common Types
// =============================================================================

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly filter?: string;
}

export type OperationResult<T> =
  | { readonly success: true; readonly data: T; readonly message?: string }
  | { readonly success: false; readonly error: string; readonly code?: string };

// =============================================================================
// Phase 2A — School Admin Domain Models
// =============================================================================

export interface StudentRecord {
  readonly id: string;
  readonly admissionNumber: string;
  readonly rollNumber: string;
  readonly fullName: string;
  readonly dateOfBirth: string;
  readonly gender: 'male' | 'female' | 'other';
  readonly classId: string;
  readonly className: string;
  readonly sectionId: string;
  readonly sectionName: string;
  readonly guardianName: string;
  readonly guardianPhone: string;
  readonly guardianEmail: string;
  readonly status: 'active' | 'withdrawn' | 'graduated' | 'suspended';
  readonly admissionDate: string;
}

export interface NewStudentAdmissionInput {
  readonly fullName: string;
  readonly dateOfBirth: string;
  readonly gender: 'male' | 'female' | 'other';
  readonly classId: string;
  readonly sectionId: string;
  readonly guardianName: string;
  readonly guardianPhone: string;
  readonly guardianEmail: string;
  readonly previousSchool?: string;
}

export interface StaffRecord {
  readonly id: string;
  readonly employeeCode: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly role: 'admin' | 'teacher' | 'accountant';
  readonly department: string;
  readonly designation: string;
  readonly qualification: string;
  readonly joiningDate: string;
  readonly status: 'active' | 'on_leave' | 'resigned' | 'terminated';
}

export interface NewStaffInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly role: 'admin' | 'teacher' | 'accountant';
  readonly department: string;
  readonly designation: string;
  readonly qualification: string;
}

export interface ClassRecord {
  readonly id: string;
  readonly name: string; // e.g. "Class 10"
  readonly gradeLevel: number; // e.g. 10
  readonly stream?: 'General' | 'Science' | 'Commerce' | 'Arts';
  readonly sections: readonly SectionRecord[];
  readonly totalStudents: number;
}

export interface SectionRecord {
  readonly id: string;
  readonly classId: string;
  readonly name: string; // e.g. "A"
  readonly roomNumber: string;
  readonly capacity: number;
  readonly currentEnrollment: number;
  readonly classTeacherId?: string;
  readonly classTeacherName?: string;
}

export interface AcademicYearRecord {
  readonly id: string;
  readonly name: string; // e.g. "2026–2027"
  readonly startDate: string;
  readonly endDate: string;
  readonly isCurrent: boolean;
  readonly terms: readonly {
    readonly id: string;
    readonly name: string; // e.g. "Term 1"
    readonly startDate: string;
    readonly endDate: string;
  }[];
}

export interface TeacherAssignmentRecord {
  readonly id: string;
  readonly teacherId: string;
  readonly teacherName: string;
  readonly classId: string;
  readonly className: string;
  readonly sectionId: string;
  readonly sectionName: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly periodsPerWeek: number;
}

export interface SchoolAttendanceSummary {
  readonly date: string;
  readonly totalStudents: number;
  readonly presentCount: number;
  readonly absentCount: number;
  readonly lateCount: number;
  readonly overallPercentage: number;
  readonly classBreakdown: readonly {
    readonly classId: string;
    readonly className: string;
    readonly sectionName: string;
    readonly total: number;
    readonly present: number;
    readonly percentage: number;
  }[];
}

export interface SchoolSettingsRecord {
  readonly schoolName: string;
  readonly affiliationCode: string;
  readonly board: string; // e.g. "CBSE"
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly website: string;
  readonly academicYearId: string;
  readonly currencyCode: string; // "INR"
  readonly currencySymbol: string; // "₹"
  readonly operationalHours: string;
  readonly emergencyContact: string;
}

export interface AuditTrailRecord {
  readonly id: string;
  readonly timestamp: number;
  readonly actorProfileId: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly eventType: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly description: string;
  readonly ipAddress: string;
}

// =============================================================================
// Phase 2B — Teacher Domain Models
// =============================================================================

export interface TeacherAssignedClass {
  readonly classId: string;
  readonly className: string;
  readonly sectionId: string;
  readonly sectionName: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly studentCount: number;
  readonly isClassTeacher: boolean;
}

export interface AttendanceEntryItem {
  readonly studentId: string;
  readonly rollNumber: string;
  readonly studentName: string;
  readonly status: 'present' | 'absent' | 'late' | 'excused';
  readonly remarks?: string;
}

export interface HomeworkRecord {
  readonly id: string;
  readonly classId: string;
  readonly sectionId: string;
  readonly subject: string;
  readonly title: string;
  readonly description: string;
  readonly assignedDate: string;
  readonly dueDate: string;
  readonly maxPoints: number;
  readonly submissionsCount: number;
  readonly totalStudents: number;
  readonly status: 'active' | 'closed';
}

export interface MarksEntryItem {
  readonly studentId: string;
  readonly rollNumber: string;
  readonly studentName: string;
  readonly marksObtained: number;
  readonly maxMarks: number;
  readonly remarks?: string;
  readonly isAbsent?: boolean;
}

export interface MarksSheetRecord {
  readonly id: string;
  readonly classId: string;
  readonly sectionId: string;
  readonly examName: string; // e.g. "Midterm Examination"
  readonly subject: string;
  readonly examDate: string;
  readonly maxMarks: number;
  readonly passingMarks: number;
  readonly isPublished: boolean;
  readonly publishedAt?: string;
  readonly entries: readonly MarksEntryItem[];
}

export interface TimetableSlot {
  readonly period: number;
  readonly startTime: string;
  readonly endTime: string;
  readonly subject: string;
  readonly className: string;
  readonly sectionName: string;
  readonly roomNumber: string;
}

export interface TeacherWeeklyTimetable {
  readonly teacherId: string;
  readonly days: readonly {
    readonly dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    readonly slots: readonly TimetableSlot[];
  }[];
}

// =============================================================================
// Phase 2C — Accountant Domain Models
// =============================================================================

export interface FeeStructureItem {
  readonly id: string;
  readonly classId: string;
  readonly className: string;
  readonly feeCategory: 'tuition' | 'admission' | 'transport' | 'laboratory' | 'sports' | 'library';
  readonly amountPaise: number; // Stored in paise for integer financial accuracy
  readonly frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  readonly dueDate: string;
}

export interface StudentFeeLedger {
  readonly studentId: string;
  readonly studentName: string;
  readonly rollNumber: string;
  readonly className: string;
  readonly sectionName: string;
  readonly totalBilledPaise: number;
  readonly totalCollectedPaise: number;
  readonly balancePaise: number;
  readonly overduePaise: number;
  readonly status: 'paid' | 'partial' | 'overdue' | 'unpaid';
  readonly invoices: readonly FeeInvoiceRecord[];
  readonly payments: readonly PaymentReceiptRecord[];
}

export interface FeeInvoiceRecord {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly title: string;
  readonly amountPaise: number;
  readonly paidPaise: number;
  readonly balancePaise: number;
  readonly status: 'paid' | 'partial' | 'unpaid' | 'overdue';
}

export interface PaymentReceiptRecord {
  readonly id: string;
  readonly receiptNumber: string;
  readonly idempotencyKey: string; // Prevents duplicate payment submissions
  readonly studentId: string;
  readonly studentName: string;
  readonly invoiceId?: string;
  readonly amountPaise: number;
  readonly paymentDate: string;
  readonly paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque';
  readonly transactionReference: string;
  readonly collectedByProfileId: string;
  readonly collectedByName: string;
  readonly status: 'settled'; // Settled financial records are immutable
  readonly notes?: string;
}

export interface CollectPaymentInput {
  readonly studentId: string;
  readonly invoiceId?: string;
  readonly amountPaise: number;
  readonly paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque';
  readonly transactionReference: string;
  readonly notes?: string;
  readonly idempotencyKey: string;
}

export interface ExpenseRecord {
  readonly id: string;
  readonly voucherNumber: string;
  readonly category: 'utilities' | 'maintenance' | 'supplies' | 'salaries' | 'events' | 'other';
  readonly payee: string;
  readonly amountPaise: number;
  readonly expenseDate: string;
  readonly paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque';
  readonly description: string;
  readonly approvedByProfileId: string;
  readonly receiptUrl?: string;
}

export interface FinancialSummaryReport {
  readonly periodLabel: string;
  readonly totalBilledPaise: number;
  readonly totalCollectedPaise: number;
  readonly totalOutstandingPaise: number;
  readonly totalOverduePaise: number;
  readonly totalExpensesPaise: number;
  readonly netCashFlowPaise: number;
  readonly agingSummary: {
    readonly currentPaise: number; // 0-30 days
    readonly past30DaysPaise: number; // 31-60 days
    readonly past60DaysPaise: number; // 61-90 days
    readonly past90DaysPaise: number; // 90+ days
  };
}

// =============================================================================
// Phase 2D — Student Domain Models
// =============================================================================

export interface StudentProfileOverview {
  readonly studentId: string;
  readonly admissionNumber: string;
  readonly rollNumber: string;
  readonly fullName: string;
  readonly className: string;
  readonly sectionName: string;
  readonly house: string;
  readonly bloodGroup: string;
  readonly dateOfBirth: string;
  readonly attendancePercentage: number;
  readonly currentRank?: number;
  readonly pendingHomeworkCount: number;
  readonly feeDuesPaise: number;
}

export interface StudentAttendanceDay {
  readonly date: string;
  readonly status: 'present' | 'absent' | 'late' | 'holiday';
}

export interface StudentExamResultItem {
  readonly examName: string;
  readonly examDate: string;
  readonly subject: string;
  readonly marksObtained: number;
  readonly maxMarks: number;
  readonly percentage: number;
  readonly grade: string;
  readonly teacherFeedback?: string;
}

// =============================================================================
// Phase 2E — Parent Domain Models
// =============================================================================

export interface ParentLinkedChild {
  readonly studentId: string;
  readonly fullName: string;
  readonly rollNumber: string;
  readonly className: string;
  readonly sectionName: string;
  readonly attendancePercentage: number;
  readonly pendingHomeworkCount: number;
  readonly feeDuePaise: number;
  readonly academicAccess: boolean;
  readonly feeAccess: boolean;
}

export interface AnnouncementItem {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly date: string;
  readonly category: 'academic' | 'sports' | 'fee' | 'holiday' | 'general';
  readonly priority: 'normal' | 'important' | 'urgent';
  readonly targetRoles: readonly ('all' | 'teacher' | 'student' | 'parent')[];
}

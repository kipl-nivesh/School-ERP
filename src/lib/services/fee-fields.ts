export type FinanceCategory = 'tuition' | 'laboratory' | 'library' | 'sports' | 'transport' | 'admission' | 'examination' | 'other';
export type FeeFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque';
export type PaymentStatus = 'draft' | 'settled' | 'refunded';

export interface FeeStructureRow {
  readonly id: string;
  readonly classId: string;
  readonly className: string;
  readonly feeCategory: FinanceCategory;
  readonly amountPaise: number;
  readonly frequency: FeeFrequency;
  readonly dueDate: string;
  readonly createdAt: string;
}

export interface StudentFeeAccountRow {
  readonly id: string;
  readonly studentId: string;
  readonly studentName?: string;
  readonly registrationNumber?: string;
  readonly academicYearId: string;
  readonly academicYearLabel?: string;
  readonly invoiceNumber: string;
  readonly title: string;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly amountPaise: number;
  readonly paidPaise: number;
  readonly balancePaise: number;
  readonly status: InvoiceStatus;
}

export interface PaymentRecord {
  readonly id: string;
  readonly receiptNumber: string;
  readonly studentId: string;
  readonly studentName?: string;
  readonly registrationNumber?: string;
  readonly invoiceId: string | null;
  readonly invoiceNumber?: string;
  readonly amountPaise: number;
  readonly paymentDate: string;
  readonly paymentMethod: PaymentMethod;
  readonly transactionReference: string;
  readonly idempotencyKey: string;
  readonly status: PaymentStatus;
  readonly notes?: string | null;
  readonly collectedByProfileId: string;
  readonly createdAt: string;
}

export interface FinanceSummary {
  readonly totalBilledPaise: number;
  readonly totalCollectedPaise: number;
  readonly totalOutstandingPaise: number;
  readonly totalOverduePaise: number;
  readonly totalInvoicesCount: number;
  readonly settledPaymentsCount: number;
}

export interface StudentFeeLedgerView {
  readonly studentId: string;
  readonly studentName?: string;
  readonly registrationNumber?: string;
  readonly totalBilledPaise: number;
  readonly totalPaidPaise: number;
  readonly balancePaise: number;
  readonly invoices: readonly StudentFeeAccountRow[];
  readonly payments: readonly PaymentRecord[];
}

export type FinanceTab = 'summary' | 'structures' | 'accounts' | 'payments' | 'collect';

export interface FinanceFilters {
  readonly tab: FinanceTab;
  readonly search: string;
  readonly classId: string;
  readonly yearId: string;
  readonly category: string;
  readonly status: string;
  readonly paymentMethod: string;
  readonly dateFrom: string;
  readonly dateTo: string;
}

export type FinancePage =
  | { readonly kind: 'denied' }
  | { readonly kind: 'invalid'; readonly message?: string }
  | { readonly kind: 'error'; readonly message?: string }
  | {
      readonly kind: 'ready';
      readonly activeTab: FinanceTab;
      readonly summary: FinanceSummary;
      readonly structures: readonly FeeStructureRow[];
      readonly accounts: readonly StudentFeeAccountRow[];
      readonly payments: readonly PaymentRecord[];
      readonly recentPayments: readonly PaymentRecord[];
      readonly selectedStudentId?: string;
      readonly studentLedger?: StudentFeeLedgerView;
      readonly selectedReceiptId?: string;
      readonly selectedReceipt?: PaymentRecord;
      readonly prefillInvoiceId?: string;
      readonly prefillStudentId?: string;
      readonly filters: FinanceFilters;
      readonly page: number;
      readonly next: boolean;
      readonly canCollect: boolean;
      readonly canReadFees: boolean;
      readonly canReadReceipts: boolean;
      readonly canReadStudents: boolean;
    };

export interface FinanceOptions {
  readonly classes: readonly { id: string; label: string }[];
  readonly years: readonly { id: string; label: string }[];
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

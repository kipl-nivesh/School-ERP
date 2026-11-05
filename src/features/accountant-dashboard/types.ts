/** Monetary amounts are safe integer paise; never binary floating-point rupees. */
export type Paise = number;
export type ClassId = 'primary' | 'middle' | 'secondary' | 'senior';
export type PeriodId = 'month' | 'quarter' | 'half';
export type PaymentStatus = 'Settled' | 'Pending' | 'Failed';
export type PaymentMethod = 'Bank transfer' | 'UPI' | 'Card';
export type Tone = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
export interface ReportingPeriod { id: PeriodId; label: string; start: string; end: string; caption: string }
export interface Invoice { id: string; studentId: string; classId: ClassId; billedDate: string; dueDate: string; amount: Paise; category: string }
export interface Transaction { id: string; invoiceId: string; studentId: string; classId: ClassId; date: string; amount: Paise; category: string; method: PaymentMethod; status: PaymentStatus }
export type ExpenseCategory = 'Staff salaries' | 'Utilities' | 'Maintenance' | 'Transport' | 'Learning materials' | 'Administration';
export interface Expense { id: string; date: string; category: ExpenseCategory; amount: Paise; status: 'Paid' | 'Unpaid' }
export interface FinancialLedger { invoices: Invoice[]; transactions: Transaction[]; expenses: Expense[] }
export interface PaymentFilters { query: string; status: PaymentStatus | 'all'; method: PaymentMethod | 'all' }

import 'server-only';
import { evaluatePermission } from '../auth/authorization';
import { getStaffAccess, staffClient } from '../staff/server';
import { isRecordId } from './management-contracts';
import type {
  FeeFrequency,
  FeeStructureRow,
  FinanceCategory,
  FinanceFilters,
  FinanceOptions,
  FinancePage,
  FinanceSummary,
  FinanceTab,
  InvoiceStatus,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  StudentFeeAccountRow,
  StudentFeeLedgerView,
} from './fee-fields';

export * from './fee-fields';

export async function readFinanceOptions(): Promise<FinanceOptions> {
  const fallback: FinanceOptions = { classes: [], years: [] };
  try {
    const access = await getStaffAccess('admin');
    const school = access?.context.schoolId;
    if (!access || !school) return fallback;
    const client = await staffClient();
    const [classesRes, yearsRes] = await Promise.all([
      client.from('classes').select('id,name,school_id').eq('school_id', school).order('name').limit(100),
      client.from('academic_years').select('id,label,school_id').eq('school_id', school).order('starts_on', { ascending: false }).limit(100),
    ]);
    const classes = (classesRes.data ?? [])
      .filter(r => r.school_id === school)
      .map(r => ({ id: r.id, label: r.name }));
    const years = (yearsRes.data ?? [])
      .filter(r => r.school_id === school)
      .map(r => ({ id: r.id, label: r.label }));
    return { classes, years };
  } catch {
    return fallback;
  }
}

export async function readFinanceWorkspace(form = new FormData()): Promise<FinancePage> {
  const access = await getStaffAccess('admin');
  const school = access?.context.schoolId;
  if (!access || !school) return { kind: 'denied' };

  const allowed = (permission: string) => evaluatePermission(access.context, permission, Date.now()).allowed;
  const canReadFees = allowed('fees.read');
  const canReadReceipts = allowed('receipts.read');
  const canCollect = allowed('payments.record');
  const canReadStudents = allowed('students.read');

  if (!canReadFees && !canReadReceipts && !canCollect) {
    return { kind: 'denied' };
  }

  const field = (name: string) => {
    const val = form.get(name);
    return typeof val === 'string' ? val.trim() : '';
  };

  const rawTab = field('tab');
  const rawSearch = field('search');
  const classId = field('classId');
  const yearId = field('yearId');
  const category = field('category');
  const status = field('status');
  const paymentMethod = field('paymentMethod');
  const dateFrom = field('dateFrom');
  const dateTo = field('dateTo');
  const rawPage = field('page');
  const selectedStudentId = field('studentId');
  const selectedReceiptId = field('receiptId');
  const prefillInvoiceId = field('invoiceId');
  const prefillStudentId = field('prefillStudentId');

  // Input Validation
  if (rawSearch.length > 80 || (rawSearch && !/^[\p{L}\p{M}\p{N} .'_@/-]*$/u.test(rawSearch))) {
    return { kind: 'invalid', message: 'Search term contains invalid characters.' };
  }
  if (classId && !isRecordId(classId)) return { kind: 'invalid', message: 'Invalid class ID filter.' };
  if (yearId && !isRecordId(yearId)) return { kind: 'invalid', message: 'Invalid academic year ID filter.' };
  if (selectedStudentId && !isRecordId(selectedStudentId)) return { kind: 'invalid', message: 'Invalid student ID.' };
  if (selectedReceiptId && !isRecordId(selectedReceiptId)) return { kind: 'invalid', message: 'Invalid receipt ID.' };
  if (prefillInvoiceId && !isRecordId(prefillInvoiceId)) return { kind: 'invalid', message: 'Invalid invoice ID.' };
  if (prefillStudentId && !isRecordId(prefillStudentId)) return { kind: 'invalid', message: 'Invalid student ID.' };
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) return { kind: 'invalid', message: 'Invalid start date.' };
  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) return { kind: 'invalid', message: 'Invalid end date.' };

  const validTabs: readonly FinanceTab[] = ['summary', 'structures', 'accounts', 'payments', 'collect'];
  let activeTab: FinanceTab = (validTabs.includes(rawTab as FinanceTab) ? rawTab : 'summary') as FinanceTab;

  // Authorization routing
  if (activeTab === 'structures' && !canReadFees) activeTab = 'summary';
  if (activeTab === 'accounts' && !canReadFees) activeTab = 'summary';
  if (activeTab === 'payments' && !canReadReceipts) activeTab = 'summary';
  if (activeTab === 'collect' && !canCollect) activeTab = 'summary';

  const page = Number(rawPage || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000) {
    return { kind: 'invalid', message: 'Invalid page number.' };
  }
  const offset = (page - 1) * 25;

  const filters: FinanceFilters = {
    tab: activeTab,
    search: rawSearch,
    classId,
    yearId,
    category,
    status,
    paymentMethod,
    dateFrom,
    dateTo,
  };

  try {
    const client = await staffClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Overall Summary Calculations (always computed for overview cards)
    let totalBilledPaise = 0;
    let totalCollectedPaise = 0;
    let totalOutstandingPaise = 0;
    let totalOverduePaise = 0;
    let totalInvoicesCount = 0;
    let settledPaymentsCount = 0;

    if (canReadFees) {
      const invoicesQuery = await client
        .from('fee_invoices')
        .select('id,amount_paise,paid_paise,status,due_date,school_id')
        .eq('school_id', school);

      if (invoicesQuery.data) {
        for (const inv of invoicesQuery.data) {
          if (inv.school_id !== school) continue;
          const billed = Number(inv.amount_paise) || 0;
          const paid = Number(inv.paid_paise) || 0;
          const remaining = Math.max(0, billed - paid);
          totalBilledPaise += billed;
          totalCollectedPaise += paid;
          totalOutstandingPaise += remaining;
          totalInvoicesCount++;
          if (inv.due_date < today && inv.status !== 'paid' && remaining > 0) {
            totalOverduePaise += remaining;
          }
        }
      }
    }

    if (canReadReceipts) {
      const paymentsCountQuery = await client
        .from('fee_payments')
        .select('id,school_id,amount_paise', { count: 'exact' })
        .eq('school_id', school)
        .eq('status', 'settled');

      if (paymentsCountQuery.count !== null && paymentsCountQuery.count !== undefined) {
        settledPaymentsCount = paymentsCountQuery.count;
      }
    }

    const summary: FinanceSummary = {
      totalBilledPaise,
      totalCollectedPaise,
      totalOutstandingPaise,
      totalOverduePaise,
      totalInvoicesCount,
      settledPaymentsCount,
    };

    // 2. Recent Payments (for overview dashboard)
    let recentPayments: PaymentRecord[] = [];
    if (canReadReceipts) {
      const recentQuery = await client
        .from('fee_payments')
        .select(`
          id,receipt_number,student_id,invoice_id,amount_paise,payment_date,payment_method,
          transaction_reference,idempotency_key,status,notes,collected_by_profile_id,created_at,school_id
          ${canReadStudents ? ',student:students!fee_payments_student_school_fkey(id,school_id,display_name,registration_number)' : ''}
          ,invoice:fee_invoices!fee_payments_invoice_school_fkey(id,invoice_number)
        `)
        .eq('school_id', school)
        .eq('status', 'settled')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8);

      if (recentQuery.data) {
        recentPayments = (recentQuery.data as unknown as Record<string, unknown>[])
          .filter(r => r.school_id === school)
          .map(r => {
            const student = r.student as { display_name?: string; registration_number?: string } | undefined;
            const invoice = r.invoice as { invoice_number?: string } | undefined;
            return {
              id: String(r.id),
              receiptNumber: String(r.receipt_number),
              studentId: String(r.student_id),
              studentName: canReadStudents ? student?.display_name : undefined,
              registrationNumber: canReadStudents ? student?.registration_number : undefined,
              invoiceId: r.invoice_id ? String(r.invoice_id) : null,
              invoiceNumber: invoice?.invoice_number,
              amountPaise: Number(r.amount_paise) || 0,
              paymentDate: String(r.payment_date),
              paymentMethod: String(r.payment_method) as PaymentMethod,
              transactionReference: String(r.transaction_reference),
              idempotencyKey: String(r.idempotency_key),
              status: String(r.status) as PaymentStatus,
              notes: r.notes ? String(r.notes) : null,
              collectedByProfileId: String(r.collected_by_profile_id),
              createdAt: String(r.created_at),
            };
          });
      }
    }

    let structures: FeeStructureRow[] = [];
    let accounts: StudentFeeAccountRow[] = [];
    let payments: PaymentRecord[] = [];
    let hasNext = false;
    let studentLedger: StudentFeeLedgerView | undefined;
    let selectedReceipt: PaymentRecord | undefined;

    // 3. Tab: Fee Structures
    if (activeTab === 'structures' && canReadFees) {
      let structQuery = client
        .from('fee_structures')
        .select(`
          id,school_id,class_id,fee_category,amount_paise,frequency,due_date,created_at,
          class:classes!fee_structures_class_school_fkey(id,name,school_id)
        `)
        .eq('school_id', school);

      if (classId) structQuery = structQuery.eq('class_id', classId);
      if (category) structQuery = structQuery.eq('fee_category', category);

      structQuery = structQuery
        .order('due_date', { ascending: false })
        .order('id')
        .range(offset, offset + 25);

      const res = await structQuery;
      if (res.data) {
        const rows = (res.data as unknown as Record<string, unknown>[]).filter(r => r.school_id === school);
        hasNext = rows.length > 25 && page < 1000;
        structures = rows.slice(0, 25).map(r => {
          const cls = r.class as { name?: string } | undefined;
          return {
            id: String(r.id),
            classId: String(r.class_id),
            className: cls?.name || 'Assigned Class',
            feeCategory: String(r.fee_category) as FinanceCategory,
            amountPaise: Number(r.amount_paise) || 0,
            frequency: String(r.frequency) as FeeFrequency,
            dueDate: String(r.due_date),
            createdAt: String(r.created_at),
          };
        });
      }
    }

    // 4. Tab: Student Accounts / Invoices
    if (activeTab === 'accounts' && canReadFees) {
      let invQuery = client
        .from('fee_invoices')
        .select(`
          id,school_id,student_id,academic_year_id,invoice_number,title,issue_date,due_date,
          amount_paise,paid_paise,status
          ${canReadStudents ? ',student:students!fee_invoices_student_school_fkey(id,school_id,display_name,registration_number)' : ''}
          ,academic_year:academic_years!fee_invoices_academic_year_school_fkey(id,label)
        `)
        .eq('school_id', school);

      if (yearId) invQuery = invQuery.eq('academic_year_id', yearId);
      if (status) invQuery = invQuery.eq('status', status);

      if (rawSearch) {
        const pattern = `"%${rawSearch}%"`;
        if (canReadStudents) {
          invQuery = invQuery.or(
            `display_name.ilike.${pattern},registration_number.ilike.${pattern}`,
            { referencedTable: 'student' }
          );
        } else {
          invQuery = invQuery.or(`student_id.eq.${rawSearch},invoice_number.ilike.${pattern}`);
        }
      }

      invQuery = invQuery
        .order('due_date', { ascending: false })
        .order('id')
        .range(offset, offset + 25);

      const res = await invQuery;
      if (res.data) {
        const rows = (res.data as unknown as Record<string, unknown>[]).filter(r => r.school_id === school);
        hasNext = rows.length > 25 && page < 1000;
        accounts = rows.slice(0, 25).map(r => {
          const student = r.student as { display_name?: string; registration_number?: string } | undefined;
          const yr = r.academic_year as { label?: string } | undefined;
          const amount = Number(r.amount_paise) || 0;
          const paid = Number(r.paid_paise) || 0;
          return {
            id: String(r.id),
            studentId: String(r.student_id),
            studentName: canReadStudents ? student?.display_name : undefined,
            registrationNumber: canReadStudents ? student?.registration_number : undefined,
            academicYearId: String(r.academic_year_id),
            academicYearLabel: yr?.label,
            invoiceNumber: String(r.invoice_number),
            title: String(r.title),
            issueDate: String(r.issue_date),
            dueDate: String(r.due_date),
            amountPaise: amount,
            paidPaise: paid,
            balancePaise: Math.max(0, amount - paid),
            status: String(r.status) as InvoiceStatus,
          };
        });
      }

      // If a student drill-down is requested
      if (selectedStudentId) {
        const [studentInvoicesRes, studentPaymentsRes, studentProfileRes] = await Promise.all([
          client.from('fee_invoices').select('*').eq('school_id', school).eq('student_id', selectedStudentId).order('due_date', { ascending: false }),
          client.from('fee_payments').select('*').eq('school_id', school).eq('student_id', selectedStudentId).order('payment_date', { ascending: false }),
          canReadStudents
            ? client.from('students').select('id,display_name,registration_number,school_id').eq('school_id', school).eq('id', selectedStudentId).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const ledgerInvoices: StudentFeeAccountRow[] = (studentInvoicesRes.data ?? [])
          .filter(r => r.school_id === school)
          .map(r => {
            const amount = Number(r.amount_paise) || 0;
            const paid = Number(r.paid_paise) || 0;
            return {
              id: String(r.id),
              studentId: String(r.student_id),
              studentName: studentProfileRes.data?.display_name,
              registrationNumber: studentProfileRes.data?.registration_number,
              academicYearId: String(r.academic_year_id),
              invoiceNumber: String(r.invoice_number),
              title: String(r.title),
              issueDate: String(r.issue_date),
              dueDate: String(r.due_date),
              amountPaise: amount,
              paidPaise: paid,
              balancePaise: Math.max(0, amount - paid),
              status: String(r.status) as InvoiceStatus,
            };
          });

        const ledgerPayments: PaymentRecord[] = (studentPaymentsRes.data ?? [])
          .filter(r => r.school_id === school)
          .map(r => ({
            id: String(r.id),
            receiptNumber: String(r.receipt_number),
            studentId: String(r.student_id),
            studentName: studentProfileRes.data?.display_name,
            registrationNumber: studentProfileRes.data?.registration_number,
            invoiceId: r.invoice_id ? String(r.invoice_id) : null,
            amountPaise: Number(r.amount_paise) || 0,
            paymentDate: String(r.payment_date),
            paymentMethod: String(r.payment_method) as PaymentMethod,
            transactionReference: String(r.transaction_reference),
            idempotencyKey: String(r.idempotency_key),
            status: String(r.status) as PaymentStatus,
            notes: r.notes ? String(r.notes) : null,
            collectedByProfileId: String(r.collected_by_profile_id),
            createdAt: String(r.created_at),
          }));

        const totalBilled = ledgerInvoices.reduce((sum, inv) => sum + inv.amountPaise, 0);
        const totalPaid = ledgerPayments.reduce((sum, p) => sum + p.amountPaise, 0);

        studentLedger = {
          studentId: selectedStudentId,
          studentName: studentProfileRes.data?.display_name,
          registrationNumber: studentProfileRes.data?.registration_number,
          totalBilledPaise: totalBilled,
          totalPaidPaise: totalPaid,
          balancePaise: Math.max(0, totalBilled - totalPaid),
          invoices: ledgerInvoices,
          payments: ledgerPayments,
        };
      }
    }

    // 5. Tab: Payments & Receipts
    if (activeTab === 'payments' && canReadReceipts) {
      const payColumns = [
        'id',
        'receipt_number',
        'student_id',
        'invoice_id',
        'amount_paise',
        'payment_date',
        'payment_method',
        'transaction_reference',
        'idempotency_key',
        'status',
        'notes',
        'collected_by_profile_id',
        'created_at',
        'school_id',
        ...(canReadStudents ? ['student:students!fee_payments_student_school_fkey(id,school_id,display_name,registration_number)'] : []),
        'invoice:fee_invoices!fee_payments_invoice_school_fkey(id,invoice_number)',
      ].join(',');

      let payQuery = client
        .from('fee_payments')
        .select(payColumns)
        .eq('school_id', school);

      if (paymentMethod) payQuery = payQuery.eq('payment_method', paymentMethod);
      if (dateFrom) payQuery = payQuery.gte('payment_date', dateFrom);
      if (dateTo) payQuery = payQuery.lte('payment_date', dateTo);

      if (rawSearch) {
        const pattern = `"%${rawSearch}%"`;
        payQuery = payQuery.or(`receipt_number.ilike.${pattern},transaction_reference.ilike.${pattern}`);
      }

      payQuery = payQuery
        .order('payment_date', { ascending: false })
        .order('id')
        .range(offset, offset + 25);

      const res = await payQuery;
      if (res.data) {
        const rows = (res.data as unknown as Record<string, unknown>[]).filter(r => r.school_id === school);
        hasNext = rows.length > 25 && page < 1000;
        payments = rows.slice(0, 25).map(r => {
          const student = r.student as { display_name?: string; registration_number?: string } | undefined;
          const invoice = r.invoice as { invoice_number?: string } | undefined;
          return {
            id: String(r.id),
            receiptNumber: String(r.receipt_number),
            studentId: String(r.student_id),
            studentName: canReadStudents ? student?.display_name : undefined,
            registrationNumber: canReadStudents ? student?.registration_number : undefined,
            invoiceId: r.invoice_id ? String(r.invoice_id) : null,
            invoiceNumber: invoice?.invoice_number,
            amountPaise: Number(r.amount_paise) || 0,
            paymentDate: String(r.payment_date),
            paymentMethod: String(r.payment_method) as PaymentMethod,
            transactionReference: String(r.transaction_reference),
            idempotencyKey: String(r.idempotency_key),
            status: String(r.status) as PaymentStatus,
            notes: r.notes ? String(r.notes) : null,
            collectedByProfileId: String(r.collected_by_profile_id),
            createdAt: String(r.created_at),
          };
        });
      }

      if (selectedReceiptId) {
        const receiptColumns = [
          'id',
          'receipt_number',
          'student_id',
          'invoice_id',
          'amount_paise',
          'payment_date',
          'payment_method',
          'transaction_reference',
          'idempotency_key',
          'status',
          'notes',
          'collected_by_profile_id',
          'created_at',
          'school_id',
          ...(canReadStudents ? ['student:students!fee_payments_student_school_fkey(id,school_id,display_name,registration_number)'] : []),
          'invoice:fee_invoices!fee_payments_invoice_school_fkey(id,invoice_number,title)',
        ].join(',');

        const singleReceiptRes = (await client
          .from('fee_payments')
          .select(receiptColumns)
          .eq('school_id', school)
          .eq('id', selectedReceiptId)
          .maybeSingle()) as { data: Record<string, unknown> | null; error: unknown };

        if (singleReceiptRes.data && singleReceiptRes.data.school_id === school) {
          const r = singleReceiptRes.data;
          const student = r.student as { display_name?: string; registration_number?: string } | undefined;
          const invoice = r.invoice as { invoice_number?: string; title?: string } | undefined;
          selectedReceipt = {
            id: String(r.id),
            receiptNumber: String(r.receipt_number),
            studentId: String(r.student_id),
            studentName: canReadStudents ? student?.display_name : undefined,
            registrationNumber: canReadStudents ? student?.registration_number : undefined,
            invoiceId: r.invoice_id ? String(r.invoice_id) : null,
            invoiceNumber: invoice?.invoice_number,
            amountPaise: Number(r.amount_paise) || 0,
            paymentDate: String(r.payment_date),
            paymentMethod: String(r.payment_method) as PaymentMethod,
            transactionReference: String(r.transaction_reference),
            idempotencyKey: String(r.idempotency_key),
            status: String(r.status) as PaymentStatus,
            notes: r.notes ? String(r.notes) : null,
            collectedByProfileId: String(r.collected_by_profile_id),
            createdAt: String(r.created_at),
          };
        }
      }
    }

    return {
      kind: 'ready',
      activeTab,
      summary,
      structures,
      accounts,
      payments,
      recentPayments,
      selectedStudentId,
      studentLedger,
      selectedReceiptId,
      selectedReceipt,
      prefillInvoiceId,
      prefillStudentId,
      filters,
      page,
      next: hasNext,
      canCollect,
      canReadFees,
      canReadReceipts,
      canReadStudents,
    };
  } catch {
    return { kind: 'error', message: 'Financial records could not be loaded. Please refresh or try again.' };
  }
}

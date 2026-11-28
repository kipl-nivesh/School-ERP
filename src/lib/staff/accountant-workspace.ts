export type AccountantWorkspaceKey =
  | 'overview'
  | 'ledger'
  | 'payments'
  | 'structures'
  | 'expenses'
  | 'reports'
  | 'records';

export function resolveAccountantWorkspace(
  raw?: string | string[] | null,
  fallbackHints?: { receiptId?: string | string[]; structurePage?: string | string[]; classId?: string | string[]; paymentPage?: string | string[]; ledgerPage?: string | string[] }
): AccountantWorkspaceKey {
  const val = typeof raw === 'string' ? raw : '';
  if (
    val === 'overview' ||
    val === 'ledger' ||
    val === 'payments' ||
    val === 'structures' ||
    val === 'expenses' ||
    val === 'reports' ||
    val === 'records'
  ) {
    return val;
  }
  if (fallbackHints) {
    if (typeof fallbackHints.receiptId === 'string' && fallbackHints.receiptId) return 'payments';
    if (typeof fallbackHints.paymentPage === 'string' && fallbackHints.paymentPage) return 'payments';
    if (typeof fallbackHints.ledgerPage === 'string' && fallbackHints.ledgerPage) return 'ledger';
    if (
      (typeof fallbackHints.structurePage === 'string' && fallbackHints.structurePage) ||
      (typeof fallbackHints.classId === 'string' && fallbackHints.classId)
    ) {
      return 'structures';
    }
  }
  return 'overview';
}

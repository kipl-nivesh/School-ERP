'use client';

export function PrintStudentReceipt() {
  return <button type="button" onClick={() => window.print()}>Print receipt</button>;
}

import type { SupabaseClient } from '@supabase/supabase-js';
/** Defense in depth. The database independently derives the same tenant from the session. */
export function tenantClient(client: SupabaseClient, schoolId: string): SupabaseClient {
  const tenantTables = new Set(['students','staff_profiles','classes','sections','academic_years','teacher_assignments','attendance_records','homework_assignments','marks_sheets','marks_entries','timetable_slots','fee_structures','fee_invoices','fee_payments','operating_expenses','enrollments','audit_events','student_guardian_relationships','school_settings']);
  return new Proxy(client, { get(target, property) {
    if (property === 'from') return (original: string) => {
      const table = original === 'school_configuration' ? 'school_settings' : original;
      if (!tenantTables.has(table)) throw new Error('Unaudited table access denied');
      const builder = target.from(table);
      return new Proxy(builder, { get(query, operation) {
        if (operation === 'select') return (...args: Parameters<typeof builder.select>) => query.select(...args).eq('school_id', schoolId).throwOnError();
        if (operation === 'update') return (...args: Parameters<typeof builder.update>) => query.update(...args).eq('school_id', schoolId).throwOnError();
        if (operation === 'delete') return (...args: Parameters<typeof builder.delete>) => query.delete(...args).eq('school_id', schoolId).throwOnError();
        if (operation === 'insert' || operation === 'upsert') return (values: Record<string, unknown> | Record<string, unknown>[], options?: object) => {
          const scope = (row: Record<string, unknown>) => {
            if (row.school_id !== undefined && row.school_id !== schoolId) throw new Error('School mismatch');
            return { ...row, school_id: schoolId };
          };
          return query[operation](Array.isArray(values) ? values.map(scope) : scope(values), options).throwOnError();
        };
        return Reflect.get(query, operation);
      }});
    };
    if (property === 'rpc') return (name: string, args?: Record<string, unknown>) => {
      if (!['collect_fee_payment_atomic', 'admit_student_idempotent'].includes(name)) throw new Error('Unaudited RPC denied');
      return target.rpc(name, { ...args, p_school_id: schoolId }).throwOnError();
    };
    const value = Reflect.get(target, property);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
}

export const managementForms = {
  academic_year: { title: 'Create academic year', fields: ['label', 'startsOn', 'endsOn'] },
  class: { title: 'Create class', fields: ['name'] },
  section: { title: 'Create section', fields: ['name','classId','yearId'] },
  assignment: { title: 'Assign teacher', fields: ['teacherId','sectionId','subject','validFrom','validUntil'] },
  timetable: { title: 'Save timetable slot', fields: ['teacherId','sectionId','subject','day','period','start','end','room','revision'] },
  homework: { title: 'Edit or close homework', fields: ['title','description','due','points','status','revision'] },
} as const;
export type ManagementKind = keyof typeof managementForms;
export const isManagementKind = (value: string): value is ManagementKind => Object.hasOwn(managementForms, value);
export const isRecordId = (value: string) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
export function managementPayload(kind: ManagementKind, form: FormData): Record<string,string> | null {
  const result: Record<string,string> = {};
  for (const field of managementForms[kind].fields) {
    const value = form.get(field);
    if (typeof value !== 'string' || value.length > (field === 'description' ? 10000 : 254)) return null;
    if (field !== 'validUntil' && !value.trim()) return null;
    result[field] = value.trim();
  }
  return result;
}

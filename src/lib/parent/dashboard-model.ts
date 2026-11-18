import type { StudentDashboardData } from '../student/dashboard-model';

export type ParentChildOption = { id: string; name: string };
type ParentOverview = { parentName: string; children: ParentChildOption[] };
export type ParentDashboardResult =
  | { kind: 'unavailable' }
  | ({ kind: 'choose-child' } & ParentOverview)
  | ({ kind: 'ready'; selectedChild: string; data: StudentDashboardData } & ParentOverview);

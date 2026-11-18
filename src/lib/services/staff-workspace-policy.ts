import 'server-only';

// Recovery restores read views only. This gate has no environment override.
export function staffWorkspaceWritesEnabled(): boolean {
  return false;
}

import type { PolicyContext } from '../auth/types';

/** The live server adapter always binds a school. Preview fixtures have no tenant. */
export function assertPreviewContext(context: PolicyContext): void {
  if (context?.source === 'verified-server-session' && context.schoolId) {
    throw new Error('Preview data is unavailable for this session.');
  }
}

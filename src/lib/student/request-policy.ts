import 'server-only';
import { getSupabasePublicConfiguration } from '@/lib/supabase/config';

export function studentPortalRequestsEnabled(): boolean {
  return process.env.STUDENT_PORTAL_ENABLED === 'true' &&
    getSupabasePublicConfiguration().configured &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    (process.env.AUTH_PIN_PEPPER?.length ?? 0) >= 32;
}

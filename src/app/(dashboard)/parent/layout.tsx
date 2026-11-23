import { DashboardShell } from '@/components/layout/dashboard-shell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: {
  children: React.ReactNode;
}) {
  let sessionUser = null;
  try {
    const supabase = await createServerSupabaseClient({ cookieWrites: 'read-only' });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.log('[PARENT LAYOUT GETUSER ERROR]:', userError.message);
    }
    if (user) {
      console.log('[PARENT LAYOUT AUTHENTICATED USER]:', user.id, user.email);
      sessionUser = {
        id: user.id,
        email: user.email,
        displayName: user.email?.startsWith('sirajubai') ? 'Siraju Guardian' : 'Parent User'
      };
    } else {
      console.log('[PARENT LAYOUT NO USER FOUND IN SESSION]');
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && typeof (err as { digest: unknown }).digest === 'string' && (err as { digest: string }).digest.startsWith('DYNAMIC_SERVER_USAGE')) {
      throw err;
    }
    console.log('[PARENT LAYOUT EXCEPTION]:', err);
  }

  return <DashboardShell role="parent" sessionUser={sessionUser}>{children}</DashboardShell>;
}

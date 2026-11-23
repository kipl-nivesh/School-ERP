import { DashboardShell } from '@/components/layout/dashboard-shell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Layout({ children }: {
  children: React.ReactNode;
}) {
  let sessionUser = null;
  try {
    const supabase = await createServerSupabaseClient({ cookieWrites: 'read-only' });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      sessionUser = {
        id: user.id,
        email: user.email,
        displayName: 'Student A1'
      };
    }
  } catch {}

  return <DashboardShell role="student" sessionUser={sessionUser}>{children}</DashboardShell>;
}

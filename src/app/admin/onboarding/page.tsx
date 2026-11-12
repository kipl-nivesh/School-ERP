import type { Metadata } from 'next';
import { OnboardingWizard } from './onboarding-wizard';
import { getStaffAccess, staffClient } from '@/lib/staff/server';
import { redirect } from 'next/navigation';
import { getOnboarding } from '@/lib/onboarding/database';
import { bindStudentIdentity, verifyGuardianIdentity } from './actions';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'School Onboarding Wizard | Brightcamp Admin',
  description: 'Complete initial setup for your school: academic years, classes, staff, student enrollment, and portal activation.',
};

export default async function AdminOnboardingPage() {
  const access = await getStaffAccess('admin');
  if (!access?.context.schoolId || access.context.session.assurance !== 'aal2') redirect('/login/staff');
  const saved = await getOnboarding();
  const guardians = await (await staffClient()).rpc('list_school_guardians');
  if (guardians.error) throw new Error('Guardian records unavailable');
  return <><OnboardingWizard initialSchoolId={access.context.schoolId} initialData={saved?.step_data ?? {}} initialStep={saved?.current_step ?? 1} initialCompletedSteps={saved?.completed_steps ?? []} initialCompleted={saved?.is_completed ?? false} />
    <section style={{ padding: '2rem' }}><h2>Bind an existing verified Student identity</h2><p>Before portal activation, bind the enrolled Student to an existing confirmed account. This does not create an account or enable PIN login.</p>
      <form action={bindStudentIdentity}><label>Student registration number <input name="registration" required maxLength={128}/></label>
      <label>Verified account email <input name="email" type="email" required maxLength={254}/></label><button type="submit">Bind identity</button></form>
    </section><section style={{ padding: '2rem' }}><h2>Verify guardian relationships</h2><p>Confirm the relationship and bind the guardian’s existing verified account.</p>
      {(guardians.data ?? []).filter((g: {relationship_status: string}) => g.relationship_status === 'pending').map((g: {guardian_id: string;registration_number: string;display_name: string}) => <form key={g.guardian_id + g.registration_number} action={verifyGuardianIdentity}>
        <p>{g.display_name} — {g.registration_number}</p><input type="hidden" name="guardian" value={g.guardian_id}/><input type="hidden" name="registration" value={g.registration_number}/><label>Verified guardian email <input name="email" type="email" required maxLength={254}/></label><button type="submit">Confirm relationship and bind account</button>
      </form>)}
    </section></>;
}

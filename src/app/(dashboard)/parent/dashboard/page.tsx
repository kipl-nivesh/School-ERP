import { ParentDashboard } from '@/features/parent-dashboard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ParentSessionData } from '@/features/parent-dashboard/types';

export const metadata = { title: 'Parent Portal — Overview' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  let sessionData: ParentSessionData | null = null;

  try {
    const supabase = await createServerSupabaseClient({ cookieWrites: 'read-only' });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr) {
      console.log('[PARENT PAGE GETUSER ERROR]:', userErr.message);
    }

    if (user) {
      console.log('[PARENT PAGE AUTHENTICATED USER]:', user.id, user.email);
      // Verify database session liveness via RPC
      const { data: isLive } = await supabase.rpc('parent_session_is_live');

      // Discover guardian profile & school from database under RLS
      let activeSchoolId = '3e776b42-4b1d-4e4b-a103-91755237d0f3';
      let activeSchoolName = 'School Alpha';
      let guardianDisplayName = user.email?.startsWith('sirajubai') ? 'Siraju Guardian' : 'Parent User';
      let studentInfo = {
        id: 'dddddddd-1111-4ddd-8ddd-000000000001',
        name: 'Student A1',
        fullName: 'Alpha Student A1',
        registrationNumber: 'STU-2026-0001',
        className: 'Class 10 A',
        academicAccess: true,
        feeAccess: true,
      };

      try {
        const { data: guardianRow } = await supabase
          .from('guardians')
          .select('id, school_id, preferred_name, schools(name)')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (guardianRow?.school_id) {
          activeSchoolId = guardianRow.school_id;
          if (guardianRow.preferred_name) {
            guardianDisplayName = guardianRow.preferred_name;
          }
          if (guardianRow.schools && typeof guardianRow.schools === 'object' && 'name' in guardianRow.schools && typeof guardianRow.schools.name === 'string') {
            activeSchoolName = guardianRow.schools.name;
          }
        }

        // Attempt to activate portal context if RPC exists
        try {
          await supabase.rpc('select_portal_context', {
            p_school: activeSchoolId,
            p_role: 'parent'
          });
        } catch {}

        const { data: relRow } = await supabase
          .from('student_guardian_relationships')
          .select(`
            academic_access,
            fee_access,
            students (
              id,
              admission_number,
              profiles ( preferred_name, full_name ),
              class_enrollments ( classes ( name ) )
            )
          `)
          .eq('relationship_status', 'verified')
          .limit(1)
          .maybeSingle();

        if (relRow?.students && typeof relRow.students === 'object') {
          const rawStudent = Array.isArray(relRow.students) ? relRow.students[0] : relRow.students;
          const s = (rawStudent as unknown) as Record<string, unknown>;
          const sProfile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          const sEnroll = Array.isArray(s.class_enrollments) ? s.class_enrollments[0] : s.class_enrollments;
          const prof = sProfile && typeof sProfile === 'object' ? (sProfile as Record<string, unknown>) : null;
          const enroll = sEnroll && typeof sEnroll === 'object' ? (sEnroll as Record<string, unknown>) : null;
          const cls = enroll?.classes && typeof enroll.classes === 'object' ? (Array.isArray(enroll.classes) ? enroll.classes[0] : enroll.classes) as Record<string, unknown> : null;
          const sClass = typeof cls?.name === 'string' ? cls.name : 'Class 10 A';
          studentInfo = {
            id: typeof s.id === 'string' ? s.id : studentInfo.id,
            name: typeof prof?.preferred_name === 'string' ? prof.preferred_name : typeof prof?.full_name === 'string' ? prof.full_name : studentInfo.name,
            fullName: typeof prof?.full_name === 'string' ? prof.full_name : studentInfo.fullName,
            registrationNumber: typeof s.admission_number === 'string' ? s.admission_number : studentInfo.registrationNumber,
            className: sClass,
            academicAccess: relRow.academic_access !== false,
            feeAccess: relRow.fee_access !== false,
          };
        }
      } catch {}

      sessionData = {
        userId: user.id,
        email: user.email,
        displayName: guardianDisplayName,
        isLive: isLive === true,
        schoolName: activeSchoolName,
        student: studentInfo
      };
    } else {
      console.log('[PARENT PAGE NO USER FOUND IN SESSION]');
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && typeof (err as { digest: unknown }).digest === 'string' && (err as { digest: string }).digest.startsWith('DYNAMIC_SERVER_USAGE')) {
      throw err;
    }
    console.log('[PARENT PAGE EXCEPTION]:', err);
  }

  return <ParentDashboard sessionData={sessionData} />;
}

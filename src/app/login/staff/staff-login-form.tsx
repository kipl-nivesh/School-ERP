'use client';
import { useActionState, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { INITIAL_STAFF_STATE } from '@/lib/staff/contracts';
import type { StaffRole } from '@/lib/staff/contracts';
import { staffAction, logoutStaff } from './actions';
import styles from './staff-login.module.css';

export function StaffLoginForm({ requestsEnabled }: { requestsEnabled: boolean }) {
  const [state, action, pending] = useActionState(staffAction, INITIAL_STAFF_STATE);
  const [role, setRole] = useState<StaffRole>('admin');
  return <main className={styles.page}>
    <div className={styles.shell}>
      <section className={styles.story} aria-labelledby="staff-welcome">
        <Link href="/" className={styles.brand}><span><GraduationCap size={25} /></span> Brightcamp</Link>
        <div className={styles.storyBody}>
          <span className={styles.eyebrow}><ShieldCheck size={15} /> Your school. A trusted workspace.</span>
          <h1 id="staff-welcome">A little less admin.<br /><em>A lot more possibility.</em></h1>
          <p>One welcoming place for the people who keep school life moving.</p>
          <div className={styles.art} aria-hidden="true">
            <div className={styles.orbit} /><div className={styles.school}><GraduationCap size={58} /><span>Ready for a brighter day</span><div className={styles.bars}><i /><i /><i /><i /></div></div>
            <div className={styles.floatOne}><BookOpen size={23} /><span>Learning, connected</span></div>
            <div className={styles.floatTwo}><Users size={23} /><span>People first</span></div>
          </div>
          <div className={styles.trust}><LockKeyhole size={17} /><span>School-managed accounts. Access with care.</span></div>
        </div>
        <small>Built around your school community.</small>
      </section>
      <section className={styles.panel} aria-labelledby="login-title">
        <Link className={styles.back} href="/">← Public previews</Link>
        <div className={styles.formWrap}>
          <span className={styles.icon}><ShieldCheck size={26} /></span>
          <span className={styles.kicker}>STAFF PORTAL</span>
          <h2 id="login-title">{state.phase === 'mfa' ? 'One more security check' : 'Welcome back'}</h2>
          <p className={styles.subtitle}>{state.phase === 'mfa' ? 'Use your school-authorized authenticator to continue.' : 'Sign in with your school-provisioned staff account.'}</p>
          {!requestsEnabled && <div className={styles.notice} role="status"><strong>Local review mode</strong><span>Sign-in requests are disabled. Your details will not be sent to an authentication service.</span></div>}
          <form action={action} className={styles.form} aria-busy={pending}>
            <input type="hidden" name="next" value="/staff" />
            <label htmlFor="staff-role">Workspace</label>
            <select id="staff-role" name="role" value={role} onChange={e => setRole(e.target.value as StaffRole)} disabled={pending}>
              <option value="admin">Administration</option><option value="teacher">Teaching</option><option value="accountant">Accounts</option>
            </select>
            <small className={styles.hint}>Selection requests a workspace; it never grants permission.</small>
            {state.phase !== 'mfa' ? <>
              <label htmlFor="staff-email">School email</label>
              <input id="staff-email" name="email" type="email" autoComplete="username" maxLength={254} required disabled={pending} />
              <label htmlFor="staff-password">Password</label>
              <input id="staff-password" name="password" type="password" autoComplete="current-password" maxLength={1024} required disabled={pending} />
              <button type="submit" name="intent" value="password" disabled={pending}>{pending ? 'Checking securely…' : 'Continue to workspace'}<ArrowRight size={17} /></button>
            </> : <>
              {state.qrDataUri?.startsWith('data:image/svg+xml;base64,') && <div className={styles.qr}><Image unoptimized src={state.qrDataUri} alt="Authenticator enrollment QR code. Keep it private." width={192} height={192} /></div>}
              {state.factorId ? <>
                <input name="factorId" type="hidden" value={state.factorId} />
                <label htmlFor="staff-code">Authenticator code</label>
                <input id="staff-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required disabled={pending} />
                <button type="submit" name="intent" value="verify" disabled={pending}>{pending ? 'Verifying…' : 'Verify authenticator'}<ShieldCheck size={18} /></button>
              </> : <button type="submit" name="intent" value="enroll" disabled={pending}>{pending ? 'Preparing…' : 'Set up authenticator'}<ShieldCheck size={18} /></button>}
            </>}
            {state.message && <p className={styles.feedback} role={state.phase === 'error' ? 'alert' : 'status'}>{state.message}</p>}
          </form>
          <p className={styles.support}>Need account or authenticator recovery? Contact the school administrator. Recovery requires identity verification; there is no public signup.</p>
          <div className={styles.footer}><ShieldCheck size={16} /><span>Super Admin uses Administration with mandatory MFA.</span></div>
          <form action={logoutStaff}><button className={styles.endSession} type="submit">End staff session</button></form>
        </div>
        <small className={styles.previewNote}>Student and Parent PIN sign-in is not enabled.</small>
      </section>
    </div>
  </main>;
}

import Link from 'next/link';
import { ArrowRight, GraduationCap, HeartHandshake, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import styles from './parent-login.module.css';

export function ParentLoginForm() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.story} aria-labelledby="parent-welcome">
          <Link href="/" className={styles.brand}>
            <span><GraduationCap size={25} /></span> Brightcamp
          </Link>
          <div className={styles.storyBody}>
            <span className={styles.eyebrow}>
              <HeartHandshake size={15} /> Guardian & Family Portal
            </span>
            <h1 id="parent-welcome">
              Connected with<br /><em>their journey.</em>
            </h1>
            <p>Track academic attendance, view published report cards, manage school fees, and communicate with teachers.</p>
            <div className={styles.art} aria-hidden="true">
              <div className={styles.card}>
                <Users size={48} />
                <span>Family Space</span>
              </div>
            </div>
            <div className={styles.trust}>
              <LockKeyhole size={17} />
              <span>Sign in with a one-time code sent to your verified guardian email.</span>
            </div>
          </div>
          <small>Supporting every student&apos;s potential together.</small>
        </section>

        <section className={styles.panel} aria-labelledby="login-title">
          <Link className={styles.back} href="/">← Public previews</Link>
          <div className={styles.formWrap}>
            <span className={styles.icon}><Users size={26} /></span>
            <span className={styles.kicker}>PARENT & GUARDIAN PORTAL</span>
            <h2 id="login-title">Parent sign-in</h2>
            <p className={styles.subtitle}>Use the guardian email verified by your school.</p>
            <div className={styles.notice} role="status">
              <span>Email sign-in is currently unavailable.</span>
            </div>
            <form className={styles.form}>
              <label htmlFor="guardian-email">Guardian email</label>
              <input id="guardian-email" type="email" autoComplete="email" disabled />
              <button type="button" disabled>Send one-time code <ArrowRight size={17} /></button>
              <label htmlFor="guardian-code">One-time code</label>
              <input id="guardian-code" type="text" inputMode="numeric" autoComplete="one-time-code" disabled />
              <button type="button" disabled>Verify code <ArrowRight size={17} /></button>
            </form>

            <div className={styles.footer}>
              <ShieldCheck size={16} />
              <span>Parent credentials never grant student or staff access.</span>
            </div>
          </div>
          <small className={styles.previewNote}>
            Looking for public preview? <Link href="/parent/dashboard" style={{ textDecoration: 'underline' }}>View Parent Preview</Link>
          </small>
        </section>
      </div>
    </main>
  );
}

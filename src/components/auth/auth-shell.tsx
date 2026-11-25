import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, ShieldCheck } from 'lucide-react';
import { AuthIllustration, type AuthIllustrationVariant } from './auth-illustrations';
import styles from './auth-shell.module.css';

export type AuthTone = 'admin' | 'teacher' | 'accountant' | 'student' | 'parent' | 'security';

export interface AuthShellProps {
  readonly tone?: AuthTone;
  readonly illustration?: AuthIllustrationVariant;
  readonly headline: ReactNode;
  readonly description?: string;
  readonly trustNote?: string;
  readonly backHref?: string;
  readonly backLabel?: string;
  readonly activePortal?: 'staff' | 'student' | 'parent' | 'none';
  readonly kicker: string;
  readonly title: string;
  readonly subtitle: string;
  readonly cardIcon: ReactNode;
  readonly headingId?: string;
  readonly storyHeadingId?: string;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

export function AuthShell({
  tone = 'admin',
  illustration = 'campus',
  headline,
  description,
  trustNote = 'School-managed access',
  backHref = '/',
  backLabel = 'All portals',
  activePortal = 'none',
  kicker,
  title,
  subtitle,
  cardIcon,
  headingId = 'auth-card-title',
  storyHeadingId = 'auth-story-title',
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.aside} data-tone={tone} aria-labelledby={storyHeadingId}>
        <Link href="/" className={styles.brandLink} aria-label="Brightcamp School ERP Home">
          <span className={styles.brandMark} aria-hidden="true">
            <GraduationCap size={20} />
          </span>
          <span className={styles.brandCopy}>
            <span className={styles.brandName}>BRIGHTCAMP</span>
            <span className={styles.brandSub}>SCHOOL ERP PLATFORM</span>
          </span>
        </Link>

        <div className={styles.storyBody}>
          <div className={styles.illustrationWrap}>
            <AuthIllustration variant={illustration} className={styles.illustration} />
          </div>
          <h1 id={storyHeadingId} className={styles.headline}>
            {headline}
          </h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>

        <footer className={styles.asideFooter}>
          <span className={styles.asideTrust}>
            <ShieldCheck size={14} aria-hidden="true" />
            <span>{trustNote}</span>
          </span>
          <span>Brightcamp Cloud</span>
        </footer>
      </aside>

      <main className={styles.main} id="main-content">
        <nav className={styles.topBar} aria-label="Authentication navigation">
          <Link href={backHref} className={styles.backLink}>
            <ArrowLeft size={14} aria-hidden="true" />
            <span>{backLabel}</span>
          </Link>

          {activePortal !== 'none' && (
            <div className={styles.portalLinks}>
              <Link
                href="/login/staff"
                className={`${styles.portalLink} ${activePortal === 'staff' ? styles.portalLinkActive : ''}`}
              >
                Staff
              </Link>
              <Link
                href="/login/student"
                className={`${styles.portalLink} ${activePortal === 'student' ? styles.portalLinkActive : ''}`}
              >
                Student
              </Link>
              <Link
                href="/login/parent"
                className={`${styles.portalLink} ${activePortal === 'parent' ? styles.portalLinkActive : ''}`}
              >
                Parent
              </Link>
            </div>
          )}
        </nav>

        <div className={styles.centerWrap}>
          <section className={styles.card} aria-labelledby={headingId}>
            <header className={styles.cardHeader}>
              <div className={styles.kickerRow}>
                <span className={styles.cardIcon} aria-hidden="true">
                  {cardIcon}
                </span>
                <span className={styles.cardKicker}>{kicker}</span>
              </div>
              <h2 id={headingId} className={styles.cardTitle}>
                {title}
              </h2>
              <p className={styles.cardSubtitle}>{subtitle}</p>
            </header>

            {children}

            {footer && <div className={styles.cardFooter}>{footer}</div>}
          </section>
        </div>

        <p className={styles.legalNote}>Brightcamp School ERP · Protected workspace access</p>
      </main>
    </div>
  );
}

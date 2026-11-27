import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Cloud,
  Crown,
  GraduationCap,
  Headphones,
  Layers,
  Play,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { AnimatedCampusScene } from '@/components/home/animated-campus-scene';
import styles from './home.module.css';

interface PortalCardData {
  readonly role: 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';
  readonly title: string;
  readonly description: string;
  readonly icon: typeof Crown;
  readonly href: string;
}

const PORTAL_CARDS: readonly PortalCardData[] = [
  {
    role: 'admin',
    title: 'Admin',
    description: 'Bring your school together.',
    icon: Crown,
    href: '/login/staff?role=admin',
  },
  {
    role: 'teacher',
    title: 'Teacher',
    description: 'Make room for inspiration.',
    icon: BookOpen,
    href: '/login/staff?role=teacher',
  },
  {
    role: 'student',
    title: 'Student',
    description: 'Let your curiosity lead.',
    icon: GraduationCap,
    href: '/login/student',
  },
  {
    role: 'parent',
    title: 'Parent',
    description: 'Share in their journey.',
    icon: Users,
    href: '/login/parent',
  },
  {
    role: 'accountant',
    title: 'Accountant',
    description: 'Clarity for every detail.',
    icon: Calculator,
    href: '/login/staff?role=accountant',
  },
];

export default function Home() {
  return (
    <div className={styles.home}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {/* Layered Animated Anime Campus Scene */}
      <AnimatedCampusScene />

      {/* 1. Floating Translucent Glass Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <div className={styles.brandMark} aria-hidden="true">
              <GraduationCap size={20} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>
                <span className={styles.brandBright}>BRIGHT</span>
                <span className={styles.brandCamp}>CAMP</span>
              </span>
              <span className={styles.brandTagline}>SCHOOL ERP PLATFORM</span>
            </div>
            <span className={styles.brandDivider} aria-hidden="true" />
            <span className={styles.platformLabel}>All-in-One School Management</span>
          </div>

          <div className={styles.headerRight}>
            <Link
              href="/admin/dashboard"
              className={styles.navDemoLink}
              title="Explore interactive demo with fictional sample data"
            >
              <span>Try Fictional Demo</span>
              <Play size={12} fill="currentColor" aria-hidden="true" />
            </Link>
            <div className={styles.liveBadge}>
              <Cloud size={15} aria-hidden="true" />
              <span>LIVE ERP – Cloud Platform</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Hero + Five Portal Cards */}
      <main className={styles.main} id="main-content">
        <section className={styles.heroSection} aria-labelledby="hero-title">
          <div className={styles.heroContent}>
            <div className={styles.eyebrowRow}>
              <span className={styles.eyebrowPill}>ONE SCHOOL. ONE SMART PLATFORM.</span>
              <span className={styles.eyebrowAccent} aria-hidden="true" />
            </div>

            <h1 id="hero-title" className={styles.heroTitle}>
              <span className={styles.heroTitleLine1}>Your School.</span>
              <span className={styles.heroTitleGradient}>Beautifully Connected.</span>
            </h1>

            <p className={styles.heroDescription}>
              Manage learning, people and school operations in one powerful, easy-to-use School ERP.
            </p>

            <div className={styles.featuresRow}>
              <span className={styles.featurePill}>
                <ShieldCheck size={14} className={styles.featureIcon} aria-hidden="true" />
                <span>Secure &amp; Role-Based</span>
              </span>
              <span className={styles.featurePill}>
                <Layers size={14} className={styles.featureIcon} aria-hidden="true" />
                <span>All-in-One Platform</span>
              </span>
              <span className={styles.featurePill}>
                <Zap size={14} className={styles.featureIcon} aria-hidden="true" />
                <span>Built for Schools</span>
              </span>
            </div>

            <div className={styles.ctaRow}>
              <a href="#workspaces" className={styles.primaryCta}>
                <span>Access School Portals</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link href="/admin/dashboard" className={styles.secondaryCta}>
                <Play size={14} fill="currentColor" aria-hidden="true" />
                <span>Explore Demo</span>
              </Link>
            </div>
          </div>

          <div className={styles.heroSpacer} aria-hidden="true" />
        </section>

        {/* 3. Five Equally Sized Glassmorphism Portal Cards */}
        <section id="workspaces" className={styles.workspacesSection} aria-label="School ERP Role Portals">
          <div className={styles.cardsGrid}>
            {PORTAL_CARDS.map(({ role, title, description, icon: Icon, href }) => (
              <Link
                key={role}
                href={href}
                className={styles.workspaceCard}
                data-role={role}
                aria-label={`${title} Portal: ${description}`}
              >
                <Icon size={90} strokeWidth={1.3} className={styles.cardWatermark} aria-hidden="true" />
                <div className={styles.cardIcon} aria-hidden="true">
                  <Icon size={32} strokeWidth={2.35} />
                </div>
                <div className={styles.cardBody}>
                  <div>
                    <h2 className={styles.cardTitle}>{title}</h2>
                    <p className={styles.cardDesc}>{description}</p>
                  </div>
                  <span className={styles.cardArrowBtn} aria-hidden="true">
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* 4. Floating Glass Support Bar & Platform Pill */}
      <footer className={styles.footer}>
        <div className={styles.supportBar}>
          <span className={styles.supportItem}>
            <Headphones size={15} aria-hidden="true" />
            <span>Dedicated Support</span>
          </span>
          <span className={styles.supportDivider} aria-hidden="true" />
          <span className={styles.supportItem}>
            <Cloud size={15} aria-hidden="true" />
            <span>Cloud Based</span>
          </span>
          <span className={styles.supportDivider} aria-hidden="true" />
          <span className={styles.supportItem}>
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Data Security</span>
          </span>
        </div>

        <div className={styles.statusPill}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span>Brightcamp Cloud ERP</span>
        </div>
      </footer>
    </div>
  );
}

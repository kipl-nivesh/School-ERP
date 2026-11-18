import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Coins,
  Crown,
  GraduationCap,
  Heart,
  Layers,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { HeroBackground } from '@/components/home/hero-background';
import styles from './home.module.css';

interface WorkspaceCardData {
  readonly role: 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';
  readonly title: string;
  readonly description: string;
  readonly icon: typeof Crown;
  readonly href: string;
}

const WORKSPACE_CARDS: readonly WorkspaceCardData[] = [
  {
    role: 'admin',
    title: 'Admin',
    description: 'Bring your school together.',
    icon: Crown,
    href: '/admin/dashboard',
  },
  {
    role: 'teacher',
    title: 'Teacher',
    description: 'Make room for inspiration.',
    icon: BookOpen,
    href: '/teacher/dashboard',
  },
  {
    role: 'student',
    title: 'Student',
    description: 'Let your curiosity lead.',
    icon: GraduationCap,
    href: '/student/dashboard',
  },
  {
    role: 'parent',
    title: 'Parent',
    description: 'Share in their journey.',
    icon: Heart,
    href: '/parent/dashboard',
  },
  {
    role: 'accountant',
    title: 'Accountant',
    description: 'Clarity for every detail.',
    icon: Coins,
    href: '/accountant/dashboard',
  },
];

export default function Home() {
  return (
    <div className={styles.home}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {/* ============================================================== */}
      {/* 1. TOP NAVIGATION HEADER                                       */}
      {/* ============================================================== */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* Brand Logo & Platform Title */}
          <div className={styles.brandGroup}>
            <div className={styles.brandMark} aria-hidden="true">
              <GraduationCap size={22} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>brightcamp</span>
              <span className={styles.brandTagline}>SCHOOL WORKSPACE</span>
            </div>
            <span className={styles.brandDivider} aria-hidden="true" />
            <span className={styles.platformLabel}>School ERP Platform</span>
          </div>

          {/* Right Header Navigation & Demo Indicator */}
          <div className={styles.headerRight}>
            <a href="#workspaces" className={styles.navDemoLink}>
              Demo workspaces
            </a>
            <div className={styles.demoBadge}>
              <span className={styles.demoDot} aria-hidden="true" />
              <span>DEMO · Fictional data</span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN SINGLE-SCREEN HERO & WORKSPACES                        */}
      {/* ============================================================== */}
      <main className={styles.main} id="main-content">
        {/* Vector-accurate background illustration (schoolhouse & ribbons) */}
        <HeroBackground />

        <div className={styles.mainContainer}>
          {/* Centered Hero Typography & Actions */}
          <section className={styles.heroSection} aria-labelledby="hero-title">
            {/* Eyebrow with decorative horizontal lines */}
            <div className={styles.eyebrowContainer}>
              <span className={styles.eyebrowLine} aria-hidden="true" />
              <p className={styles.eyebrow}>ONE SCHOOL. ONE SMART PLATFORM.</p>
              <span className={styles.eyebrowLine} aria-hidden="true" />
            </div>

            {/* Main Title */}
            <h1 id="hero-title" className={styles.heroTitle}>
              Your School.{' '}
              <span className={styles.heroTitleGradient}>Beautifully Connected.</span>
            </h1>

            {/* Supporting Description */}
            <p className={styles.heroDescription}>
              Manage learning, people and school operations in one powerful, easy-to-use School ERP.
            </p>

            {/* Three Feature Highlights */}
            <div className={styles.featuresRow}>
              <div className={styles.featurePill}>
                <ShieldCheck size={14} className={styles.featureIcon} aria-hidden="true" />
                <span>Secure &amp; Role-Based</span>
              </div>
              <div className={styles.featurePill}>
                <Layers size={14} className={styles.featureIcon} aria-hidden="true" />
                <span>All-in-One Platform</span>
              </div>
              <div className={styles.featurePill}>
                <Zap size={14} className={styles.featureIcon} aria-hidden="true" />
                <span>Built for Schools</span>
              </div>
            </div>

            {/* Primary CTA */}
            <div className={styles.ctaWrapper}>
              <a href="#workspaces" className={styles.primaryCta}>
                <span>Explore Workspaces</span>
                <ArrowRight size={16} className={styles.ctaArrow} aria-hidden="true" />
              </a>
            </div>
          </section>

          {/* ============================================================== */}
          {/* 3. FIVE ROLE WORKSPACE CARDS (Single Desktop Row)              */}
          {/* ============================================================== */}
          <section
            id="workspaces"
            className={styles.workspacesSection}
            aria-label="Demo Role Workspaces"
          >
            <div className={styles.cardsGrid}>
              {WORKSPACE_CARDS.map(({ role, title, description, icon: Icon, href }) => (
                <Link
                  key={role}
                  href={href}
                  className={styles.workspaceCard}
                  data-role={role}
                  aria-label={`${title} Workspace: ${description}`}
                >
                  <div className={styles.cardIconBox} aria-hidden="true">
                    <Icon size={22} strokeWidth={2.1} />
                  </div>
                  <div className={styles.cardBody}>
                    <h2 className={styles.cardTitle}>{title}</h2>
                    <p className={styles.cardDesc}>{description}</p>
                  </div>
                  <div className={styles.cardActionCircle} aria-hidden="true">
                    <ArrowRight size={14} strokeWidth={2.4} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* ============================================================== */}
      {/* 4. COMPACT FOOTER                                              */}
      {/* ============================================================== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          {/* Brand */}
          <div className={styles.footerBrand}>
            <GraduationCap size={16} className={styles.footerBrandIcon} aria-hidden="true" />
            <span className={styles.footerBrandText}>Brightcamp</span>
          </div>

          {/* Highlights */}
          <div className={styles.footerCenter}>
            <span className={styles.footerItem}>
              <Users size={13} className={styles.footerItemIcon} aria-hidden="true" />
              <span>Five role-based workspaces</span>
            </span>
            <span className={styles.footerSep} aria-hidden="true">
              |
            </span>
            <span className={styles.footerItem}>
              <BookOpen size={13} className={styles.footerItemIcon} aria-hidden="true" />
              <span>22 ERP modules (functional demo)</span>
            </span>
            <span className={styles.footerSep} aria-hidden="true">
              |
            </span>
            <span className={styles.footerItem}>
              <ShieldCheck size={13} className={styles.footerItemIcon} aria-hidden="true" />
              <span>Fictional school records only</span>
            </span>
          </div>

          {/* Disclaimer */}
          <div className={styles.footerRight}>
            <span className={styles.disclaimerBadge}>DEMO · Not for live school use</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

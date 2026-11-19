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
import { Hero3dScene } from '@/components/home/hero-3d-scene';
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

          {/* Right Header Navigation & Demo Indicator */}
          <div className={styles.headerRight}>
            <a href="#workspaces" className={styles.navDemoLink}>
              Demo Workspaces
            </a>
            <div className={styles.demoBadge}>
              <span className={styles.demoDot} aria-hidden="true" />
              <span className={styles.demoBadgeText}>
                <strong className={styles.demoHighlight}>DEMO</strong> · Fictional data
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN SINGLE-SCREEN HERO & WORKSPACES                        */}
      {/* ============================================================== */}
      <main className={styles.main} id="main-content">
        {/* Full-bleed vector decorative background */}
        <HeroBackground />

        <div className={styles.mainContainer}>
          {/* Hero Row: Left Typography & Right 3D Pixar Campus Visual */}
          <section className={styles.heroSection} aria-labelledby="hero-title">
            {/* Left Column: Hero Content */}
            <div className={styles.heroContent}>
              {/* Eyebrow with horizontal accent rule */}
              <div className={styles.eyebrowContainer}>
                <p className={styles.eyebrow}>ONE SCHOOL. ONE SMART PLATFORM.</p>
                <span className={styles.eyebrowLine} aria-hidden="true" />
              </div>

              {/* Main Headline */}
              <h1 id="hero-title" className={styles.heroTitle}>
                <span className={styles.heroTitleLine1}>Your School.</span>
                <span className={styles.heroTitleGradient}>
                  Beautifully<br className={styles.mobileBreak} /> Connected.
                </span>
              </h1>

              {/* Supporting Value Proposition */}
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

              {/* Primary Call-to-Action */}
              <div className={styles.ctaWrapper}>
                <a href="#workspaces" className={styles.primaryCta}>
                  <span>Explore Workspaces</span>
                  <ArrowRight size={16} className={styles.ctaArrow} aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* Right Column: 3D Pixar School Campus Artwork */}
            <div className={styles.heroVisual}>
              <Hero3dScene />
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
                  {/* Luminous fluid glass waves at the bottom */}
                  <div className={styles.cardWaveContainer} aria-hidden="true">
                    <svg
                      className={styles.cardWaveSvg}
                      viewBox="0 0 190 70"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 0 48 C 30 36, 65 54, 105 38 C 135 26, 165 18, 190 10 L 190 70 L 0 70 Z"
                        fill="currentColor"
                        className={styles.waveBase}
                      />
                      <path
                        d="M 0 58 C 40 52, 90 44, 135 25 L 190 10 L 190 70 L 0 70 Z"
                        fill="currentColor"
                        className={styles.waveCrest}
                      />
                      <path
                        d="M 0 58 C 40 52, 90 44, 135 25 L 190 10"
                        stroke="rgba(255, 255, 255, 0.7)"
                        strokeWidth="1.2"
                        fill="none"
                        className={styles.waveHighlight}
                      />
                    </svg>
                  </div>

                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconBox} aria-hidden="true">
                      <Icon size={22} strokeWidth={2.3} />
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <h2 className={styles.cardTitle}>{title}</h2>
                    <p className={styles.cardDesc}>{description}</p>
                  </div>
                  <div className={styles.cardActionCircle} aria-hidden="true">
                    <ArrowRight size={15} strokeWidth={2.6} />
                  </div>
                  {/* Radiant specular glare along the bottom edge */}
                  <span className={styles.cardBottomGlow} aria-hidden="true" />
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

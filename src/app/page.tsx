import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, GraduationCap, Heart, Layers, Palette, ShieldCheck, Users, Wallet } from 'lucide-react';
import { Brand } from '@/components/shared/brand';
import { roles, roleDetails } from '@/config/roles';
import styles from './home.module.css';

const workspaces = {
  admin: { icon: Users, description: 'Bring your school together.', href: '/login/staff?role=admin' },
  teacher: { icon: BookOpen, description: 'Make room for inspiration.', href: '/login/staff?role=teacher' },
  student: { icon: GraduationCap, description: 'Let your curiosity lead.', href: '/login/student' },
  parent: { icon: Heart, description: 'Share in their journey.', href: '/login/parent' },
  accountant: { icon: Wallet, description: 'Clarity for every detail.', href: '/login/staff?role=accountant' },
};

const navigation = [
  ['Register School', '/register/school'],
  ['Staff Login', '/login/staff'],
  ['Student Login', '/login/student'],
  ['Parent Login', '/login/parent'],
];

function DashboardIllustration() {
  return <div className={styles.illustration} aria-hidden="true">
    <div className={styles.laptop}>
      <div className={styles.screen}>
        <div className={styles.sidebar}>
          <GraduationCap size={18} />
          <span /><span /><span /><span />
        </div>
        <div className={styles.mockBody}>
          <div className={styles.mockHeader}><strong>School overview</strong><span>•••</span></div>
          <div className={styles.metrics}>
            <div><Users /><span>Students</span><strong>1,248</strong></div>
            <div><BookOpen /><span>Classes</span><strong>42</strong></div>
            <div><ShieldCheck /><span>Attendance</span><strong>96.8%</strong></div>
          </div>
          <div className={styles.analytics}>
            <div className={styles.trend}>
              <strong>Attendance trend</strong>
              <svg viewBox="0 0 240 80" preserveAspectRatio="none" focusable="false">
                <defs><linearGradient id="brightcamp-chart-fill" x2="0" y2="1"><stop stopColor="#21c7fb" stopOpacity=".4"/><stop offset="1" stopColor="#21c7fb" stopOpacity="0"/></linearGradient></defs>
                <path d="M0 66 C18 65 30 42 48 49 S73 54 96 37 S125 44 144 30 S173 36 192 19 S218 26 240 9 V80 H0Z" fill="url(#brightcamp-chart-fill)" />
                <path d="M0 66 C18 65 30 42 48 49 S73 54 96 37 S125 44 144 30 S173 36 192 19 S218 26 240 9" fill="none" stroke="#50d8ff" strokeWidth="2.5" />
              </svg>
            </div>
            <div className={styles.distribution}><strong>Enrollment</strong><div /><span>By workspace</span></div>
          </div>
        </div>
      </div>
      <div className={styles.deck} />
    </div>
  </div>;
}

export default function Home() {
  const demo = process.env.NEXT_PUBLIC_BRIGHTCAMP_PREVIEW_LOCK === 'true' ||
    process.env.STAFF_AUTH_REQUESTS_ENABLED !== 'true';
  return <div className={styles.home}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />
        <nav className={styles.nav} aria-label="Main navigation">
          {demo ? <a href="#workspaces">Demo workspaces</a> :
            navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        {demo && <span className={styles.preview}>DEMO · Fictional data</span>}
      </div>
    </header>
    <main className={styles.main} id="main-content">
      <section className={styles.hero} aria-labelledby="homepage-title">
        <div>
          <p className={styles.eyebrow}>One school. Endless possibilities.</p>
          <h1 id="homepage-title">School ERP<br /> for <span>Modern Education.</span></h1>
          <p className={styles.description}>{demo
            ? 'Explore academics, attendance and finance in five role-based workspaces with fictional school records.'
            : 'Manage academics, people, finance and communication in role-based workspaces for your school community.'}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="#workspaces">Explore the Workspaces <ArrowRight size={17} aria-hidden="true" /></a>
            {!demo && <Link className={styles.secondary} href="/register/school">Register Your School</Link>}
          </div>
          <ul className={styles.features}>
            <li><ShieldCheck aria-hidden="true" /> Secure &amp; Role-Based</li>
            <li><Layers aria-hidden="true" /> All-in-One Platform</li>
            <li><GraduationCap aria-hidden="true" /> Built for Schools</li>
          </ul>
        </div>
        <DashboardIllustration />
      </section>
      <section id="workspaces" className={styles.workspaces} aria-labelledby="workspaces-heading">
        <div className={styles.sectionHeading}>
          <h2 id="workspaces-heading">Explore the workspaces</h2>
          <p>{demo ? 'Five fictional-data demos' : 'Choose your role'}</p>
        </div>
        <div className={styles.cards}>
          {roles.map(role => {
            const { icon: Icon, description, href } = workspaces[role];
            return <Link key={role} href={demo ? `/${role}/dashboard` : href} className={styles.card} data-role={role}>
              <span className={styles.icon}><Icon size={23} aria-hidden="true" /></span>
              <ArrowUpRight size={17} className={styles.arrow} aria-hidden="true" />
              <h3>{roleDetails[role].title}</h3>
              <p>{description}</p>
            </Link>;
          })}
        </div>
      </section>
    </main>
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span className={styles.footerBrand}><GraduationCap size={19} aria-hidden="true" /> Brightcamp</span>
        <ul className={styles.values}>
          <li><Palette aria-hidden="true" /> Thoughtfully Designed</li>
          <li><Users aria-hidden="true" /> Made for One School</li>
          <li><ShieldCheck aria-hidden="true" /> Real Permissions Planned</li>
        </ul>
        {demo && <span>Client demo · Fictional records</span>}
      </div>
    </footer>
  </div>;
}

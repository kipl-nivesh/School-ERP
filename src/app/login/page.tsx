import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Coins,
  Crown,
  GraduationCap,
  Users,
} from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import styles from '@/components/auth/auth-shell.module.css';
import { studentPortalRequestsEnabled } from '@/lib/student/request-policy';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in · Role selection',
  description: 'Select your Brightcamp School ERP portal to sign in.',
};

const PORTAL_OPTIONS = [
  {
    role: 'admin',
    title: 'School Administrator',
    description: 'Admissions, staff permissions & approvals',
    badge: 'MFA Required',
    href: '/login/staff?role=admin',
    icon: Crown,
    accent: '#4f46e5',
    softBg: '#eef2ff',
  },
  {
    role: 'teacher',
    title: 'Teacher & Faculty',
    description: 'Attendance, homework & draft marks',
    badge: 'Staff Email',
    href: '/login/staff?role=teacher',
    icon: BookOpen,
    accent: '#0284c7',
    softBg: '#e0f2fe',
  },
  {
    role: 'accountant',
    title: 'Accountant & Finance',
    description: 'Fee invoices, receipts & financial reports',
    badge: 'Staff Email',
    href: '/login/staff?role=accountant',
    icon: Coins,
    accent: '#d97706',
    softBg: '#fef3c7',
  },
  {
    role: 'student',
    title: 'Student Portal',
    description: 'Preview the Student sign-in screen',
    badge: 'Preview',
    href: '/login/student',
    icon: GraduationCap,
    accent: '#2563eb',
    softBg: '#dbeafe',
  },
  {
    role: 'parent',
    title: 'Parent & Guardian',
    description: 'Preview the Parent sign-in screen',
    badge: 'Preview',
    href: '/login/parent',
    icon: Users,
    accent: '#059669',
    softBg: '#d1fae5',
  },
] as const;

export default function LoginRoleSelectionPage() {
  const studentEnabled = studentPortalRequestsEnabled();
  return (
    <AuthShell
      tone="admin"
      illustration="campus"
      headline={
        <>
          Your school.
          <br />
          One connected workspace.
        </>
      }
      description="Choose your portal to sign in with your school-managed account."
      trustNote="School-managed access"
      backHref="/"
      backLabel="Home"
      kicker="PORTAL DIRECTORY"
      title="Choose your workspace"
      subtitle="Select your role below to continue."
      cardIcon={<Building2 size={18} />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/invite" className={styles.labelAction}>
            Have a staff invitation?
          </Link>
          <Link href="/register/school" className={styles.labelAction}>
            Register a new school &rarr;
          </Link>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: '8px' }} role="navigation" aria-label="Role login portals">
        {PORTAL_OPTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.role}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '11px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
              className="hover:border-indigo-300 hover:bg-slate-50/70"
            >
              <span
                aria-hidden="true"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: item.softBg,
                  color: item.accent,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                    {item.title}
                  </strong>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: item.softBg,
                      color: item.accent,
                    }}
                  >
                    {item.role === 'student' && studentEnabled ? '6-digit PIN' : item.badge}
                  </span>
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: '1px',
                    fontSize: '12px',
                    lineHeight: 1.35,
                    color: '#64748b',
                  }}
                >
                  {item.role === 'student' && studentEnabled ? 'Timetable, homework, results and receipts' : item.description}
                </span>
              </span>
              <ArrowRight size={15} color="#94a3b8" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </AuthShell>
  );
}

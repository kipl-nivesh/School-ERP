'use client';

import React, { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Lock,
} from 'lucide-react';
import { registerSchoolAction, type RegistrationActionState } from './actions';
import styles from './school-registration.module.css';

const INITIAL_STATE: RegistrationActionState = {
  status: 'idle',
};

export function SchoolRegistrationForm() {
  const [state, formAction, pending] = useActionState(registerSchoolAction, INITIAL_STATE);
  const [schoolCodeInput, setSchoolCodeInput] = useState('');

  const handleSchoolCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchoolCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {/* Left Side Hero & Values */}
        <section className={styles.story} aria-labelledby="registration-hero">
          <div>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandIcon}>
                <GraduationCap size={24} />
              </span>
              Brightcamp
            </Link>

            <div className={styles.storyBody}>
              <span className={styles.eyebrow}>
                <Sparkles size={14} /> Multi-School SaaS
              </span>
              <h1 id="registration-hero">
                Empower your school with <em>Brightcamp</em>.
              </h1>
              <p>
                One unified platform designed specifically for your school administration,
                teachers, accountants, students, and parents.
              </p>

              <div className={styles.benefitsList}>
                <div className={styles.benefitItem}>
                  <CheckCircle2 size={18} className={styles.benefitIcon} />
                  <span>
                    <strong>Complete Tenant Isolation:</strong> Dedicated database partitioning and isolated records.
                  </span>
                </div>
                <div className={styles.benefitItem}>
                  <CheckCircle2 size={18} className={styles.benefitIcon} />
                  <span>
                    <strong>10-Day Free Trial per Student:</strong> Full access to all student and parent portals.
                  </span>
                </div>
                <div className={styles.benefitItem}>
                  <CheckCircle2 size={18} className={styles.benefitIcon} />
                  <span>
                    <strong>School Admin AAL2 MFA:</strong> Bank-grade TOTP security for administrative operations.
                  </span>
                </div>
                <div className={styles.benefitItem}>
                  <CheckCircle2 size={18} className={styles.benefitIcon} />
                  <span>
                    <strong>Guided 8-Step Onboarding:</strong> Smooth setup of academic years, classes, staff, and students.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.storyFooter}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} />
              <span>Independent school verification with operator approval.</span>
            </div>
          </div>
        </section>

        {/* Right Side Registration Form */}
        <section className={styles.panel} aria-labelledby="form-heading">
          <div className={styles.topBar}>
            <Link href="/" className={styles.backLink}>
              ← Return to Home
            </Link>
            <Link href="/login/staff" className={styles.backLink}>
              Staff Login →
            </Link>
          </div>

          {state.status === 'success' ? (
            <div className={styles.alertSuccess} role="status">
              <CheckCircle2 size={48} color="#16a34a" />
              <h3>Application Submitted!</h3>
              <p>
                Thank you for applying to onboard your school with Brightcamp. Your registration
                application has been recorded and is currently pending review by our provisioning team.
              </p>

              <div style={{ margin: '12px 0' }}>
                <span style={{ fontSize: '12px', color: '#166534', display: 'block', marginBottom: '4px' }}>
                  Your School Code
                </span>
                <span className={styles.codeBadge}>{state.schoolCode}</span>
                {state.registrationId && <Link href={`/register/school/status?id=${encodeURIComponent(state.registrationId)}`}>View application status and authenticator setup</Link>}
              </div>

              <p style={{ fontSize: '12px', color: '#475569' }}>
                Once approved, the provisioned School Admin will receive an activation notification to
                set up their password and register their trusted MFA authenticator.
              </p>

              <div style={{ marginTop: '16px' }}>
                <Link
                  href="/login/staff"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#4f46e5',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none',
                  }}
                >
                  Proceed to Staff Portal <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.formHeader}>
                <span className={styles.kicker}>New School Onboarding</span>
                <h2 id="form-heading">Register Your School</h2>
                <p className={styles.subtitle}>
                  Fill in your institution and administrator details to request onboarding.
                </p>
              </div>

              {state.status === 'error' && state.message && (
                <div className={styles.alertError} role="alert">
                  <strong>Error: </strong>
                  <span>{state.message}</span>
                </div>
              )}

              <form action={formAction} className={styles.form} aria-busy={pending}>
                {/* School Details */}
                <span className={styles.sectionTitle}>
                  <Building2 size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  School Information
                </span>

                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label htmlFor="schoolName">School Name *</label>
                    <input
                      id="schoolName"
                      name="schoolName"
                      type="text"
                      placeholder="e.g. Springfield High School"
                      required
                      disabled={pending}
                      className={state.errors?.schoolName ? styles.inputError : ''}
                    />
                    {state.errors?.schoolName && (
                      <span className={styles.errorText}>{state.errors.schoolName}</span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="schoolCode">School Code *</label>
                    <input
                      id="schoolCode"
                      name="schoolCode"
                      type="text"
                      placeholder="e.g. SPR-01"
                      value={schoolCodeInput}
                      onChange={handleSchoolCodeChange}
                      required
                      maxLength={20}
                      disabled={pending}
                      className={state.errors?.schoolCode ? styles.inputError : ''}
                    />
                    <span className={styles.fieldHint}>
                      Unique uppercase identifier used during student/parent logins.
                    </span>
                    {state.errors?.schoolCode && (
                      <span className={styles.errorText}>{state.errors.schoolCode}</span>
                    )}
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label htmlFor="schoolEmail">Official School Email *</label>
                    <input
                      id="schoolEmail"
                      name="schoolEmail"
                      type="email"
                      placeholder="e.g. contact@springfield.edu"
                      required
                      disabled={pending}
                      className={state.errors?.schoolEmail ? styles.inputError : ''}
                    />
                    {state.errors?.schoolEmail && (
                      <span className={styles.errorText}>{state.errors.schoolEmail}</span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="contactNumber">School Phone Number *</label>
                    <input
                      id="contactNumber"
                      name="contactNumber"
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      required
                      disabled={pending}
                      className={state.errors?.contactNumber ? styles.inputError : ''}
                    />
                    {state.errors?.contactNumber && (
                      <span className={styles.errorText}>{state.errors.contactNumber}</span>
                    )}
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="addressLine">Campus Address *</label>
                  <input
                    id="addressLine"
                    name="addressLine"
                    type="text"
                    placeholder="e.g. 104 Main Street, North Campus"
                    required
                    disabled={pending}
                    className={state.errors?.addressLine ? styles.inputError : ''}
                  />
                  {state.errors?.addressLine && (
                    <span className={styles.errorText}>{state.errors.addressLine}</span>
                  )}
                </div>

                <div className={styles.grid3}>
                  <div className={styles.field}>
                    <label htmlFor="city">City *</label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="e.g. Mumbai"
                      required
                      disabled={pending}
                      className={state.errors?.city ? styles.inputError : ''}
                    />
                    {state.errors?.city && (
                      <span className={styles.errorText}>{state.errors.city}</span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="state">State *</label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="e.g. Maharashtra"
                      required
                      disabled={pending}
                      className={state.errors?.state ? styles.inputError : ''}
                    />
                    {state.errors?.state && (
                      <span className={styles.errorText}>{state.errors.state}</span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="postalCode">Postal Code *</label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      placeholder="e.g. 400001"
                      required
                      disabled={pending}
                      className={state.errors?.postalCode ? styles.inputError : ''}
                    />
                    {state.errors?.postalCode && (
                      <span className={styles.errorText}>{state.errors.postalCode}</span>
                    )}
                  </div>
                </div>

                {/* Initial School Admin Details */}
                <span className={styles.sectionTitle} style={{ marginTop: '16px' }}>
                  <Users size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Initial School Administrator
                </span>

                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label htmlFor="adminName">Administrator Full Name *</label>
                    <input
                      id="adminName"
                      name="adminName"
                      type="text"
                      placeholder="e.g. Dr. John Doe (Principal)"
                      required
                      disabled={pending}
                      className={state.errors?.adminName ? styles.inputError : ''}
                    />
                    {state.errors?.adminName && (
                      <span className={styles.errorText}>{state.errors.adminName}</span>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="adminEmail">Administrator Work Email *</label>
                    <input
                      id="adminEmail"
                      name="adminEmail"
                      type="email"
                      placeholder="e.g. principal@springfield.edu"
                      required
                      disabled={pending}
                      className={state.errors?.adminEmail ? styles.inputError : ''}
                    />
                    <span className={styles.fieldHint}>
                      Used for initial verification and School Admin AAL2 MFA registration.
                    </span>
                    {state.errors?.adminEmail && (
                      <span className={styles.errorText}>{state.errors.adminEmail}</span>
                    )}
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={pending}>
                  {pending ? (
                    'Submitting Application...'
                  ) : (
                    <>
                      <ShieldCheck size={18} /> Submit Registration Application
                    </>
                  )}
                </button>

                <p className={styles.loginPrompt}>
                  Already have an active school account?{' '}
                  <Link href="/login/staff">Sign in to Staff Portal</Link>
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

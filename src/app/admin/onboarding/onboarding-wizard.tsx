'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  Layers,
  Users,
  GraduationCap,
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { validateStudentCsv } from '@/lib/onboarding/service';
import type {
  OnboardingWizardStep,
  SchoolProfileStepData,
  AcademicYearStepData,
  ClassesSectionsStepData,
  StaffInvitationsStepData,
  StudentEnrollmentStepData,
  GuardianLinkingStepData,
  PortalActivationStepData,
  SetupCompletionStepData,
} from '@/lib/onboarding/types';
import styles from './onboarding-wizard.module.css';
import { persistOnboarding } from './actions';

interface OnboardingWizardProps {
  initialStep?: OnboardingWizardStep;
  initialCompletedSteps?: number[];
  initialCompleted?: boolean;
  initialData?: Record<string, unknown>;
  initialSchoolId?: string;
  initialSchoolCode?: string;
  initialSchoolName?: string;
}

export function OnboardingWizard({
  initialStep = 1,
  initialCompletedSteps = [],
  initialCompleted = false,
  initialData = {},
  initialSchoolId = '',
  initialSchoolName = '',
}: OnboardingWizardProps) {
  void initialSchoolId;
  const [currentStep, setCurrentStep] = useState<OnboardingWizardStep>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>(initialCompletedSteps);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [saveDraftMessage, setSaveDraftMessage] = useState<string | null>(null);

  // Step 1: School Profile
  const [profile, setProfile] = useState<SchoolProfileStepData>((initialData['1'] as SchoolProfileStepData) ?? {"schoolName":"","schoolCode":"","schoolEmail":"","contactNumber":"","addressLine":"","city":"","state":"","postalCode":""});

  // Step 2: Academic Year
  const [academicYear, setAcademicYear] = useState<AcademicYearStepData>((initialData['2'] as AcademicYearStepData) ?? {"label":"","startsOn":"","endsOn":""});

  // Step 3: Classes & Sections
  const [classesSections, setClassesSections] = useState<ClassesSectionsStepData>((initialData['3'] as ClassesSectionsStepData) ?? {"classes":[]});
  const [newClassName, setNewClassName] = useState('');

  // Step 4: Staff Invitations
  const [staffInvitations, setStaffInvitations] = useState<StaffInvitationsStepData>((initialData['4'] as StaffInvitationsStepData) ?? {"invitations":[]});
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'teacher' | 'accountant'>('teacher');

  // Step 5: Student Enrollment
  const [studentEnrollment, setStudentEnrollment] = useState<StudentEnrollmentStepData>((initialData['5'] as StudentEnrollmentStepData) ?? {"students":[]});
  const [newStudentReg, setNewStudentReg] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('Grade 1');
  const [newStudentSection, setNewStudentSection] = useState('A');
  const [csvUploadError, setCsvUploadError] = useState<string | null>(null);

  // Step 6: Guardian Linking
  const [guardianLinking, setGuardianLinking] = useState<GuardianLinkingStepData>((initialData['6'] as GuardianLinkingStepData) ?? {"guardians":[]});

  // Step 7: Student Portal Activation
  const [portalActivation, setPortalActivation] = useState<PortalActivationStepData>((initialData['7'] as PortalActivationStepData) ?? {"activatedStudentRegistrationNumbers":[],"activateAll":false});

  // Step 8: Setup Completion
  const setupSummary: SetupCompletionStepData['summary'] = {
    totalClasses: classesSections.classes.length,
    totalSections: classesSections.classes.reduce((sum, c) => sum + c.sections.length, 0),
    totalStaff: staffInvitations.invitations.length,
    totalStudents: studentEnrollment.students.length,
    totalGuardians: guardianLinking.guardians.length,
    activatedStudents: portalActivation.activatedStudentRegistrationNumbers.length,
  };

  const saveCurrent = async () => {
    const payload = [profile, academicYear, classesSections, staffInvitations, studentEnrollment, guardianLinking, portalActivation, { isReady: true }][currentStep - 1];
    const result = await persistOnboarding(currentStep, payload);
    setSaveDraftMessage(result.message);
    return result.ok;
  };
  const handleNextStep = async () => {
    if (!await saveCurrent()) return;
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (currentStep < 8) {
      setCurrentStep((prev) => (prev + 1) as OnboardingWizardStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingWizardStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveDraft = async () => { await saveCurrent(); };

  const handleAddClass = () => {
    if (newClassName.trim()) {
      setClassesSections({
        classes: [...classesSections.classes, { className: newClassName.trim(), sections: ['A'] }],
      });
      setNewClassName('');
    }
  };

  const handleRemoveClass = (index: number) => {
    setClassesSections({
      classes: classesSections.classes.filter((_, idx) => idx !== index),
    });
  };

  const handleAddStaff = () => {
    if (newStaffName.trim() && newStaffEmail.trim()) {
      setStaffInvitations({
        invitations: [
          ...staffInvitations.invitations,
          { displayName: newStaffName.trim(), email: newStaffEmail.trim(), roleCode: newStaffRole },
        ],
      });
      setNewStaffName('');
      setNewStaffEmail('');
    }
  };

  const handleRemoveStaff = (index: number) => {
    setStaffInvitations({
      invitations: staffInvitations.invitations.filter((_, idx) => idx !== index),
    });
  };

  const handleAddStudent = () => {
    if (newStudentReg.trim() && newStudentName.trim()) {
      setStudentEnrollment({
        students: [
          ...studentEnrollment.students,
          {
            registrationNumber: newStudentReg.trim().toUpperCase(),
            fullName: newStudentName.trim(),
            className: newStudentClass,
            sectionName: newStudentSection,
          },
        ],
      });
      setNewStudentReg('');
      setNewStudentName('');
    }
  };

  const handleCsvImportSample = async () => {
    const picker = document.createElement('input');
    picker.type = 'file'; picker.accept = '.csv,text/csv';
    picker.onchange = async () => {
    const file = picker.files?.[0]; if (!file || file.size > 200000) { setCsvUploadError('Choose a CSV under 200 KB.'); return; }
    const validation = validateStudentCsv(await file.text());
    if (validation.isValid) {
      const newStudents = validation.validRows.map((r) => ({
        registrationNumber: r.registrationNumber,
        fullName: r.fullName,
        className: r.className,
        sectionName: r.sectionName,
      }));
      setStudentEnrollment({
        students: [...studentEnrollment.students, ...newStudents],
      });
      const newGuardians = validation.validRows.map((r) => ({
        studentRegistrationNumber: r.registrationNumber,
        guardianName: r.guardianName,
        contactNumber: r.guardianPhone,
        email: r.guardianEmail,
        relationship: (r.relationship || 'Guardian') as 'Father' | 'Mother' | 'Guardian' | 'Other',
      }));
      setGuardianLinking({
        guardians: [...guardianLinking.guardians, ...newGuardians],
      });
      setCsvUploadError(null);
    } else {
      setCsvUploadError(validation.errors[0]?.message || 'Invalid CSV format.');
    }
    };
    picker.click();
  };

  const handleToggleStudentPortal = (regNum: string) => {
    const current = portalActivation.activatedStudentRegistrationNumbers;
    const updated = current.includes(regNum)
      ? current.filter((id) => id !== regNum)
      : [...current, regNum];

    setPortalActivation({
      ...portalActivation,
      activatedStudentRegistrationNumbers: updated,
    });
  };

  const handleToggleActivateAll = () => {
    if (portalActivation.activatedStudentRegistrationNumbers.length === studentEnrollment.students.length) {
      setPortalActivation({
        ...portalActivation,
        activatedStudentRegistrationNumbers: [],
        activateAll: false,
      });
    } else {
      setPortalActivation({
        ...portalActivation,
        activatedStudentRegistrationNumbers: studentEnrollment.students.map((s) => s.registrationNumber),
        activateAll: true,
      });
    }
  };

  const handleCompleteSetup = async () => {
    if (!await saveCurrent()) return;
    setIsCompleted(true);
    setCompletedSteps([1, 2, 3, 4, 5, 6, 7, 8]);
  };

  const stepsList: Array<{ id: OnboardingWizardStep; label: string; icon: React.ReactNode }> = [
    { id: 1, label: 'Profile', icon: <Building2 size={14} /> },
    { id: 2, label: 'Academic Year', icon: <Calendar size={14} /> },
    { id: 3, label: 'Classes', icon: <Layers size={14} /> },
    { id: 4, label: 'Staff', icon: <Users size={14} /> },
    { id: 5, label: 'Students', icon: <GraduationCap size={14} /> },
    { id: 6, label: 'Guardians', icon: <HeartHandshake size={14} /> },
    { id: 7, label: 'Portal', icon: <Zap size={14} /> },
    { id: 8, label: 'Complete', icon: <CheckCircle2 size={14} /> },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Top Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Sparkles size={22} />
            </div>
            <div>
              <h1>School Admin Onboarding Wizard</h1>
              <p>Guided setup for {profile.schoolName || initialSchoolName}</p>
            </div>
          </div>
          <div>
            <span className={styles.schoolBadge}>Code: {profile.schoolCode}</span>
          </div>
        </header>

        {/* Stepper Progress */}
        <nav className={styles.stepper} aria-label="Onboarding Steps">
          {stepsList.map((step) => {
            const isCurrent = currentStep === step.id;
            const isStepCompleted = completedSteps.includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                className={`${styles.stepBtn} ${isCurrent ? styles.stepBtnActive : ''} ${
                  isStepCompleted ? styles.stepBtnCompleted : ''
                }`}
                onClick={() => setCurrentStep(step.id)}
              >
                <span className={styles.stepNumber}>
                  {isStepCompleted && !isCurrent ? '✓' : step.id}
                </span>
                <span>{step.label}</span>
              </button>
            );
          })}
        </nav>

        {saveDraftMessage && (
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              color: '#065f46',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
            role="status"
          >
            {saveDraftMessage}
          </div>
        )}

        {/* Wizard Main Card */}
        <main className={styles.wizardCard}>
          {isCompleted ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 8px', color: '#14532d' }}>
                Onboarding Completed Successfully!
              </h2>
              <p style={{ fontSize: '13px', color: '#475569', maxWidth: '460px', margin: '0 auto 24px' }}>
                {profile.schoolName} is fully configured. All classes, staff invitations, students,
                and portal access settings have been saved to your school database.
              </p>

              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}><Layers size={20} /></div>
                  <div>
                    <div className={styles.summaryNum}>{setupSummary.totalClasses}</div>
                    <div className={styles.summaryLabel}>Classes Configured</div>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}><Users size={20} /></div>
                  <div>
                    <div className={styles.summaryNum}>{setupSummary.totalStaff}</div>
                    <div className={styles.summaryLabel}>Staff Invited</div>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryIcon}><GraduationCap size={20} /></div>
                  <div>
                    <div className={styles.summaryNum}>{setupSummary.totalStudents}</div>
                    <div className={styles.summaryLabel}>Students Enrolled</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '28px' }}>
                <Link
                  href="/admin/dashboard"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '14px',
                    padding: '12px 28px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)',
                  }}
                >
                  <ShieldCheck size={18} /> Launch School Admin Workspace
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: School Profile */}
              {currentStep === 1 && (
                <section aria-labelledby="step1-title">
                  <div className={styles.stepHeader}>
                    <span className={styles.stepKicker}>Step 1 of 8</span>
                    <h2 id="step1-title" className={styles.stepTitle}>School Profile & Settings</h2>
                    <p className={styles.stepDesc}>
                      Verify your institutional identity and contact information for school records and portal footers.
                    </p>
                  </div>

                  <div className={styles.formGrid2}>
                    <div className={styles.field}>
                      <label htmlFor="pSchoolName">School Name</label>
                      <input
                        id="pSchoolName"
                        type="text"
                        value={profile.schoolName}
                        onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="pSchoolCode">School Code (Immutable)</label>
                      <input id="pSchoolCode" type="text" value={profile.schoolCode} disabled />
                    </div>
                  </div>

                  <div className={styles.formGrid2}>
                    <div className={styles.field}>
                      <label htmlFor="pSchoolEmail">Official Email</label>
                      <input
                        id="pSchoolEmail"
                        type="email"
                        value={profile.schoolEmail}
                        onChange={(e) => setProfile({ ...profile, schoolEmail: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="pContactNumber">Contact Number</label>
                      <input
                        id="pContactNumber"
                        type="tel"
                        value={profile.contactNumber}
                        onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.field} style={{ marginBottom: '18px' }}>
                    <label htmlFor="pAddress">Campus Address</label>
                    <input
                      id="pAddress"
                      type="text"
                      value={profile.addressLine}
                      onChange={(e) => setProfile({ ...profile, addressLine: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGrid3}>
                    <div className={styles.field}>
                      <label htmlFor="pCity">City</label>
                      <input
                        id="pCity"
                        type="text"
                        value={profile.city}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="pState">State</label>
                      <input
                        id="pState"
                        type="text"
                        value={profile.state}
                        onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="pPostal">Postal Code</label>
                      <input
                        id="pPostal"
                        type="text"
                        value={profile.postalCode}
                        onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Step 2: Academic Year */}
              {currentStep === 2 && (
                <section aria-labelledby="step2-title">
                  <div className={styles.stepHeader}>
                    <span className={styles.stepKicker}>Step 2 of 8</span>
                    <h2 id="step2-title" className={styles.stepTitle}>Academic Year</h2>
                    <p className={styles.stepDesc}>
                      Set up your school&apos;s current active academic session for attendance, timetables, and fee cycles.
                    </p>
                  </div>

                  <div className={styles.formGrid3}>
                    <div className={styles.field}>
                      <label htmlFor="ayLabel">Session Label</label>
                      <input
                        id="ayLabel"
                        type="text"
                        placeholder="e.g. 2026-27"
                        value={academicYear.label}
                        onChange={(e) => setAcademicYear({ ...academicYear, label: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="ayStarts">Session Start Date</label>
                      <input
                        id="ayStarts"
                        type="date"
                        value={academicYear.startsOn}
                        onChange={(e) => setAcademicYear({ ...academicYear, startsOn: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="ayEnds">Session End Date</label>
                      <input
                        id="ayEnds"
                        type="date"
                        value={academicYear.endsOn}
                        onChange={(e) => setAcademicYear({ ...academicYear, endsOn: e.target.value })}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Step 3: Classes & Sections */}
              {currentStep === 3 && (
                <section aria-labelledby="step3-title">
                  <div className={styles.stepHeader}>
                    <span className={styles.stepKicker}>Step 3 of 8</span>
                    <h2 id="step3-title" className={styles.stepTitle}>Classes & Sections</h2>
                    <p className={styles.stepDesc}>
                      Define the grades and classroom sections offered by your school.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input
                      type="text"
                      placeholder="Add Grade (e.g. Grade 4, KG-1)"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      style={{
                        padding: '0 14px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        width: '260px',
                      }}
                    />
                    <button type="button" onClick={handleAddClass} className={styles.btnSecondary}>
                      <Plus size={16} /> Add Class
                    </button>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                      <span className={styles.tableTitle}>Configured Classes ({classesSections.classes.length})</span>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Class Name</th>
                          <th>Sections</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classesSections.classes.map((cls, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{cls.className}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {cls.sections.map((sec) => (
                                  <span key={sec} className={`${styles.badge} ${styles.badgeInfo}`}>
                                    Section {sec}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveClass(idx)}
                                className={styles.btnDanger}
                                title="Remove Class"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Step 4: Teacher & Accountant Invitations */}
              {currentStep === 4 && (
                <section aria-labelledby="step4-title">
                  <div className={styles.stepHeader}>
                    <span className={styles.stepKicker}>Step 4 of 8</span>
                    <h2 id="step4-title" className={styles.stepTitle}>Staff Invitations</h2>
                    <p className={styles.stepDesc}>
                      Invite Teachers and Accountants to collaborate in your school workspace with role-scoped permissions.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <input
                      type="text"
                      placeholder="Staff Name"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      style={{
                        padding: '0 14px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        width: '200px',
                      }}
                    />
                    <input
                      type="email"
                      placeholder="Staff Email"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      style={{
                        padding: '0 14px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        width: '220px',
                      }}
                    />
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value as 'teacher' | 'accountant')}
                      style={{
                        padding: '0 14px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        width: '140px',
                        background: '#ffffff',
                      }}
                    >
                      <option value="teacher">Teacher</option>
                      <option value="accountant">Accountant</option>
                    </select>
                    <button type="button" onClick={handleAddStaff} className={styles.btnSecondary}>
                      <Plus size={16} /> Add Invitation
                    </button>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                      <span className={styles.tableTitle}>Invited Staff Members ({staffInvitations.invitations.length})</span>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffInvitations.invitations.map((inv, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{inv.displayName}</td>
                            <td>{inv.email}</td>
                            <td>
                              <span
                                className={`${styles.badge} ${
                                  inv.roleCode === 'teacher' ? styles.badgeInfo : styles.badgeWarning
                                }`}
                              >
                                {inv.roleCode === 'teacher' ? 'Teacher' : 'Accountant'}
                              </span>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${styles.badgeWarning}`}>Pending Setup</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveStaff(idx)}
                                className={styles.btnDanger}
                                title="Remove Invitation"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Step 5: Student Enrollment & CSV Import */}
              {currentStep === 5 && (
                <section aria-labelledby="step5-title">
                  <div className={styles.stepHeader}>
                    <span className={styles.stepKicker}>Step 5 of 8</span>
                    <h2 id="step5-title" className={styles.stepTitle}>Student Enrollment</h2>
                    <p className={styles.stepDesc}>
                      Add students individually or bulk import a validated CSV spreadsheet.
                    </p>
                  </div>

                  {/* Bulk CSV Import Box */}
                  <div className={styles.csvUploadBox} onClick={handleCsvImportSample}>
                    <Upload size={32} className={styles.csvIcon} />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                      Import Students from Validated CSV
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Choose a CSV file to validate students and linked guardians. Save each step to persist the records.
                    </div>
                  </div>

                  {csvUploadError && (
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        borderRadius: '10px',
                        fontSize: '12px',
                        marginBottom: '16px',
                      }}
                    >
                      {csvUploadError}
                    </div>
                  )}

                  {/* Manual Student Addition */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <input
                      type="text"
                      placeholder="Student ID (e.g. STU-104)"
                      value={newStudentReg}
                      onChange={(e) => setNewStudentReg(e.target.value)}
                      style={{
                        padding: '0 14px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        width: '180px',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      style={{
                        padding: '0 14px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        width: '200px',
                      }}
                    />
                    <select
                      value={newStudentClass}
                      onChange={(e) => setNewStudentClass(e.target.value)}
                      style={{
                        padding: '0 14px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        width: '130px',
                        background: '#ffffff',
                      }}
                    >
                      {classesSections.classes.map((c) => (
                        <option key={c.className} value={c.className}>
                          {c.className}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newStudentSection}
                      onChange={(e) => setNewStudentSection(e.target.value)}
                      style={{
                        padding: '0 14px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        width: '110px',
                        background: '#ffffff',
                      }}
                    >
                      <option value="A">Sec A</option>
                      <option value="B">Sec B</option>
                    </select>
                    <button type="button" onClick={handleAddStudent} className={styles.btnSecondary}>
                      <Plus size={16} /> Enroll
                    </button>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                      <span className={styles.tableTitle}>Enrolled Students ({studentEnrollment.students.length})</span>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Student ID</th>
                          <th>Full Name</th>
                          <th>Class</th>
                          <th>Section</th>
                          <th>PIN Provisioning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentEnrollment.students.map((stu, idx) => (
                          <tr key={idx}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                              {stu.registrationNumber}
                            </td>
                            <td style={{ fontWeight: 600 }}>{stu.fullName}</td>
                            <td>{stu.className}</td>
                            <td>Section {stu.sectionName}</td>
                            <td>
                              <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                Separate PINs Ready
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Step 6: Parent/Guardian Linking */}
              {currentStep === 6 && (
                <section aria-labelledby="step6-title">
                  <div className={styles.stepHeader}>
                    <span className={styles.stepKicker}>Step 6 of 8</span>
                    <h2 id="step6-title" className={styles.stepTitle}>Parent & Guardian Linking</h2>
                    <p className={styles.stepDesc}>
                      Verify student-guardian relationships. Parents authenticate using their Student ID + Parent PIN.
                    </p>
                  </div>

                  <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                      <span className={styles.tableTitle}>Verified Guardian Links ({guardianLinking.guardians.length})</span>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Student ID</th>
                          <th>Guardian Name</th>
                          <th>Contact Phone</th>
                          <th>Relationship</th>
                          <th>Parent PIN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guardianLinking.guardians.map((g, idx) => (
                          <tr key={idx}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                              {g.studentRegistrationNumber}
                            </td>
                            <td style={{ fontWeight: 600 }}>{g.guardianName}</td>
                            <td>{g.contactNumber}</td>
                            <td>
                              <span className={`${styles.badge} ${styles.badgeInfo}`}>{g.relationship}</span>
                            </td>
                            <td>
                              <span className={`${styles.badge} ${styles.badgeSuccess}`}>Generated</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Step 7: Student Portal Activation */}
              {currentStep === 7 && (
                <section aria-labelledby="step7-title">
                  <div className={styles.stepHeader}>
                    <span className={styles.stepKicker}>Step 7 of 8</span>
                    <h2 id="step7-title" className={styles.stepTitle}>Student Portal Activation & Free Trial</h2>
                    <p className={styles.stepDesc}>
                      Activate student accounts. Per confirmed rule, the 10-day (240-hour) free trial begins
                      at the moment of portal activation.
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '12px',
                      color: '#1e40af',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      marginBottom: '20px',
                    }}
                  >
                    <strong>Confirmed 10-Day Trial Rule:</strong> Free trial timestamps are initiated strictly
                    upon student portal activation, never at registration, CSV import, or school approval.
                    Repeated activations will never reset this immutable 240-hour period.
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={handleToggleActivateAll}
                      className={styles.btnSecondary}
                    >
                      {portalActivation.activatedStudentRegistrationNumbers.length === studentEnrollment.students.length
                        ? 'Deselect All'
                        : 'Activate All Students'}
                    </button>
                  </div>

                  <div className={styles.tableCard}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>Activate</th>
                          <th>Student ID</th>
                          <th>Student Name</th>
                          <th>Class</th>
                          <th>Portal Status</th>
                          <th>Trial Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentEnrollment.students.map((stu) => {
                          const isActivated = portalActivation.activatedStudentRegistrationNumbers.includes(
                            stu.registrationNumber
                          );
                          return (
                            <tr key={stu.registrationNumber}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isActivated}
                                  onChange={() => handleToggleStudentPortal(stu.registrationNumber)}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                                {stu.registrationNumber}
                              </td>
                              <td style={{ fontWeight: 600 }}>{stu.fullName}</td>
                              <td>
                                {stu.className} - {stu.sectionName}
                              </td>
                              <td>
                                <span
                                  className={`${styles.badge} ${
                                    isActivated ? styles.badgeSuccess : styles.badgeWarning
                                  }`}
                                >
                                  {isActivated ? 'Active' : 'Pending Activation'}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`${styles.badge} ${
                                    isActivated ? styles.badgeInfo : styles.badgeWarning
                                  }`}
                                >
                                  {isActivated ? '240 Hours Free Trial' : 'Trial Not Started'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Step 8: Setup Completion */}
              {currentStep === 8 && (
                <section aria-labelledby="step8-title">
                  <div className={styles.stepHeader}>
                    <span className={styles.stepKicker}>Step 8 of 8</span>
                    <h2 id="step8-title" className={styles.stepTitle}>Review & Complete Onboarding</h2>
                    <p className={styles.stepDesc}>
                      Review your school setup summary before finalizing configuration.
                    </p>
                  </div>

                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}><Building2 size={20} /></div>
                      <div>
                        <div className={styles.summaryNum}>{profile.schoolCode}</div>
                        <div className={styles.summaryLabel}>School Code</div>
                      </div>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}><Calendar size={20} /></div>
                      <div>
                        <div className={styles.summaryNum}>{academicYear.label}</div>
                        <div className={styles.summaryLabel}>Academic Session</div>
                      </div>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}><Layers size={20} /></div>
                      <div>
                        <div className={styles.summaryNum}>{setupSummary.totalClasses}</div>
                        <div className={styles.summaryLabel}>Grades Configured</div>
                      </div>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}><Users size={20} /></div>
                      <div>
                        <div className={styles.summaryNum}>{setupSummary.totalStaff}</div>
                        <div className={styles.summaryLabel}>Staff Invitations</div>
                      </div>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}><GraduationCap size={20} /></div>
                      <div>
                        <div className={styles.summaryNum}>{setupSummary.totalStudents}</div>
                        <div className={styles.summaryLabel}>Enrolled Students</div>
                      </div>
                    </div>
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}><Zap size={20} /></div>
                      <div>
                        <div className={styles.summaryNum}>{setupSummary.activatedStudents}</div>
                        <div className={styles.summaryLabel}>Portals Activated</div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '18px 24px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      marginTop: '20px',
                    }}
                  >
                    <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 700 }}>
                      Payment-Deferred Launch Mode Active
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                      Your school is running under payment-deferred launch mode. All student and parent features
                      are fully accessible without requiring live payment transactions. 10-day free trial timestamps
                      are recorded securely and will transition seamlessly when paid billing goes live.
                    </p>
                  </div>
                </section>
              )}

              {/* Wizard Footer Controls */}
              <footer className={styles.footerActions}>
                <div>
                  {currentStep > 1 && (
                    <button type="button" onClick={handlePrevStep} className={styles.btnBack}>
                      <ArrowLeft size={16} /> Back
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button type="button" onClick={handleSaveDraft} className={styles.btnSaveDraft}>
                    Save Draft & Resume Later
                  </button>

                  {currentStep < 8 ? (
                    <button type="button" onClick={handleNextStep} className={styles.btnNext}>
                      Continue <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button type="button" onClick={handleCompleteSetup} className={styles.btnNext}>
                      <CheckCircle2 size={18} /> Finalize & Launch School
                    </button>
                  )}
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

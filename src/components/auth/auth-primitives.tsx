'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
} from 'lucide-react';
import styles from './auth-shell.module.css';

export function AuthField({
  id,
  label,
  hint,
  action,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && (
        <small id={`${id}-hint`} className={styles.hint}>
          {hint}
        </small>
      )}
    </div>
  );
}

export function AuthInput({
  icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  readonly icon?: ReactNode;
}) {
  return (
    <div className={styles.inputWrap}>
      {icon && (
        <span className={styles.inputIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <input
        {...props}
        className={`${styles.input} ${icon ? styles.inputWithIcon : ''} ${className}`}
      />
    </div>
  );
}

export function AuthPasswordInput({
  icon,
  showLabel = 'Show value',
  hideLabel = 'Hide value',
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  readonly icon?: ReactNode;
  readonly showLabel?: string;
  readonly hideLabel?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.inputWrap}>
      {icon && (
        <span className={styles.inputIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${styles.input} ${icon ? styles.inputWithIcon : ''} ${styles.inputWithToggle} ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className={styles.toggleBtn}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        disabled={props.disabled}
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}

export function AuthButton({
  variant = 'primary',
  loading = false,
  loadingText,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: 'primary' | 'secondary' | 'ghost';
  readonly loading?: boolean;
  readonly loadingText?: string;
}) {
  const variantClass =
    variant === 'secondary'
      ? styles.btnSecondary
      : variant === 'ghost'
        ? styles.btnGhost
        : styles.btnPrimary;

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`${variantClass} ${className}`}
    >
      {loading && <Loader2 size={17} className={styles.spinner} aria-hidden="true" />}
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
}

export function AuthAlert({
  variant = 'info',
  title,
  children,
  role,
}: {
  readonly variant?: 'info' | 'error' | 'success' | 'warning';
  readonly title?: string;
  readonly children: ReactNode;
  readonly role?: 'alert' | 'status';
}) {
  const alertClass =
    variant === 'error'
      ? styles.alertError
      : variant === 'success'
        ? styles.alertSuccess
        : variant === 'warning'
          ? styles.alertWarning
          : styles.alertInfo;

  const Icon =
    variant === 'error'
      ? AlertCircle
      : variant === 'success'
        ? CheckCircle2
        : variant === 'warning'
          ? AlertTriangle
          : Info;

  return (
    <div
      className={`${styles.alert} ${alertClass}`}
      role={role ?? (variant === 'error' ? 'alert' : 'status')}
    >
      <Icon size={17} className={styles.alertIcon} aria-hidden="true" />
      <div>
        {title && <strong className={styles.alertTitle}>{title}</strong>}
        <span>{children}</span>
      </div>
    </div>
  );
}

export function AuthStrengthMeter({ password }: { readonly password: string }) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const label =
    !password
      ? 'Minimum 12 characters'
      : score <= 1
        ? 'Weak (use 12+ chars)'
        : score === 2
          ? 'Fair'
          : score === 3
            ? 'Good'
            : 'Strong';

  const color =
    !password
      ? '#e2e8f0'
      : score <= 1
        ? '#ef4444'
        : score === 2
          ? '#f59e0b'
          : score === 3
            ? '#3b82f6'
            : '#10b981';

  return (
    <div className={styles.strengthWrap} aria-live="polite">
      <div className={styles.strengthBars} aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={styles.strengthBar}
            style={{ backgroundColor: score >= step ? color : '#e2e8f0' }}
          />
        ))}
      </div>
      <div className={styles.strengthLabel}>
        <span>Password strength</span>
        <span style={{ color: password ? color : '#64748b' }}>{label}</span>
      </div>
    </div>
  );
}

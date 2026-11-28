export type SettingsTab = 'profile' | 'academics' | 'timezone' | 'security';

export interface SchoolProfile {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly displayName?: string;
  readonly status: 'active' | 'suspended' | 'onboarding';
  readonly timezone: string | null;
  readonly timezoneVerified: boolean;
  readonly timezoneVerifiedAt: string | null;
  readonly schoolLocalDate: string | null;
  readonly schoolLocalTime: string | null;
  readonly timezoneOffsetLabel: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AcademicYearSetting {
  readonly id: string;
  readonly label: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly isCurrent: boolean;
}

export interface SecuritySettings {
  readonly role: string;
  readonly schoolId: string;
  readonly schoolCode: string;
  readonly permissions: readonly string[];
  readonly hasRecentPassword: boolean;
  readonly assuranceLevel: string;
  readonly sessionExpiresAt: number;
}

export type SchoolSettingsPage =
  | { readonly kind: 'denied'; readonly reason: string }
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'ready';
      readonly profile: SchoolProfile;
      readonly academicYears: readonly AcademicYearSetting[];
      readonly security: SecuritySettings;
      readonly activeTab: SettingsTab;
      readonly canWriteSettings: boolean;
      readonly timezoneNotice: string;
      readonly academicNotice: string;
    };

export interface SettingsActionResult {
  readonly ok: boolean;
  readonly message: string;
}

export function validateSchoolName(name: string): { isValid: boolean; message?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 160) {
    return { isValid: false, message: 'School name must be between 3 and 160 characters.' };
  }
  if (!/^[\p{L}\p{M}\p{N} .'&(),-]*$/u.test(trimmed)) {
    return { isValid: false, message: 'School name contains invalid characters.' };
  }
  return { isValid: true };
}

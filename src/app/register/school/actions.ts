'use server';

import { validateSchoolRegistration } from '@/lib/onboarding/service';
import { submitRegistration } from '@/lib/onboarding/database';
import type { SchoolRegistrationInput } from '@/lib/onboarding/types';

export interface RegistrationActionState {
  status: 'idle' | 'success' | 'error';
  registrationId?: string;
  schoolCode?: string;
  message?: string;
  errors?: Record<string, string>;
}

export async function registerSchoolAction(
  _prevState: RegistrationActionState,
  formData: FormData
): Promise<RegistrationActionState> {
  const input: SchoolRegistrationInput = {
    schoolName: (formData.get('schoolName') as string || '').trim(),
    schoolCode: (formData.get('schoolCode') as string || '').trim().toUpperCase(),
    schoolEmail: (formData.get('schoolEmail') as string || '').trim(),
    contactNumber: (formData.get('contactNumber') as string || '').trim(),
    addressLine: (formData.get('addressLine') as string || '').trim(),
    city: (formData.get('city') as string || '').trim(),
    state: (formData.get('state') as string || '').trim(),
    postalCode: (formData.get('postalCode') as string || '').trim(),
    adminName: (formData.get('adminName') as string || '').trim(),
    adminEmail: (formData.get('adminEmail') as string || '').trim(),
  };

  const validation = validateSchoolRegistration(input);
  if (!validation.isValid) {
    return {
      status: 'error',
      errors: validation.errors,
      message: 'Please resolve the highlighted validation errors.',
    };
  }

  try {
    const result = await submitRegistration(input);
    return {
      status: 'success',
      registrationId: result.registration_id,
      schoolCode: result.school_code,
      message: 'Registration application submitted successfully! Your application is pending verification.',
    };
  } catch {
    const message = 'Registration is unavailable. Please try again later.';
    return {
      status: 'error',
      message,
    };
  }
}

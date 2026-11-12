'use server';

import { redirect } from 'next/navigation';
import { LIVE_AUTHENTICATION_ENABLED } from '@/lib/auth/authentication-flow';
import {
  authenticateStudentPin,
  GENERIC_PIN_ERROR,
  LIVE_PIN_DISABLED_MESSAGE,
} from '@/lib/auth/pin-service';

export interface StudentActionState {
  readonly phase: 'idle' | 'error' | 'success';
  readonly message: string;
}

export const INITIAL_STUDENT_STATE: StudentActionState = {
  phase: 'idle',
  message: '',
};

export async function loginStudent(
  _previous: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const studentId = formData.get('studentId');
  const pin = formData.get('pin');
  const schoolCode = formData.get('schoolCode');

  // Strict check on live authentication feature flag
  if (!LIVE_AUTHENTICATION_ENABLED) {
    // If feature flag is off, live credential validation is disabled
    return {
      phase: 'error',
      message: LIVE_PIN_DISABLED_MESSAGE,
    };
  }

  try {
    const result = await authenticateStudentPin(studentId, pin, '127.0.0.1', schoolCode);
    if (!result.success) {
      return {
        phase: 'error',
        message: result.error || GENERIC_PIN_ERROR,
      };
    }

    // When successful, redirect to student workspace
    redirect('/portal/student');
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return {
      phase: 'error',
      message: GENERIC_PIN_ERROR,
    };
  }
}

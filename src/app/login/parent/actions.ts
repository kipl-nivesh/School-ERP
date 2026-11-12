'use server';

import { redirect } from 'next/navigation';
import { LIVE_AUTHENTICATION_ENABLED } from '@/lib/auth/authentication-flow';
import {
  authenticateParentPin,
  GENERIC_PIN_ERROR,
  LIVE_PIN_DISABLED_MESSAGE,
} from '@/lib/auth/pin-service';

export interface ParentActionState {
  readonly phase: 'idle' | 'error' | 'success';
  readonly message: string;
}

export const INITIAL_PARENT_STATE: ParentActionState = {
  phase: 'idle',
  message: '',
};

export async function loginParent(
  _previous: ParentActionState,
  formData: FormData
): Promise<ParentActionState> {
  const studentId = formData.get('studentId');
  const pin = formData.get('pin');
  const schoolCode = formData.get('schoolCode');

  // Strict check on live authentication feature flag
  if (!LIVE_AUTHENTICATION_ENABLED) {
    return {
      phase: 'error',
      message: LIVE_PIN_DISABLED_MESSAGE,
    };
  }

  try {
    const result = await authenticateParentPin(studentId, pin, '127.0.0.1', schoolCode);
    if (!result.success) {
      return {
        phase: 'error',
        message: result.error || GENERIC_PIN_ERROR,
      };
    }

    // Redirect to parent workspace upon success
    redirect('/portal/parent');
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

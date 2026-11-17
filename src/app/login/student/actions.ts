'use server';

export interface StudentActionState {
  readonly phase: 'idle' | 'error' | 'success';
  readonly message: string;
}

export const INITIAL_STUDENT_STATE: StudentActionState = {
  phase: 'idle',
  message: '',
};

export async function loginStudent(): Promise<StudentActionState> {
  // The legacy verifier cannot establish a provider-issued Student session.
  return { phase: 'error', message: 'Student sign-in is currently unavailable.' };
}

'use server';

export interface ParentActionState {
  readonly phase: 'idle' | 'error' | 'success';
  readonly message: string;
}

export const INITIAL_PARENT_STATE: ParentActionState = {
  phase: 'idle',
  message: '',
};

export async function loginParent(): Promise<ParentActionState> {
  // A development PIN match cannot establish a provider-issued Parent session.
  return { phase: 'error', message: 'Parent sign-in is currently unavailable.' };
}

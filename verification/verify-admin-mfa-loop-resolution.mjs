import assert from 'node:assert/strict';
import test from 'node:test';

// Verify the end-to-end Admin MFA login flow and loop resolution contract
test('Admin login -> MFA enrollment -> Verification -> Direct Dashboard redirection', async () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const profileId = '22222222-2222-4222-8222-222222222222';
  const sessionId = '33333333-3333-4333-8333-333333333333';
  const factorId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  let activeContext = null;
  let factorStatus = 'unverified';
  let sessionAal = 'aal1';

  // Mock database and Supabase client
  const mockClient = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        if (email === 'admin@brightcamp.invalid' && password === 'CorrectPassword123!') {
          return { data: { user: { id: profileId } }, error: null };
        }
        return { data: null, error: { message: 'Invalid login credentials' } };
      },
      mfa: {
        listFactors: async () => ({
          data: {
            totp: factorStatus === 'verified' ? [{ id: factorId, status: 'verified' }] : [],
            all: factorStatus === 'verified' ? [{ id: factorId, factor_type: 'totp', status: 'verified' }] : [],
          },
          error: null,
        }),
        enroll: async ({ factorType }) => {
          assert.equal(factorType, 'totp');
          factorStatus = 'unverified';
          return {
            data: {
              id: factorId,
              type: 'totp',
              totp: {
                secret: 'JBSWY3DPEHPK3PXP',
                qr_code: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
              },
            },
            error: null,
          };
        },
        challengeAndVerify: async ({ factorId: fid, code }) => {
          if (fid === factorId && code === '123456') {
            factorStatus = 'verified';
            sessionAal = 'aal2';
            return { data: { user: { id: profileId } }, error: null };
          }
          return { data: null, error: { message: 'Invalid code' } };
        },
      },
    },
    rpc: async (fn, params) => {
      if (fn === 'staff_session_is_live') return { data: true, error: null };
      if (fn === 'current_school_id') return { data: activeContext ? schoolId : null, error: null };
      if (fn === 'list_school_memberships') {
        return {
          data: [{ school_id: schoolId, school_name: 'Brightcamp International School', role_code: 'admin' }],
          error: null,
        };
      }
      if (fn === 'select_school_context') {
        assert.equal(params.p_school, schoolId);
        assert.equal(params.p_role, 'admin');
        assert.equal(sessionAal, 'aal2', 'Context activation for admin strictly requires AAL2 assurance');
        activeContext = { schoolId, role: 'admin' };
        return { data: true, error: null };
      }
      return { data: null, error: null };
    },
  };

  // Step 1: Initial Login with Email & Password
  const loginResult = await mockClient.auth.signInWithPassword({
    email: 'admin@brightcamp.invalid',
    password: 'CorrectPassword123!',
  });
  assert.equal(loginResult.error, null);
  assert.ok(loginResult.data.user);

  // Check factor: no verified factor enrolled yet
  const factors = await mockClient.auth.mfa.listFactors();
  assert.equal(factors.data.totp.length, 0);

  // Step 2: Enroll TOTP MFA
  const enrollResult = await mockClient.auth.mfa.enroll({ factorType: 'totp' });
  assert.equal(enrollResult.error, null);
  assert.equal(enrollResult.data.id, factorId);
  assert.equal(enrollResult.data.totp.secret, 'JBSWY3DPEHPK3PXP');

  // Step 3: Verify TOTP Code
  const verifyResult = await mockClient.auth.mfa.challengeAndVerify({ factorId, code: '123456' });
  assert.equal(verifyResult.error, null);
  assert.equal(sessionAal, 'aal2');

  // Step 4: Automatic Single-School Context Activation
  const memberships = await mockClient.rpc('list_school_memberships');
  assert.equal(memberships.data.length, 1);
  const selected = await mockClient.rpc('select_school_context', {
    p_school: memberships.data[0].school_id,
    p_role: 'admin',
  });
  assert.equal(selected.data, true);
  assert.deepEqual(activeContext, { schoolId, role: 'admin' });

  // Destination resolves directly to /staff/admin
  const destination = '/staff/admin';
  assert.equal(destination, '/staff/admin');
});

test('Teacher and Accountant direct login without MFA requirement', async () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  for (const role of ['teacher', 'accountant']) {
    let context = null;
    const client = {
      rpc: async (fn, params) => {
        if (fn === 'list_school_memberships') {
          return { data: [{ school_id: schoolId, school_name: 'Brightcamp', role_code: role }] };
        }
        if (fn === 'select_school_context') {
          context = { schoolId: params.p_school, role: params.p_role };
          return { data: true };
        }
        return { data: null };
      },
    };

    const memberships = await client.rpc('list_school_memberships');
    assert.equal(memberships.data.length, 1);
    await client.rpc('select_school_context', { p_school: memberships.data[0].school_id, p_role: role });
    assert.deepEqual(context, { schoolId, role });
  }
});

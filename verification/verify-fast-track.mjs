import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

globalThis.fetch = () => { throw new Error('Network forbidden in offline regression tests'); };
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const loaded = { exports: {} }; cache.set(file,loaded.exports);
  const output = ts.transpileModule(fs.readFileSync(file,'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = name => {
    if (name === 'server-only') return {};
    if (!name.startsWith('.')) throw new Error('Unexpected dependency: '+name);
    return load(path.resolve(path.dirname(file),name+'.ts'));
  };
  new Function('require','module','exports',output)(localRequire,loaded,loaded.exports);
  return loaded.exports;
}
const { assertPreviewContext } = load('src/lib/services/preview-boundary.ts');
const { SchoolAdminSupabaseService: admin, AccountantSupabaseService: accountant, TeacherSupabaseService: teacher, setSupabaseClientFactory } = load('src/lib/services/supabase-dal.ts');
const now=Date.now();
const context = {
  source:'verified-server-session',schoolId:'school-fixture',profileId:'actor',accountStatus:'active',credentialResetRequired:false,
  authorizationVersion:1,currentAuthorizationVersion:1,
  session:{id:'session',profileId:'actor',verifiedAt:now,authenticatedAt:now,expiresAt:now+600000,revoked:false,assurance:'aal2',reauthenticatedAt:now},
  activeRole:{sessionId:'session',profileId:'actor',role:'admin',assignmentId:'member',version:1,currentVersion:1,expiresAt:now+600000,revoked:false},
  assignments:[{id:'member',profileId:'actor',role:'admin',status:'active',validFrom:now-1000,validUntil:null,permissions:['dashboard.admin.view','admissions.write','payments.record','security.accounts.create']}],
};
test('tenant-bound session cannot enter preview adapter',()=>assert.throws(()=>assertPreviewContext(context)));
test('legacy fictional preview remains available',()=>assert.doesNotThrow(()=>assertPreviewContext({...context,schoolId:undefined})));
test('admission performs one atomic command, no table writes',async()=>{
  const calls=[];
  setSupabaseClientFactory(async()=>({rpc:async(name,args)=>{calls.push([name,args]);return {data:{id:'student-fixture',admissionNumber:'synthetic-admission'},error:null};},from:()=>{throw Error('Non-atomic write');}}));
  const result=await admin.createStudentAdmission(context,{fullName:'Synthetic Student',requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
  assert.equal(result.success,true); assert.equal(calls.length,1); assert.equal(calls[0][0],'admit_student_idempotent');
  assert.equal(calls[0][1].p_request_id,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.equal('requestId' in calls[0][1].p_input,false);
});
test('failed admission is not reported as success',async()=>{
  setSupabaseClientFactory(async()=>({rpc:async()=>({data:null,error:{message:'internal detail'}})}));
  const result=await admin.createStudentAdmission(context,{requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
  assert.equal(result.success,false);assert.ok(!result.error.includes('internal detail'));
});
test('unauthorized admission never acquires a database client',async()=>{
  setSupabaseClientFactory(async()=>{throw Error('Should not acquire client');});
  const result=await admin.createStudentAdmission(null,{});assert.equal(result.code,'PERMISSION_DENIED');
});
test('staff creation cannot report a fictional provisioned account',async()=>{
  setSupabaseClientFactory(async()=>{throw Error('No account provider');});
  const result=await admin.createStaffAccount(context,{fullName:'Synthetic Staff',email:'staff@example.invalid'});
  assert.equal(result.success,false);assert.equal(result.code,'INVITATION_REQUIRED');
});
for(const status of ['settled','idempotent_duplicate']) test(`payment accepts actual ${status} RPC contract`,async()=>{
  setSupabaseClientFactory(async()=>({rpc:async()=>({data:{status,payment_id:'payment-fixture',receipt_number:'TEST-RECEIPT'},error:null})}));
  const result=await accountant.collectPayment(context,{studentId:'student',invoiceId:'invoice',amountPaise:100,paymentMethod:'cash',transactionReference:'synthetic',idempotencyKey:'synthetic-key'});
  assert.equal(result.success,true);
});
test('unknown payment status fails closed',async()=>{
  setSupabaseClientFactory(async()=>({rpc:async()=>({data:{success:true,status:'pending'},error:null})}));
  const result=await accountant.collectPayment(context,{studentId:'student',amountPaise:100,paymentMethod:'cash',transactionReference:'synthetic',idempotencyKey:'synthetic-key'});
  assert.equal(result.success,false);
});
test('migration contract: explicit missing-context denial and correct receipt sequence',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261111001700_financial_authorization_hardening.sql','utf8');
  assert.match(sql,/v_school is null or v_role is null/);
  assert.match(sql,/fee_payments_receipt_seq/);assert.doesNotMatch(sql,/public\.receipt_number_seq/);
  assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/for update/);
});
test('migration contract: contact draft never grants guardian access',()=>{
  const sql=fs.readFileSync('supabase/migrations/20261111001900_atomic_student_admission.sql','utf8');
  assert.match(sql,/'pending',false,false/);assert.match(sql,/section\.academic_year_id/);
  assert.match(sql,/'pending_activation'/);
});
// SQL string assertions are review checks, NOT PostgreSQL execution or RLS proof.
const { completeRecovery, recoveryOrigin } = load('src/lib/staff/recovery.ts');
const recoveryInput = { code:'synthetic-recovery-code',password:'Fictional-password-123',confirmation:'Fictional-password-123',totp:'123456' };
function recoveryDeps(overrides={}) {
  const calls=[];
  return { calls, deps:{
    exchange:async()=>{calls.push('exchange');return {userId:'fixture',recovery:true};},
    confirmedUser:async()=> 'fixture',staffScope:async()=>({requiresMfa:false}),factors:async()=>[],
    verifyFactor:async()=>{calls.push('mfa');return true;},
    updatePassword:async()=>{calls.push('update');return true;},
    signOut:async scope=>{calls.push(scope);return true;},...overrides,
  }};
}
test('recovery changes password only after verified recovery and globally signs out',async()=>{
  const {calls,deps}=recoveryDeps();assert.equal((await completeRecovery(recoveryInput,deps)).ok,true);
  assert.deepEqual(calls,['exchange','update','global','local']);
});
for(const [name,overrides] of [
  ['ordinary login code',{exchange:async()=>({userId:'fixture',recovery:false})}],
  ['mismatched user',{confirmedUser:async()=> 'other'}],
  ['unconfirmed user',{confirmedUser:async()=> null}],
  ['ineligible staff',{staffScope:async()=> null}],
  ['admin without factor',{staffScope:async()=>({requiresMfa:true})}],
  ['failed MFA',{factors:async()=>[{id:'factor',type:'totp',verified:true}],verifyFactor:async()=>false}],
  ['unsupported factor',{factors:async()=>[{id:'factor',type:'phone',verified:true}]}],
  ['replayed code',{exchange:async()=>{throw Error('private provider error');}}],
]) test(`recovery denies ${name} without changing password`,async()=>{
  const {calls,deps}=recoveryDeps(overrides);const result=await completeRecovery(recoveryInput,deps);
  assert.equal(result.ok,false);assert.equal(calls.includes('update'),false);assert.equal(result.message.includes('private'),false);assert.ok(calls.includes('local'));
});
test('enrolled MFA verifies before password update',async()=>{
  const {calls,deps}=recoveryDeps({staffScope:async()=>({requiresMfa:true}),factors:async()=>[{id:'factor',type:'totp',verified:true}]});
  assert.equal((await completeRecovery(recoveryInput,deps)).ok,true);assert.ok(calls.indexOf('mfa')<calls.indexOf('update'));
});
test('password mismatch never exchanges a code',async()=>{
  const {calls,deps}=recoveryDeps();assert.equal((await completeRecovery({...recoveryInput,confirmation:'different'},deps)).ok,false);assert.deepEqual(calls,[]);
});
test('global signout failure reports a changed password without claiming revocation',async()=>{
  const {deps}=recoveryDeps({signOut:async scope=>scope!=='global'});const result=await completeRecovery(recoveryInput,deps);
  assert.equal(result.ok,false);assert.match(result.message,/Password changed/);assert.match(result.message,/revocation could not be confirmed/);
});
for(const origin of ['http://school.example','https://user:pass@school.example','https://school.example/path','https://school.example?next=other','https://school.example#other',' https://school.example'])
  test('recovery origin rejects unsafe configured URL '+origin.split(':')[0],()=>assert.equal(recoveryOrigin(origin,true),null));
test('recovery origin permits exact HTTPS and development loopback only',()=>{
  assert.equal(recoveryOrigin('https://school.example',true),'https://school.example');
  assert.equal(recoveryOrigin('http://127.0.0.1:3000',false),'http://127.0.0.1:3000');
  assert.equal(recoveryOrigin('http://127.0.0.1:3000',true),null);
});
const management = load('src/lib/services/management-contracts.ts');
test('management rejects inherited kinds and excludes client-supplied authority fields',()=>{
  assert.equal(management.isManagementKind('__proto__'),false);
  const form=new FormData();form.set('name','Synthetic class');form.set('school_id','foreign-school');form.set('actor','another-user');
  assert.deepEqual(management.managementPayload('class',form),{name:'Synthetic class'});
  form.set('name','');assert.equal(management.managementPayload('class',form),null);
});
const managementActionJs=ts.transpileModule(fs.readFileSync('src/app/staff/management-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const makeManagementAction=new Function('staffWorkspaceWritesEnabled','getStaffAccess','staffClient','evaluatePermission','isManagementKind','isRecordId','managementPayload','revalidatePath',managementActionJs+';return manageAcademicRecord;');
for(const allow of [false,true]) test(`dormant management action with mocked write gate ${allow?'persists through RPC':'denies before database access'}`,async()=>{
  let calls=0;
  const action=makeManagementAction(()=>true,async()=>({role:'admin',context}),async()=>({rpc:async(name,args)=>{
    calls++;assert.equal(name,'manage_academics');assert.equal('school_id' in args,false);return {data:{id:args.p_id},error:null};
  }}),()=>({allowed:allow}),management.isManagementKind,management.isRecordId,management.managementPayload,()=>{});
  const form=new FormData();form.set('kind','class');form.set('name','Synthetic class');form.set('recordId','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');form.set('requestId','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  const result=await action({ok:false,message:''},form);assert.equal(result.ok,allow);assert.equal(calls,allow?1:0);
});
test('all migration function dollar delimiters are paired and not single dollar',()=>{
  for(const file of fs.readdirSync('supabase/migrations').filter(name=>name.endsWith('.sql'))) {
    const source=fs.readFileSync(path.join('supabase/migrations',file),'utf8');
    assert.doesNotMatch(source,/\bas\s+\$(?!\$|[a-z_])/i,file);
    assert.doesNotMatch(source,/^\$;/m,file);
    assert.equal((source.match(/\$\$/g)??[]).length%2,0,file);
  }
});
test('admission requires a retry identifier before invoking the command',async()=>{
  let called=false;
  setSupabaseClientFactory(async()=>({rpc:async()=>{called=true;throw Error('Unexpected call');}}));
  assert.equal((await admin.createStudentAdmission(context,{})).success,false);assert.equal(called,false);
});
const {executeAcademic}=load('src/lib/services/academic-commands.ts');
const academicContext={...context,assignments:[{...context.assignments[0],permissions:['dashboard.admin.view','attendance.write','homework.write']}]};
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const attendance={kind:'attendance',section:id,student:id,status:'present',remarks:''};
const homework={kind:'homework',id,section:id,subject:'MAT',title:'Synthetic assignment',description:'Fictional exercise',due:'2026-12-01',points:10};
for(const input of [attendance,homework]) {
  test(`${input.kind}: fresh authorized context scopes the command`,async()=>{
    let calls=0;
    assert.equal(await executeAcademic(input,{context:async()=>academicContext,execute:async(name,args)=>{
      calls++;assert.equal(args.p_school_id,'school-fixture');
      assert.equal(name,input.kind==='attendance'?'save_attendance_atomic':'create_homework_atomic');
      return {data:input.kind==='attendance'?1:id,error:null};
    }}),true);assert.equal(calls,1);
  });
  test(`${input.kind}: permission denial does not call database`,async()=>{
    assert.equal(await executeAcademic(input,{context:async()=>context,execute:async()=>{throw Error('Unexpected command');}}),false);
  });
  test(`${input.kind}: error and unexpected result never report success`,async()=>{
    for(const result of [{data:null,error:{}},{data:'unexpected',error:null}])
      assert.equal(await executeAcademic(input,{context:async()=>academicContext,execute:async()=>result}),false);
  });
  test(`${input.kind}: invalid section denied before authorization or network`,async()=>{
    assert.equal(await executeAcademic({...input,section:'invalid'},{context:async()=>{throw Error('Unexpected lookup');},execute:async()=>{throw Error('Unexpected command');}}),false);
  });
}

test('live marks draft and publication fail closed before acquiring a client', async () => {
  setSupabaseClientFactory(() => assert.fail('Unexpected marks client creation'));
  for (const result of [await teacher.recordMarksDraft(context, {}), await teacher.publishMarks(context, id, id)]) {
    assert.equal(result.success, false);
    assert.equal(result.code, 'LIVE_MARKS_WRITE_UNAVAILABLE');
  }
});

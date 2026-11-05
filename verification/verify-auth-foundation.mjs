import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// In-memory module loader follows the existing verification convention. No generated files.
const urls=new Map();
function moduleURL(filename) {
  const resolved=path.resolve(filename);
  if(urls.has(resolved)) return urls.get(resolved);
  let js=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
  js=js.replace(/(from\s*|import\s*)(['"])(\.[^'"]+)\2/g,(_,prefix,quote,specifier)=>{
    let dependency=path.resolve(path.dirname(resolved),specifier);
    if(!path.extname(dependency)) dependency+='.ts';
    return prefix+JSON.stringify(moduleURL(dependency));
  });
  const url='data:text/javascript;base64,'+Buffer.from(js).toString('base64');
  urls.set(resolved,url);return url;
}
const auth=await import(moduleURL('src/lib/auth/index.ts'));
const NOW=Date.UTC(2026,10,5,10);
let checks=0;
const test=(name,run)=>{run();checks++;console.log('PASS: '+name);};
const policy={status:'school-approved',policyId:'synthetic-format-policy',maximumLength:32,acceptsExactValue:value=>/^[A-Za-z0-9-]+$/.test(value)};
// Transient format vectors only: not issued/assigned credentials, never logged or persisted in snapshots.
const vector=(n)=>'8'.repeat(n);
test('Six ASCII digits format only',()=>assert.equal(auth.isSixDigitPinFormat(vector(6)),true));
test('Leading zero remains a string',()=>assert.equal(auth.isSixDigitPinFormat('0'+vector(5)),true));
for(const [name,value] of [['five',vector(5)],['seven',vector(7)],['letters','x'.repeat(6)],['space',' '+vector(5)],['newline',vector(6)+'\n'],['Unicode',String.fromCharCode(0xff18).repeat(6)],['empty',''],['number',8],['null',null]])test('PIN format rejects '+name,()=>assert.equal(auth.isSixDigitPinFormat(value),false));
test('Registration is preserved exactly under explicit synthetic school policy',()=>{const result=auth.normalizeRegistrationNumber('Ab-00X',policy);assert.equal(result.accepted,true);assert.equal(result.value,'Ab-00X');});
for(const [name,value] of [['empty',''],['excessive','A'.repeat(129)],['control','A\u0000B'],['Unicode','A'+String.fromCharCode(0x212a)],['whitespace',' A '],['nonstring',42]])test('Registration rejects '+name,()=>assert.equal(auth.normalizeRegistrationNumber(value,policy).accepted,false));
test('Unknown school format never gets silently approved',()=>assert.equal(auth.normalizeRegistrationNumber('Ab-00X').reason,'registration_policy_unconfirmed'));
test('No case folding or unknown format guess',()=>{const upper={...policy,acceptsExactValue:v=>/^[A-Z-]+$/.test(v)};assert.equal(auth.normalizeRegistrationNumber('Ab',upper).accepted,false);assert.equal(auth.normalizeRegistrationNumber('AB',upper).accepted,true);});
test('Malformed or throwing school policy fails closed',()=>{for(const p of [{...policy,maximumLength:129},{...policy,status:'unknown'},{...policy,acceptsExactValue:()=>{throw Error('synthetic failure');}}])assert.equal(auth.normalizeRegistrationNumber('AB',p).accepted,false);});
test('Input result contains no PIN or reflected secret',()=>{const accepted=auth.assessFamilyLoginInput('parent','Reg-A',vector(6),policy);assert.equal(accepted.accepted,true);assert.deepEqual(Object.keys(accepted).sort(),['accepted','policyId','registration','role']);const bad=auth.assessFamilyLoginInput('parent','Reg-A','x'.repeat(6),policy);assert.deepEqual(bad,{accepted:false,reason:'invalid_pin_format'});});
test('Only family input methods and two fields',()=>{assert.equal(auth.assessFamilyLoginInput('admin','Reg-A',vector(6),policy).accepted,false);assert.equal(auth.LOGIN_METHODS.parent_registration_pin.guardianReferenceRequired,false);assert.equal(auth.LOGIN_METHODS.parent_registration_pin.initialRelationshipPolicy,'one-student-one-parent-login');});
const provider=(subject)=>({issuer:'https://contract.invalid',subject});
function lookup(){return {source:'trusted-school-lookup',registration:'Reg-A',student:{studentId:'student-record-A',profileId:'student-profile-A',provider:provider('student-subject-A'),accountStatus:'active',enrollmentStatus:'active'},candidates:[{profileId:'parent-profile-A',provider:provider('parent-subject-A'),role:'parent',accountStatus:'active',loginEligible:true,relationshipStatus:'verified',provisionedByTier:'super_admin',provisioningStatus:'approved',loginStudentIds:['student-record-A'],relationshipVersion:2,currentRelationshipVersion:2}],complete:true,observedAt:NOW-100,expiresAt:NOW+1000,version:3,currentVersion:3};}
const resolution=(snapshot)=>auth.resolveInitialParent(snapshot,'Reg-A',NOW);
test('Exactly one provisioned active singleton Parent resolves as contract only',()=>assert.equal(resolution(lookup()).kind,'resolved_contract'));
const mutations=[
 ['zero eligible',s=>s.candidates=[]],['two eligible',s=>s.candidates.push({...s.candidates[0],profileId:'parent-profile-B',provider:provider('parent-subject-B')})],
 ['revoked link',s=>s.candidates[0].relationshipStatus='revoked'],['suspended Parent',s=>s.candidates[0].accountStatus='suspended'],['disabled Parent',s=>s.candidates[0].accountStatus='disabled'],
 ['withdrawn Student',s=>s.student.enrollmentStatus='withdrawn'],['inactive Student account',s=>s.student.accountStatus='suspended'],['missing binding',s=>s.candidates[0].provider=null],
 ['same internal profile',s=>s.candidates[0].profileId=s.student.profileId],['same provider identity',s=>s.candidates[0].provider=s.student.provider],
 ['stale relationship',s=>s.candidates[0].currentRelationshipVersion++],['stale snapshot',s=>s.currentVersion++],['conflicting reverse eligibility',s=>s.candidates[0].loginStudentIds.push('other-student')],
 ['wrong child',s=>s.candidates[0].loginStudentIds=['other-student']],['wrong role',s=>s.candidates[0].role='student'],['ordinary Admin provisioning',s=>s.candidates[0].provisionedByTier='ordinary'],
 ['unapproved provisioning',s=>s.candidates[0].provisioningStatus='pending'],['incomplete lookup',s=>s.complete=false],['registration mismatch',s=>s.registration='other'],
 ['expired lookup',s=>s.expiresAt=NOW],['duplicate candidate',s=>s.candidates.push({...s.candidates[0]})],['invalid eligibility',s=>s.candidates[0].loginEligible='true'],['malformed candidate',s=>s.candidates.push(null)],
];
for(const [name,mutate] of mutations)test('Parent resolution denies '+name,()=>{const s=lookup();mutate(s);assert.equal(resolution(s).kind,'denied');});
test('Missing trusted lookup and untrusted source deny',()=>{assert.equal(resolution(null).kind,'denied');const s=lookup();s.source='client';assert.equal(resolution(s).kind,'denied');});
test('Nonlogin guardian records do not become login identities',()=>{const s=lookup();s.candidates.push({...s.candidates[0],profileId:'nonlogin-record',loginEligible:false,provider:provider('nonlogin-subject')});assert.equal(resolution(s).kind,'resolved_contract');});
// Synthetic assumed-boundary evidence only: no tokens, secrets, sessions or real relationships created.
function attempt(role='student'){
 const map=lookup(),profileId=role==='parent'?'parent-profile-A':'student-profile-A';
 const binding={attemptId:'contract-attempt',registration:'Reg-A',profileId,role,provider:provider(role==='parent'?'parent-subject-A':'student-subject-A')};
 const identity={...binding,source:'trusted-school-identity',studentId:'student-record-A',studentProfileId:'student-profile-A',studentProvider:provider('student-subject-A'),accountStatus:'active',studentStatus:'active',provisionedByTier:'super_admin',provisioningStatus:'approved',credentialResetRequired:false,version:4,currentVersion:4,credentialVersion:2,currentCredentialVersion:2,credential:{identityProfileId:profileId,credentialId:'metadata-only-ref-'+role,role,method:role==='parent'?'parent_registration_pin':'student_registration_pin',status:'active'},observedAt:NOW-100,expiresAt:NOW+1000,parentLookup:role==='parent'?map:null};
 const session={...binding,source:'verified-provider-session',signatureVerified:true,audience:['school-contract-audience'],sessionId:'synthetic-session-reference',authenticatedAt:NOW-50,verifiedAt:NOW,expiresAt:NOW+1000,revoked:false};
 const context={source:'verified-server-session',profileId,accountStatus:'active',credentialResetRequired:false,authorizationVersion:4,currentAuthorizationVersion:4,session:{id:session.sessionId,profileId,authenticatedAt:NOW-50,verifiedAt:NOW,expiresAt:NOW+1000,revoked:false,assurance:'aal1',reauthenticatedAt:null},activeRole:{sessionId:session.sessionId,profileId,role,assignmentId:'assignment',version:1,currentVersion:1,expiresAt:NOW+1000,revoked:false},assignments:[{id:'assignment',profileId,role,status:'active',validFrom:NOW-1000,validUntil:null,permissions:[...auth.getPermissionCeiling(role)]}],superAdminPrivilege:null};
 return {attemptId:binding.attemptId,input:{accepted:true,role,registration:'Reg-A',policyId:policy.policyId},identity,admission:{...binding,source:'durable-limiter',decision:'admitted',durable:true,policyId:'synthetic-limit-policy',admittedAt:NOW-90,expiresAt:NOW+1000},credential:{...binding,source:'approved-provider',outcome:'verified',credentialId:identity.credential.credentialId,credentialVersion:2,verifiedAt:NOW-60,expiresAt:NOW+1000},session,context,parentPurpose:'academic',liveRelationshipVersion:2,relationship:role==='parent'?{guardianProfileId:profileId,studentId:identity.studentId,status:'verified',validFrom:NOW-1000,validUntil:null,academicAccess:true,feeAccess:true}:null};
}
const verificationPolicy={issuer:'https://contract.invalid',audience:'school-contract-audience'};
const evaluate=e=>auth.evaluateAuthenticationAttempt(e,verificationPolicy,NOW);
for(const role of ['student','parent'])test('Ordered '+role+' contract transition only with all assumed trusted evidence',()=>{const e=attempt(role),r=evaluate(e);assert.equal(r.state,'contract_access_granted');assert.equal(r.completed.length,8);assert.equal(r.liveAuthenticationEnabled,false);assert.equal(auth.LIVE_AUTHENTICATION_ENABLED,false);assert.equal('identity' in r,false);assert.equal('session' in r,false);});
const flowMutations=[['missing identity',e=>delete e.identity],['missing limiter',e=>delete e.admission],['rejected attempt',e=>e.admission.decision='rejected'],['limiter outage',e=>e.admission.decision='unavailable'],['nondurable limiter',e=>e.admission.durable=false],['unverified credential',e=>e.credential.outcome='rejected'],['missing credential',e=>delete e.credential],['missing provider evidence',e=>delete e.session],['invalid signature evidence',e=>e.session.signatureVerified=false],['expired session',e=>e.session.expiresAt=NOW],['revoked session',e=>e.session.revoked=true],['wrong audience',e=>e.session.audience=['other']],['wrong issuer',e=>e.session.provider={...e.session.provider,issuer:'https://wrong.invalid'}],['wrong role',e=>e.session.role='parent'],['wrong subject',e=>e.session.provider={...e.session.provider,subject:'other'}],['replayed attempt binding',e=>e.credential.attemptId='other-attempt'],['credential mismatch',e=>e.credential.credentialId='other-ref'],['stale credential',e=>e.credential.credentialVersion=1],['stale identity version',e=>e.identity.currentVersion++],['stale context',e=>e.context.currentAuthorizationVersion++],['wrong context role',e=>e.context.activeRole.role='parent'],['missing live context',e=>delete e.context],['forced reset',e=>e.identity.credentialResetRequired=true],['session predates credential check',e=>e.session.authenticatedAt=NOW-200],['unapproved input',e=>e.input={accepted:false,reason:'invalid_pin_format'}]];
for(const [name,mutate] of flowMutations)test('State model denies '+name,()=>{const e=attempt();mutate(e);assert.equal(evaluate(e).state,'denied');});
test('Format alone cannot skip to contract grant',()=>{const r=evaluate({attemptId:'contract-attempt',input:auth.assessFamilyLoginInput('student','Reg-A',vector(6),policy)});assert.equal(r.state,'denied');assert.deepEqual(r.completed,['input_received','input_format_accepted']);});
test('Parent flow denies ambiguous, stale and unrelated mapping',()=>{for(const mutate of [e=>e.identity.parentLookup.candidates.push({...e.identity.parentLookup.candidates[0],profileId:'other'}),e=>e.identity.parentLookup.candidates[0].currentRelationshipVersion++,e=>e.relationship.studentId='unrelated']){const e=attempt('parent');mutate(e);assert.equal(evaluate(e).state,'denied');}});
test('Live relationship version and explicit purpose cannot be stale or absent',()=>{for(const mutate of [e=>delete e.liveRelationshipVersion,e=>e.liveRelationshipVersion++,e=>delete e.parentPurpose]){const e=attempt('parent');mutate(e);assert.equal(evaluate(e).state,'denied');}});
test('Fee-only Parent scope does not grant academics',()=>{const e=attempt('parent');e.relationship.academicAccess=false;e.parentPurpose='fees';assert.equal(evaluate(e).state,'contract_access_granted');e.parentPurpose='academic';assert.equal(evaluate(e).state,'denied');});
test('Internal denial output has no registration, PIN or provider context',()=>{const e=attempt();delete e.session;const r=evaluate(e);assert.deepEqual(Object.keys(r).sort(),['completed','liveAuthenticationEnabled','reason','state']);});
console.log('PASS: '+checks+' Step 12 deterministic contract groups. Synthetic format/evidence only; no credential verification, session issuance, provider, limiter or RLS integration.');

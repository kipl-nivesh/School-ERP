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
function test(name,run){run();checks++;console.log('PASS: '+name);}
// Synthetic POLICY INPUTS, not authenticated sessions. No JWT/credential/session factory or login route.
function policyInput(role='admin',options={}) {
  const profileId='fixture-principal';
  const assignment={id:'membership-'+role,profileId,role,status:'active',validFrom:NOW-3600000,validUntil:null,permissions:[...auth.getPermissionCeiling(role)]};
  const value={source:'verified-server-session',profileId,accountStatus:'active',credentialResetRequired:false,
    authorizationVersion:2,currentAuthorizationVersion:2,
    session:{id:'fixture-context-id',profileId,verifiedAt:NOW-1000,authenticatedAt:NOW-60000,expiresAt:NOW+3600000,revoked:false,assurance:'aal1',reauthenticatedAt:NOW-5000},
    activeRole:{sessionId:'fixture-context-id',profileId,role,assignmentId:assignment.id,version:3,currentVersion:3,expiresAt:NOW+1800000,revoked:false},
    assignments:[assignment],superAdminPrivilege:null};
  if(options.superAdmin){value.superAdminPrivilege={tier:'super_admin',profileId,status:'active',validFrom:NOW-1000,validUntil:null};value.session.assurance='aal2';}
  return value;
}
const permission=(input,p)=>auth.evaluatePermission(input,p,NOW);
const denied=(decision,reason)=>{assert.equal(decision.allowed,false);if(reason)assert.equal(decision.reason,reason);};
const allowed=decision=>assert.deepEqual(decision,{allowed:true});
const securityTarget={profileId:'fixture-target',role:'admin',isSuperAdmin:false,activeSuperAdminCount:3,independentApproverProfileId:'fixture-independent-approver'};

test('Exactly five primary roles, same order as existing previews',()=>assert.deepEqual(auth.PRIMARY_ROLES,['admin','teacher','student','parent','accountant']));
test('Super Admin is not a sixth role or route',()=>{assert.equal(auth.isPrimaryRole('super_admin'),false);assert.equal(auth.loginMethodForRole('super_admin'),null);});
test('Role and permission catalogs reject unknowns',()=>{for(const value of [null,{},1,'principal','office_staff','ADMIN',''])assert.equal(auth.isPrimaryRole(value),false);for(const value of [null,{},1,'security.anything','*','audit.delete'])assert.equal(auth.isPermissionId(value),false);});
test('Catalogs and permission ceilings are frozen',()=>{assert.ok(Object.isFrozen(auth.PRIMARY_ROLES));assert.ok(Object.isFrozen(auth.PERMISSIONS));assert.ok(Object.isFrozen(auth.getPermissionCeiling('admin')));assert.equal(new Set(auth.PERMISSIONS).size,auth.PERMISSIONS.length);});
test('Ordinary Admin cannot create accounts, grant roles or elevate',()=>{const a=policyInput();for(const p of auth.PERMISSIONS.filter(p=>p.startsWith('security.')))denied(permission(a,p),'permission_denied');});
for(const role of ['teacher','accountant','student','parent'])test(role+' cannot manage accounts/roles/credentials',()=>{for(const p of auth.PERMISSIONS.filter(p=>p.startsWith('security.')))denied(permission(policyInput(role),p),'permission_denied');});
test('Forged security grants never exceed ordinary Admin ceiling',()=>{const a=policyInput();a.assignments[0].permissions.push('security.accounts.create','security.super_admin.grant');denied(permission(a,'security.accounts.create'));denied(permission(a,'security.super_admin.grant'));});
test('Super Admin with active Admin context and MFA can review all five module destinations',()=>{const a=policyInput('admin',{superAdmin:true});assert.deepEqual(auth.authorizedDashboardDestinations(a,NOW).map(d=>d.href),auth.PRIMARY_ROLES.map(r=>'/'+r+'/dashboard'));allowed(permission(a,'security.accounts.create'));});
test('No sixth dashboard even for Super Admin',()=>denied(auth.evaluateDashboardAccess(policyInput('admin',{superAdmin:true}),'super_admin',NOW),'unknown_role'));
test('Ordinary roles see only their active assigned dashboard',()=>{for(const role of auth.PRIMARY_ROLES)assert.deepEqual(auth.authorizedDashboardDestinations(policyInput(role),NOW).map(d=>d.role),[role]);});
test('Explicit grant missing means deny, not role-default allow',()=>{const a=policyInput();a.assignments[0].permissions=[];denied(permission(a,'dashboard.admin.view'));});
test('Unknown permissions denied even for Super Admin',()=>denied(permission(policyInput('admin',{superAdmin:true}),'*'),'unknown_permission'));
test('Missing or untrusted context never authorizes',()=>{for(const a of [null,undefined,{source:'untrusted-client',role:'admin',privilege:'super_admin'}]){denied(permission(a,'dashboard.admin.view'),'unverified_identity');assert.deepEqual(auth.authorizedDashboardDestinations(a,NOW),[]);}});
test('Source marker is required and no runtime context constructor is exported',()=>{const a=policyInput();delete a.source;denied(permission(a,'dashboard.admin.view'),'unverified_identity');for(const key of Object.keys(auth))assert.ok(!/createSession|authenticate|verifyPin|createVerifiedContext/.test(key));});
for(const status of ['suspended','disabled','invited','unknown'])test(status+' accounts denied including Super Admin',()=>{const a=policyInput('admin',{superAdmin:true});a.accountStatus=status;denied(permission(a,'dashboard.admin.view'),'inactive_account');});
test('Forced initial credential reset blocks dashboard access',()=>{const a=policyInput();a.credentialResetRequired=true;denied(permission(a,'dashboard.admin.view'),'reset_required');});
test('Expired, revoked and future-invalid session evidence denied',()=>{for(const update of [{expiresAt:NOW},{revoked:true},{verifiedAt:NOW+1},{authenticatedAt:NOW+1},{assurance:'unknown'},{profileId:'someone-else'},{id:''}]){const a=policyInput();Object.assign(a.session,update);denied(permission(a,'dashboard.admin.view'));}});
test('Unknown active role denied',()=>{const a=policyInput();a.activeRole.role='super_admin';denied(permission(a,'dashboard.admin.view'),'unknown_role');});
test('Revoked, expired and future role membership denied',()=>{for(const update of [{status:'revoked'},{validUntil:NOW},{validFrom:NOW+1},{profileId:'other'}]){const a=policyInput();Object.assign(a.assignments[0],update);denied(permission(a,'dashboard.admin.view'),'inactive_role');}});
test('Wrong role-context user/session and revoked/expired context denied',()=>{for(const update of [{profileId:'other'},{sessionId:'other'},{revoked:true},{expiresAt:NOW}]){const a=policyInput();Object.assign(a.activeRole,update);denied(permission(a,'dashboard.admin.view'));}});
test('Privilege and role changes invalidate authorization versions',()=>{const a=policyInput();a.currentAuthorizationVersion++;denied(permission(a,'dashboard.admin.view'),'stale_authorization');const b=policyInput();b.activeRole.currentVersion++;denied(permission(b,'dashboard.admin.view'),'stale_authorization');});
test('Role switching never combines inactive memberships',()=>{const a=policyInput('teacher');const other=policyInput('accountant').assignments[0];a.assignments.push(other);denied(permission(a,'payments.record'));a.activeRole.role='accountant';a.activeRole.assignmentId=other.id;allowed(permission(a,'payments.record'));denied(permission(a,'marks.write'));});
test('Super Admin tier inactive outside Admin context does not grant security privileges',()=>{const a=policyInput('teacher');const admin=policyInput('admin').assignments[0];a.assignments.push(admin);a.superAdminPrivilege={tier:'super_admin',profileId:a.profileId,status:'active',validFrom:NOW-1,validUntil:null};a.session.assurance='aal2';denied(permission(a,'security.accounts.create'));assert.deepEqual(auth.authorizedDashboardDestinations(a,NOW).map(d=>d.role),['teacher']);});
test('Super Admin requires live Admin membership, tier, correct owner and MFA',()=>{for(const change of [a=>a.session.assurance='aal1',a=>a.assignments[0].status='revoked',a=>a.superAdminPrivilege.status='revoked',a=>a.superAdminPrivilege.profileId='other',a=>a.superAdminPrivilege.validUntil=NOW]){const a=policyInput('admin',{superAdmin:true});change(a);denied(permission(a,'dashboard.admin.view'));}});
test('Super Admin sensitive actions require recent verified reauthentication',()=>{for(const at of [null,NOW-600001,NOW+1]){const a=policyInput('admin',{superAdmin:true});a.session.reauthenticatedAt=at;denied(permission(a,'security.accounts.create'),'reauthentication_required');}});
test('Security change rejects self-target and unknown role assignment',()=>{const a=policyInput('admin',{superAdmin:true});denied(auth.evaluateSecurityChange(a,{permission:'security.roles.assign',target:{...securityTarget,profileId:a.profileId}},NOW),'invalid_target');denied(auth.evaluateSecurityChange(a,{permission:'security.roles.assign',target:{...securityTarget,role:'super_admin'}},NOW),'invalid_target');});
test('Super Admin grant requires independent approval and Admin target',()=>{const a=policyInput('admin',{superAdmin:true});for(const approver of [null,a.profileId,securityTarget.profileId])denied(auth.evaluateSecurityChange(a,{permission:'security.super_admin.grant',target:{...securityTarget,independentApproverProfileId:approver}},NOW),'approval_required');allowed(auth.evaluateSecurityChange(a,{permission:'security.super_admin.grant',target:securityTarget},NOW));});
test('Last Super Admin cannot be revoked, suspended or reset through ordinary change policy',()=>{const a=policyInput('admin',{superAdmin:true});for(const p of ['security.super_admin.revoke','security.accounts.suspend','security.roles.revoke','security.credentials.reset'])denied(auth.evaluateSecurityChange(a,{permission:p,target:{...securityTarget,isSuperAdmin:true,activeSuperAdminCount:1}},NOW),'last_super_admin');});
test('Distinct Student/Parent PIN login methods; staff email password',()=>{assert.equal(auth.loginMethodForRole('student'),'student_registration_pin');assert.equal(auth.loginMethodForRole('parent'),'parent_registration_pin');for(const role of ['admin','teacher','accountant'])assert.equal(auth.loginMethodForRole(role),'email_password');assert.equal(auth.loginRequiresMfa('super_admin'),true);});
test('PIN role and exact identity bindings are not interchangeable',()=>{const b={identityProfileId:'guardian-A',credentialId:'credential-A',role:'parent',method:'parent_registration_pin',status:'active'};assert.equal(auth.credentialBindingMatches('parent_registration_pin','guardian-A',b),true);assert.equal(auth.credentialBindingMatches('student_registration_pin','guardian-A',b),false);assert.equal(auth.credentialBindingMatches('parent_registration_pin','guardian-B',b),false);assert.equal(auth.credentialBindingMatches('email_password','guardian-A',b),false);assert.equal(auth.credentialBindingMatches('parent_registration_pin','guardian-A',{...b,status:'revoked'}),false);assert.equal(auth.credentialBindingMatches('parent_registration_pin','guardian-A',{...b,role:'student'}),false);});
const relationship={guardianProfileId:'fixture-principal',studentId:'child-A',status:'verified',validFrom:NOW-1,validUntil:null,academicAccess:true,feeAccess:true};
test('Parent requires verified exact guardian/child relationship and purpose',()=>{const a=policyInput('parent');allowed(auth.evaluateParentChildAccess(a,'child-A','academic',relationship,NOW));for(const link of [null,{...relationship,status:'pending'},{...relationship,status:'revoked'},{...relationship,validUntil:NOW},{...relationship,validFrom:NOW+1},{...relationship,guardianProfileId:'other'},{...relationship,studentId:'other'},{...relationship,academicAccess:false}])denied(auth.evaluateParentChildAccess(a,'child-A','academic',link,NOW),'relationship_denied');denied(auth.evaluateParentChildAccess(a,'child-A','fees',{...relationship,feeAccess:false},NOW),'relationship_denied');});
test('One guardian can access two verified children without duplicate identities',()=>{const a=policyInput('parent');for(const studentId of ['child-A','child-B'])allowed(auth.evaluateParentChildAccess(a,studentId,'academic',{...relationship,studentId},NOW));denied(auth.evaluateParentChildAccess(a,'child-C','academic',relationship,NOW));});
test('Student context and Super Admin review cannot masquerade as Parent relationship',()=>{denied(auth.evaluateParentChildAccess(policyInput('student'),'child-A','academic',relationship,NOW));denied(auth.evaluateParentChildAccess(policyInput('admin',{superAdmin:true}),'child-A','academic',relationship,NOW),'relationship_denied');});
test('Super Admin cannot alter audit or settled/issued financial facts',()=>{const a=policyInput('admin',{superAdmin:true});for(const state of ['issued','settled'])for(const operation of ['update','delete'])denied(auth.evaluateRecordMutation(a,{permission:'payments.record',kind:'financial',state,operation,integrityVerified:true},NOW),'immutable_record');denied(auth.evaluateRecordMutation(a,{permission:'payments.record',kind:'audit',state:'settled',operation:'update',integrityVerified:true},NOW),'immutable_record');});
test('Correction still requires trusted integrity evidence and future DB enforcement',()=>{const a=policyInput('admin',{superAdmin:true});denied(auth.evaluateRecordMutation(a,{permission:'fees.write',kind:'financial',state:'settled',operation:'append_correction',integrityVerified:false},NOW),'integrity_required');allowed(auth.evaluateRecordMutation(a,{permission:'fees.write',kind:'financial',state:'settled',operation:'append_correction',integrityVerified:true},NOW));});
test('Bad clock and invalid versions fail closed',()=>{denied(auth.evaluatePermission(policyInput(),'dashboard.admin.view',NaN));const a=policyInput();a.authorizationVersion=0;a.currentAuthorizationVersion=0;denied(permission(a,'dashboard.admin.view'));});
test('Malformed/duplicate membership evidence fails closed',()=>{for(const change of [a=>a.assignments.push({...a.assignments[0]}),a=>a.assignments.push(null),a=>delete a.superAdminPrivilege]){const a=policyInput();change(a);denied(permission(a,'dashboard.admin.view'),'invalid_context');}});
test('Known nonfinancial permission cannot authorize a record mutation',()=>denied(auth.evaluateRecordMutation(policyInput('admin',{superAdmin:true}),{permission:'dashboard.admin.view',kind:'financial',state:'draft',operation:'update',integrityVerified:true},NOW),'unknown_permission'));
console.log(`PASS: ${checks} deterministic authorization contract groups. No live authentication, PIN verification, sessions, SQL, or RLS were tested.`);

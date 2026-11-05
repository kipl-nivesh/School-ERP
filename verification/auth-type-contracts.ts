/** Compile-time tests only: no fixture context, credential, or session is instantiated. */
import type { PrimaryRole, PolicyContext, VerifiedServerContext, UntrustedClientClaims, AuthenticationResult, PinCredentialBinding } from '../src/lib/auth';
import type { Role } from '../src/config/roles';
type Assert<T extends true> = T;
type Equal<A,B> = (<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;
export type RoleCatalogMatchesPreview = Assert<Equal<PrimaryRole,Role>>;
export type NoSixthRole = Assert<Equal<Extract<PrimaryRole,'super_admin'>,never>>;
export type ClientIsNotVerified = Assert<Equal<UntrustedClientClaims extends VerifiedServerContext?true:false,false>>;
export type PlainMarkerIsNotVerified = Assert<Equal<{source:'verified-server-session'} extends VerifiedServerContext?true:false,false>>;
export type SuccessNeedsVerifiedIdentity = Assert<Equal<Extract<AuthenticationResult,{state:'authenticated'}>['identity'],VerifiedServerContext>>;
export type PinMethodsStaySeparate = Assert<Equal<PinCredentialBinding['method'],'student_registration_pin'|'parent_registration_pin'>>;
export type NoClientSuccess = Assert<Equal<UntrustedClientClaims extends Extract<AuthenticationResult,{state:'authenticated'}>?true:false,false>>;
export type MissingIdentityAllowedOnlyAsPolicyInput = Assert<undefined extends PolicyContext?true:false>;

import type { TrustedParentLookupSnapshot, TrustedFamilyIdentity, DurableAttemptAdmission, ApprovedCredentialEvidence, VerifiedProviderSessionEvidence, AuthenticationContractResult } from '../src/lib/auth';
export type LookupCannotBePlainMarker = Assert<Equal<{source:'trusted-school-lookup'} extends TrustedParentLookupSnapshot?true:false,false>>;
export type IdentityCannotBePlainMarker = Assert<Equal<{source:'trusted-school-identity'} extends TrustedFamilyIdentity?true:false,false>>;
export type AdmissionCannotBePlainMarker = Assert<Equal<{source:'durable-limiter'} extends DurableAttemptAdmission?true:false,false>>;
export type CredentialCannotBePlainMarker = Assert<Equal<{source:'approved-provider'} extends ApprovedCredentialEvidence?true:false,false>>;
export type ProviderCannotBePlainMarker = Assert<Equal<{source:'verified-provider-session'} extends VerifiedProviderSessionEvidence?true:false,false>>;
export type ContractGrantIsNotAuthentication = Assert<Equal<Extract<AuthenticationContractResult,{state:'contract_access_granted'}> extends AuthenticationResult?true:false,false>>;
export type AllContractResultsStayOffline = Assert<Equal<AuthenticationContractResult['liveAuthenticationEnabled'],false>>;

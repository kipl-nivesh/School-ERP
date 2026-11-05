# Storage security plan — proposed only

## Step 8 authoritative update

Super Admin remains subject to private buckets, scoped server projections, signed-URL expiry and audit. Never put PINs, verifier hashes, provider keys or bootstrap/recovery secrets in ordinary document buckets. Revoked guardian access and stale sessions must deny new downloads; already issued URL exposure needs bounded expiry. Security provisioning is Super Admin-only.

Approved role/login/provisioning requirements take precedence over conflicting historical Step 7 text below. Proposed mechanisms are not deployed controls. See [access model](SUPER-ADMIN-ACCESS-MODEL.md), [PIN design](STUDENT-PARENT-PIN-AUTH-DESIGN.md), [bootstrap](SUPER-ADMIN-BOOTSTRAP-PLAN.md) and [threat model](AUTHENTICATION-THREAT-MODEL.md).

## Retained Step 7 blueprint (subject to the update above)

No buckets, objects, keys, signed URLs or policies were created. Link files through `document_objects` and the typed parent links in the [schema](DATABASE-SCHEMA-BLUEPRINT.md). Path prefixes and `owner_id` are organizational hints, not sufficient authorization.

| Proposed bucket | Visibility and download authority | Upload authority | Initial limit proposal |
| --- | --- | --- | --- |
| student-documents | Private; authorized admissions Admin; family only explicitly released own/child documents | Approved admissions workflow; optional guardian upload after separate approval | PDF/JPEG/PNG, 10 MB/object |
| staff-documents | Private; HR-granted Admin and own released staff records | HR workflow | PDF/JPEG/PNG, 10 MB |
| homework-materials | Private; published task audience/assigned teacher | Authorized author, target validated | PDF/JPEG/PNG, 10 MB |
| homework-submissions | Private; own student and authorized reviewer; parent status/attachment visibility needs explicit policy | Own eligible student attempt | PDF/JPEG/PNG, 10 MB |
| announcement-files | Private; published authorized audience | Authorized announcement author | PDF/JPEG/PNG, 10 MB |
| school-branding | Public **only approved nonsensitive logo assets**; private staging variant until approved | Admin branding permission, reviewed conversion | PNG/JPEG/WebP, 2 MB; no user SVG by default |
| report-cards | Private; own/linked child released publication; academic administrators | Trusted generation job only | PDF, 5 MB |
| fee-receipts | Private; own/linked child fee_access; authorized finance staff | Trusted receipt job only | PDF, 5 MB |
| report-exports | Private; authorized requester only, scoped purpose | Trusted report job only | PDF/CSV, 20 MB/job, approved bounded row cap |

Limits are proposals requiring operational approval; school document requirements may differ. No wildcard arbitrary MIME list. Do not store executables, scripts, macros, archives or unsanitized SVG/HTML. Validate extension, declared MIME and server-inspected magic bytes; MIME metadata alone is untrusted. Generated PDFs/templates also need untrusted-text escaping and no executable external content.

## Authorization and lifecycle

1. Authenticated caller requests upload for an existing authorized entity/purpose. Server verifies role, relationship, workflow, quota/rate limit and allowed file type/size.
2. Create quarantined manifest with server-generated random object key; use a pattern such as `purpose/entity_uuid/document_uuid/version_uuid.ext`, with no names, admission numbers or phone numbers. Typed document link binds the intended parent and uploader; validation enforces one purpose/parent per object. User cannot redirect it by altering the path.
3. Give a short-lived upload capability for that exact key, no upsert/overwrite and no arbitrary bucket. Enforce upload policy against the manifest and current principal. Complete uploads remain unreadable while quarantined.
4. Server verifies actual size/hash/type, decodes/re-encodes images, scans using an isolated worker, strips unnecessary metadata, and marks clean/rejected. Reject malformed or encrypted/unscannable files per approved policy. Upload and DB transactions are not atomic: pending manifests, finalization and orphan cleanup must be idempotent and auditable.
5. Download authorization checks current role, parent relationship, publication/scan/deletion state and required purpose. Signed download URL target TTL initially 60–120 seconds, never placed in logs/analytics. Do not return object listings to family roles. Use an authenticated proxy download for cases requiring stronger immediate revocation; bound memory/streaming and avoid response caching.
6. Role/guardian revocation prevents new URLs immediately. A previously issued URL is a bearer capability until expiry; deleting/changing policies does not safely substitute for a documented TTL/revocation strategy. Disclose this residual risk and choose proxy delivery for highly sensitive documents.

Storage object policies must align with domain policies and approved manifests on INSERT/SELECT/UPDATE/DELETE. Supabase Storage uses RLS on `storage.objects`; uploading and overwriting require different grants. [Storage access-control reference](https://supabase.com/docs/guides/storage/security/access-control). Do not manually mutate storage metadata tables as a substitute for the Storage API. Private bucket status alone does not prove relationship-based access is correct.

## Retention, deletion and recovery

Owner/counsel approves purpose-specific retention for admissions, rejected applications, academic records, homework, staff files, receipts, messages, exports and backups. Prefer short-lived exports (initial target 24h); final academic/financial evidence may need much longer legally approved retention. This document does not prescribe statutory retention periods.

Deletion: check legal hold and parent references, approve, tombstone/revoke access, enqueue object deletion, verify removal and record audit; retry failed deletion, and track backup-retention expiration. Do not cascade-delete issued receipt/report-card evidence when a user account is removed. Rejected/orphaned uploads get bounded cleanup after safety review. Redaction/deletion requests must account for financial/academic retention requirements and produce a traceable outcome.

Back up actual object bytes separately from database metadata; test restoring a released document together with its manifest and authorization links. Restrict recovery operators and prevent a restored revoked guardian or expired URL/job from regaining access. Separate encryption/access keys and retention for recovery copies. No storage or recovery operation was run in Step 7.

Test matrix later: family A cannot list/download/upload for B; teacher cannot use material prefix to read submissions from another class; failed/quarantined upload unreadable; MIME spoof/oversize/zip-bomb/polyglot rejected; expired URL denied; read authorization rechecked; report of another requester denied; unlinked/orphan manifest denied; overwrite and path traversal rejected; deleted or withdrawn publication inaccessible to new downloads.

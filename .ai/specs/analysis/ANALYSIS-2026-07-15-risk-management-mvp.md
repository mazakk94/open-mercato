# Pre-Implementation Analysis: Risk Management MVP

## Executive Summary

The specification is ready for incremental implementation as an external Official Module. No critical backward-compatibility or architecture blockers were found. Checkpoint 2 is especially low risk because it adds guarded navigation and non-persistent preview pages only; schema, CRUD APIs, commands, AI dispatch, and external side effects remain deferred.

## Backward Compatibility

### Violations Found

No backward-compatibility violations were found.

| # | Surface | Finding | Severity | Proposed Fix |
|---|---|---|---|---|
| 1 | Auto-discovery conventions | New module files follow Official Module discovery paths; no existing convention is renamed or removed. | None | Run supported generation commands after adding files. |
| 2 | Types and interfaces | The spec adds module-owned types without narrowing shared contracts. | None | Keep public additions additive. |
| 3 | Function signatures | Existing shared helpers are consumed without signature changes. | None | Use public package exports. |
| 4 | Import paths | No existing import path is moved or removed. | None | Keep the Official Module package boundary. |
| 5 | Event IDs | New `risk_management.risk.*` IDs are additive and declared frozen. | None | Treat the documented IDs as stable once shipped. |
| 6 | Widget/extension IDs | New risk table/form/page IDs are additive. | None | Keep IDs stable after release. |
| 7 | API routes | New risk CRUD routes are additive; the existing AI dispatcher is consumed unchanged. | None | Preserve the documented projections and URLs. |
| 8 | Database schema | The planned migration is additive and package-owned. | None | Generate the migration and snapshot; do not apply it without separate approval. |
| 9 | DI service names | No shared DI registration is renamed. | None | Resolve existing services through the container. |
| 10 | ACL feature IDs | New `risk_management.risk.*` IDs are additive. | None | Sync default role grants and invalidate RBAC caches on existing tenants. |
| 11 | Notification IDs | No notification contract is introduced. | None | No action required. |
| 12 | CLI commands | No CLI contract is changed. | None | Use existing generation, ACL-sync, and test commands. |
| 13 | Generated files | Generated registries are consumed through supported generation. | None | Never edit generated files by hand. |

The Checkpoint 1 route `/backend/risk-management` remains available in Checkpoint 2 as an authenticated, feature-guarded redirect to `/backend/risk-management/risks`, so the already demonstrated URL is preserved.

### Missing BC Section

None. The specification contains “Official Module Packaging, Migration, and Backward Compatibility” and a surface-by-surface review.

## Spec Completeness

### Missing Sections

No required section is missing.

### Incomplete Sections

| Section | Gap | Recommendation |
|---|---|---|
| Checkpoint 2 implementation detail | The full MVP spec describes the final interactive pages, while the staging plan deliberately introduces honest previews first. | Treat the staging plan as the checkpoint-level acceptance contract: no persistence, AI call, fake rows, or implied working action in Checkpoint 2. |
| Integration execution mode | The tests are defined, but the interactive test runner mode must be selected before the first run. | Use the repository-recommended fully managed ephemeral mode unless the maintainer selects boot-once mode. |

## AGENTS.md Compliance

### Violations

No implementation-blocking violation was found.

| Rule | Location | Resolution |
|---|---|---|
| Official Module ownership | Package architecture | Correctly placed in `external/official-modules/packages/risk-management`; no core-module addition. |
| Setup grants for ACL features | Access control | `setup.ts` grants `risk_management.*` to superadmin/admin and leaves employee opt-in. |
| Tenant/organization safety | Data/API contracts | Mandatory tenant and organization scope is specified for every read/write and integration test. |
| Optimistic locking | Entity/API/UI contracts | `updated_at`, `updatedAt`, guarded mutations, and conflict UI are explicitly required. |
| Canonical CRUD/UI mechanisms | API and UI contracts | `makeCrudRoute`, commands, `DataTable`, `CrudForm`, shared states, and `apiCall` are specified. |
| Encryption | Data model | Module encryption maps and scoped decrypted reads are required for sensitive text and financial value. |
| i18n/design system | UI contracts | Translated labels and shared primitives/tokens are required; raw controls and hard-coded user strings are prohibited. |
| Generated files | Packaging workflow | Supported generation is required and manual edits are prohibited. |

The review checklist path referenced by the pre-implementation skill is not installed at `.agents/skills/...` in this checkout; the repository-local `.ai/review-checklist.md` was used as the available equivalent.

## Risk Assessment

### High Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Future persisted risk data crosses tenant or organization boundaries | Sensitive business data disclosure | Enforce both scopes in entity helpers, CRUD routes, commands, indexes, and self-contained isolation tests. |
| Future sensitive text or financial exposure is stored/indexed incorrectly | Confidential data exposure | Use module encryption maps, decrypted scoped reads, hashed search tokens, and no global-search registration. |

### Medium Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Existing admin roles do not receive newly declared features | Admin sees Access Denied or missing navigation | Run role ACL sync, invalidate RBAC cache, inspect effective ACL, and test both navigation and direct routes. |
| Structural route cache is stale after module page changes | New sidebar entries or pages do not appear after deployment | Purge structural caches after generation/deployment and verify with a real admin session. |
| Optional AI Assistant is unavailable or unauthorized | Identification generation fails while the module otherwise works | Keep the page owned by Risk Management, detect absent/forbidden/provider failure, and keep CRUD independent. |
| Official Module/host revisions drift | Staging builds code different from the reviewed checkpoint | Pin and verify exact SHAs and the host submodule pointer before deployment. |

### Low Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Checkpoint 2 preview suggests persistence or AI functionality that does not exist | Misleading demo | Use explicit preview/unavailable messaging and omit enabled mutation/generation controls. |
| The root checkpoint URL changes content | Existing bookmark lands on a new page | Preserve it as a guarded redirect to the register preview. |

## Gap Analysis

### Critical Gaps (Block Implementation)

None for Checkpoint 2.

### Important Gaps (Should Address)

- Navigation registry coverage: assert the exact group, routes, order, context, and feature requirements.
- Real-session RBAC coverage: verify an admin sees and opens both entries, while an employee sees neither and is denied direct access.
- Honest-preview coverage: assert no API call, persistence, fake record, or enabled generation behavior exists in Checkpoint 2.

These items are already present in the incremental staging plan and should be implemented with the checkpoint.

### Nice-to-Have Gaps

- Record browser screenshots during the later staging deployment for the checkpoint progress log.
- Add the selected integration runner mode to validation notes when tests are executed.

## Remediation Plan

### Before Implementation (Must Do)

1. Commit the reviewed specification and incremental staging plan locally.
2. Create a local branch in the Official Modules checkout from `origin/feat/risk-management`.
3. Confirm the implementation is limited to Checkpoint 2 preview/navigation behavior.

### During Implementation (Add to Spec)

1. Keep route roots server-first and isolate any required client behavior in leaf components.
2. Add the `risk_management.risk.identify` feature and matching translated page metadata.
3. Preserve the root URL as a hidden compatibility redirect.
4. Add navigation and access tests before considering the checkpoint complete.

### Post-Implementation (Follow Up)

1. Run generation plus the smallest relevant package/host validation gates.
2. Commit Official Modules first, then commit the exact host submodule pointer/generated integration state.
3. Do not push or deploy until separately requested.

## Recommendation

Ready to implement Checkpoint 2. The full MVP remains appropriately phased; database, CRUD, command, AI, and release work must not leak into this preview checkpoint.

## Checkpoint 3 Readiness Addendum — 2026-07-20

### Decision

Ready to implement Checkpoint 3 in **external extension mode**. The product and
placement decision has already been made: persistence, commands, API routes,
and UI remain inside `@open-mercato/risk-management` in the Official Modules
repository. The host repository is limited to supported activation,
generation, and exact-revision integration. No core or auth change is
authorized or currently required.

### Increment Boundary

Checkpoint 3 exposes only the first persistent contract:

- encrypted `title`;
- `category`, `probability`, `impact`, and server-computed `risk_score`;
- tenant, organization, timestamp, and soft-delete columns;
- derived `criticality` and `updatedAt` in API responses;
- manual create, list/filter, detail/edit, soft-delete, undo, ACL, and
  optimistic-lock behavior.

Description, financial impact, installed custom-field UI, AI, and global/title
search remain deferred. Later nullable fields will be additive and existing
Checkpoint 3 records will require no backfill.

### Backward-Compatibility Audit

| Surface | Checkpoint 3 result |
|---|---|
| Auto-discovery conventions | Additive module-owned `data`, `commands`, `api`, `migrations`, `events`, `ce`, `encryption`, and backend route files only. |
| Types/interfaces | New risk-local schemas and types only; no shared type is narrowed. |
| Function signatures | Existing CRUD, command, encryption, event, UI, and optimistic-lock helpers are consumed unchanged. |
| Import paths | New package-local files and existing documented package exports only. |
| Event IDs | Adds frozen singular IDs `risk_management.risk.created`, `.updated`, and `.deleted`. |
| Widget/host IDs | Adds stable `risk_management:risk`, `risk_management.risk.list`, and risk page handles only. |
| API routes | Adds the final `/api/risk_management/risks` route; no existing route changes. |
| Database schema | One additive module-owned table, constraints, and indexes; no migration is applied without approval. |
| DI services | No new shared DI key and no service rename. |
| ACL IDs | Preserves shipped `.view`/`.identify` and additively introduces frozen `.manage`. |
| Notification IDs | None. |
| AI IDs | None in this checkpoint. |
| CLI/generated contracts | Existing generation and migration commands are used; generated files are not edited by hand. |

No deprecation bridge is needed because no existing public contract is removed,
renamed, narrowed, or behaviorally replaced.

### Implementation Constraints Resolved

- To make the generator produce the specified final entity ID
  `risk_management:risk`, the exported ORM class is named `Risk`; using
  `RiskManagementRisk` would incorrectly generate
  `risk_management:risk_management_risk`.
- Both `tenant_id` and `organization_id` are mandatory in every command and
  read filter. Encrypted reads use the platform decryption helpers with both
  scope values.
- `updated_at` is present from the first migration. `CrudForm` supplies the
  expected-version header for edit/delete; any table-row delete must use the
  row's own `updatedAt` through the guarded mutation path.
- Score and criticality are rejected as request input. Commands compute
  `risk_score = probability × impact`; the database enforces the same equality;
  API/UI derive criticality from the shared pure helper.
- The supported deployment requires
  `OM_SEARCH_STORE_RAW_TOKENS` unset or `false`. The module registers no
  `search.ts`, presenter, fulltext/vector source, or title-search control.
- Migration application remains a separate approval boundary. Local work may
  generate and inspect the package-owned migration and snapshot, but must not
  run `yarn db:migrate`.

### Risk Gate

The high-risk areas are tenant isolation, encryption, optimistic locking,
command undo, and migration correctness. Checkpoint completion therefore
requires route-level/API integration coverage for cross-tenant and
cross-organization denial, stale update/delete conflicts, encrypted round-trip,
server-authoritative scoring, soft delete/undo, and ACL separation before a
deployment SHA is proposed.

### Recommendation

Proceed with the Official Module foundation first: entity, validators, scoring,
ACL/setup, encryption, custom-entity metadata, events, and generated migration.
Then add commands/API, followed by DataTable/CrudForm UI and the executable
integration gate. Keep each internal slice buildable and do not deploy until
the complete Checkpoint 3 stop condition passes and migration deployment is
explicitly approved.

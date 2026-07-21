# Risk Management MVP

## TLDR

**Key Points:**

- Build a source-backed Official Module package, `@open-mercato/risk-management`, whose module ID is `risk_management`; the incremental staging execution does not publish a package or merge either feature branch.
- The package lives in the `open-mercato/official-modules` repository at `packages/risk-management/`; when that repository is attached locally, the host path is `external/official-modules/packages/risk-management/`.
- Deliver two top-level backoffice surfaces: a persistent risk register with complete manual CRUD and an AI-assisted risk-identification panel that produces reviewable candidates.
- Preserve the useful domain and interaction ideas from `riskai-v2.1`, but replace its in-memory store, custom UI patterns, and Polish-only strings with Open Mercato contracts. A new, versioned deterministic candidate fixture is used only as an explicit delivery/test source before live AI; it is not copied from the prototype and is never a silent AI fallback.
- Use one fixed 5×5 scoring model: `riskScore = probability × impact`. Criticality is derived from the score and is never accepted as authoritative client or model input.
- Do not assign risks to platform users in this MVP. There is no owner field, auth-directory API, auth DI service, or change to `@open-mercato/core`.

**Scope:**

- Risk register list, create, edit, detail, and soft-delete flows.
- Risk fields: title, description, fixed category, probability, impact, derived score and criticality, and optional encrypted financial-impact amount with currency.
- AI identification input: business context, industry, area, methodology, regulations, and time horizon.
- One shared candidate-review workflow with review, local edit, reject, and explicit add-to-register actions: Checkpoint 5 feeds it a fixed English demo set, then Checkpoint 6 replaces only the source with validated AI output.
- Official Module packaging, ACL, setup grants, commands, events, encryption, custom fields, safe query-index integration, OpenAPI, optimistic locking, i18n, migrations, unit/API/component tests, and self-contained Playwright integration coverage.

**Out of Scope:**

- Platform-user ownership, free-text ownership, assignees, accountable persons, teams, and owner filters. Ownership can be designed later with an explicit cross-module contract if product usage proves it is needed.
- Status workflow, causes, consequences, residual risk, mitigation actions, controls, treatment, acceptance/sign-off, tags, impact types, review dates, recurrence, alerts, heat maps, appetite, incidents, audits, reports, BCP, suppliers, surveys, maturity, DPIA, dashboards, attachments, imports, and exports.
- Configurable scoring matrices or claiming that the fixed MVP score implements ISO 31000, COSO ERM, NIST RMF, FAIR, or any regulation.
- Persisting AI identification inputs, prompts, sessions, rejected candidates, rationales, provider/model metadata, or generated candidates that the operator did not add.
- AI tools that mutate records, AI pending-action approval cards, chat UI, autonomous enrichment of existing risks, or AI-generated controls/mitigations.
- Copying `riskai-v2.1` source code or demo data, simulated delays, custom table/form controls, Framer Motion effects, or hard-coded status colors. The Checkpoint 5 fixture is newly authored, versioned domain demo content behind an explicit demo label.
- Adding the module to `@open-mercato/core`, editing `apps/mercato/src/modules.ts` manually, or modifying the create-app template.
- Global search and free-text register search. The module does not register `search.ts`, a presenter, fulltext, or vector indexing.

**Concerns:**

- Business context, risk descriptions, titles, and financial exposure can be sensitive. Stored free text and financial amounts require encryption. This module must not persist or log AI input/output; the shared AI Assistant runtime and configured provider remain separate trusted boundaries governed by their existing contracts and policies.
- The platform-wide search debug option `OM_SEARCH_STORE_RAW_TOKENS=true` stores plaintext query tokens. Supported Risk Management deployments must leave it unset or `false` (the platform default); the module cannot safely override a host-wide setting.
- Model output is advisory and untrusted. Extracted JSON must pass the strict candidate schema, deterministic scoring must be recomputed locally/server-side, and no record is written without an explicit operator action.
- The AI runtime does not currently guarantee a dedicated per-request rate limit or a stable provider-unavailable status for this in-process use. The UI must handle generic failures without inventing `429` or `503` contracts.
- Published package, module, entity, API, ACL, event, AI-agent, and widget IDs become stable or frozen contracts.

## Overview

The Risk Management MVP gives operators a small, production-grade starting point for documenting organizational risks and using AI to accelerate identification. It deliberately contains only a system of record and one assisted intake path.

`riskai-v2.1` is the product reference. Its identification screen establishes the desired input vocabulary and candidate-review flow; its register establishes the basic category, likelihood, impact, score, and financial-exposure concepts. It is not an architectural reference: identification returns hard-coded objects after a simulated delay, accepted candidates do not enter a shared persistent register, and register data lives in React state initialized from demo records. Its owner concept is acknowledged but deferred from this MVP.

Market references such as [SimpleRisk](https://support.simplerisk.com/kb/01-02-submitting-a-risk) and [eramba Community](https://www.eramba.org/learning/courses/79) show that mature risk products combine scoring with owners, treatments, reviews, assets, and configurable methods. This MVP intentionally selects a smaller minimum: a clear risk record, 1–5 probability and impact, deterministic score and criticality, optional financial exposure, and an assisted identification flow. The methodology and regulation selections on the AI screen provide context to the model only; they do not change the canonical score or certify compliance.

## Problem Statement

Open Mercato does not currently provide an installable, tenant-safe risk register. Operators have no canonical place to record a risk, compare likelihood and impact, or maintain a financial exposure estimate. They also lack a controlled way to turn business context into candidate risks without copying model output into another system.

The prototype demonstrates the product idea but leaves production concerns unresolved:

- no database or tenant/organization isolation;
- no authentication, ACL, command audit, undo, encryption, or optimistic locking;
- no real AI provider call or robust output validation;
- no persistence path from candidate to register;
- no server-authoritative scoring or validation;
- no Open Mercato design-system, routing, module-discovery, i18n, packaging, or test integration.

The implementation must solve those gaps without expanding into a complete GRC suite or changing core platform contracts.

## Proposed Solution

Create the Official Module package `@open-mercato/risk-management` with two sidebar destinations:

- `/backend/risk-management/risks` — the risk register;
- `/backend/risk-management/identify` — AI-assisted identification.

Supporting create and detail/edit routes belong to the register workflow but do not become additional sidebar destinations.

The register uses one `RiskManagementRisk` entity and standard Open Mercato CRUD infrastructure. Commands compute `riskScore` from probability and impact. API responses derive `criticality` from that score. Stored risk content is created or changed only through command-backed CRUD.

The identification page is built once around a small candidate-source boundary. Checkpoint 5 validates the complete six-field form (only `businessContext` is required), then returns the same newly authored English demo candidates without a network request or simulated delay. Operators can review, edit, reject, and explicitly add one candidate through the normal guarded risk-create API.

Checkpoint 6 keeps that UI and write path unchanged and replaces only the source with the registered read-only agent `risk_management.risk_identifier`. A module-owned identification action invokes the standard AI Assistant runtime and model resolution, collects text, extracts JSON, validates a strict at-most-five candidate schema, and makes at most one repair attempt. The agent has no tools and cannot mutate data. The browser recomputes score/criticality for display; accepting a candidate remains a separate `risk_management.risk.create` mutation initiated by the operator.

### Design Decisions

| Decision | Rationale |
|---|---|
| Official Module `@open-mercato/risk-management` | Risk management is a reusable, optional business capability rather than platform infrastructure. Official Modules provide maintained distribution without forcing every Open Mercato installation to carry the domain. |
| Module ID `risk_management` | It follows the documented package-to-module mapping: package suffix `risk-management` becomes snake-case module ID `risk_management`. |
| No core or auth changes | Removing platform-user ownership leaves no cross-module business reference. The package can remain isolated and uninstallable. |
| One spec, register delivered before AI | The maintainer explicitly chose one specification. AI identification is an intake path into the same risk aggregate, while the register remains useful when AI is disabled or unconfigured. |
| Deterministic workflow before live AI | Checkpoint 5 proves the final context/review/Edit/Reject/Add path using an explicitly labelled, fixed English fixture. Checkpoint 6 swaps only the source, reducing provider and malformed-output risk without creating a second product path. |
| Fixed 5×5 model | Matches the prototype’s useful baseline and keeps the first contract deterministic; methodology selection is contextual, not computational. |
| Server-computed `risk_score`; response-derived `criticality` | Supports database sorting while preventing score/label drift and model/client tampering. |
| Text-mode agent with no tools plus strict parser | Ollama Cloud is targeted through its OpenAI-compatible configuration without assuming strict provider-side structured output. The module extracts bounded JSON, validates it with Zod, permits one repair attempt, and never gives the agent a mutation tool. |
| AI runs are ephemeral | Meets the “start small” direction and avoids a prompt/audit/session data model. |
| Financial amount stored as encrypted decimal text | Preserves commercial confidentiality and exact decimal representation; amount sorting/range filtering is deferred. |
| No global/free-text search in MVP | Category/criticality filters meet the first register need. The module does not expose sensitive risk content through a search presenter, fulltext index, or embeddings, and it does not require a new core token-projection contract. |

### Alternatives Considered

| Alternative | Why Rejected or Deferred |
|---|---|
| Add `risk_management` to `@open-mercato/core` | Core is reserved for platform-wide capabilities and foundational business modules. This optional vertical would increase default surface area and release coupling for all installations. |
| App-local module in `apps/mercato/src/modules/` | Appropriate for one customer or prototype, but not for a maintained reusable Open Mercato feature. |
| Extend `customers`, `staff`, or `business_rules` | None owns general enterprise risk; doing so would mix unrelated lifecycles and permissions. |
| Platform-user owner plus auth-directory seam | Deferred by product decision. It would add a cross-module contract and core/auth work before accountability workflows are proven necessary. |
| Free-text owner | Also deferred; introducing a second ownership model now would make a later platform-user migration harder. |
| Copy the prototype scoring wizard and all risk fields | Pulls mitigation/review/lifecycle scope into the MVP and hard-codes PLN impact bands. |
| AI mutation tool calling risk create | Adds pending-action complexity without value; the operator already reviews a visible candidate and can use normal guarded CRUD. |
| Existing object dispatcher | Deferred for the Ollama Cloud checkpoint because it assumes provider-side structured output. The module-owned action still delegates model/provider/policy resolution to the AI Assistant runtime and adds only bounded text extraction/validation. |
| Existing chat dispatcher | Rejected because the focused one-shot identification flow must not create a persisted chat conversation/session. |
| Direct provider SDK or Ollama-specific client | Rejected because it would bypass the AI Assistant model factory, allowlists, ACL policy, and provider portability. |
| Persist AI runs for audit | Adds sensitive prompt storage, retention, browsing, and deletion requirements outside the starter scope. |
| Configurable scoring methodology | Requires settings, migrations, score-version lineage, bulk recalculation, and compatibility rules; defer to a future spec. |

## User Stories / Use Cases

- **Risk manager** wants to create and maintain a risk manually so the register remains authoritative without AI.
- **Risk manager** wants to record probability and impact and see a consistent score/criticality so risks can be compared.
- **Risk manager** wants to filter the register by category and criticality.
- **Risk manager** wants to describe the organization and assessment context so AI can propose relevant risks.
- **Risk manager** wants to review, edit, reject, or add each candidate so no model output is persisted implicitly.
- **Administrator** wants risk and AI-identification permissions to be independently grantable.
- **Operator without a configured AI provider** wants the risk register to remain fully usable and the identification page to explain that generation failed.
- **Open Mercato app maintainer** wants to install, activate, upgrade, or omit the module independently of core.

## Architecture

### Package Ownership and Dependencies

Published repository location:

```text
open-mercato/official-modules/packages/risk-management/
```

Local host checkout location when the optional official-modules submodule is attached:

```text
external/official-modules/packages/risk-management/
```

Package name: `@open-mercato/risk-management`

Module source root: `src/modules/risk_management/`

Module ID: `risk_management`

The package owns its wrapper metadata, risk entity, commands, API routes, pages, ACL, setup grants, events, encryption, custom-entity registration, query-index payload policy, AI agent definition, translations, migrations, and tests.

There is no cross-module business reference in the MVP. The implementation must not import core module entities or repositories and must not introduce a direct ORM relationship to another module.

The package uses published Open Mercato packages through their public exports. AI Assistant is an explicit optional technical integration, not a business-data dependency and not a hard module `requires` edge:

- `package.json` declares `@open-mercato/ai-assistant` as an optional peer dependency through `peerDependenciesMeta` and as a development dependency for typechecking/tests;
- `ai-agents.ts` uses type-only imports, so published runtime code does not require the package merely to load the risk register;
- the supported peer range matches the Open Mercato source revision used to build/test the module; any future release/version metadata is a separate post-staging decision;
- the identification action has no top-level value import from the optional peer: its AI branch loads the runtime lazily/optionally and maps an unavailable package or registry to the documented `404`, while demo mode and the register remain loadable without AI Assistant;
- module-decoupling coverage exercises `risk_management` without AI Assistant active.

When AI Assistant, its provider, or its model is unavailable, CRUD and register pages continue to work. The identification page is owned by `risk_management`, remains accessible with `risk_management.risk.identify`, and explains the unavailable or failed generation state.

Activation is exclusively through the Official Modules mechanism. Do not hand-edit `apps/mercato/src/modules.ts`, `packages/create-app/template/src/modules.ts`, `apps/mercato/src/official-modules.generated.ts`, or generated registries.

Although the register can operate without AI, the maintainer explicitly chose one specification after scope review. The cohesive capability is “identify and register risk”: the register is the aggregate/system of record and AI is one read-only intake adapter into that create contract. There is one deployable package and no integration glue module.

### Request and Mutation Flow

```text
Manual form ───────────────┐
                           ├─> risk CRUD API ─> command ─> scoped/encrypted Risk row
Context form ─> candidate source ─> candidate review ─> explicit Add ─┘
                    │
                    ├─ Checkpoint 5: fixed local demo fixture
                    └─ Checkpoint 6: module action ─> read-only text agent ─> validated JSON

Risk row ─> scoped/decrypted CRUD response ─> derived criticality ─> DataTable/CrudForm
```

Candidate generation is read-only, and candidate editing before Add is local/transient. They emit no domain event and create no undo record. Explicit Add is indistinguishable from manual create at the domain layer.

### Canonical Scoring Contract

`probability` and `impact` are integers from 1 through 5. Commands always compute:

```text
riskScore = probability × impact
```

Criticality mapping, copied from the prototype, is fixed:

| Score | Criticality |
|---:|---|
| 1–2 | `minimal` |
| 3–5 | `low` |
| 6–9 | `medium` |
| 10–14 | `high` |
| 15–25 | `critical` |

Probability labels:

- 1: very unlikely (less than 10%);
- 2: unlikely (10–30%);
- 3: possible (30–60%);
- 4: likely (60–85%);
- 5: very likely (more than 85%).

Impact uses currency-neutral qualitative labels: negligible, minor, moderate, major, severe. The separate financial-impact amount is optional evidence and does not change the score. The prototype’s fixed PLN bands are not carried into a multi-currency platform.

Create/update does not accept `riskScore` or `criticality`. Strict Zod validation rejects these keys rather than trusting or silently discarding them.

### Commands and Events

Commands use singular IDs:

| Command | Undo contract | Notes |
|---|---|---|
| `risk_management.risk.create` | Soft-delete the created record | Computes score and validates the financial pair before write. |
| `risk_management.risk.update` | Restore the complete before snapshot, including custom fields | Enforces optimistic lock and recomputes score from the final probability/impact pair. |
| `risk_management.risk.delete` | Restore `deleted_at` and the before snapshot | Soft delete only. |

Events declared with `createModuleEvents(... as const)`:

- `risk_management.risk.created`
- `risk_management.risk.updated`
- `risk_management.risk.deleted`

Commands use `runCrudCommandWrite` and normal CRUD side-effect helpers so audit, undo, custom fields, query indexing, and events occur after successful commit. Undo uses `emitCrudUndoSideEffects` to restore index/cache state. AI generation has no command or event because it has no state change.

No notification, subscriber, worker, or external side effect is introduced.

### AI Agent Contract

Module-root `ai-agents.ts` declares `risk_management.risk_identifier`:

- `moduleId: 'risk_management'`;
- `executionMode: 'chat'`, used only for a one-shot `runAiAgentText` invocation rather than chat UI/session persistence;
- `allowedTools: []`;
- `readOnly: true` and `mutationPolicy: 'read-only'`;
- `requiredFeatures: ['risk_management.risk.identify']`;
- `loop: { maxSteps: 1 }`;
- no `defaultProvider` or `defaultModel`, so standard instance/tenant/runtime resolution applies;
- no runtime model override from the page;
- no attachments in the MVP.

The prompt uses the standard seven named sections (`role`, `scope`, `data`, `tools`, `attachments`, `mutationPolicy`, `responseStyle`). It treats submitted business text as untrusted data rather than instructions, does not claim regulatory compliance, does not invent company facts, returns no controls/mitigations, and uses only allowed category values.

The requested response is JSON matching this strict schema:

```typescript
z.object({
  risks: z.array(z.object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(10_000),
    category: riskCategorySchema,
    probability: z.number().int().min(1).max(5),
    impact: z.number().int().min(1).max(5),
    rationale: z.string().trim().min(1).max(4_000),
    relevantRegulations: z.array(
      z.string().trim().min(1).max(120)
    ).max(10),
  }).strict()).min(1).max(5),
}).strict()
```

Score, criticality, and financial value are absent from AI output. The UI derives score/criticality from validated probability/impact. Financial value defaults to null unless the operator supplies it while reviewing the candidate.

The module owns `POST /api/risk_management/identify`. Its declarative route metadata requires `risk_management.risk.identify`, as does the registered agent. When the configured source is `ai`, the handler additionally checks `ai_assistant.view` with the standard wildcard-aware feature helper before lazily resolving the optional runtime. Demo mode does not require AI Assistant access. The identification page itself requires only `risk_management.risk.identify`, which keeps the page renderable when AI Assistant is absent or the caller lacks its feature.

The action validates the input again on the server, serializes it as untrusted data, resolves and calls the registered agent through the AI Assistant runtime, and consumes the returned text stream in-process. It caps collected output at 32 KiB, accepts either one direct JSON object or one fenced `json` object, rejects ambiguous/multiple payloads, and applies the strict Zod schema. If the first model response is malformed, it may make one repair call containing the validation problem and bounded malformed response; oversize output is rejected without echoing it into a repair prompt, and a second failure is final. Score and criticality are recomputed after parsing and again by the create command if a candidate is added.

The action does not call a public chat endpoint, create a conversation/session, import a provider SDK, expose model selection to the browser, or give the agent tools. It logs only request ID, scope IDs, latency, source, candidate count, retry count, and error code—never form content, prompt/model text, parsed candidates, or provider credentials.

The route returns the same validated candidate response contract regardless of provider. It maps unauthenticated and feature failures through normal route metadata, distinguishes absent/inactive AI Assistant from provider/runtime and malformed-output failures with stable module-owned error codes, and does not promise dedicated `429` or `503` behavior. The UI retains inputs and the last valid result on every failure. When `RISK_MANAGEMENT_IDENTIFICATION_SOURCE=ai`, it never substitutes demo candidates.

The risk package does not add analytics or persistence containing context/candidates. It relies on the supported AI Assistant version's metadata-oriented runtime behavior and cannot independently guarantee provider-side or future shared-runtime logging/retention; those boundaries are covered by peer compatibility review, staging configuration, and provider policy.

### Identification Input Contract

The client serializes one JSON object into the user message after local Zod validation:

```typescript
{
  businessContext: string,        // required, 20..10_000 characters
  industry: IndustryId | null,
  area: RiskAreaId | null,
  methodology: MethodologyId | null,
  regulations: RegulationId[],   // unique, max 10
  timeHorizon: TimeHorizonId | null
}
```

Fixed IDs are English, stable, and translated only at presentation:

- industries: `finance_banking`, `energy`, `telecommunications`, `public_administration`, `manufacturing`, `retail`, `it_software`, `healthcare`, `transport_logistics`, `other`;
- areas: `it_cybersecurity`, `operations`, `regulatory_compliance`, `finance`, `people_hr`, `supply_chain`, `physical_security`, `other`;
- methodologies: `iso_31000`, `coso_erm`, `nist_rmf`, `fair`;
- regulations: `iso_27001`, `gdpr`, `nis2`, `dora`, `iso_31000`, `soc_2`, `pci_dss`;
- time horizons: `short_under_1_year`, `medium_1_to_3_years`, `long_over_3_years`.

Only `businessContext` is required. Optional selections refine the prompt. Methodology never switches the stored formula.

### Access Control and Setup

ACL feature IDs are frozen once shipped:

- `risk_management.risk.view`
- `risk_management.risk.manage`
- `risk_management.risk.identify`

`manage` is required for create/update/delete and includes no implicit AI access. `identify` controls the page/agent. In Checkpoint 6, `ai_assistant.view` is additionally required by the module-owned identification action only when AI generation is attempted.

Default role grants:

```typescript
defaultRoleFeatures: {
  superadmin: ['risk_management.*'],
  admin: ['risk_management.*'],
  employee: [],
}
```

Risk data may be organization-wide and sensitive, so employee access is opt-in. Existing tenants receive new admin grants through `yarn mercato auth sync-role-acls`; implementation must not silently grant risk access to all employees.

## Data Model

### RiskManagementRisk

Entity ID: `risk_management:risk`
Table: `risk_management_risks`

| Field | Database type | Required | Contract |
|---|---|---:|---|
| `id` | UUID | yes | Primary key, generated. |
| `organization_id` | UUID | yes | Mandatory organization scope. |
| `tenant_id` | UUID | yes | Mandatory tenant scope. |
| `title` | text | yes | 1–255 characters; encrypted. |
| `description` | text | no | Maximum 10,000 characters; encrypted. |
| `category` | text | yes | Fixed enum below. |
| `probability` | smallint | yes | Integer 1–5. |
| `impact` | smallint | yes | Integer 1–5. |
| `risk_score` | smallint | yes | Server-computed 1–25; DB constraint equals probability × impact. |
| `financial_impact_amount` | text | no | Canonical non-negative decimal string, precision 18/scale 2; encrypted. |
| `financial_impact_currency` | text | no | Uppercase ISO-4217-style three-letter code; required iff amount exists. |
| `created_at` | timestamptz | yes | Standard timestamp. |
| `updated_at` | timestamptz | yes | Standard optimistic-lock version source. |
| `deleted_at` | timestamptz | no | Soft delete. |

Category IDs:

- `it`
- `operational`
- `regulatory`
- `financial`
- `people`
- `supplier`
- `physical_security`

Database constraints:

- probability and impact each between 1 and 5;
- risk score between 1 and 25;
- `risk_score = probability * impact`;
- amount/currency are both null or both non-null;
- currency matches three uppercase ASCII letters when present.

Indexes:

- `(organization_id, tenant_id, deleted_at, created_at)`;
- `(organization_id, tenant_id, deleted_at, category, risk_score)`;
- `(organization_id, tenant_id, deleted_at, updated_at)`.

No uniqueness constraint is added: two distinct risks may share a title.

### Custom Entity Registration

Register `risk_management:risk` in `ce.ts` with `labelField: 'title'` and `showInSidebar: false`. CRUD and `CrudForm` support installed custom fields using the `customers` reference patterns. Custom fields are extension points, not additional built-in MVP fields.

Module-root `translations.ts` declares entity title/description translation keys required by module discovery and custom-entity presentation. Locale JSON files provide all user-facing translations.

### Encryption

`encryption.ts` declares `defaultEncryptionMaps` for:

- `title`;
- `description`;
- `financial_impact_amount`.

Every CRUD list/detail read uses `findWithDecryption`/`findOneWithDecryption` under explicit tenant and organization scope. AI input and candidate rationale are never stored, so they do not need encryption-map entries. UI/API errors and logs must not echo raw encrypted-field values.

`encryption.ts` exports `defaultEncryptionMaps: ModuleEncryptionMap[]` from `@open-mercato/shared/modules/encryption`; no custom crypto/KMS implementation is allowed.

### Security and Encoding Rules

- Zod validates every query/body before repository, command, or model logic.
- ORM/query-engine predicates use parameterized APIs only; no user value is interpolated into SQL.
- Risk title, description, rationale, and business context render as React text only; no `dangerouslySetInnerHTML`, Markdown HTML passthrough, or model-supplied markup is allowed.
- IDs inserted into URLs use `encodeURIComponent`; AI input uses `JSON.stringify` after validation; file paths are not accepted.
- API responses never include provider credentials, prompt/system text, tenant secrets, role data, or fields beyond the documented projection.
- Structured logs contain IDs, source, counts, retry counts, durations, status/error codes, and agent ID only—not risk text, financial amount, AI context, model output, or candidates.

### Derived Response Fields

Every risk list/detail response includes:

- `riskScore` from `risk_score`;
- `criticality` derived by the fixed threshold helper;
- `updatedAt` for optimistic locking.

`criticality` is not a database column. One shared pure helper is used by commands, API transformation, AI candidate display, and tests.

## API Contracts

All API files export `openApi`. Scope fields come from auth context; request bodies cannot select tenant or organization.

### Risk CRUD

Route: `GET/POST/PUT/DELETE /api/risk_management/risks`

This path follows module API auto-discovery from `src/modules/risk_management/api/risks/route.ts`; the browser-facing backend page slug remains hyphenated.

Metadata:

- `GET`: `requireAuth: true`, `requireFeatures: ['risk_management.risk.view']`;
- `POST`, `PUT`, `DELETE`: `requireAuth: true`, `requireFeatures: ['risk_management.risk.manage']`.

Implementation uses `makeCrudRoute` with `indexer: { entityType: 'risk_management:risk' }`, command handlers, custom-field helpers, encrypted reads, mutation guards, and standard optimistic locking.

#### GET query

- `id`: single UUID for detail loading;
- `ids`: comma-separated UUIDs, maximum 100;
- `page`, `pageSize` (maximum 100);
- `category`: one category ID;
- `criticality`: one derived criticality mapped server-side to a risk-score range;
- `sortField`: `created_at`, `updated_at`, `category`, `probability`, `impact`, or `risk_score`;
- `sortDir`: `asc` or `desc`.

Financial amount is encrypted and is not sortable/filterable. Title sort is excluded because ciphertext order is meaningless.

Response fields use camelCase:

```typescript
{
  id: string
  organizationId: string
  tenantId: string
  title: string
  description: string | null
  category: RiskCategory
  probability: number
  impact: number
  riskScore: number
  criticality: RiskCriticality
  financialImpactAmount: string | null
  financialImpactCurrency: string | null
  customValues?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
```

#### POST request

```typescript
{
  title: string
  description?: string | null
  category: RiskCategory
  probability: 1 | 2 | 3 | 4 | 5
  impact: 1 | 2 | 3 | 4 | 5
  financialImpactAmount?: string | null
  financialImpactCurrency?: string | null
  // cf_* / cf:* custom-field values through standard helpers
}
```

The command normalizes the decimal/currency pair, computes score, and returns the created ID plus undo metadata through existing CRUD behavior.

#### PUT request

Requires `id` plus at least one editable field. The command loads the current record under scope, merges the patch, validates the final state, recomputes score if probability/impact changed, and rejects direct scope/timestamp/score/criticality changes.

Optimistic locking uses the standard expected-version header built from `updatedAt`. Stale update/delete returns the shared structured `409` conflict body.

#### DELETE request

Requires `id` and expected version. It soft-deletes through `risk_management.risk.delete` and supports command undo.

### Risk Identification Action (New Route)

Route: `POST /api/risk_management/identify`.

The risk page sends the validated identification object directly:

```json
{
  "businessContext": "Current company and operating context...",
  "industry": "technology",
  "area": "operations",
  "methodology": null,
  "regulations": ["gdpr"],
  "timeHorizon": "next_12_months"
}
```

The page does not send an agent ID, model override, system messages, attachments, raw scope IDs, or stored risk data. The route selects the frozen agent and source server-side. Success returns only the validated contract:

```typescript
{
  source: 'demo' | 'ai'
  risks: RiskIdentificationCandidate[] // 1..5
}
```

In Checkpoint 5 the browser uses the local demo source and this route does not yet exist. After Checkpoint 6 the browser calls this route in both modes; the action reads the server-owned selector and either returns the same versioned fixture (`demo`, staging/tests only) or invokes AI (`ai`). The browser cannot choose the source per request, and the default after Checkpoint 6 is `ai`.

Module-owned errors to document in OpenAPI and handle in the UI:

- `400`: invalid identification input;
- `401`: unauthenticated;
- `403`: missing identify or AI Assistant access;
- `404`: AI Assistant or registered agent unavailable;
- `422`: model output remains invalid after the single repair attempt;
- `500`: provider/runtime/internal failure.

The action may pass through a future standard throttling response, but this spec does not invent `429` or `503` guarantees. The UI shows an actionable translated error, retains the input form and existing results, and never substitutes demo results after an AI error.

## Internationalization

Add complete EN/PL/DE/ES locale keys for:

- module/sidebar labels and breadcrumbs;
- entity title/description metadata;
- register title, description, columns, filters, sorting, actions, counts, empty, loading, error, and not-found states;
- create/edit/delete form labels, validation, probability/impact definitions, score preview, custom fields, and success/error flashes;
- category and criticality labels;
- financial amount/currency pairing messages;
- identification fields and every industry/area/methodology/regulation/horizon ID;
- demo-source disclosure; AI transparency notice; generation button/loading/error/no-provider/malformed-output copy;
- candidate count, rationale, relevant-regulation labels, Edit/Reject/Add/Added actions, and discard/regenerate confirmation.

No persisted enum uses a translated label.

## UI/UX

### Navigation and Routes

| Route | Purpose | Feature |
|---|---|---|
| `/backend/risk-management/risks` | Register list | `risk_management.risk.view` |
| `/backend/risk-management/risks/create` | Manual create | `risk_management.risk.manage` |
| `/backend/risk-management/risks/[id]` | Detail/edit/delete | view; manage for mutations |
| `/backend/risk-management/identify` | Context input/candidate review | page: `risk_management.risk.identify`; Checkpoint 6 AI action: also `ai_assistant.view` |

Only register and identify appear in navigation. Each route has colocated `page.meta.ts`, translated breadcrumbs, and server-enforced feature metadata. The identify navigation/page is gated only by the risk feature; it does not disappear merely because AI Assistant is inactive.

Register declares `pagePriority: 0` and `pageOrder: 10`; Identify declares
`pagePriority: 1` and `pageOrder: 20`. This keeps the two entries deterministic
under Open Mercato's priority-first item sorting and places the user-facing
`Risk AI` group first among optional-module groups.
`Risk AI` is the product/module title; the stable package, module ID, routes,
ACL IDs, and persistence contracts retain the `risk-management` /
`risk_management` technical namespace. Absolute placement
ahead of Open Mercato's protected core-group defaults is a host/sidebar
preference, not an Official Module contract; staging may apply a saved
Risk-AI-first layout to the `admin` role through Sidebar Customization
without coupling core code to this optional package.

### Risk Register

Use `Page`, `PageHeader`, `PageBody`, and `DataTable`; do not copy the prototype’s raw table.

Stable host IDs:

- `entityId="risk_management:risk"`;
- `extensionTableId="risk_management.risk.list"`;
- replacement handle `page:/backend/risk-management/risks`.

Columns:

- title, truncated with explicit maximum width;
- category;
- probability;
- impact;
- score plus `StatusBadge` criticality label;
- formatted financial impact or em dash;
- updated date;
- stable `RowActions` IDs: `open`, `edit`, `delete`.

Filters are category and criticality. The table does not expose free-text search in this MVP. Create is shown only with manage permission. Row deletion uses `ConfirmDialog`, `useGuardedMutation`, the row’s `updatedAt`, and unified conflict surfacing.

Every non-`CrudForm` mutation supplies `retryLastMutation` in its injection context so guard/conflict UI can safely retry the exact operator action.

The zero state uses `EmptyState` with manual-create and identification actions filtered by ACL. Loading/error states use shared DataTable/detail primitives.

### Create and Detail/Edit

Use one shared `CrudForm` field definition for create and edit with stable `entityId="risk_management:risk"` and field/group IDs.

Groups:

1. Basics: title, description, category.
2. Assessment: probability, impact, live read-only score/criticality preview.
3. Financial value: amount and currency.
4. Installed custom fields through the standard injection contract.

The preview is convenience only; the server remains authoritative. Currency is disabled/cleared when amount is null according to final-pair validation. Detail loading follows `loading -> notFound -> error -> ready` and uses `RecordNotFoundState`. `CrudForm` derives optimistic-lock headers from `initialValues.updatedAt` for edit and delete.

### Risk Identification

The page uses the standard layout and a route-local `RiskIdentificationClient`, split into smaller components.

Input is a `CrudForm` in custom-submit mode with all six approved context fields. `businessContext` is the only required field; the other five are nullable/optional but validated when present.

Checkpoint 5 shows a prominent translated `Alert` that results are fixed English demonstration data, do not depend on the entered context, and are not an actual risk assessment. It returns the same versioned set after every valid submission without a network request or artificial delay. Checkpoint 6, when configured with `source=ai`, replaces this with an `Alert` explaining that submitted content is sent to the configured external AI provider, is not saved by this module, and must not include unnecessary personal data.

Generation behavior:

1. Validate the form locally.
2. Disable generation while the source is being resolved; for AI, show shared loading feedback and enforce a client-side single in-flight request.
3. Replace results only after a successful, fully validated response.
4. Preserve current results on failure.
5. Ask with `ConfirmDialog` before replacing unadded/edited candidates on regenerate or reset.
6. In AI mode, distinguish absent/inactive AI Assistant (`404`), missing AI access (`403`), malformed output (`422`), and generic provider/runtime failure (`500`) without hiding the page or fabricating candidates.

Candidate presentation uses shared `Card`, `StatusBadge`, `Tag`, text, and button primitives. Each card shows title, description, category, probability, impact, derived score/criticality, rationale, and relevant regulations.

Actions:

- **Edit** opens an embedded `CrudForm` dialog for candidate fields and optional financial value; `Cmd/Ctrl+Enter` applies local changes and `Escape` cancels.
- **Reject** removes only the local candidate; no confirmation is required because it was never persisted.
- **Add to register** is shown only with manage permission and calls the normal risk create API through `useGuardedMutation`; on success the card becomes Added, repeat Add is disabled, and the card links to the new risk. An ambiguous network result shows “Result unknown — refresh the Risk Register before retrying” rather than automatically retrying.

There is no Add All action. One explicit action per candidate keeps review and failure handling clear.

### Design-System Requirements

- No raw form controls, raw buttons, raw tables, raw `fetch`, `window.confirm`, custom toast, inline SVG, hard-coded colors, arbitrary text sizes, or Framer Motion.
- Use `apiCall`/`apiCallOrThrow`, `flash`, `Button`/`IconButton`, `Alert`, `EmptyState`, `LoadingMessage`, `ErrorMessage`, `FormHeader`/`FormFooter`, `StatusBadge`, `Tag`, and lucide-react icons.
- Every icon-only control has an `aria-label`; color is never the only criticality signal.
- Visible `page.meta.ts` entries use a registry-safe string icon ID such as `'shield-alert'`.
- Dialogs support `Cmd/Ctrl+Enter` and `Escape`.
- Touched/new code must pass design-system lint/health checks without increasing repository violation counts.

## Frontend Architecture Contract

### Server/Client Boundary Map

| Route/surface | Server root | Client islands | Data owner | Notes |
|---|---|---|---|---|
| register list | route `page.tsx` and metadata | `RiskRegisterClient` | risk CRUD API | DataTable state only; no page-root client blob. |
| create | route `page.tsx` and metadata | `RiskFormClient` | risk CRUD API | Shared field builder with detail. |
| detail/edit | route `page.tsx` and metadata | `RiskFormClient` | risk CRUD API | Distinct loading/not-found/error/ready states. |
| identify | route `page.tsx` and metadata | `RiskIdentificationClient`, `RiskIdentificationForm`, `RiskCandidateList`, `RiskCandidateEditDialog` | candidate-source boundary; module identification API in AI mode; risk CRUD only on Add | No AI/chat provider at app root. |

### `"use client"` Ledger

| File | Exact browser capability | Heavy deps | Cleanup/hydration risk | Alternative rejected |
|---|---|---|---|---|
| `RiskRegisterClient` | paging/filter state and row actions | DataTable only | abort list requests on unmount | server-only table lacks current DataTable interactions |
| `RiskFormClient` | CrudForm state and live score preview | CrudForm only | no long-lived subscription | duplicate create/edit forms rejected |
| `RiskIdentificationClient` | generation/result state and guarded Add | shared UI only | abort request and prevent stale update | page-root client blob rejected |
| `RiskIdentificationForm` | transient input state and submit | CrudForm only | no global provider | hand-built form rejected |
| `RiskCandidateEditDialog` | local candidate editing and keyboard behavior | Dialog + CrudForm | reset draft on close | query/session transfer rejected |

### Budgets

| Budget | Spec value |
|---|---|
| New generated/page-root `"use client"` files | 0 |
| New global providers | 0 |
| Client file over 300 LOC | 0 without explicit extraction/justification |
| New heavy browser libraries | 0 |
| Initial register page size | 25; API maximum 100 |
| AI candidates per run | maximum 5 |
| Hydration smoke coverage | required for all four routes |
| Performance evidence | client-boundary check, build/bundle signal, and one runtime route-load observation |

No React provider or global bootstrap UI is added. The AI provider/model is resolved server-side by AI Assistant; risk UI never imports a vendor SDK.

## Configuration

No risk-management settings page is added. Checkpoint 5 needs no provider or Risk Management environment variable.

Checkpoint 6 introduces one non-secret deployment selector:

```text
RISK_MANAGEMENT_IDENTIFICATION_SOURCE=demo|ai
```

Its post-Checkpoint-6 default is `ai`. `demo` is permitted only for explicit staging demonstrations and deterministic tests. The value is read server-side, must be passed through the host Docker/Ansible environment contract, is shown clearly in the page disclosure, and never changes automatically after a provider or model error. Unknown values fail closed as configuration errors rather than selecting demo. Production documentation must not recommend `demo` as a real assessment mode.

Security prerequisite: the existing platform variable `OM_SEARCH_STORE_RAW_TOKENS` must be unset or `false`. Official Module installation/deployment documentation and the implementation validation gate check this condition. Enabling raw-token debug storage is unsupported while this module contains sensitive risk text; the package does not mutate the host’s environment.

When the optional peer is installed and active, AI availability follows existing AI Assistant configuration:

- configured provider credentials;
- runtime/tenant model resolution;
- existing agent-policy overrides.

Ollama Cloud is configured through the AI Assistant's existing OpenAI-compatible provider/model settings. Provider token, URL, and model values are injected only through protected staging/production configuration and are never committed. No provider, model, token, or provider-specific client is hard-coded in the package. A future configurable scoring model requires a separate spec and migration strategy.

## Cache and Query Indexing

- No module-specific cache is introduced.
- CRUD uses shared query/cache behavior. Cold misses fall through to scoped database queries.
- Create/update/delete and undo invalidate standard `risk_management:risk` aliases tagged with tenant and organization after commit.
- Do not add `search.ts`, a global search presenter, fulltext, vector source, or title search in this MVP.
- `makeCrudRoute` and commands keep `indexer.entityType = 'risk_management:risk'` for the standard entity projection, custom fields, cache aliases, and undo behavior.
- Do not supply a custom `searchTokenDoc`: the current full-rebuild path cannot apply the same per-write projection, so doing so would create false privacy parity between CRUD updates and rebuilds.
- The stored entity-index projection relies on the registered encryption map and is tenant/organization scoped. With the supported/default `OM_SEARCH_STORE_RAW_TOKENS=false`, standard query-index processing may decrypt string values in memory but stores only scoped hashes in `search_tokens`. If a host enables the raw-token debug option, this hashes-only guarantee no longer applies.
- Because no `search.ts` entity config, presenter, or ACL mapping is registered, risk records are not exposed as module global-search results. Tests cover this absence and query-index tenant/organization scoping.
- Delete and undo remove/restore projection and token state through standard side effects.
- A policy requiring sensitive fields to produce no hashed query tokens needs a platform-level per-entity token projection/opt-out contract. That cross-cutting core change and any later title-search UX require a separate spec.

### Performance and Scale

- A register request performs one paged risk query/count; it must not issue per-row follow-up queries.
- The three declared composite indexes cover date scans, category/score filters, and optimistic-version refreshes.
- `pageSize` is capped at 100. The MVP follows the existing DataTable/`makeCrudRoute` page contract.
- Regulation input/output arrays are capped at ten and never persisted; custom fields use the existing entities framework.
- No operation touches more than one risk row, so no queue/worker/progress job is required.
- Query-index projections/tokens are rebuilt asynchronously through existing side effects; lag cannot affect canonical CRUD reads.

## Official Module Packaging, Migration, and Backward Compatibility

The change is additive and isolated to the Official Modules repository:

- one new npm workspace package;
- one new module and database table with constraints/indexes;
- new API/page routes;
- new ACL, event, entity, AI-agent, and widget/host IDs;
- no changeset, npm publication, release tag, or merge as part of the incremental staging plan.

No existing core contract, auth service, app module list, or create-app template is changed.

### Package and Activation Workflow

1. Attach or initialize the optional Official Modules checkout according to repository documentation.
2. Scaffold `packages/risk-management/` in that repository with the same build/watch/test conventions as its closest maintained package.
3. Add the module source under `src/modules/risk_management/`, package root re-exports, migrations, and tests.
4. From the host repository, activate for development with `yarn official-modules add risk-management --local`.
5. Run `yarn install`, then `yarn generate` after module/agent/discovery changes.
6. Refresh structural configuration caches for test tenants.
7. Run `yarn db:generate` only as a diff probe and keep only the module-owned migration/snapshot. Run it again and require no remaining diff.
8. Do not run `yarn db:migrate` without explicit user approval.
9. Commit and push the unmerged feature branches used by the staging plan. Do not publish, merge, open a release PR, or commit unrelated generated activation churn; any later upstream/release path requires a separate decision.

### Backward Compatibility Surface Review

| Surface | Impact |
|---|---|
| Distribution | New optional package `@open-mercato/risk-management`; no default core activation. |
| Auto-discovery | Additive convention files inside the package only. |
| Types/interfaces | New risk types only. |
| Function signatures/import paths | New exports only; no moved or changed existing exports. |
| Event IDs | New frozen `risk_management.risk.*` IDs. |
| Widget/host IDs | New stable risk DataTable/CrudForm/page IDs. |
| API routes | New `/api/risk_management/risks` and additive Checkpoint 6 action `/api/risk_management/identify`. |
| Database | New additive module-owned table/indexes/constraints only. |
| DI | No new or changed DI contract. |
| ACL | New frozen `risk_management.risk.*` IDs. |
| AI | Explicit optional peer integration; new frozen `risk_management.risk_identifier`; standard AI Assistant runtime/model resolution consumed in-process without changing its contracts. |
| Generated files | Regenerated through supported commands; never hand-edited. |

## Implementation Plan

Each phase ends in a working application and includes its tests.

### Implementation Status

| Increment | Status | Date | Notes |
|---|---|---|---|
| Checkpoint 2 — previews and navigation | Done | 2026-07-20 | Deployed and verified on staging at pinned host and Official Modules revisions. |
| Checkpoint 3 — minimal real register | Done | 2026-07-21 | Deployed from pinned unmerged host/Official Module commits after a verified backup. The additive migration, exact revisions, admin CRUD, role/API denial, scoring/filtering/locking, sidebar, preview, and clean runtime logs were verified on staging. |
| Checkpoint 4 — complete manual register | Done | 2026-07-21 | Deployed from Official Modules `4c1216e2abc8950ba5395268471820eb8829ee20` and host `92bb50020a1bfdca05a8d3e3e984e9d2921a4d29` after verified backup/restore rehearsal. Migration, existing records, ACL synchronization, routes, and new fields were verified on staging. |
| Checkpoint 5 — deterministic identification-to-register | Not Started | — | Final six-field form and fixed English demo candidates will prove review/edit/reject/Add without AI or schema changes. |
| Checkpoint 6 — live AI identification | Not Started | — | Ollama-backed AI will replace only the candidate source; no silent demo fallback. |

### Phase 1: Official Module, Data, and Manual Register

1. Scaffold package wrapper/build/test metadata and `src/modules/risk_management/` metadata, local `AGENTS.md`, ACL, setup, entity, validators, `translations.ts`, encryption, custom-entity declaration, scoring helper, events, migration, and snapshot.
2. Implement undoable risk commands with custom-field support, encrypted reads, deterministic scoring, optimistic locking, and standard CRUD side effects.
3. Implement `/api/risk_management/risks` CRUD/OpenAPI with tenant/organization/ACL/locking tests.
4. Build register, manual create, and detail/edit/delete routes with DataTable, CrudForm, filters, translations, loading/error/not-found/empty/conflict states.
5. Activate locally through Official Modules, run generation, refresh structural caches, and verify operation without AI Assistant.

Working result: an authorized admin can manually create, list/filter, edit, and delete risks without AI configuration.

### Phase 2: Deterministic Identification-to-Register

1. Build the final identification `CrudForm` with all six fields, requiring only `businessContext` and validating every supplied value.
2. Define one shared strict candidate schema/source interface and a new versioned fixture containing at most five fixed English domain-demo candidates.
3. Add the translated demo disclosure, deterministic generation, at-most-five candidate rendering, local edit/reject, and explicit guarded create through the risk API.
4. Verify identify/manage ACL combinations, single-flight Add behavior, Added/link state, reload persistence, and that no candidate is stored before explicit Add.

Working result: an authorized operator can demonstrate the entire two-view workflow with no provider, secret, AI package, AI request, or new database schema.

### Phase 3: Live AI Candidate Source

1. Add optional AI Assistant peer wiring and the read-only, no-tools, one-step `risk_management.risk_identifier` text agent.
2. Add `POST /api/risk_management/identify` with input/OpenAPI/ACL validation, standard runtime/model resolution, bounded text collection, raw/fenced JSON extraction, strict schema validation, and at most one repair attempt.
3. Introduce the explicit `demo|ai` source selector, default it to `ai`, and preserve the Phase 2 review/Edit/Reject/Add UI unchanged. AI errors must never activate demo output.
4. Pass Ollama-compatible provider/model configuration through Docker and Ansible without committing the token, and add absent-module/permission/provider/malformed-output UX.
5. Add deterministic tests for raw JSON, fenced JSON, repair success, repeated invalid output, provider failure, ACLs, and absent AI Assistant. Keep live Ollama smoke testing optional and secret-gated.

Working result: the requested AI-assisted two-view MVP works end to end, while manual CRUD and the deterministic staging/test mode remain isolated from provider availability.

### Phase 4: Privacy, Integration Coverage, and Release

1. Verify encrypted/scoped query-index projection behavior and the absence of module global/fulltext/vector/title search.
2. Complete self-contained Playwright coverage for manual CRUD, isolation/locking, deterministic candidate-to-register, and intercepted AI route behavior.
3. Run design-system/client-boundary checks, package tests/build, host generation/typecheck/lint/build, and activation/decoupling integration coverage.
4. Record the final exact Official Modules/host SHAs and staging verification evidence. Do not publish, merge, create a changeset solely for staging, or move this spec to `implemented/` until implementation and verification evidence exists.

## File Manifest

Paths below are relative to `open-mercato/official-modules`; in a host checkout prefix them with `external/official-modules/`.

| Path | Action | Purpose |
|---|---|---|
| `packages/risk-management/package.json` | create | Official package metadata, exports, scripts, Open Mercato peers, and optional AI Assistant peer metadata. |
| `packages/risk-management/README.md` | create | Install/activate/upgrade guidance, AI optionality, data/privacy notes, and raw-token security prerequisite. |
| `packages/risk-management/build.mjs`, `watch.mjs`, `tsconfig.json`, `jest.config.cjs` | create | Match Official Modules package tooling. |
| `packages/risk-management/src/index.ts` | create | Re-export module/package metadata required by the loader. |
| `packages/risk-management/src/modules/risk_management/AGENTS.md` | create | Domain/scoring/AI/security rules and validation commands. |
| `.../index.ts` | create | Module metadata. |
| `.../acl.ts`, `.../setup.ts`, `.../translations.ts` | create | Features, default grants, entity metadata translations. |
| `.../ce.ts`, `.../encryption.ts` | create | Custom entity and encryption policy. |
| `.../events.ts`, `.../ai-agents.ts` | create | Typed events and read-only text agent. |
| `.../data/entities.ts`, `.../data/validators.ts` | create | Entity and strict schemas/enums. |
| `.../lib/scoring.ts`, `.../lib/identification/**` | create | Shared score/criticality helper, candidate schema/source boundary, fixed demo fixture, and bounded AI-output parser. |
| `.../commands/risks.ts`, `.../commands/index.ts` | create | Undoable CRUD commands. |
| `.../api/openapi.ts`, `.../api/risks/route.ts`, `.../api/identify/route.ts` | create | CRUD, Checkpoint 6 identification action, and OpenAPI. |
| `.../backend/risk-management/**` | create | Four server route roots and registry-safe metadata. |
| `.../components/**` | create | Route clients, form fields, candidate cards/dialog. |
| `.../i18n/{en,pl,de,es}.json` | create | UI translations. |
| `.../migrations/Migration*.ts`, `.../migrations/.snapshot-open-mercato.json` | create | Additive schema. |
| `.../__tests__/**`, `.../api/**/__tests__/**` | create | Scoring, validators, commands, API, ACL, query-index privacy, and agent tests. |
| `.../__integration__/TC-RISK-*.spec.ts` | create | Self-contained integration coverage. |

Explicitly absent:

- changes under `packages/core/src/modules/` or `packages/core/src/modules/auth/`;
- `api/owners/route.ts` or an owner-directory service;
- manual changes to app/create-app module registries;
- a host repository submodule pointer bump unless separately approved.
- changesets, package publication, release tags, or branch merges during the incremental staging plan.

## Testing Strategy

### Unit and API Coverage

- all 25 probability/impact combinations produce expected score/criticality;
- strict schemas reject score, criticality, scope, timestamps, invalid enums, invalid decimals, and unpaired currency fields;
- commands recompute score on create/update and undo restores built-in/custom fields and index state;
- every CRUD read/write is tenant and organization scoped;
- encrypted fields round-trip only through scoped decryption helpers;
- stale update/delete returns structured 409; fresh responses return new `updatedAt`;
- list filters map criticality to exact score ranges and support category;
- page size and `ids` caps are enforced;
- entity-index projections remain encrypted/scoped; with raw-token storage disabled, query tokens are hashed/scoped; no custom per-write token projection claims stronger behavior than full rebuilds;
- no `search.ts`, global search result, fulltext document, vector source, or title-search control is registered;
- search configuration resolves `storeRawTokens: false` in supported test/deployment gates and module documentation flags `true` as unsupported;
- the demo source returns a fresh but deeply equal copy of one versioned English fixture after every valid input, contains at most five schema-valid candidates, performs no network/AI call, and is explicitly labelled;
- the agent uses `executionMode: 'chat'` for the text runtime, is read-only, has no tools/default model/runtime override, and uses `loop.maxSteps: 1`;
- the AI action accepts only the identification input contract, uses the frozen agent server-side, bounds collected text, parses raw and fenced JSON, validates the strict maximum-five schema, and permits no more than one repair attempt;
- repeated malformed model output is rejected with the documented module error and is never converted into fallback/demo candidates;
- raw AI context/result is absent from risk-package persistence and structured logger calls; shared AI Assistant behavior is verified against the supported peer version rather than reimplemented;
- package/module ID mapping and operation without AI Assistant are covered.

### Component/UI Coverage

- register renders DataTable columns, filters, stable row-action IDs, and ACL-aware actions;
- create/detail use the same CrudForm fields and persist every built-in/custom field;
- live score preview matches shared helper across thresholds;
- detail distinguishes loading/not-found/error/ready;
- stale edit/delete surfaces unified conflict UI;
- identification validates context and serializes stable enum IDs;
- demo generation is immediate, fixed, explicitly disclosed, and independent of the supplied context;
- AI generation preserves form/results on error and has no fake fallback;
- candidate Edit supports keyboard apply/cancel; Reject is local; Add calls risk create once and links the created record;
- criticality uses semantic StatusBadge labels, not color alone;
- all icon buttons have accessible names and page metadata uses string icons.

### Required Executable Integration Tests

All database fixtures are created through APIs, use generated IDs, and are deleted in `finally`/teardown. Tests do not rely on seeded/demo database rows; `TC-RISK-004` intentionally exercises the module-owned deterministic candidate fixture defined by this spec.

1. `TC-RISK-001.spec.ts` — UI manual create → list/filter → detail/edit → delete, including built-in and installed custom fields.
2. `TC-RISK-002.spec.ts` — API scoring, strict validation, tenant/org isolation, and stale optimistic-lock update/delete.
3. `TC-RISK-003.spec.ts` — with `OM_SEARCH_STORE_RAW_TOKENS=false`, query-index CRUD and full-rebuild paths remain tenant/org scoped, stored entity documents retain encryption, token rows contain hashes rather than plaintext, and the entity is absent from global search because it has no `search.ts` registration.
4. `TC-RISK-004.spec.ts` — Checkpoint 5 deterministic identification UI: submit the final context form, receive the fixed disclosed set, edit one, reject one, add one through the real CRUD API, reload, and verify that only the explicitly added risk persisted.
5. `TC-RISK-005.spec.ts` — ACL: view-only user can read but cannot mutate/identify; manage and AI feature combinations are independently enforced.
6. `TC-RISK-006.spec.ts` — package activation exposes routes/navigation and CRUD remains usable with AI Assistant disabled.
7. `TC-RISK-007.spec.ts` — Checkpoint 6 intercepted `POST /api/risk_management/identify`: valid raw/fenced JSON succeeds; malformed-first/valid-repair succeeds once; repeated malformed output, provider error, missing AI Assistant, and missing permission retain inputs/results and never return demo candidates.

The live Ollama call is not part of deterministic CI. If included, it is a separately gated staging smoke case using protected environment metadata and validates schema/availability only.

### Validation Gate

Choose the runner once using each repository’s documented Docker/local probing rule and record it in implementation output. Exact workspace scripts must be verified against the Official Modules repository when the package is scaffolded. Minimum intent:

Before exercising risk fixtures, record that `resolveSearchConfig().storeRawTokens === false`; fail the Risk Management validation gate if the host has enabled raw-token storage.

```bash
# In open-mercato/official-modules
yarn workspace @open-mercato/risk-management test
yarn workspace @open-mercato/risk-management build

# In the Open Mercato host after local activation
yarn generate
yarn db:generate
yarn build:packages
yarn typecheck
yarn lint
yarn test:integration:ephemeral risk_management
```

Also run the closest Official Modules package validation and root CI-ordered commands defined by that repository. `yarn db:migrate` is excluded unless the user separately approves applying migrations.

## Risks & Impact Review

#### Model output treated as authoritative

- **Scenario**: Malformed or manipulated model output supplies invalid fields or causes an unintended write.
- **Severity**: High
- **Affected area**: Identification and register integrity
- **Mitigation**: Bounded text collection, raw/fenced JSON extraction, strict Zod schema, at most one repair attempt, no tools, no AI mutation, score omitted/recomputed, and explicit one-candidate Add through normal CRUD.
- **Residual risk**: A schema-valid candidate can still be substantively poor; operator review remains required.

#### Demo output mistaken for a real assessment

- **Scenario**: A staging/test operator treats the fixed Checkpoint 5 candidates as if they were derived from the submitted company context.
- **Severity**: High
- **Affected area**: Product trust and risk decisions
- **Mitigation**: Prominent translated demo disclosure, fixed newly authored English content, no simulated delay or input-dependent selection, explicit `demo|ai` server configuration after Checkpoint 6, `ai` default, and tests that prevent silent AI-to-demo fallback.
- **Residual risk**: Screenshots can omit surrounding disclosure; demo mode must not be recommended for production assessment.

#### Sensitive context reaches logs or storage

- **Scenario**: Business context or model rationale containing confidential/personal information appears in logs, sessions, analytics, or database rows.
- **Severity**: High
- **Affected area**: AI runtime and privacy
- **Mitigation**: No module AI-run entity/analytics, no risk-package content logging, UI disclosure, tests/grep review of module logger payloads, and compatibility verification against the supported AI Assistant peer.
- **Residual risk**: The Official Module cannot independently enforce shared-runtime or provider logging/retention. Context is transmitted under the configured provider’s data policy; any required platform-wide guarantee belongs in a separate AI Assistant contract/change.

#### Lost update during concurrent editing

- **Scenario**: Two operators edit/delete the same risk and the later request silently overwrites the first.
- **Severity**: High
- **Affected area**: CRUD integrity
- **Mitigation**: `updated_at`, `updatedAt` payloads, CrudForm automatic headers, guarded row deletion, shared 409 conflict UI.
- **Residual risk**: Operators must reload and reconcile; automatic merge is out of scope.

#### Score drift

- **Scenario**: UI, AI, API, and stored score use different formula/threshold logic.
- **Severity**: High
- **Affected area**: Prioritization
- **Mitigation**: One shared helper, server computation, DB equality constraint, derived criticality, exhaustive 25-combination tests, no client/model score input.
- **Residual risk**: Future methodology changes require versioning/recalculation and a new spec.

#### Encrypted financial amount limits querying

- **Scenario**: Users expect numeric sorting/range filters but encrypted decimal text cannot support them safely.
- **Severity**: Medium
- **Affected area**: Register UX
- **Mitigation**: Value column is unsortable and no range filter is exposed.
- **Residual risk**: Analytics need a later privacy-reviewed design.

#### Query-index hashes sensitive details

- **Scenario**: Standard query-index rebuilding decrypts risk strings in memory and stores hashes that reveal equality/token-pattern metadata even though the entity has no search UI.
- **Severity**: High
- **Affected area**: Query indexing and privacy
- **Mitigation**: Require the platform-default `OM_SEARCH_STORE_RAW_TOKENS=false`, verify it in implementation/deployment validation, retain tenant/org-scoped hashed token rows and encrypted entity projections, register no `search.ts`/presenter/fulltext/vector/title search, and test CRUD/full-rebuild isolation.
- **Residual risk**: Hashed tokens can reveal scoped equality/pattern metadata. A host administrator can globally enable raw-token debug storage, which would store plaintext tokens and is explicitly unsupported for Risk Management. Eliminating tokens entirely needs a platform opt-out/projection contract and is deferred rather than hidden in this Official Module.

#### AI provider unavailable, slow, or costly

- **Scenario**: No provider/model is configured, a request times out/fails, or an authorized user repeatedly generates candidates.
- **Severity**: Medium
- **Affected area**: Identification and AI spend
- **Mitigation**: Module-owned error handling, retained form/results, single in-flight UI request, maximum five candidates, one initial model call plus at most one repair call, ACL restriction, no silent demo fallback, and provider billing controls/monitoring.
- **Residual risk**: The runtime has no guaranteed Risk Management-specific per-call rate-limit contract; authorized repeated calls or repair attempts can incur cost until platform-level controls are added.

#### Official package activation or version drift

- **Scenario**: The package builds in its repository but activation, generated registries, migration discovery, or AI agent compilation fails in a host app.
- **Severity**: High
- **Affected area**: Installability and upgrades
- **Mitigation**: Official package conventions, local activation test, build-generate-build validation, compiled `ai-agents` verification, exact source SHAs, and host integration test with AI disabled.
- **Residual risk**: Downstream apps must explicitly install/activate compatible package versions.

#### MVP expands into full GRC

- **Scenario**: Implementers add ownership, statuses, mitigations, reviews, heat maps, or configurable matrices.
- **Severity**: Medium
- **Affected area**: Delivery and model stability
- **Mitigation**: Explicit exclusions, one entity, two navigation surfaces, phased acceptance criteria, adversarial scope review.
- **Residual risk**: These remain valid future capabilities requiring separate specs.

### Operational Detection and Blast Radius

- Structured log namespaces `risk_management.api`, `risk_management.command`, and `risk_management.ai` record request IDs, scoped record IDs, source, latency, result/retry counts, conflict/validation/provider error codes, and outcomes without content values.
- Existing HTTP error-rate/latency monitoring detects CRUD and identification-action 5xx spikes. Query-index observability detects projection/token-index lag.
- Database constraint failures are warning/error signals with tenant/organization IDs but no payload text.
- CRUD failures are isolated to the Official Module and current scoped request. AI/provider failure affects identification only. There is no auth/core mutation or shared-service blast radius.

## Final Compliance Report — 2026-07-21

### Guidance Reviewed

- Root `AGENTS.md`, including module development, Official Modules, CRUD, AI, search, optimistic locking, spec, and testing router entries.
- `.ai/specs/AGENTS.md`, `.ai/skills/om-spec-writing/SKILL.md`, `.ai/skills/om-create-ai-agent/SKILL.md`, and the reference spec `2026-06-13-customers-leads-phase-1.md`.
- `packages/core/AGENTS.md`, `packages/core/src/modules/customers/AGENTS.md`, `packages/ui/AGENTS.md`, `packages/search/AGENTS.md`, `packages/ai-assistant/AGENTS.md`, `packages/cli/AGENTS.md`, `.ai/qa/AGENTS.md`, and applicable referenced framework docs.
- Open Mercato module documentation, including Create First Module, Core Modules, Official Modules, and Official Modules Development.
- Current route/registry implementations for module API discovery, the AI Assistant text runtime/model factory, page metadata, encryption, tokens, CRUD commands, and optimistic locking.
- `riskai-v2.1` domain/UI behavior as a product reference only.

### Compliance Matrix

| Area | Result | Evidence/decision |
|---|---|---|
| Product scope | Pass | One entity, two top-level views, complete CRUD, deterministic-first then AI-assisted review/add; wider GRC and ownership excluded. |
| Placement | Pass | Optional maintained vertical is an Official Module, not core or app-local. |
| Package boundary | Pass | No core/auth edits or ORM relationship; AI Assistant is an explicit optional peer with tested absent-module behavior. |
| Naming/discovery | Pass | Package suffix maps to `risk_management`; API routes are `/api/risk_management/risks` and additive `/api/risk_management/identify`; `translations.ts` included. |
| Tenant/organization safety | Pass | All reads/writes/query-index projections are explicitly scoped and tested. |
| CRUD/commands/events | Pass | Command-backed writes, undo, post-commit side effects, strict schemas, stable IDs. |
| Data integrity | Pass | `updated_at`/`updatedAt`, CrudForm/guarded mutation headers, shared 409 conflict handling, DB scoring constraints. |
| Encryption/privacy | Pass | Title, description, amount encrypted; this module does not persist/log AI payloads and documents the shared-runtime/provider trust boundary. |
| ACL/setup | Pass | Separate view/manage/identify features; admin grants; employee opt-in. |
| AI contract | Pass | Module-owned action delegates to the standard AI Assistant text runtime/model resolution; optional peer/version contract, read-only/no-tools/one-step agent, bounded JSON extraction, strict validation, one repair attempt, absent-module UX, and no invented rate-limit/provider status. |
| UI/design system | Pass | DataTable/CrudForm/shared states, string metadata icon, no raw controls/colors/fetch. |
| Query index/search privacy | Conditional pass | Encrypted/scoped projection and hashes-only tokens require `OM_SEARCH_STORE_RAW_TOKENS=false` (default); raw-token mode is unsupported and documented; no module global/title/fulltext/vector search. |
| Migration/release | Pass | Package-owned migration/snapshot; exact unmerged source deployment only, with no changeset/publication/merge and no migration application without approval. |
| Integration coverage | Pass | Every affected API and key UI path has self-contained deterministic coverage, including fixed demo-to-register, intercepted AI parsing/errors, activation, and AI-disabled behavior. |
| Backward compatibility | Pass | Additive optional package; existing public contracts are consumed unchanged. |

### Scope Review Resolution

Both mandatory fresh-context reviews returned **SPLIT**: manual CRUD is independently deployable, deterministic identification is independently demonstrable, and AI has separate ACL/runtime availability. The maintainer explicitly chose one specification, so this document records a maintainer-approved exception rather than claiming a KEEP result. The revised deterministic Checkpoint 5 strengthens the phase boundary without adding another package or aggregate: it delivers the final context/review/Edit/Reject/Add product path, while Checkpoint 6 swaps only the candidate source. The optional AI Assistant peer/action integration is explicit; there is no second entity or core/auth change hidden in the combined scope.

### Verdict

Approved as the governing specification for the remaining checkpoints. Checkpoints 1–4 are already delivered incrementally; Checkpoints 5–6 must follow the deterministic-source and live-AI boundaries above. Do not broaden ownership, core placement, AI persistence, scoring methodology, or production use of demo identification without a new decision/spec.

## Review Changelog

### 2026-07-21 — Deterministic-first delivery review

- Reordered the final product increments: Checkpoint 5 now delivers the complete context-to-register workflow with a fixed, explicitly disclosed English demo fixture; Checkpoint 6 replaces only that source with Ollama-backed AI.
- Kept all six context fields while confirming that only `businessContext` is required.
- Added explicit one-candidate Add behavior in Checkpoint 5, including ACL separation, Added/link state, ambiguous-result guidance, and a self-contained real-CRUD integration path.
- Replaced the planned object-dispatch dependency with a module-owned additive identification action that delegates to the AI Assistant text runtime, validates bounded raw/fenced JSON, and permits at most one repair attempt.
- Added the `demo|ai` server selector, `ai` default, staging/test-only demo rule, protected Ollama configuration, and a hard prohibition on silent fallback.
- Recorded Checkpoint 4 as deployed and verified at its exact Official Modules and host SHAs.

### 2026-07-21 — Fresh adversarial scope review

- Reviewer verdict: **SPLIT**, unchanged from the earlier review, because the manual register and identification adapters remain independently deployable; the maintainer-approved one-spec exception remains explicit.
- The reviewer identified an ambiguity between browser-local demo generation, a server-selected post-Checkpoint-6 source, and AI permissions.
- Resolution: Checkpoint 5 remains browser-local with no identification action. After Checkpoint 6, both configured sources use `/api/risk_management/identify`; its declarative metadata always requires `risk_management.risk.identify`, while only the `ai` branch conditionally checks `ai_assistant.view` and loads AI Assistant. This preserves demo-mode operation without AI and removes mixed ownership.

### 2026-07-18 — Architecture and framework review

- Confirmed Official Module placement and package/module naming against the current local framework documentation and loader implementation.
- Removed the platform-user owner model and all proposed auth-directory/core changes after the maintainer chose an ownership-free MVP.
- Corrected API discovery, AI route/error behavior, loop configuration, page metadata icons, translations discovery, optimistic locking, and packaging contracts.
- Audited query-index token behavior, including bulk rebuilds and `OM_SEARCH_STORE_RAW_TOKENS`; removed title/global search and custom token-projection claims, required the hashes-only default, documented residuals, and deferred a platform opt-out/projection contract.

### 2026-07-18 — Fresh adversarial scope review

- Reviewer verdict: **SPLIT**, because manual CRUD is useful without AI and AI has independent ACL/runtime availability.
- Maintainer resolution: keep one specification as an explicit exception, with separate implementation phases inside one package.
- Resolved reviewer blockers by defining AI Assistant as an optional peer, making the identify page accessible without it, documenting `403`/`404`/`500` UX, and limiting privacy guarantees to module-controlled behavior.
- Confirmed that Official Module placement and removal of platform-user ownership are internally consistent and leave no hidden core/auth implementation.

## Changelog

### 2026-07-21

- Reordered Checkpoints 5 and 6 so deterministic candidate-to-register delivery precedes live AI.
- Defined the versioned demo candidate contract, disclosure, source boundary, explicit Add behavior, and deterministic integration coverage.
- Defined `/api/risk_management/identify`, the read-only text agent/parser/repair contract, Ollama environment wiring, and failure behavior with no silent demo fallback.
- Updated implementation status with the verified Checkpoint 4 deployment and aligned the plan/spec rollback and stop conditions.
- Aligned execution with the staging plan: exact unmerged source SHAs only, with no changeset, package publication, release tag, or branch merge.

### 2026-07-18

- Moved the feature from `@open-mercato/core` to the reusable Official Module package `@open-mercato/risk-management`.
- Removed platform-user ownership, owner filters, owner API, and the proposed auth-directory DI service; the module now requires no core/auth changes.
- Corrected discovered routes to `/api/risk_management/risks` and `/api/ai_assistant/ai/run-object`.
- Aligned the AI agent with `loop: { maxSteps: 1 }` and the dispatcher’s actual generic failure contract; removed unsupported rate-limit/503 promises.
- Removed global/title search after verifying that token `fieldPolicy` does not constrain query-index token documents; documented full-rebuild hashed-token behavior and deferred a platform token opt-out/projection contract.
- Added package/activation/changeset contracts, module-root `translations.ts`, registry-safe page icon metadata, updated integration coverage, and the final compliance report.
- Recorded the maintainer-approved one-spec exception to prior split recommendations.
- Defined AI Assistant as an optional peer, kept the identify page reachable without it, and documented the shared-runtime/provider privacy boundary.

### 2026-07-15

- Expanded the initial skeleton into a complete implementation specification.
- Defined complete manual CRUD, the prototype-derived fixed 5×5 score, and read-only object-mode AI identification.
- Added encryption, optimistic locking, ACL, query-index privacy, frontend boundaries, migration planning, executable integration coverage, risks, and phased implementation contracts.
- Validated scope against SimpleRisk and eramba; deferred configurable methods, residual risk, treatment, and reviews.

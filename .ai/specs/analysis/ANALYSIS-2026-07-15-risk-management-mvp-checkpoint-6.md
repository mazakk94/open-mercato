# Pre-Implementation Analysis: Risk Management MVP — Checkpoint 6

## Executive Summary

Checkpoint 6 is ready to implement as two independently deployable increments: 6A moves the deterministic source behind the module-owned endpoint, and 6B replaces only that source with the registered read-only AI agent. There are no database, core-module, or public-contract blockers. The implementation must prove Ollama Cloud compatibility through the existing `ollama` provider before considering any shared-runtime adapter, preserve optional AI Assistant loading, and keep the last valid candidates on every failure.

## Backward Compatibility

### Violations Found

No backward-compatible contract is renamed, removed, or narrowed.

| # | Surface | Result | Severity | Proposed Fix |
|---|---|---|---|---|
| 1 | Auto-discovery file conventions | Additive `ai-agents.ts` and `api/identify/route.ts`; existing files remain. | None | Run supported generators after each discovery change. |
| 2 | Type definitions & interfaces | Candidate response and input types are additive; existing register contracts remain. | None | Reuse the existing strict candidate schemas. |
| 3 | Function signatures | Existing CRUD, scoring, and candidate-to-create helpers do not change. | None | Add source/runtime helpers without changing existing signatures. |
| 4 | Import paths | No existing import moves; AI Assistant is an optional peer loaded only in the AI branch. | None | Keep top-level imports type-only and test the absent-peer path. |
| 5 | Event IDs | No event additions or changes are needed. | None | Keep current frozen risk event IDs unchanged. |
| 6 | Widget injection spot IDs | No widget or host spot changes are needed. | None | Keep current navigation/page IDs unchanged. |
| 7 | API route URLs | Additive `POST /api/risk_management/identify`; CRUD URL is unchanged. | None | Freeze and test the new route contract. |
| 8 | Database schema | No Checkpoint 6 schema or migration change. | None | Reject any accidental migration diff. |
| 9 | DI service names | No DI key is added or changed. | None | Use the standard request container and AI runtime. |
| 10 | ACL feature IDs | Existing `risk_management.risk.identify` is reused; conditional `ai_assistant.view` is additive. | None | Use wildcard-aware runtime ACL checking. |
| 11 | Notification type IDs | No notifications are introduced. | None | N/A. |
| 12 | CLI commands | No command changes. | None | Use existing generation/cache commands. |
| 13 | Generated file contracts | Generated registries gain an additive agent entry only. | None | Never hand-edit generated output. |

### Missing BC Section

The governing specification includes a backward-compatibility surface review and migration/rollback guidance.

## Spec Completeness

### Missing Sections

None. The specification includes scope, architecture, data/API/UI contracts, risks, phasing, implementation steps, integration coverage, compliance review, and changelog.

### Incomplete Sections

| Section | Gap | Recommendation |
|---|---|---|
| Checkpoint execution | The approved 6A/6B deployment split and direct-Ollama decision were not yet recorded. | Record both increments before code implementation. |
| Provider compatibility | The spec allows Ollama-compatible configuration but does not record the milestone's selected Cloud endpoint/model. | Record direct `https://ollama.com/v1`, protected token injection, and existing-provider-first verification. |
| Staging evidence | Checkpoint 6 has no progress entry yet. | Append exact SHAs, validation, smoke, observation, and rollback evidence after each deployment. |

## AGENTS.md Compliance

### Violations

No implementation-rule violations were found in the proposed design.

| Rule | Location | Fix |
|---|---|---|
| Optional external-module boundary | Phase 3 | Keep Risk AI in Official Modules; do not add it to core or add a hard module dependency. |
| HTTP and UI state | Identification client | Use `apiCall`, shared Alerts/loading primitives, translated strings, and retain input/candidates on errors. |
| AI framework | Agent and identify route | Use `runAiAgentText`, standard model resolution, no tools, read-only policy, and one step. |
| ACL | Identify route | Route metadata always requires identify; AI branch additionally checks `ai_assistant.view` with wildcard semantics. |
| Generated files | Host integration | Run `yarn generate`; do not hand-edit ephemeral registries. |
| Integration tests | Checkpoint 6 | Add self-contained deterministic API/UI coverage and a protected live staging smoke. |

## Risk Assessment

### High Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Malformed or oversized model output | Could show invalid candidates or consume excessive memory. | Cap collected output at 32 KiB, accept one unambiguous raw/fenced JSON object, validate strictly, and allow only one bounded repair attempt. |
| Secret/provider configuration leakage | Could expose the Ollama token in git or logs. | Keep the token only in protected staging env, pass variables by name through Compose, and log metadata/error codes without prompts, responses, or secrets. |

### Medium Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Optional AI Assistant package inactive or unavailable | Identification could crash module loading or hide the page. | Use no top-level value import, lazy-load only in AI mode, return stable 404 UX, and prove CRUD/demo operation without it. |
| Ollama Cloud OpenAI compatibility differs from local Ollama | Live generation could fail after a successful deterministic increment. | Deploy 6A first, run a direct `/v1` compatibility smoke using the protected key, and reuse the existing provider when it succeeds. Add a minimal adapter only after an observed incompatibility. |
| Provider/network failure | Could discard reviewed candidates or silently return demo data. | Preserve inputs and the last valid candidate set; never fall back from AI to demo. |
| ACL drift on existing tenant roles | Admin could receive 403 after deployment. | Run role ACL synchronization plus structural/RBAC cache refresh and verify admin and denied-role behavior. |

### Low Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Navigation/register regression | Existing MVP demonstration could regress. | Keep page IDs and Add/CRUD paths unchanged; smoke both views after each increment. |
| Generated/lockfile drift | Source-backed production build could use stale package metadata. | Build the Official Module first, refresh the host lockfile when peer metadata changes, generate, and pin exact SHAs. |

## Gap Analysis

### Critical Gaps (Block Implementation)

None.

### Important Gaps (Should Address)

- Milestone decisions: update the spec/plan with direct Ollama Cloud, full form payload disclosure, and separate 6A/6B deployments.
- Stream contract: isolate and unit-test response text collection and JSON extraction rather than coupling parsing to the route.
- Staging configuration: add non-secret Compose passthrough for the risk source and Ollama/module provider values before enabling AI.

### Nice-to-Have Gaps

- A provider-independent live smoke helper can be added later if more AI-backed official modules need it; it is not justified for this milestone.

## Remediation Plan

### Before Implementation (Must Do)

1. Update the governing spec and deployment plan with the approved milestone decisions and 6A/6B acceptance gates.
2. Confirm staging variable presence without printing values and preserve `app_manage_env=false`.

### During Implementation (Add to Spec)

1. Record exact unit/integration/build commands and deployment SHAs per increment.
2. Record whether the existing Ollama provider passed direct Cloud compatibility; do not add an adapter without observed evidence.

### Post-Implementation (Follow Up)

1. Observe staging logs/health after each deployment and retain the previous host SHA as the rollback target.
2. Keep Checkpoint 7 hardening separate from this feature milestone.

## Recommendation

Ready to implement after the small documentation updates above. Proceed with 6A and its staging gate first; proceed to 6B only while staging remains healthy and the direct provider compatibility smoke passes.

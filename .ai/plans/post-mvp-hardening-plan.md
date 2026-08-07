# Risk Management Post-MVP Hardening Plan

**Status:** Deferred. This plan is not a blocker for the completed Risk AI MVP
or for starting higher-priority product work.

**MVP delivery record:**
[`risk-management-plan.md`](risk-management-plan.md)

**Product specification:**
[`../specs/2026-07-15-risk-management-mvp.md`](../specs/2026-07-15-risk-management-mvp.md)

## Goal

Make the source-backed Risk AI installation repeatable, release-ready, and
safe to remove or restore. This plan adds evidence and operational confidence;
it does not add Risk Management product features.

The deployed MVP already has automated module coverage, targeted staging
Playwright coverage, exact revision deployment, live Ollama generation, manual
Risk Register CRUD, ACL verification, rollback targets, and an observation
window. The work below closes the remaining release and portability edges.

## Starting Point

- Deployed host revision: `ba7c7c2f210c74b15e4e3f8158af4ba43f83ec75`.
- Pre-closeout host feature-branch head:
  `30ed2e82ec17cbd22013a742cb3d3b7aa9dfd50c` (documentation-only changes
  after the deployed revision).
- Official Modules revision: `4bcdc0e30d2733b8419b34fca8740ae561d05e3c`.
- Local infrastructure revision used for Checkpoint 6B:
  `7081c1443ed7d3339bb29bad34c6fb70de4f3d64`.
- No merge, npm publication, release, or changeset is required by this plan.

The accidental local `ansible/ansible.cfg` changes that disabled SSH host-key
checking and introduced a Vault password file were removed on 2026-08-07. The
infrastructure checkout is clean; future deployments must continue to use a
clean committed infra revision.

## When to Run This Plan

Run only the relevant workstream when its trigger occurs:

| Trigger | Required workstream |
|---|---|
| Storing real sensitive risk data beyond staging | 1. Query-index privacy |
| Deploying to a new host or handing deployment to another operator | 2. Reproducible source build and 5. Runbook |
| Supporting module disable/uninstall/reinstall | 3. Removal and restoration |
| Preparing a PR, package publication, or formal release | All workstreams |

## Workstream 1 — Query-Index Privacy

**Purpose:** Prove that both normal CRUD indexing and a full index rebuild keep
risk data tenant/organization scoped, retain encrypted entity projections, and
store hashed rather than plaintext tokens when
`OM_SEARCH_STORE_RAW_TOKENS=false`.

**Estimated effort:** 2–4 hours.

- [ ] Implement the specification's self-contained `TC-RISK-003` coverage.
- [ ] Assert that raw-token storage is disabled before creating fixtures.
- [ ] Cover create/update/delete and a full rebuild.
- [ ] Verify tenant and organization isolation in entity and token rows.
- [ ] Verify risk title/description/financial values are not plaintext in
      stored projections or tokens.
- [ ] Verify Risk Management remains absent from global/fulltext/vector search.
- [ ] Clean up every fixture and retain the test as a regression gate.

## Workstream 2 — Reproducible Source Build

**Purpose:** Prove that a clean machine can build the exact unmerged host and
Official Modules revisions without relying on local workspaces, generated
files, prebuilt output, or an npm-published Risk Management package.

**Estimated effort:** 3–5 hours.

- [ ] Clone the host recursively into a clean directory at an exact SHA.
- [ ] Verify the submodule URL and exact Official Modules SHA.
- [ ] Build with no local `node_modules`, activation override, or module
      `dist/` directory.
- [ ] Make `@open-mercato/risk-management` unavailable from npm during the
      install/build proof.
- [ ] Build and inspect the production image, then start its runner locally.
- [ ] Verify generated imports resolve from the pinned source workspace.
- [ ] Record commands, revisions, image identity, and results.

## Workstream 3 — Module Removal and Restoration

**Purpose:** Prove that disabling or removing the source-backed package does
not break Open Mercato or delete Risk data, and that restoring the package
reactivates the same records.

**Estimated effort:** 3–6 hours and two staging deployments.

This is the highest-risk workstream and should not be run merely for evidence.
Run it only when disable/uninstall support is needed.

- [ ] Back up and restore-check the staging database.
- [ ] Create a uniquely identifiable risk and record its ID.
- [ ] Deploy an exact host revision without module registration/activation.
- [ ] Verify stale source, generated registry, image, and runtime module files
      are absent while existing Open Mercato flows remain healthy.
- [ ] Confirm the Risk tables and fixture row remain intact.
- [ ] Re-enable the exact module revision and redeploy.
- [ ] Verify the same risk is visible and editable after restoration.
- [ ] Reconcile stale ACL grants through supported tooling and clean the
      fixture.

## Workstream 4 — Optional-AI Degradation

**Purpose:** Prove in a production-shaped environment that manual Risk Register
CRUD remains usable when AI Assistant is not active or not installed.

**Estimated effort:** 1–3 hours.

- [ ] Build/activate Risk Management without AI Assistant active.
- [ ] Verify navigation and complete manual CRUD.
- [ ] Verify the Identify page renders a clear unavailable state.
- [ ] Verify no module-load crash or hard runtime dependency occurs.
- [ ] Restore the staging AI configuration and run a focused smoke check.

## Workstream 5 — Compliance, QA, and Runbook

**Purpose:** Produce the evidence and operator documentation expected before a
formal release or handoff.

**Estimated effort:** 4–8 hours.

- [ ] Run the full MVP specification test/compliance matrix.
- [ ] Run package tests/typecheck/build and the relevant host generation,
      typecheck, lint, build, decoupling, optimistic-locking, design-system,
      and Playwright gates.
- [ ] Complete final admin/employee manual QA and attach evidence.
- [ ] Add `packages/risk-management/README.md` with install, activate, upgrade,
      AI optionality, privacy prerequisites, backup, rollback, and cleanup
      guidance.
- [ ] Document the Ansible exact-SHA source-branch deployment procedure.
- [ ] Record final infra, host, Official Modules, and image revisions.
- [ ] Update the MVP specification's implementation/compliance evidence.

## Completion Criteria

This plan is complete when all five workstreams have evidence, any discovered
defects are fixed and reverified, and the documented revisions can be rebuilt
and redeployed by an operator starting from a clean checkout.

Completion does not authorize merging, publishing, releasing, removing the
staging source adapter, or changing production data. Those actions require a
separate decision.

## Out of Scope

- New Risk Management fields, workflows, reports, or dashboards.
- Model comparison or evaluation tooling.
- Platform-user ownership.
- AI history or audit persistence.
- Package publication, branch merges, and version releases.

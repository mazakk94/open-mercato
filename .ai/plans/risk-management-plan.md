# Risk Management Incremental Staging Plan

> This is a delivery and deployment plan, not a replacement specification.
> The product contract remains
> [`.ai/specs/2026-07-15-risk-management-mvp.md`](../specs/2026-07-15-risk-management-mvp.md).

**Goal:** Deliver visible Risk Management progress to
`https://openmercato.online/` through small, independently deployable
checkpoints. Every checkpoint must preserve existing behavior, have a short
demonstration, and be safe to leave deployed if work stops there.

**Target module:** Official Module package
`@open-mercato/risk-management`, module ID `risk_management`.

**Product name:** `Risk AI`. The package name and module ID remain stable so
activation, ACL, route, migration, and rollback contracts do not change when
the user-facing brand is applied.

**Application deployment:** Direct Ansible deployment from the local
`open-mercato-infra` repository. Do not use
`.github/workflows/dev-deploy.yml` or Dokploy for this plan.

**Branch policy:** Deploy pushed feature-branch commits to staging without
merging them into Open Mercato `develop` or Official Modules `main`.

**Publication policy:** No npm package publication or stable/preview release is
required for any staging checkpoint in this plan.

## Delivery Decision

Do not create a competing simplified Risk Management specification.

Use:

1. the full MVP spec as the north-star product and architecture contract;
2. this plan as the incremental staging sequence;
3. one unmerged Official Modules source branch for module implementation;
4. one unmerged Open Mercato staging-integration branch for the module pointer,
   activation, and source-build adapter;
5. the Ansible app redeploy playbook for each checkpoint.

A separate limited spec is needed only if an incremental checkpoint must
introduce a durable contract that intentionally differs from the full spec,
such as a temporary entity, API route, ACL ID, or scoring model. This plan
avoids those differences: preview pages do not persist fake data, and the first
database-backed checkpoint uses final contract names.

## Can a Locally Built Official Module Be Injected?

Yes. Open Mercato supports both source-backed workspaces under
`external/official-modules/packages/*` and package installation using a
`file:` locator such as:

```text
@open-mercato/risk-management@file:<path>
```

For this staging plan, use the **pinned source-workspace path**, not npm:

```text
Official Modules feature commit
  -> pinned git submodule in the Open Mercato staging branch
  -> activated workspace package
  -> built together with the staging application image
```

This provides an exact source commit, exercises the real Official Module
package boundary, and avoids publishing.

The current production Dockerfile does not yet copy or build
`external/official-modules`, so merely activating a local module is
insufficient for a clean remote build. Checkpoint 1 therefore includes a
staging-only source-build adapter. It must prove all of the following:

- a recursive clean clone contains the pinned Official Modules commit;
- the Risk Management workspace manifest is available before
  `yarn install --immutable`;
- its source is available before generation and application build;
- the module package is built explicitly because the current root
  `build:packages` filter covers only `packages/*`;
- the production runner contains everything needed by the generated imports;
- the final application is using the expected host and module SHAs.

An exact packed tarball installed through the supported `file:` locator is a
valid fallback, but it requires a reproducible artifact-transfer location,
checksum tracking, lockfile refresh, and Docker copy support. Do not use an
untracked local tarball or manually copy built `dist/` files onto the server.

## Repository and Branch Topology

Use two product branches and one reproducible infra revision:

```text
open-mercato/official-modules (or an authorized fork)
  feat/risk-management
    M0 -> M1 -> M2 -> ...          exact module commits

mazakk94/open-mercato
  feat/risk-management-staging
    H0 -> H1 -> H2 -> ...          exact staging integration commits
         |    |
         |    +-- pins M2
         +------- pins M1

open-mercato-infra
  committed deployment revision I
    -> ansible/deploy.yml
    -> -e app_git_branch=<branch-or-exact-host-sha>
    -> /opt/open-mercato
    -> docker compose rebuild
    -> https://openmercato.online/
```

Rules:

- Module source is committed and pushed in the Official Modules repository or
  an authorized fork. It is never copied manually into the server checkout.
- The Open Mercato staging branch records the exact module gitlink SHA.
- `.gitmodules`, the gitlink, `official-modules.json`, and
  `apps/mercato/src/official-modules.generated.ts` may be committed on this
  staging branch because source-backed deployment is explicitly intended.
  They are not merged into `develop` as part of this plan.
- Use committed activation, not `official-modules.local.json`; the local file
  is gitignored and cannot drive a clean remote deployment.
- Do not commit built `dist/`, secrets, Ansible vault contents, database
  backups, or generated ephemeral registries.
- Do not create npm changesets merely for staging deploys. Add release metadata
  only in a later, separately approved publication workflow.
- Freeze pushes to both product branches while an Ansible deployment is
  running.

## Prerequisite Gate — Reproducible Ansible and Source Build

This gate must pass before Checkpoint 0 or Checkpoint 1 as noted below.

### A. Freeze the infra deployment path

The local `open-mercato-infra` checkout contains the needed app deployment
playbook and roles, but they are currently not all committed. Before the first
deployment:

- [ ] Review the local infra diff for secrets and unrelated changes.
- [ ] Put `ansible/deploy.yml`, the app/Caddy/backup roles, inventory shape,
      and defaults used for staging into a committed infra branch/revision.
- [ ] Record the infra commit SHA used by every deployment.
- [ ] Keep vault data and credentials uncommitted.
- [ ] Run Ansible syntax/lint checks against that exact infra revision.
- [ ] Confirm `caddy_domain` resolves to `openmercato.online`.
- [ ] Confirm `app_git_repo` points to the intended Open Mercato fork.
- [ ] Confirm the playbook branch override reaches
      `ansible.builtin.git.version`.
- [ ] Set/verify `recursive: true` on the app git task and confirm the selected
      Official Modules repository/fork is reachable from the server without
      interactive credentials.
- [ ] Make the deploy input resolve a pushed branch to an exact host SHA before
      checkout, pass that SHA to `ansible.builtin.git.version`, provide the
      necessary refspec for unmerged commits, and assert
      `app_git_clone.after == expected_host_sha` before Docker build.
- [ ] Before checkout, deinitialize old submodules and safely clean the
      disposable application worktree so a host commit that removes a gitlink
      cannot leave stale module source in the Docker context. Preserve database,
      attachment, and other persistent data only in named volumes/backups, not
      in the git worktree.
- [ ] After checkout, run submodule sync and recursive update against the exact
      `.gitmodules` URL, then assert the module SHA before Docker build.

Do not deploy from an undocumented dirty infra working tree. This requirement
does not require merging the infra branch.

### B. Prove exact revision deployment

Before calling a deployment successful:

- [ ] Record the intended host branch and SHA.
- [ ] Require the playbook to accept and assert that exact SHA for every deploy
      and rollback. A movable branch name alone is not a deployment identity.
- [ ] Verify `/opt/open-mercato` has exactly that host SHA after Ansible runs.
- [ ] When the module is present, verify the server checkout has exactly the
      recorded Official Modules gitlink SHA.
- [ ] Verify the container image was rebuilt after those SHAs were checked out.
- [ ] Prove that the playbook can fetch and redeploy a prior exact host SHA for
      rollback, including a commit reachable only through an unmerged branch.
- [ ] Run an Ansible-side clean-checkout test—not only a developer-machine
      clone—and verify submodule URL, credentials, sync, recursive update, and
      exact unmerged module SHA.
- [ ] Test removal rollback: deploy a commit with the module and then a prior
      commit without it; assert the submodule/package is absent from the
      worktree, Docker context, generated registry, image, and runtime.

### C. Prove source-backed Official Module packaging

Before deploying Checkpoint 1:

- [ ] Create the Risk Management package from the current Official Modules
      `packages/test-package` template.
- [ ] Push its feature branch so the staging server can fetch it.
- [ ] Pin its exact commit as the host branch's submodule gitlink.
- [ ] Keep `.gitmodules` and `official-modules.json.repo` aligned to that
      accessible repository/fork.
- [ ] Activate `risk-management` in committed module configuration and
      regenerate the versioned registry.
- [ ] Keep the root workspace declaration
      `external/official-modules/packages/*`, add
      `@open-mercato/risk-management: workspace:*` to the app dependencies,
      and commit the resulting `yarn.lock`.
- [ ] Confirm `.dockerignore` admits the pinned submodule.
- [ ] In the Docker builder, copy the Risk Management manifest before
      `yarn install --immutable`, copy its source before generation/build, and
      build the module workspace before the host generator/application build.
- [ ] In the production runner, copy the module manifest and required built
      output/source before or after `yarn workspaces focus` in the order proven
      by a clean build; assert generated imports resolve at runtime.
- [ ] Build from a fresh recursive clone with no local `node_modules`, local
      activation file, or prebuilt module `dist/`.
- [ ] Inspect the production runner and start it locally.
- [ ] Verify the module loads from the pinned package and not an app-module
      copy or globally installed npm version.
- [ ] Repeat the clean build with npm access to
      `@open-mercato/risk-management` unavailable. This proof is required
      before Checkpoint 1, not deferred to hardening.

No npm registry, preview tag, Version Packages PR, or stable release is part of
this gate.

## Non-Negotiable Safety Rules

1. **Commit before deploy.** Never deploy dirty Open Mercato or Official
   Modules source.
2. **No merges are required.** Every checkpoint is a pushed, unmerged host
   commit pointing at a pushed, unmerged module commit.
3. **Record three SHAs:** infra, host, and Official Module.
4. **Prepare rollback first:** record the previous host SHA, module SHA,
   database backup identifier, and exact Ansible rollback command.
5. **Use only additive, backward-compatible migrations.** Old application code
   must tolerate the migrated schema.
6. **Obtain explicit approval immediately before a schema-bearing deployment.**
   The Docker app startup runs migrations automatically.
7. **Do not trust the Ansible summary alone for migrations.** The current
   redeploy playbook has a post-task migration with `failed_when: false`.
   Before Checkpoint 3, either harden that behavior in a separately reviewed
   infra commit or verify migration success independently from startup logs and
   the migration table. A migration error is a failed deployment.
8. **No fake AI or hidden demo records.** Preview pages clearly state when
   persistence or AI is unavailable.
9. **Existing behavior remains acceptance scope.** Login, backend navigation,
   and at least one existing read/write flow must work after every deployment.
10. **Sensitive-query prerequisite:** before persistent risk text is deployed,
    `OM_SEARCH_STORE_RAW_TOKENS` must be unset or `false`.
11. **Never hand-edit generated files.** Run supported generators and commit
    only versioned generated registries.
12. **Never apply destructive down migrations to staging data during rollback.**

## ACL Role and Verification Contract

Use the full spec's fixed default grants:

| Role | Default Risk features |
|---|---|
| `superadmin` | `risk_management.*` |
| `admin` | `risk_management.*` |
| `employee` | none |

Open Mercato authorizes by effective feature grants, not by the user's display
name or email. A staging user described as “admin” must actually be assigned to
the tenant's `admin` role. A user-level ACL, when present, takes precedence over
the user's aggregated role ACLs, so verification must exercise the real staging
admin session and must not stop after inspecting the `RoleAcl` row.

Backend sidebar visibility and direct page access use the same
`page.meta.ts.requireFeatures` contract. There is no separate Risk Management
“menu permission”: a route appears only when its metadata is registered,
`navHidden` is not set, and the effective ACL satisfies its required features.

For every ACL checkpoint:

- synchronize only after recording the before-state for the target tenant;
- invalidate RBAC-tagged cache entries after synchronization so an existing
  session does not retain a stale denial for the cache TTL;
- after adding/removing backend pages or changing their navigation metadata,
  run `yarn mercato configs cache structural --all-tenants` before browser
  verification;
- verify the actual staging admin is assigned to the `admin` role and has no
  restrictive user-level ACL override, or that the override explicitly grants
  the required Risk features;
- verify admin/superadmin navigation and direct-page access;
- verify a plain employee with no wildcard/direct grant cannot see navigation
  or open the page directly;
- after CRUD exists, verify employee API read/write denial separately;
- after AI exists, verify `risk_management.risk.identify` and
  `ai_assistant.view` independently at the dispatcher;
- verify a user/session from another tenant cannot access the target tenant's
  records even if it has similarly named grants;
- record all inserted/changed `RoleAcl` rows.

`sync-role-acls` merges grants and does not revoke them. On module rollback,
stale Risk feature IDs are inactive only while no matching contract is loaded;
they are security debt because reinstall or future ID reuse can reactivate
them. Record them and use a supported, reviewed role-ACL reconciliation/cleanup
step before reinstall or permanent abandonment—never ad hoc SQL.

## Migration and Recovery Contract

### Baseline platform migration gate

Checkpoint 0 may change the database even though Risk Management does not yet
exist: application startup applies all pending enabled-module migrations and
global entity metadata. Before deploying its baseline:

- inventory migration files in the intended host SHA and applied migration
  rows in the live database without applying changes;
- identify every pending platform migration and global entity metadata change;
- if none are pending, record evidence and classify Checkpoint 0 as no schema
  change;
- if any are pending, treat Checkpoint 0 as a migration-bearing deployment:
  review old/new application compatibility, take and verify a backup, obtain
  explicit approval, and do not claim a schema-free rollback;
- prove the prior host SHA tolerates every migration that may remain after
  rollback, or stop and choose a forward-only recovery plan.

### Risk migration gate

Before every schema-bearing Risk checkpoint, including Checkpoints 3 and 4:

- verify each Risk migration is atomic/transactional and contains no
  non-transactional or destructive DDL;
- make migration failure fatal in the committed infra revision and remove the
  redundant non-fatal success signal, or add an independent blocking
  verification that cannot report success on divergence;
- run `/usr/local/bin/mercato-backup.sh`, verify the archive with `gzip -t`,
  and restore it into a disposable database/container;
- run basic row/count and application-schema checks against the restored copy;
- record recovery time and the exact restore command;
- declare a staging maintenance/write freeze from immediately before backup
  until migration and smoke verification complete;
- if restore is selected, keep writes frozen and acknowledge that any
  post-backup writes would be lost.

Use this partial-failure decision tree:

1. **No DDL and no migration row committed:** deploy the previous exact host
   SHA.
2. **All DDL and migration row committed:** retain the additive schema and
   deploy the previous SHA only after compatibility is confirmed.
3. **DDL/migration-table divergence or partial state:** keep the app unavailable
   and writes frozen; do not retry blindly. Apply a reviewed forward repair
   when safe, otherwise restore the verified backup and then redeploy the
   previous exact SHA.

## Recurring Checkpoint Workflow

A checkpoint is complete only after validation, deployment, demonstration, and
observation all pass.

### 1. Build the module commit

- [ ] Implement only the current checkpoint in `feat/risk-management`.
- [ ] Run module build, typecheck, lint, unit, and relevant integration tests.
- [ ] Commit and push the module source.
- [ ] Record the exact module SHA.

Checkpoint 0 has no module commit.

### 2. Build the host staging commit

- [ ] Start from the last successful host staging commit.
- [ ] Update the submodule gitlink to the exact new module SHA.
- [ ] Regenerate the committed Official Module registry and normal generated
      outputs through supported commands.
- [ ] Run a clean recursive-clone build for source-packaging changes.
- [ ] Run host `yarn generate`, relevant package builds, `yarn typecheck`,
      `yarn lint`, and required integration/UI tests.
- [ ] Run module-decoupling and optimistic-locking guards when applicable.
- [ ] Commit and push the host staging branch.
- [ ] Record the exact host SHA.
- [ ] Prepare and record rollback to the previous successful host SHA.

### 3. Pre-deployment gate

- [ ] Confirm the exact infra revision is clean and selected.
- [ ] Confirm both product SHAs exist on their remotes.
- [ ] Freeze pushes to the two product branches.
- [ ] Capture public login/backend baseline.
- [ ] Run `/usr/local/bin/mercato-backup.sh` before a migration and record the
      resulting file, size, `gzip -t` result, and rehearsed restore procedure.
- [ ] Start the maintenance/write freeze required by the migration contract.
- [ ] Obtain explicit approval immediately before a migration-bearing deploy.
- [ ] Verify `OM_SEARCH_STORE_RAW_TOKENS` is unset or `false` before storing
      risk text.
- [ ] Do not require AI provider secrets before Checkpoint 5.

### 4. Deploy with Ansible

Resolve the pushed staging branch to an exact SHA. From the recorded
`open-mercato-infra/ansible` revision, deploy that SHA:

```bash
ansible-playbook deploy.yml \
  -e app_git_branch=feat/risk-management-staging \
  -e app_git_sha=<exact-host-sha>
```

The branch supplies the fetch/refspec context; `app_git_sha` is the immutable
checkout/build identity. The committed infra implementation must fail before
build if the resolved or checked-out SHA differs.

Then:

- [ ] Monitor clone, Docker build, application startup, and health tasks.
- [ ] Verify host and module SHAs in `/opt/open-mercato`.
- [ ] Verify the application container was recreated from this checkout.
- [ ] For migrations, verify the exact migration in startup logs and the
      migration table; ignore no failure merely because an Ansible task is
      marked non-fatal.
- [ ] Do not start another checkpoint while the deploy is unresolved.

### 5. Post-deployment gate

- [ ] Public root returns 200.
- [ ] Login works.
- [ ] Backend shell/navigation loads without hydration errors.
- [ ] One existing list and one low-risk existing create/edit flow work.
- [ ] The current checkpoint demo passes.
- [ ] Browser console and container/Caddy logs show no new repeated errors.
- [ ] ACL changes are synchronized for the target tenant and authorized plus
      unauthorized paths are verified.
- [ ] Screenshot/video evidence records infra, host, and module SHAs.
- [ ] Observe for at least 15 minutes before declaring success.
- [ ] End the maintenance/write freeze only after migration and write smoke
      checks pass.
- [ ] Unfreeze branches only after success or rollback.

### 6. Rollback

Rollback immediately for broken login/shell, uncertain tenant isolation,
existing write failures, repeated 5xx/crashes, failed migrations, ACL leaks,
unexpected AI writes, or revision mismatch.

Preferred rollback:

1. run the Ansible redeploy using the prior successful exact host SHA plus its
   branch/refspec context;
2. verify that prior host commit also restores the prior module gitlink,
   activation, generated registry, and staging Docker adapter;
3. verify safe worktree cleanup removed any submodule/package absent from that
   prior commit before Docker build;
4. verify the server host/module SHAs after checkout;
5. confirm the old application is healthy;
6. keep successfully applied additive tables/columns in place.

If a migration fails, first determine from logs and the migration table whether
it committed. Do not blindly start the old app against an unknown partial
schema. Use an evidence-based forward fix or the verified database restore
procedure.

Follow the ACL contract for stale grants; do not describe them as permanently
harmless or perform emergency destructive ACL edits.

## Checkpoint Summary

| Checkpoint | Visible staging result | Database | Safe stopping point |
|---|---|---:|---|
| 0. Branch deploy baseline | Existing Open Mercato runs from an exact unmerged branch commit | none only if pending-platform-migration gate proves it; otherwise reviewed additive platform changes | Exact Ansible deployment and rollback compatibility proven |
| 1. Source-backed package shell | Guarded Risk Management landing page loads from pinned Official Module source | ACL rows only; no schema/domain data | No-release module integration proven |
| 2. Two honest preview pages | Risk Register and Identify pages show final information architecture | ACL rows only; no schema/domain data | Product direction demonstrable; nothing saved or sent |
| 3. Minimal real register | Complete CRUD for basic scored risks | additive table | First useful manual product |
| 4. Complete manual register | Full approved fields, custom fields, encryption, conflicts, i18n | additive only | Production-like manual risk management |
| 5. Read-only AI identification | Real AI proposes transient candidates with review/reject | no AI persistence | AI value demonstrable without writes |
| 6. Candidate-to-register | Explicit Add persists one reviewed candidate | no new AI table | Requested two-view MVP works |
| 7. Staging hardening | Full test/runbook evidence on pinned source branches | no destructive change | Staging MVP complete; publication remains optional |

## Checkpoint 0 — Exact Unmerged Branch Baseline

**Purpose:** Prove direct Ansible deployment and rollback before adding module
code.

### Tasks

- [ ] Complete Prerequisite Gate A and B.
- [ ] Create/push `feat/risk-management-staging` from the intended Open Mercato
      `develop` baseline; do not merge it.
- [ ] Review the difference between the currently deployed server SHA and the
      intended baseline.
- [ ] Complete the baseline platform migration inventory and compatibility gate.
      If pending migrations exist, reclassify and approve this as a
      migration-bearing checkpoint.
- [ ] Record live behavior, current server SHA, database backup method, and
      rollback target.
- [ ] Deploy the unmerged branch's exact SHA through `ansible/deploy.yml`.
- [ ] Verify `/opt/open-mercato` HEAD matches the recorded branch commit.
- [ ] Exercise the recurring post-deployment gate.
- [ ] Redeploy the same commit to prove idempotence.
- [ ] Prove exact-SHA deployment and exact-SHA rollback without changing
      schema; a branch may provide fetch/refspec context but is never the
      deployment identity.

### Demo and stop condition

Show the infra SHA, unmerged host branch/SHA, Ansible result, working
login/backend, one existing write flow, and tested rollback command.

Safe to stop: staging is on a known unmerged branch baseline with no Risk
Management code or domain data. Any platform schema changes and rollback
compatibility are explicitly recorded.

## Checkpoint 1 — Source-Backed Official Module Shell

**Purpose:** Prove the real Official Module source lifecycle without publishing
or merging.

**Module content:**

- package `@open-mercato/risk-management`;
- module ID `risk_management`;
- current Official Modules package structure and build/test configuration;
- module metadata, `acl.ts`, `setup.ts`, translations, and one page;
- feature `risk_management.risk.view`;
- no entity, migration, API, search, AI agent, or write action.

**Route:** `/backend/risk-management`

The page states that the source-backed module is connected and clearly says
the register is not implemented. Exact source provenance is demonstrated from
the server checkout rather than adding a temporary product API or UI contract.

### Tasks

- [ ] Complete Prerequisite Gate C.
- [ ] Validate the module against the same Open Mercato source used by staging.
- [ ] Prove package metadata, ACL, page discovery, and fresh production build.
- [ ] Update the host gitlink and committed activation/registry.
- [ ] Deploy the exact unmerged host commit through Ansible.
- [ ] Run
      `yarn mercato auth sync-role-acls --tenant <tenantId>` in the application
      environment and verify the full ACL role matrix, including wildcard
      admin/superadmin and a plain employee denial.

### Demo and stop condition

Show the module navigation and landing page for an authorized admin, denial for
a user without the feature, exact host/module SHAs, and working existing
modules.

Safe to stop: source packaging, pinning, activation, Docker build, ACL,
translations, and Ansible deployment are proven with no schema or Risk domain
data. The recorded Role ACL rows are the only expected database mutation.

### Rollback

Redeploy the Checkpoint 0 host SHA. Its committed state removes the module
pointer/activation; the tested worktree cleanup must also remove stale
submodule/package files before rebuilding. Reconcile recorded stale ACL grants
through the ACL contract.

## Checkpoint 2 — Honest Register and Identification Previews

**Purpose:** Show the intended two-view product without persistence or AI.

**Routes:**

```text
/backend/risk-management/risks
/backend/risk-management/identify
```

**Sidebar contract:**

- the expanded main sidebar contains one `Risk AI` group;
- the group contains exactly two top-level destinations in this order:
  `Risk Register` → `/backend/risk-management/risks`, then
  `Identify Risks` → `/backend/risk-management/identify`;
- the register route declares
  `requireFeatures: ['risk_management.risk.view']`;
- the identification route declares
  `requireFeatures: ['risk_management.risk.identify']`;
- both routes use the same translated `pageGroupKey`, distinct translated
  `pageTitleKey` values, deterministic `pagePriority` values (`0` for Register
  and `1` for Identify), deterministic `pageOrder` values (`10` and `20`
  respectively), and `pageContext: 'main'`;
- this metadata places Risk AI first among optional-module groups, but
  Open Mercato intentionally keeps its known core groups in a protected default
  order; the module must not couple core navigation to an optional package just
  to override that order;
- for the staging demonstration, use the built-in Sidebar Customization page to
  move the `risk_management.nav.group` group to the absolute first position and
  apply that layout to the staging `admin` role; inspect and reconcile any
  user-level sidebar preference that would override the role layout;
- the temporary `/backend/risk-management` shell remains only as a
  `navHidden: true` compatibility redirect to the register and must not create
  a third sidebar item;
- create/detail/edit routes introduced later are `navHidden: true` and never
  become extra sidebar destinations.

**Register preview:**

- final page shell and intended column headings;
- shared empty state;
- “Preview — persistence is not enabled yet” notice;
- no create/edit/delete controls;
- no fake, local-storage, or seeded rows;
- no `DataTable` network call before a CRUD API exists.

**Identification preview:**

- business context, industry, area, methodology, regulations, time horizon;
- “Preview — content is not sent or saved” notice;
- generation unavailable with an explanatory `Alert`;
- no provider call or demo candidates.

### Tasks

- [x] Add the two route roots and registry-safe metadata implementing the exact
      Sidebar contract above.
- [x] Replace the temporary landing navigation with Register and Identify,
      retaining only the hidden compatibility redirect.
- [x] Add `risk_management.risk.view` and
      `risk_management.risk.identify`.
- [x] Use shared design-system primitives and EN/PL/DE/ES translations.
- [x] Add a navigation-registry test asserting the translated group, exact two
      paths, priority/order, `pageContext`, `navHidden` behavior, and feature
      gates.
- [x] Configure a staging sidebar variant with Risk AI first, apply it
      to the `admin` role through the supported Sidebar Customization flow, and
      record the prior preference so the change can be rolled back.
- [x] Add Playwright coverage that logs in as the real/default admin role,
      expands the main sidebar, sees both entries, clicks each entry, and
      verifies the expected URL and page heading.
- [x] Add direct-route ACL coverage proving admin and superadmin can open both
      pages while a plain employee sees neither sidebar entry and receives the
      standard access-denied result for both direct URLs.
- [x] Add hydration, accessibility, and no-network tests for both preview
      pages.
- [x] Commit/push module, update host gitlink, validate, and deploy through the
      recurring workflow.
- [x] Synchronize target-tenant role ACLs, invalidate `rbac:all`, purge
      structural navigation cache for all tenants, and then verify both access
      paths with a fresh admin browser session.
- [x] Inspect the actual staging admin's role assignments and any user-level
      ACL override; do not accept the role definition alone as proof of access.
- [x] Record the ACL row changes and test navigation plus direct-route denial
      with the declared role matrix.

### Execution record — 2026-07-20

- Deployed host commit:
  `0be1461995d820a153fce22ede06ebe21a160c39`.
- Deployed Official Modules commit:
  `001551e228277a21e03125a6ca5bb1150d117830`.
- Deployment automation follow-up, committed locally in
  `openmercato-infra`:
  `84791d6d0bebc0d5c287f44dd7d2d4672d296061`. It makes the structural
  navigation-cache purge part of every app deployment after ACL sync.
- The staging `admin` role received the Risk AI-first sidebar layout. Its prior
  role preference was absent, and the tested admin account had no personal
  sidebar override, so rollback is removal of that role preference.
- Fresh-session browser verification passed: admin rendered both pages and saw
  the two links in Register → Identify order; both preview forms remained
  non-mutating; no Risk or AI API requests occurred.
- A plain employee saw no Risk AI group and received the standard access-denied
  page for both direct routes. Admin and superadmin direct-route access passed.

### Demo and stop condition

Show the expanded Risk AI group in the absolute first sidebar position
as the staging admin, click both destinations, and prove that reload creates no
record and sends no AI request. Also record evidence that the same entries are
absent and both direct routes are denied for a plain employee.

Safe to stop: stakeholders can review the information architecture with no
schema, write, or AI cost.

## Checkpoint 3 — Minimal Real Risk Register

**Purpose:** Deliver the first useful slice: complete manual CRUD for basic
risks with deterministic scoring.

Run the repository's pre-implementation-spec workflow before coding.

**Persisted/editable fields:**

- `title`;
- `category`;
- `probability`;
- `impact`;
- server-computed `risk_score`;
- tenant, organization, timestamps, and soft-delete columns.

**Required immediately:**

- final entity ID `risk_management:risk`;
- final CRUD route `/api/risk_management/risks`;
- singular command/event IDs;
- `updated_at`/`updatedAt` and optimistic locking for update/delete;
- tenant and organization scoping on every read/write;
- title encryption and platform decryption helpers;
- additive Official Module migration;
- create, list, detail/edit, soft-delete, and undo;
- probability × impact scoring and criticality mapping;
- category/criticality filters;
- view/manage ACL separation;
- normal post-commit CRUD side effects;
- no global/title search.

Description, financial-impact UI, installed custom fields, and AI remain
deferred. Future nullable columns may exist in the first migration only when
the entity framework requires them; do not expose them early or create
temporary contract names.

### Tasks

- [ ] Complete pre-implementation review.
- [ ] Implement entity, migration/snapshot, constraints, indexes, encryption,
      validators, scoring, ACL/setup, commands/events, CRUD, and OpenAPI.
- [ ] Implement canonical `DataTable` and `CrudForm` flows.
- [ ] Add unit/API/component tests and self-contained CRUD integration tests.
- [ ] Verify `OM_SEARCH_STORE_RAW_TOKENS` is unset or `false`.
- [ ] Generate but do not apply migrations during local planning/review without
      approval.
- [ ] Ensure migration failures are fatal/independently verified as required by
      Safety Rule 7.
- [ ] Commit/push module and host checkpoint SHAs.
- [ ] Run and record the pre-deployment database backup.
- [ ] Obtain explicit migration deployment approval.
- [ ] Deploy and verify migration identity/status before smoke tests.
- [ ] Synchronize and test view/manage ACLs, API denial, and cross-tenant
      isolation using the declared role matrix.

### Demo and stop condition

Create a risk, show server-derived score/criticality, filter/open/edit it,
demonstrate a stale-edit conflict in two sessions, delete it, and confirm it
leaves the active register.

Safe to stop: staging has a useful encrypted, scoped, concurrent-safe manual
Risk Register. Identify remains an honest preview.

### Rollback

Redeploy Checkpoint 2 host SHA after proving migration commit state. Keep a
successfully applied additive risk table; never drop it or delete user data.

## Checkpoint 4 — Complete Manual Register

**Purpose:** Complete the register side before live AI.

**Adds:**

- encrypted nullable description;
- encrypted optional financial-impact amount and currency;
- final form groups and register columns;
- installed custom-field support and the full spec's query-index/privacy
  contract;
- full EN/PL/DE/ES translations;
- final loading, empty, not-found, error, validation, delete, and conflict UX;
- final OpenAPI and executable coverage.

Existing Checkpoint 3 records must load without backfill and receive null
defaults for new optional fields.

### Tasks

- [ ] Add optional fields and additive migration if needed.
- [ ] Extend strict API schemas without changing existing semantics.
- [ ] Complete forms, table, encryption/decryption, and custom fields.
- [ ] Complete API, component, integration, accessibility, and design-system
      coverage.
- [ ] Verify old basic records still list/edit/delete.
- [ ] Commit/push both exact SHAs.
- [ ] Back up and explicitly approve any migration-bearing deployment.
- [ ] Deploy, verify migration state, sync ACLs, and run the recurring gate.

### Demo and stop condition

Create/edit a complete risk with description and financial impact; show filters,
translations, conflicts, custom fields, and an older basic record.

Safe to stop: staging has a production-like manual Risk Register. AI can remain
postponed indefinitely.

## Checkpoint 5 — Read-Only AI Identification

**Purpose:** Demonstrate AI value without allowing AI to mutate risk data.

**Adds:**

- optional peer integration with `@open-mercato/ai-assistant`;
- object agent `risk_management.risk_identifier`;
- no tools, read-only mutation policy, one-step loop, at most five candidates;
- existing `/api/ai_assistant/ai/run-object` dispatcher;
- transient candidate display with local Edit and Reject;
- external-provider disclosure;
- absent-module, permission, provider, and runtime failure UX;
- no Add action;
- no AI input/output/session/candidate persistence in this module.

### Tasks

- [ ] Implement and test the optional peer contract and strict object agent.
- [ ] Connect through `apiCall` with single-flight generation behavior.
- [ ] Preserve inputs/results on failure and support transient Edit/Reject.
- [ ] Verify raw AI content does not enter module persistence/logger calls.
- [ ] Run deterministic tests with an intercepted dispatcher response.
- [ ] Configure a real provider only through existing settings and approved
      secrets.
- [ ] Commit/push both SHAs, deploy, and run the recurring gate.

### Demo and stop condition

Enter context, generate at most five real advisory candidates, edit/reject
locally, reload to prove nothing entered the register, and show manual CRUD
still works when AI is unavailable.

Safe to stop: AI identification is demonstrable and read-only.

### Rollback

Redeploy Checkpoint 4 host SHA. Do not remove or alter shared AI Assistant
provider configuration as a Risk Management rollback.

## Checkpoint 6 — Explicit Candidate-to-Register

**Purpose:** Complete the requested two-view MVP.

**Adds:**

- candidate Edit supports final register fields;
- one explicit **Add to register** action per candidate;
- Add uses the guarded risk-create API and normal command/event path;
- successful card links to the new risk;
- concurrent clicks are suppressed;
- no automatic retry after an ambiguous result;
- no Add All or autonomous AI write.

### Tasks

- [ ] Add guarded single-candidate create and single-flight UI state.
- [ ] Show:
      “Result unknown — refresh the Risk Register before retrying”
      after ambiguous network failure.
- [ ] Add the deterministic integration path:
      generate → edit → reject → add → reload register.
- [ ] Validate model output and recompute scoring on the server.
- [ ] Verify identify and manage permissions independently.
- [ ] Commit/push both SHAs, deploy, and run the recurring gate.

This checkpoint does not promise retry idempotency. A create can commit while
its response is lost, and titles are not unique; a manual retry may create a
duplicate. Guaranteed retry safety requires a separate durable idempotency
contract.

### Demo and stop condition

Generate candidates, review/edit one, explicitly add it, open it from the
register, and verify it persists after reload.

Safe to stop: both requested views work end to end without wider GRC scope.

## Checkpoint 7 — Staging Hardening

**Purpose:** Make the unmerged source-backed staging result repeatable and
well-evidenced. Publication is not part of completion.

### Tasks

- [ ] Run the full MVP spec test and compliance matrix.
- [ ] Verify activation and manual CRUD with AI Assistant unavailable.
- [ ] Complete CRUD/full-rebuild query-index privacy tests.
- [ ] Validate a fresh recursive clone and production image build.
- [ ] Re-run install/build with no npm Risk Management package available.
- [ ] Verify host registration removal/restoration preserves risk data.
- [ ] Document source-branch setup, upgrades, Ansible deploy, backup, rollback,
      and cleanup of the staging-only adapter.
- [ ] Record final infra, host, and module SHAs.
- [ ] Run final manual QA and attach evidence.
- [ ] Update the MVP spec implementation/compliance evidence, but do not move
      it to `implemented/` solely because staging passed.

### Demo and stop condition

Show a fresh source-backed build, Ansible deployment, complete working module,
host registration removal/restoration with preserved data, and exact
three-revision provenance.

Safe to stop: the MVP is complete and repeatably deployed on staging from
unmerged source branches. No package has been published.

## Optional Graduation — Outside This Plan

Only after staging succeeds, and only with separate approval:

1. review the staging-only Docker adapter and either generalize it upstream or
   remove it in favor of a published package;
2. open/merge Official Modules and host compatibility PRs;
3. add changesets and publish a stable package;
4. replace the source gitlink with the stable package;
5. merge an approved host configuration into `develop`.

None of these actions is required to demonstrate or complete the staging MVP.

## Out of Scope

- platform-user ownership or auth-directory changes;
- statuses, treatments, mitigations, controls, reviews, heat maps, reports, or
  dashboards;
- configurable scoring matrices;
- AI tools or autonomous writes;
- AI-run persistence/audit history;
- global/title/fulltext/vector risk search;
- npm publication or stable release;
- merge to Open Mercato `develop` or Official Modules `main`;
- Dokploy deployment;
- destructive migration cleanup.

## Progress Record Template

Append one entry after each deployed checkpoint:

```markdown
### Checkpoint N — YYYY-MM-DD

- Infra commit:
- Host branch and commit:
- Official Modules repository, branch, and commit:
- Server host HEAD:
- Server submodule HEAD:
- Database backup/migration:
- Validation runner and commands:
- Existing-flow smoke result:
- Checkpoint demo result:
- Evidence link:
- Observation window:
- Rollback host SHA/branch and command:
- Decision: continue / stop safely / roll back
```

## Plan Completion Criteria

This plan is complete when either:

1. Checkpoint 7 is deployed with complete staging evidence; or
2. the maintainer intentionally stops at an earlier checkpoint and documents
   its limitations, evidence, and rollback target.

Stopping early is not failure. A checkpoint succeeds when it adds an honest,
working capability without regressing the existing staging deployment.

## Review Record

- **2026-07-19 — adversarial deployment review: PASS.** The final plan requires
  exact-SHA Ansible deployment/rollback, clean recursive submodule checkout and
  removal, a reproducible Yarn/Docker source-workspace build, baseline platform
  migration inventory, rehearsed backup recovery with a write freeze, and an
  explicit role/ACL verification matrix. No blocker-level issue remained.

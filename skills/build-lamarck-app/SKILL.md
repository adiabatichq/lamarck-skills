---
name: build-lamarck-app
description: Create, modify, or debug Lamarck Personal System Apps through the lamarck CLI, App Manifest V1, @lamarck/system SDK, Timeline, Files, Tables, and App Capsule. Use when authoring App source, workloads, permissions, data access, or fixing an App that does not build, appear, or launch. Do not use for an independent security or publication review.
---

# Build a Lamarck App

Build ordinary JavaScript or TypeScript Apps while respecting the small stable contract owned by Lamarck.

## Start From Lamarck's App Lifecycle

Use the public `lamarck` CLI to locate, create, inspect, and version Apps. Do not manually initialize an App package or its Git repository when `lamarck app create` is available.

If `lamarck` is unavailable, ask the user before installing it with `npm install -g @lamarck/cli`, then verify it with `lamarck --help`.

Read [CLI App lifecycle](references/cli-lifecycle.md) before creating, saving, restoring, refreshing, or archiving an App.

1. Confirm Lamarck Desktop is running with the intended Workspace selected.
2. List and inspect Apps before choosing an ID or modifying an existing package.
3. For a requested new App, create the blank package through `lamarck app create`.
4. Use the `path` returned by `lamarck app inspect --json` as the App root.
5. Work only inside that App root unless the user explicitly asks for a Workspace File change.

Never edit `.lamarck/`, `.adiabatic/`, SQLite files, Guard state, generated Guest artifacts, or Lamarck product source to make an App work. Never add `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.codex/`, or other agent-specific configuration to a Lamarck Workspace.

Preserve working user code and unrecorded changes. App lifecycle commands do not authorize unrelated rewrites.

## Load the Contract You Need

- Read [App contract](references/app-contract.md) before creating an App or changing `manifest.json`, workloads, dependencies, or permissions.
- Read [System data](references/system-data.md) before calling `@lamarck/system`, querying Timeline events or Tables, resolving content, or writing events, Files, or Table rows.
- Read [Capsule runtime](references/capsule-runtime.md) before adding dependencies, relying on network or filesystem behavior, or debugging a build or launch failure.
- For a new App, read all four references before implementation.

Do not infer unsupported fields or APIs from product internals. If the installed runtime rejects something these references allow, treat the runtime error as authoritative, inspect the installed version, and report the contract drift. Do not work around it through private Core or Host interfaces.

## Choose the Smallest Workload

- Use a UI for an interactive view. Most Apps need only `runtime.ui`.
- Add a service only for work that must remain alive independently of the UI.
- Add a job only for explicit finite work that exits when complete.
- Do not invent `runtime.agents`, background modes, cron fields, or Host shell commands.

Keep the interface, workflow, and product opinions in the App. Use Lamarck for continuity: data, identity, permissions, provenance, and runtime boundaries.

## Build Against Real Data

1. Inspect relevant Sources through the CLI, including their declared and observed event types.
2. Use bounded CLI queries to inspect a few real payloads before writing adapters.
3. Query only the columns and time range needed by the App. Parameterize runtime query values and set practical limits.
4. Treat `started_at`, `ended_at`, and `created_at` as epoch milliseconds.
5. Parse JSON defensively because clients may return JSON columns as strings.
6. Resolve content references in App code with `system.resolveContentRef`; do not assume referenced content is inline.
7. Default to private, local presentation. Do not send personal history to an external service.

For read-only analysis, keep both permission arrays empty. Add only the write grants actually required by the implementation.

## Keep Durable State in Lamarck

- Write immutable observations or durable activity with `system.writeEvent`.
- Write human-editable Workspace Files with `system.vfs.command`; use explicit filenames and intentional grants.
- Write structured current or derived state only to an existing Table declared in `permissions.writes.tables`.
- Use `system.transaction` when several Table statements must succeed together.
- Never open `data.db` directly or call Core/Guard over a hard-coded URL.
- Never treat runtime files, browser storage, or process memory as authoritative personal data.

If a required Table does not exist, submit the schema change through the public management path and wait for human approval. Do not put DDL in App code.

## Implement for the Capsule

- Use ordinary Node.js/npm, browser JavaScript, TypeScript, and compatible WASM dependencies.
- Commit `package-lock.json`; keep dependencies compatible with the Capsule build policy.
- Do not require runtime internet access, Host localhost, Host files, ambient credentials, Docker, Python, Git, or undeclared Host tools.
- Import `system` from `@lamarck/system`. App code must not accept or persist a Core URL, App ID, bearer token, or Guard credential.
- Make UI loading and failure states useful and legible.

## Verify and Record the Result

1. Run the bundled static validator:

   ```sh
   node <skill-directory>/scripts/validate-app.mjs <app-path>
   ```

2. Review package scripts, then run available typecheck, tests, and production build. Use `npm ci` only for a trusted committed lockfile.
3. Check that every `npm run <script>` named in the manifest exists in `package.json`.
4. For a UI, confirm the declared command stays alive and binds the exact manifest port.
5. Save the completed package with a meaningful `lamarck app save` message, then verify lifecycle health through `lamarck app inspect --json`.
6. Exercise at least one real data path inside Lamarck when the environment permits. If Capsule launch cannot be tested, say so explicitly.

Do not claim the App works merely because a browser build succeeds. When debugging, preserve the fail-closed contract: fix the App, manifest, lockfile, or declared permission instead of bypassing Host identity, Guard, or Capsule isolation.

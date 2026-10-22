# CLI App Lifecycle

The public CLI owns App creation and retained local versions. Prefer JSON output for decisions and verification.

## Inspect and locate

```sh
lamarck app list --json
lamarck app inspect <app-id> --json
```

Inspection returns the current manifest shape, version, unrecorded-change state, manifest/version health, runtime activity, and caller-visible package `path`. Use that path instead of assuming `<workspace>/apps/<id>`; the path differs between Host and a managed App Capsule.

If the intended App is ambiguous or the inventory looks like another Workspace, ask the user to select the correct Workspace in Desktop.

## Create

```sh
lamarck app create <app-id> --name <name> --description <text> --json
```

Creation initializes Lamarck's blank scaffold and local version history and emits the system-owned lifecycle evidence. The command is available from Host and managed CLI environments.

Choose the ID with the user when identity is material. It may contain lowercase alphanumeric/hyphen segments separated by dots. Do not inject `createdFrom`; Desktop owns Marketplace provenance.

After creation, inspect the App to resolve its path and baseline before editing.

## Save and inspect versions

```sh
lamarck app save <app-id> -m <message> --author <author> --json
lamarck app versions <app-id> --json
```

Save records the current package as a retained version. It may return `created: false` when nothing material changed. Use a concise message describing the user-visible capability or fix, not implementation chatter.

Building or modifying an App authorizes recording the completed result as the normal lifecycle hand-off. Do not save unrelated pre-existing changes as though they were yours; inspect the package and describe any overlap.

## Restore

```sh
lamarck app restore <app-id> <version> -m <message> --author <author> --json
```

Restore is forward-only: it creates a new retained version from the selected earlier version. It does not rewrite history. Use it only when the user asks to restore or when an agreed recovery plan requires it. Resolve ambiguous versions through `app versions` first.

## Managed refresh

Inside a managed App Capsule only:

```sh
lamarck app refresh <app-id> --yes --json
```

Refresh discards that Capsule's unsaved edits and replaces them with the current Host package. It is destructive. Require explicit authorization, inspect `hasUnrecordedChanges`, and report what will be lost before using it. It is unavailable from the Host CLI.

## Archive

```sh
lamarck app archive <app-id> --yes --json
```

Archive removes an App from the active System Shape. It is not part of ordinary build cleanup. Use it only when explicitly requested after checking runtime state and unrecorded changes.

## App runtime management (Host only)

App runtime management requires `@lamarck/cli` 0.1.4 or later and Desktop 0.1.16 or later.

```sh
lamarck app enable <app-id> --json
lamarck app disable <app-id> --json
lamarck app service enable <app-id> <service-id> --json
lamarck app service disable <app-id> <service-id> --json
lamarck app inspect <app-id> --json
lamarck app activity <app-id> --json
```

App and Service enablement are separate settings. Installation defaults both to enabled. An enabled Service runs only while its App and Host are enabled/active. Disabling an App fences new UI, Service and Job launches and joins current workload/UI cleanup; child Service settings and Trigger history are preserved. Enabling an App restores individually enabled Services; it does not open UI, create a Job invocation, or replay missed work. A Service toggle affects only that declared Service. Use IDs from `app inspect`, not display labels.

Host `app inspect` adds `runtime.enabled`, UI state, per-Service enablement/state, active Jobs with run IDs, and current failure/cleanup information. Unknown policy is null, not disabled. A successful toggle confirms the existing lifecycle operation; inspect separately for readiness or backoff.

`app activity` reads sanitized temporary Service/Job diagnostics, not D0 or persistent execution history. Retention is bounded to eight records per App for up to an hour after completion and is lost on Host restart. CLI output keeps at most 64 KiB of UTF-8 output per record; `droppedBytes` reports omitted output. Empty output means no retained evidence, not proof that no work ran.

## Experiment mode (Host only)

Experiment mode is one persistent Host setting, `normal` (default) or `exp`,
independent of App/Service enablement and App versions. Host inspection exposes
`runtime.mode`; the existing Console App settings show an **Experiment mode**
toggle: “Read-only access to Workspace data. AI calls may incur costs.”

```sh
lamarck app mode <app-id> <normal|exp> --json
```

The setter returns `{ appId, mode }`. Stop the App first using existing controls
(for example `app disable`) and wait for all UI, Service, Job, descendant and
authority cleanup to finish. Changing mode never stops, starts, restarts,
retries or replays work, or changes enablement, Service settings or Triggers.
The setting survives Host restarts and App source/version changes. A failed
Host viewer resource cleanup keeps switching blocked until a Host restart.

Exp workloads retain existing live reads, subscriptions and AI access, including
Vercel AI SDK tools. Memory, disposable Capsule files, UI output and stdout
remain available. `writeEvent`, Table mutations and Workspace File mutations
(including `apps/<app-id>/`) fail explicitly. Mutating transactions fail
atomically; read-only transactions remain available. Managed CLI reads retain
their existing availability; Source operations, Connector changes, App
create/save/restore/archive/refresh and schema submissions are rejected.
Computer Use is rejected before permission or session creation. Existing grants
and Capsule network restrictions still apply.

Host App editing/versioning and Workspace schema approval/application remain
independent and retain normal D0 evidence. Incoming event/cron Jobs still run
with their ordinary input, cancellation, diagnostics and history. There is no
experimental database or outgoing event from a denied write.

## Triggers (Host only)

```sh
lamarck trigger targets --json
lamarck trigger list --json
lamarck trigger inspect <trigger-id> --json
lamarck trigger create --name Daily --target app:<app-id>:job:<job-id> --cron '0 9 * * *' --timezone Asia/Taipei --json
lamarck trigger create --config '<settings-json>' --json
lamarck trigger create --file trigger-settings.json --json
lamarck trigger preview <trigger-id> --limit 5 --json
lamarck trigger update <trigger-id> --name 'New name' --revision <revision> --json
lamarck trigger enable <trigger-id> --json
lamarck trigger disable <trigger-id> --json
lamarck trigger runs <trigger-id> --limit 50 --json
lamarck trigger cancel <run-id> --json
lamarck trigger delete <trigger-id> --yes --json
```

Discover targets first: declared App Jobs and supported concrete poll Sources. UI and Services are not Trigger targets. Conditions use event SQL (`--sql 'SELECT id FROM events WHERE type = ?' --params '["example.event"]'`) or cron plus IANA timezone. Inline `--config` and UTF-8 JSON `--file` are equivalent alternatives, capped at 16 KiB. Creation defaults to disabled; `--enabled` opts in. Use a revision fence when updating settings read earlier.

Preview does not execute or advance consumption. Enablement and condition/target edits start future evaluation from now. Disabling pauses evaluation and pending runs; already running invocations may finish. Delete cancels pending work and retains history. `trigger cancel` cancels one pending/running invocation, including an App Job; there is no separate CLI Job launch/retry/replay command. Job history belongs to `trigger runs`; actual processes and cleanup belong to Capsule and appear in App inspection/activity. Temporary SDK subscriptions are separate and have no persistent identity.

Use local help to check advertised commands. Help labels operations read/write; `file` is mixed because `ls`, `cat`, and `stat` read while the other verbs mutate. These labels do not grant authority. New commands require both a compatible CLI package and running Desktop; `CLI_UNSUPPORTED_COMMAND` is not permission to call private interfaces. Managed Capsules cannot administer App enablement, Services, diagnostics, or Triggers.

## Interface limits

- The CLI has no generic App start/stop command. Viewer-demand remains Desktop-owned.
- Marketplace discovery uses `lamarck marketplace list --kind app`; `app create --from <package-id>` creates an editable local App.
- A successful lifecycle command does not prove Capsule launch or a real data path works.
- Do not use private Git commands as a substitute for Lamarck version operations.

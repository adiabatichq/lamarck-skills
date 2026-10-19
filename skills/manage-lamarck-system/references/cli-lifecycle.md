# CLI Lifecycle and Authority

Use `--json` whenever output will be inspected or compared. A failed JSON command returns a stable error object and a non-zero exit code. Verify mutations with the corresponding list or inspect operation.

## Sources

```sh
lamarck source list --json
lamarck source inspect <source-id> --json
lamarck source run <source-id> --wait --json
lamarck source pause <source-id> --json
lamarck source resume <source-id> --json
```

Interpret Source state by separate axes:

- lifecycle: active or paused;
- setup: ready or blocked by identity, auth, requirements, or config;
- support and trust: whether the Connector may run here;
- activity: idle or running;
- last run: success, error, or aborted.

`run --wait` waits for that accepted run to finish. A run error does not automatically pause the Source. Do not repeatedly retry a failing Source; inspect its shape and stop after one deliberate retry unless the user requests continued attempts.

Source add, setup, auth/config editing, disconnect, removal, and detailed Source error history remain Desktop actions. Supported poll Source execution can be scheduled through Host Trigger commands below; this does not expose Connector-owned configuration editing. `source inspect` can identify a pending setup category but may not explain every underlying error.

## Connectors

Discover packages with `lamarck marketplace list --json`; `--kind app` or `--kind connector` filters the public catalog.

```sh
lamarck connector list --json
lamarck connector inspect <connector-id> --json
lamarck connector install <namespace.package> --json
lamarck connector update <connector-id> --json
lamarck connector remove <connector-id> --yes --json
```

Install resolves the latest signed Marketplace release by exact package ID. Select it from the catalog or trusted context; the CLI does not provide semantic search or arbitrary release selection.

Update applies only to a Marketplace-managed Connector whose installed package still matches its admitted release. A modified/custom package must be reviewed and handled through the human trust flow; do not overwrite it with a Marketplace update.

Removal retires the installed package and requires confirmation. Resolve the exact Connector and inspect its `sourceCount` first. Do not pass `--yes` unless removal is explicitly requested and the target has been verified.

Custom or modified package approval is a Shell-only human action tied to the exact package hash. Never approve or claim approval on the user's behalf.

## Apps

```sh
lamarck app list --json
lamarck app inspect <app-id> --json
lamarck app create <app-id> --name <name> --description <text> --json
lamarck app create --from <namespace.package> [--as <local-app-id>] --json
lamarck app save <app-id> -m <message> --author <author> --json
lamarck app versions <app-id> --json
lamarck app restore <app-id> <version> -m <message> --author <author> --json
lamarck app archive <app-id> --yes --json
```

Creation initializes the blank package and its Lamarck-owned local version history. Use the returned/inspected `path` for source edits instead of assuming a Workspace path.

Save records the current package only when there are material changes. Restore is forward-only: it creates a new version from an earlier recorded version rather than rewriting history. Verify the requested version is unambiguous before restoring.

Archive removes the App from the active System Shape and requires confirmation. Inspect its running state and unrecorded changes before archiving.

Inside a managed App Capsule only:

```sh
lamarck app refresh <app-id> --yes --json
```

Refresh discards that Capsule's unsaved App edits. It is not a general Host command and must never be used as a troubleshooting shortcut. Require an explicit request to discard those edits and inspect `hasUnrecordedChanges` first.

Marketplace templates use `app create --from`, which creates an editable local App and records `createdFrom` in its manifest. The CLI does not provide generic App start/stop or semantic Marketplace search.

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

## Schema changes

```sh
lamarck schema change "<ddl>" --author <author> --context <reason> --json
lamarck schema change --file <schema.sql> --author <author> --context <reason> --json
```

Submit the smallest Table schema change needed by the requested capability. A successful command returns `{ "id": "...", "status": "pending" }`; this means the request was accepted for human review, not applied. Do not continue as if the Table exists until inspection confirms the approved schema.

Schema change is for user Table structure, not the Timeline, control-plane tables, or arbitrary data mutation.

## Files

Use `lamarck file` for Workspace Files and host-only `file import`/`file export` for explicit boundary-crossing transfers. Inspect exact targets before overwrite, move, or removal. File changes within existing authority can be ordinary system use; do not classify every content edit as a Shape reconfiguration.

## Stable failure meanings

Treat these as decisions, not invitations to bypass the interface:

- `LAMARCK_NOT_RUNNING`: ask the user to start/select Lamarck Desktop.
- `CLI_HOST_INCOMPATIBLE`: report version incompatibility; do not call private routes.
- `CONFIRMATION_REQUIRED`: verify the target and user intent before retrying with confirmation.
- `CONNECTOR_MODIFIED`: preserve local code and route to review/custom trust flow.
- `CONNECTOR_MARKETPLACE_UNAVAILABLE`: report that signed resolution is unavailable.
- `APP_VERSION_CONFLICT`: re-inspect current App state before proposing another save/restore.
- `SCHEMA_REQUEST_REJECTED`: report the rejection; do not modify the database directly.

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

The CLI intentionally does not expose Source add, setup, auth/config editing, disconnect, removal, scheduling, or detailed error history. Those remain Desktop actions. `source inspect` can identify a pending setup category but may not explain every underlying error.

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

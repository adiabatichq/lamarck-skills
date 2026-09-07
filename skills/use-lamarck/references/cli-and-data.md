# CLI and Data

Use this reference for read-only SQL, Workspace File operations, and interpretation of the current System Shape.

## CLI behavior

- Prefer `--json` for list, inspect, query, and lifecycle results that will be parsed or compared.
- A successful JSON command prints the result value directly. A failed JSON command prints `{ "error": { "code": "...", "message": "..." } }` and exits non-zero.
- `LAMARCK_NOT_RUNNING` means Desktop is not available. Ask the user to start Lamarck; do not fall back to private interfaces.
- CLI discovery selects the Workspace currently served by Desktop. Confirm unexpected inventory with the user instead of searching other Workspaces.

## Inspect the four primitives

There is no synthetic Shape document and no `lamarck shape` command.

### Sources

```sh
lamarck source list --json
lamarck source inspect <source-id> --json
```

The detailed shape includes Source identity, Connector trust, active/paused policy, setup readiness, execution activity, last-run outcome, and declared versus observed event types. Use it to choose valid `source` and `type` filters; do not infer an event contract from the Connector name alone.

### Apps

```sh
lamarck app list --json
lamarck app inspect <app-id> --json
```

App inspection describes workloads, write permissions, lifecycle health, runtime activity, and the caller-visible package path. Inspecting an App does not mean its private UI is controllable through the CLI.

### Files

`lamarck file` is rooted at Workspace Files, not at the Host filesystem:

```sh
lamarck file ls -la -- <path>
lamarck file cat -- <path>
lamarck file stat -- <path>
lamarck file mkdir -p -- <directory>
lamarck file tee --author <author> -- <path>
lamarck file cp -- <source> <destination>
lamarck file mv -- <source> <destination>
lamarck file rm -- <path>
```

`tee` reads bytes from stdin. Use `--` before paths, especially when a path may begin with punctuation. Mutating file commands are authorized only when they are part of the user's requested outcome. Inspect the target first before overwrite, move, or removal.

Host-only import/export crosses the Workspace boundary:

```sh
lamarck file import <host-source> <file-destination>
lamarck file export <file-source> <host-destination>
```

Use import/export only when the user requested that transfer and both exact paths are known. They are unavailable inside a managed App Capsule.

### Tables

Use read-only SQL, including `sqlite_schema`, instead of `PRAGMA`:

```sh
lamarck query "SELECT name, sql FROM sqlite_schema WHERE type = 'table' ORDER BY name LIMIT 200" --json
```

Query only Timeline events and user Tables. Internal control-plane state is not part of this interface.

## Query the Timeline safely

The Timeline is append-only. Its `events` envelope includes:

| Column | Meaning |
| --- | --- |
| `id` | Stable event ID |
| `schema_version` | Envelope schema version |
| `source` | System-derived producer identity |
| `type` | Event type |
| `external_id` | Optional producer-scoped deduplication key |
| `started_at` | Required epoch milliseconds |
| `ended_at` | Optional epoch milliseconds |
| `payload` | JSON product data |
| `created_at` | Ingestion time in epoch milliseconds |

First discover relevant data:

```sql
SELECT source, type, COUNT(*) AS count,
       MIN(started_at) AS first_at,
       MAX(started_at) AS last_at
  FROM events
 WHERE started_at >= <epoch-ms>
 GROUP BY source, type
 ORDER BY count DESC
 LIMIT 200
```

Then inspect a bounded sample:

```sql
SELECT id, source, type, external_id, started_at, ended_at, payload
  FROM events
 WHERE source = '<confirmed-source>'
   AND type = '<confirmed-type>'
 ORDER BY started_at DESC
 LIMIT 20
```

The CLI accepts one relational read statement. Use named columns, time/source/type filters, aggregation, and practical limits. Do not issue DML, DDL, `PRAGMA`, `ATTACH`, administrative statements, or explicit transactions. Escape values correctly; never splice untrusted text into SQL.

Payloads may be returned as JSON values or strings depending on the client path. Parse defensively. Treat `started_at`, `ended_at`, and `created_at` as epoch milliseconds.

## Content references

Some large or sensitive content remains behind a logical content reference while the event contains bounded preview and hash metadata. The public CLI currently has no content-reference resolution command.

Use the available preview when it is sufficient. Otherwise tell the user that the full content cannot be resolved through the current CLI. Do not read blob storage directly, call private Core routes, or invent inline content.

## Table limits

The CLI query surface can read Tables but does not expose arbitrary row mutation. If the task requires durable structured writes, use an existing App that already owns the required Table authority or build/change an App through the management workflow. A schema change creates structure; it does not provide an external agent with arbitrary row-write authority.

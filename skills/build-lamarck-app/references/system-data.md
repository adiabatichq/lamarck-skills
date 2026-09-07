# System SDK and Data Model

Contract baseline: `@lamarck/system` protocol V1, Timeline events, Workspace Files, and Tables.

## Contents

- Import and operations
- Discover before adapting
- Timeline events
- Workspace Files
- Tables
- SQL policy
- Content references and privacy

## Import and operations

Use the same package from browser UI code and Node workloads:

```ts
import { system } from "@lamarck/system";
```

The public operations are:

```ts
system.query(sql, params?)
system.resolveContentRef(ref)
system.mutate(sql, params?)
system.transaction(statements)
system.vfs.command(command, options?)
system.vfs.open(path)
system.writeEvent(event)
```

The Host supplies the transport. Never construct a Core URL, Guard token, socket path, source, or App identity.

SQL parameters may be positional arrays or named objects. Values are `null`, strings, numbers, or encoded blobs. Parameterize values; never interpolate user or event data into SQL.

## Discover before adapting

Connector-defined event types and payloads are not one global schema. Discover what exists in the selected Workspace before implementing a view:

```ts
const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
const { rows } = await system.query(
  `SELECT source, type, COUNT(*) AS count,
          MIN(started_at) AS first_at,
          MAX(started_at) AS last_at
     FROM events
    WHERE started_at >= ?
    GROUP BY source, type
    ORDER BY count DESC
    LIMIT 200`,
  [since],
);
```

Then inspect a small sample for the selected source and type:

```ts
const { rows } = await system.query(
  `SELECT id, source, type, external_id, started_at, ended_at, payload
     FROM events
    WHERE source = ? AND type = ?
    ORDER BY started_at DESC
    LIMIT 20`,
  [source, type],
);
```

Do not hard-code an Oura, activity, calendar, Git, or coding-agent payload shape until samples from this Workspace confirm it.

## Timeline events

The Timeline is the append-only durable history. Its `events` envelope is:

| Column | Meaning |
| --- | --- |
| `id` | Stable event ID |
| `schema_version` | Envelope schema version |
| `source` | Host- or connector-derived producer identity |
| `type` | Event type |
| `external_id` | Optional producer-scoped deduplication key |
| `started_at` | Required epoch milliseconds |
| `ended_at` | Optional epoch milliseconds |
| `payload` | JSON product data |
| `created_at` | Ingestion time in epoch milliseconds |

Parse JSON defensively:

```ts
function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
```

Write a new observation without supplying source or ID:

```ts
await system.writeEvent({
  type: "replay.generated",
  startedAt: Date.now(),
  externalId: "replay:2026-07-22",
  payload: { window: "today", eventCount: 418 },
});
```

Use `externalId` for deterministic idempotency. Lamarck deduplicates non-null external IDs within the derived source. Do not call `writeEvent` with reserved lifecycle or audit namespaces such as `workspace.*`, `ddl.*`, `connector.*`, `app.created`, or `app.archived`.

## Workspace Files

Files are the mutable filesystem rooted at `<Workspace>/files/`. Use real relative paths with explicit filenames and extensions; there is no document ID layer, implicit `.md`, or database content copy.

Write within the App's implicit namespace:

```ts
const result = await system.vfs.command("tee -- apps/replay/latest-review.md", {
  stdin: "# Latest review\n\nGenerated locally from the timeline.\n",
  stdout: "ignore",
  author: "replay",
});
if (!result.success) throw new Error(new TextDecoder().decode(result.stderr));
```

The supported grammar is intentionally small: `cat`, `ls`, `stat`, `tee`, `mkdir`, `rm`, `cp`, and `mv`. Commands use canonical argv-style quoting and `--` before operands. `stdin` accepts text or byte inputs, `stdout` may be `"capture"` or `"ignore"`, and non-zero command results resolve normally.

Use the one typed adapter when a browser needs a displayable file URL:

```ts
const imageUrl = await system.vfs.open("apps/replay/chart.png");
```

App writes are limited to `permissions.writes.files` plus the implicit `apps/<app-id>/` prefix. Import and export are trusted Shell/CLI operations and are rejected from App workloads. Successful file mutations and external filesystem edits produce grouped `workspace.files.changed` evidence automatically; App code must not manufacture it. The Node runtime's physical Files view is read-only, and durable changes must still use the VFS.

## Tables

Tables hold structured current or derived state. Mutate only existing Tables named in `permissions.writes.tables`:

```ts
await system.mutate(
  `INSERT INTO replay_bookmarks (event_id, label)
   VALUES (?, ?)
   ON CONFLICT(event_id) DO UPDATE SET label = excluded.label`,
  [eventId, label],
);
```

Use a Host-managed schema path before relying on a new Table. `system.mutate` does not accept DDL.

Use a transaction for coupled operations:

```ts
await system.transaction([
  { sql: "DELETE FROM replay_items WHERE window_id = ?", params: [windowId] },
  {
    sql: "INSERT INTO replay_items (window_id, event_id) VALUES (?, ?)",
    params: [windowId, eventId],
  },
]);
```

Table mutations are audited atomically by Guard as grouped `workspace.table.rows.inserted`, `workspace.table.rows.updated`, or `workspace.table.rows.deleted` events. Every Table needs an explicit non-null primary key. Primary-key values are immutable: delete and insert instead of updating them. Keep derived state rebuildable from durable inputs and record enough provenance or version information to explain how it was produced.

## SQL policy

`system.query` accepts one relational read statement. CTEs, joins, aggregation, window functions, JSON functions, and bounded recursive queries are available. It rejects writes, DDL, `PRAGMA`, `ATTACH`, explicit transactions, and administrative statements.

`system.mutate` accepts one DML statement against granted Tables. `system.transaction` accepts a bounded non-empty list of read or DML statements while Guard owns the transaction boundary.

Current V1 reads are global within the user data database. There are no manifest read grants. Internal `system.db` state is not exposed.

Prefer bounded queries:

- select named columns instead of `SELECT *`
- filter by time, source, type, or ID
- add a practical `LIMIT`
- aggregate before rendering thousands of points
- keep expensive parsing out of the React render loop

## Content references and privacy

Some payloads contain a content reference instead of inline text. When a value matches the content-blob reference shape, resolve it explicitly:

```ts
const result = await system.resolveContentRef(ref);
if (result.status === "resolved") {
  console.log(result.text);
}
```

Handle `missing`, `digest_mismatch`, `unsupported`, and `decode_error` without crashing the entire view.

Personal history can include transcripts, file patches, health signals, and attention data. Reveal the minimum detail needed by the requested interface. Keep raw text collapsed or summarized when a chart, count, duration, or title is sufficient.

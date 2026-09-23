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

### Write events deliberately

An event is durable, attributable evidence of meaningful activity or an observation. It lets future users and Apps understand what happened, what the user expressed, or what the App observed or delivered. Each `writeEvent` call adds to the user's permanent history.

**Preserve intentionally submitted user content by default.** Messages, questions, search requests, instructions, submitted form values, corrections, and explicit decisions express something the user chose to provide. The App should not require an importance score or predict future usefulness before retaining them. Capture the actual submitted content and enough context to understand what it concerned. Use the submission/commit boundary rather than each keystroke, focus change, or navigation click.

Exercise restraint with internal processing, UI mechanics, and duplicate data. Existing File/Table evidence may already retain the submitted content; reuse that evidence and add only missing interaction context or relationships. A saved result alone does not necessarily preserve the request that produced it.

For other observations, decide whether they add lasting content or activity value. For every event, identify what evidence it adds and what the App actually observed, keeping inference separate.

Positive examples, when this evidence is not already retained:

| App activity | Evidence worth preserving | Future value |
| --- | --- | --- |
| The user asks an AI assistant to explain a document; the answer is shown only in the conversation UI. | The submitted question and the specific document version it concerns; then the answer actually delivered, linked to that request. | Recall what the user asked and which explanation they received. |
| An AI writing App offers several drafts; the user selects one and supplies a reason. | The explicit selection and the user's stated reason, linked to the exact retained draft. | Explain a decision that the saved document alone does not capture. |
| A planning App accepts a new constraint such as "keep Friday free" without changing a File or Table. | The submitted constraint and its relevant planning scope. | Preserve a preference expressed in that interaction for later planning. |

Preserve a submitted request even if downstream AI processing or another operation later fails. Record it at submission rather than waiting for a successful result; separately preserve any meaningful outcome actually delivered to the user.

Do not use `writeEvent` for operational logs, debug traces, loading/progress states, health checks, internal retries, or token/cost telemetry. Never use D0 as a dumping ground for request/response bodies or runtime snapshots.

Record the user's actual words or selected action and parameters; do not present inferred intent as a user statement. Record delivery only at the App's observed delivery boundary. A model generating text does not establish that the App delivered it, and delivery does not establish that the user read or understood it. Internal model calls and component renders are not automatic event boundaries.

Keep each event about the new activity. Do not repeat the whole conversation, model prompt, or App state on every interaction. File and Table changes already produce evidence: add an App event only when it contributes meaning such as a request, decision, or delivery and its relationship to the saved result. Where content is already retained, reference the exact retained event or content version instead of copying it again. A mutable path or row ID alone does not identify historical content. Never invent a reference or drop required content merely to make an event smaller.

#### Example: an AI assistant answers a question

The user submits "Which decisions did I make today?" The App reads Timeline evidence, uses AI to prepare an answer, and presents the answer in its conversation UI. The lasting evidence is the submitted request and the answer delivered to the user.

Use `system.writeEvent` at those two App boundaries. The types and payloads below are App-defined examples, not a new System event contract. Message/delivery IDs and timestamps come from the actual App interaction; keep their identity, time, and content unchanged when retrying an event write.

```ts
const { id: requestEventId } = await system.writeEvent({
  type: "chat.message_submitted",
  startedAt: submittedAt,
  externalId: `message:${messageId}`,
  payload: { conversationId, content: submittedText },
});
```

Later, after the App has committed the answer to its conversation UI, use that delivery handler to record the actual presented text. `requestEventId` links it to the submitted request:

```ts
await system.writeEvent({
  type: "chat.answer_delivered",
  startedAt: deliveredAt,
  externalId: `delivery:${deliveryId}`,
  payload: {
    conversationId,
    requestEventId,
    content: deliveredText,
  },
});
```

`deliveredText` is the final App-presented answer, including any edits or formatting changes the App made after generation. For a streamed answer, capture the text actually presented when that response completes or is interrupted, with an explicit outcome for the App's observation. Choose event types and payloads for the App's domain; a non-chat App does not need conversation IDs or a conversation framework.

Required fields are `type`, `startedAt` (epoch milliseconds), and JSON `payload`; `endedAt` and `externalId` are optional. The result is `{ ok: true, id }`. The Host binds source and producer provenance. Do not supply source or event ID. Surface write failures; do not claim content was recorded when its write failed.

Use `externalId` for deterministic replay identity. Lamarck deduplicates non-null external IDs within the derived source. A genuinely new message, revision, or delivery needs its own identity even if its text matches an earlier event. Do not call `writeEvent` with reserved lifecycle or audit namespaces such as `workspace.*`, `ddl.*`, `connector.*`, `app.created`, `app.archived`, or the reserved `ai.turn` type.

`writeEvent` does not automatically externalize large payloads into blobs. The current App SDK exposes `resolveContentRef` but no public blob-writing operation. For large content, use an appropriate supported File/Table persistence design and preserve an exact historical reference where available; do not invent a blob API, fabricate a ContentRef, or silently truncate the record.

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

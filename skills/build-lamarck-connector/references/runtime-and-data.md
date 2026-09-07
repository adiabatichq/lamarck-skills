# Connector Runtime and Data

## Entry module

Installed package material exposes a JavaScript ESM entry. Export one default definition:

```js
export default {
  async run(context) {
    // one watch loop, poll pass, or manual operation
  },

  async resolveSourceIdentity(context) {
    return { key: "stable-provider-id", label: "Human label" };
  },

  requirements: {
    "example-permission": {
      label: "Example permission",
      async check(context) {
        return { status: "satisfied" };
      },
      async request(context) {
        return { status: "pending", message: "Complete setup in system settings." };
      }
    }
  }
};
```

Only implement optional members required by the manifest and Source model.

## Run context

`run(context)` receives:

```ts
type ConnectorRunContext<TConfig, TState> = {
  guard: {
    writeEvent(event): Promise<{ id: string }>;
    writeEvents(events): Promise<{ ids: string[] }>;
    writeTextBlob?(input): Promise<{ ref: object; bytes: number; compressedBytes: number }>;
  };
  auth: AuthHandle;
  state: { get(): Promise<TState | undefined>; set(state: TState): Promise<void> };
  warnings: { set(warning): Promise<void>; clear(key: string): Promise<void> };
  config: TConfig;
  signal: AbortSignal;
};
```

The context is Source-scoped. It does not expose database handles or raw credential storage.

## Events and idempotency

Write events without supplying source or event ID:

```js
await context.guard.writeEvent({
  type: "calendar.event",
  externalId: providerEvent.id,
  startedAt: Date.parse(providerEvent.startsAt),
  endedAt: Date.parse(providerEvent.endsAt),
  payload: normalizedPayload
});
```

Every Connector event requires:

- a type declared in the event catalog;
- deterministic non-empty `externalId` for the same upstream fact across retries;
- `startedAt` and optional `endedAt` as epoch milliseconds;
- JSON-compatible payload matching the declared semantics.

Lamarck derives `source` from the admitted Connector and resolved Source identity. Never accept or manufacture it in connector code.

Duplicate `(source, externalId)` writes are idempotent no-ops. This supports replay; it is not an update mechanism. Represent upstream changes as new stable observations when the Connector's event contract requires them.

Use `writeEvents` for bounded batches. Preserve deterministic order when it affects checkpointing or tests.

## Large content

Keep Timeline event rows bounded. When complete large text or structured raw content is needed and `writeTextBlob` is available, store it there and place the returned logical reference plus bounded preview/hash metadata in the event payload. Never write directly to blob storage or expose its physical path.

If blob writing is unavailable, follow the Connector's declared fallback semantics; do not silently truncate content without recording that it is incomplete.

## Checkpoint state

`context.state` is private Source checkpoint state, not user data, config, a secret store, or an event log.

Always materialize the Timeline events first and advance the checkpoint only after the write resolves:

```text
fetch page
→ normalize and write idempotent events
→ await successful writes
→ persist cursor/state for that page
```

A crash between event write and checkpoint intentionally replays the unit. Deterministic external IDs prevent duplicates. Never checkpoint an item merely because it was seen in memory.

## Auth and network

Use only the declared auth handle:

- `none`: no credential.
- `apiKey` or direct `oauth2`: `await context.auth.getToken()` returns the user/provider token.
- `managedProvider`: use `getToken()` and `providerOrigin`; call the scoped Lamarck provider API, not the upstream service with an imagined provider token.

Do not persist returned tokens, log them, place them in events/config/state, or send them to any origin other than the declared provider flow.

Approved Connectors are trusted local Node code and may have ambient filesystem/network access. That is not permission to scan unrelated files, contact unrelated endpoints, spawn hidden tools, or download executable code. Keep access proportional to the package's stated purpose.

## Cancellation and modes

Honor `context.signal` in fetches, waits, loops, child processes, and platform adapters.

- A `watch` run stays alive until aborted and exits promptly on abort. Do not create an independent immortal daemon.
- A `poll` run completes one bounded pass. Pagination and backfill must checkpoint safely and respect provider limits.
- A `manual` run completes one explicit operation and receives no transient V1 input.

Do not implement an internal scheduler. Core owns run intent, schedules, lifecycle, and replacement after config/credential changes.

## Errors and warnings

Throw when the primary run cannot succeed; Core records a failed run. Do not convert hard failures into successful empty runs.

Use keyed warnings for non-fatal current conditions such as a secondary backfill being rate-limited while incremental sync still succeeds. Clear each warning when resolved. Warnings are control-plane state, not Timeline events.

Never write operational events such as `connector.error`, auth failures, or retry logs onto the Timeline as product data.

## Testing

Test `run` through injected/fake context capabilities rather than real databases or credentials. Cover the risks present in the Connector:

- manifest/catalog agreement for every emitted event type;
- deterministic external IDs under repeated input;
- event-before-checkpoint ordering and replay after failure;
- pagination, incremental cursors, and backfill boundaries;
- token scope and destination URL construction;
- abort behavior for watch loops and in-flight requests;
- hard errors versus warnings;
- identity resolution stability;
- content-reference fallback and redaction when used.

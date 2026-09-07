---
name: build-lamarck-connector
description: Create, modify, or debug Lamarck Connector packages against Connector Manifest V1, Source identity, the event catalog, and the Connector runtime. Use when authoring integration code that captures external or local-system data as Timeline events. Do not use merely to install, update, run, pause, or inspect an existing Connector or Source.
---

# Build a Lamarck Connector

Build a small, inspectable Connector package that turns one external or local-system data boundary into semantically useful, idempotent Timeline events.

## Confirm This Is Connector Work

Use a Connector when the capability must observe a provider, device, host application, file tree, or external API and capture durable facts on the Timeline. Do not use a Connector for presenting existing data, App-owned derived state, or ordinary Workspace File manipulation.

Before authoring, inspect installed Connectors and Sources:

```sh
lamarck connector list --json
lamarck source list --json
```

Avoid duplicating an existing package. If the request is only to install or operate one, use the system-management workflow instead.

## Orient to the Workspace

Work in the exact Lamarck Workspace selected by the user. A custom package lives at `connectors/<connector-id>/`. Preserve existing user code and inspect nearby Connectors for compatible conventions.

Do not edit an installed signed Marketplace Connector in place unless the user explicitly wants a custom modification: any package change changes its content hash, invalidates the previous trust decision, and requires human approval again.

Never place credentials, auth tokens, mutable Source config, checkpoints, or runtime state in the Connector package. Never edit `.lamarck/`, `.adiabatic/`, SQLite files, credential storage, trust records, or Core/Guard state.

## Load the Contract You Need

- Read [Connector contract](references/connector-contract.md) before creating or changing the manifest, event catalog, Source identity, auth, config, platforms, or requirements.
- Read [Runtime and data](references/runtime-and-data.md) before implementing `run`, network access, events, content blobs, checkpoint state, warnings, or retries.
- For a new Connector, read both references before implementation.

Treat Lamarck's installed parser/runtime errors as authoritative when they disagree with the written baseline. Do not copy private Core interfaces into the package to bypass a rejected contract.

## Design the Source Boundary First

Before writing fetch or watcher code, decide:

1. What one Source represents and whether identity is `single`, `device`, or `connector`.
2. Whether invocation is `watch`, `poll`, or `manual`.
3. Which stable upstream facts become Timeline event types.
4. What deterministic `externalId` makes replay and retry idempotent.
5. Which mutable cursor belongs in private Source state.
6. Which credentials, config fields, and platform requirements genuinely block readiness.

Do not derive these choices accidentally from implementation convenience. A wrong Source boundary permanently weakens provenance because the Timeline is append-only.

## Keep the Package Small and Reviewable

- Use a strict Manifest V1 and a separately referenced JSON event catalog.
- Export one default Connector definition with `run` and only the optional handlers the package needs.
- Keep provider/OS adapters separate from event normalization and cursor logic when that improves testability.
- Declare user-facing config only for choices users understand and may reasonably change; keep operational constants in code.
- Put secrets behind the declared auth handle, never config or files.
- Do not download or execute new code at runtime.

## Verify Before Human Approval

1. Parse the manifest and JSON event catalog and check every referenced authority file exists inside the package root.
2. Run the Connector's unit tests with fake auth, Guard, state, warning, and abort handles. Cover idempotent replay, checkpoint ordering, provider pagination, error behavior, and cancellation where relevant.
3. Exercise the entry module without real credentials when adapters permit it.
4. Have Lamarck Desktop discover the custom package and surface its exact package hash for review.
5. Ask the user to inspect and approve that exact hash in Desktop. Agents must never perform or simulate custom Connector approval.
6. Complete Source setup in Desktop, then inspect it with `lamarck source inspect <source-id> --json`.
7. Run one deliberate test with `lamarck source run <source-id> --wait --json` when safe, then confirm declared and observed outputs.

If real credentials, platform permission, or approval are unavailable, stop at the verified boundary and state exactly what remains. Do not claim the Connector runs from unit tests alone.

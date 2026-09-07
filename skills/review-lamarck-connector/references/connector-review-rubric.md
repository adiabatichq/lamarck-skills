# Connector Review Rubric

Use this rubric against the exact package bytes presented for trust or publication.

## 1. Artifact identity and package surface

- Manifest ID matches the package directory and intended identity.
- A Marketplace package ID is exactly `namespace.name`; local provenance is not presented as official.
- Manifest, entry, and event catalog are regular files inside the package root, reached through link-free package-relative paths.
- Symlinks, bundled binaries, generated files, archives, and unusual filesystem entries are intentional and covered by review.
- Package hash/release ID corresponds to the bytes inspected. Modified content is not represented as its earlier Marketplace release.
- Package contains no credentials, tokens, user data, runtime checkpoints, environment dumps, or local absolute paths.

## 2. Trusted-code threats

Search entry code, dependencies, scripts, and bundled assets for:

- reads or writes outside the exact files/directories required by the stated source;
- broad home/workspace scans, browser/credential-store access, SSH material, environment-secret enumeration, or clipboard capture;
- network requests to undeclared/unrelated origins, telemetry, analytics, tracking pixels, or error reporting with personal payloads;
- dynamic code download, `eval`, generated execution, hidden update channels, package-manager invocation, or remote configuration that changes executable behavior;
- `child_process`, native binaries, shell composition, privilege prompts, persistence/launch agents, or processes surviving Source cancellation;
- log/error paths that expose tokens, headers, source config, raw private content, or Host paths.

Treat obfuscation, unexplained minified code, opaque binary blobs, or unverifiable generated output as missing review evidence, not harmless implementation detail.

## 3. Manifest and Source model

- Manifest Version 1 contains only supported fields and accurately declares entry, event catalog, runtime, Source identity, platforms, auth, config, and panels.
- Runtime mode reflects the actual trigger model; Connector code does not implement a hidden scheduler or daemon.
- `defaultSchedule` appears only for poll and is not treated as persistent package state.
- `source.identity` is explicit and correct:
  - `single` only when there is truly one logical Source;
  - `device` when Core device identity is the provenance boundary;
  - `connector` with a stable provider-native key and implemented resolver.
- Display labels are never used as identity when an immutable provider ID exists.
- Platform requirements match exported handlers and do not smuggle ordinary operations into trust/setup prompts.
- Config contains understandable user choices only; hidden tuning remains code constants.

## 4. Credentials and network

- Secrets enter only through the declared `auth` handle, never config, package files, state, events, warnings, or logs.
- Direct OAuth is public-client PKCE; no confidential client secret is embedded.
- Managed-provider code uses the supplied `providerOrigin` and scoped capability token rather than fabricating upstream OAuth access.
- Tokens are sent only to the intended HTTPS origin and are not persisted or reused beyond the run.
- Redirects, pagination URLs, user-controlled endpoints, webhooks, and downloaded media cannot redirect credentials or private data to another origin.
- Requests are bounded, cancellable, and avoid uploading unrelated Workspace or Source data.

## 5. Event semantics and privacy

- Every emitted type exists in `events.json`; the catalog does not declare outputs the code cannot produce.
- Payload schemas explain stable identifiers, units, enums, time meaning, optional fields, and content-reference semantics.
- `externalId` is deterministic for the same upstream fact across retries and scoped correctly by the system-derived Source.
- Connector code never supplies `source` or system event IDs.
- Timestamps are valid epoch milliseconds and range semantics are consistent.
- Provider records are normalized without silently changing meaning, units, time zones, or identity.
- Collection is limited to the Connector's stated purpose; highly sensitive raw content has an explicit user/product need.
- Large content uses bounded preview/reference behavior and does not leak physical blob paths.
- Operational failures, retries, and warnings are not written onto the Timeline as product facts.

## 6. State, replay, and runtime reliability

- Timeline event writes complete before advancing the corresponding Source checkpoint.
- Crash/retry replays are harmless because external IDs are deterministic.
- Pagination checkpoints cannot skip a committed page or advance past a failed write.
- Watch loops and in-flight requests honor `AbortSignal` and leave no child process or timer behind.
- Poll/manual runs terminate; watch runs stay alive only until cancellation.
- Rate limits and transient failures have bounded behavior. Hard primary failures throw; secondary recoverable conditions use keyed warnings and clear them when resolved.
- Config/credential replacement and Source restart do not create duplicate independent loops.
- No mutable state lives in manifest/package files.

## 7. Dependencies and release quality

- Dependency graph and lockfile are present, intentional, reproducible, and free of suspicious install scripts or unpinned remote code.
- Native helpers are source-reviewable or have documented reproducible provenance and minimum required authority.
- Tests use fake auth/Guard/state and cover idempotent replay, checkpoint ordering, cancellation, identity, pagination, and error paths appropriate to the package.
- Publication artifact excludes tests/build caches only when their absence does not remove evidence needed to understand shipped code.
- Name, description, catalog summary, and changelog accurately represent behavior and privacy impact.

## 8. Human trust boundary

Only Desktop may approve a custom or modified Connector, and approval binds the exact package hash. No Connector code, CLI call, App, agent, job, or review report may grant that trust. Any content change requires re-review and a new human decision.

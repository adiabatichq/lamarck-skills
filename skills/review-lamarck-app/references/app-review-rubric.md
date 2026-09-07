# App Review Rubric

Use the sections relevant to the App. Absence of a feature means its specialized checks do not apply.

## 1. Identity and lifecycle

- Folder name equals manifest `id`.
- IDs use lowercase alphanumeric/hyphen segments separated by dots; service/job entry IDs remain unscoped.
- `name` and `description` are non-empty, trimmed, and accurately describe the local capability.
- `createdFrom`, when present, contains only Desktop-injected `packageId` and `releaseId`; App code does not invent or mutate it.
- User data and mutable runtime state are not stored in `manifest.json` or App source.
- Working changes, current retained version, and runtime state are represented accurately by `app inspect`.

## 2. Strict Manifest V1

Allowed root fields are `manifestVersion`, `id`, `name`, `description`, optional `createdFrom`, `runtime`, and `permissions`. Unknown fields at every fixed-shape level are rejected.

- `manifestVersion` is exactly `1`.
- At least one of `runtime.ui`, `runtime.services`, or `runtime.jobs` exists.
- Every command is a non-empty argv string array and names an actual executable/package script.
- UI port is an integer from 1 through 65535, and the command binds that exact port without fallback.
- `permissions.writes.files` and `.tables` are present arrays, including for read-only Apps.
- There is no invented `runtime.agents`, schedule field, Host command, or read-permission namespace.

## 3. Authority and data access

- The App imports `system` from `@lamarck/system`; it does not accept/store App identity, Core URLs, Guard tokens, sockets, or database paths.
- Queries are single relational read statements, parameterized, bounded, and limited to Timeline events and user Tables rather than internal state.
- Event adapters discover actual Source/type/payload shapes instead of assuming one global schema.
- Timeline event timestamps are treated as epoch milliseconds and JSON payloads are parsed defensively.
- Content references are resolved explicitly and non-resolved statuses have a usable fallback.
- Event writes omit source/ID, use meaningful types, and use deterministic `externalId` when idempotency matters.
- File writes use the VFS and real portable paths. Grants beyond `apps/<app-id>/` are exact or intentional prefixes.
- Table writes target only existing explicitly granted Tables, preserve primary keys, use transactions for coupled changes, and contain no DDL.
- Every write permission is exercised by a reachable feature and no broader than necessary.

## 4. Capsule compatibility

- Runtime code does not depend on internet/LAN/Host-loopback access, Host files, ambient credentials, Docker, Python, Git, shell composition, or undeclared binaries.
- Dependencies are npm/browser/Node 24 compatible and do not download code at runtime.
- `package-lock.json` is present, current, and uses supported integrity-pinned dependency forms.
- Runtime filesystem, browser storage, and process memory hold only disposable caches/preferences, not authoritative personal data.
- UI survives reload by re-querying Lamarck and presents useful loading, empty, denied, and error states.
- Services stay alive intentionally; jobs terminate; neither hides an independent daemon.

## 5. Privacy and product behavior

- The UI reveals only detail needed for its stated task and avoids dumping raw transcripts, health history, or attention data by default.
- No personal data is sent to an external service; Capsule egress assumptions are absent.
- Export/write behavior is visible and aligned with the user's action.
- Empty or incomplete Source history is not represented as a definitive conclusion.
- Dates, time zones, units, and aggregation windows are explicit enough to avoid misleading results.

## 6. Correctness and verification

- Data transformations handle nulls, missing fields, stringified JSON, duplicates, and boundary timestamps.
- Expensive query/parsing work is bounded and not repeated inside render loops.
- Tests cover important adapters, permission-sensitive writes, and state transitions rather than only snapshots.
- Production build and declared package scripts succeed with the retained lockfile.
- A real Lamarck launch exercises the SDK path; a normal browser preview alone is insufficient.

## 7. Publication readiness

For a Marketplace candidate, additionally check that the package is a reusable template rather than a dump of one user's state:

- no credentials, tokens, personal data, generated runtime artifacts, or local absolute paths;
- no injected `createdFrom` in the published template;
- names/descriptions match the actual capability;
- package contents are minimal and reproducible;
- permission and privacy behavior is understandable before installation.

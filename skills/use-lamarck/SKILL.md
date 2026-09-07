---
name: use-lamarck
description: Use an existing Lamarck Personal System through the lamarck CLI to answer questions and complete work with its current Sources, Apps, Timeline, Files, and Tables. Use for inspecting available context, querying personal history or structured data, synthesizing results, or reading and writing Workspace Files. Do not use to install, create, archive, reconfigure, or author system capabilities.
---

# Use Lamarck

Use the capabilities already present in the selected Personal System. Keep the current System Shape conceptually stable while completing the user's actual task.

## Work Through the Public Surface

Use the `lamarck` CLI. It discovers the running Lamarck Desktop instance and selected Workspace; do not request or construct Core URLs, bearer tokens, socket paths, database paths, or credentials.

If `lamarck` is unavailable, ask the user before installing it with `npm install -g @lamarck/cli`, then verify it with `lamarck --help`.

If Lamarck is not running or the wrong Workspace is selected, ask the user to open/select it in Desktop. Never search for and open Lamarck's private SQLite databases directly.

Read [CLI and data](references/cli-and-data.md) before querying unfamiliar event data, inspecting table schemas, writing Files, or handling content references.

## Follow the User's Intent

1. Determine the information or artifact the user actually wants.
2. Inspect only the relevant parts of the current system. There is no combined `lamarck shape` command:
   - Sources: `lamarck source list --json`, then inspect relevant Sources.
   - Apps: `lamarck app list --json`, then inspect only when an existing App matters.
   - Files: `lamarck file ls ...` and `lamarck file stat ...`.
   - Timeline and Tables: bounded read-only SQL through `lamarck query ... --json`.
3. Query the smallest useful slice of data. Discover source and event types before assuming payload shapes.
4. Synthesize an answer, or read/write a Workspace File when the requested outcome needs a durable artifact.
5. State material limits such as missing data, unresolved content, incomplete Source history, or an unavailable interface.

Do not turn an ordinary use request into system construction merely because a new App could be convenient. If the requested outcome genuinely requires a new capability or a change to System Shape, explain the gap and route that part to the relevant management or build workflow.

## Preserve the Use/Manage Boundary

Ordinary use includes reading the Timeline and Tables and reading or changing Files through existing authority. It does not include:

- creating, archiving, restoring, or versioning Apps;
- installing, updating, removing, or approving Connectors;
- pausing, resuming, setting up, or repairing Sources;
- submitting schema changes;
- editing App or Connector implementation code.

Do not perform those actions unless the user separately asks to change or build the system.

## Handle Personal Data Deliberately

Personal history may include messages, health data, attention traces, files, and credentials-adjacent metadata. Retrieve and expose only what the task needs. Prefer summaries and bounded samples over dumping raw histories. Do not send Lamarck data to an external service unless the user explicitly asks and the destination is within scope.

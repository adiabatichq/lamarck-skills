---
name: manage-lamarck-system
description: Inspect the health of, maintain, or change an existing Lamarck Personal System through the lamarck CLI. Use for Source operation, Connector lifecycle, App lifecycle, schema changes, or when the current System Shape itself is the subject. Do not use to author App or Connector implementation code.
---

# Manage a Lamarck System

Understand and change the selected Personal System while preserving Lamarck's authority and human-approval boundaries.

## Use the Public Management Surface

Use the `lamarck` CLI. It discovers the running Desktop instance and selected Workspace without public URLs or tokens. Do not operate on private databases, Core routes, Guard state, sockets, or hidden Desktop files.

Read [CLI lifecycle and authority](references/cli-lifecycle.md) before performing a mutation, handling a setup/trust boundary, or interpreting a lifecycle error.

## Establish Current State First

Use the domain-native Shape interfaces instead of fabricating one combined system document:

```sh
lamarck source list --json
lamarck connector list --json
lamarck app list --json
lamarck query "SELECT name, sql FROM sqlite_schema WHERE type = 'table' ORDER BY name LIMIT 200" --json
lamarck file ls -la -- .
```

Inspect only the relevant Source, Connector, App, File path, or table. Keep Sources, Apps, Files, and Tables independent; an App consuming Source data does not own that Source.

## Make the Smallest Requested Change

1. Identify the user's management intent and the affected primitive.
2. Inspect its current lifecycle, readiness, trust, health, permissions, and pending state.
3. Explain any material consequence before destructive, trust-sensitive, or approval-gated actions.
4. Perform only the requested supported operation.
5. Re-inspect the affected primitive and distinguish accepted/pending state from completed state.

Do not create an App or install a Connector speculatively during diagnosis. Do not turn a transient runtime issue into a shape change unless evidence supports it.

## Route Authoring Work Precisely

- If the user wants App source, manifest, SDK, UI, or workload changes, use `build-lamarck-app`.
- If the user wants a new or modified Connector package, use `build-lamarck-connector`.
- If the user asks for an audit or trust decision, use the appropriate review skill.

This skill may own the surrounding lifecycle operation, but it must not duplicate the implementation contracts carried by the specialist skills.

## Keep Human Authority Visible

Source creation/setup, credentials, complex config, platform requirements, and disconnect/remove remain Desktop-owned flows. Custom or modified Connector approval is always human-only. Schema changes are submitted as pending requests and are not complete until approved.

When the CLI reaches one of these boundaries, tell the user exactly what remains and where to do it. Do not simulate approval, capture secrets in chat or files, or bypass the Shell because the requested operation is otherwise routine.

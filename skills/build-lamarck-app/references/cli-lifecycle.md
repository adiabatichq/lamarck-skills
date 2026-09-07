# CLI App Lifecycle

The public CLI owns App creation and retained local versions. Prefer JSON output for decisions and verification.

## Inspect and locate

```sh
lamarck app list --json
lamarck app inspect <app-id> --json
```

Inspection returns the current manifest shape, version, unrecorded-change state, manifest/version health, runtime activity, and caller-visible package `path`. Use that path instead of assuming `<workspace>/apps/<id>`; the path differs between Host and a managed App Capsule.

If the intended App is ambiguous or the inventory looks like another Workspace, ask the user to select the correct Workspace in Desktop.

## Create

```sh
lamarck app create <app-id> --name <name> --description <text> --json
```

Creation initializes Lamarck's blank scaffold and local version history and emits the system-owned lifecycle evidence. The command is available from Host and managed CLI environments.

Choose the ID with the user when identity is material. It may contain lowercase alphanumeric/hyphen segments separated by dots. Do not inject `createdFrom`; Desktop owns Marketplace provenance.

After creation, inspect the App to resolve its path and baseline before editing.

## Save and inspect versions

```sh
lamarck app save <app-id> -m <message> --author <author> --json
lamarck app versions <app-id> --json
```

Save records the current package as a retained version. It may return `created: false` when nothing material changed. Use a concise message describing the user-visible capability or fix, not implementation chatter.

Building or modifying an App authorizes recording the completed result as the normal lifecycle hand-off. Do not save unrelated pre-existing changes as though they were yours; inspect the package and describe any overlap.

## Restore

```sh
lamarck app restore <app-id> <version> -m <message> --author <author> --json
```

Restore is forward-only: it creates a new retained version from the selected earlier version. It does not rewrite history. Use it only when the user asks to restore or when an agreed recovery plan requires it. Resolve ambiguous versions through `app versions` first.

## Managed refresh

Inside a managed App Capsule only:

```sh
lamarck app refresh <app-id> --yes --json
```

Refresh discards that Capsule's unsaved edits and replaces them with the current Host package. It is destructive. Require explicit authorization, inspect `hasUnrecordedChanges`, and report what will be lost before using it. It is unavailable from the Host CLI.

## Archive

```sh
lamarck app archive <app-id> --yes --json
```

Archive removes an App from the active System Shape. It is not part of ordinary build cleanup. Use it only when explicitly requested after checking runtime state and unrecorded changes.

## Interface limits

- The CLI has no generic App start/stop command. Viewer-demand remains Desktop-owned.
- Marketplace App discovery and install are Desktop handoff flows.
- A successful lifecycle command does not prove Capsule launch or a real data path works.
- Do not use private Git commands as a substitute for Lamarck version operations.

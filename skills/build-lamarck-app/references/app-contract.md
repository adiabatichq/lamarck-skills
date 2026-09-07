# Lamarck App Contract

Contract baseline: App Manifest V1 and System protocol V1.

## Contents

- Directory and package shape
- Manifest V1
- Workloads
- Permissions
- Identity and lifecycle
- Static validation checklist

## Directory and package shape

Place each App at `apps/<app-id>/`. The folder name and manifest `id` must be identical.

A typical UI App contains:

```text
apps/replay/
├── manifest.json
├── package.json
├── package-lock.json
├── index.html
├── main.tsx
├── App.tsx
└── vite.config.ts
```

Use a private ESM package and commit its npm lockfile. Prefer versions from Lamarck's current blank-App scaffold or an existing working App instead of guessing. The scaffold uses React, Vite, TypeScript, and `@lamarck/system`.

For Vite, make the declared start script bind the manifest port without silently selecting another one:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "start": "vite --host 127.0.0.1 --port 3000 --strictPort"
  },
  "dependencies": {
    "@lamarck/system": "^0.1.0"
  }
}
```

Keep the full dependency set and generated `package-lock.json`; this fragment is not a complete `package.json`.

## Manifest V1

The manifest is strict JSON. Unknown fields at any level are rejected.

```json
{
  "manifestVersion": 1,
  "id": "replay",
  "name": "Replay",
  "description": "Reviews and rebuilds selected personal history.",
  "runtime": {
    "ui": {
      "command": ["npm", "run", "start"],
      "port": 3000
    },
    "services": {
      "indexer": {
        "command": ["npm", "run", "indexer"]
      }
    },
    "jobs": {
      "rebuild": {
        "command": ["npm", "run", "rebuild"]
      }
    }
  },
  "permissions": {
    "writes": {
      "files": [],
      "tables": []
    }
  }
}
```

Omit unused workload namespaces. `runtime` must contain at least one UI, service, or job.

Manifest rules:

- `manifestVersion` is exactly `1`.
- `id` contains one or more lowercase alphanumeric/hyphen segments separated by dots. Local unscoped IDs such as `replay` and scoped IDs such as `lamarck.replay` are both valid.
- Every service or job entry ID remains unscoped and matches `^[a-z0-9][a-z0-9-]*$`.
- `name` is non-empty, trimmed text.
- `description` is non-empty, trimmed natural-language text explaining what the App is for.
- A command is a non-empty argv array of strings. Lamarck does not pass it through a Host shell.
- A UI port is an integer from 1 through 65535.
- `permissions.writes.files` and `permissions.writes.tables` are always arrays, even when empty.
- Mutable state never belongs in `manifest.json`.

Allowed fields are exactly:

- root: `manifestVersion`, `id`, `name`, `description`, `createdFrom`, `runtime`, `permissions`
- createdFrom: `packageId`, `releaseId`
- runtime: `ui`, `services`, `jobs`
- UI: `command`, `port`
- service/job entry: `command`
- permissions: `writes`
- permissions.writes: `files`, `tables`

There is no `runtime.agents` namespace.

## Workloads

| Workload | Use it for | Lifecycle |
| --- | --- | --- |
| `ui` | Interactive viewer or editor | Must listen on its declared port before it is ready |
| `services.<id>` | Long-running App-owned work independent of the UI | Expected to stay alive until Lamarck stops it |
| `jobs.<id>` | Explicit finite work | Expected to exit on completion |

Commands run with the App root as the working directory. Prefer `npm run ...` scripts so the package and lockfile describe the executable surface.

## Permissions

Manifest permissions are capability grants, not a declaration of which Timeline events the App can read. V1 declares only the `writes` namespace.

`permissions.writes.files` grants Workspace File writes beyond the implicit `apps/<app-id>/` prefix. Each value is either:

- an exact real path, such as `reviews/weekly.md`
- a prefix ending in `/`, such as `reviews/`

Paths always include their real filename and extension; there is no implicit `.md`. They are portable relative paths: no leading slash, backslash, `.` or `..` segment, control character, or platform-reserved path character. Do not grant reserved operational paths such as `.obsidian` or `.DS_Store`.

`permissions.writes.tables` lists concrete existing Tables the App may mutate. `"*"` is invalid. Do not include `events` or internal/system table names. Every Table must have an explicit non-null primary key, and primary-key values are immutable after insertion. App SQL cannot create a Table; DDL requires a Host-managed approval or provisioning path.

Use empty arrays for a read-only App:

```json
"permissions": {
    "writes": {
    "files": [],
    "tables": []
  }
}
```

## Identity and lifecycle

Lamarck derives workload identity and Timeline event source from admission, not App input:

- UI: `app:<app-id>:ui`
- service: `app:<app-id>:service:<entry-id>`
- job: `app:<app-id>:job:<entry-id>`

Do not add an App ID, source, Core URL, or credential to App configuration. The Host binds the System SDK channel to the admitted workload.

Creating an App through Lamarck's public App lifecycle in the Shell or with
`lamarck app create` emits `app.created` and initializes its package and local
version history. Direct filesystem scaffolding does not emit that event and is
not the supported creation path.

A local App instantiated from a verified Marketplace template may also contain:

```json
"createdFrom": {
  "packageId": "lamarck.replay",
  "releaseId": "rel_..."
}
```

`createdFrom` is immutable descriptive provenance for that local copy. It does
not make the App managed, updateable, trusted, mergeable, or publishable. Do
not invent or rewrite it while authoring an App; Desktop adds it only after a
Marketplace release has been verified. Published App templates do not contain
`createdFrom` for themselves.

## Static validation checklist

- Folder name equals manifest ID.
- Name and description are non-empty, trimmed text.
- Manifest contains no unknown fields.
- At least one workload exists.
- Every workload command names a real executable or package script.
- UI command binds the exact declared port.
- `package-lock.json` is present and current.
- File and table grants are minimal and valid.
- No mutable runtime state is stored in the manifest.

Run `scripts/validate-app.mjs` from this Skill before trying the App in Lamarck.

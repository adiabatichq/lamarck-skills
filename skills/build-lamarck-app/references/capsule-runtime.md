# App Capsule Runtime

The App Capsule is Lamarck's macOS App execution boundary: a Swift Virtualization.framework Host runs a verified Linux Guest, which admits App workloads as isolated `runc` containers and binds them to the Host-mediated System SDK.

## Contents

- What App code can assume
- Build and runtime separation
- Durable state
- Network and Host boundaries
- UI behavior
- Common failures

## What App code can assume

Target ordinary JavaScript and TypeScript supported by Node.js 24 and npm. Browser code, Node workloads, and compatible WASM dependencies are appropriate.

Inside the Capsule, an App receives:

- its packaged code and dependencies
- its declared process command and working directory
- an App-private runtime environment
- a read-only physical view of Workspace Files in Node workloads
- the Host-bound `@lamarck/system` channel
- a private UI port when `runtime.ui` is declared

It does not receive ambient authority merely because it imports the SDK.

Do not assume the runtime contains Git, Python, Docker, Homebrew, a compiler toolchain, arbitrary shell utilities, or binaries from the Host. Bundle required JavaScript dependencies through npm and keep runtime commands explicit.

## Build and runtime separation

Build output and runtime state are separate. The build may resolve declared npm dependencies under a deterministic package policy; the runtime does not inherit build-time network access or user data.

Commit `package-lock.json`. The alpha build contract accepts npm lockfile versions 2 and 3 and expects integrity-pinned HTTPS tarballs from the canonical npm registry. Avoid:

- Git dependencies
- arbitrary URL dependencies
- registry credentials embedded in package metadata
- unpinned downloads performed by lifecycle scripts
- a runtime step that installs or compiles dependencies

Treat a package that downloads binaries from its own server during install as suspect until the Capsule build proves it is supported.

## Durable state

Runtime filesystems, browser storage, process memory, and physical viewer origins are disposable. Use them only for caches or replaceable UI preferences.

Store authoritative state through Lamarck:

- Timeline event for immutable history
- Workspace File for human-editable or portable state
- Table for structured current or derived state

Do not write durable data back into App source, `manifest.json`, `node_modules`, the Guest filesystem, or a path under `.lamarck/`.

## Network and Host boundaries

Runtime App code has no general internet, LAN, Host-loopback, or Host-DNS egress. Its only Host filesystem surface is the unfiltered, read-only Files mount available to Node workloads; it receives no database path, secrets, Core URL, or reusable Guard credential.

Therefore:

- do not call a cloud API directly from the App runtime
- do not use `fetch("http://localhost:...")` to reach Core or Guard
- do not read a Host `$HOME`, calendar database, browser profile, or credential file
- do not ask the user to paste a bearer token into App source
- use a Connector to capture external data as Timeline events, then let the App query it locally
- use `@lamarck/system` for every supported data operation

App-private local communication may be used between declared App workloads, but it must not become a path around System authority or a durable store.

## UI behavior

The UI command must bind the exact port in `manifest.runtime.ui.port` and stay alive. Use a strict port setting so a collision fails visibly instead of moving to a different port.

Lamarck owns the physical viewer origin and may rotate it across launches. Do not make the origin part of data identity or authorization. Design the UI to recover from reloads by querying Lamarck again.

The SDK host is injected only when the UI is launched by Lamarck. A normal browser preview can validate layout but may return:

```text
Lamarck Host did not inject the System SDK channel
```

Handle that error as a clear empty/error state during development. Verify the real data path inside Lamarck before declaring the App complete.

## Common failures

| Symptom | Check |
| --- | --- |
| App is absent from the registry | Folder/ID match, strict manifest fields, valid JSON, at least one workload |
| Build is rejected | Lockfile version, integrity entries, dependency URLs, install scripts, package compatibility |
| UI never becomes ready | Command exists, process stays alive, exact host/port binding, no silent port fallback |
| SDK says no Host channel | App was opened outside Lamarck or imported the wrong package/build target |
| Query is denied | Statement is not one relational read statement or touches internal state |
| Mutation is denied | Table is not an existing granted Table, or SQL contains DDL/multiple statements |
| File write is denied | Path is outside `apps/<app-id>/` and lacks an exact/prefix File grant |
| Data disappears after restart | It was stored in a disposable runtime location instead of the Timeline, Files, or Tables |
| External request fails | Runtime egress is intentionally unavailable; capture through a Connector |

Fix the declared App contract. Do not weaken isolation, inject a raw Host path, or add an undisclosed network side channel to make a demo pass.

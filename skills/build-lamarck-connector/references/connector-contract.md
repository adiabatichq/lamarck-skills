# Connector Contract

Contract baseline: Connector Manifest V1, event catalog V1, and Source identity V1.

## Package shape

```text
connectors/<connector-id>/
├── connector.yaml       # connector.yml or connector.json also allowed
├── events.json
├── index.mjs
├── package.json         # only when dependencies or scripts are needed
└── package-lock.json    # keep when npm dependencies exist
```

The manifest filename, entry, and event catalog must be regular files reached through package-relative, link-free paths. The manifest ID must match the folder name. Keep all authority files inside the package root.

Local IDs may be unscoped or dotted lowercase alphanumeric/hyphen segments. Marketplace publication requires exactly `namespace.name`; do not rename a local package merely to imply Marketplace origin.

## Manifest V1

```yaml
manifestVersion: 1
id: example-calendar
name: Example Calendar
description: Captures events visible to one connected calendar account.
eventCatalog: ./events.json
entry: ./index.mjs
runtime:
  mode: poll
  defaultSchedule: "*/15 * * * *"
source:
  identity: connector
platforms:
  darwin: {}
  linux: {}
  windows: {}
auth:
  type: apiKey
  label: Example API token
config:
  lookback-days:
    type: number
    label: Lookback days
    default: 7
```

Manifest parsing is fail-closed. Allowed root fields are:

- `manifestVersion`, `id`, `name`, `description`
- `eventCatalog`, `entry`
- `runtime`, `source`
- optional `platforms`, `auth`, `config`, `configPanels`

Unknown fields in fixed-shape objects are rejected. `name` and `description` must be non-empty trimmed text. `manifestVersion` is exactly `1`; it is the contract version, not a package release.

### Runtime

```yaml
runtime:
  mode: watch | poll | manual
  defaultSchedule: "0 */6 * * *"
```

`defaultSchedule` is valid only for `poll`. It initializes a new Source schedule and is not mutable runtime state.

- `watch`: the connector holds a long-lived outbound loop/connection until aborted.
- `poll`: the runtime invokes one scheduled synchronization pass that returns.
- `manual`: runs only after an explicit trigger; V1 supplies no per-run input.

A backfill option on a live poll/watch source does not make the package `manual`; it remains part of the Source's config and checkpoint behavior.

### Source identity

`source.identity` is required and has no default:

- `single`: the package admits one logical Source in the system.
- `device`: Core derives the current device identity; the connector does not invent it.
- `connector`: connector code resolves a stable account/resource key with `resolveSourceIdentity`.

The resolved key distinguishes provenance and Timeline event deduplication scope. Use a provider-native immutable account/resource ID, not display name or email when a stable ID exists. Never write source or source key into emitted events; Lamarck binds it.

### Platforms and requirements

Each key declares an alternative supported target:

```yaml
platforms:
  darwin:
    requirements:
      - macos-accessibility
  linux: {}
```

Allowed platform keys are `darwin`, `linux`, `windows`, `ios`, `android`, and `cloud`. Only the active platform's requirements apply. Every named requirement needs a matching exported handler. Use requirements for real readiness gates such as OS permission, not ordinary error messages.

### Auth

Supported declarations:

```yaml
auth: { type: none }
```

```yaml
auth:
  type: apiKey
  label: Personal access token
```

```yaml
auth:
  type: oauth2-public
  authorizationEndpoint: https://provider.example/authorize
  tokenEndpoint: https://provider.example/token
  clientId: public-client-id
  scope:
    - read:data
```

```yaml
auth:
  type: managedProvider
  providerId: provider-id
```

Direct OAuth uses a public client and PKCE. Confidential/provider-specific OAuth belongs behind a Lamarck managed provider, not in a local manifest. Connector code receives an auth capability; it must not read the secret store.

### Config

Config fields are keyed user-facing values of type `string`, `number`, or `boolean`:

```yaml
config:
  region:
    type: string
    label: Region
    default: TW
    options:
      TW: Taiwan
      US: United States
  include-raw:
    type: boolean
    label: Include raw provider fields
    default: false
    required: false
```

`required` defaults to true. A required field with a valid default is ready without an override; one without a default blocks Source setup. User values are Source config overrides. Do not put hidden tuning constants, credentials, tokens, cursors, pause state, or checkpoints in the manifest.

Use `configPanels` only for genuinely complex configuration that primitive fields cannot express. Each panel declares `label` and optional `description`; the entry module must provide `configUi`.

## Event catalog V1

```json
{
  "catalogVersion": 1,
  "eventTypes": {
    "calendar.event": {
      "description": "A calendar event visible to the connected account.",
      "payloadSchema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "title", "startsAt"],
        "properties": {
          "id": { "type": "string", "description": "Provider-native stable event ID." },
          "title": { "type": "string" },
          "startsAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}
```

The catalog root contains exactly `catalogVersion` and `eventTypes`. It requires:

- literal `catalogVersion: 1`;
- at least one event type;
- event keys matching `^[a-z0-9][a-z0-9._-]*$`;
- exactly `description` and `payloadSchema` per type;
- a non-empty natural-language description;
- a JSON Schema object or boolean schema.

Declare stable semantics consumers need: identifiers, units, enums, time meaning, optionality, and content-reference behavior. Do not claim guarantees the Connector cannot enforce. Provider-native opaque sections may remain open when appropriate.

The catalog is declared output, not observed data. It contains no event instances, Source identity, credentials, schedules, or checkpoints.

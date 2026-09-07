# Lamarck Skills

Agent Skills for using and managing [Lamarck](https://github.com/adiabatichq/lamarck).

Skills teach an agent Lamarck's public contracts and supported workflows. They do not add permissions, write agent-specific files into a Lamarck Workspace, approve executable code, or widen the authority exposed by Lamarck.

## Install

Install all six skills for the current user with the [skills CLI](https://github.com/vercel-labs/skills), then select your agent:

```sh
npx skills add adiabatichq/lamarck-skills --global --skill '*'
```

Alternatively, use a GitHub CLI version that supports [`gh skill install`](https://cli.github.com/manual/gh_skill_install):

```sh
gh skill install adiabatichq/lamarck-skills --all --scope user
```

Choose your agent when prompted, or add `--agent codex`, `--agent claude-code`, or another supported agent. If your GitHub CLI does not recognize `skill`, use the skills CLI above.

Lamarck Desktop must be running with the intended Workspace selected when using these skills.

## Skill model

The product has two top-level intentions and six directly discoverable Skill packages:

```text
Lamarck Skills
├── Use System
│   └── use-lamarck
└── Manage System
    ├── manage-lamarck-system
    ├── build-lamarck-app
    ├── build-lamarck-connector
    ├── review-lamarck-app
    └── review-lamarck-connector
```

### `use-lamarck`

Use current Sources, Apps, Files, and Tables to answer questions, analyze personal data, or produce Workspace Files without changing the system's capabilities.

> Use `use-lamarck` to summarize my last seven days of calendar and activity data and save the review as a Workspace File.

### `manage-lamarck-system`

Inspect and change the current System Shape through the public CLI: Source operation, Connector lifecycle, App lifecycle, Files, Tables, and schema-change requests.

> Use `manage-lamarck-system` to diagnose why my Oura Source is not updating and run one safe retry if it is ready.

### `build-lamarck-app`

Create, modify, and debug Apps against App Manifest V1, `@lamarck/system`, Timeline, Files, Tables, App Capsule, and the public App lifecycle.

> Use `build-lamarck-app` to build a weekly recovery review in the Lamarck Workspace I have selected.

### `build-lamarck-connector`

Create, modify, and debug Connector packages that capture external or local-system data as Timeline events with explicit Source identity and event contracts.

> Use `build-lamarck-connector` to build a poll Connector for this provider API.

### `review-lamarck-app`

Review an App's contract compliance, permissions, data handling, Capsule compatibility, and release quality without modifying it.

> Use `review-lamarck-app` to review this App and report findings before I share it.

### `review-lamarck-connector`

Audit the exact Connector package bytes for trusted-code risk, credentials, network behavior, event semantics, reliability, and publication quality.

> Use `review-lamarck-connector` to audit this custom Connector before I decide whether to approve its hash.

## Status

Pre-release. The skills track Lamarck's public CLI protocol V1, App Manifest V1, Connector Manifest V1, System SDK protocol V1, and current Timeline, Files, and Tables contracts.

See the [Interfaces documentation](https://lamarck.ai/docs/modules/interfaces/) for how Skills relate to the Shell, `@lamarck/system`, and the `lamarck` CLI.

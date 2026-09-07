---
name: review-lamarck-connector
description: Review a Lamarck Connector package for trust, credential and network behavior, Source identity, event semantics, privacy, runtime reliability, and release quality. Use when the user explicitly asks to audit a custom, modified, or publishable Connector before trust or release. Do not use for routine Connector installation or Source operation.
---

# Review a Lamarck Connector

Assess whether a Connector package is safe enough to consider for human trust and whether its declared Source/event contracts match its code. A review never approves, installs, updates, removes, or runs the Connector unless the user separately requests that action.

Approved Connectors are trusted local Node code with ambient filesystem and network access. Treat static code and dependency review as the first line of evidence, not as ordinary App sandbox review.

## Establish the Exact Artifact

Identify the exact package directory or release artifact and its expected identity. For an installed Connector, inspect public state without executing it:

```sh
lamarck connector inspect <connector-id> --json
```

Record its trust classification, package hash, release ID, update status, event catalog, and attached Sources. Make clear whether source code under review is the exact bytes represented by that hash.

Read [Connector review rubric](references/connector-review-rubric.md) before assessing code execution, credentials, event materialization, dependencies, or trust.

## Inspect Before Executing

1. Read the manifest, event catalog, package metadata/lockfiles, entry module, adapters, configuration UI, requirement handlers, and bundled executables.
2. Inspect lifecycle/install scripts, dynamic imports, child processes, downloads, filesystem traversal, and network destinations before running any package command.
3. Trace credentials from the declared auth handle to every destination and log/error path.
4. Trace representative provider input through normalization, content storage, Timeline event writes, and checkpoint advancement.
5. Compare every emitted event type with the event catalog and every declared requirement/config field with reachable implementation.

Do not execute untrusted entrypoints, tests, install scripts, or package lifecycle hooks on the Host merely to increase confidence. Dynamic testing requires an explicitly authorized, appropriately isolated environment with no real credentials or personal Workspace data.

## Report Findings and Trust Limits

Report actionable findings first in descending severity:

- `P0`: direct credential theft, arbitrary code retrieval/execution, destructive broad Host behavior, or equivalent immediate compromise;
- `P1`: credible data exfiltration, unsafe trust/update path, Source identity corruption, or systematic private-data leakage;
- `P2`: event/checkpoint correctness, cancellation, overcollection, manifest/catalog drift, or dependency risk that materially harms operation;
- `P3`: bounded quality/reviewability issue with limited impact.

For every finding cite the exact file and tight line range, reachable behavior, impact, and smallest remediation. Separate verified behavior from uncertainty caused by missing artifacts or unexecuted tests.

Finish with:

- reviewed artifact/hash identity;
- untested or unavailable evidence;
- overall disposition (`block`, `needs changes`, or `no blocking finding observed`);
- the explicit reminder that only the human Shell can approve the exact package hash.

A review does not certify future versions. Any package-byte change invalidates the reviewed hash and requires another review and human approval.

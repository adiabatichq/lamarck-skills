---
name: review-lamarck-app
description: Review an existing Lamarck Personal System App for contract compliance, permission scope, data handling, Capsule compatibility, lifecycle safety, and release quality. Use when the user explicitly asks to audit, review, or assess an App package. Do not use as the default workflow for ordinary App authoring or fixes.
---

# Review a Lamarck App

Assess whether an existing App is correct, appropriately scoped, and credible inside Lamarck's runtime and data contracts. A review is read-only unless the user separately asks for fixes.

## Establish the Review Target

When the App is registered, start with:

```sh
lamarck app inspect <app-id> --json
lamarck app versions <app-id> --json
```

Use the inspected `path` as the package root. If the App is not registered, review only an exact package path supplied or confirmed by the user. Preserve unrecorded changes and distinguish the working package from the last saved version.

Read [App review rubric](references/app-review-rubric.md) before assessing manifest authority, SDK/data behavior, Capsule assumptions, dependencies, or Marketplace readiness.

## Review Evidence, Not Intentions

1. Inspect `manifest.json`, `package.json`, the lockfile, declared workload entrypoints, and relevant source code.
2. Compare declared workloads and write grants with operations the code actually performs.
3. Trace at least one important data path from query/input through transformation to display or durable output.
4. Inspect failure, loading, empty, and restart behavior where relevant.
5. Run existing static checks, tests, or builds only when they can be executed safely with the current trusted dependencies. Do not install packages, rewrite a lockfile, or mutate the App merely to complete a review unless the user authorizes it.
6. If a real Capsule launch or data path was not exercised, mark that as unverified rather than inferring success from a browser build.

Do not save, restore, refresh, archive, or change permissions during review. Do not invoke private Core/Guard interfaces to gain more evidence.

## Report Findings First

Report actionable findings in descending severity. For each finding include:

- severity (`P0` critical, `P1` high, `P2` medium, `P3` low);
- exact file and tight line range when available;
- the concrete failure or risk;
- why it matters under Lamarck's contract;
- the smallest credible remediation.

Avoid style-only findings unless they materially affect correctness, maintainability, accessibility, or reviewability. Do not report a hypothetical issue without showing the reachable code path or missing invariant.

After findings, summarize untested areas and the overall disposition. If there are no findings, say so directly and still state what could not be verified.

Human installation, publication, and permission decisions remain outside the review. A clean report is evidence, not approval.

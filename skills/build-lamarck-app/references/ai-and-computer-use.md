# AI and Computer Use

Use the same `@lamarck/system` API from browser UI, Service, and Job workloads. Model calls use the official Vercel `ai` package; the verified pairing is `ai@7.0.105` with `@lamarck/system@0.1.6` and provider V4. Keep dependencies in the App's package and npm lockfile. These APIs use the existing Manifest V1 and System protocol V1.

## Contents

- Select a model and access source
- Model calls, streaming, and cancellation
- App tools
- Computer Use

## Select a model and access source

Every call selects both a `model` (`provider:model`) and an `accessSource`. Use either:

- A reference declared in `manifest.ai.accessSources`, such as `summary`, bound by the user in Console. See [AI access-source declarations](app-contract.md#optional-ai-access-source-declarations).
- An exact configured source ID returned by `system.ai.listOptions()` and chosen in the App's settings.

`listOptions()` returns `{ models, accessSources }`. Read a source's `status`, `discovery`, and per-model `support` before presenting selectable combinations. Discovery lists configured IDs, not manifest-reference aliases or unbound references. Unknown/failed discovery is not an empty supported catalog. Provider, model prefix, and source provider must agree; a ready source does not guarantee support for every model or operation. Subscription sources do not support embeddings, and local sources currently advertise text and streaming.

Console owns API keys, subscription sign-in, local endpoints, and source permissions. An unbound declared reference fails with `source_configuration_required`; show the setup needed in Console. Do not collect credentials in App source, call provider URLs directly, or silently substitute a source, model, or billing method. Missing AI setup does not block App installation or startup; Services and Jobs must handle the invocation error too.

## Model calls, streaming, and cancellation

`languageModel(selection)` supplies a model for `generateText` or `streamText`; `embeddingModel(selection)` supplies one for `embed`. Pass content needed by the user's requested feature through these configured SDK capabilities. Runtime egress remains unavailable.

This streaming example assumes the manifest declares `summary`, the user has bound it in Console, and the App supplies `settings.model`, `noteText`, and `appendText`:

```ts
import { streamText } from 'ai';
import { system } from '@lamarck/system';

const selection = { model: settings.model, accessSource: 'summary' };
const controller = new AbortController();
// Wire controller.abort() to the App's cancel action or workload shutdown.
for await (const part of streamText({
  model: system.ai.languageModel(selection),
  prompt: `Summarize this note:\n${noteText}`,
  abortSignal: controller.signal,
}).fullStream) {
  if (part.type === 'text-delta') appendText(part.text);
  if (part.type === 'error') throw part.error;
  if (part.type === 'abort') {
    throw controller.signal.reason ?? new DOMException('Canceled', 'AbortError');
  }
}
```

Use `fullStream` when the App needs to distinguish text, errors, and cancellation; `textStream` exposes only text chunks. Surface errors and cancellation through the App's UI or workload error handler. A failed or interrupted response is not a completed answer. Use `AbortSignal` to cancel active work; ending a UI interaction or workload should not leave its model call running. Remote URL file inputs are rejected; supply bounded bytes when a supported model needs file/image content.

AI calls do not automatically record prompts, answers, or tools in Timeline. Use the App's actual submission and delivery boundaries described in [Write events deliberately](system-data.md#write-events-deliberately).

## App tools

API sources support Vercel's ordinary App-side tool loop. Subscription sources need `system.ai.withTools()` to relay native tool callbacks to the originating App. The same helper works for API sources.

Define ordinary function tools with `inputSchema` and `execute`. This example uses the configured `selection` above, with an `eventId` chosen by the App and a fresh cancellation controller for this request:

```ts
import { generateText, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import { system } from '@lamarck/system';

const controller = new AbortController();
const tools = {
  readEvent: tool({
    description: 'Read one Timeline event by its exact ID',
    inputSchema: z.object({ id: z.string().min(1) }),
    execute: async ({ id }) => {
      const { rows } = await system.query(
        'SELECT id, type, payload FROM events WHERE id = ? LIMIT 1',
        [id],
      );
      return rows[0] ?? null;
    },
  }),
};

const answer = await system.ai.withTools(
  { ...selection, tools },
  ({ model, tools }) => generateText({
    model,
    tools,
    prompt: `Read event ${eventId} and summarize it.`,
    stopWhen: stepCountIs(3),
    abortSignal: controller.signal,
  }),
);
```

Tool implementations execute inside the App with its normal System grants. Use closures for App context; subscription callbacks supply the tool-call ID and abort signal but not Vercel's original message/context objects. The helper supports optional `toModelOutput`, including inline image results with explicit media types. Approval-requiring tools, provider tools, streaming tool results, and output schemas are unsupported by this helper.

When streaming, consume the entire stream inside the `withTools()` callback before returning. Scope exit cancels outstanding work and closes the scoped model; do not retain it for later calls. Subscription results are marked provider-executed so the App's tool is not executed a second time by Vercel. An `execute` exception becomes a tool error for the model; transport or conversion failures end the invocation. Do not blindly replay tools with side effects after a failure.

## Computer Use

On macOS with Apple Silicon, `system.computer.withTools()` supplies the bundled driver's tools and instructions. It is independent of the selected AI provider. Choose a source/model supporting tools and screenshot inputs, preserve the returned instructions in the model call, and keep computer actions sequential.

This example uses the configured `selection` above and a fresh cancellation controller:

```ts
import { generateText, stepCountIs } from 'ai';
import { system } from '@lamarck/system';

const controller = new AbortController();
const result = await system.computer.withTools(
  ({ tools, instructions }) => system.ai.withTools(
    { ...selection, tools },
    ({ model, tools }) => generateText({
      model,
      tools,
      system: `${instructions}\nCall only one desktop tool at a time and inspect its result before the next action.`,
      prompt: 'Open Calculator and compute 123 × 45. Verify the displayed answer.',
      stopWhen: stepCountIs(12),
      abortSignal: controller.signal,
      maxRetries: 0,
    }),
  ),
  { abortSignal: controller.signal },
);
```

Use Computer Use only for functionality the user requested. Lamarck asks for control permission for each scope; macOS also requires Accessibility and Screen Recording permission for Lamarck. Handle denied permission or unavailable support explicitly. The user does not install a driver or configure an MCP server, and the App does not add manifest permission fields for this capability.

Only one Computer Use scope can be active per desktop. Consume all work and streams inside both callbacks, passing the same abort signal to the computer scope and model call. Scope exit, cancellation, App disconnect, or Desktop shutdown ends control. Surface action errors without automatically retrying them; the example disables model-call retries for this reason.

Use the supplied tools for app/window inspection, screenshots, and supported input actions. Arbitrary MCP servers, browser DOM integration, clipboard tools, recording, and driver installation/configuration are not exposed. This capability does not grant general App network access or direct Host filesystem access, and it does not automatically record Timeline events.

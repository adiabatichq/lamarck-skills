import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execFileAsync = promisify(execFile);
const validator = join(dirname(fileURLToPath(import.meta.url)), "validate-app.mjs");

test("accepts a dotted local App ID and strict Marketplace provenance", async (t) => {
  const appDir = await writeFixture(t, "lamarck.my-notes", {
    createdFrom: { packageId: "lamarck.notes", releaseId: "rel_01" },
  });
  const { stdout } = await execFileAsync(process.execPath, [validator, appDir]);
  assert.match(stdout, /Valid Lamarck App contract: lamarck\.my-notes/);
});

for (const id of [
  ".lamarck-notes",
  "lamarck-notes.",
  "lamarck..notes",
  "lamarck.Notes",
  "lamarck_notes",
]) {
  test(`rejects malformed dotted package ID ${id}`, async (t) => {
    const appDir = await writeFixture(t, "candidate", { id });
    await assert.rejects(
      execFileAsync(process.execPath, [validator, appDir]),
      (error) => error.code === 1 && /segments separated by dots/.test(error.stderr),
    );
  });
}

test("keeps workload entry IDs unscoped", async (t) => {
  const appDir = await writeFixture(t, "lamarck.sample", {
    runtime: { services: { "not.scoped": { command: ["node", "service.mjs"] } } },
  });
  await assert.rejects(
    execFileAsync(process.execPath, [validator, appDir]),
    (error) => error.code === 1 && /not\.scoped.*must match/.test(error.stderr),
  );
});

test("rejects malformed or extended createdFrom provenance", async (t) => {
  const appDir = await writeFixture(t, "sample", {
    createdFrom: {
      packageId: "unscoped",
      releaseId: " padded ",
      unexpected: true,
    },
  });
  await assert.rejects(
    execFileAsync(process.execPath, [validator, appDir]),
    (error) => error.code === 1
      && /unknown createdFrom field/.test(error.stderr)
      && /scoped namespace\.name/.test(error.stderr)
      && /non-empty, trimmed/.test(error.stderr),
  );
});

test("accepts real Workspace File grants and rejects retired docs grants", async (t) => {
  const accepted = await writeFixture(t, "file-writer", {
    permissions: { writes: { files: ["reviews/weekly.md", "exports/"], tables: [] } },
  });
  await assert.doesNotReject(execFileAsync(process.execPath, [validator, accepted]));

  const retired = await writeFixture(t, "docs-writer", {
    permissions: { writes: { docs: ["reviews/weekly"], tables: [] } },
  });
  await assert.rejects(
    execFileAsync(process.execPath, [validator, retired]),
    (error) => error.code === 1
      && /unknown permissions\.writes field "docs"/.test(error.stderr)
      && /permissions\.writes\.files must be an array/.test(error.stderr),
  );
});

async function writeFixture(t, directoryName, overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "lamarck-skill-validator-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const appDir = join(root, directoryName);
  await mkdir(appDir);
  const manifest = {
    manifestVersion: 1,
    id: directoryName,
    name: "Sample",
    description: "A validator fixture.",
    runtime: { ui: { command: ["npm", "run", "start"], port: 3000 } },
    permissions: { writes: { files: [], tables: [] } },
    ...overrides,
  };
  const packageJson = {
    name: `lamarck-app-${directoryName.replaceAll(".", "-")}`,
    private: true,
    type: "module",
    scripts: { start: "vite --host 127.0.0.1 --port 3000 --strictPort" },
  };
  await writeFile(join(appDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(appDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeFile(join(appDir, "package-lock.json"), `${JSON.stringify({
    name: packageJson.name,
    lockfileVersion: 3,
    packages: { "": { name: packageJson.name } },
  }, null, 2)}\n`);
  return appDir;
}

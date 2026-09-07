#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import process from "node:process";

const PACKAGE_ID = /^[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*$/;
const SCOPED_PACKAGE_ID = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/;
const ENTRY_ID = /^[a-z0-9][a-z0-9-]*$/;
const ROOT_FIELDS = new Set([
  "manifestVersion",
  "id",
  "name",
  "description",
  "createdFrom",
  "runtime",
  "permissions",
]);
const RUNTIME_FIELDS = new Set(["ui", "services", "jobs"]);
const UI_FIELDS = new Set(["command", "port"]);
const WORKLOAD_FIELDS = new Set(["command"]);
const PERMISSION_FIELDS = new Set(["writes"]);
const WRITE_PERMISSION_FIELDS = new Set(["files", "tables"]);
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;
const PORTABLE_PATH_CHARS = /[<>:"|?*]/;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

const appDir = process.argv[2] ? resolve(process.argv[2]) : undefined;
if (!appDir) {
  console.error("Usage: node validate-app.mjs <path-to-app-directory>");
  process.exit(2);
}

const errors = [];
const warnings = [];

let manifest;
let packageJson;
let packageLock;

try {
  manifest = JSON.parse(await readFile(resolve(appDir, "manifest.json"), "utf8"));
} catch (error) {
  errors.push(`manifest.json: ${messageOf(error)}`);
}

try {
  packageJson = JSON.parse(await readFile(resolve(appDir, "package.json"), "utf8"));
} catch (error) {
  errors.push(`package.json: ${messageOf(error)}`);
}

try {
  const lockPath = resolve(appDir, "package-lock.json");
  await access(lockPath);
  packageLock = JSON.parse(await readFile(lockPath, "utf8"));
} catch (error) {
  errors.push(`package-lock.json: ${messageOf(error)}`);
}

if (manifest !== undefined) validateManifest(manifest);
if (packageJson !== undefined) validatePackage(packageJson);
if (packageLock !== undefined) validatePackageLock(packageLock);

for (const warning of warnings) console.warn(`WARN  ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);

if (errors.length > 0) {
  console.error(`\nInvalid Lamarck App: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}

console.log(`Valid Lamarck App contract: ${manifest.id}`);
if (warnings.length > 0) console.log(`${warnings.length} warning(s) should be reviewed`);

function validateManifest(value) {
  if (!isObject(value)) {
    errors.push("manifest must be an object");
    return;
  }

  unknownFields(value, ROOT_FIELDS, "manifest");

  if (value.manifestVersion !== 1) errors.push("manifestVersion must be 1");
  if (typeof value.id !== "string" || !PACKAGE_ID.test(value.id)) {
    errors.push("id must contain lowercase alphanumeric/hyphen segments separated by dots");
  } else if (value.id !== basename(appDir)) {
    errors.push(`manifest id ${JSON.stringify(value.id)} does not match directory ${JSON.stringify(basename(appDir))}`);
  }
  if (typeof value.name !== "string" || value.name.length === 0 || value.name.trim() !== value.name) {
    errors.push("name must be a non-empty, trimmed string");
  }
  if (
    typeof value.description !== "string"
    || value.description.length === 0
    || value.description.trim() !== value.description
  ) {
    errors.push("description must be a non-empty, trimmed string");
  }

  if (Object.hasOwn(value, "createdFrom")) {
    if (!isObject(value.createdFrom)) {
      errors.push("createdFrom must be an object");
    } else {
      unknownFields(value.createdFrom, new Set(["packageId", "releaseId"]), "createdFrom");
      if (
        typeof value.createdFrom.packageId !== "string"
        || !SCOPED_PACKAGE_ID.test(value.createdFrom.packageId)
      ) {
        errors.push("createdFrom.packageId must be a scoped namespace.name package ID");
      }
      if (
        typeof value.createdFrom.releaseId !== "string"
        || value.createdFrom.releaseId.length === 0
        || value.createdFrom.releaseId.trim() !== value.createdFrom.releaseId
      ) {
        errors.push("createdFrom.releaseId must be a non-empty, trimmed string");
      }
    }
  }

  if (!isObject(value.runtime)) {
    errors.push("runtime must be an object");
  } else {
    unknownFields(value.runtime, RUNTIME_FIELDS, "runtime");
    let workloadCount = 0;

    if (Object.hasOwn(value.runtime, "ui")) {
      workloadCount += 1;
      validateUi(value.runtime.ui);
    }
    if (Object.hasOwn(value.runtime, "services")) {
      workloadCount += validateNamedWorkloads(value.runtime.services, "runtime.services");
    }
    if (Object.hasOwn(value.runtime, "jobs")) {
      workloadCount += validateNamedWorkloads(value.runtime.jobs, "runtime.jobs");
    }
    if (workloadCount === 0) errors.push("runtime must declare at least one UI, service, or job");
  }

  if (!isObject(value.permissions)) {
    errors.push("permissions must be an object");
  } else {
    unknownFields(value.permissions, PERMISSION_FIELDS, "permissions");
    if (!isObject(value.permissions.writes)) {
      errors.push("permissions.writes must be an object");
    } else {
      unknownFields(value.permissions.writes, WRITE_PERMISSION_FIELDS, "permissions.writes");
      validateFileGrants(value.permissions.writes.files);
      validateTableGrants(value.permissions.writes.tables);
    }
  }
}

function validateUi(value) {
  if (!isObject(value)) {
    errors.push("runtime.ui must be an object");
    return;
  }
  unknownFields(value, UI_FIELDS, "runtime.ui");
  validateCommand(value.command, "runtime.ui.command");
  if (!Number.isInteger(value.port) || value.port < 1 || value.port > 65_535) {
    errors.push("runtime.ui.port must be an integer from 1 through 65535");
  }
}

function validateNamedWorkloads(value, path) {
  if (!isObject(value) || Object.keys(value).length === 0) {
    errors.push(`${path} must be a non-empty object`);
    return 0;
  }

  for (const [id, workload] of Object.entries(value)) {
    if (!ENTRY_ID.test(id)) errors.push(`${path} entry ${JSON.stringify(id)} must match ^[a-z0-9][a-z0-9-]*$`);
    if (!isObject(workload)) {
      errors.push(`${path}.${id} must be an object`);
      continue;
    }
    unknownFields(workload, WORKLOAD_FIELDS, `${path}.${id}`);
    validateCommand(workload.command, `${path}.${id}.command`);
  }
  return Object.keys(value).length;
}

function validateCommand(value, path) {
  if (!Array.isArray(value) || value.length === 0 || value.some((part) => typeof part !== "string")) {
    errors.push(`${path} must be a non-empty array of strings`);
    return;
  }
  if (value[0].length === 0) errors.push(`${path}[0] must be non-empty`);

  if (value[0] === "npm" && value[1] === "run" && typeof value[2] === "string") {
    const scripts = isObject(packageJson?.scripts) ? packageJson.scripts : {};
    if (typeof scripts[value[2]] !== "string") {
      errors.push(`${path} names missing package.json script ${JSON.stringify(value[2])}`);
    }
  }
}

function validateFileGrants(value) {
  if (!Array.isArray(value)) {
    errors.push("permissions.writes.files must be an array");
    return;
  }
  for (const grant of value) {
    if (typeof grant !== "string" || grant.length === 0) {
      errors.push(`invalid Workspace File grant ${JSON.stringify(grant)}`);
      continue;
    }
    const body = grant.endsWith("/") ? grant.slice(0, -1) : grant;
    if (!isValidFilePath(body)) errors.push(`invalid Workspace File grant ${JSON.stringify(grant)}`);
  }
}

function validateTableGrants(value) {
  if (!Array.isArray(value)) {
    errors.push("permissions.writes.tables must be an array");
    return;
  }
  for (const table of value) {
    if (typeof table !== "string" || table.length === 0 || table === "*" || table.trim() !== table) {
      errors.push(`invalid Table grant ${JSON.stringify(table)}`);
    }
    if (table === "events") {
      warnings.push(`${JSON.stringify(table)} is not a mutable user Table; use the dedicated System helper`);
    }
  }
}

function validatePackage(value) {
  if (!isObject(value)) {
    errors.push("package.json must contain an object");
    return;
  }
  if (value.private !== true) warnings.push("package.json should set private to true");
  if (value.type !== "module") warnings.push('package.json should set type to "module"');
}

function validatePackageLock(value) {
  if (!isObject(value)) {
    errors.push("package-lock.json must contain an object");
    return;
  }
  if (value.lockfileVersion !== 2 && value.lockfileVersion !== 3) {
    errors.push("package-lock.json lockfileVersion must be 2 or 3");
  }
  if (isObject(packageJson) && typeof packageJson.name === "string" && value.name !== packageJson.name) {
    warnings.push("package-lock.json name does not match package.json name");
  }
}

function isValidFilePath(path) {
  if (!path || path.trim() !== path || path.startsWith("/") || path.includes("\\") || CONTROL_CHARS.test(path)) {
    return false;
  }
  if (Buffer.byteLength(path, "utf8") > 768) return false;
  const segments = path.split("/");
  if (segments[0]?.toLocaleLowerCase("en-US") === ".obsidian") return false;
  if (segments.some((part) => part.toLocaleLowerCase("en-US") === ".ds_store")) return false;
  return segments.every((part) =>
    part !== ""
    && part !== "."
    && part !== ".."
    && !part.endsWith(" ")
    && !part.endsWith(".")
    && !PORTABLE_PATH_CHARS.test(part)
    && !WINDOWS_RESERVED_NAME.test(part)
    && Buffer.byteLength(part, "utf8") <= 240
  );
}

function unknownFields(value, allowed, path) {
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) errors.push(`unknown ${path} field ${JSON.stringify(field)}`);
  }
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("window close interception can destroy the window after confirmation", async () => {
  const capabilityUrl = new URL(
    "../src-tauri/capabilities/default.json",
    import.meta.url
  );
  const capability = JSON.parse(await readFile(capabilityUrl, "utf8"));

  assert.ok(capability.permissions.includes("core:window:allow-close"));
  assert.ok(capability.permissions.includes("core:window:allow-destroy"));
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildFullScript } from "../src/ahk/generator.js";
import { createScriptWorkspace } from "../src/ui/script-workspace.js";

function createWorkspaceHarness({ openScript = "" } = {}) {
  const listeners = new Map();
  const preview = { value: "" };
  const status = { textContent: "", className: "status-msg" };
  const buttons = Object.fromEntries(
    ["#copy-btn", "#save-btn", "#open-file-btn"].map((selector) => [
      selector,
      {
        addEventListener: (type, handler) =>
          listeners.set(`${selector}:${type}`, handler),
      },
    ])
  );
  const entries = { hotkeys: [], hotstrings: [], remaps: [] };
  const writes = [];
  let workspace;
  const documentLike = {
    querySelector(selector) {
      if (selector === "#script-preview") return preview;
      if (selector === "#action-status") return status;
      return buttons[selector];
    },
  };

  workspace = createScriptWorkspace({
    documentLike,
    version: "v1.0.0-test",
    entries,
    t: (key) => key,
    clipboard: { writeText: async () => {} },
    fileSystem: {
      writeTextFile: async (path, content) => writes.push({ path, content }),
      readTextFile: async () => openScript,
    },
    dialogs: {
      save: async () => "saved.ahk",
      open: async () => "opened.ahk",
    },
    onEntriesChanged: () => workspace.render(),
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {},
  });
  workspace.init();

  return {
    entries,
    preview,
    workspace,
    writes,
    click: (selector) => listeners.get(`${selector}:click`)(),
  };
}

test("workspace becomes dirty only when generated script differs from baseline", () => {
  const harness = createWorkspaceHarness();
  harness.workspace.render();
  assert.equal(harness.workspace.hasUnsavedChanges(), false);

  harness.entries.hotkeys.push({
    prefix: "^a",
    actionType: "send",
    actionValue: "test",
    sendMode: "Input",
    comment: "",
  });
  harness.workspace.render();
  assert.equal(harness.workspace.hasUnsavedChanges(), true);

  harness.entries.hotkeys.pop();
  harness.workspace.render();
  assert.equal(harness.workspace.hasUnsavedChanges(), false);
});

test("saving establishes a new clean baseline", async () => {
  const harness = createWorkspaceHarness();
  harness.workspace.render();
  harness.entries.remaps.push({
    fromPrefix: "CapsLock",
    toPrefix: "Escape",
    comment: "",
  });
  harness.workspace.render();

  await harness.click("#save-btn");

  assert.equal(harness.workspace.hasUnsavedChanges(), false);
  assert.equal(harness.writes.length, 1);
  assert.ok(harness.writes[0].content.startsWith("\uFEFF"));
});

test("opening a script into an empty clean workspace adopts it as baseline", async () => {
  const openScript = buildFullScript({
    version: "v1.0.0-test",
    hotkeys: [
      {
        prefix: "^a",
        actionType: "send",
        actionValue: "test",
        sendMode: "Input",
        comment: "",
      },
    ],
  });
  const harness = createWorkspaceHarness({ openScript });
  harness.workspace.render();

  await harness.click("#open-file-btn");

  assert.equal(harness.entries.hotkeys.length, 1);
  assert.equal(harness.workspace.hasUnsavedChanges(), false);
});

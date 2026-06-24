import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTION_CONFIG,
  createHotkeyEntry,
  validateHotkeyEntry,
} from "../src/hotkeys/model.js";

test("hotkey entries preserve Send whitespace and normalize other actions", () => {
  assert.deepEqual(
    createHotkeyEntry({
      modifiers: new Set(["LCtrl"]),
      key: "j",
      actionType: "send",
      actionValue: "  text  ",
      useEventMode: true,
      comment: "  Test  ",
    }),
    {
      prefix: "^j",
      actionType: "send",
      actionValue: "  text  ",
      sendMode: "Event",
      comment: "Test",
    }
  );

  assert.equal(
    createHotkeyEntry({
      modifiers: new Set(),
      key: "F1",
      actionType: "run",
      actionValue: "  notepad.exe  ",
    }).actionValue,
    "notepad.exe"
  );
});

test("non-Send actions always use Input as their stored send mode", () => {
  assert.equal(
    createHotkeyEntry({
      modifiers: new Set(),
      key: "F1",
      actionType: "command",
      actionValue: "echo test",
      useEventMode: true,
    }).sendMode,
    "Input"
  );
});

test("hotkey validation requires a key and action value", () => {
  assert.deepEqual(
    validateHotkeyEntry(
      [],
      { prefix: "", actionValue: "value" },
      { selectedKey: null }
    ),
    { valid: false, errorKey: "error.noHotkeyKey" }
  );
  assert.deepEqual(
    validateHotkeyEntry(
      [],
      { prefix: "a", actionValue: "" },
      { selectedKey: "a" }
    ),
    { valid: false, errorKey: "error.emptyAction" }
  );
});

test("hotkey validation rejects duplicate prefixes except during their edit", () => {
  const entries = [{ prefix: "^j", actionValue: "first" }];
  const candidate = { prefix: "^j", actionValue: "second" };

  assert.deepEqual(
    validateHotkeyEntry(entries, candidate, { selectedKey: "j" }),
    {
      valid: false,
      errorKey: "error.duplicateHotkey",
      values: { prefix: "^j" },
    }
  );
  assert.deepEqual(
    validateHotkeyEntry(entries, candidate, {
      selectedKey: "j",
      editingIndex: 0,
    }),
    { valid: true }
  );
});

test("every supported action has translation metadata", () => {
  assert.deepEqual(Object.keys(ACTION_CONFIG), ["send", "run", "url", "command"]);
  for (const config of Object.values(ACTION_CONFIG)) {
    assert.ok(config.labelKey);
    assert.ok(config.placeholderKey);
    assert.ok(config.hintKey);
  }
});

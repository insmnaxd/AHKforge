import assert from "node:assert/strict";
import test from "node:test";

import {
  createHotstringEntry,
  getHotstringOptionTags,
  validateHotstringEntry,
} from "../src/hotstrings/model.js";

test("hotstring entries trim identifiers but preserve replacement whitespace", () => {
  assert.deepEqual(
    createHotstringEntry({
      trigger: "  btw  ",
      replacement: "  by the way  ",
      autoReplace: 1,
      caseSensitive: 0,
      insideWord: false,
      rawText: true,
      comment: "  Common phrase  ",
    }),
    {
      trigger: "btw",
      replacement: "  by the way  ",
      autoReplace: true,
      caseSensitive: false,
      insideWord: false,
      rawText: true,
      comment: "Common phrase",
    }
  );
});

test("hotstring validation reports missing and invalid fields", () => {
  assert.deepEqual(
    validateHotstringEntry([], createHotstringEntry({ trigger: "", replacement: "value" })),
    { valid: false, errorKey: "error.hotstringMissingTrigger" }
  );
  assert.deepEqual(
    validateHotstringEntry(
      [],
      createHotstringEntry({ trigger: "has space", replacement: "value" })
    ),
    { valid: false, errorKey: "error.hotstringTriggerSpaces" }
  );
  assert.deepEqual(
    validateHotstringEntry([], createHotstringEntry({ trigger: "ok", replacement: "" })),
    { valid: false, errorKey: "error.hotstringMissingReplacement" }
  );
});

test("hotstring validation ignores the currently edited duplicate", () => {
  const entries = [
    createHotstringEntry({
      trigger: "btw",
      replacement: "by the way",
      caseSensitive: false,
    }),
  ];

  assert.deepEqual(validateHotstringEntry(entries, entries[0], 0), { valid: true });
  assert.deepEqual(
    validateHotstringEntry(
      entries,
      createHotstringEntry({
        trigger: "BTW",
        replacement: "duplicate",
        caseSensitive: false,
      })
    ),
    {
      valid: false,
      errorKey: "error.duplicateHotstring",
      values: { trigger: "BTW" },
    }
  );
});

test("hotstring option tags follow AHK option order", () => {
  assert.deepEqual(
    getHotstringOptionTags({
      autoReplace: true,
      caseSensitive: true,
      insideWord: true,
      rawText: true,
    }),
    ["*", "C", "?", "R"]
  );
});

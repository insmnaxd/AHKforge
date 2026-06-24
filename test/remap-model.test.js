import assert from "node:assert/strict";
import test from "node:test";

import { createRemapEntry, validateRemapEntry } from "../src/remaps/model.js";

test("remap entries build prefixes and trim comments", () => {
  assert.deepEqual(
    createRemapEntry({
      fromModifiers: new Set(["LCtrl"]),
      fromKey: "a",
      toModifiers: new Set(["RShift"]),
      toKey: "b",
      distinguishSides: true,
      comment: "  Test remap  ",
    }),
    {
      fromPrefix: "<^a",
      toPrefix: ">+b",
      comment: "Test remap",
    }
  );
});

test("remap validation requires both keys", () => {
  const candidate = { fromPrefix: "", toPrefix: "", comment: "" };
  assert.deepEqual(
    validateRemapEntry([], candidate, { fromKey: null, toKey: "b" }),
    { valid: false, errorKey: "error.remapMissingFrom" }
  );
  assert.deepEqual(
    validateRemapEntry([], candidate, { fromKey: "a", toKey: null }),
    { valid: false, errorKey: "error.remapMissingTo" }
  );
});

test("remap validation rejects identical and duplicate sources", () => {
  assert.deepEqual(
    validateRemapEntry(
      [],
      { fromPrefix: "a", toPrefix: "a", comment: "" },
      { fromKey: "a", toKey: "a" }
    ),
    { valid: false, errorKey: "error.remapSame" }
  );

  assert.deepEqual(
    validateRemapEntry(
      [{ fromPrefix: "^a", toPrefix: "b", comment: "" }],
      { fromPrefix: "^a", toPrefix: "c", comment: "" },
      { fromKey: "a", toKey: "c" }
    ),
    {
      valid: false,
      errorKey: "error.duplicateRemap",
      values: { prefix: "^a" },
    }
  );
});

test("remap validation ignores the currently edited source", () => {
  assert.deepEqual(
    validateRemapEntry(
      [{ fromPrefix: "^a", toPrefix: "b", comment: "" }],
      { fromPrefix: "^a", toPrefix: "c", comment: "" },
      { fromKey: "a", toKey: "c", editingIndex: 0 }
    ),
    { valid: true }
  );
});

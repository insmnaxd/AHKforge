import assert from "node:assert/strict";
import test from "node:test";

import { removeEntryByReference } from "../src/ui/entries.js";

test("delayed removals delete the intended entries instead of stale indexes", () => {
  const first = { id: "first" };
  const second = { id: "second" };
  const third = { id: "third" };
  const entries = [first, second, third];

  assert.equal(removeEntryByReference(entries, second), true);
  assert.equal(removeEntryByReference(entries, third), true);
  assert.deepEqual(entries, [first]);
});

test("a repeated delayed callback cannot remove a different entry", () => {
  const first = { id: "first" };
  const removed = { id: "removed" };
  const entries = [first, removed];

  assert.equal(removeEntryByReference(entries, removed), true);
  assert.equal(removeEntryByReference(entries, removed), false);
  assert.deepEqual(entries, [first]);
});

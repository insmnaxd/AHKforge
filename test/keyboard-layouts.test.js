import assert from "node:assert/strict";
import test from "node:test";

import {
  applyKeyboardLayoutToButton,
  getKeyboardLayoutMap,
  getKeyboardLayoutPresentation,
  resolveKeyboardLayoutKey,
} from "../src/keyboard/layouts.js";

test("QWERTZ covers letters and the German punctuation keys", () => {
  const map = getKeyboardLayoutMap("qwertz");

  assert.equal(resolveKeyboardLayoutKey("y", map), "z");
  assert.deepEqual(getKeyboardLayoutPresentation("[", map), {
    key: "sc01A",
    label: "Ü",
  });
  assert.deepEqual(getKeyboardLayoutPresentation(";", map), {
    key: "sc027",
    label: "Ö",
  });
  assert.deepEqual(getKeyboardLayoutPresentation("/", map), {
    key: "sc035",
    label: "-",
  });
});

test("AZERTY covers number, letter, and punctuation rows", () => {
  const map = getKeyboardLayoutMap("azerty");

  assert.deepEqual(getKeyboardLayoutPresentation("1", map), {
    key: "sc002",
    label: "&",
  });
  assert.equal(resolveKeyboardLayoutKey("q", map), "a");
  assert.deepEqual(getKeyboardLayoutPresentation(";", map), {
    key: "m",
    label: "M",
  });
  assert.deepEqual(getKeyboardLayoutPresentation(".", map), {
    key: "sc034",
    label: ":",
  });
});

test("layout buttons return to their QWERTY key and label", () => {
  const button = {
    dataset: { key: "1" },
    textContent: "1",
  };

  assert.equal(
    applyKeyboardLayoutToButton(button, getKeyboardLayoutMap("azerty")),
    true
  );
  assert.deepEqual(button.dataset, { key: "sc002", baseKey: "1" });
  assert.equal(button.textContent, "&");

  applyKeyboardLayoutToButton(button, getKeyboardLayoutMap("qwerty"));
  assert.deepEqual(button.dataset, { key: "1", baseKey: "1" });
  assert.equal(button.textContent, "1");
});

test("layout application ignores non-layout keys such as mouse buttons", () => {
  const button = {
    dataset: { key: "LButton" },
    textContent: "Left",
  };

  assert.equal(
    applyKeyboardLayoutToButton(button, getKeyboardLayoutMap("azerty")),
    false
  );
  assert.deepEqual(button.dataset, { key: "LButton" });
  assert.equal(button.textContent, "Left");
});

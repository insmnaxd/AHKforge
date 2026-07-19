import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createAutoResizeTextarea } from "../src/ui/auto-resize-textarea.js";

function createTextarea(scrollHeight) {
  const listeners = new Map();
  return {
    scrollHeight,
    scrollTop: 0,
    style: {},
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
}

test("textarea grows with its content and stops at the configured maximum", () => {
  const textarea = createTextarea(96);
  const autoResize = createAutoResizeTextarea(textarea);

  autoResize.init();
  assert.equal(textarea.style.height, "96px");
  assert.equal(textarea.style.overflowY, "hidden");

  textarea.scrollHeight = 320;
  textarea.dispatch("input");
  assert.equal(textarea.style.height, "240px");
  assert.equal(textarea.style.overflowY, "auto");
});

test("textarea returns to its minimum height after content is cleared", () => {
  const textarea = createTextarea(180);
  const autoResize = createAutoResizeTextarea(textarea);

  autoResize.init();
  textarea.scrollHeight = 0;
  autoResize.resize();

  assert.equal(textarea.style.height, "40px");
  assert.equal(textarea.style.overflowY, "hidden");
});

test("textarea schedules animated height changes on the next frame", () => {
  const textarea = createTextarea(40);
  const frames = [];
  const autoResize = createAutoResizeTextarea(textarea, {
    requestAnimationFrameFn(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelAnimationFrameFn() {},
  });

  autoResize.init();
  textarea.scrollHeight = 120;
  textarea.dispatch("input");

  assert.equal(textarea.style.height, "40px");
  assert.equal(frames.length, 1);

  frames[0]();
  assert.equal(textarea.style.height, "120px");
});

test("auto-growing textareas keep their CSS height transition", async () => {
  const stylesheetUrl = new URL("../src/styles.css", import.meta.url);
  const stylesheet = await readFile(stylesheetUrl, "utf8");
  const rule = stylesheet.match(/textarea\.auto-growing-textarea\s*\{([^}]+)\}/)?.[1] ?? "";

  assert.match(rule, /transition:\s*height\s+0\.2s/);
});

test("textarea keeps short content anchored to the top while growing", () => {
  const textarea = createTextarea(40);
  const frames = [];
  const autoResize = createAutoResizeTextarea(textarea, {
    requestAnimationFrameFn(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelAnimationFrameFn() {},
  });

  autoResize.init();
  textarea.scrollTop = 18;
  textarea.scrollHeight = 100;
  textarea.dispatch("input");

  assert.equal(textarea.scrollTop, 0);
  frames[0]();
  assert.equal(textarea.scrollTop, 0);
});

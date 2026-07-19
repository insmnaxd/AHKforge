import assert from "node:assert/strict";
import test from "node:test";

import { createKeyboardLayoutPickers } from "../src/ui/keyboard-layout-picker.js";

function createElement({ layout, text = "" } = {}) {
  const listeners = new Map();
  const attributes = new Map();

  return {
    dataset: layout ? { keyboardLayout: layout } : {},
    hidden: true,
    focused: false,
    textContent: text,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    emit(type, event = {}) {
      listeners.get(type)?.(event);
    },
    focus() {
      this.focused = true;
    },
    getAttribute(name) {
      return attributes.get(name);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
}

function createPickerFixture(initialValue) {
  const root = createElement();
  const button = createElement();
  const listbox = createElement();
  const currentLabel = createElement();
  const options = [
    createElement({ layout: "qwerty", text: "QWERTY" }),
    createElement({ layout: "qwertz", text: "QWERTZ" }),
    createElement({ layout: "azerty", text: "AZERTY" }),
  ];
  const selectListeners = new Map();
  const select = {
    value: initialValue,
    addEventListener(type, handler) {
      selectListeners.set(type, handler);
    },
    dispatchEvent(event) {
      selectListeners.get(event.type)?.(event);
      return true;
    },
  };
  const elements = new Map([
    [".keyboard-layout-picker-button", button],
    [".keyboard-layout-picker-options", listbox],
    [".keyboard-layout-select", select],
    [".keyboard-layout-current-label", currentLabel],
  ]);

  listbox.querySelectorAll = () => options;
  root.querySelector = (selector) => elements.get(selector);
  root.contains = (target) => target === root || target === button || options.includes(target);

  return { root, button, listbox, currentLabel, options, select };
}

test("keyboard layout pickers render and synchronize their selected layouts", () => {
  const first = createPickerFixture("qwerty");
  const second = createPickerFixture("qwertz");
  const documentLike = {
    querySelectorAll: () => [first.root, second.root],
    addEventListener() {},
  };
  class FakeEvent {
    constructor(type) {
      this.type = type;
    }
  }
  const controller = createKeyboardLayoutPickers({
    documentLike,
    EventClass: FakeEvent,
    setTimeoutFn(callback) {
      callback();
      return null;
    },
    clearTimeoutFn() {},
  });

  controller.init();
  assert.equal(first.currentLabel.textContent, "QWERTY");
  assert.equal(second.currentLabel.textContent, "QWERTZ");

  first.button.emit("click");
  first.options[2].emit("click");
  assert.equal(first.select.value, "azerty");
  assert.equal(first.currentLabel.textContent, "AZERTY");
  assert.equal(first.button.focused, false);

  second.select.value = "azerty";
  controller.sync();
  assert.equal(second.currentLabel.textContent, "AZERTY");
  assert.equal(second.options[2].getAttribute("aria-selected"), "true");
});

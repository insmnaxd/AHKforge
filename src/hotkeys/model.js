import { buildPrefix } from "../keyboard/prefixes.js";

export const ACTION_CONFIG = {
  send: {
    labelKey: "action.send.label",
    placeholderKey: "action.send.placeholder",
    hintKey: "action.send.hint",
  },
  run: {
    labelKey: "action.run.label",
    placeholderKey: "action.run.placeholder",
    hintKey: "action.run.hint",
  },
  url: {
    labelKey: "action.url.label",
    placeholderKey: "action.url.placeholder",
    hintKey: "action.url.hint",
  },
  command: {
    labelKey: "action.command.label",
    placeholderKey: "action.command.placeholder",
    hintKey: "action.command.hint",
  },
};

export function createHotkeyEntry({
  modifiers,
  key,
  distinguishSides = false,
  actionType = "send",
  actionValue = "",
  useEventMode = false,
  comment = "",
}) {
  return {
    prefix: buildPrefix(modifiers, key, distinguishSides),
    actionType,
    actionValue: actionType === "send" ? actionValue : actionValue.trim(),
    sendMode: actionType === "send" && useEventMode ? "Event" : "Input",
    comment: comment.trim(),
  };
}

export function validateHotkeyEntry(
  hotkeys,
  candidate,
  { selectedKey, editingIndex = null }
) {
  if (!selectedKey) {
    return { valid: false, errorKey: "error.noHotkeyKey" };
  }
  if (candidate.actionValue.length === 0) {
    return { valid: false, errorKey: "error.emptyAction" };
  }

  const duplicateIndex = hotkeys.findIndex(
    (hotkey) => hotkey.prefix === candidate.prefix
  );
  if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
    return {
      valid: false,
      errorKey: "error.duplicateHotkey",
      values: { prefix: candidate.prefix },
    };
  }

  return { valid: true };
}

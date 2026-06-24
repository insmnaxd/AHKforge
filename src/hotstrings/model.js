import { findDuplicateHotstringIndex } from "./duplicates.js";

export function createHotstringEntry(values) {
  return {
    trigger: (values.trigger ?? "").trim(),
    replacement: values.replacement ?? "",
    autoReplace: Boolean(values.autoReplace),
    caseSensitive: Boolean(values.caseSensitive),
    insideWord: Boolean(values.insideWord),
    rawText: Boolean(values.rawText),
    comment: (values.comment ?? "").trim(),
  };
}

export function validateHotstringEntry(hotstrings, candidate, editingIndex = null) {
  if (candidate.trigger.length === 0) {
    return { valid: false, errorKey: "error.hotstringMissingTrigger" };
  }
  if (/\s/.test(candidate.trigger)) {
    return { valid: false, errorKey: "error.hotstringTriggerSpaces" };
  }
  if (candidate.replacement.length === 0) {
    return { valid: false, errorKey: "error.hotstringMissingReplacement" };
  }

  const duplicateIndex = findDuplicateHotstringIndex(hotstrings, candidate);
  if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
    return {
      valid: false,
      errorKey: "error.duplicateHotstring",
      values: { trigger: candidate.trigger },
    };
  }

  return { valid: true };
}

export function getHotstringOptionTags(hotstring) {
  const tags = [];
  if (hotstring.autoReplace) tags.push("*");
  if (hotstring.caseSensitive) tags.push("C");
  if (hotstring.insideWord) tags.push("?");
  if (hotstring.rawText) tags.push("R");
  return tags;
}

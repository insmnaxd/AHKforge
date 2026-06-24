import { buildPrefix } from "../keyboard/prefixes.js";

export function createRemapEntry({
  fromModifiers,
  fromKey,
  toModifiers,
  toKey,
  distinguishSides = false,
  comment = "",
}) {
  return {
    fromPrefix: buildPrefix(fromModifiers, fromKey, distinguishSides),
    toPrefix: buildPrefix(toModifiers, toKey, distinguishSides),
    comment: comment.trim(),
  };
}

export function validateRemapEntry(
  remaps,
  candidate,
  { fromKey, toKey, editingIndex = null }
) {
  if (!fromKey) {
    return { valid: false, errorKey: "error.remapMissingFrom" };
  }
  if (!toKey) {
    return { valid: false, errorKey: "error.remapMissingTo" };
  }
  if (candidate.fromPrefix === candidate.toPrefix) {
    return { valid: false, errorKey: "error.remapSame" };
  }

  const duplicateIndex = remaps.findIndex(
    (remap) => remap.fromPrefix === candidate.fromPrefix
  );
  if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
    return {
      valid: false,
      errorKey: "error.duplicateRemap",
      values: { prefix: candidate.fromPrefix },
    };
  }

  return { valid: true };
}

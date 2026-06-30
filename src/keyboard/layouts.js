const mappedKey = (key, label) => Object.freeze({ key, label });

export const KEYBOARD_LAYOUT_MAPS = {
  qwerty: {},
  qwertz: {
    y: mappedKey("z", "Z"),
    z: mappedKey("y", "Y"),
    "`": mappedKey("sc029", "^"),
    "-": mappedKey("sc00C", "ß"),
    "=": mappedKey("sc00D", "´"),
    "[": mappedKey("sc01A", "Ü"),
    "]": mappedKey("sc01B", "+"),
    "\\": mappedKey("sc02B", "#"),
    ";": mappedKey("sc027", "Ö"),
    "'": mappedKey("sc028", "Ä"),
    "/": mappedKey("sc035", "-"),
  },
  azerty: {
    a: mappedKey("q", "Q"),
    q: mappedKey("a", "A"),
    z: mappedKey("w", "W"),
    w: mappedKey("z", "Z"),
    "`": mappedKey("sc029", "²"),
    1: mappedKey("sc002", "&"),
    2: mappedKey("sc003", "É"),
    3: mappedKey("sc004", '"'),
    4: mappedKey("sc005", "'"),
    5: mappedKey("sc006", "("),
    6: mappedKey("sc007", "-"),
    7: mappedKey("sc008", "È"),
    8: mappedKey("sc009", "_"),
    9: mappedKey("sc00A", "Ç"),
    0: mappedKey("sc00B", "À"),
    "-": mappedKey("sc00C", ")"),
    "=": mappedKey("sc00D", "="),
    "[": mappedKey("sc01A", "^"),
    "]": mappedKey("sc01B", "$"),
    "\\": mappedKey("sc02B", "*"),
    ";": mappedKey("m", "M"),
    "'": mappedKey("sc028", "Ù"),
    m: mappedKey("sc032", ","),
    ",": mappedKey("sc033", ";"),
    ".": mappedKey("sc034", ":"),
    "/": mappedKey("sc035", "!"),
  },
};

export function isSupportedKeyboardLayout(layout) {
  return Object.prototype.hasOwnProperty.call(KEYBOARD_LAYOUT_MAPS, layout);
}

export function getKeyboardLayoutMap(layout) {
  return KEYBOARD_LAYOUT_MAPS[layout] || KEYBOARD_LAYOUT_MAPS.qwerty;
}

export function resolveKeyboardLayoutKey(baseKey, map = {}) {
  const mapping = map[baseKey];
  if (!mapping) return baseKey;
  return typeof mapping === "string" ? mapping : mapping.key;
}

export function getKeyboardLayoutPresentation(baseKey, map = {}) {
  const mapping = map[baseKey];
  const key = resolveKeyboardLayoutKey(baseKey, map);
  const defaultLabel = /^[a-z]$/i.test(baseKey)
    ? baseKey.toUpperCase()
    : baseKey;

  return {
    key,
    label:
      mapping && typeof mapping !== "string"
        ? mapping.label
        : /^[a-z]$/i.test(key)
          ? key.toUpperCase()
          : defaultLabel,
  };
}

export function applyKeyboardLayoutToButton(button, map = {}) {
  const baseKey = button.dataset.baseKey || button.dataset.key;
  const participates =
    Boolean(button.dataset.baseKey) ||
    /^[a-z]$/i.test(baseKey) ||
    Object.prototype.hasOwnProperty.call(map, baseKey);

  if (!participates) return false;
  if (!button.dataset.baseKey) button.dataset.baseKey = baseKey;

  const presentation = getKeyboardLayoutPresentation(baseKey, map);
  button.dataset.key = presentation.key;
  button.textContent = presentation.label;
  return true;
}

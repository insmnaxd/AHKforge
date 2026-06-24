import { buildFullScript } from "./ahk/generator.js";
import { parseAhkScript } from "./ahk/parser.js";
import { createUserConfigStore } from "./config/user-config.js";
import { createHotkeysController } from "./hotkeys/controller.js";
import { createHotstringsController } from "./hotstrings/controller.js";
import { createI18n, resolveSupportedLanguage } from "./i18n/index.js";
import { findDuplicateHotstringIndex } from "./hotstrings/duplicates.js";
import { getKeyboardLayoutMap, isSupportedKeyboardLayout } from "./keyboard/layouts.js";
import { createRemapsController } from "./remaps/controller.js";
import { createThemeController } from "./ui/theme.js";
import { createTitlebarController, injectVersion } from "./ui/titlebar.js";

// --- App version ---

const AHKGEN_VERSION = "v1.0.0-alpha.4";

const { writeTextFile, readTextFile } = window.__TAURI__.fs;
const { save, open } = window.__TAURI__.dialog;
const { writeText } = window.__TAURI__.clipboardManager;
const { getCurrentWindow } = window.__TAURI__.window;
const { invoke } = window.__TAURI__.core;

// --- App state ---
let hotkeys = [];
let remaps = [];
let hotstrings = [];

let currentMode = "hotkeys"; // "hotkeys" | "remap"

// --- DOM elements ---
let modeTabs;
let keyboardLayoutSelects;
let languageSelect;
let themeToggleCheckbox;
let tabBadgeHotkeys, tabBadgeHotstrings, tabBadgeRemap;
let distinguishSidesToggles;
let modeSectionHotkeys, modeSectionHotstrings, modeSectionRemap, modeSectionSettings;
let listSectionHotkeys, listSectionHotstrings, listSectionRemap;

let scriptPreviewEl;
let scriptPreviewSection;
let copyBtn, saveBtn, openFileBtn, actionStatusEl;
let resetConfigBtn, settingsStatusEl;
let hotkeysController, hotstringsController, remapsController, themeController, titlebarController;

// --- Localization ---

const i18n = createI18n();
const t = (key, values = {}) => i18n.t(key, values);

const userConfigStore = createUserConfigStore({
  invoke,
  storage: localStorage,
  resolveLanguage: resolveSupportedLanguage,
  isKeyboardLayout: isSupportedKeyboardLayout,
});

function getSavedLanguagePreference() {
  return resolveSupportedLanguage(userConfigStore.get().language);
}

function saveLanguagePreference(language) {
  userConfigStore.update({ language });
}

function setLanguage(language, persist = false) {
  const currentLanguage = i18n.setLanguage(language);
  if (persist) saveLanguagePreference(currentLanguage);
  applyTranslations();
}

function initLanguage() {
  setLanguage(getSavedLanguagePreference() || i18n.detectLanguage());
}

function applyTranslations() {
  i18n.applyToDocument(document);
  if (languageSelect) languageSelect.value = i18n.getLanguage();

  updateFormModeLabels();
  remapsController?.updateDisplays();
  titlebarController?.updateMaximizeLabel();
}

function updateFormModeLabels() {
  hotkeysController?.updateTranslations();
  hotstringsController?.updateLabels();
  remapsController?.updateLabels();
}

// Whether to distinguish left/right variants of Ctrl, Shift, Alt, Win (global setting)
let distinguishSides = false;

// Updates the visible label of every modifier button on both keyboards,
// switching between e.g. "Ctrl" and "L Ctrl" / "R Ctrl" depending on distinguishSides.
// --- Keyboard layout (QWERTY / QWERTZ / AZERTY) ---
// All button data-key attributes in the HTML are written in QWERTY (the base layout).
// Switching layouts remaps specific QWERTY letter keys to their physical equivalent
// in the chosen layout, both for the visible label and the underlying data-key used
// to build AHK prefixes - so the hotkey generated matches the physical key the user
// would actually press on that layout.
function applyKeyboardLayout(layout) {
  const map = getKeyboardLayoutMap(layout);
  hotkeysController?.applyKeyboardLayout(map);
  remapsController?.applyKeyboardLayout(map);
}

function saveKeyboardLayoutPreference(layout) {
  userConfigStore.update({ keyboardLayout: layout });
}

function loadKeyboardLayoutPreference() {
  const { keyboardLayout } = userConfigStore.get();
  return isSupportedKeyboardLayout(keyboardLayout) ? keyboardLayout : "qwerty";
}

function getSavedThemePreference() {
  return userConfigStore.get().theme; // "light" | "dark" | null (never set)
}

function saveThemePreference(theme) {
  userConfigStore.update({ theme });
}

function updateModifierLabels() {
  hotkeysController?.updateModifierLabels();
  remapsController?.updateModifierLabels();
}

function setDistinguishSides(value) {
  distinguishSides = value;
  distinguishSidesToggles.forEach((toggle) => {
    toggle.checked = value;
  });

  // Only clear the *modifier* selections on both keyboards (Ctrl/Alt/Shift/Win/AltGr) - switching
  // this setting changes what their symbols/labels mean. The main key (e.g. "j") is unaffected
  // by this setting, so we leave it selected.
  hotkeysController.clearModifiers();
  remapsController.clearModifiers();

  updateModifierLabels();
}

// AHK generation and parsing live in pure modules under src/ahk.

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderScriptPreview() {
  scriptPreviewEl.value = buildFullScript({
    version: AHKGEN_VERSION,
    hotkeys,
    remaps,
    hotstrings,
  });
}

// Keeps the entry count visible on each mode tab, so switching tabs doesn't hide
// the fact that hotkeys/hotstrings/remaps already exist elsewhere.
function updateTabBadges() {
  setTabBadge(tabBadgeHotkeys, hotkeys.length);
  setTabBadge(tabBadgeHotstrings, hotstrings.length);
  setTabBadge(tabBadgeRemap, remaps.length);
}

function setTabBadge(el, count) {
  el.textContent = count;
  el.classList.toggle("hidden", count === 0);
}

function renderAll() {
  hotkeysController.render();
  hotstringsController.render();
  remapsController.render();
  renderScriptPreview();
  updateTabBadges();
}

function setupEditableEntries(listEl, handleEdit) {
  listEl.querySelectorAll(".hotkey-item-expandable").forEach((item) => {
    const description = item.querySelector(".hotkey-desc");

    if (description && item.classList.contains("editing")) {
      expandEntry(item, false);
    }

    item.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      handleEdit(parseInt(item.dataset.index, 10));
    });

    item.addEventListener("keydown", (event) => {
      if (event.target !== item || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      handleEdit(parseInt(item.dataset.index, 10));
    });

    item.addEventListener("mouseenter", () => {
      if (description) expandEntry(item);
    });
    item.addEventListener("mouseleave", () => {
      if (description && !item.classList.contains("editing")) collapseEntry(item);
    });
  });
}

function setEditingEntry(listEl, index) {
  listEl.querySelectorAll(".hotkey-item-expandable").forEach((item) => {
    const isEdited = parseInt(item.dataset.index, 10) === index;
    item.classList.toggle("editing", isEdited);

    if (isEdited && !item.classList.contains("expanded")) {
      expandEntry(item);
    } else if (!isEdited && item.classList.contains("expanded") && !item.matches(":hover")) {
      collapseEntry(item);
    }
  });
}

function clearEditingEntry(listEl, index) {
  if (index === null) return;
  const item = listEl.querySelector(`[data-index="${index}"]`);
  if (!item) return;

  item.classList.remove("editing");
  collapseEntry(item);
}

function animateEntryAddition(listEl, index, replacedEmptyState = false) {
  const item = listEl.querySelector(`[data-index="${index}"]`);
  if (!item || !item.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  listEl.classList.add("animating-entry");
  const height = item.getBoundingClientRect().height;
  const startFrame = replacedEmptyState
    ? {
        height: `${height}px`,
        marginBottom: "8px",
        paddingTop: "10px",
        paddingBottom: "10px",
        opacity: 0,
        transform: "translateY(6px)",
      }
    : {
        height: "0px",
        marginBottom: "0px",
        paddingTop: "0px",
        paddingBottom: "0px",
        opacity: 0,
        transform: "translateY(-8px)",
      };
  const animation = item.animate(
    [
      startFrame,
      {
        height: `${height}px`,
        marginBottom: "8px",
        paddingTop: "10px",
        paddingBottom: "10px",
        opacity: 1,
        transform: "translateY(0)",
      },
    ],
    {
      duration: 320,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    }
  );

  animation.finished
    .catch(() => {})
    .finally(() => listEl.classList.remove("animating-entry"));
}

function animateEntryRemoval(item, removeEntry, revealsEmptyState = false) {
  if (!item) {
    removeEntry();
    return;
  }

  if (!item.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    removeEntry();
    return;
  }

  item.style.pointerEvents = "none";
  item.style.overflow = "hidden";
  const height = item.getBoundingClientRect().height;
  const endFrame = revealsEmptyState
    ? {
        height: `${height}px`,
        marginBottom: "8px",
        paddingTop: "10px",
        paddingBottom: "10px",
        opacity: 0,
        transform: "translateY(-6px)",
      }
    : {
        height: "0px",
        marginBottom: "0px",
        paddingTop: "0px",
        paddingBottom: "0px",
        opacity: 0,
        transform: "translateY(-6px)",
      };
  const animation = item.animate(
    [
      {
        height: `${height}px`,
        marginBottom: "8px",
        paddingTop: "10px",
        paddingBottom: "10px",
        opacity: 1,
        transform: "translateY(0)",
      },
      endFrame,
    ],
    {
      duration: 280,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    }
  );

  animation.finished.then(removeEntry).catch(removeEntry);
}

function animateEmptyState(listEl) {
  const emptyState = listEl.querySelector(".empty-state");
  if (!emptyState || !emptyState.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  emptyState.animate(
    [
      { opacity: 0, transform: "translateY(5px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    {
      duration: 220,
      easing: "ease-out",
    }
  );
}

function expandEntry(item, animate = true) {
  const description = item.querySelector(".hotkey-desc");
  if (!description) return;

  item.classList.remove("collapsing");
  description.classList.add("measuring");
  const expandedHeight = description.scrollHeight;
  description.classList.remove("measuring");
  description.style.maxHeight = animate ? `${description.offsetHeight}px` : `${expandedHeight}px`;
  item.classList.add("expanded");

  if (animate) {
    requestAnimationFrame(() => {
      description.style.maxHeight = `${expandedHeight}px`;
    });
  }
}

function collapseEntry(item) {
  const description = item.querySelector(".hotkey-desc");
  if (!description) return;

  description.style.maxHeight = `${description.scrollHeight}px`;
  item.classList.remove("expanded");
  item.classList.add("collapsing");

  description.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "max-height" || item.classList.contains("expanded")) return;
    item.classList.remove("collapsing");
    description.style.maxHeight = "26px";
  }, { once: true });

  requestAnimationFrame(() => {
    description.style.maxHeight = "26px";
  });
}

// --- Mode switching ---

function switchMode(mode) {
  currentMode = mode;

  modeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  modeSectionHotkeys.classList.toggle("hidden", mode !== "hotkeys");
  listSectionHotkeys.classList.toggle("hidden", mode !== "hotkeys");
  modeSectionHotstrings.classList.toggle("hidden", mode !== "hotstrings");
  listSectionHotstrings.classList.toggle("hidden", mode !== "hotstrings");
  modeSectionRemap.classList.toggle("hidden", mode !== "remap");
  listSectionRemap.classList.toggle("hidden", mode !== "remap");
  modeSectionSettings.classList.toggle("hidden", mode !== "settings");
  scriptPreviewSection.classList.toggle("hidden", mode === "settings");

  // Leaving a tab resets its form/keyboard selection (and cancels any in-progress edit there),
  // so coming back later always starts from a clean slate instead of stale state.
  if (hotkeysController.isEditing()) hotkeysController.cancelEdit();
  if (remapsController.isEditing()) remapsController.cancelEdit();
  if (hotstringsController.isEditing()) hotstringsController.cancelEdit();
  hotkeysController.clearSelection();
  remapsController.clearSelection();
}

// --- Status messages ---

let statusTimeoutId = null;

function setStatus(msg, isError = false, autoClear = true) {
  if (statusTimeoutId) {
    clearTimeout(statusTimeoutId);
    statusTimeoutId = null;
  }

  actionStatusEl.textContent = msg;
  actionStatusEl.className = isError ? "status-msg status-error" : "status-msg status-success";

  if (autoClear && !isError) {
    statusTimeoutId = setTimeout(() => {
      actionStatusEl.textContent = "";
      actionStatusEl.className = "status-msg";
      statusTimeoutId = null;
    }, 4000);
  }
}

async function handleCopy() {
  try {
    await writeText(scriptPreviewEl.value);
    setStatus(t("status.copied"));
  } catch (err) {
    setStatus(t("status.copyError", { error: err }), true);
  }
}

async function handleSave() {
  try {
    const filePath = await save({
      filters: [{ name: "AutoHotkey Script", extensions: ["ahk"] }],
      defaultPath: "script.ahk",
    });

    if (!filePath) return;

    const BOM = "\uFEFF";
    await writeTextFile(filePath, BOM + scriptPreviewEl.value);
    setStatus(t("status.saved", { path: filePath }));
  } catch (err) {
    setStatus(t("status.saveError", { error: err }), true);
  }
}

async function handleOpenFile() {
  try {
    const filePath = await open({
      multiple: false,
      filters: [{ name: "AutoHotkey Script", extensions: ["ahk"] }],
    });

    if (!filePath) return;

    const rawText = await readTextFile(filePath);
    const result = parseAhkScript(rawText);

    if (!result.success) {
      setStatus(t(result.errorKey), true);
      return;
    }

    if (result.hotkeys.length === 0 && result.remaps.length === 0 && result.hotstrings.length === 0) {
      setStatus(t("status.noRecognizableEntries"), true);
      return;
    }

    let addedHotkeys = 0;
    let duplicateHotkeys = 0;
    for (const hk of result.hotkeys) {
      if (hotkeys.some((existing) => existing.prefix === hk.prefix)) {
        duplicateHotkeys++;
      } else {
        hotkeys.push(hk);
        addedHotkeys++;
      }
    }

    let addedHotstrings = 0;
    let duplicateHotstrings = 0;
    for (const hs of result.hotstrings) {
      if (findDuplicateHotstringIndex(hotstrings, hs) !== -1) {
        duplicateHotstrings++;
      } else {
        hotstrings.push(hs);
        addedHotstrings++;
      }
    }

    let addedRemaps = 0;
    let duplicateRemaps = 0;
    for (const rm of result.remaps) {
      if (remaps.some((existing) => existing.fromPrefix === rm.fromPrefix)) {
        duplicateRemaps++;
      } else {
        remaps.push(rm);
        addedRemaps++;
      }
    }

    renderAll();

    const parts = [];
    if (addedHotkeys > 0) parts.push(t("count.hotkeys", { count: addedHotkeys }));
    if (addedHotstrings > 0) parts.push(t("count.hotstrings", { count: addedHotstrings }));
    if (addedRemaps > 0) parts.push(t("count.remaps", { count: addedRemaps }));
    let msg = parts.length > 0 ? t("status.loaded", { parts: parts.join(", ") }) : t("status.noNewEntries");

    if (result.skippedCount > 0) {
      msg += t("status.skipped", { count: result.skippedCount });
    }
    const totalDuplicates = duplicateHotkeys + duplicateHotstrings + duplicateRemaps;
    if (totalDuplicates > 0) {
      msg += t("status.duplicates", { count: totalDuplicates });
    }
    setStatus(msg, false, false);
  } catch (err) {
    setStatus(t("status.openError", { error: err }), true);
  }
}

function handleKeyboardLayoutChange(event) {
  const layout = event.currentTarget.value;
  keyboardLayoutSelects.forEach((select) => {
    select.value = layout;
  });
  applyKeyboardLayout(layout);
  saveKeyboardLayoutPreference(layout);

  // Clear any in-progress key selection, since the key positions just changed underneath it
  hotkeysController.clearSelection();
  remapsController.clearSelection();
}

function handleLanguageChange() {
  setLanguage(languageSelect.value, true);
  renderAll();
}

async function handleResetConfig() {
  if (!window.confirm(t("settings.resetConfirmation"))) return;

  resetConfigBtn.disabled = true;
  settingsStatusEl.textContent = t("status.resettingConfig");
  settingsStatusEl.className = "status-msg";

  try {
    userConfigStore.clearLegacyPreferences();
    await invoke("reset_user_config");
  } catch (err) {
    resetConfigBtn.disabled = false;
    settingsStatusEl.textContent = t("status.resetConfigError", { error: err });
    settingsStatusEl.className = "status-msg status-error";
  }
}

// --- Initialization ---

window.addEventListener("DOMContentLoaded", async () => {
  injectVersion(document, AHKGEN_VERSION);

  modeTabs = document.querySelectorAll(".mode-tab");
  tabBadgeHotkeys = document.querySelector("#tab-badge-hotkeys");
  tabBadgeHotstrings = document.querySelector("#tab-badge-hotstrings");
  tabBadgeRemap = document.querySelector("#tab-badge-remap");
  distinguishSidesToggles = document.querySelectorAll(".distinguish-sides-toggle");
  keyboardLayoutSelects = document.querySelectorAll(".keyboard-layout-select");
  languageSelect = document.querySelector("#language-select");
  themeToggleCheckbox = document.querySelector("#theme-toggle-checkbox");
  modeSectionHotkeys = document.querySelector("#mode-section-hotkeys");
  modeSectionHotstrings = document.querySelector("#mode-section-hotstrings");
  modeSectionRemap = document.querySelector("#mode-section-remap");
  modeSectionSettings = document.querySelector("#mode-section-settings");
  listSectionHotkeys = document.querySelector("#list-section-hotkeys");
  listSectionHotstrings = document.querySelector("#list-section-hotstrings");
  listSectionRemap = document.querySelector("#list-section-remap");

  scriptPreviewEl = document.querySelector("#script-preview");
  scriptPreviewSection = document.querySelector("#script-preview-section");

  copyBtn = document.querySelector("#copy-btn");
  saveBtn = document.querySelector("#save-btn");
  openFileBtn = document.querySelector("#open-file-btn");
  actionStatusEl = document.querySelector("#action-status");
  resetConfigBtn = document.querySelector("#reset-config-btn");
  settingsStatusEl = document.querySelector("#settings-status");

  themeController = createThemeController({
    documentLike: document,
    windowLike: window,
    toggle: themeToggleCheckbox,
    getSavedTheme: getSavedThemePreference,
    saveTheme: saveThemePreference,
  });
  titlebarController = createTitlebarController({
    documentLike: document,
    appWindow: getCurrentWindow(),
    t,
  });
  hotkeysController = createHotkeysController({
    documentLike: document,
    entries: hotkeys,
    t,
    escapeHtml,
    getDistinguishSides: () => distinguishSides,
    editableEntries: {
      setup: setupEditableEntries,
      setEditing: setEditingEntry,
      clearEditing: clearEditingEntry,
    },
    animations: {
      add: animateEntryAddition,
      remove: animateEntryRemoval,
      empty: animateEmptyState,
    },
    browseForFile: () =>
      open({
        multiple: false,
      }),
    onBrowseError: (error) => {
      setStatus(t("status.browseError", { error }), true);
    },
    onChange: () => {
      hotkeysController.render();
      renderScriptPreview();
      updateTabBadges();
    },
  });
  hotstringsController = createHotstringsController({
    documentLike: document,
    entries: hotstrings,
    t,
    escapeHtml,
    editableEntries: {
      setup: setupEditableEntries,
      setEditing: setEditingEntry,
      clearEditing: clearEditingEntry,
    },
    animations: {
      add: animateEntryAddition,
      remove: animateEntryRemoval,
      empty: animateEmptyState,
    },
    onChange: () => {
      hotstringsController.render();
      renderScriptPreview();
      updateTabBadges();
    },
  });
  remapsController = createRemapsController({
    documentLike: document,
    entries: remaps,
    t,
    escapeHtml,
    getDistinguishSides: () => distinguishSides,
    editableEntries: {
      setup: setupEditableEntries,
      setEditing: setEditingEntry,
      clearEditing: clearEditingEntry,
    },
    animations: {
      add: animateEntryAddition,
      remove: animateEntryRemoval,
      empty: animateEmptyState,
    },
    onChange: () => {
      remapsController.render();
      renderScriptPreview();
      updateTabBadges();
    },
  });

  // Mode tabs
  modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  });

  // Distinguish left/right keys toggle
  distinguishSidesToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      setDistinguishSides(toggle.checked);
    });
  });

  // Keyboard layout selector
  keyboardLayoutSelects.forEach((select) => {
    select.addEventListener("change", handleKeyboardLayoutChange);
  });

  // Language selector
  languageSelect.addEventListener("change", handleLanguageChange);
  resetConfigBtn.addEventListener("click", handleResetConfig);

  // Shared actions
  copyBtn.addEventListener("click", handleCopy);
  saveBtn.addEventListener("click", handleSave);
  openFileBtn.addEventListener("click", handleOpenFile);

  try {
    await i18n.load();
  } catch (err) {
    console.warn("Could not load translations:", err);
  }

  await userConfigStore.load();

  const savedLayout = loadKeyboardLayoutPreference();
  keyboardLayoutSelects.forEach((select) => {
    select.value = savedLayout;
  });
  applyKeyboardLayout(savedLayout);

  initLanguage();
  updateModifierLabels();

  hotkeysController.init();
  hotstringsController.init();
  remapsController.init();
  themeController.init();
  titlebarController.init();

  renderAll();
});

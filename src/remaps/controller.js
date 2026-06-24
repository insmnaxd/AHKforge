import {
  buildPrefix,
  isModifierActive,
  parsePrefix,
  toggleModifierInSet,
} from "../keyboard/prefixes.js";
import { createRemapEntry, validateRemapEntry } from "./model.js";

export function createRemapsController({
  documentLike,
  entries,
  t,
  escapeHtml,
  getDistinguishSides,
  editableEntries,
  animations,
  onChange,
}) {
  const elements = {
    keyboard: documentLike.querySelector("#keyboard-remap"),
    targetFrom: documentLike.querySelector("#remap-target-from"),
    targetTo: documentLike.querySelector("#remap-target-to"),
    fromDisplay: documentLike.querySelector("#remap-from-display"),
    toDisplay: documentLike.querySelector("#remap-to-display"),
    comment: documentLike.querySelector("#remap-comment-input"),
    addButton: documentLike.querySelector("#add-remap-btn"),
    cancelButton: documentLike.querySelector("#cancel-remap-edit-btn"),
    error: documentLike.querySelector("#remap-form-error"),
    formTitle: documentLike.querySelector("#remap-form-title"),
    list: documentLike.querySelector("#remap-list"),
    count: documentLike.querySelector("#remap-count"),
  };

  let activeTarget = "from";
  let fromModifiers = new Set();
  let fromKey = null;
  let toModifiers = new Set();
  let toKey = null;
  let editingIndex = null;

  function getActiveSelection() {
    return activeTarget === "from"
      ? { modifiers: fromModifiers, key: fromKey }
      : { modifiers: toModifiers, key: toKey };
  }

  function updateVisuals() {
    const { modifiers, key } = getActiveSelection();
    const distinguishSides = getDistinguishSides();

    elements.keyboard.querySelectorAll(".kb-key").forEach((button) => {
      const buttonKey = button.dataset.key;
      if (button.classList.contains("kb-modifier")) {
        button.classList.toggle(
          "active",
          isModifierActive(
            buttonKey,
            button.dataset.base,
            modifiers,
            distinguishSides
          )
        );
      } else {
        button.classList.toggle("active", key === buttonKey);
      }
    });
  }

  function updateDisplays() {
    const distinguishSides = getDistinguishSides();
    const fromPrefix = buildPrefix(fromModifiers, fromKey, distinguishSides);
    const toPrefix = buildPrefix(toModifiers, toKey, distinguishSides);
    elements.fromDisplay.textContent = fromPrefix || t("remap.pickKey");
    elements.toDisplay.textContent = toPrefix || t("remap.pickKey");
  }

  function setActiveTarget(target) {
    activeTarget = target;
    elements.targetFrom.classList.toggle("active", target === "from");
    elements.targetTo.classList.toggle("active", target === "to");
    updateVisuals();
  }

  function toggleModifier(modifierKey) {
    const { modifiers } = getActiveSelection();
    toggleModifierInSet(modifiers, modifierKey, getDistinguishSides());
    updateVisuals();
    updateDisplays();
  }

  function selectKey(key) {
    if (activeTarget === "from") {
      fromKey = fromKey === key ? null : key;
    } else {
      toKey = toKey === key ? null : key;
    }
    updateVisuals();
    updateDisplays();
  }

  function clearModifiers() {
    fromModifiers.clear();
    toModifiers.clear();
    updateVisuals();
    updateDisplays();
  }

  function clearSelection() {
    fromModifiers = new Set();
    fromKey = null;
    toModifiers = new Set();
    toKey = null;
    setActiveTarget("from");
    updateDisplays();
  }

  function clearError() {
    elements.error.textContent = "";
  }

  function updateLabels() {
    elements.formTitle.textContent = t(
      editingIndex === null ? "form.remap.new" : "form.remap.edit"
    );
    elements.addButton.textContent = t(
      editingIndex === null ? "button.addRemap" : "button.saveChanges"
    );
  }

  function startEdit(index) {
    const remap = entries[index];
    editingIndex = index;

    const from = parsePrefix(remap.fromPrefix);
    const to = parsePrefix(remap.toPrefix);
    fromModifiers = from.mods;
    fromKey = from.key;
    toModifiers = to.mods;
    toKey = to.key;
    elements.comment.value = remap.comment || "";

    setActiveTarget("from");
    updateDisplays();
    elements.cancelButton.classList.remove("hidden");
    clearError();
    updateLabels();
    editableEntries.setEditing(elements.list, index);
  }

  function cancelEdit() {
    const cancelledIndex = editingIndex;
    editingIndex = null;
    clearSelection();
    elements.comment.value = "";
    elements.cancelButton.classList.add("hidden");
    clearError();
    updateLabels();
    editableEntries.clearEditing(elements.list, cancelledIndex);
  }

  function render() {
    elements.count.textContent = entries.length;

    if (entries.length === 0) {
      elements.list.innerHTML = `<li class="empty-state">${escapeHtml(
        t("empty.remaps")
      )}</li>`;
      return;
    }

    elements.list.innerHTML = entries
      .map((remap, index) => {
        const editingClass = index === editingIndex ? " editing" : "";
        const entryName = remap.comment
          ? `<span class="hotkey-desc hotkey-entry-name"><strong>${escapeHtml(
              remap.comment
            )}</strong></span>`
          : "";

        return `
          <li class="hotkey-item hotkey-item-expandable remap-entry${editingClass}" data-index="${index}" tabindex="0">
            <div class="hotkey-item-main">
              <span class="entry-prefix">
                <span class="hotkey-badge">${escapeHtml(remap.fromPrefix)}</span>
                <span class="remap-arrow-inline">&rarr;</span>
                <span class="hotkey-badge">${escapeHtml(remap.toPrefix)}</span>
              </span>
              ${entryName}
            </div>
            <div class="hotkey-item-actions">
              <button class="btn-remove-remap" data-index="${index}" title="${escapeHtml(
                t("button.remove")
              )}">&times;</button>
            </div>
          </li>
        `;
      })
      .join("");

    editableEntries.setup(elements.list, (index) => {
      if (editingIndex === index) {
        cancelEdit();
      } else {
        startEdit(index);
      }
    });

    elements.list.querySelectorAll(".btn-remove-remap").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const index = Number.parseInt(button.dataset.index, 10);
        const removingLastEntry = entries.length === 1;

        animations.remove(
          button.closest(".hotkey-item"),
          () => {
            entries.splice(index, 1);
            if (editingIndex !== null) cancelEdit();
            onChange();
            if (removingLastEntry) animations.empty(elements.list);
          },
          removingLastEntry
        );
      });
    });
  }

  function addOrSave() {
    clearError();
    const candidate = createRemapEntry({
      fromModifiers,
      fromKey,
      toModifiers,
      toKey,
      distinguishSides: getDistinguishSides(),
      comment: elements.comment.value,
    });
    const validation = validateRemapEntry(entries, candidate, {
      fromKey,
      toKey,
      editingIndex,
    });

    if (!validation.valid) {
      elements.error.textContent = t(validation.errorKey, validation.values);
      return;
    }

    let addedIndex = null;
    if (editingIndex !== null) {
      entries[editingIndex] = candidate;
      cancelEdit();
    } else {
      entries.push(candidate);
      addedIndex = entries.length - 1;
      clearSelection();
      elements.comment.value = "";
    }

    onChange();
    if (addedIndex !== null) {
      animations.add(elements.list, addedIndex, addedIndex === 0);
    }
  }

  function applyKeyboardLayout(map) {
    elements.keyboard
      .querySelectorAll(".kb-key:not(.kb-modifier)")
      .forEach((button) => {
        const baseKey = button.dataset.baseKey || button.dataset.key;
        if (!button.dataset.baseKey) button.dataset.baseKey = baseKey;
        if (baseKey.length === 1 && /[a-z]/i.test(baseKey)) {
          const mapped = map[baseKey] || baseKey;
          button.dataset.key = mapped;
          button.textContent = mapped.toUpperCase();
        }
      });
  }

  function updateModifierLabels() {
    elements.keyboard.querySelectorAll(".kb-modifier").forEach((button) => {
      const { side, base } = button.dataset;
      button.textContent =
        getDistinguishSides() && ["Ctrl", "Shift"].includes(base)
          ? `${side} ${base}`
          : base;
    });
  }

  function init() {
    elements.keyboard.querySelectorAll(".kb-key").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.classList.contains("kb-modifier")) {
          toggleModifier(button.dataset.key);
        } else {
          selectKey(button.dataset.key);
        }
      });
    });
    elements.targetFrom.addEventListener("click", () => setActiveTarget("from"));
    elements.targetTo.addEventListener("click", () => setActiveTarget("to"));
    elements.addButton.addEventListener("click", addOrSave);
    elements.cancelButton.addEventListener("click", cancelEdit);
    updateLabels();
    updateDisplays();
  }

  return {
    init,
    render,
    updateLabels,
    updateDisplays,
    updateModifierLabels,
    applyKeyboardLayout,
    clearModifiers,
    clearSelection,
    cancelEdit,
    isEditing: () => editingIndex !== null,
  };
}

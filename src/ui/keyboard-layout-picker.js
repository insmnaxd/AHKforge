import { createPopupSelect } from "./popup-select.js";

export function createKeyboardLayoutPickers({
  documentLike,
  EventClass = Event,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  closeDuration = 180,
}) {
  const pickers = Array.from(
    documentLike.querySelectorAll(".keyboard-layout-picker")
  ).map((root) => {
    const button = root.querySelector(".keyboard-layout-picker-button");
    const listbox = root.querySelector(".keyboard-layout-picker-options");
    const select = root.querySelector(".keyboard-layout-select");
    const currentLabel = root.querySelector(".keyboard-layout-current-label");
    const options = Array.from(
      listbox.querySelectorAll("[data-keyboard-layout]")
    );

    return createPopupSelect({
      documentLike,
      root,
      button,
      listbox,
      select,
      options,
      getOptionValue: (option) => option.dataset.keyboardLayout,
      renderSelected(selected) {
        currentLabel.textContent = selected.textContent;
      },
      EventClass,
      setTimeoutFn,
      clearTimeoutFn,
      closeDuration,
    });
  });

  return {
    init() {
      pickers.forEach((picker) => picker.init());
    },
    sync() {
      pickers.forEach((picker) => picker.sync());
    },
  };
}

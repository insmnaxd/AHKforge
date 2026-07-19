import { createPopupSelect } from "./popup-select.js";

export function createLanguagePicker({
  documentLike,
  select,
  EventClass = Event,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  closeDuration = 180,
}) {
  const root = documentLike.querySelector("#language-picker");
  const button = documentLike.querySelector("#language-picker-button");
  const listbox = documentLike.querySelector("#language-picker-options");
  const currentFlag = documentLike.querySelector("#language-picker-current-flag");
  const currentLabel = documentLike.querySelector("#language-picker-current-label");
  const options = Array.from(listbox.querySelectorAll("[data-language]"));

  return createPopupSelect({
    documentLike,
    root,
    button,
    listbox,
    select,
    options,
    getOptionValue: (option) => option.dataset.language,
    renderSelected(selected) {
      currentFlag.src = selected.querySelector("img").src;
      currentLabel.textContent = selected.querySelector("span").textContent;
    },
    EventClass,
    setTimeoutFn,
    clearTimeoutFn,
    closeDuration,
  });
}

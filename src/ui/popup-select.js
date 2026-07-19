export function createPopupSelect({
  documentLike,
  root,
  button,
  listbox,
  select,
  options,
  getOptionValue,
  renderSelected,
  EventClass = Event,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  closeDuration = 180,
}) {
  let isOpen = false;
  let closeTimeoutId = null;

  function selectedIndex() {
    const index = options.findIndex(
      (option) => getOptionValue(option) === select.value
    );
    return index >= 0 ? index : 0;
  }

  function sync() {
    const selected = options[selectedIndex()];
    renderSelected(selected);
    options.forEach((option) => {
      option.setAttribute(
        "aria-selected",
        getOptionValue(option) === getOptionValue(selected) ? "true" : "false"
      );
    });
  }

  function open(focusIndex = selectedIndex()) {
    if (closeTimeoutId !== null) {
      clearTimeoutFn(closeTimeoutId);
      closeTimeoutId = null;
    }
    isOpen = true;
    listbox.hidden = false;
    listbox.setAttribute("aria-hidden", "false");
    void listbox.offsetHeight;
    listbox.setAttribute("data-open", "true");
    button.setAttribute("aria-expanded", "true");
    options[focusIndex]?.focus();
  }

  function close({ focusButton = false } = {}) {
    isOpen = false;
    listbox.removeAttribute("data-open");
    listbox.setAttribute("aria-hidden", "true");
    button.setAttribute("aria-expanded", "false");
    if (focusButton) button.focus();

    if (closeTimeoutId !== null) clearTimeoutFn(closeTimeoutId);
    closeTimeoutId = setTimeoutFn(() => {
      if (!isOpen) listbox.hidden = true;
      closeTimeoutId = null;
    }, closeDuration);
  }

  function choose(option, { focusButton = true } = {}) {
    select.value = getOptionValue(option);
    select.dispatchEvent(new EventClass("change", { bubbles: true }));
    sync();
    close({ focusButton });
  }

  function moveFocus(currentIndex, offset) {
    const nextIndex = (currentIndex + offset + options.length) % options.length;
    options[nextIndex].focus();
  }

  function init() {
    button.addEventListener("click", (event) => {
      if (!isOpen) open();
      else {
        close();
        if (event.detail > 0) button.blur();
      }
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === "ArrowUp" ? -1 : 0;
      open((selectedIndex() + offset + options.length) % options.length);
    });

    options.forEach((option, index) => {
      option.addEventListener("click", () => choose(option, { focusButton: false }));
      option.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveFocus(index, event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          options[event.key === "Home" ? 0 : options.length - 1].focus();
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose(option);
        } else if (event.key === "Escape") {
          event.preventDefault();
          close({ focusButton: true });
        }
      });
    });

    select.addEventListener("change", sync);
    root.addEventListener("focusout", (event) => {
      if (!root.contains(event.relatedTarget)) close();
    });
    documentLike.addEventListener("pointerdown", (event) => {
      if (isOpen && !root.contains(event.target)) close();
    });
    sync();
  }

  return { init, sync };
}

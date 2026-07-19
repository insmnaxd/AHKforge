export function createAutoResizeTextarea(
  textarea,
  {
    minHeight = 40,
    maxHeight = 240,
    requestAnimationFrameFn = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelAnimationFrameFn = globalThis.cancelAnimationFrame?.bind(globalThis),
  } = {}
) {
  let animationFrameId = null;

  function resize({ animate = true } = {}) {
    if (animationFrameId !== null) {
      cancelAnimationFrameFn?.(animationFrameId);
      animationFrameId = null;
    }

    const currentHeight = Number.parseFloat(textarea.style.height) || minHeight;
    const previousScrollTop = Number(textarea.scrollTop) || 0;
    const previousTransition = textarea.style.transition;
    textarea.style.transition = "none";
    textarea.style.height = `${minHeight}px`;

    const contentHeight = Number(textarea.scrollHeight) || minHeight;
    const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    const nextScrollTop = contentHeight > maxHeight ? previousScrollTop : 0;

    textarea.style.height = `${currentHeight}px`;
    textarea.scrollTop = nextScrollTop;
    void textarea.offsetHeight;
    textarea.style.transition = previousTransition;
    textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";

    const applyHeight = () => {
      textarea.style.height = `${nextHeight}px`;
      textarea.scrollTop = nextScrollTop;
      animationFrameId = null;
    };

    if (animate && currentHeight !== nextHeight && requestAnimationFrameFn) {
      animationFrameId = requestAnimationFrameFn(applyHeight);
    } else {
      applyHeight();
    }
  }

  function init() {
    textarea.addEventListener("input", resize);
    resize({ animate: false });
  }

  return { init, resize };
}

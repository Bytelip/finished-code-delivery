import "@testing-library/jest-dom/vitest";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "print", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock HTMLCanvasElement.prototype.getContext for jsdom
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() =>
    ({
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      drawImage: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
    }) as unknown as RenderingContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

// React 19 stylesheet hoisting workaround in jsdom:
// When React 19 inserts <link rel="stylesheet">, jsdom never triggers the "load" event,
// causing React 19's suspense/asset preload mechanism to hang indefinitely.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const origCreate = document.createElement.bind(document);
  document.createElement = function <K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: ElementCreationOptions,
  ): HTMLElementTagNameMap[K] {
    const el = origCreate(tagName, options);
    if (String(tagName).toLowerCase() === "link") {
      const origSetAttr = el.setAttribute.bind(el);
      el.setAttribute = function (name: string, value: string) {
        origSetAttr(name, value);
        if (name === "rel" && value === "stylesheet") {
          setTimeout(() => el.dispatchEvent(new Event("load")), 0);
        }
      };
      Object.defineProperty(el, "rel", {
        set(val: string) {
          origSetAttr("rel", val);
          if (val === "stylesheet") {
            setTimeout(() => el.dispatchEvent(new Event("load")), 0);
          }
        },
        get() {
          return el.getAttribute("rel") || "";
        },
        configurable: true,
      });
    }
    return el;
  };
}

/* ==========================================================================
   SDRSM — Theme bootstrap
   Nạp trong <head> để tránh nhấp nháy giao diện (FOUC) khi ở dark mode.
   ========================================================================== */

(function () {
  "use strict";

  const KEY = "sdrsm:theme";
  const root = document.documentElement;

  function read() {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === "dark" || stored === "light") return stored;
    } catch (error) {
      console.warn("[SDRSM] Không đọc được theme:", error);
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply(theme) {
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1426" : "#e6f4fa");
    document.dispatchEvent(new CustomEvent("sdrsm:themechange", { detail: { theme } }));
  }

  function set(theme) {
    const next = theme === "dark" ? "dark" : "light";
    try {
      window.localStorage.setItem(KEY, next);
    } catch (error) {
      console.warn("[SDRSM] Không ghi được theme:", error);
    }
    apply(next);
    return next;
  }

  function toggle() {
    return set(root.dataset.theme === "dark" ? "light" : "dark");
  }

  apply(read());

  window.SDRSM = window.SDRSM || {};
  window.SDRSM.theme = {
    get: () => root.dataset.theme || "light",
    set,
    toggle,
  };
})();

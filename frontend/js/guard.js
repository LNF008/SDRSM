/* ==========================================================================
   SDRSM — Authentication guard
   --------------------------------------------------------------------------
   Loaded synchronously in <head> of every protected page. If there is no
   valid local session the page never renders: the browser is redirected to
   the login screen and returns here after a successful sign-in.
   ========================================================================== */

(function () {
  "use strict";

  const KEY = "sdrsm:auth";

  function redirectToLogin() {
    const inPages = /\/pages\//.test(window.location.pathname);
    const target = inPages ? "../login.html" : "login.html";
    const next = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`${target}?next=${encodeURIComponent(next)}`);
  }

  try {
    const raw = window.localStorage.getItem(KEY);
    const session = raw ? JSON.parse(raw) : null;
    const expiresAt = session ? Number(session.expiresAt) : 0;
    const expired = Number.isFinite(expiresAt) && expiresAt > 0 && Date.now() >= expiresAt;

    if (!session || !session.token || expired) {
      if (raw || expired) {
        try {
          window.localStorage.removeItem(KEY);
        } catch (error) {
          /* ignore */
        }
      }
      document.documentElement.style.visibility = "hidden";
      redirectToLogin();
    }
  } catch (error) {
    // localStorage blocked: let the page load and the API layer handle 401.
    console.warn("[SDRSM] Không kiểm tra được phiên đăng nhập:", error);
  }
})();

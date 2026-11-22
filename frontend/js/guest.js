/* ==========================================================================
   SDRSM — Guest-only guard
   --------------------------------------------------------------------------
   Loaded synchronously in <head> of the login and register pages. If the
   visitor already has a valid local session, skip the form and go straight
   to the dashboard. (If the token turns out to be rejected by the server,
   the API layer clears the session and returns the user to the login page.)
   ========================================================================== */

(function () {
  "use strict";

  const KEY = "sdrsm:auth";
  const TARGET = "pages/dashboard.html";

  try {
    const raw = window.localStorage.getItem(KEY);
    const session = raw ? JSON.parse(raw) : null;
    if (!session || !session.token) return;

    const expiresAt = Number(session.expiresAt);
    const expired = Number.isFinite(expiresAt) && expiresAt > 0 && Date.now() >= expiresAt;
    if (expired) {
      window.localStorage.removeItem(KEY);
      return;
    }

    document.documentElement.style.visibility = "hidden";
    window.location.replace(TARGET);
  } catch (error) {
    // localStorage blocked or corrupt: show the form as usual.
  }
})();

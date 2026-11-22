/* ==========================================================================
   SDRSM — Frontend runtime configuration
   --------------------------------------------------------------------------
   1. apiBaseUrl: Flask API origin. Local default is the backend dev server.
      For deployment use e.g. "https://sdrsm-api.vercel.app".
   2. googleClientId: Google Identity Services Web client ID. Create a Web
      application OAuth client in Google Cloud Console and add this site's
      origin (http://127.0.0.1:8123 and your deployed origin) to Authorized
      JavaScript origins. No client secret is needed.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

window.SDRSM.config = {
  apiBaseUrl: "https://sdrsm.vercel.app/",
  googleClientId: "628528126357-9kf79adedttabvlv7irknupk4fdqftar.apps.googleusercontent.com",
};

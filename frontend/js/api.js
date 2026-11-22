/* ==========================================================================
   SDRSM — API client
   --------------------------------------------------------------------------
   Thin fetch wrapper for the Flask API.
   - Adds the Bearer token from the local session.
   - Sends and expects JSON.
   - On 401 the local session is cleared and the user is sent to login.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

(function (ns) {
  "use strict";

  const config = ns.config || {};
  const BASE = String(config.apiBaseUrl || "http://127.0.0.1:5000").replace(/\/+$/, "");

  function isAuthPage() {
    return /(^|\/)(login|register)\.html$/i.test(window.location.pathname);
  }

  function loginUrl() {
    const inPages = /\/pages\//.test(window.location.pathname);
    const target = inPages ? "../login.html" : "login.html";
    const next = window.location.pathname + window.location.search + window.location.hash;
    return `${target}?next=${encodeURIComponent(next)}`;
  }

  class ApiError extends Error {
    constructor(message, options) {
      super(message);
      this.name = "ApiError";
      const opts = options || {};
      this.status = opts.status || 0;
      this.code = opts.code || "request_failed";
      this.fields = opts.fields || {};
    }
  }

  async function request(path, options) {
    const opts = options || {};
    const method = (opts.method || "GET").toUpperCase();
    const useAuth = opts.auth !== false;
    const session = useAuth && ns.session ? ns.session.get() : null;

    const headers = Object.assign({ Accept: "application/json" }, opts.headers || {});
    if (opts.body !== undefined && opts.body !== null) {
      headers["Content-Type"] = "application/json";
    }
    if (session && session.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    let response;
    try {
      response = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body:
          opts.body === undefined || opts.body === null
            ? undefined
            : JSON.stringify(opts.body),
        cache: "no-store",
        credentials: "omit",
      });
    } catch (cause) {
      throw new ApiError(
        "Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
        { code: "network_error" }
      );
    }

    let data = null;
    try {
      data = await response.json();
    } catch (cause) {
      data = null;
    }

    if (response.status === 401 && useAuth && !isAuthPage()) {
      if (ns.session) ns.session.clear();
      window.location.replace(loginUrl());
      throw new ApiError("Phiên đăng nhập đã hết hạn.", {
        status: 401,
        code: "session_expired",
      });
    }

    if (!response.ok) {
      const info = (data && data.error) || {};
      throw new ApiError(
        info.message || `Yêu cầu thất bại (HTTP ${response.status}).`,
        {
          status: response.status,
          code: info.code || "request_failed",
          fields: info.fields || {},
        }
      );
    }

    return data;
  }

  function get(path) {
    return request(path, { method: "GET" });
  }

  function post(path, body) {
    return request(path, { method: "POST", body: body === undefined ? {} : body });
  }

  function patch(path, body) {
    return request(path, { method: "PATCH", body: body === undefined ? {} : body });
  }

  ns.api = { base: BASE, request, get, post, patch, loginUrl, ApiError };
})(window.SDRSM);

/* ==========================================================================
   SDRSM — Login / Register
   --------------------------------------------------------------------------
   - Email + password via Flask API (JWT stored in localStorage).
   - Google Identity Services ID-token flow (no client secret).
   - Client-side validation, password visibility toggle and field-level errors.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

(function (ns) {
  "use strict";

  const config = ns.config || {};
  const API_BASE = String(config.apiBaseUrl || "http://127.0.0.1:5000").replace(/\/+$/, "");
  const GOOGLE_CLIENT_ID = String(config.googleClientId || "").trim();
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));

  let googleReady = false;
  let googleBusy = false;

  /* Alerts & field errors -------------------------------------------------- */
  function alertBox(message, type) {
    const box = $("#authAlert");
    if (!box) return;
    box.hidden = false;
    box.className = `auth-alert auth-alert--${type || "error"}`;
    box.textContent = message;
  }

  function hideAlert() {
    const box = $("#authAlert");
    if (!box) return;
    box.hidden = true;
    box.textContent = "";
  }

  function fieldErrorElement(name) {
    return $$("[data-error-for]").find((el) => el.dataset.errorFor === name) || null;
  }

  function fieldInput(name) {
    return document.querySelector(`[name="${name}"]`) || document.getElementById(name);
  }

  function setFieldError(name, message) {
    const error = fieldErrorElement(name);
    const input = fieldInput(name);
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    if (input) {
      input.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
    }
  }

  function clearFieldError(name) {
    const error = fieldErrorElement(name);
    const input = fieldInput(name);
    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
    if (input) {
      input.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
    }
  }

  function clearErrors(form) {
    $$("[data-error-for]", form).forEach((el) => {
      el.textContent = "";
      el.hidden = true;
    });
    $$(".input", form).forEach((input) => {
      input.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
    });
  }

  function firstInvalidInput(errors) {
    for (const name of Object.keys(errors)) {
      const input = fieldInput(name);
      if (input) return input;
    }
    return null;
  }

  function showClientErrors(errors) {
    Object.entries(errors).forEach(([name, message]) => setFieldError(name, message));
    const first = firstInvalidInput(errors);
    if (first) first.focus();
  }

  function showApiError(error) {
    if (error && error.fields) {
      Object.entries(error.fields).forEach(([name, message]) => {
        if (name === "form" || name === "credential" || name === "answers") return;
        setFieldError(name, message);
      });
    }
    alertBox(error && error.message ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.", "error");
  }

  /* API -------------------------------------------------------------------- */
  async function request(path, options) {
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, options);
    } catch (cause) {
      const error = new Error(
        "Không kết nối được máy chủ API. Hãy kiểm tra backend đang chạy và apiBaseUrl trong frontend/js/config.js."
      );
      error.code = "network_error";
      error.cause = cause;
      throw error;
    }

    let data = null;
    try {
      data = await response.json();
    } catch (cause) {
      // Keep the HTTP status as the useful signal for non-JSON responses.
    }

    if (!response.ok) {
      const info = (data && data.error) || {};
      const error = new Error(info.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
      error.status = response.status;
      error.code = info.code || "request_failed";
      error.fields = info.fields || {};
      throw error;
    }

    return data;
  }

  function post(path, body) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /* Form state ------------------------------------------------------------- */
  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    if (busy) {
      if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.innerHTML = '<i class="bi bi-arrow-repeat auth-spin" aria-hidden="true"></i> Đang xử lý…';
    } else {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
  }

  const NEXT_KEY = "sdrsm:next";

  function readNext() {
    const fromUrl = new URLSearchParams(window.location.search).get("next");
    if (fromUrl) {
      try {
        window.sessionStorage.setItem(NEXT_KEY, fromUrl);
      } catch (error) {
        /* ignore */
      }
      return fromUrl;
    }
    try {
      return window.sessionStorage.getItem(NEXT_KEY);
    } catch (error) {
      return null;
    }
  }

  function clearNext() {
    try {
      window.sessionStorage.removeItem(NEXT_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function afterLoginUrl() {
    const fallback = "pages/dashboard.html";
    const raw = readNext();
    if (!raw) return fallback;
    try {
      const target = new URL(raw, window.location.origin);
      if (target.origin !== window.location.origin) return fallback;
      if (!/\.html$/i.test(target.pathname)) return fallback;
      clearNext();
      return target.pathname + target.search + target.hash;
    } catch (error) {
      clearNext();
      return fallback;
    }
  }

  // Keep the redirect URI clean (no query string) so Google accepts it.
  (function cleanUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("next")) return;
    const next = params.get("next");
    try {
      window.sessionStorage.setItem(NEXT_KEY, next);
    } catch (error) {
      /* ignore */
    }
    params.delete("next");
    const search = params.toString();
    const url =
      window.location.pathname + (search ? `?${search}` : "") + window.location.hash;
    try {
      window.history.replaceState({}, "", url);
    } catch (error) {
      /* ignore */
    }
  })();

  function completeAuth(payload) {
    ns.session.save(payload);
    window.location.href = afterLoginUrl();
  }

  function readValue(form, name) {
    const input = form.elements.namedItem(name);
    return input && typeof input.value === "string" ? input.value.trim() : "";
  }

  /* Login ------------------------------------------------------------------ */
  function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("input", (event) => {
      if (event.target.name) clearFieldError(event.target.name);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors(form);
      hideAlert();

      const email = readValue(form, "email").toLowerCase();
      const password = readValue(form, "password");
      const errors = {};

      if (!email) errors.email = "Vui lòng nhập email.";
      else if (!EMAIL_RE.test(email)) errors.email = "Email không đúng định dạng.";
      if (!password) errors.password = "Vui lòng nhập mật khẩu.";

      if (Object.keys(errors).length) {
        showClientErrors(errors);
        return;
      }

      setBusy(form, true);
      try {
        const payload = await post("/api/auth/login", { email, password });
        completeAuth(payload);
      } catch (error) {
        showApiError(error);
      } finally {
        setBusy(form, false);
      }
    });
  }

  /* Register --------------------------------------------------------------- */
  function passwordProblem(password) {
    if (!password) return "Vui lòng nhập mật khẩu.";
    if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
    if (password.length > 128) return "Mật khẩu không được vượt quá 128 ký tự.";
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return "Mật khẩu phải bao gồm cả chữ và số.";
    }
    return "";
  }

  function initRegister() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("input", (event) => {
      if (event.target.name) clearFieldError(event.target.name);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors(form);
      hideAlert();

      const fullName = readValue(form, "fullName");
      const email = readValue(form, "email").toLowerCase();
      const studentId = readValue(form, "studentId");
      const faculty = readValue(form, "faculty");
      const password = readValue(form, "password");
      const confirmPassword = readValue(form, "confirmPassword");
      const agreed = Boolean(form.querySelector("#agreeTerms")?.checked);
      const errors = {};

      if (fullName.length < 2) errors.fullName = "Họ và tên phải có ít nhất 2 ký tự.";
      if (!email) errors.email = "Vui lòng nhập email.";
      else if (!EMAIL_RE.test(email)) errors.email = "Email không đúng định dạng.";

      const problem = passwordProblem(password);
      if (problem) errors.password = problem;
      if (!confirmPassword) errors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
      else if (confirmPassword !== password) errors.confirmPassword = "Mật khẩu nhập lại không khớp.";
      if (!agreed) errors.agreeTerms = "Bạn cần đồng ý với điều khoản sử dụng.";

      if (Object.keys(errors).length) {
        showClientErrors(errors);
        return;
      }

      setBusy(form, true);
      try {
        const payload = await post("/api/auth/register", {
          fullName,
          email,
          password,
          studentId: studentId || undefined,
          faculty: faculty || undefined,
        });
        completeAuth(payload);
      } catch (error) {
        showApiError(error);
      } finally {
        setBusy(form, false);
      }
    });
  }

  /* Password helpers ------------------------------------------------------- */
  function initPasswordTools() {
    $$("[data-toggle-password]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        button.setAttribute("aria-pressed", String(reveal));
        button.setAttribute("aria-label", reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        const icon = button.querySelector("i");
        if (icon) icon.className = `bi ${reveal ? "bi-eye-slash" : "bi-eye"}`;
        input.focus();
      });
    });

    const password = document.getElementById("registerPassword");
    const meter = document.querySelector("[data-password-meter]");
    if (!password || !meter) return;

    const labels = ["Rất yếu", "Yếu", "Trung bình", "Tốt", "Mạnh"];
    password.addEventListener("input", () => {
      const value = password.value;
      let score = 0;
      if (value.length >= 8) score += 1;
      if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
      if (value.length >= 12) score += 1;
      if (/[^A-Za-z0-9]/.test(value)) score += 1;
      const level = value ? Math.min(Math.max(score, 1), 4) : 0;
      meter.dataset.strength = String(level);
      const label = meter.querySelector("span");
      if (label) label.textContent = value ? labels[level - 1] : "Độ mạnh mật khẩu";
    });
  }

  /* Google Identity Services ----------------------------------------------- */
  function googleSlot() {
    return document.getElementById("googleButton");
  }

  function googleHint(message) {
    const hint = document.getElementById("googleHint");
    if (!hint) return;
    hint.hidden = !message;
    hint.textContent = message || "";
  }

  function showGoogleFallback() {
    const slot = googleSlot();
    if (!slot) return;
    slot.innerHTML =
      '<button class="btn btn-outline auth-google-fallback" type="button" id="googleFallback">' +
      '<i class="bi bi-google" aria-hidden="true"></i> Đăng nhập với Google</button>';
    const button = document.getElementById("googleFallback");
    if (button) {
      button.addEventListener("click", () => {
        alertBox(
          "Đăng nhập Google chưa được cấu hình. Hãy đặt googleClientId trong frontend/js/config.js và GOOGLE_CLIENT_ID trong backend/.env.",
          "error"
        );
      });
    }
  }

  function renderGoogleButton() {
    if (!googleReady || !window.google?.accounts?.id) return;
    const slot = googleSlot();
    if (!slot) return;

    slot.innerHTML = "";
    const width = Math.max(240, Math.min(360, Math.floor(slot.clientWidth || 320)));
    window.google.accounts.id.renderButton(slot, {
      type: "standard",
      theme: document.documentElement.dataset.theme === "dark" ? "filled_black" : "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "center",
      width,
      locale: "vi",
    });
  }

  async function handleGoogleCredential(response) {
    if (googleBusy) return;
    if (!response || !response.credential) {
      alertBox("Không nhận được thông tin đăng nhập từ Google. Vui lòng thử lại.", "error");
      return;
    }

    googleBusy = true;
    const slot = googleSlot();
    if (slot) slot.classList.add("is-busy");
    hideAlert();

    try {
      const payload = await post("/api/auth/google", { credential: response.credential });
      completeAuth(payload);
    } catch (error) {
      showApiError(error);
    } finally {
      googleBusy = false;
      if (slot) slot.classList.remove("is-busy");
    }
  }

  function initGoogle() {
    if (!googleSlot()) return;

    if (!GOOGLE_CLIENT_ID) {
      showGoogleFallback();
      googleHint(
        "Chưa cấu hình Google Client ID. Đặt googleClientId trong frontend/js/config.js và GOOGLE_CLIENT_ID trong backend/.env."
      );
      return;
    }

    let attempts = 0;
    const waitForGoogle = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential,
            auto_select: false,
            cancel_on_tap_outside: true,
            ux_mode: "redirect",
            use_fedcm_for_prompt: true,
          });
          googleReady = true;
          googleHint("");
          renderGoogleButton();
        } catch (error) {
          console.error("[SDRSM] Google sign-in init failed:", error);
          showGoogleFallback();
          googleHint("Không khởi tạo được Google Sign-In. Kiểm tra Client ID và Authorized JavaScript origins.");
        }
        return;
      }

      attempts += 1;
      if (attempts > 60) {
        showGoogleFallback();
        googleHint("Không tải được Google Sign-In. Kiểm tra kết nối mạng hoặc trình chặn quảng cáo.");
        return;
      }
      window.setTimeout(waitForGoogle, 200);
    };

    waitForGoogle();
    document.addEventListener("sdrsm:themechange", renderGoogleButton);
  }

  /* Boot ------------------------------------------------------------------- */
  function boot() {
    initPasswordTools();
    if (document.body.dataset.page === "login") initLogin();
    if (document.body.dataset.page === "register") initRegister();
    initGoogle();
  }

  ns.auth = {
    apiBase: API_BASE,
    request,
    post,
    logout() {
      ns.session.clear();
      window.location.href = "index.html";
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.SDRSM);

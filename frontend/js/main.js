/* ==========================================================================
   SDRSM — Shared UI behaviour
   Theme toggle, sidebar, dropdown menus, dialogs, toasts, reveal animations.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

(function (ns) {
  "use strict";

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  /* Toasts ---------------------------------------------------------------- */
  let toastStack = null;

  function toast(options) {
    const config = typeof options === "string" ? { message: options } : options || {};
    const type = config.type || "info";
    const icons = {
      success: "bi-check-circle-fill",
      info: "bi-info-circle-fill",
      warn: "bi-exclamation-triangle-fill",
      error: "bi-x-octagon-fill",
    };

    if (!toastStack) {
      toastStack = document.createElement("div");
      toastStack.className = "toast-stack";
      toastStack.setAttribute("role", "status");
      toastStack.setAttribute("aria-live", "polite");
      document.body.appendChild(toastStack);
    }

    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.innerHTML = `
      <i class="bi ${icons[type] || icons.info}" aria-hidden="true"></i>
      <div>
        ${config.title ? `<strong>${escapeHtml(config.title)}</strong>` : ""}
        <span>${escapeHtml(config.message || "")}</span>
      </div>`;
    toastStack.appendChild(el);

    const remove = () => {
      el.classList.add("is-leaving");
      window.setTimeout(() => el.remove(), 260);
    };
    window.setTimeout(remove, config.duration || 4200);
    el.addEventListener("click", remove);
  }

  /* Theme ----------------------------------------------------------------- */
  function syncThemeButtons() {
    const isDark = ns.theme.get() === "dark";
    $$("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(isDark));
      const icon = $("[data-theme-icon]", button) || $("i", button);
      if (icon) icon.className = `bi ${isDark ? "bi-sun" : "bi-moon-stars"}`;
      button.setAttribute("title", isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối");
    });
  }

  function initTheme() {
    syncThemeButtons();
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-toggle]");
      if (!button) return;
      ns.theme.toggle();
      syncThemeButtons();
    });
    document.addEventListener("sdrsm:themechange", syncThemeButtons);
  }

  /* Sidebar --------------------------------------------------------------- */
  function initSidebar() {
    if (!document.getElementById("appSidebar")) return;
    const body = document.body;

    const open = () => {
      body.classList.add("sidebar-open");
      $$("[data-sidebar-toggle]").forEach((b) => b.setAttribute("aria-expanded", "true"));
    };
    const close = () => {
      body.classList.remove("sidebar-open");
      $$("[data-sidebar-toggle]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    };

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-sidebar-toggle]")) {
        open();
        return;
      }
      if (event.target.closest("[data-sidebar-close]") || event.target.classList.contains("sidebar-overlay")) {
        close();
        return;
      }
      if (event.target.closest(".sidebar .nav-item") && window.innerWidth < 992) close();
    });

    // Overlay element injected once.
    if (!$(".sidebar-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "sidebar-overlay";
      document.body.appendChild(overlay);
    }

    // Desktop collapse preference.
    if (ns.store.get("sdrsm:sidebar-collapsed", false)) body.classList.add("sidebar-collapsed");

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-sidebar-collapse]")) return;
      const collapsed = body.classList.toggle("sidebar-collapsed");
      ns.store.set("sdrsm:sidebar-collapsed", collapsed);
      const icon = $("[data-sidebar-collapse] i");
      if (icon) icon.style.transform = collapsed ? "rotate(180deg)" : "";
    });

    const icon = $("[data-sidebar-collapse] i");
    if (icon && body.classList.contains("sidebar-collapsed")) icon.style.transform = "rotate(180deg)";

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 992) close();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  /* Dropdown menus -------------------------------------------------------- */
  function initMenus() {
    const closeAll = (except) => {
      $$("[data-menu]").forEach((menu) => {
        if (menu === except) return;
        const panel = $(".menu__panel", menu);
        const toggle = $("[data-menu-toggle]", menu);
        if (panel) panel.classList.remove("is-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    };

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-menu-toggle]");
      if (toggle) {
        const menu = toggle.closest("[data-menu]");
        const panel = $(".menu__panel", menu);
        if (!panel) return;
        const willOpen = !panel.classList.contains("is-open");
        closeAll(menu);
        panel.classList.toggle("is-open", willOpen);
        toggle.setAttribute("aria-expanded", String(willOpen));
        return;
      }
      if (!event.target.closest(".menu__panel")) closeAll();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });

    document.addEventListener("click", (event) => {
      const item = event.target.closest("[data-notif]");
      if (!item) return;
      const list = (ns.data && ns.data.notifications && ns.data.notifications()) || [];
      const notif = list.find((entry) => String(entry.id) === String(item.dataset.notif));
      toast({
        title: notif ? notif.title : "Thông báo",
        message: notif ? notif.body : "Đã mở thông báo.",
        type: notif && notif.tone === "critical" ? "warn" : "info",
      });
    });
  }

  /* Dialogs --------------------------------------------------------------- */
  function initDialogs() {
    document.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-dialog-close]");
      if (closer) {
        const dialog = closer.closest("dialog");
        if (dialog) dialog.close();
        return;
      }

      const logout = event.target.closest("[data-logout]");
      if (logout) {
        const dialog = $("#logoutDialog");
        if (dialog && typeof dialog.showModal === "function") {
          event.preventDefault();
          dialog.showModal();
        } else if (ns.session) {
          ns.session.clear();
        }
        return;
      }

      const confirmLogout = event.target.closest("[data-logout-confirm]");
      if (confirmLogout && ns.session) {
        ns.session.clear();
      }
    });

    // Click on backdrop closes the dialog.
    $$("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  /* Reveal + counters ----------------------------------------------------- */
  function animateIn() {
    const targets = $$("[data-animate]").filter((el) => el.offsetParent !== null || el.getClientRects().length);
    // Tab ẩn (mở bằng "open in new tab") tạm dừng requestAnimationFrame — bỏ animation
    // để nội dung không bị kẹt ở opacity: 0.
    if (!targets.length || !window.anime || reduceMotion() || document.hidden) return;

    targets.forEach((el) => {
      el.style.opacity = "0";
    });
    window.anime({
      targets,
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 620,
      delay: window.anime.stagger(55),
      easing: "easeOutCubic",
      complete: () => {
        targets.forEach((el) => {
          el.style.opacity = "";
          el.style.transform = "";
        });
      },
    });

    // Bảo hiểm: nếu animation bị treo (tab bị ẩn/occluded), trả lại trạng thái hiển thị.
    window.setTimeout(() => {
      targets.forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
      });
    }, 1400);
  }

  function runCounters() {
    const counters = $$("[data-countup]");
    if (!counters.length) return;

    counters.forEach((el) => {
      const target = Number(el.dataset.countup);
      if (!Number.isFinite(target)) return;
      const decimals = Number(el.dataset.decimals || 0);
      const finalText = target.toFixed(decimals);
      if (!window.anime || reduceMotion() || document.hidden) {
        el.textContent = finalText;
        return;
      }
      const state = { value: 0 };
      el.textContent = (0).toFixed(decimals);
      window.anime({
        targets: state,
        value: target,
        round: decimals ? 1 / Math.pow(10, decimals) : 1,
        duration: 1100,
        easing: "easeOutExpo",
        update: () => {
          el.textContent = decimals ? state.value.toFixed(decimals) : Math.round(state.value);
        },
        complete: () => {
          el.textContent = finalText;
        },
      });
      // Nếu animation bị gián đoạn (tab mất focus giữa chừng), ghi giá trị cuối.
      window.setTimeout(() => {
        el.textContent = finalText;
      }, 1500);
    });
  }

  /* Global search --------------------------------------------------------- */
  function initSearch() {
    const input = $("#globalSearch");
    if (!input) return;

    const routes = [
      { keywords: ["dashboard", "tong quan", "tổng quan"], href: "dashboard.html" },
      { keywords: ["danh gia", "đánh giá", "assessment", "khao sat", "khảo sát"], href: "assessment.html" },
      { keywords: ["bao cao", "báo cáo", "report"], href: "report.html" },
      { keywords: ["lich su", "lịch sử", "history"], href: "history.html" },
      { keywords: ["khuyen nghi", "khuyến nghị", "recommendation"], href: "recommendations.html" },
      { keywords: ["ho so", "hồ sơ", "profile", "cai dat", "cài đặt"], href: "profile.html" },
    ];

    document.addEventListener("keydown", (event) => {
      const tag = (event.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || event.target.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        input.focus();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const query = input.value.trim().toLowerCase();
      if (!query) return;
      const match = routes.find((route) => route.keywords.some((keyword) => keyword.includes(query) || query.includes(keyword)));
      if (match) {
        window.location.href = match.href;
        return;
      }
      toast({
        title: "Chưa có kết quả",
        message: `Không tìm thấy trang phù hợp với “${input.value.trim()}”.`,
        type: "info",
      });
    });

    input.addEventListener("input", () => {
      input.closest(".search").style.borderColor = input.value ? "var(--brand-400)" : "";
    });
  }

  /* Small view helpers ---------------------------------------------------- */
  function statusBadge(score) {
    const band = ns.risk.classify(score);
    return `<span class="badge ${band.badge}"><span class="badge-dot"></span>${band.label}</span>`;
  }

  function meter(score, extraClass) {
    const band = ns.risk.classify(score);
    return `<div class="progress progress--thin"><div class="progress__bar progress__bar--${band.key}" style="width:${ns.risk.clamp(score, 0, 100)}%"></div></div>`;
  }

  function initials(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  /* Boot ------------------------------------------------------------------ */
  if (ns.layout) ns.layout.mount();
  if (ns.store.get("sdrsm:reduce-motion", false)) document.body.classList.add("reduce-motion");
  initTheme();
  initSidebar();
  initMenus();
  initDialogs();
  initSearch();
  animateIn();
  runCounters();

  ns.ui = { $, $$, escapeHtml, toast, statusBadge, meter, initials, animateIn, runCounters, reduceMotion };

  document.dispatchEvent(new CustomEvent("sdrsm:ready"));
})(window.SDRSM);

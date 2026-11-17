/* ==========================================================================
   SDRSM — Application shell
   Sidebar + Topbar được render tập trung để mọi trang dùng chung một layout,
   tránh lặp markup và lệch design system.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

(function (ns) {
  "use strict";

  const PAGES = {
    dashboard: { title: "Dashboard", crumb: "Dashboard", group: "Tổng quan" },
    assessment: { title: "Đánh giá rủi ro", crumb: "Đánh giá rủi ro", group: "Tổng quan" },
    report: { title: "Báo cáo rủi ro", crumb: "Báo cáo rủi ro", group: "Tổng quan" },
    history: { title: "Lịch sử đánh giá", crumb: "Lịch sử đánh giá", group: "Lịch sử & tư vấn" },
    recommendations: { title: "Khuyến nghị bảo mật", crumb: "Khuyến nghị bảo mật", group: "Lịch sử & tư vấn" },
    profile: { title: "Hồ sơ & Cài đặt", crumb: "Hồ sơ", group: "Tài khoản" },
  };

  const NAV = [
    {
      label: "Tổng quan",
      items: [
        { page: "dashboard", href: "dashboard.html", icon: "bi-grid-1x2-fill", text: "Dashboard" },
        { page: "assessment", href: "assessment.html", icon: "bi-clipboard-pulse", text: "Đánh giá rủi ro" },
        { page: "report", href: "report.html", icon: "bi-file-earmark-bar-graph", text: "Báo cáo của tôi" },
      ],
    },
    {
      label: "Lịch sử & tư vấn",
      items: [
        { page: "history", href: "history.html", icon: "bi-clock-history", text: "Lịch sử đánh giá" },
        {
          page: "recommendations",
          href: "recommendations.html",
          icon: "bi-lightbulb",
          text: "Khuyến nghị bảo mật",
          badge: "5",
        },
      ],
    },
    {
      label: "Tài khoản",
      items: [
        { page: "profile", href: "profile.html", icon: "bi-person-gear", text: "Hồ sơ" },
        { page: "profile", href: "profile.html#settings", icon: "bi-gear", text: "Cài đặt", match: "settings" },
      ],
    },
  ];

  let mounted = false;

  function navMarkup(page) {
    const settingsActive = page === "profile" && window.location.hash === "#settings";
    return NAV.map((group) => {
      const items = group.items
        .map((item) => {
          let active = "";
          if (item.page === page) {
            if (item.match === "settings") active = settingsActive ? " is-active" : "";
            else active = settingsActive ? "" : " is-active";
          }
          const badge = item.badge
            ? `<span class="nav-item__badge" aria-label="${item.badge} khuyến nghị ưu tiên">${item.badge}</span>`
            : "";
          return `
            <a class="nav-item${active}" href="${item.href}">
              <i class="bi ${item.icon}" aria-hidden="true"></i><span>${item.text}</span>${badge}
            </a>`;
        })
        .join("");
      return `<p class="sidebar__label">${group.label}</p>${items}`;
    }).join("");
  }

  function notificationsMarkup() {
    const items = (ns.mockData && ns.mockData.notifications) || [];
    return items
      .map((item) => {
        const toneClass =
          item.tone === "critical" ? "stat-icon--rose" : item.tone === "low" ? "stat-icon--green" : "stat-icon--sky";
        return `
          <div class="notif-item" role="button" tabindex="0" data-notif="${item.id}">
            <span class="notif-item__icon ${toneClass}"><i class="bi ${item.icon}" aria-hidden="true"></i></span>
            <div class="notif-item__body">
              <p><strong>${item.title}</strong></p>
              <p>${item.body}</p>
              <time datetime="${item.time}">${ns.format.fromNow(item.time)}</time>
            </div>
          </div>`;
      })
      .join("");
  }

  function mount() {
    if (mounted) return;
    const page = document.body.dataset.page || "dashboard";
    const config = PAGES[page] || PAGES.dashboard;
    const user = (ns.mockData && ns.mockData.user) || { name: "Sinh viên", initials: "SV", email: "" };

    const sidebarSlot = document.getElementById("sidebar-root");
    const topbarSlot = document.getElementById("topbar-root");
    if (!sidebarSlot || !topbarSlot) return;

    document.title = `${config.title} · SDRSM`;

    sidebarSlot.innerHTML = `
      <aside class="sidebar" id="appSidebar" aria-label="Điều hướng chính">
        <div class="sidebar__brand">
          <a class="brand" href="../index.html" aria-label="SDRSM — Trang chủ">
            <span class="brand__mark"><i class="bi bi-shield-lock-fill" aria-hidden="true"></i></span>
            <span class="brand__text"><strong>SDRSM</strong><small>Digital Risk</small></span>
          </a>
          <button class="icon-btn icon-btn--ghost sidebar__close" type="button" data-sidebar-close aria-label="Đóng menu">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        <nav class="sidebar__nav">
          ${navMarkup(page)}
        </nav>

        <div class="sidebar__footer">
          <div class="sidebar__user">
            <span class="avatar" aria-hidden="true">${user.initials}</span>
            <div class="sidebar__user-meta">
              <strong>${user.name}</strong>
              <span>${user.plan || "Sinh viên"}</span>
            </div>
          </div>
          <a class="nav-item nav-item--danger" href="../index.html" data-logout>
            <i class="bi bi-box-arrow-left" aria-hidden="true"></i><span>Đăng xuất</span>
          </a>
          <button class="sidebar__collapse" type="button" data-sidebar-collapse>
            <i class="bi bi-chevrons-left" aria-hidden="true"></i>
            <span>Thu gọn menu</span>
          </button>
        </div>
      </aside>`;

    topbarSlot.innerHTML = `
      <header class="topbar">
        <div class="topbar__left">
          <button class="icon-btn topbar__hamburger" type="button" data-sidebar-toggle aria-label="Mở menu" aria-controls="appSidebar" aria-expanded="false">
            <i class="bi bi-list" aria-hidden="true"></i>
          </button>
          <div class="topbar__titles">
            <nav class="breadcrumb" aria-label="Breadcrumb">
              <a href="dashboard.html">${config.group}</a>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
              <span class="breadcrumb__current" aria-current="page">${config.crumb}</span>
            </nav>
            <h1 class="topbar__title">${config.title}</h1>
          </div>
        </div>

        <div class="topbar__right">
          <div class="search" role="search">
            <i class="bi bi-search" aria-hidden="true"></i>
            <input type="search" id="globalSearch" placeholder="Tìm kiếm nhanh…" aria-label="Tìm kiếm" autocomplete="off" />
            <kbd>/</kbd>
          </div>

          <button class="icon-btn" type="button" data-theme-toggle aria-label="Chuyển chế độ sáng/tối" title="Sáng / Tối">
            <i class="bi bi-moon-stars" data-theme-icon aria-hidden="true"></i>
          </button>

          <div class="menu" data-menu>
            <button class="icon-btn" type="button" data-menu-toggle aria-label="Thông báo" aria-haspopup="true" aria-expanded="false">
              <i class="bi bi-bell" aria-hidden="true"></i>
              <span class="notif-dot" aria-hidden="true"></span>
            </button>
            <div class="menu__panel menu__panel--wide" role="menu" aria-label="Thông báo">
              <div class="menu__head">
                <strong>Thông báo</strong>
                <span>2 chưa đọc</span>
              </div>
              ${notificationsMarkup()}
              <div class="menu__divider"></div>
              <a class="menu__item" href="recommendations.html">
                <i class="bi bi-lightbulb" aria-hidden="true"></i> Xem tất cả khuyến nghị
              </a>
            </div>
          </div>

          <div class="topbar__divider" aria-hidden="true"></div>

          <div class="menu" data-menu>
            <button class="user-btn" type="button" data-menu-toggle aria-haspopup="true" aria-expanded="false">
              <span class="avatar avatar--sm" aria-hidden="true">${user.initials}</span>
              <span class="user-btn__meta"><strong>${user.name}</strong><span>${user.studentId}</span></span>
              <i class="bi bi-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="menu__panel" role="menu" aria-label="Tài khoản">
              <div class="menu__head">
                <div>
                  <strong>${user.name}</strong><br />
                  <span>${user.email}</span>
                </div>
              </div>
              <a class="menu__item" href="profile.html"><i class="bi bi-person" aria-hidden="true"></i> Hồ sơ cá nhân</a>
              <a class="menu__item" href="profile.html#settings"><i class="bi bi-gear" aria-hidden="true"></i> Cài đặt</a>
              <a class="menu__item" href="assessment.html"><i class="bi bi-clipboard-plus" aria-hidden="true"></i> Đánh giá mới</a>
              <div class="menu__divider"></div>
              <a class="menu__item menu__item--danger" href="../index.html" data-logout>
                <i class="bi bi-box-arrow-left" aria-hidden="true"></i> Đăng xuất
              </a>
            </div>
          </div>
        </div>
      </header>

      <dialog class="modal" id="logoutDialog" aria-labelledby="logoutTitle">
        <div class="modal__head">
          <span class="modal__icon" style="background: var(--critical-soft); color: var(--critical)">
            <i class="bi bi-box-arrow-left" aria-hidden="true"></i>
          </span>
          <div>
            <h2 id="logoutTitle" style="font-size: 1rem">Đăng xuất khỏi SDRSM?</h2>
            <p class="text-muted text-sm">Dữ liệu đánh giá demo vẫn được giữ trên trình duyệt này.</p>
          </div>
          <button class="icon-btn icon-btn--ghost modal__close" type="button" data-dialog-close aria-label="Đóng">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal__foot">
          <button class="btn btn-outline" type="button" data-dialog-close>Ở lại</button>
          <a class="btn btn-danger" href="../index.html"><i class="bi bi-box-arrow-left" aria-hidden="true"></i> Đăng xuất</a>
        </div>
      </dialog>`;

    mounted = true;
    document.dispatchEvent(new CustomEvent("sdrsm:layout-mounted"));
  }

  ns.layout = { mount, PAGES };
})(window.SDRSM);

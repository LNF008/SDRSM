/* ==========================================================================
   SDRSM — Profile & settings page
   ========================================================================== */

(function (ns) {
  "use strict";

  const user = ns.mockData.user;
  const assessment = ns.data.currentAssessment();
  const level = ns.risk.classify(assessment.overallRisk);
  const recStats = ns.data.recommendationStats();

  /* Profile data ---------------------------------------------------------- */
  document.getElementById("profileAvatar").textContent = user.initials;
  document.getElementById("profileName").textContent = user.name;
  document.getElementById("profileEmail").textContent = user.email;
  document.getElementById("profileStudentId").textContent = user.studentId;
  document.getElementById("profileFaculty").textContent = user.faculty;
  document.getElementById("profileYear").textContent = user.year;

  document.getElementById("inputFullName").value = user.name;
  document.getElementById("inputEmail").value = user.email;
  document.getElementById("inputStudentId").value = user.studentId;
  document.getElementById("inputFaculty").value = user.faculty;
  document.getElementById("inputYear").value = user.year;
  document.getElementById("inputJoined").value = ns.format.formatDate(user.joinedAt);

  document.getElementById("profileRiskLevel").textContent = `${level.label} · ${assessment.overallRisk}/100`;
  document.getElementById("profileLastAssessment").textContent = ns.format.formatDate(assessment.date);
  document.getElementById("profileRecDone").textContent = `${recStats.done}/${recStats.total}`;

  /* Activity -------------------------------------------------------------- */
  document.getElementById("activityList").innerHTML = ns.mockData.activity
    .map(
      (item) => `
        <div class="notif-item">
          <span class="notif-item__icon stat-icon--indigo"><i class="bi ${item.icon}" aria-hidden="true"></i></span>
          <div class="notif-item__body">
            <p>${ns.ui.escapeHtml(item.text)}</p>
            <time datetime="${item.time}">${ns.format.fromNow(item.time)}</time>
          </div>
        </div>`
    )
    .join("");

  /* Tabs ------------------------------------------------------------------ */
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  function activateTab(name, updateHash) {
    const valid = tabs.some((tab) => tab.dataset.tab === name) ? name : "profile";
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === valid;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    panels.forEach((panel) => panel.classList.toggle("is-active", panel.id === `tab-${valid}`));

    if (updateHash) {
      try {
        const url = valid === "profile" ? "profile.html" : `profile.html#${valid}`;
        window.history.replaceState({}, "", url);
      } catch (error) {
        console.warn("[SDRSM] Không thể cập nhật hash:", error);
      }
      ns.store.set(ns.store.KEYS.currentTab, valid);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab, true));
  });

  const hashTab = window.location.hash.replace("#", "");
  if (hashTab) activateTab(hashTab, false);

  /* Edit profile (demo only) ---------------------------------------------- */
  const editButton = document.getElementById("editProfileBtn");
  const editableInputs = ["inputFullName", "inputEmail", "inputStudentId", "inputFaculty", "inputYear"].map((id) =>
    document.getElementById(id)
  );
  let editing = false;

  editButton.addEventListener("click", () => {
    editing = !editing;
    editableInputs.forEach((input) => {
      input.disabled = !editing;
    });
    editButton.innerHTML = editing
      ? '<i class="bi bi-save" aria-hidden="true"></i> Lưu thay đổi'
      : '<i class="bi bi-pencil" aria-hidden="true"></i> Chỉnh sửa hồ sơ';

    if (!editing) {
      const name = document.getElementById("inputFullName").value.trim() || user.name;
      document.getElementById("profileName").textContent = name;
      document.getElementById("profileAvatar").textContent = ns.ui.initials(name);
      ns.ui.toast({
        title: "Đã lưu hồ sơ (demo)",
        message: "Thay đổi chỉ hiển thị trong phiên này vì Backend chưa được kết nối.",
        type: "success",
      });
    }
  });

  /* Security -------------------------------------------------------------- */
  document.getElementById("twoFactorToggle").addEventListener("change", (event) => {
    const enabled = event.target.checked;
    ns.ui.toast({
      title: enabled ? "Đã bật 2FA (demo)" : "Đã tắt 2FA (demo)",
      message: enabled
        ? "Trong sản phẩm thật, hệ thống sẽ hiển thị mã QR để quét bằng Authenticator."
        : "Tắt 2FA làm tăng đáng kể nguy cơ chiếm tài khoản.",
      type: enabled ? "success" : "warn",
    });
  });

  document.getElementById("changePasswordBtn").addEventListener("click", () => {
    const current = document.getElementById("currentPassword");
    const next = document.getElementById("newPassword");

    if (!current.value || !next.value) {
      ns.ui.toast({ title: "Thiếu thông tin", message: "Nhập mật khẩu hiện tại và mật khẩu mới.", type: "warn" });
      return;
    }
    if (next.value.length < 12) {
      ns.ui.toast({ title: "Mật khẩu quá ngắn", message: "Dùng tối thiểu 12 ký tự hoặc một cụm mật khẩu dài.", type: "warn" });
      return;
    }
    current.value = "";
    next.value = "";
    ns.ui.toast({
      title: "Mật khẩu đã được cập nhật (demo)",
      message: "Giao diện mô phỏng thành công — chưa có API xử lý thật.",
      type: "success",
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-revoke-session]")) return;
    ns.ui.toast({
      title: "Đã đăng xuất thiết bị (demo)",
      message: "Trong hệ thống thật, phiên đăng nhập sẽ bị thu hồi ngay lập tức.",
      type: "info",
    });
  });

  /* Clear demo data ------------------------------------------------------- */
  let clearDialog = null;

  function openClearDialog() {
    if (!clearDialog) {
      clearDialog = document.createElement("dialog");
      clearDialog.className = "modal";
      clearDialog.innerHTML = `
        <div class="modal__head">
          <span class="modal__icon" style="background: var(--critical-soft); color: var(--critical)">
            <i class="bi bi-trash3" aria-hidden="true"></i>
          </span>
          <div>
            <h2 style="font-size:1rem">Xoá toàn bộ dữ liệu demo?</h2>
            <p class="text-muted text-sm">Câu trả lời, báo cáo và trạng thái khuyến nghị sẽ bị xoá khỏi trình duyệt này.</p>
          </div>
          <button class="icon-btn icon-btn--ghost modal__close" type="button" data-dialog-close aria-label="Đóng">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal__foot">
          <button class="btn btn-outline" type="button" data-dialog-close>Huỷ</button>
          <button class="btn btn-danger" type="button" id="confirmClearBtn">
            <i class="bi bi-trash3" aria-hidden="true"></i> Xoá dữ liệu
          </button>
        </div>`;
      document.body.appendChild(clearDialog);
      clearDialog.addEventListener("click", (event) => {
        if (event.target === clearDialog) clearDialog.close();
      });
    }
    clearDialog.showModal();
    clearDialog.querySelector("#confirmClearBtn").onclick = () => {
      const keys = [
        ns.store.KEYS.lastAssessment,
        ns.store.KEYS.assessmentDraft,
        ns.store.KEYS.completedRecommendations,
        ns.store.KEYS.currentTab,
      ];
      keys.forEach((key) => ns.store.remove(key));
      clearDialog.close();
      ns.ui.toast({ title: "Đã xoá dữ liệu demo", message: "Đang tải lại giao diện…", type: "success" });
      window.setTimeout(() => window.location.reload(), 800);
    };
  }

  document.getElementById("clearDemoDataBtn").addEventListener("click", openClearDialog);

  /* Settings -------------------------------------------------------------- */
  const PREF_KEY = "sdrsm:prefs";
  const prefs = ns.store.get(PREF_KEY, { reminder: true, critical: true, newsletter: false });
  const prefsMap = {
    prefReminder: "reminder",
    prefCritical: "critical",
    prefNewsletter: "newsletter",
  };

  Object.keys(prefsMap).forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.checked = Boolean(prefs[prefsMap[id]]);
  });

  const themeSelect = document.getElementById("themeSelect");
  themeSelect.value = ns.theme.get();
  themeSelect.addEventListener("change", () => {
    ns.theme.set(themeSelect.value);
    ns.ui.toast({ message: `Đã chuyển sang chế độ ${themeSelect.value === "dark" ? "tối" : "sáng"}.`, type: "info" });
  });

  const reduceMotionToggle = document.getElementById("reduceMotionToggle");
  reduceMotionToggle.checked = ns.store.get("sdrsm:reduce-motion", false);
  reduceMotionToggle.addEventListener("change", () => {
    const enabled = reduceMotionToggle.checked;
    ns.store.set("sdrsm:reduce-motion", enabled);
    document.body.classList.toggle("reduce-motion", enabled);
    ns.ui.toast({
      message: enabled ? "Đã bật chế độ giảm chuyển động." : "Đã bật lại hiệu ứng chuyển động.",
      type: "info",
    });
  });

  document.getElementById("saveSettingsBtn").addEventListener("click", () => {
    const next = {
      reminder: document.getElementById("prefReminder").checked,
      critical: document.getElementById("prefCritical").checked,
      newsletter: document.getElementById("prefNewsletter").checked,
    };
    ns.store.set(PREF_KEY, next);
    ns.ui.toast({
      title: "Đã lưu tuỳ chọn",
      message: "Cài đặt được lưu trên trình duyệt này (demo).",
      type: "success",
    });
  });
})(window.SDRSM);

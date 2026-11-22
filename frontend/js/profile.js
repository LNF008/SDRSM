/* ==========================================================================
   SDRSM — Profile & settings page
   ========================================================================== */

(function (ns) {
  "use strict";

  function initialsFrom(name) {
    return String(name || "SV")
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  function persistSessionUser(updated) {
    const session = ns.session && ns.session.get();
    if (!session) return;
    session.user = Object.assign({}, session.user || {}, updated);
    ns.store.set(ns.store.KEYS.authSession, session);
  }

  async function boot() {
    const data = await ns.data.ready();
    const user = data.user || (ns.session.get() || {}).user || {};

    const profile = {
      name: user.fullName || user.name || "Sinh viên",
      email: user.email || "",
      studentId: user.studentId || "",
      faculty: user.faculty || "",
      year: user.year || "",
      joinedAt: user.joinedAt || "",
      initials: user.initials || initialsFrom(user.fullName || user.name),
    };

    /* Profile data -------------------------------------------------------- */
    document.getElementById("profileAvatar").textContent = profile.initials;
    document.getElementById("profileName").textContent = profile.name;
    document.getElementById("profileEmail").textContent = profile.email;
    document.getElementById("profileStudentId").textContent = profile.studentId || "Chưa cập nhật";
    document.getElementById("profileFaculty").textContent = profile.faculty || "Chưa cập nhật";
    document.getElementById("profileYear").textContent = profile.year || "Chưa cập nhật";

    document.getElementById("inputFullName").value = profile.name;
    document.getElementById("inputEmail").value = profile.email;
    document.getElementById("inputStudentId").value = profile.studentId;
    document.getElementById("inputFaculty").value = profile.faculty;
    document.getElementById("inputYear").value = profile.year;
    document.getElementById("inputJoined").value = ns.format.formatDate(profile.joinedAt);

    if (data.hasAssessment && data.latest) {
      const assessment = data.latest;
      const level = ns.risk.classify(assessment.overallRisk);
      const stats = ns.data.recommendationStats();
      document.getElementById("profileRiskLevel").textContent = `${level.label} · ${assessment.overallRisk}/100`;
      document.getElementById("profileLastAssessment").textContent = ns.format.formatDate(assessment.date);
      document.getElementById("profileRecDone").textContent = `${stats.done}/${stats.total}`;
    } else {
      document.getElementById("profileRiskLevel").textContent = "Chưa đánh giá";
      document.getElementById("profileLastAssessment").textContent = "—";
      document.getElementById("profileRecDone").textContent = "0/0";
    }

    /* Activity ------------------------------------------------------------ */
    const activity = data.activity || [];
    document.getElementById("activityList").innerHTML = activity.length
      ? activity
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
          .join("")
      : `<div class="empty-state"><i class="bi bi-clock-history" aria-hidden="true"></i><p>Chưa có hoạt động nào.</p></div>`;

    /* Tabs ---------------------------------------------------------------- */
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

    /* Edit profile -------------------------------------------------------- */
    const editButton = document.getElementById("editProfileBtn");
    const editableInputs = ["inputFullName", "inputEmail", "inputStudentId", "inputFaculty", "inputYear"].map((id) =>
      document.getElementById(id)
    );
    let editing = false;
    let saving = false;

    editButton.addEventListener("click", async () => {
      if (saving) return;

      if (!editing) {
        editing = true;
        editableInputs.forEach((input) => {
          input.disabled = false;
        });
        editButton.innerHTML = '<i class="bi bi-save" aria-hidden="true"></i> Lưu thay đổi';
        document.getElementById("inputFullName").focus();
        return;
      }

      const payload = {
        fullName: document.getElementById("inputFullName").value.trim(),
        email: document.getElementById("inputEmail").value.trim(),
        studentId: document.getElementById("inputStudentId").value.trim(),
        faculty: document.getElementById("inputFaculty").value.trim(),
        year: document.getElementById("inputYear").value.trim(),
      };

      if (payload.fullName.length < 2) {
        ns.ui.toast({ title: "Họ tên chưa hợp lệ", message: "Họ và tên phải có ít nhất 2 ký tự.", type: "warn" });
        return;
      }
      if (!payload.email) {
        ns.ui.toast({ title: "Thiếu email", message: "Vui lòng nhập email.", type: "warn" });
        return;
      }

      saving = true;
      editButton.disabled = true;
      try {
        const updated = await ns.api.patch("/api/users/me", payload);
        Object.assign(user, updated);
        persistSessionUser(updated);

        profile.name = updated.fullName || profile.name;
        profile.email = updated.email || profile.email;
        profile.studentId = updated.studentId || "";
        profile.faculty = updated.faculty || "";
        profile.year = updated.year || "";
        profile.initials = updated.initials || initialsFrom(profile.name);

        document.getElementById("profileAvatar").textContent = profile.initials;
        document.getElementById("profileName").textContent = profile.name;
        document.getElementById("profileEmail").textContent = profile.email;
        document.getElementById("profileStudentId").textContent = profile.studentId || "Chưa cập nhật";
        document.getElementById("profileFaculty").textContent = profile.faculty || "Chưa cập nhật";
        document.getElementById("profileYear").textContent = profile.year || "Chưa cập nhật";

        editing = false;
        editableInputs.forEach((input) => {
          input.disabled = true;
        });
        editButton.innerHTML = '<i class="bi bi-pencil" aria-hidden="true"></i> Chỉnh sửa hồ sơ';
        ns.ui.toast({ title: "Đã lưu hồ sơ", message: "Thông tin tài khoản đã được cập nhật.", type: "success" });
      } catch (error) {
        ns.ui.toast({
          title: "Chưa lưu được hồ sơ",
          message: error && error.message ? error.message : "Vui lòng thử lại.",
          type: "error",
        });
      } finally {
        saving = false;
        editButton.disabled = false;
      }
    });

    /* Change password ----------------------------------------------------- */
    document.getElementById("changePasswordBtn").addEventListener("click", async () => {
      const current = document.getElementById("currentPassword");
      const next = document.getElementById("newPassword");
      const button = document.getElementById("changePasswordBtn");

      if (!current.value || !next.value) {
        ns.ui.toast({ title: "Thiếu thông tin", message: "Nhập mật khẩu hiện tại và mật khẩu mới.", type: "warn" });
        return;
      }
      if (next.value.length < 8) {
        ns.ui.toast({ title: "Mật khẩu quá ngắn", message: "Dùng tối thiểu 8 ký tự, gồm cả chữ và số.", type: "warn" });
        return;
      }

      button.disabled = true;
      try {
        await ns.api.patch("/api/users/me", {
          currentPassword: current.value,
          newPassword: next.value,
        });
        current.value = "";
        next.value = "";
        ns.ui.toast({ title: "Đã đổi mật khẩu", message: "Lần đăng nhập tiếp theo hãy dùng mật khẩu mới.", type: "success" });
      } catch (error) {
        ns.ui.toast({
          title: "Chưa đổi được mật khẩu",
          message: error && error.message ? error.message : "Vui lòng thử lại.",
          type: "error",
        });
      } finally {
        button.disabled = false;
      }
    });

    /* Current session ----------------------------------------------------- */
    const session = ns.session && ns.session.get();
    const sessionInfo = document.getElementById("currentSessionInfo");
    if (sessionInfo) {
      sessionInfo.textContent = session && session.expiresAt
        ? `Hết hạn ${ns.format.formatDateTime(session.expiresAt)}`
        : "Phiên đăng nhập hiện tại";
    }

    /* Settings ------------------------------------------------------------ */
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
        message: "Cài đặt được lưu trên trình duyệt này.",
        type: "success",
      });
    });

    ns.ui.animateIn();
  }

  boot().catch((error) => {
    console.error("[SDRSM] Profile load failed:", error);
    ns.ui.toast({
      title: "Không tải được hồ sơ",
      message: error && error.message ? error.message : "Vui lòng thử lại.",
      type: "error",
    });
  });
})(window.SDRSM);

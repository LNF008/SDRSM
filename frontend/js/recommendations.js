/* ==========================================================================
   SDRSM — Security recommendations page
   ========================================================================== */

(function (ns) {
  "use strict";

  const state = { priority: "all", hideDone: false };
  const PRIORITY_LABELS = {
    all: "Tất cả",
    critical: "Nghiêm trọng",
    high: "Cao",
    medium: "Trung bình",
    low: "Thấp",
  };
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const TIME_TO_FIX = { critical: "~10 phút", high: "~15 phút", medium: "~20 phút", low: "~5 phút" };

  const statsEl = document.getElementById("recStats");
  const filterEl = document.getElementById("priorityFilter");
  const groupsEl = document.getElementById("recommendationGroups");
  const hideDoneEl = document.getElementById("hideDone");

  function renderStats(stats) {
    const percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
    statsEl.innerHTML = `
      <article class="stat-card" style="--stat-glow: rgba(16,185,129,.16)">
        <div class="stat-card__top">
          <span class="stat-icon stat-icon--green"><i class="bi bi-check2-circle" aria-hidden="true"></i></span>
          <span class="trend trend--down">${percent}%</span>
        </div>
        <p class="stat-card__label">Đã hoàn thành</p>
        <div class="stat-card__value">${stats.done}<small>/ ${stats.total} khuyến nghị</small></div>
        <div class="progress progress--thin" style="margin-top:2px">
          <div class="progress__bar progress__bar--low" style="width:${percent}%"></div>
        </div>
      </article>

      <article class="stat-card" style="--stat-glow: rgba(225,29,72,.16)">
        <div class="stat-card__top">
          <span class="stat-icon stat-icon--rose"><i class="bi bi-exclamation-octagon-fill" aria-hidden="true"></i></span>
          <span class="badge badge--critical">Ưu tiên</span>
        </div>
        <p class="stat-card__label">Nghiêm trọng còn lại</p>
        <div class="stat-card__value">${stats.criticalOpen}<small>việc cần xử lý</small></div>
        <p class="stat-card__desc">Xử lý trong 24 giờ để giảm rủi ro chiếm tài khoản.</p>
      </article>

      <article class="stat-card" style="--stat-glow: rgba(99,102,241,.16)">
        <div class="stat-card__top">
          <span class="stat-icon stat-icon--indigo"><i class="bi bi-list-task" aria-hidden="true"></i></span>
          <span class="trend trend--flat">${stats.open} đang mở</span>
        </div>
        <p class="stat-card__label">Tiến độ cải thiện</p>
        <div class="stat-card__value">${percent}<small>%</small></div>
        <p class="stat-card__desc">Mỗi khuyến nghị hoàn thành đều giúp giảm điểm rủi ro tổng thể.</p>
      </article>`;
  }

  function renderFilters(all) {
    const counts = all.reduce((acc, rec) => {
      acc.all += 1;
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    }, { all: 0 });

    filterEl.innerHTML = Object.keys(PRIORITY_LABELS)
      .map(
        (key) => `
        <button class="filter-pill${state.priority === key ? " is-active" : ""}" type="button" data-priority="${key}" aria-pressed="${state.priority === key}">
          ${PRIORITY_LABELS[key]} <span>${counts[key] || 0}</span>
        </button>`
      )
      .join("");
  }

  function pillarGroups(all) {
    const map = new Map();
    all.forEach((rec) => {
      if (rec.pillar && !map.has(rec.pillar.id)) map.set(rec.pillar.id, rec.pillar);
    });
    return Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function recCard(rec) {
    const meta = ns.risk.PRIORITIES[rec.priority] || ns.risk.PRIORITIES.medium;
    const pillar = rec.pillar || {};
    return `
      <article class="rec-card${rec.done ? " is-done" : ""}" id="rec-${rec.id}">
        <div class="rec-card__top">
          <span class="rec-card__icon" style="color:${pillar.color || "#6366f1"};background:${pillar.soft || "rgba(99,102,241,.13)"}">
            <i class="bi ${rec.icon}" aria-hidden="true"></i>
          </span>
          <div style="min-width:0">
            <p class="rec-card__title">${ns.ui.escapeHtml(rec.title)}</p>
            <p class="rec-card__pillar">${ns.ui.escapeHtml(pillar.name || "")}${pillar.weight ? ` · ${pillar.weight}%` : ""}</p>
          </div>
          <span class="badge ${meta.badge}" style="margin-left:auto;flex:0 0 auto">${meta.label}</span>
        </div>

        <p class="rec-card__desc">${ns.ui.escapeHtml(rec.description)}</p>

        <div class="rec-card__action">
          <i class="bi bi-arrow-right-circle" aria-hidden="true"></i>
          <span>${ns.ui.escapeHtml(rec.action)}</span>
        </div>

        <div class="rec-card__foot">
          <span class="text-xs text-muted"><i class="bi bi-clock" aria-hidden="true"></i> ${rec.timeToFix || TIME_TO_FIX[rec.priority] || "~15 phút"}</span>
          <button class="btn btn-sm ${rec.done ? "btn-soft" : "btn-outline"}" type="button" data-toggle-rec="${rec.id}">
            <i class="bi ${rec.done ? "bi-check2-circle" : "bi-circle"}" aria-hidden="true"></i>
            ${rec.done ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
          </button>
        </div>
      </article>`;
  }

  function renderGroups(all) {
    const pillars = pillarGroups(all);
    let renderedGroups = 0;

    groupsEl.innerHTML = pillars
      .map((pillar) => {
        const items = all
          .filter((rec) => rec.pillar && rec.pillar.id === pillar.id)
          .filter((rec) => state.priority === "all" || rec.priority === state.priority)
          .filter((rec) => !state.hideDone || !rec.done)
          .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

        if (!items.length) return "";
        renderedGroups += 1;
        const open = items.filter((item) => !item.done).length;

        return `
          <section class="panel section-gap" data-animate>
            <div class="panel__head panel__head--bordered">
              <div>
                <h2 class="panel__title">
                  <span class="stat-icon" style="width:30px;height:30px;font-size:.85rem;color:${pillar.color};background:${pillar.soft}">
                    <i class="bi ${pillar.icon}" aria-hidden="true"></i>
                  </span>
                  ${pillar.name}
                </h2>
                <p class="panel__sub">${pillar.english} · trọng số ${pillar.weight}%</p>
              </div>
              <span class="badge ${open ? "badge--neutral" : "badge--low"}">
                ${open ? `${open} việc cần làm` : "Đã hoàn thành"}
              </span>
            </div>
            <div class="panel__body">
              <div class="rec-grid">${items.map(recCard).join("")}</div>
            </div>
          </section>`;
      })
      .join("");

    if (!renderedGroups) {
      groupsEl.innerHTML = `
        <section class="panel section-gap">
          <div class="panel__body">
            <div class="empty-state">
              <i class="bi bi-check2-all" aria-hidden="true"></i>
              <p>Không có khuyến nghị nào khớp với bộ lọc hiện tại. Hãy thử chọn mức ưu tiên khác.</p>
            </div>
          </div>
        </section>`;
    }
  }

  function render() {
    const all = ns.data.recommendations();
    const stats = ns.data.recommendationStats(all);
    renderStats(stats);
    renderFilters(all);
    renderGroups(all);
    hideDoneEl.checked = state.hideDone;
  }

  async function boot() {
    const data = await ns.data.requireAssessment();
    if (!data) return;

    filterEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-priority]");
      if (!button) return;
      state.priority = button.dataset.priority;
      render();
    });

    hideDoneEl.addEventListener("change", () => {
      state.hideDone = hideDoneEl.checked;
      renderGroups(ns.data.recommendations());
    });

    groupsEl.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-toggle-rec]");
      if (!button) return;
      const id = button.dataset.toggleRec;
      const current = ns.data.recommendations().find((rec) => String(rec.id) === String(id));
      const nextDone = !(current && current.done);

      button.disabled = true;
      try {
        await ns.data.setRecommendationDone(id, nextDone);
        ns.ui.toast({
          title: nextDone ? "Đã đánh dấu hoàn thành" : "Đã mở lại khuyến nghị",
          message: nextDone
            ? "Tiến độ đã được lưu vào tài khoản của bạn."
            : "Khuyến nghị được chuyển về trạng thái cần xử lý.",
          type: nextDone ? "success" : "info",
        });
        render();
      } catch (error) {
        button.disabled = false;
        ns.ui.toast({
          title: "Chưa thể cập nhật",
          message: error && error.message ? error.message : "Vui lòng thử lại.",
          type: "error",
        });
      }
    });

    render();
    ns.ui.animateIn();
  }

  boot().catch((error) => {
    console.error("[SDRSM] Recommendations load failed:", error);
    ns.ui.toast({
      title: "Không tải được khuyến nghị",
      message: error && error.message ? error.message : "Vui lòng thử lại.",
      type: "error",
    });
  });
})(window.SDRSM);

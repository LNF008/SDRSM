/* ==========================================================================
   SDRSM — Risk report page
   ========================================================================== */

(function (ns) {
  "use strict";

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const params = new URLSearchParams(window.location.search);
  const requestedId = (params.get("id") || "").trim();

  function attachPillar(rec, pillars) {
    if (rec.pillar) return rec;
    const pillar = pillars[rec.pillarId] || null;
    return Object.assign({}, rec, { pillar });
  }

  function renderRecommendations(container, recs) {
    const open = recs
      .filter((rec) => !rec.done)
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 4);

    if (!open.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-check2-circle" aria-hidden="true"></i>
          <p>Bạn đã đánh dấu hoàn thành toàn bộ khuyến nghị. Hãy đánh giá lại để cập nhật điểm rủi ro.</p>
        </div>`;
      return;
    }

    container.innerHTML = open
      .map((rec) => {
        const meta = ns.risk.PRIORITIES[rec.priority] || ns.risk.PRIORITIES.medium;
        return `
          <div class="rec-item">
            <span class="rec-item__icon stat-icon--${rec.priority === "critical" ? "rose" : rec.priority === "high" ? "amber" : "sky"}">
              <i class="bi ${rec.icon}" aria-hidden="true"></i>
            </span>
            <div class="rec-item__body">
              <p class="rec-item__title">
                ${ns.ui.escapeHtml(rec.title)}
                <span class="badge ${meta.badge}">${meta.label}</span>
              </p>
              <p class="rec-item__desc">${ns.ui.escapeHtml(rec.description)}</p>
              <div class="rec-item__meta">
                <span class="text-xs text-muted"><i class="bi bi-diagram-3" aria-hidden="true"></i> ${rec.pillar ? ns.ui.escapeHtml(rec.pillar.shortName) : ""}</span>
                <button class="btn btn-sm btn-ghost" type="button" data-rec-done="${rec.id}">
                  <i class="bi bi-check2" aria-hidden="true"></i> Đã xử lý
                </button>
              </div>
            </div>
          </div>`;
      })
      .join("");
  }

  async function boot() {
    let assessment;
    let comparison;
    let recs;

    if (requestedId) {
      assessment = await ns.data.getAssessment(requestedId);
      comparison = assessment.comparison || { previous: null, delta: 0, direction: "flat", improved: false };
      const map = ns.data.pillarMap(assessment.pillars || []);
      recs = (assessment.recommendations || []).map((rec) => attachPillar(rec, map));
    } else {
      const data = await ns.data.requireAssessment();
      if (!data) return;
      assessment = ns.data.currentAssessment();
      comparison = ns.data.comparison();
      recs = ns.data.recommendations().slice();
    }

    const level = ns.risk.classify(assessment.overallRisk);
    const pillarMap = requestedId
      ? ns.data.pillarMap(assessment.pillars || [])
      : ns.data.pillarMap(assessment.pillars || []);
    const alerts = assessment.alerts || [];

    /* Hero ---------------------------------------------------------------- */
    document.getElementById("reportScore").textContent = assessment.overallRisk;
    document.getElementById("reportId").textContent = assessment.id;
    document.getElementById("reportDate").textContent = ns.format.formatDate(assessment.date);
    document.getElementById("reportAlertCount").textContent = alerts.length;
    document.getElementById("reportSource").textContent = "Hệ thống SDRSM";

    const levelBadge = document.getElementById("reportLevelBadge");
    levelBadge.className = `badge ${level.badge}`;
    levelBadge.textContent = level.label;
    document.getElementById("reportLevelTitle").textContent = `Mức rủi ro: ${level.label}`;
    document.getElementById("reportLevelDesc").textContent = level.description;

    document.getElementById("reportPrevious").textContent =
      comparison.previous === null || comparison.previous === undefined ? "—" : `${comparison.previous}/100`;

    const deltaEl = document.getElementById("reportDelta");
    if (!comparison.delta) {
      deltaEl.textContent = "Không đổi";
      deltaEl.style.color = "var(--muted)";
    } else {
      const improved = comparison.delta < 0;
      deltaEl.textContent = `${comparison.delta > 0 ? "+" : ""}${comparison.delta} điểm`;
      deltaEl.style.color = improved ? "var(--low)" : "var(--critical)";
      deltaEl.innerHTML = `<i class="bi ${improved ? "bi-arrow-down-right" : "bi-arrow-up-right"}" aria-hidden="true"></i> ${deltaEl.textContent}`;
    }

    ns.charts.doughnut(document.getElementById("reportDoughnut"), {
      value: assessment.overallRisk,
      color: level.hex,
      cutout: "76%",
    });

    /* Pillar breakdown ---------------------------------------------------- */
    document.getElementById("pillarBreakdown").innerHTML = assessment.pillars
      .map((pillar) => {
        const band = ns.risk.classify(pillar.score);
        return `
          <details class="pillar-details">
            <summary class="pillar-row">
              <div class="pillar-row__head">
                <span class="pillar-row__name">
                  <span class="pillar-row__dot" style="--pillar-color: ${pillar.color}"></span>
                  ${pillar.name}
                  <i class="bi bi-chevron-right pillar-row__chev" aria-hidden="true"></i>
                </span>
                <span class="pillar-row__score" style="color: ${band.hex}">${pillar.score}<span class="text-muted" style="font-size:.7rem;font-weight:500">/100</span></span>
              </div>
              <div class="progress progress--thin">
                <div class="progress__bar progress__bar--${band.key}" style="width: ${pillar.score}%"></div>
              </div>
              <div class="pillar-row__sub">
                <span>Trọng số ${pillar.weight}% · ${pillar.english}</span>
                <span>${band.label}</span>
              </div>
            </summary>
            <div class="indicator-list">
              ${pillar.indicators
                .map((indicator) => {
                  const indicatorBand = ns.risk.classify(indicator.score);
                  return `
                    <div class="indicator-row">
                      <span>${indicator.name} <span class="text-muted text-xs">(${indicator.weight}%)</span></span>
                      <span style="color: ${indicatorBand.hex}">${indicator.score}</span>
                    </div>
                    <div class="progress progress--thin" style="grid-column: 1 / -1; margin-top:-6px">
                      <div class="progress__bar progress__bar--${indicatorBand.key}" style="width:${indicator.score}%"></div>
                    </div>`;
                })
                .join("")}
            </div>
          </details>`;
      })
      .join("");

    /* Alerts -------------------------------------------------------------- */
    const alertList = document.getElementById("alertList");
    document.getElementById("alertBadge").textContent = `${alerts.length} cảnh báo`;

    if (alerts.length) {
      alertList.innerHTML = alerts
        .map((alert) => {
          const pillar = pillarMap[alert.pillarId];
          return `
            <article class="alert-card">
              <div class="alert-card__body">
                <p class="alert-card__title">${ns.ui.escapeHtml(alert.title)}</p>
                <p class="alert-card__desc">${ns.ui.escapeHtml(alert.description)}</p>
                <div class="alert-card__tag chip-row">
                  <span class="badge badge--critical"><i class="bi bi-exclamation-octagon" aria-hidden="true"></i> Nghiêm trọng</span>
                  <span class="badge badge--neutral">${pillar ? pillar.shortName : ns.ui.escapeHtml(alert.impact || "Tài khoản")}</span>
                  <a class="link-arrow" href="recommendations.html">Cách khắc phục <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
                </div>
              </div>
            </article>`;
        })
        .join("");
    } else {
      alertList.innerHTML = `
        <div class="risk-note" style="border-style: solid; border-color: rgba(16,185,129,.4)">
          <i class="bi bi-shield-check" style="color: var(--low)" aria-hidden="true"></i>
          <span>Không phát hiện lỗi nghiêm trọng nào trong lần đánh giá này. Hãy duy trì thói quen an toàn và đánh giá lại sau 4–6 tuần.</span>
        </div>`;
    }

    /* Charts -------------------------------------------------------------- */
    const values = assessment.pillars.map((pillar) => pillar.score);
    const labels = assessment.pillars.map((pillar) => pillar.shortName);
    const colors = assessment.pillars.map((pillar) => pillar.color);

    ns.charts.radar(document.getElementById("reportRadar"), { labels, values, colors });
    ns.charts.bar(document.getElementById("reportBar"), { labels, values, colors });

    /* Recommendations ----------------------------------------------------- */
    const recContainer = document.getElementById("reportRecommendations");
    renderRecommendations(recContainer, recs);

    recContainer.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-rec-done]");
      if (!button) return;
      const id = button.dataset.recDone;
      button.disabled = true;
      try {
        const result = await ns.data.setRecommendationDone(id, true);
        const target = recs.find((rec) => String(rec.id) === String(id));
        if (target && result.item) Object.assign(target, result.item, { pillar: target.pillar });
        ns.ui.toast({
          title: "Đã ghi nhận",
          message: "Khuyến nghị được chuyển sang trạng thái hoàn thành.",
          type: "success",
        });
        renderRecommendations(recContainer, recs);
      } catch (error) {
        button.disabled = false;
        ns.ui.toast({
          title: "Chưa thể cập nhật",
          message: error && error.message ? error.message : "Vui lòng thử lại.",
          type: "error",
        });
      }
    });

    /* Actions ------------------------------------------------------------- */
    document.getElementById("downloadReport").addEventListener("click", () => {
      ns.ui.toast({
        title: "Xuất báo cáo",
        message: "Đang mở hộp thoại in — chọn “Lưu thành PDF” để tải báo cáo.",
        type: "info",
      });
      window.setTimeout(() => window.print(), 450);
    });

    document.getElementById("shareReport").addEventListener("click", async () => {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        ns.ui.toast({ title: "Đã sao chép liên kết", message: "Chia sẻ đường dẫn báo cáo cho bạn bè.", type: "success" });
      } catch (error) {
        ns.ui.toast({ title: "Chưa thể chia sẻ", message: "Trình duyệt không cho phép truy cập clipboard trong ngữ cảnh này.", type: "warn" });
      }
    });

    /* Just finished an assessment? --------------------------------------- */
    if (params.get("from") === "assessment") {
      window.setTimeout(() => {
        ns.ui.toast({
          title: "Đã cập nhật báo cáo",
          message: `Điểm rủi ro mới của bạn là ${assessment.overallRisk}/100 (${level.label}).`,
          type: assessment.overallRisk > 49 ? "warn" : "success",
        });
      }, 500);
      try {
        window.history.replaceState({}, "", "report.html");
      } catch (error) {
        console.warn("[SDRSM] Không thể xoá query string:", error);
      }
    }

    ns.ui.animateIn();
  }

  boot().catch((error) => {
    console.error("[SDRSM] Report load failed:", error);
    ns.ui.toast({
      title: "Không tải được báo cáo",
      message: error && error.message ? error.message : "Vui lòng thử lại.",
      type: "error",
    });
  });
})(window.SDRSM);

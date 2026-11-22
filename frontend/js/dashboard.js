/* ==========================================================================
   SDRSM — Dashboard page
   ========================================================================== */

(function (ns) {
  "use strict";

  function statCard(config) {
    const trend = config.trend
      ? `<span class="trend trend--${config.trend.tone}">
           <i class="bi ${config.trend.icon}" aria-hidden="true"></i>${config.trend.text}
         </span>`
      : "";
    return `
      <article class="stat-card" style="--stat-glow: ${config.glow}">
        <div class="stat-card__top">
          <span class="stat-icon stat-icon--${config.tone}"><i class="bi ${config.icon}" aria-hidden="true"></i></span>
          ${trend}
        </div>
        <p class="stat-card__label">${config.label}</p>
        <div class="stat-card__value">
          ${
            config.countup === null || config.countup === undefined
              ? `<span>${config.value}</span>`
              : `<span data-countup="${config.countup}" ${config.decimals ? `data-decimals="${config.decimals}"` : ""}>${config.value}</span>`
          }
          ${config.unit ? `<small>${config.unit}</small>` : ""}
        </div>
        <p class="stat-card__desc">${config.desc}</p>
      </article>`;
  }

  function renderHistoryRows(rows) {
    return rows
      .map((row) => {
        let deltaCell = `<span class="delta delta--flat">—</span>`;
        if (Number.isFinite(row.previousScore)) {
          const value = row.score - row.previousScore;
          const tone = value < 0 ? "good" : value > 0 ? "bad" : "flat";
          const icon = value < 0 ? "bi-arrow-down-right" : value > 0 ? "bi-arrow-up-right" : "bi-dash";
          const text = value === 0 ? "0" : `${value > 0 ? "+" : ""}${value}`;
          deltaCell = `<span class="delta delta--${tone}"><i class="bi ${icon}" aria-hidden="true"></i>${text}</span>`;
        }
        return `
          <tr>
            <td><span class="cell-mono">${ns.ui.escapeHtml(row.id)}</span></td>
            <td>${ns.format.formatDate(row.date)}</td>
            <td><span class="cell-score">${row.score}</span><span class="text-muted text-xs">/100</span></td>
            <td>${ns.ui.statusBadge(row.score)}</td>
            <td>${deltaCell}</td>
            <td>
              <a class="btn btn-sm btn-ghost" href="report.html?id=${encodeURIComponent(row.id)}" aria-label="Xem chi tiết ${ns.ui.escapeHtml(row.id)}">
                Xem <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </a>
            </td>
          </tr>`;
      })
      .join("");
  }

  async function boot() {
    const data = await ns.data.requireAssessment();
    if (!data) return;

    const assessment = ns.data.currentAssessment();
    const comparison = ns.data.comparison();
    const recs = ns.data.recommendations();
    const level = ns.risk.classify(assessment.overallRisk);

    /* Welcome ------------------------------------------------------------- */
    const account = data.user || {};
    const userName = account.firstName || account.fullName || account.email || "bạn";
    document.getElementById("welcomeName").textContent = userName;
    document.getElementById("welcomeDate").textContent = ns.format.formatDate(assessment.date);
    document.getElementById("overallDate").textContent = ns.format.formatDate(assessment.date);
    document.getElementById("historyUpdated").textContent = ns.format.formatDate(assessment.date);

    const alertCount = (assessment.alerts || []).length;
    const welcomeDesc = document.getElementById("welcomeDesc");
    welcomeDesc.innerHTML =
      `Điểm rủi ro của bạn đang ở mức <strong>${level.label}</strong>. ` +
      (alertCount
        ? `Có <strong>${alertCount} cảnh báo nghiêm trọng</strong> cần xử lý trước khi thực hiện giao dịch hoặc đăng nhập tài khoản quan trọng.`
        : "Không có cảnh báo nghiêm trọng nào. Hãy duy trì thói quen an toàn và đánh giá lại định kỳ.");

    /* Stat cards ---------------------------------------------------------- */
    const delta = comparison.delta;
    const improved = delta < 0;
    const stats = [
      {
        tone: "indigo",
        icon: "bi-activity",
        label: "Overall Risk Score",
        value: assessment.overallRisk,
        countup: assessment.overallRisk,
        unit: "/100",
        desc: "Điểm rủi ro tổng hợp từ 5 trụ cột",
        glow: "rgba(99, 102, 241, 0.18)",
        trend: {
          tone: improved ? "down" : delta > 0 ? "up" : "flat",
          icon: improved ? "bi-arrow-down-right" : delta > 0 ? "bi-arrow-up-right" : "bi-dash",
          text: delta === 0 ? "Không đổi" : `${Math.abs(delta)} điểm`,
        },
      },
      {
        tone: "rose",
        icon: "bi-shield-exclamation",
        label: "Risk Level",
        value: level.label,
        desc: `Thang điểm ${level.key === "low" ? "0–24" : level.key === "medium" ? "25–49" : level.key === "high" ? "50–74" : "75–100"}/100`,
        glow: ns.risk.hexToRgba(level.hex, 0.16),
        trend: { tone: "up", icon: "bi-exclamation-triangle", text: "Cần chú ý" },
      },
      {
        tone: "amber",
        icon: "bi-calendar-check",
        label: "Last Assessment",
        value: ns.format.formatDate(assessment.date),
        desc: `${account.assessmentCount || data.history.length} lần đánh giá · ${ns.format.fromNow(assessment.date)}`,
        glow: "rgba(245, 158, 11, 0.16)",
        trend: null,
      },
      {
        tone: "green",
        icon: "bi-graph-down-arrow",
        label: "Security Improvement",
        value: Math.abs(delta),
        countup: Math.abs(delta),
        unit: "điểm",
        desc: improved ? "Điểm rủi ro đã giảm so với lần trước" : "Chưa có cải thiện so với lần trước",
        glow: "rgba(16, 185, 129, 0.16)",
        trend: { tone: improved ? "down" : "flat", icon: improved ? "bi-check2" : "bi-dash", text: improved ? "Tốt hơn" : "Cần cải thiện" },
      },
    ];

    document.getElementById("statsGrid").innerHTML = stats.map(statCard).join("");

    /* Critical alerts ----------------------------------------------------- */
    const alerts = assessment.alerts || [];
    const alertList = document.getElementById("alertList");
    document.getElementById("alertCount").textContent = `${alerts.length} cảnh báo`;
    if (alerts.length) {
      const map = ns.data.pillarMap(assessment.pillars);
      alertList.innerHTML = alerts
        .slice(0, 3)
        .map((alert) => {
          const pillar = map[alert.pillarId];
          return `<li><strong>${ns.ui.escapeHtml(alert.title)}</strong>${pillar ? ` — ${pillar.shortName}` : ""}</li>`;
        })
        .join("");
    } else {
      alertList.innerHTML = "<li>Không có cảnh báo nghiêm trọng. Tiếp tục duy trì thói quen an toàn.</li>";
      document.getElementById("criticalStrip").classList.remove("alert-strip");
      document.getElementById("criticalStrip").style.display = "none";
    }

    /* Overall doughnut ---------------------------------------------------- */
    document.getElementById("overallScore").textContent = assessment.overallRisk;
    ["overallBadge", "overallCenterBadge"].forEach((id) => {
      const badge = document.getElementById(id);
      badge.className = `badge ${level.badge}`;
      badge.textContent = level.label;
    });

    const deltaEl = document.getElementById("overallDelta");
    if (delta === 0) {
      deltaEl.textContent = "Không đổi";
      deltaEl.className = "delta delta--flat";
    } else {
      deltaEl.textContent = `${delta > 0 ? "+" : ""}${delta} điểm`;
      deltaEl.className = `delta ${improved ? "delta--good" : "delta--bad"}`;
    }

    ns.charts.doughnut(document.getElementById("overallDoughnut"), {
      value: assessment.overallRisk,
      color: level.hex,
    });

    /* Pillar charts ------------------------------------------------------- */
    const pillarValues = assessment.pillars.map((pillar) => pillar.score);
    const pillarLabels = assessment.pillars.map((pillar) => pillar.shortName);
    const pillarColors = assessment.pillars.map((pillar) => pillar.color);

    ns.charts.bar(document.getElementById("pillarBar"), {
      labels: pillarLabels,
      values: pillarValues,
      colors: pillarColors,
    });

    ns.charts.radar(document.getElementById("pillarRadar"), {
      labels: pillarLabels,
      values: pillarValues,
      colors: pillarColors,
    });

    /* Recommendations ----------------------------------------------------- */
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityMeta = ns.risk.PRIORITIES;
    const topRecs = recs
      .filter((rec) => !rec.done)
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 4);

    document.getElementById("dashboardRecommendations").innerHTML = topRecs.length
      ? topRecs
          .map((rec) => {
            const meta = priorityMeta[rec.priority];
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
                    <span class="text-xs text-muted"><i class="bi bi-diagram-3" aria-hidden="true"></i> ${rec.pillar ? rec.pillar.shortName : ""}</span>
                  </div>
                </div>
                <a class="btn btn-sm btn-ghost rec-item__action" href="recommendations.html" aria-label="Xem khuyến nghị ${ns.ui.escapeHtml(rec.title)}">
                  <i class="bi bi-chevron-right" aria-hidden="true"></i>
                </a>
              </div>`;
          })
          .join("")
      : `<div class="empty-state"><i class="bi bi-check2-circle" aria-hidden="true"></i><p>Bạn đã hoàn thành toàn bộ khuyến nghị ưu tiên. Hãy đánh giá lại sau 4–6 tuần.</p></div>`;

    /* History table ------------------------------------------------------- */
    const rows = data.history.slice(0, 5);
    document.getElementById("historyBody").innerHTML = rows.length
      ? renderHistoryRows(rows)
      : `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-inbox" aria-hidden="true"></i><p>Chưa có lần đánh giá nào.</p></div></td></tr>`;

    document.getElementById("historyCount").textContent = `${data.history.length} lần đánh giá`;

    /* Counter animation for the freshly rendered stat cards -------------- */
    ns.ui.runCounters();
    ns.ui.animateIn();
  }

  boot().catch((error) => {
    console.error("[SDRSM] Dashboard load failed:", error);
    ns.ui.toast({
      title: "Không tải được dashboard",
      message: error && error.message ? error.message : "Vui lòng thử lại.",
      type: "error",
    });
  });
})(window.SDRSM);

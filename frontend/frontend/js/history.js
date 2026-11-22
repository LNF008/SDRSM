/* ==========================================================================
   SDRSM — Assessment history page
   ========================================================================== */

(function (ns) {
  "use strict";

  const history = ns.data.history(); // newest first
  const latest = history[0];
  const previous = history[1];
  const chronological = history.slice().reverse(); // oldest first for the chart

  /* Summary --------------------------------------------------------------- */
  const latestBand = ns.risk.classify(latest.score);
  const best = history.reduce((min, row) => (row.score < min.score ? row : min), history[0]);
  const average = Math.round(history.reduce((sum, row) => sum + row.score, 0) / history.length);
  const delta = previous ? latest.score - previous.score : 0;
  const totalImprovement = chronological[0].score - latest.score;

  document.getElementById("latestScore").textContent = `${latest.score}/100`;
  document.getElementById("previousScore").textContent = previous ? `${previous.score}/100` : "—";

  const deltaBadge = document.getElementById("latestDelta");
  if (delta === 0) {
    deltaBadge.className = "badge badge--neutral";
    deltaBadge.textContent = "Không đổi";
  } else {
    const improved = delta < 0;
    deltaBadge.className = `badge ${improved ? "badge--low" : "badge--critical"}`;
    deltaBadge.innerHTML = `<i class="bi ${improved ? "bi-arrow-down-right" : "bi-arrow-up-right"}" aria-hidden="true"></i> ${delta > 0 ? "+" : ""}${delta} điểm`;
  }

  const trendBadge = document.getElementById("trendBadge");
  if (totalImprovement > 0) {
    trendBadge.className = "badge badge--low";
    trendBadge.innerHTML = `<i class="bi bi-arrow-down-right" aria-hidden="true"></i> Giảm ${totalImprovement} điểm`;
  } else if (totalImprovement < 0) {
    trendBadge.className = "badge badge--critical";
    trendBadge.innerHTML = `<i class="bi bi-arrow-up-right" aria-hidden="true"></i> Tăng ${Math.abs(totalImprovement)} điểm`;
  } else {
    trendBadge.className = "badge badge--neutral";
    trendBadge.textContent = "Chưa thay đổi";
  }

  const summaryRows = [
    { icon: "bi-trophy", label: "Điểm rủi ro tốt nhất", value: `${best.score}/100 · ${ns.format.formatDate(best.date)}` },
    { icon: "bi-calculator", label: "Điểm trung bình", value: `${average}/100` },
    { icon: "bi-collection", label: "Tổng số lần đánh giá", value: `${history.length} lần` },
    { icon: "bi-exclamation-octagon", label: "Cảnh báo nghiêm trọng gần nhất", value: `${latest.criticalCount || 0} cảnh báo` },
    {
      icon: "bi-calendar-range",
      label: "Khoảng thời gian theo dõi",
      value: `${ns.format.formatDate(chronological[0].date)} – ${ns.format.formatDate(latest.date)}`,
    },
  ];

  document.getElementById("historySummary").innerHTML = summaryRows
    .map(
      (row) => `
        <div class="detail-row">
          <span class="detail-row__label"><i class="bi ${row.icon}" aria-hidden="true"></i> ${row.label}</span>
          <span class="detail-row__value">${row.value}</span>
        </div>`
    )
    .join("");

  document.getElementById("historyInsight").textContent =
    totalImprovement > 0
      ? `Bạn đã giảm ${totalImprovement} điểm rủi ro kể từ lần đánh giá đầu tiên. Tiếp tục xử lý các khuyến nghị ưu tiên để tiến gần ngưỡng an toàn ≤ 30.`
      : totalImprovement < 0
        ? `Điểm rủi ro đã tăng ${Math.abs(totalImprovement)} điểm so với lần đầu. Hãy kiểm tra lại các cảnh báo nghiêm trọng và cài đặt bảo mật tài khoản.`
        : "Điểm rủi ro chưa thay đổi trong khoảng thời gian theo dõi. Hãy chọn một khuyến nghị ưu tiên và xử lý trong tuần này.";

  /* Chart ----------------------------------------------------------------- */
  ns.charts.line(document.getElementById("historyLine"), {
    labels: chronological.map((row) => ns.format.formatDate(row.date)),
    values: chronological.map((row) => row.score),
  });

  /* Table ----------------------------------------------------------------- */
  const tbody = document.getElementById("historyTableBody");
  const filter = document.getElementById("levelFilter");
  const tableSummary = document.getElementById("tableSummary");

  function deltaMarkup(row) {
    if (!Number.isFinite(row.previousScore)) {
      return `<span class="delta delta--flat"><i class="bi bi-dash" aria-hidden="true"></i> Lần đầu</span>`;
    }
    const value = row.score - row.previousScore;
    if (value === 0) return `<span class="delta delta--flat"><i class="bi bi-dash" aria-hidden="true"></i> 0</span>`;
    const improved = value < 0;
    return `<span class="delta ${improved ? "delta--good" : "delta--bad"}">
      <i class="bi ${improved ? "bi-arrow-down-right" : "bi-arrow-up-right"}" aria-hidden="true"></i>
      ${value > 0 ? "+" : ""}${value}
    </span>`;
  }

  function renderTable() {
    const selected = filter.value;
    const rows = history.filter((row) => selected === "all" || ns.risk.classify(row.score).key === selected);

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-inbox" aria-hidden="true"></i><p>Không có lần đánh giá nào ở mức rủi ro này.</p></div></td></tr>`;
      tableSummary.textContent = `Hiển thị 0/${history.length} lần đánh giá`;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td><span class="cell-mono">${row.id}</span></td>
          <td>${ns.format.formatDate(row.date)}</td>
          <td><span class="cell-score">${row.score}</span><span class="text-muted text-xs">/100</span></td>
          <td>${ns.ui.statusBadge(row.score)}</td>
          <td>${deltaMarkup(row)}</td>
          <td><span class="badge badge--neutral">${row.criticalCount || 0} cảnh báo</span></td>
          <td>
            <a class="btn btn-sm btn-ghost" href="report.html" aria-label="Xem báo cáo ${row.id}">
              Xem <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </a>
          </td>
        </tr>`
      )
      .join("");

    tableSummary.textContent = `Hiển thị ${rows.length}/${history.length} lần đánh giá`;
  }

  filter.addEventListener("change", renderTable);
  renderTable();

  /* CSV export ------------------------------------------------------------ */
  document.getElementById("exportHistory").addEventListener("click", () => {
    const header = ["Mã đánh giá", "Ngày", "RiskScore", "Mức rủi ro", "So với lần trước", "Cảnh báo"];
    const lines = history.map((row) => {
      const value = Number.isFinite(row.previousScore) ? row.score - row.previousScore : "";
      return [
        row.id,
        ns.format.formatDate(row.date),
        row.score,
        ns.risk.classify(row.score).label,
        value === "" ? "" : value,
        row.criticalCount || 0,
      ].join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sdrsm-assessment-history.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    ns.ui.toast({ title: "Đã xuất CSV", message: `${history.length} lần đánh giá đã được tải xuống.`, type: "success" });
  });
})(window.SDRSM);

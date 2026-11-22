/* ==========================================================================
   SDRSM — Chart.js layer
   Tất cả biểu đồ đều render bằng Chart.js (không dùng ảnh tĩnh) và tự động
   dựng lại khi đổi Light/Dark Mode để màu sắc luôn đồng bộ design system.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

(function (ns) {
  "use strict";

  const registry = new Map(); // canvas element -> factory(tokens) => Chart config

  function tokens() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => (styles.getPropertyValue(name) || fallback).trim();
    return {
      text: read("--text", "#0d1526"),
      text2: read("--text-2", "#3a4964"),
      muted: read("--muted", "#6a7a96"),
      border: read("--border", "#e4e9f2"),
      surface: read("--surface", "#ffffff"),
      track: read("--track", "#e9eef7"),
      brand: read("--brand-500", "#6366f1"),
      critical: read("--critical", "#e11d48"),
      high: read("--high", "#f97316"),
      medium: read("--medium", "#f59e0b"),
      low: read("--low", "#10b981"),
      font: read("--font-sans", "system-ui, sans-serif"),
    };
  }

  function alpha(hex, value) {
    if (!hex || hex.indexOf("#") !== 0) return hex;
    return ns.risk.hexToRgba(hex, value);
  }

  function tooltipStyle(t) {
    return {
      backgroundColor: t.surface,
      titleColor: t.text,
      bodyColor: t.text2,
      borderColor: t.border,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 9,
      boxWidth: 8,
      boxHeight: 8,
      usePointStyle: true,
      titleFont: { size: 11, weight: "600" },
      bodyFont: { size: 11 },
      displayColors: true,
    };
  }

  /* HTML tooltip for doughnut charts -------------------------------------
     The canvas tooltip is painted *under* the HTML score text that is overlaid in the
     middle of the ring (position: absolute), so the two overlapped. This tooltip is a
     normal element on <body>: it always sits above the page, is not clipped by the
     (small) canvas, and is placed above the ring so it never covers the centre text. */
  const TIP_ID = "sdrsmChartTip";
  let tipScrollBound = false;

  function chartTip() {
    let el = document.getElementById(TIP_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = TIP_ID;
      el.className = "chart-tip";
      el.setAttribute("role", "tooltip");
      document.body.appendChild(el);
    }
    if (!tipScrollBound) {
      tipScrollBound = true;
      window.addEventListener("scroll", () => el.classList.remove("is-visible"), { passive: true });
    }
    return el;
  }

  function externalTooltip(context) {
    const { chart, tooltip } = context;
    const el = chartTip();

    if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints || !tooltip.dataPoints.length) {
      el.classList.remove("is-visible");
      return;
    }

    const title = (tooltip.title || []).join(" ").trim();
    const lines = [];
    (tooltip.body || []).forEach((item) => (item.lines || []).forEach((line) => lines.push(String(line).trim())));
    const swatch = tooltip.labelColors && tooltip.labelColors[0] ? tooltip.labelColors[0].backgroundColor : "";

    el.textContent = "";
    if (title) {
      const heading = document.createElement("strong");
      heading.textContent = title;
      el.appendChild(heading);
    }
    lines.forEach((line) => {
      const row = document.createElement("span");
      const dot = document.createElement("i");
      if (swatch) dot.style.background = swatch;
      row.appendChild(dot);
      row.appendChild(document.createTextNode(line));
      el.appendChild(row);
    });

    // Centre horizontally on the chart, sit above it (or below when there is no room).
    const rect = chart.canvas.getBoundingClientRect();
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const gap = 8;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(gap, Math.min(left, window.innerWidth - width - gap));
    let top = rect.top - height - gap;
    if (top < gap) top = rect.bottom + gap;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.classList.add("is-visible");
  }

  function baseOptions(t) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: "easeOutQuart" },
      layout: { padding: { top: 4, right: 4, bottom: 0, left: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: tooltipStyle(t),
      },
    };
  }

  function scale(t, options) {
    return Object.assign(
      {
        grid: { color: alpha(t.border, 0.75), drawBorder: false, tickLength: 0 },
        border: { display: false },
        ticks: { color: t.muted, font: { size: 10 }, padding: 6 },
      },
      options
    );
  }

  function mount(canvas, factory) {
    if (!canvas || typeof window.Chart === "undefined") return null;
    if (!canvas.id) canvas.id = `chart-${Math.random().toString(36).slice(2, 9)}`;

    const existing = window.Chart.getChart(canvas);
    if (existing) existing.destroy();

    const config = factory(tokens());
    if (!config) return null;
    registry.set(canvas, factory);
    return new window.Chart(canvas, config);
  }

  /* 1. Doughnut — Overall Risk Score -------------------------------------- */
  function doughnut(canvas, options) {
    const value = ns.risk.clamp(Number(options.value) || 0, 0, 100);
    return mount(canvas, (t) => {
      const color = options.color || ns.risk.bandHex(value);
      return {
        type: "doughnut",
        data: {
          labels: ["Điểm rủi ro", "Phần an toàn"],
          datasets: [
            {
              data: [value, 100 - value],
              backgroundColor: [color, t.track],
              borderWidth: 0,
              borderRadius: 8,
              spacing: 0,
              hoverBackgroundColor: [color, t.track],
            },
          ],
        },
        options: Object.assign(baseOptions(t), {
          // No padding: the ring must sit exactly in the middle of the canvas so the
          // text overlaid in the centre (hero / dashboard / report) lines up with it.
          layout: { padding: 0 },
          cutout: options.cutout || "78%",
          rotation: -90,
          circumference: 360,
          plugins: {
            legend: { display: false },
            tooltip: Object.assign(tooltipStyle(t), {
              enabled: false,
              external: externalTooltip,
              callbacks: {
                label: (context) =>
                  context.dataIndex === 0
                    ? ` ${context.parsed}/100 điểm rủi ro`
                    : ` ${context.parsed}/100 điểm an toàn`,
              },
            }),
          },
        }),
      };
    });
  }

  /* 2. Radar — Risk by 5 pillars ----------------------------------------- */
  const SHORT_LABELS = ["Tài khoản", "Lừa đảo", "Riêng tư", "Thiết bị", "Tài chính"];

  function radar(canvas, options) {
    const values = options.values || [];
    const colors = options.colors || values.map((value) => ns.risk.bandHex(value));
    const labels = options.labels || SHORT_LABELS;

    return mount(canvas, (t) => ({
      type: "radar",
      data: {
        labels,
        datasets: [
          {
            label: "Điểm rủi ro",
            data: values,
            borderColor: t.high,
            backgroundColor: alpha(t.high, 0.16),
            pointBackgroundColor: colors,
            pointBorderColor: colors,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            fill: true,
          },
          {
            label: "Ngưỡng an toàn (≤ 30)",
            data: values.map(() => 30),
            borderColor: alpha(t.low, 0.85),
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: Object.assign(baseOptions(t), {
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              color: t.muted,
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              padding: 14,
              font: { size: 10 },
            },
          },
          tooltip: Object.assign(tooltipStyle(t), {
            callbacks: { label: (context) => ` ${context.dataset.label}: ${context.parsed.r}/100` },
          }),
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            beginAtZero: true,
            angleLines: { color: alpha(t.border, 0.9) },
            grid: { color: alpha(t.border, 0.9), circular: false },
            pointLabels: { color: t.text2, font: { size: 10.5, weight: "600" } },
            ticks: {
              display: true,
              stepSize: 25,
              color: t.muted,
              backdropColor: "transparent",
              font: { size: 9 },
              showLabelBackdrop: false,
            },
          },
        },
      }),
    }));
  }

  /* 3. Bar — Compare risk by pillar -------------------------------------- */
  function bar(canvas, options) {
    const values = options.values || [];
    const labels = options.labels || SHORT_LABELS;
    const colors = options.colors || values.map((value) => ns.risk.bandHex(value));

    return mount(canvas, (t) => ({
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Điểm rủi ro",
            data: values,
            backgroundColor: colors.map((color) => alpha(color, 0.85)),
            hoverBackgroundColor: colors,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 46,
          },
        ],
      },
      options: Object.assign(baseOptions(t), {
        plugins: {
          legend: { display: false },
          tooltip: Object.assign(tooltipStyle(t), {
            callbacks: { label: (context) => ` ${context.parsed.y}/100 điểm rủi ro` },
          }),
        },
        scales: {
          x: scale(t, { grid: { display: false }, ticks: { color: t.text2, font: { size: 10.5, weight: "600" } } }),
          y: scale(t, {
            beginAtZero: true,
            max: 100,
            ticks: { color: t.muted, stepSize: 20, font: { size: 10 } },
          }),
        },
      }),
    }));
  }

  /* 4. Line — Risk score history ----------------------------------------- */
  function line(canvas, options) {
    const values = options.values || [];
    const labels = options.labels || [];

    return mount(canvas, (t) => {
      const context = canvas.getContext("2d");
      const gradient = context.createLinearGradient(0, 0, 0, canvas.clientHeight || 280);
      gradient.addColorStop(0, alpha(t.brand, 0.28));
      gradient.addColorStop(1, alpha(t.brand, 0));

      return {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "RiskScore",
              data: values,
              borderColor: t.brand,
              backgroundColor: gradient,
              borderWidth: 2.5,
              tension: 0.35,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 7,
              pointBackgroundColor: t.surface,
              pointBorderColor: t.brand,
              pointBorderWidth: 2.5,
            },
            {
              label: "Ngưỡng an toàn (≤ 30)",
              data: values.map(() => 30),
              borderColor: alpha(t.low, 0.8),
              borderDash: [5, 5],
              borderWidth: 1.5,
              pointRadius: 0,
              pointHoverRadius: 0,
              fill: false,
            },
          ],
        },
        options: Object.assign(baseOptions(t), {
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { display: false },
            tooltip: Object.assign(tooltipStyle(t), {
              callbacks: { label: (context) => ` RiskScore: ${context.parsed.y}/100` },
            }),
          },
          scales: {
            x: scale(t, { grid: { display: false }, ticks: { color: t.muted, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 14 } }),
            y: scale(t, {
              beginAtZero: true,
              max: 100,
              ticks: { color: t.muted, stepSize: 20, font: { size: 10 } },
            }),
          },
        }),
      };
    });
  }

  /* Theme change: rebuild every mounted chart ----------------------------- */
  document.addEventListener("sdrsm:themechange", () => {
    registry.forEach((factory, canvas) => {
      if (!canvas.isConnected) {
        registry.delete(canvas);
        return;
      }
      const chart = window.Chart.getChart(canvas);
      if (chart) chart.destroy();
      // eslint-disable-next-line no-new
      new window.Chart(canvas, factory(tokens()));
    });
  });

  ns.charts = {
    doughnut,
    radar,
    bar,
    line,
    shortLabels: SHORT_LABELS,
    refreshAll: () => document.dispatchEvent(new CustomEvent("sdrsm:themechange", { detail: { theme: ns.theme.get() } })),
  };
})(window.SDRSM);
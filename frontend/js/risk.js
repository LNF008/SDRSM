/* ==========================================================================
   SDRSM — Risk domain helpers
   Single source of truth for risk classification, formatting and local demo
   persistence. No API calls: everything here is frontend-only.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

(function (ns) {
  "use strict";

  /**
   * Risk bands.
   * IMPORTANT: for SDRSM a higher RiskScore means a higher risk.
   * SafeScore is never displayed in the UI.
   */
  const BANDS = [
    {
      key: "low",
      max: 24,
      label: "Thấp",
      short: "Low",
      badge: "badge--low",
      hex: "#10b981",
      cssVar: "--low",
      description: "Bạn đang duy trì thói quen số an toàn. Hãy tiếp tục rà soát định kỳ.",
    },
    {
      key: "medium",
      max: 49,
      label: "Trung bình",
      short: "Medium",
      badge: "badge--medium",
      hex: "#f59e0b",
      cssVar: "--medium",
      description: "Có một số điểm yếu cần cải thiện để tránh rủi ro tích tụ.",
    },
    {
      key: "high",
      max: 74,
      label: "Cao",
      short: "High",
      badge: "badge--high",
      hex: "#f97316",
      cssVar: "--high",
      description: "Nhiều điểm yếu nghiêm trọng. Ưu tiên xử lý các cảnh báo màu đỏ.",
    },
    {
      key: "critical",
      max: 100,
      label: "Nghiêm trọng",
      short: "Critical",
      badge: "badge--critical",
      hex: "#e11d48",
      cssVar: "--critical",
      description: "Tài khoản và dữ liệu cá nhân đang gặp rủi ro cao, cần xử lý ngay.",
    },
  ];

  const PRIORITIES = {
    critical: { label: "Nghiêm trọng", badge: "badge--critical", icon: "bi-exclamation-octagon-fill" },
    high: { label: "Cao", badge: "badge--high", icon: "bi-exclamation-triangle-fill" },
    medium: { label: "Trung bình", badge: "badge--medium", icon: "bi-info-circle-fill" },
    low: { label: "Thấp", badge: "badge--low", icon: "bi-check-circle-fill" },
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function classify(score) {
    const value = clamp(Number(score) || 0, 0, 100);
    return BANDS.find((band) => value <= band.max) || BANDS[BANDS.length - 1];
  }

  function priority(key) {
    return PRIORITIES[key] || PRIORITIES.medium;
  }

  function bandHex(score) {
    return classify(score).hex;
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function formatDate(value) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return dateFormatter.format(date);
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return dateTimeFormatter.format(date);
  }

  function fromNow(value) {
    const date = value instanceof Date ? value : new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return formatDate(date);
  }

  /* Local persistence (demo only — no personal data leaves the browser) ---- */
  const STORAGE_KEYS = {
    theme: "sdrsm:theme",
    lastAssessment: "sdrsm:last-assessment",
    assessmentDraft: "sdrsm:assessment-draft",
    completedRecommendations: "sdrsm:completed-recommendations",
    currentTab: "sdrsm:profile-tab",
  };

  const store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (error) {
        console.warn("[SDRSM] Không đọc được localStorage:", key, error);
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn("[SDRSM] Không ghi được localStorage:", key, error);
        return false;
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn("[SDRSM] Không xoá được localStorage:", key, error);
      }
    },
  };

  ns.risk = {
    BANDS,
    PRIORITIES,
    classify,
    priority,
    bandHex,
    hexToRgba,
    clamp,
  };

  ns.format = { formatDate, formatDateTime, fromNow };

  ns.store = { KEYS: STORAGE_KEYS, ...store };
})(window.SDRSM);

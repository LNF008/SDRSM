/* ==========================================================================
   SDRSM — Demo data service
   --------------------------------------------------------------------------
   Một lớp truy cập dữ liệu duy nhất cho Dashboard / Report / History.
   - Nếu người dùng vừa hoàn thành bài đánh giá, kết quả trong localStorage
     sẽ được ưu tiên hiển thị.
   - Nếu chưa, dùng bộ mock data để demo giao diện.
   Khi có REST API, chỉ cần thay phần thân của các hàm bên dưới bằng fetch().
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

(function (ns) {
  "use strict";

  const KEYS = ns.store.KEYS;
  const mock = () => ns.mockData;

  function pillarMap(pillars) {
    return pillars.reduce((acc, pillar) => {
      acc[pillar.id] = pillar;
      return acc;
    }, {});
  }

  /**
   * Latest assessment (real demo result if available, otherwise mock data).
   */
  function currentAssessment() {
    const saved = ns.store.get(KEYS.lastAssessment, null);
    const base = mock();

    if (!saved || typeof saved.overallRisk !== "number") {
      return {
        source: "mock",
        id: base.lastAssessmentId,
        date: base.lastAssessmentAt,
        overallRisk: base.overallRisk,
        previousRisk: base.previousRisk,
        criticalPenalty: base.criticalPenalty || 0,
        pillars: base.pillars,
        alerts: base.alerts,
        answers: null,
      };
    }

    const savedPillars = saved.pillarScores || {};
    const savedIndicators = saved.indicators || {};
    const pillars = base.pillars.map((pillar) => ({
      ...pillar,
      score: Number.isFinite(savedPillars[pillar.id]) ? savedPillars[pillar.id] : pillar.score,
      indicators: pillar.indicators.map((indicator) => ({
        ...indicator,
        score: Number.isFinite((savedIndicators[pillar.id] || {})[indicator.key])
          ? savedIndicators[pillar.id][indicator.key]
          : indicator.score,
      })),
    }));

    return {
      source: "saved",
      id: saved.id,
      date: saved.createdAt,
      overallRisk: saved.overallRisk,
      previousRisk: Number.isFinite(saved.previousRisk) ? saved.previousRisk : base.overallRisk,
      criticalPenalty: saved.criticalPenalty || 0,
      pillars,
      alerts: (saved.alerts || []).map((alert) => ({
        ...alert,
        pillarId: alert.pillarId || "p1",
        severity: alert.severity || "critical",
      })),
      answers: saved.answers || null,
    };
  }

  /**
   * History = saved demo result + mock history, newest first.
   */
  function history() {
    const saved = ns.store.get(KEYS.lastAssessment, null);
    const rows = mock().history.slice();
    if (saved && typeof saved.overallRisk === "number") {
      rows.unshift({
        id: saved.id,
        date: saved.createdAt,
        score: saved.overallRisk,
        criticalCount: (saved.alerts || []).length,
        source: "saved",
      });
    }
    return rows
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((row, index, list) => ({
        ...row,
        previousScore: list[index + 1] ? list[index + 1].score : null,
      }));
  }

  /**
   * Recommendations with completion overrides persisted in localStorage.
   */
  function recommendations() {
    const overrides = ns.store.get(KEYS.completedRecommendations, {});
    return mock().recommendations.map((rec) => ({
      ...rec,
      pillar: pillarMap(mock().pillars)[rec.pillarId],
      done: Object.prototype.hasOwnProperty.call(overrides, rec.id) ? Boolean(overrides[rec.id]) : rec.done,
    }));
  }

  function setRecommendationDone(id, done) {
    const overrides = ns.store.get(KEYS.completedRecommendations, {});
    overrides[id] = Boolean(done);
    ns.store.set(KEYS.completedRecommendations, overrides);
    return recommendations();
  }

  function recommendationStats(list) {
    const items = list || recommendations();
    return {
      total: items.length,
      done: items.filter((item) => item.done).length,
      open: items.filter((item) => !item.done).length,
      criticalOpen: items.filter((item) => !item.done && item.priority === "critical").length,
    };
  }

  /**
   * Risk alerts, only for the mock set or a saved assessment.
   */
  function criticalAlerts(assessment) {
    const current = assessment || currentAssessment();
    return current.alerts || [];
  }

  /**
   * Comparison helpers used by Dashboard / History.
   */
  function comparison() {
    const current = currentAssessment();
    const previous = Number.isFinite(current.previousRisk) ? current.previousRisk : null;
    const delta = previous === null ? 0 : current.overallRisk - previous;
    return {
      previous,
      delta,
      direction: delta < 0 ? "down" : delta > 0 ? "up" : "flat",
      improved: delta < 0,
    };
  }

  ns.data = {
    currentAssessment,
    history,
    recommendations,
    setRecommendationDone,
    recommendationStats,
    criticalAlerts,
    comparison,
    pillarMap,
  };
})(window.SDRSM);

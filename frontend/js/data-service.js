/* ==========================================================================
   SDRSM — Data service
   --------------------------------------------------------------------------
   Single access point for the authenticated pages. All data comes from the
   REST API; the dashboard payload is cached for the lifetime of the page and
   kept in sync when a recommendation is toggled.
   ========================================================================== */

window.SDRSM = window.SDRSM || {};

(function (ns) {
  "use strict";

  const state = {
    dashboard: null,
    dashboardPromise: null,
    catalog: null,
    catalogPromise: null,
  };

  const EMPTY_COMPARISON = { previous: null, delta: 0, direction: "flat", improved: false };
  const EMPTY_STATS = { total: 0, done: 0, open: 0, criticalOpen: 0 };

  function inPages() {
    return /\/pages\//.test(window.location.pathname);
  }

  function pagePath(name) {
    return inPages() ? name : `pages/${name}`;
  }

  function pillarMap(pillars) {
    return (pillars || []).reduce((acc, pillar) => {
      acc[pillar.id] = pillar;
      return acc;
    }, {});
  }

  async function loadDashboard(force) {
    if (state.dashboard && !force) return state.dashboard;
    if (state.dashboardPromise && !force) return state.dashboardPromise;

    state.dashboardPromise = ns.api
      .get("/api/dashboard")
      .then((data) => {
        state.dashboard = data;
        state.dashboardPromise = null;
        document.dispatchEvent(new CustomEvent("sdrsm:dashboard", { detail: data }));
        return data;
      })
      .catch((error) => {
        state.dashboardPromise = null;
        throw error;
      });

    return state.dashboardPromise;
  }

  /**
   * Load (or return the cached) dashboard payload.
   */
  function ready(force) {
    return loadDashboard(Boolean(force));
  }

  /**
   * Await dashboard data and redirect accounts without an assessment to the
   * assessment wizard. Page scripts should stop when it resolves to null.
   */
  async function requireAssessment() {
    const data = await ready();
    if (!data.hasAssessment || !data.latest) {
      window.location.replace(`${pagePath("assessment.html")}?first=1`);
      return null;
    }
    return data;
  }

  function dashboard() {
    return state.dashboard || {
      user: null,
      hasAssessment: false,
      latest: null,
      comparison: EMPTY_COMPARISON,
      history: [],
      trend: [],
      recommendations: { items: [], stats: EMPTY_STATS, assessmentId: null },
      notifications: [],
      activity: [],
    };
  }

  function currentAssessment() {
    return dashboard().latest;
  }

  function comparison() {
    return dashboard().comparison || EMPTY_COMPARISON;
  }

  function history() {
    return dashboard().history || [];
  }

  function recommendations() {
    const block = dashboard().recommendations || {};
    return block.items || [];
  }

  function recommendationStats(list) {
    if (list) {
      const items = list;
      return {
        total: items.length,
        done: items.filter((item) => item.done).length,
        open: items.filter((item) => !item.done).length,
        criticalOpen: items.filter((item) => !item.done && item.priority === "critical").length,
      };
    }
    return (dashboard().recommendations || {}).stats || EMPTY_STATS;
  }

  function notifications() {
    return dashboard().notifications || [];
  }

  function activity() {
    return dashboard().activity || [];
  }

  function user() {
    return dashboard().user || null;
  }

  /**
   * Persist a recommendation toggle and keep cached state consistent.
   * Returns the API response `{ item, stats }`.
   */
  async function setRecommendationDone(id, done) {
    const result = await ns.api.patch(`/api/recommendations/${encodeURIComponent(id)}`, {
      done: Boolean(done),
    });

    const block = dashboard().recommendations;
    if (block && Array.isArray(block.items)) {
      const item = block.items.find((rec) => String(rec.id) === String(id));
      if (item && result.item) Object.assign(item, result.item);
      if (result.stats) block.stats = result.stats;
    }

    return result;
  }

  /**
   * Full detail for one assessment (`?id=` on the report page).
   */
  function getAssessment(id) {
    return ns.api.get(`/api/assessments/${encodeURIComponent(id)}`);
  }

  /**
   * Question bank for the assessment wizard. The API sends pillar indicators
   * as a list; the wizard expects a map keyed by indicator slug.
   */
  async function catalog() {
    if (state.catalog) return state.catalog;
    if (state.catalogPromise) return state.catalogPromise;

    state.catalogPromise = ns.api
      .get("/api/assessments/catalog")
      .then((data) => {
        const pillars = {};
        (data.pillars || []).forEach((pillar) => {
          const indicators = {};
          (pillar.indicators || []).forEach((indicator) => {
            indicators[indicator.key] = {
              name: indicator.name,
              weight: indicator.weight,
            };
          });
          pillars[pillar.id] = Object.assign({}, pillar, { indicators });
        });

        state.catalog = {
          pillars,
          questions: data.questions || [],
          pillarList: data.pillars || [],
        };
        state.catalogPromise = null;
        return state.catalog;
      })
      .catch((error) => {
        state.catalogPromise = null;
        throw error;
      });

    return state.catalogPromise;
  }

  ns.data = {
    ready,
    requireAssessment,
    dashboard,
    currentAssessment,
    comparison,
    history,
    recommendations,
    recommendationStats,
    notifications,
    activity,
    user,
    setRecommendationDone,
    getAssessment,
    catalog,
    pillarMap,
  };
})(window.SDRSM);

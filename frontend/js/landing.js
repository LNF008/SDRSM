/* ==========================================================================
   SDRSM — Landing page interactions
   ========================================================================== */

(function (ns) {
  "use strict";

  const pillars = ns.mockData.pillars;
  const container = document.getElementById("heroPillars");
  if (!container) return;

  container.innerHTML = pillars
    .map(
      (pillar) => `
        <div class="hero__pillar" style="--pillar-color: ${pillar.color}">
          <div class="hero__pillar-top">
            <span>${pillar.shortName}</span>
            <span>${pillar.score}</span>
          </div>
          <div class="progress progress--thin">
            <div class="progress__bar progress__bar--${ns.risk.classify(pillar.score).key}" style="width: ${pillar.score}%"></div>
          </div>
        </div>`
    )
    .join("");

  ns.charts.doughnut(document.getElementById("heroDoughnut"), {
    value: ns.mockData.overallRisk,
    color: ns.risk.bandHex(ns.mockData.overallRisk),
    cutout: "80%",
  });
})(window.SDRSM);

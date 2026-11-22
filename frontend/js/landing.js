/* ==========================================================================
   SDRSM — Landing page interactions
   --------------------------------------------------------------------------
   The hero panel is a static illustration used for marketing. It is not
   connected to any account or live assessment.
   ========================================================================== */

(function (ns) {
  "use strict";

  const SAMPLE = {
    overall: 62,
    pillars: [
      { shortName: "Tài khoản", color: "#6366f1", score: 65 },
      { shortName: "Lừa đảo", color: "#f97316", score: 75 },
      { shortName: "Riêng tư", color: "#06b6d4", score: 45 },
      { shortName: "Thiết bị", color: "#10b981", score: 50 },
      { shortName: "Tài chính", color: "#a855f7", score: 60 },
    ],
  };

  const container = document.getElementById("heroPillars");
  if (!container) return;

  container.innerHTML = SAMPLE.pillars
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
    value: SAMPLE.overall,
    color: ns.risk.bandHex(SAMPLE.overall),
    cutout: "80%",
  });
})(window.SDRSM);

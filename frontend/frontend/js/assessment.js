/* ==========================================================================
   SDRSM — Assessment wizard
   25 câu hỏi / 5 trụ cột, lưu nháp localStorage, tính điểm demo theo trọng số
   và cộng điểm trừ "P_critical" cho các lỗi nghiêm trọng.
   ========================================================================== */

(function (ns) {
  "use strict";

  const bank = ns.assessment;
  const questions = bank.questions;
  const pillarIds = Object.keys(bank.pillars).sort(
    (a, b) => bank.pillars[a].order - bank.pillars[b].order
  );
  const questionsByPillar = pillarIds.reduce((acc, id) => {
    acc[id] = questions.filter((question) => question.pillarId === id);
    return acc;
  }, {});
  const TOTAL = questions.length;
  const RING_LENGTH = 326.7;
  const DRAFT_KEY = ns.store.KEYS.assessmentDraft;
  const SUBMIT_DELAY = 1500;

  let current = 0;
  let answers = {};
  let submitting = false;

  const els = {
    stepList: document.getElementById("stepList"),
    intro: document.getElementById("pillarIntro"),
    list: document.getElementById("questionList"),
    prev: document.getElementById("prevBtn"),
    next: document.getElementById("nextBtn"),
    submit: document.getElementById("submitBtn"),
    saveDraft: document.getElementById("saveDraftBtn"),
    reset: document.getElementById("resetDraftBtn"),
    draftBadge: document.getElementById("draftBadge"),
    answeredCount: document.getElementById("answeredCount"),
    progressPercent: document.getElementById("progressPercent"),
    progressBadge: document.getElementById("progressBadge"),
    progressBar: document.getElementById("progressBar"),
    progressRing: document.getElementById("progressRingFill"),
    railPillar: document.getElementById("railPillar"),
    railTime: document.getElementById("railTime"),
    pillarProgressText: document.getElementById("pillarProgressText"),
    weightSummary: document.getElementById("weightSummary"),
    confirmDialog: document.getElementById("confirmDialog"),
    confirmWarning: document.getElementById("confirmWarning"),
    reviewList: document.getElementById("reviewList"),
    confirmSubmit: document.getElementById("confirmSubmitBtn"),
    overlay: document.getElementById("submitOverlay"),
  };

  /* Draft restore --------------------------------------------------------- */
  function sanitizeAnswers(source) {
    const clean = {};
    if (!source || typeof source !== "object") return clean;
    questions.forEach((question) => {
      const value = source[question.id];
      if (Number.isInteger(value) && question.options[value]) clean[question.id] = value;
    });
    return clean;
  }

  (function restoreDraft() {
    const draft = ns.store.get(DRAFT_KEY, null);
    if (!draft || !draft.answers) return;
    answers = sanitizeAnswers(draft.answers);
    const restoredCurrent = Number(draft.current);
    current = Number.isInteger(restoredCurrent) ? ns.risk.clamp(restoredCurrent, 0, pillarIds.length - 1) : 0;
    if (Object.keys(answers).length) {
      window.setTimeout(() => {
        ns.ui.toast({
          title: "Đã khôi phục bản nháp",
          message: `Bạn đã trả lời ${Object.keys(answers).length}/${TOTAL} câu trước đó.`,
          type: "info",
        });
      }, 400);
    }
  })();

  /* Helpers --------------------------------------------------------------- */
  const answeredInPillar = (pillarId) =>
    questionsByPillar[pillarId].filter((question) => Number.isInteger(answers[question.id])).length;

  const answeredTotal = () =>
    questions.filter((question) => Number.isInteger(answers[question.id])).length;

  function saveDraft(manual) {
    ns.store.set(DRAFT_KEY, {
      answers,
      current,
      updatedAt: new Date().toISOString(),
    });
    if (manual) {
      els.draftBadge.innerHTML = '<i class="bi bi-cloud-check-fill" aria-hidden="true"></i> Đã lưu nháp';
      els.draftBadge.className = "badge badge--low";
      ns.ui.toast({ message: "Đã lưu bản nháp trên trình duyệt này.", type: "success" });
    }
  }

  /* Render ---------------------------------------------------------------- */
  function renderStepper() {
    els.stepList.innerHTML = pillarIds
      .map((pillarId, index) => {
        const pillar = bank.pillars[pillarId];
        const total = questionsByPillar[pillarId].length;
        const done = answeredInPillar(pillarId);
        const complete = done === total;
        return `
          <button class="step-pill${index === current ? " is-active" : ""}${complete ? " is-complete" : ""}"
                  type="button" data-step="${index}"
                  aria-current="${index === current ? "step" : "false"}"
                  aria-label="${pillar.name}: ${done}/${total} câu">
            <span class="step-pill__num">${complete ? '<i class="bi bi-check2" aria-hidden="true"></i>' : pillar.order}</span>
            <span class="step-pill__label">${pillar.name}<small>${done}/${total} câu · ${pillar.weight}%</small></span>
          </button>`;
      })
      .join("");
  }

  function renderPillar() {
    const pillarId = pillarIds[current];
    const pillar = bank.pillars[pillarId];
    const total = questionsByPillar[pillarId].length;
    const done = answeredInPillar(pillarId);

    els.intro.style.setProperty("--pillar-color", pillar.color);
    els.intro.style.setProperty("--pillar-soft", pillar.soft);
    els.intro.innerHTML = `
      <div class="pillar-intro__top">
        <span class="pillar-intro__icon"><i class="bi ${pillar.icon}" aria-hidden="true"></i></span>
        <div>
          <h2>${pillar.order}. ${pillar.name}</h2>
        </div>
        <span class="badge badge--brand" style="margin-left:auto">Trọng số ${pillar.weight}%</span>
      </div>
      <p>${pillar.intro}</p>
      <div class="pillar-intro__stats">
        <div class="pillar-intro__stat"><strong>${done}/${total}</strong><span>Câu đã trả lời</span></div>
        <div class="pillar-intro__stat"><strong>${total}</strong><span>Câu hỏi</span></div>
        <div class="pillar-intro__stat"><strong>${Object.keys(pillar.indicators).length}</strong><span>Tiêu chí thành phần</span></div>
      </div>`;

    els.list.innerHTML = questionsByPillar[pillarId]
      .map((question) => {
        const globalIndex = questions.indexOf(question) + 1;
        const indicator = pillar.indicators[question.indicator];
        return `
          <article class="question-card" data-question="${question.id}" id="card-${question.id}">
            <div class="question-card__head">
              <span class="question-card__index">${String(globalIndex).padStart(2, "0")}</span>
              <div class="question-card__body">
                <p class="question-card__text">${ns.ui.escapeHtml(question.text)}</p>
                <div class="question-card__meta">
                  <span class="question-card__indicator">${ns.ui.escapeHtml(indicator.name)}</span>
                  <span class="question-card__weight">Trọng số tiêu chí ${indicator.weight}%</span>
                </div>
              </div>
            </div>
            <div class="options" role="radiogroup" aria-label="${ns.ui.escapeHtml(question.text)}">
              ${question.options
                .map(
                  (option, index) => `
                <label class="option" for="opt-${question.id}-${index}">
                  <input type="radio" id="opt-${question.id}-${index}" name="q-${question.id}" value="${index}"
                    ${answers[question.id] === index ? "checked" : ""} />
                  <span class="option__mark" aria-hidden="true"></span>
                  <span>${ns.ui.escapeHtml(option.label)}</span>
                </label>`
                )
                .join("")}
            </div>
          </article>`;
      })
      .join("");

    els.prev.disabled = current === 0;
    els.next.innerHTML =
      current === pillarIds.length - 1
        ? 'Xem lại &amp; nộp <i class="bi bi-send-check" aria-hidden="true"></i>'
        : 'Tiếp theo <i class="bi bi-arrow-right" aria-hidden="true"></i>';

    els.railPillar.textContent = `${current + 1}/${pillarIds.length}`;
    updateProgress();
  }

  function renderWeights() {
    els.weightSummary.innerHTML = pillarIds
      .map((pillarId) => {
        const pillar = bank.pillars[pillarId];
        const total = questionsByPillar[pillarId].length;
        const done = answeredInPillar(pillarId);
        return `
          <div class="rail-summary__row">
            <span>
              <i class="bi bi-circle-fill" style="color:${pillar.color};font-size:7px" aria-hidden="true"></i>
              ${pillar.shortName}
            </span>
            <strong>${pillar.weight}% <span class="text-muted" style="font-weight:500">· ${done}/${total}</span></strong>
          </div>`;
      })
      .join("");
  }

  function updateProgress() {
    const done = answeredTotal();
    const percent = Math.round((done / TOTAL) * 100);
    const missing = TOTAL - done;

    els.answeredCount.textContent = done;
    els.progressPercent.textContent = `${percent}%`;
    els.progressBadge.textContent = `${percent}%`;
    els.progressBadge.className = `badge ${percent === 100 ? "badge--low" : "badge--brand"}`;
    els.progressBar.style.width = `${percent}%`;
    els.progressRing.style.strokeDashoffset = String(RING_LENGTH * (1 - percent / 100));
    els.pillarProgressText.textContent = `${done}/${TOTAL} câu đã trả lời`;
    els.railTime.textContent = missing === 0 ? "Hoàn tất" : `~${Math.max(1, Math.ceil(missing * 0.25))} phút`;
    renderStepper();
    renderWeights();
  }

  function renderAll() {
    renderPillar();
    renderStepper();
    renderWeights();
    updateProgress();
  }

  /* Navigation ------------------------------------------------------------ */
  function scrollToQuestion(questionId) {
    const card = document.getElementById(`card-${questionId}`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function validatePillar(pillarId) {
    const missing = questionsByPillar[pillarId].filter(
      (question) => !Number.isInteger(answers[question.id])
    );
    if (!missing.length) return true;

    missing.forEach((question) => {
      const card = document.getElementById(`card-${question.id}`);
      if (card) card.classList.add("is-missing");
    });
    ns.ui.toast({
      title: "Còn câu chưa trả lời",
      message: `Trụ cột này còn ${missing.length} câu. Vui lòng chọn một đáp án cho mỗi câu.`,
      type: "warn",
    });
    scrollToQuestion(missing[0].id);
    return false;
  }

  function goTo(index) {
    current = ns.risk.clamp(index, 0, pillarIds.length - 1);
    renderAll();
    saveDraft(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    if (!validatePillar(pillarIds[current])) return;
    if (current === pillarIds.length - 1) {
      openConfirm();
      return;
    }
    goTo(current + 1);
  }

  /* Review & submit ------------------------------------------------------- */
  function openConfirm() {
    const missingTotal = TOTAL - answeredTotal();

    els.confirmWarning.innerHTML = missingTotal
      ? `<div class="alert-strip">
           <span class="alert-strip__icon" style="background: var(--medium-soft); color: var(--medium)">
             <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
           </span>
           <div>
             <p class="alert-strip__title">Còn ${missingTotal} câu chưa trả lời</p>
             <p class="alert-strip__desc">Bạn cần hoàn thành đủ 25 câu để kết quả đánh giá chính xác.</p>
             <button class="btn btn-sm btn-soft" type="button" id="fillMissingBtn" style="margin-top:8px">
               <i class="bi bi-pencil-square" aria-hidden="true"></i> Điền các câu còn thiếu
             </button>
           </div>
         </div>`
      : `<div class="risk-note" style="border-style: solid; border-color: rgba(16,185,129,.35)">
           <i class="bi bi-check-circle-fill" style="color: var(--low)" aria-hidden="true"></i>
           <span>Bạn đã trả lời đủ <strong>25/25 câu</strong>. Kết quả sẽ được tính theo trọng số 5 trụ cột.</span>
         </div>`;

    els.reviewList.innerHTML = pillarIds
      .map((pillarId) => {
        const pillar = bank.pillars[pillarId];
        const total = questionsByPillar[pillarId].length;
        const done = answeredInPillar(pillarId);
        return `
          <div class="review-row${done < total ? " is-empty" : ""}">
            <span>${pillar.order}. ${pillar.name}</span>
            <strong>${done}/${total} câu</strong>
          </div>`;
      })
      .join("");

    els.confirmSubmit.disabled = missingTotal > 0;
    els.confirmSubmit.setAttribute("aria-disabled", String(missingTotal > 0));

    const fill = document.getElementById("fillMissingBtn");
    if (fill) {
      fill.addEventListener("click", () => {
        const target = pillarIds.find((pillarId) =>
          questionsByPillar[pillarId].some((question) => !Number.isInteger(answers[question.id]))
        );
        els.confirmDialog.close();
        goTo(pillarIds.indexOf(target));
        // Re-render already highlights nothing; mark + scroll after paint.
        window.setTimeout(() => validatePillar(target), 320);
      });
    }

    if (!els.confirmDialog.open) els.confirmDialog.showModal();
  }

  function calculateResult() {
    const pillarScores = {};
    const indicatorScores = {};
    const alerts = [];
    let penalty = 0;

    pillarIds.forEach((pillarId) => {
      const pillar = bank.pillars[pillarId];
      const indicatorValues = {};

      Object.keys(pillar.indicators).forEach((indicatorKey) => {
        const related = questionsByPillar[pillarId].filter(
          (question) => question.indicator === indicatorKey
        );
        const sum = related.reduce((total, question) => {
          const option = question.options[answers[question.id]];
          return total + (option ? option.risk : 0);
        }, 0);
        indicatorValues[indicatorKey] = Math.round(sum / related.length);
      });

      const weightSum = Object.values(pillar.indicators).reduce(
        (total, indicator) => total + indicator.weight,
        0
      );
      const weighted = Object.keys(pillar.indicators).reduce(
        (total, key) => total + indicatorValues[key] * pillar.indicators[key].weight,
        0
      );

      indicatorScores[pillarId] = indicatorValues;
      pillarScores[pillarId] = Math.round(weighted / weightSum);
    });

    questions.forEach((question) => {
      const option = question.options[answers[question.id]];
      if (!option || !option.critical) return;
      penalty += option.critical;
      alerts.push({
        id: `AL-${question.id}`,
        pillarId: question.pillarId,
        title: `Điểm mù: ${bank.pillars[question.pillarId].indicators[question.indicator].name}`,
        description: option.label,
        severity: "critical",
        impact: bank.pillars[question.pillarId].name,
      });
    });

    const weightedRisk = pillarIds.reduce(
      (total, pillarId) => total + pillarScores[pillarId] * bank.pillars[pillarId].weight,
      0
    ) / 100;

    const criticalPenalty = Math.min(15, penalty);
    const overallRisk = ns.risk.clamp(Math.round(weightedRisk + criticalPenalty), 0, 100);

    return {
      pillarScores,
      indicatorScores,
      alerts,
      criticalPenalty,
      weightedRisk: Math.round(weightedRisk * 10) / 10,
      overallRisk,
    };
  }

  function submit() {
    if (submitting) return;
    if (answeredTotal() < TOTAL) {
      openConfirm();
      return;
    }
    submitting = true;

    const result = calculateResult();
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("");
    const id = `SDRSM-${stamp}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const payload = {
      version: 1,
      id,
      createdAt: now.toISOString(),
      answers,
      pillarScores: result.pillarScores,
      indicators: result.indicatorScores,
      alerts: result.alerts,
      criticalPenalty: result.criticalPenalty,
      weightedRisk: result.weightedRisk,
      overallRisk: result.overallRisk,
      previousRisk: ns.data.currentAssessment().overallRisk,
      source: "assessment",
    };

    ns.store.set(ns.store.KEYS.lastAssessment, payload);
    ns.store.remove(DRAFT_KEY);

    els.overlay.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      window.location.href = "report.html?from=assessment";
    }, SUBMIT_DELAY);
  }

  /* Reset dialog ---------------------------------------------------------- */
  let resetDialog = null;

  function openReset() {
    if (!resetDialog) {
      resetDialog = document.createElement("dialog");
      resetDialog.className = "modal";
      resetDialog.id = "resetDialog";
      resetDialog.innerHTML = `
        <div class="modal__head">
          <span class="modal__icon" style="background: var(--critical-soft); color: var(--critical)">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          </span>
          <div>
            <h2 style="font-size: 1rem">Làm lại bài đánh giá?</h2>
            <p class="text-muted text-sm">Toàn bộ câu trả lời đang lưu nháp sẽ bị xoá. Hành động này không thể hoàn tác.</p>
          </div>
          <button class="icon-btn icon-btn--ghost modal__close" type="button" data-dialog-close aria-label="Đóng">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal__foot">
          <button class="btn btn-outline" type="button" data-dialog-close>Giữ lại</button>
          <button class="btn btn-danger" type="button" id="confirmResetBtn">
            <i class="bi bi-trash3" aria-hidden="true"></i> Xoá &amp; làm lại
          </button>
        </div>`;
      document.body.appendChild(resetDialog);
      resetDialog.addEventListener("click", (event) => {
        if (event.target === resetDialog) resetDialog.close();
      });
    }

    resetDialog.showModal();
    resetDialog.querySelector("#confirmResetBtn").onclick = () => {
      answers = {};
      current = 0;
      ns.store.remove(DRAFT_KEY);
      resetDialog.close();
      renderAll();
      ns.ui.toast({ title: "Đã làm mới bài đánh giá", message: "Bạn có thể bắt đầu lại từ trụ cột đầu tiên.", type: "success" });
    };
  }

  /* Events ---------------------------------------------------------------- */
  els.list.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="radio"]');
    if (!input) return;
    const card = input.closest("[data-question]");
    if (!card) return;

    answers[card.dataset.question] = Number(input.value);
    card.classList.remove("is-missing");
    saveDraft(false);
    updateProgress();
  });

  els.stepList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    goTo(Number(button.dataset.step));
  });

  els.prev.addEventListener("click", () => goTo(current - 1));
  els.next.addEventListener("click", goNext);
  els.submit.addEventListener("click", openConfirm);
  els.confirmSubmit.addEventListener("click", () => {
    els.confirmDialog.close();
    submit();
  });
  els.saveDraft.addEventListener("click", () => saveDraft(true));
  els.reset.addEventListener("click", openReset);

  // Ctrl/Cmd + Enter submits from anywhere in the wizard.
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      openConfirm();
    }
  });

  renderAll();
  updateProgress();
})(window.SDRSM);

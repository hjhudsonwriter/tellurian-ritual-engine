(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- Elements (guarded) ----------
  const elRoundNow = $("roundNow");
  const elRoundMax = $("roundMax");
  const elRoundPips = $("roundPips");
  const elEventTitle = $("eventTitle");
  const elEventHint = $("eventHint");

  const elPulseLabel = $("pulseLabel");
  const elStateLabel = $("stateLabel");

  const elMemoryTarget = $("memoryTarget");

  const sealOverlay = $("sealOverlay");

  const modal = $("modal");
  const modalTitle = $("modalTitle");
  const modalBody = $("modalBody");
  const rollInput = $("rollInput");
  const slotField = $("slotField");
  const slotInput = $("slotInput");
  const advField = $("advField");
  const advSelect = $("advSelect");
  const memoryAdjustField = $("memoryAdjustField");
  const memoryAdjust = $("memoryAdjust");
  const btnCancel = $("btnCancel");
  const btnApply = $("btnApply");
  const modalFoot = $("modalFoot");

  const dmDock = $("dmDock");
  const btnPrevRound = $("btnPrevRound");
  const btnNextRound = $("btnNextRound");
  const btnAutoEvent = $("btnAutoEvent");

  const stressStoneSel = $("stressStone");
  const btnStressPlus = $("btnStressPlus");
  const btnStressMinus = $("btnStressMinus");

  const progStoneSel = $("progStone");
  const btnProgPlus = $("btnProgPlus");
  const btnProgMinus = $("btnProgMinus");

  const btnInterrupt = $("btnInterrupt");
  const btnClearInterrupt = $("btnClearInterrupt");
  const btnSealTest = $("btnSealTest");
  const btnReset = $("btnReset");

  const toast = $("toast");

  // ---------- State ----------
  const state = {
    round: 1,
    roundMax: 8,
    eventIndex: 0,
    interruption: false,
    phase: "running", // running | finaltest | sealed | failed
    stones: {
      weight: { name: "Stone of Weight", progress: 0, stress: 0, locked: false },
      memory: { name: "Stone of Memory", progress: 0, stress: 0, locked: false },
      silence: { name: "Stone of Silence", progress: 0, stress: 0, locked: false },
    },
    // memory mini-game target number
    memoryTargetByRound: (r) => (r <= 2 ? 6 : r <= 5 ? 7 : 8),
    // modal context
    modalCtx: null,
  };

  // ---------- Heartwood Events (simple + safe) ----------
  const events = [
    {
      title: "Root Surge",
      hint: "Weight Stone +1 Stress (unless locked).",
      apply: () => addStress("weight", 1, { fromEvent: true }),
    },
    {
      title: "Memory Pulse",
      hint: "Memory Stone +1 Stress (unless locked).",
      apply: () => addStress("memory", 1, { fromEvent: true }),
    },
    {
      title: "Arcane Feedback",
      hint: "Silence Stone +1 Stress (unless locked).",
      apply: () => addStress("silence", 1, { fromEvent: true }),
    },
    {
      title: "False Calm",
      hint: "No stress. The Heartwood listens.",
      apply: () => toastMsg("False Calm…"),
    },
    {
      title: "Echoing Fear",
      hint: "All unlocked stones +1 Stress.",
      apply: () => {
        ["weight", "memory", "silence"].forEach((id) => addStress(id, 1, { fromEvent: true }));
      },
    },
    {
      title: "Moment of Stillness",
      hint: "Remove 1 Stress from the most strained stone.",
      apply: () => {
        const ids = ["weight", "memory", "silence"].sort(
          (a, b) => state.stones[b].stress - state.stones[a].stress
        );
        removeStress(ids[0], 1);
      },
    },
  ];

  // ---------- Rendering ----------
  function renderRoundPips() {
    if (!elRoundPips) return;
    elRoundPips.innerHTML = "";
    for (let i = 1; i <= state.roundMax; i++) {
      const d = document.createElement("div");
      d.className = "pip" + (i <= state.round ? " on" : "");
      elRoundPips.appendChild(d);
    }
  }

  function renderEvent() {
    const ev = events[state.eventIndex] || events[0];
    if (elEventTitle) elEventTitle.textContent = ev.title;
    if (elEventHint) elEventHint.textContent = ev.hint;
  }

  function renderMemoryTarget() {
    const t = state.memoryTargetByRound(state.round);
    if (elMemoryTarget) elMemoryTarget.textContent = String(t);
  }

  function renderStone(id) {
    const st = state.stones[id];
    if (!st) return;

    // Progress pips (0..3)
    const progEl = $("prog_" + id);
    if (progEl) {
      progEl.innerHTML = "";
      for (let i = 1; i <= 3; i++) {
        const p = document.createElement("div");
        p.className = "pip" + (i <= st.progress ? " on" : "");
        progEl.appendChild(p);
      }
      if (st.locked) progEl.classList.add("locked");
      else progEl.classList.remove("locked");
    }

    // Stress pips (0..4)
    const stressEl = $("stress_" + id);
    if (stressEl) {
      stressEl.innerHTML = "";
      for (let i = 0; i <= 4; i++) {
        const s = document.createElement("div");
        const on = i > 0 && i <= st.stress;
        s.className = "stressPip" + (on ? " on" : "");
        if (i === 4) s.classList.add("break");
        stressEl.appendChild(s);
      }
    }

    // Cracks visual (swap overlay by stress)
const crackEl = $("crack_" + id);
if (crackEl) {
  let crackImg = "";
  if (st.stress === 1) crackImg = "assets/img/cracks_1.png";
  if (st.stress === 2) crackImg = "assets/img/cracks_2.png";
  if (st.stress >= 3) crackImg = "assets/img/cracks_3.png";

  crackEl.style.backgroundImage = crackImg ? `url("${crackImg}")` : "none";
  crackEl.style.opacity = st.stress === 0 ? "0" : "1";
  crackEl.style.filter = st.stress >= 3 ? "drop-shadow(0 0 18px rgba(110,240,166,.25))" : "none";
}

    // Disk glow
    const diskEl = $("disk_" + id);
    if (diskEl) {
      diskEl.classList.toggle("locked", !!st.locked);
      diskEl.classList.toggle("danger", st.stress >= 3);
    }

    // Rule line (dynamic DCs)
    const ruleEl = $("rule_" + id);
    if (ruleEl) {
      if (id === "weight") {
        const dc = 12 + st.stress;
        ruleEl.textContent = `DC ${dc} (12 + Stress). Athletics or Acrobatics. Optional: Advantage (risk +Stress on fail).`;
      }
      if (id === "silence") {
        ruleEl.textContent = `DC = 10 + Slot + Stress (${st.stress}). Arcana or Religion. Or Exhaustion = auto success (+Stress).`;
      }
    }
  }

  function renderAllStones() {
    renderStone("weight");
    renderStone("memory");
    renderStone("silence");
  }

  function updateHeartwood() {
    const s = state.stones;
    const totalStress = s.weight.stress + s.memory.stress + s.silence.stress;
    const totalProg = s.weight.progress + s.memory.progress + s.silence.progress;

    // Pulse speed: faster with stress, slower with progress/locks
    const locks = [s.weight.locked, s.memory.locked, s.silence.locked].filter(Boolean).length;
    const base = 2.6; // seconds
    const speed = clamp(base - (totalStress * 0.18) + (locks * 0.20), 1.1, 3.2);
    document.documentElement.style.setProperty("--pulse", `${speed}s`);

    // Glow color shifts with stress (green -> amber -> red)
    let glow = "rgba(110,240,166,0.95)";
    if (totalStress >= 7) glow = "rgba(255,204,102,0.95)";
    if (totalStress >= 10) glow = "rgba(255,93,108,0.95)";
    document.documentElement.style.setProperty("--glow", glow);

    if (elPulseLabel) {
      const label =
        state.phase === "sealed" ? "Dormant" :
        state.phase === "failed" ? "Racing" :
        totalStress <= 2 ? "Steady" :
        totalStress <= 6 ? "Strained" :
        totalStress <= 9 ? "Wild" : "Critical";
      elPulseLabel.textContent = label;
    }

    if (elStateLabel) {
      const label =
        state.phase === "sealed" ? "Seal set. Heartwood sleeping." :
        state.phase === "failed" ? "Ritual collapse." :
        state.phase === "finaltest" ? "Final Seal Test" :
        "Binding in progress";
      elStateLabel.textContent = label;
    }

    // Seal overlay animation
    if (sealOverlay) {
      const allLocked = allStonesLocked();
      const show = state.phase === "sealed" || allLocked;
      sealOverlay.style.transition = "opacity 1200ms ease";
      sealOverlay.style.opacity = show ? "1" : "0";
      sealOverlay.classList.toggle("sealOverlay--spin", show);
    }

    // Auto transition to final test if all locked
    if (state.phase === "running" && allStonesLocked()) {
      // Don’t force modal; just nudge.
      toastMsg("All stones locked. Ready for Final Seal Test.");
    }

    // Failure check
    if (state.phase !== "failed" && (s.weight.stress >= 4 || s.memory.stress >= 4 || s.silence.stress >= 4)) {
      state.phase = "failed";
      toastMsg("A glyph fractures. The binding falters.");
    }

    // Resolve check
    if (state.phase === "finaltest" && allFinalsSet()) {
      // Determine outcome by failures
      const fails = Object.values(state.finalResults).filter((x) => x === "fail").length;
      if (fails === 0) {
        state.phase = "sealed";
        toastMsg("Seal set. Heartwood sleeps.");
      } else {
        state.phase = "sealed"; // still sealed, but imperfect
        toastMsg(`Seal set with imperfections (${fails} failure${fails>1?"s":""}).`);
      }
    }
  }

  function renderAll() {
    if (elRoundNow) elRoundNow.textContent = String(state.round);
    if (elRoundMax) elRoundMax.textContent = String(state.roundMax);
    renderRoundPips();
    renderEvent();
    renderMemoryTarget();
    renderAllStones();
    updateHeartwood();
  }

  // ---------- Helpers ----------
  function allStonesLocked() {
    const s = state.stones;
    return s.weight.locked && s.memory.locked && s.silence.locked;
  }

  function setLockedIfComplete(id) {
    const st = state.stones[id];
    if (!st) return;
    if (st.progress >= 3) {
      st.progress = 3;
      st.locked = true;
    } else {
      st.locked = false;
    }
  }

  function toastMsg(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(toast.__t);
    toast.__t = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function addStress(id, n = 1, opts = {}) {
    const st = state.stones[id];
    if (!st) return;
    if (opts.fromEvent && st.locked) return; // locked stones ignore event stress
    st.stress = clamp(st.stress + n, 0, 4);
    renderStone(id);
    updateHeartwood();
  }

  function removeStress(id, n = 1) {
    const st = state.stones[id];
    if (!st) return;
    st.stress = clamp(st.stress - n, 0, 4);
    renderStone(id);
    updateHeartwood();
  }

  function addProgress(id, n = 1) {
    const st = state.stones[id];
    if (!st) return;
    st.progress = clamp(st.progress + n, 0, 3);
    setLockedIfComplete(id);
    renderStone(id);
    updateHeartwood();
  }

  function removeProgress(id, n = 1) {
    const st = state.stones[id];
    if (!st) return;
    st.progress = clamp(st.progress - n, 0, 3);
    setLockedIfComplete(id);
    renderStone(id);
    updateHeartwood();
  }

  // ---------- Event control ----------
  function cycleEvent(dir = 1) {
    state.eventIndex = (state.eventIndex + dir + events.length) % events.length;
    renderEvent();
  }

  function rollEvent() {
    state.eventIndex = Math.floor(Math.random() * events.length);
    renderEvent();
    toastMsg("Event rolled.");
  }

  function applyEvent() {
    if (state.phase === "failed") return;
    const ev = events[state.eventIndex] || events[0];
    try {
      ev.apply();
      toastMsg(ev.title);
    } catch {
      toastMsg("Event failed to apply.");
    }
    renderAll();
  }

  // ---------- Modal mini-game handling ----------
  function openModal(ctx) {
    if (!modal) return;
    state.modalCtx = ctx;

    // Reset fields
    if (rollInput) rollInput.value = "";
    if (slotInput) slotInput.value = "0";
    if (advSelect) advSelect.value = "no";
    if (memoryAdjust) memoryAdjust.value = "0";

    if (modalFoot) modalFoot.textContent = "";

    // Configure per stone/action
    const { stone, action } = ctx;
    const st = state.stones[stone];

    if (modalTitle) modalTitle.textContent = action === "assist" ? "Assist" : "Attempt";

    // show/hide special fields
    if (slotField) slotField.style.display = stone === "silence" ? "block" : "none";
    if (advField) advField.style.display = stone === "weight" ? "block" : "none";
    if (memoryAdjustField) memoryAdjustField.style.display = (stone === "memory" && action === "assist") ? "block" : "none";

    const memTarget = state.memoryTargetByRound(state.round);

    let body = "";
    if (stone === "weight") {
      const dc = 12 + st.stress;
      body = `<div class="modal__lead">Hold the chamber steady.</div>
              <div class="modal__rule">DC <b>${dc}</b> (12 + Stress). Enter the player’s check result.</div>
              <div class="modal__rule">If Advantage is used and the roll fails, Weight gains +1 Stress.</div>`;
    } else if (stone === "memory") {
      body = `<div class="modal__lead">Match the Heartwood’s rhythm.</div>
              <div class="modal__rule">Target this round: <b>${memTarget}</b>. Enter the player’s <b>2d6</b> total.</div>
              <div class="modal__rule">Exact match: +1 Progress and -1 Stress. Within ±1: +1 Progress. Miss by 2+: +1 Stress.</div>`;
      if (action === "assist") {
        body += `<div class="modal__rule">Assist can shift the target by ±1 (use Target Adjust).</div>`;
      }
    } else if (stone === "silence") {
      body = `<div class="modal__lead">Press the magic down.</div>
              <div class="modal__rule">DC = 10 + Slot + Stress. Enter the player’s Arcana/Religion result.</div>
              <div class="modal__rule">If using Exhaustion instead of a slot: set Slot to 0 and enter <b>999</b> as the roll (auto pass), then manually add +1 Stress via DM dock.</div>`;
    }

    if (modalBody) modalBody.innerHTML = body;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    // focus
    setTimeout(() => rollInput && rollInput.focus(), 50);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    state.modalCtx = null;
  }

  function applyModal() {
    const ctx = state.modalCtx;
    if (!ctx) return;
    const { stone, action } = ctx;
    const st = state.stones[stone];

    const roll = Number(rollInput?.value || NaN);
    if (!Number.isFinite(roll)) {
      if (modalFoot) modalFoot.textContent = "Enter a numeric roll result.";
      return;
    }

    // Evaluate
    if (stone === "weight") {
      const dc = 12 + st.stress;
      const usedAdv = (advSelect?.value === "yes");
      if (roll >= dc) {
        addProgress("weight", 1);
        toastMsg("Weight: Success (+Progress)");
      } else {
        // Fail by 5+ => +Stress, else nothing
        const failBy = dc - roll;
        if (failBy >= 5) addStress("weight", 1);
        if (usedAdv) addStress("weight", 1); // advantage risk
        toastMsg("Weight: Failure");
      }
    }

    if (stone === "memory") {
      const baseTarget = state.memoryTargetByRound(state.round);
      const adjust = action === "assist" ? Number(memoryAdjust?.value || 0) : 0;
      const target = clamp(baseTarget + adjust, 2, 12);
      const diff = Math.abs(roll - target);
      if (diff === 0) {
        addProgress("memory", 1);
        removeStress("memory", 1);
        toastMsg("Memory: Exact match (+Progress, -Stress)");
      } else if (diff === 1) {
        addProgress("memory", 1);
        toastMsg("Memory: Close match (+Progress)");
      } else {
        addStress("memory", 1);
        toastMsg("Memory: Miss (+Stress)");
      }
    }

    if (stone === "silence") {
      const slot = clamp(Number(slotInput?.value || 0), 0, 9);
      const dc = 10 + slot + st.stress;
      if (roll >= dc) {
        addProgress("silence", 1);
        toastMsg("Silence: Held (+Progress)");
      } else {
        addStress("silence", 1);
        toastMsg("Silence: Backlash (+Stress)");
      }
    }

    closeModal();
    renderAll();
  }

  // ---------- Round control ----------
  function nextRound() {
    if (state.phase === "failed") return;
    state.round = clamp(state.round + 1, 1, state.roundMax);
    renderAll();
    toastMsg(`Round ${state.round}`);
    if (state.round === state.roundMax && state.phase === "running") {
      toastMsg("Final round. Consider triggering Final Seal Test.");
    }
  }

  function prevRound() {
    state.round = clamp(state.round - 1, 1, state.roundMax);
    renderAll();
    toastMsg(`Round ${state.round}`);
  }

  // ---------- Final Seal Test ----------
  state.finalResults = { weight: null, memory: null, silence: null };

  function beginFinalTest() {
    if (state.phase === "failed") return;
    state.phase = "finaltest";
    state.finalResults = { weight: null, memory: null, silence: null };
    toastMsg("Final Seal Test: Weight → Memory → Silence");
    renderAll();
  }

  function recordFinalResult(id, passFail) {
    state.finalResults[id] = passFail;
    const done = allFinalsSet();
    if (done) {
      // resolve in updateHeartwood()
      updateHeartwood();
      renderAll();
      return;
    }
  }

  function allFinalsSet() {
    const r = state.finalResults;
    return r.weight && r.memory && r.silence;
  }

  // ---------- Interruption flag ----------
  function setInterruption(on) {
    state.interruption = !!on;
    document.body.classList.toggle("interruption", state.interruption);
    toastMsg(on ? "Interruption!" : "Interruption cleared.");
  }

  // ---------- Reset ----------
  function resetAll() {
    state.round = 1;
    state.eventIndex = 0;
    state.phase = "running";
    state.interruption = false;
    state.finalResults = { weight: null, memory: null, silence: null };
    Object.values(state.stones).forEach((s) => {
      s.progress = 0;
      s.stress = 0;
      s.locked = false;
    });
    setInterruption(false);
    renderAll();
    toastMsg("Ritual reset.");
  }

  // ---------- DM Dock toggle ----------
  function toggleDmDock() {
    if (!dmDock) return;
    const open = dmDock.getAttribute("aria-hidden") !== "false";
    dmDock.setAttribute("aria-hidden", open ? "false" : "true");
    dmDock.classList.toggle("open", open);
  }

  // ---------- Wiring ----------
  function bind() {
    // Stone buttons
    document.querySelectorAll("[data-action][data-stone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const stone = btn.getAttribute("data-stone");
        const action = btn.getAttribute("data-action");
        if (!stone) return;
        openModal({ stone, action: action === "help" ? "assist" : "attempt" });
      });
    });

    // Modal
    btnCancel?.addEventListener("click", closeModal);
    btnApply?.addEventListener("click", applyModal);
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // DM Dock
    btnNextRound?.addEventListener("click", () => { nextRound(); });
    btnPrevRound?.addEventListener("click", () => { prevRound(); });
    btnAutoEvent?.addEventListener("click", () => { rollEvent(); });

    btnStressPlus?.addEventListener("click", () => addStress(stressStoneSel?.value || "weight", 1));
    btnStressMinus?.addEventListener("click", () => removeStress(stressStoneSel?.value || "weight", 1));

    btnProgPlus?.addEventListener("click", () => addProgress(progStoneSel?.value || "weight", 1));
    btnProgMinus?.addEventListener("click", () => removeProgress(progStoneSel?.value || "weight", 1));

    btnInterrupt?.addEventListener("click", () => setInterruption(true));
    btnClearInterrupt?.addEventListener("click", () => setInterruption(false));

    btnSealTest?.addEventListener("click", beginFinalTest);
    btnReset?.addEventListener("click", resetAll);

    // Keyboard
    window.addEventListener("keydown", (e) => {
      if (e.key === "`") {
        e.preventDefault();
        toggleDmDock();
        return;
      }
      if (modal?.classList.contains("open")) {
        if (e.key === "Escape") closeModal();
        if (e.key === "Enter") applyModal();
        return;
      }

      if (e.key.toLowerCase() === "n") nextRound();
      if (e.key.toLowerCase() === "p") prevRound();
      if (e.key.toLowerCase() === "e") cycleEvent(1);
      if (e.key === "1") openModal({ stone: "weight", action: "attempt" });
      if (e.key === "2") openModal({ stone: "memory", action: "attempt" });
      if (e.key === "3") openModal({ stone: "silence", action: "attempt" });
    });

    // Click event title to apply (nice for projector)
    elEventTitle?.addEventListener("click", applyEvent);
    elEventHint?.addEventListener("click", applyEvent);

    // Initialize
    renderAll();
  }

  bind();
})();

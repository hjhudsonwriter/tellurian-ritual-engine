(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- Elements ----------
  const elRoundNow = $("roundNow");
  const elRoundMax = $("roundMax");
  const elRoundPips = $("roundPips");

  const elEventTitle = $("eventTitle");
  const elEventHint = $("eventHint");

  const elPulseLabel = $("pulseLabel");
  const elStateLabel = $("stateLabel");

  const elMemoryTarget = $("memoryTarget");

  const btnSound = $("btnSound");
  const btnDock = $("btnDock");
  const btnRollEvent = $("btnRollEvent");
  const btnApplyEvent = $("btnApplyEvent");
  const btnPrevEvent = $("btnPrevEvent");
  const btnNextEvent = $("btnNextEvent");
  const btnNextRound = $("btnNextRound");

  const logEl = $("log");
  const btnClearLog = $("btnClearLog");

  // Modal
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

  // DM Dock
  const dmDock = $("dmDock");
  const btnDockClose = $("btnDockClose");

  const btnPrevRound = $("btnPrevRound");
  const btnNextRoundDock = $("btnNextRoundDock");
  const btnRollEventDock = $("btnRollEventDock");

  const stressStoneSel = $("stressStone");
  const btnStressPlus = $("btnStressPlus");
  const btnStressMinus = $("btnStressMinus");

  const progStoneSel = $("progStone");
  const btnProgPlus = $("btnProgPlus");
  const btnProgMinus = $("btnProgMinus");

  const btnReset = $("btnReset");

  const toast = $("toast");

    // Banner (cinematic popup)
  const banner = $("banner");
  const bannerKicker = $("bannerKicker");
  const bannerTitle = $("bannerTitle");
  const bannerText = $("bannerText");

  // ---------- Audio Engine (requires user click) ----------
  const audio = {
    enabled: false,
    ctx: null,
    heartbeat: null,
    sfx: {},
  };

  function audioPath(name){ return `assets/audio/${name}`; }

  async function enableAudio() {
    try {
      if (!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      await audio.ctx.resume();

      // Heartbeat loop
      audio.heartbeat = new Audio(audioPath("heartbeat_loop.mp3"));
      audio.heartbeat.loop = true;
      audio.heartbeat.volume = 0.55;

      // One-shots
      audio.sfx.progress = new Audio(audioPath("sfx_progress.mp3"));
      audio.sfx.stress = new Audio(audioPath("sfx_stress.mp3"));
      audio.sfx.lock = new Audio(audioPath("sfx_lock.mp3"));
      audio.sfx.interrupt = new Audio(audioPath("sfx_interrupt.mp3"));
      audio.sfx.seal = new Audio(audioPath("sfx_seal.mp3"));

      audio.enabled = true;
      btnSound.textContent = "Sound Enabled";
      btnSound.classList.add("btn--primary");

      // start heartbeat
      audio.heartbeat.currentTime = 0;
      await audio.heartbeat.play();

      toastMsg("Sound enabled.");
    } catch (e) {
      console.warn(e);
      toastMsg("Sound blocked by browser. Try clicking Enable Sound again.");
    }
  }

  function playSfx(key){
    if (!audio.enabled) return;
    const s = audio.sfx[key];
    if (!s) return;
    try {
      s.currentTime = 0;
      s.play().catch(()=>{});
    } catch {}
  }

  function setHeartbeatRate(rate){
    if (!audio.enabled || !audio.heartbeat) return;
    audio.heartbeat.playbackRate = clamp(rate, 0.75, 1.45);
  }

  // ---------- State ----------
  const state = {
    round: 1,
    roundMax: 8,
    eventIndex: 0,
    phase: "running", // running | failed | sealed
    stones: {
      weight:  { progress: 0, stress: 0, locked: false },
      memory:  { progress: 0, stress: 0, locked: false },
      silence: { progress: 0, stress: 0, locked: false },
    },
    modalCtx: null,
  };

  function memoryTargetByRound(r){
    return (r <= 2) ? 6 : (r <= 5) ? 7 : 8;
  }

  // ---------- Events ----------
  const events = [
  {
    title: "Root Surge",
    hint: "The Heartwood heaves. Ancient roots tear against the chamber walls, straining all that bears the Weight of the binding.",
    apply:()=>addStress("weight",1,{event:true})
  },
  {
    title: "Echo of What Was",
    hint: "Old memories bleed into the stone. The past presses close, heavy with voices that refuse to be forgotten.",
    apply:()=>addStress("memory",1,{event:true})
  },
  {
    title: "Arcane Backwash",
    hint: "Dormant magic recoils violently. The air sharpens, and silence fractures under the strain.",
    apply:()=>addStress("silence",1,{event:true})
  },
  {
    title: "False Calm",
    hint: "The roots still. For a heartbeat, the chamber listens… and waits.",
    apply:()=>{/* no effect */}
  },
  {
    title: "Veinwood Thrum",
    hint: "The Heartwood pulses like a living heart. All unbound stones tremble in answer.",
    apply:()=>["weight","memory","silence"].forEach(id=>addStress(id,1,{event:true}))
  },
  {
    title: "Moment of Reprieve",
    hint: "A breath passes through the roots. One stone is granted a fleeting mercy.",
    apply:()=>{
      const ids=["weight","memory","silence"].sort((a,b)=>state.stones[b].stress-state.stones[a].stress);
      removeStress(ids[0],1);
    }
  }
];

  // ---------- UI Render ----------
  function renderRoundPips(){
    elRoundPips.innerHTML = "";
    for(let i=1;i<=state.roundMax;i++){
      const d=document.createElement("div");
      d.className = "pip" + (i<=state.round ? " on":"");
      elRoundPips.appendChild(d);
    }
  }

  function renderEvent(){
    const ev = events[state.eventIndex] || events[0];
    elEventTitle.textContent = ev.title;
    elEventHint.textContent = ev.hint;
  }

  function renderMemoryTarget(){
    elMemoryTarget.textContent = String(memoryTargetByRound(state.round));
  }

  function renderStone(id){
  const st = state.stones[id];

  // Progress pips
  const progEl = $("prog_"+id);
  if (progEl){
    progEl.innerHTML = "";
    for(let i=1;i<=3;i++){
      const p=document.createElement("div");
      p.className="pip"+(i<=st.progress?" on":"");
      progEl.appendChild(p);
    }
  }

  // Stress pips
  const stressEl = $("stress_"+id);
  if (stressEl){
    stressEl.innerHTML = "";
    for(let i=1;i<=4;i++){
      const s=document.createElement("div");
      s.className="stressPip"+(i<=st.stress?" on":"");
      stressEl.appendChild(s);
    }
  }

  // Crack overlay (single source of truth)
  const crackEl = $("crack_"+id);
  if (crackEl){
    let crackImg = "";
    if (!st.locked){
      if (st.stress === 1) crackImg = "assets/img/cracks_1.png";
      if (st.stress === 2) crackImg = "assets/img/cracks_2.png";
      if (st.stress >= 3) crackImg = "assets/img/cracks_3.png";
    }

    crackEl.style.backgroundImage = crackImg ? `url("${crackImg}")` : "none";

    // Fade intensity by stress
    if (st.locked || st.stress <= 0) crackEl.style.opacity = "0";
    else if (st.stress === 1) crackEl.style.opacity = "0.55";
    else if (st.stress === 2) crackEl.style.opacity = "0.70";
    else crackEl.style.opacity = "0.85";
  }

  // Optional rule text (only if element exists)
  const ruleEl = $("rule_"+id);
  if(ruleEl){
    if(id==="weight"){
      const dc=12+st.stress;
      ruleEl.textContent = `DC ${dc} (12 + Stress). Athletics/Acrobatics. Assist = Advantage toggle.`;
    }
    if(id==="memory"){
      const t=memoryTargetByRound(state.round);
      ruleEl.textContent = `Roll 2d6 vs Target ${t}. Exact: +Progress and -Stress. ±1: +Progress. Miss by 2+: +Stress.`;
    }
    if(id==="silence"){
      const dcBase = 10 + st.stress;
      ruleEl.textContent = `DC = 10 + Slot + Stress. Base ${dcBase} (slot adds more). Arcana/Religion.`;
    }
  }
}

  function renderAll(){
    elRoundNow.textContent = String(state.round);
    elRoundMax.textContent = String(state.roundMax);
    renderRoundPips();
    renderEvent();
    renderMemoryTarget();
    renderStone("weight"); renderStone("memory"); renderStone("silence");
    updatePulse();
  }

  function updatePulse(){
    const s=state.stones;
    const totalStress = s.weight.stress + s.memory.stress + s.silence.stress;
    const locks = [s.weight.locked, s.memory.locked, s.silence.locked].filter(Boolean).length;

    // heartbeat speed + CSS pulse
    const speed = clamp(2.6 - totalStress*0.18 + locks*0.20, 1.2, 3.2);
    document.documentElement.style.setProperty("--pulse", `${speed}s`);

    const hbRate = clamp(1.0 + totalStress*0.05 - locks*0.03, 0.85, 1.35);
    setHeartbeatRate(hbRate);

    // glow shifts slightly with stress
    let glow="rgba(110,240,166,0.95)";
    if(totalStress>=7) glow="rgba(255,204,102,0.95)";
    if(totalStress>=10) glow="rgba(255,93,108,0.95)";
    document.documentElement.style.setProperty("--glow", glow);

    const label =
      state.phase==="sealed" ? "Dormant" :
      state.phase==="failed" ? "Racing" :
      totalStress<=2 ? "Steady" :
      totalStress<=6 ? "Strained" :
      totalStress<=9 ? "Wild" : "Critical";

    elPulseLabel.textContent = label;

    const stateTxt =
      state.phase==="sealed" ? "Seal set. Heartwood sleeping." :
      state.phase==="failed" ? "Ritual collapse." :
      "Binding in progress";

    elStateLabel.textContent = stateTxt;

    // fail check
    if(state.phase!=="failed"){
      if(s.weight.stress>=4 || s.memory.stress>=4 || s.silence.stress>=4){
        state.phase="failed";
                showBanner("RITUAL COLLAPSE", "A Glyph Fractures", "Stress reached 4. The binding fails.", 4200);
        playSfx("interrupt");
        log("Glyph Fracture", "A stone screams as it cracks. The binding collapses.");
        toastMsg("FAILED: A stone fractured (Stress 4).");
      }
    }

    // seal check (all locked)
    if(state.phase==="running" && allLocked()){
      state.phase="sealed";
            showBanner("FINAL SEAL", "The Heartwood Sleeps", "All stones locked. The earth closes.", 4200);
      playSfx("seal");
      log("Seal Set", "The roots recoil. The earth closes like an eyelid. The Heartwood sleeps.");
      toastMsg("SEALED: All stones locked.");
    }
  }

  function allLocked(){
    const s=state.stones;
    return s.weight.locked && s.memory.locked && s.silence.locked;
  }

  // ---------- Log / Toast ----------
  function log(title, text){
    if(!logEl) return;
    const e=document.createElement("div");
    e.className="entry";
    const ts = new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    e.innerHTML = `
      <div class="entryMeta"><span>Round ${state.round}</span><span>${ts}</span></div>
      <div class="entryTitle">${title}</div>
      <div class="entryText">${text}</div>
    `;
    logEl.prepend(e);
  }

  function toastMsg(msg){
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast.__t);
    toast.__t=setTimeout(()=>toast.classList.remove("show"), 2200);
  }

    function showBanner(kicker, title, text, ms=2600){
    if(!banner) return;
    bannerKicker.textContent = kicker || "";
    bannerTitle.textContent = title || "";
    bannerText.textContent = text || "";
    banner.classList.add("show");
    banner.setAttribute("aria-hidden","false");
    clearTimeout(banner.__t);
    banner.__t = setTimeout(()=>{
      banner.classList.remove("show");
      banner.setAttribute("aria-hidden","true");
    }, ms);
  }

  // ---------- State mutations ----------
  function setLockedIfComplete(id){
    const st=state.stones[id];
    if(st.progress>=3){
      st.progress=3;
      if(!st.locked){
        st.locked=true;
        playSfx("lock");
                showBanner("STONE LOCKED", cap(id), "The glyph falls quiet.", 3000);
        log("Stone Locked", `${cap(id)} locks into place. The runes go still.`);
      }
    } else {
      st.locked=false;
    }
  }

  function addStress(id, n=1, opts={}){
    const st=state.stones[id];
    if(opts.event && st.locked) return;
    st.stress = clamp(st.stress+n, 0, 4);
    playSfx("stress");
        showBanner("STONE STRAIN", `${cap(id)}`, "+1 Stress", 2400);
    renderAll();
  }

  function removeStress(id, n=1){
    const st=state.stones[id];
    st.stress = clamp(st.stress-n, 0, 4);
    renderAll();
  }

  function addProgress(id, n=1){
    const st=state.stones[id];
    st.progress = clamp(st.progress+n, 0, 3);
    playSfx("progress");
        showBanner("BINDING HOLDS", `${cap(id)}`, "+1 Progress", 2400);
    setLockedIfComplete(id);
    renderAll();
  }

  function removeProgress(id, n=1){
    const st=state.stones[id];
    st.progress = clamp(st.progress-n, 0, 3);
    setLockedIfComplete(id);
    renderAll();
  }

  // ---------- Events ----------
    function rollEvent(){
    state.eventIndex = Math.floor(Math.random()*events.length);
    renderEvent();
    const ev = events[state.eventIndex];
    showBanner("HEARTWOOD EVENT", ev.title, "Ready to apply.", 3200);
    toastMsg("Event rolled.");
  }

  function cycleEvent(dir){
    state.eventIndex = (state.eventIndex + dir + events.length) % events.length;
    renderEvent();
  }
  
    function applyEvent(){
    if(state.phase!=="running") return;
    const ev = events[state.eventIndex];
    ev.apply();
    showBanner("HEARTWOOD EVENT", ev.title, ev.hint, 3200);
    toastMsg(ev.title);
    renderAll();
  }

  // ---------- Round ----------
  function nextRound(){
  if(state.phase!=="running") return;

  // If we're already at the final round, Next Round becomes "Resolve Finale"
  if(state.round >= state.roundMax){
    if(allLocked()){
      // Force a clear finale moment even if it already sealed earlier
      state.phase = "sealed";
      playSfx("seal");
      log("Final Seal", "The last glyph falls quiet. The roots recoil. The earth closes like an eyelid. The Heartwood sleeps.");
      toastMsg("RITUAL COMPLETE: The Heartwood is sealed.");
    } else {
      state.phase = "failed";
      playSfx("interrupt");
      log("Time Runs Out", "The lullaby falters. The chamber convulses. The binding collapses under its own strain.");
      toastMsg("RITUAL FAILED: Time ran out (not all stones locked).");
    }
    renderAll();
    return;
  }

  // Normal advance
  state.round = clamp(state.round+1, 1, state.roundMax);
  log("Round Advances", "The chamber shifts. Roots redraw their lines across the stone.");
  renderAll();
}

  function prevRound(){
    state.round = clamp(state.round-1, 1, state.roundMax);
    renderAll();
  }

  // ---------- Modal ----------
  function openModal(stone, action){
    if(state.phase!=="running") return;
    state.modalCtx = { stone, action };

    rollInput.value = "";
    slotInput.value = "0";
    advSelect.value = "no";
    memoryAdjust.value = "0";
    modalFoot.textContent = "";

    modalTitle.textContent = (action==="assist") ? "Assist" : "Attempt";

    slotField.style.display = (stone==="silence") ? "block" : "none";
    advField.style.display = (stone==="weight") ? "block" : "none";
    memoryAdjustField.style.display = (stone==="memory" && action==="assist") ? "block" : "none";

    const st = state.stones[stone];
    const t = memoryTargetByRound(state.round);

    if(stone==="weight"){
      const dc=12+st.stress;
      modalBody.innerHTML =
        `<b>Weight</b>: Hold the chamber steady.<br>
         Enter the player’s check result vs <b>DC ${dc}</b>.<br>
         If Assist (Advantage) is used and it fails, add +1 Stress.`;
    } else if(stone==="memory"){
      modalBody.innerHTML =
        `<b>Memory</b>: Match the rhythm.<br>
         Enter the <b>2d6 total</b> vs target <b>${t}</b>.<br>
         Exact: +Progress and -Stress. ±1: +Progress. Miss by 2+: +Stress.`;
    } else if(stone==="silence"){
      modalBody.innerHTML =
        `<b>Silence</b>: Press the magic down.<br>
         Enter Arcana/Religion result vs <b>DC = 10 + Slot + Stress</b>.<br>
         Choose Slot Level (0 if none).`;
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    setTimeout(()=>rollInput.focus(), 40);
  }

  function closeModal(){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    state.modalCtx=null;
  }

  function applyModal(){
    const ctx=state.modalCtx;
    if(!ctx) return;

    const stone=ctx.stone;
    const action=ctx.action;
    const st=state.stones[stone];

    const roll = Number(rollInput.value);
    if(!Number.isFinite(roll)){
      modalFoot.textContent = "Enter a numeric roll result.";
      return;
    }

    if(stone==="weight"){
      const dc=12+st.stress;
      const usedAdv = (advSelect.value==="yes");
      if(roll>=dc){
        addProgress("weight",1);
        toastMsg("Weight: Success (+Progress)");
      } else {
        addStress("weight",1);
        if(usedAdv) addStress("weight",1);
        toastMsg("Weight: Failure (+Stress)");
      }
    }

    if(stone==="memory"){
      const base = memoryTargetByRound(state.round);
      const adj = (action==="assist") ? Number(memoryAdjust.value || 0) : 0;
      const target = clamp(base+adj, 2, 12);
      const diff = Math.abs(roll-target);
      if(diff===0){
        addProgress("memory",1);
        removeStress("memory",1);
        toastMsg("Memory: Exact (+Progress, -Stress)");
      } else if(diff===1){
        addProgress("memory",1);
        toastMsg("Memory: Close (+Progress)");
      } else {
        addStress("memory",1);
        toastMsg("Memory: Miss (+Stress)");
      }
    }

    if(stone==="silence"){
      const slot = clamp(Number(slotInput.value || 0), 0, 9);
      const dc = 10 + slot + st.stress;
      if(roll>=dc){
        addProgress("silence",1);
        toastMsg("Silence: Held (+Progress)");
      } else {
        addStress("silence",1);
        toastMsg("Silence: Backlash (+Stress)");
      }
    }

    closeModal();
  }

  // ---------- DM Dock ----------
  function toggleDock(force){
    const open = (typeof force==="boolean") ? force : !dmDock.classList.contains("open");
    dmDock.classList.toggle("open", open);
    dmDock.setAttribute("aria-hidden", open ? "false" : "true");
  }

  // ---------- Utils ----------
  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  function resetAll(){
    state.round=1;
    state.eventIndex=0;
    state.phase="running";
    for(const k of Object.keys(state.stones)){
      state.stones[k].progress=0;
      state.stones[k].stress=0;
      state.stones[k].locked=false;
    }
    logEl.innerHTML="";
    toastMsg("Ritual reset.");
    renderAll();
  }

  // ---------- Bind ----------
  function bind(){
    // Sound
    btnSound.addEventListener("click", enableAudio);

    // Main buttons
    btnDock.addEventListener("click", ()=>toggleDock());
    btnRollEvent.addEventListener("click", rollEvent);
    btnApplyEvent.addEventListener("click", applyEvent);
    btnPrevEvent.addEventListener("click", ()=>cycleEvent(-1));
    btnNextEvent.addEventListener("click", ()=>cycleEvent(1));
    btnNextRound.addEventListener("click", nextRound);

    if (btnClearLog && logEl){
  btnClearLog.addEventListener("click", ()=>{ logEl.innerHTML=""; toastMsg("Log cleared."); });
}

    // Stone buttons
    document.querySelectorAll("[data-action][data-stone]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const stone = btn.getAttribute("data-stone");
        const action = btn.getAttribute("data-action");
        openModal(stone, action);
      });
    });

    // Modal
    btnCancel.addEventListener("click", closeModal);
    btnApply.addEventListener("click", applyModal);
    modal.addEventListener("click", (e)=>{ if(e.target===modal) closeModal(); });

    // Dock
    btnDockClose.addEventListener("click", ()=>toggleDock(false));

    btnPrevRound.addEventListener("click", prevRound);
    btnNextRoundDock.addEventListener("click", nextRound);
    btnRollEventDock.addEventListener("click", rollEvent);

    btnStressPlus.addEventListener("click", ()=>addStress(stressStoneSel.value,1));
    btnStressMinus.addEventListener("click", ()=>removeStress(stressStoneSel.value,1));

    btnProgPlus.addEventListener("click", ()=>addProgress(progStoneSel.value,1));
    btnProgMinus.addEventListener("click", ()=>removeProgress(progStoneSel.value,1));

    btnReset.addEventListener("click", resetAll);

    // Keyboard shortcuts
    window.addEventListener("keydown", (e)=>{
      if(e.key==="`"){ e.preventDefault(); toggleDock(); return; }
      if(modal.classList.contains("open")){
        if(e.key==="Escape") closeModal();
        if(e.key==="Enter") applyModal();
        return;
      }
      if(e.key.toLowerCase()==="n") nextRound();
      if(e.key.toLowerCase()==="e") rollEvent();
    });

    // Init
    renderAll();
    log("Ritual Begins", "The chamber breathes. The Heartwood listens.");
  }

  bind();
})();

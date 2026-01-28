(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  
  function setEnemyVisual(threatId){
  const wrap = document.getElementById("enemyVisual");
  const img  = document.getElementById("enemyVisualImg");
  if(!wrap || !img) return;

  let src = "";
  if(threatId === "husk") src = "assets/img/husk.png";
  if(threatId === "buckbear") src = "assets/img/buckbear.png";
  if(threatId === "wyvern") src = "assets/img/wyvern.png";

  if(src){
    img.src = src;
    wrap.classList.remove("hidden");
    wrap.setAttribute("aria-hidden","false");
  } else {
    wrap.classList.add("hidden");
    wrap.setAttribute("aria-hidden","true");
    img.src = "";
  }
}

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // ---------- Ritual Cinematic Videos (GitHub Releases) ----------
const VIDEO = {
  WYVERN: "https://github.com/hjhudsonwriter/tellurian-ritual-engine/releases/download/v1.1-ritual-endings/wyvern_emergency.mp4",
  TRUE_SEAL: "https://github.com/hjhudsonwriter/tellurian-ritual-engine/releases/download/v1.1-ritual-endings/true_seal.mp4",
  STRAINED: "https://github.com/hjhudsonwriter/tellurian-ritual-engine/releases/download/v1.1-ritual-endings/strained_binding.mp4",
  FRACTURED: "https://github.com/hjhudsonwriter/tellurian-ritual-engine/releases/download/v1.1-ritual-endings/fractured_containment.mp4",
};
    // ---------- GitHub Pages base-path helper ----------
  const BASE = (() => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.length ? `/${parts[0]}/` : "/";
  })();

  function withBase(url){
    if(!url) return url;
    if(url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
    if(url.startsWith("/")) return url; // already absolute
    return BASE + url.replace(/^\.?\//, "");
  }

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

  const cinematicOverlay = $("cinematicOverlay");
  const cinematicFrame = $("cinematicFrame");

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
  const rollRow = $("rollRow");

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
  const threatPanel = $("threatPanel");
  const threatName = $("threatName");
  const threatHP = $("threatHP");
  const threatHint = $("threatHint");

  function renderThreat(){
  if(!state.threat){
    hideThreat();
    setEnemyVisual(null);
    return;
  }
  const t = state.threat;
    setEnemyVisual(t.id);
  threatPanel.classList.remove("hidden");
  threatName.textContent = t.name;
  threatHint.textContent = t.consequence;
  threatHP.style.width = `${(t.hp / t.maxHP) * 100}%`;
}

function hideThreat(){
  if(threatPanel) threatPanel.classList.add("hidden");
}


    // Banner (cinematic popup)
  const banner = $("banner");
  const bannerKicker = $("bannerKicker");
  const bannerTitle = $("bannerTitle");
  const bannerText = $("bannerText");

    // Final Seal Overlay
  const sealOverlay = $("sealOverlay");
  const sealSub = $("sealSub");

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
      audio.heartbeat.volume = 0.90;

      // One-shots
      audio.sfx.progress = new Audio(audioPath("sfx_progress.mp3"));
      audio.sfx.stress = new Audio(audioPath("sfx_stress.mp3"));
      audio.sfx.lock = new Audio(audioPath("sfx_lock.mp3"));
      audio.sfx.interrupt = new Audio(audioPath("sfx_interrupt.mp3"));
      audio.sfx.seal = new Audio(audioPath("sfx_seal.mp3"));
      // --- Balance levels (SFX quieter than the heartbeat) ---
audio.sfx.progress.volume = 0.35;
audio.sfx.stress.volume   = 0.45;
audio.sfx.lock.volume     = 0.50;
audio.sfx.interrupt.volume= 0.55;
audio.sfx.seal.volume     = 0.50;

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

    // Sanitize: never allow NaN/Infinity into playbackRate
    let r = Number(rate);
    if(!Number.isFinite(r)) r = 1.0;

    r = clamp(r, 0.75, 1.45);
    if(!Number.isFinite(r)) r = 1.0;

    audio.heartbeat.playbackRate = r;
  }

    // ---------- Cinematics (DIRECT VIDEO overlay; no iframe) ----------
  function cinVideoEls(){
    const overlay = document.getElementById("cinVideoOverlay");
    const video   = document.getElementById("cinVideo");
    const gate    = document.getElementById("cinGate");
    const btn     = document.getElementById("cinGateBtn");

    if(!overlay || !video){
      console.warn(`[CINEMATIC] Missing #cinVideoOverlay or #cinVideo`);
      try{ toastMsg("CINEMATIC ERROR: Missing cinVideoOverlay/cinVideo (see console)."); }catch{}
      return null;
    }
    return { overlay, video, gate, btn };
  }

  function openCinematic(srcPath){
    const els = cinVideoEls();
    if(!els) return;

    const { overlay, video, gate, btn } = els;

    // Prevent stacking
    if(overlay.classList.contains("show")){
      console.warn("[CINEMATIC] Already open. Ignoring.");
      return;
    }

    // IMPORTANT: resolve to correct GitHub Pages base
    const resolved = withBase(srcPath);

    console.warn(`[CINEMATIC] Opening (direct): ${resolved}`);
    try{ toastMsg(`Cinematic: ${srcPath.split("/").pop()}`); }catch{}

    document.body.classList.add("cinematicMode");

    // Pause bg video
    const bg = document.getElementById("bgVideo");
    try{ bg && bg.pause && bg.pause(); }catch{}

    // soften heartbeat
    try{ if(audio?.enabled && audio.heartbeat) audio.heartbeat.volume = 0.15; }catch{}

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden","false");

    // Reset gate
    if(gate) gate.style.display = "none";

    // Load + attempt play
    video.src = resolved;
    video.muted = false;      // allow sound if user has clicked Enable Sound already
    video.controls = false;

    const attempt = video.play();
    if(attempt && typeof attempt.catch === "function"){
      attempt.catch(() => {
        // Autoplay blocked: show click gate
        if(gate) gate.style.display = "flex";
      });
    }

    if(btn){
      btn.onclick = () => {
        if(gate) gate.style.display = "none";
        video.play().catch(()=>{});
      };
    }
  }

  function closeCinematic(){
    const els = cinVideoEls();
    if(!els) return;

    const { overlay, video, gate } = els;

    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden","true");
    if(gate) gate.style.display = "none";

    try{ video.pause(); }catch{}
    video.removeAttribute("src");
    try{ video.load(); }catch{}

    document.body.classList.remove("cinematicMode");

    const bg = document.getElementById("bgVideo");
    try{ bg && bg.play && bg.play().catch(()=>{}); }catch{}

    try{ if(audio?.enabled && audio.heartbeat) audio.heartbeat.volume = 0.55; }catch{}

    console.warn("[CINEMATIC] Closed.");
  }

  // Close when video ends/errors
  (function bindCinematicVideoEvents(){
    const els = cinVideoEls();
    if(!els) return;
    const { video } = els;

    video.addEventListener("ended", ()=>{
      // If we queued the Final Seal overlay until after the cinematic, fire it now.
      if(state?.flags?.pendingFinalSeal){
        state.flags.pendingFinalSeal = false;
        if(!state.finalSealShown){
          state.finalSealShown = true;
          triggerFinalSeal();
        }
      }
      closeCinematic();
    });

    video.addEventListener("error", ()=>{
      console.warn("[CINEMATIC] Video error event fired.");
      // Still proceed to seal overlay if queued
      if(state?.flags?.pendingFinalSeal){
        state.flags.pendingFinalSeal = false;
        if(!state.finalSealShown){
          state.finalSealShown = true;
          triggerFinalSeal();
        }
      }
      closeCinematic();
    });
  })();

  // ---------- State ----------
  const state = {
    round: 1,
    roundMax: 8,
    eventIndex: 0,
    phase: "running", // running | failed | sealed
    assistPending: {
  weight:  false,        // if true, next Weight attempt uses advantage
  memory:  { on:false, adjust:0 }, // next Memory attempt target adjust
  silence: { on:false, slot:0 },   // next Silence attempt pre-fills slot
},
    stones: {
  weight:  { progress: 0, stress: 0, locked: false, cracked: false },
  memory:  { progress: 0, stress: 0, locked: false, cracked: false },
  silence: { progress: 0, stress: 0, locked: false, cracked: false },
},
    finalSealShown: false,
    successCinematicShown: false,
failCinematicShown: false,
        threat: null, // active combat threat or null
    modalCtx: null,
  };

  function memoryTargetByRound(r){
    return (r <= 2) ? 6 : (r <= 5) ? 7 : 8;
  }

  function totalStress(){
  const s = state.stones;
  return s.weight.stress + s.memory.stress + s.silence.stress;
}

function lockedCount(){
  const s = state.stones;
  return [s.weight.locked, s.memory.locked, s.silence.locked].filter(Boolean).length;
}

  function crackedCount(){
  const s = state.stones;
  return [s.weight.cracked, s.memory.cracked, s.silence.cracked].filter(Boolean).length;
}

function hasThreat(){
  return !!state.threat;
}

  function randomStone(){
  const ids = ["weight","memory","silence"];
  return ids[Math.floor(Math.random()*ids.length)];
}

  // ---------- Threat Templates ----------
const THREATS = {
  husk: {
    id: "husk",
    name: "Rootbound Husk",
    tier: 1,
    maxHP: 35,
    hp: 35,
    damagePerRound: 6,
    consequence: "If ignored, +1 Stress to a random stone.",
    narrate: "The dead stir. Roots haul corpses upright, their limbs moving with borrowed intent."
  },

  buckbear: {
    id: "buckbear",
    name: "Rootbound Buckbear",
    tier: 2,
    maxHP: 55,
    hp: 55,
    damagePerRound: 10,
    consequence: "If ignored, +1 Stress to ALL stones.",
    narrate: "A massive, root-choked form lurches free. Antlers crack stone as it roars without lungs."
  },

  wyvern: {
    id: "wyvern",
    name: "Rootbound Wyvern",
    tier: 3,
    maxHP: 120,
    hp: 120,
    damagePerRound: 16,
    consequence: "If ignored, ritual collapses next round.",
    narrate: "Root, soil, and stone knit together into a colossal wyvern. The Heartwood’s final refusal takes shape."
  }
};

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
      if (st.stress === 1) crackImg = withBase("assets/img/cracks_1.png");
      if (st.stress === 2) crackImg = withBase("assets/img/cracks_2.png");
      if (st.stress >= 3) crackImg = withBase("assets/img/cracks_3.png");
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
    renderThreat();
  }

  function updatePulse(){
    const s=state.stones;
    const stressTotal = totalStress();
    const locks = [s.weight.locked, s.memory.locked, s.silence.locked].filter(Boolean).length;

    // heartbeat speed + CSS pulse
        const speed = clamp(2.6 - stressTotal*0.18 + locks*0.20, 1.2, 3.2);
    document.documentElement.style.setProperty("--pulse", `${speed}s`);

    const hbRate = clamp(1.0 + stressTotal*0.05 - locks*0.03, 0.85, 1.35);
    setHeartbeatRate(hbRate);

    // glow shifts slightly with stress
    let glow="rgba(110,240,166,0.95)";
    if(stressTotal>=7) glow="rgba(255,204,102,0.95)";
    if(stressTotal>=10) glow="rgba(255,93,108,0.95)";

    document.documentElement.style.setProperty("--glow", glow);

    const label =
      state.phase==="sealed" ? "Dormant" :
      state.phase==="failed" ? "Racing" :
      stressTotal<=2 ? "Steady" :
      stressTotal<=6 ? "Strained" :
      stressTotal<=9 ? "Wild" : "Critical";

    elPulseLabel.textContent = label;

    const stateTxt =
      state.phase==="sealed" ? "Seal set. Heartwood sleeping." :
      state.phase==="failed" ? "Ritual collapse." :
      "Binding in progress";

    elStateLabel.textContent = stateTxt;

    // fail check (NEW RULES):
// - A single cracked stone does NOT end the ritual.
// - Ritual only hard-fails immediately if ALL THREE stones are cracked.
if(state.phase === "running"){
  if(crackedCount() >= 3){
    state.phase = "failed";
    showBanner("RITUAL COLLAPSE", "All Glyphs Have Fractured", "The last stone breaks. The binding cannot hold.", 5200, true);
    playSfx("interrupt");
    log("Ritual Collapse", "All three stones have cracked. The binding collapses completely.");
    toastMsg("FAILED: All three stones cracked.");

    if(!state.failCinematicShown){
      state.failCinematicShown = true;
      openCinematic(VIDEO.FRACTURED);
    }
  }
}

        // seal check (all locked)
if(state.phase==="running" && allLocked()){
  state.phase="sealed";

  showBanner(
    "FINAL SEAL",
    "The Heartwood Sleeps",
    "All stones lock at once. The chamber exhales, and the earth begins to close.",
    4200
  );

  log("Seal Set", "The roots recoil. The earth closes like an eyelid. The Heartwood sleeps.");
  toastMsg("SEALED: All stones locked.");

  // Cinematic (only once)
  if(!state.successCinematicShown){
    state.successCinematicShown = true;
    openCinematic(VIDEO.TRUE_SEAL);
  }

    // Queue the Final Seal overlay until AFTER the cinematic finishes
  state.flags = state.flags || {};
  state.flags.pendingFinalSeal = true;
}
                // ---------- Combat Triggers ----------

        // Emergency Wyvern check MUST run before Husk/Buckbear checks
    if(state.flags?.noMoreIntrusions) return;    
    if(state.phase === "running"){
          const wyvernConditions = [
            totalStress() >= 9,
            crackedCount() >= 1,
            state.round >= 7 && lockedCount() === 0
          ];

          // --- WYVERN TRIGGER (priority) ---
const autoWyvern = (state.round >= 7);
const wyvernReady = autoWyvern || (wyvernConditions.filter(Boolean).length >= 2);

// If Wyvern has been defeated, intrusions are over (including Wyvern re-spawn)
if(state.flags?.noMoreIntrusions) {
  // optional debug:
  // log("Wyvern Blocked", "Wyvern defeated: no further intrusions.");
} else if(wyvernReady && state.threat?.id !== "wyvern") {

  log(
    "Wyvern Check",
    `autoR7=${autoWyvern} | stressCond=${wyvernConditions[0]} | fractureCond=${wyvernConditions[1]} | r7NoLocksCond=${wyvernConditions[2]} | locks=${lockedCount()}`
  );

  // If no current threat: spawn Wyvern immediately
  if(!state.threat){
    spawnThreat("wyvern");
  }
  // If Husk is active: Wyvern replaces it
  else if(state.threat.id === "husk"){
    log("Threat Escalates", "The Husk is smothered by root and stone as something vastly larger takes shape.");
    state.threat = null;
    hideThreat();
    spawnThreat("wyvern");
  }
  // If Buckbear (or anything else) is active: do nothing (no replacement)
}

        // Normal triggers only run if we still have no active threat
        if(!state.threat && state.phase==="running"){

          // Trigger A: Stress ≥ 6 (50%)
          if(totalStress() >= 6 && Math.random() < 0.5){
            spawnThreat("husk");
          }

          // Trigger C: Round 6+, no locks
          if(state.round >= 6 && lockedCount() === 0){
            spawnThreat("buckbear");
          }
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

    function showBanner(kicker, title, text, ms=2600, isNegative=false){
  if(!banner) return;

  bannerKicker.textContent = kicker || "";
  bannerTitle.textContent = title || "";
  bannerText.textContent = text || "";

  // Apply negative styling if needed
  banner.classList.toggle("negative", !!isNegative);

  banner.classList.add("show");
  banner.setAttribute("aria-hidden","false");

  clearTimeout(banner.__t);
  banner.__t = setTimeout(()=>{
    banner.classList.remove("show");
    banner.classList.remove("negative");
    banner.setAttribute("aria-hidden","true");
  }, ms);
}
      // ---------- Final Seal Overlay ----------
  function showSealOverlay(subText){
    if(!sealOverlay) return;
    if(sealSub && subText) sealSub.textContent = subText;
    sealOverlay.classList.add("show");
    sealOverlay.setAttribute("aria-hidden","false");
  }

  function hideSealOverlay(){
    if(!sealOverlay) return;
    sealOverlay.classList.remove("show");
    sealOverlay.setAttribute("aria-hidden","true");
  }

  function finaleSlowdown(){
    document.documentElement.style.setProperty("--pulse", "4.6s");

    if(audio.enabled && audio.heartbeat){
      const start = audio.heartbeat.volume ?? 0.55;
      const steps = 20;
      let i = 0;
      const t = setInterval(()=>{
        i++;
        audio.heartbeat.volume = Math.max(0, start * (1 - i/steps));
        if(i >= steps){
          audio.heartbeat.pause?.();
          clearInterval(t);
        }
      }, 120);
    }
  }

  function triggerFinalSeal(){
    const sub = "Roots draw inward. The glyphs bite shut. The earth closes like a lid over a sleeping eye.";

    finaleSlowdown();
    playSfx("seal");
    playSfx("lock");

    showSealOverlay(sub);

    setTimeout(()=>{
      hideSealOverlay();
      toastMsg("Final Seal complete.");
    }, 5200);
  }

  // ---------- Threat System ----------
function spawnThreat(type){
  if(state.threat) return;

  const base = THREATS[type];
  state.threat = JSON.parse(JSON.stringify(base)); // deep copy

    if(type === "wyvern") openCinematic(VIDEO.WYVERN;

  showBanner(
    "COMBAT INTRUSION",
    base.name,
    base.narrate,
    4200
  );

  log("Threat Emerges", `${base.name} enters the chamber.`);
  playSfx("interrupt");

  renderThreat();
}

function damageThreat(amount){
  if(!state.threat) return;
  state.threat.hp = clamp(state.threat.hp - amount, 0, state.threat.maxHP);

  if(state.threat.hp <= 0){
    resolveThreat();
  }

  renderThreat();
}

function resolveThreat(){
  const t = state.threat;
  if(!t) return;

  // Better tone for the Wyvern
  if(t.id === "wyvern"){
    log("Threat Repelled", `${t.name} unravels back into root and stone.`);

    // Emergency payoff
    ["weight","memory","silence"].forEach(id=>{
      removeStress(id,1);
      addProgress(id,2);
    });

    // Once Wyvern is beaten, no more combat intrusions
    state.flags = state.flags || {};
    state.flags.noMoreIntrusions = true;
  } else {
    log("Threat Defeated", `${t.name} is destroyed.`);
  }

  state.threat = null;
  hideThreat();
  setEnemyVisual(null);
}
  // ---------- State mutations ----------
  function setLockedIfComplete(id){
  const st = state.stones[id];

  // Cracked stones can never lock
  if(st.cracked){
    st.locked = false;
    return;
  }

  if(st.progress >= 3){
    st.progress = 3;
    if(!st.locked){
      st.locked = true;
      playSfx("lock");
      showBanner("STONE LOCKED", cap(id), "The glyph falls quiet.", 3000);
      log("Stone Locked", `${cap(id)} locks into place. The runes go still.`);
    }
  } else {
    st.locked = false;
  }
}

  function addStress(id, n=1, opts={}){
  const st = state.stones[id];
  if(opts.event && st.locked) return;

  // If already cracked, don't keep adding stress (ritual continues but stone is dead)
  if(st.cracked) return;

  const prev = st.stress;
  st.stress = clamp(st.stress + n, 0, 4);

  playSfx("stress");
  showBanner("STONE STRAIN", `${cap(id)}`, "+1 Stress", 2400, true);

  // If it reaches 4 now, it cracks (but does NOT auto-fail the whole ritual)
  if(prev < 4 && st.stress >= 4){
    st.cracked = true;
    st.locked = false;
    showBanner("GLYPH FRACTURE", cap(id), "The stone cracks. The ritual can continue, but this glyph is lost.", 4200, true);
    log("Glyph Fracture", `${cap(id)} cracks (Stress 4). The binding staggers but holds… for now.`);
    toastMsg(`${cap(id)} CRACKED (Stress 4). Ritual continues.`);
  }

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
      log("Final Seal", "The last glyph falls quiet. The roots recoil. The earth closes like an eyelid. The Heartwood sleeps.");
      toastMsg("RITUAL COMPLETE: The Heartwood is sealed.");
            if(!state.successCinematicShown){
        state.successCinematicShown = true;
        openCinematic(VIDEO.TRUE_SEAL);

        // Queue the seal overlay until after the cinematic closes (prevents conflict)
        state.flags = state.flags || {};
        state.flags.pendingFinalSeal = true;
      }
    } else {
  const cc = crackedCount();

  // Only play collapse cinematic at end if 2+ stones are cracked
  if(cc >= 2){
    state.phase = "failed";
    playSfx("interrupt");
    log("Time Runs Out", "The lullaby falters. Too many glyphs are broken. The chamber convulses as the binding collapses.");
    toastMsg("RITUAL FAILED: Time ran out (2+ stones cracked).");

    if(!state.failCinematicShown){
      state.failCinematicShown = true;
      openCinematic(VIDEO.FRACTURED);
    }
  } else {
    // 0–1 cracked: STRAINED BINDING (contained, imperfect)
state.phase = "failed";
playSfx("interrupt");
log(
  "Strained Binding",
  "The binding holds, but imperfectly. The Heartwood settles into a restless sleep."
);

toastMsg("STRAINED BINDING: The Heartwood is contained, but restless.");

if(!state.failCinematicShown){
  state.failCinematicShown = true;
  openCinematic(VIDEO.STRAINED);
}
  }
}
    renderAll();
    return;
  }

    // Threat acts if alive
  if(state.threat){
    const t = state.threat;
    log("Threat Acts", `${t.name} lashes out. ${t.consequence}`);

        if(t.id === "wyvern"){
      state.phase = "failed";
      showBanner("RITUAL SHATTERS", "The Wyvern Breaks the Binding", "The Heartwood refuses the seal.", 5200);

      if(!state.failCinematicShown){
        state.failCinematicShown = true;
        openCinematic(VIDEO.FRACTURED);
      }

      return;
    }

    if(t.tier === 1){
      addStress(randomStone(),1);
    } else if(t.tier === 2){
      ["weight","memory","silence"].forEach(id=>addStress(id,1));
    }
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
advField.style.display = "none"; // Option A removes advantage dropdown entirely
memoryAdjustField.style.display = (stone==="memory" && action==="assist") ? "block" : "none";

    // --- Option A Assist: Assist is setup only (no roll entry) ---
const isAssist = (action === "assist");
if (rollRow) rollRow.style.display = isAssist ? "none" : "block";
btnApply.textContent = isAssist ? "Set Assist" : "Apply";

    const st = state.stones[stone];
    const t = memoryTargetByRound(state.round);

    if(stone==="weight"){
  const dc=12+st.stress;
  if(action==="assist"){
    modalBody.innerHTML =
      `<b>Weight (Assist)</b>: Help brace the chamber.<br>
       This does <b>not</b> enter a roll. It arms <b>Advantage</b> for the next Weight Attempt.<br>
       Next Attempt: player rolls with advantage at the table, you enter the final result vs <b>DC ${dc}</b>.<br>
       <i>If the advantaged attempt still fails, it causes +1 extra Stress.</i>`;
  } else {
    modalBody.innerHTML =
      `<b>Weight (Attempt)</b>: Hold the chamber steady.<br>
       Enter the player’s check result vs <b>DC ${dc}</b>.`;
  }
} else if(stone==="memory"){
  const t=memoryTargetByRound(state.round);
  if(action==="assist"){
    modalBody.innerHTML =
      `<b>Memory (Assist)</b>: Steady the rhythm.<br>
       Choose a <b>Target Adjust</b> (usually -1, 0, or +1). No roll is entered here.<br>
       Next Attempt: you enter the <b>2d6 total</b> vs Target <b>${t} + adjust</b>.`;
  } else {
    modalBody.innerHTML =
      `<b>Memory (Attempt)</b>: Match the rhythm.<br>
       Enter the <b>2d6 total</b> vs target <b>${t}</b>.<br>
       Exact: +Progress and -Stress. ±1: +Progress. Miss by 2+: +Stress.`;
  }
    } else if(stone==="silence"){
  const previewSlot = clamp(Number(slotInput.value || 0), 0, 9);
  const previewDC = Math.max(8, 10 + st.stress - previewSlot);

  if(action==="assist"){
    modalBody.innerHTML =
      `<b>Silence (Assist)</b>: Dampening Ward.<br>
       Choose the <b>Slot</b> you will spend to smother the Heartwood’s magic.<br>
       <b>No roll</b> is entered here. This just arms the next Attempt.<br><br>
       Next Silence Attempt uses:<br>
       <b>DC = 10 + Stress − Slot</b> (min DC 8).<br>
       Current preview (with Slot ${previewSlot}): <b>DC ${previewDC}</b>.`;
  } else {
    modalBody.innerHTML =
      `<b>Silence (Attempt)</b>: Press the magic down.<br>
       Enter Arcana/Religion result vs:<br>
       <b>DC = 10 + Stress − Slot</b> (min DC 8).<br>
       Choose Slot (0 if none).`;
  }
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
  const ctx = state.modalCtx;
  if(!ctx) return;

  const stone = ctx.stone;
  const action = ctx.action;
  const st = state.stones[stone];
    // Cracked stones cannot be assisted or attempted
if(st.cracked){
  showBanner("STONE CRACKED", cap(stone), "This glyph has failed. It cannot be worked further.", 3200, true);
  toastMsg("That stone is cracked and cannot be used.");
  closeModal();
  return;
}

  // -----------------------------
  // OPTION A: ASSIST = "setup only"
  // -----------------------------
  if(action === "assist"){

    if(stone === "weight"){
      state.assistPending.weight = true;
      showBanner(
        "ASSIST SET",
        "Weight",
        "A companion braces the chamber. Next Weight Attempt is rolled with advantage at the table (enter the final result here).",
        3200
      );
      toastMsg("Weight Assist armed (advantage on next attempt).");
    }

    if(stone === "memory"){
      const adj = Number(memoryAdjust.value || 0);
      state.assistPending.memory = { on:true, adjust: adj };
      const sign = adj > 0 ? `+${adj}` : `${adj}`;
      showBanner(
        "ASSIST SET",
        "Memory",
        `The rhythm is steadied. Next Memory Attempt target is adjusted by ${sign}.`,
        3200
      );
      toastMsg("Memory Assist armed (target adjust).");
    }

    if(stone === "silence"){
      const slot = clamp(Number(slotInput.value || 0), 0, 9);
      state.assistPending.silence = { on:true, slot };
      showBanner(
        "ASSIST SET",
        "Silence",
        `A dampening ward is prepared. Next Silence Attempt will reduce DC by Slot (${slot}).`,
        3200
      );
      toastMsg("Silence Assist armed (slot dampening).");
    }

    closeModal();
    return;
  }

  // -----------------------------
  // ATTEMPT: requires roll input
  // -----------------------------
  const roll = Number(rollInput.value);
  if(!Number.isFinite(roll)){
    modalFoot.textContent = "Enter a numeric roll result.";
    return;
  }

  // WEIGHT ATTEMPT (uses advantage if armed, but you still enter final result)
  if(stone === "weight"){
    const dc = 12 + st.stress;
    const usedAdv = !!state.assistPending.weight;

    if(roll >= dc){
      addProgress("weight", 1);
      toastMsg("Weight: Success (+Progress)");
    } else {
      addStress("weight", 1);

      // If they used advantage (from Assist) and STILL failed, add extra Stress
      if(usedAdv) addStress("weight", 1);

      toastMsg("Weight: Failure (+Stress)");
    }

    // Assist is consumed after the attempt resolves
    state.assistPending.weight = false;
  }

  // MEMORY ATTEMPT (uses pending adjust if armed)
  if(stone === "memory"){
    const base = memoryTargetByRound(state.round);

    const adj = (state.assistPending.memory?.on)
      ? Number(state.assistPending.memory.adjust || 0)
      : 0;

    const target = clamp(base + adj, 2, 12);
    const diff = Math.abs(roll - target);

    if(diff === 0){
      addProgress("memory", 1);
      removeStress("memory", 1);
      toastMsg("Memory: Exact (+Progress, -Stress)");
    } else if(diff === 1){
      addProgress("memory", 1);
      toastMsg("Memory: Close (+Progress)");
    } else {
      addStress("memory", 1);
      toastMsg("Memory: Miss (+Stress)");
    }

    // Assist is consumed after the attempt resolves
    state.assistPending.memory = { on:false, adjust:0 };
  }

  // SILENCE ATTEMPT (NEW FORMULA: DC = 10 + Stress - Slot)
  if(stone === "silence"){
    const presetSlot = (state.assistPending.silence?.on)
      ? Number(state.assistPending.silence.slot || 0)
      : null;

    // DM can still type a different slot in the field, but if assist is armed,
    // we default to the preset unless they overwrite it.
    const typedSlot = clamp(Number(slotInput.value || 0), 0, 9);
    const slot = (presetSlot !== null) ? presetSlot : typedSlot;

    // New DC: 10 + Stress - Slot (minimum 8 so it never becomes silly)
    const dc = Math.max(8, 10 + st.stress - slot);

    if(roll >= dc){
      addProgress("silence", 1);
      showBanner(
        "SILENCE HOLDS",
        "Magic Dampened",
        `Slot spent to smother the echo. DC ${dc} met. The chamber quiets.`,
        3200
      );
      toastMsg("Silence: Success (+Progress)");
    } else {
      addStress("silence", 1);
      showBanner(
  "BACKWASH",
  "Silence Frays",
  `The dampening fails...`,
  3200,
  true
);
      toastMsg("Silence: Failure (+Stress)");
    }

    // Assist is consumed after the attempt resolves
    state.assistPending.silence = { on:false, slot:0 };
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
  state.round = 1;
  state.eventIndex = 0;
  state.phase = "running";

  for(const k of Object.keys(state.stones)){
    state.stones[k].progress = 0;
    state.stones[k].stress = 0;
    state.stones[k].locked = false;
    state.stones[k].cracked = false;
  }

  // Clear threat + visuals
  state.threat = null;
  hideThreat();
  setEnemyVisual(null);

  // Clear flags + cinematic/seal state
  state.flags = {};
  state.finalSealShown = false;
  state.successCinematicShown = false;
  state.failCinematicShown = false;
  state.pendingFinalSeal = false;

  // If seal overlay was visible, hide it
  const seal = document.getElementById("sealOverlay");
  if(seal) {
    seal.classList.remove("show");
    seal.setAttribute("aria-hidden","true");
  }

  // If a cinematic was open, close it safely
  try { closeCinematic("reset"); } catch(e) {}

  logEl.innerHTML = "";
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
    window.addEventListener("keydown", (e) => {
      if (e.key === "`") { e.preventDefault(); toggleDock(); return; }

      if (modal.classList.contains("open")) {
        if (e.key === "Escape") closeModal();
        if (e.key === "Enter") applyModal();
        return;
      }

            if (e.key.toLowerCase() === "n") nextRound();
      if (e.key.toLowerCase() === "e") rollEvent();

      // TEMP TEST: press P to force-play the success cinematic
      if (e.key.toLowerCase() === "p") {
        openCinematic("https://github.com/hjhudsonwriter/tellurian-ritual-engine/releases/download/v1.0-ritual/ritual_success.mp4");
      }
    });

    // Init
    renderAll();
    log("Ritual Begins", "The chamber breathes. The Heartwood listens.");
  }

  // Expose for HTML onclick buttons (Edge safe)
window.damageThreat = damageThreat;
window.spawnThreat = spawnThreat;

    bind();
})();

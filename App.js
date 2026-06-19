/**
 * MEIN BAUM — App.js
 * A real-time growing tree Tamagotchi
 */

const App = (() => {

  // ─── Growth Stage Definitions ────────────────────────────────────────────────
  const STAGES = [
    {
      id: 'seedling', name: 'Setzling', emoji: '🌱', minDays: 0,
      showSeedling: true,  showTrunk: false, showBranches: false,
      showCanopy: false, showBlossoms: false, showFruits: false,
      message: 'Ein kleiner Setzling! Gieße ihn regelmäßig. 🌱',
    },
    {
      id: 'sprout', name: 'Jungtrieb', emoji: '🪴', minDays: 3,
      showSeedling: false, showTrunk: true,  showBranches: false,
      showCanopy: false, showBlossoms: false, showFruits: false,
      message: 'Ein kleiner Stamm bildet sich! 🪴',
    },
    {
      id: 'sapling', name: 'Jungbaum', emoji: '🌿', minDays: 7,
      showSeedling: false, showTrunk: true,  showBranches: true,
      showCanopy: false, showBlossoms: false, showFruits: false,
      message: 'Dein Baum bekommt erste Äste! 🌿',
    },
    {
      id: 'young', name: 'Junger Baum', emoji: '🌳', minDays: 14,
      showSeedling: false, showTrunk: true,  showBranches: true,
      showCanopy: true, showBlossoms: false, showFruits: false,
      message: 'Grünes Blätterdach entfaltet sich! 🌳',
    },
    {
      id: 'flowering', name: 'Blühender Baum', emoji: '🌸', minDays: 21,
      showSeedling: false, showTrunk: true,  showBranches: true,
      showCanopy: true, showBlossoms: true,  showFruits: false,
      message: 'Wunderschöne Blüten! 🌸 Dein Baum blüht!',
    },
    {
      id: 'fruiting', name: 'Fruchtbaum', emoji: '🍎', minDays: 35,
      showSeedling: false, showTrunk: true,  showBranches: true,
      showCanopy: true, showBlossoms: true,  showFruits: true,
      message: 'Dein Baum trägt Früchte! 🍎 Beeindruckend!',
    },
    {
      id: 'ancient', name: 'Alter Baum', emoji: '🌲', minDays: 60,
      showSeedling: false, showTrunk: true,  showBranches: true,
      showCanopy: true, showBlossoms: true,  showFruits: true,
      message: 'Ein majestätischer alter Baum! 🌲 Du hast ihn groß gemacht!',
    },
  ];

  // ─── Timing ──────────────────────────────────────────────────────────────────
  // wateringCooldown: ms between allowed waterings  (default 24h)
  // deathAfter:       ms without water before death (default 3× cooldown)
  let wateringCooldown = 24 * 60 * 60 * 1000;
  const DEATH_FACTOR   = 3; // tree dies after 3 missed waterings

  function deathAfter() { return wateringCooldown * DEATH_FACTOR; }

  // ─── State ───────────────────────────────────────────────────────────────────
  let state = {
    alive: true,
    startTimestamp: null,
    lastWateredTimestamp: null,
    totalWaterings: 0,
    currentStageIndex: 0,
  };

  // ─── DOM ─────────────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const els = {
    skyGradient:     $('skyGradient'),
    celestial:       $('celestialBody'),
    stars:           $('stars'),
    clouds:          $('clouds'),
    timeDisplay:     $('timeDisplay'),
    dayCounter:      $('dayCounter'),
    waterFill:       $('waterFill'),
    healthFill:      $('healthFill'),
    stageEmoji:      $('stageEmoji'),
    stageName:       $('stageName'),
    messageText:     $('messageText'),
    waterBtn:        $('waterBtn'),
    waterBtnSub:     $('waterBtnSub'),
    nextWaterInfo:   $('nextWaterInfo'),
    deathOverlay:    $('deathOverlay'),
    wateringOverlay: $('wateringOverlay'),
    waterDrops:      $('waterDrops'),
    blossomGroup:    $('blossomGroup'),
    fruitGroup:      $('fruitGroup'),
    canopyGroup:     $('canopyGroup'),
    branchGroup:     $('branchGroup'),
    trunkGroup:      $('trunkGroup'),
    seedlingGroup:   $('seedlingGroup'),
    deadGroup:       $('deadGroup'),
    fallenPetals:    $('fallenPetals'),
    potGroup:        $('potGroup'),
  };

  // ─── Storage ─────────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'mein_baum_v3';

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, wateringCooldown }));
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.state)           state           = { ...state, ...parsed.state };
      if (parsed.wateringCooldown) wateringCooldown = parsed.wateringCooldown;
      return true;
    } catch(e) { return false; }
  }

  // ─── Sky / Time of Day ───────────────────────────────────────────────────────
  function getTimeOfDay() {
    const now = new Date();
    return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  }

  function getSunPosition(t) {
    const sunriseT = 0.25, sunsetT = 0.833;
    const progress = (t - sunriseT) / (sunsetT - sunriseT);
    return {
      x: 5 + progress * 90,
      y: 75 - 60 * Math.sin(progress * Math.PI),
      above: progress >= 0 && progress <= 1,
    };
  }

  function updateSky() {
    const t = getTimeOfDay();
    const h = Math.floor(t * 24);
    const m = Math.floor((t * 24 - h) * 60);
    const pad = n => String(n).padStart(2, '0');
    els.timeDisplay.textContent = `${pad(h)}:${pad(m)}`;

    const skyColors = getSkyColors(h, m);
    els.skyGradient.style.background =
      `linear-gradient(to bottom, ${skyColors.top} 0%, ${skyColors.mid} 50%, ${skyColors.bottom} 100%)`;

    const { x, y } = getSunPosition(t);
    const isMoonTime = h < 6 || h >= 20;

    if (isMoonTime) {
      const moonT = h >= 20 ? (h - 20) / 10 : (h + 4) / 10;
      const moonX = 5 + moonT * 90;
      const moonY = 20 + 30 * Math.sin(moonT * Math.PI);
      els.celestial.style.cssText = `left:${moonX}vw;top:${moonY}%;width:44px;height:44px;
        background:#e8e4d0;box-shadow:0 0 20px rgba(232,228,208,.6),0 0 60px rgba(232,228,208,.2);
        border-radius:50%;transition:left 10s linear,top 10s linear;`;
      els.stars.style.opacity  = '1';
      els.clouds.style.opacity = '0.3';
    } else {
      const isDawn = h >= 6 && h < 9, isDusk = h >= 17 && h < 20;
      const sunColor  = isDawn || isDusk ? '#ff7043' : '#ffe066';
      const glowColor = isDawn || isDusk ? 'rgba(255,112,67,.5)' : 'rgba(255,224,102,.4)';
      const glowSize  = isDawn || isDusk ? '40px rgba(255,152,0,.3)' : '60px rgba(255,224,102,.2)';
      els.celestial.style.cssText = `left:${x}vw;top:${y}%;width:56px;height:56px;
        background:${sunColor};box-shadow:0 0 20px ${glowColor},0 0 ${glowSize};
        border-radius:50%;transition:left 10s linear,top 10s linear,background 3s ease,box-shadow 3s ease;`;
      els.stars.style.opacity  = String(h < 8 || h >= 18 ? 0.3 : 0);
      els.clouds.style.opacity = '0.85';
    }
  }

  function getSkyColors(h, m) {
    const frac = m / 60;
    if (h < 5)  return { top:'#050812', mid:'#0a0e2a', bottom:'#111840' };
    if (h < 6)  return lerpSky({top:'#050812',mid:'#0a0e2a',bottom:'#111840'},{top:'#1a0a2e',mid:'#3b1f5e',bottom:'#7b3f6e'},frac);
    if (h < 7)  return lerpSky({top:'#1a0a2e',mid:'#3b1f5e',bottom:'#7b3f6e'},{top:'#2d1b69',mid:'#c0392b',bottom:'#ff7043'},frac);
    if (h < 8)  return lerpSky({top:'#2d1b69',mid:'#c0392b',bottom:'#ff7043'},{top:'#1a6bbd',mid:'#5aace0',bottom:'#fdd775'},frac);
    if (h < 11) return lerpSky({top:'#1a6bbd',mid:'#5aace0',bottom:'#fdd775'},{top:'#2980b9',mid:'#5dade2',bottom:'#aed6f1'},Math.min(frac+(h-8)/3,1));
    if (h < 16) return { top:'#1c6ea4', mid:'#3498db', bottom:'#87ceeb' };
    if (h < 17) return lerpSky({top:'#1c6ea4',mid:'#3498db',bottom:'#87ceeb'},{top:'#1a3a6b',mid:'#2980b9',bottom:'#f39c12'},frac);
    if (h < 19) return lerpSky({top:'#1a3a6b',mid:'#2980b9',bottom:'#f39c12'},{top:'#0d1b3e',mid:'#8e44ad',bottom:'#e74c3c'},frac+(h-17)/2);
    if (h < 20) return lerpSky({top:'#0d1b3e',mid:'#8e44ad',bottom:'#e74c3c'},{top:'#050812',mid:'#0a0e2a',bottom:'#111840'},frac);
    return { top:'#050812', mid:'#0a0e2a', bottom:'#111840' };
  }

  function lerpSky(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    return { top: lerpColor(a.top,b.top,t), mid: lerpColor(a.mid,b.mid,t), bottom: lerpColor(a.bottom,b.bottom,t) };
  }

  function lerpColor(h1, h2, t) {
    const r1=parseInt(h1.slice(1,3),16), g1=parseInt(h1.slice(3,5),16), b1=parseInt(h1.slice(5,7),16);
    const r2=parseInt(h2.slice(1,3),16), g2=parseInt(h2.slice(3,5),16), b2=parseInt(h2.slice(5,7),16);
    const r=Math.round(r1+(r2-r1)*t), g=Math.round(g1+(g2-g1)*t), b=Math.round(b1+(b2-b1)*t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  function generateStars() {
    els.stars.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 2.5 + 0.5;
      star.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*65}%;
        --twinkle-dur:${2+Math.random()*4}s;--twinkle-delay:${-Math.random()*5}s;`;
      els.stars.appendChild(star);
    }
  }

  // ─── Tree Visuals ────────────────────────────────────────────────────────────
  function applyStage(stage, animated = true) {
    const dur = animated ? '1.5s' : '0s';
    const setOpacity = (el, val) => { el.style.transition = `opacity ${dur} ease`; el.style.opacity = val; };
    setOpacity(els.seedlingGroup, stage.showSeedling ? 1 : 0);
    setOpacity(els.trunkGroup,    stage.showTrunk    ? 1 : 0);
    setOpacity(els.branchGroup,   stage.showBranches ? 1 : 0);
    setOpacity(els.canopyGroup,   stage.showCanopy   ? 1 : 0);
    setOpacity(els.blossomGroup,  stage.showBlossoms ? 1 : 0);
    setOpacity(els.fruitGroup,    stage.showFruits   ? 1 : 0);
    setOpacity(els.potGroup,      stage.showSeedling ? 1 : 0);
    setOpacity(els.deadGroup,     0);
    els.stageEmoji.textContent = stage.emoji;
    els.stageName.textContent  = stage.name;
    els.fallenPetals.style.display = stage.showBlossoms ? 'block' : 'none';
  }

  function applyDeadState() {
    const setOpacity = (el, val) => { el.style.transition = 'opacity 2s ease'; el.style.opacity = val; };
    setOpacity(els.seedlingGroup, 0);
    setOpacity(els.canopyGroup, 0);
    setOpacity(els.blossomGroup, 0);
    setOpacity(els.fruitGroup, 0);
    setOpacity(els.trunkGroup, 0);
    setOpacity(els.branchGroup, 0);
    setOpacity(els.potGroup, 1);
    setTimeout(() => { setOpacity(els.deadGroup, 1); els.deathOverlay.classList.add('visible'); }, 1500);
    els.stageEmoji.textContent = '💀';
    els.stageName.textContent  = 'Gestorben';
    els.fallenPetals.style.display = 'none';
  }

  function createFallenPetals() {
    els.fallenPetals.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'fallen-petal';
      p.style.cssText = `left:${15+Math.random()*70}%;animation-delay:${-Math.random()*8}s;
        animation-duration:${7+Math.random()*5}s;transform:rotate(${Math.random()*360}deg);
        opacity:${0.4+Math.random()*0.5};`;
      els.fallenPetals.appendChild(p);
    }
  }

  // ─── Game Logic ──────────────────────────────────────────────────────────────
  function getWaterLevel() {
    if (!state.lastWateredTimestamp) return 0;
    const elapsed = Date.now() - state.lastWateredTimestamp;
    return Math.max(0, Math.min(1, 1 - elapsed / deathAfter()));
  }

  function getHealthLevel() {
    const w = getWaterLevel();
    if (w > 0.66) return 1;
    if (w > 0.33) return 0.4 + (w - 0.33) / 0.33 * 0.6;
    return w / 0.33 * 0.4;
  }

  function getDaysSurvived() {
    if (!state.startTimestamp) return 0;
    return Math.floor((Date.now() - state.startTimestamp) / wateringCooldown);
  }

  function getCurrentStage() {
    const days = state.totalWaterings;
    let stage = STAGES[0];
    for (const s of STAGES) { if (days >= s.minDays) stage = s; }
    return stage;
  }

  function canWaterNow() {
    if (!state.lastWateredTimestamp) return true;
    return (Date.now() - state.lastWateredTimestamp) >= wateringCooldown;
  }

  function isDead() {
    if (!state.lastWateredTimestamp) return false;
    return (Date.now() - state.lastWateredTimestamp) >= deathAfter();
  }

  function checkDeath() {
    if (!state.alive) return true;
    if (isDead()) {
      state.alive = false;
      saveState();
      applyDeadState();
      return true;
    }
    return false;
  }

  // ─── UI Update ───────────────────────────────────────────────────────────────
  function formatDuration(ms) {
    if (ms <= 0) return '0s';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (d > 0) return `${d}T ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function updateUI() {
    if (!state.alive) return;
    const waterLevel  = getWaterLevel();
    const healthLevel = getHealthLevel();
    const stage       = getCurrentStage();

    els.waterFill.style.width  = `${Math.round(waterLevel  * 100)}%`;
    els.healthFill.style.width = `${Math.round(healthLevel * 100)}%`;

    document.body.classList.toggle('low-health',      healthLevel < 0.4);
    document.body.classList.toggle('critical-health', healthLevel < 0.15);

    els.dayCounter.textContent = `Gießung ${state.totalWaterings}`;

    const stageIdx = STAGES.indexOf(stage);
    if (stageIdx !== state.currentStageIndex) {
      state.currentStageIndex = stageIdx;
      applyStage(stage, true);
      showMessage(stage.message);
      saveState();
    }

    if (canWaterNow()) {
      els.waterBtn.disabled = false;
      els.waterBtnSub.textContent = 'Jetzt gießen!';
      els.nextWaterInfo.textContent = '';
    } else {
      els.waterBtn.disabled = true;
      const remaining = wateringCooldown - (Date.now() - state.lastWateredTimestamp);
      els.waterBtnSub.textContent = formatDuration(remaining);
      els.nextWaterInfo.textContent = `Nächste Gießung in ${formatDuration(remaining)} möglich`;
    }

    if (waterLevel < 0.15) {
      showMessage('⚠️ Dein Baum verdurstet fast! Gieße ihn sofort!');
    } else if (waterLevel < 0.35) {
      showMessage('Dein Baum hat Durst... 💧 Zeit zum Gießen!');
    }
  }

  let messageTimeout = null;
  function showMessage(text, duration = 0) {
    els.messageText.style.opacity = '0';
    setTimeout(() => { els.messageText.textContent = text; els.messageText.style.opacity = '1'; }, 300);
    if (duration > 0) {
      clearTimeout(messageTimeout);
      messageTimeout = setTimeout(() => updateUI(), duration);
    }
  }

  // ─── Watering ────────────────────────────────────────────────────────────────
  function water() {
    if (!canWaterNow() || !state.alive) return;
    els.wateringOverlay.classList.add('visible');
    els.waterDrops.style.opacity = '1';
    setTimeout(() => {
      els.wateringOverlay.classList.remove('visible');
      els.waterDrops.style.opacity = '0';
      state.lastWateredTimestamp = Date.now();
      state.totalWaterings += 1;
      if (!state.startTimestamp) state.startTimestamp = Date.now();
      saveState();
      updateUI();
      showMessage('Gegossen! Dein Baum dankt dir! 💧✨', 5000);
    }, 1200);
  }

  // ─── Restart ─────────────────────────────────────────────────────────────────
  function restart() {
    state = {
      alive: true,
      startTimestamp: Date.now(),
      lastWateredTimestamp: Date.now(),
      totalWaterings: 1,
      currentStageIndex: 0,
    };
    saveState();
    els.deathOverlay.classList.remove('visible');
    applyStage(STAGES[0], true);
    updateUI();
    showMessage('Neues Leben beginnt! 🌱 Gieße regelmäßig!');
  }

  // ─── Debug Panel ─────────────────────────────────────────────────────────────
  let debugOpen = false;

  function toggleDebug() {
    debugOpen = !debugOpen;
    const body   = $('debugBody');
    const toggle = $('debugToggle');
    if (body)   body.classList.toggle('open', debugOpen);
    if (toggle) toggle.classList.toggle('open', debugOpen);
  }

  // Slider: 0–100 mapped logarithmically → 1s … 86400s
  function sliderToMs(val) {
    const v = Number(val);
    // log scale: 0 → 1000ms (1s), 100 → 86400000ms (24h)
    const minLog = Math.log(1000);
    const maxLog = Math.log(86400000);
    return Math.round(Math.exp(minLog + (v / 100) * (maxLog - minLog)));
  }

  function setWaterInterval(sliderVal) {
    wateringCooldown = sliderToMs(sliderVal);
    const label = $('intervalValue');
    if (label) label.textContent = formatDuration(wateringCooldown);
    saveState();
    updateUI();
  }

  // Sync slider display on init
  function syncSlider() {
    const slider = $('intervalSlider');
    const label  = $('intervalValue');
    if (!slider || !label) return;
    // Find slider position that matches current wateringCooldown
    const minLog = Math.log(1000);
    const maxLog = Math.log(86400000);
    const pos = Math.round(((Math.log(wateringCooldown) - minLog) / (maxLog - minLog)) * 100);
    slider.value = Math.max(0, Math.min(100, pos));
    label.textContent = formatDuration(wateringCooldown);
  }

  function debugReset() {
    if (!confirm('Spielstand löschen und neu starten?')) return;
    localStorage.removeItem(STORAGE_KEY);
    wateringCooldown = 24 * 60 * 60 * 1000;
    syncSlider();
    state = { alive: true, startTimestamp: null, lastWateredTimestamp: null, totalWaterings: 0, currentStageIndex: 0 };
    els.deathOverlay.classList.remove('visible');
    applyStage(STAGES[0], false);
    updateUI();
    showMessage('Willkommen! Gieße deinen Setzling zum Start! 🌱');
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  function init() {
    generateStars();
    createFallenPetals();
    loadState();
    syncSlider();

    const stage = getCurrentStage();
    applyStage(stage, false);

    if (!checkDeath()) {
      updateUI();
      showMessage(state.totalWaterings === 0
        ? 'Willkommen! Gieße deinen Setzling zum Start! 🌱'
        : stage.message
      );
    }

    setInterval(updateSky, 1000);
    setInterval(() => { if (!checkDeath()) updateUI(); }, 1000);
    updateSky();
  }

  return { init, water, restart, toggleDebug, setWaterInterval, debugReset };

})();

document.addEventListener('DOMContentLoaded', () => App.init());

/**
 * MEIN BAUM — App.js
 * A real-time growing tree Tamagotchi
 * Growth stages based on real-world days/weeks
 */
 
const App = (() => {
 
  // ─── Growth Stage Definitions ───────────────────────────────────────────────
  // Each stage unlocks at a cumulative number of days alive (watered)
  const STAGES = [
    {
      id: 'seedling',
      name: 'Setzling',
      emoji: '🌱',
      minDays: 0,
      showSeedling: true,
      showTrunk: false,
      showBranches: false,
      showCanopy: false,
      showBlossoms: false,
      showFruits: false,
      message: 'Ein kleiner Setzling! Gieße ihn täglich. 🌱',
    },
    {
      id: 'sprout',
      name: 'Jungtrieb',
      emoji: '🪴',
      minDays: 3,
      showSeedling: false,
      showTrunk: true,
      showBranches: false,
      showCanopy: false,
      showBlossoms: false,
      showFruits: false,
      message: 'Ein kleiner Stamm bildet sich! 🪴',
    },
    {
      id: 'sapling',
      name: 'Jungbaum',
      emoji: '🌿',
      minDays: 7,
      showSeedling: false,
      showTrunk: true,
      showBranches: true,
      showCanopy: false,
      showBlossoms: false,
      showFruits: false,
      message: 'Dein Baum bekommt erste Äste! 🌿',
    },
    {
      id: 'young',
      name: 'Junger Baum',
      emoji: '🌳',
      minDays: 14,
      showSeedling: false,
      showTrunk: true,
      showBranches: true,
      showCanopy: true,
      showBlossoms: false,
      showFruits: false,
      message: 'Grünes Blätterdach entfaltet sich! 🌳',
    },
    {
      id: 'flowering',
      name: 'Blühender Baum',
      emoji: '🌸',
      minDays: 21,
      showSeedling: false,
      showTrunk: true,
      showBranches: true,
      showCanopy: true,
      showBlossoms: true,
      showFruits: false,
      message: 'Wunderschöne Blüten! 🌸 Dein Baum blüht!',
    },
    {
      id: 'fruiting',
      name: 'Fruchtbaum',
      emoji: '🍎',
      minDays: 35,
      showSeedling: false,
      showTrunk: true,
      showBranches: true,
      showCanopy: true,
      showBlossoms: true,
      showFruits: true,
      message: 'Dein Baum trägt Früchte! 🍎 Beeindruckend!',
    },
    {
      id: 'ancient',
      name: 'Alter Baum',
      emoji: '🌲',
      minDays: 60,
      showSeedling: false,
      showTrunk: true,
      showBranches: true,
      showCanopy: true,
      showBlossoms: true,
      showFruits: true,
      message: 'Ein majestätischer alter Baum! 🌲 Du hast ihn groß gemacht!',
    },
  ];
 
  const DEATH_DAYS = 3;          // Days without watering = death
 
  // ─── Speed / Debug ───────────────────────────────────────────────────────────
  // speedFactor: how many simulated ms pass per 1 real ms
  // e.g. factor=3600 → 1 real second = 1 simulated hour
  let speedFactor = 1;
 
  // Virtual clock anchors — updated whenever speed changes
  let simEpochReal = Date.now(); // real time at last speed-change
  let simEpochVirt = Date.now(); // virtual time at that moment
 
  // Returns current simulated "now" in ms (replaces Date.now() everywhere)
  function simNow() {
    return simEpochVirt + (Date.now() - simEpochReal) * speedFactor;
  }
 
  // Convenience wrappers (in simulated ms)
  function getWateringCooldown() { return 24 * 60 * 60 * 1000; }
  function getDeathMs()          { return DEATH_DAYS * 24 * 60 * 60 * 1000; }
 
  // ─── State ───────────────────────────────────────────────────────────────────
  let state = {
    alive: true,
    startTimestamp: null,
    lastWateredTimestamp: null,
    totalWaterings: 0,
    daysSurvived: 0,
    currentStageIndex: 0,
  };
 
  // ─── DOM References ──────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
 
  const els = {
    skyGradient:   $('skyGradient'),
    celestial:     $('celestialBody'),
    stars:         $('stars'),
    clouds:        $('clouds'),
    timeDisplay:   $('timeDisplay'),
    dayCounter:    $('dayCounter'),
    waterFill:     $('waterFill'),
    healthFill:    $('healthFill'),
    stageEmoji:    $('stageEmoji'),
    stageName:     $('stageName'),
    messageText:   $('messageText'),
    waterBtn:      $('waterBtn'),
    waterBtnSub:   $('waterBtnSub'),
    nextWaterInfo: $('nextWaterInfo'),
    deathOverlay:  $('deathOverlay'),
    wateringOverlay: $('wateringOverlay'),
    waterDrops:    $('waterDrops'),
    blossomGroup:  $('blossomGroup'),
    fruitGroup:    $('fruitGroup'),
    canopyGroup:   $('canopyGroup'),
    branchGroup:   $('branchGroup'),
    trunkGroup:    $('trunkGroup'),
    seedlingGroup: $('seedlingGroup'),
    deadGroup:     $('deadGroup'),
    fallenPetals:  $('fallenPetals'),
    potGroup:      $('potGroup'),
  };
 
  // ─── Storage ─────────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'mein_baum_v2';
 
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
 
  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
      return true;
    } catch(e) {
      return false;
    }
  }
 
  // ─── Sky / Time of Day ───────────────────────────────────────────────────────
  // Returns a value 0-1 representing time of day (0 = midnight, 0.5 = noon)
  function getTimeOfDay() {
    const now = new Date();
    return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  }
 
  // Sun position: follows a sine arc across the sky
  // t = 0..1 (time of day). Sun rises ~6h (t=0.25), sets ~20h (t=0.833)
  function getSunPosition(t) {
    // Arc from left to right
    const sunriseT = 0.25;  // 6:00
    const sunsetT  = 0.833; // 20:00
    const arcSpan  = sunsetT - sunriseT;
    const progress = (t - sunriseT) / arcSpan; // 0=rise, 1=set
    const angle = progress * Math.PI; // 0=rise, PI=set
    const x = 5 + progress * 90; // % from left
    const y = 75 - 60 * Math.sin(angle); // % from top (arc)
    return { x, y, above: progress >= 0 && progress <= 1 };
  }
 
  function updateSky() {
    const t = getTimeOfDay();
    const h = Math.floor(t * 24);
    const m = Math.floor((t * 24 - h) * 60);
    const s = Math.floor(((t * 24 - h) * 60 - m) * 60);
 
    // Format time
    const pad = n => String(n).padStart(2, '0');
    els.timeDisplay.textContent = `${pad(h)}:${pad(m)}`;
 
    // Sky gradient based on hour
    const skyColors = getSkyColors(h, m);
    els.skyGradient.style.background =
      `linear-gradient(to bottom, ${skyColors.top} 0%, ${skyColors.mid} 50%, ${skyColors.bottom} 100%)`;
 
    // Celestial body
    const { x, y, above } = getSunPosition(t);
    const isMoonTime = h < 6 || h >= 20;
 
    if (isMoonTime) {
      // Moon
      const moonT = h >= 20 ? (h - 20) / 10 : (h + 4) / 10;
      const moonX = 5 + moonT * 90;
      const moonY = 20 + 30 * Math.sin(moonT * Math.PI);
      els.celestial.style.cssText = `
        left: ${moonX}vw; top: ${moonY}%;
        width: 44px; height: 44px;
        background: #e8e4d0;
        box-shadow: 0 0 20px rgba(232,228,208,0.6), 0 0 60px rgba(232,228,208,0.2);
        border-radius: 50%;
        transition: left 10s linear, top 10s linear;
      `;
      els.stars.style.opacity = '1';
      els.clouds.style.opacity = '0.3';
    } else {
      // Sun — color shifts warmer at dawn/dusk
      const isDawn  = h >= 6  && h < 9;
      const isDusk  = h >= 17 && h < 20;
      const sunColor  = isDawn || isDusk ? '#ff7043' : '#ffe066';
      const glowColor = isDawn || isDusk ? 'rgba(255,112,67,0.5)' : 'rgba(255,224,102,0.4)';
      const glowSize  = isDawn || isDusk ? '40px rgba(255,152,0,0.3)' : '60px rgba(255,224,102,0.2)';
 
      els.celestial.style.cssText = `
        left: ${x}vw; top: ${y}%;
        width: 56px; height: 56px;
        background: ${sunColor};
        box-shadow: 0 0 20px ${glowColor}, 0 0 ${glowSize};
        border-radius: 50%;
        transition: left 10s linear, top 10s linear, background 3s ease, box-shadow 3s ease;
      `;
      const nightAlpha = h < 8 || h >= 18 ? 0.3 : 0;
      els.stars.style.opacity = String(nightAlpha);
      els.clouds.style.opacity = '0.85';
    }
  }
 
  function getSkyColors(h, m) {
    // Smooth transitions between sky states
    const frac = m / 60;
 
    // Night: 0-5
    if (h < 5)  return { top: '#050812', mid: '#0a0e2a', bottom: '#111840' };
    // Pre-dawn: 5
    if (h < 6)  return lerpSky(
      { top: '#050812', mid: '#0a0e2a', bottom: '#111840' },
      { top: '#1a0a2e', mid: '#3b1f5e', bottom: '#7b3f6e' },
      frac
    );
    // Dawn: 6
    if (h < 7)  return lerpSky(
      { top: '#1a0a2e', mid: '#3b1f5e', bottom: '#7b3f6e' },
      { top: '#2d1b69', mid: '#c0392b', bottom: '#ff7043' },
      frac
    );
    // Sunrise: 7
    if (h < 8)  return lerpSky(
      { top: '#2d1b69', mid: '#c0392b', bottom: '#ff7043' },
      { top: '#1a6bbd', mid: '#5aace0', bottom: '#fdd775' },
      frac
    );
    // Morning: 8-10
    if (h < 11) return lerpSky(
      { top: '#1a6bbd', mid: '#5aace0', bottom: '#fdd775' },
      { top: '#2980b9', mid: '#5dade2', bottom: '#aed6f1' },
      Math.min(frac + (h - 8) / 3, 1)
    );
    // Day: 11-16
    if (h < 16) return { top: '#1c6ea4', mid: '#3498db', bottom: '#87ceeb' };
    // Afternoon: 16-17
    if (h < 17) return lerpSky(
      { top: '#1c6ea4', mid: '#3498db', bottom: '#87ceeb' },
      { top: '#1a3a6b', mid: '#2980b9', bottom: '#f39c12' },
      frac
    );
    // Dusk: 17-19
    if (h < 19) return lerpSky(
      { top: '#1a3a6b', mid: '#2980b9', bottom: '#f39c12' },
      { top: '#0d1b3e', mid: '#8e44ad', bottom: '#e74c3c' },
      frac + (h - 17) / 2
    );
    // Sunset: 19
    if (h < 20) return lerpSky(
      { top: '#0d1b3e', mid: '#8e44ad', bottom: '#e74c3c' },
      { top: '#050812', mid: '#0a0e2a', bottom: '#111840' },
      frac
    );
    // Night: 20+
    return { top: '#050812', mid: '#0a0e2a', bottom: '#111840' };
  }
 
  function lerpSky(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    return {
      top: lerpColor(a.top, b.top, t),
      mid: lerpColor(a.mid, b.mid, t),
      bottom: lerpColor(a.bottom, b.bottom, t),
    };
  }
 
  function lerpColor(hex1, hex2, t) {
    const r1 = parseInt(hex1.slice(1,3),16), g1 = parseInt(hex1.slice(3,5),16), b1 = parseInt(hex1.slice(5,7),16);
    const r2 = parseInt(hex2.slice(1,3),16), g2 = parseInt(hex2.slice(3,5),16), b2 = parseInt(hex2.slice(5,7),16);
    const r = Math.round(r1 + (r2-r1)*t);
    const g = Math.round(g1 + (g2-g1)*t);
    const b = Math.round(b1 + (b2-b1)*t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }
 
  function generateStars() {
    els.stars.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 2.5 + 0.5;
      star.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 65}%;
        --twinkle-dur: ${2 + Math.random() * 4}s;
        --twinkle-delay: ${-Math.random() * 5}s;
      `;
      els.stars.appendChild(star);
    }
  }
 
  // ─── Tree Visuals ────────────────────────────────────────────────────────────
  function applyStage(stage, animated = true) {
    const dur = animated ? '1.5s' : '0s';
    const setOpacity = (el, val) => {
      el.style.transition = `opacity ${dur} ease`;
      el.style.opacity = val;
    };
 
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
 
    // Fallen petals only when flowering/fruiting
    els.fallenPetals.style.display = stage.showBlossoms ? 'block' : 'none';
  }
 
  function applyDeadState() {
    const setOpacity = (el, val) => {
      el.style.transition = 'opacity 2s ease';
      el.style.opacity = val;
    };
    setOpacity(els.seedlingGroup, 0);
    setOpacity(els.canopyGroup, 0);
    setOpacity(els.blossomGroup, 0);
    setOpacity(els.fruitGroup, 0);
    setOpacity(els.trunkGroup, 0);
    setOpacity(els.branchGroup, 0);
    setOpacity(els.potGroup, 1);
 
    setTimeout(() => {
      setOpacity(els.deadGroup, 1);
      els.deathOverlay.classList.add('visible');
    }, 1500);
 
    els.stageEmoji.textContent = '💀';
    els.stageName.textContent = 'Gestorben';
    els.fallenPetals.style.display = 'none';
  }
 
  function createFallenPetals() {
    els.fallenPetals.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'fallen-petal';
      p.style.cssText = `
        left: ${15 + Math.random() * 70}%;
        animation-delay: ${-Math.random() * 8}s;
        animation-duration: ${7 + Math.random() * 5}s;
        transform: rotate(${Math.random() * 360}deg);
        opacity: ${0.4 + Math.random() * 0.5};
      `;
      els.fallenPetals.appendChild(p);
    }
  }
 
  // ─── Game Logic ──────────────────────────────────────────────────────────────
  function getWaterLevel() {
    if (!state.lastWateredTimestamp) return 0;
    const elapsed = simNow() - state.lastWateredTimestamp;
    const level = 1 - elapsed / getDeathMs();
    return Math.max(0, Math.min(1, level));
  }
 
  function getHealthLevel() {
    const waterLevel = getWaterLevel();
    // Health declines faster in last third
    if (waterLevel > 0.66) return 1;
    if (waterLevel > 0.33) return 0.4 + (waterLevel - 0.33) / 0.33 * 0.6;
    return waterLevel / 0.33 * 0.4;
  }
 
  function getDaysSurvived() {
    if (!state.startTimestamp) return 0;
    return Math.floor((simNow() - state.startTimestamp) / (24 * 60 * 60 * 1000));
  }
 
  function getWateredDays() {
    // Days is based on total waterings (one per day max)
    return state.totalWaterings;
  }
 
  function getCurrentStage() {
    const days = getWateredDays();
    let stage = STAGES[0];
    for (const s of STAGES) {
      if (days >= s.minDays) stage = s;
    }
    return stage;
  }
 
  function canWaterNow() {
    if (!state.lastWateredTimestamp) return true;
    const elapsed = simNow() - state.lastWateredTimestamp;
    return elapsed >= getWateringCooldown();
  }
 
  function isDead() {
    if (!state.lastWateredTimestamp) return false;
    const elapsed = simNow() - state.lastWateredTimestamp;
    return elapsed >= getDeathMs();
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
  function updateUI() {
    if (!state.alive) return;
 
    const waterLevel  = getWaterLevel();
    const healthLevel = getHealthLevel();
    const daysSurvived = getDaysSurvived();
    const stage = getCurrentStage();
 
    // Bars
    els.waterFill.style.width  = `${Math.round(waterLevel  * 100)}%`;
    els.healthFill.style.width = `${Math.round(healthLevel * 100)}%`;
 
    // Health body class
    document.body.classList.toggle('low-health',      healthLevel < 0.4);
    document.body.classList.toggle('critical-health', healthLevel < 0.15);
 
    // Day counter
    els.dayCounter.textContent = `Tag ${daysSurvived + 1}`;
 
    // Stage
    const stageIdx = STAGES.indexOf(stage);
    if (stageIdx !== state.currentStageIndex) {
      state.currentStageIndex = stageIdx;
      applyStage(stage, true);
      showMessage(stage.message);
      saveState();
    }
 
    // Water button
    const canWater = canWaterNow();
    els.waterBtn.disabled = !canWater;
 
    if (canWater) {
      els.waterBtnSub.textContent = 'Jetzt gießen!';
      els.nextWaterInfo.textContent = '';
    } else {
      const elapsed = simNow() - state.lastWateredTimestamp;
      const remaining = getWateringCooldown() - elapsed;
      const hLeft = Math.floor(remaining / 3600000);
      const mLeft = Math.floor((remaining % 3600000) / 60000);
      const sLeft = Math.floor((remaining % 60000) / 1000);
      const label = speedFactor > 60
        ? `${hLeft}h ${mLeft}m ${sLeft}s (sim)`
        : `${hLeft}h ${mLeft}m`;
      els.waterBtnSub.textContent = label;
      els.nextWaterInfo.textContent =
        `Nächste Gießung in ${hLeft}h ${mLeft}min möglich`;
    }
 
    // Message based on water level if no special message
    if (waterLevel < 0.15) {
      showMessage('⚠️ Dein Baum verdurstet fast! Gieße ihn sofort!');
    } else if (waterLevel < 0.35) {
      showMessage('Dein Baum hat Durst... 💧 Zeit zum Gießen!');
    }
 
    updateDebugInfo();
  }
 
  let messageTimeout = null;
  function showMessage(text, duration = 0) {
    els.messageText.style.opacity = '0';
    setTimeout(() => {
      els.messageText.textContent = text;
      els.messageText.style.opacity = '1';
    }, 300);
    if (duration > 0) {
      clearTimeout(messageTimeout);
      messageTimeout = setTimeout(() => updateUI(), duration);
    }
  }
 
  // ─── Watering ────────────────────────────────────────────────────────────────
  function water() {
    if (!canWaterNow() || !state.alive) return;
 
    // Show watering animation
    els.wateringOverlay.classList.add('visible');
    els.waterDrops.style.opacity = '1';
 
    setTimeout(() => {
      els.wateringOverlay.classList.remove('visible');
      els.waterDrops.style.opacity = '0';
 
      state.lastWateredTimestamp = simNow();
      state.totalWaterings += 1;
      if (!state.startTimestamp) state.startTimestamp = simNow();
 
      saveState();
      updateUI();
      showMessage('Gegossen! Dein Baum dankt dir! 💧✨', 5000);
    }, 1800);
  }
 
  // ─── Restart ─────────────────────────────────────────────────────────────────
  function restart() {
    state = {
      alive: true,
      startTimestamp: simNow(),
      lastWateredTimestamp: simNow(),
      totalWaterings: 1,
      daysSurvived: 0,
      currentStageIndex: 0,
    };
    saveState();
    els.deathOverlay.classList.remove('visible');
    applyStage(STAGES[0], true);
    updateUI();
    showMessage('Neues Leben beginnt! 🌱 Gieße täglich!');
  }
 
  // ─── Init ────────────────────────────────────────────────────────────────────
  function init() {
    // Anchor the virtual clock to real time at startup (speed = 1×)
    simEpochReal = Date.now();
    simEpochVirt = Date.now();
 
    generateStars();
    createFallenPetals();
 
    const hasData = loadState();
 
    if (!hasData) {
      // First time ever
      state.startTimestamp = null;
      state.lastWateredTimestamp = null;
      state.totalWaterings = 0;
      state.alive = true;
      state.currentStageIndex = 0;
    }
 
    // Apply visual stage without animation on load
    const stage = getCurrentStage();
    applyStage(stage, false);
 
    if (checkDeath()) {
      // Tree already dead
    } else {
      updateUI();
      showMessage(state.totalWaterings === 0
        ? 'Willkommen! Gieße deinen Setzling zum Start! 🌱'
        : stage.message
      );
    }
 
    // Sky updates every second; game state every second too (needed for fast-forward)
    setInterval(updateSky, 1000);
    setInterval(() => {
      if (!checkDeath()) updateUI();
    }, 1000);
 
    updateSky();
  }
 
  // ─── Debug Panel ─────────────────────────────────────────────────────────────
  let debugOpen = false;
 
  function formatSimDuration(ms) {
    if (ms <= 0) return '0s';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (d > 0) return `${d}T ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
 
  function updateDebugInfo() {
    const dbgCooldown = document.getElementById('dbgCooldown');
    const dbgDeath    = document.getElementById('dbgDeath');
    if (!dbgCooldown || !dbgDeath) return;
 
    if (!state.lastWateredTimestamp) {
      dbgCooldown.textContent = '—';
      dbgDeath.textContent    = '—';
      return;
    }
 
    const elapsed  = simNow() - state.lastWateredTimestamp;
    const coolLeft = getWateringCooldown() - elapsed;
    const dieLeft  = getDeathMs() - elapsed;
 
    dbgCooldown.textContent = coolLeft > 0 ? formatSimDuration(coolLeft) : '✅ jetzt!';
    dbgDeath.textContent    = dieLeft  > 0 ? formatSimDuration(dieLeft)  : '💀 tot!';
  }
 
  function toggleDebug() {
    debugOpen = !debugOpen;
    const body   = document.getElementById('debugBody');
    const toggle = document.getElementById('debugToggle');
    body  && body.classList.toggle('open', debugOpen);
    toggle && toggle.classList.toggle('open', debugOpen);
  }
 
  function setSpeed(val) {
    // Before changing speed: freeze current virtual time so clock doesn't jump
    const vNow = simNow();
    speedFactor   = Math.max(1, Number(val));
    simEpochReal  = Date.now();
    simEpochVirt  = vNow;
 
    // Update displayed label
    const display = document.getElementById('speedValue');
    if (!display) return;
    const realSecPerSimDay = (24 * 3600) / speedFactor;
    if (speedFactor === 1) {
      display.textContent = '1× (Echtzeit)';
    } else if (realSecPerSimDay >= 3600) {
      display.textContent = `${speedFactor}× (~1 Sim-Tag = ${Math.round(realSecPerSimDay/3600)}h)`;
    } else if (realSecPerSimDay >= 60) {
      display.textContent = `${speedFactor}× (~1 Sim-Tag = ${Math.round(realSecPerSimDay/60)}min)`;
    } else {
      display.textContent = `${speedFactor}× (~1 Sim-Tag = ${Math.round(realSecPerSimDay)}s)`;
    }
 
    updateDebugInfo();
  }
 
  function debugReset() {
    if (!confirm('Save-Stand löschen und neu starten?')) return;
    localStorage.removeItem(STORAGE_KEY);
    // Reset virtual clock
    simEpochReal = Date.now();
    simEpochVirt = Date.now();
    speedFactor  = 1;
    const slider = document.getElementById('speedSlider');
    if (slider) { slider.value = 1; setSpeed(1); }
    state = {
      alive: true,
      startTimestamp: null,
      lastWateredTimestamp: null,
      totalWaterings: 0,
      daysSurvived: 0,
      currentStageIndex: 0,
    };
    els.deathOverlay.classList.remove('visible');
    applyStage(STAGES[0], false);
    updateUI();
    showMessage('Willkommen! Gieße deinen Setzling zum Start! 🌱');
  }
 
  // ─── Public API ──────────────────────────────────────────────────────────────
  return { init, water, restart, setSpeed, toggleDebug, debugReset };
 
})();
 
document.addEventListener('DOMContentLoaded', () => App.init());

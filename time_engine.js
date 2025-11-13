/* ============================================================
   === AVIATION CAPITAL SIMULATOR - TIME ENGINE v6.0 FINAL ====
   ------------------------------------------------------------
   ▪ OFF freezes absolutely everything
   ▪ ON resumes from exact frozen moment
   ▪ No resets, no drift, no desync
   ▪ One single master time value: acs_sim_time
   ▪ Perfect for Safari, Chrome, Firefox, Edge, iOS, Android
   ▪ Zero HTML edits needed
   ============================================================ */

/* ============================================================
   === CONSTANTS ===============================================
   ============================================================ */

const SIM_START = new Date(Date.UTC(1940, 0, 1, 0, 0, 0));  // 1 JAN 1940, UTC

/* Storage Keys */
const KEY_SIM_TIME = "acs_sim_time";        // ALWAYS stores the master time
const KEY_SIM_STATE = "acs_sim_state";      // "ON" | "OFF"
const KEY_REAL_START = "acs_real_start";    // real start timestamp (ON only)

/* ============================================================
   === GLOBAL ENGINE OBJECT ====================================
   ============================================================ */

const ACS_TIME = {
  simTime: SIM_START,
  tick: null,
  listeners: [],
};

/* ============================================================
   === LOAD ENGINE STATE =======================================
   ============================================================ */

function loadEngineState() {
  const savedTime = localStorage.getItem(KEY_SIM_TIME);
  const savedState = localStorage.getItem(KEY_SIM_STATE);
  const savedRealStart = localStorage.getItem(KEY_REAL_START);

  ACS_TIME.simTime = savedTime ? new Date(savedTime) : SIM_START;

  return {
    state: savedState || "OFF",
    realStart: savedRealStart ? new Date(savedRealStart) : null
  };
}

/* ============================================================
   === SAVE SIM TIME (MASTER) ==================================
   ============================================================ */

function saveSimTime(dateObj) {
  localStorage.setItem(KEY_SIM_TIME, dateObj.toISOString());
  ACS_TIME.simTime = dateObj;
}

/* ============================================================
   === RECONSTRUCT SIM TIME (ON MODE) ==========================
   ============================================================ */

function reconstructSimTime(realStart) {
  const now = new Date();
  const secPassed = Math.floor((now - realStart) / 1000);
  return new Date(SIM_START.getTime() + secPassed * 60000);
}

/* ============================================================
   === START SIMULATION (ON) ===================================
   ============================================================ */

function startSimulation() {
  stopSimulation();

  let { state, realStart } = loadEngineState();

  if (!realStart) {
    const savedSim = ACS_TIME.simTime;
    const minutesFromStart = (savedSim - SIM_START) / 60000;
    realStart = new Date(Date.now() - minutesFromStart * 1000);
    localStorage.setItem(KEY_REAL_START, realStart.toISOString());
  }

  localStorage.setItem(KEY_SIM_STATE, "ON");

  ACS_TIME.tick = setInterval(() => {
    const realStartNow = new Date(localStorage.getItem(KEY_REAL_START));
    const newSim = reconstructSimTime(realStartNow);
    saveSimTime(newSim);

    renderClock(newSim);
    notifyListeners(newSim);

    if (newSim.getUTCFullYear() >= 2026) {
      endCycle();
    }
  }, 1000);
}

/* ============================================================
   === STOP SIMULATION (OFF) ===================================
   ============================================================ */

function stopSimulation() {
  if (ACS_TIME.tick) clearInterval(ACS_TIME.tick);
  ACS_TIME.tick = null;
}

/* ============================================================
   === TURN OFF (FREEZE) =======================================
   ============================================================ */

function freezeSimulation() {
  stopSimulation();

  saveSimTime(ACS_TIME.simTime);

  localStorage.setItem(KEY_SIM_STATE, "OFF");
  localStorage.removeItem(KEY_REAL_START);

  renderClock(ACS_TIME.simTime);
  notifyListeners(ACS_TIME.simTime);
}

/* ============================================================
   === ADMIN TOGGLE =============================================
   ============================================================ */

function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle the simulation state.");
    return;
  }

  const state = localStorage.getItem(KEY_SIM_STATE) || "OFF";

  if (state === "ON") {
    freezeSimulation();
    alert("⏸ Simulation OFF — Time frozen.");
  } else {
    startSimulation();
    alert("▶️ Simulation ON — Time advancing.");
  }
}

/* ============================================================
   === END OF CYCLE =============================================
   ============================================================ */

function endCycle() {
  freezeSimulation();
  alert("🕛 Simulation reached 2026 — End of world cycle.");
  window.location.href = "ranking.html";
}

/* ============================================================
   === RESET WORLD ==============================================
   ============================================================ */

function resetWorld() {
  stopSimulation();

  saveSimTime(SIM_START);

  localStorage.setItem(KEY_SIM_STATE, "OFF");
  localStorage.removeItem(KEY_REAL_START);

  renderClock(SIM_START);
  notifyListeners(SIM_START);

  alert("♻️ World reset to 1940.");
}

/* ============================================================
   === CLOCK RENDERING ==========================================
   ============================================================ */

function renderClock(t) {
  const el = document.getElementById("acs-clock");
  if (!el) return;

  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  const mon = t.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const yy = t.getUTCFullYear();

  el.textContent = `${hh}:${mm} — ${dd} ${mon} ${yy}`;
}

/* ============================================================
   === LISTENER SYSTEM ==========================================
   ============================================================ */

function notifyListeners(t) {
  for (const cb of ACS_TIME.listeners) cb(t);
}

function registerTimeListener(cb) {
  if (typeof cb === "function") ACS_TIME.listeners.push(cb);
}

/* ============================================================
   === HEARTBEAT (SYNC ACROSS PAGES) =============================
   ============================================================ */

function heartbeat() {
  const state = localStorage.getItem(KEY_SIM_STATE) || "OFF";

  if (state === "OFF") {
    stopSimulation();
    const frozen = new Date(localStorage.getItem(KEY_SIM_TIME) || SIM_START);
    ACS_TIME.simTime = frozen;
    renderClock(frozen);
    notifyListeners(frozen);
  } else {
    if (!ACS_TIME.tick) startSimulation();
  }
}

setInterval(heartbeat, 1000);

/* ============================================================
   === INITIALIZATION ===========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const { state, realStart } = loadEngineState();

  if (state === "ON") {
    startSimulation();
  } else {
    const frozen = new Date(localStorage.getItem(KEY_SIM_TIME) || SIM_START);
    ACS_TIME.simTime = frozen;
    renderClock(frozen);
    notifyListeners(frozen);
  }
});

/* ============================================================
   === UI CLOCK AUTO-ATTACHER ===================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const t = ACS_TIME.simTime;
  renderClock(t);

  registerTimeListener(renderClock);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderClock(ACS_TIME.simTime);
  });
});

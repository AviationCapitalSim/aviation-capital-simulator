/* ============================================================
   === AVIATION CAPITAL SIMULATOR - TIME ENGINE v6.1 FINAL ====
   ------------------------------------------------------------
   ▪ OFF freezes absolutely everything (A-mode confirmed)
   ▪ ON resumes from exact frozen moment
   ▪ No resets, no drift, no desync
   ▪ One single clock value: acs_sim_time
   ▪ Safari + iOS + Chrome + Firefox compatible
   ▪ No HTML edits required
   ============================================================ */

/* ============================================================
   === CONSTANTS ===============================================
   ============================================================ */

const SIM_START = new Date(Date.UTC(1940, 0, 1, 0, 0, 0));

const KEY_SIM_TIME = "acs_sim_time";
const KEY_SIM_STATE = "acs_sim_state";  // "ON" | "OFF"
const KEY_REAL_START = "acs_real_start";

/* ============================================================
   === GLOBAL ENGINE OBJECT ====================================
   ============================================================ */

const ACS_TIME = {
  simTime: SIM_START,
  tick: null,
  listeners: [],
};

/* ============================================================
   === READ ENGINE STATE =======================================
   ============================================================ */

function loadEngineState() {
  return {
    simTime: new Date(localStorage.getItem(KEY_SIM_TIME) || SIM_START),
    simState: localStorage.getItem(KEY_SIM_STATE) || "OFF",
    realStart: localStorage.getItem(KEY_REAL_START)
      ? new Date(localStorage.getItem(KEY_REAL_START))
      : null,
  };
}

/* ============================================================
   === SAVE SIM TIME ===========================================
   ============================================================ */

function saveSimTime(dateObj) {
  localStorage.setItem(KEY_SIM_TIME, dateObj.toISOString());
  ACS_TIME.simTime = dateObj;
}

/* ============================================================
   === RECONSTRUCT SIM TIME FROM REAL START ====================
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
  stopSimulation(); // avoid duplicates

  const state = loadEngineState();
  let { simTime, realStart } = state;

  // If no realStart exists (fresh ON after OFF), compute it
  if (!realStart) {
    const minutesFromStart = (simTime - SIM_START) / 60000;

    const newRealStart = new Date(
      Date.now() - minutesFromStart * 1000
    );

    // CRITICAL FIX — make sure simTime exists BEFORE ON
    localStorage.setItem(KEY_SIM_TIME, simTime.toISOString());

    localStorage.setItem(KEY_REAL_START, newRealStart.toISOString());
    realStart = newRealStart;
  }

  // Set state to ON
  localStorage.setItem(KEY_SIM_STATE, "ON");

  // Begin ticking
  ACS_TIME.tick = setInterval(() => {
    const realStartNow = new Date(localStorage.getItem(KEY_REAL_START));
    const newSim = reconstructSimTime(realStartNow);

    saveSimTime(newSim);
    renderClock(newSim);
    notifyListeners(newSim);

    if (newSim.getUTCFullYear() >= 2026) {
      endWorldCycle();
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
   === FREEZE SIMULATION (OFF) =================================
   ============================================================ */

function freezeSimulation() {
  stopSimulation();

  // Save frozen exact moment
  saveSimTime(ACS_TIME.simTime);

  // State OFF
  localStorage.setItem(KEY_SIM_STATE, "OFF");
  localStorage.removeItem(KEY_REAL_START);

  renderClock(ACS_TIME.simTime);
  notifyListeners(ACS_TIME.simTime);
}

/* ============================================================
   === ADMIN TOGGLE ============================================
   ============================================================ */

function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle simulation.");
    return;
  }

  const state = (localStorage.getItem(KEY_SIM_STATE) || "OFF");

  if (state === "ON") {
    freezeSimulation();
    alert("⏸ OFF — Time frozen.");
  } else {
    startSimulation();
    alert("▶️ ON — Simulation running.");
  }
}

/* ============================================================
   === WORLD END ===============================================
   ============================================================ */

function endWorldCycle() {
  freezeSimulation();
  alert("🕛 Simulation reached 2026 — End of world.");
  window.location.href = "ranking.html";
}

/* ============================================================
   === RESET SIMULATION ========================================
   ============================================================ */

function resetSimulationData() {
  stopSimulation();

  saveSimTime(SIM_START);
  localStorage.setItem(KEY_SIM_STATE, "OFF");
  localStorage.removeItem(KEY_REAL_START);

  renderClock(SIM_START);
  notifyListeners(SIM_START);

  alert("♻️ Reset to 1940.");
}

/* ============================================================
   === RENDER THE CLOCK ========================================
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
   === LISTENERS ===============================================
   ============================================================ */

function notifyListeners(t) {
  for (const cb of ACS_TIME.listeners) cb(t);
}

function registerTimeListener(cb) {
  if (typeof cb === "function") ACS_TIME.listeners.push(cb);
}

/* ============================================================
   === HEARTBEAT SYNC (GLOBAL) =================================
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
   === INITIALIZATION ==========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const { simState, simTime } = loadEngineState();

  if (simState === "ON") {
    startSimulation();
  } else {
    ACS_TIME.simTime = simTime;
    renderClock(simTime);
    notifyListeners(simTime);
  }
});

/* ============================================================
   === AUTO-ATTACH CLOCK UI ====================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  renderClock(ACS_TIME.simTime);

  registerTimeListener(renderClock);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderClock(ACS_TIME.simTime);
  });
});

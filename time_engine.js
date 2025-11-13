/* ============================================================
   === AVIATION CAPITAL SIMULATOR - TIME ENGINE v3.7-F ========
   ------------------------------------------------------------
   FINAL STABLE EDITION
   ▪ Global simTime stored in localStorage ("acs_sim_time")
   ▪ OFF freezes the world at exact minute
   ▪ ON resumes from that exact instant
   ▪ No resets when changing pages
   ▪ No "undefined" problems
   ▪ No HTML edits required
   ▪ Safari compatible (Heartbeat Sync)
   ============================================================ */

/* ===== CONSTANTS ===== */
const SIM_START_TIME = new Date(Date.UTC(1940, 0, 1, 0, 0, 0));
const KEY_SIM_TIME   = "acs_sim_time";
const KEY_STATE      = "acs_state";     // "ON" / "OFF"
const KEY_REAL_START = "acs_realstart"; // only used during ON

/* ===== GLOBAL ENGINE ===== */
const ACS_TIME = {
  currentTime: SIM_START_TIME,
  tick: null,
  listeners: []
};

/* ============================================================
   🔄 LOAD ENGINE STATE
   ============================================================ */
function loadState() {
  const saved = localStorage.getItem(KEY_SIM_TIME);
  ACS_TIME.currentTime = saved ? new Date(saved) : SIM_START_TIME;

  const state = localStorage.getItem(KEY_STATE) || "OFF";
  return state;
}

/* ============================================================
   🕒 REAL → SIM LOGIC
   ============================================================ */
function computeSimTime() {
  const realStart = localStorage.getItem(KEY_REAL_START);
  if (!realStart) return ACS_TIME.currentTime;

  const start = new Date(realStart);
  const now = new Date();

  const secPassed = Math.floor((now - start) / 1000);
  return new Date(SIM_START_TIME.getTime() + secPassed * 60000);
}

/* ============================================================
   ▶️ START SIMULATION (ON)
   ============================================================ */
function startSimulation() {
  stopSimulation(); // avoid duplicates

  // Compute realStart based on frozen time
  const frozen = new Date(localStorage.getItem(KEY_SIM_TIME) || SIM_START_TIME);
  const minutesFromStart = (frozen - SIM_START_TIME) / 60000;

  const newRealStart = new Date(Date.now() - minutesFromStart * 1000);
  localStorage.setItem(KEY_REAL_START, newRealStart.toISOString());
  localStorage.setItem(KEY_STATE, "ON");

  // Immediate sync
  ACS_TIME.currentTime = computeSimTime();
  saveSimTime(ACS_TIME.currentTime);
  renderClock(ACS_TIME.currentTime);
  notifyListeners(ACS_TIME.currentTime);

  // 1Hz global tick
  ACS_TIME.tick = setInterval(() => {
    const t = computeSimTime();

    ACS_TIME.currentTime = t;
    saveSimTime(t);
    renderClock(t);
    notifyListeners(t);

    if (t.getUTCFullYear() >= 2026) {
      endWorldCycle();
    }
  }, 1000);
}

/* ============================================================
   ⏸ FREEZE SIMULATION (OFF)
   ============================================================ */
function freezeSimulation() {
  stopSimulation();

  // Save exact frozen instant
  saveSimTime(ACS_TIME.currentTime);

  localStorage.setItem(KEY_STATE, "OFF");
  localStorage.removeItem(KEY_REAL_START);

  renderClock(ACS_TIME.currentTime);
  notifyListeners(ACS_TIME.currentTime);
}

/* ============================================================
   ⛔ STOP TICKER
   ============================================================ */
function stopSimulation() {
  if (ACS_TIME.tick) clearInterval(ACS_TIME.tick);
  ACS_TIME.tick = null;
}

/* ============================================================
   🔘 ADMIN TOGGLE ================================
   ============================================================ */
function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle simulation.");
    return;
  }

  const state = localStorage.getItem(KEY_STATE) || "OFF";

  if (state === "ON") {
    freezeSimulation();
    alert("⏸ OFF — Simulation frozen.");
  } else {
    startSimulation();
    alert("▶️ ON — Simulation running.");
  }
}

/* ============================================================
   🏁 END OF WORLD
   ============================================================ */
function endWorldCycle() {
  freezeSimulation();
  alert("🕛 Simulation reached 2026.");
  window.location.href = "ranking.html";
}

/* ============================================================
   ♻️ RESET WORLD
   ============================================================ */
function resetSimulationData() {
  stopSimulation();

  localStorage.setItem(KEY_SIM_TIME, SIM_START_TIME.toISOString());
  localStorage.setItem(KEY_STATE, "OFF");
  localStorage.removeItem(KEY_REAL_START);

  ACS_TIME.currentTime = SIM_START_TIME;
  renderClock(SIM_START_TIME);
  notifyListeners(SIM_START_TIME);

  alert("♻️ Reset to 1940.");
}

/* ============================================================
   💾 SAVE SIM TIME
   ============================================================ */
function saveSimTime(t) {
  localStorage.setItem(KEY_SIM_TIME, t.toISOString());
}

/* ============================================================
   🕹 CLOCK RENDERER
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
   🔔 LISTENERS
   ============================================================ */
function registerTimeListener(cb) {
  if (typeof cb === "function") ACS_TIME.listeners.push(cb);
}

function notifyListeners(t) {
  for (const cb of ACS_TIME.listeners) cb(t);
}

/* ============================================================
   ❤️ SAFARI HEARTBEAT SYNC
   ============================================================ */
function heartbeat() {
  const state = localStorage.getItem(KEY_STATE) || "OFF";
  const saved = new Date(localStorage.getItem(KEY_SIM_TIME) || SIM_START_TIME);

  if (state === "OFF") {
    stopSimulation();
    ACS_TIME.currentTime = saved;
    renderClock(saved);
    notifyListeners(saved);
  } else {
    if (!ACS_TIME.tick) startSimulation();
  }
}

setInterval(heartbeat, 1000);

/* ============================================================
   🚀 INITIAL LOAD
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const state = loadState();

  if (state === "ON") {
    startSimulation();
  } else {
    renderClock(ACS_TIME.currentTime);
    notifyListeners(ACS_TIME.currentTime);
  }
});

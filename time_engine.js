/* ============================================================
   === AVIATION CAPITAL SIMULATOR - TIME ENGINE v7-COMPAT ======
   ------------------------------------------------------------
   FINAL STABLE EDITION + FULL HTML COMPATIBILITY
   ▪ Keeps all old HTML clocks working (updateClockDisplay)
   ▪ No resets when switching pages
   ▪ OFF freezes exact time, ON resumes perfectly
   ▪ Safari/iOS/Chrome/Firefox compatible
   ▪ No HTML edits required
   ============================================================ */

/* ===== CONSTANTS ===== */
const SIM_START = new Date(Date.UTC(1940, 0, 1, 0, 0, 0));
const KEY_SIM_TIME   = "acs_sim_time";
const KEY_STATE      = "acs_state";      // "ON" / "OFF"
const KEY_REAL_START = "acs_realstart";  // real timestamp for ON mode

/* ===== GLOBAL ENGINE ===== */
const ACS_TIME = {
  currentTime: SIM_START,
  tick: null,
  listeners: []
};

/* ============================================================
   LOAD ENGINE STATE
   ============================================================ */
function loadState() {
  const saved = localStorage.getItem(KEY_SIM_TIME);
  ACS_TIME.currentTime = saved ? new Date(saved) : SIM_START;

  return localStorage.getItem(KEY_STATE) || "OFF";
}

/* ============================================================
   REAL → SIMULATION TIME
   ============================================================ */
function computeSimTime() {
  const realStartStr = localStorage.getItem(KEY_REAL_START);
  if (!realStartStr) return ACS_TIME.currentTime;

  const realStart = new Date(realStartStr);
  const now = new Date();

  const secPassed = Math.floor((now - realStart) / 1000);
  return new Date(SIM_START.getTime() + secPassed * 60000);
}

/* ============================================================
   START (ON)
   ============================================================ */
function startSimulation() {
  stopSimulation(); // avoid duplicates

  const frozen = new Date(localStorage.getItem(KEY_SIM_TIME) || SIM_START);
  const minutesFromStart = (frozen - SIM_START) / 60000;

  const newRealStart = new Date(Date.now() - minutesFromStart * 1000);

  localStorage.setItem(KEY_REAL_START, newRealStart.toISOString());
  localStorage.setItem(KEY_STATE, "ON");

  ACS_TIME.currentTime = computeSimTime();
  saveSimTime(ACS_TIME.currentTime);
  renderClock(ACS_TIME.currentTime);
  notifyListeners(ACS_TIME.currentTime);

  ACS_TIME.tick = setInterval(() => {
    const realStart = new Date(localStorage.getItem(KEY_REAL_START));
    const t = computeSimTime(realStart);

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
   STOP TICK
   ============================================================ */
function stopSimulation() {
  if (ACS_TIME.tick) clearInterval(ACS_TIME.tick);
  ACS_TIME.tick = null;
}

/* ============================================================
   FREEZE (OFF)
   ============================================================ */
function freezeSimulation() {
  stopSimulation();

  saveSimTime(ACS_TIME.currentTime);

  localStorage.setItem(KEY_STATE, "OFF");
  localStorage.removeItem(KEY_REAL_START);

  renderClock(ACS_TIME.currentTime);
  notifyListeners(ACS_TIME.currentTime);
}

/* ============================================================
   ADMIN TOGGLE ON/OFF
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
   END OF WORLD
   ============================================================ */
function endWorldCycle() {
  freezeSimulation();
  alert("🕛 Simulation reached 2026.");
  window.location.href = "ranking.html";
}

/* ============================================================
   RESET
   ============================================================ */
function resetSimulationData() {
  stopSimulation();

  localStorage.setItem(KEY_SIM_TIME, SIM_START.toISOString());
  localStorage.setItem(KEY_STATE, "OFF");
  localStorage.removeItem(KEY_REAL_START);

  ACS_TIME.currentTime = SIM_START;
  renderClock(SIM_START);
  notifyListeners(SIM_START);

  alert("♻️ Reset to 1940.");
}

/* ============================================================
   SAVE TIME
   ============================================================ */
function saveSimTime(t) {
  localStorage.setItem(KEY_SIM_TIME, t.toISOString());
}

/* ============================================================
   CLOCK RENDERER
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
   LISTENERS
   ============================================================ */
function registerTimeListener(cb) {
  if (typeof cb === "function") ACS_TIME.listeners.push(cb);
}

function notifyListeners(t) {
  for (const cb of ACS_TIME.listeners) cb(t);
}

/* ============================================================
   SAFARI HEARTBEAT SYNC (global)
   ============================================================ */
function heartbeat() {
  const state = localStorage.getItem(KEY_STATE) || "OFF";
  const frozen = new Date(localStorage.getItem(KEY_SIM_TIME) || SIM_START);

  if (state === "OFF") {
    stopSimulation();
    ACS_TIME.currentTime = frozen;
    renderClock(frozen);
    notifyListeners(frozen);
  } else {
    if (!ACS_TIME.tick) startSimulation();
  }
}

setInterval(heartbeat, 1000);

/* ============================================================
   INITIAL LOAD
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

/* ============================================================
   COMPATIBILITY LAYER (NO HTML EDITS REQUIRED)
   ============================================================ */

/*
   Old HTML files call:

      updateClockDisplay()
      registerTimeListener(updateClockDisplay)

   This shim keeps everything running normally.
*/
function updateClockDisplay(t = ACS_TIME.currentTime) {
  try {
    renderClock(t);
  } catch (err) {
    console.warn("CompatClock: updateClockDisplay fallback", err);
  }
}

registerTimeListener(updateClockDisplay);

document.addEventListener("DOMContentLoaded", () => {
  updateClockDisplay(ACS_TIME.currentTime);
});

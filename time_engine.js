/* ============================================================
   === AVIATION CAPITAL SIMULATOR - TIME ENGINE v5.0 FINAL ====
   ------------------------------------------------------------
   ▪ Universal UTC Matrix Clock (same time for all players)
   ▪ 1 real second = 1 simulated minute
   ▪ OFF freezes perfectly across ALL pages
   ▪ ON resumes EXACTLY where it left off
   ▪ No resets, no drifting, no desync
   ▪ Includes Safari/macOS/iOS storage event FIX
   ▪ ZERO HTML changes required
   ============================================================ */

/* === GLOBAL TIME OBJECT === */
const ACS_TIME = {
  startYear: 1940,
  endYear: 2026,
  currentTime: new Date("1940-01-01T00:00:00Z"),
  tickInterval: null,
  listeners: [],
};

/* === LOAD OR INIT CYCLE === */
let ACS_CYCLE = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}") || {
  startYear: 1940,
  endYear: 2026,
  realStartDate: null,
  status: "OFF",
};

/* ============================================================
   === UTC MATRIX CLOCK (REAL → SIM) ===========================
   ============================================================ */

function computeSimTime() {
  if (ACS_CYCLE.status !== "ON") return ACS_TIME.currentTime;

  const now = new Date();
  const realStart = new Date(ACS_CYCLE.realStartDate);
  const secPassed = Math.floor((now - realStart) / 1000);

  return new Date(Date.UTC(1940, 0, 1, 0, secPassed));
}

/* ============================================================
   === START ENGINE (ON) =======================================
   ============================================================ */

function startACSTime() {
  stopACSTime(); // avoid duplicates

  if (!ACS_CYCLE.realStartDate) {
    ACS_CYCLE.realStartDate = new Date().toISOString();
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
  }

  ACS_TIME.currentTime = computeSimTime();
  updateClockDisplay();
  notifyTimeListeners();

  ACS_TIME.tickInterval = setInterval(() => {
    ACS_TIME.currentTime = computeSimTime();
    updateClockDisplay();
    notifyTimeListeners();

    if (ACS_TIME.currentTime.getUTCFullYear() >= ACS_TIME.endYear) {
      endWorldCycle();
    }
  }, 1000);
}

/* ============================================================
   === STOP ENGINE (OFF) =======================================
   ============================================================ */

function stopACSTime() {
  if (ACS_TIME.tickInterval) clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* ============================================================
   === TOGGLE SIM STATE (ADMIN ONLY) ===========================
   ============================================================ */

function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle the simulation state.");
    return;
  }

  if (ACS_CYCLE.status === "ON") {
    /* ===== OFF (FREEZE) ===== */
    ACS_TIME.currentTime = computeSimTime();
    const frozenStr = ACS_TIME.currentTime.toISOString();

    // SAVE FROZEN TIME INTO ALL SAFE KEYS (Safari FIX)
    localStorage.setItem("acs_frozen_time", frozenStr);
    localStorage.setItem("acs_frozen_time_backup", frozenStr);
    localStorage.setItem("acs_current_time", frozenStr);

    ACS_CYCLE.status = "OFF";
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

    stopACSTime();
    updateClockDisplay();
    notifyTimeListeners();
  }

  else {
    /* ===== ON (RESUME FROM FROZEN) ===== */
    const now = new Date();

    // LOAD FROZEN TIME FROM THE SAFEST POSSIBLE SOURCE
    let frozen =
      localStorage.getItem("acs_frozen_time") ||
      localStorage.getItem("acs_current_time") ||
      localStorage.getItem("acs_frozen_time_backup") ||
      "1940-01-01T00:00:00Z";

    frozen = new Date(frozen);

    const minutesFromStart =
      (frozen - new Date(Date.UTC(1940, 0, 1))) / 60000;

    ACS_CYCLE.realStartDate = new Date(
      now - minutesFromStart * 1000
    ).toISOString();

    ACS_CYCLE.status = "ON";
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

    startACSTime();
  }

  // Update status on the page
  const simStatus = document.getElementById("simStatus");
  if (simStatus) simStatus.textContent = ACS_CYCLE.status;

  updateClockDisplay();
}

/* ============================================================
   === RESET SIMULATION ========================================
   ============================================================ */

function resetSimulationData() {
  const users = localStorage.getItem("ACS_users");
  localStorage.clear();

  if (users) localStorage.setItem("ACS_users", users);

  ACS_CYCLE = {
    startYear: 1940,
    endYear: 2026,
    realStartDate: null,
    status: "OFF",
  };

  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  ACS_TIME.currentTime = new Date("1940-01-01T00:00:00Z");

  const frozenStr = ACS_TIME.currentTime.toISOString();

  localStorage.setItem("acs_frozen_time", frozenStr);
  localStorage.setItem("acs_current_time", frozenStr);
  localStorage.setItem("acs_frozen_time_backup", frozenStr);

  stopACSTime();
  updateClockDisplay();
  notifyTimeListeners();
}

/* ============================================================
   === CLOCK DISPLAY ===========================================
   ============================================================ */

function updateClockDisplay() {
  const el = document.getElementById("acs-clock");
  if (!el) return;

  const t = ACS_TIME.currentTime;

  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  const mon = t.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const yy = t.getUTCFullYear();

  el.textContent = `${hh}:${mm} — ${dd} ${mon} ${yy}`;
  el.style.color = "#00ff80";
}

/* ============================================================
   === LISTENERS ===============================================
   ============================================================ */

function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) cb(ACS_TIME.currentTime);
}

function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* ============================================================
   === ECONOMIC WATCHER ========================================
   ============================================================ */

function updateEconomicVariables(year) {
  let ticketFee = 0.06;
  let fuelUSD = 3.2;

  if (year < 1960) { ticketFee = 0.12; fuelUSD = 1.1; }
  else if (year < 1980) { ticketFee = 0.09; fuelUSD = 1.9; }
  else if (year < 2000) { ticketFee = 0.07; fuelUSD = 2.5; }
  else if (year < 2020) { ticketFee = 0.05; fuelUSD = 4.3; }
  else { ticketFee = 0.04; fuelUSD = 5.8; }

  localStorage.setItem("acs_ticket_fee", ticketFee);
  localStorage.setItem("acs_fuel_price", fuelUSD);
}

function economicWatcher() {
  let lastHour = null;
  registerTimeListener((t) => {
    const hour = t.getUTCHours();
    if (hour !== lastHour) {
      lastHour = hour;
      updateEconomicVariables(t.getUTCFullYear());
    }
  });
}

/* ============================================================
   === HEARTBEAT (SAFARI FIX) ==================================
   ============================================================ */

function heartbeatSync() {
  const savedCycle = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}");

  // Load frozen from safest source (OFF)
  let frozen =
    localStorage.getItem("acs_frozen_time") ||
    localStorage.getItem("acs_current_time") ||
    localStorage.getItem("acs_frozen_time_backup");

  /* ===== OFF (FREEZE) ===== */
  if (savedCycle.status === "OFF") {
    stopACSTime();
    if (frozen) ACS_TIME.currentTime = new Date(frozen);
    updateClockDisplay();
    notifyTimeListeners();
    return;
  }

  /* ===== ON ===== */
  if (savedCycle.status === "ON" && !ACS_TIME.tickInterval) {
    ACS_CYCLE = savedCycle;
    startACSTime();
  }
}

setInterval(heartbeatSync, 1000);

/* ============================================================
   === INITIALIZATION ==========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const cycle = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}");
  ACS_CYCLE = cycle.status ? cycle : ACS_CYCLE;

  if (ACS_CYCLE.status === "ON") {
    ACS_TIME.currentTime = computeSimTime();
    startACSTime();
  } else {
    // Load frozen time SAFELY (3-level fallback)
    let frozen =
      localStorage.getItem("acs_frozen_time") ||
      localStorage.getItem("acs_current_time") ||
      localStorage.getItem("acs_frozen_time_backup") ||
      "1940-01-01T00:00:00Z";

    ACS_TIME.currentTime = new Date(frozen);
    stopACSTime();
    updateClockDisplay();
  }

  economicWatcher();
});

/* ============================================================
   === GLOBAL CLOCK ATTACHER — NO HTML EDITS NEEDED ============
   ============================================================ */

function applyClockToAllPages() {
  const el = document.getElementById("acs-clock");
  if (!el) return;

  function renderClock(t) {
    const hh = String(t.getUTCHours()).padStart(2, "0");
    const mm = String(t.getUTCMinutes()).padStart(2, "0");
    const dd = String(t.getUTCDate()).padStart(2, "0");
    const mon = t.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const yy = t.getUTCFullYear();
    el.textContent = `${hh}:${mm} — ${dd} ${mon} ${yy}`;
  }

  renderClock(ACS_TIME.currentTime);

  registerTimeListener(renderClock);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderClock(ACS_TIME.currentTime);
  });
}

document.addEventListener("DOMContentLoaded", applyClockToAllPages);

/* ============================================================
   === AVIATION CAPITAL SIMULATOR - TIME ENGINE v4.5 (Safari) ==
   ------------------------------------------------------------
   ▪ Heartbeat Sync: 100% reliable ON/OFF/RESET in all browsers
   ▪ Safari-proof handling of OFF freeze and ON resume
   ▪ All pages stay perfectly synchronized
   ▪ No HTML changes needed
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
let ACS_CYCLE = JSON.parse(localStorage.getItem("ACS_Cycle")) || {
  startYear: 1940,
  endYear: 2026,
  realStartDate: null,
  status: "OFF",
};

/* ============================================================
   === MATRIX CLOCK (UTC) =====================================
   ============================================================ */

function computeSimTime() {
  if (ACS_CYCLE.status !== "ON") return ACS_TIME.currentTime;

  const now = new Date();
  const realStart = new Date(ACS_CYCLE.realStartDate);
  const secPassed = Math.floor((now - realStart) / 1000);
  return new Date(Date.UTC(1940, 0, 1, 0, secPassed));
}

/* ============================================================
   === ENGINE START ============================================
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
   === ENGINE PAUSE ============================================
   ============================================================ */

function stopACSTime() {
  if (ACS_TIME.tickInterval) clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* ============================================================
   === ADMIN TOGGLE ON/OFF (FINAL) =============================
   ============================================================ */

function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle the simulation.");
    return;
  }

  if (ACS_CYCLE.status === "ON") {
    /* ===== OFF (freeze) ===== */
    ACS_TIME.currentTime = computeSimTime();

    // Safari-safe freeze save BEFORE changing status
    const frozenStr = ACS_TIME.currentTime.toISOString();
    localStorage.setItem("acs_frozen_time", frozenStr);
    localStorage.setItem("acs_frozen_time_backup", frozenStr);

    ACS_CYCLE.status = "OFF";
    alert("⏸️ Simulation frozen.");

    stopACSTime();

  } else {
    /* ===== ON (resume from freeze) ===== */
    const now = new Date();

    let frozenStr =
      localStorage.getItem("acs_frozen_time") ||
      localStorage.getItem("acs_frozen_time_backup");

    const frozen = new Date(frozenStr || "1940-01-01T00:00:00Z");

    const minutesFromStart =
      (frozen - new Date(Date.UTC(1940, 0, 1))) / 60000;

    ACS_CYCLE.realStartDate = new Date(
      now - minutesFromStart * 1000
    ).toISOString();

    ACS_CYCLE.status = "ON";

    alert("▶️ Simulation resumed.");

    startACSTime();
  }

  // Write cycle EXACTLY once (important!)
  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  updateClockDisplay();

  const simStatus = document.getElementById("simStatus");
  if (simStatus) simStatus.textContent = ACS_CYCLE.status.toUpperCase();
}

/* ============================================================
   === RESET ===================================================
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
  localStorage.setItem("acs_frozen_time", ACS_TIME.currentTime.toISOString());
  localStorage.setItem("acs_frozen_time_backup", ACS_TIME.currentTime.toISOString());

  // Broadcast reset
  localStorage.setItem("acs_reset", Date.now());

  stopACSTime();
  updateClockDisplay();
  notifyTimeListeners();

  alert("♻️ ACS world reset to 1940.");
}

/* ============================================================
   === CLOCK DISPLAY ===========================================
   ============================================================ */

function updateClockDisplay() {
  const el = document.getElementById("acs-clock");
  if (!el) return;

  const t = ACS_TIME.currentTime;

  el.textContent =
    `${String(t.getUTCHours()).padStart(2, "0")}:` +
    `${String(t.getUTCMinutes()).padStart(2, "0")} — ` +
    `${String(t.getUTCDate()).padStart(2, "0")} ` +
    `${t.toLocaleString("en-US", { month: "short" }).toUpperCase()} ` +
    `${t.getUTCFullYear()}`;

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
   === HEARTBEAT SYNC (FINAL SAFARI FIX) =======================
   ============================================================ */

function heartbeatSync() {
  const savedCycle = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}");

  let savedFrozen =
    localStorage.getItem("acs_frozen_time") ||
    localStorage.getItem("acs_frozen_time_backup");

  /* ===== RESET SYNC ===== */
  if (localStorage.getItem("acs_reset")) {
    ACS_TIME.currentTime = new Date("1940-01-01T00:00:00Z");
    updateClockDisplay();
    notifyTimeListeners();
    return;
  }

  /* ===== ON/OFF SYNC ===== */
  if (savedCycle.status !== ACS_CYCLE.status) {
    ACS_CYCLE = savedCycle;

    if (ACS_CYCLE.status === "ON") {
      startACSTime();
    } else {
      stopACSTime();
      if (savedFrozen) ACS_TIME.currentTime = new Date(savedFrozen);
      updateClockDisplay();
      notifyTimeListeners();
    }
  }
}

/* Runs every second */
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
    const frozen =
      localStorage.getItem("acs_frozen_time") ||
      localStorage.getItem("acs_frozen_time_backup");

    ACS_TIME.currentTime = frozen
      ? new Date(frozen)
      : new Date("1940-01-01T00:00:00Z");

    stopACSTime();
    updateClockDisplay();
  }

  economicWatcher();
});

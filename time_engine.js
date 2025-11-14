/* ============================================================
   === AVIATION CAPITAL SIMULATOR - GLOBAL TIME ENGINE v4.3 ===
   ------------------------------------------------------------
   ▪ Global Matrix UTC Clock (1940 → 2026)
   ▪ 1 real second = 1 in-game minute
   ▪ OFF freezes time perfectly
   ▪ ON resumes without resetting
   ▪ RESET broadcasts to ALL tabs instantly
   ▪ All pages remain 100% synchronized
   ▪ ZERO changes required in any HTML
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
   === MATRIX CLOCK — REAL SECOND → SIM MINUTE ===============
   ============================================================ */

function computeSimTime() {
  if (ACS_CYCLE.status !== "ON") return ACS_TIME.currentTime;

  const now = new Date();
  const realStart = new Date(ACS_CYCLE.realStartDate);
  const secPassed = Math.floor((now - realStart) / 1000);
  const simMinutes = secPassed;

  return new Date(Date.UTC(1940, 0, 1, 0, simMinutes));
}

/* ============================================================
   === START SIMULATION =======================================
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
   === PAUSE SIMULATION =======================================
   ============================================================ */

function stopACSTime() {
  if (ACS_TIME.tickInterval) clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* ============================================================
   === TOGGLE SIMULATION (ADMIN ONLY) =========================
   ============================================================ */

function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle the simulation state.");
    return;
  }

  if (ACS_CYCLE.status === "ON") {
    /* ====== GOING TO OFF — TRUE FREEZE MODE ====== */
    ACS_TIME.currentTime = computeSimTime();
    localStorage.setItem("acs_frozen_time", ACS_TIME.currentTime.toISOString());

    ACS_CYCLE.status = "OFF";
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

    stopACSTime();
    updateClockDisplay();
    notifyTimeListeners();

    alert("⏸️ Simulation paused — Time frozen.");
  } else {
    /* ====== GOING TO ON — RESUME EXACT POINT ====== */
    const now = new Date();
    const frozen = new Date(localStorage.getItem("acs_frozen_time"));

    const minutesFromStart =
      (frozen - new Date(Date.UTC(1940, 0, 1))) / 60000;

    const newRealStart = new Date(now - minutesFromStart * 1000);
    ACS_CYCLE.realStartDate = newRealStart.toISOString();
    ACS_CYCLE.status = "ON";

    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

    // MUST start immediately (fix for settings page freeze)
    startACSTime();

    alert("▶️ Simulation resumed — Timeline continues.");
  }

  const simStatus = document.getElementById("simStatus");
  if (simStatus) simStatus.textContent = ACS_CYCLE.status.toUpperCase();
}

/* ============================================================
   === RESET COMPLETE SIMULATION ==============================
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

  // Broadcast the reset globally (critical fix)
  localStorage.setItem("acs_reset", Date.now());

  stopACSTime();
  updateClockDisplay();
  notifyTimeListeners();

  alert("♻️ ACS world reset to 1940 — Simulation OFF.");
}

/* ============================================================
   === UPDATE COCKPIT CLOCK ===================================
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
   === LISTENER SYSTEM =========================================
   ============================================================ */

function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) cb(ACS_TIME.currentTime);
}

function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* ============================================================
   === ECONOMIC WATCHER =======================================
   ============================================================ */

function updateEconomicVariables(year) {
  let ticketFee = 0.06;
  let fuelUSD = 3.2;

  if (year < 1960) { ticketFee = 0.12; fuelUSD = 1.1; }
  else if (year < 1980) { ticketFee = 0.09; fuelUSD = 1.9; }
  else if (year < 2000) { ticketFee = 0.07; fuelUSD = 2.5; }
  else if (year < 2020) { ticketFee = 0.05; fuelUSD = 4.3; }
  else { ticketFee = 0.04; fuelUSD = 5.8; }

  if (typeof WorldAirportsACS !== "undefined") {
    for (const continent in WorldAirportsACS) {
      WorldAirportsACS[continent].forEach(a => {
        a.ticket_fee_percent = ticketFee;
        a.fuel_usd_gal = fuelUSD;
      });
    }
  }

  localStorage.setItem("acs_ticket_fee", ticketFee);
  localStorage.setItem("acs_fuel_price", fuelUSD);
}

function economicWatcher() {
  let lastHour = null;
  registerTimeListener((time) => {
    const hour = time.getUTCHours();
    if (hour !== lastHour) {
      lastHour = hour;
      updateEconomicVariables(time.getUTCFullYear());
    }
  });
}

/* ============================================================
   === INITIALIZATION (RUNS ON EVERY PAGE) ====================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const cycle = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}");
  ACS_CYCLE = cycle.status ? cycle : ACS_CYCLE;

  if (ACS_CYCLE.status === "ON") {
    ACS_TIME.currentTime = computeSimTime();
    startACSTime();
  } else {
    const frozen = localStorage.getItem("acs_frozen_time");
    ACS_TIME.currentTime = frozen
      ? new Date(frozen)
      : new Date("1940-01-01T00:00:00Z");

    stopACSTime();
    updateClockDisplay();
  }

  economicWatcher();
});

/* ============================================================
   === GLOBAL TAB SYNC (RESET, ON, OFF) ========================
   ============================================================ */

window.addEventListener("storage", (e) => {

  /* 🔄 Cycle changed (ON / OFF) */
  if (e.key === "ACS_Cycle") {
    const updated = JSON.parse(e.newValue || "{}");
    if (!updated || !updated.status) return;

    ACS_CYCLE = updated;

    if (ACS_CYCLE.status === "ON") {
      startACSTime();
    } else {
      stopACSTime();

      const frozen = localStorage.getItem("acs_frozen_time");
      if (frozen) ACS_TIME.currentTime = new Date(frozen);

      updateClockDisplay();
      notifyTimeListeners();
    }
  }

  /* 🔄 Reset broadcast */
  if (e.key === "acs_reset") {
    ACS_TIME.currentTime = new Date("1940-01-01T00:00:00Z");
    localStorage.setItem("acs_frozen_time", ACS_TIME.currentTime.toISOString());

    stopACSTime();
    updateClockDisplay();
    notifyTimeListeners();
  }
});

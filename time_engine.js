/* ============================================================
   === AVIATION CAPITAL SIMULATOR - HISTORICAL TIME ENGINE ===
   Version: 3.7 (Global Real-Time Matrix + Stable Freeze Mode)
   Date: 2025-11-13
   Author: Aviation Capital Systems
   ------------------------------------------------------------
   ▪ 1 real second = 1 in-game minute
   ▪ Global synchronized simulation (1940 → 2026)
   ▪ Simulation never pauses while ON (even if all players disconnect)
   ▪ OFF freezes time reliably across all pages
   ▪ No HTML edits required
   ▪ UTC Matrix Clock: universal, identical for all players
   ============================================================ */

/* === 🌍 GLOBAL TIME OBJECT === */
const ACS_TIME = {
  startYear: 1940,
  endYear: 2026,
  currentTime: new Date("1940-01-01T00:00:00Z"),
  tickInterval: null,
  listeners: [],
};

/* === 🧭 Load or initialize cycle configuration === */
let ACS_CYCLE = JSON.parse(localStorage.getItem("ACS_Cycle")) || {
  startYear: 1940,
  endYear: 2026,
  realStartDate: null,
  status: "OFF",
};

/* ============================================================
   === 🕒 REAL-TIME → SIM-TIME (UTC MATRIX) ====================
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
   === ▶️ Start accelerated simulation ========================
   ============================================================ */

function startACSTime() {
  stopACSTime(); // avoid duplicates

  // Ensure start reference exists
  if (!ACS_CYCLE.realStartDate) {
    ACS_CYCLE.realStartDate = new Date().toISOString();
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
  }

  ACS_TIME.currentTime = computeSimTime();
  updateClockDisplay();
  notifyTimeListeners();

  // Tick every second just to refresh visual clock
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
   === ⏸ Pause simulation (Freeze Mode) =======================
   ============================================================ */

function stopACSTime() {
  if (ACS_TIME.tickInterval) clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* ============================================================
   === 🚦 Toggle simulation (Admin Only) ========================
   ============================================================ */

function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle the simulation state.");
    return;
  }

  if (ACS_CYCLE.status === "ON") {
    // ======== GOING TO OFF (FREEZE MODE) =========
    ACS_TIME.currentTime = computeSimTime();
    localStorage.setItem("acs_frozen_time", ACS_TIME.currentTime.toISOString());

    ACS_CYCLE.status = "OFF";
    alert("⏸️ Simulation paused — Time frozen.");

    stopACSTime();
  } else {
    // ======== GOING TO ON (RESUME FROM FREEZE) =========
    ACS_CYCLE.status = "ON";

    const now = new Date();
    const frozen = new Date(localStorage.getItem("acs_frozen_time") || ACS_TIME.currentTime);

    const minutesFromStart =
      (frozen - new Date(Date.UTC(1940, 0, 1))) / 60000;

    const newRealStart = new Date(now - minutesFromStart * 1000);
    ACS_CYCLE.realStartDate = newRealStart.toISOString();

    alert("▶️ Simulation resumed — Timeline continues.");

    startACSTime();
  }

  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  const simStatus = document.getElementById("simStatus");
  if (simStatus) simStatus.textContent = ACS_CYCLE.status.toUpperCase();

  updateClockDisplay();
}

/* ============================================================
   === 🏁 End of cycle =========================================
   ============================================================ */

function endWorldCycle() {
  stopACSTime();
  ACS_CYCLE.status = "COMPLETED";
  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  alert("🕛 Simulation complete — Year 2026 reached.");
  resetSimulationData();
  window.location.href = "ranking.html";
}

/* ============================================================
   === ♻️ Reset simulation =====================================
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

  stopACSTime();
  updateClockDisplay();

  alert("♻️ ACS world reset to 1940. Simulation is OFF.");
}

/* ============================================================
   === 🛫 Cockpit UTC Clock ====================================
   ============================================================ */

function updateClockDisplay() {
  const el = document.getElementById("acs-clock");
  if (!el) return;

  const t = ACS_TIME.currentTime;

  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  const month = t.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const yy = t.getUTCFullYear();

  el.textContent = `${hh}:${mm} — ${dd} ${month} ${yy}`;
  el.style.color = "#00ff80";
}

/* ============================================================
   === 📡 Listeners for modules ================================
   ============================================================ */

function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) cb(ACS_TIME.currentTime);
}

function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* ============================================================
   === 💹 Dynamic Economy =======================================
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
    for (const cont in WorldAirportsACS) {
      WorldAirportsACS[cont].forEach(a => {
        a.ticket_fee_percent = ticketFee;
        a.fuel_usd_gal = fuelUSD;
      });
    }
  }

  localStorage.setItem("acs_ticket_fee", ticketFee);
  localStorage.setItem("acs_fuel_price", fuelUSD);
}

/* ============================================================
   === 📈 Economic Watcher =====================================
   ============================================================ */

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
   === 🚀 Initialization (Runs on every page) ==================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Load frozen or live time depending on state
  const cycle = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}");
  ACS_CYCLE = cycle.status ? cycle : ACS_CYCLE;

  if (ACS_CYCLE.status === "ON") {
    // When ON → compute current time from matrix
    ACS_TIME.currentTime = computeSimTime();
    startACSTime();
  } else {
    // When OFF → load the last frozen time
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
   === 🔄 Cross-tab Sync (Dashboard, Finance, Settings, etc.) ===
   ============================================================ */

window.addEventListener("storage", (e) => {
  if (e.key === "ACS_Cycle") {
    const updated = JSON.parse(e.newValue || "{}");
    if (!updated || !updated.status) return;

    ACS_CYCLE = updated;

    if (ACS_CYCLE.status === "ON") {
      startACSTime();
    } else {
      stopACSTime();

      // Sync frozen time across tabs
      const frozen = localStorage.getItem("acs_frozen_time");
      if (frozen) ACS_TIME.currentTime = new Date(frozen);

      updateClockDisplay();
    }
  }
});

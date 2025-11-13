/* ============================================================
   === AVIATION CAPITAL SIMULATOR - GLOBAL TIME ENGINE v3.8 ===
   ------------------------------------------------------------
   ▪ Universal UTC Matrix Clock
   ▪ Perfect cross-page synchronization
   ▪ One single time source: acs_universal_time
   ▪ OFF = freeze (same time across all pages)
   ▪ ON = real-time progression 24/7 globally
   ▪ Zero HTML changes needed
   ============================================================ */

/* === 🌍 GLOBAL TIME OBJECT === */
const ACS_TIME = {
  startYear: 1940,
  endYear: 2026,
  currentTime: new Date("1940-01-01T00:00:00Z"),
  tickInterval: null,
  listeners: [],
};

/* === 🧭 CYCLE CONFIGURATION === */
let ACS_CYCLE = JSON.parse(localStorage.getItem("ACS_Cycle")) || {
  startYear: 1940,
  endYear: 2026,
  realStartDate: null,
  status: "OFF",
};

/* ============================================================
   === 🧠 MATRIX TIME CALCULATOR ===============================
   ============================================================ */

function computeSimTime() {
  if (ACS_CYCLE.status !== "ON") {
    return ACS_TIME.currentTime;
  }

  const now = new Date();
  const realStart = new Date(ACS_CYCLE.realStartDate);

  const secPassed = Math.floor((now - realStart) / 1000);
  const simMinutes = secPassed;

  return new Date(Date.UTC(1940, 0, 1, 0, simMinutes));
}

/* ============================================================
   === ▶️ START SIMULATION =====================================
   ============================================================ */

function startACSTime() {
  stopACSTime();

  if (!ACS_CYCLE.realStartDate) {
    ACS_CYCLE.realStartDate = new Date().toISOString();
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
  }

  ACS_TIME.currentTime = computeSimTime();
  updateUniversalTime();
  updateClockDisplay();
  notifyTimeListeners();

  ACS_TIME.tickInterval = setInterval(() => {
    ACS_TIME.currentTime = computeSimTime();
    updateUniversalTime();
    updateClockDisplay();
    notifyTimeListeners();

    if (ACS_TIME.currentTime.getUTCFullYear() >= ACS_TIME.endYear) {
      endWorldCycle();
    }
  }, 1000);
}

/* ============================================================
   === ⏸ STOP SIMULATION ======================================
   ============================================================ */

function stopACSTime() {
  if (ACS_TIME.tickInterval) clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* ============================================================
   === 🟦 UNIVERSAL TIME UPDATE (core of v3.8) ==================
   ============================================================ */

function updateUniversalTime() {
  // This is the ONLY source of truth for time across all pages.
  localStorage.setItem("acs_universal_time", ACS_TIME.currentTime.toISOString());
}

/* ============================================================
   === 🚦 TOGGLE SIMULATION (Admin Only) =======================
   ============================================================ */

function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle the simulation state.");
    return;
  }

  if (ACS_CYCLE.status === "ON") {
    /* === TURNING OFF → FREEZE MODE === */
    ACS_TIME.currentTime = computeSimTime();

    localStorage.setItem("acs_universal_time", ACS_TIME.currentTime.toISOString());
    localStorage.setItem("acs_frozen_time", ACS_TIME.currentTime.toISOString());

    ACS_CYCLE.status = "OFF";
    stopACSTime();

    alert("⏸ Simulation paused — Time frozen.");
  } else {
    /* === TURNING ON → CONTINUE FROM FREEZE === */
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
   === 🏁 END OF WORLD CYCLE ===================================
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
   === ♻️ RESET SIMULATION =====================================
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

  localStorage.setItem("acs_universal_time", ACS_TIME.currentTime.toISOString());
  localStorage.setItem("acs_frozen_time", ACS_TIME.currentTime.toISOString());

  stopACSTime();
  updateClockDisplay();

  alert("♻️ ACS world reset to 1940. Simulation is OFF.");
}

/* ============================================================
   === 🛫 COCKPIT CLOCK (UTC) ==================================
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
   === 📡 LISTENERS FOR MODULES ================================
   ============================================================ */

function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) cb(ACS_TIME.currentTime);
}

function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* ============================================================
   === 💹 ECONOMIC ENGINE =======================================
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
   === 📈 ECONOMIC WATCHER =====================================
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
   === 🚀 INIT (RUNS ON EVERY PAGE) ============================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const universal = localStorage.getItem("acs_universal_time");

  if (universal) {
    ACS_TIME.currentTime = new Date(universal);
  }

  if (ACS_CYCLE.status === "ON") {
    startACSTime();
  } else {
    stopACSTime();
    updateClockDisplay();
  }

  economicWatcher();
});

/* ============================================================
   === 🔄 CROSS-TAB SYNC =======================================
   ============================================================ */

window.addEventListener("storage", (e) => {
  if (e.key === "acs_universal_time" && e.newValue) {
    ACS_TIME.currentTime = new Date(e.newValue);
    updateClockDisplay();
  }

  if (e.key === "ACS_Cycle") {
    const updated = JSON.parse(e.newValue || "{}");
    if (!updated || !updated.status) return;

    ACS_CYCLE = updated;

    if (ACS_CYCLE.status === "ON") startACSTime();
    else stopACSTime();

    updateClockDisplay();
  }
});

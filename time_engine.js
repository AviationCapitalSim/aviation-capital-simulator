/* ============================================================
   === AVIATION CAPITAL SIMULATOR - HISTORICAL TIME ENGINE ===
   Version: 3.5 (Global Real-Time Matrix)
   Date: 2025-11-13
   Author: Aviation Capital Systems
   ------------------------------------------------------------
   ▪ 1 real second = 1 in-game minute
   ▪ Global synchronized simulation (1940 → 2026)
   ▪ Controlled via admin-only Simulation Toggle (ON/OFF)
   ▪ Time NEVER pauses if ON (even if all players disconnect)
   ▪ All HTML pages read the same clock (UTC)
   ▪ Accurate universal "Matrix Clock" using real-world timestamps
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
  realStartDate: null,   // UTC timestamp when ON was activated
  status: "OFF",         // ON / OFF / COMPLETED
};

/* ============================================================
   === 🕒 REAL-TIME → SIM-TIME CONVERSION MATRIX ===============
   ============================================================ */

function computeSimTime() {
  // If OFF → keep the last saved freeze time.
  if (ACS_CYCLE.status !== "ON") return ACS_TIME.currentTime;

  const now = new Date();                       // UTC now
  const realStart = new Date(ACS_CYCLE.realStartDate);  
  const secPassed = Math.floor((now - realStart) / 1000);

  // 1 sec real = 1 min sim
  const simMinutes = secPassed;
  return new Date(Date.UTC(1940, 0, 1, 0, simMinutes));
}

/* ============================================================
   === ▶️ Start accelerated simulation (admin) ================
   ============================================================ */

function startACSTime() {
  stopACSTime(); // avoid duplicates

  // If cycle has no real-start timestamp → create it.
  if (!ACS_CYCLE.realStartDate) {
    ACS_CYCLE.realStartDate = new Date().toISOString(); // UTC
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
  }

  // Immediate sync
  ACS_TIME.currentTime = computeSimTime();
  updateClockDisplay();
  notifyTimeListeners();

  // Interval: ONLY refresh display (not advance the universe)
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
   === ⏸ Pause simulation =====================================
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
    // Turning OFF → freeze sim time
    ACS_TIME.currentTime = computeSimTime();
    ACS_CYCLE.status = "OFF";
    alert("⏸️ Simulation paused — All time progression stopped.");

  } else {
    // Turning ON → start real-time world
    ACS_CYCLE.status = "ON";
    ACS_CYCLE.realStartDate = new Date().toISOString();  
    alert("✅ Simulation started — The world of aviation begins in 1940!");
    startACSTime();
  }

  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  const simStatus = document.getElementById("simStatus");
  if (simStatus) simStatus.textContent = ACS_CYCLE.status.toUpperCase();

  updateClockDisplay();
}

/* ============================================================
   === 🏁 End of cycle (Year 2026) ==============================
   ============================================================ */

function endWorldCycle() {
  stopACSTime();
  ACS_CYCLE.status = "COMPLETED";
  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  alert("🕛 Simulation complete — Year 2026 reached. The cycle has ended.");
  resetSimulationData();
  window.location.href = "ranking.html";
}

/* ============================================================
   === ♻️ Reset data but preserve users ========================
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
  updateClockDisplay();
  alert("♻️ ACS world has been reset to 1940. Simulation is now OFF.");
}

/* ============================================================
   === 🛫 Update cockpit clock (UTC only) =======================
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
   === 📡 Listeners for modules (HR, Finance, FlightOps, etc.) ==
   ============================================================ */

function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) cb(ACS_TIME.currentTime);
}

function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* ============================================================
   === 💹 Economic Adjustments (Dynamic per Year) ===============
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
   === 📈 Economic Watcher (Hourly) =============================
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
   === 🚀 Initialization ========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const savedTime = localStorage.getItem("acs_current_time");
  ACS_TIME.currentTime = savedTime
    ? new Date(savedTime)
    : new Date("1940-01-01T00:00:00Z");

  const cycle = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}");
  ACS_CYCLE = cycle.status ? cycle : ACS_CYCLE;

  if (ACS_CYCLE.status === "ON") {
    startACSTime();
  } else {
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
    if (ACS_CYCLE.status === "ON") startACSTime();
    else stopACSTime();

    updateClockDisplay();
  }
});

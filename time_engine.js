/* ============================================================
   === AVIATION CAPITAL SIMULATOR - GLOBAL TIME ENGINE v4.1 ===
   ------------------------------------------------------------
   ▪ Universal UTC Matrix Clock (all pages, all users)
   ▪ Time never pauses while ON (24/7 real-time)
   ▪ OFF freezes time everywhere
   ▪ RESET resets ALL pages to 00:00 uniformly
   ▪ Dashboard/Finance/Aircraft/Routes auto-sync fix
   ============================================================ */

/* === 🌍 GLOBAL TIME OBJECT === */
const ACS_TIME = {
  startYear: 1940,
  endYear: 2026,
  currentTime: new Date("1940-01-01T00:00:00Z"),
  tickInterval: null,
  listeners: [],
};

/* === 🧭 GLOBAL CYCLE CONFIGURATION === */
let ACS_CYCLE = JSON.parse(localStorage.getItem("ACS_Cycle")) || {
  realStartDate: null,
  status: "OFF",
};

/* ============================================================
   === 🧠 MATRIX TIME CALCULATOR ===============================
   ============================================================ */

function computeSimTime() {
  if (ACS_CYCLE.status !== "ON") return ACS_TIME.currentTime;

  const now = new Date();
  const realStart = new Date(ACS_CYCLE.realStartDate);
  const secPassed = Math.floor((now - realStart) / 1000);

  return new Date(Date.UTC(1940, 0, 1, 0, secPassed));
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
  forceHeaderSync();
  notifyTimeListeners();

  ACS_TIME.tickInterval = setInterval(() => {
    ACS_TIME.currentTime = computeSimTime();
    updateUniversalTime();
    updateClockDisplay();
    forceHeaderSync();
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
   === 🟦 UNIVERSAL TIME UPDATE ================================
   ============================================================ */

function updateUniversalTime() {
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

  /* === TURNING OFF → FREEZE MODE === */
  if (ACS_CYCLE.status === "ON") {
    ACS_TIME.currentTime = computeSimTime();

    const freeze = ACS_TIME.currentTime.toISOString();
    localStorage.setItem("acs_universal_time", freeze);
    localStorage.setItem("acs_frozen_time", freeze);

    ACS_CYCLE.status = "OFF";
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

    stopACSTime();
    updateClockDisplay();
    forceHeaderSync();
    alert("⏸ Simulation paused — Time frozen.");
    return;
  }

  /* === TURNING ON → RESUME FROM FREEZE === */
  if (ACS_CYCLE.status === "OFF") {
    ACS_CYCLE.status = "ON";

    const now = new Date();
    const frozen = new Date(
      localStorage.getItem("acs_frozen_time") || ACS_TIME.currentTime
    );

    const minutesFromStart =
      (frozen - new Date(Date.UTC(1940, 0, 1))) / 60000;

    ACS_CYCLE.realStartDate = new Date(now - minutesFromStart * 1000).toISOString();

    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

    ACS_TIME.currentTime = computeSimTime();
    updateUniversalTime();
    updateClockDisplay();
    forceHeaderSync();

    startACSTime();
    alert("▶️ Simulation resumed — Timeline continues.");
    return;
  }
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

  ACS_CYCLE = { realStartDate: null, status: "OFF" };
  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  ACS_TIME.currentTime = new Date("1940-01-01T00:00:00Z");

  const zero = ACS_TIME.currentTime.toISOString();
  localStorage.setItem("acs_universal_time", zero);
  localStorage.setItem("acs_frozen_time", zero);

  stopACSTime();
  updateClockDisplay();
  forceHeaderSync();

  alert("♻️ ACS reset to 1940. Simulation is OFF.");
}

/* ============================================================
   === 🛫 COCKPIT CLOCK DISPLAY ================================
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
   === 🛡 GLOBAL HEADER AUTO-SYNC FIX ===========================
   ============================================================ */

function forceHeaderSync() {
  const el = document.getElementById("acs-clock");
  if (!el) return; // Only if header exists

  if (typeof cockpitClockListener === "function") {
    cockpitClockListener(ACS_TIME.currentTime); // override any early writes
  }
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

  localStorage.setItem("acs_ticket_fee", ticketFee);
  localStorage.setItem("acs_fuel_price", fuelUSD);
}

/* ============================================================
   === 📈 ECONOMIC WATCHER =====================================
   ============================================================ */

function economicWatcher() {
  let lastHour = null;
  registerTimeListener(time => {
    const hour = time.getUTCHours();
    if (hour !== lastHour) {
      lastHour = hour;
      updateEconomicVariables(time.getUTCFullYear());
    }
  });
}

/* ============================================================
   === 🚀 INIT ON EVERY PAGE ===================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const universal = localStorage.getItem("acs_universal_time");

  ACS_TIME.currentTime = universal
    ? new Date(universal)
    : new Date("1940-01-01T00:00:00Z");

  ACS_TIME.currentTime = computeSimTime();
  updateUniversalTime();
  updateClockDisplay();
  forceHeaderSync();

  if (ACS_CYCLE.status === "ON") startACSTime();
  else stopACSTime();

  economicWatcher();
});

/* ============================================================
   === 🔄 CROSS-TAB SYNC =======================================
   ============================================================ */

window.addEventListener("storage", e => {
  if (e.key === "acs_universal_time" && e.newValue) {
    ACS_TIME.currentTime = new Date(e.newValue);
    updateClockDisplay();
    forceHeaderSync();
  }

  if (e.key === "ACS_Cycle") {
    const updated = JSON.parse(e.newValue || "{}");
    if (!updated || !updated.status) return;

    ACS_CYCLE = updated;

    if (ACS_CYCLE.status === "ON") startACSTime();
    else stopACSTime();

    updateClockDisplay();
    forceHeaderSync();
  }
});

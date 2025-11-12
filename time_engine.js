/* ============================================================
   === AVIATION CAPITAL SIMULATOR - HISTORICAL TIME ENGINE ===
   Version: 3.2 (Final Admin-Synced Global Engine)
   Date: 2025-11-12
   Author: Aviation Capital Systems
   ------------------------------------------------------------
   ▪ 1 real second = 1 in-game minute
   ▪ Global synchronized simulation (1940 → 2026)
   ▪ Controlled via admin-only Simulation Toggle (ON/OFF)
   ▪ Automatically resets at cycle end, preserving users
   ▪ Dynamic update in Settings (no reload required)
   ============================================================ */

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
  realStartDate: null, // fecha real en que se activó ON
  status: "OFF",       // ON / OFF / COMPLETED
};

/* === 🕹 Start accelerated simulation (admin-controlled) === */
function startACSTime() {
  stopACSTime(); // evita duplicados

  if (ACS_TIME.tickInterval) {
    console.log("⚠️ Simulation already running. Skipping duplicate start.");
    return;
  }

  if (ACS_CYCLE.status !== "ON") {
    console.log("🕓 Simulation paused — system in OFF state.");
    updateClockDisplay();
    return;
  }

  if (!ACS_CYCLE.realStartDate) {
    ACS_CYCLE.realStartDate = new Date().toISOString();
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
  }

  updateClockDisplay();

  let tickCount = 0;
  ACS_TIME.tickInterval = setInterval(() => {
    ACS_TIME.currentTime = new Date(ACS_TIME.currentTime.getTime() + 60000);
    tickCount++;

    if (tickCount % 60 === 0) {
      localStorage.setItem("acs_current_time", ACS_TIME.currentTime.toISOString());
    }

    updateClockDisplay();
    notifyTimeListeners();

    if (ACS_TIME.currentTime.getUTCFullYear() >= ACS_TIME.endYear) {
      endWorldCycle();
    }
  }, 1000);
}

/* === ⏸ Stop or pause simulation === */
function stopACSTime() {
  if (ACS_TIME.tickInterval) clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* === 🧭 Toggle simulation ON/OFF (Admin only) === */
function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (!user || user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle the simulation state.");
    return;
  }

  ACS_CYCLE.status = ACS_CYCLE.status === "ON" ? "OFF" : "ON";

  if (ACS_CYCLE.status === "ON") {
    ACS_CYCLE.realStartDate = new Date().toISOString();
    alert("✅ Simulation started — The world of aviation begins in 1940!");
    startACSTime();
  } else {
    alert("⏸️ Simulation paused — All time progression stopped.");
    stopACSTime();
  }

  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  // 🔁 Actualizar panel dinámicamente sin recargar
  const simStatus = document.getElementById("simStatus");
  if (simStatus) simStatus.textContent = ACS_CYCLE.status.toUpperCase();
  updateClockDisplay();
}

/* === 🏁 End of cycle (automatic trigger) === */
function endWorldCycle() {
  stopACSTime();
  ACS_CYCLE.status = "COMPLETED";
  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  alert("🕛 Simulation complete — Year 2026 reached. The cycle has ended.");
  resetSimulationData();
  window.location.href = "ranking.html";
}

/* === ♻️ Reset data but preserve users === */
function resetSimulationData() {
  const users = localStorage.getItem("ACS_users"); // preserva jugadores
  localStorage.clear();
  if (users) localStorage.setItem("ACS_users", users);

  // restablece el ciclo base
  ACS_CYCLE = {
    startYear: 1940,
    endYear: 2026,
    realStartDate: null,
    status: "OFF",
  };
  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
  ACS_TIME.currentTime = new Date("1940-01-01T00:00:00Z");
  localStorage.setItem("acs_current_time", ACS_TIME.currentTime.toISOString());

  stopACSTime();
  updateClockDisplay();
  alert("♻️ ACS world has been reset to 1940. Simulation is now OFF.");
}

/* === 📺 Update cockpit clock on header (with state indicator) === */
function updateClockDisplay() {
  const el = document.getElementById("acs-clock");
  if (!el) return;

  const t = ACS_TIME.currentTime;
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  const month = t.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const yy = t.getUTCFullYear();

  const state = ACS_CYCLE.status === "ON" ? "🟢 ON" : "⏸️ OFF";
  el.textContent = `${hh}:${mm} — ${dd} ${month} ${yy} | ${state}`;

  el.style.color = ACS_CYCLE.status === "ON" ? "#00ff80" : "#ff9b00";
}

/* === 📡 Notify connected modules (Finance, HR, etc.) === */
function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) cb(ACS_TIME.currentTime);
}

/* === 🧩 Register external listeners === */
function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* === ⚙️ Dynamic Economic Adjustments by Year === */
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

/* === 🪙 Economic watcher (every simulated hour) === */
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

/* === 🚀 Initialization === */
document.addEventListener("DOMContentLoaded", () => {
  const savedTime = localStorage.getItem("acs_current_time");
  ACS_TIME.currentTime = savedTime
    ? new Date(savedTime)
    : new Date("1940-01-01T00:00:00Z");

  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (ACS_CYCLE.status === "ON" && user.email !== "aviationcapitalsim@gmail.com") {
    ACS_CYCLE.status = "OFF";
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
    console.warn("⛔ Unauthorized simulation state detected. Reset to OFF.");
  }

  if (ACS_CYCLE.status === "ON") {
    startACSTime();
  } else {
    stopACSTime();
    updateClockDisplay();
  }

  economicWatcher();
});

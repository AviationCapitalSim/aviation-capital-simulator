/* ============================================================
   === AVIATION CAPITAL SIMULATOR - HISTORICAL TIME ENGINE ===
   Version: 2.0 (Beta)
   Date: 2025-11-10
   Author: Aviation Capital Systems
   ------------------------------------------------------------
   ▪ 1 real second = 1 in-game minute
   ▪ Simulation runs from 1 JAN 1940 → 31 DEC 2028
   ▪ Includes dynamic economic variables (Ticket Fees, Fuel)
   ▪ Fully compatible with registerTimeListener()
   ============================================================ */

const ACS_TIME = {
  startYear: 1940,
  endYear: 2028,
  currentTime: new Date("1940-01-01T00:00:00Z"),
  tickInterval: null,
  listeners: [],
};

/* === 🕒 Start accelerated simulation clock === */
function startACSTime() {
  stopACSTime(); // prevent duplicates
  ACS_TIME.tickInterval = setInterval(() => {
    // +1 simulated minute per real second
    ACS_TIME.currentTime = new Date(ACS_TIME.currentTime.getTime() + 60000);
    localStorage.setItem("acs_current_time", ACS_TIME.currentTime.toISOString());
    updateClockDisplay();
    notifyTimeListeners();

    // Stop automatically when simulation reaches 2028
    if (ACS_TIME.currentTime.getUTCFullYear() >= ACS_TIME.endYear) {
      stopACSTime();
      alert("🕛 Simulation complete — Year 2028 reached!");
      window.location.href = "ranking.html";
    }
  }, 1000);
}

/* === ⏸ Stop or pause clock === */
function stopACSTime() {
  if (ACS_TIME.tickInterval) clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* === 📺 Update cockpit clock on header === */
function updateClockDisplay() {
  const el = document.getElementById("acs-clock");
  if (!el) return;
  const t = ACS_TIME.currentTime;
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  const month = t.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const yy = t.getUTCFullYear();
  el.textContent = `${hh}:${mm}  —  ${dd} ${month} ${yy}`;
}

/* === 📡 Notify connected modules (Finance, HR, etc.) === */
function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) cb(ACS_TIME.currentTime);
}

/* === 🧭 Allow external modules to receive updates === */
function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* === ⚙️ Dynamic Economic Adjustments by Year === */
function updateEconomicVariables(year) {
  let ticketFee = 0.06; // default 6%
  let fuelUSD = 3.2;    // avg per gallon

  if (year < 1960) { ticketFee = 0.12; fuelUSD = 1.1; }       // Early post-war aviation
  else if (year < 1980) { ticketFee = 0.09; fuelUSD = 1.9; }  // Jet age expansion
  else if (year < 2000) { ticketFee = 0.07; fuelUSD = 2.5; }  // Liberalization era
  else if (year < 2020) { ticketFee = 0.05; fuelUSD = 4.3; }  // Modern digital period
  else { ticketFee = 0.04; fuelUSD = 5.8; }                    // 2020s and beyond

  // Apply globally (when WorldAirportsACS is loaded)
  if (typeof WorldAirportsACS !== "undefined") {
    for (const cont in WorldAirportsACS) {
      WorldAirportsACS[cont].forEach(a => {
        a.ticket_fee_percent = ticketFee;
        a.fuel_usd_gal = fuelUSD;
      });
    }
  }

  // Save reference for Finance calculations
  localStorage.setItem("acs_ticket_fee", ticketFee);
  localStorage.setItem("acs_fuel_price", fuelUSD);
}

/* === 🪙 Sync economics every simulated hour === */
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

/* === 🧩 Initialization === */
document.addEventListener("DOMContentLoaded", () => {
  const savedTime = localStorage.getItem("acs_current_time");
  ACS_TIME.currentTime = savedTime
    ? new Date(savedTime)
    : new Date("1940-01-01T00:00:00Z");

  startACSTime();
  updateClockDisplay();
  economicWatcher();
});


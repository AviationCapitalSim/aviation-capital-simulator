/* ============================================================
   🟦 ACS FLIGHT ECONOMICS ENGINE — CORE v1.0
   ------------------------------------------------------------
   ✔ ÚNICO listener de vuelos
   ✔ SkyTrack READ-ONLY
   ✔ Finance via ACS_registerIncome ONLY
   ✔ Passenger engine as source of pax
   ✔ Preparado para fuel / slots (OFF)
   ------------------------------------------------------------
   Author: ACS System
   Date: 2026-01-10
   ============================================================ */

/* ============================
   🔐 FEATURE FLAGS
   ============================ */
const ENABLE_FUEL_COST  = false;
const ENABLE_SLOT_FEES  = false;

/* ============================
   🔒 ANTI-DUPLICATION
   ============================ */
const ACS_ECON_ProcessedFlights = new Set();

/* ============================
   💰 BASE TICKET MODEL (SAFE)
   ============================ */
function ACS_getBaseTicket(distanceNM, year) {
  let ticket = 18;

  if (distanceNM > 500)  ticket = 35;
  if (distanceNM > 1500) ticket = 75;
  if (distanceNM > 3000) ticket = 140;

  // historical correction
  if (year && year < 1960) ticket *= 0.6;

  return Math.round(ticket);
}

/* ============================================================
   🟦 CORE LISTENER — FLIGHT ARRIVED
   ============================================================ */
window.addEventListener("ACS_FLIGHT_ARRIVED", (ev) => {
  try {

    const f = ev.detail;
    if (!f || !f.flightId || !f.aircraftId) return;

    // 🔒 Anti-duplicate
    if (ACS_ECON_ProcessedFlights.has(f.flightId)) return;
    ACS_ECON_ProcessedFlights.add(f.flightId);

    const distanceNM = Number(f.distanceNM || 0);
    if (distanceNM <= 0) return;

    // ============================
    // ✈️ AIRCRAFT
    // ============================
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const ac = fleet.find(a =>
      a.id === f.aircraftId || a.registration === f.aircraftId
    );
    if (!ac) return;

    // ============================
    // 🏙 AIRPORTS
    // ============================
    const A = window.ACS_AIRPORT_INDEX?.[f.origin];
    const B = window.ACS_AIRPORT_INDEX?.[f.destination];
    if (!A || !B) return;

    // ============================
    // 🧮 PAX CALCULATION (EXTERNAL)
    // ============================
    if (!window.ACS_PAX) return;

    const year =
      window.ACS_TIME?.currentTime instanceof Date
        ? window.ACS_TIME.currentTime.getUTCFullYear()
        : new Date().getFullYear();

    const hour =
      Number.isFinite(f.detectedAtTs)
        ? new Date(f.detectedAtTs).getUTCHours()
        : 12;

    const tierA = ACS_PAX.getTier(A);
    const tierB = ACS_PAX.getTier(B);

    const dailyDemand = ACS_PAX.getDailyDemand(
      A, B, distanceNM, year
    );

    const hourlyDemand = ACS_PAX.getHourlyDemand(
      dailyDemand,
      hour,
      ACS_PAX.isLongHaul(distanceNM, tierA, tierB),
      Math.min(tierA, tierB)
    );

    const pax = Math.min(ac.seats || 0, hourlyDemand);
    if (pax <= 0) return;

    // ============================
    // 💵 REVENUE
    // ============================
    const ticket = ACS_getBaseTicket(distanceNM, year);
    const revenue = Math.round(pax * ticket);
    if (revenue <= 0) return;

    if (typeof ACS_registerIncome === "function") {
      ACS_registerIncome(
        "routes",
        revenue,
        `Flight ${f.origin} → ${f.destination} (${f.aircraftId})`
      );
    }

    console.log(
      `💰 ECON OK | ${f.origin} → ${f.destination} | Pax ${pax} | $${revenue}`
    );

    /* ============================
       ⛽ FUEL (PREPARED — OFF)
       ============================ */
    if (ENABLE_FUEL_COST) {
      // future
    }

    /* ============================
       🛂 SLOTS (PREPARED — OFF)
       ============================ */
    if (ENABLE_SLOT_FEES) {
      // future
    }

  } catch (err) {
    console.error("❌ ACS Flight Economics error:", err);
  }
});

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

/* ============================================================
   🟦 A2 — ECON AIRPORT ADAPTER (PASSENGER ENGINE SAFE INPUT)
   ------------------------------------------------------------
   ✔ Generates minimal economic airport object
   ✔ Guarantees tier & demand > 0
   ✔ Does NOT touch SkyTrack or World Engine
   ============================================================ */

function ACS_buildEconAirport(icao, distanceNM) {

  // Fallback safety
  if (!icao) return null;

  // Very rough tier heuristic (GOOD ENOUGH for v1)
  let tier = 3; // default regional

  if (distanceNM > 2500) tier = 1;       // intercontinental
  else if (distanceNM > 1200) tier = 2;  // major trunk
  else if (distanceNM < 300)  tier = 4;  // regional

  return {
    icao,
    tier,

    // Minimal fields used by passenger_engine.js
    population: 1_000_000 * (5 - tier),
    marketSize: (5 - tier) * 10,
    region: "GEN",

    // Safety multipliers
    demandMultiplier: 1.0
  };
}

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

   /* ============================================================
   🟧 A3 — AIRCRAFT ID NORMALIZER (ECON SAFE)
   ------------------------------------------------------------
   ✔ Soporta AC-xxxx y AC_xxxx
   ✔ NO modifica Fleet
   ✔ NO modifica SkyTrack
   ✔ SOLO lectura
   ============================================================ */

// ============================
// ✈️ AIRCRAFT (ROBUST MATCH)
// ============================

const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

// Normalizar aircraftId entrante
const econAircraftIdRaw = String(f.aircraftId || "").trim();
const econAircraftIdNorm = econAircraftIdRaw.replace("-", "_");

// Buscar avión por:
// 1) id exacto
// 2) id normalizado
// 3) registration (fallback)
const ac = fleet.find(a => {
  if (!a) return false;

  const fid = String(a.id || "").trim();
  const fidNorm = fid.replace("-", "_");

  return (
    fid === econAircraftIdRaw ||
    fidNorm === econAircraftIdNorm ||
    a.registration === econAircraftIdRaw
  );
});

if (!ac) {
  console.warn(
    "❌ ECON: Aircraft NOT FOUND in fleet",
    econAircraftIdRaw,
    "→ normalized:",
    econAircraftIdNorm
  );
  return;
}

    // ============================
    // 🏙 AIRPORTS
    // ============================
    const A = ACS_buildEconAirport(f.origin, distanceNM);
    const B = ACS_buildEconAirport(f.destination, distanceNM);
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

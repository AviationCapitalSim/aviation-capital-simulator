/* ============================================================
   ✈️ ACS FLIGHT ECONOMICS ENGINE — CORE v1.0 (STABLE)
   ------------------------------------------------------------
   ✔ ÚNICO listener de vuelos (ACS_FLIGHT_ARRIVED)
   ✔ SkyTrack READ-ONLY
   ✔ Finance via ACS_registerIncome ONLY
   ✔ Passenger engine as source of pax (ACS_PAX)
   ✔ Preparado para fuel / slots (OFF)
   ------------------------------------------------------------
   Date: 2026-01-10
   ============================================================ */

console.log("🧠 ACS_FLIGHT_ECONOMICS LOADED");

/* ============================
   🔐 FEATURE FLAGS
   ============================ */
window.ACS_ECON_FLAGS = window.ACS_ECON_FLAGS || {
  ENABLE_FUEL_COST: false,
  ENABLE_SLOT_FEES: false
};

/* ============================================================
   🟦 A2 — ECON AIRPORT ADAPTER (GLOBAL SAFE)
   ------------------------------------------------------------
   🔥 CLAVE: Definido en window para que NUNCA falte.
   ============================================================ */
window.ACS_buildEconAirport = window.ACS_buildEconAirport || function (icao, distanceNM) {
  if (!icao) return null;

  let tier = 3; // default regional
  if (distanceNM > 2500) tier = 1;
  else if (distanceNM > 1200) tier = 2;
  else if (distanceNM < 300) tier = 4;

  return {
    icao,
    tier,
    population: 1_000_000 * (5 - tier),
    marketSize: (5 - tier) * 10,
    region: "GEN",
    demandMultiplier: 1.0
  };
};

/* ============================
   💰 BASE TICKET MODEL (GLOBAL SAFE)
   ============================ */
window.ACS_getBaseTicket = window.ACS_getBaseTicket || function (distanceNM, year) {
  let ticket = 18;
  if (distanceNM > 500) ticket = 35;
  if (distanceNM > 1500) ticket = 75;
  if (distanceNM > 3000) ticket = 140;

  if (year && year < 1960) ticket *= 0.6;
  return Math.round(ticket);
};

/* ============================
   🔒 DEDUP CANÓNICO (GLOBAL)
   ============================ */
window.ACS_ECON_ProcessedFlights =
  window.ACS_ECON_ProcessedFlights || new Set();

/* ============================================================
   🟦 CORE LISTENER — FLIGHT ARRIVED
   DEDUP CANÓNICO: aircraftId + depAbsMin (1 ingreso por vuelo real)
   ============================================================ */
window.addEventListener("ACS_FLIGHT_ARRIVED", (ev) => {
  try {
    const f = ev?.detail;
    if (!f) return;

    // Campos mínimos desde SkyTrack runtime
    if (!f.aircraftId || !Number.isFinite(f.depAbsMin)) return;

    const econKey = `${String(f.aircraftId)}|${Number(f.depAbsMin)}`;
    if (window.ACS_ECON_ProcessedFlights.has(econKey)) return;
    window.ACS_ECON_ProcessedFlights.add(econKey);

    const distanceNM = Number(f.distanceNM || 0);
    if (!(distanceNM > 0)) return;

    // ========= FLEET =========
    let fleet = [];
    try {
      fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    } catch {
      fleet = [];
    }

    const econAircraftIdRaw = String(f.aircraftId || "").trim();
    const econAircraftIdNorm = econAircraftIdRaw.replace("-", "_");

    const ac = (Array.isArray(fleet) ? fleet : []).find(a => {
      if (!a) return false;
      const fid = String(a.id || "").trim();
      const fidNorm = fid.replace("-", "_");

      return (
        fid === econAircraftIdRaw ||
        fidNorm === econAircraftIdNorm ||
        String(a.registration || "") === econAircraftIdRaw
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

    // ========= AIRPORTS =========
    const A = window.ACS_buildEconAirport(f.origin, distanceNM);
    const B = window.ACS_buildEconAirport(f.destination, distanceNM);
    if (!A || !B) return;

    // ========= PAX =========
    if (!window.ACS_PAX) {
      console.warn("⚠️ ECON: ACS_PAX not loaded yet");
      return;
    }

    const year =
      (window.ACS_TIME?.currentTime instanceof Date)
        ? window.ACS_TIME.currentTime.getUTCFullYear()
        : new Date().getFullYear();

    const hour =
      Number.isFinite(f.detectedAtTs)
        ? new Date(f.detectedAtTs).getUTCHours()
        : 12;

    const tierA = window.ACS_PAX.getTier(A);
    const tierB = window.ACS_PAX.getTier(B);

    const dailyDemand = window.ACS_PAX.getDailyDemand(A, B, distanceNM, year);

    const hourlyDemand = window.ACS_PAX.getHourlyDemand(
      dailyDemand,
      hour,
      window.ACS_PAX.isLongHaul(distanceNM, tierA, tierB),
      Math.min(tierA, tierB)
    );

    const seats =
      Number(ac.seats ?? ac.seatCount ?? ac.capacity ?? 0);

    const pax = Math.min(seats, hourlyDemand);
    if (!(pax > 0)) return;

    // ========= REVENUE =========
    const ticket = window.ACS_getBaseTicket(distanceNM, year);
    const revenue = Math.round(pax * ticket);
    if (!(revenue > 0)) return;

    if (typeof window.ACS_registerIncome !== "function") {
      console.warn("⛔ ECON: ACS_registerIncome not available (finance not loaded?)");
      return;
    }

    window.ACS_registerIncome(
      "routes",
      revenue,
      `Flight ${f.origin} → ${f.destination} (${f.aircraftId})`
    );

    console.log(
      `💰 ECON OK | ${f.origin} → ${f.destination} | Pax ${pax} | $${revenue} | key=${econKey}`
    );

    // ========= FUTURE (OFF) =========
    if (window.ACS_ECON_FLAGS.ENABLE_FUEL_COST) {
      // future
    }
    if (window.ACS_ECON_FLAGS.ENABLE_SLOT_FEES) {
      // future
    }

  } catch (err) {
    console.error("❌ ACS Flight Economics error:", err);
  }
});

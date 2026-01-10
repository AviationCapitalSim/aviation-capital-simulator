/* ============================================================
   🟦 ACS FLIGHT ECONOMICS ENGINE — CORE v1.0
   ============================================================ */

console.log("🧠 ACS_FLIGHT_ECONOMICS LOADED");

/* ============================
   🔐 FEATURE FLAGS
   ============================ */
const ENABLE_FUEL_COST = false;
const ENABLE_SLOT_FEES = false;

/* ============================================================
   🟦 A2 — ECON AIRPORT ADAPTER
   ============================================================ */
function ACS_buildEconAirport(icao, distanceNM) {
  if (!icao) return null;

  let tier = 3;
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
}

/* ============================
   🔒 DEDUP STORAGE
   ============================ */
window.ACS_ECON_ProcessedFlights =
  window.ACS_ECON_ProcessedFlights || new Set();

/* ============================
   💰 BASE TICKET
   ============================ */
function ACS_getBaseTicket(distanceNM, year) {
  let ticket = 18;
  if (distanceNM > 500) ticket = 35;
  if (distanceNM > 1500) ticket = 75;
  if (distanceNM > 3000) ticket = 140;
  if (year && year < 1960) ticket *= 0.6;
  return Math.round(ticket);
}

/* ============================================================
   🟦 CORE LISTENER — FLIGHT ARRIVED
   ============================================================ */
window.addEventListener("ACS_FLIGHT_ARRIVED", (ev) => {
  try {

    const f = ev?.detail;
    if (!f) return;
    if (!f.aircraftId || !Number.isFinite(f.depAbsMin)) return;

    const econKey = `${f.aircraftId}|${f.depAbsMin}`;
    if (window.ACS_ECON_ProcessedFlights.has(econKey)) return;
    window.ACS_ECON_ProcessedFlights.add(econKey);

    const distanceNM = Number(f.distanceNM || 0);
    if (distanceNM <= 0) return;

    /* ============================
       🟧 A3 — AIRCRAFT MATCH
       ============================ */
    const fleet = JSON.parse(
      localStorage.getItem("ACS_MyAircraft") || "[]"
    );

    const raw = String(f.aircraftId).trim();
    const norm = raw.replace("-", "_");

    const ac = fleet.find(a => {
      if (!a) return false;
      const id = String(a.id || "").trim();
      const idNorm = id.replace("-", "_");
      return id === raw || idNorm === norm || a.registration === raw;
    });

    if (!ac) {
      console.warn("❌ ECON Aircraft NOT FOUND:", raw);
      return;
    }

    /* ============================
       🏙 AIRPORTS
       ============================ */
    const A = ACS_buildEconAirport(f.origin, distanceNM);
    const B = ACS_buildEconAirport(f.destination, distanceNM);
    if (!A || !B) return;

    /* ============================
       🧮 PAX
       ============================ */
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

    /* ============================
       💵 REVENUE
       ============================ */
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
       ⛽ FUEL (OFF)
       ============================ */
    if (ENABLE_FUEL_COST) {
      // future
    }

    /* ============================
       🛂 SLOTS (OFF)
       ============================ */
    if (ENABLE_SLOT_FEES) {
      // future
    }

  } catch (err) {
    console.error("❌ ACS Flight Economics error:", err);
  }
});

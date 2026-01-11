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
   🟦 PASO 9 — FLIGHT ECONOMICS CORE (CANONICAL)
   ------------------------------------------------------------
   ✔ Single revenue entry point
   ✔ Uses ACS_PAX v2
   ✔ Writes to Finance ONLY here
   ============================================================ */

window.ACS_ECON_ProcessedFlights =
  window.ACS_ECON_ProcessedFlights || new Set();

window.addEventListener("ACS_FLIGHT_ARRIVED", (ev) => {

  const f = ev?.detail;
  if (!f) return;

  /* -------------------------------
     🔒 Dedup real flight
  --------------------------------*/
  if (!f.aircraftId || !Number.isFinite(f.depAbsMin)) return;

  const econKey = `${f.aircraftId}|${f.depAbsMin}`;
  if (window.ACS_ECON_ProcessedFlights.has(econKey)) return;
  window.ACS_ECON_ProcessedFlights.add(econKey);

  /* -------------------------------
     ✈️ Aircraft
  --------------------------------*/
  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  const ac = fleet.find(a =>
    a.id === f.aircraftId || a.registration === f.aircraftId
  );
  if (!ac) return;

  /* -------------------------------
     ⏱ Time
  --------------------------------*/
  const simTime =
    window.ACS_TIME?.currentTime instanceof Date
      ? window.ACS_TIME.currentTime
      : new Date();

  /* -------------------------------
     🧍 Passenger calculation
  --------------------------------*/
  if (!window.ACS_PAX || typeof ACS_PAX.calculate !== "function") return;

  const paxResult = ACS_PAX.calculate({
    route: {
      distanceNM: f.distanceNM,
      continentA: f.originContinent || "GEN",
      continentB: f.destinationContinent || "GEN"
    },
    time: {
      hour: simTime.getUTCHours(),
      year: simTime.getUTCFullYear()
    },
    aircraft: {
      seats: ac.seats || 0,
      comfortIndex: ac.comfortIndex || 1.0   // FUTURO
    },
    pricing: {
      baseFare: f.baseFare || 120,
      effectiveFare: f.effectiveFare || 120
    },
    airline: {
      marketingLevel: 1.0,
      reputation: 1.0
    },
    market: {
      competitors: f.competitors || 1,
      frequencyFactor: 1.0
    }
  });

  const pax = paxResult.pax || 0;
  if (pax <= 0) return;

  /* -------------------------------
     💵 Ticket price (historical-safe)
  --------------------------------*/
  let ticket = 120;
  if (f.distanceNM > 3000) ticket = 220;
  else if (f.distanceNM > 1200) ticket = 150;
  else if (f.distanceNM > 500)  ticket = 90;

  if (simTime.getUTCFullYear() < 1960) ticket *= 0.6;

  const revenue = Math.round(pax * ticket);
  if (revenue <= 0) return;

  /* -------------------------------
     💰 FINANCE — SINGLE ENTRY
  --------------------------------*/
  if (typeof ACS_registerIncome === "function") {
    ACS_registerIncome(
      "routes",
      revenue,
      `Flight ${f.origin} → ${f.destination} | Pax ${pax}`
    );
  }

  console.log(
    `💰 ECON OK | ${f.origin} → ${f.destination} | Pax ${pax}/${ac.seats} | $${revenue}`
  );

});

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

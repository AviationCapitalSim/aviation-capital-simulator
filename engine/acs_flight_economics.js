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

/* ============================================================
   🟦 PASO 9 — FLIGHT ECONOMICS CORE (CANONICAL)
   ------------------------------------------------------------
   ✔ Single revenue entry point
   ✔ Uses ACS_PAX v2
   ✔ Writes to Finance ONLY here
   ✔ FIXED: proper payload contract for ACS_registerIncome
   ============================================================ */

window.ACS_ECON_ProcessedFlights =
  window.ACS_ECON_ProcessedFlights || new Set();

/* ============================================================
   🟧 A1 — FLIGHT ECONOMICS LISTENER (PAYLOAD-SAFE)
   ------------------------------------------------------------
   • NO asume nombres
   • NO retorna por undefined
   • Mapea cualquier evento real
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ARRIVAL", (ev) => {
  try {

    const d = ev && ev.detail ? ev.detail : {};
    if (!d) return;

    // ============================
    // 🧩 PAYLOAD NORMALIZATION
    // ============================
    const f = {
      flightId:
        d.flightId || d.id || d.flight || d.fid || null,

      aircraftId:
        d.aircraftId || d.aircraft || d.ac || d.registration || null,

      origin:
        d.origin || d.from || d.departure || null,

      destination:
        d.destination || d.to || d.arrival || null,

      distanceNM:
        Number(d.distanceNM || d.distance || d.dist || 0),

      depAbsMin:
        Number(d.depAbsMin || d.departureMin || d.depMin || Date.now())
    };

    if (!f.aircraftId || !f.origin || !f.destination || !f.distanceNM) return;

    // ============================
    // 🔒 DEDUP
    // ============================
    window.ACS_ECON_ProcessedFlights =
      window.ACS_ECON_ProcessedFlights || new Set();

    const econKey = `${f.aircraftId}|${f.depAbsMin}`;
    if (window.ACS_ECON_ProcessedFlights.has(econKey)) return;
    window.ACS_ECON_ProcessedFlights.add(econKey);

    // ============================
    // ✈️ AIRCRAFT
    // ============================
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const ac = fleet.find(a =>
      a.id === f.aircraftId || a.registration === f.aircraftId
    );
    if (!ac) return;

    // ============================
    // ⏱ TIME
    // ============================
    const simTime =
      window.ACS_TIME?.currentTime instanceof Date
        ? window.ACS_TIME.currentTime
        : new Date();

    // ============================
    // 🧍 PAX
    // ============================
    if (!window.ACS_PAX || typeof ACS_PAX.calculate !== "function") return;

    const paxResult = ACS_PAX.calculate({
      route: { distanceNM: f.distanceNM },
      time: {
        hour: simTime.getUTCHours(),
        year: simTime.getUTCFullYear()
      },
      aircraft: {
        seats: ac.seats || 0,
        comfortIndex: ac.comfortIndex || 1
      }
    });

    const pax = Number(paxResult?.pax || 0);
    if (pax <= 0) return;

    // ============================
    // 💵 TICKET
    // ============================
    let ticket = 120;
    if (f.distanceNM > 3000) ticket = 220;
    else if (f.distanceNM > 1200) ticket = 150;
    else if (f.distanceNM > 500) ticket = 90;

    if (simTime.getUTCFullYear() < 1960) ticket *= 0.6;

    const revenue = Math.round(pax * ticket);
    if (revenue <= 0) return;

    // ============================
    // 💰 FINANCE (ÚNICO ENTRY)
    // ============================
    if (typeof ACS_registerIncome === "function") {
      ACS_registerIncome(
        "routes",
        { amount: revenue, pax, distanceNM: f.distanceNM },
        `Flight ${f.origin} → ${f.destination}`
      );
    }

    // ============================
    // 💾 STORAGE BRIDGE
    // ============================
    localStorage.setItem(
      "ACS_LAST_FLIGHT_ECON",
      JSON.stringify({
        flightId: f.flightId,
        aircraftId: f.aircraftId,
        origin: f.origin,
        destination: f.destination,
        revenue,
        pax,
        distanceNM: f.distanceNM,
        ts: Date.now()
      })
    );

    console.log(
      "%c💾 ECON STORED FOR FINANCE",
      "color:#00ffaa;font-weight:bold;",
      { flight: f, revenue, pax }
    );

  } catch (e) {
    console.error("ECON LISTENER ERROR", e);
  }
});


/* ============================================================
   🟦 FINANCE ECON STORAGE LISTENER (READ)
   ------------------------------------------------------------
   • Reads economic flight data from localStorage
   • Updates Live & Weekly Route Revenue
   ============================================================ */

(function(){

  let lastTS = null;

  function getISOWeek(d){
    const date = new Date(Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    ));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  setInterval(() => {

    const raw = localStorage.getItem("ACS_LAST_FLIGHT_ECON");
    if (!raw) return;

    const d = JSON.parse(raw);
    if (!d || d.ts === lastTS || d.revenue <= 0) return;

    lastTS = d.ts;

    let f = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
    f.income = f.income || {};

    const now = new Date();
    const todayKey = now.toISOString().slice(0,10);
    const weekKey  = getISOWeek(now);

    if (f._lastLiveDay !== todayKey){
      f.income.live_flight = 0;
      f._lastLiveDay = todayKey;
    }

    if (f._lastWeeklyWeek !== weekKey){
      f.income.route_weekly = 0;
      f._lastWeeklyWeek = weekKey;
    }

    f.income.live_flight  = d.revenue;
    f.income.route_weekly += d.revenue;

    localStorage.setItem("ACS_Finance", JSON.stringify(f));

    console.log(
      "%c💰 FINANCE UPDATED FROM STORAGE",
      "color:#00ff80;font-weight:bold;",
      {
        flightId: d.flightId,
        revenue: d.revenue,
        live: f.income.live_flight,
        weekly: f.income.route_weekly
      }
    );

  }, 1000); // 1s polling — safe & simple

})();

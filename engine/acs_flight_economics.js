/* ============================================================
   ✈️ ACS FLIGHT ECONOMICS ENGINE — CORE v1.0 (STABLE)
   ------------------------------------------------------------
   ✔ ÚNICO listener de vuelos (ACS_FLIGHT_ARRIVAL)
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
   🟧 A0 — CANONICAL ARRIVAL BRIDGE → ECONOMICS
   ------------------------------------------------------------
   • Escucha el evento REAL del sistema: ACS_FLIGHT_ARRIVAL
   • Reinyecta el evento al pipeline económico existente
   • NO duplica lógica
   • NO rompe DEBUG ni ECONOMICS internos
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ARRIVAL", (ev) => {
  try {
    if (!ev || !ev.detail) return;

    // Reemitimos hacia el canal que Economics YA procesa
    window.dispatchEvent(
      new CustomEvent("ACS_FLIGHT_ARRIVAL_DEBUG", {
        detail: ev.detail
      })
    );

  } catch (err) {
    console.error("❌ ECON ARRIVAL BRIDGE ERROR", err);
  }
});

/* ============================================================
   🟧 A1 — FLIGHT ECONOMICS LISTENER (CANONICAL)
   ------------------------------------------------------------
   ✔ ÚNICO evento: ACS_FLIGHT_ARRIVAL_DEBUG (vía bridge)
   ✔ aircraftId REAL desde SkyTrack
   ✔ Dedup por aircraftId + depAbsMin
   ✔ Finance SOLO vía ACS_registerIncome
   ============================================================ */

window.ACS_ECON_ProcessedFlights =
  window.ACS_ECON_ProcessedFlights || new Set();

window.addEventListener("ACS_FLIGHT_ARRIVAL_DEBUG", (ev) => {
  try {

    const d = ev?.detail;
    if (!d) return;

    /* ============================
       🧩 PAYLOAD NORMALIZATION
       ============================ */
    const f = {
      flightId: d.flightId || null,
      aircraftId: d.aircraftId || null,
      origin: d.origin || null,
      destination: d.destination || null,
      distanceNM: Number(d.distanceNM || 0),
      depAbsMin: Number(d.depAbsMin)
    };

    if (
      !f.aircraftId ||
      !f.origin ||
      !f.destination ||
      !Number.isFinite(f.distanceNM) ||
      !Number.isFinite(f.depAbsMin)
    ) return;

    /* ============================
       🔒 DEDUP (REAL FLIGHT)
       ============================ */
    const econKey = `${f.aircraftId}|${f.depAbsMin}`;
    if (window.ACS_ECON_ProcessedFlights.has(econKey)) return;
    window.ACS_ECON_ProcessedFlights.add(econKey);

    /* ============================
       ✈️ AIRCRAFT (REAL FLEET)
       ============================ */
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const ac = fleet.find(a => a.id === f.aircraftId);
    if (!ac) return;

    /* ============================
       ⏱ TIME
       ============================ */
    const simTime =
      window.ACS_TIME?.currentTime instanceof Date
        ? window.ACS_TIME.currentTime
        : new Date();

    /* ============================
       🧍 PASSENGERS
       ============================ */
    if (!window.ACS_PAX || typeof ACS_PAX.calculate !== "function") return;

    const paxResult = ACS_PAX.calculate({
      route: { distanceNM: f.distanceNM },
      time: {
        hour: simTime.getUTCHours(),
        year: simTime.getUTCFullYear()
      },
      aircraft: {
        seats: ac.seats || 0,
        comfortIndex: ac.comfortIndex || 1.0
      }
    });

    const pax = Number(paxResult?.pax || 0);
    if (pax <= 0) return;

    /* ============================
       💵 TICKET MODEL
       ============================ */
    let ticket = 120;
    if (f.distanceNM > 3000) ticket = 220;
    else if (f.distanceNM > 1200) ticket = 150;
    else if (f.distanceNM > 500)  ticket = 90;

    if (simTime.getUTCFullYear() < 1960) ticket *= 0.6;

    const revenue = Math.round(pax * ticket);
    if (revenue <= 0) return;

  /* ============================
   💰 FINANCE (ÚNICO ENTRY)
   ============================ */
if (
  typeof window.ACS_registerIncome === "function" &&
  !f.__FINANCE_COMMITTED__
) {

  const amount = Number(revenue) || 0;

  if (amount > 0) {

    ACS_registerIncome(
      "routes",
      amount,
      `AUTO FLIGHT ${f.origin} → ${f.destination}`
    );

    f.__FINANCE_COMMITTED__ = true; // 🔒 anti-duplicado real

    console.log(
      "%c💰 ROUTE INCOME COMMITTED (AUTO FLIGHT)",
      "color:#00ff80;font-weight:bold;",
      {
        flightId: f.id,
        origin: f.origin,
        destination: f.destination,
        amount
      }
    );
  }
}
    /* ============================
       🟦 ECON → FINANCE EVENT EMITTER
       ============================ */
    window.dispatchEvent(
      new CustomEvent("ACS_FLIGHT_ECONOMICS", {
        detail: {
          flightId: f.flightId,
          aircraftId: ac.id,
          origin: f.origin,
          destination: f.destination,
          pax: pax,
          distanceNM: f.distanceNM,
          revenue: revenue,
          ts: Date.now()
        }
      })
    );

    console.log(
      "%c💰 ECON FLIGHT APPLIED",
      "color:#00ff88;font-weight:bold;",
      {
        aircraftId: ac.id,
        route: `${f.origin} → ${f.destination}`,
        pax,
        revenue
      }
    );

  } catch (e) {
    console.error("❌ ECON LISTENER ERROR", e);
  }
});

/* ============================================================
   🟧 A1 — ECONOMICS → FINANCE (LOCALSTORAGE CANONICAL WRITE)
   ------------------------------------------------------------
   • ÚNICO writer de ingresos de vuelos
   • NO usa eventos para Finance
   • Dedup por flightId
   • Compatible con multipestaña
   ============================================================ */

(function ACS_ECON_CANONICAL_FINANCE_WRITE(){

  // --- deduplicación global ---
  const PROCESSED = new Set();

  window.addEventListener("ACS_FLIGHT_ARRIVAL", (ev) => {
    try {
      const d = ev?.detail;
      if (!d) return;

      const flightId   = String(d.flightId || "").trim();
      const aircraftId = String(d.aircraftId || "").trim();
      const origin     = String(d.origin || "").trim();
      const destination= String(d.destination || "").trim();
      const distanceNM = Number(d.distanceNM || d.distance || 0);

      if (!flightId || PROCESSED.has(flightId)) return;
      PROCESSED.add(flightId);

      // ===== tiempo sim =====
      const simTime =
        (window.ACS_TIME?.currentTime instanceof Date && window.ACS_TIME.currentTime) ||
        new Date();

      // ===== aircraft =====
      const my = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
      const ac = Array.isArray(my)
        ? my.find(x => String(x?.id || "").trim() === aircraftId)
        : null;
      if (!ac) return;

      // ===== PAX =====
      if (!window.ACS_PAX || typeof window.ACS_PAX.getDailyDemand !== "function") return;

      const paxResult = window.ACS_PAX.getDailyDemand({
        route: { origin, destination, distanceNM },
        time:  {
          day: simTime.getUTCDate(),
          month: simTime.getUTCMonth() + 1,
          hour: simTime.getUTCHours(),
          year: simTime.getUTCFullYear()
        },
        aircraft: {
          seats: Number(ac.seats || 0),
          comfortIndex: Number(ac.comfortIndex || 1)
        }
      });

      const pax = Number(paxResult?.pax || 0);
      if (!Number.isFinite(pax) || pax <= 0) return;

      // ===== ticket simple =====
      let ticket = 120;
      if (distanceNM > 3000) ticket = 220;
      else if (distanceNM > 1200) ticket = 150;
      else if (distanceNM > 500)  ticket = 90;

      if (simTime.getUTCFullYear() < 1960) ticket *= 0.6;

      const revenue = Math.round(pax * ticket);
      if (!Number.isFinite(revenue) || revenue <= 0) return;

      // ===== READ FINANCE =====
      let f = {};
      try { f = JSON.parse(localStorage.getItem("ACS_Finance") || "{}"); } catch {}

      f.capital  = Number(f.capital  || 0) + revenue;
      f.revenue  = Number(f.revenue  || 0) + revenue;
      f.expenses = Number(f.expenses || 0);
      f.profit   = Number(f.profit   || 0) + revenue;

      f.income = f.income || {};
      f.income.live_flight  = revenue;
      f.income.route_weekly = Number(f.income.route_weekly || 0) + revenue;

      localStorage.setItem("ACS_Finance", JSON.stringify(f));

      // ===== LOG =====
      let log = [];
      try { log = JSON.parse(localStorage.getItem("ACS_Log") || "[]"); } catch {}
      log.push({
        type: "INCOME",
        source: "AUTO FLIGHT (ECON)",
        amount: revenue,
        flightId,
        route: `${origin} → ${destination}`,
        ts: Date.now()
      });
      localStorage.setItem("ACS_Log", JSON.stringify(log));

      console.log(
        "%c💰 ECON → FINANCE WRITE OK",
        "color:#00ff80;font-weight:bold;",
        { flightId, route: `${origin}→${destination}`, pax, revenue }
      );

    } catch (e) {
      console.error("❌ ECON FINANCE WRITE ERROR", e);
    }
  });

})();

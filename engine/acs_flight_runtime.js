/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — FR24 MODE (MULTI-FLIGHT)
   ------------------------------------------------------------
   Source of truth : scheduleItems
   Time source     : ACS_TIME.minute
   Publishes       : window.ACS_LIVE_FLIGHTS[]
   ============================================================ */

/* ============================================================
   🧩 EXEC FLIGHT SAFE RESOLVER (GLOBAL READ-ONLY)
   ============================================================ */
function getExecFlight() {
  try {
    return JSON.parse(localStorage.getItem("ACS_FLIGHT_EXEC"));
  } catch {
    return null;
  }
}

// 🔓 EXPORT REAL (CRÍTICO)
window.getExecFlight = getExecFlight;

(function () {

  if (typeof registerTimeListener !== "function") {
    console.warn("⛔ ACS Runtime: registerTimeListener not found.");
    return;
  }

  console.log("✈️ ACS Flight Runtime Engine — ACTIVE (FR24 MODE)");

  /* ============================================================
     ✈️ UPDATE WORLD FLIGHTS — FR24 LOOP
     ============================================================ */

  function updateWorldFlights() {

    if (!window.ACS_TIME || typeof ACS_TIME.minute !== "number") return;

    const nowMin = (ACS_TIME.minute + 1440) % 1440;

    let items;
    try {
      items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    } catch {
      items = [];
    }

    if (!Array.isArray(items) || items.length === 0) {
      window.ACS_LIVE_FLIGHTS = [];
      try { localStorage.setItem("ACS_LIVE_FLIGHTS", "[]"); } catch {}
      return;
    }

    const liveFlights = [];

    // --------------------------------------------------------
    // Resolve airports (SkyTrack adapter → WorldAirportsACS)
    // --------------------------------------------------------
    function resolveAirport(icao) {

      if (!icao) return null;

      // 1) SkyTrack adapter
      if (typeof window.getSkyTrackAirportByICAO === "function") {
        const a = window.getSkyTrackAirportByICAO(icao);
        if (a && typeof a.lat === "number" && typeof a.lng === "number") {
          return a;
        }
      }

      // 2) WorldAirportsACS: buscar en el contenedor
      const wa = window.WorldAirportsACS;
      if (!wa) return null;

      const found = Object.values(wa)
        .flat()
        .find(a => a && a.icao === icao);

      return found || null;
    }

    // ============================================================
// 🟦 FASE 7.4-A — FLIGHT QUEUE EXECUTOR (FR24 STYLE)
// ============================================================

const flightsByAircraft = {};
liveFlights.length = 0;

// 1️⃣ Agrupar schedule por aircraft
items.forEach(it => {

  if (!it.aircraftId || typeof it.depMin !== "number") return;

  if (!flightsByAircraft[it.aircraftId]) {
    flightsByAircraft[it.aircraftId] = [];
  }

  // IDA
  if (it.flightNumberOut) {
    flightsByAircraft[it.aircraftId].push({
      aircraftId: it.aircraftId,
      flightNumber: it.flightNumberOut,
      origin: it.origin,
      destination: it.destination,
      depMin: it.depMin,
      arrMin: it.arrMin,
      leg: "OUT"
    });
  }

  // VUELTA
  if (it.flightNumberIn) {
    const turn = it.turnaroundMin || 45;
    const block = it.blockMin || (it.arrMin - it.depMin) || 0;

    flightsByAircraft[it.aircraftId].push({
      aircraftId: it.aircraftId,
      flightNumber: it.flightNumberIn,
      origin: it.destination,
      destination: it.origin,
      depMin: it.depMinReturn ?? (it.arrMin + turn),
      arrMin: it.arrMinReturn ?? (it.arrMin + turn + block),
      leg: "IN"
    });
  }

});

// 2️⃣ Ejecutar SOLO 1 vuelo activo por aircraft
Object.keys(flightsByAircraft).forEach(acId => {

  const queue = flightsByAircraft[acId];
  if (!queue.length) return;

  // Ordenar por hora
  queue.sort((a, b) => a.depMin - b.depMin);

  // Seleccionar vuelo activo o próximo
  let current = queue.find(f =>
    nowMin >= f.depMin && nowMin <= f.arrMin
  );

  if (!current) {
    current = queue.find(f => nowMin < f.depMin) || queue[queue.length - 1];
  }

  if (!current) return;

  // Estado FR24
  let status = "GROUND";
  if (nowMin >= current.depMin && nowMin <= current.arrMin) {
    status = "AIRBORNE";
  } else if (nowMin > current.arrMin) {
    status = "ARRIVED";
  }

  liveFlights.push({
    ...current,
    status
  });

});

    // ----------------------------------------------------------
    // Publish FR24-style live flights
    // ----------------------------------------------------------
    window.ACS_LIVE_FLIGHTS = liveFlights;

    try {
      localStorage.setItem(
        "ACS_LIVE_FLIGHTS",
        JSON.stringify(liveFlights)
      );
    } catch (e) {
      console.warn("ACS_LIVE_FLIGHTS persist failed", e);
    }
  }

  // 🔓 EXPORT
  window.updateWorldFlights = updateWorldFlights;

  // ============================================================
  // 🔒 WAIT FOR WORLD AIRPORTS — HARD GATE
  // ============================================================

  function waitForWorldAirports(cb) {
    try {
      if (window.WorldAirportsACS && Object.keys(window.WorldAirportsACS).length > 0) {
        cb();
        return;
      }
    } catch (e) {}
    setTimeout(() => waitForWorldAirports(cb), 200);
  }

  /* ============================================================
     ⏱ TIME ENGINE HOOK — SINGLE (NO DUPES)
     ============================================================ */

  waitForWorldAirports(() => {
    registerTimeListener(() => {
      if (typeof window.updateWorldFlights === "function") {
        window.updateWorldFlights();
      }
    });
  });

})();

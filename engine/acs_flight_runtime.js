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
// 🟦 FASE 7.5.3 — SELECT ACTIVE FLIGHT PER AIRCRAFT (FR24)
// ============================================================

const queue = window.ACS_FLIGHT_QUEUE || {};
liveFlights.length = 0;

Object.keys(queue).forEach(acId => {

  const flights = queue[acId];
  if (!Array.isArray(flights) || !flights.length) return;

  // ordenar por salida
  flights.sort((a, b) => a.depMin - b.depMin);

  // vuelo activo
  let current = flights.find(f =>
    nowMin >= f.depMin && nowMin <= f.arrMin
  );

  // si no hay activo, próximo
  if (!current) {
    current = flights.find(f => nowMin < f.depMin) || flights[flights.length - 1];
  }

  if (!current) return;

  // estado
  let status = "GROUND";
  if (nowMin >= current.depMin && nowMin <= current.arrMin) {
    status = "AIRBORNE";
  } else if (nowMin > current.arrMin) {
    status = "ARRIVED";
  }

  liveFlights.push({
    aircraftId   : current.aircraftId,
    flightNumber : current.flightNumber,
    origin       : current.origin,
    destination  : current.destination,
    depMin       : current.depMin,
    arrMin       : current.arrMin,
    status       : status,
    updatedAt    : Date.now()
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
   
/* ============================================================
   🟦 FASE 7.5.2 — DAILY FLIGHT QUEUE BUILDER (AUTHORITATIVE)
   ============================================================ */

function buildDailyFlightQueue() {

  const schedule =
    JSON.parse(localStorage.getItem("ACS_SCHEDULE_TABLE") || "[]");

  const queue = {};
  
  schedule.forEach(it => {

    if (!it || !it.aircraftId) return;
    if (typeof it.depMin !== "number" || typeof it.arrMin !== "number") return;

    if (!queue[it.aircraftId]) {
      queue[it.aircraftId] = [];
    }

    queue[it.aircraftId].push({
      aircraftId   : it.aircraftId,
      flightNumber : it.flightNumber || it.flightOut || null,
      origin       : it.origin,
      destination  : it.destination,
      depMin       : it.depMin,
      arrMin       : it.arrMin,
      turnaround   : it.turnaroundMin || it.turnaround || 45
    });

  });

  // Sort flights per aircraft by departure time
  Object.keys(queue).forEach(acId => {
    queue[acId].sort((a, b) => a.depMin - b.depMin);
  });

  window.ACS_FLIGHT_QUEUE = queue;

  console.log(
    "[FASE 7.5.2] DAILY FLIGHT QUEUE BUILT",
    Object.keys(queue)
  );
}
   
// ============================================================
// 🟦 FASE 7.6 — BUILD DAILY FLIGHT QUEUE (BOOT)
// ============================================================

buildDailyFlightQueue();


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

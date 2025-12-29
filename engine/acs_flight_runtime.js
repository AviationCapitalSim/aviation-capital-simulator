/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — SINGLE EXEC MODE
   ------------------------------------------------------------
   Source of truth: ACS_FLIGHT_EXEC 21DEC25
   Time source: ACS_TIME (NO bootstrap, NO override)
   Publishes: ACS_LIVE_FLIGHTS[]
   ============================================================ */

(function () {

  if (typeof registerTimeListener !== "function") {
    console.warn("⛔ ACS Runtime: registerTimeListener not found.");
    return;
  }

  console.log("✈️ ACS Flight Runtime Engine — ACTIVE (EXEC MODE)");

  /* ============================================================
     🔹 UTILS
     ============================================================ */

  function getExecFlight() {
    try {
      return JSON.parse(localStorage.getItem("ACS_FLIGHT_EXEC"));
    } catch {
      return null;
    }
  }

  function getAirportByICAO(icao) {
    if (!icao || !window.WorldAirportsACS) return null;
    return Object.values(WorldAirportsACS)
      .flat()
      .find(a => a.icao === icao) || null;
  }

  function interpolateGC(lat1, lng1, lat2, lng2, t) {
    return {
      lat: lat1 + (lat2 - lat1) * t,
      lng: lng1 + (lng2 - lng1) * t
    };
  }

 /* ============================================================
   🟦 A2 — UPDATE LIVE FLIGHTS (FR24-LIKE + TURNAROUND · SAFE)
   ------------------------------------------------------------
   - 1 marker por aircraftId
   - Respeta turnaround (ground en destino)
   - Usa ACS_ACTIVE_FLIGHTS
   - Fallback EXEC MODE intacto
   ============================================================ */
function updateLiveFlights() {

  const nowMin = window.ACS_TIME?.minute;
  if (typeof nowMin !== "number") {
    window.ACS_LIVE_FLIGHTS = [];
    return;
  }

  let flights = [];

  // ============================================================
  // 🟢 PRIMARY SOURCE — MULTI FLIGHT
  // ============================================================
  try {
    const raw = localStorage.getItem("ACS_ACTIVE_FLIGHTS");
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr) && arr.length > 0) flights = arr;
  } catch {}

  // ============================================================
  // 🟡 FALLBACK — LEGACY EXEC MODE
  // ============================================================
  if (flights.length === 0) {
    try {
      const exec = JSON.parse(localStorage.getItem("ACS_FLIGHT_EXEC"));
      if (!exec) throw 0;
      flights = [{
        flightId: "LEGACY",
        aircraftId: exec.aircraftId || "AC",
        origin: exec.origin,
        destination: exec.destination,
        depMin: exec.depMin,
        arrMin: exec.arrMin
      }];
    } catch {
      window.ACS_LIVE_FLIGHTS = [];
      return;
    }
  }

  // ============================================================
  // 🧠 GROUP BY AIRCRAFT
  // ============================================================
  const byAircraft = {};
  flights.forEach(f => {
    if (!f?.aircraftId) return;
    if (!byAircraft[f.aircraftId]) byAircraft[f.aircraftId] = [];
    byAircraft[f.aircraftId].push(f);
  });

  const liveFlights = [];

  // ============================================================
  // ✈️ PROCESS EACH AIRCRAFT (WITH TURNAROUND)
  // ============================================================
  Object.keys(byAircraft).forEach(aircraftId => {

    const list = byAircraft[aircraftId]
      .slice()
      .sort((a, b) => a.depMin - b.depMin);

    let activeFlight = null;
    let lastArrived = null;
    let nextFlight = null;

    list.forEach(f => {
      if (nowMin >= f.depMin && nowMin <= f.arrMin) {
        activeFlight = f;
      }
      if (f.arrMin < nowMin) {
        lastArrived = f;
      }
      if (f.depMin > nowMin && !nextFlight) {
        nextFlight = f;
      }
    });

    let refFlight = activeFlight || lastArrived || nextFlight;
    if (!refFlight) return;

    const o = getSkyTrackAirportByICAO(refFlight.origin);
    const d = getSkyTrackAirportByICAO(refFlight.destination);
    if (!o || !d) return;

    let lat, lng, status, progress = 0;

    // ✈️ EN RUTA
    if (activeFlight) {
      progress = (nowMin - activeFlight.depMin) /
                 (activeFlight.arrMin - activeFlight.depMin);
      progress = Math.min(Math.max(progress, 0), 1);

      const pos = interpolateGC(o.lat, o.lng, d.lat, d.lng, progress);
      lat = pos.lat;
      lng = pos.lng;
      status = "enroute";

    // 🛬 TURNAROUND — EN TIERRA EN DESTINO
    } else if (lastArrived) {
      lat = d.lat;
      lng = d.lng;
      status = "ground";
      progress = 1;

    // 🛫 AÚN NO SALE — EN TIERRA EN ORIGEN
    } else {
      lat = o.lat;
      lng = o.lng;
      status = "ground";
      progress = 0;
    }

// ============================================================
// 🧾 USER VISIBLE FLIGHT LABEL (NO INTERNAL IDS)
// ============================================================

const userFlightLabel =
  refFlight.flightOut ||
  refFlight.flightNumber ||
  refFlight.routeCode ||
  aircraftId;

// ============================================================
// ✈️ PUBLISH ONE AIRCRAFT STATE
// ============================================================

liveFlights.push({
  aircraftId,
  flightOut: userFlightLabel,   // 👈 SOLO LO QUE VE EL USUARIO
  origin: refFlight.origin,
  destination: refFlight.destination,
  depMin: refFlight.depMin,
  arrMin: refFlight.arrMin,
  lat,
  lng,
  progress,
  status
});

  // ============================================================
  // 🔒 PUBLISH
  // ============================================================
  window.ACS_LIVE_FLIGHTS = liveFlights;
  localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
}
   
// ============================================================
// 🔒 WAIT FOR WORLD AIRPORTS — HARD GATE
// ============================================================

function waitForWorldAirports(cb) {
  if (window.WorldAirportsACS && Object.keys(WorldAirportsACS).length > 0) {
    cb();
  } else {
    setTimeout(() => waitForWorldAirports(cb), 200);
  }
}
   
/* ============================================================
   ⏱ TIME ENGINE HOOK
   ============================================================ */

waitForWorldAirports(() => {
  registerTimeListener(updateLiveFlights);
  console.log("🌍 WorldAirportsACS ready — Flight runtime armed");
});

})();

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
   🟥 C2 — UPDATE LIVE FLIGHTS (STABLE · MULTI AIRCRAFT + LABEL)
   ------------------------------------------------------------
   - 1 marker por aircraftId (2 hoy, 1000 mañana)
   - En vuelo si nowMin está entre depMin/arrMin
   - En tierra (turnaround) si ya llegó y no ha salido el próximo
   - NUNCA muestra IDs internos (block- / flightId)
   - Publica FUERA del loop (no rompe el archivo)
   ============================================================ */
function updateLiveFlights() {

  const nowMin = window.ACS_TIME?.minute;
  if (typeof nowMin !== "number") {
    window.ACS_LIVE_FLIGHTS = [];
    localStorage.setItem("ACS_LIVE_FLIGHTS", "[]");
    return;
  }

  // 1) Fuente primaria: ACS_ACTIVE_FLIGHTS (bridge)
  let flights = [];
  try {
    const raw = localStorage.getItem("ACS_ACTIVE_FLIGHTS");
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr) && arr.length > 0) flights = arr;
  } catch {}

  // 2) Fallback: EXEC MODE (legacy)
  if (flights.length === 0) {
    try {
      const exec = JSON.parse(localStorage.getItem("ACS_FLIGHT_EXEC"));
      if (!exec) throw 0;

      flights = [{
        flightId: "LEGACY",
        aircraftId: exec.aircraftId || "AC",
        flightOut: exec.flightOut || exec.flightNumber || exec.routeCode || "",
        flightNumber: exec.flightNumber || "",
        routeCode: exec.routeCode || "",
        origin: exec.origin,
        destination: exec.destination,
        depMin: exec.depMin,
        arrMin: exec.arrMin
      }];
    } catch {
      window.ACS_LIVE_FLIGHTS = [];
      localStorage.setItem("ACS_LIVE_FLIGHTS", "[]");
      return;
    }
  }

  // Agrupar por avión
  const byAircraft = {};
  flights.forEach(f => {
    if (!f || !f.aircraftId) return;
    if (typeof f.depMin !== "number" || typeof f.arrMin !== "number") return;
    if (!f.origin || !f.destination) return;

    if (!byAircraft[f.aircraftId]) byAircraft[f.aircraftId] = [];
    byAircraft[f.aircraftId].push(f);
  });

  const liveFlights = [];

  Object.keys(byAircraft).forEach(aircraftId => {

    const list = byAircraft[aircraftId].slice().sort((a, b) => a.depMin - b.depMin);

    // vuelo activo (en ruta)
    const activeFlight = list.find(f => nowMin >= f.depMin && nowMin <= f.arrMin) || null;

    // último completado
    const lastArrived = list
      .filter(f => f.arrMin < nowMin)
      .sort((a, b) => b.arrMin - a.arrMin)[0] || null;

    // próximo vuelo
    const nextFlight = list
      .filter(f => f.depMin > nowMin)
      .sort((a, b) => a.depMin - b.depMin)[0] || null;

    const refFlight = activeFlight || lastArrived || nextFlight;
    if (!refFlight) return;

    const o = getSkyTrackAirportByICAO(refFlight.origin);
    const d = getSkyTrackAirportByICAO(refFlight.destination);
    if (!o || !d) return;

    // Estado y posición
    let lat = o.lat;
    let lng = o.lng;
    let status = "ground";
    let progress = 0;

    if (activeFlight) {
      // ✈️ EN RUTA
      const denom = (activeFlight.arrMin - activeFlight.depMin);
      if (denom > 0) {
        progress = (nowMin - activeFlight.depMin) / denom;
        progress = Math.min(Math.max(progress, 0), 1);
      } else {
        progress = 0;
      }

      const pos = interpolateGC(o.lat, o.lng, d.lat, d.lng, progress);
      lat = pos.lat;
      lng = pos.lng;
      status = "enroute";

    } else if (lastArrived) {
      // 🛬 TURNAROUND (EN TIERRA EN DESTINO)
      lat = d.lat;
      lng = d.lng;
      status = "ground";
      progress = 1;

    } else {
      // 🛫 AÚN NO SALE (EN TIERRA EN ORIGEN)
      lat = o.lat;
      lng = o.lng;
      status = "ground";
      progress = 0;
    }

    // ✅ Label USUARIO (no IDs internos)
    const userFlightLabel =
      refFlight.flightOut ||
      refFlight.flightNumber ||
      refFlight.routeCode ||
      aircraftId;

    liveFlights.push({
      aircraftId,
      flightOut: userFlightLabel,
      origin: refFlight.origin,
      destination: refFlight.destination,
      depMin: refFlight.depMin,
      arrMin: refFlight.arrMin,
      lat,
      lng,
      progress,
      status
    });

  });

  // 🔒 Publish (FUERA del loop)
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

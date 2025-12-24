/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — SINGLE EXEC MODE
   ------------------------------------------------------------
   Source of truth: ACS_FLIGHT_EXEC 20DEC25
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
   
/* ============================================================
   🆕 MULTI-FLIGHT SUPPORT — ACTIVE FLIGHTS ARRAY
   ============================================================ */

function getActiveFlights() {
  try {
    const raw = localStorage.getItem("ACS_ACTIVE_FLIGHTS");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveActiveFlights(flights) {
  if (!Array.isArray(flights)) return;
  localStorage.setItem("ACS_ACTIVE_FLIGHTS", JSON.stringify(flights));
   
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
   ✈️ ACS — UPDATE LIVE FLIGHTS (MULTI AIRCRAFT ENGINE)
   ============================================================ */

function updateLiveFlights() {

  const nowMin = window.ACS_TIME?.minute;
  if (typeof nowMin !== "number") return;

  // 🔹 Fuente ÚNICA de verdad
  let activeFlights = [];
  try {
    activeFlights = JSON.parse(localStorage.getItem("ACS_ACTIVE_FLIGHTS") || "[]");
  } catch {
    activeFlights = [];
  }

  const liveFlights = [];

  activeFlights.forEach(f => {

    if (
      typeof f.depMin !== "number" ||
      typeof f.arrMin !== "number" ||
      !f.origin ||
      !f.destination
    ) {
      return;
    }

    const origin = getSkyTrackAirportByICAO(f.origin);
    const dest   = getSkyTrackAirportByICAO(f.destination);

    if (!origin || !dest) return;

    let status   = "ground";
    let progress = 0;
    let lat      = origin.lat;
    let lng      = origin.lng;

    // 🟦 EN TIERRA (ANTES DE DEP)
    if (nowMin < f.depMin) {
      status = "ground";
    }

    // 🟨 EN RUTA
    else if (nowMin >= f.depMin && nowMin <= f.arrMin) {

      status = "enroute";
      progress = (nowMin - f.depMin) / (f.arrMin - f.depMin);
      progress = Math.min(Math.max(progress, 0), 1);

      const pos = interpolateGC(
        origin.lat,
        origin.lng,
        dest.lat,
        dest.lng,
        progress
      );

      lat = pos.lat;
      lng = pos.lng;
    }

    // 🟥 ARRIBADO
    else if (nowMin > f.arrMin) {
      status = "arrived";
      lat = dest.lat;
      lng = dest.lng;
      progress = 1;
    }

    // 🔁 ACTUALIZAR ESTADO PERSISTENTE
    f.status   = status;
    f.progress = progress;
    f.lat      = lat;
    f.lng      = lng;

    liveFlights.push({
      aircraftId: f.aircraftId || "",
      flightOut:  f.flightOut  || "",
      origin:     f.origin,
      destination: f.destination,
      depMin:     f.depMin,
      arrMin:     f.arrMin,
      status,
      progress,
      lat,
      lng
    });
  });

  // 🔒 PUBLICAR SIEMPRE
  window.ACS_LIVE_FLIGHTS = liveFlights;
  localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
  localStorage.setItem("ACS_ACTIVE_FLIGHTS", JSON.stringify(activeFlights));
}

/* ============================================================
   🔁 RETURN FLIGHT GENERATOR — MULTI AIRCRAFT
   ============================================================ */

function generateReturnFlights() {

  const TURNAROUND_MIN = 50;

  const activeFlights = getActiveFlights();
  let changed = false;

  activeFlights.forEach(flight => {

    // Solo vuelos completados de ida
    if (
      flight.completed !== true ||
      flight.leg === "return" ||
      flight.returnGenerated === true
    ) {
      return;
    }

    // Crear vuelo de retorno
    const returnFlight = {
      aircraftId: flight.aircraftId,
      flightOut: (flight.flightOut || "") + "R",
      origin: flight.destination,
      destination: flight.origin,
      depMin: flight.arrMin + TURNAROUND_MIN,
      arrMin: flight.arrMin + TURNAROUND_MIN + (flight.arrMin - flight.depMin),
      leg: "return",
      status: "ground",
      started: false,
      completed: false,
      returnGenerated: false
    };

    flight.returnGenerated = true;
    activeFlights.push(returnFlight);
    changed = true;

    console.log("🔁 Return flight generated:", returnFlight);
  });

  if (changed) {
    saveActiveFlights(activeFlights);
  }
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
  registerTimeListener(() => {
    updateLiveFlights();
    generateReturnFlights();
  });
  console.log("🌍 WorldAirportsACS ready — Flight runtime armed");
});

})();

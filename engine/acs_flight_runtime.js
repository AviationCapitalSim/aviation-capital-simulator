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
   ✈️ RUNTIME LOOP — 3 PHASES (GROUND / AIR / DESTINATION)
   ============================================================ */

function updateLiveFlights() {

  const nowMin = window.ACS_TIME?.minute;
  if (typeof nowMin !== "number") return;

  const activeFlights = getActiveFlights();
  const liveFlights = [];

  activeFlights.forEach(flight => {

    if (flight.completed) return;

    // --------------------------------------------------------
    // ✈️ START FLIGHT (ONE TIME ONLY)
    // --------------------------------------------------------
    if (!flight.started && nowMin >= flight.depMin) {
      flight.started = true;
      flight.status = "enroute";
      flight.startedAt = nowMin;
    }

    const origin = getSkyTrackAirportByICAO(flight.origin);
    const dest   = getSkyTrackAirportByICAO(flight.destination);
    if (!origin || !dest) return;

    let progress = 0;
    let lat = origin.lat;
    let lng = origin.lng;
    let status = "ground";

    // --------------------------------------------------------
    // 🛫 GROUND
    // --------------------------------------------------------
    if (!flight.started) {
      status = "ground";
    }

    // --------------------------------------------------------
    // ✈️ ENROUTE
    // --------------------------------------------------------
    else {
      progress = Math.min(
        1,
        Math.max(
          0,
          (nowMin - flight.depMin) / (flight.arrMin - flight.depMin)
        )
      );

      const pos = interpolateGC(
        origin.lat,
        origin.lng,
        dest.lat,
        dest.lng,
        progress
      );

      lat = pos.lat;
      lng = pos.lng;
      status = "enroute";

      // --------------------------------------------------------
      // 🛬 ARRIVED
      // --------------------------------------------------------
      if (progress >= 1) {
        status = "arrived";
        flight.completed = true;
      }
    }

    flight.status = status;

    liveFlights.push({
      aircraftId: flight.aircraftId,
      flightOut: flight.flightOut,
      origin: flight.origin,
      destination: flight.destination,
      depMin: flight.depMin,
      arrMin: flight.arrMin,
      progress,
      lat,
      lng,
      status
    });

  });

  // --------------------------------------------------------
  // 🔒 PERSIST + PUBLISH
  // --------------------------------------------------------
  saveActiveFlights(activeFlights);

  window.ACS_LIVE_FLIGHTS = liveFlights;
  localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
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

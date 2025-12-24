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
   🟦 PASO 3.1 — GLOBAL FLIGHT STATE (PERSISTENT WORLD)
   ============================================================ */

const FLIGHT_STATE_KEY = "ACS_FLIGHT_STATE";

function getFlightState() {
  try {
    const raw = localStorage.getItem(FLIGHT_STATE_KEY);
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveFlightState(arr) {
  if (!Array.isArray(arr)) return;
  localStorage.setItem(FLIGHT_STATE_KEY, JSON.stringify(arr));
}

function getOrCreateAircraftState(aircraftId, baseAirport = null) {
  const state = getFlightState();
  let ac = state.find(a => a.aircraftId === aircraftId);

  if (!ac) {
    ac = {
      aircraftId,
      status: "GROUND",
      airport: baseAirport,
      route: null,
      depMin: null,
      arrMin: null,
      lat: null,
      lng: null,
      lastUpdateMin: null
    };
    state.push(ac);
    saveFlightState(state);
  }

  return ac;
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
   🟦 PASO 3.1.5 — INITIALIZE AIRCRAFT ON GROUND (BOOTSTRAP)
   ------------------------------------------------------------
   - Garantiza que TODOS los aviones existen en el mundo
   - Estado inicial = GROUND
   - Base = último aeropuerto conocido o base asignada
   ============================================================ */

function bootstrapGroundAircraft() {
  try {
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    if (!Array.isArray(fleet) || !fleet.length) return;

    const state = getFlightState();
    let changed = false;

    fleet.forEach(ac => {
      if (!ac.id) return;

      let existing = state.find(s => s.aircraftId === ac.id);
      if (existing) return;

      // Determinar aeropuerto base
      const base =
        ac.baseAirport ||
        ac.currentAirport ||
        ac.homeBase ||
        ac.base ||
        null;

      state.push({
        aircraftId: ac.id,
        status: "GROUND",
        airport: base,
        route: null,
        depMin: null,
        arrMin: null,
        lat: null,
        lng: null,
        lastUpdateMin: null
      });

      changed = true;
    });

    if (changed) {
      saveFlightState(state);
      console.log("🛬 Ground aircraft bootstrapped:", state.length);
    }

  } catch (e) {
    console.warn("⚠ bootstrapGroundAircraft error:", e);
  }
}
   
/* ============================================================
   🟦 PASO 3.2 — UPDATE WORLD (GROUND / AIRBORNE / TURNAROUND)
   ============================================================ */

function updateWorldFlights() {

  const nowMin = window.ACS_TIME?.minute;
  if (typeof nowMin !== "number") return;

  const flights = getActiveFlights();   // planes programados (ida / vuelta)
  const state   = getFlightState();
  const live    = [];

  flights.forEach(f => {

    const ac = getOrCreateAircraftState(f.aircraftId, f.origin);

    // BEFORE DEPARTURE — GROUND
    if (nowMin < f.depMin) {
      ac.status  = "GROUND";
      ac.airport = f.origin;
      ac.lat     = null;
      ac.lng     = null;
    }

    // ENROUTE
    else if (nowMin >= f.depMin && nowMin <= f.arrMin) {

      const origin = getSkyTrackAirportByICAO(f.origin);
      const dest   = getSkyTrackAirportByICAO(f.destination);
      if (!origin || !dest) return;

      const progress = Math.min(
        Math.max((nowMin - f.depMin) / (f.arrMin - f.depMin), 0),
        1
      );

      const pos = interpolateGC(
        origin.lat, origin.lng,
        dest.lat,   dest.lng,
        progress
      );

      ac.status = "AIRBORNE";
      ac.route  = { origin: f.origin, destination: f.destination };
      ac.depMin = f.depMin;
      ac.arrMin = f.arrMin;
      ac.lat    = pos.lat;
      ac.lng    = pos.lng;

      live.push({
        aircraftId: f.aircraftId,
        status: "AIRBORNE",
        lat: pos.lat,
        lng: pos.lng,
        progress
      });
    }

    // ARRIVED — TURNAROUND
    else if (nowMin > f.arrMin) {
      ac.status  = "TURNAROUND";
      ac.airport = f.destination;
      ac.lat     = null;
      ac.lng     = null;
    }

    ac.lastUpdateMin = nowMin;
  });

  saveFlightState(state);

  // 🔒 PUBLIC OUTPUT (SkyTrack)
  window.ACS_LIVE_FLIGHTS = live;
  localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(live));
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
   🟦 PASO 3.3 — TIME ENGINE HOOK (WORLD ONLY)
   ============================================================ */

waitForWorldAirports(() => {
  registerTimeListener(() => {
    updateWorldFlights();
    generateReturnFlights();
  });
  console.log("🌍 ACS World Runtime ACTIVE (24/7)");
});

})();

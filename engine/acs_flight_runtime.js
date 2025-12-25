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
   🟦 PASO 3.6.3 — TIME HELPERS (RUNTIME LOCAL)
   ------------------------------------------------------------
   - NO depende de Schedule Table
   - Fuente única: strings HH:mm
   ============================================================ */

function toMin(hhmm) {
  if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) {
    return null;
  }
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function toHHMM(min) {
  if (!Number.isFinite(min)) return "00:00";
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
   
/* ============================================================
   🟦 PASO 3.7.1 — WEEK DAY OFFSET (RUNTIME)
   ============================================================ */

const WEEK_DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

function getWeekOffsetMin(flightDayKey, nowDayIndex) {
  const flightDayIndex = WEEK_DAYS.indexOf(flightDayKey);
  if (flightDayIndex < 0) return 0;

  let delta = flightDayIndex - nowDayIndex;
  if (delta < 0) delta += 7;

  return delta * 1440; // minutos
}
   
/* ============================================================
   🟦 PASO 3.6.1 / 3.7 — BUILD FLIGHTS FROM SCHEDULE (SAFE)
   ============================================================ */

function buildFlightsFromSchedule() {
  try {
    const items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    if (!Array.isArray(items) || !items.length) return [];

    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const now = window.ACS_TIME?.currentTime;
    if (!now) return [];

    const nowDayIndex = now.getDay();
    const flights = [];

    items.forEach(it => {
      if (it.type !== "flight") return;
      if (!it.aircraftId) return;
      if (!it.departure || !it.arrival) return;

      const baseDep = toMin(it.departure);
      const baseArr = toMin(it.arrival);
      if (baseDep == null || baseArr == null) return;

      /* ============================================================
   🟦 PASO 3.9 — DAILY FLIGHT NORMALIZATION (FR24 MODE)
   ============================================================ */

      // Forzar que el vuelo exista HOY
      const dayOffset = 0;(it.day, nowDayIndex);

      const depMin = baseDep + dayOffset;
      const arrMin = baseArr + dayOffset;

      const acReal = fleet.find(a => a.id === it.aircraftId);

      flights.push({
        // 🔑 Internal
        aircraftId: it.aircraftId,

        // ✈️ Display
        aircraftModel:
          acReal?.model ||
          acReal?.type ||
          acReal?.family ||
          "Unknown Aircraft",

        // ✈️ Flight numbers
        flightNumberOut: it.flightNumberOut || "",
        flightNumberIn: it.flightNumberIn || "",
        label: `${it.flightNumberOut || ""} / ${it.flightNumberIn || ""}`.trim(),

        // 🌍 Route
        origin: it.origin,
        destination: it.destination,

        // ⏱ Schedule
        depMin,
        arrMin,

        // 📅 Planning
        day: it.day,
        leg: "outbound"
      });
    });

    return flights;

  } catch (e) {
    console.warn("⚠ buildFlightsFromSchedule error:", e);
    return [];
  }
}

/* ============================================================
   🟦 PASO 3.2 — UPDATE WORLD (GROUND / AIRBORNE / TURNAROUND)
   ============================================================ */

function updateWorldFlights() {

  const nowMin = window.ACS_TIME?.minute;
  if (typeof nowMin !== "number") return;

  const flights = buildFlightsFromSchedule();
  const state   = getFlightState();
  const live    = [];

  // 🗺 Airport index (rápido)
  const airportIndex = {};
  Object.values(WorldAirportsACS || {})
    .flat()
    .forEach(a => airportIndex[a.icao] = a);

  flights.forEach(f => {

    const ac = getOrCreateAircraftState(f.aircraftId, f.origin);

    // 🧠 Enriquecer metadata del avión (una sola vez)
    if (!ac.meta) {
      const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
      const real = fleet.find(x => x.id === f.aircraftId);

      if (real) {
        ac.meta = {
          model: real.model || real.type || "Unknown",
          displayName: real.model || real.type || "Aircraft"
        };
      }
    }

    let lat = null;
    let lng = null;
    let status = ac.status;

    // BEFORE DEPARTURE — GROUND
    if (nowMin < f.depMin) {
      status     = "GROUND";
      ac.status  = "GROUND";
      ac.airport = f.origin;
    }

    // ENROUTE
    else if (nowMin >= f.depMin && nowMin <= f.arrMin) {

      const origin = airportIndex[f.origin];
      const dest   = airportIndex[f.destination];
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

      status     = "AIRBORNE";
      ac.status  = "AIRBORNE";
      ac.route   = { origin: f.origin, destination: f.destination };
      ac.depMin  = f.depMin;
      ac.arrMin  = f.arrMin;
      ac.lat     = pos.lat;
      ac.lng     = pos.lng;

      lat = pos.lat;
      lng = pos.lng;
    }

    // ARRIVED — TURNAROUND
    else if (nowMin > f.arrMin) {
      status     = "TURNAROUND";
      ac.status  = "TURNAROUND";
      ac.airport = f.destination;
    }

    // 📍 Posición para GROUND / TURNAROUND
    if ((status === "GROUND" || status === "TURNAROUND") && ac.airport) {
      const ap = airportIndex[ac.airport];
      if (ap) {
        lat = ap.lat;
        lng = ap.lng;
      }
    }

    ac.lastUpdateMin = nowMin;

    // 🔒 PUBLICAR SIEMPRE (FR24 MODE)
    if (lat != null && lng != null) {
      live.push({
        aircraftId: f.aircraftId,              // interno
        aircraftModel: ac.meta?.displayName || ac.meta?.model || "Aircraft",
        status,
        origin: f.origin,
        destination: f.destination,
        lat,
        lng
      });
    }

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
   
/* ============================================================
   🟦 PASO 3.1.6 — BOOTSTRAP WORLD (INSIDE RUNTIME)
   ============================================================ */

// Inicializar aviones en tierra UNA SOLA VEZ
bootstrapGroundAircraft();
   
/* ============================================================
   🟦 PASO 3.8 — RUNTIME UPDATE LOOP (TIME ENGINE HOOK)
   ============================================================ */

if (typeof registerTimeListener === "function") {
  registerTimeListener(() => {
    updateWorldFlights();
  });
} else {
  console.warn("⚠ registerTimeListener not available for flight runtime");
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

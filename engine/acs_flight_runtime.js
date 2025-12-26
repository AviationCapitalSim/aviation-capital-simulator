/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — SINGLE EXEC MODE
   ------------------------------------------------------------
   Source of truth: scheduleItems + ACS_MyAircraft
   Time source: ACS_TIME
   Publishes: ACS_LIVE_FLIGHTS[]  (AIR + GROUND + TURNAROUND)
   Persists:  ACS_FLIGHT_STATE[] (world state)
   ============================================================ */

/* ============================================================
   🚀 ACS FLIGHT RUNTIME — IIFE WRAPPER
   ============================================================ */

(() => {
  "use strict";

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
        lastUpdateMin: null,
        meta: null
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
   🟧 A4 — BOOTSTRAP GROUND AIRCRAFT (ID SAFE)
   ============================================================ */

function bootstrapGroundAircraft() {
  const baseICAO = localStorage.getItem("ACS_baseICAO") || null;

  let fleet = [];
  try {
    fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft")) || [];
  } catch {
    fleet = [];
  }

  if (!Array.isArray(fleet) || fleet.length === 0) return;

  const state = getFlightState();
  let changed = false;

  fleet.forEach(ac => {
    const acId = ac?.id || ac?.aircraftId || ac?.aircraftID;
    if (!acId) return;

    const exists = state.some(s => s && s.aircraftId === acId);
    if (exists) return;

    state.push({
      aircraftId: acId,
      status: "GROUND",
      airport: ac?.baseAirport || baseICAO,
      route: null,
      depMin: null,
      arrMin: null,
      lat: null,
      lng: null,
      lastUpdateMin: null,
      meta: { source: "bootstrap" }
    });

    changed = true;
  });

  if (changed) {
    saveFlightState(state);
    console.log("🛬 Bootstrapped ground aircraft from MyAircraft:", fleet.length);
  }
}

  // Exponer (debug/manual)
  window.bootstrapGroundAircraft = bootstrapGroundAircraft;

  /* ============================================================
     🟦 PASO 3.6.3 — TIME HELPERS (RUNTIME LOCAL)
     ============================================================ */

  function toMin(hhmm) {
    if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return null;
    const [h, m] = hhmm.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  function toHHMM(min) {
    if (!Number.isFinite(min)) return "00:00";
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  /* ============================================================
     🟦 PASO 3.7.1 — WEEK DAY OFFSET (RUNTIME)
     ============================================================ */

  const WEEK_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  function getWeekOffsetMin(flightDayKey, nowDayIndex) {
    const flightDayIndex = WEEK_DAYS.indexOf(flightDayKey);
    if (flightDayIndex < 0) return 0;

    let delta = flightDayIndex - nowDayIndex;
    if (delta < 0) delta += 7;

    return delta * 1440;
  }

  /* ============================================================
   🟧 A5.1 — BUILD FLIGHTS FROM SCHEDULE (ABSOLUTE WEEK TIME)
   ------------------------------------------------------------
   - Genera vuelos SIEMPRE (pasados, activos y futuros)
   - Ancla cada vuelo a un minuto absoluto de la semana
   - El runtime decide estado (GROUND / ENROUTE / ARRIVED)
   ============================================================ */

function buildFlightsFromSchedule() {

  const schedule = JSON.parse(localStorage.getItem("scheduleItems")) || [];
  const baseICAO = localStorage.getItem("ACS_baseICAO");
  const flights = [];

  if (!baseICAO || !Array.isArray(schedule)) return flights;

  // HH:MM → minutos del día
  function toMin(hhmm) {
    if (!hhmm || typeof hhmm !== "string") return null;
    const [h, m] = hhmm.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // Día → índice semanal
  const dayIndex = {
    mon: 0,
    tue: 1,
    wed: 2,
    thu: 3,
    fri: 4,
    sat: 5,
    sun: 6
  };

  schedule.forEach(item => {

    if (item.type !== "flight") return;
    if (!item.aircraftId) return;

    const depLocalMin = toMin(item.departure);
    const arrLocalMin = toMin(item.arrival);
    if (depLocalMin === null || arrLocalMin === null) return;

    // Duración (permite cruces de medianoche)
    let durationMin = arrLocalMin - depLocalMin;
    if (durationMin <= 0) durationMin += 1440;

    const days = Array.isArray(item.days) && item.days.length > 0
      ? item.days
      : [null];

    // 🔁 Genera UN vuelo por cada día programado
    days.forEach(day => {

      const dayOffset =
        day && dayIndex[day] !== undefined
          ? dayIndex[day] * 1440
          : 0;

      const depMin = depLocalMin + dayOffset;
      const arrMin = depMin + durationMin;

      flights.push({
        id: item.id || crypto.randomUUID(),
        aircraftId: item.aircraftId,

        flightOut: item.flightOut || item.flightNumber || item.code || null,
        aircraftType: item.aircraftType || item.model || null,

        origin: item.origin || baseICAO,
        destination: item.destination,

        depMin,   // ⏱ minuto absoluto semana
        arrMin,   // ⏱ minuto absoluto semana

        days: Array.isArray(item.days) ? item.days : null,

        status: "ground",
        started: false,
        completed: false,
        leg: "outbound",
        source: "schedule"
      });
    });
  });

  return flights;
}

  /* ============================================================
   🟦 PASO 4.2 — UPDATE WORLD FLIGHTS (FR24 BEHAVIOR)
   ------------------------------------------------------------
   - LOS AVIONES SIEMPRE EXISTEN (como FlightRadar24)
   - El schedule SOLO define el estado (GROUND / ENROUTE)
   - Nunca deja el mapa vacío
   ============================================================ */

function updateWorldFlights() {

  const nowMin = window.ACS_TIME?.absoluteMinute;
  const today  = window.ACS_TIME?.day;
  if (typeof nowMin !== "number") return;

  const flights = buildFlightsFromSchedule();
  const state   = getFlightState();
  const live    = [];

  // ===============================
  // Índice rápido de aeropuertos
  // ===============================
  const airportIndex = {};
  if (window.WorldAirportsACS) {
    Object.values(WorldAirportsACS).flat().forEach(ap => {
      if (ap.icao) airportIndex[ap.icao] = ap;
    });
  }

  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  // ============================================================
  // 🚨 REGLA FR24: SIEMPRE ITERAMOS AVIONES, NO VUELOS
  // ============================================================

  state.forEach(ac => {

    let lat = null;
    let lng = null;
    let status = "GROUND";
    let activeFlight = null;

    // =====================================
    // ✈️ ¿TIENE VUELO ACTIVO AHORA?
    // =====================================
    activeFlight = flights.find(fl => {

      if (fl.aircraftId !== ac.aircraftId) return false;

      if (Array.isArray(fl.days) && fl.days.length > 0) {
        if (!today || !fl.days.includes(today)) return false;
      }

      return nowMin >= fl.depMin && nowMin <= fl.arrMin;
    });

    // =====================================
    // ✈️ EN RUTA (si corresponde)
    // =====================================
    if (activeFlight) {

      const o = airportIndex[activeFlight.origin];
      const d = airportIndex[activeFlight.destination];

      if (
        o && d &&
        Number.isFinite(o.latitude) &&
        Number.isFinite(o.longitude) &&
        Number.isFinite(d.latitude) &&
        Number.isFinite(d.longitude)
      ) {
        const progress = Math.min(
          Math.max((nowMin - activeFlight.depMin) /
                   (activeFlight.arrMin - activeFlight.depMin), 0),
          1
        );

        const pos = interpolateGC(
          o.latitude, o.longitude,
          d.latitude, d.longitude,
          progress
        );

        lat = pos.lat;
        lng = pos.lng;
        status = "AIRBORNE";
      }
    }

    // =====================================
    // 🛬 EN TIERRA (SIEMPRE, SI NO VUELA)
    // =====================================
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {

      const real = fleet.find(x => x.id === ac.aircraftId);

      const baseIcao =
        ac.airport ||
        real?.currentAirport ||
        real?.baseAirport ||
        real?.homeBase ||
        localStorage.getItem("ACS_baseICAO");

      const ap = airportIndex[baseIcao];

      if (ap && Number.isFinite(ap.latitude) && Number.isFinite(ap.longitude)) {
        lat = ap.latitude;
        lng = ap.longitude;
        status = "GROUND";
        ac.airport = baseIcao;
      }
    }

    // =====================================
    // 📡 PUBLICAR — SIEMPRE
    // =====================================
    if (Number.isFinite(lat) && Number.isFinite(lng)) {

      let aircraftType = null;

      if (activeFlight && activeFlight.aircraftType) {
        aircraftType = activeFlight.aircraftType;
      } else {
        const real = fleet.find(x => x.id === ac.aircraftId);
        if (real && real.model) aircraftType = real.model;
      }

      live.push({
        aircraftId: ac.aircraftId,
        flightOut: activeFlight?.flightOut || null,
        aircraftType: aircraftType || "UNKNOWN",

        status:
          status === "AIRBORNE" ? "enroute" :
          "ground",

        airport: ac.airport || null,

        origin:      activeFlight ? activeFlight.origin      : null,
        destination: activeFlight ? activeFlight.destination : null,
        depMin:      activeFlight ? activeFlight.depMin      : null,
        arrMin:      activeFlight ? activeFlight.arrMin      : null,

        lat,
        lng,
        updatedMin: nowMin
      });
    }
  });

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
      if (
        flight.completed !== true ||
        flight.leg === "return" ||
        flight.returnGenerated === true
      ) return;

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

    if (changed) saveActiveFlights(activeFlights);
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
   🟧 A1 — SEED FLIGHT STATE FROM SCHEDULE (24/7)
   - Garantiza que SIEMPRE haya aviones en tierra si hay vuelos
   - Crea ACS_FLIGHT_STATE aunque MyAircraft no esté disponible
   ============================================================ */

function seedFlightStateFromSchedule() {
  const baseICAO = localStorage.getItem("ACS_baseICAO") || null;

  let schedule = [];
  try {
    schedule = JSON.parse(localStorage.getItem("scheduleItems")) || [];
  } catch {
    schedule = [];
  }

  if (!Array.isArray(schedule) || schedule.length === 0) return;

  // AircraftIds únicos SOLO de vuelos
  const ids = Array.from(
    new Set(
      schedule
        .filter(it => it && it.type === "flight" && it.aircraftId)
        .map(it => it.aircraftId)
    )
  );

  if (ids.length === 0) return;

  const state = getFlightState(); // (tu función existente)
  let changed = false;

  ids.forEach(id => {
    const exists = state.some(s => s && s.aircraftId === id);
    if (!exists) {
      state.push({
        aircraftId: id,
        status: "GROUND",
        airport: baseICAO,
        route: null,
        depMin: null,
        arrMin: null,
        lat: null,
        lng: null,
        lastUpdateMin: null,
        meta: null
      });
      changed = true;
    }
  });

  if (changed) {
    saveFlightState(state); // (tu función existente)
    console.log("🧩 Seeded ACS_FLIGHT_STATE from schedule:", ids.length, "aircraft");
  }
}
   
  /* ============================================================
   🟦 PASO 3.3 — TIME ENGINE HOOK (WORLD ONLY)
   ============================================================ */

waitForWorldAirports(() => {

  // ✅ 1) Seed desde schedule (garantiza aviones en tierra)
  try { seedFlightStateFromSchedule(); } catch(e) { console.warn(e); }

  // ✅ 2) Bootstrapea desde MyAircraft si existe (extra)
  if (typeof bootstrapGroundAircraft === "function") {
    try { bootstrapGroundAircraft(); } catch(e) { console.warn(e); }
  }

  // ✅ 3) Primera pintura inmediata
  updateWorldFlights();
  generateReturnFlights();

  // ✅ 4) Loop 24/7
  if (typeof registerTimeListener === "function") {
    registerTimeListener(() => {
      updateWorldFlights();
      generateReturnFlights();
    });
  } else {
    console.warn("⚠ registerTimeListener not available for flight runtime");
  }

  console.log("🌍 ACS World Runtime ACTIVE (24/7)");
});
   
// 🔓 Expose runtime API (REQUIRED)
window.buildFlightsFromSchedule = buildFlightsFromSchedule;
window.updateWorldFlights       = updateWorldFlights;
window.generateReturnFlights    = generateReturnFlights;
window.bootstrapGroundAircraft  = bootstrapGroundAircraft;
   
})(); // ✅ ÚNICO CIERRE FINAL DEL IIFE

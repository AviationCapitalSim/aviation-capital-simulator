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
     🟦 PASO 3.1.5 — INITIALIZE AIRCRAFT ON GROUND (BOOTSTRAP)
     ============================================================ */

  function bootstrapGroundAircraft() {
    try {
      const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
      if (!Array.isArray(fleet) || !fleet.length) return;

      const state = getFlightState();
      let changed = false;

      fleet.forEach(ac => {
        if (!ac.id) return;

        const existing = state.find(s => s.aircraftId === ac.id);
        if (existing) return;

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
          lastUpdateMin: null,
          meta: null
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
   🟧 A4 — BUILD FLIGHTS FROM SCHEDULE (SOURCE OF TRUTH)
   ------------------------------------------------------------
   - NO filtra por tiempo actual
   - SIEMPRE crea vuelos (pasados, activos y futuros)
   - El runtime decide estado (GROUND / AIRBORNE / COMPLETED)
   ============================================================ */

function buildFlightsFromSchedule() {

  const schedule = JSON.parse(localStorage.getItem("scheduleItems")) || [];
  const baseICAO = localStorage.getItem("ACS_baseICAO");
  const flights = [];

  if (!baseICAO || !Array.isArray(schedule)) return flights;

  // HH:MM → minutos absolutos
  function toMin(hhmm) {
    if (!hhmm || typeof hhmm !== "string") return null;
    const [h, m] = hhmm.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  schedule.forEach(item => {

    if (item.type !== "flight") return;
    if (!item.aircraftId) return;

    const depMin = toMin(item.departure);
    const arrMin = toMin(item.arrival);

    if (depMin === null || arrMin === null) return;

    flights.push({
      id: item.id || crypto.randomUUID(),
      aircraftId: item.aircraftId,

      origin: item.origin || baseICAO,
      destination: item.destination,

      depMin,
      arrMin,

      status: "ground",        // ⬅️ el runtime lo actualizará
      started: false,
      completed: false,

      leg: "outbound",
      source: "schedule"
    });
  });

  return flights;
 }
    }

  /* ============================================================
   🟦 PASO 4.1 — UPDATE WORLD FLIGHTS (FORCED GROUND VISIBILITY)
   ------------------------------------------------------------
   - SIEMPRE publica aviones
   - Aunque no haya vuelos
   - Aunque el estado esté incompleto
   ============================================================ */

function updateWorldFlights() {

  const nowMin = window.ACS_TIME?.minute;
  if (typeof nowMin !== "number") return;

  const flights = buildFlightsFromSchedule();
  const state   = getFlightState();
  const live    = [];

  // Índice rápido de aeropuertos
  const airportIndex = {};
  if (window.WorldAirportsACS) {
    Object.values(WorldAirportsACS).flat().forEach(ap => {
      if (ap.icao) airportIndex[ap.icao] = ap;
    });
  }

  // Fleet real (fuente de verdad)
  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  state.forEach(ac => {

    let lat = null;
    let lng = null;
    let status = ac.status || "GROUND";

    // =====================================
    // ✈️ VUELO ACTIVO
    // =====================================
    const f = flights.find(fl =>
      fl.aircraftId === ac.aircraftId &&
      nowMin >= fl.depMin &&
      nowMin <= fl.arrMin
    );

    if (f) {
      const origin = airportIndex[f.origin];
      const dest   = airportIndex[f.destination];
      if (origin && dest) {
        const progress = Math.min(
          Math.max((nowMin - f.depMin) / (f.arrMin - f.depMin), 0),
          1
        );

        const pos = interpolateGC(
          origin.lat, origin.lng,
          dest.lat,   dest.lng,
          progress
        );

        lat = pos.lat;
        lng = pos.lng;
        status = "AIRBORNE";
      }
    }

    // =====================================
    // 🛬 EN TIERRA — FORZADO
    // =====================================
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {

      // Buscar base real del avión
      const real = fleet.find(x => x.id === ac.aircraftId);

      const baseIcao =
        ac.airport ||
        real?.baseAirport ||
        real?.currentAirport ||
        real?.homeBase ||
        localStorage.getItem("ACS_baseICAO");

      const ap = airportIndex[baseIcao];

      if (ap) {
        lat = ap.lat;
        lng = ap.lng;
        status = "GROUND";
        ac.airport = baseIcao;
      }
    }

    // =====================================
    // 📡 PUBLICAR
    // =====================================
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      live.push({
        aircraftId: ac.aircraftId,
        status,
        lat,
        lng
      });
    }

    ac.status = status;
    ac.lastUpdateMin = nowMin;
  });

  saveFlightState(state);

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
     🟦 PASO 3.3 — TIME ENGINE HOOK (WORLD ONLY)
     ============================================================ */

  waitForWorldAirports(() => {
    // ✅ Bootstrapea UNA sola vez ya con mundo listo
    if (typeof bootstrapGroundAircraft === "function") {
      bootstrapGroundAircraft();
    }

    // ✅ Primera pintura inmediata
    updateWorldFlights();
    generateReturnFlights();

    // ✅ Loop 24/7
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

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

      status: "ground",   // ⬅️ estado inicial neutro
      started: false,
      completed: false,

      leg: "outbound",
      source: "schedule"
    });
  });

  return flights;
}

 /* ============================================================
   🟧 A5 — FIX ACTIVACIÓN AIRBORNE (NOW DAY vs NOW GAME)
   - nowDayMin (0–1439) = comparaciones dep/arr
   - nowGameMin (minuto global) = persistencia / updatedMin
   - Soporta vuelos que cruzan medianoche (arr < dep)
   ============================================================ */

function updateWorldFlights() {

/* ============================================================
   🟧 A5.1 — TIME SOURCE UNIFICADO (B DEFINITIVO)
   ------------------------------------------------------------
   - Fuente ÚNICA: ACS_TIME
   - Nunca usa Date.now()
   - Garantiza progreso continuo
   ============================================================ */

/* ============================================================
   🟧 A13 — TIME RESOLUTION SAFE (NUNCA DETIENE RUNTIME)
   ------------------------------------------------------------
   - NO retorna
   - Garantiza tiempo válido SIEMPRE
   ============================================================ */

let nowGameMin;
let nowDayMin;

if (
  window.ACS_TIME &&
  Number.isFinite(window.ACS_TIME.minute)
) {
  nowGameMin = window.ACS_TIME.minute;
  nowDayMin  = nowGameMin % 1440;
} else if (
  window.ACS_TIME &&
  window.ACS_TIME.currentTime instanceof Date
) {
  const d = window.ACS_TIME.currentTime;
  nowGameMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  nowDayMin  = nowGameMin % 1440;

  console.warn("⚠ ACS_TIME.minute missing — using currentTime fallback");
   
} else {
  
   // 🔒 ÚLTIMO fallback (NUNCA return)
   
  const d = new Date();

// ⏱ Minutos + fracción por segundos (movimiento continuo)
nowGameMin =
  d.getUTCHours() * 60 +
  d.getUTCMinutes() +
  (d.getUTCSeconds() / 60);

nowDayMin = nowGameMin % 1440;

// ⚠ avisar una sola vez
if (!window.__ACS_TIME_FALLBACK_WARNED__) {
  console.warn("⚠ ACS_TIME missing — using UTC fallback");
  window.__ACS_TIME_FALLBACK_WARNED__ = true;
}

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

  // Helper: ventana de vuelo con soporte medianoche
  function resolveWindow(nowMinDay, depMin, arrMin) {
    if (!Number.isFinite(nowMinDay) || !Number.isFinite(depMin) || !Number.isFinite(arrMin)) return null;

    // Normal (no cruza medianoche)
    if (arrMin >= depMin) {
      return {
        inWindow: nowMinDay >= depMin && nowMinDay <= arrMin,
        nowAdj: nowMinDay,
        depAdj: depMin,
        arrAdj: arrMin
      };
    }

    // Cruza medianoche: ej dep 23:30 (1410), arr 01:20 (80)
const arrAdj = arrMin + 1440;

// 🔁 AJUSTE CORRECTO: usar SOLO tiempo del juego
const nowAdj =
  nowMinDay < depMin
    ? nowMinDay + 1440
    : nowMinDay;

return {
  inWindow: nowAdj >= depMin && nowAdj <= arrAdj,
  nowAdj,
  depAdj: depMin,
  arrAdj
};
} // 🔴 CIERRE CORRECTO DE resolveWindow

  state.forEach(ac => {

    let lat = null;
    let lng = null;
    let status = ac.status || "GROUND";

    // =========================================================
    // ✈️ VUELO ACTIVO (comparación SIEMPRE contra nowDayMin)
    // =========================================================

    let f = null;
    let win = null;

    f = flights.find(fl => {
      if (fl.aircraftId !== ac.aircraftId) return false;
      win = resolveWindow(nowDayMin, fl.depMin, fl.arrMin);
      return !!win && win.inWindow === true;
    });

    if (f && win) {
  const originAp = airportIndex[f.origin];
  const destAp   = airportIndex[f.destination];

  if (
    originAp && destAp &&
    Number.isFinite(originAp.latitude) &&
    Number.isFinite(originAp.longitude) &&
    Number.isFinite(destAp.latitude) &&
    Number.isFinite(destAp.longitude)
  ) {
    const duration = Math.max(win.arrAdj - win.depAdj, 1);
    const progress = Math.min(
      Math.max((win.nowAdj - win.depAdj) / duration, 0),
      1
    );

    const pos = interpolateGC(
      originAp.latitude, originAp.longitude,
      destAp.latitude,   destAp.longitude,
      progress
    );

    lat = pos.lat;
    lng = pos.lng;
    status = "AIRBORNE";

  } else if (win && win.inWindow) {
    // 🔧 FALLBACK CORRECTO
    status = "AIRBORNE";
  }
}

    // =========================================================
    // 🛬 EN TIERRA — FORZADO Y SEGURO
    // =========================================================

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {

      const real = fleet.find(x => x.id === ac.aircraftId);

      const baseIcao =
        ac.airport ||
        real?.baseAirport ||
        real?.currentAirport ||
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

    // =========================================================
    // 📡 PUBLICAR
    // =========================================================

    if (Number.isFinite(lat) && Number.isFinite(lng)) {

      const publishStatus =
        status === "AIRBORNE" ? "air" :
        status === "GROUND"   ? "ground" :
                                "done";

      live.push({
        aircraftId: ac.aircraftId,
        status: publishStatus,
        airport: ac.airport || null,

        origin:      f ? f.origin      : null,
        destination: f ? f.destination : null,
        depMin:      f ? f.depMin      : null,
        arrMin:      f ? f.arrMin      : null,

        lat: lat,
        lng: lng,
        updatedMin: nowGameMin
      });
    }

    ac.status = status;
    ac.lastUpdateMin = nowGameMin;

  }); // ✅ cierre state.forEach

  saveFlightState(state);

  window.ACS_LIVE_FLIGHTS = live;
  localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(live));

} // ✅ cierre updateWorldFlights


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

  /* ============================================================
   🟧 A9 — WORLD AIRPORTS READY GATE (ROBUST)
   ------------------------------------------------------------
   Espera a que existan aeropuertos REALES con coordenadas
   Evita arranque prematuro del Runtime
   ============================================================ */
   
function waitForWorldAirports(cb) {

  if (
    window.WorldAirportsACS &&
    Object.values(WorldAirportsACS)
      .flat()
      .some(a =>
        a &&
        typeof a.latitude === "number" &&
        typeof a.longitude === "number"
      )
  ) {
    cb();
    return;
  }

  setTimeout(() => waitForWorldAirports(cb), 200);
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
  try {
    updateWorldFlights();
    generateReturnFlights();
  } catch(e) {
    console.warn("ACS initial paint error:", e);
  }

  /* ============================================================
     🟧 A10 — RUNTIME LOOP 24/7 REAL (DEFINITIVO)
     ------------------------------------------------------------
     - NO depende de registerTimeListener
     - Evita intervalos duplicados
     ============================================================ */

  if (!window.__ACS_RUNTIME_LOOP__) {
    window.__ACS_RUNTIME_LOOP__ = setInterval(() => {
      try {
        updateWorldFlights();
        generateReturnFlights();
      } catch (e) {
        console.warn("ACS Runtime loop error:", e);
      }
    }, 1000);

    console.log("🌍 ACS World Runtime ACTIVE (24/7)");
  } else {
    console.log("ℹ️ ACS World Runtime loop already running");
  }

}); // ✅ cierre correcto de waitForWorldAirports

// 🔓 Expose runtime API (REQUIRED)
window.buildFlightsFromSchedule = buildFlightsFromSchedule;
window.updateWorldFlights       = updateWorldFlights;
window.generateReturnFlights    = generateReturnFlights;
window.bootstrapGroundAircraft  = bootstrapGroundAircraft;

})(); // ✅ ÚNICO CIERRE FINAL DEL IIFE

/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME — FR24 ENGINE (FULL)
   Project: Aviation Capital Simulator (ACS)
   Module: SkyTrack Runtime
   Version: v1.1 FR24 CORE COMPLETE
   Date: 2026-01-02

   PURPOSE:
   - READ ONLY engine
   - Consumes:
       • ACS_MyAircraft
       • scheduleItems (Schedule Table)
       • ACS Time Engine (absolute minutes)
   - Produces:
       • Aircraft state: GROUND | EN_ROUTE | MAINTENANCE
       • Position (lat/lng or airport)

   RULES (APPROVED):
   - NO pending state
   - NO writing to localStorage
   - NO recalculation of schedule
   - Schedule Table is single source of truth
   - FR24 behaviour (overnight supported)
   ============================================================ */

/* ============================================================
   🟦 C1 — LAST ACTIVE FLIGHT CACHE (ANTI-STATE-LOSS)
   - Stores last EN_ROUTE flight per aircraft
   - Memory-only (NO persistence)
   ============================================================ */

window.ACS_SkyTrack = {
  initialized: false,
  nowAbsMin: null,
  aircraftIndex: {},
  itemsByAircraft: {},

  // 🟦 C1 — cache del último vuelo activo
  lastActiveFlight: {}
};

/* ============================================================
   🟦 FASE 4.1 — ARRIVAL REGISTRY (SKYTRACK CANONICAL)
   ------------------------------------------------------------
   ✔ Persiste llegadas de vuelo
   ✔ NO Finance
   ✔ NO cálculos
   ✔ Anti-duplicado por flightId
   ============================================================ */

(function(){

  const KEY = "ACS_FlightArrivals_V1";

  function loadArrivals(){
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveArrivals(arr){
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  window.ACS_recordFlightArrival = function(payload){

    if (!payload || !payload.flightId) return;

    const list = loadArrivals();

    // 🔒 Anti-duplicado
    if (list.some(f => f.flightId === payload.flightId)) {
      return;
    }

    const record = {
      flightId: payload.flightId,
      aircraftId: payload.aircraftId,
      origin: payload.origin,
      destination: payload.destination,
      distanceNM: Number(payload.distanceNM || 0),
      timestamp: Date.now()
    };

    list.push(record);
    saveArrivals(list);

    console.log(
      `🟦 [ARRIVALS] Saved → ${record.origin} → ${record.destination} | ${record.aircraftId}`
    );
  };

})();

/* ============================================================
   🟦 ENTRY POINT
   ============================================================ */
function ACS_SkyTrack_init() {
  if (ACS_SkyTrack.initialized) return;
  ACS_SkyTrack.initialized = true;

  console.log("✈️ SkyTrack Runtime initialized (FR24 core)");

  ACS_SkyTrack_loadData();
  ACS_SkyTrack_hookTimeEngine();
}

/* ============================================================
   ⏱ TIME ENGINE HOOK (ABS MINUTES) — ACS CANONICAL (SAFE)
   ============================================================ */
function ACS_SkyTrack_hookTimeEngine() {

  // 🔑 Case 1: ACS_TIME exists in global scope (correct for ACS)
  try {
    if (typeof ACS_TIME !== "undefined" && Number.isFinite(ACS_TIME.minute)) {

      // Initial sync
      // Initial sync (normalize to week-minute)
ACS_SkyTrack.nowAbsMin = (ACS_TIME.minute % 10080);

registerTimeListener(() => {
  // normalize to week-minute so it matches depAbsMin/arrAbsMin
  ACS_SkyTrack.nowAbsMin = (ACS_TIME.minute % 10080);
  ACS_SkyTrack_onTick();
});

      console.log("⏱ SkyTrack hooked to ACS_TIME.minute");
      return;
    }
  } catch (e) {
    // ignore, fallback below
  }

  // 🧯 Case 2: fallback ONLY if absMin explicitly provided
  if (typeof registerTimeListener === "function") {

    registerTimeListener((t) => {
      if (t && Number.isFinite(t.absMin)) {
        ACS_SkyTrack.nowAbsMin = t.absMin;
        ACS_SkyTrack_onTick();
        return;
      }
    });

    console.warn("⚠️ SkyTrack using fallback time hook");
    return;
  }

  console.warn("⛔ SkyTrack: Time Engine not available");
}

/* ============================================================
   🟦 A1 — AIRPORT INDEX INIT (SKYTRACK CANONICAL)
   Fuente: WorldAirportsACS.<continent>
   ============================================================ */

(function initAirportIndex() {

  if (window.ACS_AIRPORT_INDEX) return;

  const index = {};

  if (!window.WorldAirportsACS) {
    console.warn("[SkyTrack] WorldAirportsACS not loaded");
    window.ACS_AIRPORT_INDEX = index;
    return;
  }

  Object.values(WorldAirportsACS).forEach(region => {
    if (!Array.isArray(region)) return;

    region.forEach(ap => {
      if (
        ap &&
        ap.icao &&
        Number.isFinite(ap.latitude) &&
        Number.isFinite(ap.longitude)
      ) {
        index[ap.icao] = {
          icao: ap.icao,
          latitude: ap.latitude,
          longitude: ap.longitude
        };
      }
    });
  });

  window.ACS_AIRPORT_INDEX = index;

  console.log(
    "[SkyTrack] AirportIndex ready:",
    Object.keys(index).length,
    "airports"
  );

})();

/* ============================================================
   🟦 PASO 2.1 — ON TICK (CANONICAL SNAPSHOT ONLY)
   - Uses ACS_TIME.minute (already fixed)
   - Schedule Table is the ONLY source of truth
   - Emits ONE event: ACS_SKYTRACK_SNAPSHOT
   ============================================================ */
function ACS_SkyTrack_onTick() {

  if (!Number.isFinite(ACS_SkyTrack.nowAbsMin)) return;

  const now = ACS_SkyTrack.nowAbsMin;
  const snapshot = [];

  Object.keys(ACS_SkyTrack.aircraftIndex).forEach(acId => {

    const ac = ACS_SkyTrack.aircraftIndex[acId];
    const items = ACS_SkyTrack.itemsByAircraft[acId] || [];

    const stateObj = ACS_SkyTrack_resolveState(acId);
    if (!stateObj) return;

/* ============================================================
   🟦 C2 + C3 — EN_ROUTE → GROUND + ARRIVAL EVENT (CANONICAL)
   + FASE 4.1 — ARRIVAL PERSISTENCE (LOCAL ONLY)
   ============================================================ */

const prev = ACS_SkyTrack.lastActiveFlight[acId];

// 🛫 Cache mientras vuela
if (stateObj.state === "EN_ROUTE" && stateObj.flight) {
  ACS_SkyTrack.lastActiveFlight[acId] = stateObj.flight;
}

// 🛬 Detectar llegada (TOLERANTE A TICK)
if (
  stateObj.state === "GROUND" &&
  prev &&
  Number.isFinite(prev.arrAbsMin) &&
  now >= (prev.arrAbsMin - 1)
) {

  console.log(
    `🛬 C2 DETECTED ARRIVAL | ${acId} | ${prev.origin} → ${prev.destination}`
  );

// ============================================================
// ✈️ SKYTRACK → FINANCE MIRROR (DEBUG ONLY) — FIXED
// ============================================================

const arrivalPayload = {
  aircraftId: String(acId),
  flightId: `${acId}-${prev.origin}-${prev.destination}`,
  origin: prev.origin,
  destination: prev.destination,
  distanceNM: null,            // se resolverá después si hace falta
  amount: 50,                  // DEBUG VALUE
  simTime: ACS_TIME?.currentTime || null
};

window.dispatchEvent(
  new CustomEvent("ACS_FLIGHT_ARRIVAL_DEBUG", {
    detail: arrivalPayload
  })
);

console.log(
  "%c✈️ SKYTRACK ARRIVAL → EVENT EMITTED",
  "color:#00ff80;font-weight:bold;",
  arrivalPayload
);
   
  /* ============================================================
     🔎 FASE 4.1.B — RESOLVE DISTANCE FROM SCHEDULE TABLE
     ============================================================ */

  let resolvedDistanceNM = 0;

  try {
    const scheduleItems = JSON.parse(
      localStorage.getItem("scheduleItems") || "[]"
    );

    const match = scheduleItems.find(s => {
    if (String(s.aircraftId) !== String(acId)) return false;

    const o1 = String(s.origin);
    const d1 = String(s.destination);
    const o2 = String(prev.origin);
    const d2 = String(prev.destination);

    return (
    (o1 === o2 && d1 === d2) ||
    (o1 === d2 && d1 === o2)
  );
});

    if (match) {
      resolvedDistanceNM = Number(
        match.distanceNM ??
        match.distance_nm ??
        match.distNM ??
        match.dist_nm ??
        0
      );
    }

  } catch (e) {
    console.warn("⚠️ Distance resolve failed", e);
  }

  const arrivalPayload = {
    flightId: `${acId}|${prev.origin}|${prev.destination}|${prev.depAbsMin}`,
    aircraftId: acId,

    origin: prev.origin || null,
    destination: prev.destination || null,

    depAbsMin: prev.depAbsMin,
    arrAbsMin: prev.arrAbsMin,

    distanceNM: resolvedDistanceNM,

    detectedAtAbsMin: now,
    detectedAtTs: Date.now()
  };

  /* ============================================================
     🟦 FASE 4.1 — PERSIST ARRIVAL (SkyTrack → localStorage)
     ------------------------------------------------------------
     ✔ NO Finance
     ✔ NO calculations
     ✔ Facts only
     ✔ Anti-duplicate by flightId
     ============================================================ */

  if (typeof window.ACS_recordFlightArrival === "function") {
    window.ACS_recordFlightArrival({
      flightId: arrivalPayload.flightId,
      aircraftId: arrivalPayload.aircraftId,
      origin: arrivalPayload.origin,
      destination: arrivalPayload.destination,
      distanceNM: arrivalPayload.distanceNM
    });
  }

  /* ============================================================
     🟦 C3 — EMIT ARRIVAL EVENT (SYSTEM BUS)
     ============================================================ */

  window.dispatchEvent(
    new CustomEvent("ACS_FLIGHT_ARRIVED", { detail: arrivalPayload })
  );

  console.log(
    `📡 C3 EVENT EMITTED | ${acId} | ${arrivalPayload.origin} → ${arrivalPayload.destination} | ${resolvedDistanceNM} NM`
  );

  // 🔒 limpiar cache (ANTI DUPLICADO)
  ACS_SkyTrack.lastActiveFlight[acId] = null;
}

/* ----------------------------
   Resolve route context
   ---------------------------- */

let originICAO = null;
let destinationICAO = null;
let flightNumber = null;

if (stateObj.flight) {
  originICAO = stateObj.flight.origin || null;
  destinationICAO = stateObj.flight.destination || null;
  flightNumber = stateObj.flight.flightNumber || null;
} else {
  const future = items
    .filter(it => it.type === "flight" && Number.isFinite(it.depAbsMin) && it.depAbsMin > now)
    .sort((a, b) => a.depAbsMin - b.depAbsMin)[0];

  const past = items
    .filter(it => it.type === "flight" && Number.isFinite(it.arrAbsMin) && it.arrAbsMin < now)
    .sort((a, b) => b.arrAbsMin - a.arrAbsMin)[0];

  const ctx = future || past;
  if (ctx) {
    originICAO = ctx.origin || null;
    destinationICAO = ctx.destination || null;
    flightNumber = ctx.flightNumber || null;
  }
}

snapshot.push({
  aircraftId: acId,
  registration: ac.registration || ac.reg || "—",
  model: ac.model || ac.type || "—",

  state: stateObj.state,              // GROUND | EN_ROUTE | MAINTENANCE
  position: stateObj.position || null,

  originICAO,
  destinationICAO,
  flightNumber
   });

  });

  // 🔑 Single canonical snapshot
  window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = snapshot;

  window.dispatchEvent(
    new CustomEvent("ACS_SKYTRACK_SNAPSHOT", { detail: snapshot })
  );
}

/* ============================================================
   📦 LOAD DATA (FLEET + SCHEDULE)
   ============================================================ */
function ACS_SkyTrack_loadData() {
  ACS_SkyTrack.aircraftIndex = ACS_SkyTrack_getFleetIndex();
  ACS_SkyTrack.itemsByAircraft = ACS_SkyTrack_indexScheduleItems();
}

/* ============================================================
   🧩 FLEET INDEX (ACS_MyAircraft)
   ============================================================ */
function ACS_SkyTrack_getFleetIndex() {
  let fleet = [];

  try {
    fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  } catch (e) {
    console.warn("SkyTrack: Invalid ACS_MyAircraft");
  }

  const index = {};
  fleet.forEach(ac => {
    if (!ac || !ac.id) return;
    index[ac.id] = ac;
  });

  return index;
}

/* ============================================================
   🟧 A4.2 — SCHEDULE EXPANDER (ROUND TRIP / FR24)
   - scheduleItems puede venir como "ruta" (LEMD ⇄ DEST)
   - Genera 2 legs: OUTBOUND + RETURN con turnaround
   - Soporta it.days[] (mon..sun) y/o it.day
   ============================================================ */

function ACS_SkyTrack_indexScheduleItems() {
  let raw = [];

  try {
    raw = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch (e) {
    console.warn("SkyTrack: Invalid scheduleItems");
  }

  const byAircraft = {};
  const seen = new Set();

  raw.forEach(it => {
    if (!it || !it.aircraftId) return;

    // Guardar servicios si existen (B-check / etc.)
    if (it.type === "service") {
      if (!byAircraft[it.aircraftId]) byAircraft[it.aircraftId] = [];
      byAircraft[it.aircraftId].push(it);
      return;
    }

    // Solo vuelos/rutas
    if (it.type !== "flight") return;

    // days source (prefer it.days[]; fallback it.day)
    let days = [];
    if (Array.isArray(it.days) && it.days.length) {
      days = it.days.slice();
    } else if (typeof it.day === "string" && it.day) {
      days = [it.day];
    } else {
      // si no hay day(s), no podemos indexar por tiempo
      return;
    }

    // Turnaround (prioriza optimized si existe)
     
    const turn =
      Number.isFinite(it.turnaroundMinOptimized) ? it.turnaroundMinOptimized :
      Number.isFinite(it.turnaroundMin) ? it.turnaroundMin :
      45;

    // Block por pierna (si no viene, deducimos por dep/arr)
    // (si tampoco se puede, default conservador 60)
     
    const blockFallback = 60;

    days.forEach(d => {
      const dep1 = ACS_SkyTrack_dayTimeToAbs(d, it.departure);
      let arr1  = ACS_SkyTrack_dayTimeToAbs(d, it.arrival);

      if (!Number.isFinite(dep1) || !Number.isFinite(arr1)) return;

      // Overnight protection (si arr < dep, cruza medianoche)
      if (arr1 < dep1) arr1 += 1440;

      const block1 =
        Number.isFinite(it.blockTimeMin) ? it.blockTimeMin :
        Math.max(1, (arr1 - dep1));

      // OUTBOUND leg (BASE -> DEST)
       
      const outFlightNumber = it.flightNumberOut || it.flightNumber || null;

      const outKey = [
        it.aircraftId, "OUT", d,
        (it.origin || ""), (it.destination || ""),
        (it.departure || ""), (it.arrival || ""),
        (outFlightNumber || "")
      ].join("|");

      if (!seen.has(outKey)) {
        seen.add(outKey);

        if (!byAircraft[it.aircraftId]) byAircraft[it.aircraftId] = [];
        byAircraft[it.aircraftId].push({
          type: "flight",
          aircraftId: it.aircraftId,

          origin: it.origin || null,
          destination: it.destination || null,

          flightNumber: outFlightNumber,
          modelKey: it.modelKey || it.acType || it.aircraft || null,

          day: (typeof d === "string" ? d.toLowerCase() : d),
          departure: it.departure,
          arrival: it.arrival,

          depAbsMin: dep1,
          arrAbsMin: arr1,

          // ✅ DISTANCIA CANÓNICA (se guarda en el LEG)
          distanceNM: Number(
            it.distanceNM ??
            it.distance_nm ??
            it.distNM ??
            it.dist_nm ??
            0
          ),

          // meta útil
          __leg: "OUTBOUND",
          __turnaroundMin: turn
        });

      }

      // RETURN leg (DEST -> BASE)
       
      const dep2 = arr1 + turn;
      const arr2 = dep2 + (Number.isFinite(block1) ? block1 : blockFallback);

      const retFlightNumber = it.flightNumberIn || null;

      const retKey = [
        it.aircraftId, "RET", d,
        (it.destination || ""), (it.origin || ""),
        dep2, arr2,
        (retFlightNumber || "")
      ].join("|");

      if (!seen.has(retKey)) {
        seen.add(retKey);

        if (!byAircraft[it.aircraftId]) byAircraft[it.aircraftId] = [];
        byAircraft[it.aircraftId].push({
          type: "flight",
          aircraftId: it.aircraftId,

          origin: it.destination || null,
          destination: it.origin || null,

          flightNumber: retFlightNumber,
          modelKey: it.modelKey || it.acType || it.aircraft || null,

          day: (typeof d === "string" ? d.toLowerCase() : d),
          departure: null,
          arrival: null,

          depAbsMin: dep2,
          arrAbsMin: arr2,

          __leg: "RETURN",
          __turnaroundMin: turn
        });
      }
    });
  });

  // Ordenar por tiempo por avión (para resolver contexto mejor)
  Object.keys(byAircraft).forEach(acId => {
    byAircraft[acId].sort((a, b) => {
      const ta =
        (a.type === "flight" && Number.isFinite(a.depAbsMin)) ? a.depAbsMin :
        (a.type === "service" && a.day && a.start) ? ACS_SkyTrack_dayTimeToAbs(a.day, a.start) :
        0;

      const tb =
        (b.type === "flight" && Number.isFinite(b.depAbsMin)) ? b.depAbsMin :
        (b.type === "service" && b.day && b.start) ? ACS_SkyTrack_dayTimeToAbs(b.day, b.start) :
        0;

      return ta - tb;
    });
  });

  return byAircraft;
}

/* ============================================================
   🕒 DAY + TIME → ABS MINUTES (HELPER) — robusto
   - acepta day: "mon".."sun"
   - devuelve minutos 0..10079 (semana), SIN modulo automático aquí
   ============================================================ */
function ACS_SkyTrack_dayTimeToAbs(day, hhmm) {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  if (!day || !hhmm || typeof hhmm !== "string") return NaN;

  const dayIndex = days.indexOf(String(day).toLowerCase());
  if (dayIndex < 0) return NaN;

  const parts = hhmm.split(":");
  if (parts.length < 2) return NaN;

  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;

  const baseDayMin = dayIndex * 1440;
  return baseDayMin + (hh * 60 + mm);
}

/* ============================================================
   🧠 STATE RESOLVER — FR24 LOGIC
   🟦 A6.1 — Arrival / Turnaround Boundary FIX (NO jumps)
   ============================================================ */
function ACS_SkyTrack_resolveState(aircraftId) {

  const ac = ACS_SkyTrack.aircraftIndex[aircraftId];
  const items = ACS_SkyTrack.itemsByAircraft[aircraftId] || [];
  const now = ACS_SkyTrack.nowAbsMin;

  if (!ac || !Number.isFinite(now)) return null;

  /* ============================================================
     1️⃣ MAINTENANCE — B-CHECK ONLY (NO CHANGE)
     ============================================================ */
  const bCheck = items.find(it => {
    if (it.type !== "service" || it.serviceType !== "B") return false;
    if (!it.day || !it.start || !Number.isFinite(it.durationMin)) return false;

    const startAbs = ACS_SkyTrack_dayTimeToAbs(it.day, it.start);
    const endAbs = startAbs + it.durationMin;
    return now >= startAbs && now < endAbs;
  });

  if (bCheck) {
    return {
      state: "MAINTENANCE",
      position: { airport: ac.baseAirport || null },
      flight: null
    };
  }

  /* ============================================================
     2️⃣ EN ROUTE — ACTIVE FLIGHT (STABLE)
     ============================================================ */
  const activeFlight = items.find(it => {
    if (it.type !== "flight") return false;
    if (!Number.isFinite(it.depAbsMin) || !Number.isFinite(it.arrAbsMin)) return false;
    return now >= it.depAbsMin && now < it.arrAbsMin;
  });

  if (activeFlight) {
    return {
      state: "EN_ROUTE",
      position: ACS_SkyTrack_computePosition(activeFlight, now),
      flight: activeFlight
    };
  }

  /* ============================================================
   3️⃣ GROUND — STABLE POST-ARRIVAL (FR24 FIX)
   - NO pre-anchor al siguiente vuelo
   - Mantiene el avión en el DESTINO real
   ============================================================ */

const lastFlight = items
  .filter(it =>
    it.type === "flight" &&
    Number.isFinite(it.arrAbsMin) &&
    it.arrAbsMin <= now
  )
  .sort((a, b) => b.arrAbsMin - a.arrAbsMin)[0];

if (lastFlight) {
  return {
    state: "GROUND",
    position: { airport: lastFlight.destination || null },
    flight: null
  };
}

// Fallback absoluto (base)
return {
  state: "GROUND",
  position: { airport: ac.baseAirport || null },
  flight: null
};

  /* ============================================================
     4️⃣ ABSOLUTE FALLBACK — SHOULD NEVER JUMP
     ============================================================ */
  return {
    state: "GROUND",
    position: { airport: ac.baseAirport || null },
    flight: null
  };
}

/* ============================================================
   🟦 A6.2 — POSITION ENGINE (EN ROUTE) — FINAL FIX
   - NO snap anticipado
   - Snap SOLO cuando cambia el estado
   ============================================================ */
function ACS_SkyTrack_computePosition(flight, nowAbsMin) {
  const { depAbsMin, arrAbsMin } = flight;

  if (!Number.isFinite(depAbsMin) || !Number.isFinite(arrAbsMin)) {
    return null;
  }

  // ⛔ NO snap antes del arribo real
  const p = (nowAbsMin - depAbsMin) / (arrAbsMin - depAbsMin);

  return {
    progress: Math.max(0, Math.min(1, p))
  };
}

/* ============================================================
   🕒 DAY + TIME → ABS MINUTES (HELPER)
   ============================================================ */
function ACS_SkyTrack_dayTimeToAbs(day, hhmm) {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayIndex = days.indexOf(day.toLowerCase());
  if (dayIndex < 0) return NaN;

  const [hh, mm] = hhmm.split(":").map(Number);
  const baseDayMin = dayIndex * 1440;
  return baseDayMin + (hh * 60 + mm);
}

/* ============================================================
   🧪 DEBUG UTILITIES
   ============================================================ */
function ACS_SkyTrack_debugDump() {
  console.table({
    nowAbsMin: ACS_SkyTrack.nowAbsMin,
    fleetSize: Object.keys(ACS_SkyTrack.aircraftIndex).length,
    scheduledAircraft: Object.keys(ACS_SkyTrack.itemsByAircraft).length
  });
}

/* ============================================================
   🚀 AUTO INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", ACS_SkyTrack_init);

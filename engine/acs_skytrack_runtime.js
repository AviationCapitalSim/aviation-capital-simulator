/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME — ACS OCC / AIRBUS OCC
   ------------------------------------------------------------
   Project: Aviation Capital Simulator (ACS)
   Module: SkyTrack Runtime
   Version: v1.2 POSTGRESQL OCC
   Date: 2026-06-26

   PURPOSE:
   - Read SkyTrack operational context from PostgreSQL.
   - Preserve the existing FR24-style SkyTrack logic.
   - Keep Schedule Table as the source of truth.
   - Keep SkyTrack as visual runtime + operational event emitter.
   - No ACS_MyAircraft localStorage authority.
   - No scheduleItems localStorage authority.

   AUTHORITY:
   - PostgreSQL / /v1/skytrack/context
   - ACS Time Engine
   - Schedule Table data model
   ============================================================ */

/* ============================================================
   🟦 C1 — SKYTRACK RUNTIME STATE
   ------------------------------------------------------------
   itemsByAircraft:
   - flights + services, preserving the old SkyTrack logistics.

   flightItemsByAircraft:
   - only executable assigned flights.

   serviceItemsByAircraft:
   - visible / blocking maintenance services.
   ============================================================ */

window.ACS_SkyTrack = {
  initialized: false,

  // Server authority
  nowAbsMin: null,
  currentSimTime: null,

  aircraftIndex: {},

  airlineId: null,
  baseICAO: null,

  // Raw global PostgreSQL rows from /v1/skytrack/global
  globalRows: [],

  itemsByAircraft: {},
  flightItemsByAircraft: {},
  serviceItemsByAircraft: {},

  lastActiveFlight: {}
};
   
/* ============================================================
   🟦 FASE 4.1 — ARRIVAL REGISTRY (MEMORY ONLY)
   ------------------------------------------------------------
   ✔ Keeps anti-duplicate protection during the current session.
   ✔ Does NOT write to localStorage.
   ✔ Finance/backend authority will be handled later.
   ============================================================ */

(function(){

  const arrivals = [];

  window.ACS_recordFlightArrival = function(payload){

    if (!payload || !payload.flightId) return;

    if (arrivals.some(f => f.flightId === payload.flightId)) {
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

    arrivals.push(record);

    console.log(
      `🟦 [ARRIVALS] Recorded → ${record.origin} → ${record.destination} | ${record.aircraftId}`
    );
  };

})();

/* ============================================================
   🟦 ENTRY POINT
   ============================================================ */

async function ACS_SkyTrack_init(headless = false) {

  if (ACS_SkyTrack.initialized) return;

  ACS_SkyTrack.initialized = true;

  console.log(
    "✈️ SkyTrack Runtime initialized (POSTGRESQL OCC)"
  );

  await ACS_SkyTrack_loadData();

ACS_SkyTrack_hookTimeEngine();

ACS_SkyTrack_startContextRefresh();
  

   
  console.log(
    "🟢 SkyTrack OCC runtime ready"
  );
}

/* ============================================================
   ⏱ TIME ENGINE HOOK — WEEKLY MODE
   ============================================================ */

function ACS_SkyTrack_hookTimeEngine() {

  if (typeof registerTimeListener !== "function") {
    console.warn("⛔ SkyTrack: registerTimeListener not available");
    return;
  }

  registerTimeListener(() => {

    /*
     * ACS OCC CANONICAL RULE:
     * ACS_TIME may tick the UI, but it must NOT overwrite
     * SkyTrack operational authority.
     *
     * nowAbsMin comes only from /v1/skytrack/context.
     */

    if (!Number.isFinite(ACS_SkyTrack.nowAbsMin)) {
      return;
    }

    ACS_SkyTrack_onTick();

  });

  console.log("⏱ SkyTrack hooked to time listener WITHOUT browser authority");
}

/* ============================================================
   🟦 A1 — AIRPORT INDEX INIT
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

function ACS_SkyTrack_convertGlobalRow(row) {
  if (!row) return null;

  const airlineId =
    String(row.airline_id || "");

  const rawAircraftId =
    row.aircraft_id || row.id || null;

  if (!airlineId || !rawAircraftId) return null;

  const aircraftId =
    `GLOBAL_${airlineId}_${rawAircraftId}`;

  const now =
  Number.isFinite(Number(ACS_SkyTrack.nowAbsMin))
    ? Number(ACS_SkyTrack.nowAbsMin)
    : null;

const depAbsMin = Number(row.canonical_dep_abs_min ?? row.dep_abs_min);
const arrAbsMin = Number(row.canonical_arr_abs_min ?? row.arr_abs_min);

const isAirborneByLegacySchedule =
  now !== null &&
  Number.isFinite(depAbsMin) &&
  Number.isFinite(arrAbsMin) &&
  arrAbsMin > depAbsMin &&
  now >= depAbsMin &&
  now < arrAbsMin;

const maintenanceControlStatus =
  String(row.maintenance_control_status || "").toUpperCase();

const maintenanceControlReason =
  String(row.maintenance_control_reason || "").toUpperCase();

const canonicalState =
  String(
    row.canonical_state ||
    (
      ["IN_MAINTENANCE", "UNSERVICEABLE"].includes(maintenanceControlStatus)
        ? (maintenanceControlReason || maintenanceControlStatus)
        : isAirborneByLegacySchedule
          ? "EN_ROUTE"
          : "GROUND"
    )
  ).toUpperCase();

const positionType =
  String(
    row.canonical_position_type ||
    (canonicalState === "EN_ROUTE" ? "ROUTE" : "AIRPORT")
  ).toUpperCase();

  let position = null;

  if (positionType === "ROUTE") {
    const progress = Number.isFinite(Number(row.canonical_progress))
  ? Number(row.canonical_progress)
  : isAirborneByLegacySchedule
    ? ((now - depAbsMin) / Math.max(1, arrAbsMin - depAbsMin))
    : 0;

    position = {
      progress: Number.isFinite(progress)
        ? Math.max(0, Math.min(1, progress))
        : 0
    };
  } else {
    position = {
      airport:
        row.canonical_airport ||
        row.current_airport ||
        row.base_icao ||
        row.canonical_destination ||
        row.destination ||
        row.canonical_origin ||
        row.origin ||
        null
    };
  }

  return {
    aircraftId,
    rawAircraftId,

    airlineId,
    airline_id: airlineId,

    canonicalAircraftKey:
      `${airlineId}:${rawAircraftId}`,

    airlineName: row.airline_name || null,
    airlineIata: row.iata || null,
    airlineIcao: row.icao || null,

    airlineColorHex: row.color_hex || "#3A5FFF",
    airlineColorHsl: row.color_hsl || "hsl(220,70%,50%)",
    airlineColorIndex: Number(row.color_index || 0),

    registration: row.registration || "—",

    model:
      row.aircraft_name ||
      row.model_key ||
      "—",

    aircraft:
      row.aircraft_name ||
      row.model_key ||
      "—",

    aircraftModel:
      row.aircraft_name ||
      row.model_key ||
      "—",

    modelKey: row.model_key || null,

    flightNumber: row.flight_number || null,
    pairedFlightNumber: row.paired_flight_number || null,

    originICAO:
      row.canonical_origin ||
      row.origin ||
      null,

    destinationICAO:
      row.canonical_destination ||
      row.destination ||
      null,

    state: canonicalState,
    position,

    depAbsMin:
      Number.isFinite(Number(row.canonical_dep_abs_min))
        ? Number(row.canonical_dep_abs_min)
        : Number.isFinite(Number(row.dep_abs_min))
          ? Number(row.dep_abs_min)
          : null,

    arrAbsMin:
      Number.isFinite(Number(row.canonical_arr_abs_min))
        ? Number(row.canonical_arr_abs_min)
        : Number.isFinite(Number(row.arr_abs_min))
          ? Number(row.arr_abs_min)
          : null,

    distanceNM:
      Number(row.distance_nm || 0),

    opsStatus: "ON_TIME",
    delayed: false,
    delayMinutes: 0,

    __globalTraffic: true,
    __canonicalBackend: true
  };
}

/* ============================================================
   🟦 PASO 2.1 — ON TICK (CANONICAL SNAPSHOT)
   ------------------------------------------------------------
   - Uses PostgreSQL-fed runtime state.
   - Emits ACS_SKYTRACK_SNAPSHOT.
   - Detects EN_ROUTE → GROUND arrival transition.
   ============================================================ */

function ACS_SkyTrack_onTick() {

  if (!Number.isFinite(ACS_SkyTrack.nowAbsMin)) return;

  const now = ACS_SkyTrack.nowAbsMin;
  const snapshot = [];

  Object.keys(ACS_SkyTrack.aircraftIndex).forEach(acId => {

    const ac = ACS_SkyTrack.aircraftIndex[acId];
    const items = ACS_SkyTrack.itemsByAircraft[acId] || [];
    const flights = ACS_SkyTrack.flightItemsByAircraft[acId] || [];

    const resolvedState =
  typeof ACS_SkyTrack_resolveState === "function"
    ? ACS_SkyTrack_resolveState(acId)
    : null;

const stateObj = resolvedState || {
  state: ac.canonicalState || "GROUND",
  position:
    ac.canonicalPosition || {
      airport:
        ac.currentAirport ||
        ac.baseAirport ||
        null
    },
  flight: ac.canonicalFlight || null
};

    const activeFlight = stateObj.flight || null;
    const prev = ACS_SkyTrack.lastActiveFlight[acId];

    /* ========================================================
       C2 — CACHE ACTIVE FLIGHT
       ======================================================== */

    if (stateObj.state === "EN_ROUTE" && activeFlight) {
      ACS_SkyTrack.lastActiveFlight[acId] = activeFlight;
    }

    /* ========================================================
       C3 — ARRIVAL DETECTION
       ======================================================== */

    if (
      stateObj.state === "GROUND" &&
      prev &&
      Number.isFinite(prev.arrAbsMin) &&
      now >= (prev.arrAbsMin - 1)
    ) {

      console.log(
        `🛬 C2 DETECTED ARRIVAL | ${acId} | ${prev.origin} → ${prev.destination}`
      );

      let resolvedDistanceNM = Number(prev.distanceNM || 0);

      if (!resolvedDistanceNM) {
        try {

          const match = flights.find(s => {

            if (s.type !== "flight") return false;

            const o1 = String(s.origin || "");
            const d1 = String(s.destination || "");
            const o2 = String(prev.origin || "");
            const d2 = String(prev.destination || "");

            return (
              (o1 === o2 && d1 === d2) ||
              (o1 === d2 && d1 === o2)
            );
          });

          if (match) {
            resolvedDistanceNM = Number(
              match.distanceNM ||
              match.distance_nm ||
              0
            );
          }

        } catch (e) {

          console.warn(
            "⚠️ Distance resolve failed",
            e
          );

        }
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

      if (typeof window.ACS_recordFlightArrival === "function") {
        window.ACS_recordFlightArrival({
          flightId: arrivalPayload.flightId,
          aircraftId: arrivalPayload.aircraftId,
          origin: arrivalPayload.origin,
          destination: arrivalPayload.destination,
          distanceNM: arrivalPayload.distanceNM
        });
      }

      window.dispatchEvent(
        new CustomEvent("ACS_FLIGHT_ARRIVAL", {
          detail: arrivalPayload
        })
      );

      console.log(
        `📡 C3 EVENT EMITTED | ${acId} | ${arrivalPayload.origin} → ${arrivalPayload.destination} | ${resolvedDistanceNM} NM`
      );

      ACS_SkyTrack.lastActiveFlight[acId] = null;
    }

    /* ========================================================
       ROUTE CONTEXT
       ======================================================== */

    let originICAO = null;
    let destinationICAO = null;
    let flightNumber = null;
    let depAbsMin = null;
    let arrAbsMin = null;
    let distanceNM = 0;

    if (activeFlight) {

      originICAO = activeFlight.origin || null;
      destinationICAO = activeFlight.destination || null;
      flightNumber = activeFlight.flightNumber || null;
      depAbsMin = activeFlight.depAbsMin;
      arrAbsMin = activeFlight.arrAbsMin;
      distanceNM = Number(activeFlight.distanceNM || 0);

    } else {

      const future = flights
        .filter(it =>
          it.type === "flight" &&
          Number.isFinite(it.depAbsMin) &&
          it.depAbsMin > now
        )
        .sort((a, b) => a.depAbsMin - b.depAbsMin)[0];

      const past = flights
        .filter(it =>
          it.type === "flight" &&
          Number.isFinite(it.arrAbsMin) &&
          it.arrAbsMin < now
        )
        .sort((a, b) => b.arrAbsMin - a.arrAbsMin)[0];

      const ctx = future || past;

      if (ctx) {
        originICAO = ctx.origin || null;
        destinationICAO = ctx.destination || null;
        flightNumber = ctx.flightNumber || null;
        depAbsMin = ctx.depAbsMin;
        arrAbsMin = ctx.arrAbsMin;
        distanceNM = Number(ctx.distanceNM || 0);
      }
    }

    /* ========================================================
       OPS STATUS
       ======================================================== */

    const opsInfo =
      (window.ACS_OPS_FLIGHT_STATUS && window.ACS_OPS_FLIGHT_STATUS[acId]) ||
      null;

    snapshot.push({
  aircraftId: acId,

  airlineId: ACS_SkyTrack.airlineId,
  airline_id: ACS_SkyTrack.airlineId,

  airlineColorHex: ac.airlineColorHex || "#3A5FFF",
  airlineColorHsl: ac.airlineColorHsl || "hsl(220,70%,50%)",
  airlineColorIndex: Number(ac.airlineColorIndex || 0),

  registration: ac.registration || ac.reg || "—",
  model: ac.model || ac.type || "—",

      state: stateObj.state,
      position: stateObj.position || null,

      originICAO,
      destinationICAO,
      flightNumber,

      depAbsMin,
      arrAbsMin,
      distanceNM,

      aircraft: ac.model || ac.type || "—",
      aircraftModel: ac.model || ac.type || "—",
      modelKey: ac.modelKey || null,

      opsStatus: opsInfo ? opsInfo.opsStatus : "ON_TIME",
      delayed: opsInfo ? !!opsInfo.delayed : false,
      delayMinutes: opsInfo ? Number(opsInfo.delayMinutes || 0) : 0
    });

  });

    const myAirlineId =
    ACS_SkyTrack.airlineId
      ? String(ACS_SkyTrack.airlineId)
      : null;

  const canonical = [];
  const seen = new Set();

  function addCanonical(item) {
    if (!item) return;

    const airlineId =
      String(item.airlineId || item.airline_id || "");

    const rawAircraftId =
      item.rawAircraftId ||
      item.aircraftId ||
      "";

    const key =
      item.canonicalAircraftKey ||
      `${airlineId}:${rawAircraftId}`;

    if (!key || seen.has(key)) return;

    seen.add(key);
    canonical.push(item);
  }

  snapshot.forEach(item => {
    const airlineId =
      String(item.airlineId || item.airline_id || "");

    const rawAircraftId =
      item.rawAircraftId ||
      item.aircraftId;

    addCanonical({
      ...item,
      rawAircraftId,
      canonicalAircraftKey:
        `${airlineId}:${rawAircraftId}`
    });
  });

  const globalSnapshot =
    Array.isArray(ACS_SkyTrack.globalRows)
      ? ACS_SkyTrack.globalRows
          .map(ACS_SkyTrack_convertGlobalRow)
          .filter(Boolean)
      : [];

  globalSnapshot.forEach(item => {
    const itemAirlineId =
      String(item.airlineId || item.airline_id || "");

    if (
      myAirlineId &&
      itemAirlineId === myAirlineId
    ) {
      return;
    }

    addCanonical(item);
  });

  window.__ACS_CANONICAL_SKYTRACK_SNAPSHOT__ = canonical;
  window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = canonical;

  window.dispatchEvent(
    new CustomEvent("ACS_SKYTRACK_SNAPSHOT", {
      detail: canonical
    })
  );
   
}

/* ============================================================
   📦 LOAD DATA — POSTGRESQL SKYTRACK CONTEXT
   ============================================================ */

async function ACS_SkyTrack_loadData() {
  try {
    const res = await fetch(
      "https://api.aviationcapitalsim.com/v1/skytrack/snapshot",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Accept": "application/json"
        }
      }
    );

    const data = await res.json();

    if (!res.ok || data?.ok !== true) {
      throw new Error(data?.error || "SKYTRACK_SNAPSHOT_FAILED");
    }

    if (data.authority !== "POSTGRESQL_SKYTRACK_SNAPSHOT_CANONICAL") {
      throw new Error("SKYTRACK_SNAPSHOT_AUTHORITY_INVALID");
    }

    const snapshot = Array.isArray(data.flights)
      ? data.flights.map(row => {
          const aircraftId =
            row.scope === "GLOBAL"
              ? `GLOBAL_${row.airlineId || row.airline_id}_${row.rawAircraftId || row.aircraftId}`
              : String(row.aircraftId);

          const positionType =
            String(row.positionType || row.position_type || "").toUpperCase();

          const position =
            positionType === "ROUTE"
              ? {
                  progress: Number.isFinite(Number(row.progress))
                    ? Math.max(0, Math.min(1, Number(row.progress)))
                    : 0
                }
              : {
                  airport:
                    row.airport ||
                    row.currentAirport ||
                    row.current_airport ||
                    row.baseICAO ||
                    row.base_icao ||
                    row.originICAO ||
                    null
                };

          return {
            aircraftId,
            rawAircraftId: row.rawAircraftId || row.raw_aircraft_id || row.aircraftId,

            canonicalAircraftKey:
              `${row.airlineId || row.airline_id || ""}:${row.rawAircraftId || row.raw_aircraft_id || row.aircraftId || ""}`,

            scope: row.scope || "OWN",

            airlineId: String(row.airlineId || row.airline_id || ""),
            airline_id: String(row.airlineId || row.airline_id || ""),

            airlineName: row.airlineName || row.airline_name || null,
            airlineIata: row.airlineIata || row.iata || null,
            airlineIcao: row.airlineIcao || row.icao || null,

            airlineColorHex: row.airlineColorHex || row.color_hex || "#3A5FFF",
            airlineColorHsl: row.airlineColorHsl || row.color_hsl || "hsl(220,70%,50%)",
            airlineColorIndex: Number(row.airlineColorIndex || row.color_index || 0),

            registration: row.registration || "—",

            model:
              row.model ||
              row.aircraftName ||
              row.aircraft_name ||
              row.modelKey ||
              row.model_key ||
              "—",

            aircraft:
              row.model ||
              row.aircraftName ||
              row.aircraft_name ||
              row.modelKey ||
              row.model_key ||
              "—",

            aircraftModel:
              row.model ||
              row.aircraftName ||
              row.aircraft_name ||
              row.modelKey ||
              row.model_key ||
              "—",

            modelKey: row.modelKey || row.model_key || null,

            state: String(row.state || "GROUND").toUpperCase(),
            position,

            positionType,

            airport: row.airport || null,
            progress: Number.isFinite(Number(row.progress))
              ? Number(row.progress)
              : null,

            flightNumber: row.flightNumber || row.flight_number || null,
            pairedFlightNumber: row.pairedFlightNumber || row.paired_flight_number || null,

            originICAO: row.originICAO || row.origin || null,
            destinationICAO: row.destinationICAO || row.destination || null,

            depAbsMin: Number.isFinite(Number(row.depAbsMin || row.dep_abs_min))
              ? Number(row.depAbsMin || row.dep_abs_min)
              : null,

            arrAbsMin: Number.isFinite(Number(row.arrAbsMin || row.arr_abs_min))
              ? Number(row.arrAbsMin || row.arr_abs_min)
              : null,

            distanceNM: Number(row.distanceNM || row.distance_nm || 0),

            opsStatus: row.opsStatus || row.ops_status || "ON_TIME",
            delayed: !!row.delayed,
            delayMinutes: Number(row.delayMinutes || row.delay_minutes || 0),

            __canonicalBackend: true,
            __snapshotAuthority: true
          };
        })
      : [];

    ACS_SkyTrack.nowAbsMin =
      Number.isFinite(Number(data.now_abs_min))
        ? Number(data.now_abs_min)
        : null;

    ACS_SkyTrack.currentSimTime =
      data.current_sim_time || null;

    ACS_SkyTrack.airlineId =
  data.airline_id ? String(data.airline_id) : null;

const ownBaseItem = snapshot.find(item =>
  item.scope === "OWN" &&
  item.position &&
  item.position.airport
);

ACS_SkyTrack.baseICAO =
  ownBaseItem?.position?.airport ||
  snapshot.find(item => item.scope === "OWN")?.airport ||
  null;

    ACS_SkyTrack.globalRows = [];
    ACS_SkyTrack.aircraftIndex = {};
    ACS_SkyTrack.itemsByAircraft = {};
    ACS_SkyTrack.flightItemsByAircraft = {};
    ACS_SkyTrack.serviceItemsByAircraft = {};

    window.__ACS_CANONICAL_SKYTRACK_SNAPSHOT__ = snapshot;
    window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = snapshot;

    window.dispatchEvent(
      new CustomEvent("ACS_SKYTRACK_SNAPSHOT", {
        detail: snapshot
      })
    );

    console.log("🟢 SkyTrack snapshot loaded", {
      airlineId: ACS_SkyTrack.airlineId,
      nowAbsMin: ACS_SkyTrack.nowAbsMin,
      aircraft: snapshot.length,
      authority: data.authority
    });

  } catch (err) {
    console.warn("⛔ SkyTrack snapshot load failed:", err);

    window.__ACS_CANONICAL_SKYTRACK_SNAPSHOT__ = [];
    window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = [];

    window.dispatchEvent(
      new CustomEvent("ACS_SKYTRACK_SNAPSHOT", {
        detail: []
      })
    );
  }
}

/* ============================================================
   🧩 FLEET INDEX — POSTGRESQL
   ============================================================ */

function ACS_SkyTrack_buildFleetIndexFromServer(fleetRows) {

  const index = {};

  if (!Array.isArray(fleetRows)) return index;

  fleetRows.forEach(row => {

    if (!row || !row.id) return;

    const maintenanceControlStatus =
      String(row.maintenance_control_status || "").toUpperCase();

    const maintenanceControlReason =
      String(row.maintenance_control_reason || "").toUpperCase();

    const status =
      String(row.status || "").toUpperCase();

    const operationalStatus =
      String(row.operational_status || "").toUpperCase();

    const maintenanceStatus =
      String(row.maintenance_status || "").toUpperCase();

    index[row.id] = {
      id: row.id,
      aircraftId: row.id,

      registration: row.registration || "—",

      airlineId: ACS_SkyTrack.airlineId,
airline_id: ACS_SkyTrack.airlineId,

airlineColorHex: row.color_hex || "#3A5FFF",
airlineColorHsl: row.color_hsl || "hsl(220,70%,50%)",
airlineColorIndex: Number(row.color_index || 0),
       
      manufacturer: row.manufacturer || null,
      modelKey: row.model_key || null,

      model:
        row.aircraft_name ||
        row.model_key ||
        row.model ||
        "—",

      type:
        row.aircraft_name ||
        row.model_key ||
        row.model ||
        "—",

      status,
      operationalStatus,
      maintenanceStatus,

      maintenanceControlStatus,
      maintenanceControlReason,

      aCheckStatus: String(row.a_check_status || "").toUpperCase(),
      bCheckStatus: String(row.b_check_status || "").toUpperCase(),
      cCheckStatus: String(row.c_check_status || "").toUpperCase(),
      dCheckStatus: String(row.d_check_status || "").toUpperCase(),

      canFly:
        status === "ACTIVE" &&
        operationalStatus === "AVAILABLE" &&
        maintenanceStatus === "SERVICEABLE" &&
        maintenanceControlStatus === "SERVICEABLE",

      baseAirport:
        row.base_icao ||
        row.current_airport ||
        null,

      currentAirport:
        row.current_airport ||
        row.base_icao ||
        null
    };

  });

  return index;
}

/* ============================================================
   🧩 SCHEDULE INDEX — POSTGRESQL
   ============================================================ */

function ACS_SkyTrack_indexScheduleItemsFromServer(scheduleRows) {

  const itemsByAircraft = {};
  const flightItemsByAircraft = {};
  const serviceItemsByAircraft = {};

  if (!Array.isArray(scheduleRows)) {
    return {
      itemsByAircraft,
      flightItemsByAircraft,
      serviceItemsByAircraft
    };
  }

  function ensureAircraftBuckets(aircraftId) {

    if (!itemsByAircraft[aircraftId]) {
      itemsByAircraft[aircraftId] = [];
    }

    if (!flightItemsByAircraft[aircraftId]) {
      flightItemsByAircraft[aircraftId] = [];
    }

    if (!serviceItemsByAircraft[aircraftId]) {
      serviceItemsByAircraft[aircraftId] = [];
    }
  }

  function addItem(item) {

    if (!item || !item.aircraftId) return;

    const aircraftId = item.aircraftId;

    ensureAircraftBuckets(aircraftId);

    itemsByAircraft[aircraftId].push(item);

    if (
      item.type === "flight" &&
      item.status === "assigned" &&
      Number.isFinite(item.depAbsMin) &&
      Number.isFinite(item.arrAbsMin)
    ) {
      flightItemsByAircraft[aircraftId].push(item);
    }

    if (
      item.type === "service" &&
      ["scheduled", "in_progress"].includes(item.status)
    ) {
      serviceItemsByAircraft[aircraftId].push(item);
    }
  }

  function buildBaseItem(row) {

    const aircraftId =
      row.aircraft_id ||
      row.aircraftId;

    if (!aircraftId) return null;

    const itemType =
      String(row.item_type || row.type || "").toLowerCase();

    const status =
      String(row.status || "").toLowerCase();

    return {
      id: row.id,
      scheduleUid: row.schedule_uid,

      type: itemType,
      itemType,

      aircraftId,

      origin:
        String(row.origin || "").toUpperCase(),

      destination:
        String(row.destination || "").toUpperCase(),

      day:
        row.selected_day || null,

      departure:
        row.departure || null,

      arrival:
        row.arrival || null,

      depAbsMin:
        Number(row.dep_abs_min),

      arrAbsMin:
        Number(row.arr_abs_min),

      flightNumber:
        row.flight_number || null,

      pairedFlightNumber:
        row.paired_flight_number || null,

      flightDirection:
        row.flight_direction || null,

      serviceType:
        row.service_type || null,

      modelKey:
        row.model_key || null,

      aircraft:
        row.aircraft || null,

      registration:
        row.aircraft_registration || null,

      distanceNM:
        Number(row.distance_nm || 0),

      blockTimeMin:
        Number(row.block_time_min || 0),

      turnaroundMin:
        Number(row.turnaround_min || 0),

      __leg:
        row.flight_direction || null,

      __turnaroundMin:
        Number(row.turnaround_min || 0),

      __runtimeGenerated:
        false,

      status
    };
  }

  function hasReturnLeg(baseItem) {

    if (!baseItem) return true;

    const aircraftId =
      baseItem.aircraftId;

    const flights =
      flightItemsByAircraft[aircraftId] || [];

    return flights.some(f => {

      if (f.__runtimeGenerated) return false;

      return (
        f.origin === baseItem.destination &&
        f.destination === baseItem.origin &&
        Number.isFinite(f.depAbsMin) &&
        f.depAbsMin >= baseItem.arrAbsMin
      );
    });
  }

  function buildRuntimeReturnLeg(baseItem) {

    if (!baseItem) return null;

    if (baseItem.type !== "flight") return null;
    if (baseItem.status !== "assigned") return null;

    if (!baseItem.pairedFlightNumber) return null;

    if (
      !Number.isFinite(baseItem.depAbsMin) ||
      !Number.isFinite(baseItem.arrAbsMin)
    ) {
      return null;
    }

    const blockTime =
      Number(baseItem.blockTimeMin || 0) > 0
        ? Number(baseItem.blockTimeMin)
        : Math.max(1, baseItem.arrAbsMin - baseItem.depAbsMin);

    const turnaround =
      Number(baseItem.turnaroundMin || baseItem.__turnaroundMin || 0) > 0
        ? Number(baseItem.turnaroundMin || baseItem.__turnaroundMin)
        : 45;

    const depAbsMin =
      baseItem.arrAbsMin + turnaround;

    const arrAbsMin =
      depAbsMin + blockTime;

    return {
      ...baseItem,

      id:
        `${baseItem.id || baseItem.scheduleUid || "flight"}_RETURN_RUNTIME`,

      scheduleUid:
        `${baseItem.scheduleUid || baseItem.id || "flight"}_RETURN_RUNTIME`,

      origin:
        baseItem.destination,

      destination:
        baseItem.origin,

      depAbsMin,
      arrAbsMin,

      departure:
        ACS_SkyTrack_absToHHMM(depAbsMin),

      arrival:
        ACS_SkyTrack_absToHHMM(arrAbsMin),

      flightNumber:
        baseItem.pairedFlightNumber,

      pairedFlightNumber:
        baseItem.flightNumber || null,

      flightDirection:
        "RETURN",

      __leg:
        "RETURN",

      __runtimeGenerated:
        true,

      status:
        "assigned"
    };
  }

  scheduleRows.forEach(row => {

    const item =
      buildBaseItem(row);

    if (!item) return;

    addItem(item);

  });

  /*
   * ACS OCC runtime return generation:
   * PostgreSQL remains the authority.
   * This only restores the historical SkyTrack visual/runtime leg.
   */
   
  Object.keys(flightItemsByAircraft).forEach(acId => {

    const sourceFlights =
      [...flightItemsByAircraft[acId]];

    sourceFlights.forEach(baseItem => {

      if (baseItem.__runtimeGenerated) return;
      if (baseItem.type !== "flight") return;
      if (baseItem.status !== "assigned") return;
      if (!baseItem.pairedFlightNumber) return;

      if (hasReturnLeg(baseItem)) return;

      const returnLeg =
        buildRuntimeReturnLeg(baseItem);

      if (returnLeg) {
        addItem(returnLeg);
      }

    });

  });

  Object.keys(itemsByAircraft).forEach(acId => {

    itemsByAircraft[acId].sort((a, b) => {
      return Number(a.depAbsMin || 0) - Number(b.depAbsMin || 0);
    });

    flightItemsByAircraft[acId].sort((a, b) => {
      return Number(a.depAbsMin || 0) - Number(b.depAbsMin || 0);
    });

    serviceItemsByAircraft[acId].sort((a, b) => {
      return Number(a.depAbsMin || 0) - Number(b.depAbsMin || 0);
    });

  });

  return {
    itemsByAircraft,
    flightItemsByAircraft,
    serviceItemsByAircraft
  };
}

/* ============================================================
   🕒 DAY + TIME → ABS MINUTES
   ============================================================ */

function ACS_SkyTrack_dayTimeToAbs(day, hhmm) {

  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  if (!day || !hhmm || typeof hhmm !== "string") return NaN;

  const dayIndex =
    days.indexOf(String(day).toLowerCase());

  if (dayIndex < 0) return NaN;

  const parts = hhmm.split(":");
  if (parts.length < 2) return NaN;

  const hh = Number(parts[0]);
  const mm = Number(parts[1]);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;

  return (dayIndex * 1440) + (hh * 60 + mm);
}

function ACS_SkyTrack_absToHHMM(absMin) {

  if (!Number.isFinite(absMin)) {
    return null;
  }

  const normalized =
    ((Number(absMin) % 1440) + 1440) % 1440;

  const hh =
    String(Math.floor(normalized / 60)).padStart(2, "0");

  const mm =
    String(normalized % 60).padStart(2, "0");

  return `${hh}:${mm}`;
}

/* ============================================================
   ✈️ SKYTRACK GROUND BLOCK — POSTGRESQL MAINTENANCE AUTHORITY
   ============================================================ */

function ACS_SkyTrack_getGroundBlock(ac) {

  if (!ac) {
    return {
      blocked: false,
      reason: null,
      label: null
    };
  }

  const controlStatus =
    String(ac.maintenanceControlStatus || "").toUpperCase();

  const controlReason =
    String(ac.maintenanceControlReason || "").toUpperCase();

  if (
    controlStatus === "IN_MAINTENANCE" ||
    controlStatus === "UNSERVICEABLE"
  ) {
    return {
      blocked: true,
      reason: controlReason || controlStatus,
      label: controlReason || controlStatus
    };
  }

  return {
    blocked: false,
    reason: null,
    label: null
  };
}

/* ============================================================
   🧠 STATE RESOLVER — FR24 LOGIC
   ============================================================ */

function ACS_SkyTrack_resolveState(aircraftId) {

  const ac = ACS_SkyTrack.aircraftIndex[aircraftId];
  const flights = ACS_SkyTrack.flightItemsByAircraft[aircraftId] || [];
  const now = ACS_SkyTrack.nowAbsMin;

  if (!ac || !Number.isFinite(now)) return null;

  const hardBlock = ACS_SkyTrack_getGroundBlock(ac);

  if (hardBlock && hardBlock.blocked) {

    return {
      state: hardBlock.label || "MAINTENANCE",
      position: {
        airport:
          ac.currentAirport ||
          ac.baseAirport ||
          null
      },
      flight: null
    };
  }

  /* ========================================================
     EN ROUTE — ACTIVE FLIGHT
     ======================================================== */

  const activeFlight = flights.find(it => {

    if (it.type !== "flight") return false;
    if (!Number.isFinite(it.depAbsMin) || !Number.isFinite(it.arrAbsMin)) return false;

    const prev = flights
      .filter(f =>
        f.type === "flight" &&
        Number.isFinite(f.arrAbsMin) &&
        f.arrAbsMin <= it.depAbsMin
      )
      .sort((a, b) => b.arrAbsMin - a.arrAbsMin)[0];

    if (prev) {
      const turnaround = Number(prev.__turnaroundMin || 0);
      const minReady = prev.arrAbsMin + turnaround;

      if (now < minReady) return false;
    }

    return now >= it.depAbsMin && now < it.arrAbsMin;
  });

  if (activeFlight) {
    return {
      state: "EN_ROUTE",
      position: ACS_SkyTrack_computePosition(activeFlight, now),
      flight: activeFlight
    };
  }

  /* ========================================================
     GROUND — LAST ARRIVAL POSITION
     ======================================================== */

  const lastFlight = flights
    .filter(it =>
      it.type === "flight" &&
      Number.isFinite(it.arrAbsMin) &&
      it.arrAbsMin <= now
    )
    .sort((a, b) => b.arrAbsMin - a.arrAbsMin)[0];

if (lastFlight) {
  return {
    state: "GROUND",
    position: {
      airport:
        ac.currentAirport ||
        ac.baseAirport ||
        lastFlight.destination ||
        null
    },
    flight: null
  };
}

  return {
    state: "GROUND",
    position: {
      airport:
        ac.currentAirport ||
        ac.baseAirport ||
        null
    },
    flight: null
  };
}

/* ============================================================
   🟦 A6.2 — POSITION ENGINE (EN_ROUTE)
   ============================================================ */

const ACS_SPAWNED_FLIGHTS = {};

function ACS_SkyTrack_computePosition(flight, nowAbsMin) {

  const { depAbsMin, arrAbsMin, aircraftId } = flight;

  if (
    !Number.isFinite(depAbsMin) ||
    !Number.isFinite(arrAbsMin) ||
    arrAbsMin <= depAbsMin
  ) {
    return null;
  }

  const flightKey =
    `${aircraftId}|${depAbsMin}`;

  let progress =
    (nowAbsMin - depAbsMin) /
    (arrAbsMin - depAbsMin);

  if (!ACS_SPAWNED_FLIGHTS[flightKey]) {
    progress = 0;
    ACS_SPAWNED_FLIGHTS[flightKey] = true;
  }

  return {
    progress: Math.max(0, Math.min(1, progress))
  };
}

/* ============================================================
   🧪 DEBUG UTILITIES
   ============================================================ */

function ACS_SkyTrack_debugDump() {

  console.table({
    nowAbsMin: ACS_SkyTrack.nowAbsMin,
    fleetSize: Object.keys(ACS_SkyTrack.aircraftIndex).length,
    scheduledAircraft: Object.keys(ACS_SkyTrack.itemsByAircraft).length,
    flightAircraft: Object.keys(ACS_SkyTrack.flightItemsByAircraft).length,
    serviceAircraft: Object.keys(ACS_SkyTrack.serviceItemsByAircraft).length
  });
}

function ACS_SkyTrack_startContextRefresh() {

  if (window.__ACS_SKYTRACK_CONTEXT_REFRESH__) return;

  window.__ACS_SKYTRACK_CONTEXT_REFRESH__ = true;

  setInterval(async () => {
    try {
      await ACS_SkyTrack_loadData();
    } catch (err) {
      console.warn("SkyTrack context refresh failed", err);
    }
}, 2000);

  console.log("🔁 SkyTrack PostgreSQL context refresh active");
}

/* ============================================================
   🟧 RUNTIME BOOTSTRAP
   ============================================================ */

if (!window.__ACS_RUNTIME_ACTIVE__) {

  window.__ACS_RUNTIME_ACTIVE__ = true;

  if (window.ACS_RUNTIME_HEADLESS === true) {

    console.log("✈️ ACS Runtime started in HEADLESS mode");
    ACS_SkyTrack_init(true);

  } else {

    document.addEventListener("DOMContentLoaded", async () => {

      try {

        await ACS_SkyTrack_init(false);

      } catch(err) {

        console.error(
          "⛔ SkyTrack bootstrap failed",
          err
        );

      }

    });

  }
}

/* ============================================================
   🌍 SKYTRACK → WORLD SERVER SYNC
   ------------------------------------------------------------
   Disabled here.
   acs_world_publisher.js is the only authorized publisher.
   ============================================================ */

(function(){

  console.log(
    "🌍 SKYTRACK → WORLD SERVER SYNC DISABLED (using acs_world_publisher.js)"
  );

})();

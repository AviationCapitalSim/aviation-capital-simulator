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
   🟦 RUNTIME NAMESPACE
   ============================================================ */
window.ACS_SkyTrack = {
  initialized: false,
  nowAbsMin: null,
  aircraftIndex: {},
  itemsByAircraft: {},
};

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
   ⏱ TIME ENGINE HOOK (ABS MINUTES)
   ============================================================ */
function ACS_SkyTrack_hookTimeEngine() {
  if (typeof registerTimeListener !== "function") {
    console.warn("⛔ SkyTrack: Time Engine not available");
    return;
  }

  registerTimeListener((currentTime) => {
    ACS_SkyTrack.nowAbsMin = Math.floor(currentTime.getTime() / 60000);
    ACS_SkyTrack_onTick();
  });
}

/* ============================================================
   🟦 PASO A1 — ON TICK (CLEAN SNAPSHOT)
   - Filters block-* and legacy items without abs times
   - Eliminates ghost route (e.g. LIRN) from UI
   - Non-destructive: NO writes to localStorage
   - Keeps ACS_SKYTRACK_LIVE for compatibility + emits ACS_SKYTRACK_SNAPSHOT
   ============================================================ */
function ACS_SkyTrack_onTick() {
  if (!Number.isFinite(ACS_SkyTrack.nowAbsMin)) return;

  const now = ACS_SkyTrack.nowAbsMin;
  const liveList = [];      // legacy UI event (current skytrack.html listens to this)
  const snapshotV2 = [];    // canonical snapshot for next steps (map, FR24, etc.)

  Object.keys(ACS_SkyTrack.aircraftIndex).forEach(acId => {
    const stateObj = ACS_SkyTrack_resolveState(acId);
    if (!stateObj) return;

    const ac = ACS_SkyTrack.aircraftIndex[acId];
    const itemsRaw = ACS_SkyTrack.itemsByAircraft[acId] || [];

    // ✅ HARD FILTER: ignore UI blocks + ignore legacy entries without abs times
    const flights = itemsRaw
      .filter(it =>
        it &&
        it.type === "flight" &&
        typeof it.id === "string" &&
        !it.id.startsWith("block-") &&
        Number.isFinite(it.depAbsMin) &&
        Number.isFinite(it.arrAbsMin) &&
        it.origin &&
        it.destination
      )
      .slice();

    // ----------------------------
    // Route label (UI only)
    // ----------------------------
    let routeLabel = null;
    let flightNumber = null;
    let originICAO = null;
    let destinationICAO = null;

    if (stateObj.flight && stateObj.flight.origin && stateObj.flight.destination) {
      originICAO = stateObj.flight.origin;
      destinationICAO = stateObj.flight.destination;
      routeLabel = `${originICAO} → ${destinationICAO}`;
      flightNumber = stateObj.flight.flightNumber || null;
    } else {
      // Ground context: prefer next upcoming real flight; else last completed
      const future = flights
        .filter(it => it.depAbsMin > now)
        .sort((a, b) => a.depAbsMin - b.depAbsMin)[0];

      const past = flights
        .filter(it => it.arrAbsMin < now)
        .sort((a, b) => b.arrAbsMin - a.arrAbsMin)[0];

      const ctx = future || past;

      if (ctx) {
        originICAO = ctx.origin;
        destinationICAO = ctx.destination;
        routeLabel = `${originICAO} → ${destinationICAO}`;
        flightNumber = ctx.flightNumber || null;
      } else {
        // If no flights exist, show airport if resolver gave one
        const ap = stateObj.position && stateObj.position.airport ? stateObj.position.airport : (ac.baseAirport || null);
        if (ap) routeLabel = `${ap}`;
      }
    }

    // ----------------------------
    // Canonical snapshot (v2)
    // ----------------------------
    snapshotV2.push({
      aircraftId: acId, // internal
      registration: ac.registration || ac.reg || "—",
      model: ac.model || ac.type || "—",
      state: stateObj.state, // GROUND | EN_ROUTE | MAINTENANCE
      position: stateObj.position || null, // { airport } or { progress }
      originICAO,
      destinationICAO,
      route: routeLabel,
      flightNumber
    });

    // ----------------------------
    // Legacy live list (kept for your current UI)
    // ----------------------------
    liveList.push({
      aircraftId: acId, // internal
      registration: ac.registration || ac.reg || "—",
      model: ac.model || ac.type || "—",
      state: stateObj.state,
      route: routeLabel,
      flightNumber
    });
  });

  // Optional debug handle (helps your console checks)
  window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = snapshotV2;

  // ✅ Keep current UI working (list)
  window.dispatchEvent(new CustomEvent("ACS_SKYTRACK_LIVE", { detail: liveList }));

  // ✅ New canonical event (next steps: map markers, interpolation)
  window.dispatchEvent(new CustomEvent("ACS_SKYTRACK_SNAPSHOT", { detail: snapshotV2 }));
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
   🧩 SCHEDULE INDEX (scheduleItems)
   ============================================================ */
function ACS_SkyTrack_indexScheduleItems() {
  let items = [];

  try {
    items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch (e) {
    console.warn("SkyTrack: Invalid scheduleItems");
  }

  const byAircraft = {};
  items.forEach(it => {
    if (!it || !it.aircraftId) return;
    if (!byAircraft[it.aircraftId]) byAircraft[it.aircraftId] = [];
    byAircraft[it.aircraftId].push(it);
  });

  return byAircraft;
}

/* ============================================================
   🧠 STATE RESOLVER — FR24 LOGIC
   ============================================================ */
function ACS_SkyTrack_resolveState(aircraftId) {

  const ac = ACS_SkyTrack.aircraftIndex[aircraftId];
  const items = ACS_SkyTrack.itemsByAircraft[aircraftId] || [];
  const now = ACS_SkyTrack.nowAbsMin;

  if (!ac || !Number.isFinite(now)) return null;

  /* ============================================================
     1️⃣ MAINTENANCE — B-CHECK ONLY
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
     2️⃣ EN ROUTE — ACTIVE FLIGHT
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
     3️⃣ GROUND — FR24 RULES
     ============================================================ */
  const pastFlights = items
    .filter(it => it.type === "flight" && Number.isFinite(it.arrAbsMin) && it.arrAbsMin < now)
    .sort((a, b) => b.arrAbsMin - a.arrAbsMin);

  if (pastFlights.length) {
    return {
      state: "GROUND",
      position: { airport: pastFlights[0].destination || null },
      flight: null
    };
  }

  const futureFlights = items
    .filter(it => it.type === "flight" && Number.isFinite(it.depAbsMin) && it.depAbsMin > now)
    .sort((a, b) => a.depAbsMin - b.depAbsMin);

  if (futureFlights.length) {
    return {
      state: "GROUND",
      position: { airport: futureFlights[0].origin || null },
      flight: null
    };
  }

  return {
    state: "GROUND",
    position: { airport: ac.baseAirport || null },
    flight: null
  };
}

/* ============================================================
   🗺️ POSITION ENGINE — EN ROUTE (LINEAR)
   ============================================================ */
function ACS_SkyTrack_computePosition(flight, nowAbsMin) {
  const { origin, destination, depAbsMin, arrAbsMin } = flight;
  if (!origin || !destination) return null;

  const p = (nowAbsMin - depAbsMin) / (arrAbsMin - depAbsMin);
  return { progress: Math.max(0, Math.min(1, p)) };
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

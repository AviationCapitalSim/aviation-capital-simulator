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
   🔄 ON TICK — MAIN LOOP
   ============================================================ */
/* ============================================================
   🔄 ON TICK — MAIN LOOP
   C2: Emit Live Traffic snapshot for UI list (REAL DATA)
   ============================================================ */
function ACS_SkyTrack_onTick() {
  if (!Number.isFinite(ACS_SkyTrack.nowAbsMin)) return;

  const snapshot = [];

  Object.keys(ACS_SkyTrack.aircraftIndex).forEach(acId => {
    const stateObj = ACS_SkyTrack_resolveState(acId);
    if (!stateObj) return;

    const ac = ACS_SkyTrack.aircraftIndex[acId];
    const items = ACS_SkyTrack.itemsByAircraft[acId] || [];

    let route = null;
    let flightNumber = null;

    if (stateObj.flight) {
      route = `${stateObj.flight.origin} → ${stateObj.flight.destination}`;
      flightNumber = stateObj.flight.flightNumber || null;
    } else {
      const now = ACS_SkyTrack.nowAbsMin;

      const future = items
        .filter(it => it.type === "flight" && Number.isFinite(it.depAbsMin) && it.depAbsMin > now)
        .sort((a, b) => a.depAbsMin - b.depAbsMin)[0];

      const past = items
        .filter(it => it.type === "flight" && Number.isFinite(it.arrAbsMin) && it.arrAbsMin < now)
        .sort((a, b) => b.arrAbsMin - a.arrAbsMin)[0];

      const ctx = future || past;
      if (ctx) route = `${ctx.origin} → ${ctx.destination}`;
    }

    snapshot.push({
      aircraftId: acId,               // INTERNAL ONLY
      registration: ac.registration || ac.reg || "—",
      model: ac.model || ac.type || "—",
      state: stateObj.state,           // GROUND | EN_ROUTE | MAINTENANCE
      route,
      flightNumber
    });
  });

  // 🔔 Emit event for SkyTrack UI (list only)
  window.dispatchEvent(
    new CustomEvent("ACS_SKYTRACK_LIVE", { detail: snapshot })
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

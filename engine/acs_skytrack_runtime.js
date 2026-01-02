/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME — FR24 ENGINE (SKELETON)
   Project: Aviation Capital Simulator (ACS)
   Module: SkyTrack Runtime
   Version: v1.0 SKELETON
   Date: 2026-01-02

   PURPOSE:
   - READ ONLY engine
   - Consumes:
       • ACS_MyAircraft
       • scheduleItems (Schedule Table)
       • ACS Time Engine (absolute minutes)
   - Produces:
       • Aircraft state: GROUND | EN ROUTE | MAINTENANCE
       • Position (lat/lng) for map rendering

   IMPORTANT RULES:
   - NO writing to localStorage
   - NO recalculation of schedule
   - NO UI creation here (UI already exists in skytrack.html)
   ============================================================ */

/* ============================================================
   🟦 RUNTIME NAMESPACE (SAFE)
   ============================================================ */
window.ACS_SkyTrack = {
  initialized: false,
  mapReady: false,
  nowAbsMin: null,
  aircraftIndex: {},
  itemsByAircraft: {},
  markers: {},
};

/* ============================================================
   🟦 ENTRY POINT
   ============================================================ */
function ACS_SkyTrack_init() {
  if (ACS_SkyTrack.initialized) return;
  ACS_SkyTrack.initialized = true;

  console.log("✈️ SkyTrack Runtime initialized (skeleton)");

  // Hook to Time Engine (implementation later)
  ACS_SkyTrack_hookTimeEngine();

  // Initial data load (implementation later)
  ACS_SkyTrack_loadData();
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
    // Absolute minutes since simulator epoch
    ACS_SkyTrack.nowAbsMin = Math.floor(currentTime.getTime() / 60000);

    // Tick update
    ACS_SkyTrack_onTick();
  });
}

/* ============================================================
   🔄 ON TICK — MAIN LOOP (SKELETON)
   ============================================================ */
function ACS_SkyTrack_onTick() {
  if (!ACS_SkyTrack.nowAbsMin) return;

  // 1) Resolve state for each aircraft
  // 2) Update positions
  // 3) Update markers
  // (implementation later)
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
   🧠 STATE RESOLVER (PLACEHOLDER)
   ============================================================ */
function ACS_SkyTrack_resolveState(aircraftId) {
  // RETURNS:
  // {
  //   state: "GROUND" | "EN_ROUTE" | "MAINTENANCE",
  //   position: { lat, lng },
  //   flight: flightItem | null
  // }

  return null; // implemented later
}

/* ============================================================
   🗺️ POSITION ENGINE (PLACEHOLDER)
   ============================================================ */
function ACS_SkyTrack_computePosition(flight, nowAbsMin) {
  // Linear interpolation or great-circle (later)
  return null;
}

/* ============================================================
   🧪 DEBUG UTILITIES (SAFE)
   ============================================================ */
function ACS_SkyTrack_debugDump() {
  console.table({
    nowAbsMin: ACS_SkyTrack.nowAbsMin,
    fleetSize: Object.keys(ACS_SkyTrack.aircraftIndex).length,
    aircraftWithSchedule: Object.keys(ACS_SkyTrack.itemsByAircraft).length,
  });
}

/* ============================================================
   🚀 AUTO INIT (SAFE)
   ============================================================ */
document.addEventListener("DOMContentLoaded", ACS_SkyTrack_init);

/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME — SINGLE ENGINE (FINAL)
   Version: v1.2 FINAL
   Date: 02 JAN 2026

   PURPOSE:
   - Execute real flights from Schedule Table
   - Single Time Engine (ABS MINUTES)
   - Produce canonical snapshot for SkyTrack

   OUTPUT:
   - Event: ACS_SKYTRACK_SNAPSHOT

   RULES:
   - NO legacy
   - NO map
   - NO DOM
   - NO HH:MM
   ============================================================ */

window.ACS_SkyTrack = {
  initialized: false,
  nowAbsMin: null,
  aircraftIndex: {},
  itemsByAircraft: {}
};

/* ============================================================
   🚀 INIT
   ============================================================ */
function ACS_SkyTrack_init() {
  if (ACS_SkyTrack.initialized) return;
  ACS_SkyTrack.initialized = true;

  console.log("✈️ SkyTrack Runtime initialized (SINGLE ENGINE)");

  ACS_SkyTrack_loadData();
  ACS_SkyTrack_hookTimeEngine();
}

/* ============================================================
   ⏱ TIME ENGINE (ABS MIN ONLY)
   ============================================================ */
function ACS_SkyTrack_hookTimeEngine() {
  if (typeof registerTimeListener !== "function") {
    console.warn("⛔ SkyTrack: Time Engine not available");
    return;
  }

  registerTimeListener((currentTime) => {
  let abs = null;

  // ✅ Case A: listener sends absMin directly (number)
  if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
    abs = currentTime;
  }

  // ✅ Case B: listener sends object with absMin / nowAbsMin
  if (!Number.isFinite(abs) && currentTime && typeof currentTime === "object") {
    if (Number.isFinite(currentTime.absMin)) abs = currentTime.absMin;
    else if (Number.isFinite(currentTime.nowAbsMin)) abs = currentTime.nowAbsMin;
    else if (Number.isFinite(currentTime.absoluteMin)) abs = currentTime.absoluteMin;
  }

  // ✅ Case C: global ACS_TIME carries absMin
  if (!Number.isFinite(abs) && window.ACS_TIME && Number.isFinite(window.ACS_TIME.absMin)) {
    abs = window.ACS_TIME.absMin;
  }
  if (!Number.isFinite(abs) && window.ACS_TIME && Number.isFinite(window.ACS_TIME.nowAbsMin)) {
    abs = window.ACS_TIME.nowAbsMin;
  }

  // ✅ Case D: localStorage fallback
  if (!Number.isFinite(abs)) {
    try {
      const t = JSON.parse(localStorage.getItem("ACS_TIME") || "{}");
      if (Number.isFinite(t.absMin)) abs = t.absMin;
      else if (Number.isFinite(t.nowAbsMin)) abs = t.nowAbsMin;
    } catch (e) {}
  }

  if (!Number.isFinite(abs)) {
    console.warn("⛔ SkyTrack: absMin not available from Time Engine");
    return;
  }

  ACS_SkyTrack.nowAbsMin = Math.floor(abs);

  // ✅ IMPORTANT: re-index schedule each tick (see R2)
  ACS_SkyTrack_refreshScheduleIfNeeded();

  ACS_SkyTrack_onTick();
});
}

/* ============================================================
   🔁 TICK — BUILD SNAPSHOT
   ============================================================ */
function ACS_SkyTrack_onTick() {
  const now = ACS_SkyTrack.nowAbsMin;
  if (!Number.isFinite(now)) return;

  const snapshot = [];

  Object.keys(ACS_SkyTrack.aircraftIndex).forEach(acId => {
    const ac = ACS_SkyTrack.aircraftIndex[acId];
    const items = ACS_SkyTrack.itemsByAircraft[acId] || [];

    const stateObj = ACS_SkyTrack_resolveState(ac, items, now);
    if (!stateObj) return;

    snapshot.push({
      aircraftId: acId,
      registration: ac.registration || ac.reg || "—",
      model: ac.model || ac.type || "—",
      state: stateObj.state,            // GROUND | EN_ROUTE | MAINTENANCE
      position: stateObj.position,      // { airport } | { progress }
      flight: stateObj.flight || null   // active flight if any
    });
  });

  window.dispatchEvent(
    new CustomEvent("ACS_SKYTRACK_SNAPSHOT", { detail: snapshot })
  );
}

/* ============================================================
   📦 LOAD DATA
   ============================================================ */
function ACS_SkyTrack_loadData() {
  ACS_SkyTrack.aircraftIndex = {};
  ACS_SkyTrack.itemsByAircraft = {};

  try {
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    fleet.forEach(ac => {
      if (ac && ac.id) ACS_SkyTrack.aircraftIndex[ac.id] = ac;
    });
  } catch {}

  try {
    const items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    items.forEach(it => {
      if (!it || !it.aircraftId) return;
      if (!ACS_SkyTrack.itemsByAircraft[it.aircraftId]) {
        ACS_SkyTrack.itemsByAircraft[it.aircraftId] = [];
      }
      ACS_SkyTrack.itemsByAircraft[it.aircraftId].push(it);
    });
  } catch {}
}

/* ============================================================
   🔄 SCHEDULE REFRESH (NO LEGACY)
   Purpose:
   - Fix "no aircraft / no flights" when localStorage loads late
   - Support alternative keys without changing architecture
   ============================================================ */
function ACS_SkyTrack_refreshScheduleIfNeeded() {
  // If we already have flights indexed, do nothing
  const hasAnyAircraft = Object.keys(ACS_SkyTrack.aircraftIndex || {}).length > 0;
  const hasAnySchedule = Object.keys(ACS_SkyTrack.itemsByAircraft || {}).length > 0;

  // If either is empty, try reloading (late localStorage / different key)
  if (!hasAnyAircraft || !hasAnySchedule) {
    // Fleet key variants
    let fleetRaw = localStorage.getItem("ACS_MyAircraft");
    if (!fleetRaw) fleetRaw = localStorage.getItem("ACS_MY_AIRCRAFT");

    // Schedule key variants
    let schedRaw = localStorage.getItem("scheduleItems");
    if (!schedRaw) schedRaw = localStorage.getItem("ACS_SCHEDULE_TABLE");

    if (fleetRaw) {
      try {
        const fleet = JSON.parse(fleetRaw || "[]");
        const idx = {};
        fleet.forEach(ac => { if (ac && ac.id) idx[ac.id] = ac; });
        ACS_SkyTrack.aircraftIndex = idx;
      } catch (e) {}
    }

    if (schedRaw) {
      try {
        const items = JSON.parse(schedRaw || "[]");
        const byAircraft = {};
        items.forEach(it => {
          if (!it || !it.aircraftId) return;
          if (!byAircraft[it.aircraftId]) byAircraft[it.aircraftId] = [];
          byAircraft[it.aircraftId].push(it);
        });
        ACS_SkyTrack.itemsByAircraft = byAircraft;
      } catch (e) {}
    }

    // Optional: one-time visibility
    // console.log("🔄 SkyTrack refresh:", Object.keys(ACS_SkyTrack.aircraftIndex).length, Object.keys(ACS_SkyTrack.itemsByAircraft).length);
  }
}

/* ============================================================
   🧠 STATE RESOLVER — FR24 LOGIC
   ============================================================ */
function ACS_SkyTrack_resolveState(ac, items, now) {

  // 1️⃣ MAINTENANCE (B-check)
  const bCheck = items.find(it =>
    it.type === "service" &&
    it.serviceType === "B" &&
    Number.isFinite(it.startAbsMin) &&
    Number.isFinite(it.durationMin) &&
    now >= it.startAbsMin &&
    now < it.startAbsMin + it.durationMin
  );

  if (bCheck) {
    return {
      state: "MAINTENANCE",
      position: { airport: ac.baseAirport || null },
      flight: null
    };
  }

  // 2️⃣ EN ROUTE
  const activeFlight = items.find(it =>
    it.type === "flight" &&
    Number.isFinite(it.depAbsMin) &&
    Number.isFinite(it.arrAbsMin) &&
    now >= it.depAbsMin &&
    now < it.arrAbsMin
  );

  if (activeFlight) {
    return {
      state: "EN_ROUTE",
      position: ACS_SkyTrack_computePosition(activeFlight, now),
      flight: activeFlight
    };
  }

  // 3️⃣ GROUND — last arrived or next departure
  const past = items
    .filter(it => it.type === "flight" && Number.isFinite(it.arrAbsMin) && it.arrAbsMin < now)
    .sort((a, b) => b.arrAbsMin - a.arrAbsMin)[0];

  if (past) {
    return {
      state: "GROUND",
      position: { airport: past.destination || null },
      flight: null
    };
  }

  const future = items
    .filter(it => it.type === "flight" && Number.isFinite(it.depAbsMin) && it.depAbsMin > now)
    .sort((a, b) => a.depAbsMin - b.depAbsMin)[0];

  if (future) {
    return {
      state: "GROUND",
      position: { airport: future.origin || null },
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
   🗺️ POSITION (EN ROUTE)
   ============================================================ */
function ACS_SkyTrack_computePosition(flight, now) {
  const p = (now - flight.depAbsMin) / (flight.arrAbsMin - flight.depAbsMin);
  return { progress: Math.max(0, Math.min(1, p)) };
}

/* ============================================================
   🚀 AUTO INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", ACS_SkyTrack_init);

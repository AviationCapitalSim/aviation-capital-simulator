/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — FR24 MODE (MULTI-FLIGHT)
   ------------------------------------------------------------
   Source of truth : scheduleItems
   Time source     : ACS_TIME.minute
   Publishes       : window.ACS_LIVE_FLIGHTS[]
   ============================================================ */

/* ============================================================
   🧩 EXEC FLIGHT SAFE RESOLVER (GLOBAL READ-ONLY)
   ============================================================ */
function getExecFlight() {
  try {
    return JSON.parse(localStorage.getItem("ACS_FLIGHT_EXEC"));
  } catch {
    return null;
  }
}

// 🔓 EXPORT REAL (CRÍTICO)
window.getExecFlight = getExecFlight;

(function () {

  if (typeof registerTimeListener !== "function") {
    console.warn("⛔ ACS Runtime: registerTimeListener not found.");
    return;
  }

  console.log("✈️ ACS Flight Runtime Engine — ACTIVE (FR24 MODE)");

 /* ============================================================
   ✈️ UPDATE WORLD FLIGHTS — FR24 LOOP
   ============================================================ */

function updateWorldFlights() {

  if (!window.ACS_TIME || typeof ACS_TIME.minute !== "number") return;

  const nowMin = (ACS_TIME.minute + 1440) % 1440;

  let items;
  try {
    items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch {
    items = [];
  }

  if (!Array.isArray(items) || items.length === 0) {
    window.ACS_LIVE_FLIGHTS = [];
    try { localStorage.setItem("ACS_LIVE_FLIGHTS", "[]"); } catch {}
    return;
  }

  /* ============================================================
     🟦 FASE 7.8 — ABSOLUTE TIME NORMALIZATION
     ============================================================ */

  function normalizeFlightTime(f) {

    if (
      typeof f.depAbsMin === "number" &&
      typeof f.arrAbsMin === "number"
    ) {
      return {
        dep: f.depAbsMin,
        arr: f.arrAbsMin
      };
    }

    // Fallback legacy (single-day schedule)
    const dep = (f.depMin + 1440) % 1440;
    const arr = (f.arrMin + 1440) % 1440;

    if (arr < dep) {
      return {
        dep,
        arr: arr + 1440
      };
    }

    return { dep, arr };
  }

  const liveFlights = [];

  // --------------------------------------------------------
  // Resolve airports (SkyTrack adapter → WorldAirportsACS)
  // --------------------------------------------------------
  function resolveAirport(icao) {

    if (!icao) return null;

    // 1) SkyTrack adapter
    if (typeof window.getSkyTrackAirportByICAO === "function") {
      const a = window.getSkyTrackAirportByICAO(icao);
      if (a && typeof a.lat === "number" && typeof a.lng === "number") {
        return a;
      }
    }

    // 2) WorldAirportsACS container
    const wa = window.WorldAirportsACS;
    if (!wa) return null;

    const found = Object.values(wa)
      .flat()
      .find(a => a && a.icao === icao);

    return found || null;
  }

  /* ============================================================
     🟦 FASE 7.9 — FLIGHT STATE RESOLUTION (FR24)
     ============================================================ */

  items.forEach(f => {

    if (!f || !f.aircraftId || !f.origin || !f.destination) return;

    const t = normalizeFlightTime(f);
    if (typeof t.dep !== "number" || typeof t.arr !== "number") return;

    const o = resolveAirport(f.origin);
    const d = resolveAirport(f.destination);
    if (!o || !d) return;

    let status = "GROUND";
    let lat = o.lat;
    let lng = o.lng;

    if (nowMin >= t.dep && nowMin <= t.arr) {
      status = "AIRBORNE";

      const progress = Math.min(
        Math.max((nowMin - t.dep) / (t.arr - t.dep), 0),
        1
      );

      lat = o.lat + (d.lat - o.lat) * progress;
      lng = o.lng + (d.lng - o.lng) * progress;

    } else if (nowMin > t.arr) {
      status = "ARRIVED";
      lat = d.lat;
      lng = d.lng;
    }

    liveFlights.push({
      aircraftId   : String(f.aircraftId),
      flightNumber : f.flightNumber || f.flightOut || null,
      origin       : f.origin,
      destination  : f.destination,
      depMin       : t.dep,
      arrMin       : t.arr,
      lat,
      lng,
      status,
      updatedAt    : Date.now()
    });

  });

  // ----------------------------------------------------------
  // Publish FR24-style live flights
  // ----------------------------------------------------------
  window.ACS_LIVE_FLIGHTS = liveFlights;

  try {
    localStorage.setItem(
      "ACS_LIVE_FLIGHTS",
      JSON.stringify(liveFlights)
    );
  } catch (e) {
    console.warn("ACS_LIVE_FLIGHTS persist failed", e);
  }
}

// 🔓 EXPORT
window.updateWorldFlights = updateWorldFlights;
   
/* ============================================================
   🟦 FASE 7.5.2 — DAILY FLIGHT QUEUE BUILDER (AUTHORITATIVE)
   ============================================================ */

function buildDailyFlightQueue() {

  const schedule =
    JSON.parse(localStorage.getItem("ACS_SCHEDULE_TABLE") || "[]");

  const queue = {};
  
  schedule.forEach(it => {

    if (!it || !it.aircraftId) return;
    if (typeof it.depMin !== "number" || typeof it.arrMin !== "number") return;

    if (!queue[it.aircraftId]) {
      queue[it.aircraftId] = [];
    }

    queue[it.aircraftId].push({
      aircraftId   : it.aircraftId,
      flightNumber : it.flightNumber || it.flightOut || null,
      origin       : it.origin,
      destination  : it.destination,
      depMin       : it.depMin,
      arrMin       : it.arrMin,
      turnaround   : it.turnaroundMin || it.turnaround || 45
    });

  });

  // Sort flights per aircraft by departure time
  Object.keys(queue).forEach(acId => {
    queue[acId].sort((a, b) => a.depMin - b.depMin);
  });

  window.ACS_FLIGHT_QUEUE = queue;

  console.log(
    "[FASE 7.5.2] DAILY FLIGHT QUEUE BUILT",
    Object.keys(queue)
  );
}
   
// ============================================================
// 🟦 FASE 7.6 — BUILD DAILY FLIGHT QUEUE (BOOT)
// ============================================================

buildDailyFlightQueue();


  // ============================================================
  // 🔒 WAIT FOR WORLD AIRPORTS — HARD GATE
  // ============================================================

  function waitForWorldAirports(cb) {
    try {
      if (window.WorldAirportsACS && Object.keys(window.WorldAirportsACS).length > 0) {
        cb();
        return;
      }
    } catch (e) {}
    setTimeout(() => waitForWorldAirports(cb), 200);
  }

  /* ============================================================
     ⏱ TIME ENGINE HOOK — SINGLE (NO DUPES)
     ============================================================ */

  waitForWorldAirports(() => {
    registerTimeListener(() => {
      if (typeof window.updateWorldFlights === "function") {
        window.updateWorldFlights();
      }
    });
  });

})();

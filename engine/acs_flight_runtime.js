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
   ✈️ UPDATE WORLD FLIGHTS — PASSIVE FR24 MODE (STABLE)
   ============================================================ */

function updateWorldFlights() {

  if (!window.ACS_TIME || typeof ACS_TIME.minute !== "number") return;

  const nowMin = (ACS_TIME.minute + 1440) % 1440;

  let scheduleItems = [];
  try {
    scheduleItems = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch {}

  const liveFlights = [];

  // ------------------------------------------------------------
  // Resolve airport coordinates
  // ------------------------------------------------------------
  function resolveAirport(icao) {
    if (!icao) return null;

    if (window.getSkyTrackAirportByICAO) {
      const a = window.getSkyTrackAirportByICAO(icao);
      if (a && typeof a.lat === "number" && typeof a.lng === "number") {
        return a;
      }
    }

    const wa = window.WorldAirportsACS;
    if (!wa) return null;

    return Object.values(wa).flat().find(a => a?.icao === icao) || null;
  }

  // ------------------------------------------------------------
  // PASSIVE LOOP — ONE ENTRY PER SCHEDULE FLIGHT
  // ------------------------------------------------------------
  scheduleItems.forEach(f => {

    if (!f || !f.origin || !f.destination) return;

    if (typeof f.depMin !== "number" || typeof f.arrMin !== "number") return;

    let dep = (f.depMin + 1440) % 1440;
    let arr = (f.arrMin + 1440) % 1440;
    if (arr < dep) arr += 1440;

    const o = resolveAirport(f.origin);
    const d = resolveAirport(f.destination);
    if (!o || !d) return;

    let status = "GROUND";
    let lat = o.lat;
    let lng = o.lng;

    // ✈️ AIRBORNE
    if (
      (dep <= arr && nowMin >= dep && nowMin <= arr) ||
      (dep > arr && (nowMin >= dep || nowMin <= arr))
    ) {
      status = "AIRBORNE";
      const progress = Math.min(
        Math.max((nowMin - dep) / (arr - dep), 0),
        1
      );
      lat = o.lat + (d.lat - o.lat) * progress;
      lng = o.lng + (d.lng - o.lng) * progress;
    }

    // 🛬 ARRIVED
    if (nowMin > arr) {
      status = "GROUND";
      lat = d.lat;
      lng = d.lng;
    }

    liveFlights.push({
      aircraftId   : String(f.aircraftId || ""),
      aircraftType : f.modelKey || f.aircraft || null,
      flightNumber : f.flightNumber || f.flightOut || null,
      origin       : f.origin,
      destination  : f.destination,
      depMin       : dep,
      arrMin       : arr,
      lat,
      lng,
      status,
      updatedAt    : Date.now()
    });

  });

  // ------------------------------------------------------------
  // Publish to SkyTrack
  // ------------------------------------------------------------
  window.ACS_LIVE_FLIGHTS = liveFlights;

  try {
    localStorage.setItem(
      "ACS_LIVE_FLIGHTS",
      JSON.stringify(liveFlights)
    );
  } catch {}
}

// 🔓 EXPORT
window.updateWorldFlights = updateWorldFlights;

/* ============================================================
   🟦 FASE 8.4 — TIME ENGINE HOOK (CRITICAL)
   ------------------------------------------------------------
   Ensures updateWorldFlights() is executed on every game minute
   ============================================================ */

(function bindWorldFlightsToTimeEngine() {

  // 1️⃣ Preferred: central ACS time listener
  if (typeof window.registerTimeListener === "function") {
    window.registerTimeListener(() => {
      try {
        updateWorldFlights();
      } catch (e) {
        console.error("updateWorldFlights error:", e);
      }
    });

    console.log("🟢 updateWorldFlights bound via registerTimeListener");
    return;
  }

  // 2️⃣ Fallback: poll ACS_TIME.minute changes
  let lastMinute = null;

  setInterval(() => {
    if (!window.ACS_TIME || typeof window.ACS_TIME.minute !== "number") return;

    if (window.ACS_TIME.minute !== lastMinute) {
      lastMinute = window.ACS_TIME.minute;

      try {
        updateWorldFlights();
      } catch (e) {
        console.error("updateWorldFlights error:", e);
      }
    }
  }, 800); // safe, lightweight

  console.log("🟡 updateWorldFlights bound via fallback interval");

})();
   
/* ============================================================
   🟦 FASE 7.5.2 — DAILY FLIGHT QUEUE BUILDER (AUTHORITATIVE)
   ============================================================ */

function buildDailyFlightQueue() {

  let schedule = [];
  try {
    schedule = JSON.parse(localStorage.getItem("ACS_SCHEDULE_TABLE") || "[]");
  } catch {
    schedule = [];
  }

  // ✅ fallback real: usar scheduleItems si la tabla no está en esta página
  if (!Array.isArray(schedule) || schedule.length === 0) {
    try {
      schedule = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    } catch {
      schedule = [];
    }
  }

  const queue = {};

  schedule.forEach(it => {

    if (!it || !it.aircraftId) return;

    const depMin = (typeof it.depMin === "number") ? it.depMin : Number(it.depMin);
    const arrMin = (typeof it.arrMin === "number") ? it.arrMin : Number(it.arrMin);

    if (!Number.isFinite(depMin) || !Number.isFinite(arrMin)) return;

    if (!queue[it.aircraftId]) queue[it.aircraftId] = [];

    queue[it.aircraftId].push({
      aircraftId   : it.aircraftId,
      flightNumber : it.flightNumber || it.flightOut || it.id || null,
      origin       : it.origin || it.from || null,
      destination  : it.destination || it.to || null,
      depMin       : depMin,
      arrMin       : arrMin,
      turnaround   : it.turnaroundMin || it.turnaround || 45
    });

  });

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

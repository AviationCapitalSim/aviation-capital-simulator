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
   ✈️ UPDATE WORLD FLIGHTS — FR24 LOOP (STABLE)
   ============================================================ */

function updateWorldFlights() {

  if (!window.ACS_TIME || typeof window.ACS_TIME.minute !== "number") return;

  const nowMin = (ACS_TIME.minute + 1440) % 1440;

  let items = [];
  try {
    items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch {}

  // 🔒 DECLARACIÓN ÚNICA Y SEGURA
  const liveFlights = [];

  if (!Array.isArray(items) || items.length === 0) {
    window.ACS_LIVE_FLIGHTS = liveFlights;
    try { localStorage.setItem("ACS_LIVE_FLIGHTS", "[]"); } catch {}
    return;
  }

  /* ============================================================
     🟦 TIME NORMALIZATION (DAILY SAFE)
     ============================================================ */
  function normalizeFlightTime(f) {

    if (typeof f.depMin === "number" && typeof f.arrMin === "number") {
      const dep = (f.depMin + 1440) % 1440;
      let arr = (f.arrMin + 1440) % 1440;
      if (arr < dep) arr += 1440;
      return { dep, arr };
    }

    if (
      typeof f.depAbsMin === "number" &&
      typeof f.arrAbsMin === "number"
    ) {
      const dep = (f.depAbsMin + 1440) % 1440;
      let arr = (f.arrAbsMin + 1440) % 1440;
      if (arr < dep) arr += 1440;
      return { dep, arr };
    }

    return null;
  }

  // --------------------------------------------------------
  // Resolve airports
  // --------------------------------------------------------
  function resolveAirport(icao) {
    if (!icao) return null;

    if (typeof window.getSkyTrackAirportByICAO === "function") {
      const a = window.getSkyTrackAirportByICAO(icao);
      if (a && typeof a.lat === "number" && typeof a.lng === "number") {
        return a;
      }
    }

    const wa = window.WorldAirportsACS;
    if (!wa) return null;

    return Object.values(wa).flat().find(a => a?.icao === icao) || null;
  }

  /* ============================================================
     🟦 GROUP BY AIRCRAFT (FR24 WINDOW)
     ============================================================ */

  const byAircraft = {};
  items.forEach(f => {
    if (!f?.aircraftId || !f.origin || !f.destination) return;
    if (!byAircraft[f.aircraftId]) byAircraft[f.aircraftId] = [];
    byAircraft[f.aircraftId].push(f);
  });

  Object.values(byAircraft).forEach(list =>
    list.sort((a, b) => a.depMin - b.depMin)
  );

  /* ============================================================
     🟦 STATE RESOLUTION (ONE PER AIRCRAFT)
     ============================================================ */

  Object.entries(byAircraft).forEach(([aircraftId, flights]) => {

    let selected = null;
    let status = "GROUND";

    for (const f of flights) {
      const t = normalizeFlightTime(f);
      if (!t) continue;

      if (nowMin >= t.dep && nowMin <= t.arr) {
        selected = f;
        status = "AIRBORNE";
        break;
      }
    }

    if (!selected) {
      for (const f of flights) {
        const t = normalizeFlightTime(f);
        if (t && nowMin > t.arr) selected = f;
      }
      if (selected) status = "ARRIVED";
    }

    if (!selected) {
      selected = flights[0];
      status = "GROUND";
    }

    const t = normalizeFlightTime(selected);
    if (!t) return;

    const o = resolveAirport(selected.origin);
    const d = resolveAirport(selected.destination);
    if (!o || !d) return;

    let lat = o.lat;
    let lng = o.lng;

    if (status === "AIRBORNE") {
      const p = Math.min(
        Math.max((nowMin - t.dep) / (t.arr - t.dep), 0),
        1
      );
      lat = o.lat + (d.lat - o.lat) * p;
      lng = o.lng + (d.lng - o.lng) * p;
    }

    if (status === "ARRIVED") {
      lat = d.lat;
      lng = d.lng;
    }

    liveFlights.push({
      aircraftId  : String(aircraftId),
      flightNumber: selected.flightNumber || selected.flightOut || null,
      origin      : selected.origin,
      destination : selected.destination,
      depMin      : t.dep,
      arrMin      : t.arr,
      lat,
      lng,
      status,
      updatedAt   : Date.now()
    });

  });

  // ----------------------------------------------------------
  // Publish
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

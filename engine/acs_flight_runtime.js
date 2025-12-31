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
   ✈️ UPDATE WORLD FLIGHTS — FR24 LOOP (24/7 GROUNDED SAFE)
   ============================================================ */

function updateWorldFlights() {

  if (!window.ACS_TIME || typeof window.ACS_TIME.minute !== "number") return;

  const nowMin = (window.ACS_TIME.minute + 1440) % 1440;

  let items = [];
  try {
    items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch {
    items = [];
  }

  const liveFlights = [];

  // -----------------------------
  // Helpers
  // -----------------------------
  const baseIcao =
    window.ACS_BASE_ICAO ||
    localStorage.getItem("ACS_BASE_ICAO") ||
    localStorage.getItem("ACS_BASE") ||
    "LEMD";

  function resolveAirport(icao) {
    if (!icao) return null;

    if (typeof window.getSkyTrackAirportByICAO === "function") {
      const a = window.getSkyTrackAirportByICAO(icao);
      if (a && typeof a.lat === "number" && typeof a.lng === "number") return a;
    }

    const wa = window.WorldAirportsACS;
    if (!wa) return null;

    try {
      return Object.values(wa).flat().find(a => a && a.icao === icao) || null;
    } catch {
      return null;
    }
  }

  function normalizeFlightTime(f) {
    const depRaw = (typeof f?.depMin === "number") ? f.depMin : Number(f?.depMin);
    const arrRaw = (typeof f?.arrMin === "number") ? f.arrMin : Number(f?.arrMin);

    if (!Number.isFinite(depRaw) || !Number.isFinite(arrRaw)) return null;

    const dep = (depRaw + 1440) % 1440;
    let arr = (arrRaw + 1440) % 1440;

    // if crosses midnight, stretch to next day range
    if (arr < dep) arr += 1440;

    return { dep, arr };
  }

  // -----------------------------
  // If no scheduleItems, publish empty and exit
  // -----------------------------
  if (!Array.isArray(items) || items.length === 0) {
    window.ACS_LIVE_FLIGHTS = liveFlights;
    try { localStorage.setItem("ACS_LIVE_FLIGHTS", "[]"); } catch {}
    return;
  }

  // -----------------------------
  // Group by aircraft
  // -----------------------------
  const byAircraft = {};
  items.forEach(f => {
    if (!f) return;
    const acId = f.aircraftId;
    if (!acId) return;
    if (!byAircraft[acId]) byAircraft[acId] = [];
    byAircraft[acId].push(f);
  });

  Object.values(byAircraft).forEach(list => {
    list.sort((a, b) => {
      const da = (typeof a?.depMin === "number") ? a.depMin : Number(a?.depMin);
      const db = (typeof b?.depMin === "number") ? b.depMin : Number(b?.depMin);
      return (Number.isFinite(da) ? da : 0) - (Number.isFinite(db) ? db : 0);
    });
  });

  // -----------------------------
  // One aircraft → always one visible entry (24/7)
  // -----------------------------
  const baseA = resolveAirport(baseIcao);

  Object.entries(byAircraft).forEach(([aircraftId, flights]) => {

    // pick ACTIVE if any, else NEXT if any, else LAST (still ground)
    let selected = null;
    let status = "GROUND";

    // 1) active
    for (const f of flights) {
      const t = normalizeFlightTime(f);
      if (!t) continue;

      // active if now within [dep,arr] in stretched space
      let nowAdj = nowMin;
      const dep = t.dep;
      const arr = t.arr;

      if (arr >= 1440 && nowMin < dep) nowAdj = nowMin + 1440;

      if (nowAdj >= dep && nowAdj <= arr) {
        selected = f;
        status = "AIRBORNE";
        break;
      }
    }

    // 2) next (ground)
    if (!selected) {
      for (const f of flights) {
        const t = normalizeFlightTime(f);
        if (!t) continue;
        if (nowMin < (t.dep % 1440)) {
          selected = f;
          status = "GROUND";
          break;
        }
      }
    }

    // 3) last (ground)
    if (!selected) {
      selected = flights[flights.length - 1] || flights[0] || null;
      status = "GROUND";
    }

    // If somehow nothing, still publish an aircraft marker at base
    if (!selected) {
      const lat0 = baseA?.lat ?? 0;
      const lng0 = baseA?.lng ?? 0;

      liveFlights.push({
        aircraftId    : String(aircraftId),
        flightNumber  : null,
        aircraftModel : null,
        origin        : baseIcao,
        destination   : baseIcao,
        depMin        : null,
        arrMin        : null,
        lat           : lat0,
        lng           : lng0,
        status        : "GROUND",
        progress      : 0,
        remainingMin  : null,
        updatedAt     : Date.now()
      });

      return;
    }

    const t = normalizeFlightTime(selected);

    // Airports: if missing, fall back to base so the aircraft never disappears
    const originIcao = selected.origin || selected.from || baseIcao;
    const destIcao   = selected.destination || selected.to || baseIcao;

    const o = resolveAirport(originIcao) || baseA;
    const d = resolveAirport(destIcao) || baseA;

    const latBase = baseA?.lat ?? o?.lat ?? 0;
    const lngBase = baseA?.lng ?? o?.lng ?? 0;

    let lat = (o?.lat ?? latBase);
    let lng = (o?.lng ?? lngBase);
    let progress = 0;
    let remainingMin = null;

    if (status === "AIRBORNE" && t && o && d) {

      let nowAdj = nowMin;
      if (t.arr >= 1440 && nowMin < t.dep) nowAdj = nowMin + 1440;

      const total = Math.max(t.arr - t.dep, 1);
      const elapsed = Math.min(Math.max(nowAdj - t.dep, 0), total);

      progress = Math.min(Math.max(elapsed / total, 0), 1);
      remainingMin = Math.max(t.arr - nowAdj, 0);

      lat = o.lat + (d.lat - o.lat) * progress;
      lng = o.lng + (d.lng - o.lng) * progress;

    } else {
      // ground always visible at origin/base
      lat = (o?.lat ?? latBase);
      lng = (o?.lng ?? lngBase);
      progress = 0;
      remainingMin = null;
    }

    liveFlights.push({
      aircraftId    : String(aircraftId),
      flightNumber  : selected.flightNumber || selected.flightOut || selected.id || null,
      aircraftModel : selected.aircraftModel || selected.modelKey || selected.aircraft || selected.model || null,
      origin        : originIcao,
      destination   : destIcao,
      depMin        : t ? t.dep : null,
      arrMin        : t ? t.arr : null,
      lat,
      lng,
      status,
      progress,
      remainingMin,
      updatedAt     : Date.now()
    });

  });

  // -----------------------------
  // Publish
  // -----------------------------
  window.ACS_LIVE_FLIGHTS = liveFlights;

  try {
    localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
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

/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — SINGLE EXEC MODE
   ------------------------------------------------------------
   Source of truth: ACS_FLIGHT_EXEC 30DEC25
   Time source: ACS_TIME (NO bootstrap, NO override)
   Publishes: ACS_LIVE_FLIGHTS[]
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

  console.log("✈️ ACS Flight Runtime Engine — ACTIVE (EXEC MODE)");

  /* ============================================================
     🔹 UTILS
     ============================================================ */

  function getExecFlight() {
    try {
      return JSON.parse(localStorage.getItem("ACS_FLIGHT_EXEC"));
    } catch {
      return null;
    }
  }

  function getAirportByICAO(icao) {
    if (!icao || !window.WorldAirportsACS) return null;
    return Object.values(WorldAirportsACS)
      .flat()
      .find(a => a.icao === icao) || null;
  }

  function interpolateGC(lat1, lng1, lat2, lng2, t) {
    return {
      lat: lat1 + (lat2 - lat1) * t,
      lng: lng1 + (lng2 - lng1) * t
    };
  }

 /* ============================================================
   ✈️ UPDATE WORLD FLIGHTS — RUNTIME (RESTORED, SCHEDULE-DRIVEN)
   ------------------------------------------------------------
   - Source of truth: scheduleItems
   - Time source: ACS_TIME (minute of day)
   - NO EXEC MODE
   ============================================================ */

function updateWorldFlights() {

  if (!window.ACS_TIME) return;

  const nowMin = (ACS_TIME.minute + 1440) % 1440;

  // ------------------------------------------------------------
  // Read Schedule Table (REAL FLIGHTS)
  // ------------------------------------------------------------
  let items;
  try {
    items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch {
    return;
  }

  if (!Array.isArray(items) || !items.length) return;

  // ------------------------------------------------------------
  // Find ACTIVE flight (as before)
  // ------------------------------------------------------------
  let activeFlight = null;

  for (const it of items) {

    if (!it.aircraftId || !it.origin || !it.destination) continue;
    if (it.origin === it.destination) continue;

    const depMin =
      typeof it.depMin === "number" ? it.depMin :
      typeof it.blockOut === "number" ? it.blockOut :
      null;

    const arrMin =
      typeof it.arrMin === "number" ? it.arrMin :
      typeof it.blockIn === "number" ? it.blockIn :
      null;

    if (depMin == null || arrMin == null) continue;

    const depAdj = (depMin + 1440) % 1440;
    const arrAdj = (arrMin + 1440) % 1440;

    const inWindow =
      depAdj <= arrAdj
        ? (nowMin >= depAdj && nowMin <= arrAdj)
        : (nowMin >= depAdj || nowMin <= arrAdj);

    if (inWindow) {
      activeFlight = {
        aircraftId: it.aircraftId,
        aircraftModel: it.aircraftModel || it.model || "",
        flightNo: it.flightNumber || it.flightOut || null,
        origin: it.origin,
        destination: it.destination,
        depMin,
        arrMin
      };
      break;
    }
  }

  if (!activeFlight) return;

  // ------------------------------------------------------------
  // Resolve airports
  // ------------------------------------------------------------
  function resolveAirport(iata) {
    if (!iata || !window.WorldAirportsACS) return null;
    return WorldAirportsACS[iata] || null;
  }

  const o = resolveAirport(activeFlight.origin);
  const d = resolveAirport(activeFlight.destination);
  if (!o || !d) return;

  // ------------------------------------------------------------
  // Position & status
  // ------------------------------------------------------------
  const depAdj = (activeFlight.depMin + 1440) % 1440;
  const arrAdj = (activeFlight.arrMin + 1440) % 1440;

  let elapsed, duration;

  if (depAdj <= arrAdj) {
    elapsed = nowMin - depAdj;
    duration = arrAdj - depAdj;
  } else {
    elapsed = nowMin >= depAdj
      ? nowMin - depAdj
      : nowMin + 1440 - depAdj;
    duration = (arrAdj + 1440) - depAdj;
  }

  const progress = Math.min(Math.max(elapsed / duration, 0), 1);

  const lat = o.lat + (d.lat - o.lat) * progress;
  const lng = o.lng + (d.lng - o.lng) * progress;

  // ------------------------------------------------------------
// Publish LIVE flight (PERSISTED — REQUIRED FOR SKYTRACK)
// ------------------------------------------------------------
const liveFlights = [{
  aircraftId: activeFlight.aircraftId,
  aircraftModel: activeFlight.aircraftModel,
  flightOut: activeFlight.flightNo,
  origin: activeFlight.origin,
  destination: activeFlight.destination,
  lat,
  lng,
  status: "AIRBORNE",
  updatedAt: Date.now()
}];

window.ACS_LIVE_FLIGHTS = liveFlights;

try {
  localStorage.setItem(
    "ACS_LIVE_FLIGHTS",
    JSON.stringify(liveFlights)
  );
} catch (e) {
  console.warn("ACS_LIVE_FLIGHTS persistence failed", e);
}
}


// 🔒 Export
window.updateWorldFlights = updateWorldFlights;

  // ------------------------------------------------------------
  // 🧠 Airport resolver (tries multiple sources safely)
  // ------------------------------------------------------------
  function resolveAirport(icao) {
    if (!icao) return null;

    // 1) SkyTrack adapter
    if (typeof window.getSkyTrackAirportByICAO === "function") {
      const a = window.getSkyTrackAirportByICAO(icao);
      if (a && typeof a.lat === "number" && typeof a.lng === "number") return a;
    }

    // 2) WorldAirportsACS container (common patterns)
    const wa = window.WorldAirportsACS;
    if (wa) {
      if (typeof wa.getByICAO === "function") {
        const a = wa.getByICAO(icao);
        if (a && typeof a.lat === "number" && typeof a.lng === "number") return a;
      }
      if (typeof wa.findByICAO === "function") {
        const a = wa.findByICAO(icao);
        if (a && typeof a.lat === "number" && typeof a.lng === "number") return a;
      }
      if (wa[icao] && typeof wa[icao].lat === "number" && typeof wa[icao].lng === "number") {
        return wa[icao];
      }
    }

    return null;
  }

// ============================================================
// 🔒 WAIT FOR WORLD AIRPORTS — HARD GATE (FIXED)
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
   ⏱ TIME ENGINE HOOK (FIXED + BLINDAJE)
   ============================================================ */

// ✅ BLINDAJE: si el legacy llama updateLiveFlights, lo mapeamos.
if (typeof window.updateLiveFlights !== "function" && typeof window.updateWorldFlights === "function") {
  window.updateLiveFlights = window.updateWorldFlights;
}

waitForWorldAirports(() => {
  if (typeof registerTimeListener === "function") {
    registerTimeListener(() => {
      // ✅ Prioridad: updateWorldFlights (runtime real)
      if (typeof window.updateWorldFlights === "function") {
        window.updateWorldFlights();
        return;
      }
      // ✅ Fallback: updateLiveFlights (legacy)
      if (typeof window.updateLiveFlights === "function") {
        window.updateLiveFlights();
        return;
      }
      // ✅ Último fallback: feeder desde schedule (si existe)
      if (typeof window.buildLiveFlightsFromSchedule === "function") {
        window.buildLiveFlightsFromSchedule();
      }
    });
  }

  console.log("🌍 WorldAirportsACS ready — Flight runtime armed (FIXED)");
});

})();

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

function getExecFlightSafe() {
  try {
    if (typeof getExecFlight === "function") {
      return getExecFlight();
    }
  } catch (e) {}
  return null;
}

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
   ✈️ UPDATE WORLD FLIGHTS — CORE RUNTIME ENGINE (FIXED)
   ============================================================ */

function updateWorldFlights() {

  if (!window.ACS_TIME) return;
  if (!window.getExecFlight) return;

  const exec = getExecFlight();
  if (!exec) return;

  const nowMin = window.ACS_TIME.minute;
  const nowAdj = (nowMin + 1440) % 1440;

  // ------------------------------------------------------------
  // Resolve airport coordinates safely
  // ------------------------------------------------------------
  function resolveAirport(iata) {
    if (!iata || !window.WorldAirportsACS) return null;
    const ap = WorldAirportsACS[iata];
    if (!ap) return null;
    return {
      lat: ap.lat,
      lng: ap.lng
    };
  }

  // ------------------------------------------------------------
  // Validate legs
  // ------------------------------------------------------------
  const legs = exec.legs;
  if (!Array.isArray(legs) || legs.length === 0) return;

  let activeLeg = null;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];

    const depMin = leg.depMin;
    const arrMin = leg.arrMin;

    if (depMin == null || arrMin == null) continue;

    const depAdj = (depMin + 1440) % 1440;
    const arrAdj = (arrMin + 1440) % 1440;

    const inWindow =
      depAdj <= arrAdj
        ? (nowAdj >= depAdj && nowAdj <= arrAdj)
        : (nowAdj >= depAdj || nowAdj <= arrAdj);

    if (inWindow) {
      activeLeg = leg;
      break;
    }
  }

  // ------------------------------------------------------------
  // Determine status + position
  // ------------------------------------------------------------
  let lat = null;
  let lng = null;
  let status = "GROUND";

  if (activeLeg) {

    const origin = resolveAirport(activeLeg.origin);
    const dest   = resolveAirport(activeLeg.destination);

    if (origin && dest) {

      const depAdj = (activeLeg.depMin + 1440) % 1440;
      const arrAdj = (activeLeg.arrMin + 1440) % 1440;

      let elapsed;
      let duration;

      if (depAdj <= arrAdj) {
        elapsed = nowAdj - depAdj;
        duration = arrAdj - depAdj;
      } else {
        elapsed = nowAdj >= depAdj
          ? nowAdj - depAdj
          : nowAdj + 1440 - depAdj;
        duration = (arrAdj + 1440) - depAdj;
      }

      const progress = Math.min(Math.max(elapsed / duration, 0), 1);

      lat = origin.lat + (dest.lat - origin.lat) * progress;
      lng = origin.lng + (dest.lng - origin.lng) * progress;
      status = "AIRBORNE";
    }

  } else {
    // Default grounded at base
    const base = resolveAirport(exec.baseIATA || exec.base);
    if (base) {
      lat = base.lat;
      lng = base.lng;
    }
  }

  // ------------------------------------------------------------
  // Publish ONE dense flight (no holes)
  // ------------------------------------------------------------
  const liveFlights = [{
    aircraftId: exec.aircraftId,
    aircraftModel: exec.aircraftModel || "UNKNOWN",
    flightOut: activeLeg ? activeLeg.flightNo : null,
    origin: activeLeg ? activeLeg.origin : exec.base,
    destination: activeLeg ? activeLeg.destination : null,
    lat,
    lng,
    status,
    updatedAt: Date.now()
  }];

  window.ACS_LIVE_FLIGHTS = liveFlights;
}

// 🔒 Hard export (no ghosts)
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

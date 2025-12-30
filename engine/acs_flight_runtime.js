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
   ✈️ UPDATE WORLD FLIGHTS — FR24 MODE (MULTI-FLIGHT)
   ------------------------------------------------------------
   Source of truth : scheduleItems
   Time source     : ACS_TIME.minute
   Publishes       : window.ACS_LIVE_FLIGHTS[]
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
    return;
  }

  const liveFlights = [];

  items.forEach(it => {

    if (!it || !it.aircraftId || !it.origin || !it.destination) return;
    if (it.origin === it.destination) return;

    const depMin =
      typeof it.depMin === "number"     ? it.depMin     :
      typeof it.depAbsMin === "number"  ? it.depAbsMin  :
      typeof it.blockOut === "number"   ? it.blockOut   :
      null;

    const arrMin =
      typeof it.arrMin === "number"     ? it.arrMin     :
      typeof it.arrAbsMin === "number"  ? it.arrAbsMin  :
      typeof it.blockIn === "number"    ? it.blockIn    :
      null;

    if (depMin === null || arrMin === null) return;

    const depAdj = (depMin + 1440) % 1440;
    const arrAdj = (arrMin + 1440) % 1440;

    // --------------------------------------------------------
    // Resolve airports (SkyTrack adapter → WorldAirportsACS)
    // --------------------------------------------------------
    const resolveAirport = (icao) => {

      if (!icao) return null;

      if (typeof window.getSkyTrackAirportByICAO === "function") {
        const a = window.getSkyTrackAirportByICAO(icao);
        if (a && typeof a.lat === "number" && typeof a.lng === "number") {
          return a;
        }
      }

      const wa = window.WorldAirportsACS;
      if (!wa) return null;

      const found = Object.values(wa)
        .flat()
        .find(a => a.icao === icao);

      return found || null;
    };

    const o = resolveAirport(it.origin);
    const d = resolveAirport(it.destination);
    if (!o || !d) return;

    // --------------------------------------------------------
    // Flight state & position
    // --------------------------------------------------------
    let status = "GROUND";
    let lat = o.lat;
    let lng = o.lng;

    const crossesMidnight = depAdj > arrAdj;

    const inAir = crossesMidnight
      ? (nowMin >= depAdj || nowMin <= arrAdj)
      : (nowMin >= depAdj && nowMin <= arrAdj);

    if (inAir) {
      status = "AIRBORNE";

      let elapsed, duration;

      if (!crossesMidnight) {
        elapsed  = nowMin - depAdj;
        duration = arrAdj - depAdj;
      } else {
        elapsed  = nowMin >= depAdj
          ? nowMin - depAdj
          : nowMin + 1440 - depAdj;
        duration = (arrAdj + 1440) - depAdj;
      }

      const progress = Math.min(Math.max(elapsed / duration, 0), 1);

      lat = o.lat + (d.lat - o.lat) * progress;
      lng = o.lng + (d.lng - o.lng) * progress;
    }

    if (!inAir && !crossesMidnight && nowMin > arrAdj) {
      status = "ARRIVED";
      lat = d.lat;
      lng = d.lng;
    }

    liveFlights.push({
      aircraftId   : String(it.aircraftId),
      flightNumber : it.flightNumber || it.flightOut || null,
      origin       : it.origin,
      destination  : it.destination,
      depMin,
      arrMin,
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
   ⏱ TIME ENGINE HOOK — FR24 LOOP
   ============================================================ */

if (typeof registerTimeListener === "function") {
  registerTimeListener(() => {
    if (typeof window.updateWorldFlights === "function") {
      window.updateWorldFlights();
    }
  });
} else {
  console.warn("⛔ registerTimeListener not available — runtime idle");
}

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

// ------------------------------------------------------------
// Publish LIVE flights (PERSISTED — REQUIRED FOR SKYTRACK)
// ------------------------------------------------------------
window.ACS_LIVE_FLIGHTS = liveFlights;

try {
  localStorage.setItem(
    "ACS_LIVE_FLIGHTS",
    JSON.stringify(liveFlights)
  );
} catch (e) {
  console.warn("ACS_LIVE_FLIGHTS persistence failed", e);
}


// 🔒 Export
window.updateWorldFlights = updateWorldFlights;


// ============================================================
// 🔒 WAIT FOR WORLD AIRPORTS — HARD GATE (FIXED)
// ============================================================

function waitForWorldAirports(cb) {
  try {
    if (
      window.WorldAirportsACS &&
      Object.keys(window.WorldAirportsACS).length > 0
    ) {
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
if (
  typeof window.updateLiveFlights !== "function" &&
  typeof window.updateWorldFlights === "function"
) {
  window.updateLiveFlights = window.updateWorldFlights;
}

waitForWorldAirports(() => {
  if (typeof registerTimeListener === "function") {
    registerTimeListener(() => {
      if (typeof window.updateWorldFlights === "function") {
        window.updateWorldFlights();
      }
    });
  }

  console.log("🌍 WorldAirportsACS ready — Flight runtime armed (FIXED)");
});

})();

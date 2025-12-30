/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — SINGLE EXEC MODE
   ------------------------------------------------------------
   Source of truth: ACS_FLIGHT_EXEC 21DEC25
   Time source: ACS_TIME (NO bootstrap, NO override)
   Publishes: ACS_LIVE_FLIGHTS[]
   ============================================================ */

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
   🟥 R1 — ACS FLIGHT RUNTIME ENGINE (EXEC MODE) — FIXED
   ------------------------------------------------------------
   - Reads: localStorage.ACS_FLIGHT_EXEC
   - Uses: ACS_TIME.minute
   - Publishes: window.ACS_LIVE_FLIGHTS (dense array)
   - IMPORTANT: Does NOT wipe LIVE_FLIGHTS when no EXEC exists
   ============================================================ */
function updateWorldFlights() {

  const nowMin = (window.ACS_TIME && typeof window.ACS_TIME.minute === "number")
    ? window.ACS_TIME.minute
    : null;

  // If time not ready, do nothing (don't wipe)
  if (nowMin === null) return;

  const execRaw = localStorage.getItem("ACS_FLIGHT_EXEC");

  // ✅ If there is NO EXEC, do nothing (don't wipe)
  // This prevents SkyTrack going empty forever.
  if (!execRaw) return;

  let exec;
  try {
    exec = JSON.parse(execRaw);
  } catch (e) {
    console.warn("ACS Runtime: ACS_FLIGHT_EXEC parse error", e);
    return;
  }

  if (!exec || !exec.aircraftId) return;

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

  // ------------------------------------------------------------
  // 🧩 Normalize legs
  // ------------------------------------------------------------
  const legs = Array.isArray(exec.legs) && exec.legs.length
    ? exec.legs
    : [{
        origin: exec.origin,
        destination: exec.destination,
        depMin: exec.depMin,
        arrMin: exec.arrMin
      }];

  if (!Array.isArray(legs) || !legs.length) return;

  // ------------------------------------------------------------
  // ✅ Pick active leg / or fallback to nearest state
  // ------------------------------------------------------------
  let activeLeg = null;

  for (const lg of legs) {
    const dep = lg?.depMin;
    const arr = lg?.arrMin;
    if (typeof dep !== "number" || typeof arr !== "number") continue;

    // Handles same-day windows (your current system)
    if (nowMin >= dep && nowMin <= arr) {
      activeLeg = lg;
      break;
    }
  }

  // If none active: place on ground at next origin OR last destination
  if (!activeLeg) {
    // next upcoming
    const upcoming = legs.find(lg => typeof lg?.depMin === "number" && nowMin < lg.depMin);
    if (upcoming) {
      activeLeg = {
        origin: upcoming.origin,
        destination: upcoming.destination,
        depMin: upcoming.depMin,
        arrMin: upcoming.arrMin,
        __forcedStatus: "ground"
      };
    } else {
      // already finished all legs
      const last = legs[legs.length - 1];
      activeLeg = {
        origin: last.origin,
        destination: last.destination,
        depMin: last.depMin,
        arrMin: last.arrMin,
        __forcedStatus: "arrived"
      };
    }
  }

  const depMin = activeLeg.depMin;
  const arrMin = activeLeg.arrMin;

  if (typeof depMin !== "number" || typeof arrMin !== "number") return;

  const o = resolveAirport(activeLeg.origin);
  const d = resolveAirport(activeLeg.destination);
  if (!o || !d) return;

  // ------------------------------------------------------------
  // ✈️ Status + position
  // ------------------------------------------------------------
  let status = "ground";
  let progress = 0;

  if (activeLeg.__forcedStatus === "arrived") {
    status = "arrived";
    progress = 1;
  } else if (activeLeg.__forcedStatus === "ground") {
    status = "ground";
    progress = 0;
  } else if (nowMin >= depMin && nowMin <= arrMin) {
    status = "enroute";
    progress = (arrMin === depMin) ? 1 : (nowMin - depMin) / (arrMin - depMin);
    if (!isFinite(progress)) progress = 0;
    progress = Math.max(0, Math.min(1, progress));
  } else if (nowMin > arrMin) {
    status = "arrived";
    progress = 1;
  }

  const lat = o.lat + (d.lat - o.lat) * progress;
  const lng = o.lng + (d.lng - o.lng) * progress;

  // ------------------------------------------------------------
  // 🏷 Label (FIX: no 'active' / no 'aircraftId' undefined)
  // ------------------------------------------------------------
  const flightLabel =
    exec.flightOut ||
    exec.flightNumber ||
    exec.routeCode ||
    exec.aircraftId;

  const aircraftModel =
    exec.aircraftModel ||
    exec.model ||
    exec.aircraft ||
    "";

  // ------------------------------------------------------------
  // ✅ Publish ONE dense flight (no holes)
  // ------------------------------------------------------------
  const liveFlights = [{
    aircraftId: exec.aircraftId,
    aircraftModel,
    flightOut: flightLabel,
    origin: activeLeg.origin,
    destination: activeLeg.destination,
    depMin,
    arrMin,
    lat,
    lng,
    progress,
    status
  }];

  window.ACS_LIVE_FLIGHTS = liveFlights; // dense
  try {
    localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
  } catch (e) {}

  // Optional: debug line (safe)
  // console.log("ACS Runtime LIVE:", liveFlights[0]);
}
   
// ============================================================
// 🔒 WAIT FOR WORLD AIRPORTS — HARD GATE
// ============================================================

function waitForWorldAirports(cb) {
  if (window.WorldAirportsACS && Object.keys(WorldAirportsACS).length > 0) {
    cb();
  } else {
    setTimeout(() => waitForWorldAirports(cb), 200);
  }
}
   
/* ============================================================
   ⏱ TIME ENGINE HOOK
   ============================================================ */

  waitForWorldAirports(() => {
  registerTimeListener(updateWorldFlights);
  console.log("🌍 WorldAirportsACS ready — Flight runtime armed");
});

})();

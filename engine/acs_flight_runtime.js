/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — SINGLE EXEC MODE
   ------------------------------------------------------------
   Source of truth: ACS_FLIGHT_EXEC 20DEC25
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
   ✈️ RUNTIME LOOP — 3 PHASES (GROUND / AIR / DESTINATION)
   ============================================================ */

function updateLiveFlights() {

  const liveFlights = [];

  const nowMin = window.ACS_TIME?.minute;
  const exec = getExecFlight();

  if (!exec || typeof nowMin !== "number") {
    window.ACS_LIVE_FLIGHTS = [];
    localStorage.setItem("ACS_LIVE_FLIGHTS", "[]");
    return;
  }

  // --------------------------------------------------------
  // 🔧 Garantizar arrMin si no existe (fallback temporal)
  // --------------------------------------------------------

  if (typeof exec.depMin === "number" && typeof exec.arrMin !== "number") {
    exec.arrMin = exec.depMin + 120; // 2h default
  }

  // --------------------------------------------------------
  // 🔀 ACTIVE LEG (OUTBOUND / RETURN)
  // --------------------------------------------------------

  let activeLeg = {
    origin: exec.origin,
    destination: exec.destination,
    depMin: exec.depMin,
    arrMin: exec.arrMin
  };

  if (exec._return && nowMin >= exec._return.depMin) {
    activeLeg = exec._return;
  }

  if (
    typeof activeLeg.depMin !== "number" ||
    typeof activeLeg.arrMin !== "number" ||
    !activeLeg.origin ||
    !activeLeg.destination
  ) {
    return;
  }

  const origin = getSkyTrackAirportByICAO(activeLeg.origin);
  const dest   = getSkyTrackAirportByICAO(activeLeg.destination);

  if (!origin || !dest) return;

  const dep = activeLeg.depMin;
  const arr = activeLeg.arrMin;

  let progress = 0;
  let lat = origin.lat;
  let lng = origin.lng;
  let status = "ground";

  if (nowMin < dep) {
    status = "ground";
  }
  else if (nowMin >= dep && nowMin <= arr) {
    progress = (nowMin - dep) / (arr - dep);
    progress = Math.min(Math.max(progress, 0), 1);

    const pos = interpolateGC(
      origin.lat,
      origin.lng,
      dest.lat,
      dest.lng,
      progress
    );

    lat = pos.lat;
    lng = pos.lng;
    status = "enroute";
  }
  else if (nowMin > arr) {
    progress = 1;
    lat = dest.lat;
    lng = dest.lng;
    status = "arrived";
  }

  // --------------------------------------------------------
  // 🔁 TURNAROUND + RETURN FLIGHT (50 MIN)
  // --------------------------------------------------------

  const TURNAROUND_MIN = 50;

  if (status === "arrived" && !exec._returnArmed) {

    exec._returnArmed = true;

    exec._return = {
      origin: exec.destination,
      destination: exec.origin,
      depMin: arr + TURNAROUND_MIN,
      arrMin: arr + TURNAROUND_MIN + (arr - dep)
    };

    localStorage.setItem("ACS_FLIGHT_EXEC", JSON.stringify(exec));

    console.log("🔁 Return flight armed:", exec._return);
  }

  // --------------------------------------------------------
  // 🔚 FLIGHT CYCLE COMPLETE (RETURN ARRIVED)
  // --------------------------------------------------------

  if (exec._return && activeLeg === exec._return && status === "arrived") {
    console.log("🏁 Flight cycle completed");
    localStorage.removeItem("ACS_FLIGHT_EXEC");
  }

  liveFlights.push({
    aircraftId: exec.aircraftId || "",
    flightOut: exec.flightOut || "",
    origin: activeLeg.origin,
    destination: activeLeg.destination,
    depMin: dep,
    arrMin: arr,
    progress,
    lat,
    lng,
    status
  });

  // 🔒 PUBLICAR SIEMPRE
  window.ACS_LIVE_FLIGHTS = liveFlights;
  localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
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
  registerTimeListener(updateLiveFlights);
  console.log("🌍 WorldAirportsACS ready — Flight runtime armed");
});

})();

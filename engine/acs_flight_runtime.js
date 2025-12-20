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

  if (
    typeof nowMin === "number" &&
    exec &&
    typeof exec.depMin === "number" &&
    typeof exec.arrMin === "number" &&
    exec.origin &&
    exec.destination
  ) {

    const origin = getAirportByICAO(exec.origin);
    const dest   = getAirportByICAO(exec.destination);

    if (!origin || !dest) {
       
    // WorldAirportsACS aún no cargado → esperar próximo tick
       
    window.ACS_LIVE_FLIGHTS = [];
    localStorage.setItem("ACS_LIVE_FLIGHTS", "[]");
    return;
 }

    if (origin && dest) {

      const dep = exec.depMin;
      const arr = exec.arrMin;

      let progress = 0;
      let lat = origin.latitude;
      let lng = origin.longitude;
      let status = "ground";

      if (nowMin < dep) {
        progress = 0;
        lat = origin.latitude;
        lng = origin.longitude;
        status = "ground";
      }
      else if (nowMin >= dep && nowMin <= arr) {
        progress = (nowMin - dep) / (arr - dep);
        progress = Math.min(Math.max(progress, 0), 1);

        const pos = interpolateGC(
          origin.latitude,
          origin.longitude,
          dest.latitude,
          dest.longitude,
          progress
        );

        lat = pos.lat;
        lng = pos.lng;
        status = "enroute";
      }
      else if (nowMin > arr) {
        progress = 1;
        lat = dest.latitude;
        lng = dest.longitude;
        status = "arrived";
      }

      liveFlights.push({
        aircraftId: exec.aircraftId || "",
        flightOut: exec.flightOut || "",
        origin: exec.origin,
        destination: exec.destination,
        depMin: dep,
        arrMin: arr,
        progress,
        lat,
        lng,
        status
      });
    }
  }

  // 🔒 PUBLICAR SIEMPRE (SIN EXCEPCIONES)
  window.ACS_LIVE_FLIGHTS = liveFlights;
  localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
}

/* ============================================================
   ⏱ TIME ENGINE HOOK
   ============================================================ */

registerTimeListener(updateLiveFlights);

})();

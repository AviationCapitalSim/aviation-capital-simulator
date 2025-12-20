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
     ✈️ RUNTIME LOOP
     ============================================================ */

  function updateLiveFlight() {

    const nowMin = window.ACS_TIME?.minute;
    if (typeof nowMin !== "number") return;

    const exec = getExecFlight();
    const liveFlights = [];

    if (
      exec &&
      typeof exec.depMin === "number" &&
      typeof exec.arrMin === "number" &&
      exec.origin &&
      exec.destination
    ) {

      // 🟢 EN TIERRA / EN VUELO / EN DESTINO → SIEMPRE VISIBLE
      const origin = getAirportByICAO(exec.origin);
      const dest   = getAirportByICAO(exec.destination);

      if (origin && dest) {

        const dep = exec.depMin;
        const arr = exec.arrMin;

        let progress = 0;

        if (nowMin <= dep) {
          progress = 0; // en tierra (origen)
        } else if (nowMin >= arr) {
          progress = 1; // en destino
        } else {
          progress = (nowMin - dep) / (arr - dep);
        }

        const pos = interpolateGC(
          origin.latitude,
          origin.longitude,
          dest.latitude,
          dest.longitude,
          Math.min(Math.max(progress, 0), 1)
        );

        liveFlights.push({
          aircraftId: exec.aircraftId || "",
          flightOut:  exec.flightOut || "",
          origin:     exec.origin,
          destination:exec.destination,
          depMin:     dep,
          arrMin:     arr,
          progress,
          lat: pos.lat,
          lng: pos.lng
        });
      }
    }

    localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
  }

  /* ============================================================
     ⏱ TIME ENGINE HOOK
     ============================================================ */

  registerTimeListener(updateLiveFlight);

})();

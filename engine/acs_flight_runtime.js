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
     ✈️ UPDATE WORLD FLIGHTS — FR24 LOOP
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
      try { localStorage.setItem("ACS_LIVE_FLIGHTS", "[]"); } catch {}
      return;
    }

    const liveFlights = [];

    // --------------------------------------------------------
    // Resolve airports (SkyTrack adapter → WorldAirportsACS)
    // --------------------------------------------------------
    function resolveAirport(icao) {

      if (!icao) return null;

      // 1) SkyTrack adapter
      if (typeof window.getSkyTrackAirportByICAO === "function") {
        const a = window.getSkyTrackAirportByICAO(icao);
        if (a && typeof a.lat === "number" && typeof a.lng === "number") {
          return a;
        }
      }

      // 2) WorldAirportsACS: buscar en el contenedor
      const wa = window.WorldAirportsACS;
      if (!wa) return null;

      const found = Object.values(wa)
        .flat()
        .find(a => a && a.icao === icao);

      return found || null;
    }

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

      const o = resolveAirport(it.origin);
      const d = resolveAirport(it.destination);
      if (!o || !d) return;

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

     if (!inAir && nowMin > arrAdj) {

  // 🔁 ROTATION — auto return
  const rotMin = it.turnaroundMin || it.turnaround || 45;
  const returnDep = arrAdj + rotMin;
  const returnArr = returnDep + (arrAdj - depAdj);

  if (nowMin >= returnDep && nowMin <= returnArr) {
    status = "AIRBORNE";

    const elapsed = nowMin - returnDep;
    const duration = returnArr - returnDep;
    const p = duration > 0 ? elapsed / duration : 0;

    lat = d.lat + (o.lat - d.lat) * p;
    lng = d.lng + (o.lng - d.lng) * p;

  } else if (nowMin > returnArr) {
    status = "GROUND";
    lat = o.lat;
    lng = o.lng;
  } else {
    status = "ARRIVED";
    lat = d.lat;
    lng = d.lng;
  }
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

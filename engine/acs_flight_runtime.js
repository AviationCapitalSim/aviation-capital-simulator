/* ============================================================
   ✈️ ACS FLIGHT RUNTIME — CORE v1 (CLEAN RESET)
   Source of truth: scheduleItems 01JAN26
   ============================================================ */

(function () {

  console.log("✈️ ACS Runtime v1 — CLEAN MODE ACTIVE");

  function getNowMin() {
    if (!window.ACS_TIME || typeof ACS_TIME.minute !== "number") return 0;
    return (ACS_TIME.minute + 1440) % 1440;
  }

  function resolveAirport(icao) {
    if (!icao || !window.WorldAirportsACS) return null;
    return Object.values(WorldAirportsACS).flat()
      .find(a => a && a.icao === icao) || null;
  }

  function normalizeTime(depMin, arrMin) {
    if (typeof depMin !== "number" || typeof arrMin !== "number") return null;
    let dep = depMin % 1440;
    let arr = arrMin % 1440;
    if (arr < dep) arr += 1440;
    return { dep, arr };
  }

  function updateWorldFlights() {

    const nowMin = getNowMin();

    let items = [];
    try {
      items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    } catch {}

    const liveFlights = [];

    if (!Array.isArray(items) || items.length === 0) {
      window.ACS_LIVE_FLIGHTS = [];
      return;
    }

    // --------------------------------------------------------
    // GROUP BY AIRCRAFT
    // --------------------------------------------------------
    const byAircraft = {};
    items.forEach(f => {
      if (!f.aircraftId || !f.origin || !f.destination) return;
      if (!byAircraft[f.aircraftId]) byAircraft[f.aircraftId] = [];
      byAircraft[f.aircraftId].push(f);
    });

    // --------------------------------------------------------
    // PROCESS EACH AIRCRAFT
    // --------------------------------------------------------
    Object.entries(byAircraft).forEach(([aircraftId, flights]) => {

      flights.sort((a, b) => (a.depMin ?? 0) - (b.depMin ?? 0));

      let selected = null;
      let status = "GROUND";

      for (const f of flights) {
        const t = normalizeTime(f.depMin, f.arrMin);
        if (!t) continue;

        if (nowMin >= t.dep && nowMin <= t.arr) {
          selected = f;
          status = "ENROUTE";
          break;
        }

        if (nowMin < t.dep) {
          selected = f;
          status = "GROUND";
          break;
        }

        selected = f;
        status = "ARRIVED";
      }

      if (!selected) return;

      const t = normalizeTime(selected.depMin, selected.arrMin);
      if (!t) return;

      const o = resolveAirport(selected.origin);
      const d = resolveAirport(selected.destination);
      if (!o || !d) return;

      let lat = o.lat;
      let lng = o.lng;

      if (status === "ENROUTE") {
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
        flightNumber : selected.flightNumber || selected.flightOut || "",
        model        : selected.aircraft || selected.modelKey || "",
        origin       : selected.origin,
        destination  : selected.destination,
        lat,
        lng,
        status
      });

    });

    window.ACS_LIVE_FLIGHTS = liveFlights;
  }

  // ----------------------------------------------------------
  // TIME ENGINE HOOK
  // ----------------------------------------------------------
  if (typeof registerTimeListener === "function") {
    registerTimeListener(updateWorldFlights);
  } else {
    setInterval(updateWorldFlights, 60000);
  }

  window.updateWorldFlights = updateWorldFlights;

})();

/* ============================================================
   🟦 ACS SKYTRACK — RUNTIME v3 (FASE 4)
   - FR24 24/7
   - Ground → Airborne → Arrived → Ground (turnaround)
   - Turnaround normal / optimizado desde Schedule Table
   - Nunca desaparecen
   ============================================================ */

(function () {

  console.log("🟢 ACS Runtime v3 — FASE 4 ACTIVE");

  function updateWorldFlights() {

    if (!window.ACS_TIME || typeof ACS_TIME.minute !== "number") return;

    const nowMin = (ACS_TIME.minute + 1440) % 1440;

    let schedule = [];
    try {
      schedule = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    } catch {
      schedule = [];
    }

    const liveFlights = [];

    if (!Array.isArray(schedule) || schedule.length === 0) {
      window.ACS_LIVE_FLIGHTS = [];
      return;
    }

    /* --------------------------------------------------------
       Agrupar vuelos por avión
       -------------------------------------------------------- */
    const byAircraft = {};
    schedule.forEach(f => {
      if (!f?.aircraftId || !f.origin || !f.destination) return;
      if (!byAircraft[f.aircraftId]) byAircraft[f.aircraftId] = [];
      byAircraft[f.aircraftId].push(f);
    });

    /* --------------------------------------------------------
       Resolver aeropuerto
       -------------------------------------------------------- */
    function resolveAirport(icao) {
      if (!icao || !window.WorldAirportsACS) return null;
      return Object.values(WorldAirportsACS)
        .flat()
        .find(a => a?.icao === icao) || null;
    }

    /* --------------------------------------------------------
       Lógica por avión (rotación real)
       -------------------------------------------------------- */
    Object.entries(byAircraft).forEach(([aircraftId, flights]) => {

      flights.sort((a, b) => (a.depMin ?? 0) - (b.depMin ?? 0));

      let selected = flights[0];
      let status = "GROUND";

      for (let i = 0; i < flights.length; i++) {

        const f = flights[i];
        if (typeof f.depMin !== "number" || typeof f.arrMin !== "number") continue;

        const turnaround =
          typeof f.turnaroundMin === "number"
            ? f.turnaroundMin
            : (typeof f.turnaround === "number" ? f.turnaround : 45);

        // AIRBORNE
        if (nowMin >= f.depMin && nowMin <= f.arrMin) {
          selected = f;
          status = "AIRBORNE";
          break;
        }

        // ARRIVED → turnaround en tierra
        if (
          nowMin > f.arrMin &&
          nowMin <= f.arrMin + turnaround
        ) {
          selected = f;
          status = "GROUND";
          break;
        }

        // POST-TURNAROUND → esperar próximo vuelo
        if (nowMin > f.arrMin + turnaround) {
          selected = f;
          status = "GROUND";
        }
      }

      const o = resolveAirport(selected.origin);
      const d = resolveAirport(selected.destination);
      if (!o || !d) return;

      let lat = o.lat;
      let lng = o.lng;

      if (status === "AIRBORNE") {
        const p = Math.min(
          Math.max(
            (nowMin - selected.depMin) /
            (selected.arrMin - selected.depMin),
            0
          ),
          1
        );
        lat = o.lat + (d.lat - o.lat) * p;
        lng = o.lng + (d.lng - o.lng) * p;
      }

      if (status === "GROUND" && nowMin > selected.arrMin) {
        lat = d.lat;
        lng = d.lng;
      }

      liveFlights.push({
        aircraftId,
        model        : selected.modelKey || selected.aircraft || null,
        flightNumber : selected.flightNumber || null,
        origin       : selected.origin,
        destination  : selected.destination,
        lat,
        lng,
        status,
        depMin       : selected.depMin,
        arrMin       : selected.arrMin
      });

    });

    window.ACS_LIVE_FLIGHTS = liveFlights;

    try {
      localStorage.setItem(
        "ACS_LIVE_FLIGHTS",
        JSON.stringify(liveFlights)
      );
    } catch {}

  }

  /* ----------------------------------------------------------
     Hook al reloj del juego
     ---------------------------------------------------------- */
  if (typeof window.registerTimeListener === "function") {
    window.registerTimeListener(updateWorldFlights);
  } else {
    setInterval(updateWorldFlights, 5000);
  }

  window.updateWorldFlights = updateWorldFlights;

})();

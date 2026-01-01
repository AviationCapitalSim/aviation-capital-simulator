/* ============================================================
   🟦 ACS SKYTRACK — MINIMAL RUNTIME v1 (FASE 2)
   Objetivo:
   - Leer scheduleItems
   - Mostrar TODOS los aviones
   - Si vuelan → AIRBORNE
   - Si no → GROUND
   - Nunca desaparecen
   ============================================================ */

(function () {

  console.log("🟢 ACS Minimal Runtime v1 — ACTIVE");

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

    // Agrupar por aircraftId
    const byAircraft = {};
    schedule.forEach(f => {
      if (!f?.aircraftId || !f.origin || !f.destination) return;
      if (!byAircraft[f.aircraftId]) byAircraft[f.aircraftId] = [];
      byAircraft[f.aircraftId].push(f);
    });

    // Resolver aeropuerto
    function resolveAirport(icao) {
      if (!icao || !window.WorldAirportsACS) return null;
      return Object.values(WorldAirportsACS).flat().find(a => a.icao === icao) || null;
    }

    Object.entries(byAircraft).forEach(([aircraftId, flights]) => {

      // ordenar por salida
      flights.sort((a, b) => (a.depMin ?? 0) - (b.depMin ?? 0));

      let activeFlight = null;

      for (const f of flights) {
        if (
          typeof f.depMin === "number" &&
          typeof f.arrMin === "number" &&
          nowMin >= f.depMin &&
          nowMin <= f.arrMin
        ) {
          activeFlight = f;
          break;
        }
      }

      const selected = activeFlight || flights[0];
      const status = activeFlight ? "AIRBORNE" : "GROUND";

      const o = resolveAirport(selected.origin);
      const d = resolveAirport(selected.destination);
      if (!o || !d) return;

      let lat = o.lat;
      let lng = o.lng;

      if (status === "AIRBORNE") {
        const p = Math.min(
          Math.max((nowMin - selected.depMin) / (selected.arrMin - selected.depMin), 0),
          1
        );
        lat = o.lat + (d.lat - o.lat) * p;
        lng = o.lng + (d.lng - o.lng) * p;
      }

      liveFlights.push({
        aircraftId   : aircraftId,
        model        : selected.modelKey || selected.aircraft || null,
        flightNumber : selected.flightNumber || null,
        origin       : selected.origin,
        destination  : selected.destination,
        lat,
        lng,
        status
      });

    });

    window.ACS_LIVE_FLIGHTS = liveFlights;

    try {
      localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));
    } catch {}

  }

  // Hook al reloj del juego
  if (typeof window.registerTimeListener === "function") {
    window.registerTimeListener(updateWorldFlights);
  } else {
    setInterval(updateWorldFlights, 5000);
  }

  window.updateWorldFlights = updateWorldFlights;

})();

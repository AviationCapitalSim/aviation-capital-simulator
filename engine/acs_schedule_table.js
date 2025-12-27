/* ============================================================
   🟦 ACS — SCHEDULE TABLE → RUNTIME BRIDGE
   ------------------------------------------------------------
   - Lee vuelos creados en scheduleItems
   - Publica vuelos ejecutables para Runtime
   - Arquitectura FR24-like
   ------------------------------------------------------------
   Fuente: scheduleItems (Schedule Table)
   Destino: ACS_ACTIVE_FLIGHTS (Runtime)
   ============================================================ */

(function publishScheduleToRuntime(){

  // Leer Schedule Table
  const raw = localStorage.getItem("scheduleItems");
  if (!raw) {
    localStorage.removeItem("ACS_ACTIVE_FLIGHTS");
    return;
  }

  let items;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.error("[ACS SCHEDULE BRIDGE] Invalid scheduleItems JSON");
    return;
  }

  if (!Array.isArray(items)) return;

  // Leer flota real (solo aviones activos)
  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  const allowedAircraftIds = new Set(
  fleet.map(a => a.aircraftId)
);

  // Filtrar SOLO vuelos reales ejecutables
  const activeFlights = items
  .filter(it =>
    it.aircraftId &&
    it.origin &&
    it.destination &&
    it.origin !== it.destination &&
    (
      typeof it.depAbsMin === "number" ||
      typeof it.depMin === "number" ||
      typeof it.blockOut === "number"
    )
  )
  .map(it => {

    // Resolver tiempos reales
    const depMin =
      typeof it.depAbsMin === "number" ? it.depAbsMin :
      typeof it.depMin === "number"    ? it.depMin :
      it.blockOut;

    const arrMin =
      typeof it.arrAbsMin === "number" ? it.arrAbsMin :
      typeof it.arrMin === "number"    ? it.arrMin :
      it.blockIn;

    if (typeof depMin !== "number" || typeof arrMin !== "number") {
      return null;
    }

    return {
      flightId: it.id,
      aircraftId: it.aircraftId,
      aircraftType: it.modelKey || it.aircraft || "UNKNOWN",
      origin: it.origin,
      destination: it.destination,
      depMin,
      arrMin
    };
  })
  .filter(Boolean);

  // Publicar para Runtime
  localStorage.setItem(
    "ACS_ACTIVE_FLIGHTS",
    JSON.stringify(activeFlights)
  );

  // Debug opcional
  console.log(
    `[ACS SCHEDULE BRIDGE] Published ${activeFlights.length} active flights`
  );

})();

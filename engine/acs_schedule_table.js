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
  const activeAircraftIds = new Set(
    fleet.filter(a => a.status === "active").map(a => a.aircraftId)
  );

  // Filtrar SOLO vuelos reales ejecutables
  const activeFlights = items
    .filter(it =>
      it.origin &&
      it.destination &&
      typeof it.depAbsMin === "number" &&
      typeof it.arrAbsMin === "number" &&
      it.aircraftId &&
      activeAircraftIds.has(it.aircraftId)
    )
    .map(it => ({
      flightId: it.id,                 // RT_843383
      aircraftId: it.aircraftId,       // AC-1766...
      aircraftType: it.modelKey || it.aircraft,
      origin: it.origin,
      destination: it.destination,
      depMin: it.depAbsMin,
      arrMin: it.arrAbsMin
    }));

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

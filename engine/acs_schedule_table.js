/* ============================================================
   🟦 ACS — SCHEDULE TABLE → RUNTIME BRIDGE (FASE 1)
   ------------------------------------------------------------
   - Lee scheduleItems
   - Detecta 1 vuelo ACTIVO según ACS_TIME
   - Publica SOLO 1 vuelo en ACS_FLIGHT_EXEC
   - Mantiene ACS_ACTIVE_FLIGHTS para FASE 2
   ============================================================ */

(function publishScheduleToRuntime_FASE1(){

  // 🔒 Requiere tiempo del simulador
  if (!window.ACS_TIME || typeof ACS_TIME.minute !== "number") return;

  const nowMin = ACS_TIME.minute;

  // Leer Schedule Table
  const raw = localStorage.getItem("scheduleItems");
  if (!raw) {
    localStorage.removeItem("ACS_FLIGHT_EXEC");
    localStorage.removeItem("ACS_ACTIVE_FLIGHTS");
    return;
  }

  let items;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.error("[ACS BRIDGE F1] Invalid scheduleItems JSON");
    return;
  }

  if (!Array.isArray(items) || !items.length) {
    localStorage.removeItem("ACS_FLIGHT_EXEC");
    return;
  }

  // Leer flota real (solo IDs válidos)
  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  const allowedAircraftIds = new Set(
    fleet.map(a => String(a.aircraftId || a.id || "").trim()).filter(Boolean)
  );

  // ------------------------------------------------------------
  // Normalizar vuelos ejecutables
  // ------------------------------------------------------------
  const flights = items
    .filter(it =>
      it.type === "flight" &&
      it.aircraftId &&
      allowedAircraftIds.has(String(it.aircraftId)) &&
      it.origin &&
      it.destination &&
      it.origin !== it.destination
    )
    .map(it => {

      const depMin =
        typeof it.depAbsMin === "number" ? it.depAbsMin :
        typeof it.depMin === "number"    ? it.depMin :
        typeof it.blockOut === "number"  ? it.blockOut :
        null;

      const arrMin =
        typeof it.arrAbsMin === "number" ? it.arrAbsMin :
        typeof it.arrMin === "number"    ? it.arrMin :
        typeof it.blockIn === "number"   ? it.blockIn :
        null;

      if (typeof depMin !== "number" || typeof arrMin !== "number") {
        return null;
      }

      return {
        flightId: it.id,
        aircraftId: String(it.aircraftId),
        aircraftModel: it.modelKey || it.aircraft || it.acType || "UNKNOWN",
        base: it.origin,
        legs: [{
          origin: it.origin,
          destination: it.destination,
          depMin,
          arrMin,
          flightNo:
            it.flightNumberOut ||
            it.flightLabelOut ||
            it.flightOut ||
            it.flightNumber ||
            null
        }]
      };
    })
    .filter(Boolean);

  // Guardar TODOS para FASE 2 (multi)
  localStorage.setItem(
    "ACS_ACTIVE_FLIGHTS",
    JSON.stringify(flights)
  );

  // ------------------------------------------------------------
  // 🔑 FASE 1 — elegir SOLO 1 vuelo ACTIVO
  // ------------------------------------------------------------
  const activeExec = flights.find(f => {
    const lg = f.legs[0];
    if (!lg) return false;

    const dep = (lg.depMin + 1440) % 1440;
    const arr = (lg.arrMin + 1440) % 1440;
    const now = (nowMin + 1440) % 1440;

    return dep <= arr
      ? (now >= dep && now <= arr)
      : (now >= dep || now <= arr); // overnight safe
  });

  if (activeExec) {
    localStorage.setItem(
      "ACS_FLIGHT_EXEC",
      JSON.stringify(activeExec)
    );
    console.log(
      `[ACS BRIDGE F1] EXEC flight published: ${activeExec.aircraftId}`
    );
  } else {
    localStorage.removeItem("ACS_FLIGHT_EXEC");
    console.log("[ACS BRIDGE F1] No active flight in window");
  }

})();

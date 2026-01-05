/* ============================================================
   🟦 A10.11 — ACS FLIGHT COMPLETION OBSERVER (READ-ONLY)
   ------------------------------------------------------------
   • Detecta vuelos completados SIN tocar SkyTrack
   • No recalcula rutas ni estados
   • No genera economía (solo logging)
   • 100% desacoplado
   ============================================================ */

(function () {

  const LEDGER_KEY = "ACS_FLIGHT_LEDGER";
  const STATE_KEY  = "ACS_FLIGHT_OBSERVER_STATE";

  // Cargar ledger (vuelos ya procesados)
  function loadLedger() {
    try {
      return JSON.parse(localStorage.getItem(LEDGER_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveLedger(ledger) {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  }

  // Estado previo por aircraftId
  function loadPrevState() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function savePrevState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  // Generar clave única de vuelo
  function buildFlightKey(aircraftId, flight) {
    return [
      aircraftId,
      flight.origin || "UNK",
      flight.destination || "UNK",
      flight.arrAbsMin
    ].join("|");
  }

  // === OBSERVER CORE ===
  function observeFlights() {

    if (!Array.isArray(window.ACS_LIVE_FLIGHTS)) return;

    const ledger    = loadLedger();
    const prevState = loadPrevState();
    let stateDirty  = false;

    window.ACS_LIVE_FLIGHTS.forEach(f => {

      const aircraftId = f.aircraftId;
      if (!aircraftId) return;

      const currentState = f.state;
      const previous     = prevState[aircraftId];

      // Detectar transición EN_ROUTE → GROUND
      if (
        previous === "EN_ROUTE" &&
        currentState === "GROUND" &&
        f.lastFlight &&
        Number.isFinite(f.lastFlight.arrAbsMin)
      ) {
        const key = buildFlightKey(aircraftId, f.lastFlight);

        if (!ledger[key]) {
          ledger[key] = true;

          console.log(
            `✈️ Flight completed: ${aircraftId} ` +
            `${f.lastFlight.origin} → ${f.lastFlight.destination}`
          );
        }
      }

      // Guardar estado actual
      if (prevState[aircraftId] !== currentState) {
        prevState[aircraftId] = currentState;
        stateDirty = true;
      }
    });

    saveLedger(ledger);
    if (stateDirty) savePrevState(prevState);
  }

  // Ejecutar observer periódicamente
  setInterval(observeFlights, 30000); // cada 30s (seguro)

})();

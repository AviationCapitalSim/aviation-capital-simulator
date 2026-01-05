/* ============================================================
   🟦 A10.11c — ACS FLIGHT OBSERVER (GROUND + lastFlight BASED)
   ------------------------------------------------------------
   • Compatible con SkyTrack snapshot real
   • NO depende de transición EN_ROUTE → GROUND
   • Detecta solo vuelos realmente completados
   • Ledger anti-duplicados
   • SkyTrack permanece READ-ONLY
   ============================================================ */

(function () {

  const LEDGER_KEY = "ACS_FLIGHT_LEDGER";

  /* ============================
     Storage helpers
     ============================ */

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

  /* ============================
     Flight key (único y estable)
     ============================ */

  function buildFlightKey(acId, lf) {
    return [
      acId,
      lf.originICAO,
      lf.destinationICAO,
      lf.blockOff || lf.departure || "0"
    ].join("|");
  }

  /* ============================
     OBSERVER
     ============================ */

  window.addEventListener("ACS_SKYTRACK_SNAPSHOT", function (ev) {

    const snapshot = ev.detail;
    if (!snapshot || !Array.isArray(snapshot.aircraft)) return;

    const ledger = loadLedger();
    let ledgerDirty = false;

    snapshot.aircraft.forEach(ac => {

      if (
        ac.state !== "GROUND" ||
        !ac.lastFlight ||
        !ac.lastFlight.originICAO ||
        !ac.lastFlight.destinationICAO ||
        ac.lastFlight.originICAO === ac.lastFlight.destinationICAO
      ) {
        return;
      }

      const acId = ac.aircraftId;
      if (!acId) return;

      const key = buildFlightKey(acId, ac.lastFlight);

      if (ledger[key]) return;

      // === NUEVO VUELO COMPLETADO ===
      ledger[key] = true;
      ledgerDirty = true;

      console.log(
        `✈️ Flight completed: ${acId} ` +
        `${ac.lastFlight.originICAO} → ${ac.lastFlight.destinationICAO}`
      );

    });

    if (ledgerDirty) saveLedger(ledger);

  });

})();

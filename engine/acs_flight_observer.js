/* ============================================================
   🟦 A10.12 — ACS FLIGHT OBSERVER (RUNTIME-ALIGNED)
   ------------------------------------------------------------
   ✔ Basado en snapshot REAL de SkyTrack
   ✔ Usa lastFlight (no transiciones)
   ✔ Ledger anti-duplicados
   ✔ SkyTrack permanece READ-ONLY
   ============================================================ */

(function () {

  const LEDGER_KEY = "ACS_FLIGHT_LEDGER_V1";

  /* ============================
     Ledger helpers
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
     Build stable flight key
     ============================ */

  function buildFlightKey(ac, lf) {
    return [
      ac.aircraftId || ac.registration || "UNK",
      lf.origin,
      lf.destination,
      lf.departure || lf.blockOff || "0"
    ].join("|");
  }

  /* ============================
     OBSERVER
     ============================ */

  window.addEventListener("ACS_SKYTRACK_SNAPSHOT", (ev) => {

    const snapshot = ev.detail;
    if (!snapshot || !Array.isArray(snapshot.aircraft)) return;

    const ledger = loadLedger();
    let dirty = false;

    snapshot.aircraft.forEach(ac => {

      if (
        ac.state !== "GROUND" ||
        !ac.lastFlight ||
        !ac.lastFlight.origin ||
        !ac.lastFlight.destination ||
        ac.lastFlight.origin === ac.lastFlight.destination
      ) {
        return;
      }

      const key = buildFlightKey(ac, ac.lastFlight);
      if (ledger[key]) return;

      /* ============================
         ✅ FLIGHT COMPLETED
         ============================ */

      ledger[key] = {
        aircraftId: ac.aircraftId || ac.registration,
        origin: ac.lastFlight.origin,
        destination: ac.lastFlight.destination,
        departure: ac.lastFlight.departure,
        arrival: ac.lastFlight.arrival,
        detectedAt: Date.now()
      };

      dirty = true;

      console.log(
        `✈️ ACS Flight completed → ${ledger[key].aircraftId} ` +
        `${ledger[key].origin} → ${ledger[key].destination}`
      );

      // 🔜 hooks futuros:
      // Finance.processFlight(ledger[key])
      // Aircraft.applyFlightHours(...)
      // PassengerEngine.generate(...)
    });

    if (dirty) saveLedger(ledger);

  });

})();

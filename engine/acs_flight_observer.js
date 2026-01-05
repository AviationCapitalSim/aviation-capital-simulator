/* ============================================================
   🟦 A10.11b — ACS FLIGHT OBSERVER (SKYTRACK SNAPSHOT BASED)
   ------------------------------------------------------------
   • Escucha ACS_SKYTRACK_SNAPSHOT (API oficial)
   • NO toca SkyTrack
   • NO recalcula vuelos
   • NO genera economía (solo detección)
   • Ledger anti-duplicados
   ============================================================ */

(function () {

  const LEDGER_KEY = "ACS_FLIGHT_LEDGER";
  const STATE_KEY  = "ACS_FLIGHT_OBSERVER_STATE";

  /* ============================
     Storage helpers
     ============================ */

  function loadJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* ============================
     Flight key
     ============================ */

  function buildFlightKey(acId, f) {
    return [
      acId,
      f.originICAO || "UNK",
      f.destinationICAO || "UNK",
      f.blockOff || "0"
    ].join("|");
  }

  /* ============================
     OBSERVER
     ============================ */

  window.addEventListener("ACS_SKYTRACK_SNAPSHOT", function (ev) {

    const snapshot = ev.detail;
    if (!snapshot || !Array.isArray(snapshot.aircraft)) return;

    const ledger    = loadJSON(LEDGER_KEY, {});
    const prevState = loadJSON(STATE_KEY, {});
    let stateDirty  = false;

    snapshot.aircraft.forEach(ac => {

      const acId = ac.aircraftId;
      if (!acId) return;

      const current = ac.state;
      const previous = prevState[acId];

      if (
        previous === "EN_ROUTE" &&
        current === "GROUND" &&
        ac.lastFlight
      ) {
        const key = buildFlightKey(acId, ac.lastFlight);

        if (!ledger[key]) {
          ledger[key] = true;

          console.log(
            `✈️ Flight completed: ${acId} ` +
            `${ac.lastFlight.originICAO} → ${ac.lastFlight.destinationICAO}`
          );
        }
      }

      if (prevState[acId] !== current) {
        prevState[acId] = current;
        stateDirty = true;
      }
    });

    saveJSON(LEDGER_KEY, ledger);
    if (stateDirty) saveJSON(STATE_KEY, prevState);

  });

})();

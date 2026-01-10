/* ============================================================
   🟦 ACS FLIGHT OBSERVER — LEG-BY-LEG (ROBUST)
   ------------------------------------------------------------
   ✔ Airline-realistic: per LEG accounting
   ✔ Robust against race conditions
   ✔ SkyTrack READ-ONLY
   ✔ Schedule Table is source of truth
   ============================================================ */

(function () {

  const LEDGER_KEY = "ACS_FLIGHT_LEDGER_V1";

  /* ============================================================
     🟦 A1 — FLIGHT END DETECTOR (STATE TRANSITION ONLY)
     ------------------------------------------------------------
     ✔ Detects EN_ROUTE → GROUND transition
     ✔ Independent from activeLeg
     ✔ No finance, no ledger, no side effects
     ✔ Diagnostic & control layer only
     ============================================================ */

  const A1_LAST_STATE = {};

  function A1_detectFlightEnd(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.aircraft)) return;

    snapshot.aircraft.forEach(ac => {
      const acId =
        ac.registration ||
        ac.aircraftId ||
        ac.id ||
        ac.callsign ||
        null;

      if (!acId) return;

      const prevState = A1_LAST_STATE[acId];
      const currState = ac.state;

      // Detect EN_ROUTE → GROUND
      if (prevState === "EN_ROUTE" && currState === "GROUND") {
        console.log(
          `🟦 A1 — Flight finished (state transition): ${acId}`
        );
      }

      A1_LAST_STATE[acId] = currState;
    });
  }
   
  // ============================================================
  // 🟦 C1 — CACHE LAST ACTIVE LEG (ANTI-RACE)
  // ============================================================
  const LAST_ACTIVE_LEG = {};

     /* ============================================================
     🟦 D1 — CANONICAL AIRCRAFT KEY (REGISTRATION-FIRST)
     ------------------------------------------------------------
     ✔ Ensures EN_ROUTE cache & GROUND lookup use SAME key
     ✔ Fixes "GROUND but no console log" issue
     ============================================================ */
  function getAircraftKey(ac) {
    return (
      ac.registration ||
      ac.aircraftId ||
      ac.id ||
      ac.callsign ||
      null
    );
  }
   
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
     Build UNIQUE LEG key
     ============================ */

  function buildFlightKey(ac, leg) {
    return [
      ac.aircraftId || ac.registration || "UNK",
      leg.origin,
      leg.destination,
      leg.blockId || leg.legId || leg.departure || Date.now()
    ].join("|");
  }

  /* ============================
     OBSERVER
     ============================ */

  window.addEventListener("ACS_SKYTRACK_SNAPSHOT", (ev) => {
     
     const snapshot = ev.detail;
     A1_detectFlightEnd(snapshot);
     if (!snapshot || !Array.isArray(snapshot.aircraft)) return;
    
    const ledger = loadLedger();
    let dirty = false;

    snapshot.aircraft.forEach(ac => {

       /* ============================================================
         🟧 D2 — USE CANONICAL KEY EVERYWHERE
         ============================================================ */
       
      const acId = getAircraftKey(ac);
      if (!acId) return;

      // ========================================================
      // 🟦 C2 — CAPTURE ACTIVE LEG WHILE EN_ROUTE
      // ========================================================
      if (ac.state === "EN_ROUTE" && ac.activeLeg) {
        LAST_ACTIVE_LEG[acId] = ac.activeLeg;
        return;
      }

      // ========================================================
      // 🟦 C3 — PROCESS LEG ON GROUND (ROBUST)
      // ========================================================
      if (ac.state !== "GROUND") return;

      const leg = ac.activeLeg || LAST_ACTIVE_LEG[acId];
      if (!leg || !leg.origin || !leg.destination) return;
      if (leg.origin === leg.destination) return;

      const key = buildFlightKey(ac, leg);
      if (ledger[key]) return; // anti-duplicate

      // ========================================================
      // ✅ LEG COMPLETED
      // ========================================================
      ledger[key] = {
        aircraftId: acId,
        origin: leg.origin,
        destination: leg.destination,
        departure: leg.departure || leg.blockOff || 0,
        arrival: leg.arrival || Date.now(),
        detectedAt: Date.now()
      };
      dirty = true;

      console.log(
        `✈️ ACS LEG completed → ${acId} ${leg.origin} → ${leg.destination}`
      );

      // ========================================================
      // 🟦 Inject Schedule Table metrics (NO recalculation)
      // ========================================================
      try {
        const scheduleItems = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
        const dep = Number(ledger[key].departure || 0);

        const match = scheduleItems.find(s => {
          if (!s) return false;

          const sAc  = s.aircraftId || s.aircraftID || s.acId || s.id || "";
          const sOrg = s.origin || s.from || "";
          const sDst = s.destination || s.to || "";

          if (String(sAc) !== String(acId)) return false;
          if (String(sOrg) !== String(leg.origin)) return false;
          if (String(sDst) !== String(leg.destination)) return false;

          const sDep = Number(s.departure || s.blockOff || s.dep || 0);
          if (dep && sDep) {
            return Math.abs(sDep - dep) <= (6 * 60 * 60 * 1000);
          }
          return true;
        });

        if (match) {
          // Distance NM
          const dnm = Number(
            match.distanceNM ??
            match.distance_nm ??
            match.distNM ??
            match.dist_nm ??
            0
          );
          ledger[key].distanceNM = Number.isFinite(dnm) ? dnm : 0;

          // Block time hours
          let btH = Number(
            match.blockTimeH ??
            match.blockTimeHours ??
            match.blockTime_h ??
            0
          );

          if (!btH) {
            const btMin = Number(
              match.blockTimeMin ??
              match.blockTime_min ??
              match.blockTimeMinutes ??
              match.blockMinutes ??
              0
            );
            if (btMin) btH = btMin / 60;
          }

          if (!btH) {
            const raw = Number(match.blockTime ?? 0);
            if (raw > 0) btH = (raw > 20) ? (raw / 60) : raw;
          }

          ledger[key].blockTimeH = Number.isFinite(btH) ? btH : 0;
        }

      } catch (e) {
        // Observer must continue
      }

/* ============================================================
   🟦 AIRCRAFT HOURS & CYCLES (SCOPED)
   ============================================================ */

function ACS_updateAircraftHoursAndCycles(flight, blockTimeH) {

  if (!flight || !flight.aircraftId || !blockTimeH) return;

  const fleetKey = "ACS_MyAircraft";
  const fleet = JSON.parse(localStorage.getItem(fleetKey)) || [];

  const idx = fleet.findIndex(a =>
    a.id === flight.aircraftId ||
    a.registration === flight.aircraftId
  );

  if (idx === -1) return;

  const aircraft = fleet[idx];

  aircraft.hours = Number(aircraft.hours || 0) + Number(blockTimeH);
  aircraft.cycles = Number(aircraft.cycles || 0) + 1;
  aircraft.lastFlightAt = flight.arrival || Date.now();

  if (aircraft.enteredFleetAt) {
    const ageMs = aircraft.lastFlightAt - aircraft.enteredFleetAt;
    aircraft.age = Number(
      ageMs / (365.25 * 24 * 60 * 60 * 1000)
    ).toFixed(2);
  }

  fleet[idx] = aircraft;
  localStorage.setItem(fleetKey, JSON.stringify(fleet));
}

// Procesar cola cuando el World Engine esté listo
function ACS_processDeferredRevenueQueue() {

  if (!window.ACS_World || !window.ACS_World.ready) return;
  if (!window.ACS_DeferredRevenueQueue.length) return;

  console.log(
    "💰 Processing deferred revenue queue:",
    window.ACS_DeferredRevenueQueue.length,
    "items"
  );

  while (window.ACS_DeferredRevenueQueue.length) {
    const payload = window.ACS_DeferredRevenueQueue.shift();

    if (typeof ACS_applyFlightRevenue === "function") {
      ACS_applyFlightRevenue(payload);
    }
  }
}

// Listener pasivo — se ejecuta cada minuto de simulación
if (typeof registerTimeListener === "function") {
  registerTimeListener(() => {
    ACS_processDeferredRevenueQueue();
  });
}

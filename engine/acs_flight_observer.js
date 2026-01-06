/* ============================================================
   🟦 A10.12 — ACS FLIGHT OBSERVER (RUNTIME-ALIGNED)
   ------------------------------------------------------------
   ✔ Basado en snapshot REAL de SkyTrack
   ✔ Usa lastFlight (no transiciones)
   ✔ Ledger anti-duplicados
   ✔ SkyTrack permanece READ-ONLY
   ✔ Schedule Table es la ÚNICA fuente de distance / blockTime
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

      /* ============================
         🟦 A10.13.1 — Inject scheduleItems metrics
         ------------------------------------------------------------
         ✔ Source of truth: scheduleItems
         ✔ Observer does NOT recalc distance
         ============================ */

      try {
        const scheduleItems = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
        const lfDep = Number(ac.lastFlight?.departure || ac.lastFlight?.blockOff || 0);

        const match = scheduleItems.find(s => {
          if (!s) return false;

          const sAc  = s.aircraftId || s.aircraftID || s.acId || s.id || "";
          const sOrg = s.origin || s.from || "";
          const sDst = s.destination || s.to || "";

          if (String(sAc) !== String(ledger[key].aircraftId)) return false;
          if (String(sOrg) !== String(ledger[key].origin)) return false;
          if (String(sDst) !== String(ledger[key].destination)) return false;

          const sDep = Number(s.departure || s.blockOff || s.dep || 0);
          if (lfDep && sDep) {
            return Math.abs(sDep - lfDep) <= (6 * 60 * 60 * 1000);
          }
          return true;
        });

        if (match) {
          // Distance (NM)
          const dnm = Number(
            match.distanceNM ??
            match.distance_nm ??
            match.distNM ??
            match.dist_nm ??
            0
          );
          ledger[key].distanceNM = Number.isFinite(dnm) ? dnm : 0;

          // Block time (hours)
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
        // observer must continue
      }

      ACS_processFlightRevenue(ledger[key]);
    });

    if (dirty) saveLedger(ledger);
  });

})();

/* ============================================================
   🟦 A10.15.1 — AIRCRAFT HOURS & CYCLES UPDATE (SCOPED)
   ------------------------------------------------------------
   ✔ Called ONLY from A18
   ✔ No global variables
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

  console.log(
    `🛠 Aircraft updated → ${aircraft.registration || aircraft.id} | ` +
    `Hours ${aircraft.hours.toFixed(1)} | Cycles ${aircraft.cycles}`
  );
}

/* ============================================================
   🟧 A18 — PROCESS FLIGHT REVENUE & COSTS (STABLE)
   ------------------------------------------------------------
   • Called ONLY when flight is completed
   • Uses distance & blockTime from Schedule Table
   ============================================================ */

function ACS_processFlightRevenue(flight) {

  if (!flight || !flight.aircraftId) return;

  const finance = JSON.parse(localStorage.getItem("ACS_Finance_Log") || "[]");
  const fleet   = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  const ac = fleet.find(a =>
    a.id === flight.aircraftId ||
    a.registration === flight.aircraftId
  );
  if (!ac) return;

  /* ===============================
     1. DISTANCE & BLOCK TIME
     =============================== */

  const distanceNM = Number(flight.distanceNM || 0);
  if (distanceNM <= 0) return;

  let blockTimeH = Number(flight.blockTimeH || 0);
  if (!blockTimeH || blockTimeH <= 0) {
    const speed = Number(ac.speed_kts || 220);
    blockTimeH = distanceNM / speed;
  }

  /* ===============================
     2. COST CALCULATION
     =============================== */

  const fuelBurnKgH = Number(ac.fuel_burn_kgph || 900);
  const fuelCost   = fuelBurnKgH * blockTimeH * 0.85;

  const crewCost   = blockTimeH * 120;
  const landingFee = 350;

  const totalCost  = Math.round(fuelCost + crewCost + landingFee);

  /* ===============================
     3. PASSENGERS & REVENUE
     =============================== */

  let pax = 0;
  let revenue = 0;

  if (typeof ACS_PAX === "object" &&
      typeof ACS_PAX.getDailyDemand === "function") {

    const year = (typeof ACS_TIME !== "undefined" && ACS_TIME.year)
      ? ACS_TIME.year
      : new Date().getFullYear();

    const demand = ACS_PAX.getDailyDemand(
      flight.originData,
      flight.destinationData,
      distanceNM,
      year
    );

    pax = Math.min(Number(ac.seats || 0), demand);
  }

  let ticketPrice = 120;
  if (distanceNM > 3000) ticketPrice = 220;
  else if (distanceNM > 1200) ticketPrice = 140;

  revenue = pax * ticketPrice;
  const profit = Math.round(revenue - totalCost);

  /* ===============================
     4. FINANCE LOG
     =============================== */

  finance.push({
    type: "FLIGHT_RESULT",
    aircraftId: ac.registration,
    route: `${flight.origin}-${flight.destination}`,
    pax,
    revenue,
    fuelCost: Math.round(fuelCost),
    crewCost: Math.round(crewCost),
    landingFee,
    totalCost,
    profit,
    date: flight.arrival || Date.now()
  });

  localStorage.setItem("ACS_Finance_Log", JSON.stringify(finance));

  /* ===============================
     5. UPDATE AIRCRAFT HOURS
     =============================== */

  ACS_updateAircraftHoursAndCycles(flight, blockTimeH);

  console.log(
    `✈️ A18 OK | Pax ${pax} | Revenue $${revenue} | Cost $${totalCost} | Profit $${profit}`
  );
}

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

           /* ============================
         🟦 A10.13.1 — Inject scheduleItems metrics (distanceNM / blockTime)
         ------------------------------------------------------------
         ✔ Source of truth: scheduleItems
         ✔ Observer does NOT recalc distance
         ✔ Safe: if not found, keeps zeros (A18 will ignore)
         ============================ */

      try {
        const scheduleItems = JSON.parse(localStorage.getItem("scheduleItems") || "[]");

        // Match by aircraft + route, and (if present) departure close match
        const lfDep = Number(ac.lastFlight?.departure || ac.lastFlight?.blockOff || 0);

        const match = scheduleItems.find(s => {
          if (!s) return false;

          const sAc = s.aircraftId || s.aircraftID || s.acId || s.id || "";
          const sOrg = s.origin || s.from || "";
          const sDst = s.destination || s.to || "";
          if (String(sAc) !== String(ledger[key].aircraftId)) return false;
          if (String(sOrg) !== String(ledger[key].origin)) return false;
          if (String(sDst) !== String(ledger[key].destination)) return false;

          // If both have departure timestamps, try to match (± 6h) to avoid wrong leg
          const sDep = Number(s.departure || s.blockOff || s.dep || 0);
          if (lfDep && sDep) {
            return Math.abs(sDep - lfDep) <= (6 * 60 * 60 * 1000);
          }
          return true;
        });

        if (match) {
          // Distance (NM)
          const dnm = Number(match.distanceNM ?? match.distance_nm ?? match.distNM ?? match.dist_nm ?? 0);
          ledger[key].distanceNM = Number.isFinite(dnm) ? dnm : 0;

          // Block time (hours)
          // Accept common shapes: blockTimeH, blockTimeHours, blockTime (hours), blockTimeMin/minutes
          let btH = Number(match.blockTimeH ?? match.blockTimeHours ?? match.blockTime_h ?? 0);

          if (!btH) {
            const btMin = Number(match.blockTimeMin ?? match.blockTime_min ?? match.blockTimeMinutes ?? match.blockMinutes ?? 0);
            if (btMin) btH = btMin / 60;
          }

          // Some builds store "blockTime" as minutes; we detect large values
          if (!btH) {
            const raw = Number(match.blockTime ?? 0);
            if (raw > 0) btH = (raw > 20) ? (raw / 60) : raw; // 120 => 2h, 2 => 2h
          }

          ledger[key].blockTimeH = Number.isFinite(btH) ? btH : 0;
        }
      } catch (e) {
        // No throw — observer must continue
      }
       
     ACS_processFlightRevenue(ledger[key]);
       
      // 🔜 hooks futuros:
      // Finance.processFlight(ledger[key])
      // Aircraft.applyFlightHours(...)
      // PassengerEngine.generate(...)
    });

    if (dirty) saveLedger(ledger);

  });

})();

/* ============================================================
   🟧 A18 — PROCESS FLIGHT REVENUE & COSTS (STABLE)
   ------------------------------------------------------------
   • Called ONLY when flight is completed
   • No external variables
   • No SkyTrack dependency changes
   • Finance-safe
   ============================================================ */

function ACS_processFlightRevenue(flight) {

  if (!flight || !flight.aircraftId) return;

  const finance = JSON.parse(localStorage.getItem("ACS_Finance_Log") || "[]");
  const fleet   = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  const ac = fleet.find(a => a.id === flight.aircraftId || a.registration === flight.aircraftId);
  if (!ac) return;

    /* ===============================
     1. DISTANCE & BLOCK TIME (SOURCE: scheduleItems)
     =============================== */

  const distanceNM = Number(flight.distanceNM || 0);
  if (distanceNM <= 0) return;

  // Prefer block time from scheduleItems (Observer injected)
  let blockTimeH = Number(flight.blockTimeH || 0);

  // Fallback only if missing (keeps system alive, but not the target path)
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

    const seats = Number(ac.seats || 0);
    pax = Math.min(seats, demand);
  }

  let ticketPrice = 120;
  if (distanceNM > 3000) ticketPrice = 220;
  else if (distanceNM > 1200) ticketPrice = 140;

  revenue = pax * ticketPrice;

  const profit = Math.round(revenue - totalCost);

  /* ===============================
     4. FINANCE LOG ENTRY
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
     5. COMPANY FINANCE SUMMARY
     =============================== */
  if (typeof ACS_Finance === "object") {

    if (revenue > 0 && typeof ACS_Finance.registerIncome === "function") {
      ACS_Finance.registerIncome({
        amount: revenue,
        category: "Flight Revenue",
        description: `Flight ${flight.flightNumber || ""}`,
        timestamp: new Date().toISOString()
      });
    }

    if (typeof ACS_Finance.registerExpense === "function") {
      ACS_Finance.registerExpense({
        amount: totalCost,
        category: "Operational Cost",
        description: `Flight ${flight.flightNumber || ""}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  console.log(
    `✈️ A18 OK | Pax ${pax} | Revenue $${revenue} | Cost $${totalCost} | Profit $${profit}`
  );
}

/* ============================================================
   🟥 A10.14 — FLIGHT COSTS (DISABLED - GLOBAL SCOPE CRASH)
   ------------------------------------------------------------
   This block used variables (f/ac/revenue) outside scope and caused:
   ReferenceError: Can't find variable: f
   Costs are already computed safely inside A18.
   ============================================================ */

/*
   (Legacy block disabled)
*/

/* ============================================================
   🟦 A10.15 — AIRCRAFT HOURS & CYCLES UPDATE
   ============================================================ */

const fleetKey = "ACS_MyAircraft";
const fleet = JSON.parse(localStorage.getItem(fleetKey)) || [];

// Buscar avión correcto
const aircraftIndex = fleet.findIndex(a =>
  a.id === flight.aircraftId ||
  a.registration === flight.aircraftId
);

if (aircraftIndex !== -1) {
  const aircraft = fleet[aircraftIndex];

  /* ============================
     Update hours & cycles
     ============================ */
  aircraft.hours = Number(aircraft.hours || 0) + blockTime_h;
  aircraft.cycles = Number(aircraft.cycles || 0) + 1;
  aircraft.lastFlightAt = flight.arrival || Date.now();

  /* ============================
     Update age (years)
     ============================ */
  if (aircraft.enteredFleetAt) {
    const ageMs = aircraft.lastFlightAt - aircraft.enteredFleetAt;
    aircraft.age = Number((ageMs / (365.25 * 24 * 60 * 60 * 1000)).toFixed(2));
  }

  /* ============================
     Persist
     ============================ */
  fleet[aircraftIndex] = aircraft;
  localStorage.setItem(fleetKey, JSON.stringify(fleet));
  
  ACS_updateAircraftHoursAndCycles(flight, blockTime_h);
   
  console.log(
    `🛠 Aircraft updated: ${aircraft.registration} | ` +
    `Hours ${aircraft.hours.toFixed(1)} | Cycles ${aircraft.cycles}`
  );
}

/* ============================================================
   🟥 A10.15 — AIRCRAFT HOURS & CYCLES UPDATE (DISABLED)
   ------------------------------------------------------------
   FIX:
   - This legacy block executed in global scope
   - Used undefined variables: flight / blockTime_h
   - Caused fatal crash on load
   - Logic preserved in A10.15.1 (scoped function)
   ============================================================ */

/*
   Legacy global block DISABLED.
   See A10.15.1 — ACS_updateAircraftHoursAndCycles()
*/

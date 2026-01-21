/* ============================================================
   🟦 ACS FLIGHT OBSERVER — LEG-BY-LEG (ROBUST)
   ------------------------------------------------------------
   ✔ Airline-realistic: per LEG accounting
   ✔ Robust against race conditions
   ✔ SkyTrack READ-ONLY
   ✔ Schedule Table is source of truth
   ============================================================ */


/* ============================================================
   🟦 OPS IMPACT INJECTOR (OBSERVER HOOK)
   ------------------------------------------------------------
   • Lee impactos activos de Department Ops
   • Decide delays reales
   • Penaliza revenue si aplica
   • Emite alertas operacionales
   • Devuelve flight + revenue modificados
   ============================================================ */

function ACS_OPS_applyImpactToFlight(flight, revenue) {

  try {

    const impacts = JSON.parse(localStorage.getItem("ACS_OPS_IMPACTS") || "{}");
    if (!impacts || typeof impacts !== "object") {
      return { flight, revenue, delayed:false };
    }

    let delayFactor = 0;
    let worstDept = null;

    Object.keys(impacts).forEach(depID => {
      const imp = impacts[depID];
      if (!imp || typeof imp.delayFactor !== "number") return;

      if (imp.delayFactor > delayFactor) {
        delayFactor = imp.delayFactor;
        worstDept = depID;
      }
    });

    // 🟢 Sin impacto → vuelo normal
    if (delayFactor === 0) {
      return { flight, revenue, delayed:false };
    }

    // 🎯 Probabilidad real de delay
    const chance = Math.random();

    if (chance > delayFactor) {
      // No ocurrió delay esta vez
      return { flight, revenue, delayed:false };
    }

    // ⏱️ APLICAR DELAY REAL
    const delayMinutes = Math.round(15 + (delayFactor * 120));   // 15–150 min

    if (!flight.delay) flight.delay = 0;
    flight.delay += delayMinutes;

    // 💰 Penalización revenue
    const lossPercent = Math.min(30, Math.round(delayFactor * 100));
    const newRevenue = Math.round(revenue * (1 - lossPercent / 100));

    // 🔔 ALERTA OPERACIONAL
    if (window.ACS_Alerts && typeof window.ACS_Alerts.push === "function") {

      window.ACS_Alerts.push({
        title: "Flight Delayed (Operational Issue)",
        message: `${flight.origin} → ${flight.destination} delayed ${delayMinutes} min due to staffing shortages.`,
        level: "danger",
        source: "Department Ops"
      });
    }

    console.log(
      "%c⏱ OPS DELAY APPLIED",
      "color:#ffaa00;font-weight:700",
      "Route:", flight.origin, "→", flight.destination,
      "Delay:", delayMinutes, "min",
      "Revenue loss:", lossPercent, "%"
    );

    return {
      flight,
      revenue: newRevenue,
      delayed: true,
      delayMinutes,
      lossPercent
    };

  } catch (err) {
    console.warn("OPS IMPACT ENGINE FAILED", err);
    return { flight, revenue, delayed:false };
  }
}


(function () {

  const LEDGER_KEY = "ACS_FLIGHT_LEDGER_V1";

  /* ============================================================
     🟦 A1 — FLIGHT END DETECTOR (STATE TRANSITION ONLY)
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

      if (prevState === "EN_ROUTE" && currState === "GROUND") {
        console.log(`🟦 A1 — Flight finished (state transition): ${acId}`);
      }

      A1_LAST_STATE[acId] = currState;
    });
  }

  /* ============================================================
     🟦 C1 — CACHE LAST ACTIVE LEG (ANTI-RACE)
     ============================================================ */

  const LAST_ACTIVE_LEG = {};

  /* ============================================================
     🟦 D1 — CANONICAL AIRCRAFT KEY
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

  function buildFlightKey(ac, leg) {
    return [
      ac.aircraftId || ac.registration || "UNK",
      leg.origin,
      leg.destination,
      leg.blockId || leg.legId || leg.departure || Date.now()
    ].join("|");
  }

  /* ============================================================
     🟦 OBSERVER CORE
     ============================================================ */

  window.addEventListener("ACS_SKYTRACK_SNAPSHOT", (ev) => {

    const snapshot = ev.detail;
    A1_detectFlightEnd(snapshot);

    if (!snapshot || !Array.isArray(snapshot.aircraft)) return;

    const ledger = loadLedger();
    let dirty = false;

    snapshot.aircraft.forEach(ac => {

      const acId = getAircraftKey(ac);
      if (!acId) return;

      if (ac.state === "EN_ROUTE" && ac.activeLeg) {
        LAST_ACTIVE_LEG[acId] = ac.activeLeg;
        return;
      }

      if (ac.state !== "GROUND") return;

      const leg = ac.activeLeg || LAST_ACTIVE_LEG[acId];
      if (!leg || !leg.origin || !leg.destination) return;
      if (leg.origin === leg.destination) return;

      const key = buildFlightKey(ac, leg);
      if (ledger[key]) return;

      ledger[key] = {
        aircraftId: acId,
        origin: leg.origin,
        destination: leg.destination,
        departure: leg.departure || leg.blockOff || 0,
        arrival: leg.arrival || Date.now(),
        detectedAt: Date.now()
      };
      dirty = true;

      console.log(`✈️ ACS LEG completed → ${acId} ${leg.origin} → ${leg.destination}`);

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
          const dnm = Number(
            match.distanceNM ??
            match.distance_nm ??
            match.distNM ??
            match.dist_nm ??
            0
          );
          ledger[key].distanceNM = Number.isFinite(dnm) ? dnm : 0;

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
        // observer must never crash
      }

    });

    if (dirty) saveLedger(ledger);

  });

})(); // ✅ IIFE CLOSED CORRECTLY

/* ============================================================
   🟦 AIRCRAFT HOURS & CYCLES
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

  aircraft.hours  = Number(aircraft.hours || 0) + Number(blockTimeH);
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

/* ============================================================
   🟦 DEFERRED REVENUE QUEUE (WORLD SYNC)
   ============================================================ */

window.ACS_DeferredRevenueQueue = window.ACS_DeferredRevenueQueue || [];

/* ============================================================
   🟦 B2.1 — OPS DELAY CONSOLIDATION (CANONICAL FORMAT)
   ------------------------------------------------------------
   • Propaga flags de delay al vuelo final
   • No rompe Finance
   • No toca revenue logic
   • Base directa para:
       - SkyTrack visual
       - KPI OTP
       - PAX impact
   ============================================================ */

// 🟦 OPS IMPACT HOOK (NO ROMPE NADA)
if (payload && payload.flight && typeof payload.revenue === "number") {

  const opsResult = ACS_OPS_applyImpactToFlight(payload.flight, payload.revenue);

  // 🔒 Propagar vuelo y revenue (como antes)
  payload.flight  = opsResult.flight;
  payload.revenue = opsResult.revenue;

  // ========================================================
  // ⏱️ CONSOLIDACIÓN CANÓNICA DE DELAY EN EL VUELO
  // ========================================================

  // Flag principal
  payload.flight.delayed = !!opsResult.delayed;

  // Minutos reales de delay (por este leg)
  payload.flight.delayMinutes = Number(opsResult.delayMinutes || 0);

  // Penalización económica aplicada (info útil para KPI / histórico)
  payload.flight.opsLossPercent = Number(opsResult.lossPercent || 0);

  // Estado operacional final
  if (payload.flight.delayed) {
    payload.flight.opsStatus = "DELAYED";
  } else {
    payload.flight.opsStatus = "ON_TIME";
  }

  console.log(
    "%c⏱ OBSERVER FINAL STATUS",
    "color:#00ffcc;font-weight:700",
    "Route:", payload.flight.origin, "→", payload.flight.destination,
    "Status:", payload.flight.opsStatus,
    "Delay:", payload.flight.delayMinutes, "min",
    "Loss:", payload.flight.opsLossPercent, "%"
  );
}

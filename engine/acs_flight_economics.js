/* ============================================================
   ✈️ ACS FLIGHT ECONOMICS ENGINE — CORE v2.0 (CLEAN)
   ------------------------------------------------------------
   ✔ Single event: ACS_FLIGHT_ARRIVED
   ✔ Passenger source: ACS_PAX
   ✔ Finance via ACS_registerIncome ONLY
   ✔ Live / Weekly via ACS_updateLiveWeekly
   ✔ Dedup by aircraftId + depAbsMin
   ------------------------------------------------------------
   Date: 15 JAN 2026
   ============================================================ */

console.log("🧠 ACS_FLIGHT_ECONOMICS v2.0 LOADED");

/* ============================================================
   🔒 DEDUP STORE (GLOBAL SAFE)
   ============================================================ */

window.ACS_ECON_ProcessedFlights =
  window.ACS_ECON_ProcessedFlights || new Set();

/* ============================================================
   ✈️ ECON LISTENER — ARRIVED (CANONICAL)
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ARRIVED", function (ev) {

  try {

    const d = ev?.detail;
    if (!d) return;

    /* ============================
       🧩 NORMALIZE PAYLOAD
       ============================ */
    const flight = {
      flightId: d.flightId || null,
      aircraftId: d.aircraftId || null,
      origin: d.origin || null,
      destination: d.destination || null,
      distanceNM: Number(d.distanceNM || 0),
      depAbsMin: Number(d.depAbsMin)
    };

    if (
      !flight.aircraftId ||
      !flight.origin ||
      !flight.destination ||
      !Number.isFinite(flight.distanceNM) ||
      !Number.isFinite(flight.depAbsMin)
    ) return;

    /* ============================
       🔒 DEDUP
       ============================ */
    const econKey = `${flight.aircraftId}|${flight.depAbsMin}`;
    if (window.ACS_ECON_ProcessedFlights.has(econKey)) return;
    window.ACS_ECON_ProcessedFlights.add(econKey);

    /* ============================
       ✈️ AIRCRAFT (REAL FLEET)
       ============================ */
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const ac = fleet.find(a => a.id === flight.aircraftId);
    if (!ac) return;

    /* ============================
       ⏱ SIM TIME
       ============================ */
    const simTime =
      window.ACS_TIME?.currentTime instanceof Date
        ? window.ACS_TIME.currentTime
        : new Date();

    /* ============================
       🧍 PASSENGERS (PAX ENGINE)
       ============================ */
    if (!window.ACS_PAX || typeof ACS_PAX.calculate !== "function") return;

    const paxData = ACS_PAX.calculate({
      route: { distanceNM: flight.distanceNM },
      time: {
        hour: simTime.getUTCHours(),
        year: simTime.getUTCFullYear()
      },
      aircraft: {
        seats: ac.seats || 0,
        comfortIndex: ac.comfortIndex || 1.0
      }
    });

    const pax = Number(paxData?.pax || 0);
    if (pax <= 0) return;

    /* ============================
       💵 TICKET MODEL (SIMPLE)
       ============================ */
    let ticket = 90;
    if (flight.distanceNM > 3000) ticket = 220;
    else if (flight.distanceNM > 1200) ticket = 150;
    else if (flight.distanceNM > 500)  ticket = 90;

    if (simTime.getUTCFullYear() < 1960) {
      ticket = Math.round(ticket * 0.6);
    }

    const revenue = Math.round(pax * ticket);
    if (revenue <= 0) return;

    /* ============================
       💰 FINANCE (CANONICAL)
       ============================ */
    if (typeof window.ACS_registerIncome === "function") {
      ACS_registerIncome(
        "routes",
        revenue,
        `AUTO FLIGHT ${flight.origin} → ${flight.destination}`
      );
    }

    if (typeof window.ACS_updateLiveWeekly === "function") {
      ACS_updateLiveWeekly(revenue, simTime);
    }

    /* ============================
       📡 ECON EVENT (FOR UI / STATS)
       ============================ */
    window.dispatchEvent(
      new CustomEvent("ACS_FLIGHT_ECONOMICS", {
        detail: {
          flightId: flight.flightId,
          aircraftId: ac.id,
          origin: flight.origin,
          destination: flight.destination,
          pax: pax,
          distanceNM: flight.distanceNM,
          revenue: revenue,
          simTime: simTime
        }
      })
    );

    console.log(
      "%c💰 ECON FLIGHT PROCESSED",
      "color:#00ff88;font-weight:bold;",
      {
        aircraft: ac.id,
        route: `${flight.origin} → ${flight.destination}`,
        pax,
        revenue
      }
    );

  } catch (err) {
    console.error("❌ ACS_FLIGHT_ECONOMICS ERROR", err);
  }
});

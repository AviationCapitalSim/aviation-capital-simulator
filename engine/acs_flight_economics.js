/* ============================================================
   🟦 CORE LISTENER — FLIGHT ARRIVED
   DEDUP CANÓNICO: flightId
   ============================================================ */

window.ACS_ECON_ProcessedFlights =
  window.ACS_ECON_ProcessedFlights || new Set();

window.addEventListener("ACS_FLIGHT_ARRIVED", (ev) => {

  try {

    const f = ev?.detail;
    if (!f) return;

    if (!f.flightId || !f.aircraftId) return;

    // 🔒 DEDUP ESTABLE (1 ingreso por vuelo real)
    if (window.ACS_ECON_ProcessedFlights.has(f.flightId)) return;
    window.ACS_ECON_ProcessedFlights.add(f.flightId);

    const distanceNM = Number(f.distanceNM || 0);
    if (distanceNM <= 0) return;

    /* ============================================================
       🟧 A3 — AIRCRAFT ID NORMALIZER (ECON SAFE)
       ============================================================ */

    const fleet = JSON.parse(
      localStorage.getItem("ACS_MyAircraft") || "[]"
    );

    const econAircraftIdRaw = String(f.aircraftId || "").trim();
    const econAircraftIdNorm = econAircraftIdRaw.replace("-", "_");

    const ac = fleet.find(a => {
      if (!a) return false;

      const fid = String(a.id || "").trim();
      const fidNorm = fid.replace("-", "_");

      return (
        fid === econAircraftIdRaw ||
        fidNorm === econAircraftIdNorm ||
        a.registration === econAircraftIdRaw
      );
    });

    if (!ac) {
      console.warn(
        "❌ ECON: Aircraft NOT FOUND in fleet",
        econAircraftIdRaw,
        "→ normalized:",
        econAircraftIdNorm
      );
      return;
    }

    /* ============================
       🏙 AIRPORTS
       ============================ */

    const A = ACS_buildEconAirport(f.origin, distanceNM);
    const B = ACS_buildEconAirport(f.destination, distanceNM);
    if (!A || !B) return;

    /* ============================
       🧮 PAX CALCULATION
       ============================ */

    if (!window.ACS_PAX) return;

    const year =
      window.ACS_TIME?.currentTime instanceof Date
        ? window.ACS_TIME.currentTime.getUTCFullYear()
        : new Date().getFullYear();

    const hour =
      Number.isFinite(f.detectedAtTs)
        ? new Date(f.detectedAtTs).getUTCHours()
        : 12;

    const tierA = ACS_PAX.getTier(A);
    const tierB = ACS_PAX.getTier(B);

    const dailyDemand = ACS_PAX.getDailyDemand(
      A, B, distanceNM, year
    );

    const hourlyDemand = ACS_PAX.getHourlyDemand(
      dailyDemand,
      hour,
      ACS_PAX.isLongHaul(distanceNM, tierA, tierB),
      Math.min(tierA, tierB)
    );

    const pax = Math.min(ac.seats || 0, hourlyDemand);
    if (pax <= 0) return;

    /* ============================
       💵 REVENUE
       ============================ */

    const ticket = ACS_getBaseTicket(distanceNM, year);
    const revenue = Math.round(pax * ticket);
    if (revenue <= 0) return;

    if (typeof ACS_registerIncome === "function") {
      ACS_registerIncome(
        "routes",
        revenue,
        `Flight ${f.origin} → ${f.destination} (${f.aircraftId})`
      );
    }

    console.log(
      `💰 ECON OK | ${f.origin} → ${f.destination} | Pax ${pax} | $${revenue}`
    );

  } catch (err) {
    console.error("❌ ACS Flight Economics error:", err);
  }

});

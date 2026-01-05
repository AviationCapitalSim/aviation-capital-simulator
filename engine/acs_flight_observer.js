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
   🟦 A10.13 — PASSENGERS + REVENUE (HOOK)
   ============================================================ */

function ACS_processFlightRevenue(flight) {

  if (
    typeof ACS_PAX === "undefined" ||
    !flight.origin ||
    !flight.destination
  ) return;

  const year = new Date(flight.arrival || Date.now()).getFullYear();

  const airports = window.ACS_AIRPORT_INDEX || {};
  const A = airports[flight.origin];
  const B = airports[flight.destination];
  if (!A || !B) return;

  const dist = flight.distance_nm || flight.distance || 500;

  /* ============================
     Demand
     ============================ */

  const dailyDemand = ACS_PAX.getDailyDemand(A, B, dist, year);

  /* ============================
     Aircraft capacity
     ============================ */

  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft")) || [];
  const ac = fleet.find(a =>
    a.id === flight.aircraftId ||
    a.registration === flight.aircraftId
  );
  if (!ac || !ac.seats) return;

  /* ============================
     Route maturity
     ============================ */

  const routeKey = `${flight.origin}-${flight.destination}`;
  const maturityKey = "ACS_ROUTE_MATURITY";

  const maturityMap = JSON.parse(localStorage.getItem(maturityKey)) || {};
  maturityMap[routeKey] = (maturityMap[routeKey] || 0) + 1;
  localStorage.setItem(maturityKey, JSON.stringify(maturityMap));

  const n = maturityMap[routeKey];

  let maturityFactor = 0.25;
  if (n >= 3) maturityFactor = 0.5;
  if (n >= 5) maturityFactor = 0.65;
  if (n >= 10) maturityFactor = 0.8;
  if (n >= 20) maturityFactor = 0.95;

  /* ============================
     Pax + Revenue
     ============================ */

  const pax = Math.min(
    ac.seats,
    Math.floor(dailyDemand * maturityFactor)
  );

  const pricePerPax = dist * 0.12;
  const revenue = Math.round(pax * pricePerPax);

  /* ============================
     Finance log
     ============================ */

  const financeKey = "ACS_FINANCE_LOG";
  const finance = JSON.parse(localStorage.getItem(financeKey)) || [];

  finance.push({
  type: "FLIGHT_RESULT",
  aircraftId: flight.aircraftId,
  route: routeKey,
  pax,
  revenue,
  fuelCost,
  crewCost,
  landingFee,
  totalCost,
  profit,
  date: flight.arrival || Date.now()
});

  localStorage.setItem(financeKey, JSON.stringify(finance));

  console.log(
    `💰 Revenue generated: ${routeKey} | Pax ${pax} | $${revenue}`
  );
}

/* ============================================================
   🟦 A10.14 — FLIGHT COSTS
   ============================================================ */

/* ============================
   Block time
   ============================ */
const distance_nm = dist;
const blockTime_h = distance_nm / ac.speed_kts;

/* ============================
   Fuel cost
   ============================ */
const fuelPricePerKg = 0.45;
const fuelKg = ac.fuel_burn_kgph * blockTime_h;
const fuelCost = Math.round(fuelKg * fuelPricePerKg);

/* ============================
   Crew cost (simplified)
   ============================ */
let crewHourlyCost = 180;
if (ac.seats > 80) crewHourlyCost = 350;
if (ac.seats > 150) crewHourlyCost = 700;

const crewCost = Math.round(blockTime_h * crewHourlyCost);

/* ============================
   Airport fees (flat v1)
   ============================ */
const landingFee = 400;

/* ============================
   Total cost & profit
   ============================ */
const totalCost = fuelCost + crewCost + landingFee;
const profit = revenue - totalCost;

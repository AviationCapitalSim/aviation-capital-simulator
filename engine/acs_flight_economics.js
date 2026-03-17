/* ============================================================
   ✈️ ACS FLIGHT ECONOMICS ENGINE — CORE v3.0 (FIXED)
   ------------------------------------------------------------
   ✔ Trigger: ACS_FLIGHT_ARRIVAL
   ✔ PAX source: ACS_PAX (canonical)
   ✔ One flight → one economics object
   ✔ NO duplicate const
   ------------------------------------------------------------
   Date: 16 JAN 2026
   ============================================================ */

console.log("🧠 ACS_FLIGHT_ECONOMICS v3.0 FIXED LOADED");

/* ============================================================
   🔒 DEDUP STORE (PER SESSION)
   ============================================================ */
const ACS_ECO_DEDUP = new Set();

/* ============================================================
   🧠 CORE — BUILD FLIGHT ECONOMICS OBJECT
   ============================================================ */
function ACS_buildFlightEconomics(d) {

  if (!d || !d.flightId || !d.aircraftId || !d.distanceNM) {
    console.warn("⚠️ ECONOMICS aborted — invalid payload", d);
    return null;
  }

  const aircraftList = JSON.parse(
    localStorage.getItem("ACS_MyAircraft") || "[]"
  );
  const ac = aircraftList.find(a => a.id === d.aircraftId);
  if (!ac) {
    console.warn("⚠️ ECONOMICS aborted — aircraft not found", d.aircraftId);
    return null;
  }

  /* ============================================================
     🕒 SIM YEAR — SOURCE OF TRUTH
     ============================================================ */
  const year =
    d.year ||
    window.ACS_TIME?.currentYear ||
    window.ACS_TIME?.year ||
    1944;

  /* ============================================================
     🟧 E1 — SEAT RESOLVER (HISTORICAL SAFE)
     ============================================================ */
  function ACS_resolveSeats(ac, year) {
    if (!ac) return 0;

    const direct =
      ac.seats ??
      ac.seatCount ??
      ac.seatsTotal ??
      ac.capacity ??
      ac.paxCapacity ??
      ac.pax ??
      0;

    if (Number(direct) > 0) return Number(direct);

    // fallback histórico seguro
    if (year <= 1945) return 30;
    if (year <= 1955) return 45;
    if (year <= 1965) return 90;
    if (year <= 1975) return 120;
    if (year <= 1990) return 150;
    if (year <= 2010) return 180;
    return 200;
  }

  const seats = ACS_resolveSeats(ac, year);

  const comfortIndex =
    Number(
      ac.comfortIndex ??
      ac.comfort ??
      ac.cabinComfort ??
      1
    ) || 1;

  /* ============================================================
   🟧 E2 — CONTINENT / REGION RESOLVER (ICAO GLOBAL STANDARD)
   ------------------------------------------------------------
   Regions used by ACS economics engine
   NA = North America
   SA = South America
   EU = Europe
   AF = Africa
   AS = Asia
   ME = Middle East
   OC = Oceania
   PAC = Pacific Islands
   ============================================================ */

function ACS_resolveContinentFromICAO(icao){

  if(!icao) return null;

  const p = icao[0].toUpperCase();

  /* NORTH AMERICA */
  if(["K","C","M","T"].includes(p)) return "NA";

  /* SOUTH AMERICA */
  if(p === "S") return "SA";

  /* EUROPE */
  if(["E","L","G"].includes(p)) return "EU";

  /* AFRICA */
  if(["F","H"].includes(p)) return "AF";

  /* MIDDLE EAST */
  if(p === "O") return "ME";

  /* ASIA */
  if(["R","V","W","Z","U"].includes(p)) return "AS";

  /* OCEANIA */
  if(p === "Y") return "OC";

  /* PACIFIC ISLANDS */
  if(["N","P"].includes(p)) return "PAC";

  return null;

}

  const continentA = ACS_resolveContinentFromICAO(d.origin);
  const continentB = ACS_resolveContinentFromICAO(d.destination);

  if (!continentA || !continentB) {
    console.warn(
      "⚠️ CONTINENT NOT RESOLVED (ECON)",
      d.origin,
      d.destination,
      continentA,
      continentB
    );
  }

  /* ============================================================
     📏 DISTANCE (CANONICAL)
     ============================================================ */
  const distanceNM = Number(d.distanceNM);
  if (!distanceNM || distanceNM <= 0) return null;

  /* ============================================================
   🟧 A5 — FUEL COST (CANONICAL AIRCRAFT DB)
   ------------------------------------------------------------
   • Primary: fuel_burn_kgph from Aircraft DB
   • Fallback: heuristic ONLY if DB missing
   • Historical safe (1940 → 2026)
   ============================================================ */

let fuelBurnKgPerHour = null;

// 1️⃣ Try operational aircraft first
if (ac.fuel_burn_kgph) {
  fuelBurnKgPerHour = Number(ac.fuel_burn_kgph);
}

// 2️⃣ Resolve from Aircraft DB (canonical)
if (!fuelBurnKgPerHour && window.ACS_AIRCRAFT_DB) {
  const dbMatch = window.ACS_AIRCRAFT_DB.find(
    a =>
      a.manufacturer === ac.manufacturer &&
      a.model === ac.model &&
      a.year <= year
  );

  if (dbMatch?.fuel_burn_kgph) {
    fuelBurnKgPerHour = Number(dbMatch.fuel_burn_kgph);
  }
}

// 3️⃣ LAST resort fallback (temporary, safe)
if (!fuelBurnKgPerHour && seats > 0) {
  fuelBurnKgPerHour = seats * 2.5; // conservative historical heuristic
}

// 4️⃣ Flight time estimation (NM / kt)
   
const cruiseSpeed =
  Number(ac.cruiseSpeed) ||
  Number(ac.speed_kts) ||
  Number(ac.data?.speed_kts) ||
  180; // DC-3 safe default

const flightHours = distanceNM / cruiseSpeed;

// 5️⃣ Historical fuel price (USD/kg)
let fuelPricePerKg = 0.8; // default 1940s
if (year >= 1960) fuelPricePerKg = 0.6;
if (year >= 1980) fuelPricePerKg = 0.9;
if (year >= 2000) fuelPricePerKg = 1.2;

// 6️⃣ Final fuel cost
const costFuel =
  fuelBurnKgPerHour && flightHours
    ? fuelBurnKgPerHour * flightHours * fuelPricePerKg
    : 0;

/* ============================================================
   🟧 A6 — SLOT COSTS (REFINED & HISTORICAL)
   ------------------------------------------------------------
   • Departure + Arrival
   • Based on continent, operation type, aircraft size, era
   ============================================================ */

function ACS_getSlotCost(airportICAO, year, isInternational, seats) {
  const idx = window.ACS_AIRPORT_INDEX || {};
  const ap = idx[airportICAO];

  /* -----------------------------
     Base slot by continent
     ----------------------------- */
  let baseSlot = 10; // fallback small airfield
  const continent = ap?.continent || "EU";

  if (continent === "EU") baseSlot = 20;
  if (continent === "NA") baseSlot = 25;
  if (continent === "AS") baseSlot = 30;
  if (continent === "AF") baseSlot = 15;
  if (continent === "SA") baseSlot = 18;
  if (continent === "OC") baseSlot = 22;

  /* -----------------------------
     Operation type modifier
     ----------------------------- */
  let opFactor = isInternational ? 1.5 : 1.0;

  /* -----------------------------
     Aircraft size modifier
     ----------------------------- */
  let sizeFactor = 1.0;
  if (seats <= 30) sizeFactor = 0.6;
  else if (seats <= 100) sizeFactor = 1.0;
  else if (seats <= 200) sizeFactor = 1.4;
  else sizeFactor = 2.0;

  /* -----------------------------
     Era (soft historical factor)
     ----------------------------- */
  let eraFactor = 1.0;
  if (year <= 1959) eraFactor = 0.5;
  else if (year <= 1979) eraFactor = 0.8;
  else if (year <= 1999) eraFactor = 1.0;
  else eraFactor = 1.3;

  const slotCost =
    baseSlot * opFactor * sizeFactor * eraFactor;

  return Math.round(slotCost);
}

/* -----------------------------
   Determine operation type
   ----------------------------- */
const isInternational =
  continentA && continentB && continentA !== continentB;

/* -----------------------------
   Slot costs (dep + arr)
   ----------------------------- */
const slotDeparture = ACS_getSlotCost(
  d.origin,
  year,
  isInternational,
  seats
);

const slotArrival = ACS_getSlotCost(
  d.destination,
  year,
  isInternational,
  seats
);

const costSlots = slotDeparture + slotArrival;
   
  /* ============================================================
     🧑‍🤝‍🧑 PASSENGER ENGINE (SINGLE CALL)
     ============================================================ */
  let paxResult = { pax: 0, loadFactor: 0, demandUsed: 0 };
  try {
    if (window.ACS_PAX && typeof window.ACS_PAX.calculate === "function") {
      paxResult = window.ACS_PAX.calculate({
        route: { distanceNM, continentA, continentB },
        time: {
          year,
          hour: window.ACS_TIME?.hour ?? 12
        },
        aircraft: { seats, comfortIndex },
        airline: { marketingLevel: 1.0, reputation: 1.0 },
        market: { frequencyFactor: 1.0, competitors: 1 }
      }) || paxResult;
    }
  } catch (e) {
    console.error("❌ PAX CALC FAILED", e);
  }

  const pax = Number(paxResult.pax || 0);
  const loadFactor =
    Number(paxResult.loadFactor ?? (seats > 0 ? pax / seats : 0));

/* ============================================================
   🧰 HANDLING COST (REALISTIC · CONTINUOUS)
   ------------------------------------------------------------
   • Per flight (arrival)
   • Based on aircraft size, pax handled, era
   • No airport / no hub dependency
   ============================================================ */

// Aircraft size base cost (USD)
let handlingBase = 0;
if (seats <= 30) handlingBase = 10;
else if (seats <= 100) handlingBase = 25;
else handlingBase = 60;

// Pax handling rate (historical evolution)
let paxRate = 0.8;            // pre-jet / manual era
if (year >= 1960) paxRate = 1.5;
if (year >= 1980) paxRate = 3.0;
if (year >= 2000) paxRate = 6.0;

// Era factor (smooth growth, no hard jumps)
let eraFactor = 0.7;          // pre-1950
if (year >= 1950) eraFactor = 1.0;
if (year >= 1970) eraFactor = 1.4;
if (year >= 1990) eraFactor = 1.8;
if (year >= 2010) eraFactor = 2.3;

// Final handling cost
const handlingCost = Math.round(
  (handlingBase + pax * paxRate) * eraFactor
);  

/* ============================================================
   ✈️ OVERFLIGHT COST (HISTORICAL · ERA-BASED)
   ------------------------------------------------------------
   • Charged per flight
   • Based on distance + era
   • Applied mainly to medium / long routes
   ============================================================ */

let overflightCost = 0;

// Only apply to longer routes (avoid local/regional noise)
if (distanceNM > 600) {

  // Base rate per 100 NM (USD)
  let ratePer100NM = 0;

  if (year <= 1949) ratePer100NM = 0;          // practically none
  else if (year <= 1969) ratePer100NM = 0.5;
  else if (year <= 1989) ratePer100NM = 1.5;
  else if (year <= 2009) ratePer100NM = 3.0;
  else ratePer100NM = 6.0;

  // Continental crossing modifier
  let continentFactor = 1;
  if (continentA && continentB && continentA !== continentB) {
    continentFactor = 1.4; // international / FIR crossing
  }

  overflightCost = Math.round(
    (distanceNM / 100) * ratePer100NM * continentFactor
  );
}

/* ============================================================
   🧭 NAVIGATION FEES (EN-ROUTE · HISTORICAL)
   ------------------------------------------------------------
   • Per flight
   • Based on distance flown
   • Era-dependent (ICAO evolution)
   • Independent from airport / FIR detail
   ============================================================ */

// Rate per 100 NM (USD)
let navRatePer100NM = 0;

// Historical evolution
if (year <= 1949) {
  navRatePer100NM = 0;          // No structured ATC fees
} else if (year <= 1969) {
  navRatePer100NM = 0.5;        // Early ATC / radio guidance
} else if (year <= 1989) {
  navRatePer100NM = 1.5;        // Radar-based en-route services
} else if (year <= 2009) {
  navRatePer100NM = 3.0;        // Modern ATC (pre-ADS-B)
} else {
  navRatePer100NM = 5.0;        // Full ICAO / RNAV / ADS-B era
}

// Distance factor
const navDistanceUnits = distanceNM / 100;

// Final navigation cost
const navigationCost = Math.round(
  navDistanceUnits * navRatePer100NM
);

/* ============================================================
   🟥 E6 — STRUCTURAL OPERATING COSTS (CRITICAL · HISTORICAL)
   ============================================================ */

// ---- MAINTENANCE RESERVE
let maintPerNM = 0;

if (year <= 1945) maintPerNM = 0.08;
else if (year <= 1960) maintPerNM = 0.12;
else if (year <= 1980) maintPerNM = 0.18;
else if (year <= 2000) maintPerNM = 0.24;
else if (year <= 2015) maintPerNM = 0.32;
else maintPerNM = 0.40;

const maintenanceCost = maintPerNM * distanceNM;


// ---- CREW COST
let crewCostPerHour = 0;

if (year <= 1945) crewCostPerHour = 12;
else if (year <= 1960) crewCostPerHour = 22;
else if (year <= 1980) crewCostPerHour = 45;
else if (year <= 2000) crewCostPerHour = 85;
else if (year <= 2015) crewCostPerHour = 160;
else crewCostPerHour = 240;

const crewCost = crewCostPerHour * flightHours;


// ---- OWNERSHIP COST
let ownershipPerNM = 0;

if (year <= 1945) ownershipPerNM = 0.10;
else if (year <= 1960) ownershipPerNM = 0.15;
else if (year <= 1980) ownershipPerNM = 0.22;
else if (year <= 2000) ownershipPerNM = 0.30;
else if (year <= 2015) ownershipPerNM = 0.38;
else ownershipPerNM = 0.45;

const ownershipCost = ownershipPerNM * distanceNM;


// ---- OVERHEAD
const overheadCost =
  (maintenanceCost + crewCost + ownershipCost + costFuel) * 0.12;


// ---- STRUCTURAL TOTAL
const structuralCost =
  maintenanceCost +
  crewCost +
  ownershipCost +
  overheadCost;

   
 /* ============================================================
   💰 REVENUE (ROUTE CONFIG DRIVEN — CANONICAL)
   ------------------------------------------------------------
   • Reads ticketPrice from scheduleItems
   • Fallback to historical if missing
   ============================================================ */

let ticket = null;

try {

  const schedule = JSON.parse(localStorage.getItem("scheduleItems") || "[]");

  const routeMatch = schedule.find(item =>
    item.type === "flight" &&
    item.aircraftId === d.aircraftId &&
    item.origin === d.origin &&
    item.destination === d.destination
  );

  if (routeMatch && typeof routeMatch.ticketPrice === "number") {
    ticket = routeMatch.ticketPrice;
  }

} catch (e) {
  console.warn("⚠️ Ticket read failed from scheduleItems");
}

/* --- Fallback histórico SOLO si no hay ticket configurado --- */

if (ticket === null) {

  if (distanceNM < 500) ticket = 80;
  else if (distanceNM < 1500) ticket = 150;
  else ticket = 300;
}

const revenue = pax * ticket;

  /* ============================================================
     📐 METRICS (NO COSTS YET)
     ============================================================ */
  const paxPerNM = pax / distanceNM;
  const revPerNM = revenue / distanceNM;

/* ============================================================
   🟦 E5 — COSTS LAYER (PREP)
   ------------------------------------------------------------
   • Fuel (per NM, real aircraft consumption)
   • Airport costs (landing + slot + handling)
   • Historical scaling (1940–2026)
   • NO Finance writes here
   ============================================================ */

/* ============================================================
   🟦 E5.1 — FUEL COST (PER NM · HISTORICAL)
   ============================================================ */

function ACS_resolveFuelBurnPerNM(ac, year) {
  // prioridad: dato real del avión
  const direct =
    ac.fuelBurnPerNM ??
    ac.fuel_burn_nm ??
    ac.fuelBurn ??
    null;

  if (Number(direct) > 0) return Number(direct);

  // fallback histórico por época (kg / NM)
  if (year <= 1945) return 3.5;   // DC-3 / DC-4
  if (year <= 1955) return 4.5;   // Constellation
  if (year <= 1965) return 6.5;   // 707 / DC-8
  if (year <= 1975) return 7.5;
  if (year <= 1990) return 8.5;
  if (year <= 2010) return 9.5;
  return 10.5;
}

function ACS_resolveFuelPricePerKg(year){

  if(year <= 1945) return 0.05;
  if(year <= 1955) return 0.08;
  if(year <= 1965) return 0.12;
  if(year <= 1975) return 0.18;
  if(year <= 1990) return 0.25;
  if(year <= 2010) return 0.45;

  return 0.70;
}

const fuelBurnPerNM = ACS_resolveFuelBurnPerNM(ac, year);
const fuelPriceKg = ACS_resolveFuelPricePerKg(year);

const fuelKg = fuelBurnPerNM * distanceNM;

/* ============================================================
   🟦 E5.2 — AIRPORT COSTS (LANDING + SLOT + HANDLING)
   ------------------------------------------------------------
   • Economics-local
   • Airport-based
   • Historical scaling
   ============================================================ */

function ACS_resolveAirportCosts(icao, year) {
  if (!icao) return { landing: 0, slot: 0, handling: 0 };

  // base genérica (USD)
  let landing = 200;
  let slot = 150;
  let handling = 100;

  // histórico
  if (year <= 1945) {
    landing *= 0.25;
    slot *= 0.20;
    handling *= 0.30;
  } else if (year <= 1965) {
    landing *= 0.45;
    slot *= 0.40;
    handling *= 0.50;
  } else if (year <= 1990) {
    landing *= 0.75;
    slot *= 0.70;
    handling *= 0.80;
  }

  return { landing, slot, handling };
}

const apCostOrigin = ACS_resolveAirportCosts(d.origin, year);
const apCostDest   = ACS_resolveAirportCosts(d.destination, year);

const costLanding  = apCostOrigin.landing + apCostDest.landing;
const costSlot     = apCostOrigin.slot + apCostDest.slot;
const costHandling = apCostOrigin.handling + apCostDest.handling;

/* ============================================================
   🟦 E5.3 — COST TOTAL & METRICS
   ============================================================ */

const costAirport = costLanding + costSlot + costHandling;
const costTotal = costFuel + costAirport;

const costPerNM = distanceNM > 0 ? costTotal / distanceNM : 0;
const costPerPax = pax > 0 ? costTotal / pax : 0;

const profit = revenue - costTotal;
   
/* ============================================================
   🟦 FINAL TOTAL COST CALCULATION (CANONICAL)
   ============================================================ */

const totalCost =
  costFuel +
  costSlots +
  handlingCost +
  overflightCost +
  navigationCost +
  structuralCost;


/* ============================================================
   📦 FINAL ECONOMICS OBJECT
   ============================================================ */

return {

  flightId: d.flightId,
  aircraftId: d.aircraftId,
  origin: d.origin,
  destination: d.destination,
  distanceNM,

  pax,
  loadFactor,

  revenue,

  /* Individual costs */
  fuelCost: costFuel,
  slotCost: costSlots,
  handlingCost,
  overflightCost,
  navigationCost,

  maintenanceCost,
  crewCost,
  ownershipCost,
  overheadCost,

  /* Final totals */
  costTotal: totalCost,

  profit: revenue - totalCost,

  paxPerNM,
  revPerNM,

  year,
  arrAbsMin: d.arrAbsMin ?? null,
  ts: Date.now()

};

} // ✅ ESTA LLAVE CIERRA ACS_buildFlightEconomics (TE FALTABA)


/* ============================================================
   🟧 A9 — SKYTRACK ARRIVAL LISTENER (HARD ID PROTECTION)
   ------------------------------------------------------------
   ✔ One arrival → one economics event
   ✔ Stable eventId
   ✔ Multi-tab safe (session level)
   ✔ Refresh safe (finance-level rejection expected)
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ARRIVAL", e => {

  const d = e.detail;
  if (!d || !d.flightId) return;

  const eventId = `${d.flightId}_${d.arrAbsMin ?? "NA"}`;

  // Session-level protection
  if (ACS_ECO_DEDUP.has(eventId)) return;
  ACS_ECO_DEDUP.add(eventId);

  const economics = ACS_buildFlightEconomics(d);
  if (!economics) return;

  // Attach canonical eventId
  economics.eventId = eventId;

  window.dispatchEvent(
    new CustomEvent("ACS_FLIGHT_ECONOMICS", {
      detail: economics
    })
  );

});

/* ============================================================
   🟧 A10 — GLOBAL TRAFFIC LOG (CANONICAL · AIRPORT UTILIZATION)
   ------------------------------------------------------------
   ✔ Stores real passengers transported per flight
   ✔ Source of Truth for Airport Utilization modal
   ✔ Uses ACS_FLIGHT_ECONOMICS event (already deduplicated)
   ✔ Safe for refresh and multi-tab
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ECONOMICS", e => {

  const eco = e.detail;
  if (!eco || !eco.flightId) return;

  try {

    const KEY = "ACS_TRAFFIC_LOG";

    let log = JSON.parse(localStorage.getItem(KEY) || "[]");

    if (!Array.isArray(log)) log = [];

    /* Prevent duplicates */
    if (log.some(x => x.eventId === eco.eventId)) return;

    log.push({

      eventId: eco.eventId,

      flightId: eco.flightId,
      aircraftId: eco.aircraftId,

      origin: eco.origin,
      destination: eco.destination,

      pax: eco.pax,
      seats: Math.round(eco.pax / (eco.loadFactor || 1)),

      loadFactor: eco.loadFactor,

      distanceNM: eco.distanceNM,

      ts: eco.ts || Date.now(),

      year: eco.year

    });

    /* Limit log size (performance safe) */
    if (log.length > 5000) {
      log = log.slice(-5000);
    }

    localStorage.setItem(KEY, JSON.stringify(log));

    // Debug
    // console.log("📊 ACS_TRAFFIC_LOG updated:", eco.flightId, eco.pax);

  }
  catch (err) {

    console.error("ACS_TRAFFIC_LOG write failed", err);

  }

});

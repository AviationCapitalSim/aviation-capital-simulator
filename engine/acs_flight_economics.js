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
     🟧 E2 — CONTINENT RESOLVER (ECONOMICS LOCAL)
     ============================================================ */
  function ACS_resolveContinentFromICAO(icao) {
    if (!icao) return null;
    const p = icao.substring(0, 2).toUpperCase();

    if (["LE","LF","LG","LI","ED","EH","EB","LP","LO","LK","LS","LQ","LT","LV","LY"].includes(p)) return "EU";
    if (["K","C"].includes(p.charAt(0))) return "NA";
    if (["SA","SB","SC","SD","SE","SG","SH","SK","SL","SM","SN","SO","SP","SS","SU","SV","SY","SZ"].includes(p)) return "SA";
    if (["RJ","RK","RO","RP","RC","ZS","ZB","ZG","ZH","ZK","ZP","ZY","VT","VV","VA","VI","VO","VR"].includes(p)) return "AS";
    if (["FA","FB","FC","FD","FE","FG","FH","FI","FJ","FK","FL","FM","FN","FO","FP","FQ","FS","FT","FV","FW","FX","FY","FZ"].includes(p)) return "AF";
    if (["Y"].includes(p.charAt(0))) return "OC";

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
     💰 REVENUE (SIMPLE & STABLE)
     ============================================================ */
  let ticket;
  if (distanceNM < 500) ticket = 80;
  else if (distanceNM < 1500) ticket = 150;
  else ticket = 300;

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

function ACS_resolveFuelPricePerKg(year) {
  // precio histórico aproximado (USD / kg)
  if (year <= 1945) return 0.12;
  if (year <= 1955) return 0.18;
  if (year <= 1965) return 0.25;
  if (year <= 1975) return 0.35;
  if (year <= 1990) return 0.45;
  if (year <= 2010) return 0.65;
  return 0.85;
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

    fuelCost: costFuel,
    slotCost: costSlots,
    handlingCost,

    costTotal: costFuel + costSlots + handlingCost,
    profit: revenue - (costFuel + costSlots + handlingCost),

    paxPerNM,
    revPerNM,
    costPerNM: distanceNM > 0 ? (costFuel + costSlots + handlingCost) / distanceNM : 0,
    costPerPax: pax > 0 ? (costFuel + costSlots + handlingCost) / pax : 0,

    year,
    arrAbsMin: d.arrAbsMin ?? null,
    ts: Date.now()
  };
} // ✅ ESTA LLAVE CIERRA ACS_buildFlightEconomics (TE FALTABA)


/* ============================================================
   ✈️ SKYTRACK ARRIVAL LISTENER
   ============================================================ */
window.addEventListener("ACS_FLIGHT_ARRIVAL", e => {

  const d = e.detail;
  if (!d) return;

  const key = `${d.flightId}_${d.arrAbsMin ?? "NA"}`;
  if (ACS_ECO_DEDUP.has(key)) return;
  ACS_ECO_DEDUP.add(key);

  const economics = ACS_buildFlightEconomics(d);
  if (!economics) return;

  window.dispatchEvent(
    new CustomEvent("ACS_FLIGHT_ECONOMICS", {
      detail: economics
    })
  );

  console.log(
    "%c💰 FLIGHT ECONOMICS",
    "color:#00ff88;font-weight:bold;",
    economics
  );
});

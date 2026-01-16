/* ============================================================
   ✈️ ACS FLIGHT ECONOMICS ENGINE — CORE v3.0 (STABLE)
   ------------------------------------------------------------
   ✔ Trigger: ACS_FLIGHT_ARRIVAL (SkyTrack)
   ✔ PAX source: ACS_PAX (canonical)
   ✔ Aircraft source: ACS_MyAircraft
   ✔ One flight → one economics object
   ✔ NO fuel / NO maintenance / NO finance yet
   ------------------------------------------------------------
   Date: 16 JAN 2026
   ============================================================ */

console.log("🧠 ACS_FLIGHT_ECONOMICS v3.0 LOADED");

/* ============================================================
   🔒 DEDUP STORE (PER SESSION)
   ============================================================ */
const ACS_ECO_DEDUP = new Set();

/* ============================================================
   🧠 CORE — BUILD FLIGHT ECONOMICS OBJECT
   ============================================================ */
function ACS_buildFlightEconomics(d) {

  if (!d || !d.flightId || !d.aircraftId || !d.distanceNM) {
    console.warn("⚠️ ECONOMICS aborted — invalid arrival payload", d);
    return null;
  }

  const aircraftList = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  const ac = aircraftList.find(a => a.id === d.aircraftId);

  if (!ac) {
    console.warn("⚠️ ECONOMICS aborted — aircraft not found", d.aircraftId);
    return null;
  }

  /* ============================================================
   🕒 SIM YEAR — SOURCE OF TRUTH: ACS_TIME
   ============================================================ */
   
  const year =
  d.year ||
  window.ACS_TIME?.currentYear ||
  window.ACS_TIME?.year ||
  1944;

  const seats = ac.seats || 0;
  const comfortIndex = ac.comfortIndex || 1;

/* ============================================================
   🌍 ROUTE CONTEXT — CONTINENT RESOLUTION (CANONICAL)
   ============================================================ */

const airportIndex = window.ACS_AIRPORT_INDEX || {};

const continentA =
  airportIndex[d.origin]?.continent ?? null;

const continentB =
  airportIndex[d.destination]?.continent ?? null;

if (!continentA || !continentB) {
  console.warn(
    "⚠️ CONTINENT NOT RESOLVED",
    d.origin,
    d.destination,
    continentA,
    continentB
  );
}
   
/* ============================================================
   📏 DISTANCE NORMALIZATION (CRITICAL)
   ============================================================ */
const distanceNM = Number(d.distanceNM || d.distance || 0);
   
/* ============================================================
   🧑‍🤝‍🧑 PASSENGER ENGINE — CANONICAL BRIDGE (FINAL)
   ============================================================ */

let paxResult = null;

try {
  paxResult = ACS_PAX.calculate({
    route: {
      distanceNM,
      continentA,
      continentB
    },
    time: {
      year,
      hour: window.ACS_TIME?.hour ?? 12
    },
    aircraft: {
      seats,
      comfortIndex
    },
    airline: {
      marketingLevel: 1.0,
      reputation: 1.0
    },
    market: {
      frequencyFactor: 1.0,
      competitors: 1
    }
  });
} catch (e) {
  console.error("❌ PAX CALC FAILED", e);
}

/* ============================================================
   🧮 PAX NORMALIZATION — SINGLE SOURCE OF TRUTH
   ============================================================ */

const pax =
  paxResult && typeof paxResult.pax === "number"
    ? paxResult.pax
    : 0;

const loadFactor =
  paxResult && typeof paxResult.loadFactor === "number"
    ? paxResult.loadFactor
    : (seats > 0 ? pax / seats : 0);

/* DEBUG — DO NOT REMOVE */
console.log("🧑‍🤝‍🧑 PAX BRIDGE", {
  paxResult,
  pax,
  loadFactor
});


  /* ============================================================
     💰 REVENUE (SIMPLE, STABLE)
     ============================================================ */
  let ticket = 0;
  if (d.distanceNM < 500) ticket = 80;
  else if (d.distanceNM < 1500) ticket = 150;
  else ticket = 300;

  const revenue = pax * ticket;

  /* ============================================================
     📐 METRICS (NO COSTS YET)
     ============================================================ */
  const revPerNM   = revenue / d.distanceNM;
  const paxPerNM   = pax / d.distanceNM;
  const costTotal  = 0;
  const costPerNM  = 0;
  const costPerPax = 0;
  const profit     = revenue;

  /* ============================================================
     📦 FINAL ECONOMICS OBJECT (THE MUÑECO)
     ============================================================ */
  return {
    flightId: d.flightId,
    aircraftId: d.aircraftId,
    origin: d.origin,
    destination: d.destination,
    distanceNM: d.distanceNM,

    pax,
    loadFactor,

    revenue,
    costTotal,
    profit,

    paxPerNM,
    revPerNM,
    costPerNM,
    costPerPax,

    year,
    arrAbsMin: d.arrAbsMin || null,
    ts: Date.now()
  };
}

/* ============================================================
   ✈️ LISTENER — SKYTRACK ARRIVAL
   ============================================================ */
window.addEventListener("ACS_FLIGHT_ARRIVAL", e => {

  const d = e.detail;
  if (!d) return;

  const dedupKey = `${d.flightId}_${d.arrAbsMin || "NA"}`;
  if (ACS_ECO_DEDUP.has(dedupKey)) return;
  ACS_ECO_DEDUP.add(dedupKey);

  const economics = ACS_buildFlightEconomics(d);
  if (!economics) return;

  /* ============================================================
     📡 EMIT ECONOMICS EVENT (FOR FINANCE / UI)
     ============================================================ */
  window.dispatchEvent(
    new CustomEvent("ACS_FLIGHT_ECONOMICS", {
      detail: economics
    })
  );

  /* ============================================================
     🔥 PER-FLIGHT CONSOLE LOG (VISIBLE, CLEAR)
     ============================================================ */
  console.log(
    "%c💰 FLIGHT ECONOMICS",
    "color:#00ff88;font-weight:bold;",
    economics
  );
});

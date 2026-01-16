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
   🟧 E1 — SEAT RESOLVER (ROBUST)
   ------------------------------------------------------------
   Fix: PAX = 0 cuando el avión no usa el campo "seats"
   ============================================================ */
   
const seats =
  Number(
    ac.seats ??
    ac.seatCount ??
    ac.seatsTotal ??
    ac.capacity ??
    ac.paxCapacity ??
    ac.pax ??
    0
  ) || 0;

const comfortIndex =
  Number(
    ac.comfortIndex ??
    ac.comfort ??
    ac.cabinComfort ??
    1
  ) || 1;

/* ============================================================
   🌍 CONTINENT NORMALIZATION (WORLD → ECONOMICS)
   ============================================================ */
function ACS_normalizeContinent(c) {
  if (!c) return null;

  const map = {
    Europe: "EU",
    Asia: "AS",
    Africa: "AF",
    "North America": "NA",
    "South America": "SA",
    Oceania: "OC",
    Australia: "OC",
    Antarctica: "AN",

    // fallback si ya vienen normalizados
    EU: "EU",
    AS: "AS",
    AF: "AF",
    NA: "NA",
    SA: "SA",
    OC: "OC"
  };

  return map[c] || null;
}

/* ============================================================
   🌍 CONTINENT RESOLUTION
   ============================================================ */
const airportIndex = window.ACS_AIRPORT_INDEX || {};

const continentA = ACS_normalizeContinent(
  airportIndex[d.origin]?.continent
);

const continentB = ACS_normalizeContinent(
  airportIndex[d.destination]?.continent
);

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
   📏 DISTANCE (CANONICAL)
   ============================================================ */
const distanceNM = Number(d.distanceNM);
if (!distanceNM || distanceNM <= 0) return null;

/* ============================================================
   🧑‍🤝‍🧑 PASSENGER ENGINE (SINGLE CALL)
   ============================================================ */
let paxResult = null;
try {
  paxResult = ACS_PAX.calculate({
    route: { distanceNM, continentA, continentB },
    time: {
      year,
      hour: window.ACS_TIME?.hour ?? 12
    },
    aircraft: { seats, comfortIndex },
    airline: { marketingLevel: 1.0, reputation: 1.0 },
    market: { frequencyFactor: 1.0, competitors: 1 }
  });
} catch (e) {
  console.error("❌ PAX CALC FAILED", e);
}

const pax = Number(paxResult?.pax ?? 0);
const loadFactor =
  Number(paxResult?.loadFactor ?? (seats > 0 ? pax / seats : 0));

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
    costTotal: 0,
    profit: revenue,

    paxPerNM,
    revPerNM,
    costPerNM: 0,
    costPerPax: 0,

    year,
    arrAbsMin: d.arrAbsMin ?? null,
    ts: Date.now()
  };
}

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

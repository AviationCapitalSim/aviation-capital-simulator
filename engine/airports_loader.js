/* =============================================================
   === AVIATION CAPITAL SIMULATOR — WORLD AIRPORTS LOADER ======
   Version: Loader v1.0 (Auto Import)
   ============================================================= */

// Crear el contenedor global (si no existe)
if (typeof WorldAirportsACS === "undefined") {
  var WorldAirportsACS = {
    NorthAmerica: [],
    SouthAmerica: [],
    Europe: [],
    MiddleEast: [],
    Africa: [],
    Asia: [],
    Oceania: []
  };
}

/* =============================================================
   === AUTO IMPORT DE LOS CONTINENTES
   ============================================================= */
const airportScripts = [
  "engine/airports/world_airports_na.js",
  "engine/airports/world_airports_sa.js",
  "engine/airports/world_airports_eu.js",
  "engine/airports/world_airports_me.js",
  "engine/airports/world_airports_af.js",
  "engine/airports/world_airports_as.js",
  "engine/airports/world_airports_oc.js"
];

function loadAirportScripts(callback) {
  let loaded = 0;

  airportScripts.forEach(src => {
    const s = document.createElement("script");
    s.src = src + "?v=" + Date.now(); // Rompe caché
    s.onload = () => {
      loaded++;
      if (loaded === airportScripts.length) callback();
    };
    s.onerror = () => console.error(`[ACS ERROR] Failed loading: ${src}`);
    document.head.appendChild(s);
  });
}

/* =============================================================
   === INDEX BUILDER
   ============================================================= */
const AirportIndex = {};

function buildAirportIndex() {
  for (const cont in WorldAirportsACS) {
    WorldAirportsACS[cont].forEach(a => {
      AirportIndex[a.icao] = a;
    });
  }

  console.log(
    `[ACS] WorldAirportsACS loaded: ${Object.keys(AirportIndex).length} airports indexed.`
  );
}

/* =============================================================
   === FIND AIRPORT BY ICAO
   ============================================================= */
function findAirport(icao) {
  return AirportIndex[icao.toUpperCase()] || null;
}

/* =============================================================
   === SEARCH AIRPORTS
   ============================================================= */
function searchAirports(keyword) {
  const key = keyword.toLowerCase();
  return Object.values(AirportIndex).filter(a =>
    (a.city || "").toLowerCase().includes(key) ||
    (a.country || "").toLowerCase().includes(key) ||
    (a.iata || "").toLowerCase().includes(key) ||
    (a.icao || "").toLowerCase().includes(key)
  );
}

/* =============================================================
   === CALCULATE DISTANCE
   ============================================================= */
function calcDistanceNM(icao1, icao2) {
  const a1 = findAirport(icao1);
  const a2 = findAirport(icao2);
  if (!a1 || !a2) return 0;

  const R = 3440;
  const toRad = deg => (deg * Math.PI) / 180;

  const dLat = toRad(a2.latitude - a1.latitude);
  const dLon = toRad(a2.longitude - a1.longitude);

  const lat1 = toRad(a1.latitude);
  const lat2 = toRad(a2.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* =============================================================
   === ROUTE ECONOMICS
   ============================================================= */
function estimateRouteEconomics(icao1, icao2, demandClass) {
  const from = findAirport(icao1);
  const to = findAirport(icao2);
  if (!from || !to) return null;

  const dist = calcDistanceNM(icao1, icao2);
  const baseDemand = to.demand[demandClass] || 0;

  const fees =
    to.landing_fee_usd +
    to.slot_cost_usd +
    dist * to.fuel_usd_gal * 0.2;

  const ticketRevenue =
    baseDemand *
    (demandClass === "Y"
      ? 200
      : demandClass === "C"
      ? 550
      : 1200);

  return {
    distanceNM: dist,
    baseDemand,
    totalFeesUSD: fees.toFixed(0),
    estRevenueUSD: ticketRevenue.toFixed(0),
    estProfitUSD: (ticketRevenue - fees).toFixed(0)
  };
}

/* =============================================================
   === CARGA FINAL DEL SISTEMA
   ============================================================= */
loadAirportScripts(buildAirportIndex);
/* =============================================================
   === SIMPLE HISTORICAL ENGINE — NO DATA EDITING REQUIRED ======
   ============================================================= */

function ACS_filterAirportsByYear(simYear) {
  return Object.values(AirportIndex).filter(a => {

    // 1) Aeropuertos militares o sin runway → aparecen tarde
    if (a.runway_m < 900 && simYear < 1970) return false;

    // 2) Aeropuertos muy pequeños (demanda baja) → aparecen después de 1960
    if ((a.demand?.Y || 0) < 300 && simYear < 1960) return false;

    // 3) Regla general: antes de 1950 solo grandes hubs
    if (simYear < 1950 && a.category !== "Major International") return false;

    return true;
  });
}
function ACS_getHistoricalDemand(a, simYear) {

  const yearFactor = Math.max(0.10, (simYear - 1940) / 86); 
  // 1940 → 0.10 (baja demanda)
  // 2026 → 1.0 (demanda actual)

  return {
    Y: Math.round((a.demand?.Y || 0) * yearFactor),
    C: Math.round((a.demand?.C || 0) * yearFactor),
    F: Math.round((a.demand?.F || 0) * yearFactor)
  };
}

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

/* =============================================================
   === FIX: LOADER SECUENCIAL (NO PARALELO) ====================
   ============================================================= */
function loadAirportScripts(callback) {
  let index = 0;

  function loadNext() {
    if (index >= airportScripts.length) {
      callback();
      return;
    }

    const src = airportScripts[index];
    const s = document.createElement("script");
    s.src = src + "?v=" + Date.now(); // Rompe caché

    s.onload = () => {
      index++;
      loadNext();
    };

    s.onerror = () => console.error(`[ACS ERROR] Failed loading: ${src}`);

    document.head.appendChild(s);
  }

  loadNext();
}

/* =============================================================
   === INDEX BUILDER
   ============================================================= */
const AirportIndex = {};

function buildAirportIndex() {

  // ============================================
  //  AÑADIR NOMBRE DEL PAÍS (SIN ROMPER NADA)
  // ============================================
  for (const cont in WorldAirportsACS) {
    WorldAirportsACS[cont].forEach(a => {
      a.country_name = a.region;   // 🔥 Nombre del país ya insertado
    });
  }

  // ============================================
  //  INDEX BUILDER (NO TOCAR)
  // ============================================
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

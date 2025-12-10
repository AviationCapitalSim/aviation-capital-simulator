/* =============================================================
   === AVIATION CAPITAL SIMULATOR — WORLD AIRPORTS LOADER ======
   Version: Loader v1.2 (Global Optimized)
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

/* ============================================================
   🟦 A2 — AUTO-INIT SLOTS WHEN AIRPORTS LOAD | v1.0
   ------------------------------------------------------------
   - Se ejecuta justo después de que WorldAirportsACS existe
   - Inicializa slots por categoría de aeropuerto
   - Evita volver a inicializar si ya existen
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    if (typeof WorldAirportsACS === "undefined") {
        console.warn("⚠ WorldAirportsACS not ready — skipping Slot Init");
        return;
    }

    // Leer estructura actual de slots
    const EXISTING = JSON.parse(localStorage.getItem("ACS_SLOTS") || "{}");

    // Recorrer todos los continentes cargados
    for (const cont in WorldAirportsACS) {
        const list = WorldAirportsACS[cont];
        if (!Array.isArray(list)) continue;

        list.forEach(ap => {

            const ICAO = ap.icao;
            const CAT  = ap.category || ap.Category || "";

            // Evitar re-inicializar aeropuertos ya creados
            if (EXISTING[ICAO]) {
                return;
            }

            // Inicializar slots para este aeropuerto
            try {
                ACS_initAirportSlots(ICAO, CAT);
                console.log(`🛫 Slots Init → ${ICAO} (${CAT})`);
            } catch (e) {
                console.warn("Slot Init Error:", ICAO, e);
            }
        });
    }

    console.log("🟢 A2 — Airport Slot Initialization complete.");
});


/* =============================================================
   === AUTO IMPORT DE LOS CONTINENTES (SECUENCIAL) =============
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
  let index = 0;

  function loadNext() {
    if (index >= airportScripts.length) {
      callback();
      return;
    }

    const src = airportScripts[index];
    const s = document.createElement("script");
    s.src = `${src}?v=${Date.now()}`; // rompe caché por versión

    s.onload = () => {
      index++;
      loadNext();
    };

    s.onerror = () =>
      console.error(`[ACS ERROR] Failed loading: ${src}`);

    document.head.appendChild(s);
  }

  loadNext();
}

/* =============================================================
   === ⭐ SANITIZADOR GLOBAL v1.2 — ULTRA SEGURO =================
   ============================================================= */
function sanitizeAirportCoords(a) {
  if (!a) return;

  // Convertir strings a número (si vienen del CSV)
  a.latitude  = parseFloat(a.latitude);
  a.longitude = parseFloat(a.longitude);

  // ==============================
  // 1) Corregir NaN o null
  // ==============================
  if (isNaN(a.latitude) || isNaN(a.longitude)) {
    console.warn(`[ACS WARNING] Invalid coords at ${a.icao}`);
    a.latitude = 0;
    a.longitude = 0;
  }

  // ==============================
  // 2) Corregir valores imposibles
  // ==============================
  if (a.latitude < -90 || a.latitude > 90) {
    console.warn(`[ACS FIX] Latitude out of range at ${a.icao}: ${a.latitude}`);
    // Suponemos swap invertido (error común)
    let t = a.latitude;
    a.latitude = a.longitude;
    a.longitude = t;

    // volver a asegurarnos
    a.latitude  = Math.max(-90, Math.min(90, a.latitude));
  }

  if (a.longitude < -180 || a.longitude > 180) {
    console.warn(`[ACS FIX] Longitude out of range at ${a.icao}: ${a.longitude}`);
    let t = a.latitude;
    a.latitude = a.longitude;
    a.longitude = t;

    a.longitude = ((a.longitude + 180) % 360) - 180;
  }

  // ==============================
  // ❗ 3) NO TOCAR LATITUDES NORTE
  // (Europa, Siberia, Alaska, Islandia, etc.)
  // ==============================
  // Dejamos los datos tal cual llegan del archivo .js o CSV
  // porque son legítimos y reales.
}

/* =============================================================
   === INDEX BUILDER — GLOBAL ==================================
   ============================================================= */
const AirportIndex = {};

function buildAirportIndex() {

  // 1) SANITIZAR TODOS LOS AEROPUERTOS (7 continentes)
  for (const cont in WorldAirportsACS) {
    WorldAirportsACS[cont].forEach(a => sanitizeAirportCoords(a));
  }

  // 2) Añadir country_name solo como alias (no afecta nada)
  for (const cont in WorldAirportsACS) {
    WorldAirportsACS[cont].forEach(a => {
      a.country_name = a.region;
    });
  }

  // 3) INDEX GLOBAL (todos los continentes)
  for (const cont in WorldAirportsACS) {
    WorldAirportsACS[cont].forEach(a => {
      AirportIndex[a.icao] = a;
    });
  }

  console.log(
    `[ACS] WorldAirportsACS loaded: ${Object.keys(AirportIndex).length} airports indexed (Global v1.2).`
  );
}

/* =============================================================
   === FIND AIRPORT
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
   === CALCULATE DISTANCE (HAversine global)
   ============================================================= */
function calcDistanceNM(icao1, icao2) {
  const a1 = findAirport(icao1);
  const a2 = findAirport(icao2);
  if (!a1 || !a2) return 0;

  const R = 3440.065;
  const toRad = deg => (deg * Math.PI) / 180;

  const dLat = toRad(a2.latitude - a1.latitude);
  const dLon = toRad(a2.longitude - a1.longitude);

  const lat1 = toRad(a1.latitude);
  const lat2 = toRad(a2.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) ** 2;

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
   === CARGA FINAL
   ============================================================= */
loadAirportScripts(buildAirportIndex);

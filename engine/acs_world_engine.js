/* =============================================================
   === ACS WORLD ENGINE — HISTORICAL CORE v1.0 =================
   -------------------------------------------------------------
   ▪ FASE 1: Unificación y índice global
      - Combina TODOS los aeropuertos de WorldAirportsACS
      - Crea índices por ICAO / IATA / país / continente
   ▪ FASE 2: Capa histórica (apertura/cierre + demanda)
      - Lee fechas reales desde ACS_AirportDates (si existe)
      - Aplica heurísticas por continente / categoría
      - Filtra por año de simulación (ACS_TIME)
   ▪ FASE 3: API para TODOS los módulos ACS
      - getSimYear()
      - getAllAirports({ year })
      - findAirport(icao)
      - searchAirports(keyword, { year })
      - getAirportsByContinent(continent, { year })
      - getAirportsByCountry(countryName, { year })
      - getAirportsByContinentCountry(continent, countryName, { year })
      - getNearestAirports(icao, maxDistanceNM, { year })
      - getHistoricalDemand(airport, year)
   -------------------------------------------------------------
   ▪ Dependencias suaves (si existen):
      - time_engine.js   → ACS_TIME.currentTime
      - airports_loader.js → WorldAirportsACS + calcDistanceNM
      - acs_country_history.js → ACS_CountryHistory (opcional, para futuro)
      - acs_airport_dates.js → ACS_AirportDates (opcional, fechas reales)
   ============================================================= */

(function (global) {
  "use strict";

  // Namespace global del motor
  const ACS_World = {};

  /* ===========================================================
     FASE 1 — COLECCIÓN GLOBAL E ÍNDICES
     =========================================================== */

  /**
   * Devuelve el año de simulación desde ACS_TIME.
   * Si falla, devuelve 1940 por seguridad.
   */
  ACS_World.getSimYear = function () {
    try {
      if (global.ACS_TIME && global.ACS_TIME.currentTime instanceof Date) {
        return global.ACS_TIME.currentTime.getUTCFullYear();
      }
    } catch (e) {
      console.warn("⚠️ [ACS_World] getSimYear fallback:", e);
    }
    return 1940;
  };

  /**
   * Combina todos los aeropuertos de WorldAirportsACS.{continent}
   * en un solo array plano, sin duplicados por ICAO.
   */
  function collectAllAirports() {
    const all = [];
    const seen = new Set();

    if (!global.WorldAirportsACS || typeof global.WorldAirportsACS !== "object") {
      console.warn("⚠️ [ACS_World] WorldAirportsACS no está disponible todavía.");
      return all;
    }

    Object.keys(global.WorldAirportsACS).forEach(cont => {
      const list = global.WorldAirportsACS[cont];
      if (!Array.isArray(list)) return;

      list.forEach(a => {
        if (!a || !a.icao) return;
        const key = String(a.icao).toUpperCase();
        if (seen.has(key)) return;
        seen.add(key);
        all.push(a);
      });
    });

    console.log("🌍 [ACS_World] Aeropuertos combinados desde WorldAirportsACS:", all.length);
    return all;
  }

  const ALL_AIRPORTS = collectAllAirports();

  // Índices
  const AIRPORT_INDEX_ICAO = {};
  const AIRPORT_INDEX_IATA = {};
  const AIRPORTS_BY_CONTINENT = {};
  const AIRPORTS_BY_COUNTRY = {};

  ALL_AIRPORTS.forEach(a => {
    const icao = String(a.icao || "").toUpperCase();
    const iata = String(a.iata || "").toUpperCase();
    const cont = a.continent || "Unknown";
    const countryName = a.region || a.country || "Unknown";

    if (icao) AIRPORT_INDEX_ICAO[icao] = a;
    if (iata) AIRPORT_INDEX_IATA[iata] = a;

    if (!AIRPORTS_BY_CONTINENT[cont]) AIRPORTS_BY_CONTINENT[cont] = [];
    AIRPORTS_BY_CONTINENT[cont].push(a);

    if (!AIRPORTS_BY_COUNTRY[countryName]) AIRPORTS_BY_COUNTRY[countryName] = [];
    AIRPORTS_BY_COUNTRY[countryName].push(a);
  });

  /* ===================== API Fase 1 ========================== */

  ACS_World.getAllAirports = function (opts = {}) {
    const year = typeof opts.year === "number" ? opts.year : null;
    if (!year) {
      return ALL_AIRPORTS.slice();
    }
    // Si se pide año → aplicar capa histórica
    return ALL_AIRPORTS.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  ACS_World.findAirport = function (code) {
    if (!code) return null;
    const up = String(code).toUpperCase();
    return AIRPORT_INDEX_ICAO[up] || AIRPORT_INDEX_IATA[up] || null;
  };

  ACS_World.getAirportsByContinent = function (continent, opts = {}) {
    if (!continent) return [];
    const list = (AIRPORTS_BY_CONTINENT[continent] || []).slice();
    const year = typeof opts.year === "number" ? opts.year : null;
    if (!year) return list;
    return list.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  ACS_World.getAirportsByCountry = function (countryName, opts = {}) {
    if (!countryName) return [];
    const list = (AIRPORTS_BY_COUNTRY[countryName] || []).slice();
    const year = typeof opts.year === "number" ? opts.year : null;
    if (!year) return list;
    return list.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  /**
   * Continent: "Europe", "Asia", etc.
   * countryLabel: normalmente a.region (nombre moderno).
   * El HTML puede encargarse de mapear "Soviet Union" → varios países,
   * o en el futuro lo haremos aquí.
   */
  ACS_World.getAirportsByContinentCountry = function (continent, countryLabel, opts = {}) {
    if (!continent || !countryLabel) return [];
    const year = typeof opts.year === "number" ? opts.year : null;

    // base: por continente
    const baseList = AIRPORTS_BY_CONTINENT[continent] || [];

    const filtered = baseList.filter(a => {
      const region = a.region || a.country || "";
      return region === countryLabel;
    });

    if (!year) return filtered;
    return filtered.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  /**
   * Búsqueda general por keyword.
   * Opcionalmente filtra por año de simulación.
   */
  ACS_World.searchAirports = function (keyword, opts = {}) {
    if (!keyword) return [];
    const k = String(keyword).toLowerCase();
    const year = typeof opts.year === "number" ? opts.year : null;

    let result = ALL_AIRPORTS.filter(a => {
      const icao = (a.icao || "").toLowerCase();
      const iata = (a.iata || "").toLowerCase();
      const city = (a.city || "").toLowerCase();
      const name = (a.name || "").toLowerCase();
      const region = (a.region || "").toLowerCase();
      return (
        icao.includes(k) ||
        iata.includes(k) ||
        city.includes(k) ||
        name.includes(k) ||
        region.includes(k)
      );
    });

    if (year) {
      result = result.filter(a => ACS_World.airportExistsInYear(a, year));
    }

    return result;
  };

  /* ===========================================================
     FASE 2 — CAPA HISTÓRICA (APERTURA + CIERRE + DEMANDA)
     =========================================================== */

  // Tabla externa opcional con fechas reales:
  // window.ACS_AirportDates = {
  //   "LHR": { open: 1946, close: null },
  //   "CDG": { open: 1974, close: null },
  //   "DXB": { open: 1960, close: null },
  //   ...
  // };
  const AirportDates = global.ACS_AirportDates || {};

  function getAirportOpenYear(airport) {
    if (!airport || !airport.icao) return 1900;
    const code = String(airport.icao).toUpperCase();
    const meta = AirportDates[code];

    if (meta && typeof meta.open === "number") {
      return meta.open;
    }

    // ================= HEURÍSTICAS (mientras completamos fechas) ==========
    const city = (airport.city || "").toLowerCase();
    const name = (airport.name || "").toLowerCase();
    const region = (airport.region || "").toLowerCase();
    const cont = (airport.continent || "").toLowerCase();
    const cat = (airport.category || "").toLowerCase();

    // Grandes hubs del Golfo (modernos)
    if (
      city.includes("dubai") ||
      city.includes("abu dhabi") ||
      city.includes("doha") ||
      name.includes("hammad") ||
      name.includes("hamad")
    ) {
      return 1960;
    }

    // Mega hubs modernos europeos / asiáticos típicos de jet age
    if (cat.includes("primary hub") || cat.includes("major hub")) {
      if (cont === "europe" || cont === "asia" || cont === "middleeast") {
        return 1945;
      }
    }

    // Aeropuertos regionales en Europa y Norteamérica
    if (cont === "europe" || cont === "northamerica") {
      return 1930;
    }

    // Otros continentes: asumimos crecimiento post-colonial
    if (cont === "africa" || cont === "southamerica" || cont === "oceania") {
      return 1945;
    }

    // Valor de seguridad
    return 1940;
  }

  function getAirportCloseYear(airport) {
    if (!airport || !airport.icao) return null;
    const code = String(airport.icao).toUpperCase();
    const meta = AirportDates[code];
    if (meta && typeof meta.close === "number") {
      return meta.close;
    }
    return null; // la mayoría siguen activos
  }

  /**
   * Devuelve true si el aeropuerto existía y estaba operativo
   * en el año simYear.
   */
  ACS_World.airportExistsInYear = function (airport, simYear) {
    if (!airport) return false;
    const year = typeof simYear === "number" ? simYear : ACS_World.getSimYear();

    const openY = getAirportOpenYear(airport);
    const closeY = getAirportCloseYear(airport) || 9999;

    return year >= openY && year <= closeY;
  };

  /**
   * Devuelve la demanda histórica ajustada para un año concreto.
   * Si existe un motor externo ACS_getHistoricalDemand, lo usa.
   * Si no, aplica un factor lineal simple 1940 → 10%, 2026 → 100%.
   */
  ACS_World.getHistoricalDemand = function (airport, simYear) {
    const year = typeof simYear === "number" ? simYear : ACS_World.getSimYear();

    // Si tienes ya ACS_getHistoricalDemand(a, year) en otro JS, úsalo:
    if (typeof global.ACS_getHistoricalDemand === "function") {
      return global.ACS_getHistoricalDemand(airport, year);
    }

    const base = airport.demand || { Y: 0, C: 0, F: 0 };
    // Factor lineal:
    // 1940 → 0.10
    // 2026 → 1.00 aprox
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const factorRaw = (year - 1940) / (2026 - 1940);
    const factor = clamp(factorRaw, 0.10, 1.0);

    return {
      Y: Math.round((base.Y || 0) * factor),
      C: Math.round((base.C || 0) * factor),
      F: Math.round((base.F || 0) * factor)
    };
  };

  /* ===========================================================
     FASE 3 — UTILIDADES AVANZADAS PARA MÓDULOS ACS
     =========================================================== */

  /**
   * Devuelve hasta N aeropuertos más cercanos al ICAO de referencia.
   * Usa calcDistanceNM de airports_loader.js si existe;
   * si no, implementa un Haversine interno.
   */
  ACS_World.getNearestAirports = function (icaoRef, maxDistanceNM = 500, opts = {}) {
    const ref = ACS_World.findAirport(icaoRef);
    if (!ref) return [];

    const year = typeof opts.year === "number" ? opts.year : null;

    const refLat = ref.latitude;
    const refLon = ref.longitude;
    if (typeof refLat !== "number" || typeof refLon !== "number") return [];

    const useExternalCalc = typeof global.calcDistanceNM === "function";

    function localDistanceNM(a1, a2) {
      const R = 3440; // NM
      const toRad = deg => (deg * Math.PI) / 180;
      const lat1 = toRad(a1.latitude);
      const lon1 = toRad(a1.longitude);
      const lat2 = toRad(a2.latitude);
      const lon2 = toRad(a2.longitude);

      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;

      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

      return Math.round(R * c);
    }

    const list = [];
    ALL_AIRPORTS.forEach(a => {
      if (!a || a === ref) return;
      if (typeof a.latitude !== "number" || typeof a.longitude !== "number") return;

      if (year && !ACS_World.airportExistsInYear(a, year)) return;

      const dist = useExternalCalc
        ? global.calcDistanceNM(ref.icao, a.icao)
        : localDistanceNM(ref, a);

      if (dist <= maxDistanceNM) {
        list.push({ airport: a, distanceNM: dist });
      }
    });

    list.sort((a, b) => a.distanceNM - b.distanceNM);
    return list;
  };

  /**
   * Atajo: obtiene un resumen de base para Dashboard.
   * Devuelve null si falta información.
   */
  ACS_World.getBaseSummary = function (activeUser, simYear) {
    if (!activeUser || !activeUser.airline || !activeUser.airline.base) return null;

    const base = activeUser.airline.base;
    const airport = ACS_World.findAirport(base.icao || base.iata);
    const year = typeof simYear === "number" ? simYear : ACS_World.getSimYear();

    if (!airport || !ACS_World.airportExistsInYear(airport, year)) {
      return {
        exists: false,
        label: "Unassigned Base",
        icao: base.icao || null,
        iata: base.iata || null
      };
    }

    const city = airport.city || "";
    const name = airport.name || airport.airportName || "";
    const icao = airport.icao || "";
    const iata = airport.iata || "";
    const country = airport.region || airport.country || "";

    let label = city && name ? `${city} — ${name}` : (city || name || "Base");
    if (icao) label += ` (${icao})`;

    return {
      exists: true,
      label,
      city,
      name,
      icao,
      iata,
      country,
      continent: airport.continent || "",
      year
    };
  };

  /* ===========================================================
     LOG FINAL Y EXPOSICIÓN EN WINDOW
     =========================================================== */

  console.log("✅ [ACS_WorldEngine] v1.0 inicializado");
  console.log("   • Aeropuertos totales:", ALL_AIRPORTS.length);
  console.log("   • Índice ICAO:", Object.keys(AIRPORT_INDEX_ICAO).length);

  // Exponer en window
  global.ACS_World = ACS_World;

})(window);
/* ============================================================
   === ISO2 NORMALIZER — Convierte "GB" → "United Kingdom" ====
   ============================================================ */

const ACS_ISO2_TO_COUNTRY = {
  AF: "Afghanistan",
  AL: "Albania",
  DZ: "Algeria",
  AD: "Andorra",
  AO: "Angola",
  AR: "Argentina",
  AM: "Armenia",
  AU: "Australia",
  AT: "Austria",
  AZ: "Azerbaijan",
  BH: "Bahrain",
  BD: "Bangladesh",
  BY: "Belarus",
  BE: "Belgium",
  BZ: "Belize",
  BJ: "Benin",
  BT: "Bhutan",
  BO: "Bolivia",
  BA: "Bosnia and Herzegovina",
  BW: "Botswana",
  BR: "Brazil",
  BG: "Bulgaria",
  BF: "Burkina Faso",
  BI: "Burundi",
  KH: "Cambodia",
  CM: "Cameroon",
  CA: "Canada",
  TD: "Chad",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DK: "Denmark",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  EE: "Estonia",
  FI: "Finland",
  FR: "France",
  GE: "Georgia",
  DE: "Germany",
  GH: "Ghana",
  GR: "Greece",
  GL: "Greenland",
  HK: "Hong Kong",
  HU: "Hungary",
  IS: "Iceland",
  IN: "India",
  ID: "Indonesia",
  IR: "Iran",
  IQ: "Iraq",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JP: "Japan",
  JO: "Jordan",
  KZ: "Kazakhstan",
  KE: "Kenya",
  KP: "North Korea",
  KR: "South Korea",
  KW: "Kuwait",
  KG: "Kyrgyzstan",
  LV: "Latvia",
  LB: "Lebanon",
  LT: "Lithuania",
  LU: "Luxembourg",
  MY: "Malaysia",
  MV: "Maldives",
  MX: "Mexico",
  MD: "Moldova",
  MN: "Mongolia",
  ME: "Montenegro",
  MA: "Morocco",
  NP: "Nepal",
  NL: "Netherlands",
  NZ: "New Zealand",
  NG: "Nigeria",
  NO: "Norway",
  OM: "Oman",
  PK: "Pakistan",
  PA: "Panama",
  PY: "Paraguay",
  PE: "Peru",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RO: "Romania",
  RU: "Russia",
  SA: "Saudi Arabia",
  RS: "Serbia",
  SG: "Singapore",
  SK: "Slovakia",
  SI: "Slovenia",
  ZA: "South Africa",
  ES: "Spain",
  LK: "Sri Lanka",
  SE: "Sweden",
  CH: "Switzerland",
  TW: "Taiwan",
  TJ: "Tajikistan",
  TH: "Thailand",
  TT: "Trinidad and Tobago",
  TN: "Tunisia",
  TR: "Turkey",
  TM: "Turkmenistan",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VN: "Vietnam"
};

/* ============================================================
   NORMALIZA AEROPUERTOS: region, country, continent
============================================================ */
function ACS_normalizeAirportCountry(a) {
  if (!a.region) return;

  // Si es código ISO2 → convertir
  if (ACS_ISO2_TO_COUNTRY[a.region]) {
    a.region = ACS_ISO2_TO_COUNTRY[a.region];
  }

  if (ACS_ISO2_TO_COUNTRY[a.country]) {
    a.country = ACS_ISO2_TO_COUNTRY[a.country];
  }

  return a;
}

/* ============================================================
   PROCESA TODA LA BASE DE DATOS
============================================================ */
function ACS_processAllAirports() {
  for (const cont in WorldAirportsACS) {
    WorldAirportsACS[cont] =
      WorldAirportsACS[cont].map(a => ACS_normalizeAirportCountry(a));
  }
}
window.ACS_processAllAirports = ACS_processAllAirports;

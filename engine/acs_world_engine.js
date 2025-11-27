/* =============================================================
   === ACS WORLD ENGINE — HISTORICAL CORE v1.1 =================
   -------------------------------------------------------------
   ▪ Motor mundial definitivo para ACS
   ▪ NO ejecuta nada antes del loader
   ▪ Indices y lógica se construyen SOLO cuando se llama
     a ACS_World.initialize()
   ▪ Compatible con >4000 aeropuertos, todos los continentes
   ▪ Preparado para fechas reales y expansión futura
   ============================================================= */

(function (global) {
  "use strict";

  // Namespace global del motor mundial
  const ACS_World = {
    ready: false,
    ALL_AIRPORTS: [],
    INDEX_ICAO: {},
    INDEX_IATA: {},
    BY_CONTINENT: {},
    BY_COUNTRY: {}
  };

  /* ===========================================================
     UTILIDAD: Obtener año de simulación
     =========================================================== */
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

  /* ===========================================================
     NORMALIZADOR ISO2 → Nombres reales
     =========================================================== */

  const ISO2 = {
    AF:"Afghanistan", AL:"Albania", DZ:"Algeria", AD:"Andorra", AO:"Angola",
    AR:"Argentina", AM:"Armenia", AU:"Australia", AT:"Austria",
    AZ:"Azerbaijan", BH:"Bahrain", BD:"Bangladesh", BY:"Belarus",
    BE:"Belgium", BZ:"Belize", BJ:"Benin", BT:"Bhutan", BO:"Bolivia",
    BA:"Bosnia and Herzegovina", BW:"Botswana", BR:"Brazil",
    BG:"Bulgaria", BF:"Burkina Faso", BI:"Burundi", KH:"Cambodia",
    CM:"Cameroon", CA:"Canada", TD:"Chad", CL:"Chile", CN:"China",
    CO:"Colombia", CR:"Costa Rica", HR:"Croatia", CY:"Cyprus",
    CZ:"Czech Republic", DK:"Denmark", DO:"Dominican Republic",
    EC:"Ecuador", EG:"Egypt", EE:"Estonia", FI:"Finland", FR:"France",
    GE:"Georgia", DE:"Germany", GH:"Ghana", GR:"Greece",
    GL:"Greenland", HK:"Hong Kong", HU:"Hungary", IS:"Iceland",
    IN:"India", ID:"Indonesia", IR:"Iran", IQ:"Iraq", IE:"Ireland",
    IL:"Israel", IT:"Italy", JP:"Japan", JO:"Jordan", KZ:"Kazakhstan",
    KE:"Kenya", KP:"North Korea", KR:"South Korea", KW:"Kuwait",
    KG:"Kyrgyzstan", LV:"Latvia", LB:"Lebanon", LT:"Lithuania",
    LU:"Luxembourg", MY:"Malaysia", MV:"Maldives", MX:"Mexico",
    MD:"Moldova", MN:"Mongolia", ME:"Montenegro", MA:"Morocco",
    NP:"Nepal", NL:"Netherlands", NZ:"New Zealand", NG:"Nigeria",
    NO:"Norway", OM:"Oman", PK:"Pakistan", PA:"Panama",
    PY:"Paraguay", PE:"Peru", PH:"Philippines", PL:"Poland",
    PT:"Portugal", QA:"Qatar", RO:"Romania", RU:"Russia",
    SA:"Saudi Arabia", RS:"Serbia", SG:"Singapore", SK:"Slovakia",
    SI:"Slovenia", ZA:"South Africa", ES:"Spain", LK:"Sri Lanka",
    SE:"Sweden", CH:"Switzerland", TW:"Taiwan", TJ:"Tajikistan",
    TH:"Thailand", TT:"Trinidad and Tobago", TN:"Tunisia",
    TR:"Turkey", TM:"Turkmenistan", UA:"Ukraine",
    AE:"United Arab Emirates", GB:"United Kingdom",
    US:"United States", UY:"Uruguay", UZ:"Uzbekistan",
    VN:"Vietnam"
  };

  function normalizeCountry(a) {
    if (!a) return a;

    // region → nombre moderno
    if (ISO2[a.region]) a.region = ISO2[a.region];
    if (ISO2[a.country]) a.country = ISO2[a.country];

    // fallback
    if (!a.region) a.region = a.country || "Unknown";
    return a;
  }

  /* ===========================================================
     CARGA PRINCIPAL DEL MOTOR
     =========================================================== */

  ACS_World.initialize = function () {

    // Verificar que WorldAirportsACS existe
    if (!global.WorldAirportsACS || typeof global.WorldAirportsACS !== "object") {
      console.error("❌ [ACS_World] WorldAirportsACS todavía no está cargado.");
      return;
    }

    console.log("🌍 [ACS_World] Inicializando motor mundial...");

    // Reset
    ACS_World.ALL_AIRPORTS = [];
    ACS_World.INDEX_ICAO = {};
    ACS_World.INDEX_IATA = {};
    ACS_World.BY_CONTINENT = {};
    ACS_World.BY_COUNTRY = {};

    const seen = new Set();

    // Combinar aeropuertos de todos los continentes
    Object.keys(global.WorldAirportsACS).forEach(cont => {
      const arr = global.WorldAirportsACS[cont];
      if (!Array.isArray(arr)) return;

      arr.forEach(a => {
        if (!a || !a.icao) return;
        const icao = String(a.icao).toUpperCase();
        if (seen.has(icao)) return;

        seen.add(icao);

        normalizeCountry(a);

        ACS_World.ALL_AIRPORTS.push(a);

        // Índices ICAO / IATA
        const iata = (a.iata || "").toUpperCase();
        ACS_World.INDEX_ICAO[icao] = a;
        if (iata) ACS_World.INDEX_IATA[iata] = a;

        // Índice por continente
        if (!ACS_World.BY_CONTINENT[a.continent]) {
          ACS_World.BY_CONTINENT[a.continent] = [];
        }
        ACS_World.BY_CONTINENT[a.continent].push(a);

        // Índice por país
        const country = a.region || "Unknown";
        if (!ACS_World.BY_COUNTRY[country]) {
          ACS_World.BY_COUNTRY[country] = [];
        }
        ACS_World.BY_COUNTRY[country].push(a);
      });
    });

    console.log("   ✔ Total aeropuertos:", ACS_World.ALL_AIRPORTS.length);
    console.log("   ✔ Index ICAO:", Object.keys(ACS_World.INDEX_ICAO).length);

    ACS_World.ready = true;
  };

  /* ===========================================================
     API — FINDERS
     =========================================================== */

  ACS_World.findAirport = function (code) {
    if (!code || !ACS_World.ready) return null;
    const up = String(code).toUpperCase();
    return ACS_World.INDEX_ICAO[up] || ACS_World.INDEX_IATA[up] || null;
  };

  ACS_World.getAllAirports = function ({ year } = {}) {
    if (!ACS_World.ready) return [];
    if (!year) return ACS_World.ALL_AIRPORTS;
    return ACS_World.ALL_AIRPORTS.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  ACS_World.getAirportsByContinent = function (continent, { year } = {}) {
    if (!ACS_World.ready) return [];
    const list = ACS_World.BY_CONTINENT[continent] || [];
    if (!year) return list;
    return list.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  ACS_World.getAirportsByCountry = function (country, { year } = {}) {
    if (!ACS_World.ready) return [];
    const list = ACS_World.BY_COUNTRY[country] || [];
    if (!year) return list;
    return list.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  ACS_World.getAirportsByContinentCountry = function (continent, country, { year } = {}) {
    if (!ACS_World.ready) return [];
    const list = ACS_World.BY_CONTINENT[continent] || [];
    const filtered = list.filter(a => a.region === country);
    if (!year) return filtered;
    return filtered.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  /* ===========================================================
     HISTÓRICO (Aperturas + Demanda)
     =========================================================== */

  const AirportDates = global.ACS_AirportDates || {};

  function getOpenYear(a) {
    const meta = AirportDates[a.icao];
    if (meta && typeof meta.open === "number") return meta.open;

    // Heurística ligera (mientras completas la base real)
    const cont = (a.continent || "").toLowerCase();
    const cat  = (a.category || "").toLowerCase();

    if (cat.includes("primary")) return 1945;
    if (cont === "europe" || cont === "northamerica") return 1930;
    if (cont === "africa"  || cont === "southamerica" || cont === "oceania") return 1945;

    return 1940;
  }

  function getCloseYear(a) {
    const meta = AirportDates[a.icao];
    if (meta && typeof meta.close === "number") return meta.close;
    return 9999;
  }

  ACS_World.airportExistsInYear = function (a, year) {
    if (!a || !year) return false;
    const o = getOpenYear(a);
    const c = getCloseYear(a);
    return year >= o && year <= c;
  };

  /* ===========================================================
   HISTORICAL DEMAND ENGINE — REAL-WORLD CLASS EVOLUTION
   ------------------------------------------------------------
   A-1: Fechas reales
     • Business Class (C) aparece en 1955
     • First Class (F) aparece en 1976
   B-1: Clases inexistentes NO se muestran (null)
   C-2: Ordenamiento usará solo las clases existentes según era
   =========================================================== */
ACS_World.getHistoricalDemand = function (a, year) {
  const base = a.demand || { Y:0, C:0, F:0 };

  // === FACTOR DE CRECIMIENTO ANUAL (1940 → 10%, 2026 → 100%) ===
  const factor = Math.max(
    0.10,
    Math.min(1.0, (year - 1940) / (2026 - 1940))
  );

  // === Demandas escaladas por crecimiento ===
  let Y = Math.round(base.Y * factor);
  let C = Math.round(base.C * factor);
  let F = Math.round(base.F * factor);

  // ===========================================================
  //   FASE REALISTA DE CLASES
  // ===========================================================

  // 🎯 Antes de 1955 → NO existe Business ni First
  if (year < 1955) {
    C = null;   // ocultar
    F = null;   // ocultar
  }

  // 🎯 1955 a 1975 → Existe Business, pero NO First
  else if (year < 1976) {
    F = null;   // ocultar
  }

  // 🎯 1976 en adelante → Y / C / F existen completas (jet age)
  // (Y, C, F se mantienen tal cual)
  

  return { Y, C, F };
};

  /* ===========================================================
     DISTANCIA
     =========================================================== */

  ACS_World.getNearestAirports = function (icao, distNM = 500, { year } = {}) {
    const ref = ACS_World.findAirport(icao);
    if (!ref) return [];

    const list = [];
    const useExternal = typeof global.calcDistanceNM === "function";

    function localDist(a1, a2) {
      const R = 3440;
      const toRad = x => (x * Math.PI) / 180;
      const dLat = toRad(a2.latitude - a1.latitude);
      const dLon = toRad(a2.longitude - a1.longitude);

      const A =
        Math.sin(dLat/2)**2 +
        Math.cos(toRad(a1.latitude)) *
        Math.cos(toRad(a2.latitude)) *
        Math.sin(dLon/2)**2;

      return Math.round(R * 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1-A)));
    }

    ACS_World.ALL_AIRPORTS.forEach(a => {
      if (a === ref) return;
      if (year && !ACS_World.airportExistsInYear(a, year)) return;

      const d = useExternal
        ? global.calcDistanceNM(ref.icao, a.icao)
        : localDist(ref, a);

      if (d <= distNM) list.push({ airport:a, distanceNM:d });
    });

    list.sort((a,b) => a.distanceNM - b.distanceNM);
    return list;
  };

  /* ===========================================================
     EXPONER MOTOR
     =========================================================== */
  global.ACS_World = ACS_World;

})(window);

/* =============================================================
   LLAMADA DESDE choose_base.html:
   -------------------------------------------------------------
   Después de:
     loadAirportScripts(() => {
        buildAirportIndex();
        ACS_World.initialize();   <── AQUÍ
   });
   ============================================================= */

/* =============================================================
   === ACS WORLD ENGINE — HISTORICAL CORE v2.1 =================
   -------------------------------------------------------------
   ▪ Motor mundial unificado para ACS (1940–2026)
   ▪ Aeropuertos principales SIEMPRE visibles
   ▪ Secundarios según fechas históricas + AUTO-OPEN-YEAR
   ▪ Demanda creciente por década
   ▪ Índices ICAO / IATA / países / continentes
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
    } catch (e) {}
    return 1940;
  };

  /* ===========================================================
     INITIALIZE — Construir índices globales
     =========================================================== */
  ACS_World.initialize = function () {
    if (!global.WorldAirportsACS) {
      console.error("❌ WorldAirportsACS no está cargado");
      return;
    }

    console.log("🌐 Inicializando ACS_WorldEngine...");

    const continents = Object.keys(global.WorldAirportsACS);
    const ALL = [];

    continents.forEach(cont => {
      const list = global.WorldAirportsACS[cont] || [];
      if (!Array.isArray(list)) return;

      // Guardar lista por continente
      ACS_World.BY_CONTINENT[cont] = list;

      // Agregar al total
      ALL.push(...list);

      // Indexar por país
      list.forEach(a => {
        const country =
          (a.region?.trim()) ||
          (a.country?.trim()) ||
          (a.country_name?.trim()) ||
          "Unknown";

        if (!ACS_World.BY_COUNTRY[country]) {
          ACS_World.BY_COUNTRY[country] = [];
        }
        ACS_World.BY_COUNTRY[country].push(a);
      });
    });

    ACS_World.ALL_AIRPORTS = ALL;

    // Índices ICAO / IATA globales
    ALL.forEach(a => {
      if (a.icao) ACS_World.INDEX_ICAO[a.icao] = a;
      if (a.iata) ACS_World.INDEX_IATA[a.iata] = a;
    });

    ACS_World.ready = true;
    console.log("✅ ACS_WorldEngine listo ::", ALL.length, "aeropuertos indexados");
  };

  /* ===========================================================
     FECHAS HISTÓRICAS — open_year / close_year
     =========================================================== */
  const AirportDates = global.ACS_AirportDates || {};

  function getOpenYear(a) {
    const meta = AirportDates[a.icao];
    if (meta && typeof meta.open === "number") return meta.open;
    return a.open_year ?? 1900;
  }

  function getCloseYear(a) {
    const meta = AirportDates[a.icao];
    if (meta && typeof meta.close === "number") return meta.close;
    return a.close_year ?? 9999;
  }

  /* ===========================================================
     === GLOBAL MAJOR AIRPORT CHECK =============================
     Aeropuertos que SIEMPRE aparecen (base mundial)
     =========================================================== */
  function isMajorAirport(a) {

    if (!a) return false;

    // 1. Aeropuertos International
    if (a.category && a.category.toLowerCase().includes("international"))
      return true;

    // 2. Demanda alta
    const demandTotal =
      (a.demand?.Y || 0) + (a.demand?.C || 0) + (a.demand?.F || 0);
    if (demandTotal > 2500) return true;

    // 3. Capitales principales
    const capitalCities = [
      "Caracas","Bogota","Lima","Santiago","Buenos Aires","Brasilia",
      "Quito","Mexico City","Washington","Ottawa",
      "Madrid","Paris","London","Berlin","Rome","Amsterdam",
      "Moscow","Tokyo","Beijing","Seoul","Bangkok","Singapore",
      "Sydney","Melbourne","Auckland","Johannesburg","Cairo"
    ];
    if (capitalCities.includes(a.city)) return true;

    // 4. Alta capacidad de slots
    if (a.slot_capacity > 35) return true;

    // 5. IATA grandes
    const hugeIATA = [
      "CCS","BOG","LIM","SCL","EZE","GRU","GIG","MEX",
      "JFK","LAX","MIA","DFW","ORD","IAH","ATL",
      "LHR","LGW","CDG","AMS","FRA","BCN","MAD",
      "DXB","DOH","SIN","HND","NRT","ICN","BKK","KUL",
      "SYD","MEL","AKL",
      "CAI","JNB","ADD"
    ];
    if (hugeIATA.includes(a.iata)) return true;

    return false;
  }

  /* ===========================================================
     === HISTORICAL EXISTENCE WITH AUTO-OPEN-YEAR ===============
     =========================================================== */
  ACS_World.airportExistsInYear = function (a, year) {

    // 1. Aeropuerto principal → SIEMPRE visible
    if (isMajorAirport(a)) return true;

    // 2. Fechas reales
    const realOpen = getOpenYear(a);
    const realClose = getCloseYear(a);

    // 3. Si el aeropuerto YA tiene fecha real → usarla
    if (realOpen !== 1900) {
      return year >= realOpen && year <= realClose;
    }

    /* ===========================================================
         AUTO OPEN YEAR SYSTEM — WORLD LOGIC v1.0
       =========================================================== */

    let openYear = 0;

    const demandTotal =
      (a.demand?.Y || 0) + (a.demand?.C || 0) + (a.demand?.F || 0);

    const runway = a.runway_m || 0;
    const slots = a.slot_capacity || 0;
    const isInternational =
      a.category && a.category.toLowerCase().includes("international");

    // Aeropuertos grandes (capitales, internacionales, hubs)
    if (isInternational || demandTotal > 2500 || slots > 30 || runway > 2800) {
      openYear = 1945;
    }
    else if (runway > 2200 || slots > 15 || demandTotal > 1500) {
      openYear = 1955;
    }
    else if (runway > 1600 || slots > 10 || demandTotal > 800) {
      openYear = 1965;
    }
    else {
      openYear = 1975;
    }

    // Filtro final
    if (year < openYear) return false;
    if (year > realClose) return false;

    return true;
  };

  /* ===========================================================
     HISTORICAL DEMAND ENGINE
     =========================================================== */
  ACS_World.getHistoricalDemand = function (a, year) {
    const base = a.demand || { Y: 0, C: 0, F: 0 };

    const factor = Math.max(
      0.10,
      Math.min(1.0, (year - 1940) / (2026 - 1940))
    );

    const Y = Math.round(base.Y * factor);
    const C = year >= 1955 ? Math.round(base.C * factor) : 0;
    const F = year >= 1976 ? Math.round(base.F * factor) : 0;

    return { Y, C, F };
  };

  /* ===========================================================
     BÚSQUEDA DIRECTA ICAO / IATA
     =========================================================== */
  ACS_World.getByICAO = function (icao) {
    return ACS_World.INDEX_ICAO[icao] || null;
  };

  ACS_World.getByIATA = function (iata) {
    return ACS_World.INDEX_IATA[iata] || null;
  };

  /* ===========================================================
     FILTROS POR CONTINENTE / PAÍS
     =========================================================== */
  ACS_World.byContinent = function (continent, year) {
    const list = ACS_World.BY_CONTINENT[continent] || [];
    return list.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  ACS_World.byCountry = function (country, year) {
    const list = ACS_World.BY_COUNTRY[country] || [];
    return list.filter(a => ACS_World.airportExistsInYear(a, year));
  };

  ACS_World.byContinentNoFilter = function (continent) {
    return ACS_World.BY_CONTINENT[continent] || [];
  };

  /* ===========================================================
     EXPORTAR MOTOR MUNDIAL
     =========================================================== */
  global.ACS_World = ACS_World;

})(window);

/* =============================================================
   LLAMADA DESDE choose_base:
   loadAirportScripts(() => {
     buildAirportIndex();
     ACS_World.initialize();   <── AQUÍ
   });
   ============================================================= */

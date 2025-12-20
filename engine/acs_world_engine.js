/* =============================================================
   === ACS WORLD ENGINE — HISTORICAL CORE v2.3 =================
   -------------------------------------------------------------
   ▪ Motor mundial unificado para ACS (1940–2026)
   ▪ Aeropuertos principales SIEMPRE visibles
   ▪ Secundarios según fechas + infraestructura real
   ▪ Demanda histórica NO SE TOCA
   ▪ Control histórico intacto (Business/First)
   ▪ Aperturas realistas (1945–1975)
   ▪ Índices ICAO / IATA / países / continentes
   ============================================================= */

(function (global) {
  "use strict";

  // Namespace global
  const ACS_World = {
    ready: false,
    ALL_AIRPORTS: [],
    INDEX_ICAO: {},
    INDEX_IATA: {},
    BY_CONTINENT: {},
    BY_COUNTRY: {}
  };

  /* ===========================================================
     OBTENER AÑO DE SIMULACIÓN
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
     INITIALIZE — Construir índices
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

      ACS_World.BY_CONTINENT[cont] = list;

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

    // Índices rápidos ICAO / IATA
    ALL.forEach(a => {
      if (a.icao) ACS_World.INDEX_ICAO[a.icao] = a;
      if (a.iata) ACS_World.INDEX_IATA[a.iata] = a;
    });

    ACS_World.ready = true;
    console.log("✅ ACS_WorldEngine listo ::", ALL.length, "aeropuertos indexados");
  };
   
// ============================================================
// 🧭 ACS — BASE GUARANTEE (POST WORLD INIT)
// ============================================================

try {
  let activeUser = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  if (!activeUser.base || !activeUser.base.icao) {

    if (activeUser.airline?.country) {

      const airports = ACS_World.ALL_AIRPORTS;

      const candidate =
        airports.find(a =>
          a.country === activeUser.airline.country &&
          isMajorAirport(a)
        ) ||
        airports.find(a => a.country === activeUser.airline.country);

      if (candidate) {
        activeUser.base = {
          icao: candidate.icao,
          city: candidate.city || "",
          country: candidate.country || "",
          name: candidate.name || ""
        };

        localStorage.setItem("ACS_activeUser", JSON.stringify(activeUser));

        console.log(
          "🧭 ACS base auto-created after world init:",
          candidate.icao
        );
      }
    }
  }
} catch (e) {
  console.warn("ACS base guarantee failed", e);
}
   
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
     AEROPUERTOS PRINCIPALES (Major Airports)
     =========================================================== */
  function isMajorAirport(a) {

    if (!a) return false;

    // International
    if (a.category && a.category.toLowerCase().includes("international"))
      return true;

    // Demanda muy alta (moderna)
    const demandTotal =
      (a.demand?.Y || 0) +
      (a.demand?.C || 0) +
      (a.demand?.F || 0);

    if (demandTotal > 2500) return true;

    // Capitales del mundo
    const capitals = [
      "Caracas","Bogota","Lima","Santiago","Buenos Aires","Brasilia",
      "Quito","Mexico City","Washington","Ottawa",
      "Madrid","Paris","London","Berlin","Rome","Amsterdam",
      "Moscow","Tokyo","Beijing","Seoul","Bangkok","Singapore",
      "Sydney","Melbourne","Auckland","Johannesburg","Cairo"
    ];

    if (capitals.includes(a.city)) return true;

    // Slots muy altos
    if (a.slot_capacity > 35) return true;

    // IATA grandes
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
     EXISTENCIA HISTÓRICA — (CORREGIDO v3.0)
     =========================================================== */
  ACS_World.airportExistsInYear = function (a, year) {

    // 1. Los aeropuertos grandes SIEMPRE existen
    if (isMajorAirport(a)) return true;

    // 2. Si tiene fechas reales → usar esas
    const realOpen = getOpenYear(a);
    const realClose = getCloseYear(a);

    if (realOpen !== 1900) {
      return year >= realOpen && year <= realClose;
    }

    /* ===========================================================
         AUTO OPEN YEAR SYSTEM — FINAL v3.0
         (NO toca demanda histórica)
       =========================================================== */

    const runway = a.runway_m || 0;
    const slots = a.slot_capacity || 0;
    const cat = (a.category || "").toLowerCase();

    let openYear = 1970; // aeropuertos pequeños aparecen tarde por default

    // Grandes internacionales / hubs → temprano
    if (cat.includes("international") || slots > 30 || runway > 2800) {
      openYear = 1945;
    }
    // Medianos
    else if (slots > 15 || runway > 2200) {
      openYear = 1955;
    }
    // Regionales
    else if (slots > 8 || runway > 1600) {
      openYear = 1965;
    }
    // Pequeños → quedan en 1970

    if (year < openYear) return false;
    if (year > realClose) return false;

    return true;
  };

  /* ===========================================================
     DEMANDA HISTÓRICA (NO se toca)
     =========================================================== */
  ACS_World.getHistoricalDemand = function (a, year) {

    const base = a.demand || {Y:0, C:0, F:0};

    const factor = Math.max(
      0.10,
      Math.min(1.0, (year - 1940) / (2026 - 1940))
    );

    const Y = Math.round(base.Y * factor);
    const C = (year >= 1955) ? Math.round(base.C * factor) : 0;
    const F = (year >= 1976) ? Math.round(base.F * factor) : 0;

    return {Y, C, F};
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
     FILTROS POR CONTINENTE Y PAÍS
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
     EXPORTAR MOTOR
     =========================================================== */
  global.ACS_World = ACS_World;

})(window);

/* =============================================================
   LLAMADA DESDE choose_base:
   loadAirportScripts(() => {
     buildAirportIndex();
     ACS_World.initialize();   // AQUI
   });
   ============================================================= */


/* ============================================================
   === ACS CREW ENGINE v1.0 — Qatar Luxury Edition ============
   ------------------------------------------------------------
   • Crew Universal Automático (1940 → 2026)
   • Overrides Soviéticos (Pilots + FE + NAV + RO)
   • Cabin Crew Premium: 2 para < 19 pax (ACS Rule)
   • Compatible con:
        - HR Engine (required staff)
        - Finance Engine (trip cost payroll)
        - Route Schedule (fase 3.2)
        - Schedule Table (availability)
        - My Aircraft (model-based logic)
   • Namespace global: window.ACS_CrewEngine
   ============================================================ */
/* ============================================================
   🟦 A) CREW RESOLVER — Por modelo exacto (Universal + Soviético)
   ============================================================ */

window.ACS_CrewEngine = window.ACS_CrewEngine || {};

/**
 * Devuelve el crew REAL por modelo exacto.
 * Entrada: "A300B4-200", "Do 328JET", "Tu-154B-2"
 * Salida:
 * {
 *    pilots: 2,
 *    flight_engineers: 1,
 *    navigators: 0,
 *    radio_ops: 0,
 *    cabin: 6,
 *    total: 9
 * }
 */
ACS_CrewEngine.getCrewByModel = function(model) {

  if (!model) {
    return {
      pilots: 2,
      flight_engineers: 0,
      navigators: 0,
      radio_ops: 0,
      cabin: 2,
      total: 4
    };
  }

  const m = model.toLowerCase();

  // ------------------------------------------------------------
  // 🛫 SOVIÉTICOS — FE / NAV / RO (configuraciones reales)
  // ------------------------------------------------------------

  // Tupolev
  if (m.includes("tu-154"))  return { pilots:2, flight_engineers:1, navigators:1, radio_ops:0, cabin:4, total:8 };
  if (m.includes("tu-134"))  return { pilots:2, flight_engineers:1, navigators:1, radio_ops:0, cabin:3, total:7 };
  if (m.includes("tu-104"))  return { pilots:2, flight_engineers:1, navigators:1, radio_ops:1, cabin:3, total:8 };

  // Ilyushin
  if (m.includes("il-62"))   return { pilots:2, flight_engineers:1, navigators:1, radio_ops:1, cabin:6, total:11 };
  if (m.includes("il-18"))   return { pilots:2, flight_engineers:1, navigators:1, radio_ops:1, cabin:3, total:8 };
  if (m.includes("il-14"))   return { pilots:2, flight_engineers:1, navigators:1, radio_ops:0, cabin:1, total:5 };

  // Antonov
  if (m.includes("an-24"))   return { pilots:2, flight_engineers:1, navigators:0, radio_ops:0, cabin:2, total:5 };
  if (m.includes("an-26"))   return { pilots:2, flight_engineers:1, navigators:0, radio_ops:0, cabin:2, total:5 };
  if (m.includes("an-12"))   return { pilots:2, flight_engineers:1, navigators:1, radio_ops:1, cabin:1, total:6 };

  // Yakovlev
  if (m.includes("yak-40")) return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:1, total:3 };
  if (m.includes("yak-42")) return { pilots:2, flight_engineers:1, navigators:0, radio_ops:0, cabin:3, total:6 };


  // ------------------------------------------------------------
  // 🛫 OCCIDENTAL — Widebody (FE en generaciones antiguas)
  // ------------------------------------------------------------

  // Boeing widebody
  if (m.includes("747-100") || m.includes("747-200"))
      return { pilots:2, flight_engineers:1, navigators:0, radio_ops:0, cabin:13, total:16 };

  if (m.includes("747-300"))
      return { pilots:2, flight_engineers:1, navigators:0, radio_ops:0, cabin:12, total:15 };

  if (m.includes("747-400"))
      return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:12, total:14 };

  if (m.includes("767")) 
      return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:7, total:9 };

  // Airbus widebody
  if (m.includes("a300"))
      return { pilots:2, flight_engineers:1, navigators:0, radio_ops:0, cabin:7, total:10 };

  if (m.includes("a310"))
      return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:6, total:8 };

  if (m.includes("a330")) 
      return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:8, total:10 };

  // McDonnell Douglas widebody
  if (m.includes("dc-10"))
      return { pilots:2, flight_engineers:1, navigators:0, radio_ops:0, cabin:9, total:12 };

  if (m.includes("md-11"))
      return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:9, total:11 };


  // ------------------------------------------------------------
  // 🛫 NARROWBODY modernos
  // ------------------------------------------------------------

  if (m.includes("737")) return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:4, total:6 };
  if (m.includes("a320")) return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:4, total:6 };
  if (m.includes("md-80")) return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:4, total:6 };
  if (m.includes("dc-9")) return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:3, total:5 };


  // ------------------------------------------------------------
  // 🛫 TURBOPROP / REGIONAL
  // ------------------------------------------------------------

  if (m.includes("atr"))
      return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:2, total:4 };

  if (m.includes("do 328") || m.includes("dornier"))
      return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:1, total:3 };

  if (m.includes("jetstream") || m.includes("l-410"))
      return { pilots:2, flight_engineers:0, navigators:0, radio_ops:0, cabin:1, total:3 };


  // ------------------------------------------------------------
  // 🛩 PISTÓN / COMMUTER 1940–1970 (mínimo 2 pilotos)
  // ------------------------------------------------------------
  return {
    pilots: 2,
    flight_engineers: 0,
    navigators: 0,
    radio_ops: 0,
    cabin: 1,
    total: 3
  };
};
window.ACS_CrewEngine = (() => {

  /* ============================================================
     🟥 1) Overrides Soviéticos — Tripulaciones históricas reales
     ============================================================ */
  const SOVIET_OVERRIDE = {

    // Tupolev
    "TU-104":  { pilots: 2, fe: 1, nav: 1, radio: 1 },
    "TU-124":  { pilots: 2, fe: 1, nav: 1, radio: 1 },
    "TU-134":  { pilots: 2, fe: 1, nav: 1, radio: 0 },
    "TU-154":  { pilots: 2, fe: 1, nav: 1, radio: 1 },
    "TU-154M": { pilots: 2, fe: 1, nav: 1, radio: 1 },

    // Ilyushin
    "IL-18":  { pilots: 2, fe: 1, nav: 1, radio: 1 },
    "IL-62":  { pilots: 2, fe: 1, nav: 1, radio: 1 },
    "IL-76":  { pilots: 2, fe: 1, nav: 1, radio: 0 },
    "IL-86":  { pilots: 2, fe: 1, nav: 1, radio: 0 },
    "IL-96":  { pilots: 2, fe: 1, nav: 0, radio: 0 },

    // Yakovlev
    "YAK-40": { pilots: 2, fe: 0, nav: 0, radio: 1 },
    "YAK-42": { pilots: 2, fe: 1, nav: 0, radio: 1 },

    // Antonov
    "AN-12": { pilots: 2, fe: 1, nav: 1, radio: 1 },
    "AN-22": { pilots: 2, fe: 1, nav: 1, radio: 1 },
    "AN-24": { pilots: 2, fe: 1, nav: 0, radio: 1 },
    "AN-26": { pilots: 2, fe: 1, nav: 0, radio: 1 },
    "AN-72": { pilots: 2, fe: 1, nav: 0, radio: 0 },
    "AN-74": { pilots: 2, fe: 1, nav: 0, radio: 0 }
  };
   
/* ============================================================
   🟧 B) CREW MAPPER — Usa ACS_AIRCRAFT_DB → Crew Resolver
   ============================================================ */

ACS_CrewEngine.getCrewFromDatabase = function(model) {

  if (!model) return ACS_CrewEngine.getCrewByModel(null);

  // Buscar avión exacto en la base
  const dbItem = (window.ACS_AIRCRAFT_DB || []).find(
    a => a.model.toLowerCase() === model.toLowerCase()
  );

  // Si no existe, usar resoluciones por reglas globales
  if (!dbItem)
    return ACS_CrewEngine.getCrewByModel(model);

  // Si existe → usar crew especial por modelo
  return ACS_CrewEngine.getCrewByModel(dbItem.model);
};
   
  /* ============================================================
     🟦 2) Motor Universal — Crew según capacidad / categoría
     ============================================================ */
  function getUniversalCrew(seats, manufacturer, model) {

    let pilots = 2;
    let cabin = 2; // ✔ Regla ACS: mínimo 2 para 1–19 pax

    // Estándar por capacidad (cabina)
    if (seats <= 19) cabin = 2;
    else if (seats <= 39) cabin = 2;
    else if (seats <= 79) cabin = 3;
    else if (seats <= 149) cabin = 4;
    else if (seats <= 249) cabin = 6;
    else if (seats <= 350) cabin = 8;
    else cabin = 10;

    return {
      pilots,
      cabin,
      extra: { fe: 0, nav: 0, radio: 0 },
      totalCockpit: pilots,
      totalCrew: pilots + cabin
    };
  }

  /* ============================================================
     🟧 3) Detectar overrides soviéticos por nombre
     ============================================================ */
  function checkSovietOverride(modelName) {
    const name = modelName.toUpperCase();
    for (const key in SOVIET_OVERRIDE) {
      if (name.includes(key)) return SOVIET_OVERRIDE[key];
    }
    return null;
  }

  /* ============================================================
     🟨 4) Motor principal — Devuelve el crew completo
     ============================================================ */
  function getCrewForModel(modelName, aircraftInfo = {}) {
    const seats = aircraftInfo.seats || 0;
    const manufacturer = aircraftInfo.manufacturer || "";
    const model = aircraftInfo.model || modelName || "";

    // 1) ¿Es soviético?
    const soviet = checkSovietOverride(model);
    if (soviet) {
      const cockpit = soviet.pilots + soviet.fe + soviet.nav + soviet.radio;
      const cabin =
        seats <= 19 ? 2 :
        seats <= 39 ? 2 :
        seats <= 79 ? 3 :
        seats <= 149 ? 4 :
        seats <= 249 ? 6 :
        seats <= 350 ? 8 : 10;

      return {
        pilots: soviet.pilots,
        cabin,
        extra: {
          flight_engineer: soviet.fe,
          navigator: soviet.nav,
          radio: soviet.radio
        },
        totalCockpit: cockpit,
        totalCrew: cockpit + cabin
      };
    }

    // 2) Universal
    return getUniversalCrew(seats, manufacturer, model);
  }

  /* ============================================================
     🟩 5) API Pública (Namespace Global)
     ============================================================ */
  return {
    getCrewForModel
  };

})();

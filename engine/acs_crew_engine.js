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

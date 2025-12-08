/* ============================================================
   === ACS CREW ENGINE v2.0 — Qatar Luxury Edition ============
   ------------------------------------------------------------
   • Tripulaciones reales 1940 → 2026
   • Cockpit real (Pilots + FE + NAV + Radio)
   • Cabin Crew REAL por modelo / familia
   • Overrides soviéticos confirmados
   • Narrowbody / Widebody / Regional / Turboprop / Pistón
   • API ÚNICA y estable: ACS_CrewEngine.getCrew(modelName)
   ------------------------------------------------------------
   • Integración total:
        - HR Engine (required staff)
        - Finance Engine (trip cost payroll)
        - Route Schedule (fase 3.2)
        - Schedule Table (crew availability)
        - My Aircraft (model → crew real)
   ============================================================ */

window.ACS_CrewEngine = (() => {

  /* ============================================================
     🟥 1) Overrides Soviéticos — Tripulaciones históricas
     ============================================================ */
  const SOVIET = {
    "TU-104":  { pilots:2, fe:1, nav:1, radio:1, cabin:3 },
    "TU-124":  { pilots:2, fe:1, nav:1, radio:1, cabin:3 },
    "TU-134":  { pilots:2, fe:1, nav:1, radio:0, cabin:3 },
    "TU-154":  { pilots:2, fe:1, nav:1, radio:0, cabin:4 },
    "TU-154M": { pilots:2, fe:1, nav:1, radio:0, cabin:4 },

    "IL-18":  { pilots:2, fe:1, nav:1, radio:1, cabin:3 },
    "IL-62":  { pilots:2, fe:1, nav:1, radio:1, cabin:6 },
    "IL-76":  { pilots:2, fe:1, nav:1, radio:0, cabin:2 },
    "IL-86":  { pilots:2, fe:1, nav:1, radio:0, cabin:6 },
    "IL-96":  { pilots:2, fe:1, nav:0, radio:0, cabin:6 },

    "AN-12": { pilots:2, fe:1, nav:1, radio:1, cabin:1 },
    "AN-22": { pilots:2, fe:1, nav:1, radio:1, cabin:2 },
    "AN-24": { pilots:2, fe:1, nav:0, radio:1, cabin:2 },
    "AN-26": { pilots:2, fe:1, nav:0, radio:1, cabin:2 },
    "AN-72": { pilots:2, fe:1, nav:0, radio:0, cabin:2 },
    "AN-74": { pilots:2, fe:1, nav:0, radio:0, cabin:2 },

    "YAK-40": { pilots:2, fe:0, nav:0, radio:1, cabin:1 },
    "YAK-42": { pilots:2, fe:1, nav:0, radio:1, cabin:3 }
  };

  function sovietOverride(model) {
    const M = model.toUpperCase();
    return SOVIET[Object.keys(SOVIET).find(k => M.includes(k))] || null;
  }

  /* ============================================================
     🟧 2) Cabin Crew real por modelo (WESTERN)
     ============================================================ */
  const CABIN_REAL = [
    { match:"A300", cabin:7 },
    { match:"A310", cabin:6 },
    { match:"A330", cabin:8 },
    { match:"A340", cabin:10 },
    { match:"A350", cabin:10 },
    { match:"A380", cabin:18 },

    { match:"B707", cabin:5 },
    { match:"B727", cabin:4 },
    { match:"B737", cabin:4 },
    { match:"B747", cabin:13 },
    { match:"B757", cabin:4 },
    { match:"B767", cabin:7 },
    { match:"B777", cabin:10 },
    { match:"B787", cabin:8 },

    { match:"MD-11", cabin:9 },
    { match:"DC-10", cabin:9 },
    { match:"MD-80", cabin:4 },
    { match:"DC-9", cabin:3 },

    { match:"CRJ", cabin:2 },
    { match:"ERJ", cabin:2 },
    { match:"EMB", cabin:2 },

    { match:"ATR 42", cabin:2 },
    { match:"ATR 72", cabin:2 },
    { match:"DH8", cabin:2 },

    { match:"DO 328", cabin:1 },
    { match:"DO328", cabin:1 },
    { match:"JETSTREAM", cabin:1 },
    { match:"L-410", cabin:1 }
  ];

  function realCabinWestern(model) {
    const M = model.toUpperCase();
    const item = CABIN_REAL.find(x => M.includes(x.match));
    return item ? item.cabin : null;
  }

  /* ============================================================
     🟦 3) Cockpit moderno occidental
     ============================================================ */
  function cockpitModern(model) {
    const M = model.toUpperCase();

    // Old widebody con FE
    if (M.includes("747-100") || M.includes("747-200"))
      return { pilots:2, fe:1, nav:0, radio:0 };

    if (M.includes("DC-10"))
      return { pilots:2, fe:1, nav:0, radio:0 };

    if (M.includes("A300"))
      return { pilots:2, fe:1, nav:0, radio:0 };

    // Modernos sin FE
    return { pilots:2, fe:0, nav:0, radio:0 };
  }

  /* ============================================================
     🟨 4) Cabin universal (fallback)
     ============================================================ */
  function universalCabinBySeats(seats) {
    if (seats <= 19) return 2;   // regla ACS
    if (seats <= 39) return 2;
    if (seats <= 79) return 3;
    if (seats <= 149) return 4;
    if (seats <= 249) return 6;
    if (seats <= 350) return 8;
    return 10;
  }

  /* ============================================================
     🟩 5) Motor Principal
     ============================================================ */
  function getCrew(modelName) {

    if (!modelName) {
      return {
        pilots:2, flight_engineers:0, navigators:0, radio_ops:0,
        cabin:2, total:4
      };
    }

    const M = modelName.toUpperCase();

    // 1) Soviético
    const sov = sovietOverride(M);
    if (sov) {
      return {
        pilots: sov.pilots,
        flight_engineers: sov.fe,
        navigators: sov.nav,
        radio_ops: sov.radio,
        cabin: sov.cabin,
        total: sov.pilots + sov.fe + sov.nav + sov.radio + sov.cabin
      };
    }

    // 2) Western cabin real
    const cabinReal = realCabinWestern(M);

    // 3) Datos básicos del aircraft DB si existen
    let seats = 0;
    const db = (window.ACS_AIRCRAFT_DB || []).find(a => a.model.toUpperCase() === M);
    if (db) seats = db.seats || 0;

    // 4) Cockpit occidental
    const cock = cockpitModern(M);

    // 5) Cabin según modelo o universal
    const cabin = cabinReal !== null ? cabinReal : universalCabinBySeats(seats);

    // Resultado final
    return {
      pilots: cock.pilots,
      flight_engineers: cock.fe,
      navigators: cock.nav,
      radio_ops: cock.radio,
      cabin,
      total: cock.pilots + cock.fe + cock.nav + cock.radio + cabin
    };
  }

  /* ============================================================
     🟦 6) API pública
     ============================================================ */
  return {
    getCrew
  };

})();

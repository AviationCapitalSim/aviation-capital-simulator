/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — ROBUST MODE
   ------------------------------------------------------------
   - Source: scheduleItems + ACS_MyAircraft
   - Time: ACS_TIME (or internal fallback)
   - Publishes: window.ACS_LIVE_FLIGHTS (ALWAYS)
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     🕒 SAFE TIME ACCESS (CRITICAL FIX)
     ============================================================ */

  function getSafeTime() {
    // 1) Ideal: ACS_TIME absoluto
    if (window.ACS_TIME && Number.isFinite(window.ACS_TIME.absoluteMinute)) {
      return {
        absoluteMinute: window.ACS_TIME.absoluteMinute,
        day: window.ACS_TIME.day || null
      };
    }

    // 2) Fallback: reloj simple (minutos desde carga)
    if (!window.__ACS_RUNTIME_FALLBACK_TIME__) {
      const start = Date.now();
      window.__ACS_RUNTIME_FALLBACK_TIME__ = () =>
        Math.floor((Date.now() - start) / 60000);
    }

    return {
      absoluteMinute: window.__ACS_RUNTIME_FALLBACK_TIME__(),
      day: null
    };
  }

  /* ============================================================
     🛬 STATE STORAGE
     ============================================================ */

  const STATE_KEY = "ACS_FLIGHT_STATE";

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY));
      return Array.isArray(s) ? s : [];
    } catch {
      return [];
    }
  }

  function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  /* ============================================================
     🧩 BOOTSTRAP GROUND AIRCRAFT
     ============================================================ */

  function bootstrapAircraft() {
    let fleet = [];
    try {
      fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft")) || [];
    } catch {}

    if (!fleet.length) return;

    const base = localStorage.getItem("ACS_baseICAO");
    const state = loadState();
    let changed = false;

    fleet.forEach(ac => {
      if (!ac?.id) return;
      if (state.some(s => s.aircraftId === ac.id)) return;

      state.push({
        aircraftId: ac.id,
        airport: ac.baseAirport || base,
        status: "ground"
      });
      changed = true;
    });

    if (changed) saveState(state);
  }

  /* ============================================================
     🗓 BUILD FLIGHTS FROM SCHEDULE
     ============================================================ */

  function buildFlights() {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem("scheduleItems")) || [];
    } catch {}

    const flights = [];
    const dayMap = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };

    items.forEach(it => {
      if (it.type !== "flight" || !it.aircraftId) return;

      const [h1,m1] = (it.departure||"").split(":").map(Number);
      const [h2,m2] = (it.arrival||"").split(":").map(Number);
      if (!Number.isFinite(h1) || !Number.isFinite(h2)) return;

      let dep = h1*60 + m1;
      let arr = h2*60 + m2;
      if (arr <= dep) arr += 1440;

      const days = Array.isArray(it.days) && it.days.length ? it.days : [null];

      days.forEach(d => {
        const off = d ? (dayMap[d] ?? 0) * 1440 : 0;
        flights.push({
          aircraftId: it.aircraftId,
          origin: it.origin,
          destination: it.destination,
          flightOut: it.flightOut || null,
          depMin: dep + off,
          arrMin: arr + off
        });
      });
    });

    return flights;
  }

  /* ============================================================
     🌍 UPDATE WORLD (ALWAYS PUBLISH)
     ============================================================ */

  function updateWorld() {
    const { absoluteMinute, day } = getSafeTime();

    bootstrapAircraft();

    const state = loadState();
    const flights = buildFlights();
    const live = [];

    let airports = {};
    if (window.WorldAirportsACS) {
      Object.values(WorldAirportsACS).flat().forEach(a => {
        if (a.icao) airports[a.icao] = a;
      });
    }

    state.forEach(ac => {
      let lat=null, lng=null, status="ground";
      const active = flights.find(f =>
        f.aircraftId === ac.aircraftId &&
        absoluteMinute >= f.depMin &&
        absoluteMinute <= f.arrMin
      );

      if (active) {
        const o = airports[active.origin];
        const d = airports[active.destination];
        if (o && d) {
          const t = (absoluteMinute - active.depMin) /
                    (active.arrMin - active.depMin);
          lat = o.latitude + (d.latitude - o.latitude)*t;
          lng = o.longitude + (d.longitude - o.longitude)*t;
          status = "enroute";
        }
      }

      if (!Number.isFinite(lat)) {
        const ap = airports[ac.airport];
        if (ap) {
          lat = ap.latitude;
          lng = ap.longitude;
        }
      }

      if (Number.isFinite(lat)) {
        live.push({
          aircraftId: ac.aircraftId,
          status,
          lat, lng,
          origin: active?.origin || null,
          destination: active?.destination || null,
          flightOut: active?.flightOut || null
        });
      }
    });

    window.ACS_LIVE_FLIGHTS = live;
    localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(live));
  }

  /* ============================================================
     🔁 START LOOP (ROBUST)
     ============================================================ */

  updateWorld();

  if (typeof registerTimeListener === "function") {
    registerTimeListener(updateWorld);
  } else {
    setInterval(updateWorld, 1000);
  }

  console.log("🌍 ACS Runtime READY (robust mode)");

})();

/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE — SINGLE EXEC MODE (RESTORED)
   ------------------------------------------------------------
   ✔ Source of truth: scheduleItems + ACS_MyAircraft
   ✔ Time source: ACS_TIME.minute (ONLY)
   ✔ Always-visible aircraft (GROUND or AIR)
   ✔ No absolute time
   ✔ No weekly math
   ✔ No fallback clocks
   ✔ SkyTrack is OBSERVER ONLY
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     🧱 GLOBAL STATE (PERSISTENT WORLD)
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
     🛬 BOOTSTRAP AIRCRAFT (ALWAYS EXISTS)
     ============================================================ */

  function bootstrapAircraft() {
    let fleet = [];
    try {
      fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft")) || [];
    } catch {}

    if (!fleet.length) return;

    const baseICAO = localStorage.getItem("ACS_baseICAO");
    const state = loadState();
    let changed = false;

    fleet.forEach(ac => {
      if (!ac?.id) return;

      if (state.some(s => s.aircraftId === ac.id)) return;

      state.push({
        aircraftId: ac.id,
        airport: ac.baseAirport || baseICAO,
        status: "GROUND"
      });
      changed = true;
    });

    if (changed) saveState(state);
  }

  /* ============================================================
     🗓 BUILD FLIGHTS FROM SCHEDULE (SOURCE OF TRUTH)
     ============================================================ */

  function toMin(hhmm) {
    if (!hhmm || typeof hhmm !== "string") return null;
    const [h, m] = hhmm.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  function buildFlightsFromSchedule() {
    let schedule = [];
    try {
      schedule = JSON.parse(localStorage.getItem("scheduleItems")) || [];
    } catch {}

    const baseICAO = localStorage.getItem("ACS_baseICAO");
    const flights = [];

    schedule.forEach(item => {
      if (item.type !== "flight") return;
      if (!item.aircraftId) return;

      const depMin = toMin(item.departure);
      const arrMin = toMin(item.arrival);
      if (depMin == null || arrMin == null) return;

      let a = arrMin;
      if (a <= depMin) a += 1440;

      flights.push({
        aircraftId: item.aircraftId,
        origin: item.origin || baseICAO,
        destination: item.destination,
        depMin,
        arrMin: a,
        flightOut: item.flightNumberOut || item.flightOut || null
      });
    });

    return flights;
  }

  /* ============================================================
     🌍 UPDATE WORLD (SIMPLE, REAL, 24/7)
     ============================================================ */

  function updateWorldFlights() {

    const nowMin = window.ACS_TIME?.minute;
    if (typeof nowMin !== "number") return;

    bootstrapAircraft();

    const state = loadState();
    const flights = buildFlightsFromSchedule();
    const live = [];

    const airports = {};
    if (window.WorldAirportsACS) {
      Object.values(WorldAirportsACS).flat().forEach(a => {
        if (a.icao) airports[a.icao] = a;
      });
    }

    state.forEach(ac => {

      let lat = null;
      let lng = null;
      let status = "GROUND";

      const f = flights.find(fl =>
        fl.aircraftId === ac.aircraftId &&
        nowMin >= fl.depMin &&
        nowMin <= fl.arrMin
      );

      if (f) {
        const o = airports[f.origin];
        const d = airports[f.destination];

        if (o && d) {
          const t = (nowMin - f.depMin) / (f.arrMin - f.depMin);
          lat = o.latitude  + (d.latitude  - o.latitude)  * t;
          lng = o.longitude + (d.longitude - o.longitude) * t;
          status = "AIR";
        }
      }

      if (!Number.isFinite(lat)) {
        const ap = airports[ac.airport];
        if (ap) {
          lat = ap.latitude;
          lng = ap.longitude;
          status = "GROUND";
        }
      }

      if (Number.isFinite(lat)) {
        live.push({
          aircraftId: ac.aircraftId,
          status: status === "AIR" ? "air" : "ground",
          lat,
          lng,
          origin: f?.origin || null,
          destination: f?.destination || null,
          flightOut: f?.flightOut || null,
          depMin: f?.depMin || null,
          arrMin: f?.arrMin || null
        });
      }

      ac.status = status;
    });

    saveState(state);

    window.ACS_LIVE_FLIGHTS = live;
    localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(live));
  }

  /* ============================================================
     🔁 START (TIME ENGINE DRIVEN)
     ============================================================ */

  updateWorldFlights();

  if (typeof registerTimeListener === "function") {
    registerTimeListener(updateWorldFlights);
  } else {
    setInterval(updateWorldFlights, 1000);
  }

  console.log("✈️ ACS Flight Runtime ACTIVE — SINGLE EXEC MODE");

})();

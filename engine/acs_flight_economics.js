/* ============================================================
   ✈️ ACS FLIGHT ECONOMICS ENGINE — CORE v2.0 (CLEAN)
   ------------------------------------------------------------
   ✔ Single event: ACS_FLIGHT_ARRIVAL
   ✔ Passenger source: ACS_PAX
   ✔ Finance via ACS_registerIncome ONLY
   ✔ Live / Weekly via ACS_updateLiveWeekly
   ✔ Dedup by aircraftId + depAbsMin
   ------------------------------------------------------------
   Date: 15 JAN 2026
   ============================================================ */

console.log("🧠 ACS_FLIGHT_ECONOMICS v2.0 LOADED");

/* ============================================================
   🔒 DEDUP STORE (GLOBAL SAFE)
   ============================================================ */

window.ACS_ECON_ProcessedFlights =
  window.ACS_ECON_ProcessedFlights || new Set();

/* ============================================================
   ✈️ ECON LISTENER — ARRIVAL (CANONICAL)
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ARRIVAL", function (ev) {

  try {

    const d = ev?.detail;
    if (!d) return;

    /* ============================
       🧩 NORMALIZE PAYLOAD
       ============================ */
    const flight = {
      flightId: d.flightId || null,
      aircraftId: d.aircraftId || null,
      origin: d.origin || null,
      destination: d.destination || null,
      distanceNM: Number(d.distanceNM || 0),
      depAbsMin: Number(d.depAbsMin)
    };

    if (
      !flight.aircraftId ||
      !flight.origin ||
      !flight.destination ||
      !Number.isFinite(flight.distanceNM) ||
      !Number.isFinite(flight.depAbsMin)
    ) return;

    /* ============================
       🔒 DEDUP (SAFE)
       ============================ */
    window.ACS_ECON_ProcessedFlights =
      window.ACS_ECON_ProcessedFlights || new Set();

    const econKey = `${flight.aircraftId}|${flight.depAbsMin}`;
    if (window.ACS_ECON_ProcessedFlights.has(econKey)) return;
    window.ACS_ECON_ProcessedFlights.add(econKey);

    /* ============================
       ✈️ AIRCRAFT (REAL FLEET)
       ============================ */
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const ac = fleet.find(a => a.id === flight.aircraftId);
    if (!ac) return;

    /* ============================
       ⏱ SIM TIME
       ============================ */
    const simTime =
      window.ACS_TIME?.currentTime instanceof Date
        ? window.ACS_TIME.currentTime
        : new Date();

    /* ============================
       🧍 PASSENGERS (PAX ENGINE)
       ============================ */
    if (!window.ACS_PAX || typeof ACS_PAX.calculate !== "function") return;

    const paxData = ACS_PAX.calculate({
      route: { distanceNM: flight.distanceNM },
      time: {
        hour: simTime.getUTCHours(),
        year: simTime.getUTCFullYear()
      },
      aircraft: {
        seats: ac.seats || 0,
        comfortIndex: ac.comfortIndex || 1.0
      }
    });

    const pax = Number(paxData?.pax || 0);
    if (pax <= 0) return;

    /* ============================
       💵 TICKET MODEL
       ============================ */
    let ticket = 90;
    if (flight.distanceNM > 3000) ticket = 220;
    else if (flight.distanceNM > 1200) ticket = 150;
    else if (flight.distanceNM > 500)  ticket = 90;

    if (simTime.getUTCFullYear() < 1960) {
      ticket = Math.round(ticket * 0.6);
    }

    const revenue = Math.round(pax * ticket);
    if (revenue <= 0) return;

    /* ============================
       💰 FINANCE (CANONICAL)
       ============================ */
    if (typeof window.ACS_registerIncome === "function") {
      ACS_registerIncome(
        "routes",
        {
          amount: revenue,
          pax,
          distanceNM: flight.distanceNM,
          aircraftId: ac.id,
          origin: flight.origin,
          destination: flight.destination
        },
        `AUTO FLIGHT ${flight.origin} → ${flight.destination}`
      );
    }

    /* ============================
       📡 ECON EVENT (UI / STATS)
       ============================ */
    window.dispatchEvent(
      new CustomEvent("ACS_FLIGHT_ECONOMICS", {
        detail: {
          flightId: flight.flightId,
          aircraftId: ac.id,
          origin: flight.origin,
          destination: flight.destination,
          pax,
          distanceNM: flight.distanceNM,
          revenue,
          simTime
        }
      })
    );

    console.log(
      "%c💰 ECON FLIGHT PROCESSED",
      "color:#00ff88;font-weight:bold;",
      {
        aircraft: ac.id,
        route: `${flight.origin} → ${flight.destination}`,
        pax,
        revenue
      }
    );

  } catch (err) {
    console.error("❌ ACS_FLIGHT_ECONOMICS ERROR", err);
  }
});

/* ============================================================
   🟧 A3 — ECON → ARRIVAL STORAGE LISTENER (CROSS-TAB)
   ------------------------------------------------------------
   • Escucha arrivals vía localStorage (SkyTrack → Finance)
   • Convierte arrival en evento ECON local
   • NO suma dinero aquí
   • SOLO emite ACS_FLIGHT_ECONOMICS
   ============================================================ */

(function ACS_ECON_StorageArrivalListener(){

  const ARRIVAL_KEYS = [
    "ACS__FLIGHT_ARRIVAL_BRIDGE_V1",
    "ACS__ARRIVAL_BRIDGE_V1"
  ];

  function safeNum(v, fb = 0){
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  }

  function normalizeArrival(raw){
    if (!raw) return null;

    return {
      flightId: raw.flightId || raw.id || null,
      aircraftId: raw.aircraftId || raw.acId || null,
      origin: raw.origin || raw.from || null,
      destination: raw.destination || raw.to || null,
      distanceNM: safeNum(raw.distanceNM ?? raw.distance ?? raw.distNM, 0),
      pax: safeNum(raw.pax, null),
      revenue: safeNum(raw.revenue, null),
      ts: Date.now()
    };
  }

  window.addEventListener("storage", (e) => {
    if (!e || !ARRIVAL_KEYS.includes(e.key) || !e.newValue) return;

    let raw;
    try {
      raw = JSON.parse(e.newValue);
    } catch {
      return;
    }

    const arrival = normalizeArrival(raw);
    if (
      !arrival ||
      !arrival.flightId ||
      !arrival.aircraftId ||
      !arrival.origin ||
      !arrival.destination
    ) return;

    console.log(
      "%c📡 ECON STORAGE ARRIVAL → EVENT",
      "color:#00ff80;font-weight:bold;",
      arrival
    );

    // 👉 EVENTO ECONÓMICO LOCAL (UI / STATS)
    window.dispatchEvent(
      new CustomEvent("ACS_FLIGHT_ECONOMICS", {
        detail: arrival
      })
    );
  });

  console.log("🟧 [ECON] Storage Arrival Listener armed");

})();

/* ============================================================
   🔗 SKYTRACK → ECONOMICS BRIDGE (CANONICAL)
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ARRIVAL", function (ev) {

  const d = ev?.detail;
  if (!d) return;

  console.log("💰 ECON BRIDGE ARRIVAL", d);

  // Payload mínimo garantizado
  const payload = {
    flightId: d.flightId,
    aircraftId: d.aircraftId,
    origin: d.origin,
    destination: d.destination,
    distanceNM: Number(d.distanceNM || 0),
    depAbsMin: Number(d.depAbsMin || 0)
  };

  // Re-emite evento económico REAL
  window.dispatchEvent(
    new CustomEvent("ACS_FLIGHT_ECONOMICS", { detail: payload })
  );
});

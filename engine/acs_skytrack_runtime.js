/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME (FR24 CORE)
   Project: Aviation Capital Simulator (ACS)
   Module: SkyTrack Runtime
   Version: vA0 — FULL STABILIZER (Map Ready + Real ScheduleItems)
   Date: 2026-01-02

   PURPOSE:
   - Consumir SOLO localStorage.scheduleItems (real)
   - Publicar snapshots consistentes a UI: "ACS_SKYTRACK_LIVE"
   - Dibujar markers cuando Leaflet map esté listo
   - Ground siempre visible + EnRoute cuando corresponda
   - CERO vuelos inventados
   ============================================================ */

(function () {
  "use strict";

  /* ==========================
     GLOBAL STATE
     ========================== */
  const ACS_SkyTrack = {
    initialized: false,
    markersReady: false,
    markers: {},
    lastSnapshot: null,
    tickHandle: null,
  };

  // Expose (debug)
  window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = null;

  /* ==========================
     SAFE HELPERS
     ========================== */
  function safeJSONParse(str, fallback) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }

  function hhmmToMin(hhmm) {
    if (!hhmm || typeof hhmm !== "string") return null;
    const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp01(x) {
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  function getWorldAirport(icao) {
    if (!icao || !window.WorldAirportsACS) return null;
    const ap = window.WorldAirportsACS[String(icao).trim().toUpperCase()];
    if (!ap) return null;
    const lat = Number(ap.lat);
    const lng = Number(ap.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, icao: String(icao).trim().toUpperCase() };
  }

  /* ==========================
     TIME SOURCE (best-effort)
     ========================== */
  function getNowMinutes() {
    // Prefer a game time object if you have one later; for now: use real local time.
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  /* ==========================
     DATA: scheduleItems (REAL)
     ========================== */
  function loadScheduleItems() {
    // You confirmed all flights are here:
    // localStorage.getItem("scheduleItems")
    const raw = localStorage.getItem("scheduleItems");
    const items = safeJSONParse(raw, []);
    return Array.isArray(items) ? items : [];
  }

  function normalizeScheduleItem(f) {
    // Expected from your console:
    // { id, aircraftId, modelKey, aircraft, origin, destination, departure, arrival, days, ... }
    const origin = (f.origin || "").trim().toUpperCase();
    const destination = (f.destination || "").trim().toUpperCase();
    const depMin = hhmmToMin(f.departure);
    const arrMin = hhmmToMin(f.arrival);

    const registration =
      (f.registration || f.reg || f.tail || "").trim().toUpperCase() ||
      // If no explicit reg exists, keep aircraftId internal but display model + reg later
      "";

    const model =
      (f.model || f.aircraft || f.modelKey || "").toString().trim().toUpperCase() || "—";

    const aircraftId = (f.aircraftId || "").toString().trim();

    return {
      id: (f.id || "").toString(),
      aircraftId,
      origin,
      destination,
      depMin,
      arrMin,
      departure: (f.departure || "").toString(),
      arrival: (f.arrival || "").toString(),
      days: f.days || null,
      model,
      registration,
      _raw: f
    };
  }

  function groupByAircraft(items) {
    const map = {};
    items.forEach((it) => {
      const key = it.aircraftId || it.registration || it.id || "UNKNOWN";
      if (!map[key]) map[key] = [];
      map[key].push(it);
    });
    // sort each aircraft legs by departure time if available
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const da = a.depMin ?? 99999;
        const db = b.depMin ?? 99999;
        return da - db;
      });
    });
    return map;
  }

  /* ==========================
     STATE SOLVER (GROUND / EN_ROUTE)
     ========================== */
  function solveStateAndPosition(leg, nowMin) {
    // If dep/arr missing -> keep as ground at origin (if possible)
    const originAp = getWorldAirport(leg.origin);
    const destAp = getWorldAirport(leg.destination);

    if (!originAp) {
      return { state: "GROUND", lat: null, lng: null, where: leg.origin || "—" };
    }

    // No times -> ground at origin
    if (!Number.isFinite(leg.depMin) || !Number.isFinite(leg.arrMin) || !destAp) {
      return { state: "GROUND", lat: originAp.lat, lng: originAp.lng, where: leg.origin };
    }

    const dep = leg.depMin;
    const arr = leg.arrMin;

    // Handle overnight (arr < dep)
    const overnight = arr < dep;

    // Normalize now/arr for overnight
    let nowAdj = nowMin;
    let depAdj = dep;
    let arrAdj = arr;

    if (overnight) {
      // treat arrival as next day
      arrAdj = arr + 1440;
      // if now is before dep, treat now as next-day range?
      // best simple approach:
      if (nowMin < dep) nowAdj = nowMin + 1440;
    }

    // EN ROUTE window
    if (nowAdj >= depAdj && nowAdj <= arrAdj) {
      const t = clamp01((nowAdj - depAdj) / Math.max(1, (arrAdj - depAdj)));
      const lat = lerp(originAp.lat, destAp.lat, t);
      const lng = lerp(originAp.lng, destAp.lng, t);
      return { state: "EN_ROUTE", lat, lng, where: `${leg.origin}→${leg.destination}` };
    }

    // After arrival -> on ground at destination
    if (nowAdj > arrAdj) {
      return { state: "GROUND", lat: destAp.lat, lng: destAp.lng, where: leg.destination };
    }

    // Before departure -> on ground at origin
    return { state: "GROUND", lat: originAp.lat, lng: originAp.lng, where: leg.origin };
  }

  /* ==========================
     BUILD SNAPSHOT (REAL)
     ========================== */
  function buildSnapshot(nowMin) {
    const raw = loadScheduleItems();
    const norm = raw.map(normalizeScheduleItem);

    // Keep only items that have at least origin
    const valid = norm.filter((x) => x.origin);

    const byAircraft = groupByAircraft(valid);
    const snapshot = [];

    Object.keys(byAircraft).forEach((k) => {
      const legs = byAircraft[k];

      // Pick "current" leg as the one whose dep/arr window is closest / active
      // Strategy:
      // 1) If any leg EN_ROUTE now -> choose that
      // 2) else choose next departure leg (smallest dep >= now), else first leg
      let chosen = null;

      // 1) active enroute
      for (const leg of legs) {
        if (Number.isFinite(leg.depMin) && Number.isFinite(leg.arrMin)) {
          const dep = leg.depMin;
          const arr = leg.arrMin;
          const overnight = arr < dep;
          let nowAdj = nowMin;
          let depAdj = dep;
          let arrAdj = arr;
          if (overnight) {
            arrAdj = arr + 1440;
            if (nowMin < dep) nowAdj = nowMin + 1440;
          }
          if (nowAdj >= depAdj && nowAdj <= arrAdj) {
            chosen = leg;
            break;
          }
        }
      }

      // 2) next departure today (best-effort)
      if (!chosen) {
        let best = null;
        let bestDelta = Infinity;

        for (const leg of legs) {
          if (!Number.isFinite(leg.depMin)) continue;
          const delta = leg.depMin - nowMin;
          if (delta >= 0 && delta < bestDelta) {
            bestDelta = delta;
            best = leg;
          }
        }

        chosen = best || legs[0] || null;
      }

      if (!chosen) return;

      const solved = solveStateAndPosition(chosen, nowMin);

      // Route label (ALWAYS show full route if we have it)
      const routeLabel =
        chosen.origin && chosen.destination
          ? `${chosen.origin} → ${chosen.destination}`
          : (solved.where || chosen.origin || "—");

      // Registration visible if exists; otherwise keep blank (user asked aircraftId transparent)
      const registration = chosen.registration || ""; // keep empty if not provided
      const model = chosen.model || "—";

      snapshot.push({
        aircraftId: chosen.aircraftId || k,
        registration,
        model,
        state: solved.state,
        route: routeLabel,
        origin: chosen.origin || null,
        destination: chosen.destination || null,
        departure: chosen.departure || null,
        arrival: chosen.arrival || null,
        lat: solved.lat,
        lng: solved.lng
      });
    });

    return snapshot;
  }

  /* ==========================
     PUBLISH SNAPSHOT -> UI
     ========================== */
  function publishSnapshot(snapshot) {
    ACS_SkyTrack.lastSnapshot = snapshot;
    window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = snapshot;

    window.dispatchEvent(
      new CustomEvent("ACS_SKYTRACK_LIVE", { detail: snapshot })
    );
  }

  /* ==========================
     MAP MARKERS (FR24 CORE)
     ========================== */
  function ensureMarkersLayer() {
    if (ACS_SkyTrack.markersReady) return true;

    if (!window.ACS_SkyTrack_Map) {
      // wait
      return false;
    }

    if (!window.L) {
      console.warn("🟡 Leaflet not available");
      return false;
    }

    ACS_SkyTrack.markersReady = true;
    return true;
  }

  function iconForState(state) {
    // Small, readable FR24-like markers
    if (state === "EN_ROUTE") {
      return L.divIcon({
        className: "acs-aircraft-icon",
        html: `<div style="
          width:16px;height:16px;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;
          filter: drop-shadow(0 0 4px rgba(0,0,0,.6));
        ">✈️</div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
    }

    // Ground square
    return L.divIcon({
      className: "acs-ground-aircraft",
      html: `<div style="
        width:14px;height:14px;
        background:#0b3cff;
        border:2px solid #001a66;
        border-radius:3px;
        box-shadow:0 0 6px rgba(0,0,0,.6);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  }

  function markerKey(item) {
    // If registration missing, fallback to aircraftId (still internal but key only)
    return (item.registration && item.registration.trim()) ? item.registration.trim() : (item.aircraftId || "UNKNOWN");
  }

  function upsertMarkers(snapshot) {
    if (!ensureMarkersLayer()) return;

    const map = window.ACS_SkyTrack_Map;
    const alive = {};

    snapshot.forEach((item) => {
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;

      const key = markerKey(item);
      alive[key] = true;

      let m = ACS_SkyTrack.markers[key];
      const icon = iconForState(item.state);

      const titleLine = (item.registration && item.registration.trim())
        ? item.registration.trim()
        : `${item.model || "AIRCRAFT"}`;

      const tip = [
        `<strong>${titleLine}</strong>`,
        `${item.route || "—"}`,
        `${item.state || "—"}`,
        (item.departure && item.arrival) ? `DEP ${item.departure} · ARR ${item.arrival}` : ""
      ].filter(Boolean).join("<br>");

      if (!m) {
        m = L.marker([item.lat, item.lng], { icon }).addTo(map);
        ACS_SkyTrack.markers[key] = m;
      } else {
        m.setLatLng([item.lat, item.lng]);
        m.setIcon(icon);
      }

      m.bindTooltip(tip, { direction: "top", offset: [0, -8] });
    });

    // Remove stale markers
    Object.keys(ACS_SkyTrack.markers).forEach((k) => {
      if (!alive[k]) {
        try {
          window.ACS_SkyTrack_Map.removeLayer(ACS_SkyTrack.markers[k]);
        } catch (e) {}
        delete ACS_SkyTrack.markers[k];
      }
    });
  }

  /* ==========================
     MAP READY REPLAY
     ========================== */
  function waitForMapReadyReplay() {
    const t = setInterval(() => {
      if (window.ACS_SkyTrack_Map && window.L) {
        clearInterval(t);

        // Replay last snapshot once map is ready
        if (Array.isArray(ACS_SkyTrack.lastSnapshot)) {
          console.log("🧭 SkyTrack Map READY — Replaying snapshot", ACS_SkyTrack.lastSnapshot);
          upsertMarkers(ACS_SkyTrack.lastSnapshot);
        }
      }
    }, 250);
  }

  /* ==========================
     MAIN LOOP
     ========================== */
  function startTick() {
    if (ACS_SkyTrack.tickHandle) return;

    ACS_SkyTrack.tickHandle = setInterval(() => {
      const nowMin = getNowMinutes();
      const snapshot = buildSnapshot(nowMin);

      publishSnapshot(snapshot);

      // If map is ready, paint
      if (window.ACS_SkyTrack_Map && window.L) {
        upsertMarkers(snapshot);
      }
    }, 1000);
  }

  /* ==========================
     ENTRY POINT
     ========================== */
  function ACS_SkyTrack_init() {
    if (ACS_SkyTrack.initialized) return;
    ACS_SkyTrack.initialized = true;

    console.log("✈️ SkyTrack Runtime initialized (FR24 core)");

    // First publish immediately
    const snapshot = buildSnapshot(getNowMinutes());
    publishSnapshot(snapshot);

    // Map-ready replay watcher
    waitForMapReadyReplay();

    // Start loop
    startTick();
  }

  // Auto-init
  ACS_SkyTrack_init();

})();

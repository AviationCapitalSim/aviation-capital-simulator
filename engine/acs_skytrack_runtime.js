/* ============================================================
   ✈️ SKYTRACK FR24 CORE — SINGLE SOURCE OF TRUTH
   Project: Aviation Capital Simulator (ACS)
   Mode: FR24 (Ground + Air always visible)
   Time source: registerTimeListener(fn)
   Data source: localStorage.scheduleItems (REAL)
   ============================================================ */

(function () {
  "use strict";

  /* ==========================
     GLOBAL STATE
     ========================== */
  const SkyTrack = {
    initialized: false,
    mapReady: false,
    markers: {},
    lastSnapshot: []
  };

  window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = [];

  /* ==========================
     HELPERS
     ========================== */
  function hhmmToMin(hm) {
    if (!hm || typeof hm !== "string") return null;
    const m = hm.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function getAirport(icao) {
    if (!window.WorldAirportsACS) return null;
    const ap = WorldAirportsACS[String(icao || "").toUpperCase()];
    if (!ap) return null;
    const lat = Number(ap.lat);
    const lng = Number(ap.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function safeParse(json, fb) {
    try { return JSON.parse(json); } catch { return fb; }
  }

  /* ==========================
     ICONS (FR24 STYLE)
     ========================== */
  function iconAir() {
    return L.divIcon({
      html: `<div style="
        width:16px;height:16px;display:flex;align-items:center;justify-content:center;
        filter: drop-shadow(0 0 4px rgba(0,0,0,.6));
      ">✈️</div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }

  function iconGround() {
    return L.divIcon({
      html: `<div style="
        width:14px;height:14px;background:#0b3cff;
        border:2px solid #001a66;border-radius:3px;
        box-shadow:0 0 6px rgba(0,0,0,.6);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  }

  /* ==========================
     MAP READY HANDSHAKE
     ========================== */
  function waitForMapReady() {
    const t = setInterval(() => {
      if (window.ACS_SkyTrack_Map && window.L) {
        clearInterval(t);
        SkyTrack.mapReady = true;
        // Replay last snapshot once map is ready
        renderMarkers(SkyTrack.lastSnapshot);
      }
    }, 200);
  }

  /* ==========================
     SNAPSHOT BUILDER (REAL)
     ========================== */
  function buildSnapshot(nowMin) {
    const raw = safeParse(localStorage.getItem("scheduleItems"), []);
    const items = Array.isArray(raw) ? raw : [];
    const byAircraft = {};

    items.forEach(f => {
      if (!f.origin || !f.destination) return;
      const key = f.aircraftId || f.registration || f.id || "UNKNOWN";
      if (!byAircraft[key]) byAircraft[key] = [];
      byAircraft[key].push(f);
    });

    const snapshot = [];

    Object.keys(byAircraft).forEach(key => {
      const legs = byAircraft[key].slice().sort((a,b) =>
        (hhmmToMin(a.departure)||99999) - (hhmmToMin(b.departure)||99999)
      );

      // choose active leg by time; else next; else first
      let chosen = null;
      for (const l of legs) {
        const d = hhmmToMin(l.departure);
        const a = hhmmToMin(l.arrival);
        if (d==null || a==null) continue;
        let now = nowMin, dep=d, arr=a;
        if (a < d) { arr = a + 1440; if (now < d) now += 1440; }
        if (now >= dep && now <= arr) { chosen = l; break; }
      }
      if (!chosen) {
        chosen = legs.find(l => (hhmmToMin(l.departure)||99999) >= nowMin) || legs[0];
      }
      if (!chosen) return;

      const depMin = hhmmToMin(chosen.departure);
      const arrMin = hhmmToMin(chosen.arrival);
      const o = getAirport(chosen.origin);
      const d = getAirport(chosen.destination);

      let state = "GROUND";
      let lat = o ? o.lat : null;
      let lng = o ? o.lng : null;

      if (o && d && depMin!=null && arrMin!=null) {
        let now = nowMin, dep=depMin, arr=arrMin;
        if (arr < dep) { arr = arrMin + 1440; if (now < depMin) now += 1440; }
        if (now >= dep && now <= arr) {
          state = "EN_ROUTE";
          const t = clamp01((now - dep) / Math.max(1, (arr - dep)));
          lat = lerp(o.lat, d.lat, t);
          lng = lerp(o.lng, d.lng, t);
        } else if (now > arr) {
          lat = d.lat; lng = d.lng;
        }
      }

      snapshot.push({
        aircraftId: chosen.aircraftId || key,
        registration: chosen.registration || "",
        model: chosen.model || chosen.aircraft || chosen.modelKey || "—",
        origin: chosen.origin,
        destination: chosen.destination,
        departure: chosen.departure,
        arrival: chosen.arrival,
        route: `${chosen.origin} → ${chosen.destination}`,
        state,
        lat, lng
      });
    });

    return snapshot;
  }

  /* ==========================
     MARKER RENDER
     ========================== */
  function renderMarkers(snapshot) {
    if (!SkyTrack.mapReady || !Array.isArray(snapshot)) return;
    const map = window.ACS_SkyTrack_Map;
    const alive = {};

    snapshot.forEach(it => {
      if (!Number.isFinite(it.lat) || !Number.isFinite(it.lng)) return;
      const key = it.registration || it.aircraftId || "UNKNOWN";
      alive[key] = true;

      let m = SkyTrack.markers[key];
      const icon = it.state === "EN_ROUTE" ? iconAir() : iconGround();

      const tip = [
        `<strong>${it.registration || it.model}</strong>`,
        it.route,
        it.state,
        it.departure && it.arrival ? `DEP ${it.departure} · ARR ${it.arrival}` : ""
      ].filter(Boolean).join("<br>");

      if (!m) {
        m = L.marker([it.lat, it.lng], { icon }).addTo(map);
        SkyTrack.markers[key] = m;
      } else {
        m.setLatLng([it.lat, it.lng]);
        m.setIcon(icon);
      }
      m.bindTooltip(tip, { direction: "top", offset: [0, -8] });
    });

    Object.keys(SkyTrack.markers).forEach(k => {
      if (!alive[k]) {
        map.removeLayer(SkyTrack.markers[k]);
        delete SkyTrack.markers[k];
      }
    });
  }

  /* ==========================
     TIME LISTENER (FR24 CORE)
     ========================== */
  function onTimeTick(currentTime) {
    // currentTime comes from time_engine via registerTimeListener
    const nowMin = (currentTime && currentTime.hh != null && currentTime.mm != null)
      ? (currentTime.hh * 60 + currentTime.mm)
      : null;

    if (nowMin == null) return;

    const snapshot = buildSnapshot(nowMin);
    SkyTrack.lastSnapshot = snapshot;
    window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = snapshot;

    window.dispatchEvent(new CustomEvent("ACS_SKYTRACK_LIVE", { detail: snapshot }));
    renderMarkers(snapshot);
  }

  /* ==========================
     INIT
     ========================== */
  function init() {
    if (SkyTrack.initialized) return;
    SkyTrack.initialized = true;

    console.log("✈️ SkyTrack FR24 Core initialized");

    waitForMapReady();

    // 🔔 THIS IS THE KEY
    if (typeof registerTimeListener === "function") {
      registerTimeListener(onTimeTick);
    } else {
      console.warn("SkyTrack: registerTimeListener not found");
    }
  }

  init();

})();

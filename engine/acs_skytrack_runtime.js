/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME — FR24 CORE (SINGLE BLOCK)
   Project: Aviation Capital Simulator (ACS)
   Mode: FR24-style (GROUND + AIR always visible)
   Time Source: registerTimeListener(fn)
   Data Source: localStorage.scheduleItems
   ============================================================ */

(function () {
  "use strict";

  /* ------------------------------------------------------------
     INTERNAL STATE
     ------------------------------------------------------------ */
  const markers = {};
  let mapReady = false;
  let lastSnapshot = [];

  /* ------------------------------------------------------------
     MAP READY CHECK
     ------------------------------------------------------------ */
  function waitForMap() {
    if (window.ACS_SkyTrack_Map && window.WorldAirportsACS) {
      mapReady = true;
      replaySnapshot();
      return;
    }
    setTimeout(waitForMap, 300);
  }

  /* ------------------------------------------------------------
     ICONS
     ------------------------------------------------------------ */
  const airIcon = L.divIcon({
    className: "acs-aircraft-air",
    html: "✈️",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const groundIcon = L.divIcon({
    className: "acs-aircraft-ground",
    html: `<div style="
      width:14px;
      height:14px;
      background:#0b3cff;
      border:2px solid #001a66;
      border-radius:3px;
      box-shadow:0 0 6px rgba(0,0,0,.6);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  /* ------------------------------------------------------------
     UTILS
     ------------------------------------------------------------ */
  function toMinutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function interpolate(a, b, t) {
    return a + (b - a) * t;
  }

  /* ------------------------------------------------------------
     BUILD SNAPSHOT FROM SCHEDULE
     ------------------------------------------------------------ */
  function buildSnapshot(gameDate) {
    const items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    const nowMin = gameDate.getHours() * 60 + gameDate.getMinutes();
    const snapshot = [];

    items.forEach(f => {
      if (!f.origin || !f.destination) return;

      const dep = toMinutes(f.departure);
      const arr = toMinutes(f.arrival);
      if (dep === null || arr === null) return;

      const originAP = WorldAirportsACS[f.origin];
      const destAP = WorldAirportsACS[f.destination];
      if (!originAP || !destAP) return;

      let state = "GROUND";
      let lat = originAP.lat;
      let lng = originAP.lng;
      let icon = groundIcon;

      if (nowMin >= dep && nowMin <= arr) {
        const t = (nowMin - dep) / Math.max(arr - dep, 1);
        lat = interpolate(originAP.lat, destAP.lat, t);
        lng = interpolate(originAP.lng, destAP.lng, t);
        state = "EN_ROUTE";
        icon = airIcon;
      } else if (nowMin > arr) {
        lat = destAP.lat;
        lng = destAP.lng;
      }

      snapshot.push({
        key: f.id || `${f.aircraftId}-${f.departure}`,
        aircraft: f.aircraft || f.modelKey || "Aircraft",
        origin: f.origin,
        destination: f.destination,
        state,
        lat,
        lng,
        icon,
      });
    });

    return snapshot;
  }

  /* ------------------------------------------------------------
     RENDER SNAPSHOT
     ------------------------------------------------------------ */
  function renderSnapshot(snapshot) {
    if (!mapReady) return;

    snapshot.forEach(item => {
      let m = markers[item.key];
      if (!m) {
        m = L.marker([item.lat, item.lng], { icon: item.icon })
          .addTo(window.ACS_SkyTrack_Map)
          .bindTooltip(
            `<strong>${item.aircraft}</strong><br>
             ${item.origin} → ${item.destination}<br>
             ${item.state}`,
            { direction: "top", offset: [0, -8] }
          );
        markers[item.key] = m;
      } else {
        m.setLatLng([item.lat, item.lng]);
        m.setIcon(item.icon);
      }
    });
  }

  /* ------------------------------------------------------------
     REPLAY (MAP READY AFTER SNAPSHOT)
     ------------------------------------------------------------ */
  function replaySnapshot() {
    if (lastSnapshot.length) {
      renderSnapshot(lastSnapshot);
    }
  }

  /* ------------------------------------------------------------
     TIME ENGINE HOOK (REAL, EXISTING)
     ------------------------------------------------------------ */
  if (typeof registerTimeListener === "function") {
    registerTimeListener(gameDate => {
      lastSnapshot = buildSnapshot(gameDate);
      window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = lastSnapshot;
      renderSnapshot(lastSnapshot);
    });
  } else {
    console.error("❌ registerTimeListener NOT FOUND");
  }

  /* ------------------------------------------------------------
     INIT
     ------------------------------------------------------------ */
  console.log("✈️ SkyTrack FR24 Core initialized");
  waitForMap();

})();

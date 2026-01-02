/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME — FR24 BASE CORE
   Project: Aviation Capital Simulator (ACS)
   File: engine/acs_skytrack_runtime.js
   Mode: REAL scheduleItems + Game Clock
   ============================================================ */

/* ============================================================
   🟦 GLOBAL STATE
   ============================================================ */
window.ACS_SkyTrack = {
  initialized: false,
  markers: [],
  lastSnapshot: null
};

/* ============================================================
   🟦 ENTRY POINT
   ============================================================ */
function ACS_SkyTrack_init() {
  if (ACS_SkyTrack.initialized) return;
  ACS_SkyTrack.initialized = true;

  console.log("✈️ SkyTrack FR24 Core initialized");

  if (typeof registerTimeListener !== "function") {
    console.error("❌ registerTimeListener NOT found");
    return;
  }

  registerTimeListener(ACS_SkyTrack_onTick);
}

/* ============================================================
   🟦 TIME TICK HANDLER (SINGLE SOURCE OF TRUTH)
   ============================================================ */
function ACS_SkyTrack_onTick(gameDate) {
  if (!window.ACS_SkyTrack_Map || typeof L === "undefined") {
    console.warn("🟡 SkyTrack Map not ready for markers");
    return;
  }

  const map = window.ACS_SkyTrack_Map;

  // Clear previous markers
  ACS_SkyTrack.markers.forEach(m => map.removeLayer(m));
  ACS_SkyTrack.markers = [];

  const raw = localStorage.getItem("scheduleItems");
  if (!raw) {
    console.warn("🟡 No scheduleItems in localStorage");
    return;
  }

  let flights;
  try {
    flights = JSON.parse(raw);
  } catch (e) {
    console.error("❌ scheduleItems JSON invalid", e);
    return;
  }

  if (!Array.isArray(flights) || flights.length === 0) {
    console.warn("🟡 scheduleItems empty");
    return;
  }

  const nowMin =
    gameDate.getUTCHours() * 60 +
    gameDate.getUTCMinutes();

  let visible = 0;
  let bounds = [];

  flights.forEach(f => {
    if (!f.origin || !f.destination || !f.departure || !f.arrival) return;

    const dep = timeToMin(f.departure);
    const arr = timeToMin(f.arrival);

    let status = null;
    let latlng = null;

    // 🟢 GROUND
    if (nowMin < dep) {
      const ap = getAirport(f.origin);
      if (!ap) return;
      status = "GROUND";
      latlng = [ap.lat, ap.lon];
    }

    // ✈️ AIR
    if (nowMin >= dep && nowMin < arr) {
      const a = getAirport(f.origin);
      const b = getAirport(f.destination);
      if (!a || !b) return;

      const ratio = (nowMin - dep) / (arr - dep);
      latlng = [
        a.lat + (b.lat - a.lat) * ratio,
        a.lon + (b.lon - a.lon) * ratio
      ];
      status = "AIR";
    }

    if (!latlng) return;

    const marker = L.circleMarker(latlng, {
      radius: status === "AIR" ? 6 : 5,
      color: status === "AIR" ? "#00ffcc" : "#3b82f6",
      weight: 2,
      fillOpacity: 0.9
    }).addTo(map);

    marker.bindTooltip(
      `${f.origin} → ${f.destination}<br>${status}`,
      { direction: "top" }
    );

    ACS_SkyTrack.markers.push(marker);
    bounds.push(latlng);
    visible++;
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [60, 60] });
  }

  console.log(
    `[SKYTRACK] ${gameDate.toUTCString()} | visible=${visible}`
  );
}

/* ============================================================
   🟦 HELPERS
   ============================================================ */
function timeToMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function getAirport(icao) {
  if (!window.WorldAirportsACS) return null;
  return WorldAirportsACS[icao] || null;
}

/* ============================================================
   🟦 AUTO INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", ACS_SkyTrack_init);

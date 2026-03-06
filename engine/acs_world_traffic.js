/* ============================================================
   🌍 ACS WORLD TRAFFIC ENGINE
   Obtiene vuelos del servidor global y los adapta a SkyTrack
   ============================================================ */

(function(){

const WORLD_SERVER =
"https://acs-world-server-production.up.railway.app/v1/flights";

async function ACS_fetchWorldFlights(){

  try{

    const map = window.ACS_SkyTrack_Map;

    if(!map){
      console.warn("🌍 Map not ready");
      return [];
    }

    const bounds = map.getBounds();

    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLng = bounds.getWest();
    const maxLng = bounds.getEast();

    const url =
      `${WORLD_SERVER}?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}`;

    const res = await fetch(url);
    const data = await res.json();

    if(Array.isArray(data)) return data;

    if(Array.isArray(data.flights)) return data.flights;

    return [];

  }catch(err){

    console.warn("🌍 World flights fetch error:", err);
    return [];

  }

}
window.ACS_fetchWorldFlights = ACS_fetchWorldFlights;

})();

/* ============================================================
   🟧 W2 — WORLD FLIGHT → SKYTRACK SNAPSHOT ITEM
   ============================================================ */

function ACS_convertWorldFlight(f){

  const now = window.ACS_TIME?.absMin;

  if(now == null) return null;

  const dep = Number(f.dep_time);
  const arr = Number(f.arr_time);

  if(!Number.isFinite(dep) || !Number.isFinite(arr)) return null;

  if(arr <= dep) return null;

  let progress = (now - dep) / (arr - dep);

  progress = Math.max(0, Math.min(1, progress));

  return {

    aircraftId: "WORLD_" + f.flight_id,

    flightNumber: f.flight_number || "WORLD",

    originICAO: f.origin,

    destinationICAO: f.destination,

    state: progress >= 1 ? "GROUND" : "EN_ROUTE",

    position: {
      progress: progress
    }

  };

}

/* ============================================================
   🌍 BUILD WORLD SNAPSHOT
   ============================================================ */

async function ACS_buildWorldSnapshot(){

  const flights = await window.ACS_fetchWorldFlights();

  const snapshot = [];

  flights.forEach(f => {

    const item = ACS_convertWorldFlight(f);

    if(item) snapshot.push(item);

  });

  return snapshot;

}

window.ACS_buildWorldSnapshot = ACS_buildWorldSnapshot;

/* ============================================================
   🟧 W3 — MERGE WORLD TRAFFIC WITH SKYTRACK SNAPSHOT
   ============================================================ */

(function(){

window.addEventListener("ACS_SKYTRACK_SNAPSHOT", async function(e){

  const localSnapshot = e.detail || [];

  try{

    const worldFlights = await window.ACS_buildWorldSnapshot();

    const merged = [
      ...localSnapshot,
      ...worldFlights
    ];

    e.detail.length = 0;
    merged.forEach(v => e.detail.push(v));

  }catch(err){

    console.warn("🌍 World traffic merge error:", err);

  }

});

console.log("🌍 W3 World Snapshot Merge Active");

})();

/* ============================================================
   🟧 W4 — WORLD SNAPSHOT INJECTOR
   ============================================================ */

(function(){

let worldCache = [];

/* actualizar cache cada 10s */

async function updateWorldCache(){

  try{

    worldCache = await window.ACS_buildWorldSnapshot();

  }catch(err){

    console.warn("🌍 world cache error", err);

  }

}

setInterval(updateWorldCache,10000);

updateWorldCache();

/* merge con snapshot antes de render */

window.addEventListener("ACS_SKYTRACK_SNAPSHOT", function(e){

  if(!Array.isArray(e.detail)) return;

  worldCache.forEach(f => e.detail.push(f));

});

console.log("🌍 W4 World Traffic Injector active");

})();

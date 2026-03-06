/* ============================================================
   🌍 ACS WORLD TRAFFIC ENGINE
   Obtiene vuelos del servidor global y los adapta a SkyTrack
   ============================================================ */

(function(){

const WORLD_SERVER =
"https://acs-world-server-production.up.railway.app/v1/flights";

async function ACS_fetchWorldFlights(){

  try{

    const res = await fetch(WORLD_SERVER);
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
   ✈️ CONVERT WORLD FLIGHT → SKYTRACK SNAPSHOT ITEM
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

    aircraftId: "WORLD_"+f.flight_id,

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
   🔗 MERGE WORLD TRAFFIC WITH LOCAL SNAPSHOT
   ============================================================ */

(function(){

  const originalDispatch = window.dispatchEvent;

  window.dispatchEvent = async function(event){

    if(event?.type === "ACS_SKYTRACK_SNAPSHOT"){

      const localSnapshot = event.detail || [];

      try{

        const worldSnapshot = await window.ACS_buildWorldSnapshot();

        const merged = [
          ...localSnapshot,
          ...worldSnapshot
        ];

        event.detail = merged;

      }catch(e){
        console.warn("🌍 world merge error", e);
      }

    }

    return originalDispatch.call(this, event);

  };

})();

/* ============================================================
   🌍 ACS WORLD BRIDGE — SKYTRACK → WORLD SERVER
   ============================================================ */

console.log("🌍 ACS WORLD BRIDGE LOADED");

const WORLD_SERVER =
"https://acs-world-server-production.up.railway.app";

const ACTIVE_FLIGHTS = new Set();

/* ============================================================
   SEND DEPARTURE
   ============================================================ */

async function ACS_sendDeparture(flight){

  try{

    const body = {

      flight_id: flight.flightId,

      airline_id:
        localStorage.getItem("userIATA") || "UNK",

      flight_number:
        flight.flightNumber || null,

      aircraft_type:
        flight.aircraftType || null,

      origin: flight.origin,
      destination: flight.destination,

      // ✅ FIX: NO usar "|| null" porque 0 se vuelve null
      latitude:
        (flight.lat !== undefined && flight.lat !== null)
          ? Number(flight.lat)
          : null,

      longitude:
        (flight.lng !== undefined && flight.lng !== null)
          ? Number(flight.lng)
          : null,

      speed:
        (flight.speed !== undefined && flight.speed !== null)
          ? Number(flight.speed)
          : null,

      // ✅ FIX: NO usar "|| null" porque 0 se vuelve null
      dep_time:
        (flight.depAbsMin !== undefined && flight.depAbsMin !== null)
          ? Number(flight.depAbsMin)
          : null,

      arr_time:
        (flight.arrAbsMin !== undefined && flight.arrAbsMin !== null)
          ? Number(flight.arrAbsMin)
          : null,

      status: 1
    };

    const res = await fetch(
      WORLD_SERVER + "/v1/flight/departure",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body)
      }
    );

    // ✅ DEBUG: ver código y respuesta si falla
    if(!res.ok){
      const t = await res.text().catch(()=>"(no body)");
      console.warn("🌍 WORLD departure NOT OK", res.status, t, body);
      return;
    }

    console.log("🌍 WORLD DEPARTURE SENT:", flight.flightId);

  }
  catch(err){

    console.warn("WORLD departure failed", err);

  }

}

/* ============================================================
   SEND ARRIVAL
   ============================================================ */

async function ACS_sendArrival(flightId){

  try{

    const res = await fetch(
      WORLD_SERVER + "/v1/flight/arrival",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ flight_id: flightId })
      }
    );

    if(!res.ok){
      const t = await res.text().catch(()=>"(no body)");
      console.warn("🌍 WORLD arrival NOT OK", res.status, t, { flight_id: flightId });
      return;
    }

    ACTIVE_FLIGHTS.delete(flightId);

    console.log("🌍 WORLD ARRIVAL SENT:", flightId);

  }
  catch(err){

    console.warn("WORLD arrival failed", err);

  }

}

/* ============================================================
   LISTEN SKYTRACK SNAPSHOT
   ============================================================ */

window.addEventListener("ACS_SKYTRACK_SNAPSHOT", function(e){

  const snapshot = e.detail || [];

  if(!Array.isArray(snapshot)) return;

  snapshot.forEach(flight => {

    if(
      (flight.state === "EN_ROUTE" || flight.status === "EN_ROUTE") &&
      flight.flightId &&
      !ACTIVE_FLIGHTS.has(flight.flightId)
    ){

      ACTIVE_FLIGHTS.add(flight.flightId);

      ACS_sendDeparture(flight);

    }

  });

});

/* ============================================================
   LISTEN C3 FLIGHT EVENT (RUNTIME ROUTE EVENT)
   ============================================================ */

window.addEventListener("ACS_C3_EVENT", function(e){

  const d = e.detail;

  if(!d || !d.flightId) return;

  if(ACTIVE_FLIGHTS.has(d.flightId)) return;

  ACTIVE_FLIGHTS.add(d.flightId);

  ACS_sendDeparture({
    flightId: d.flightId,
    origin: d.origin,
    destination: d.destination,
    lat: null,
    lng: null,
    speed: 0,
    depAbsMin: d.depAbsMin,
    arrAbsMin: d.arrAbsMin
  });

});

/* ============================================================
   LISTEN ARRIVALS
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ARRIVAL", function(e){

  const d = e.detail;

  if(!d || !d.flightId) return;

  ACS_sendDeparture({
    flightId: d.flightId,
    origin: d.origin,
    destination: d.destination,
    lat: null,
    lng: null,
    speed: 0,
    depAbsMin: d.depAbsMin,
    arrAbsMin: d.arrAbsMin
  });

});

console.log("🌍 ACS WORLD BRIDGE READY");

/* ============================================================
   🌍 WORLD TRAFFIC FETCH
   ============================================================ */

async function ACS_fetchWorldFlights(){

  try{

    if(!window.map) return;

    const b = map.getBounds();

    const minLat = b.getSouth();
    const maxLat = b.getNorth();
    const minLng = b.getWest();
    const maxLng = b.getEast();

    const url =
      WORLD_SERVER +
      "/v1/flights?minLat=" + minLat +
      "&maxLat=" + maxLat +
      "&minLng=" + minLng +
      "&maxLng=" + maxLng;

    const res = await fetch(url);

    if(!res.ok){
      console.warn("WORLD flights fetch error");
      return;
    }

    const data = await res.json();

    console.log("🌍 WORLD TRAFFIC:", data.count);

    window.ACS_WORLD_FLIGHTS = data.flights;

  }
  catch(err){

    console.warn("WORLD flights failed", err);

  }

}

/* ============================================================
   AUTO REFRESH
   ============================================================ */

setInterval(ACS_fetchWorldFlights, 5000);

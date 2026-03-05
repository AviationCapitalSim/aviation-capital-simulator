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

      latitude: Number(flight.lat) || null,
      longitude: Number(flight.lng) || null,

      speed: Number(flight.speed) || null,

      dep_time: Number(flight.depAbsMin) || null,
      arr_time: Number(flight.arrAbsMin) || null,

      status: 1
    };

    await fetch(
      WORLD_SERVER + "/v1/flight/departure",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body)
      }
    );

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

    await fetch(
      WORLD_SERVER + "/v1/flight/arrival",
      {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ flight_id: flightId })
      }
    );

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

  setTimeout(()=>{
    ACS_sendArrival(d.flightId);
  },60000);

});

console.log("🌍 ACS WORLD BRIDGE READY");

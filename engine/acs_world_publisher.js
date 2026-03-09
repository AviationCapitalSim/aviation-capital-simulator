/* ============================================================
   🌍 ACS WORLD PUBLISHER
   Publica vuelos del jugador al servidor global
   ============================================================ */

(function(){

const SERVER =
"https://acs-world-server-production.up.railway.app/v1";

let lastFlights = {};

/* ============================================================
   AIRPORT INDEX LINK
   ============================================================ */

let AirportIndex = null;

document.addEventListener("ACS_AIRPORTS_READY", () => {

  AirportIndex = window.ACS_AIRPORT_INDEX;

  console.log(
 `[ACS] WorldAirportsACS loaded: ${Object.keys(AirportIndex).length} airports indexed`
);

window.ACS_AIRPORT_INDEX = AirportIndex;

document.dispatchEvent(
  new Event("ACS_AIRPORTS_READY")
);

});

/* ============================================================
   AIRLINE ID
   ============================================================ */

function getAirlineId(){

  try{

    const raw = localStorage.getItem("ACS_Airline");
    if(!raw) return null;

    const airline = JSON.parse(raw);

    return airline?.iata || null;

  }catch(e){

    return null;

  }

}

async function publishDeparture(item){

  const airline = getAirlineId();
  if(!airline) return;

  const now = Date.now();

  const flightId =
    item.aircraftId + "|" +
    item.originICAO + "|" +
    item.destinationICAO;

 const airport =
  AirportIndex && AirportIndex[item.originICAO]
    ? AirportIndex[item.originICAO]
    : null;

const lat = airport ? airport.latitude : null;
const lon = airport ? airport.longitude : null;

  try{

    await fetch(`${SERVER}/flight/departure`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({

        flight_id: flightId,

        airline_id: airline,

        flight_number: item.flightNumber || null,

        aircraft_type: item.model || null,

        origin: item.originICAO,

        destination: item.destinationICAO,

        latitude: lat,
        longitude: lon,
        speed: 0,

        dep_time: now,

        arr_time: now + 7200000,

        status:1

      })
    });

    console.log("🌍 WORLD departure sent", flightId);

  }catch(err){

    console.warn("WORLD departure publish failed",err);

  }

}
   
/* ============================================================
   FLIGHT ARRIVAL
   ============================================================ */

async function publishArrival(flightId){

  try{

    await fetch(`${SERVER}/flight/arrival`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        flight_id:flightId
      })
    });

  }catch(err){

    console.warn("WORLD arrival publish failed",err);

  }

}

/* ============================================================
   SNAPSHOT LISTENER
   ============================================================ */

window.addEventListener("ACS_SKYTRACK_SNAPSHOT",function(e){

  const snapshot = e.detail || [];

  snapshot.forEach(item => {

    if(!item.flightNumber) return;

    const id =
      item.aircraftId+"|"+
      item.originICAO+"|"+
      item.destinationICAO+"|"+
      item.depAbsMin;

    const prev = lastFlights[id];

    /* DESPEGUE */

    if(item.state==="EN_ROUTE" && !prev){

      publishDeparture(item);

      lastFlights[id] = true;

    }

    /* ATERRIZAJE */

    if(item.state==="GROUND" && prev){

      publishArrival(id);

      delete lastFlights[id];

    }

  });

});

console.log("🌍 ACS WORLD PUBLISHER READY");

})();

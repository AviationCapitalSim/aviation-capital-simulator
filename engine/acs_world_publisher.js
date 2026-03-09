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

let AirportIndex = window.ACS_AIRPORT_INDEX || null;

/* Si el índice ya existe lo usamos inmediatamente */

if (AirportIndex) {

  console.log(
    "🌍 WORLD Publisher linked immediately:",
    Object.keys(AirportIndex).length,
    "airports"
  );

}

/* Si aún no existe esperamos el evento */

document.addEventListener("ACS_AIRPORTS_READY", () => {

  AirportIndex = window.ACS_AIRPORT_INDEX;

  console.log(
    "🌍 WORLD Publisher linked after event:",
    Object.keys(AirportIndex).length,
    "airports"
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

  if (!AirportIndex) return;

  const airline = getAirlineId();
  if(!airline) return;

  const originICAO = (item.originICAO || "").trim().toUpperCase();
  const destinationICAO = (item.destinationICAO || "").trim().toUpperCase();

  if (!Number.isFinite(item.depAbsMin)) return;

  const airport =
    AirportIndex[originICAO] || null;

  if (!airport) return;

  const lat = Number(airport.latitude);
  const lon = Number(airport.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

  const flightId =
    item.aircraftId + "|" +
    originICAO + "|" +
    destinationICAO + "|" +
    item.depAbsMin;

  const depAbsMin = Number(item.depAbsMin);
  const arrAbsMin = Number(item.arrAbsMin);

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

        origin: originICAO,

        destination: destinationICAO,

        latitude: lat,
        longitude: lon,
        speed: 0,

        dep_time: Number.isFinite(depAbsMin) ? depAbsMin : null,
        arr_time: Number.isFinite(arrAbsMin) ? arrAbsMin : null,

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

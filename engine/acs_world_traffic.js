/* ============================================================
   🌍 ACS WORLD TRAFFIC ENGINE — POSTGRESQL GLOBAL SKYTRACK
   ------------------------------------------------------------
   ACS OCC / AIRBUS OCC
   - Reads all ACS airlines from PostgreSQL global endpoint.
   - Converts aircraft fleet rows into SkyTrack snapshot items.
   - Shows aircraft even when GROUND.
   - No localStorage.
   - No old world /v1/flights authority.
   ============================================================ */

(function(){

  const GLOBAL_SERVER =
    "https://api.aviationcapitalsim.com/v1/skytrack/global";

  async function ACS_fetchWorldFlights(){

    try {

      const res = await fetch(
        GLOBAL_SERVER,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Accept": "application/json"
          }
        }
      );

      const data = await res.json();

      if (!res.ok || data?.ok !== true) {
        throw new Error(data?.error || "GLOBAL_SKYTRACK_FETCH_FAILED");
      }

      if (Array.isArray(data.flights)) {
        return data.flights;
      }

      return [];

    } catch (err) {

      console.warn(
        "🌍 Global SkyTrack fetch error:",
        err
      );

      return [];

    }

  }

  window.ACS_fetchWorldFlights =
    ACS_fetchWorldFlights;

})();

/* ============================================================
   🌍 GLOBAL AIRCRAFT → SKYTRACK SNAPSHOT ITEM
   ============================================================ */

function ACS_convertWorldFlight(f){

  if (!f) return null;

  const now =
    Number.isFinite(window.ACS_SkyTrack?.nowAbsMin)
      ? window.ACS_SkyTrack.nowAbsMin
      : Number.isFinite(window.ACS_TIME?.minute)
        ? window.ACS_TIME.minute % 10080
        : null;

  const aircraftId =
    "GLOBAL_" + String(f.airline_id) + "_" + String(f.aircraft_id);

  const airlineId =
    String(f.airline_id || "");

  const dep =
    Number(f.dep_abs_min);

  const arr =
    Number(f.arr_abs_min);

  const origin =
    String(f.origin || f.base_icao || f.current_airport || "").toUpperCase();

  const destination =
    String(f.destination || f.current_airport || f.base_icao || "").toUpperCase();

  const currentAirport =
    String(f.current_airport || f.base_icao || origin || "").toUpperCase();

  const maintenanceControlStatus =
    String(f.maintenance_control_status || "").toUpperCase();

  const maintenanceControlReason =
    String(f.maintenance_control_reason || "").toUpperCase();

  let state =
    "GROUND";

  let position =
    { airport: currentAirport || origin || null };

  if (
    maintenanceControlStatus === "IN_MAINTENANCE" ||
    maintenanceControlStatus === "UNSERVICEABLE"
  ) {
    state =
      maintenanceControlReason || maintenanceControlStatus || "MAINTENANCE";

    position =
      { airport: currentAirport || f.base_icao || null };

  } else if (
    now != null &&
    Number.isFinite(dep) &&
    Number.isFinite(arr) &&
    arr > dep &&
    now >= dep &&
    now < arr
  ) {

    const progress =
      Math.max(
        0,
        Math.min(
          1,
          (now - dep) / (arr - dep)
        )
      );

    state =
      "EN_ROUTE";

    position = {
      progress
    };

  } else {

  state =
    "GROUND";

  position = {
    airport:
      currentAirport ||
      f.base_icao ||
      origin ||
      null
  };

}

  return {

    aircraftId,

    airlineId,
    airline_id: airlineId,

    airlineName:
      f.airline_name || null,

    airlineIata:
      f.iata || null,

    airlineIcao:
  f.icao || null,

airlineColorHex:
  f.color_hex || "#3A5FFF",

airlineColorHsl:
  f.color_hsl || "hsl(220,70%,50%)",

airlineColorIndex:
  Number(f.color_index || 0),

registration:
  f.registration || "—",
     
    model:
      f.aircraft_name ||
      f.model_key ||
      "—",

    aircraft:
      f.aircraft_name ||
      f.model_key ||
      "—",

    modelKey:
      f.model_key || null,

    flightNumber:
      f.flight_number || null,

    originICAO:
      origin || null,

    destinationICAO:
      destination || null,

    state,

    position,

    depAbsMin:
      Number.isFinite(dep) ? dep : null,

    arrAbsMin:
      Number.isFinite(arr) ? arr : null,

    distanceNM:
      Number(f.distance_nm || 0),

    __globalTraffic:
      true

  };

}

/* ============================================================
   🌍 BUILD GLOBAL SKYTRACK SNAPSHOT
   ============================================================ */

async function ACS_buildWorldSnapshot(){

  const flights =
    await window.ACS_fetchWorldFlights();

  const snapshot = [];

  flights.forEach(f => {

    const item =
      ACS_convertWorldFlight(f);

    if (item) {
      snapshot.push(item);
    }

  });

  return snapshot;

}

window.ACS_buildWorldSnapshot =
  ACS_buildWorldSnapshot;



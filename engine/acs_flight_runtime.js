/* ============================================================
   ✈️ ACS FLIGHT RUNTIME ENGINE
   ------------------------------------------------------------
   Version: v1.0 (Multi-Flight · Great-Circle)
   Date: 19 DEC 2025
   ------------------------------------------------------------
   ▪ Lee schedule_table (matriz)
   ▪ Usa ACS_TIME
   ▪ Calcula vuelos activos simultáneos
   ▪ Publica ACS_LIVE_FLIGHTS[]
   ============================================================ */

(function(){

  if (typeof registerTimeListener !== "function") {
    console.warn("⛔ ACS Runtime: Time engine not found.");
    return;
  }

  /* ============================================================
     🔹 UTILS
     ============================================================ */

  function getActiveUserBase(){
    try {
      const user = JSON.parse(localStorage.getItem("ACS_activeUser"));
      return user?.base || null;
    } catch {
      return null;
    }
  }

  function getScheduleItems(){
    try {
      return JSON.parse(localStorage.getItem("scheduleItems")) || [];
    } catch {
      return [];
    }
  }

  function getAirportByICAO(icao){
    if (!icao || !window.WorldAirportsACS) return null;
    return Object.values(WorldAirportsACS).flat()
      .find(a => a.icao === icao) || null;
  }

  /* ============================================================
     🌍 GREAT-CIRCLE (LINEAR INTERPOLATION — STABLE)
     ============================================================ */

  function interpolateGC(lat1, lng1, lat2, lng2, t){
    return {
      lat: lat1 + (lat2 - lat1) * t,
      lng: lng1 + (lng2 - lng1) * t
    };
  }

  /* ============================================================
     ✈️ CORE RUNTIME LOOP
     ============================================================ */

  function updateLiveFlights(){

    const nowMin = window.ACS_TIME?.minute;
    if (typeof nowMin !== "number") return;
     
// ============================================================
// 🛫 SINGLE ACTIVE FLIGHT (FROM ACS_FLIGHT_EXEC)
// ============================================================

if (exec && typeof exec.depMin === "number" && typeof exec.arrMin === "number") {

  if (nowMin >= exec.depMin && nowMin <= exec.arrMin) {

    const origin = getAirportByICAO(exec.origin);
    const dest   = getAirportByICAO(exec.destination);

    if (origin && dest) {

      const duration = exec.arrMin - exec.depMin;
      const elapsed  = nowMin - exec.depMin;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);

      const pos = interpolateGC(
        origin.latitude,
        origin.longitude,
        dest.latitude,
        dest.longitude,
        progress
      );

      localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify([{
        aircraftId: exec.aircraftId || "",
        flightOut:  exec.flightOut || "",
        origin:     exec.origin,
        destination:exec.destination,
        startMin:   exec.depMin,
        endMin:     exec.arrMin,
        progress,
        lat: pos.lat,
        lng: pos.lng
      }]));

      return; // ⛔ NO procesar scheduleItems
    }
  }
}
     
    const base = getActiveUserBase();
    if (!base) return;

    const schedule = getScheduleItems();
    const liveFlights = [];

   schedule.forEach(it => {

  if (!it.origin || !it.destination) return;

  /* ============================================================
     🛟 FALLBACK — startMin / endMin FROM depMin / arrMin
     ============================================================ */
  if (typeof it.startMin !== "number" || typeof it.endMin !== "number") {
    if (typeof it.depMin !== "number" || typeof it.arrMin !== "number") {
      return;
    }
    it.startMin = it.depMin;
    it.endMin   = it.arrMin;
  }

  // ¿Está volando ahora?
  if (nowMin < it.startMin || nowMin > it.endMin) return;

  const origin = getAirportByICAO(it.origin);
  const dest   = getAirportByICAO(it.destination);
  if (!origin || !dest) return;

  const duration = it.endMin - it.startMin;
  const elapsed  = nowMin - it.startMin;
  const progress = Math.min(Math.max(elapsed / duration, 0), 1);

  const pos = interpolateGC(
    origin.latitude,
    origin.longitude,
    dest.latitude,
    dest.longitude,
    progress
  );

  liveFlights.push({
    aircraftId: it.aircraftId || "",
    flightOut:  it.flightOut || "",
    origin:     it.origin,
    destination:it.destination,
    startMin:   it.startMin,
    endMin:     it.endMin,
    progress,
    lat: pos.lat,
    lng: pos.lng
  });

});

localStorage.setItem("ACS_LIVE_FLIGHTS", JSON.stringify(liveFlights));

  }

  /* ============================================================
     ⏱ REGISTER WITH TIME ENGINE
     ============================================================ */

  registerTimeListener(updateLiveFlights);

  console.log("✈️ ACS Flight Runtime Engine — ACTIVE");

})();

/* ============================================================
   ACS FLIGHT RUNTIME v1 — MINIMAL / STABLE
   Source: scheduleItems
   Time: provided externally (nowMin)
   ============================================================ */

window.runACSFlights = function (nowMin) {

  if (typeof nowMin !== "number") return [];

  let items = [];
  try {
    items = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch {
    return [];
  }

  const live = [];

  items.forEach(f => {
    if (
      !f ||
      typeof f.depMin !== "number" ||
      typeof f.arrMin !== "number" ||
      !f.origin ||
      !f.destination ||
      !f.aircraftId
    ) return;

    let status = "GROUND";

    // ventana normal
    if (f.depMin <= f.arrMin && nowMin >= f.depMin && nowMin <= f.arrMin) {
      status = "AIRBORNE";
    }

    // cruce medianoche
    if (f.depMin > f.arrMin && (nowMin >= f.depMin || nowMin <= f.arrMin)) {
      status = "AIRBORNE";
    }

    live.push({
      aircraftId: String(f.aircraftId),
      flightNumber: f.flightNumber || f.flightOut || "",
      model: f.aircraft || f.model || f.type || "",
      origin: f.origin,
      destination: f.destination,
      depMin: f.depMin,
      arrMin: f.arrMin,
      status
    });
  });

  window.ACS_LIVE_FLIGHTS = live;
  return live;
};

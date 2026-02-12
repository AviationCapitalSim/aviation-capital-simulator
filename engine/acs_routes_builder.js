/* ============================================================
   🟦 ACS ROUTES BUILDER — CANONICAL BRIDGE v1.0
   ------------------------------------------------------------
   File: engine/acs_routes_builder.js
   Purpose:
   - Build ACS_ROUTES from scheduleItems (source of truth)
   - NO economy
   - NO finance
   - NO runtime interference
   - Pure structural builder
   ------------------------------------------------------------
   Source of truth:
   scheduleItems (localStorage)
   ============================================================ */

console.log("🟦 ACS_ROUTES_BUILDER v1.0 LOADED");

/* ============================================================
   🔹 STORAGE KEYS
   ============================================================ */

const ACS_ROUTES_KEY = "ACS_ROUTES";

/* ============================================================
   🔹 SAFE LOAD
   ============================================================ */

function ACS_loadScheduleItems() {

  try {
    return JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch {
    return [];
  }

}

function ACS_loadRoutes() {

  try {
    return JSON.parse(localStorage.getItem(ACS_ROUTES_KEY) || "[]");
  } catch {
    return [];
  }

}

function ACS_saveRoutes(routes) {

  localStorage.setItem(
    ACS_ROUTES_KEY,
    JSON.stringify(routes)
  );

}

/* ============================================================
   🔹 ROUTE ID BUILDER
   ============================================================ */

function ACS_buildRouteId(origin, destination, aircraftType) {

  return [
    origin,
    destination,
    aircraftType || "UNK"
  ].join("_");

}

/* ============================================================
   🔹 BUILD ROUTES FROM SCHEDULE
   ============================================================ */

function ACS_buildRoutesFromSchedule() {

  const schedule = ACS_loadScheduleItems();

  if (!Array.isArray(schedule) || schedule.length === 0) {

    console.log("🟦 ROUTES_BUILDER: no scheduleItems");

    ACS_saveRoutes([]);
    return [];

  }

  const routesMap = {};

  schedule.forEach(item => {

    if (!item) return;

    if (item.type !== "flight") return;

    if (!item.origin || !item.destination) return;

    const origin = String(item.origin).toUpperCase();
    const destination = String(item.destination).toUpperCase();

    const aircraftType =
      item.aircraftType ||
      item.model ||
      item.aircraft ||
      "UNK";

    const routeId =
      ACS_buildRouteId(
        origin,
        destination,
        aircraftType
      );

    if (!routesMap[routeId]) {

      routesMap[routeId] = {

        id: routeId,

        airlineId: "player",

        origin,
        destination,

        distanceNM:
          Number(item.distanceNM) ||
          Number(item.distance_nm) ||
          0,

        aircraftType,

        frequencyPerWeek: 0,

        seatsPerFlight:
          Number(item.seats) ||
          Number(item.capacity) ||
          0,

        openedDate: Date.now(),

        lastUpdate: Date.now(),

        state: "active",

        maturity: 0.15,

        routeImage: 0.35,

        currentTicketPrice:
          Number(item.ticketPrice) || 0,

        lastPriceReset: Date.now(),

        era:
          String(window.ACS_TIME?.year || 1940),

        serviceClass: ["Y"],

        createdBy: "builder"

      };

    }

    routesMap[routeId].frequencyPerWeek++;

  });

  const routes = Object.values(routesMap);

  ACS_saveRoutes(routes);

  console.log(
    "🟦 ROUTES_BUILDER:",
    routes.length,
    "routes built"
  );

  return routes;

}

/* ============================================================
   🔹 AUTO BUILD ON LOAD
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    ACS_buildRoutesFromSchedule();

  }
);

/* ============================================================
   🔹 SAFE PUBLIC API
   ============================================================ */

window.ACS_buildRoutesFromSchedule =
  ACS_buildRoutesFromSchedule;

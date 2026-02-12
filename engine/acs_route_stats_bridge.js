/* ============================================================
   🟦 ACS ROUTE STATS BRIDGE — CANONICAL v1.0
   ------------------------------------------------------------
   Purpose:
   - Build lifetime + average route stats
   - Source: ACS_FLIGHT_ECONOMICS event
   - Consumer: My Routes UI
   ------------------------------------------------------------
   Storage: ACS_ROUTE_STATS
   ============================================================ */

console.log("🟦 ACS_ROUTE_STATS_BRIDGE LOADED");

const ROUTE_STATS_KEY = "ACS_ROUTE_STATS";

/* ============================================================
   LOAD / SAVE
   ============================================================ */

function ACS_loadRouteStats() {

  try {
    return JSON.parse(localStorage.getItem(ROUTE_STATS_KEY)) || {};
  }
  catch {
    return {};
  }

}

function ACS_saveRouteStats(stats) {

  localStorage.setItem(
    ROUTE_STATS_KEY,
    JSON.stringify(stats)
  );

}

/* ============================================================
   ROUTE KEY
   ============================================================ */

function ACS_buildRouteKey(origin, destination) {

  return `${origin}_${destination}`;

}

/* ============================================================
   UPDATE STATS
   ============================================================ */

function ACS_updateRouteStats(economics) {

  if (!economics) return;

  const key = ACS_buildRouteKey(
    economics.origin,
    economics.destination
  );

  const stats = ACS_loadRouteStats();

  if (!stats[key]) {

    stats[key] = {

      lifetime: {
        flightsezaights: 0,
        pax: 0,
        revenue: 0,
        profit: 0,
        loadFactorSum: 0
      },

      avg: {
        loadFactor: 0,
        profitPerFlight: 0
      },

      lastFlight: {}

    };

  }

  const s = stats[key];

  /* lifetime accumulation */

  s.lifetime.flights += 1;
  s.lifetime.pax += economics.pax;
  s.lifetime.revenue += economics.revenue;
  s.lifetime.profit += economics.profit;
  s.lifetime.loadFactorSum += economics.loadFactor;

  /* averages */

  s.avg.loadFactor =
    s.lifetime.loadFactorSum / s.lifetime.flights;

  s.avg.profitPerFlight =
    s.lifetime.profit / s.lifetime.flights;

  /* last flight */

  s.lastFlight = {

    ts: Date.now(),
    loadFactor: economics.loadFactor,
    profit: economics.profit

  };

  ACS_saveRouteStats(stats);

  console.log(
    "🟦 ROUTE STATS UPDATED:",
    key,
    s
  );

}

/* ============================================================
   LISTENER
   ============================================================ */

window.addEventListener(

  "ACS_FLIGHT_ECONOMICS",

  e => ACS_updateRouteStats(e.detail)

);

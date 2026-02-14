/* ============================================================
   🟦 ACS ROUTE STATS BRIDGE — CANONICAL v1.1 (FIX)
   ------------------------------------------------------------
   Purpose:
   - Build lifetime + average route stats
   - Source: ACS_FLIGHT_ECONOMICS event
   - Consumer: My Routes UI
   ------------------------------------------------------------
   Storage: ACS_ROUTE_STATS
   Fix:
   - flights typo -> flights (was causing NaN -> null in JSON)
   - numeric guards to prevent null/NaN contamination
   ============================================================ */

console.log("🟦 ACS_ROUTE_STATS_BRIDGE v1.1 LOADED");

const ROUTE_STATS_KEY = "ACS_ROUTE_STATS";

/* ============================================================
   LOAD / SAVE
   ============================================================ */

function ACS_loadRouteStats() {
  try {
    return JSON.parse(localStorage.getItem(ROUTE_STATS_KEY)) || {};
  } catch {
    return {};
  }
}

function ACS_saveRouteStats(stats) {
  localStorage.setItem(ROUTE_STATS_KEY, JSON.stringify(stats));
}

/* ============================================================
   ROUTE KEY
   ============================================================ */

function ACS_buildRouteKey(origin, destination) {
  return `${String(origin || "").toUpperCase()}_${String(destination || "").toUpperCase()}`;
}

/* ============================================================
   UPDATE STATS
   ============================================================ */

function ACS_updateRouteStats(economics) {
  if (!economics) return;

  const origin = economics.origin;
  const destination = economics.destination;
  if (!origin || !destination) return;

  const key = ACS_buildRouteKey(origin, destination);
  const stats = JSON.parse(localStorage.getItem("ACS_ROUTE_STATS") || "{}");

  if (!stats[key]) {
    stats[key] = {
      lifetime: {
        flights: 0,
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

  // 🔒 Numeric guards (evita NaN->null)
  const pax       = Number(economics.pax || 0);
  const revenue   = Number(economics.revenue || 0);
  const profit    = Number(economics.profit || 0);
  const loadF     = Number(economics.loadFactor || 0);

  s.lifetime.flights = Number(s.lifetime.flights || 0) + 1;
  s.lifetime.pax += pax;
  s.lifetime.revenue += revenue;
  s.lifetime.profit += profit;
  s.lifetime.loadFactorSum += loadF;

  // averages
  const flights = Number(s.lifetime.flights || 0);
  if (flights > 0) {
    s.avg.loadFactor = s.lifetime.loadFactorSum / flights;
    s.avg.profitPerFlight = s.lifetime.profit / flights;
  } else {
    s.avg.loadFactor = 0;
    s.avg.profitPerFlight = 0;
  }

  // last flight
  s.lastFlight = {
    ts: Date.now(),
    loadFactor: loadF,
    profit: profit
  };

  ACS_saveRouteStats(stats);

  console.log("🟦 ROUTE STATS UPDATED:", key, s);
}

/* ============================================================
   🟦 LISTENER — CANONICAL GUARANTEED
   ------------------------------------------------------------
   • Always capture economics events
   • Works regardless of load order
   ============================================================ */

(function(){

  function attachListener(){

    if (!window || !window.addEventListener) return;

    window.addEventListener("ACS_FLIGHT_ECONOMICS", function(e){

      if (!e || !e.detail) return;

      try {

        ACS_updateRouteStats(e.detail);

        console.log("🟦 ROUTE STATS EVENT CAPTURED:",
          e.detail.origin, "→", e.detail.destination);

      } catch(err){

        console.warn("ACS_ROUTE_STATS listener failed", err);

      }

    });

    console.log("🟦 ACS_ROUTE_STATS listener attached");

  }

  // attach immediately
  attachListener();

  // safety attach after load (guaranteed)
  window.addEventListener("load", attachListener);
   
})();

/* ============================================================
   🟦 KPI REFLECTION ENGINE (NON-DESTRUCTIVE)
   ------------------------------------------------------------
   Purpose:
   - Reflect stored route stats into KPI strip
   - Uses existing ACS_ROUTE_STATS storage
   - Does NOT modify stats system
   ============================================================ */

function ACS_refreshRouteKPIs(){

  try {

    const stats = JSON.parse(localStorage.getItem("ACS_ROUTE_STATS") || "{}");

    const routes = Object.values(stats);

    if (!routes.length) return;

    const activeRoutes = routes.length;

    let totalLF = 0;
    let profitable = 0;
    let totalRouteImage = 0;


    routes.forEach(route => {

  const avgLF =
    Number(route.avg?.loadFactor || 0);

  const profitPerFlight =
    Number(route.avg?.profitPerFlight || 0);

  const flights =
    Number(route.lifetime?.flights || 0);

  /* ============================================================
     ROUTE IMAGE CALCULATION
     ============================================================ */

  // Load Factor contribution (0–50)
  const LF_score =
    avgLF * 50;

  // Profit contribution (0–30)
  let Profit_score = 0;

  if (profitPerFlight > 0)
    Profit_score = 30;
  else if (profitPerFlight === 0)
    Profit_score = 15;
  else
    Profit_score = 0;

  // Maturity contribution (0–20)
  const Maturity_score =
    Math.min(flights, 50) / 50 * 20;

  // Final Route Image (0–100)
  const routeImage =
    Math.min(
      100,
      LF_score + Profit_score + Maturity_score
    );

  totalLF += avgLF;

  totalRouteImage += routeImage;

  if (profitPerFlight > 0)
    profitable++;

});

    const avgLF =
      totalLF / activeRoutes;

    /* Airline Image model */

    let airlineImage =
  routes.length > 0
  ? Math.round(totalRouteImage / routes.length)
  : 0;

   airlineImage += profitable * 3;
   airlineImage += avgLF * 25;
   airlineImage += activeRoutes * 1.5;

  airlineImage =
  Math.min(100, Math.round(airlineImage));

    /* WRITE UI */

    const elRoutes =
      document.getElementById("kpi-routes");

    const elLF =
      document.getElementById("kpi-lf");

    const elProfit =
      document.getElementById("kpi-profit");

    const elImage =
      document.getElementById("kpi-airline-image");

    if (elRoutes)
      elRoutes.textContent = activeRoutes;

    if (elLF)
      elLF.textContent =
        Math.round(avgLF * 100) + "%";

    if (elProfit)
      elProfit.textContent = profitable;

    if (elImage)
      elImage.textContent =
        airlineImage + "%";

    console.log("🟦 KPI UPDATED FROM ACS_ROUTES");

  }
  catch(err){

    console.warn("KPI refresh failed", err);

  }

}

/* ============================================================
   AUTO REFRESH TRIGGERS
   ============================================================ */

window.addEventListener(
  "ACS_FLIGHT_ECONOMICS",
  ACS_refreshRouteKPIs
);

window.addEventListener(
  "load",
  ACS_refreshRouteKPIs
);

console.log("🟦 KPI REFLECTION ENGINE READY");

/* ============================================================
   LISTEN FOR ROUTES BUILDER READY
   ============================================================ */

window.addEventListener(
  "ACS_ROUTES_READY",
  ACS_refreshRouteKPIs
);

/* ============================================================
   INITIAL KPI LOAD
   ============================================================ */

setTimeout(function(){

  if (typeof ACS_refreshRouteKPIs === "function") {
    ACS_refreshRouteKPIs();
    console.log("🟦 KPI INITIAL LOAD OK");
  }

}, 300);

document.addEventListener("DOMContentLoaded", function(){

  ACS_refreshRouteKPIs();

});

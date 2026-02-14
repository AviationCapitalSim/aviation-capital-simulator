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
  const stats = ACS_loadRouteStats();

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

    const stats = ACS_loadRouteStats();

    const keys = Object.keys(stats);

    if (!keys.length) return;

    let totalLF = 0;
    let profitable = 0;

    keys.forEach(key => {

      const r = stats[key];

      const lf =
        Number(r?.avg?.loadFactor || 0);

      const profit =
        Number(r?.lifetime?.profit || 0);

      totalLF += lf;

      if (profit > 0)
        profitable++;

    });

    const activeRoutes = keys.length;

    const avgLF =
      activeRoutes > 0
      ? totalLF / activeRoutes
      : 0;

    /* Airline Image model */
    let airlineImage = 50;

    airlineImage += profitable * 4;
    airlineImage += avgLF * 20;

    airlineImage =
      Math.min(100, Math.round(airlineImage));

    /* WRITE KPI UI */

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

    console.log("🟦 KPI REFRESHED");

  } catch(err){

    console.warn("KPI refresh failed", err);

  }

}

/* ============================================================
   AUTO REFRESH TRIGGERS
   ============================================================ */

window.addEventListener(
  "AC
   
})();

/* ============================================================
   🟦 A8.1 — ROUTE INITIAL MATURITY
   ------------------------------------------------------------
   Purpose:
   - Define starting maturity when a route is created
   - Prevent instant demand saturation
   ============================================================ */

function ACS_getInitialRouteMaturity(route) {
  return 0.12; // 12% awareness at launch (historical realism)
}

/* ============================================================
   🟦 A8.2 — MONTHLY MATURITY GROWTH
   ------------------------------------------------------------
   Growth drivers:
   - Airline image
   - Route stability
   ============================================================ */

function ACS_computeMonthlyMaturityGrowth(route, airlineImage = 0.4) {

  // Base historical growth (very slow)
  let growth = 0.015; // +1.5% per month baseline

  // Airline reputation accelerates growth
  growth += airlineImage * 0.02;

  // Safety clamp
  return Math.min(growth, 0.05); // max 5% per month
}

/* ============================================================
   🟦 A8.3 — MATURITY HARD CAP
   ------------------------------------------------------------
   Prevents full saturation without marketing or dominance
   ============================================================ */

function ACS_getMaturityCap(route, airlineImage = 0.4) {

  // Historical realism: routes rarely exceed 85–90% organically
  let cap = 0.78;

  // Strong airline brand can push higher
  cap += airlineImage * 0.15;

  return Math.min(cap, 0.92); // absolute ceiling
}

/* ============================================================
   🟦 A8.4 — PRICE DEVIATION PENALTY
   ------------------------------------------------------------
   Overpriced or underpriced routes grow slower
   ============================================================ */

function ACS_getPricePenalty(route, marketPrice) {

  if (!marketPrice || !route.currentTicketPrice) return 1.0;

  const deviation =
    Math.abs(route.currentTicketPrice - marketPrice) / marketPrice;

  // Up to -40% growth penalty
  const penalty = Math.max(0.6, 1 - deviation);

  return penalty;
}

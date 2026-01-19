/* ============================================================
   🟦 ACS COMPANY VALUE ENGINE — v1.0 (READ ONLY)
   ------------------------------------------------------------
   • Valor estratégico de la aerolínea
   • NO contable — NO escribe estado
   • Lee Finance / Fleet / Routes / Rank
   ------------------------------------------------------------
   Date: 17 JAN 2026
   ============================================================ */

(function(){

/* ============================================================
   🔹 SAFE JSON READ
   ============================================================ */
function safeRead(key, fallback){
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

/* ============================================================
   🏅 REPUTATION MULTIPLIER
   ============================================================ */
function getReputationMultiplier(){
  try {
    const rank = localStorage.getItem("ACS_Rank") || "Bronze";
    if (rank === "Silver") return 1.05;
    if (rank === "Gold") return 1.15;
    if (rank === "Platinum") return 1.30;
  } catch {}
  return 1.0;
}

/* ============================================================
   🕰️ HISTORICAL VALUE MULTIPLIER (BY ERA)
   Fuente: ACS_TIME.currentYear
   ============================================================ */
function getHistoricalMultiplier() {

  let year = 2026;

  try {
    if (window.ACS_TIME && ACS_TIME.currentYear) {
      year = Number(ACS_TIME.currentYear);
    }
  } catch {}

  // Pre-Jet / WW2 era
  if (year <= 1945) return 0.05;

  // Early post-war expansion
  if (year <= 1950) return 0.12;

  // Prop golden age
  if (year <= 1960) return 0.25;

  // Early jet age
  if (year <= 1975) return 0.45;

  // Deregulation / widebody era
  if (year <= 1990) return 0.70;

  // Modern era
  if (year <= 2010) return 1.00;

  // Premium / future era
  return 1.20;
}
   
/* ============================================================
   ✈️ FLEET VALUE (v1)
   Fuente: ACS_MyAircraft
   ============================================================ */
function getFleetValue(){
  let total = 0;
  const fleet = safeRead("ACS_MyAircraft", []);
  fleet.forEach(ac => {
    const price =
      Number(ac.price || ac.purchase_price || ac.market_price || 0);
    const depreciation =
      Number(ac.depreciation ?? 0.6); // default v1
    total += price * depreciation;
  });
  return total;
}

/* ============================================================
   🗺️ ROUTE NETWORK VALUE (HISTORICAL SCALE)
   Fuente: scheduleItems + era dependent value
   ============================================================ */
function getRouteNetworkValue(){

  let year = 2026;

  try {
    if (window.ACS_TIME && ACS_TIME.currentYear) {
      year = Number(ACS_TIME.currentYear);
    }
  } catch {}

  // Base value per route by era (VERY IMPORTANT)
  let BASE_ROUTE_VALUE = 250000; // default modern

  if (year <= 1945) BASE_ROUTE_VALUE = 15000;
  else if (year <= 1950) BASE_ROUTE_VALUE = 30000;
  else if (year <= 1960) BASE_ROUTE_VALUE = 60000;
  else if (year <= 1975) BASE_ROUTE_VALUE = 120000;
  else if (year <= 1990) BASE_ROUTE_VALUE = 180000;
  else if (year <= 2010) BASE_ROUTE_VALUE = 250000;
  else BASE_ROUTE_VALUE = 300000;

  const routes = safeRead("scheduleItems", []);
  const active = routes.filter(r => r && !r.cancelled);

  return active.length * BASE_ROUTE_VALUE;
}


/* ============================================================
   ⚖️ LIABILITIES (v1 placeholder)
   ============================================================ */
function getLiabilities(){
  // Preparado para leasing / loans futuros
  return 0;
}

/* ============================================================
   🟧 CV-ENGINE-1 — FLEET ASSETS VALUE (FROM REAL LEDGER)
   ------------------------------------------------------------
   Source REAL (según tu consola): localStorage["ACS_Log"]
   - Only aircraft purchase EXPENSE entries
   ============================================================ */
function getFleetValue() {

  let total = 0;

  try {
    const log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");

    if (Array.isArray(log)) {
      log.forEach(tx => {
        if (
          tx &&
          tx.type === "EXPENSE" &&
          typeof tx.source === "string" &&
          (
            tx.source.includes("Used Market Purchase") ||
            tx.source.includes("New Market Purchase")
          )
        ) {
          total += Number(tx.amount || 0);
        }
      });
    }

  } catch (e) {
    console.warn("Company Value — Fleet ledger read failed", e);
  }

  return Math.round(total);
}

/* ✅ EXPOSE GLOBAL (para consola + UI) */
window.getFleetValue = getFleetValue;

/* ============================================================
   🧮 PUBLIC API — COMPANY VALUE (WITH REAL FLEET ASSETS)
   ============================================================ */
window.ACS_getCompanyValue = function(){

  const finance = safeRead("ACS_Finance", null);
  if (!finance) return 0;

  const capital = Number(finance.capital || 0);

/* ============================================================
   ✈️ FLEET ASSETS VALUE — FROM FINANCE LEDGER (REAL PURCHASES)
   ============================================================ */
  const fleetValue =
  (typeof window.getFleetValue === "function")
    ? window.getFleetValue()
    : 0;

  /* ============================================================
     🗺 ROUTE NETWORK VALUE (STRATEGIC)
     ============================================================ */
  const routeValue = getRouteNetworkValue();

/* ============================================================
   🏅 REPUTATION MULTIPLIER
   ============================================================ */
const reputation = getReputationMultiplier();

/* ============================================================
   🕰️ HISTORICAL MULTIPLIER
   ============================================================ */
const historical = getHistoricalMultiplier();

/* ============================================================
   ⚠️ LIABILITIES
   ============================================================ */
const liabilities = getLiabilities();

/* ============================================================
   💎 FINAL COMPANY VALUE FORMULA (HISTORICAL ADJUSTED)
   ============================================================ */
const companyValue =
  (capital + fleetValue + routeValue) * reputation * historical - liabilities;

// Optional: expose breakdown for UI if needed later
return Math.round(companyValue);

/* ============================================================
   🧪 OPTIONAL DEBUG (SAFE)
   ============================================================ */
// console.log("ACS Company Value:", window.ACS_getCompanyValue());

})();

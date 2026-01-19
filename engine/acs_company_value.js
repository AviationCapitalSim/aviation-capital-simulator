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
   🗺️ ROUTE NETWORK VALUE (v1)
   Fuente: scheduleItems
   ============================================================ */
function getRouteNetworkValue(){
  const BASE_ROUTE_VALUE = 50000; // v1 constant
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
   🟧 CV-ENGINE-1 — FLEET ASSETS VALUE (FROM FINANCE LEDGER)
   ------------------------------------------------------------
   Source:
   - localStorage: ACS_Finance.log[]
   - Only real aircraft purchase EXPENSE entries
   - Survives sell / remove / leasing logic
   ============================================================ */

function getFleetValue() {

  const finance = safeRead("ACS_Finance", null);
  if (!finance || !Array.isArray(finance.log)) return 0;

  let total = 0;

  try {

    finance.log.forEach(tx => {

      if (
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

  } catch (e) {
    console.warn("Company Value — Fleet ledger read failed", e);
    return 0;
  }

  return Math.round(total);
}
   
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
  let fleetValue = 0;

  try {
    if (Array.isArray(finance.log)) {
      finance.log.forEach(tx => {
        if (
          tx.type === "EXPENSE" &&
          typeof tx.source === "string" &&
          (
            tx.source.includes("Used Market Purchase") ||
            tx.source.includes("New Market Purchase")
          )
        ) {
          fleetValue += Number(tx.amount || 0);
        }
      });
    }
  } catch (e) {
    console.warn("Company Value: Fleet assets calculation failed", e);
  }

  /* ============================================================
     🗺 ROUTE NETWORK VALUE (STRATEGIC)
     ============================================================ */
  const routeValue = getRouteNetworkValue();

  /* ============================================================
     🏅 REPUTATION MULTIPLIER
     ============================================================ */
  const reputation = getReputationMultiplier();

  /* ============================================================
     ⚠️ LIABILITIES
     ============================================================ */
  const liabilities = getLiabilities();

  /* ============================================================
     💎 FINAL COMPANY VALUE FORMULA
     ============================================================ */
  const companyValue =
    (capital + fleetValue + routeValue) * reputation - liabilities;

  // Optional: expose breakdown for UI if needed later
  return Math.round(companyValue);
};

/* ============================================================
   🧪 OPTIONAL DEBUG (SAFE)
   ============================================================ */
// console.log("ACS Company Value:", window.ACS_getCompanyValue());

})();

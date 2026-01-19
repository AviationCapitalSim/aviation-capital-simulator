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
   🕰️ HISTORICAL VALUE MULTIPLIER (REALISTIC ECONOMIC ERA SCALE)
   Fuente: ACS_TIME.currentYear
   ============================================================ */
function getHistoricalMultiplier() {

  let year = 2026;

  try {
    if (window.ACS_TIME && ACS_TIME.currentYear) {
      year = Number(ACS_TIME.currentYear);
    }
  } catch {}

  // WW2 / very early civil aviation
  if (year <= 1945) return 0.02;

  // Early reconstruction
  if (year <= 1950) return 0.05;

  // Prop golden age
  if (year <= 1960) return 0.12;

  // Early jet age
  if (year <= 1975) return 0.25;

  // Deregulation / widebody
  if (year <= 1990) return 0.50;

  // Modern era
  if (year <= 2010) return 0.85;

  // Premium / future era
  return 1.00;
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
   🟧 B1 — ROUTE NETWORK VALUE (FINANCE DRIVEN, WEEKLY DYNAMIC)
   ------------------------------------------------------------
   Fuente ÚNICA:
   • ACS_Finance.monthlyProfit
   Actualiza:
   • automáticamente cuando Finance cierra semana
   ============================================================ */

function ACS_updateRouteNetworkFromFinance(finance) {

  if (!finance || !finance.monthlyProfit) return;

  const monthlyProfit = Number(finance.monthlyProfit || 0);

  // multiplicador base estratégico
  const MULTIPLIER = 6;

  // factor histórico por era
  let eraFactor = 1.0;
  let year = 1945;

  try {
    if (finance.year) year = Number(finance.year);
    else if (window.ACS_TIME && ACS_TIME.currentYear) year = Number(ACS_TIME.currentYear);
  } catch {}

  if (year <= 1945) eraFactor = 0.8;
  else if (year <= 1955) eraFactor = 1.0;
  else if (year <= 1970) eraFactor = 1.2;
  else if (year <= 1990) eraFactor = 1.5;
  else if (year <= 2010) eraFactor = 2.0;
  else eraFactor = 3.0;

  const routeValue = Math.round(monthlyProfit * MULTIPLIER * eraFactor);

  // guardar valor estratégico (opcional histórico)
  try {
    localStorage.setItem("ACS_RouteNetworkValue", JSON.stringify({
      value: routeValue,
      monthlyProfit,
      multiplier: MULTIPLIER,
      eraFactor,
      year,
      timestamp: Date.now()
    }));
  } catch {}

  // actualizar UI en vivo
  const el = document.getElementById("cvRoutes");
  if (el) {
    el.textContent = "$" + routeValue.toLocaleString("en-US");
  }
}

/* ============================================================
   🟧 B2 — LISTENER AUTOMÁTICO AL CIERRE SEMANAL
   ============================================================ */

window.addEventListener("ACS_WEEK_CLOSED", e => {
  try {
    ACS_updateRouteNetworkFromFinance(e.detail);
  } catch (err) {
    console.warn("Route Network weekly update failed", err);
  }
});

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
   📜 HISTORICAL MULTIPLIER
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

}; // ✅ CIERRA window.ACS_getCompanyValue

/* ============================================================
   🧪 OPTIONAL DEBUG (SAFE)
   ============================================================ */
// console.log("ACS Company Value:", window.ACS_getCompanyValue());

})(); // ✅ CIERRA (function(){ ... })();

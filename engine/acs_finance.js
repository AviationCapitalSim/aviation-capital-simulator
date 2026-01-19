/* ============================================================
   💰 ACS FINANCE ENGINE — CANONICAL LEDGER v3.0
   ------------------------------------------------------------
   • Finance = REGISTRO CONTABLE (NO calcula vuelos)
   • Fuente económica: ACS_FLIGHT_ECONOMICS
   • UI: company_finance.html (READ ONLY)
   ------------------------------------------------------------
   Date: 17 JAN 2026
   ============================================================ */

(function(){

/* ============================================================
   🔹 SAFE LOAD / SAVE
   ============================================================ */

function loadFinance(){
  try {
    return JSON.parse(localStorage.getItem("ACS_Finance")) || null;
  } catch {
    return null;
  }
}

function saveFinance(f){
  f.meta = {
    version: "3.0",
    lastUpdate: Date.now()
  };
  localStorage.setItem("ACS_Finance", JSON.stringify(f));
}

/* ============================================================
   🟧 A1 — WEEK CLOSE → DISPATCH COMPANY VALUE UPDATE
   ------------------------------------------------------------
   • Se dispara SOLO cuando cierra la semana
   • Envía Finance completo al sistema estratégico
   ============================================================ */

try {
  window.dispatchEvent(
    new CustomEvent("ACS_WEEK_CLOSED", {
      detail: finance
    })
  );
} catch (e) {
  console.warn("ACS_WEEK_CLOSED dispatch failed", e);
}
   
/* ============================================================
   🗓️ WEEK HELPERS — ISO WEEK (MONDAY RESET)
   ============================================================ */

function ACS_getISOWeekKey(ts){
  const d = new Date(ts);
  d.setUTCHours(0,0,0,0);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(d.getUTCFullYear(),0,4));
  const weekNo = 1 + Math.round(
    ((d - week1) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,"0")}`;
}

/* ============================================================
   🗓️ MONTH KEY — YYYY-MM (UTC)
   ============================================================ */

function ACS_getMonthKey(ts){
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,"0")}`;
}

/* ============================================================
   🔹 INIT STRUCTURE (ONCE)
   ============================================================ */

function initFinanceIfNeeded(){

  let f = loadFinance();
  if (f) return f;

  f = {
    capital: 500000,

    revenue: 0,
    expenses: 0,
    profit: 0,

    income: {
      live_revenue: 0,
      weekly_revenue: 0,
      current_week_key: null
    },

    cost: {
      fuel: 0,
      ground_handling: 0,
      slot_fees: 0,
      overflight: 0,
      navigation: 0,
      leasing: 0,
      salaries: 0,
      maintenance: 0,
      penalties: 0,
      used_aircraft_purchase: 0,
      new_aircraft_purchase: 0
    },

    history: [],
    current_month: null
  };

  saveFinance(f);
  return f;
}

let ACS_Finance = initFinanceIfNeeded();

/* ============================================================
   🔹 LOG (CENTRAL)
   ============================================================ */

function pushLog(entry){
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem("ACS_Log")) || [];
  } catch {}

  log.push({ ts: Date.now(), ...entry });
  localStorage.setItem("ACS_Log", JSON.stringify(log));
}

/* ============================================================
   🔹 PUBLIC API — REGISTER INCOME
   ============================================================ */

window.ACS_registerIncome = function(payload){

  if (!payload || typeof payload.revenue !== "number") return;

  const f = loadFinance();
  if (!f) return;

  const now = Date.now();

  /* ============================================================
     🔄 WEEKLY LOGIC — LIVE + WEEK CLOSE
     ============================================================ */

  const weekKey = ACS_getISOWeekKey(now);

  if (f.income.current_week_key !== weekKey) {
    if (f.income.current_week_key !== null) {
      f.income.weekly_revenue = f.income.live_revenue;
    }
    f.income.live_revenue = 0;
    f.income.current_week_key = weekKey;
  }

  f.income.live_revenue += payload.revenue;

  /* ============================================================
     📦 MONTHLY CLOSE — RESET MONTH + HISTORY
     ============================================================ */

  const monthKey = ACS_getMonthKey(now);

  if (f.current_month !== monthKey) {

    if (f.current_month !== null) {
      f.history.push({
        month: f.current_month,
        revenue: f.revenue || 0,
        expenses: f.expenses || 0,
        profit: (f.revenue || 0) - (f.expenses || 0),
        cost: { ...f.cost }
      });
    }

    f.revenue = 0;
    f.expenses = 0;
    f.profit = 0;

    Object.keys(f.cost).forEach(k => f.cost[k] = 0);
    f.current_month = monthKey;
  }

  /* === TOTALS === */
  f.revenue  += payload.revenue;
  f.expenses += payload.costTotal || 0;
  f.profit   += payload.profit || 0;
  f.capital  += payload.profit || 0;

  /* === COST BREAKDOWN === */
  if (payload.costs) {
    if (payload.costs.fuel) f.cost.fuel += payload.costs.fuel;
    if (payload.costs.handling) f.cost.ground_handling += payload.costs.handling;
    if (payload.costs.slot) f.cost.slot_fees += payload.costs.slot;
    if (payload.costs.overflight) f.cost.overflight += payload.costs.overflight;
    if (payload.costs.navigation) f.cost.navigation += payload.costs.navigation;
  }

  pushLog({
    type: "INCOME",
    source: payload.source || "FLIGHT",
    amount: payload.revenue,
    meta: payload.meta || {}
  });

  saveFinance(f);
  window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));
};

/* ============================================================
   🔹 ECONOMICS → FINANCE BRIDGE (READ ONLY)
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ECONOMICS", e => {

  const eco = e.detail;
  if (!eco) return;

  window.ACS_registerIncome({
    type: "FLIGHT",
    source: `FLIGHT ${eco.origin} → ${eco.destination}`,
    revenue: eco.revenue,
    costTotal: eco.costTotal,
    profit: eco.profit,
    costs: {
      fuel: eco.fuelCost,
      handling: eco.handlingCost,
      slot: eco.slotCost,
      overflight: eco.overflightCost,
      navigation: eco.navigationCost
    },
    meta: {
      flightId: eco.flightId,
      aircraftId: eco.aircraftId,
      year: eco.year,
      distanceNM: eco.distanceNM
    }
  });

});

})();

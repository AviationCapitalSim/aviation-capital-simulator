/* ============================================================
   === ACS FINANCE ENGINE — CORE v2.1 (TIME-AWARE) ===
   ------------------------------------------------------------
   ✔ Single source of truth: ACS_Finance
   ✔ Single income entry: ACS_registerIncome()
   ✔ Finance synced to ACS_TIME
   ✔ Monthly rollover automatic
   ✔ No SkyTrack listeners
   ------------------------------------------------------------
   Date: 16 JAN 2026
   ============================================================ */

(function initFinance(){

  if (localStorage.getItem("ACS_Finance")) return;

  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
  const payroll = Number(HR.payroll || 0);

  const base = {
    capital: 500000,
    month: "JAN 1940",

    revenue: 0,
    expenses: payroll,
    profit: -payroll,

    income: {
      routes: 0,
      live_flight: 0,
      route_weekly: 0,
      credits: 0
    },

    weekly: {
      leasing_income: 0,
      weekNumber: null
    },

    cost: {
      salaries: payroll,
      maintenance: 0,
      leasing: 0,
      fuel: 0,
      ground_handling: 0,
      virtual_handling: 0,
      slot_fees: 0,
      penalties: 0,
      loans: 0,
      used_aircraft_purchase: 0,
      new_aircraft_purchase: 0
    },

    history: [{
      month: "JAN 1940",
      revenue: 0,
      expenses: payroll,
      profit: -payroll
    }]
  };

  localStorage.setItem("ACS_Finance", JSON.stringify(base));
})();

/* ============================================================
   LOAD / SAVE / NORMALIZE
   ============================================================ */

function loadFinance(){
  return JSON.parse(localStorage.getItem("ACS_Finance"));
}

function saveFinance(f){
  localStorage.setItem("ACS_Finance", JSON.stringify(f));
}

function normalizeFinance(){
  const f = loadFinance();

  f.capital  = Number(f.capital || 0);
  f.revenue  = Number(f.revenue || 0);
  f.expenses = Number(f.expenses || 0);
  f.profit   = f.revenue - f.expenses;

  f.income ||= {};
  Object.keys(f.income).forEach(k => f.income[k] = Number(f.income[k] || 0));

  f.cost ||= {};
  Object.keys(f.cost).forEach(k => f.cost[k] = Number(f.cost[k] || 0));

  f.weekly ||= { leasing_income: 0, weekNumber: null };

  saveFinance(f);
  return f;
}

/* ============================================================
   CANONICAL API
   ============================================================ */

function ACS_registerIncome(type, payload){

  const f = normalizeFinance();

  let value = typeof payload === "number"
    ? payload
    : Number(payload?.amount || payload?.revenue || payload?.income || 0);

  if (value <= 0) return;

  f.income[type] ??= 0;
  f.income[type] += value;

  if (type === "routes" || type === "route" || type === "flight"){
    f.revenue += value;
  }

  f.capital += value;
  f.profit = f.revenue - f.expenses;

  saveFinance(f);
}

/* ============================================================
   LIVE / WEEKLY
   ============================================================ */

function ACS_updateLiveWeekly(revenue, simDate){

  const f = normalizeFinance();
  if (revenue <= 0) return;

  const d = simDate instanceof Date ? simDate : new Date();
  const dayKey  = d.toISOString().slice(0,10);
  const weekKey = getISOWeek(d);

  if (f._lastLiveDay !== dayKey){
    f.income.live_flight = 0;
    f._lastLiveDay = dayKey;
  }

  if (f._lastWeeklyWeek !== weekKey){
    f.income.route_weekly = 0;
    f._lastWeeklyWeek = weekKey;
  }

  f.income.live_flight = revenue;
  f.income.route_weekly += revenue;

  saveFinance(f);
}

function getISOWeek(d){
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

/* ============================================================
   ⏱️ TIME → FINANCE SYNC  (🔥 FIX)
   ============================================================ */

function ACS_syncMonthWithTime(simDate){

  if (!(simDate instanceof Date)) return;

  const f = normalizeFinance();

  const month =
    simDate.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    }).toUpperCase();

  if (f.month !== month){

    f.history.push({
      month: f.month,
      revenue: f.revenue,
      expenses: f.expenses,
      profit: f.profit
    });

    f.month = month;
    f.revenue = 0;
    f.expenses = f.cost.salaries;
    f.profit = -f.expenses;

    saveFinance(f);
  }
}

if (typeof registerTimeListener === "function"){
  registerTimeListener(ACS_syncMonthWithTime);
}

/* ============================================================
   BANKRUPTCY
   ============================================================ */

function ACS_checkBankruptcy(){
  const f = normalizeFinance();
  if (f.capital < 0){
    console.warn("BANKRUPTCY WARNING", f.capital);
  }
}

if (typeof registerTimeListener === "function"){
  registerTimeListener(ACS_checkBankruptcy);
}

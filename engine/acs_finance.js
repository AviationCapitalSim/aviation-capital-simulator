/* ============================================================
   === ACS FINANCE ENGINE — CORE v2.0 (CLEAN & CANONICAL) ===
   ------------------------------------------------------------
   ✔ Single source of truth: ACS_Finance
   ✔ Single income entry: ACS_registerIncome()
   ✔ No SkyTrack listeners
   ✔ No arrival mirrors
   ✔ No debug monitors
   ✔ Live & Weekly read from Finance ONLY
   ------------------------------------------------------------
   Date: 15 JAN 2026
   ============================================================ */

/* ============================================================
   🧱 INITIALIZATION
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
   🛡️ LOAD / SAVE / NORMALIZE
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

  f.income = f.income || {};
  Object.keys(f.income).forEach(k => {
    f.income[k] = Number(f.income[k] || 0);
  });

  f.cost = f.cost || {};
  Object.keys(f.cost).forEach(k => {
    f.cost[k] = Number(f.cost[k] || 0);
  });

  f.weekly = f.weekly || { leasing_income: 0, weekNumber: null };

  saveFinance(f);
  return f;
}

document.addEventListener("DOMContentLoaded", normalizeFinance);

/* ============================================================
   💰 CANONICAL FINANCE API
   ============================================================ */

function ACS_registerIncome(type, payload, source) {

  const f = normalizeFinance();

  let value = 0;
  if (typeof payload === "number") {
    value = payload;
  } else if (payload && typeof payload === "object") {
    value = Number(payload.amount || payload.revenue || payload.income || 0);
  }

  // 🔒 validaciones
  if (value <= 0) return;

  if (!f.income || typeof f.income !== "object") {
    f.income = {};
  }

  if (f.income[type] === undefined) {
    f.income[type] = 0;
  }

  /* ============================
     💰 INCOME BY TYPE
     ============================ */
  f.income[type] += value;

  /* ============================
     ✈️ OPERATING INCOME
     ============================ */
  if (
    type === "routes" ||
    type === "route" ||
    type === "flight"
  ) {
    f.revenue += value;
  }

  /* ============================
     💼 CAPITAL
     ============================ */
  f.capital += value;

  /* ============================
     📈 PROFIT
     ============================ */
  f.profit = f.revenue - f.expenses;

  saveFinance(f);
}

function ACS_registerExpense(type, amount, source){

  const f = normalizeFinance();
  const value = Number(amount || 0);
  if (value <= 0 || f.cost[type] === undefined) return;

  f.cost[type] += value;
  f.expenses += value;
  f.capital -= value;
  f.profit = f.revenue - f.expenses;

  saveFinance(f);

  ACS_logTransaction({
    type: "EXPENSE",
    source: source || type,
    amount: value
  });
}

/* ============================================================
   📆 LIVE & WEEKLY (READ FROM FINANCE ONLY)
   ============================================================ */

function ACS_updateLiveWeekly(revenue, simDate){

  const f = normalizeFinance();
  if (typeof revenue !== "number" || revenue <= 0) return;

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
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

/* ============================================================
   🧾 TRANSACTION LOG (ACS_Log)
   ============================================================ */

if (!localStorage.getItem("ACS_Log"))
  localStorage.setItem("ACS_Log", "[]");

function ACS_logTransaction(entry){

  const log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");
  log.push({
    time: window.ACS_CurrentSimDate || new Date().toISOString(),
    type: entry.type || "INFO",
    source: entry.source || "System",
    amount: Number(entry.amount || 0)
  });

  if (log.length > 200) log.shift();
  localStorage.setItem("ACS_Log", JSON.stringify(log));
}

/* ============================================================
   💼 HR PAYROLL SYNC
   ============================================================ */

function ACS_syncPayrollWithHR(){

  const f = normalizeFinance();
  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
  const payroll = Number(HR.payroll || 0);

  if (!payroll) return;

  f.cost.salaries = payroll;
  f.expenses = payroll;
  f.capital -= payroll;
  f.profit = f.revenue - f.expenses;

  saveFinance(f);
}

/* ============================================================
   📅 MONTHLY CLOSE
   ============================================================ */

function ACS_closeMonth(){

  const f = normalizeFinance();

  ACS_syncPayrollWithHR();

  f.history.push({
    month: f.month,
    revenue: f.revenue,
    expenses: f.expenses,
    profit: f.profit
  });

  f.revenue = 0;
  f.expenses = f.cost.salaries;
  f.profit = 0;

  saveFinance(f);
}

/* ============================================================
   ⚠️ BANKRUPTCY (UNCHANGED LOGIC)
   ============================================================ */

function ACS_checkBankruptcy(simDate){

  const f = normalizeFinance();
  if (f.capital >= 0) return;

  ACS_logTransaction({
    type: "INFO",
    source: "BANKRUPTCY WARNING",
    amount: f.capital
  });
}

if (typeof registerTimeListener === "function")
  registerTimeListener(ACS_checkBankruptcy);

/* ============================================================
   ✅ END OF FINANCE ENGINE
   ============================================================ */

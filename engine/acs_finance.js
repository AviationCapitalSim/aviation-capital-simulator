/* ============================================================
   === ACS FINANCE ENGINE — CORE CANONICAL v1.6 =================
   ------------------------------------------------------------
   • Contabilidad REAL solamente
   • Capital / Revenue / Expenses / Profit
   • Punto único de ingreso: ACS_registerIncome
   • Sin lógica de UI (Live / Weekly)
   • Sin lógica de SkyTrack
   • Sin lógica de presentación
   ------------------------------------------------------------
   Date: 14 JAN 2026
   ============================================================ */

console.log("💼 ACS Finance Engine v1.6 loaded");

/* ============================================================
   === BASE INITIALIZATION ====================================
   ============================================================ */

if (!localStorage.getItem("ACS_Finance")) {

  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
  const payroll = Number(HR.payroll || 0);

  const baseFinance = {
    capital: 500000,
    month: "JAN 1940",

    revenue: 0,
    expenses: payroll,
    profit: -payroll,

    income: {
      routes: 0,
      credits: 0
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

    history: [
      {
        month: "JAN 1940",
        revenue: 0,
        expenses: payroll,
        profit: -payroll
      }
    ]
  };

  localStorage.setItem("ACS_Finance", JSON.stringify(baseFinance));
}

/* ============================================================
   === LOAD / SAVE HELPERS ====================================
   ============================================================ */

function loadFinance() {
  ACS_normalizeFinance();
  return JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
}

function saveFinance(f) {
  localStorage.setItem("ACS_Finance", JSON.stringify(f));
  ACS_normalizeFinance();
}

/* ============================================================
   === FINANCE NORMALIZER (SAFE & IDEMPOTENT) ==================
   ============================================================ */

function ACS_normalizeFinance() {

  let f;
  try {
    f = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  } catch {
    f = {};
  }

  // Core
  f.capital  = Number(f.capital  || 0);
  f.revenue  = Number(f.revenue  || 0);
  f.expenses = Number(f.expenses || 0);
  f.profit   = f.revenue - f.expenses;

  // Income
  f.income = f.income && typeof f.income === "object" ? f.income : {};
  f.income.routes  = Number(f.income.routes  || 0);
  f.income.credits = Number(f.income.credits || 0);

  // Costs
  f.cost = f.cost && typeof f.cost === "object" ? f.cost : {};
  Object.keys(f.cost).forEach(k => {
    f.cost[k] = Number(f.cost[k] || 0);
  });

  // History
  f.history = Array.isArray(f.history) ? f.history : [];

  localStorage.setItem("ACS_Finance", JSON.stringify(f));
  return f;
}

/* ============================================================
   === TRANSACTION LOG (ACS_Log) ===============================
   ============================================================ */

if (!localStorage.getItem("ACS_Log")) {
  localStorage.setItem("ACS_Log", "[]");
}

function ACS_logTransaction(entry) {

  const log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");

  log.push({
    time: entry.time || window.ACS_CurrentSimDate || new Date().toISOString(),
    type: entry.type || "INFO",
    source: entry.source || "System",
    amount: Number(entry.amount || 0)
  });

  if (log.length > 300) log.shift();
  localStorage.setItem("ACS_Log", JSON.stringify(log));
}

/* ============================================================
   === CANONICAL INCOME ENTRY POINT ============================
   ============================================================ */

function ACS_registerIncome(incomeType, payload, source) {

  let value = 0;

  if (typeof payload === "number") {
    value = payload;
  } else if (payload && typeof payload === "object") {
    value = Number(payload.amount || payload.revenue || 0);
  }

  if (value <= 0) {
    console.warn("[FINANCE] Invalid income payload:", payload);
    return;
  }

  const f = loadFinance();
  if (!f.income || f.income[incomeType] === undefined) {
    console.warn("[FINANCE] Invalid income type:", incomeType);
    return;
  }

  const before = f.capital;

  f.income[incomeType] += value;
  f.revenue += value;
  f.capital += value;
  f.profit = f.revenue - f.expenses;

  saveFinance(f);

  ACS_logTransaction({
    type: "INCOME",
    source: source || incomeType,
    amount: value
  });

  console.log(
    "%c💰 [FINANCE] INCOME APPLIED",
    "color:#00ff80;font-weight:bold;",
    {
      type: incomeType,
      amount: value,
      capital: `${before} → ${f.capital}`
    }
  );
}

/* ============================================================
   === EXPENSE HELPERS ========================================
   ============================================================ */

function ACS_registerExpense(costType, amount, source) {

  const value = Number(amount || 0);
  if (value <= 0) return;

  const f = loadFinance();
  if (!f.cost || f.cost[costType] === undefined) return;

  f.cost[costType] += value;
  f.expenses += value;
  f.capital -= value;
  f.profit = f.revenue - f.expenses;

  saveFinance(f);

  ACS_logTransaction({
    type: "EXPENSE",
    source: source || costType,
    amount: value
  });
}

/* ============================================================
   === MONTHLY CLOSE (TIME ENGINE) =============================
   ============================================================ */

function ACS_closeMonth() {

  const f = loadFinance();

  f.history.push({
    month: f.month,
    revenue: f.revenue,
    expenses: f.expenses,
    profit: f.profit
  });

  // Reset monthly counters
  f.revenue = 0;
  f.expenses = f.cost.salaries;
  f.profit = f.revenue - f.expenses;

  saveFinance(f);
}

/* ============================================================
   === MONTH SYNC WITH TIME ENGINE =============================
   ============================================================ */

function ACS_handleMonthlyFinance(simDate) {

  if (!(simDate instanceof Date)) return;

  const months = ["JAN","FEB","MAR","APR","MAY","JUN",
                  "JUL","AUG","SEP","OCT","NOV","DEC"];

  const label = `${months[simDate.getUTCMonth()]} ${simDate.getUTCFullYear()}`;

  const f = loadFinance();
  if (f.month !== label) {

    ACS_closeMonth();
    const f2 = loadFinance();
    f2.month = label;
    saveFinance(f2);

    console.log("📅 Finance advanced to:", label);
  }
}

if (typeof registerTimeListener === "function") {
  registerTimeListener(ACS_handleMonthlyFinance);
}

/* ============================================================
   === HR PAYROLL SYNC ========================================
   ============================================================ */

function ACS_syncPayrollWithHR() {

  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
  const payroll = Number(HR.payroll || 0);
  if (!payroll) return;

  const f = loadFinance();

  f.cost.salaries = payroll;
  f.expenses = payroll;
  f.capital -= payroll;
  f.profit = f.revenue - f.expenses;

  saveFinance(f);

  ACS_logTransaction({
    type: "EXPENSE",
    source: "Payroll",
    amount: payroll
  });

  console.log("💸 Payroll applied:", payroll);
}

/* ============================================================
   === CAPITAL API ============================================
   ============================================================ */

function ACS_getCapital() {
  return loadFinance().capital;
}

function ACS_getHistory() {
  return loadFinance().history;
}

/* ============================================================
   === INITIAL SANITY =========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  ACS_normalizeFinance();
});

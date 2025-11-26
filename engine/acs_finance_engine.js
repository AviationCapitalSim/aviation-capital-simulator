/* ============================================================
   === ACS GLOBAL FINANCE ENGINE v1.0 ==========================
   ------------------------------------------------------------
   ▪ Controla capital, ingresos, gastos y profit
   ▪ Se integra con:
        - Buy New
        - Used Market
        - Leasing Engine
        - Maintenance Engine
   ▪ Mantiene un LOG oficial
   ============================================================ */

console.log("💰 ACS Finance Engine Loaded");

/* === Structure Init === */
if (!localStorage.getItem("ACS_Finance")) {
  localStorage.setItem("ACS_Finance", JSON.stringify({
    capital: 3000000,   // Starting money
    revenue: 0,
    expenses: 0,
    profit: 0,
    history: []
  }));
}

/* === Log Structure === */
if (!localStorage.getItem("ACS_Log")) {
  localStorage.setItem("ACS_Log", JSON.stringify([]));
}

/* ============================================================
   === CORE FUNCTIONS =========================================
   ============================================================ */

function ACS_addRevenue(source, amount) {
  const f = JSON.parse(localStorage.getItem("ACS_Finance"));
  const log = JSON.parse(localStorage.getItem("ACS_Log"));

  f.revenue += amount;
  f.capital += amount;
  f.profit = f.revenue - f.expenses;

  log.push({
    time: new Date().toISOString(),
    type: "Revenue",
    source,
    amount
  });

  localStorage.setItem("ACS_Finance", JSON.stringify(f));
  localStorage.setItem("ACS_Log", JSON.stringify(log));
}

function ACS_addExpense(source, amount) {
  const f = JSON.parse(localStorage.getItem("ACS_Finance"));
  const log = JSON.parse(localStorage.getItem("ACS_Log"));

  f.expenses += amount;
  f.capital -= amount;
  f.profit = f.revenue - f.expenses;

  log.push({
    time: new Date().toISOString(),
    type: "Expense",
    source,
    amount
  });

  localStorage.setItem("ACS_Finance", JSON.stringify(f));
  localStorage.setItem("ACS_Log", JSON.stringify(log));
}

/* ============================================================
   === MONTHLY HISTORY (for charts) ===========================
   ============================================================ */
function ACS_registerMonthlyHistory(simDate) {
  const f = JSON.parse(localStorage.getItem("ACS_Finance"));
  const history = f.history || [];

  const label = simDate.toLocaleString("en-US", {
    month: "short",
    year: "numeric"
  });

  history.push({
    month: label,
    profit: f.profit
  });

  f.history = history;
  localStorage.setItem("ACS_Finance", JSON.stringify(f));
}

/* === RUN ONCE PER MONTH === */
function ACS_financeWatcher(simTime) {
  const t = new Date(simTime);
  const ym = t.getUTCFullYear() + "-" + t.getUTCMonth();
  const last = localStorage.getItem("ACS_Finance_LastMonth");

  if (ym !== last) {
    localStorage.setItem("ACS_Finance_LastMonth", ym);
    ACS_registerMonthlyHistory(t);
    console.log("📊 Finance history updated.");
  }
}

if (typeof registerTimeListener === "function") {
  registerTimeListener(ACS_financeWatcher);
}

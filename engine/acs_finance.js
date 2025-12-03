/* ============================================================
   === ACS FINANCE ENGINE - CORE v1.5 (Integración HR) ========
   ------------------------------------------------------------
   ▪ Capital inicial: 1,000,000 USD (Año 1940)
   ▪ Payroll inicial automático desde HR
   ▪ Manejo de ingresos, gastos y profit
   ▪ Historial mensual inicial (Month 1 - JAN 1940)
   ▪ API completa para todos los módulos
   ▪ Ahora sincronizado con ACS_HR
   ▪ Extendido con LOG de transacciones (ACS_Log)
   ▪ Integrado con Used Market y Buy New (NEW)
   ============================================================ */

// Crear estructura base si no existe
if (!localStorage.getItem("ACS_Finance")) {

  // Traer payroll del HR inicial
  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
  const payroll = HR && HR.payroll ? HR.payroll : 0;

  const baseFinance = {
    capital: 1000000,
    month: "JAN 1940",

    revenue: 0,
    expenses: payroll,
    profit: -payroll,

    income: {
      routes: 0,
      cargo: 0,
      leasing_income: 0,
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

      /* 🟨 Compras de aviones usados */
      used_aircraft_purchase: 0,

      /* 🟦 Compras de aviones nuevos (Buy New) */
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
   === HELPERS LOAD / SAVE ====================================
   ============================================================ */
function loadFinance() {
  return JSON.parse(localStorage.getItem("ACS_Finance"));
}

function saveFinance(data) {
  localStorage.setItem("ACS_Finance", JSON.stringify(data));
}

/* ============================================================
   === FINANCE — SPARKLINE UTILITY RESTORE (v1.0) ============
   ------------------------------------------------------------
   • Recupera la función que dibuja los micro-gráficos
   • Evita errores en consola
   • Se usa en company_finance.html
   ============================================================ */

function renderSparklines() {
  const canvases = document.querySelectorAll(".sparkline");
  if (!canvases.length) return;

  canvases.forEach(canvas => {
    const ctx = canvas.getContext("2d");

    let data = [];
    try {
      data = JSON.parse(canvas.dataset.values || "[]");
    } catch (e) {
      data = [0, 0, 0, 0, 0];
    }

    if (!data.length) data = [0, 0, 0, 0, 0];

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "#FFB300";  // Golden ACS line
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = w / (data.length - 1);
    const maxV = Math.max(...data);
    const minV = Math.min(...data);
    const range = maxV - minV || 1;

    data.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - minV) / range) * h;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  });
}

/* ============================================================
   ===  INTEGRACIÓN HR — PAYROLL REAL                         ==
   ============================================================ */

function ACS_syncPayrollWithHR() {
  const f = loadFinance();
  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");

  if (!f || !HR || !HR.payroll) return;

  f.cost.salaries = HR.payroll;
  f.expenses = HR.payroll; // por ahora solo salarios
  f.profit = f.revenue - f.expenses;

  saveFinance(f);
}

/* ============================================================
   === API PRINCIPAL (módulos pueden llamar estos métodos) ====
   ============================================================ */

// Agregar ingreso
function ACS_addIncome(type, amount) {
  const f = loadFinance();
  const value = Number(amount) || 0;

  if (f.income[type] !== undefined) {
    f.income[type] += value;
    f.revenue += value;
    f.capital += value;
    saveFinance(f);
  }
}

// Agregar gasto
function ACS_addExpense(type, amount) {
  const f = loadFinance();
  const value = Number(amount) || 0;

  if (f.cost[type] !== undefined) {
    f.cost[type] += value;
    f.expenses += value;
    f.capital -= value;
    saveFinance(f);
  }
}

// Calcular profit del mes
function ACS_updateProfit() {
  const f = loadFinance();
  f.profit = f.revenue - f.expenses;
  saveFinance(f);
}

// Guardar registro mensual en el historial
function ACS_closeMonth() {
  const f = loadFinance();

  // Sincronizar payroll antes de cerrar
  ACS_syncPayrollWithHR();

  // Calcular profit final
  ACS_updateProfit();

  f.history.push({
    month: f.month,
    revenue: f.revenue,
    expenses: f.expenses,
    profit: f.profit
  });

  // Reset para el siguiente mes
  f.revenue = 0;
  f.expenses = f.cost.salaries; // salaries siempre quedan activos
  f.profit = 0;

  saveFinance(f);
}

// API para obtener capital en vivo
function ACS_getCapital() {
  return loadFinance().capital;
}

// API para obtener historial
function ACS_getHistory() {
  return loadFinance().history;
}

/* ============================================================
   === TRANSACCION LOG (ACS_Log) — NUEVO =======================
   ============================================================ */

// Inicializar log si no existe
if (!localStorage.getItem("ACS_Log")) {
  localStorage.setItem("ACS_Log", "[]");
}

function ACS_getLog() {
  return JSON.parse(localStorage.getItem("ACS_Log") || "[]");
}

function ACS_saveLog(arr) {
  localStorage.setItem("ACS_Log", JSON.stringify(arr));
}

/**
 * Registra una transacción genérica en ACS_Log
 *  entry = { type: "EXPENSE"|"INCOME"|"INFO", source: "...", amount: 12345 }
 */
function ACS_logTransaction(entry) {
  const log = ACS_getLog();

  const time = entry.time || window.ACS_CurrentSimDate;
  const type = entry.type || "INFO";
  const source = entry.source || "System";
  const amount = Number(entry.amount) || 0;

  log.push({ time, type, source, amount });

  if (log.length > 200) log.shift();

  ACS_saveLog(log);
}

/**
 * Helper de gasto
 */
function ACS_registerExpense(costType, amount, source) {
  const value = Number(amount) || 0;
  if (value <= 0) return;

  ACS_addExpense(costType, value);

  ACS_logTransaction({
    type: "EXPENSE",
    source: source || costType,
    amount: value
  });
}

/**
 * Helper de ingreso
 */
function ACS_registerIncome(incomeType, amount, source) {
  const value = Number(amount) || 0;
  if (value <= 0) return;

  ACS_addIncome(incomeType, value);

  ACS_logTransaction({
    type: "INCOME",
    source: source || incomeType,
    amount: value
  });
}

/* ============================================================
   === AUTO-SYNC AL ENTRAR AL DASHBOARD =======================
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  const isDashboard =
    window.location.pathname.includes("dashboard.html") ||
    window.location.href.includes("dashboard.html");

  if (!isDashboard) return;

  ACS_syncPayrollWithHR();

  console.log("💼 Finance synced with HR → payroll actualizado.");
});

/* ============================================================
   === PAYMENTS ENGINE — LEASING MONTHLY AUTO-PAY  ============
   ============================================================ */

function ACS_runMonthlyLeasePayments(simDate){

  let current = simDate instanceof Date ? simDate : new Date();

  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  if (!fleet.length) return;

  let finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  if (!finance.capital) {
    console.warn("⚠️ Finance not initialized.");
    return;
  }

  let log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");

  let updated = false;

  fleet.forEach(ac => {

    if (!ac.leasing || !ac.leasing.monthly) return;

    const nextDue = new Date(ac.leasing.nextPayment);

    if (current >= nextDue){

      const amount = ac.leasing.monthly;

      finance.capital -= amount;
      finance.expenses += amount;
      finance.profit   = finance.revenue - finance.expenses;

      log.push({
        time: window.ACS_CurrentSimDate,
        type: "EXPENSE",
        source: `Monthly Lease Payment — ${ac.manufacturer} ${ac.model}`,
        amount: amount
      });

      const next = new Date(nextDue);
      next.setUTCMonth(next.getUTCMonth() + 1);
      ac.leasing.nextPayment = next.toISOString();

      updated = true;
    }
  });

  if (updated){
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    localStorage.setItem("ACS_Finance", JSON.stringify(finance));
    localStorage.setItem("ACS_Log", JSON.stringify(log));

    console.log("💳 Monthly lease payments processed.");
  }
}

/* ============================================================
   === REGISTER TIME ENGINE LISTENER ===========================
   ============================================================ */

if (typeof registerTimeListener === "function") {
  registerTimeListener(ACS_runMonthlyLeasePayments);
}

/* ============================================================
   ===  SYNC FINANCE WITH TIME ENGINE (Monthly Close) =========
   ============================================================ */

function ACS_handleMonthlyFinance(simDate) {
  try {
    const f = loadFinance();
    if (!f) return;

    const months = ["JAN","FEB","MAR","APR","MAY","JUN",
                    "JUL","AUG","SEP","OCT","NOV","DEC"];

    const m = months[simDate.getUTCMonth()] + " " + simDate.getUTCFullYear();

    if (f.month !== m) {

      ACS_closeMonth();

      const f2 = loadFinance();
      f2.month = m;
      saveFinance(f2);

      console.log("📅 Finance advanced to:", m);
    }

  } catch(e){
    console.error("❌ Finance monthly sync error:", e);
  }
}

if (typeof registerTimeListener === "function") {
  registerTimeListener(ACS_handleMonthlyFinance);
}

/* ============================================================
   === FORMAT SIMULATED DATE FOR FINANCE LOG ==================
   ============================================================ */

function ACS_formatSimDate(d) {
  try {
    if (!(d instanceof Date)) d = new Date(d);

    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL",
                    "AUG","SEP","OCT","NOV","DEC"];
    const mon = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");

    return `${day} ${mon} ${year} — ${hh}:${mm}`;
  } catch (e) {
    console.warn("Date format error:", e);
    return "INVALID DATE";
  }
}

/* ============================================================
   === ACS FINANCE — REGISTRO DE COMPRA DE AVIONES USADOS =====
   ============================================================ */

function ACS_registerUsedAircraftPurchase(amount, model){
  try {
    let finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

    finance.capital    = finance.capital    || 0;
    finance.revenue    = finance.revenue    || 0;
    finance.expenses   = finance.expenses   || 0;
    finance.cost       = finance.cost       || {};
    finance.cost.used_aircraft_purchase = finance.cost.used_aircraft_purchase || 0;

    finance.capital -= amount;
    finance.expenses += amount;
    finance.cost.used_aircraft_purchase += amount;
    finance.profit = finance.revenue - finance.expenses;

    localStorage.setItem("ACS_Finance", JSON.stringify(finance));

    let log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");

    log.push({
      time: ACS_formatSimDate(ACS_TIME.currentTime),
      type: "EXPENSE",
      source: `Used Market Purchase — ${model}`,
      amount: amount
    });

    if (log.length > 200) log.shift();

    localStorage.setItem("ACS_Log", JSON.stringify(log));

  } catch(e){
    console.error("❌ ACS_registerUsedAircraftPurchase ERROR:", e);
  }
}

/* ============================================================
   === ACS FINANCE — COMPRA DE AVIONES NUEVOS (BUY NEW) =======
   ============================================================ */

function ACS_registerNewAircraftPurchase(amount, model, qty){
  try {
    let finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

    finance.capital  = finance.capital  || 0;
    finance.revenue  = finance.revenue  || 0;
    finance.expenses = finance.expenses || 0;
    finance.cost     = finance.cost     || {};
    finance.cost.new_aircraft_purchase =
      finance.cost.new_aircraft_purchase || 0;

    const value = Number(amount) || 0;
    if (value <= 0) return;

    finance.capital -= value;
    finance.expenses += value;
    finance.cost.new_aircraft_purchase += value;

    finance.profit = finance.revenue - finance.expenses;

    localStorage.setItem("ACS_Finance", JSON.stringify(finance));

    let log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");

    const simTime =
      (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime)
        ? ACS_TIME.currentTime
        : new Date();

    log.push({
      time: ACS_formatSimDate(simTime),
      type: "EXPENSE",
      source: `New Aircraft Purchase — ${model}${qty ? " x" + qty : ""}`,
      amount: value
    });

    if (log.length > 200) log.shift();

    localStorage.setItem("ACS_Log", JSON.stringify(log));

  } catch(e){
    console.error("❌ ACS_registerNewAircraftPurchase ERROR:", e);
  }
}

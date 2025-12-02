/* ============================================================
   === ACS FINANCE ENGINE - CORE v1.5 (Integración HR) ========
   ------------------------------------------------------------
   ▪ Capital inicial: 3,000,000 USD (Año 1940)
   ▪ Payroll inicial automático desde HR
   ▪ Manejo de ingresos, gastos y profit
   ▪ Historial mensual inicial (Month 1 - JAN 1940)
   ▪ API completa para todos los módulos
   ▪ Ahora sincronizado con ACS_HR
   ▪ Extendido con LOG de transacciones (ACS_Log)
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

      /* 🟨 Nuevo costo oficial para compras de usados */
      used_aircraft_purchase: 0
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
   ===  INTEGRACIÓN HR — PAYROLL REAL                         ==
   ============================================================ */
function ACS_syncPayrollWithHR() {
  const f = loadFinance();
  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");

  if (!f || !HR || !HR.payroll) return;

  f.cost.salaries = HR.payroll;
  f.expenses = HR.payroll; // por ahora solo salarios (resto vendrá luego)
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
 *  entry = { type: "EXPENSE"|"INCOME"|"INFO", source: "Used Market", amount: 12345 }
 */

function ACS_logTransaction(entry) {
  const log = ACS_getLog();

  // 🔥 Usar fecha real del juego (guardada por updateClockDisplay)
  const time = entry.time || window.ACS_CurrentSimDate;

  const type = entry.type || "INFO";
  const source = entry.source || "System";
  const amount = Number(entry.amount) || 0;

  log.push({ time, type, source, amount });

  // Mantener el log razonable (últimas 200 transacciones)
  if (log.length > 200) {
    log.shift();
  }

  ACS_saveLog(log);
}

/**
 * Helper de gasto: actualiza FINANCE + añade registro al LOG
 * costType: clave dentro de cost{} (ej: "leasing", "maintenance", "fuel")
 * source: texto libre para el origen (ej: "Used Market Purchase")
 */

function ACS_registerExpense(costType, amount, source) {
  const value = Number(amount) || 0;
  if (value <= 0) return;

  // Actualizar módulo Finance
  ACS_addExpense(costType, value);

  // Registrar en LOG
  ACS_logTransaction({
    type: "EXPENSE",
    source: source || costType,
    amount: value
  });
}

/**
 * Helper de ingreso: actualiza FINANCE + añade registro al LOG
 * incomeType: clave dentro de income{} (ej: "routes", "leasing_income")
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
   ===  AUTO-SYNC AL ENTRAR AL DASHBOARD ======================
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  const isDashboard =
    window.location.pathname.includes("dashboard.html") ||
    window.location.href.includes("dashboard.html");

  if (!isDashboard) return;

  // Cada vez que se entra al Dashboard:
  // sincronizamos salarios de HR con Finance
  ACS_syncPayrollWithHR();

  console.log("💼 Finance synced with HR → payroll actualizado.");
});
/* ============================================================
   ===  PAYMENTS ENGINE — LEASING MONTHLY AUTO-PAY  ============
   ============================================================ */

function ACS_runMonthlyLeasePayments(simDate){

  // === Fecha simulada del juego desde ACS_TIME ===
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

    // === Si ya es el mes del pago o ya pasó ===
    if (current >= nextDue){

      const amount = ac.leasing.monthly;

      // === Actualizar finanzas ===
      finance.capital -= amount;
      finance.expenses += amount;
      finance.profit = finance.revenue - finance.expenses;

      // === Registrar en log ===
      log.push({
        time: current.toLocaleString(),
        type: "Expense",
        source: `Monthly Lease Payment — ${ac.manufacturer} ${ac.model}`,
        amount: amount
      });

      // === Próxima fecha de pago ===
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
    // simDate = fecha real del juego (Date)
    const f = loadFinance();
    if (!f) return;

    // Extraer mes actual del juego
    const months = ["JAN","FEB","MAR","APR","MAY","JUN",
                    "JUL","AUG","SEP","OCT","NOV","DEC"];
    const m = months[simDate.getUTCMonth()] + " " + simDate.getUTCFullYear();

    // Si cambió el mes → cerramos el mes y avanzamos
    if (f.month !== m) {

      // cerrar el mes
      ACS_closeMonth();

      // actualizar el mes nuevo
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
   === ACS FINANCE — REGISTRO DE COMPRA DE AVIONES USADOS =====
   ============================================================ */

function ACS_registerUsedAircraftPurchase(amount, model){
  try {
    let finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

    // Asegurar estructuras internas
    finance.capital    = finance.capital    || 0;
    finance.revenue    = finance.revenue    || 0;
    finance.expenses   = finance.expenses   || 0;
    finance.cost       = finance.cost       || {};
    finance.cost.used_aircraft_purchase = finance.cost.used_aircraft_purchase || 0;

    // Descontar capital
    finance.capital -= amount;

    // Añadir a gastos generales
    finance.expenses += amount;

    // Añadir a categoría específica
    finance.cost.used_aircraft_purchase += amount;

    // Actualizar profit
    finance.profit = finance.revenue - finance.expenses;

    // Guardar
    localStorage.setItem("ACS_Finance", JSON.stringify(finance));

    // Log contable
    let log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");
    log.push({
    time: window.ACS_CurrentSimDate, // 🔥 FECHA REAL DEL JUEGO
    type: "EXPENSE",
    source: `Used Market Purchase — ${model}`,
    amount: amount
    });
    localStorage.setItem("ACS_Log", JSON.stringify(log));

  } catch(e){
    console.error("❌ ACS_registerUsedAircraftPurchase ERROR:", e);
  }
}

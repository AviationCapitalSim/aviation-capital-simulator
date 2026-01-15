/* ============================================================
   === ACS FINANCE ENGINE - CORE v1.5 14JAN26 ========
   ------------------------------------------------------------
   ▪ Capital inicial: 500,000 USD (Año 1940)
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
   🛫 C2.A — GET AIRPORT CATEGORY — v1.0
   ------------------------------------------------------------
   • Obtiene la categoría ACS del aeropuerto (Primary, Major…)
   • Usa WorldAirportsACS cargado por airports_loader.js
   ============================================================ */

function ACS_getAirportCategory(icao) {

    if (!icao || typeof WorldAirportsACS !== "object") return "Small";

    const key = icao.trim().toUpperCase();

    for (const cont in WorldAirportsACS) {
        const list = WorldAirportsACS[cont];
        if (!Array.isArray(list)) continue;

        const ap = list.find(a => a.icao === key);
        if (ap && ap.category) {
            return ap.category;   // "Primary", "Major", "Regional", "Small"
        }
    }

    return "Small"; // fallback
}

/* ============================================================
   💰 C2.B — BASE SLOT FEES (Año 1940)
   ============================================================ */

const ACS_SLOT_BASE_FEES = {
    confirm : {
        Primary  : 105,
        Major    : 75,
        Regional : 35,
        Small    : 15
    },
    operation : {
        Primary  : 105,
        Major    : 75,
        Regional : 35,
        Small    : 15
    },
    weekly : {
        Primary  : 22,
        Major    : 16,
        Regional : 8,
        Small    : 4
    }
};

/* ============================================================
   📈 C2.C — DYNAMIC SLOT FEE (1940 → 2026)
   ------------------------------------------------------------
   • factor = escala lineal 1.0 → 9.0
   • aplica sobre la tarifa base de 1940
   • modos: confirm, operation, weekly
   ============================================================ */
function ACS_getSlotFeeDynamic(icao, mode = "operation") {

    const category = ACS_getAirportCategory(icao);
    const base = ACS_SLOT_BASE_FEES[mode][category] || 10;

    // Año simulado
    const simTime = (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime)
        ? ACS_TIME.currentTime
        : new Date("1940-01-01");

    const year = simTime.getUTCFullYear();

    // Escala: 1940 → 1.0     2026 → 9.0
    const factor = 1 + ((year - 1940) / (2026 - 1940)) * 8;

    return Math.round(base * factor);
}

/* ============================================================
   💵 C2.D — CHARGE SLOT CONFIRMATION FEE — v1.0
   ------------------------------------------------------------
   • Se usa al confirmar una ruta
   • Cobra salida + llegada
   • Registra en ACS_Finance + ACS_Log
   ============================================================ */

function ACS_finance_chargeSlotConfirmFee(route) {

    if (!route) return;

    const origin = route.origin;
    const dest   = route.destination;

    const feeOut = ACS_getSlotFeeDynamic(origin, "confirm");
    const feeIn  = ACS_getSlotFeeDynamic(dest, "confirm");

    const total  = feeOut + feeIn;

    // 1) Debitar de capital
    const F = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
    if (F && typeof F.capital === "number") {
        F.capital -= total;
        F.expenses += total;
        F.profit = F.revenue - F.expenses;
        localStorage.setItem("ACS_Finance", JSON.stringify(F));
    }

    // 2) Registrar en LOG financiero
    const LOG = JSON.parse(localStorage.getItem("ACS_Log") || "[]");
    LOG.unshift({
        id: "LOG-" + Date.now(),
        type: "slot_confirm",
        route: `${origin}→${dest}`,
        amount: -total,
        feeOut,
        feeIn,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem("ACS_Log", JSON.stringify(LOG));

    console.log(`💵 Slot confirm fee charged: ${total} USD`);
}

/* ============================================================
   💵 C2.E — CHARGE SLOT OPERATION FEE — v1.0
   ------------------------------------------------------------
   • Se cobra cada vez que el vuelo despegue/aterrice
   • slotFee = origin(operation) + dest(operation)
   ============================================================ */
function ACS_finance_chargeSlotOperation(route) {

    if (!route) return;

    const origin = route.origin;
    const dest   = route.destination;

    const feeOut = ACS_getSlotFeeDynamic(origin, "operation");
    const feeIn  = ACS_getSlotFeeDynamic(dest, "operation");

    const total  = feeOut + feeIn;

    const F = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
    if (F && typeof F.capital === "number") {
        F.capital -= total;
        F.expenses += total;
        F.profit = F.revenue - F.expenses;
        localStorage.setItem("ACS_Finance", JSON.stringify(F));
    }

    const LOG = JSON.parse(localStorage.getItem("ACS_Log") || "[]");
    LOG.unshift({
        id: "LOG-" + Date.now(),
        type: "slot_operation",
        route: `${origin}→${dest}`,
        amount: -total,
        feeOut,
        feeIn,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem("ACS_Log", JSON.stringify(LOG));

    console.log(`🛫 Slot operation fee charged: ${total} USD`);
}

/* ============================================================
   💵 C2.F — CHARGE WEEKLY HOLDING FEE — v1.0
   ------------------------------------------------------------
   • Se cobra si la ruta está suspendida
   • slotFee = origin(weekly) + dest(weekly)
   ============================================================ */

function ACS_finance_chargeSlotHoldingFee(route) {

    if (!route) return;

    const origin = route.origin;
    const dest   = route.destination;

    const feeOut = ACS_getSlotFeeDynamic(origin, "weekly");
    const feeIn  = ACS_getSlotFeeDynamic(dest, "weekly");

    const total  = feeOut + feeIn;

    const F = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
    if (F && typeof F.capital === "number") {
        F.capital -= total;
        F.expenses += total;
        F.profit = F.revenue - F.expenses;
        localStorage.setItem("ACS_Finance", JSON.stringify(F));
    }

    const LOG = JSON.parse(localStorage.getItem("ACS_Log") || "[]");
    LOG.unshift({
        id: "LOG-" + Date.now(),
        type: "slot_weekly",
        route: `${origin}→${dest}`,
        amount: -total,
        feeOut,
        feeIn,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem("ACS_Log", JSON.stringify(LOG));

    console.log(`📆 Weekly slot holding fee charged: ${total} USD`);
}

/* ============================================================
   === HELPERS LOAD / SAVE ====================================
   ============================================================ */

function loadFinance() {
  ACS_normalizeFinance();
  return JSON.parse(localStorage.getItem("ACS_Finance"));
}

function saveFinance(data) {
  localStorage.setItem("ACS_Finance", JSON.stringify(data));
  ACS_normalizeFinance();
}

/* ============================================================
   🛡️ F2.1 — FINANCE NORMALIZER (ANTI-NULL / SAFE STATE)
   ------------------------------------------------------------
   • Garantiza estructura válida de ACS_Finance
   • Nunca permite null / undefined
   • Se puede llamar múltiples veces (idempotente)
   ============================================================ */

function ACS_normalizeFinance() {
  let f;

  try {
    f = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  } catch {
    f = {};
  }

  // === Core numbers ===
  f.capital  = Number(f.capital  || 0);
  f.revenue  = Number(f.revenue  || 0);
  f.expenses = Number(f.expenses || 0);
  f.profit   = Number(f.profit   || 0);

  // === Income buckets ===
  f.income = f.income && typeof f.income === "object" ? f.income : {};
  f.income.routes        = Number(f.income.routes        || 0);
  f.income.live_flight   = Number(f.income.live_flight   || 0);
  f.income.route_weekly  = Number(f.income.route_weekly  || 0);
  f.income.credits       = Number(f.income.credits       || 0);

  // === Weekly buckets ===
  f.weekly = f.weekly && typeof f.weekly === "object" ? f.weekly : {};
  f.weekly.leasing_income = Number(f.weekly.leasing_income || 0);
  f.weekly.weekNumber = Number.isFinite(f.weekly.weekNumber)
  ? f.weekly.weekNumber
  : null;

  // === Cost buckets ===
  f.cost = f.cost && typeof f.cost === "object" ? f.cost : {};
  f.cost.salaries               = Number(f.cost.salaries               || 0);
  f.cost.maintenance            = Number(f.cost.maintenance            || 0);
  f.cost.leasing                = Number(f.cost.leasing                || 0);
  f.cost.fuel                   = Number(f.cost.fuel                   || 0);
  f.cost.ground_handling        = Number(f.cost.ground_handling        || 0);
  f.cost.virtual_handling       = Number(f.cost.virtual_handling       || 0);
  f.cost.slot_fees              = Number(f.cost.slot_fees              || 0);
  f.cost.penalties              = Number(f.cost.penalties              || 0);
  f.cost.loans                  = Number(f.cost.loans                  || 0);
  f.cost.used_aircraft_purchase = Number(f.cost.used_aircraft_purchase || 0);
  f.cost.new_aircraft_purchase  = Number(f.cost.new_aircraft_purchase  || 0);

  // === History ===
  f.history = Array.isArray(f.history) ? f.history : [];

  // === Recompute profit (single source of truth) ===
  f.profit = f.revenue - f.expenses;

  localStorage.setItem("ACS_Finance", JSON.stringify(f));
  return f;
}

/* ============================================================
   🟩 F1 — FINANCE SANITIZER (CANONICAL)
   ------------------------------------------------------------
   • Nunca fuerza capital a 0
   • Nunca pisa expenses
   • Elimina null / NaN
   • Recalcula profit de forma segura
   ============================================================ */

function ACS_sanitizeFinance() {
  try {
    let f = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

    // Estructura base garantizada
    f.capital  = Number(f.capital)  || 0;
    f.revenue  = Number(f.revenue)  || 0;
    f.expenses = Number(f.expenses) || 0;
    f.profit   = f.revenue - f.expenses;

    // Subestructuras seguras
    f.income = f.income || {};
    f.cost   = f.cost   || {};

    Object.keys(f.cost).forEach(k => {
      f.cost[k] = Number(f.cost[k]) || 0;
    });

    Object.keys(f.income).forEach(k => {
      f.income[k] = Number(f.income[k]) || 0;
    });

    localStorage.setItem("ACS_Finance", JSON.stringify(f));

  } catch (err) {
    console.error("❌ Finance sanitizer error:", err);
  }
}

/* Ejecutar una vez al cargar */
document.addEventListener("DOMContentLoaded", ACS_sanitizeFinance);

/* Re-sanitizar solo cuando Finance cambie */
window.addEventListener("storage", (e) => {
  if (e.key === "ACS_Finance") {
    ACS_sanitizeFinance();
  }
});

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
   === INTEGRACIÓN HR — PAYROLL REAL (v2.1 FINAL) =============
   ============================================================ */
function ACS_syncPayrollWithHR() {
  try {

    let f = loadFinance();
    let HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");

    if (!f || !HR || typeof HR.payroll !== "number") {
      console.warn("⚠️ HR o Finance no inicializado todavía.");
      return;
    }

    const payroll = HR.payroll;

    // RESTAR payroll inmediatamente
    f.capital -= payroll;

    // Actualizar gastos y profit
    f.cost.salaries = payroll;
    f.expenses      = payroll;
    f.profit        = f.revenue - f.expenses;

    saveFinance(f);

    console.log("💸 Payroll aplicado de inmediato:", payroll);
    console.log("💰 Capital actualizado:", f.capital);

  } catch (err) {
    console.error("❌ ERROR en ACS_syncPayrollWithHR:", err);
  }
}

/* ============================================================
   === API PRINCIPAL (módulos pueden llamar estos métodos) ====
   ============================================================ */

// Agregar ingreso

function ACS_addIncome(type, amount, source = "Unknown") {

  const f = loadFinance();
  const value = Number(amount) || 0;
  if (value <= 0) return;

  if (f.income[type] === undefined) return;

  const beforeCapital = f.capital;

  f.income[type] += value;
  f.revenue += value;
  f.capital += value;

  saveFinance(f);

  // ==============================
  // 🟦 DEBUG — FINANCE VISIBILITY
  // ==============================
   
  console.log(
    `%c💰 [FINANCE] INCOME RECEIVED`,
    "color:#00ff80;font-weight:bold;"
  );
  console.log("• Type:", type);
  console.log("• Amount: +$", value.toLocaleString());
  console.log("• Source:", source);
  console.log(
    "• Capital:",
    `$${beforeCapital.toLocaleString()} → $${f.capital.toLocaleString()}`
  );
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

/* ============================================================
   ✈️💰 ACS FINANCE — LIVE INCOME BRIDGE (CANONICAL)
   ------------------------------------------------------------
   • Punto ÚNICO de entrada de ingresos
   • Recibe ingresos desde Flight Economics
   • Rutea ingresos leg-by-leg (Live Flight)
   • Registra LOG financiero
   • DEBUG activo (temporal)
   ============================================================ */

function ACS_registerIncome(incomeType, payload, source) {

  let value = 0;

  // ✅ SOPORTE FLEXIBLE
  if (typeof payload === "number") {
    value = payload;
  } else if (payload && typeof payload === "object") {
    value = Number(payload.amount || payload.income || payload.revenue || 0);
  }

  if (value <= 0) {
    console.warn("[FINANCE] ❌ Invalid income payload:", payload);
    return;
  }

  const f = loadFinance();
  if (!f || !f.income || f.income[incomeType] === undefined) {
    console.warn("[FINANCE] ❌ Invalid income type:", incomeType);
    return;
  }

  const beforeCapital = f.capital;

  // 💰 APPLY
  f.income[incomeType] += value;
  f.revenue += value;
  f.capital += value;
  f.profit = f.revenue - f.expenses;

  saveFinance(f);

  // 🧾 LOG
  ACS_logTransaction({
    type: "INCOME",
    source: source || incomeType,
    amount: value
  });

  console.log(
    `%c💰 [FINANCE] INCOME APPLIED`,
    "color:#00ff80;font-weight:bold;",
    {
      type: incomeType,
      amount: value,
      capital: `${beforeCapital} → ${f.capital}`
    }
  );
}

/* ============================================================
   === BANKRUPTCY ENGINE — v1.0 ================================
   ------------------------------------------------------------
   • Detecta capital < 0
   • Crea alertas financieras automáticas
   • Repite cada semana simulada
   • Declara BANKRUPTCY si pasa 1.5 meses sin recuperarse
   ============================================================ */

function ACS_checkBankruptcy(simDate) {

  let f = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  if (!f || typeof f.capital !== "number") return;

  const capital = f.capital;

  // === Hora simulada en formato Date ===
  const now = simDate instanceof Date ? simDate : new Date(simDate);

  // === Cargar estado previo ===
  let bState = JSON.parse(localStorage.getItem("ACS_BankruptcyState") || "{}");

  // Primera vez con saldo negativo → registrar
  if (capital < 0 && !bState.start) {
    bState.start = now.toISOString();
    bState.lastAlert = now.toISOString();
  }

  // Si capital vuelve a positivo → limpiar estado
  if (capital >= 0 && bState.start) {
    localStorage.removeItem("ACS_BankruptcyState");
    return;
  }

  // Si capital está positivo → no hacer nada
  if (capital >= 0) return;

  // === Enviar alerta cada semana simulada ===
  if (bState.start) {

    const lastAlert = new Date(bState.lastAlert);
    const diffDays = Math.floor((now - lastAlert) / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
      ACS_pushAlert({
        type: "finance",
        level: "critical",
        title: "⚠️ CAPITAL NEGATIVO",
        message: "Your airline is operating with negative capital. Immediate corrective action is required.",
        timestamp: now.toISOString()
      });

      bState.lastAlert = now.toISOString();
    }
  }

  // === Validar 1.5 meses simulados (45 días) ===
  const startDate = new Date(bState.start);
  const diffDaysTotal = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

  if (diffDaysTotal >= 45) {

    // ALERTA FINAL
    ACS_pushAlert({
      type: "finance",
      level: "critical",
      title: "💀 AIRLINE BANKRUPTCY",
      message: "Your company remained in negative capital for too long. The airline is now closed.",
      timestamp: now.toISOString()
    });

    // Limpiar todos los datos del jugador
    localStorage.removeItem("ACS_Finance");
    localStorage.removeItem("ACS_MyAircraft");
    localStorage.removeItem("ACS_UsedMarket");
    localStorage.removeItem("ACS_BaseAirport");
    localStorage.removeItem("ACS_activeUser");
    localStorage.removeItem("ACS_BankruptcyState");

    // START OVER — nueva aerolínea
    localStorage.setItem("ACS_GameStartDate", now.toISOString());

    // REDIRECT
    window.location.href = "create_airline.html";
    return;
  }

  // Guardar estado
  localStorage.setItem("ACS_BankruptcyState", JSON.stringify(bState));
}

/* Registrar listener con el motor de tiempo */
if (typeof registerTimeListener === "function") {
  registerTimeListener(ACS_checkBankruptcy);
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
   ✈️ PASO 5 — FLIGHT EXECUTION ENGINE (TIME-BASED)
   ------------------------------------------------------------
   • Ejecuta vuelos activos en tiempo real
   • Suma minutos volados al avión
   • Bloquea mantenimiento durante vuelo
   • No duplica ejecución
   ============================================================ */

if (typeof registerTimeListener === "function") {
  registerTimeListener((currentTime) => {

    const execRaw = localStorage.getItem("ACS_FLIGHT_EXEC");
    if (!execRaw) return;

    const exec = JSON.parse(execRaw);
    if (!exec || !exec.aircraftId) return;

    const nowMin =
      currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes();

    // Ejecutar solo dentro del rango del vuelo
    if (nowMin < exec.depMin || nowMin >= exec.arrMin) return;

    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const ac = fleet.find(a => a.id === exec.aircraftId);
    if (!ac) return;

    // No ejecutar si está grounded (B-check, etc.)
    if (ac.isGrounded) return;

    // ⏱ Control de delta (anti-duplicación)
    ac._lastFlightTick = ac._lastFlightTick ?? nowMin;
    const delta = Math.max(0, nowMin - ac._lastFlightTick);

    if (delta > 0) {
      ac.flightMinutes = (ac.flightMinutes || 0) + delta;
      ac._lastFlightTick = nowMin;

      localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    }
  });
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

    const weekday = d
      .toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })
      .toUpperCase();

    const day = String(d.getUTCDate()).padStart(2, "0");

    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL",
                    "AUG","SEP","OCT","NOV","DEC"];
    const mon = months[d.getUTCMonth()];

    const year = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");

    return `${weekday} ${day} ${mon} ${year} — ${hh}:${mm}`;
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

/* ============================================================
   === ACS BANKRUPTCY ENGINE — PHASE 2 (v1.0) ==================
   ------------------------------------------------------------
   • Genera alertas semanales si capital < 0
   • Lleva un contador de semanas negativas
   • Si llega a 6 semanas → BANKRUPTCY automática
   • Redirige al jugador a create_airline.html
   ============================================================ */

(function(){

  console.log("⚠️ ACS Bankruptcy Engine v1.0 loaded");

  // ----------- KEYS INTERNAS ---------------
  const NEG_KEY = "ACS_FinanceNegativeWeeks";     // Semanas negativas
  const LAST_ALERT_KEY = "ACS_LastNegativeAlert"; // Para evitar spam

  // ----------- CARGAR VALORES ---------------
  function getWeeks() {
    return parseInt(localStorage.getItem(NEG_KEY) || "0");
  }

  function setWeeks(n) {
    localStorage.setItem(NEG_KEY, n.toString());
  }

  function canSendWeeklyAlert() {
    const last = localStorage.getItem(LAST_ALERT_KEY);
    if (!last) return true;

    const lastDate = new Date(last);
    const now = ACS_TIME.currentTime || new Date();

    const diff = now - lastDate;
    const weeks = diff / (1000 * 60 * 60 * 24 * 7);

    return weeks >= 1; // 1 semana real del juego
  }

  function markAlertSent() {
    const now = ACS_TIME.currentTime || new Date();
    localStorage.setItem(LAST_ALERT_KEY, now.toISOString());
  }

  // ============================================================
  // === MAIN CHECK =============================================
  // ============================================================

  function ACS_checkBankruptcy() {

    let F = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
    if (!F || typeof F.capital !== "number") return;

    const capital = F.capital;
    const now = ACS_TIME.currentTime || new Date();

    // ============================================================
    // === 1) CAPITAL POSITIVO → RESET ============================
    // ============================================================
    if (capital >= 0) {
      setWeeks(0);
      return;
    }

    // ============================================================
    // === 2) CAPITAL NEGATIVO — ALERTA SEMANAL ===================
    // ============================================================
    if (canSendWeeklyAlert()) {
      ACS_addAlert(
        "finance",
        "critical",
        "Capital is NEGATIVE. Airline is operating in financial risk."
      );

      markAlertSent();
    }

    // ============================================================
    // === 3) AUMENTAR SEMANAS NEGATIVAS ==========================
    // ============================================================
    let weeks = getWeeks();
    weeks++;
    setWeeks(weeks);

    console.warn("⚠️ Negative weeks:", weeks);

    // ============================================================
    // === 4) BANKRUPTCY AUTÓMATICO ===============================
    // ============================================================
    if (weeks >= 6) {

      ACS_addAlert(
        "finance",
        "critical",
        "BANKRUPTCY DECLARED — Airline terminated by ACS System"
      );

      console.error("💀 BANKRUPTCY TRIGGERED — Airline closed.");

      // ============================================================
      // === RESET TOTAL DEL SISTEMA ================================
      // ============================================================

      localStorage.removeItem("ACS_activeUser");
      localStorage.removeItem("ACS_Finance");
      localStorage.removeItem("ACS_HR");
      localStorage.removeItem("ACS_MyAircraft");
      localStorage.removeItem("ACS_PendingAircraft");
      localStorage.removeItem("ACS_GameAlerts");
      localStorage.removeItem("ACS_FinanceNegativeWeeks");

      // Guardar nueva fecha inicial
      const startDate = now.toISOString();
      localStorage.setItem("ACS_NewGameStartDate", startDate);

      // Redirigir
      window.location.href = "create_airline.html";
    }
  }

  // ============================================================
  // === TIMER: EJECUTAR UNA VEZ POR DÍA EN TIEMPO DEL JUEGO ====
  // ============================================================

  setInterval(() => {
    try {
      ACS_checkBankruptcy();
    } catch (err) {
      console.error("Bankruptcy Engine error:", err);
    }
  }, 3000); // cada 3 segundos REAL → equivale al paso diario del motor ACS_TIME

})();

/* ============================================================
   🎧 FINANCE — FLIGHT ECONOMICS MONITOR (LIVE)
   ------------------------------------------------------------
   • NO suma dinero
   • NO cambia buckets
   • SOLO confirma aterrizajes
   ============================================================ */

(function () {

  console.log("🎧 [FINANCE] Flight Economics MONITOR armed");

  window.addEventListener("ACS_FLIGHT_ECONOMICS", e => {

    const d = e.detail;

    console.log(
      "%c✈️💰 FLIGHT LANDED → FINANCE",
      "color:#00ff80;font-weight:bold;",
      {
        flightId: d?.flightId,
        aircraftId: d?.aircraftId,
        origin: d?.origin,
        destination: d?.destination,
        pax: d?.pax,
        distanceNM: d?.distanceNM,
        revenue: d?.revenue,
        simTime: window.ACS_CurrentSimDate
      }
    );

  });

})();

/* ============================================================
   💰 FINANCE — SKYTRACK ARRIVAL MIRROR (DEBUG)
   ------------------------------------------------------------
   • NO suma capital
   • NO toca buckets
   • SOLO VISIBILIDAD
   ============================================================ */

(function () {

  console.log("🎧 [FINANCE] SkyTrack ARRIVAL mirror armed");

  window.addEventListener("ACS_FLIGHT_ARRIVAL_DEBUG", e => {

    const d = e.detail;
    if (!d) return;

    console.log(
      "%c💰 ARRIVAL MIRROR → FINANCE",
      "color:#ffd700;font-weight:bold;",
      {
        aircraftId: d.aircraftId,
        flightId: d.flightId,
        route: `${d.origin} → ${d.destination}`,
        fakeAmount: `$${d.amount}`,
        simTime: d.simTime
      }
    );

  });

})();

/* ============================================================
   🟦 WEEKLY FINANCE RESET — TIME ENGINE
   ============================================================ */

(function(){

  if (typeof registerTimeListener !== "function") return;

  let lastWeek = null;

  function getISOWeek(d){
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  registerTimeListener((simTime) => {
    if (!(simTime instanceof Date)) return;

    const week = getISOWeek(simTime);
    if (lastWeek === null) {
      lastWeek = week;
      return;
    }

    if (week !== lastWeek) {
      lastWeek = week;

      const f = loadFinance();
      f.weekly.leasing_income = 0;
      f.weekly.weekNumber = week;
      saveFinance(f);

      console.log(`📆 Weekly Finance Reset → Week ${week}`);
    }
  });

})();

/* ============================================================
   🟦 F-LIVE-1 — LIVE & WEEKLY ROUTE INCOME ENGINE (CANONICAL)
   ------------------------------------------------------------
   • Fuente ÚNICA: eventos económicos reales de vuelo
   • Evento: ACS_FLIGHT_ECONOMICS
   • Live Route Income   → último vuelo del día
   • Weekly Route Income → acumulado semanal (ISO week)
   • NO duplica capital
   • NO toca revenue mensual
   ============================================================ */

(function ACS_LiveWeeklyRouteIncomeEngine(){

  console.log("💰 [FINANCE] Live & Weekly Route Income Engine armed (ECON)");

  function getISOWeek(d){
    const date = new Date(Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    ));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function ensureBuckets(f){
    f.income = f.income || {};
    f.income.live_flight  = Number(f.income.live_flight  || 0);
    f.income.route_weekly = Number(f.income.route_weekly || 0);

    f._lastLiveDay    = f._lastLiveDay    || null;
    f._lastWeeklyWeek = f._lastWeeklyWeek || null;
  }

  window.addEventListener("ACS_FLIGHT_ECONOMICS", e => {

    const d = e.detail;
    if (!d || typeof d.revenue !== "number" || d.revenue <= 0) {
      console.warn("[FINANCE] ⚠️ Invalid ECON payload:", d);
      return;
    }

    const now = window.ACS_CurrentSimDate instanceof Date
      ? window.ACS_CurrentSimDate
      : new Date();

    let f = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
    if (!f) return;

    ensureBuckets(f);

    const todayKey = now.toISOString().slice(0,10); // YYYY-MM-DD
    const weekKey  = getISOWeek(now);

    /* 🔄 RESET DAILY (LIVE) */
    if (f._lastLiveDay !== todayKey){
      f.income.live_flight = 0;
      f._lastLiveDay = todayKey;
    }

    /* 🔄 RESET WEEKLY */
    if (f._lastWeeklyWeek !== weekKey){
      f.income.route_weekly = 0;
      f._lastWeeklyWeek = weekKey;
    }

    /* 💰 APPLY */
    f.income.live_flight  = d.revenue;
    f.income.route_weekly += d.revenue;

    localStorage.setItem("ACS_Finance", JSON.stringify(f));

    console.log(
      "%c[FINANCE] ✅ LIVE / WEEKLY INCOME UPDATED",
      "color:#00ff80;font-weight:bold;",
      {
        flightId: d.flightId,
        added: d.revenue,
        live: f.income.live_flight,
        weekly: f.income.route_weekly
      }
    );
  });

})();


/* ============================================================
   🟧 A1 — FINANCE → OFFICIAL ARRIVAL CONSUMER (CROSS-TAB)
   ------------------------------------------------------------
   • ÚNICO punto de entrada de vuelos a Finance
   • Consume arrivals vía localStorage (cross-tab)
   • Dispara Economics (NO UI, NO LOG)
   ------------------------------------------------------------
   Source key: ACS__ARRIVED_BRIDGE_V1
   ============================================================ */

(function(){

  const ARRIVED_BRIDGE_KEY = "ACS__FLIGHT_ARRIVED_BRIDGE_V1";

  function safeNum(x, fb = 0){
    const n = Number(x);
    return Number.isFinite(n) ? n : fb;
  }

  function normalizeArrival(raw){
    if (!raw) return null;

    return {
      flightId: raw.flightId || raw.id || raw.flightNo || null,
      aircraftId: raw.aircraftId || raw.acId || raw.aircraft || null,
      origin: raw.origin || raw.from || null,
      destination: raw.destination || raw.to || null,
      distanceNM: safeNum(raw.distanceNM ?? raw.distance ?? raw.distNM, 0),
      depAbsMin:
        safeNum(raw.depAbsMin, null) ??
        safeNum(raw.depAbs, null) ??
        safeNum(raw.absMin, null)
    };
  }

  function onArrivalStorage(e){
    if (!e || e.key !== ARRIVAL_KEY || !e.newValue) return;

    let payload;
    try {
      payload = JSON.parse(e.newValue);
    } catch {
      return;
    }

    const arrival = normalizeArrival(payload);
    if (!arrival || !arrival.flightId || !arrival.aircraftId) return;

    console.log(
      "%c✈️ [FINANCE] ARRIVAL RECEIVED → sending to ECON",
      "color:#00ff80;font-weight:bold;",
      arrival
    );

    // 👉 DISPARO OFICIAL A ECONOMICS (MISMA PESTAÑA)
    window.dispatchEvent(
      new CustomEvent("ACS_FLIGHT_ARRIVED", { detail: arrival })
    );
  }

  window.addEventListener("storage", onArrivalStorage);

  console.log("✅ [FINANCE] Official arrival consumer armed");

})();

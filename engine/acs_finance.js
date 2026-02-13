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
   🟧 A1 — WEEK CLOSE DISPATCH (FIXED)
   - Envía Finance REAL al cerrar semana
   ============================================================ */

try {

  const f = loadFinance();   // ← Finance real desde storage

  window.dispatchEvent(
    new CustomEvent("ACS_WEEK_CLOSED", {
      detail: f
    })
  );

  console.log("📅 ACS WEEK CLOSED EVENT DISPATCHED");

} catch (e) {
  console.warn("ACS_WEEK_CLOSED dispatch failed", e);
}

/* ============================================================
   🟦 F8 — WEEK CLOSED CONSUMER (OFFICIAL FINANCE BRIDGE — FIXED)
   ------------------------------------------------------------
   • Recibe evento ACS_WEEK_CLOSED desde TIME ENGINE
   • Registra weekly revenue real en Finance
   • Recovery automático si el evento ocurrió antes de cargar
   • Fuente CANÓNICA: Finance Core (loadFinance)
   ============================================================ */

function ACS_handleWeekClosed(eDetail) {

  try {

    const weekly = Number(eDetail?.weeklyRevenue || 0);

    let finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

    if (!finance.income) finance.income = {};

    // 🔥 REGISTRO OFICIAL
    finance.income.weekly_revenue = weekly;

    // Snapshot semanal persistente
    localStorage.setItem("ACS_FINANCE_WEEKLY_CLOSED", weekly);

    // Persistir Finance completo
    localStorage.setItem("ACS_Finance", JSON.stringify(finance));

    // Exponer objeto vivo
    window.ACS_Finance = finance;

    console.log("✅ FINANCE WEEK CLOSED REGISTERED:", weekly);

    // 🔔 Notificar UI + Company Value
    window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

  } catch (err) {
    console.error("❌ FINANCE WEEK CLOSED FAILED", err);
  }
}

/* 🔹 Listener normal (eventos futuros) */
window.addEventListener("ACS_WEEK_CLOSED", (e) => {
  ACS_handleWeekClosed(e.detail);
});

/* 🔹 RECOVERY: si el evento ya ocurrió antes de que este listener cargara */
try {

  const recovered = loadFinance();

  if (recovered && recovered.income?.weekly_revenue !== undefined) {

    console.log("🔁 WEEK CLOSE RECOVERED FROM FINANCE CORE");

    ACS_handleWeekClosed({
      weeklyRevenue: recovered.income.weekly_revenue
    });
  }

} catch (e) {
  console.warn("⚠️ WEEK CLOSE RECOVERY FAILED", e);
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

/* ============================================================
   🟦 F1 — FINANCE ENGINE INITIALIZATION FIX
   Guarantees global availability BEFORE any arrival events
   ============================================================ */

let ACS_Finance = initFinanceIfNeeded();

/* CRITICAL: expose immediately */
window.ACS_Finance = ACS_Finance;

console.log("🟦 ACS_Finance global ready");


/* ============================================================
   🟦 F0 — GLOBAL ENGINE EXPORT (CRITICAL FIX)
   Makes Finance visible to Flight Economics
   ============================================================ */

window.ACS_FINANCE_ENGINE = {

  getLedger(){
    try {
      return JSON.parse(localStorage.getItem("ACS_Finance")) || null;
    } catch {
      return null;
    }
  },

  commit(entry){
    try {
      const f = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

      if (!f.history) f.history = [];

      f.history.push(entry);

      localStorage.setItem("ACS_Finance", JSON.stringify(f));

      window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

      return true;

    } catch(e){
      console.error("FINANCE COMMIT FAILED", e);
      return false;
    }
  }

};

console.log("🟦 ACS_FINANCE_ENGINE exposed globally");
   
(function(){

  function ACS_FIN_applyLivePayrollAccrual(){

    const payroll = Number(localStorage.getItem("ACS_HR_PAYROLL") || 0);
    if (!Number.isFinite(payroll) || payroll <= 0) return;

    const f = loadFinance();
    if (!f) return;

    // Mostrar salaries en vivo (informativo)
    f.cost.salaries = payroll;

    // Recalcular profit en vivo (sin tocar capital)
    f.profit = (f.revenue || 0) - (f.expenses || 0) - payroll;

    saveFinance(f);
    window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));
  }

  // Ejecutar al cargar Finance
  ACS_FIN_applyLivePayrollAccrual();

  // Re-ejecutar cuando HR cambie algo relevante
  window.addEventListener("ACS_HR_UPDATED", () => {
    ACS_FIN_applyLivePayrollAccrual();
  });

})();
   
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
   🔹 PUBLIC API — REGISTER EXPENSE (MAINTENANCE / SERVICES)
   ------------------------------------------------------------
   • Canonical expense entry point (NON flight)
   • Used by:
     - Maintenance (A / B / C / D)
     - Penalties
     - One-off operational services
   • Updates:
     - expenses
     - profit
     - capital
     - cost breakdown
   ------------------------------------------------------------
   Version: v1.0 | Date: 08 FEB 2026
   ============================================================ */

window.ACS_registerExpense = function(payload){

  if (!payload || typeof payload.amount !== "number") return;

  const f = loadFinance();
  if (!f) return;

  const amount   = Number(payload.amount) || 0;
  const category = payload.category || "unknown";
  const subtype  = payload.subtype  || null;

  if (amount <= 0) return;

  /* ===============================
     TOTALS
     =============================== */

  f.expenses += amount;
  f.profit   -= amount;
  f.capital  -= amount;

  /* ===============================
     COST BREAKDOWN
     =============================== */

  if (!f.cost) f.cost = {};

  switch (category) {

    /* 🛠 MAINTENANCE (A / B / C / D) */
    case "Maintenance":
      f.cost.maintenance = (f.cost.maintenance || 0) + amount;
      break;

    /* 🚨 PENALTIES / FINES */
    case "penalties":
      f.cost.penalties = (f.cost.penalties || 0) + amount;
      break;

    /* 🧾 FALLBACK */
    default:
      // Categoría no mapeada aún → solo afecta totales
      break;
  }

  /* ===============================
     CENTRAL LEDGER LOG
     =============================== */

  pushLog({
    type: "EXPENSE",
    source: category,
    amount: amount,
    meta: {
      subtype: subtype,
      aircraftId: payload.aircraftId || null,
      registration: payload.registration || null,
      currency: payload.currency || "USD",
      date: payload.date || new Date().toISOString()
    }
  });

  /* ===============================
     SAVE + NOTIFY
     =============================== */

  saveFinance(f);
  window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));
};
   
/* ============================================================
   🟧 HR → FINANCE MONTHLY PAYROLL BRIDGE (LIVE)
   ------------------------------------------------------------
   • Corre EN VIVO al cambio de mes (Time Engine)
   • Finance absorbe HR payroll como salaries (Cost)
   • Anti-duplicado: 1 cargo por mes
   ============================================================ */

function ACS_FIN_readMonthlyPayroll(){
  const v = Number(localStorage.getItem("ACS_HR_PAYROLL") || 0);
  return Number.isFinite(v) ? v : 0;
}

function ACS_FIN_closeMonthIfNeeded(f, monthKey){

  if (f.current_month === monthKey) return;

  // Cerrar mes anterior en history (si existía)
  if (f.current_month !== null) {
    f.history.push({
      month: f.current_month,
      revenue: f.revenue || 0,
      expenses: f.expenses || 0,
      profit: (f.revenue || 0) - (f.expenses || 0),
      cost: { ...f.cost }
    });
  }

  // Reset totals para el nuevo mes
  f.revenue  = 0;
  f.expenses = 0;
  f.profit   = 0;

  Object.keys(f.cost).forEach(k => f.cost[k] = 0);
  f.current_month = monthKey;
}

function ACS_FIN_applyMonthlyPayrollCharge(f, monthKey){

  // Candado: 1 cargo por mes
  const lockKey = "ACS_FIN_SALARY_CHARGED_MONTH";
  if (localStorage.getItem(lockKey) === monthKey) return;

  const payroll = ACS_FIN_readMonthlyPayroll();
  if (payroll <= 0) {
    localStorage.setItem(lockKey, monthKey); // igual bloquea para no spamear
    return;
  }

  // Registrar como costo salarial del mes
  f.cost.salaries += payroll;
  f.expenses      += payroll;
  f.profit        -= payroll;
  f.capital       -= payroll;

  pushLog({
    type: "EXPENSE",
    source: "HR PAYROLL",
    amount: payroll,
    meta: { month: monthKey }
  });

  localStorage.setItem(lockKey, monthKey);
}

/* ============================================================
   🗓️ LIVE MONTH CHANGE HOOK (Time Engine)
   ============================================================ */

if (typeof registerTimeListener === "function") {

  let __FIN_lastMonthKey = null;

  registerTimeListener((time) => {

    if (!time || typeof time.getTime !== "function") return;

    const now = time.getTime();
    const monthKey = ACS_getMonthKey(now);

    if (__FIN_lastMonthKey === null) {
      __FIN_lastMonthKey = monthKey;
      return;
    }

    // Solo en cambio de mes
    if (monthKey !== __FIN_lastMonthKey) {

      const f = loadFinance();
      if (!f) return;

      // 1) Cerrar/abrir mes en Finance (live)
      ACS_FIN_closeMonthIfNeeded(f, monthKey);

      // 2) Aplicar cargo salarial para el nuevo mes
      ACS_FIN_applyMonthlyPayrollCharge(f, monthKey);

      saveFinance(f);
      window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

      __FIN_lastMonthKey = monthKey;
    }
  });

} else {
  console.warn("⚠️ registerTimeListener NOT FOUND — Finance month hook disabled");
}
   
/* ============================================================
   🟧 F9 — ECONOMICS → FINANCE BRIDGE (HARD DEDUP)
   ------------------------------------------------------------
   ✔ One eventId → one ledger entry
   ✔ Multi-tab safe
   ✔ Refresh safe
   ✔ Canonical protection layer
   ============================================================ */

const ACS_FIN_EVENT_DEDUP = new Set();

window.addEventListener("ACS_FLIGHT_ECONOMICS", e => {

  const eco = e.detail;
  if (!eco || !eco.eventId) return;

  // Session-level dedup
  if (ACS_FIN_EVENT_DEDUP.has(eco.eventId)) return;
  ACS_FIN_EVENT_DEDUP.add(eco.eventId);

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
      eventId: eco.eventId,   // 🔒 canonical ID
      flightId: eco.flightId,
      aircraftId: eco.aircraftId,
      year: eco.year,
      distanceNM: eco.distanceNM
    }
  });

});

/* ============================================================
   🟧 F7 — ECONOMICS → FINANCE BRIDGE (CANONICAL) [FIXED]
   ------------------------------------------------------------
   ✔ One economics event → one finance entry
   ✔ No duplicates
   ✔ Source: ACS_FLIGHT_ECONOMICS
   ✔ FIX: correct global engine reference
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ECONOMICS", e => {

  const eco = e.detail;
  if (!eco || !eco.eventId) return;

  /* FIX — USE CORRECT GLOBAL ENGINE */
  if (!window.ACS_Finance) {
  console.warn("⚠️ Finance engine not available");
  return;
}

  try {

   window.ACS_registerIncome({

  eventId: eco.eventId,

  flightId: eco.flightId,
  aircraftId: eco.aircraftId,

  origin: eco.origin,
  destination: eco.destination,

  distanceNM: eco.distanceNM,

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
    timestamp: eco.timestamp
  }

});

  } catch (err) {

    console.error("Finance bridge failed:", err);

  }

});

})();

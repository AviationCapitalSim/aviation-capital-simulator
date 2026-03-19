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
   🟦 F1 — FINANCE BOOT CONTROLLER (RAILWAY AUTHORITY)
   ------------------------------------------------------------
   • Railway = única fuente de verdad
   • localStorage = cache mínima
   • No crea finance local por defecto
   • Bloquea el engine hasta hidratar desde Railway
   ============================================================ */

window.ACS_FINANCE_READY = false;

async function ACS_FINANCE_BOOT(){

  try{

    const airlineId =
      window.ACS_SERVER_SESSION?.airline_id ||
      window.ACS_activeUser?.airline_id ||
      JSON.parse(localStorage.getItem("ACS_activeUser") || "null")?.airline_id ||
      localStorage.getItem("ACS_AIRLINE_ID");

    if(!airlineId){
      console.error("❌ FINANCE BOOT: airlineId missing");
      return false;
    }

    const res = await fetch(
      `https://acs-world-server-production.up.railway.app/v1/finance/${airlineId}`
    );

    const data = await res.json();

    if(!data?.ok || !data.finance){
      console.error("❌ FINANCE BOOT FAILED: invalid server response");
      return false;
    }

    const f = data.finance;

    const financeObject = {
      capital: Number(f.capital || 0),

      revenue: Number(f.revenue || 0),
      expenses: Number(f.expenses || 0),
      profit: Number(f.profit || 0),

      debt: Number(f.debt || 0),
      fleet_size: Number(f.fleet_size || 0),

      income: {
        live_revenue: Number(f.live_revenue || 0),
        weekly_revenue: Number(f.weekly_revenue || 0),
        current_week_key: null
      },

      cost: {
        fuel: Number(f.cost_fuel || 0),
        ground_handling: 0,
        slot_fees: 0,
        overflight: 0,
        navigation: 0,
        leasing: Number(f.cost_leasing || 0),
        salaries: Number(f.cost_hr || 0),
        maintenance: Number(f.cost_maintenance || 0),
        penalties: 0,
        used_aircraft_purchase: 0,
        new_aircraft_purchase: 0
      },

      history: [],
      current_month: ACS_getMonthKey(Date.now())
    };

    saveFinance(financeObject);
    window.ACS_Finance = financeObject;
    window.ACS_FINANCE_READY = true;

    console.log("🟢 FINANCE BOOT COMPLETED (RAILWAY AUTHORITY)");

    window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

    return true;

  }
  catch(err){
    console.error("❌ FINANCE BOOT ERROR", err);
    return false;
  }

}

/* Boot inmediato */
ACS_FINANCE_BOOT();


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

    if(!window.ACS_FINANCE_READY){
      console.warn("⛔ COMMIT BLOCKED (FINANCE NOT READY)");
      return false;
    }

    try {

      const f =
        JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

      if(typeof f.capital !== "number") f.capital = Number(f.capital || 0);
      if(typeof f.debt    !== "number") f.debt    = Number(f.debt || 0);

      if(typeof f.monthRevenue  !== "number") f.monthRevenue  = Number(f.monthRevenue  || 0);
      if(typeof f.monthExpenses !== "number") f.monthExpenses = Number(f.monthExpenses || 0);
      if(typeof f.monthProfit   !== "number") f.monthProfit   = Number(f.monthProfit   || 0);

      if(!Array.isArray(f.history)) f.history = [];

      const amt =
        Number(entry && entry.amount ? entry.amount : 0) || 0;

      const type =
        String(entry && entry.type ? entry.type : "");

      if(type === "LOAN_IN"){
        f.capital += amt;
        f.debt    += amt;
      }

      else if(type === "LOAN_PAYMENT" || type === "LOAN_AMORTIZATION"){
        f.capital -= amt;
        f.debt    = Math.max(0, f.debt - amt);
        f.monthExpenses += amt;
        f.monthProfit   -= amt;
      }

      f.history.push(entry);

      localStorage.setItem("ACS_Finance", JSON.stringify(f));
      window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

      return true;

    } catch(e){
      console.error("FINANCE COMMIT FAILED", e);
      return false;
    }
  },

  /* ============================================================
     ✈️ AIRCRAFT VALUATION ENGINE (CANONICAL)
     ============================================================ */

  calculateAircraftMarketValue(ac){

    if (!ac) return 0;

    const simYear = getSimTime().getUTCFullYear();

    const basePrice =
      ac.oemPrice ||
      ac.acquisitionPrice ||
      ac.price ||
      ac.price_acs_usd ||
      0;

    if (basePrice <= 0) return 0;

    const aircraftYear = ac.year || simYear;
    const age = Math.max(simYear - aircraftYear, 0);

    const depreciationRate = 0.035;
    let value = basePrice * (1 - depreciationRate * age);

    value = Math.max(value, basePrice * 0.20);

    if (typeof ac.conditionPercent === "number") {
      value *= (ac.conditionPercent / 100);
    }

    if (ac.status === "Maintenance Hold") {
      value *= 0.85;
    }

    return Math.round(value);
  }

};

console.log("🟦 ACS_FINANCE_ENGINE exposed globally");

/* ============================================================
   🌍 RAILWAY FINANCE SYNC — READ ONLY (SAFE)
   ------------------------------------------------------------
   • Carga Finance desde Railway
   • No rompe localStorage si falla
   • Solo ejecuta al iniciar el engine
============================================================ */

async function ACS_FINANCE_syncFromServer(){

  try{

    const airlineId =
    window.ACS_activeUser?.airline_id ||
    JSON.parse(localStorage.getItem("ACS_activeUser") || "null")?.airline_id ||
    localStorage.getItem("ACS_AIRLINE_ID");

    if(!airlineId){
      console.warn("FINANCE SYNC: airlineId missing");
      return;
    }

    const res = await fetch(
      `https://acs-world-server-production.up.railway.app/v1/finance/${airlineId}`
    );

    const data = await res.json();

    if(!data?.ok){
      console.warn("FINANCE SYNC: server returned not ok");
      return;
    }

    const f = data.finance;
    if(!f) return;

    const financeObject = {

      capital: Number(f.capital || 0),

      revenue: Number(f.revenue || 0),
      expenses: Number(f.expenses || 0),
      profit: Number(f.profit || 0),

      income:{
        live_revenue: Number(f.live_revenue || 0),
        weekly_revenue: Number(f.weekly_revenue || 0),
        current_week_key: null
      },

      cost:{
        fuel: Number(f.cost_fuel || 0),
        ground_handling: 0,
        slot_fees: 0,
        overflight: 0,
        navigation: 0,
        leasing: Number(f.cost_leasing || 0),
        salaries: Number(f.cost_hr || 0),
        maintenance: Number(f.cost_maintenance || 0),
        penalties: 0,
        used_aircraft_purchase: 0,
        new_aircraft_purchase: 0
      },

      history: [],
      current_month: ACS_getMonthKey(Date.now())
    };

    localStorage.setItem(
      "ACS_Finance",
      JSON.stringify(financeObject)
    );

    console.log("🌍 FINANCE SYNC FROM RAILWAY OK");

    window.dispatchEvent(
      new Event("ACS_FINANCE_UPDATED")
    );

  }
  catch(err){

    console.warn(
      "FINANCE SYNC FAILED",
      err
    );

  }

}

/* ============================================================
   🌍 RAILWAY FINANCE SYNC — WRITE BACK (CANONICAL BRIDGE)
   ------------------------------------------------------------
   • Escucha ACS_FINANCE_UPDATED
   • Envía snapshot financiero actual hacia Railway
   • Railway = autoridad
   • localStorage = cache / runtime UI
============================================================ */

let ACS_FINANCE_SYNC_LOCK = false;
let ACS_FINANCE_SYNC_PENDING = false;

async function ACS_FINANCE_pushToServer(){

if(!window.ACS_FINANCE_READY){
  console.warn("⛔ FINANCE PUSH BLOCKED (NOT READY)");
  return;
}
   
  if (ACS_FINANCE_SYNC_LOCK) {
    ACS_FINANCE_SYNC_PENDING = true;
    return;
  }

  ACS_FINANCE_SYNC_LOCK = true;

  try{

    const f = loadFinance();
    if(!f){
      ACS_FINANCE_SYNC_LOCK = false;
      return;
    }

    const airlineId =
      window.ACS_SERVER_SESSION?.airline_id ||
      window.ACS_activeUser?.airline_id ||
      JSON.parse(localStorage.getItem("ACS_activeUser") || "null")?.airline_id ||
      localStorage.getItem("ACS_AIRLINE_ID");

    if(!airlineId){
      console.warn("FINANCE PUSH: airlineId missing");
      ACS_FINANCE_SYNC_LOCK = false;
      return;
    }

    const safeNumber = (v, fallback = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const payload = {

  airline_id: String(airlineId),

  capital: safeNumber(f.capital),
  revenue: safeNumber(f.revenue),
  expenses: safeNumber(f.expenses),
  profit: safeNumber(f.profit),

  live_revenue: safeNumber(f.income?.live_revenue),
  weekly_revenue: safeNumber(f.income?.weekly_revenue),

  cost_fuel: safeNumber(f.cost?.fuel),
  cost_maintenance: safeNumber(f.cost?.maintenance),
  cost_hr: safeNumber(f.cost?.salaries),
  cost_leasing: safeNumber(f.cost?.leasing),

  cost_airport:
    safeNumber(f.cost?.ground_handling, 0) +
    safeNumber(f.cost?.slot_fees, 0) +
    safeNumber(f.cost?.overflight, 0) +
    safeNumber(f.cost?.navigation, 0),

  cost_other:
    safeNumber(f.cost?.penalties, 0) +
    safeNumber(f.cost?.used_aircraft_purchase, 0) +
    safeNumber(f.cost?.new_aircraft_purchase, 0),

  debt: safeNumber(f.debt),
  fleet_size: safeNumber(f.fleet_size)
};

/* ============================================================
   🛑 HARD VALIDATION — PREVENT DATA CORRUPTION
   ============================================================ */

if(
  payload.capital === null ||
  payload.revenue === null ||
  payload.expenses === null ||
  payload.profit === null
){
  console.error("❌ FINANCE PUSH BLOCKED — INVALID DATA", payload);
  ACS_FINANCE_SYNC_LOCK = false;
  return;
}
     
    const res = await fetch(
      "https://acs-world-server-production.up.railway.app/v1/finance/update",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await res.json();

    if(!data?.ok){
      console.warn("FINANCE PUSH: server returned not ok", data);
    } else {
      console.log("🌍 FINANCE PUSH TO RAILWAY OK");
    }

  }
  catch(err){

    console.warn("FINANCE PUSH FAILED", err);

  }
  finally{

    ACS_FINANCE_SYNC_LOCK = false;

    if(ACS_FINANCE_SYNC_PENDING){
      ACS_FINANCE_SYNC_PENDING = false;
      setTimeout(() => {
        ACS_FINANCE_pushToServer();
      }, 200);
    }

  }

}

window.addEventListener("ACS_FINANCE_UPDATED", () => {
  setTimeout(() => {
    ACS_FINANCE_pushToServer();
  }, 120);
});
   
(function(){

  async function ACS_FIN_applyLivePayrollAccrual(){

    let payroll = 0;

    try {

      const airlineId =
        window.ACS_SERVER_SESSION?.airline_id ||
        JSON.parse(localStorage.getItem("ACS_activeUser") || "{}")?.airline_id ||
        localStorage.getItem("ACS_AIRLINE_ID");

      /* ============================================================
         1️⃣ PRIMARY SOURCE — RAILWAY HR
      ============================================================ */

      if (airlineId) {

        try {

          const res = await fetch(
            `https://acs-world-server-production.up.railway.app/v1/hr/payroll/${airlineId}`
          );

          const data = await res.json();

          if (data?.ok && Number(data.payroll) > 0) {

            payroll = Number(data.payroll);

            localStorage.setItem(
              "ACS_HR_PAYROLL_LAST_VALID",
              payroll
            );

            console.log(
              "%c🌍 HR PAYROLL FROM RAILWAY",
              "color:#00ffcc;font-weight:700",
              payroll
            );

          }

        } catch(e){

          console.warn("HR payroll fetch failed");

        }

      }

      /* ============================================================
         2️⃣ FALLBACK — HR ENGINE LOCAL
      ============================================================ */

      if (!payroll && typeof ACS_HR_getTotalPayroll === "function") {

        const local = Number(ACS_HR_getTotalPayroll());

        if (Number.isFinite(local) && local > 0) {

          payroll = local;

          console.log(
            "%c🧠 HR PAYROLL FROM ENGINE",
            "color:#8ab4ff;font-weight:700",
            payroll
          );

        }

      }

      /* ============================================================
         3️⃣ LAST SAFE VALUE
      ============================================================ */

      if (!payroll) {

        payroll =
          Number(localStorage.getItem("ACS_HR_PAYROLL_LAST_VALID")) ||
          Number(localStorage.getItem("ACS_HR_PAYROLL")) ||
          0;

        console.log(
          "%c🛟 HR PAYROLL FALLBACK",
          "color:#ffaa00;font-weight:700",
          payroll
        );

      }

      /* ============================================================
         APPLY TO FINANCE
      ============================================================ */

      if (!Number.isFinite(payroll) || payroll <= 0) return;

      const f = loadFinance();
      if (!f) return;

      if (!f.cost) f.cost = {};

      f.cost.salaries = payroll;

      f.profit = (f.revenue || 0) - (f.expenses || 0) - payroll;

      saveFinance(f);

      window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

    } catch(err){

      console.warn("FINANCE HR PAYROLL SYNC ERROR", err);

    }

  }

  ACS_FIN_applyLivePayrollAccrual();

  window.addEventListener("ACS_HR_UPDATED", () => {
    ACS_FIN_applyLivePayrollAccrual();
  });

})();
   
/* ============================================================
   🔹 LOG (CENTRAL) — CANONICAL RAILWAY LEDGER
   Railway = autoridad
   localStorage = backup
   ============================================================ */

async function pushLog(entry){

  const airlineId =
    window.ACS_SERVER_SESSION?.airline_id ||
    window.ACS_activeUser?.airline_id ||
    JSON.parse(localStorage.getItem("ACS_activeUser") || "null")?.airline_id ||
    localStorage.getItem("ACS_AIRLINE_ID");

  if(!airlineId){
    console.warn("FINANCE LOG: airlineId missing");
    return;
  }

  /* ============================================================
   SIM TIME (CANONICAL TIMESTAMP)
   ============================================================ */

let simTime;

try{
  simTime = Date.now();
}
catch{
  simTime = Date.now();
}

const payload = {

  airline_id: Number(airlineId),

  type: String(entry.type || "UNKNOWN"),

  source: String(entry.source || "SYSTEM"),

  amount: Number(entry.amount || 0),

  timestamp: simTime
};

  /* ============================================================
     SEND TO RAILWAY (AUTHORITY)
     ============================================================ */

  fetch(
    "https://acs-world-server-production.up.railway.app/v1/finance/log",
    {
      method: "POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify(payload)
    }
  )
  .then(res => res.json())
  .then(data => {

    if(!data?.ok){
      console.warn("FINANCE LOG SERVER ERROR", data);
    }

  })
  .catch(err => {

    console.warn("FINANCE LOG FAILED → fallback local", err);

    /* fallback local */

    try{

      let log =
        JSON.parse(localStorage.getItem("ACS_Log") || "[]");

      log.push({
        ts: Date.now(),
        ...entry
      });

      localStorage.setItem(
        "ACS_Log",
        JSON.stringify(log)
      );

    }
    catch(e){
      console.warn("LOCAL LOG FALLBACK FAILED");
    }

  });

}

/* ============================================================
   🔹 PUBLIC API — REGISTER INCOME
   ============================================================ */
   
  window.ACS_registerIncome = function(payload){

   if(!window.ACS_FINANCE_READY){
  console.warn("⛔ INCOME BLOCKED (FINANCE NOT READY)");
  return;
  }
   
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

  if(!window.ACS_FINANCE_READY){
  console.warn("⛔ EXPENSE BLOCKED (FINANCE NOT READY)");
  return;
  }   

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

  /* ============================================================
     🔒 HARD DEDUP — MULTI TAB + RELOAD SAFE
     ============================================================ */

  const processed =
    JSON.parse(localStorage.getItem("ACS_PROCESSED_FLIGHTS") || "[]");

  if(processed.includes(eco.eventId)){
    return;
  }

  processed.push(eco.eventId);

  /* mantener tamaño razonable */
  if(processed.length > 5000){
    processed.shift();
  }

  localStorage.setItem(
    "ACS_PROCESSED_FLIGHTS",
    JSON.stringify(processed)
  );

  /* ============================================================
     REGISTER INCOME
     ============================================================ */

  window.ACS_registerIncome({
    type: "FLIGHT",
    source: `FLIGHT ${eco.origin} → ${eco.destination}`,
    revenue: Number(eco.revenue || 0),
    costTotal: Number(eco.costTotal || 0),
    profit: Number(eco.profit || 0),

    costs:{
      fuel: Number(eco.fuelCost || 0),
      handling: Number(eco.handlingCost || 0),
      slot: Number(eco.slotCost || 0),
      overflight: Number(eco.overflightCost || 0),
      navigation: Number(eco.navigationCost || 0)
    },

    meta:{
      eventId: eco.eventId,
      flightId: eco.flightId,
      aircraftId: eco.aircraftId,
      year: eco.year,
      distanceNM: eco.distanceNM
    }
  });

});
     
})();

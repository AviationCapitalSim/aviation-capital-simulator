/* ============================================================
   💰 ACS FINANCE ENGINE — CANONICAL LEDGER v3.0
   ------------------------------------------------------------
   • Finance = REGISTRO CONTABLE (NO calcula vuelos)
   • Fuente económica: ACS_FLIGHT_ECONOMICS
   • UI: company_finance.html (READ ONLY)
   ------------------------------------------------------------
   Date: 17 JAN 2026
   ============================================================ */

(async function(){

try {

  if(window.ACS_Finance){
    window.dispatchEvent(
      new CustomEvent("ACS_WEEK_CLOSED", {
        detail: window.ACS_Finance
      })
    );
  }

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

    let finance = window.ACS_Finance || {};

    if (!finance.income) finance.income = {};

    // 🔥 REGISTRO OFICIAL
    finance.income.weekly_revenue = weekly;

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

window.ACS_FINANCE_boot = async function(){

  try {

    const res = await fetch(
      "https://api.aviationcapitalsim.com/v1/session",
      {
        credentials: "include"
      }
    );

    if (!res.ok) {
      console.warn("FINANCE: SESSION HTTP", res.status);
      return;
    }

    const data = await res.json();

    if (!data?.ok || !data.user?.airline_id) {
      console.warn("FINANCE: INVALID SESSION");
      return;
    }

    window.ACS_SERVER_SESSION = {
      airline_id: data.user.airline_id
    };

    console.log("🟢 FINANCE SESSION READY:", data.user.airline_id);

    await ACS_FINANCE_syncFromServer();

  } catch(err) {

    console.warn("FINANCE BOOT FAILED", err);

  }

};
   
/* ============================================================
   🌍 ACS FINANCE — CANONICAL BOOT + SYNC (FINAL)
   ------------------------------------------------------------
   ✔ NO auto-run
   ✔ NO timing hacks
   ✔ Espera sesión real
   ✔ Ejecuta una sola vez
   ✔ Arquitectura OCC READY
   ============================================================ */

let __ACS_FINANCE_STARTED = false;

async function ACS_FINANCE_syncFromServer(){

  const airlineId =
    window.ACS_SERVER_SESSION?.airline_id ||
    window.ACS_activeUser?.airline_id;

  if (!airlineId) {
    console.warn("FINANCE SYNC: airlineId missing");
    return;
  }

  try {

    const res = await fetch(
      "https://api.aviationcapitalsim.com/v1/finance",
      {
        credentials: "include"
      }
    );

    if (!res.ok) {
      console.warn("FINANCE SYNC HTTP:", res.status);
      return;
    }

    const data = await res.json();

    if (!data?.ok) {
      console.warn("FINANCE SYNC: server returned not ok");
      return;
    }

    const f = data.finance;
    if (!f) return;

    window.ACS_Finance = {
      capital: Number(f.capital || 0),
      revenue: Number(f.revenue || 0),
      expenses: Number(f.expenses || 0),
      profit: Number(f.profit || 0),

      income: {
        live_revenue: Number(f.live_revenue || 0),
        weekly_revenue: Number(f.weekly_revenue || 0),
        current_week_key: null
      },

      cost: {
        fuel: Number(f.cost_fuel || 0),
        ground_handling: Number(f.cost_handling || 0),
        slot_fees: Number(f.cost_slots || 0),
        overflight: Number(f.cost_overflight || 0),
        navigation: Number(f.cost_navigation || 0),
        leasing: Number(f.cost_leasing || 0),
        salaries: 0,
        maintenance: Number(f.cost_maintenance || 0),
        penalties: Number(f.cost_other || 0),
        used_aircraft_purchase: 0,
        new_aircraft_purchase: 0
      },

      history: [],
      current_month: ACS_getMonthKey(Date.now())
    };

    console.log("🌍 FINANCE SYNC FROM RAILWAY OK");

    try {

      const logRes = await fetch(
        "https://api.aviationcapitalsim.com/v1/finance/log",
        {
          credentials: "include"
        }
      );

      if (logRes.ok) {
        const logData = await logRes.json();
        if (logData?.ok) {
          console.log("📊 FINANCE LOG SYNC OK", logData.logs?.length || 0);
        }
      }

    } catch (err) {
      console.warn("LOG SYNC FAILED", err);
    }

    // ============================================================
    // ✈️ OCC REBUILD — HR IS CANONICAL AUTHORITY FOR SALARIES
    // ============================================================

    if (typeof ACS_HR_getTotalPayroll === "function") {

      const payroll = Math.round(Number(ACS_HR_getTotalPayroll()) || 0);
      const liveFinance = window.ACS_Finance;

      if (liveFinance && liveFinance.cost) {

        liveFinance.cost.salaries = payroll;

        const totalCosts =
          Number(liveFinance.cost.fuel || 0) +
          Number(liveFinance.cost.ground_handling || 0) +
          Number(liveFinance.cost.slot_fees || 0) +
          Number(liveFinance.cost.overflight || 0) +
          Number(liveFinance.cost.navigation || 0) +
          Number(liveFinance.cost.leasing || 0) +
          Number(liveFinance.cost.salaries || 0) +
          Number(liveFinance.cost.maintenance || 0) +
          Number(liveFinance.cost.penalties || 0) +
          Number(liveFinance.cost.used_aircraft_purchase || 0) +
          Number(liveFinance.cost.new_aircraft_purchase || 0);

        liveFinance.expenses = Math.round(totalCosts);
        liveFinance.profit   = Math.round(Number(liveFinance.revenue || 0) - liveFinance.expenses);
        liveFinance.capital  = Math.round(Number(f.capital || 0) - payroll);

        window.ACS_Finance = liveFinance;

        console.log(
          "%c✈️ OCC FINANCE REBUILT WITH HR",
          "color:#00ffcc;font-weight:700",
          {
            salaries: liveFinance.cost.salaries,
            expenses: liveFinance.expenses,
            profit: liveFinance.profit,
            capital: liveFinance.capital
          }
        );
      }

    } else {
      console.warn("OCC FINANCE REBUILD SKIPPED — ACS_HR_getTotalPayroll not found");
    }

    window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

  } catch(err) {

    console.warn("FINANCE SYNC FAILED", err);

  }

}

/* ============================================================
   🚀 AUTO BOOT — SESSION WATCHER (REAL, NO PATCH)
   ============================================================ */

function ACS_waitForSessionAndBoot(){

  const airlineId =
    window.ACS_SERVER_SESSION?.airline_id ||
    window.ACS_activeUser?.airline_id;

  if(airlineId && !__ACS_FINANCE_STARTED){

    __ACS_FINANCE_STARTED = true;

    console.log("🟢 FINANCE BOOT WITH SESSION", airlineId);

    ACS_FINANCE_syncFromServer();
  }
}

/* ============================================================
   🔁 WATCH LOOP (LIGHTWEIGHT — SAFE FOR 700 PLAYERS)
   ============================================================ */

setInterval(ACS_waitForSessionAndBoot, 2000);
   
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
   
(function(){

  function ACS_FIN_applyLivePayrollAccrual(){

    try {

      // ============================================================
      // 1️⃣ SINGLE AUTHORITY — DEPARTMENT CONTROL / HR ENGINE
      // ============================================================

      if (typeof ACS_HR_getTotalPayroll !== "function") {
        console.warn("FINANCE HR PAYROLL SYNC ERROR — ACS_HR_getTotalPayroll not found");
        return;
      }

      const payroll = Number(ACS_HR_getTotalPayroll());

      if (!Number.isFinite(payroll) || payroll < 0) {
        console.warn("FINANCE HR PAYROLL SYNC ERROR — invalid payroll:", payroll);
        return;
      }

      const f = window.ACS_Finance;
      if (!f) return;

      if (!f.cost) f.cost = {};

      // ============================================================
      // 2️⃣ APPLY HR PAYROLL AS CANONICAL SALARY COST
      // ============================================================

      f.cost.salaries = Math.round(payroll);

      // Rebuild expenses from canonical breakdown
      const totalCosts =
        Number(f.cost.fuel || 0) +
        Number(f.cost.ground_handling || 0) +
        Number(f.cost.slot_fees || 0) +
        Number(f.cost.overflight || 0) +
        Number(f.cost.navigation || 0) +
        Number(f.cost.leasing || 0) +
        Number(f.cost.salaries || 0) +
        Number(f.cost.maintenance || 0) +
        Number(f.cost.penalties || 0) +
        Number(f.cost.used_aircraft_purchase || 0) +
        Number(f.cost.new_aircraft_purchase || 0);

      f.expenses = Math.round(totalCosts);
      f.profit   = Math.round(Number(f.revenue || 0) - f.expenses);

      window.ACS_Finance = f;
      window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

      console.log(
        "%c💰 FINANCE PAYROLL SYNC FROM DEPARTMENT CONTROL",
        "color:#00ffcc;font-weight:700",
        f.cost.salaries
      );

    } catch(err){

      console.warn("FINANCE HR PAYROLL SYNC ERROR", err);

    }

  }

  // Initial sync
  ACS_FIN_applyLivePayrollAccrual();

  // Live sync every time HR changes
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
    window.ACS_activeUser?.airline_id;

  if (!airlineId) {
    console.warn("FINANCE LOG: airlineId missing");
    return;
  }

  let simTime;

  try {
    simTime = Date.now();
  } catch {
    simTime = Date.now();
  }

  const payload = {
    airline_id: Number(airlineId),
    type: String(entry.type || "UNKNOWN"),
    source: String(entry.source || "SYSTEM"),
    amount: Number(entry.amount || 0),
    timestamp: simTime
  };

  fetch(
    "https://api.aviationcapitalsim.com/v1/finance/log",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  )
    .then(res => res.json())
    .then(data => {
      if (!data?.ok) {
        console.warn("FINANCE LOG SERVER ERROR", data);
      }
    })
    .catch(err => {
      console.warn("FINANCE LOG FAILED (NO LOCAL FALLBACK)", err);
    });

}

window.ACS_registerIncome = async function(payload){

  if (!payload || typeof payload.revenue !== "number") return;

  const airlineId =
    window.ACS_SERVER_SESSION?.airline_id ||
    window.ACS_activeUser?.airline_id;

  if (!airlineId) {
    console.warn("NO AIRLINE ID");
    return;
  }

  try {

    const res = await fetch(
      "https://api.aviationcapitalsim.com/v1/finance/flight-event",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          airline_id: Number(airlineId),
          revenue: payload.revenue,
          cost_fuel: payload.costs?.fuel || 0,
          cost_handling: payload.costs?.handling || 0,
          cost_slot: payload.costs?.slot || 0,
          cost_navigation: payload.costs?.navigation || 0,
          cost_overflight: payload.costs?.overflight || 0
        })
      }
    );

    const data = await res.json();

    if (!data?.ok) {
      console.warn("FLIGHT EVENT FAILED", data);
      return;
    }

    await ACS_FINANCE_syncFromServer();

    window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

    console.log("✅ FINANCE SYNC AFTER FLIGHT OK");

  } catch(err) {

    console.warn("FLIGHT EVENT ERROR", err);

  }

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

  const f = window.ACS_Finance;
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

  
   
  window.ACS_Finance = f;
  window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));
   
};
   
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

  // Department Control / HR = única autoridad
  if (typeof ACS_HR_getTotalPayroll !== "function") {
    console.warn("MONTHLY PAYROLL CHARGE SKIPPED — HR authority not available");
    return;
  }

  const payroll = Number(ACS_HR_getTotalPayroll());

  if (!Number.isFinite(payroll) || payroll <= 0) {
    console.warn("MONTHLY PAYROLL CHARGE SKIPPED — invalid payroll:", payroll);
    return;
  }

  // Registrar como costo salarial del mes
  f.cost.salaries = Math.round(payroll);

  // Rebuild total monthly expenses from canonical breakdown
  const totalCosts =
    Number(f.cost.fuel || 0) +
    Number(f.cost.ground_handling || 0) +
    Number(f.cost.slot_fees || 0) +
    Number(f.cost.overflight || 0) +
    Number(f.cost.navigation || 0) +
    Number(f.cost.leasing || 0) +
    Number(f.cost.salaries || 0) +
    Number(f.cost.maintenance || 0) +
    Number(f.cost.penalties || 0) +
    Number(f.cost.used_aircraft_purchase || 0) +
    Number(f.cost.new_aircraft_purchase || 0);

  f.expenses = Math.round(totalCosts);
  f.profit   = Math.round(Number(f.revenue || 0) - f.expenses);

  pushLog({
    type: "EXPENSE",
    source: "HR PAYROLL",
    amount: Math.round(payroll),
    meta: { month: monthKey }
  });

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

      const f = window.ACS_Finance;
      if (!f) return;

      // 1) Cerrar/abrir mes en Finance (live)
      ACS_FIN_closeMonthIfNeeded(f, monthKey);

      // 2) Aplicar cargo salarial para el nuevo mes
      ACS_FIN_applyMonthlyPayrollCharge(f, monthKey);

      window.ACS_Finance = f;
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

if(ACS_FIN_EVENT_DEDUP.has(eco.eventId)) return;
ACS_FIN_EVENT_DEDUP.add(eco.eventId);
   
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

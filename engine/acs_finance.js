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

async function ACS_FINANCE_syncFromServer() {

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

    if (!data?.ok || !data?.finance) {
      console.warn("FINANCE SYNC: invalid server response");
      return;
    }

    const officialSimTimeMs =
      Number(data.current_sim_time_ms);

    if (!Number.isFinite(officialSimTimeMs)) {
      throw new Error("FINANCE_OFFICIAL_SIM_TIME_MISSING");
    }

    const f = data.finance;

    window.ACS_Finance = {

      authority: "RAILWAY_POSTGRESQL",
      officialSimTimeMs,

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
        salaries: Number(f.cost_hr || 0),
        maintenance: Number(f.cost_maintenance || 0),
        penalties: Number(f.cost_other || 0),
        used_aircraft_purchase:
          Number(f.cost_used_aircraft_purchase || 0),
        new_aircraft_purchase:
          Number(f.cost_new_aircraft_purchase || 0)
      },

      leasing: {
        contracts: Array.isArray(data.leasing_contracts)
          ? data.leasing_contracts
          : []
      },

      bank: {
        loans: Array.isArray(data.bank_loans)
          ? data.bank_loans.map(loan => ({
              id: Number(loan.id),
              ref: loan.loan_reference,
              status: loan.status,
              collateralMode: loan.collateral_mode,
              originalAmount:
                Number(loan.original_principal || 0),
              remaining:
                Number(loan.remaining_principal || 0),
              rate:
                Number(loan.annual_interest_rate || 0),
              termMonths:
                Number(loan.term_months || 0),
              monthlyPayment:
                Number(loan.monthly_payment || 0),
              totalRepayment:
                Number(loan.total_repayment || 0),
              totalInterest:
                Number(loan.total_interest || 0),
              openedSimTime: loan.opened_sim_time,
              maturitySimTime: loan.maturity_sim_time,
              nextPaymentSimTime: loan.next_payment_sim_time,
              lastPaymentSimTime: loan.last_payment_sim_time,
              closedSimTime: loan.closed_sim_time,
              paymentNumber:
                Number(loan.payment_number || 0)
            }))
          : []
      },

      activity: Array.isArray(data.financial_activity)
        ? data.financial_activity.map(item => ({
            type: String(item.type || "")
              .trim()
              .toUpperCase(),
            source: String(item.source || "UNKNOWN").trim(),
            movementCount:
              Number(item.movement_count || 0),
            totalAmount:
              Number(item.total_amount || 0)
          }))
        : [],

      history: [],
      current_month:
        ACS_getMonthKey(officialSimTimeMs)
    };

    if (window.ACS_FINANCE_HISTORY) {
      await window.ACS_FINANCE_HISTORY.init();
    }

    window.dispatchEvent(
      new Event("ACS_FINANCE_UPDATED")
    );

    console.log(
      "🌍 FINANCE CANONICAL SNAPSHOT LOADED",
      {
        airlineId,
        officialSimTimeMs,
        activity:
          window.ACS_Finance.activity.length
      }
    );

  } catch (err) {

    console.warn("FINANCE SYNC FAILED", err);

  }

}
   
/* ============================================================
   🚀 ACS FINANCE — SESSION BOOT + 3 MINUTE LIVE REFRESH
   ------------------------------------------------------------
   • Primera carga inmediata al recibir sesión
   • Actualización visual cada 3 minutos
   • Una sola sincronización programada simultánea
   • El watcher de sesión se detiene después del arranque
   ============================================================ */

const ACS_FINANCE_REFRESH_INTERVAL_MS = 180000;

let ACS_FINANCE_SESSION_WATCHER = null;
let ACS_FINANCE_REFRESH_TIMER = null;
let ACS_FINANCE_REFRESH_RUNNING = false;

async function ACS_FINANCE_runScheduledRefresh() {

  if (ACS_FINANCE_REFRESH_RUNNING) {
    return;
  }

  ACS_FINANCE_REFRESH_RUNNING = true;

  try {
    await ACS_FINANCE_syncFromServer();
  } finally {
    ACS_FINANCE_REFRESH_RUNNING = false;
  }
}

async function ACS_waitForSessionAndBoot() {

  const airlineId =
    window.ACS_SERVER_SESSION?.airline_id ||
    window.ACS_activeUser?.airline_id;

  if (!airlineId || __ACS_FINANCE_STARTED) {
    return;
  }

  __ACS_FINANCE_STARTED = true;

  if (ACS_FINANCE_SESSION_WATCHER !== null) {
    clearInterval(ACS_FINANCE_SESSION_WATCHER);
    ACS_FINANCE_SESSION_WATCHER = null;
  }

  console.log("🟢 FINANCE BOOT WITH SESSION", airlineId);

  await ACS_FINANCE_runScheduledRefresh();

  ACS_FINANCE_REFRESH_TIMER = setInterval(
    ACS_FINANCE_runScheduledRefresh,
    ACS_FINANCE_REFRESH_INTERVAL_MS
  );
}

ACS_FINANCE_SESSION_WATCHER = setInterval(
  ACS_waitForSessionAndBoot,
  2000
);

ACS_waitForSessionAndBoot();
   
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

async function ACS_FIN_applyMonthlyPayrollCharge(f, monthKey){

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

  try {

    const res = await fetch(
      "https://api.aviationcapitalsim.com/v1/finance/payroll",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          month_key: monthKey,
          amount: Math.round(payroll)
        })
      }
    );

    const data = await res.json();

    if (!data?.ok) {
      console.warn("MONTHLY PAYROLL BACKEND FAILED", data);
      return;
    }

    if (data.already_applied) {
      console.log("📌 MONTHLY PAYROLL ALREADY APPLIED:", monthKey);
    } else {
      console.log("✅ MONTHLY PAYROLL APPLIED IN BACKEND:", {
        monthKey,
        payroll: Math.round(payroll)
      });
    }

    await ACS_FINANCE_syncFromServer();

    window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

  } catch(err){

    console.warn("MONTHLY PAYROLL REQUEST FAILED", err);

  }

}

/* ============================================================
   🗓️ LIVE MONTH CHANGE HOOK (Time Engine)
   ============================================================ */

if (typeof registerTimeListener === "function") {

  let __FIN_lastMonthKey = null;

  registerTimeListener(async (time) => {

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
      if (!f) {
        __FIN_lastMonthKey = monthKey;
        return;
      }

      const previousMonthKey = __FIN_lastMonthKey;

      // 1) cerrar mes anterior (solo UI / histórico)
      ACS_FIN_closeMonthIfNeeded(f, monthKey);

      window.ACS_Finance = f;
      window.dispatchEvent(new Event("ACS_FINANCE_UPDATED"));

      // 2) aplicar payroll REAL en backend (mes anterior)
      await ACS_FIN_applyMonthlyPayrollCharge(f, previousMonthKey);

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

/* ============================================================
   ACS FINANCE HISTORY — SINGLE CONTROLLED LOAD
   PostgreSQL read-only authority
   ============================================================ */

window.ACS_FINANCE_HISTORY = (() => {
  let loading = false;
  let data = null;
  let availableYears = [];
  let selectedYear = null;
  let controlsBound = false;

  function money(value) {
    return Number(value || 0).toLocaleString(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }
    );
  }

  function number(value) {
    return Number(value || 0).toLocaleString(
      "en-US"
    );
  }

  function setText(id, value) {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function renderYears(payload) {

  const yearField =
    document.getElementById("historyYearSelect");

  const previousButton =
    document.getElementById("historyPreviousYear");

  const nextButton =
    document.getElementById("historyNextYear");

  availableYears = Array.isArray(payload.available_years)
    ? [...new Set(
        payload.available_years
          .map(Number)
          .filter(Number.isInteger)
      )].sort((a, b) => a - b)
    : [];

  selectedYear = Number(payload.selected_year);

  if (yearField) {
    yearField.value = Number.isInteger(selectedYear)
      ? String(selectedYear)
      : "—";
  }

  const selectedIndex =
    availableYears.indexOf(selectedYear);

  if (previousButton) {
    previousButton.disabled =
      loading ||
      selectedIndex <= 0;
  }

  if (nextButton) {
    nextButton.disabled =
      loading ||
      selectedIndex < 0 ||
      selectedIndex >= availableYears.length - 1;
  }
}

  function renderSummary(payload) {
    const summary =
      payload.annual_summary || {};

    setText(
      "historyAnnualRevenue",
      money(summary.revenue)
    );

    setText(
      "historyAnnualExpenses",
      money(summary.expenses)
    );

    setText(
      "historyAnnualProfit",
      money(summary.profit)
    );

    setText(
      "historyAnnualFlights",
      number(summary.flight_count)
    );

    setText(
      "historyAnnualPassengers",
      number(summary.passenger_count)
    );

    const profitElement =
      document.getElementById(
        "historyAnnualProfit"
      );

    if (profitElement) {
      profitElement.style.color =
        Number(summary.profit || 0) >= 0
          ? "#00f59b"
          : "#ff626b";
    }
  }

    const monthNames = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER"
  ];

  function detailItem(label, value) {
    return `
      <div class="history-detail-item">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }

  function renderMonthDetail(record) {
    const detail =
      document.getElementById(
        "historyMonthDetail"
      );

    if (!detail || !record) return;

    const monthName =
      monthNames[
        Number(record.month) - 1
      ] || "MONTH";

    const status =
      record.record_kind === "OPEN_PERIOD"
        ? "IN PROGRESS"
        : "VERIFIED";

    detail.innerHTML = `
      <div class="history-legacy-title">
        ${monthName} ${record.year}
        · ${status}
      </div>

      <div class="history-detail-grid">
        ${detailItem(
          "Opening Capital",
          money(record.opening_capital)
        )}

        ${detailItem(
          "Closing Capital",
          money(
            record.closing_capital ??
            record.capital
          )
        )}

        ${detailItem(
          "Revenue",
          money(record.revenue)
        )}

        ${detailItem(
          "Expenses",
          money(record.expenses)
        )}

        ${detailItem(
          "Profit",
          money(record.profit)
        )}

        ${detailItem(
          "Flights",
          number(record.flight_count)
        )}

        ${detailItem(
          "Passengers",
          number(record.passenger_count)
        )}

        ${detailItem(
          "Fuel",
          money(record.cost_fuel)
        )}

        ${detailItem(
          "Ground Handling",
          money(record.cost_handling)
        )}

        ${detailItem(
          "Landing",
          money(record.cost_landing)
        )}

        ${detailItem(
          "Navigation",
          money(record.cost_navigation)
        )}

        ${detailItem(
          "Overflight",
          money(record.cost_overflight)
        )}

        ${detailItem(
          "Slots",
          money(record.cost_slots)
        )}

        ${detailItem(
          "Maintenance",
          money(record.cost_maintenance)
        )}

        ${detailItem(
          "Salaries",
          money(record.cost_hr)
        )}

        ${detailItem(
          "Leasing",
          money(record.cost_leasing)
        )}

        ${detailItem(
          "Loans",
          money(record.cost_loans)
        )}

        ${detailItem(
          "Other Costs",
          money(record.cost_other)
        )}

        ${detailItem(
          "New Aircraft",
          money(
            record.cost_new_aircraft_purchase
          )
        )}

        ${detailItem(
          "Used Aircraft",
          money(
            record.cost_used_aircraft_purchase
          )
        )}
      </div>
    `;

    detail.hidden = false;
  }

  function renderLegacy(record) {
    const panel =
      document.getElementById(
        "historyLegacyPanel"
      );

    if (!panel) return;

    if (!record) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    const metadata =
      record.metadata || {};

    panel.innerHTML = `
      <div class="history-legacy-title">
        Legacy Financial Cutover
      </div>

      <div class="history-legacy-copy">
        Consolidated financial record covering
        ${metadata.coverage_start || "the initial period"}
        through
        ${metadata.coverage_end || "the cutover date"}.
        Monthly values were not invented because
        the original timestamps were not verifiable.
      </div>

      <div
        class="history-detail-grid"
        style="margin-top:16px;"
      >
        ${detailItem(
          "Revenue",
          money(record.revenue)
        )}

        ${detailItem(
          "Expenses",
          money(record.expenses)
        )}

        ${detailItem(
          "Profit",
          money(record.profit)
        )}

        ${detailItem(
          "Capital",
          money(
            record.closing_capital ??
            record.capital
          )
        )}
      </div>
    `;

    panel.hidden = false;
  }

  function renderMonths(payload) {
    const grid =
      document.getElementById(
        "historyMonthGrid"
      );

    if (!grid) return;

    const historyRows =
      Array.isArray(payload.months)
        ? payload.months
        : [];

    const legacyRecord =
      historyRows.find(
        row =>
          row.record_kind ===
          "LEGACY_CUTOVER"
      );

    const monthMap = new Map();

    historyRows
      .filter(
        row =>
          row.record_kind !==
          "LEGACY_CUTOVER"
      )
      .forEach(row => {
        monthMap.set(
          Number(row.month),
          row
        );
      });

    if (payload.open_month) {
      monthMap.set(
        Number(payload.open_month.month),
        payload.open_month
      );
    }

    grid.innerHTML = "";

    for (
      let month = 1;
      month <= 12;
      month += 1
    ) {
      const record =
        monthMap.get(month);

      const card =
        document.createElement("button");

      card.type = "button";
      card.className =
        "history-month-card";

      if (!record) {
        card.classList.add("is-empty");
      }

      const profit = Number(
        record?.profit || 0
      );

      const live =
        record?.record_kind ===
        "OPEN_PERIOD";

      card.innerHTML = `
        <span class="history-month-name">
          ${monthNames[month - 1]}
        </span>

        <span
          class="
            history-month-profit
            ${profit < 0 ? "is-negative" : ""}
          "
        >
          ${
            record
              ? money(profit)
              : "—"
          }
        </span>

        <span
          class="
            history-month-status
            ${live ? "is-live" : ""}
          "
        >
          ${
            record
              ? live
                ? "IN PROGRESS"
                : "VERIFIED"
              : "NO ACTIVITY"
          }
        </span>
      `;

      card.disabled = !record;

      if (record) {
        card.addEventListener(
          "click",
          () => {
            grid
              .querySelectorAll(
                ".history-month-card"
              )
              .forEach(item => {
                item.classList.remove(
                  "is-selected"
                );
              });

            card.classList.add(
              "is-selected"
            );

            renderMonthDetail(record);
          }
        );
      }

      grid.appendChild(card);
    }

    renderLegacy(legacyRecord);

    const defaultRecord =
      payload.open_month ||
      Array.from(
        monthMap.values()
      ).at(-1);

    if (defaultRecord) {
      const defaultCard =
        grid.children[
          Number(defaultRecord.month) - 1
        ];

      if (defaultCard) {
        defaultCard.classList.add(
          "is-selected"
        );
      }

      renderMonthDetail(defaultRecord);
    }
  }
   
  function bindControls() {

  if (controlsBound) return;

  const previousButton =
    document.getElementById("historyPreviousYear");

  const nextButton =
    document.getElementById("historyNextYear");

  previousButton?.addEventListener("click", async () => {

    const currentIndex =
      availableYears.indexOf(selectedYear);

    if (currentIndex <= 0) return;

    await loadYear(
      availableYears[currentIndex - 1]
    );
  });

  nextButton?.addEventListener("click", async () => {

    const currentIndex =
      availableYears.indexOf(selectedYear);

    if (
      currentIndex < 0 ||
      currentIndex >= availableYears.length - 1
    ) {
      return;
    }

    await loadYear(
      availableYears[currentIndex + 1]
    );
  });

  controlsBound = true;
}

async function loadYear(year = null) {

  if (loading) return data;

  loading = true;

  const status =
    document.getElementById("financeHistoryStatus");

  const previousButton =
    document.getElementById("historyPreviousYear");

  const nextButton =
    document.getElementById("historyNextYear");

  if (previousButton) previousButton.disabled = true;
  if (nextButton) nextButton.disabled = true;

  if (status) {
    status.hidden = false;
    status.textContent = "Loading financial records…";
  }

  try {

    const requestedYear = Number(year);

    const url = Number.isInteger(requestedYear)
      ? `https://api.aviationcapitalsim.com/v1/finance/history?year=${encodeURIComponent(requestedYear)}`
      : "https://api.aviationcapitalsim.com/v1/finance/history";

    const response = await fetch(url, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(
        `FINANCE_HISTORY_HTTP_${response.status}`
      );
    }

    const payload = await response.json();

    if (!payload?.ok) {
      throw new Error(
        payload?.error ||
        "FINANCE_HISTORY_INVALID_RESPONSE"
      );
    }

    data = payload;

    renderYears(payload);
    renderSummary(payload);
    renderMonths(payload);

    const hasRecords =
      (Array.isArray(payload.months) &&
        payload.months.length > 0) ||
      Boolean(payload.open_month);

    if (status) {
      if (hasRecords) {
        status.hidden = true;
      } else {
        status.hidden = false;
        status.textContent =
          `No financial activity recorded for ${payload.selected_year}.`;
      }
    }

    console.log(
      "✅ FINANCE HISTORY YEAR LOADED",
      {
        year: payload.selected_year,
        months: payload.months?.length || 0,
        openMonth: payload.open_month?.month || null
      }
    );

    return payload;

  } catch (error) {

    console.error(
      "FINANCE HISTORY LOAD ERROR",
      error
    );

    if (status) {
      status.hidden = false;
      status.textContent =
        "Financial history unavailable.";
    }

    return null;

  } finally {

    loading = false;

    if (data) {
      renderYears(data);
    }
  }
}

async function init() {
  bindControls();
  return loadYear();
}

return {
  init,
  loadYear,
  getData() {
    return data;
  }
};

})();



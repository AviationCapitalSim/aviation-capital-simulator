/* ============================================================
   🔒 ACS INTERNAL MONITOR JS — v0.1
   ------------------------------------------------------------
   Phase 1–2.1:
   - DEV gate
   - Time Engine snapshot (read-only)
   ============================================================ */

(function(){

  /* =========================
     DEV GATE (PRIVATE ONLY)
     ========================= */
  const isDev = (localStorage.getItem("ACS_DEV") === "true");
  const devChip = document.getElementById("devChip");

  if (devChip) devChip.textContent = `DEV: ${isDev ? "ENABLED" : "DISABLED"}`;

  if (!isDev) {
    window.location.href = "../index.html";
    return;
  }

  /* =========================
     OUTPUT HELPERS
     ========================= */
  const outTime = document.getElementById("outTime");
  const outHR = document.getElementById("outHR");
  const outFinance = document.getElementById("outFinance");
  const outOps = document.getElementById("outOps");
  const outWarnings = document.getElementById("outWarnings");

  function write(el, text){
    if (!el) return;
    el.textContent = String(text || "");
  }

  function snapshotPlaceholder(){
  write(outTime, "DEV access OK.\nPhase 1 loaded.\n\nNext: Live diagnostics (Time/HR/Finance/Ops).");
  write(outHR, "Waiting for Phase 2.");
  write(outFinance, "Waiting for Phase 2.");
  write(outOps, "Waiting for Phase 2.");
  write(outWarnings, "Waiting for Phase 2.");
}

  /* ============================================================
   🕒 PHASE 2.2 — TIME ENGINE LIVE SNAPSHOT (READ ONLY)
   ============================================================ */

function renderTimeSnapshot() {

  const out = document.getElementById("outTime");
  if (!out) return;

  let lines = [];

  const t = window.ACS_TIME_CURRENT;

  if (t instanceof Date && !isNaN(t)) {

    lines.push("STATUS: OK");
    lines.push(`UTC TIME : ${t.toUTCString()}`);
    lines.push(`YEAR     : ${t.getUTCFullYear()}`);
    lines.push(`MONTH    : ${t.getUTCMonth() + 1}`);
    lines.push(`DAY      : ${t.getUTCDate()}`);
    lines.push(`TIMESTAMP: ${t.getTime()}`);

  } else {

    lines.push("STATUS: ⚠️ NOT READY");
    lines.push("ACS_TIME_CURRENT is not a valid Date");
  }

  lines.push("");
  lines.push("CHECKS:");

  lines.push(
    typeof registerTimeListener === "function"
      ? "✔ registerTimeListener available"
      : "❌ registerTimeListener missing"
  );

  lines.push(
    typeof window.ACS_TIME_CURRENT !== "undefined"
      ? "✔ ACS_TIME_CURRENT defined"
      : "❌ ACS_TIME_CURRENT undefined"
  );

  out.textContent = lines.join("\n");
}

/* 🔄 Botón Refresh Snapshot */
const __btnRefreshTime = document.getElementById("btnRefresh");
if (__btnRefreshTime) {
  __btnRefreshTime.addEventListener("click", renderTimeSnapshot);
}

/* ▶ Auto-render al cargar (si el tiempo ya existe) */
setTimeout(renderTimeSnapshot, 300);

  /* =========================
     INIT
     ========================= */
   
  snapshotPlaceholder();
  renderTimeSnapshot();
  renderHRSnapshot();
  renderFinanceSnapshot();
  renderOpsSnapshot();
  renderIntegritySnapshot();
 
 const btn = document.getElementById("btnRefresh");
 if (btn) btn.addEventListener("click", () => {
  renderTimeSnapshot();
  renderHRSnapshot();
  renderFinanceSnapshot();
  renderOpsSnapshot();
  renderIntegritySnapshot();
});

/* ============================================================
   🧑‍✈️ PHASE 2.2 — HR LIVE STATE SNAPSHOT (READ ONLY)
   ============================================================ */
function renderHRSnapshot() {

  let lines = [];

  const hr = localStorage.getItem("ACS_HR");

  if (!hr) {
    lines.push("STATUS: ❌ ACS_HR not found");
    write(outHR, lines.join("\n"));
    return;
  }

  let HR;
  try {
    HR = JSON.parse(hr);
  } catch (e) {
    lines.push("STATUS: ❌ ACS_HR corrupted JSON");
    write(outHR, lines.join("\n"));
    return;
  }

  let totalStaff = 0;
  let totalPayroll = 0;
  let departments = 0;

  Object.values(HR).forEach(dep => {
    if (!dep || typeof dep.staff !== "number") return;
    totalStaff += dep.staff;
    totalPayroll += dep.staff * (dep.salary || 0);
    departments++;
  });

  lines.push("STATUS: OK");
  lines.push(`DEPARTMENTS : ${departments}`);
  lines.push(`TOTAL STAFF : ${totalStaff}`);
  lines.push(`PAYROLL     : $${totalPayroll.toLocaleString()}`);

  lines.push("");
  lines.push("FLAGS:");

  lines.push(
    localStorage.getItem("autoHire") === "true"
      ? "✔ AutoHire ENABLED"
      : "• AutoHire OFF"
  );

  lines.push(
    localStorage.getItem("ACS_AutoSalary") === "ON"
      ? "✔ AutoSalary ENABLED"
      : "• AutoSalary OFF"
  );

  write(outHR, lines.join("\n"));
}

/* ============================================================
   💰 PHASE 2.3 — FINANCE LEDGER SNAPSHOT (READ ONLY)
   ============================================================ */

function renderFinanceSnapshot() {

  const out = document.getElementById("outFinance");
  if (!out) return;

  let lines = [];

  const f = window.ACS_Finance || (() => {
    try {
      return JSON.parse(localStorage.getItem("ACS_Finance"));
    } catch {
      return null;
    }
  })();

  if (!f) {
    lines.push("STATUS: ❌ ACS_FINANCE not found");
    lines.push("Finance engine not loaded or storage missing.");
    out.textContent = lines.join("\n");
    return;
  }

  lines.push("STATUS: OK");
  lines.push("");
  lines.push("TOTALS:");
  lines.push(`CAPITAL        : $${Number(f.capital || 0).toLocaleString()}`);
  lines.push(`REVENUE (MONTH): $${Number(f.revenue || 0).toLocaleString()}`);
  lines.push(`EXPENSES (MON): $${Number(f.expenses || 0).toLocaleString()}`);
  lines.push(`PROFIT (MONTH): $${Number(f.profit || 0).toLocaleString()}`);

  lines.push("");
  lines.push("COST BREAKDOWN:");

  if (f.cost) {
    Object.entries(f.cost).forEach(([k, v]) => {
      lines.push(`- ${k.padEnd(22)} : $${Number(v || 0).toLocaleString()}`);
    });
  } else {
    lines.push("⚠️ No cost structure found");
  }

  lines.push("");
  lines.push("META:");
  lines.push(`CURRENT MONTH : ${f.current_month || "N/A"}`);
  lines.push(`HISTORY ENTRIES: ${(f.history || []).length}`);

  out.textContent = lines.join("\n");
}

/* 🔄 Refresh button */
const __btnRefreshFinance = document.getElementById("btnRefresh");
if (__btnRefreshFinance) {
  __btnRefreshFinance.addEventListener("click", renderFinanceSnapshot);
}

/* ▶ Auto-render */
setTimeout(renderFinanceSnapshot, 400);

/* ============================================================
   🧑‍✈️ PHASE 2.4 — HR ⇄ FINANCE CONSISTENCY CHECK
   ============================================================ */

function renderHRFinanceConsistency() {

  const out = document.getElementById("outWarnings");
  if (!out) return;

  let lines = [];
  let warnings = 0;

  const HR = (() => {
    try { return JSON.parse(localStorage.getItem("ACS_HR")); }
    catch { return null; }
  })();

  const payrollHR = Number(localStorage.getItem("ACS_HR_PAYROLL") || 0);

  const f = window.ACS_Finance || (() => {
    try { return JSON.parse(localStorage.getItem("ACS_Finance")); }
    catch { return null; }
  })();

  lines.push("HR ⇄ FINANCE CONSISTENCY");
  lines.push("");

  /* =========================
     HR CHECK
     ========================= */
  if (!HR) {
    lines.push("❌ HR data missing");
    warnings++;
  } else {
    const staffTotal = Object.values(HR).reduce((s,d)=>s+(d.staff||0),0);
    lines.push(`✔ HR Departments : ${Object.keys(HR).length}`);
    lines.push(`✔ HR Staff Total : ${staffTotal}`);
    lines.push(`✔ HR Payroll     : $${payrollHR.toLocaleString()}`);
  }

  lines.push("");

  /* =========================
     FINANCE CHECK
     ========================= */
  if (!f) {
    lines.push("❌ Finance data missing");
    warnings++;
  } else {
    const salaryCost = Number(f.cost?.salaries || 0);
    lines.push(`✔ Finance Salaries : $${salaryCost.toLocaleString()}`);

    /* =========================
       CROSS CHECK
       ========================= */
    if (salaryCost !== payrollHR) {
      lines.push("⚠️ MISMATCH DETECTED");
      lines.push(`   HR Payroll   : $${payrollHR.toLocaleString()}`);
      lines.push(`   Finance Cost : $${salaryCost.toLocaleString()}`);
      warnings++;
    } else {
      lines.push("✔ Payroll matches Finance salaries");
    }
  }

  lines.push("");
  lines.push("FLAGS:");

  lines.push(
    localStorage.getItem("autoHire") === "true"
      ? "✔ AutoHire ENABLED"
      : "• AutoHire OFF"
  );

  lines.push(
    localStorage.getItem("ACS_AutoSalary") === "ON"
      ? "⚠️ AutoSalary ON"
      : "✔ AutoSalary OFF"
  );

  lines.push("");
  lines.push(
    warnings === 0
      ? "✅ SYSTEM CONSISTENT"
      : `⚠️ WARNINGS DETECTED: ${warnings}`
  );

  out.textContent = lines.join("\n");
}

/* ▶ Auto render */
setTimeout(renderHRFinanceConsistency, 600);

/* ============================================================
   🚨 PHASE 2.6 — ALERT ENGINE (READ ONLY)
   ============================================================ */

function renderAlertEngine() {

  const out = document.getElementById("outWarnings");
  if (!out) return;

  let alerts = [];

  /* =========================
     TIME ENGINE ALERTS
     ========================= */
  if (!(window.ACS_TIME_CURRENT instanceof Date)) {
    alerts.push("⏱️ TIME ENGINE: NOT ACTIVE");
  }

  /* =========================
     HR ALERTS
     ========================= */
  const HR = (() => {
    try { return JSON.parse(localStorage.getItem("ACS_HR")); }
    catch { return null; }
  })();

  if (!HR) {
    alerts.push("🧑‍✈️ HR: DATA MISSING");
  } else {
    Object.entries(HR).forEach(([k, d]) => {
      if (d.required > 0 && d.staff < d.required) {
        alerts.push(`🧑‍✈️ HR: ${k} understaffed (${d.staff}/${d.required})`);
      }
    });
  }

  /* =========================
     FINANCE ALERTS
     ========================= */
  const f = (() => {
    try { return JSON.parse(localStorage.getItem("ACS_Finance")); }
    catch { return null; }
  })();

  if (f && Number(f.profit) < 0) {
    alerts.push(`💰 FINANCE: Negative profit (${Number(f.profit).toLocaleString()})`);
  }

  /* =========================
     OPS ALERTS
     ========================= */
  const routes = (() => {
    try { return JSON.parse(localStorage.getItem("scheduleItems")); }
    catch { return null; }
  })();

  if (!routes || routes.length === 0) {
    alerts.push("🛫 OPS: No active routes");
  }

  /* =========================
     OUTPUT
     ========================= */
  if (alerts.length === 0) {
    out.textContent += "\n\n🚦 ALERTS:\n✔ No active alerts";
  } else {
    out.textContent += "\n\n🚦 ALERTS:\n" + alerts.map(a => `- ${a}`).join("\n");
  }
}

/* ▶ Auto render */
setTimeout(renderAlertEngine, 700);

/* ============================================================
   📡 PHASE 2.7 — EVENT TRACE ENGINE (READ ONLY)
   ============================================================ */

(function initEventTrace(){

  const MAX_EVENTS = 12;
  const out = document.getElementById("outWarnings");
  if (!out) return;

  let trace = [];

  function logEvent(type, msg) {
    const t = window.ACS_TIME_CURRENT instanceof Date
      ? window.ACS_TIME_CURRENT.toISOString()
      : new Date().toISOString();

    trace.unshift(`[${t}] ${type} → ${msg}`);
    if (trace.length > MAX_EVENTS) trace.pop();

    renderTrace();
  }

  function renderTrace() {
    const block =
      "\n\n📡 EVENT TRACE (latest):\n" +
      trace.map(e => `• ${e}`).join("\n");

    if (!out.textContent.includes("📡 EVENT TRACE")) {
      out.textContent += block;
    } else {
      out.textContent = out.textContent.replace(
        /📡 EVENT TRACE[\s\S]*$/m,
        block.trim()
      );
    }
  }

  /* =========================
     PASSIVE HOOKS
     ========================= */

  window.addEventListener("ACS_FINANCE_UPDATED", () => {
    try {
      const f = JSON.parse(localStorage.getItem("ACS_Finance"));
      logEvent("FINANCE", `Profit: ${Number(f?.profit || 0).toLocaleString()}`);
    } catch {}
  });

  window.addEventListener("ACS_HR_UPDATED", () => {
    try {
      const p = Number(localStorage.getItem("ACS_HR_PAYROLL") || 0);
      logEvent("HR", `Payroll updated: ${p.toLocaleString()}`);
    } catch {}
  });

  window.addEventListener("ACS_ROUTE_UPDATED", () => {
    try {
      const r = JSON.parse(localStorage.getItem("scheduleItems")) || [];
      logEvent("OPS", `Routes total: ${r.length}`);
    } catch {}
  });

  /* =========================
     MONTH CHANGE WATCH
     ========================= */
  let lastMonth = null;

  setInterval(() => {
    if (!(window.ACS_TIME_CURRENT instanceof Date)) return;
    const m = window.ACS_TIME_CURRENT.getUTCMonth();
    if (lastMonth !== null && m !== lastMonth) {
      logEvent("TIME", "Month changed");
    }
    lastMonth = m;
  }, 2000);

})();
   
/* ============================================================
   🛫 PHASE 4 — OPS / ROUTES SNAPSHOT (READ ONLY)
   ============================================================ */
function renderOpsSnapshot() {

  let lines = [];

  const raw = localStorage.getItem("scheduleItems");

  if (!raw) {
    lines.push("STATUS: ❌ No routes scheduled");
    write(outOps, lines.join("\n"));
    return;
  }

  let routes;
  try {
    routes = JSON.parse(raw);
  } catch {
    lines.push("STATUS: ❌ scheduleItems corrupted");
    write(outOps, lines.join("\n"));
    return;
  }

  const total = routes.length || 0;
  const active = routes.filter(r => r.status === "ACTIVE").length;
  const pending = routes.filter(r => r.status === "PENDING").length;

  lines.push("STATUS: OK");
  lines.push(`TOTAL ROUTES : ${total}`);
  lines.push(`ACTIVE       : ${active}`);
  lines.push(`PENDING      : ${pending}`);

  write(outOps, lines.join("\n"));
}
/* ============================================================
   ⚠️ PHASE 5 — INTEGRITY & WARNINGS
   ============================================================ */
function renderIntegritySnapshot() {

  let lines = [];
  let warnings = 0;

  const hr = localStorage.getItem("ACS_HR");
  const fin = localStorage.getItem("ACS_Finance");
  const routes = localStorage.getItem("scheduleItems");

  if (!hr) {
    warnings++;
    lines.push("❌ HR data missing");
  }

  if (!fin) {
    warnings++;
    lines.push("❌ Finance data missing");
  }

  if (!routes) {
    warnings++;
    lines.push("⚠️ No routes scheduled");
  }

  if (warnings === 0) {
    lines.push("✔ SYSTEM INTEGRITY OK");
  }

  write(outWarnings, lines.join("\n"));
}

/* ============================================================
   📦 PHASE 2.8 — FULL SNAPSHOT EXPORT (READ ONLY)
   ============================================================ */

(function initSnapshotExport(){

  const btn = document.getElementById("btnRefresh");
  if (!btn) return;

  btn.addEventListener("click", () => {

    const snapshot = {
      meta: {
        generated_at: new Date().toISOString(),
        dev: localStorage.getItem("ACS_DEV") === "true",
        version: "ACS-BETA"
      },

      time: (() => {
        const t = window.ACS_TIME_CURRENT;
        return t instanceof Date ? {
          utc: t.toUTCString(),
          year: t.getUTCFullYear(),
          month: t.getUTCMonth() + 1,
          day: t.getUTCDate(),
          timestamp: t.getTime()
        } : null;
      })(),

      hr: (() => {
        try {
          return {
            data: JSON.parse(localStorage.getItem("ACS_HR")),
            payroll: Number(localStorage.getItem("ACS_HR_PAYROLL") || 0),
            autoHire: localStorage.getItem("autoHire") === "true",
            autoSalary: localStorage.getItem("ACS_AutoSalary") === "ON"
          };
        } catch {
          return null;
        }
      })(),

      finance: (() => {
        try {
          return window.ACS_Finance
            ? window.ACS_Finance
            : JSON.parse(localStorage.getItem("ACS_Finance"));
        } catch {
          return null;
        }
      })(),

      ops: (() => {
        try {
          return {
            routes: JSON.parse(localStorage.getItem("scheduleItems")) || []
          };
        } catch {
          return null;
        }
      })()
    };

    console.group("📦 ACS SNAPSHOT EXPORT");
    console.log(snapshot);
    console.groupEnd();

    // guardado temporal (opcional)
    localStorage.setItem(
      "ACS_SNAPSHOT_LAST",
      JSON.stringify(snapshot, null, 2)
    );

    alert("📦 ACS Snapshot generado.\nRevisa la consola.");
  });

})();
   

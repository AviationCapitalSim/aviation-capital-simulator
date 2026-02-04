/* ============================================================
   🔒 ACS INTERNAL MONITOR JS — v0.1
   ------------------------------------------------------------
   Phase 1–2.9:
   - DEV gate
   - Time / HR / Finance / Ops snapshots
   - Consistency checks
   - Alerts
   - Event trace
   - Snapshot export
   - Snapshot diff
   ============================================================ */

(function(){

  /* =========================
     DEV GATE (PRIVATE ONLY)
     ========================= */
  const isDev = (localStorage.getItem("ACS_DEV") === "true");
  const devChip = document.getElementById("devChip");

  if (devChip) {
    devChip.textContent = `DEV: ${isDev ? "ENABLED" : "DISABLED"}`;
  }

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
    write(outHR, "Waiting...");
    write(outFinance, "Waiting...");
    write(outOps, "Waiting...");
    write(outWarnings, "Waiting...");
  }

  /* ============================================================
     🕒 PHASE 2.2 — TIME ENGINE SNAPSHOT
     ============================================================ */
  function renderTimeSnapshot() {

    const t = window.ACS_TIME_CURRENT;
    let lines = [];

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
    lines.push(typeof registerTimeListener === "function"
      ? "✔ registerTimeListener available"
      : "❌ registerTimeListener missing");
    lines.push(typeof window.ACS_TIME_CURRENT !== "undefined"
      ? "✔ ACS_TIME_CURRENT defined"
      : "❌ ACS_TIME_CURRENT undefined");

    write(outTime, lines.join("\n"));
  }

  /* ============================================================
     🧑‍✈️ PHASE 2.2 — HR SNAPSHOT
     ============================================================ */
  function renderHRSnapshot() {

    const raw = localStorage.getItem("ACS_HR");
    if (!raw) {
      write(outHR, "STATUS: ❌ ACS_HR not found");
      return;
    }

    let HR;
    try { HR = JSON.parse(raw); }
    catch {
      write(outHR, "STATUS: ❌ ACS_HR corrupted JSON");
      return;
    }

    let staff = 0;
    let payroll = 0;
    let deps = 0;

    Object.values(HR).forEach(d => {
      if (!d || typeof d.staff !== "number") return;
      staff += d.staff;
      payroll += d.staff * (d.salary || 0);
      deps++;
    });

    let lines = [
      "STATUS: OK",
      `DEPARTMENTS : ${deps}`,
      `TOTAL STAFF : ${staff}`,
      `PAYROLL     : $${payroll.toLocaleString()}`,
      "",
      "FLAGS:",
      localStorage.getItem("autoHire") === "true" ? "✔ AutoHire ENABLED" : "• AutoHire OFF",
      localStorage.getItem("ACS_AutoSalary") === "ON" ? "✔ AutoSalary ENABLED" : "• AutoSalary OFF"
    ];

    write(outHR, lines.join("\n"));
  }

  /* ============================================================
     💰 PHASE 2.3 — FINANCE SNAPSHOT
     ============================================================ */
  function renderFinanceSnapshot() {

    let f = window.ACS_Finance;
    if (!f) {
      try { f = JSON.parse(localStorage.getItem("ACS_Finance")); }
      catch { f = null; }
    }

    if (!f) {
      write(outFinance, "STATUS: ❌ ACS_Finance not found");
      return;
    }

    let lines = [
      "STATUS: OK",
      "",
      "TOTALS:",
      `CAPITAL        : $${Number(f.capital || 0).toLocaleString()}`,
      `REVENUE (MON)  : $${Number(f.revenue || 0).toLocaleString()}`,
      `EXPENSES (MON) : $${Number(f.expenses || 0).toLocaleString()}`,
      `PROFIT (MON)   : $${Number(f.profit || 0).toLocaleString()}`,
      "",
      "COST BREAKDOWN:"
    ];

    if (f.cost) {
      Object.entries(f.cost).forEach(([k,v]) => {
        lines.push(`- ${k.padEnd(20)} : $${Number(v||0).toLocaleString()}`);
      });
    }

    write(outFinance, lines.join("\n"));
  }

  /* ============================================================
     🛫 PHASE 4 — OPS SNAPSHOT
     ============================================================ */
  function renderOpsSnapshot() {

    let routes;
    try { routes = JSON.parse(localStorage.getItem("scheduleItems")) || []; }
    catch { routes = []; }

    let lines = [
      "STATUS: OK",
      `TOTAL ROUTES : ${routes.length}`,
      `ACTIVE       : ${routes.filter(r=>r.status==="ACTIVE").length}`,
      `PENDING      : ${routes.filter(r=>r.status==="PENDING").length}`
    ];

    write(outOps, lines.join("\n"));
  }

  /* ============================================================
     ⚠️ PHASE 5 — INTEGRITY
     ============================================================ */
  function renderIntegritySnapshot() {

    let warnings = [];
    if (!localStorage.getItem("ACS_HR")) warnings.push("❌ HR missing");
    if (!localStorage.getItem("ACS_Finance")) warnings.push("❌ Finance missing");
    if (!localStorage.getItem("scheduleItems")) warnings.push("⚠️ No routes");

    write(outWarnings, warnings.length
      ? warnings.join("\n")
      : "✔ SYSTEM INTEGRITY OK");
  }

  /* ============================================================
     📦 PHASE 2.8 — SNAPSHOT EXPORT
     ============================================================ */
  (function initSnapshotExport(){

    const btn = document.getElementById("btnRefresh");
    if (!btn) return;

    btn.addEventListener("click", () => {

      const snapshot = {
        meta: {
          generated_at: new Date().toISOString(),
          dev: isDev,
          version: "ACS-BETA"
        },
        time: window.ACS_TIME_CURRENT instanceof Date ? window.ACS_TIME_CURRENT.toISOString() : null,
        hr: JSON.parse(localStorage.getItem("ACS_HR") || "null"),
        finance: JSON.parse(localStorage.getItem("ACS_Finance") || "null"),
        ops: JSON.parse(localStorage.getItem("scheduleItems") || "[]")
      };

      localStorage.setItem("ACS_SNAPSHOT_LAST", JSON.stringify(snapshot, null, 2));
      console.log("📦 ACS SNAPSHOT", snapshot);
      alert("📦 ACS Snapshot generado.\nRevisa la consola.");
    });

  })();

  /* ============================================================
     🧪 PHASE 2.9 — SNAPSHOT DIFF
     ============================================================ */
  (function ACS_SnapshotDiff(){

    const out = outWarnings;
    if (!out) return;

    const last = JSON.parse(localStorage.getItem("ACS_SNAPSHOT_LAST") || "null");
    const prev = JSON.parse(localStorage.getItem("ACS_SNAPSHOT_PREV") || "null");

    if (!last) {
      write(out, "🧪 SNAPSHOT DIFF\n\nNo snapshot available yet.");
      return;
    }

    if (!prev) {
      write(out, "🧪 SNAPSHOT DIFF\n\nFirst baseline snapshot.");
    } else {
      write(out, "🧪 SNAPSHOT DIFF\n\n(see console)");
      console.log("PREV SNAPSHOT", prev);
      console.log("LAST SNAPSHOT", last);
    }

    localStorage.setItem("ACS_SNAPSHOT_PREV", JSON.stringify(last));

  })();

  /* =========================
     INIT
     ========================= */
  snapshotPlaceholder();
  renderTimeSnapshot();
  renderHRSnapshot();
  renderFinanceSnapshot();
  renderOpsSnapshot();
  renderIntegritySnapshot();

  setTimeout(renderTimeSnapshot, 300);
  setTimeout(renderFinanceSnapshot, 400);

/* ============================================================
   🩺 PHASE 3.1 — ACS HEALTH SCORE ENGINE (READ ONLY)
   ============================================================ */

(function ACS_HealthScore(){

  const score = {
    total: 0,
    max: 100,
    details: [],
    status: "UNKNOWN"
  };

  /* =========================
     TIME ENGINE (20)
     ========================= */
  if (window.ACS_TIME_CURRENT instanceof Date) {
    score.total += 20;
  } else {
    score.details.push("⏱️ Time Engine inactive");
  }

  /* =========================
     HR HEALTH (20)
     ========================= */
  let HR = null;
  try { HR = JSON.parse(localStorage.getItem("ACS_HR")); } catch {}

  if (HR) {
    let understaff = false;
    Object.values(HR).forEach(d => {
      if (d.required > 0 && d.staff < d.required) understaff = true;
    });

    if (!understaff) {
      score.total += 20;
    } else {
      score.details.push("🧑‍✈️ HR understaffed");
    }
  } else {
    score.details.push("🧑‍✈️ HR data missing");
  }

  /* =========================
     FINANCE HEALTH (20)
     ========================= */
  let fin = null;
  try {
    fin = window.ACS_Finance || JSON.parse(localStorage.getItem("ACS_Finance"));
  } catch {}

  if (fin) {
    if (Number(fin.profit) >= 0) {
      score.total += 20;
    } else {
      score.details.push("💰 Finance negative profit");
    }
  } else {
    score.details.push("💰 Finance data missing");
  }

  /* =========================
     OPS HEALTH (20)
     ========================= */
  let routes = null;
  try { routes = JSON.parse(localStorage.getItem("scheduleItems")); } catch {}

  if (routes && routes.length > 0) {
    const active = routes.filter(r => r.status === "ACTIVE").length;
    if (active > 0) {
      score.total += 20;
    } else {
      score.details.push("🛫 No active routes");
    }
  } else {
    score.details.push("🛫 Routes missing");
  }

  /* =========================
     HR ⇄ FINANCE CONSISTENCY (20)
     ========================= */
  const payrollHR = Number(localStorage.getItem("ACS_HR_PAYROLL") || 0);
  const salaryCost = Number(fin?.cost?.salaries || 0);

  if (payrollHR === salaryCost && payrollHR > 0) {
    score.total += 20;
  } else {
    score.details.push("⚖️ HR ⇄ Finance mismatch");
  }

  /* =========================
     STATUS LABEL
     ========================= */
  if (score.total >= 80) score.status = "GREEN";
  else if (score.total >= 50) score.status = "YELLOW";
  else score.status = "RED";

  /* =========================
     EXPORT (READ ONLY)
     ========================= */
  window.ACS_HEALTH_SCORE = score;

  console.group("🩺 ACS HEALTH SCORE");
  console.log(score);
  console.groupEnd();

})();
   
})(); // 🔒 CIERRE FINAL ÚNICO Y CORRECTO

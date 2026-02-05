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

  /* ============================================================
   🩺 PHASE 3.2 — HEALTH SCORE VISUAL PANEL (READ ONLY)
   ============================================================ */

function renderHealthPanel() {

  const out = document.getElementById("outHealth");
  if (!out) return;

  const H = window.ACS_HEALTH_SCORE;
  if (!H) {
    out.textContent = "❌ HEALTH SCORE NOT AVAILABLE";
    return;
  }

  let lines = [];

  lines.push(`SCORE  : ${H.total} / ${H.max}`);
  lines.push(`STATUS : ${H.status}`);
  lines.push("");

  if (Array.isArray(H.details) && H.details.length > 0) {
    lines.push("ISSUES:");
    H.details.forEach(d => lines.push(`- ${d}`));
  } else {
    lines.push("ISSUES:");
    lines.push("✔ No active issues");
  }

  out.textContent = lines.join("\n");

  // Visual state (no CSS dependency)
  out.style.borderLeft =
    H.status === "GREEN"  ? "4px solid #2ecc71" :
    H.status === "YELLOW" ? "4px solid #f1c40f" :
                            "4px solid #e74c3c";
}

/* ▶ Auto-render */
setTimeout(renderHealthPanel, 500);

/* 🔄 Re-render on snapshot refresh */
(function bindHealthRefresh(){

  const btn = document.getElementById("btnRefresh");
  if (!btn) return;

  btn.addEventListener("click", () => {
    setTimeout(renderHealthPanel, 300);
  });

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
   🩺 A3.2 — ACS HEALTH SCORE ENGINE (GLOBAL)
   ------------------------------------------------------------
   Purpose:
   - Calcular estado de salud global del sistema ACS
   - Exponer resultado en window.ACS_HEALTH_SCORE
   - NO renderiza UI (solo data)
   ------------------------------------------------------------
   Version: v1.0 | Date: 05 FEB 2026
   ============================================================ */

(function ACS_HealthScore_Global(){

  let score = 100;
  const maxScore = 100;
  const details = [];

  /* -------------------------------
     DEV GATE
  -------------------------------- */
  const isDev = localStorage.getItem("ACS_DEV") === "true";
  if (!isDev) {
    window.ACS_HEALTH_SCORE = null;
    return;
  }

  /* -------------------------------
     TIME ENGINE CHECK
  -------------------------------- */
  if (!window.ACS_TIME_ENGINE || !window.ACS_TIME_ENGINE.running) {
    score -= 20;
    details.push("⏱ Time Engine inactive");
  } else {
    details.push("⏱ Time Engine OK");
  }

  /* -------------------------------
     FINANCE CHECK
  -------------------------------- */
  try {
    const finance = JSON.parse(localStorage.getItem("ACS_Finance"));
    if (!finance || typeof finance.cash !== "number") {
      score -= 20;
      details.push("💰 Finance data invalid");
    } else {
      details.push("💰 Finance OK");
    }
  } catch (e) {
    score -= 25;
    details.push("💰 Finance parse error");
  }

  /* -------------------------------
     HR CHECK
  -------------------------------- */
  try {
    const hr = JSON.parse(localStorage.getItem("ACS_HR_STATE"));
    if (!hr || !Array.isArray(hr.departments)) {
      score -= 15;
      details.push("🧑‍✈️ HR data missing");
    } else {
      details.push("🧑‍✈️ HR OK");
    }
  } catch (e) {
    score -= 20;
    details.push("🧑‍✈️ HR parse error");
  }

  /* -------------------------------
     OPS CHECK
  -------------------------------- */
  try {
    const routes = JSON.parse(localStorage.getItem("scheduleItems"));
    if (!routes || routes.length === 0) {
      score -= 10;
      details.push("🧭 No active routes");
    } else {
      details.push("🧭 Ops OK");
    }
  } catch (e) {
    score -= 10;
    details.push("🧭 Ops parse error");
  }

  /* -------------------------------
     NORMALIZE SCORE
  -------------------------------- */
  if (score < 0) score = 0;
  if (score > maxScore) score = maxScore;

  let status = "GREEN";
  if (score < 70) status = "YELLOW";
  if (score < 40) status = "RED";

  /* -------------------------------
     PUBLISH GLOBAL STATE
  -------------------------------- */
  window.ACS_HEALTH_SCORE = {
    total: score,
    max: maxScore,
    status,
    details,
    timestamp: new Date().toISOString()
  };

})();
   
})(); // 🔒 CIERRE FINAL ÚNICO Y CORRECTO

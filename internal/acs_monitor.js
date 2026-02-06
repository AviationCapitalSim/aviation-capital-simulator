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
   🟦 BLOQUE 2 — MONITOR REFRESH BUS + MY AIRCRAFT COLLECTOR
   ------------------------------------------------------------
   Purpose:
   - Un solo “bus” de refresh para todos los módulos del monitor
   - Integración limpia de MyAircraft (READ-ONLY)
   - Misma ejecución en:
     1) Botón REFRESH SNAPSHOT
     2) Tick/intervalo del monitor (si aplica)
   ============================================================ */

(function ACS_MONITOR_Bus(){

  // Registro global (por si otros módulos se cuelgan aquí)
  const listeners = [];

  window.ACS_MONITOR_register = function(fn){
    if (typeof fn !== "function") return;
    listeners.push(fn);
  };

  window.ACS_MONITOR_refreshAll = function(){
    listeners.forEach(fn => {
      try { fn(); } catch (e) { console.warn("MONITOR listener error:", e); }
    });
  };

  /* ============================================================
     🛩 MONITOR — MY AIRCRAFT LIVE COLLECTOR (READ-ONLY)
     ============================================================ */
  function ACS_MONITOR_renderMyAircraft() {

    const el = document.getElementById("monitorMyAircraft");
    if (!el) return;

    let fleet;
    try {
      fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    } catch (e) {
      el.textContent = "❌ ERROR: Invalid ACS_MyAircraft JSON";
      return;
    }

    const simISO =
      (typeof window.ACS_getSimTime === "function")
        ? new Date(window.ACS_getSimTime()).toISOString()
        : "NO SIM TIME";

    const simYear =
      (typeof window.ACS_getSimTime === "function")
        ? new Date(window.ACS_getSimTime()).getUTCFullYear()
        : null;

    const snapshot = {
      simTimeISO: simISO,
      simYear: simYear,
      fleetCount: fleet.length,
      aircraft: fleet.map(ac => ({
        id: ac.id || null,
        registration: ac.registration,
        model: ac.model,
        status: ac.status,
        base: ac.base || null,

        // Maintenance state
        maintenanceType: ac.maintenanceType || null,
        maintenanceStartDate: ac.maintenanceStartDate || null,
        maintenanceEndDate: ac.maintenanceEndDate || null,

        // Baselines
        baselineCHours: (typeof ac.baselineCHours === "number") ? ac.baselineCHours : null,
        baselineDHours: (typeof ac.baselineDHours === "number") ? ac.baselineDHours : null,

        // Ops counters
        hours: (typeof ac.hours === "number") ? ac.hours : null,
        cycles: (typeof ac.cycles === "number") ? ac.cycles : null,

        // Condition
        conditionPercent: (typeof ac.conditionPercent === "number")
          ? Number(ac.conditionPercent.toFixed(2))
          : null,

        // Flags
        maintenanceHold: !!ac.maintenanceHold,
        pendingCCheck: !!ac.pendingCCheck,
        pendingDCheck: !!ac.pendingDCheck
      }))
    };

    el.textContent = JSON.stringify(snapshot, null, 2);
  }

  // Registrar en el bus
  window.ACS_MONITOR_register(ACS_MONITOR_renderMyAircraft);

})();
   
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
   🩺 PHASE 3.3 — HEALTH SCORE PANEL (BADGE + BORDER)
   ------------------------------------------------------------
   Purpose:
   - Renderizar Health Score global (window.ACS_HEALTH_SCORE)
   - Aplicar visual state al panel (#healthPanel) + badge (#healthBadge)
   - Mantener compatibilidad con fallback (borderLeft en <pre>)
   ------------------------------------------------------------
   Version: v1.2 | Date: 05 FEB 2026
   ============================================================ */

function renderHealthPanel() {

  const out   = document.getElementById("outHealth");
  const panel = document.getElementById("healthPanel");
  const badge = document.getElementById("healthBadge");

  if (!out) return;

  const H = window.ACS_HEALTH_SCORE;

  // Reset visual state
  if (panel) panel.classList.remove("health-green", "health-yellow", "health-red");
  if (badge) badge.textContent = "—";
  out.style.borderLeft = ""; // fallback reset

  if (!H) {
    out.textContent = "❌ HEALTH SCORE NOT AVAILABLE";
    return;
  }

  // Apply visual state (preferred: panel classes + badge)
  if (panel && badge) {
    if (H.status === "GREEN") {
      panel.classList.add("health-green");
      badge.textContent = "GREEN";
    } else if (H.status === "YELLOW") {
      panel.classList.add("health-yellow");
      badge.textContent = "YELLOW";
    } else {
      panel.classList.add("health-red");
      badge.textContent = "RED";
    }
  } else {
    // Fallback (no CSS dependency) — keep your original behavior
    out.style.borderLeft =
      H.status === "GREEN"  ? "4px solid #2ecc71" :
      H.status === "YELLOW" ? "4px solid #f1c40f" :
                              "4px solid #e74c3c";
  }

  // Render text output
  const lines = [];
  lines.push(`SCORE  : ${H.total} / ${H.max}`);
  lines.push(`STATUS : ${H.status}`);
  lines.push("");

  lines.push("ISSUES:");
  if (Array.isArray(H.details) && H.details.length > 0) {
    H.details.forEach(d => lines.push(`- ${d}`));
  } else {
    lines.push("✔ No active issues");
  }

  out.textContent = lines.join("\n");
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

/* ============================================================
   🛩 MONITOR — MY AIRCRAFT LIVE COLLECTOR (READ-ONLY)
   ------------------------------------------------------------
   Purpose:
   - Auditar estado real de ACS_MyAircraft
   - Ver mantenimiento en vivo vs reloj del juego
   - NO modifica estado
   ------------------------------------------------------------
   Version: v1.0 | Date: 06 FEB 2026
   ============================================================ */

function ACS_MONITOR_renderMyAircraft() {

  const el = document.getElementById("monitorMyAircraft");
  if (!el) return;

  let fleet;
  try {
    fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  } catch (e) {
    el.textContent = "❌ ERROR: Invalid ACS_MyAircraft JSON";
    return;
  }

  const simTime =
    (typeof window.ACS_getSimTime === "function")
      ? new Date(window.ACS_getSimTime())
      : null;

  const snapshot = {
    simTimeISO: simTime ? simTime.toISOString() : "NO SIM TIME",
    simYear: simTime ? simTime.getUTCFullYear() : null,
    fleetCount: fleet.length,
    aircraft: fleet.map(ac => ({
      id: ac.id,
      registration: ac.registration,
      model: ac.model,
      status: ac.status,

      // Maintenance core
      maintenanceType: ac.maintenanceType || null,
      maintenanceStartDate: ac.maintenanceStartDate || null,
      maintenanceEndDate: ac.maintenanceEndDate || null,

      // Baselines
      baselineCHours: ac.baselineCHours ?? null,
      baselineDHours: ac.baselineDHours ?? null,

      // Usage
      hours: ac.hours,
      cycles: ac.cycles,

      // Condition
      conditionPercent: ac.conditionPercent,

      // Flags
      maintenanceHold: !!ac.maintenanceHold,
      pendingCCheck: !!ac.pendingCCheck,
      pendingDCheck: !!ac.pendingDCheck
    }))
  };

  el.textContent = JSON.stringify(snapshot, null, 2);
}

/* ============================================================
   🔁 MONITOR REFRESH HOOK — MY AIRCRAFT
   ------------------------------------------------------------
   - Se integra al refresco global del monitor si existe
   - Fallback seguro cada 5s (DEV)
   ============================================================ */

if (typeof ACS_MONITOR_register === "function") {
  ACS_MONITOR_register(ACS_MONITOR_renderMyAircraft);
} else {
  setInterval(ACS_MONITOR_renderMyAircraft, 5000);
}
   
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

  const isDev = localStorage.getItem("ACS_DEV") === "true";
  if (!isDev) {
    window.ACS_HEALTH_SCORE = null;
    return;
  }

  /* -------------------------------
     TIME ENGINE CHECK
  -------------------------------- */
  const timeEngine = window.ACS_TIME_ENGINE;
  const isPaused   = localStorage.getItem("ACS_TIME_PAUSED") === "true";

  if (!timeEngine) {
    score -= 25;
    details.push("⏱ Time Engine missing");
  }
  else if (timeEngine.running === true) {
    details.push("⏱ Time Engine running");
  }
  else if (timeEngine.running === false && isPaused) {
    details.push("⏸ Time Engine paused (intentional)");
  }
  else {
    score -= 20;
    details.push("⏱ Time Engine inactive (unexpected)");
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
  } catch {
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
  } catch {
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
  } catch {
    score -= 10;
    details.push("🧭 Ops parse error");
  }

  if (score < 0) score = 0;
  if (score > maxScore) score = maxScore;

  let status = "GREEN";
  if (score < 70) status = "YELLOW";
  if (score < 40) status = "RED";

  window.ACS_HEALTH_SCORE = {
    total: score,
    max: maxScore,
    status,
    details,
    timestamp: new Date().toISOString()
  };

})();

/* ============================================================
   🩺 PHASE 3.3 — HEALTH PANEL RENDER
   ============================================================ */

setTimeout(renderHealthPanel, 500);

(function bindHealthRefresh(){
  const btn = document.getElementById("btnRefresh");
  if (!btn) return;
  btn.addEventListener("click", () => {
    setTimeout(renderHealthPanel, 300);
  });
})();

})(); // 🔒 CIERRE ÚNICO DEL IIFE PRINCIPAL

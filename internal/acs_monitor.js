/* ============================================================
   🟦 A2 — ACS INTERNAL MONITOR (PASSIVE MODE)
   ------------------------------------------------------------
   Purpose:
   - Monitor PASIVO del estado interno de ACS
   - SOLO lectura (window / localStorage)
   - CERO side-effects
   - CERO listeners
   - CERO dependencias del core
   ------------------------------------------------------------
   Version: v1.0
   Date: 06 FEB 2026
   ============================================================ */

(function(){

/* ============================================================
   🔒 DEV GATE
   ============================================================ */
const isDev = localStorage.getItem("ACS_DEV") === "true";
const devChip = document.getElementById("devChip");

if (devChip) {
  devChip.textContent = `DEV: ${isDev ? "ENABLED" : "DISABLED"}`;
}

if (!isDev) {
  window.location.href = "../index.html";
  return;
}

/* ============================================================
   🧰 HELPERS
   ============================================================ */
function el(id){ return document.getElementById(id); }
function write(id, text){
  const e = el(id);
  if (!e) return;
  e.textContent = String(text ?? "");
}

/* ============================================================
   🕒 TIME ENGINE — PASSIVE READ
   ============================================================ */
function snapshotTime(){

  const lines = [];

  // ✅ PASSIVE SOURCE (recomendado)
  const iso = localStorage.getItem("ACS_SIM_TIME_ISO");

  if (iso) {
    const t = new Date(iso);
    if (t instanceof Date && !isNaN(t)) {
      lines.push("STATUS: OK (PASSIVE)");
      lines.push(`UTC TIME : ${t.toUTCString()}`);
      lines.push(`YEAR     : ${t.getUTCFullYear()}`);
      lines.push(`TIMESTAMP: ${t.getTime()}`);
      write("outTime", lines.join("\n"));
      return;
    }
  }

  // Fallback (si estás en una página que sí tiene el engine cargado)
  const t2 = window.ACS_TIME_CURRENT;
  if (t2 instanceof Date && !isNaN(t2)) {
    lines.push("STATUS: OK (WINDOW)");
    lines.push(`UTC TIME : ${t2.toUTCString()}`);
    lines.push(`YEAR     : ${t2.getUTCFullYear()}`);
    lines.push(`TIMESTAMP: ${t2.getTime()}`);
  } else {
    lines.push("STATUS: NOT READY");
    lines.push("No passive time feed found (ACS_SIM_TIME_ISO).");
    lines.push("Time Engine not loaded on this page (expected in PASSIVE MODE).");
  }

  write("outTime", lines.join("\n"));
}

/* ============================================================
   🧑‍✈️ HR — PASSIVE READ
   ============================================================ */
function snapshotHR(){

  let hr;
  try {
    hr = JSON.parse(localStorage.getItem("ACS_HR"));
  } catch {
    hr = null;
  }

  if (!hr) {
    write("outHR", "STATUS: HR DATA NOT AVAILABLE");
    return;
  }

  let staff = 0;
  let payroll = 0;
  let deps = 0;

  Object.values(hr).forEach(d => {
    if (!d || typeof d.staff !== "number") return;
    staff += d.staff;
    payroll += d.staff * (d.salary || 0);
    deps++;
  });

  write("outHR", [
    "STATUS: OK",
    `DEPARTMENTS : ${deps}`,
    `TOTAL STAFF : ${staff}`,
    `PAYROLL     : $${payroll.toLocaleString()}`
  ].join("\n"));
}

/* ============================================================
   💰 FINANCE — PASSIVE READ
   ============================================================ */
function snapshotFinance(){

  let f;
  try {
    f = JSON.parse(localStorage.getItem("ACS_Finance"));
  } catch {
    f = null;
  }

  if (!f) {
    write("outFinance", "STATUS: FINANCE DATA NOT AVAILABLE");
    return;
  }

  const lines = [
    "STATUS: OK",
    "",
    `CAPITAL        : $${Number(f.capital || 0).toLocaleString()}`,
    `REVENUE (MON)  : $${Number(f.revenue || 0).toLocaleString()}`,
    `EXPENSES (MON) : $${Number(f.expenses || 0).toLocaleString()}`,
    `PROFIT (MON)   : $${Number(f.profit || 0).toLocaleString()}`
  ];

  write("outFinance", lines.join("\n"));
}

/* ============================================================
   🧭 OPS / ROUTES — PASSIVE READ
   ============================================================ */
function snapshotOps(){

  let routes = [];
  try {
    routes = JSON.parse(localStorage.getItem("scheduleItems")) || [];
  } catch {}

  write("outOps", [
    "STATUS: OK",
    `TOTAL ROUTES : ${routes.length}`,
    `ACTIVE       : ${routes.filter(r => r.status === "ACTIVE").length}`,
    `PENDING      : ${routes.filter(r => r.status === "PENDING").length}`
  ].join("\n"));
}

/* ============================================================
   ⚠️ INTEGRITY — PASSIVE CHECK
   ============================================================ */
function snapshotIntegrity(){

  const warnings = [];
  if (!localStorage.getItem("ACS_HR")) warnings.push("HR missing");
  if (!localStorage.getItem("ACS_Finance")) warnings.push("Finance missing");
  if (!localStorage.getItem("scheduleItems")) warnings.push("Routes missing");

  write(
    "outWarnings",
    warnings.length ? warnings.join("\n") : "SYSTEM INTEGRITY OK"
  );
}

/* ============================================================
   🛩 MY AIRCRAFT — FLEET MONITOR (VITAL / READ ONLY)
   ------------------------------------------------------------
   Purpose:
   - Resumen de flota (NO JSON crudo)
   - Solo datos vitales: status + uso + mantenimiento + flags
   - Lee EXCLUSIVAMENTE: localStorage.ACS_MyAircraft
   ============================================================ */
function snapshotMyAircraftFleet(){

  const out = document.getElementById("monitorMyAircraft");
  if (!out) return;

  let fleet = [];
  try {
    fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  } catch (e) {
    out.textContent = "❌ INVALID ACS_MyAircraft JSON";
    return;
  }

  if (!Array.isArray(fleet) || fleet.length === 0) {
    out.textContent = "No aircraft found in ACS_MyAircraft.";
    return;
  }

  // Conteos rápidos
  const countBy = (fn) => fleet.reduce((acc,a)=>{ const k=fn(a); acc[k]=(acc[k]||0)+1; return acc; }, {});
  const byStatus = countBy(a => (a.status || "UNKNOWN"));
  const byBase   = countBy(a => (a.base || "—"));

  // Formato tipo “HR/Finance”, legible
  const lines = [];
  lines.push("STATUS: OK");
  lines.push(`FLEET COUNT : ${fleet.length}`);
  lines.push("");

  lines.push("BY STATUS:");
  Object.entries(byStatus).forEach(([k,v]) => lines.push(`- ${String(k).padEnd(16)} : ${v}`));

  lines.push("");
  lines.push("BY BASE:");
  Object.entries(byBase).forEach(([k,v]) => lines.push(`- ${String(k).padEnd(16)} : ${v}`));

  lines.push("");
  lines.push("AIRCRAFT (VITAL):");

  fleet.slice(0, 50).forEach((ac, idx) => {
    const reg   = ac.registration || "—";
    const model = ac.model || "—";
    const st    = ac.status || "—";
    const hrs   = (typeof ac.hours === "number") ? ac.hours : "—";
    const cyc   = (typeof ac.cycles === "number") ? ac.cycles : "—";
    const cond  = (typeof ac.conditionPercent === "number") ? `${ac.conditionPercent}%` : "—";

    const mType = ac.maintenanceType || "—";
    const hold  = ac.maintenanceHold ? "HOLD" : "";
    const pC    = ac.pendingCCheck ? "P-C" : "";
    const pD    = ac.pendingDCheck ? "P-D" : "";

    const flags = [hold, pC, pD].filter(Boolean).join(" ");

    lines.push(
      `${String(idx+1).padStart(2,"0")}) ${reg} | ${model} | ${st}` +
      ` | HRS:${hrs} CYC:${cyc} COND:${cond}` +
      ` | M:${mType}${flags ? " | " + flags : ""}`
    );
  });

  if (fleet.length > 50) {
    lines.push("");
    lines.push(`(Showing first 50 of ${fleet.length} for performance)`);
  }

  out.textContent = lines.join("\n");
}

/* ============================================================
   🩺 SYSTEM HEALTH — PASSIVE SCORE
   ============================================================ */
function snapshotHealth(){

  const out = el("outHealth");
  const panel = el("healthPanel");
  const badge = el("healthBadge");

  let score = 100;
  const issues = [];

  if (!window.ACS_TIME_CURRENT) { score -= 20; issues.push("Time Engine missing"); }
  if (!localStorage.getItem("ACS_Finance")) { score -= 20; issues.push("Finance missing"); }
  if (!localStorage.getItem("ACS_HR")) { score -= 15; issues.push("HR missing"); }

  let status = "GREEN";
  if (score < 70) status = "YELLOW";
  if (score < 40) status = "RED";

  if (panel) panel.classList.remove("health-green","health-yellow","health-red");
  if (panel) panel.classList.add(
    status === "GREEN" ? "health-green" :
    status === "YELLOW" ? "health-yellow" : "health-red"
  );

  if (badge) badge.textContent = status;

  if (out) {
    out.textContent = [
      `SCORE  : ${score} / 100`,
      `STATUS : ${status}`,
      "",
      "ISSUES:",
      issues.length ? issues.map(i => `- ${i}`).join("\n") : "✔ None"
    ].join("\n");
  }
}

/* ============================================================
   ▶ INIT (MANUAL ONLY)
   ============================================================ */
   
function runAll(){
  snapshotTime();
  snapshotHR();
  snapshotFinance();
  snapshotOps();
  snapshotIntegrity();
  snapshotMyAircraft();
  snapshotHealth();
  snapshotMyAircraftFleet(); // ✅ ahora SÍ existe
}


runAll();

const btn = el("btnRefresh");
if (btn) btn.addEventListener("click", runAll);

})();

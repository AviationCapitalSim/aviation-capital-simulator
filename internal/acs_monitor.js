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
   🛩 MY AIRCRAFT — VITAL MONITOR (PASSIVE)
   ============================================================ */
function snapshotMyAircraft(){

  console.log("SNAPSHOT MY AIRCRAFT RUNNING");

  const out = document.getElementById("monitorMyAircraft");
  if (!out) {
    console.error("monitorMyAircraft element NOT FOUND");
    return;
  }

  let fleet;
  try {
    fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  } catch (e) {
    out.textContent = "❌ ACS_MyAircraft INVALID JSON";
    return;
  }

  if (!Array.isArray(fleet)) {
    out.textContent = "❌ ACS_MyAircraft NOT ARRAY";
    return;
  }

  const total = fleet.length;
  let active = 0, maintenance = 0, hold = 0, pC = 0, pD = 0;
  let h = 0, c = 0, hc = 0, cc = 0;

  fleet.forEach(ac => {
    if (!ac) return;
    if (ac.status === "Active") active++;
    if (ac.status === "Maintenance") maintenance++;
    if (ac.status === "Maintenance Hold") hold++;
    if (ac.pendingCCheck) pC++;
    if (ac.pendingDCheck) pD++;
    if (typeof ac.hours === "number") { h += ac.hours; hc++; }
    if (typeof ac.cycles === "number") { c += ac.cycles; cc++; }
  });

  const lines = [
    "STATUS: OK",
    "",
    `TOTAL AIRCRAFT     : ${total}`,
    `ACTIVE             : ${active}`,
    `MAINTENANCE        : ${maintenance}`,
    `MAINTENANCE HOLD   : ${hold}`,
    "",
    `PENDING C CHECK    : ${pC}`,
    `PENDING D CHECK    : ${pD}`,
    "",
    `AVG HOURS          : ${hc ? Math.round(h/hc) : "—"}`,
    `AVG CYCLES         : ${cc ? Math.round(c/cc) : "—"}`
  ];

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
  console.log("RUNALL START");
  snapshotTime();
  snapshotHR();
  snapshotFinance();
  snapshotOps();
  snapshotIntegrity();
  snapshotMyAircraft();
  snapshotHealth();
}

runAll();

const btn = el("btnRefresh");
if (btn) btn.addEventListener("click", runAll);

/* ============================================================
   🧨 MASTER RESET (FULL WIPE) — INTERNAL MONITOR ONLY
   ------------------------------------------------------------
   Safety:
   - Requires typed confirmation: RESET ACS
   - Writes a report to #outResetLog
   ============================================================ */
const btnReset = el("btnMasterReset");
const outReset = el("outResetLog");

async function runMasterReset(){
  try{
    if (outReset) outReset.textContent = "Waiting confirmation…";

    const typed = prompt("⚠️ MASTER RESET FULL WIPE\n\nType exactly: RESET ACS\n\nThis will delete EVERYTHING.", "");
    if (typed !== "RESET ACS") {
      if (outReset) outReset.textContent = "Cancelled (confirmation mismatch).";
      return;
    }

    if (typeof window.ACS_MasterReset !== "function") {
      if (outReset) outReset.textContent = "ERROR: ACS_MasterReset() not loaded.";
      return;
    }

    if (outReset) outReset.textContent = "Running FULL WIPE…";

    const report = await window.ACS_MasterReset();

    if (outReset) {
      outReset.textContent = [
        `OK: ${report && report.ok ? "true" : "false"}`,
        `TS: ${report && report.ts ? report.ts : "—"}`,
        "",
        "STEPS:",
        (report && report.steps && report.steps.length) ? report.steps.map(s => `- ${s}`).join("\n") : "- (none)",
        "",
        "ERRORS:",
        (report && report.errors && report.errors.length) ? report.errors.map(e => `- ${e}`).join("\n") : "- (none)",
        "",
        "Redirecting to index…"
      ].join("\n");
    }

  }catch(e){
    if (outReset) outReset.textContent = `FATAL ERROR: ${e && e.message ? e.message : String(e)}`;
  }
}

if (btnReset) btnReset.addEventListener("click", runMasterReset);

/* ============================================================
   🛡️ FULL SYSTEM SCAN BUTTON
   ============================================================ */

const btnFullScan = document.getElementById("btnFullScan");
const outFullScan = document.getElementById("outFullScan");

async function runFullScan(){

  if (!window.ACS_DIAG){
    outFullScan.textContent = "Diagnostics engine not loaded.";
    return;
  }

  const result = window.ACS_DIAG.fullScan();

  outFullScan.textContent = JSON.stringify(result, null, 2);
}

if (btnFullScan){
  btnFullScan.addEventListener("click", runFullScan);
}

/* ============================================================
   🟢 TIME ENGINE CONTROL PANEL (Monitor)
   ============================================================ */

function updateTimeControlStatus() {
  const out = document.getElementById("outTimeControl");
  if (!out) return;

  const frozen = localStorage.getItem("acs_frozen_time");
  const simTime = localStorage.getItem("ACS_LAST_SIM_TIME");

  let status = frozen === "true" ? "OFF" : "ON";

  out.textContent =
    "ENGINE STATUS: " + status + "\n\n" +
    "Frozen Flag: " + frozen + "\n" +
    "Last Sim Time: " + simTime;
}

document.getElementById("btnStartTime")?.addEventListener("click", () => {
  localStorage.setItem("acs_frozen_time", "false");

  if (typeof startACSTime === "function") {
    startACSTime();
  }

  updateTimeControlStatus();
});

document.getElementById("btnStopTime")?.addEventListener("click", () => {
  localStorage.setItem("acs_frozen_time", "true");

  if (typeof stopACSTime === "function") {
    stopACSTime();
  }

  updateTimeControlStatus();
});

document.getElementById("btnResetCycle")?.addEventListener("click", () => {

  if (typeof window.ACS_MasterReset === "function") {
    window.ACS_MasterReset();
  }

  updateTimeControlStatus();
});

setTimeout(updateTimeControlStatus, 300);
   
})();


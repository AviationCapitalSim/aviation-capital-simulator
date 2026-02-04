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
     🕒 PHASE 2.1 — TIME ENGINE SNAPSHOT (READ ONLY)
     ============================================================ */
  function renderTimeSnapshot() {

    let lines = [];

    const t = window.ACS_TIME_CURRENT;

    if (t instanceof Date && !isNaN(t)) {

      lines.push("STATUS: OK");
      lines.push(`UTC TIME : ${t.toUTCString()}`);
      lines.push(`YEAR     : ${t.getUTCFullYear()}`);
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

    write(outTime, lines.join("\n"));
  }

  /* =========================
     INIT
     ========================= */
   
  snapshotPlaceholder();
  renderHRSnapshot();
  renderFinanceSnapshot();
   
 const btn = document.getElementById("btnRefresh");
 if (btn) btn.addEventListener("click", () => {
  renderTimeSnapshot();
  renderHRSnapshot();
  renderFinanceSnapshot();
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
   💰 PHASE 3 — FINANCE LEDGER SNAPSHOT (READ ONLY)
   ============================================================ */
function renderFinanceSnapshot() {

  let lines = [];

  const raw = localStorage.getItem("ACS_FINANCE");

  if (!raw) {
    lines.push("STATUS: ❌ ACS_FINANCE not found");
    write(outFinance, lines.join("\n"));
    return;
  }

  let f;
  try {
    f = JSON.parse(raw);
  } catch (e) {
    lines.push("STATUS: ❌ ACS_FINANCE corrupted JSON");
    write(outFinance, lines.join("\n"));
    return;
  }

  lines.push("STATUS: OK");
  lines.push(`CAPITAL  : $${(f.capital || 0).toLocaleString()}`);
  lines.push(`REVENUE  : $${(f.revenue || 0).toLocaleString()}`);
  lines.push(`EXPENSES : $${(f.expenses || 0).toLocaleString()}`);
  lines.push(`PROFIT   : $${(f.profit || 0).toLocaleString()}`);

  lines.push("");
  lines.push("CHECKS:");

  const calcProfit = (f.revenue || 0) - (f.expenses || 0);

  lines.push(
    calcProfit === f.profit
      ? "✔ Profit consistent"
      : `❌ Profit mismatch (calc: ${calcProfit})`
  );

  write(outFinance, lines.join("\n"));
}
   
})();


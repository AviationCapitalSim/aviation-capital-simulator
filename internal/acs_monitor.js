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

  const btn = document.getElementById("btnRefresh");
  if (btn) btn.addEventListener("click", renderTimeSnapshot);

  renderTimeSnapshot();

})();

/* ============================================================
   🔒 ACS INTERNAL MONITOR JS — v0.1
   ------------------------------------------------------------
   Phase 1:
   - DEV gate (localStorage.ACS_DEV === "true")
   - Render placeholders (no diagnostics yet)
   ============================================================ */

(function(){

  /* =========================
     DEV GATE (PRIVATE ONLY)
     ========================= */
  const isDev = (localStorage.getItem("ACS_DEV") === "true");
  const devChip = document.getElementById("devChip");

  if (devChip) devChip.textContent = `DEV: ${isDev ? "ENABLED" : "DISABLED"}`;

  if (!isDev) {
    // acceso denegado → vuelve al home
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

  snapshotPlaceholder();

  const btn = document.getElementById("btnRefresh");
  if (btn) btn.addEventListener("click", snapshotPlaceholder);

})();

/* ============================================================
   🛡️ ACS DIAGNOSTICS ENGINE — CORE ECU
   ------------------------------------------------------------
   Version: 1.0
   Mode: READ-ONLY
   Purpose:
   - Quick health check (lightweight)
   - Full scan (later phase)
   - No side-effects
   - No DOM manipulation
   - Compatible iOS / Android / Safari
   ============================================================ */

(function(){

  if (window.ACS_DIAG) {
    console.warn("ACS_DIAG already initialized.");
    return;
  }

  const DIAG = {};

  /* ============================================================
     🟢 INTERNAL SAFE HELPERS
     ============================================================ */

  function safeParse(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){
      return "__CORRUPTED__";
    }
  }

  function isNumber(n){
    return typeof n === "number" && !isNaN(n) && isFinite(n);
  }

  function uniqueArray(arr){
    return new Set(arr).size === arr.length;
  }

  /* ============================================================
     🟢 QUICK CHECK (LIGHTWEIGHT — AUTO SAFE)
     ============================================================ */

  DIAG.quickCheck = function(){

    const result = {
      status: "GREEN",
      issues: [],
      timestamp: Date.now()
    };

    function warn(msg){
      if (result.status === "GREEN") result.status = "WARNING";
      result.issues.push({ level: "WARNING", message: msg });
    }

    function critical(msg){
      result.status = "CRITICAL";
      result.issues.push({ level: "CRITICAL", message: msg });
    }

    /* ---------------------------
       1️⃣ Time Engine Check
       --------------------------- */
    if (!window.ACS_TIME){
      critical("ACS_TIME not detected.");
    } else {
      if (!window.ACS_TIME.currentTime){
        critical("ACS_TIME.currentTime missing.");
      }
    }

    /* ---------------------------
       2️⃣ scheduleItems Check
       --------------------------- */
    const schedule = safeParse("scheduleItems");

    if (schedule === "__CORRUPTED__"){
      critical("scheduleItems corrupted JSON.");
    } else if (!schedule){
      warn("scheduleItems not found.");
    } else if (!Array.isArray(schedule)){
      critical("scheduleItems is not an array.");
    }

    /* ---------------------------
       3️⃣ Fleet Detection (dynamic)
       --------------------------- */
    const possibleFleetKeys = Object.keys(localStorage).filter(k =>
      k.toLowerCase().includes("fleet")
    );

    if (possibleFleetKeys.length === 0){
      warn("No fleet key detected in localStorage.");
    }

    /* ---------------------------
       4️⃣ Finance Basic Integrity
       --------------------------- */
    const financeKeys = Object.keys(localStorage).filter(k =>
      k.toLowerCase().includes("finance") ||
      k.toLowerCase().includes("cash")
    );

    financeKeys.forEach(key=>{
      const obj = safeParse(key);
      if (obj === "__CORRUPTED__"){
        critical(`${key} corrupted JSON.`);
      }
    });

    /* ---------------------------
       5️⃣ localStorage Health
       --------------------------- */
    try{
      const sizeEstimate = JSON.stringify(localStorage).length;
      if (sizeEstimate > 4_500_000){
        warn("localStorage approaching 5MB limit.");
      }
    }catch(e){
      warn("Unable to estimate localStorage size.");
    }

    return result;
  };

  /* ============================================================
     🔵 FULL SCAN (PHASE 2 — STUB FOR NOW)
     ============================================================ */

  DIAG.fullScan = function(){
    return {
      status: "NOT_IMPLEMENTED",
      message: "Full scan coming in Phase 2"
    };
  };

  /* ============================================================
     🟢 PUBLIC EXPORT
     ============================================================ */

  window.ACS_DIAG = DIAG;

  console.log("🛡️ ACS Diagnostics Engine Loaded");

})();

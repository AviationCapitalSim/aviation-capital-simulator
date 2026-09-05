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
   🔵 FULL SCAN — STRUCTURAL AUDIT
   ============================================================ */

DIAG.fullScan = function(){

  const report = {
    overall: "GREEN",
    score: 100,
    modules: {},
    issues: [],
    timestamp: Date.now()
  };

  function warn(module, msg){
    if (report.overall === "GREEN") report.overall = "WARNING";
    report.score -= 5;
    report.issues.push({ level: "WARNING", module, message: msg });
  }

  function critical(module, msg){
    report.overall = "CRITICAL";
    report.score -= 15;
    report.issues.push({ level: "CRITICAL", module, message: msg });
  }

  function safeParse(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){
      return "__CORRUPTED__";
    }
  }

  /* ============================================================
   🟢 SCHEDULE MODULE (OPERATIONAL SAFE)
   ============================================================ */

const schedule = safeParse("scheduleItems");

if (schedule === "__CORRUPTED__"){
  critical("SCHEDULE", "scheduleItems JSON corrupted.");
} else if (!Array.isArray(schedule)){
  critical("SCHEDULE", "scheduleItems is not an array.");
} else {

  let missingAircraftRefs = 0;

  schedule.forEach(flight=>{
    if (!flight.aircraftId){
      warn("SCHEDULE", "Flight without aircraftId.");
    }
  });

  report.modules.schedule = {
    totalFlights: schedule.length
  };
}
  /* ============================================================
     🟢 FLEET MODULE (ACS_MyAircraft)
     ============================================================ */

  const fleet = safeParse("ACS_MyAircraft");

  if (fleet === "__CORRUPTED__"){
    critical("FLEET", "ACS_MyAircraft corrupted JSON.");
  } else if (!Array.isArray(fleet)){
    critical("FLEET", "ACS_MyAircraft is not an array.");
  } else {

    const ids = fleet.map(a=>a.id).filter(Boolean);

    if (ids.length !== new Set(ids).size){
      critical("FLEET", "Duplicate aircraft IDs detected.");
    }

    fleet.forEach(ac=>{
      if (typeof ac.hours === "number" && ac.hours < 0){
        warn("FLEET", `Aircraft ${ac.id} has negative hours.`);
      }
      if (ac.status === "D_CHECK" && ac.active){
        critical("FLEET", `Aircraft ${ac.id} active while in D_CHECK.`);
      }
    });

    report.modules.fleet = {
      totalAircraft: fleet.length
    };

     /* --- Cross-check Fleet ↔ Schedule --- */
    if (Array.isArray(schedule) && schedule.length > 0 && fleet.length === 0){
    critical("FLEET", "Flights exist but fleet is empty (structural inconsistency).");
    }
     
  }

  /* ============================================================
     🟢 FINANCE MODULE
     ============================================================ */

  const financeUpper = safeParse("ACS_FINANCE");
  const financeLower = safeParse("ACS_Finance");

  if (financeUpper && financeLower){
    warn("FINANCE", "Both ACS_FINANCE and ACS_Finance exist (possible duplication).");
  }

  const finance = financeUpper || financeLower;

  if (finance === "__CORRUPTED__"){
    critical("FINANCE", "Finance JSON corrupted.");
  } else if (finance){

    if (typeof finance.cash !== "number"){
      warn("FINANCE", "Finance cash is not numeric.");
    } else if (!isFinite(finance.cash)){
      critical("FINANCE", "Finance cash invalid (NaN/Infinity).");
    }

    report.modules.finance = {
      cash: finance.cash || 0
    };
  }

  /* ============================================================
   🟢 TIME MODULE (FLEXIBLE FORMAT)
   ============================================================ */

const rawTime = localStorage.getItem("ACS_LAST_SIM_TIME");

if (!rawTime){
  warn("TIME", "No ACS_LAST_SIM_TIME detected.");
} else {
  let parsedTime;

  try{
    parsedTime = JSON.parse(rawTime);
  }catch(e){
    parsedTime = rawTime;
  }

  if (!parsedTime){
    warn("TIME", "ACS_LAST_SIM_TIME empty.");
  }
}

report.modules.time = {
  simTimeExists: !!rawTime
};

  /* ============================================================
     🟢 STORAGE HEALTH
     ============================================================ */

  try{
    const sizeEstimate = JSON.stringify(localStorage).length;
    if (sizeEstimate > 4_500_000){
      warn("STORAGE", "localStorage near browser limit.");
    }
    report.modules.storage = {
      keys: Object.keys(localStorage).length,
      approxSizeBytes: sizeEstimate
    };
  }catch(e){
    warn("STORAGE", "Unable to estimate storage size.");
  }

if (report.score < 0) report.score = 0;

if (report.overall === "CRITICAL" && report.score > 40){
  report.score = 40;
}
  return report;
};

  /* ============================================================
     🟢 PUBLIC EXPORT
     ============================================================ */

  window.ACS_DIAG = DIAG;

  console.log("🛡️ ACS Diagnostics Engine Loaded");

})();

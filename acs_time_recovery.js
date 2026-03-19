/* ============================================================
   ⏳ ACS TIME WATCHDOG — V13 (SERVER AUTHORITATIVE MODE)
   Project: Aviation Capital Simulator (ACS)
   Purpose:
   - Detect offline real time
   - Calculate theoretical lost simulated time
   - DOES NOT modify simulation time
   - Server is the ONLY time authority
   ============================================================ */

(function () {

  console.log("⏳ ACS TIME RECOVERY ENGINE — V12 (DIAGNOSTIC)");

  const nowReal = Date.now();

  const rawLastReal = localStorage.getItem("ACS_LAST_REAL_TIME");
  const rawLastSim  = localStorage.getItem("ACS_LAST_SIM_TIME");

  // TRUE FIRST RUN = both missing
  if (!rawLastReal && !rawLastSim) {
    console.log("🟡 FIRST RUN — No previous time data found");
    localStorage.setItem("ACS_LAST_REAL_TIME", nowReal);
    return;
  }

  // Parse safely
  const lastReal = parseInt(rawLastReal || "0");
  const lastSim  = Date.parse(rawLastSim || "0");
   
  if (!lastReal || !lastSim || isNaN(lastSim)) {

  console.warn("🟠 TIME DATA CORRUPTED — Resetting anchors");

  localStorage.setItem("ACS_LAST_REAL_TIME", nowReal);
  localStorage.setItem("ACS_LAST_SIM_TIME", nowReal);

  window.ACS_TIME_RECOVERY = {
  offlineMs,
  offlineSeconds,
  offlineSimMinutes,
  lastReal,
  lastSim,
  mode: "WATCHDOG",
  applied: true
};

  return;
}

  const offlineMs = nowReal - lastReal;

  if (offlineMs < 30000) {
    console.log("🟢 No significant offline time detected");
    return;
  }

  // Convert offline real time to seconds
  const offlineSeconds = offlineMs / 1000;

  // Use SAME SPEED as time_engine (dynamic, no hardcode)
  const simSpeed = window.SIM_SPEED || 1;

  const offlineSimMinutes = offlineSeconds * simSpeed;

  // Format human readable time
  const offlineMinutes = Math.floor(offlineSeconds / 60);
  const offlineHours   = Math.floor(offlineMinutes / 60);
  const offlineDays    = Math.floor(offlineHours / 24);

  console.log("==========================================");
  console.log("⏳ ACS OFFLINE TIME RECOVERY DETECTED");
  console.log("LAST CLOSE REAL:", new Date(lastReal).toLocaleString());
  console.log("LAST CLOSE SIM :", new Date(lastSim).toLocaleString());
  console.log("NOW REAL       :", new Date(nowReal).toLocaleString());
  console.log("OFFLINE REAL   :", 
    offlineDays + " days " + 
    (offlineHours % 24) + " hours " + 
    (offlineMinutes % 60) + " minutes"
  );
  console.log("SIM SPEED      :", simSpeed, " sim minutes / real second");
  console.log("SIM MINUTES LOST:", Math.floor(offlineSimMinutes));
  console.log("==========================================");

  // Store recovery info for next phases
  window.ACS_TIME_RECOVERY = {
    offlineMs,
    offlineSeconds,
    offlineSimMinutes,
    lastReal,
    lastSim
  };

})();

/* ============================================================
   🟧 A3 — APPLY OFFLINE TIME RECOVERY (SAFE MODE)
   - Waits for ACS_TIME
   - Applies recovered sim minutes once
   ============================================================ */

function applyRecoveryWhenReady() {

  if (!window.ACS_TIME || !window.ACS_TIME.currentTime) {
    setTimeout(applyRecoveryWhenReady, 200);
    return;
  }

  if (!window.ACS_TIME_RECOVERY) {
    return;
  }

  const rec = window.ACS_TIME_RECOVERY;

  console.log("🟡 ACS TIME WATCHDOG ACTIVE");
  console.log("MODE            : SERVER AUTHORITATIVE");
  console.log("CURRENT SIM TIME:", new Date(window.ACS_TIME.currentTime).toLocaleString());
  console.log("OFFLINE DETECTED:", Math.floor(rec.offlineSimMinutes), "sim minutes (informational)");
}

}

// Start watcher
applyRecoveryWhenReady();

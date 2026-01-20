/* ============================================================
   ⏳ ACS TIME RECOVERY ENGINE — V12 (DIAGNOSTIC MODE)
   Project: Aviation Capital Simulator (ACS)
   Purpose:
   - Detect offline real time
   - Calculate lost simulated time
   - NO automatic execution yet
   - Multiplatform safe (iOS / Android / PC / Mac)
   ============================================================ */

(function () {

  console.log("⏳ ACS TIME RECOVERY ENGINE — V12 (DIAGNOSTIC)");

  const nowReal = Date.now();

  const lastReal = parseInt(localStorage.getItem("ACS_LAST_REAL_TIME") || "0");
  const lastSim  = parseFloat(localStorage.getItem("ACS_LAST_SIM_TIME") || "0");

  if (!lastReal || !lastSim) {
    console.log("🟡 FIRST RUN — No previous time data found");
    localStorage.setItem("ACS_LAST_REAL_TIME", nowReal);
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

/* ============================================================
   ⏳ ACS TIME RECOVERY ENGINE — V 12 (DIAGNOSTIC MODE)
   Project: Aviation Capital Simulator (ACS)
   Purpose:
   - Detect offline real time
   - Calculate lost simulated time
   - Multiplatform safe (iOS / Android / PC / Mac)
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
    offlineMs: 0,
    offlineSeconds: 0,
    offlineSimMinutes: 0,
    lastReal: nowReal,
    lastSim: nowReal,
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
   - Applies recovered sim minutes to ACS_TIME
   - One time only per session
   ============================================================ */

function applyRecoveryWhenReady() {

  if (!window.ACS_TIME || !window.ACS_TIME.currentTime) {
    setTimeout(applyRecoveryWhenReady, 200);
    return;
  }

  if (!window.ACS_TIME_RECOVERY || window.ACS_TIME_RECOVERY.applied) {
    return;
  }

  const rec = window.ACS_TIME_RECOVERY;

  try {

    const currentSim = new Date(window.ACS_TIME.currentTime).getTime();

    const recoveredMs = rec.offlineSimMinutes * 60 * 1000;

    const newSimTime = new Date(currentSim + recoveredMs);

    console.log("🟦 APPLYING OFFLINE SIM RECOVERY");

    window.ACS_TIME.currentTime = newSimTime;

    localStorage.setItem("ACS_LAST_SIM_TIME", newSimTime.getTime());

    window.ACS_TIME_RECOVERY.applied = true;

  } catch (e) {
    console.error("❌ OFFLINE RECOVERY APPLY FAILED", e);
  }

}

applyRecoveryWhenReady();

  const rec = window.ACS_TIME_RECOVERY;

  try {

    const currentSim = new Date(window.ACS_TIME.currentTime).getTime();

    const recoveredMs = rec.offlineSimMinutes * 60 * 1000;

    const newSimTime = new Date(currentSim + recoveredMs);

    console.log("🟦 APPLYING OFFLINE SIM RECOVERY");
    console.log("OLD SIM TIME :", new Date(currentSim).toLocaleString());
    console.log("RECOVERED +  :", Math.floor(rec.offlineSimMinutes), "sim minutes");
    console.log("NEW SIM TIME :", newSimTime.toLocaleString());

    window.ACS_TIME.currentTime = newSimTime;

    // Save immediately
    localStorage.setItem("ACS_LAST_SIM_TIME", newSimTime.getTime());

    // Mark as applied (avoid double recovery)
    window.ACS_TIME_RECOVERY.applied = true;

  } catch (e) {
    console.error("❌ OFFLINE RECOVERY APPLY FAILED", e);
  }

} else if (window.ACS_TIME_RECOVERY && !window.ACS_TIME) {

  console.warn("⚠️ ACS_TIME not ready yet — offline recovery deferred");

}

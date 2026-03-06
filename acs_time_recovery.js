/* ============================================================
   ⏳ ACS TIME RECOVERY ENGINE — V13 (SAFE WAIT MODE)
   Project: Aviation Capital Simulator (ACS)

   PURPOSE
   - Detect offline real time
   - Calculate lost simulated time
   - Wait safely for ACS_TIME initialization
   - Apply recovery only once
   - Cross-platform safe (Chrome / Safari / iOS / Android)

   ============================================================ */

(function () {

  console.log("⏳ ACS TIME RECOVERY ENGINE — V13 (SAFE WAIT MODE)");

  const nowReal = Date.now();

  const rawLastReal = localStorage.getItem("ACS_LAST_REAL_TIME");
  const rawLastSim  = localStorage.getItem("ACS_LAST_SIM_TIME");

  /* ============================================================
     FIRST RUN
     ============================================================ */

  if (!rawLastReal && !rawLastSim) {

    console.log("🟡 FIRST RUN — No previous time data found");

    localStorage.setItem("ACS_LAST_REAL_TIME", nowReal);
    localStorage.setItem("ACS_LAST_SIM_TIME", nowReal);

    return;
  }

  /* ============================================================
     PARSE STORED VALUES
     ============================================================ */

  const lastReal = parseInt(rawLastReal || "0", 10);
  const lastSim  = parseInt(rawLastSim || "0", 10);

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

  /* ============================================================
     OFFLINE TIME CALCULATION
     ============================================================ */

  const offlineMs = nowReal - lastReal;

  if (offlineMs < 30000) {

    console.log("🟢 No significant offline time detected");

    return;
  }

  const offlineSeconds = offlineMs / 1000;

  const simSpeed = window.SIM_SPEED || 1;

  const offlineSimMinutes = offlineSeconds * simSpeed;

  const offlineMinutes = Math.floor(offlineSeconds / 60);
  const offlineHours   = Math.floor(offlineMinutes / 60);
  const offlineDays    = Math.floor(offlineHours / 24);

  console.log("==========================================");
  console.log("⏳ ACS OFFLINE TIME RECOVERY DETECTED");
  console.log("LAST CLOSE REAL:", new Date(lastReal).toLocaleString());
  console.log("LAST CLOSE SIM :", new Date(lastSim).toLocaleString());
  console.log("NOW REAL       :", new Date(nowReal).toLocaleString());

  console.log(
    "OFFLINE REAL   :",
    offlineDays + " days " +
    (offlineHours % 24) + " hours " +
    (offlineMinutes % 60) + " minutes"
  );

  console.log("SIM SPEED      :", simSpeed, "sim minutes / real second");
  console.log("SIM MINUTES LOST:", Math.floor(offlineSimMinutes));
  console.log("==========================================");

  /* ============================================================
     STORE RECOVERY DATA
     ============================================================ */

  window.ACS_TIME_RECOVERY = {

    offlineMs,
    offlineSeconds,
    offlineSimMinutes,
    lastReal,
    lastSim,

    applied: false

  };

  /* ============================================================
     WAIT FOR TIME ENGINE
     ============================================================ */

  function ACS_applyRecoveryWhenReady() {

    if (!window.ACS_TIME || !window.ACS_TIME.currentTime) {

      console.warn("⏳ Waiting for ACS_TIME initialization...");

      setTimeout(ACS_applyRecoveryWhenReady, 300);

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

      console.log("OLD SIM TIME :", new Date(currentSim).toLocaleString());

      console.log(
        "RECOVERED +  :",
        Math.floor(rec.offlineSimMinutes),
        "sim minutes"
      );

      console.log("NEW SIM TIME :", newSimTime.toLocaleString());

      window.ACS_TIME.currentTime = newSimTime;

      localStorage.setItem("ACS_LAST_SIM_TIME", newSimTime.getTime());

      localStorage.setItem("acs_frozen_time", newSimTime.toISOString());

      window.ACS_TIME_RECOVERY.applied = true;

      if (typeof updateClockDisplay === "function") {

        updateClockDisplay();

      }

      if (typeof notifyTimeListeners === "function") {

        notifyTimeListeners();

      }

      console.log("✅ OFFLINE RECOVERY APPLIED");

    } catch (e) {

      console.error("❌ OFFLINE RECOVERY APPLY FAILED", e);

    }

  }

  /* ============================================================
     START WATCHER
     ============================================================ */

  ACS_applyRecoveryWhenReady();

})();

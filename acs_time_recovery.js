/* ============================================================
   ACS TIME RECOVERY — V14
   SERVER AUTHORITATIVE COMPATIBILITY MODE
   ------------------------------------------------------------
   Project: Aviation Capital Simulator (ACS)

   Authority:
   - PostgreSQL calculates official ACS time
   - Railway exposes the official world state
   - time_engine.js synchronizes the frontend

   This module:
   - Does not calculate simulation time
   - Does not recover offline time
   - Does not use localStorage
   - Does not use Date.now()
   - Does not modify ACS_TIME
   - Preserves window.ACS_TIME_RECOVERY for legacy compatibility
   ============================================================ */

(function () {
  "use strict";

  console.log(
    "ACS TIME RECOVERY — V14 | POSTGRESQL AUTHORITY"
  );

  let listenerRegistered = false;
  let connectionAttempts = 0;

  const MAX_RETRY_DELAY_MS = 5000;

  /* ============================================================
     OFFICIAL WORLD SNAPSHOT
     ============================================================ */

  function getOfficialWorldSnapshot() {
    if (typeof window.ACS_WORLD !== "function") {
      return null;
    }

    const world = window.ACS_WORLD();

    if (!world || typeof world !== "object") {
      return null;
    }

    return world;
  }

  /* ============================================================
     PUBLISH LEGACY-COMPATIBLE RECOVERY STATE
     ------------------------------------------------------------
     Offline values remain zero intentionally.

     PostgreSQL already includes elapsed world time in
     current_sim_time. Applying offline time again would advance
     the simulation twice.
     ============================================================ */

  function publishAuthoritativeState(currentTime) {
    const world = getOfficialWorldSnapshot();

    if (!(currentTime instanceof Date)) {
      console.warn(
        "ACS TIME RECOVERY — Invalid official time object"
      );
      return;
    }

    if (Number.isNaN(currentTime.getTime())) {
      console.warn(
        "ACS TIME RECOVERY — Invalid official timestamp"
      );
      return;
    }

    if (
      !world ||
      world.time_source !== "POSTGRESQL_TIME_AUTHORITY"
    ) {
      console.warn(
        "ACS TIME RECOVERY — PostgreSQL authority not verified"
      );
      return;
    }

    /*
     * Keep this public object because older ACS modules may
     * already read window.ACS_TIME_RECOVERY.
     *
     * No local time is applied.
     */
    window.ACS_TIME_RECOVERY = {
      offlineMs: 0,
      offlineSeconds: 0,
      offlineSimMinutes: 0,

      lastReal: null,
      lastSim: currentTime.getTime(),

      currentSimTime: currentTime.toISOString(),
      worldStatus: String(world.status || "UNKNOWN").toUpperCase(),
      worldUpdatedAt: world.updated_at || null,

      timeSource: world.time_source,
      mode: "SERVER_AUTHORITATIVE",
      authority: "POSTGRESQL_VIA_RAILWAY",

      detected: false,
      applied: false,
      synchronized: true
    };
  }

  /* ============================================================
     CONNECT TO GLOBAL TIME ENGINE
     ------------------------------------------------------------
     This supports either script loading order:

     1. time_engine.js
     2. acs_time_recovery.js

     or:

     1. acs_time_recovery.js
     2. time_engine.js
     ============================================================ */

  function connectToOfficialTimeEngine() {
    if (listenerRegistered) {
      return;
    }

    const timeEngineReady =
      window.ACS_TIME &&
      window.ACS_TIME.currentTime instanceof Date &&
      typeof window.registerTimeListener === "function";

    if (!timeEngineReady) {
      connectionAttempts += 1;

      /*
       * Gradually reduce polling frequency.
       * This delay only waits for time_engine.js.
       * It does not calculate or advance ACS time.
       */
      const retryDelay = Math.min(
        250 + connectionAttempts * 100,
        MAX_RETRY_DELAY_MS
      );

      window.setTimeout(
        connectToOfficialTimeEngine,
        retryDelay
      );

      return;
    }

    listenerRegistered = true;

    window.registerTimeListener(
      publishAuthoritativeState
    );

    /*
     * Publish the state immediately instead of waiting for
     * the next Railway synchronization cycle.
     */
    publishAuthoritativeState(
      window.ACS_TIME.currentTime
    );

    console.log(
      "ACS TIME RECOVERY — Connected to PostgreSQL authority"
    );
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      connectToOfficialTimeEngine,
      { once: true }
    );
  } else {
    connectToOfficialTimeEngine();
  }

  /*
   * Legacy public function.
   * Preserved in case another ACS module calls it directly.
   */
  window.applyRecoveryWhenReady =
    connectToOfficialTimeEngine;

})();

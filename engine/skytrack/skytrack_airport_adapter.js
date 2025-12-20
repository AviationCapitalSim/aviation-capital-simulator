/* ============================================================
   SKYTRACK AIRPORT ADAPTER
   ------------------------------------------------------------
   Purpose:
   - Build a lightweight ICAO -> { lat, lng } index for SkyTrack
   - Read WorldAirportsACS ONCE
   - No runtime dependency on WorldEngine
   ------------------------------------------------------------
   Version: 1.0
   ============================================================ */

(function () {

  // Public namespace
  window.SkyTrackAirportIndex = Object.create(null);

  /**
   * Build the index once.
   * Safe to call multiple times (idempotent).
   */
  function buildSkyTrackAirportIndex() {
    if (!window.WorldAirportsACS) {
      console.warn("[SkyTrackAdapter] WorldAirportsACS not available.");
      return false;
    }

    // Prevent rebuilding if already built
    if (window.SkyTrackAirportIndex.__ready === true) {
      return true;
    }

    let count = 0;

    try {
      Object.values(WorldAirportsACS).forEach(list => {
        if (!Array.isArray(list)) return;

        list.forEach(a => {
          if (!a || !a.icao) return;

          const lat = Number(a.latitude);
          const lng = Number(a.longitude);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          // Store ONLY what SkyTrack needs
          window.SkyTrackAirportIndex[a.icao] = {
            lat,
            lng
          };

          count++;
        });
      });

      window.SkyTrackAirportIndex.__ready = true;
      console.log(`[SkyTrackAdapter] Airport index ready (${count} airports)`);

      return true;
    } catch (err) {
      console.error("[SkyTrackAdapter] Failed to build index:", err);
      return false;
    }
  }

  /**
   * Fast lookup by ICAO (O(1))
   */
  window.getSkyTrackAirportByICAO = function (icao) {
    if (!icao) return null;
    return window.SkyTrackAirportIndex[icao] || null;
  };

  /**
   * Optional helper (debug / stats)
   */
  window.isSkyTrackAirportIndexReady = function () {
    return window.SkyTrackAirportIndex.__ready === true;
  };

  // Auto-build once DOM is ready (WorldAirports scripts already loaded)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildSkyTrackAirportIndex);
  } else {
    buildSkyTrackAirportIndex();
  }

})();

/* ============================================================
   🌍 ACS WORLD TRAFFIC FETCH HELPER
   ------------------------------------------------------------
   ACS OCC / AIRBUS OCC

   Purpose:
   - Fetch PostgreSQL global SkyTrack traffic.
   - Return raw server payload to canonical runtime.
   - No rendering.
   - No snapshot mutation.
   - No EN_ROUTE/GROUND calculation.
   - No localStorage.
   - No world server legacy.
   ============================================================ */

(function () {
  const GLOBAL_SERVER =
    "https://api.aviationcapitalsim.com/v1/skytrack/global";

  async function ACS_fetchWorldFlights() {
    try {
      const res = await fetch(
        GLOBAL_SERVER,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Accept": "application/json"
          }
        }
      );

      const data = await res.json();

      if (!res.ok || data?.ok !== true) {
        throw new Error(
          data?.error ||
          "GLOBAL_SKYTRACK_FETCH_FAILED"
        );
      }

      return {
        ok: true,

        authority:
          data.authority ||
          "POSTGRESQL_GLOBAL_SKYTRACK",

        airline_id:
          data.airline_id || null,

        current_sim_time:
          data.current_sim_time || null,

        now_abs_min:
          Number.isFinite(Number(data.now_abs_min))
            ? Number(data.now_abs_min)
            : null,

        flights:
          Array.isArray(data.flights)
            ? data.flights
            : [],

        count:
          Number.isFinite(Number(data.count))
            ? Number(data.count)
            : Array.isArray(data.flights)
              ? data.flights.length
              : 0
      };

    } catch (err) {
      console.warn(
        "🌍 Global SkyTrack fetch error:",
        err
      );

      return {
        ok: false,
        authority: "POSTGRESQL_GLOBAL_SKYTRACK",
        airline_id: null,
        current_sim_time: null,
        now_abs_min: null,
        flights: [],
        count: 0,
        error: err?.message || "GLOBAL_SKYTRACK_FETCH_FAILED"
      };
    }
  }

  window.ACS_fetchWorldFlights =
    ACS_fetchWorldFlights;
})();

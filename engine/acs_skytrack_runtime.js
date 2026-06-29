/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME — SNAPSHOT CANONICAL ADAPTER
   ------------------------------------------------------------
   ACS OCC / AIRBUS OCC

   PASO 1:
   - Coordinación entre navegadores
   - Velocidad/movimiento de aviones
   - Preserva baseICAO para zoom por base en skytrack.html

   Authority:
   - PostgreSQL
   - /v1/skytrack/snapshot
   - Backend-resolved state/progress/airport/colors

   Frontend:
   - Fetch snapshot
   - Publish ACS_SKYTRACK_SNAPSHOT
   - NO /context
   - NO /global
   - NO computePosition
   - NO resolveState
   - NO ACS_SPAWNED_FLIGHTS
   ============================================================ */

(function () {
  const SNAPSHOT_URL =
    "https://api.aviationcapitalsim.com/v1/skytrack/snapshot";

  const REFRESH_MS = 1000;

  window.ACS_SkyTrack = {
    initialized: false,
    authority: "POSTGRESQL_SKYTRACK_SNAPSHOT_CANONICAL",

    nowAbsMin: null,
    currentSimTime: null,

    airlineId: null,
    baseICAO: null,

    lastSnapshot: [],
    lastFetchAt: null,
    refreshTimer: null,
    error: null
  };

  async function ACS_SkyTrack_fetchSnapshot() {
    const res = await fetch(SNAPSHOT_URL, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    const data = await res.json();

    if (!res.ok || data?.ok !== true) {
      throw new Error(data?.error || "SKYTRACK_SNAPSHOT_FAILED");
    }

    if (data.authority !== "POSTGRESQL_SKYTRACK_SNAPSHOT_CANONICAL") {
      throw new Error("SKYTRACK_SNAPSHOT_AUTHORITY_INVALID");
    }

    return data;
  }

  function ACS_SkyTrack_resolveBaseICAO(flights) {
    if (!Array.isArray(flights)) return null;

    const own = flights.filter(f => String(f.scope || "") === "OWN");

    return (
      own.find(f => f.position?.airport)?.position?.airport ||
      own.find(f => f.airport)?.airport ||
      own.find(f => f.originICAO)?.originICAO ||
      own.find(f => f.destinationICAO)?.destinationICAO ||
      null
    );
  }

  function ACS_SkyTrack_publishSnapshot(data) {
    const flights = Array.isArray(data.flights)
      ? data.flights
      : [];

    ACS_SkyTrack.nowAbsMin =
      Number.isFinite(Number(data.now_abs_min))
        ? Number(data.now_abs_min)
        : null;

    ACS_SkyTrack.currentSimTime =
      data.current_sim_time || null;

    ACS_SkyTrack.airlineId =
      data.airline_id != null
        ? String(data.airline_id)
        : null;

    ACS_SkyTrack.baseICAO =
      data.base_icao ||
      ACS_SkyTrack.baseICAO ||
      ACS_SkyTrack_resolveBaseICAO(flights);

    ACS_SkyTrack.lastSnapshot = flights;
    ACS_SkyTrack.lastFetchAt = Date.now();
    ACS_SkyTrack.error = null;

    window.__ACS_CANONICAL_SKYTRACK_SNAPSHOT__ = flights;
    window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = flights;

    window.dispatchEvent(
      new CustomEvent("ACS_SKYTRACK_SNAPSHOT", {
        detail: flights
      })
    );
  }

  async function ACS_SkyTrack_refreshOnce() {
    try {
      const data = await ACS_SkyTrack_fetchSnapshot();
      ACS_SkyTrack_publishSnapshot(data);
    } catch (err) {
      ACS_SkyTrack.error =
        err?.message || "SKYTRACK_SNAPSHOT_REFRESH_FAILED";

      console.warn("⛔ SkyTrack snapshot refresh failed:", err);
    }
  }

  async function ACS_SkyTrack_init(headless = false) {
    if (ACS_SkyTrack.initialized) return;

    ACS_SkyTrack.initialized = true;

    console.log(
      "✈️ SkyTrack Runtime initialized — SNAPSHOT CANONICAL ADAPTER"
    );

    await ACS_SkyTrack_refreshOnce();

    ACS_SkyTrack.refreshTimer = setInterval(() => {
      ACS_SkyTrack_refreshOnce();
    }, REFRESH_MS);

    console.log("🟢 SkyTrack OCC runtime ready — backend authority only");
  }

  function ACS_SkyTrack_stop() {
    if (ACS_SkyTrack.refreshTimer) {
      clearInterval(ACS_SkyTrack.refreshTimer);
      ACS_SkyTrack.refreshTimer = null;
    }

    ACS_SkyTrack.initialized = false;
  }

  function ACS_SkyTrack_debugDump() {
    console.table({
      authority: ACS_SkyTrack.authority,
      airlineId: ACS_SkyTrack.airlineId,
      baseICAO: ACS_SkyTrack.baseICAO,
      nowAbsMin: ACS_SkyTrack.nowAbsMin,
      currentSimTime: ACS_SkyTrack.currentSimTime,
      count: ACS_SkyTrack.lastSnapshot.length,
      lastFetchAt: ACS_SkyTrack.lastFetchAt
        ? new Date(ACS_SkyTrack.lastFetchAt).toISOString()
        : null,
      error: ACS_SkyTrack.error
    });

    return ACS_SkyTrack.lastSnapshot;
  }

  window.ACS_SkyTrack_init = ACS_SkyTrack_init;
  window.ACS_SkyTrack_stop = ACS_SkyTrack_stop;
  window.ACS_SkyTrack_debugDump = ACS_SkyTrack_debugDump;

  if (!window.__ACS_RUNTIME_ACTIVE__) {
    window.__ACS_RUNTIME_ACTIVE__ = true;

    if (window.ACS_RUNTIME_HEADLESS === true) {
      ACS_SkyTrack_init(true);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        ACS_SkyTrack_init(false);
      });
    }
  }
})();

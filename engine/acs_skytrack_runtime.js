/* ============================================================
   ✈️ ACS SKYTRACK RUNTIME — SNAPSHOT CANONICAL ADAPTER
   ACS OCC / AIRBUS OCC — PASO 1
   ============================================================ */

(function () {
  const SNAPSHOT_URL = "https://api.aviationcapitalsim.com/v1/skytrack/snapshot";
  const REFRESH_MS = 5000;
  let ACS_SkyTrack_fetchInProgress = false;

  function ACS_SkyTrack_buildAirportIndex() {
    if (window.ACS_AIRPORT_INDEX && Object.keys(window.ACS_AIRPORT_INDEX).length) {
      return window.ACS_AIRPORT_INDEX;
    }

    const index = {};

    if (!window.WorldAirportsACS) {
      window.ACS_AIRPORT_INDEX = index;
      return index;
    }

    Object.values(window.WorldAirportsACS).forEach(region => {
      if (!Array.isArray(region)) return;

      region.forEach(ap => {
        if (!ap || !ap.icao) return;

        const lat = Number(ap.latitude);
        const lng = Number(ap.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          ap.lat = lat;
          ap.lng = lng;

          index[String(ap.icao).toUpperCase()] = ap;
        }
      });
    });

    window.ACS_AIRPORT_INDEX = index;
    window.__ACS_AIRPORT_INDEX__ = index;

    document.dispatchEvent(
      new CustomEvent("ACS_AIRPORTS_READY", {
        detail: { count: Object.keys(index).length }
      })
    );

    console.log(
      "🧭 SkyTrack AirportIndex ready:",
      Object.keys(index).length,
      "airports"
    );

    return index;
  }

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
      headers: { Accept: "application/json" }
    });

    const text = await res.text();

let data = null;

try {
  data = JSON.parse(text);
} catch {
  throw new Error(
    `SKYTRACK_SNAPSHOT_NON_JSON_RESPONSE_${res.status}`
  );
}

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

  const counts = {};

  own.forEach(f => {
    const origin = String(f.originICAO || "").toUpperCase();
    if (!origin) return;
    counts[origin] = (counts[origin] || 0) + 1;
  });

  const bestOrigin = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    bestOrigin ||
    own.find(f => f.baseICAO)?.baseICAO ||
    own.find(f => f.base_icao)?.base_icao ||
    null
  );
}

  function ACS_SkyTrack_publishSnapshot(data) {
    ACS_SkyTrack_buildAirportIndex();

    const flights = Array.isArray(data.flights) ? data.flights : [];

    ACS_SkyTrack.nowAbsMin =
      Number.isFinite(Number(data.now_abs_min))
        ? Number(data.now_abs_min)
        : null;

    ACS_SkyTrack.currentSimTime = data.current_sim_time || null;

    ACS_SkyTrack.airlineId =
      data.airline_id != null ? String(data.airline_id) : null;

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

  if (ACS_SkyTrack_fetchInProgress) return;

  ACS_SkyTrack_fetchInProgress = true;

  try {

    const data =
      await ACS_SkyTrack_fetchSnapshot();

    ACS_SkyTrack_publishSnapshot(data);

    console.log(
      "✈️ Snapshot updated",
      {
        nowAbsMin: ACS_SkyTrack.nowAbsMin,
        flights: ACS_SkyTrack.lastSnapshot.length,
        baseICAO: ACS_SkyTrack.baseICAO
      }
    );

  } catch(err) {

    ACS_SkyTrack.error =
      err?.message ||
      "SKYTRACK_SNAPSHOT_REFRESH_FAILED";

    console.warn(
      "⛔ SkyTrack snapshot refresh failed:",
      ACS_SkyTrack.error
    );

  } finally {

    ACS_SkyTrack_fetchInProgress = false;

  }
}

async function ACS_SkyTrack_init(headless = false) {
  if (ACS_SkyTrack.initialized) return;

  ACS_SkyTrack.initialized = true;

  ACS_SkyTrack_buildAirportIndex();

  await ACS_SkyTrack_refreshOnce();

  ACS_SkyTrack.refreshTimer = setInterval(() => {
    ACS_SkyTrack_refreshOnce();
  }, REFRESH_MS);

  console.log("🟢 SkyTrack OCC ready — snapshot authority only");
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
      airports: Object.keys(window.ACS_AIRPORT_INDEX || {}).length,
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
  window.ACS_SkyTrack_buildAirportIndex = ACS_SkyTrack_buildAirportIndex;

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

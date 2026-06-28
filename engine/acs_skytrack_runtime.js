/* ============================================================
   ACS SKYTRACK SNAPSHOT ADAPTER — ACS OCC / AIRBUS OCC
   ------------------------------------------------------------
   Backend = autoridad
   Browser = solo render
   ============================================================ */

window.ACS_SkyTrack = window.ACS_SkyTrack || {
  initialized: false,
  airlineId: null,
  baseICAO: null,
  nowAbsMin: null,
  currentSimTime: null,

  // Compatibilidad visual solamente
  itemsByAircraft: {},
  flightItemsByAircraft: {},
  serviceItemsByAircraft: {}
};

/* ============================================================
   AIRPORT INDEX VISUAL COMPATIBILITY
   ============================================================ */

function ACS_SkyTrack_syncAirportIndex() {
  if (window.ACS_AIRPORT_INDEX && Object.keys(window.ACS_AIRPORT_INDEX).length) {
    return;
  }

  if (window.__ACS_AIRPORT_INDEX__ && Object.keys(window.__ACS_AIRPORT_INDEX__).length) {
    window.ACS_AIRPORT_INDEX = window.__ACS_AIRPORT_INDEX__;
    console.log("🧭 SkyTrack airport index linked from HTML index");
    return;
  }

  if (window.WorldAirportsACS) {
    const idx = {};

    Object.values(window.WorldAirportsACS).forEach(region => {
      if (!Array.isArray(region)) return;

      region.forEach(ap => {
        if (!ap || !ap.icao) return;

        const lat = Number(ap.latitude);
        const lng = Number(ap.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          ap.lat = lat;
          ap.lng = lng;
          idx[ap.icao] = ap;
        }
      });
    });

    window.ACS_AIRPORT_INDEX = idx;
    window.__ACS_AIRPORT_INDEX__ = idx;

    console.log("🧭 SkyTrack airport index built:", Object.keys(idx).length);
  }
}

/* ============================================================
   VISUAL BASE RESOLVER
   ============================================================ */

function ACS_SkyTrack_resolveBase(snapshot) {
  if (!Array.isArray(snapshot)) return null;

  const own = snapshot.find(x => x && x.scope === "OWN") || snapshot[0];

  return (
    own?.airport ||
    own?.position?.airport ||
    own?.originICAO ||
    own?.destinationICAO ||
    null
  );
}

/* ============================================================
   SNAPSHOT FETCH
   ============================================================ */

async function ACS_SkyTrack_fetchSnapshot() {
  ACS_SkyTrack_syncAirportIndex();

  const res = await fetch(
    "https://api.aviationcapitalsim.com/v1/skytrack/snapshot",
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    }
  );

  const data = await res.json();

  if (!res.ok || data?.ok !== true) {
    throw new Error(data?.error || "SKYTRACK_SNAPSHOT_FAILED");
  }

  if (data.authority !== "POSTGRESQL_SKYTRACK_SNAPSHOT_CANONICAL") {
    throw new Error("SKYTRACK_SNAPSHOT_AUTHORITY_INVALID");
  }

  const snapshot = Array.isArray(data.flights) ? data.flights : [];

  ACS_SkyTrack.airlineId = String(data.airline_id || "");
  ACS_SkyTrack.nowAbsMin = Number(data.now_abs_min);
  ACS_SkyTrack.currentSimTime = data.current_sim_time || null;

  const resolvedBase = ACS_SkyTrack_resolveBase(snapshot);
  if (resolvedBase) {
    ACS_SkyTrack.baseICAO = resolvedBase;
  }

  window.__ACS_CANONICAL_SKYTRACK_SNAPSHOT__ = snapshot;
  window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = snapshot;

  window.dispatchEvent(
    new CustomEvent("ACS_SKYTRACK_SNAPSHOT", {
      detail: snapshot
    })
  );

  console.log("🟢 ACS SkyTrack snapshot loaded", {
    authority: data.authority,
    airlineId: ACS_SkyTrack.airlineId,
    baseICAO: ACS_SkyTrack.baseICAO,
    nowAbsMin: ACS_SkyTrack.nowAbsMin,
    aircraft: snapshot.length
  });
}

/* ============================================================
   INIT
   ============================================================ */

async function ACS_SkyTrack_init() {
  if (ACS_SkyTrack.initialized) return;

  ACS_SkyTrack.initialized = true;

  console.log("✈️ SkyTrack Snapshot Adapter initialized");

  ACS_SkyTrack_syncAirportIndex();

  await ACS_SkyTrack_fetchSnapshot();

  if (!window.__ACS_SKYTRACK_SNAPSHOT_REFRESH__) {
    window.__ACS_SKYTRACK_SNAPSHOT_REFRESH__ = true;

    setInterval(async () => {
      try {
        await ACS_SkyTrack_fetchSnapshot();
      } catch (err) {
        console.warn("⚠️ SkyTrack snapshot refresh failed:", err);
      }
    }, 5000);
  }

  console.log("🟢 SkyTrack running in SNAPSHOT ONLY mode");
}

/* ============================================================
   BOOT
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  ACS_SkyTrack_init().catch(err => {
    console.error("⛔ SkyTrack snapshot adapter failed:", err);
  });
});

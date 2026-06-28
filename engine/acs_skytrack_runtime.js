/* ============================================================
   ACS SKYTRACK RUNTIME — ACS OCC / AIRBUS OCC
   ------------------------------------------------------------
   Backend = autoridad
   Browser = render + compatibilidad visual FR24
   ============================================================ */

window.ACS_SkyTrack = window.ACS_SkyTrack || {
  initialized: false,
  airlineId: null,
  baseICAO: null,
  nowAbsMin: null,
  currentSimTime: null,

  itemsByAircraft: {},
  flightItemsByAircraft: {},
  serviceItemsByAircraft: {}
};

function ACS_SkyTrack_num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ACS_SkyTrack_absToHHMM(absMin) {
  const n = Number(absMin);
  if (!Number.isFinite(n)) return "—";

  const m = ((n % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");

  return `${hh}:${mm}`;
}

function ACS_SkyTrack_syncAirportIndex() {
  if (window.ACS_AIRPORT_INDEX && Object.keys(window.ACS_AIRPORT_INDEX).length) {
    return;
  }

  if (window.__ACS_AIRPORT_INDEX__ && Object.keys(window.__ACS_AIRPORT_INDEX__).length) {
    window.ACS_AIRPORT_INDEX = window.__ACS_AIRPORT_INDEX__;
    console.log("🧭 SkyTrack airport index linked");
    return;
  }

  if (!window.WorldAirportsACS) return;

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

function ACS_SkyTrack_makeFlightItem(item) {
  if (!item || !item.aircraftId || !item.flightNumber) return null;

  const depAbsMin = ACS_SkyTrack_num(item.depAbsMin);
  const arrAbsMin = ACS_SkyTrack_num(item.arrAbsMin);

  return {
    id: item.scheduleItemId || item.schedule_item_id || item.flightNumber,

    type: "flight",
    itemType: "flight",

    aircraftId: item.aircraftId,

    origin: item.originICAO || null,
    destination: item.destinationICAO || null,

    depAbsMin,
    arrAbsMin,

    departure: ACS_SkyTrack_absToHHMM(depAbsMin),
    arrival: ACS_SkyTrack_absToHHMM(arrAbsMin),

    flightNumber: item.flightNumber || null,
    pairedFlightNumber: item.pairedFlightNumber || null,

    flightDirection: item.flightDirection || null,
    status: String(item.scheduleStatus || "assigned").toLowerCase(),

    distanceNM: Number(item.distanceNM || 0),

    modelKey: item.modelKey || null,
    aircraft: item.aircraft || item.aircraftModel || item.model || null,
    registration: item.registration || null,

    currentAirport: item.airport || item.position?.airport || null,
    baseAirport: item.baseICAO || item.base_icao || null,

    __snapshotState: item.state || null,
    __snapshotAirport: item.airport || item.position?.airport || null,
    __snapshotContext: item.flightContext || null,
    __snapshotAuthority: true
  };
}

function ACS_SkyTrack_buildVisualIndexes(snapshot) {
  const itemsByAircraft = {};
  const flightItemsByAircraft = {};
  const serviceItemsByAircraft = {};

  if (!Array.isArray(snapshot)) {
    return { itemsByAircraft, flightItemsByAircraft, serviceItemsByAircraft };
  }

  snapshot.forEach(item => {
    if (!item || !item.aircraftId) return;

    const acId = item.aircraftId;

    if (!itemsByAircraft[acId]) itemsByAircraft[acId] = [];
    if (!flightItemsByAircraft[acId]) flightItemsByAircraft[acId] = [];
    if (!serviceItemsByAircraft[acId]) serviceItemsByAircraft[acId] = [];

    const flightItem = ACS_SkyTrack_makeFlightItem(item);

    if (flightItem) {
      itemsByAircraft[acId].push(flightItem);
      flightItemsByAircraft[acId].push(flightItem);
    }

    if (
      item.state &&
      !["GROUND", "EN_ROUTE"].includes(String(item.state).toUpperCase())
    ) {
      const serviceItem = {
        type: "service",
        itemType: "service",
        aircraftId: acId,
        serviceType: item.state,
        status: "in_progress",
        __snapshotAuthority: true
      };

      itemsByAircraft[acId].push(serviceItem);
      serviceItemsByAircraft[acId].push(serviceItem);
    }
  });

  Object.keys(itemsByAircraft).forEach(acId => {
    itemsByAircraft[acId].sort((a, b) => Number(a.depAbsMin || 0) - Number(b.depAbsMin || 0));
    flightItemsByAircraft[acId].sort((a, b) => Number(a.depAbsMin || 0) - Number(b.depAbsMin || 0));
  });

  return { itemsByAircraft, flightItemsByAircraft, serviceItemsByAircraft };
}

function ACS_SkyTrack_resolveBase(snapshot) {
  if (!Array.isArray(snapshot)) return null;

  const own =
    snapshot.find(x => x && x.scope === "OWN") ||
    snapshot[0];

  return (
    own?.baseICAO ||
    own?.base_icao ||
    window.ACS_USER_BASE_ICAO ||
    window.localStorage?.getItem?.("ACS_baseICAO") ||

    own?.currentAirport ||
    own?.current_airport ||
    own?.airport ||
    own?.position?.airport ||
    own?.originICAO ||
    own?.destinationICAO ||

    null
  );
}

async function ACS_SkyTrack_fetchSnapshot() {
  ACS_SkyTrack_syncAirportIndex();

  const res = await fetch(
    "https://api.aviationcapitalsim.com/v1/skytrack/snapshot",
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" }
    }
  );

  const data = await res.json();

  if (!res.ok || data?.ok !== true) {
    throw new Error(data?.error || "SKYTRACK_RUNTIME_SNAPSHOT_FAILED");
  }

  if (data.authority !== "POSTGRESQL_SKYTRACK_SNAPSHOT_CANONICAL") {
    throw new Error("SKYTRACK_RUNTIME_AUTHORITY_INVALID");
  }

  const snapshot = Array.isArray(data.flights) ? data.flights : [];

  ACS_SkyTrack.airlineId = String(data.airline_id || "");
  ACS_SkyTrack.nowAbsMin = ACS_SkyTrack_num(data.now_abs_min);
  ACS_SkyTrack.currentSimTime = data.current_sim_time || null;

  const resolvedBase = ACS_SkyTrack_resolveBase(snapshot);
  if (resolvedBase) ACS_SkyTrack.baseICAO = resolvedBase;

  const visualIndexes = ACS_SkyTrack_buildVisualIndexes(snapshot);

  ACS_SkyTrack.itemsByAircraft = visualIndexes.itemsByAircraft;
  ACS_SkyTrack.flightItemsByAircraft = visualIndexes.flightItemsByAircraft;
  ACS_SkyTrack.serviceItemsByAircraft = visualIndexes.serviceItemsByAircraft;

  window.__ACS_CANONICAL_SKYTRACK_SNAPSHOT__ = snapshot;
  window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = snapshot;

  window.dispatchEvent(
    new CustomEvent("ACS_SKYTRACK_SNAPSHOT", {
      detail: snapshot
    })
  );

  console.log("🟢 ACS SkyTrack runtime loaded", {
    authority: data.authority,
    airlineId: ACS_SkyTrack.airlineId,
    baseICAO: ACS_SkyTrack.baseICAO,
    nowAbsMin: ACS_SkyTrack.nowAbsMin,
    aircraft: snapshot.length,
    visualAircraft: Object.keys(ACS_SkyTrack.itemsByAircraft).length
  });
}

async function ACS_SkyTrack_init() {
  if (ACS_SkyTrack.initialized) return;

  ACS_SkyTrack.initialized = true;

  console.log("✈️ SkyTrack Runtime initialized — ACS OCC");

  ACS_SkyTrack_syncAirportIndex();

  await ACS_SkyTrack_fetchSnapshot();

  if (!window.__ACS_SKYTRACK_RUNTIME_REFRESH__) {
    window.__ACS_SKYTRACK_RUNTIME_REFRESH__ = true;

    setInterval(async () => {
      try {
        await ACS_SkyTrack_fetchSnapshot();
      } catch (err) {
        console.warn("⚠️ SkyTrack runtime refresh failed:", err);
      }
    }, 2000);
  }

  console.log("🟢 SkyTrack running in RUNTIME VISUAL COMPAT mode");
}

document.addEventListener("DOMContentLoaded", () => {
  ACS_SkyTrack_init().catch(err => {
    console.error("⛔ SkyTrack runtime failed:", err);
  });
});

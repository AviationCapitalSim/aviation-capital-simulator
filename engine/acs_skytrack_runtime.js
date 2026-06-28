/* ============================================================
   ACS SKYTRACK RUNTIME - CANONICAL SNAPSHOT CONSUMER
   ------------------------------------------------------------
   ACS OCC / AIRBUS OCC

   Authority:
   - PostgreSQL
   - /v1/skytrack/snapshot
   - Backend-resolved operational state

   Browser responsibility:
   - Fetch canonical snapshot.
   - Store latest snapshot for renderers.
   - Dispatch ACS_SKYTRACK_SNAPSHOT.
   - No local/global merge.
   - No EN_ROUTE/GROUND resolver.
   - No arrival detection.
   - No frontend operational authority.
   ============================================================ */

(function () {
  const SNAPSHOT_URL =
    "https://api.aviationcapitalsim.com/v1/skytrack/snapshot";

  const REFRESH_MS = 3000;

  window.ACS_SkyTrack = window.ACS_SkyTrack || {};

  Object.assign(window.ACS_SkyTrack, {
    initialized: false,
    nowAbsMin: null,
    currentSimTime: null,
    airlineId: null,
    baseICAO: null,
    lastSnapshot: [],

    // Compatibility only. These must not be used as authority.
    aircraftIndex: {},
    globalRows: [],
    itemsByAircraft: {},
    flightItemsByAircraft: {},
    serviceItemsByAircraft: {},
    lastActiveFlight: {}
  });

  function ACS_ST_num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function ACS_ST_str(value) {
    return value == null ? null : String(value);
  }

  function ACS_ST_normalizeSnapshotItem(row) {
    if (!row) return null;

    const scope = String(row.scope || "OWN").toUpperCase();
    const rawAircraftId =
      ACS_ST_str(row.rawAircraftId) ||
      ACS_ST_str(row.raw_aircraft_id) ||
      ACS_ST_str(row.aircraftId) ||
      ACS_ST_str(row.aircraft_id);

    const airlineId =
      ACS_ST_str(row.airlineId) ||
      ACS_ST_str(row.airline_id) ||
      "";

    if (!rawAircraftId || !airlineId) return null;

    const aircraftId =
      scope === "GLOBAL"
        ? `GLOBAL_${airlineId}_${rawAircraftId}`
        : rawAircraftId;

    const state =
      String(row.state || "GROUND").toUpperCase();

    const positionType =
      String(
        row.positionType ||
        row.position_type ||
        (state === "EN_ROUTE" ? "ROUTE" : "AIRPORT")
      ).toUpperCase();

    const progress = ACS_ST_num(row.progress);

    const airport =
      row.airport ||
      row.currentAirport ||
      row.current_airport ||
      row.baseICAO ||
      row.base_icao ||
      null;

    const position =
      positionType === "ROUTE"
        ? {
            progress:
              progress == null
                ? 0
                : Math.max(0, Math.min(1, progress))
          }
        : {
            airport:
              airport ||
              row.originICAO ||
              row.origin_icao ||
              row.origin ||
              null
          };

    return {
      aircraftId,
      rawAircraftId,
      canonicalAircraftKey:
        row.canonicalAircraftKey ||
        row.canonical_aircraft_key ||
        `${airlineId}:${rawAircraftId}`,

      scope,

      airlineId,
      airline_id: airlineId,
      airlineName: row.airlineName || row.airline_name || null,
      airlineIata: row.airlineIata || row.iata || null,
      airlineIcao: row.airlineIcao || row.icao || null,

      airlineColorHex:
        row.airlineColorHex ||
        row.color_hex ||
        "#3A5FFF",
      airlineColorHsl:
        row.airlineColorHsl ||
        row.color_hsl ||
        "hsl(220,70%,50%)",
      airlineColorIndex:
        Number(row.airlineColorIndex || row.color_index || 0),

      registration: row.registration || "-",

      model:
        row.model ||
        row.aircraftName ||
        row.aircraft_name ||
        row.modelKey ||
        row.model_key ||
        "-",

      aircraft:
        row.aircraft ||
        row.model ||
        row.aircraftName ||
        row.aircraft_name ||
        row.modelKey ||
        row.model_key ||
        "-",

      aircraftModel:
        row.aircraftModel ||
        row.model ||
        row.aircraftName ||
        row.aircraft_name ||
        row.modelKey ||
        row.model_key ||
        "-",

      modelKey: row.modelKey || row.model_key || null,

      state,
      positionType,
      position,
      airport,
      progress,

      currentAirport: row.currentAirport || row.current_airport || null,
      baseICAO: row.baseICAO || row.base_icao || null,

      flightNumber: row.flightNumber || row.flight_number || null,
      pairedFlightNumber:
        row.pairedFlightNumber ||
        row.paired_flight_number ||
        null,

      originICAO:
        row.originICAO ||
        row.origin_icao ||
        row.origin ||
        null,
      destinationICAO:
        row.destinationICAO ||
        row.destination_icao ||
        row.destination ||
        null,

      depAbsMin: ACS_ST_num(row.depAbsMin ?? row.dep_abs_min),
      arrAbsMin: ACS_ST_num(row.arrAbsMin ?? row.arr_abs_min),
      distanceNM: Number(row.distanceNM || row.distance_nm || 0),

      flightDirection: row.flightDirection || row.flight_direction || null,
      scheduleStatus: row.scheduleStatus || row.schedule_status || null,
      flightContext: row.flightContext || row.flight_context || null,
      arrived: row.arrived === true,

      opsStatus: row.opsStatus || row.ops_status || "ON_TIME",
      delayed: !!row.delayed,
      delayMinutes: Number(row.delayMinutes || row.delay_minutes || 0),

      __canonicalBackend: true,
      __snapshotAuthority: true
    };
  }

  function ACS_ST_resolveBaseICAO(snapshot) {
    const own = Array.isArray(snapshot)
      ? snapshot.filter(item => item.scope === "OWN")
      : [];

    const groundOwn = own.find(item =>
      item.position &&
      item.position.airport
    );

    if (groundOwn?.position?.airport) {
      return groundOwn.position.airport;
    }

    const currentOwn = own.find(item => item.currentAirport);
    if (currentOwn?.currentAirport) {
      return currentOwn.currentAirport;
    }

    const baseOwn = own.find(item => item.baseICAO);
    if (baseOwn?.baseICAO) {
      return baseOwn.baseICAO;
    }

    const routeOwn = own.find(item => item.originICAO);
    if (routeOwn?.originICAO) {
      return routeOwn.originICAO;
    }

    return null;
  }

  async function ACS_SkyTrack_loadData() {
    try {
      const res = await fetch(SNAPSHOT_URL, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Accept": "application/json"
        }
      });

      const data = await res.json();

      if (!res.ok || data?.ok !== true) {
        throw new Error(data?.error || "SKYTRACK_SNAPSHOT_FAILED");
      }

      if (data.authority !== "POSTGRESQL_SKYTRACK_SNAPSHOT_CANONICAL") {
        throw new Error("SKYTRACK_SNAPSHOT_AUTHORITY_INVALID");
      }

      const snapshot = Array.isArray(data.flights)
        ? data.flights
            .map(ACS_ST_normalizeSnapshotItem)
            .filter(Boolean)
        : [];

      window.ACS_SkyTrack.nowAbsMin =
        ACS_ST_num(data.now_abs_min);

      window.ACS_SkyTrack.currentSimTime =
        data.current_sim_time || null;

      window.ACS_SkyTrack.airlineId =
        data.airline_id ? String(data.airline_id) : null;

      window.ACS_SkyTrack.baseICAO =
        ACS_ST_resolveBaseICAO(snapshot);

      window.ACS_SkyTrack.lastSnapshot = snapshot;

      window.__ACS_CANONICAL_SKYTRACK_SNAPSHOT__ = snapshot;
      window.__ACS_LAST_SKYTRACK_SNAPSHOT__ = snapshot;

      window.dispatchEvent(
        new CustomEvent("ACS_SKYTRACK_SNAPSHOT", {
          detail: snapshot
        })
      );

      console.log("SkyTrack snapshot loaded", {
        airlineId: window.ACS_SkyTrack.airlineId,
        nowAbsMin: window.ACS_SkyTrack.nowAbsMin,
        baseICAO: window.ACS_SkyTrack.baseICAO,
        aircraft: snapshot.length,
        authority: data.authority
      });

      return snapshot;

    } catch (err) {
      console.warn("SkyTrack snapshot load failed:", err);

      /*
       * ACS OCC rule:
       * Do not clear the visible radar on transient fetch failures.
       * Keep the last known snapshot until the backend responds again.
       */
      return window.ACS_SkyTrack.lastSnapshot || [];
    }
  }

  function ACS_SkyTrack_startSnapshotRefresh() {
    if (window.__ACS_SKYTRACK_SNAPSHOT_REFRESH__) return;

    window.__ACS_SKYTRACK_SNAPSHOT_REFRESH__ = true;

    setInterval(() => {
      ACS_SkyTrack_loadData();
    }, REFRESH_MS);

    console.log("SkyTrack canonical snapshot refresh active");
  }

  async function ACS_SkyTrack_init(headless = false) {
    if (window.ACS_SkyTrack.initialized) return;

    window.ACS_SkyTrack.initialized = true;

    console.log("SkyTrack Runtime initialized (SNAPSHOT OCC)");

    await ACS_SkyTrack_loadData();
    ACS_SkyTrack_startSnapshotRefresh();

    console.log("SkyTrack OCC runtime ready");
  }

  window.ACS_SkyTrack_loadData = ACS_SkyTrack_loadData;
  window.ACS_SkyTrack_init = ACS_SkyTrack_init;

  if (!window.__ACS_RUNTIME_ACTIVE__) {
    window.__ACS_RUNTIME_ACTIVE__ = true;

    if (window.ACS_RUNTIME_HEADLESS === true) {
      ACS_SkyTrack_init(true);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        ACS_SkyTrack_init(false).catch(err => {
          console.error("SkyTrack bootstrap failed", err);
        });
      });
    }
  }

})();

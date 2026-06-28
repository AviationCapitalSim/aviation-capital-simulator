/* ============================================================
   ACS SKYTRACK SNAPSHOT ADAPTER — ACS OCC / AIRBUS OCC
   ------------------------------------------------------------
   Authority:
   - PostgreSQL
   - /v1/skytrack/snapshot
   - Browser only renders
   ============================================================ */

window.ACS_SkyTrack = window.ACS_SkyTrack || {
  initialized: false,
  airlineId: null,
  baseICAO: null,
  nowAbsMin: null,
  currentSimTime: null
};

async function ACS_SkyTrack_fetchSnapshot() {
  const res = await fetch(
    "https://api.aviationcapitalsim.com/v1/skytrack/snapshot",
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
    throw new Error(data?.error || "SKYTRACK_SNAPSHOT_FAILED");
  }

  if (data.authority !== "POSTGRESQL_SKYTRACK_SNAPSHOT_CANONICAL") {
    throw new Error("SKYTRACK_SNAPSHOT_AUTHORITY_INVALID");
  }

  ACS_SkyTrack.airlineId = String(data.airline_id || "");
  ACS_SkyTrack.nowAbsMin = Number(data.now_abs_min);
  ACS_SkyTrack.currentSimTime = data.current_sim_time || null;

  const snapshot = Array.isArray(data.flights)
    ? data.flights
    : [];

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
    nowAbsMin: ACS_SkyTrack.nowAbsMin,
    aircraft: snapshot.length
  });
}

async function ACS_SkyTrack_init() {
  if (ACS_SkyTrack.initialized) return;

  ACS_SkyTrack.initialized = true;

  console.log("✈️ SkyTrack Snapshot Adapter initialized");

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

document.addEventListener("DOMContentLoaded", () => {
  ACS_SkyTrack_init().catch(err => {
    console.error("⛔ SkyTrack snapshot adapter failed:", err);
  });
});

/* ============================================================
   === AVIATION CAPITAL SIMULATOR - GLOBAL TIME ENGINE v5.0 ===
   ------------------------------------------------------------
   ACS + Airbus OCC Technique
   PostgreSQL / Railway Time Authority

   ▪ PostgreSQL is the only time authority
   ▪ Frontend does not calculate official ACS time
   ▪ No localStorage
   ▪ No Date.now()
   ▪ No local reset to 1940
   ▪ /v1/world provides current_sim_time
   ============================================================ */

/* === CONSTANTS === */
const SIM_START = new Date("1940-01-01T00:00:00Z");
const SIM_END = new Date("2026-01-01T00:00:00Z");

const ACS_WORLD_ENDPOINT =
  "https://acs-world-server-production.up.railway.app/v1/world";

/* ============================================================
   🌍 GLOBAL WORLD SNAPSHOT — BACKEND AUTHORITY
   ============================================================ */

let ACS_WORLD = null;
let ACS_TIME_ENGINE_RUNNING = false;

/* ============================================================
   🕒 ACS TIME STATE — DISPLAY ONLY
   ============================================================ */

const ACS_TIME = {
  currentTime: new Date(SIM_START),
  tickInterval: null,
  listeners: [],

  get minute() {
    if (!(this.currentTime instanceof Date)) return 0;
    return Math.floor((this.currentTime - SIM_START) / 60000);
  }
};

/* ============================================================
   🌍 FETCH OFFICIAL WORLD STATE FROM RAILWAY / POSTGRESQL
   ============================================================ */

async function fetchOfficialWorldState() {
  const res = await fetch(ACS_WORLD_ENDPOINT, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`ACS_WORLD_FETCH_FAILED_${res.status}`);
  }

  const payload = await res.json();

  if (!payload.ok || !payload.world) {
    throw new Error("ACS_WORLD_INVALID_RESPONSE");
  }

  if (payload.world.time_source !== "POSTGRESQL_TIME_AUTHORITY") {
    throw new Error("ACS_WORLD_INVALID_TIME_SOURCE");
  }

  return payload.world;
}

/* ============================================================
   🌍 LOAD WORLD STATE
   ============================================================ */

async function loadWorldState() {
  try {
    const world = await fetchOfficialWorldState();

    ACS_WORLD = world;
    ACS_TIME.currentTime = new Date(world.current_sim_time);

    console.log("🌍 ACS WORLD LOADED — POSTGRESQL AUTHORITY:", world);

    updateClockDisplay();
    updateSimStatusDisplay();
    notifyTimeListeners();

    return world;

  } catch (err) {
    console.error("🚨 ACS WORLD LOAD FAILED — NO LOCAL FALLBACK:", err);

    stopACSTime();

    const el = document.getElementById("acs-clock");
    if (el) {
      el.textContent = "ACS TIME AUTHORITY OFFLINE";
      el.style.color = "#ff4040";
    }

    throw err;
  }
}

/* ============================================================
   === START DISPLAY REFRESH LOOP =============================
   ------------------------------------------------------------
   This loop does not calculate official time.
   It refreshes from Railway/PostgreSQL.
   ============================================================ */

function startACSTime() {
  if (ACS_TIME_ENGINE_RUNNING) {
    console.warn("⏳ ACS Time Engine already running");
    return;
  }

  ACS_TIME_ENGINE_RUNNING = true;

  stopACSTime();

  ACS_TIME.tickInterval = setInterval(async () => {
    try {
      const world = await fetchOfficialWorldState();

      ACS_WORLD = world;
      ACS_TIME.currentTime = new Date(world.current_sim_time);

      if (ACS_TIME.currentTime >= SIM_END) {
        ACS_TIME.currentTime = new Date("2025-12-31T23:59:00Z");
        stopACSTime();
      }

      updateClockDisplay();
      updateSimStatusDisplay();
      notifyTimeListeners();

    } catch (err) {
      console.warn("⚠️ ACS TIME REFRESH FAILED:", err);
    }
  }, 1000);
}

/* ============================================================
   === STOP DISPLAY REFRESH LOOP ==============================
   ============================================================ */

function stopACSTime() {
  if (ACS_TIME.tickInterval) {
    clearInterval(ACS_TIME.tickInterval);
  }

  ACS_TIME.tickInterval = null;
  ACS_TIME_ENGINE_RUNNING = false;
}

/* ============================================================
   === LEGACY COMPATIBILITY: computeSimTime ===================
   ------------------------------------------------------------
   Kept only so older modules do not crash.
   It does NOT calculate official time.
   ============================================================ */

function computeSimTime() {
  return ACS_TIME.currentTime;
}

/* ============================================================
   === ADMIN TOGGLE PLACEHOLDER ===============================
   ------------------------------------------------------------
   Local toggle is disabled.
   Future ON/OFF must call a backend admin endpoint.
   ============================================================ */

function toggleSimState() {
  alert("ACS Time is controlled by Railway/PostgreSQL authority. Local toggle is disabled.");
}

/* ============================================================
   === LOCAL RESET DISABLED ===================================
   ============================================================ */

function resetSimulationData() {
  alert("Local reset is disabled. ACS world time is controlled by Railway/PostgreSQL.");
}

/* ============================================================
   === CLOCK DISPLAY ==========================================
   ============================================================ */

function updateClockDisplay() {
  const el = document.getElementById("acs-clock");
  if (!el) return;

  const t = ACS_TIME.currentTime;

  if (!(t instanceof Date) || Number.isNaN(t.getTime())) {
    el.textContent = "ACS TIME INVALID";
    el.style.color = "#ff4040";
    return;
  }

  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");

  const weekday = t
    .toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })
    .toUpperCase();

  const dd = String(t.getUTCDate()).padStart(2, "0");
  const mon = t
    .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
    .toUpperCase();

  const yy = t.getUTCFullYear();

  el.textContent = `${hh}:${mm} — ${weekday} ${dd} ${mon} ${yy}`;
  el.style.color = "#00ff80";
}

/* ============================================================
   === SIM STATUS DISPLAY =====================================
   ============================================================ */

function updateSimStatusDisplay() {
  const simStatus = document.getElementById("simStatus");
  if (!simStatus || !ACS_WORLD) return;

  simStatus.textContent = String(ACS_WORLD.status || "UNKNOWN").toUpperCase();
  simStatus.style.color = ACS_WORLD.status === "ON" ? "#00ff80" : "#ff4040";
}

/* ============================================================
   === LISTENER SYSTEM ========================================
   ============================================================ */

function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) {
    try {
      cb(ACS_TIME.currentTime);
    } catch (err) {
      console.warn("⚠️ ACS TIME LISTENER FAILED:", err);
    }
  }
}

function registerTimeListener(callback) {
  if (typeof callback === "function") {
    ACS_TIME.listeners.push(callback);
  }
}

/* ============================================================
   ⚙️ B-CHECK LEGACY EVALUATOR — MEMORY ONLY
   ------------------------------------------------------------
   No localStorage fallback.
   If fleet module is not loaded, this listener does nothing.
   Future authority must move B-Check logic to backend.
   ============================================================ */

function ACS_evaluateBCheck(ac, now) {
  if (!ac.enteredFleetAt || !ac.bCheckDueAt) return;

  const DAY_MIN = 24 * 60;
  const WEEK_MIN = 7 * DAY_MIN;

  if (now < ac.bCheckDueAt) {
    ac.bCheckStatus = "ok";
    ac.isGrounded = false;
    return;
  }

  if (now >= ac.bCheckDueAt && !ac.bCheckPlanned) {
    ac.bCheckStatus = "overdue";
    ac.isGrounded = true;
    return;
  }

  const execEnd = ac.bCheckDueAt + DAY_MIN;

  if (now >= ac.bCheckDueAt && now < execEnd) {
    ac.bCheckStatus = "in_progress";
    ac.isGrounded = true;
    return;
  }

  if (now >= execEnd) {
    ac.bCheckStatus = "ok";
    ac.isGrounded = false;
    ac.bCheckPlanned = false;
    ac.bCheckDueAt = execEnd + WEEK_MIN;
  }
}

registerTimeListener((currentTime) => {
  if (typeof getRealFleet !== "function") return;

  const nowTs = currentTime.getTime();
  const fleet = getRealFleet();

  if (!Array.isArray(fleet)) return;

  let changed = false;

  fleet.forEach(ac => {
    const prevStatus = ac.bCheckStatus;
    const prevGround = ac.isGrounded;

    ACS_evaluateBCheck(ac, nowTs);

    if (ac.bCheckStatus !== prevStatus || ac.isGrounded !== prevGround) {
      changed = true;
    }
  });

  if (changed && typeof saveFleet === "function") {
    saveFleet(fleet);
  }
});

/* ============================================================
   === ECONOMIC WATCHER — MEMORY ONLY =========================
   ------------------------------------------------------------
   No localStorage.
   Future authority should move economics to backend.
   ============================================================ */

function updateEconomicVariables(year) {
  let ticketFee = 0.06;
  let fuelUSD = 3.2;

  if (year < 1960) {
    ticketFee = 0.12;
    fuelUSD = 1.1;
  } else if (year < 1980) {
    ticketFee = 0.09;
    fuelUSD = 1.9;
  } else if (year < 2000) {
    ticketFee = 0.07;
    fuelUSD = 2.5;
  } else if (year < 2020) {
    ticketFee = 0.05;
    fuelUSD = 4.3;
  } else {
    ticketFee = 0.04;
    fuelUSD = 5.8;
  }

  window.ACS_ECONOMY = {
    ticket_fee_percent: ticketFee,
    fuel_usd_gal: fuelUSD,
    year
  };

  if (typeof WorldAirportsACS !== "undefined") {
    for (const continent in WorldAirportsACS) {
      WorldAirportsACS[continent].forEach(a => {
        a.ticket_fee_percent = ticketFee;
        a.fuel_usd_gal = fuelUSD;
      });
    }
  }
}

function economicWatcher() {
  let lastHour = null;

  registerTimeListener((time) => {
    const hour = time.getUTCHours();

    if (hour !== lastHour) {
      lastHour = hour;
      updateEconomicVariables(time.getUTCFullYear());
    }
  });
}

/* ============================================================
   === INITIALIZATION =========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadWorldState();
    startACSTime();
    economicWatcher();
  } catch (err) {
    console.error("🚨 ACS TIME ENGINE INIT FAILED:", err);
  }
});

/* ============================================================
   === PUBLIC DEBUG HANDLE ====================================
   ============================================================ */

window.ACS_TIME = ACS_TIME;
window.ACS_WORLD = () => ACS_WORLD;
window.loadWorldState = loadWorldState;
window.startACSTime = startACSTime;
window.stopACSTime = stopACSTime;
window.computeSimTime = computeSimTime;
window.registerTimeListener = registerTimeListener;

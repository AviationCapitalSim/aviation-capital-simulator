/* ============================================================
   === AVIATION CAPITAL SIMULATOR - GLOBAL TIME ENGINE v4.4 ===
   ------------------------------------------------------------
   ▪ Global UTC Clock (1940 → 2026)
   ▪ 1 real second = 1 simulated minute
   ▪ OFF freezes perfectly
   ▪ ON resumes from exact point
   ▪ No drift, no double-counting, no jumps
   ▪ State survives page close, reload, and PC shutdown
   ============================================================ */

/* === CONSTANTS === */
const SIM_START = new Date("1940-01-01T00:00:00Z");
const SIM_END = new Date("2026-01-01T00:00:00Z"); // end exactly at 31 DEC 2025 23:59 UTC

/* ============================================================
   🌍 GLOBAL WORLD SNAPSHOT (SERVER AUTHORITY)
   ============================================================ */

let ACS_WORLD = null;


/* ============================================================
   🌍 LOAD GLOBAL WORLD STATE FROM SERVER
   ============================================================ */

async function loadWorldState() {

  try {

    const res = await fetch(
      "https://acs-world-server-production.up.railway.app/v1/world"
    );

    const world = await res.json();

    ACS_WORLD = world;
     
    console.log("🌍 ACS WORLD LOADED:", world);

    if (world.status === "OFF") {

      ACS_CYCLE.status = "OFF";
      ACS_TIME.currentTime = new Date(world.frozen_sim_time);

    }

    if (world.status === "ON") {

    ACS_CYCLE.status = "ON";
    ACS_CYCLE.realStartDate = world.real_start;

    if (world.frozen_sim_time) {
    ACS_TIME.currentTime = new Date(world.frozen_sim_time);
    localStorage.setItem("acs_frozen_time", world.frozen_sim_time);
  }

}

  } catch (err) {

    console.warn("⚠️ WORLD LOAD FAILED — fallback local", err);

  }

}

/* ============================================================
   🌍 WORLD STATE WATCHER
   ============================================================ */

setInterval(async () => {

  try {

    const res = await fetch(
      "https://acs-world-server-production.up.railway.app/v1/world"
    );

    const world = await res.json();

    ACS_WORLD = world;
 
    if (world.status === "ON" && ACS_CYCLE.status !== "ON") {

      console.log("🌍 WORLD START DETECTED");

      ACS_CYCLE.status = "ON";
      ACS_CYCLE.realStartDate = world.real_start;

      startACSTime();

    }

    if (world.status === "OFF" && ACS_CYCLE.status !== "OFF") {

  console.log("🌍 WORLD STOP DETECTED");

  ACS_CYCLE.status = "OFF";

  if (typeof ACS_TIME !== "undefined" && world.frozen_sim_time) {
    ACS_TIME.currentTime = new Date(world.frozen_sim_time);
  }

  if (typeof stopACSTime === "function") {
    stopACSTime();
  }

}

  } catch (err) {

    console.warn("WORLD WATCH FAILED", err);

  }

}, 60000);

/* ============================================================
   🟧 A6 — GAME MINUTE NORMALIZATION (GLOBAL)
   - Define ACS_TIME.minute oficialmente
   - Minutos absolutos desde SIM_START
   - Fuente única para Runtime / SkyTrack / Maintenance
   ============================================================ */

/* ============================================================
   🔒 TIME ENGINE LOCK (PREVENT MULTIPLE STARTS)
   ============================================================ */

let ACS_TIME_ENGINE_RUNNING = false;

const ACS_TIME = {
  currentTime: new Date(SIM_START),
  tickInterval: null,
  listeners: [],

  get minute() {
    if (!(this.currentTime instanceof Date)) return 0;
    return Math.floor((this.currentTime - SIM_START) / 60000);
  }
};

/* === LOAD OR INIT CYCLE === */

let ACS_CYCLE = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}");

if (!ACS_CYCLE.realStartDate) {
  ACS_CYCLE = {
    realStartDate: null,
    status: "OFF",
  };
  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
}

/* ============================================================
   === SIMULATION CORE — REAL SECOND → SIM MINUTE ============
   ============================================================ */

function computeSimTime() {

  if (!ACS_WORLD) return ACS_TIME.currentTime;

  if (ACS_WORLD.status !== "ON") return ACS_TIME.currentTime;

  const clientNow = Date.now();

  const serverNow = ACS_WORLD.server_now;

  const realStart = new Date(ACS_WORLD.real_start).getTime();

  const elapsedClient = clientNow - serverNow;

  const realElapsed = (serverNow - realStart) + elapsedClient;

  const simMinutes = Math.floor(realElapsed / 1000);

  const simTime = SIM_START.getTime() + simMinutes * 60000;

  return new Date(simTime);

}

/* ============================================================
   === START SIMULATION =======================================
   ============================================================ */

function startACSTime() {

  // 🔒 Prevent multiple engine instances
  if (ACS_TIME_ENGINE_RUNNING) {
    console.warn("⏳ ACS Time Engine already running");
    return;
  }

  ACS_TIME_ENGINE_RUNNING = true;

  stopACSTime();

  if (!ACS_CYCLE.realStartDate) {
    ACS_CYCLE.realStartDate = new Date().toISOString();
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));
  }

  if (!ACS_CYCLE.frozenBaseTime && ACS_TIME.currentTime instanceof Date) {
  ACS_CYCLE.frozenBaseTime = ACS_TIME.currentTime.getTime();
  }   
   
  ACS_TIME.currentTime = computeSimTime();
  updateClockDisplay();
  notifyTimeListeners();

  ACS_TIME.tickInterval = setInterval(() => {

    ACS_TIME.currentTime = computeSimTime();

    /* ============================================================
       🕒 ACS TIME SNAPSHOT SAVE (FOR 24/7 RECOVERY)
       ============================================================ */
    try {
      localStorage.setItem("ACS_LAST_REAL_TIME", Date.now());
      localStorage.setItem("ACS_LAST_SIM_TIME", ACS_TIME.currentTime);
    } catch (e) {
      console.warn("⚠️ ACS TIME SNAPSHOT FAILED:", e);
    }

    // Stop at world end
    if (ACS_TIME.currentTime >= SIM_END) {
      ACS_TIME.currentTime = new Date("2025-12-31T23:59:00Z");
      stopACSTime();
      updateClockDisplay();
      notifyTimeListeners();
      return;
    }

    updateClockDisplay();
    notifyTimeListeners();

  }, 1000);
}

/* ============================================================
   === PAUSE SIMULATION =======================================
   ============================================================ */

function stopACSTime() {

  if (ACS_TIME.tickInterval) {
    clearInterval(ACS_TIME.tickInterval);
  }

  ACS_TIME.tickInterval = null;

  // 🔓 release engine lock
  ACS_TIME_ENGINE_RUNNING = false;

}

/* ============================================================
   === TOGGLE SIMULATION (ADMIN ONLY) =========================
   ============================================================ */

function toggleSimState() {
  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  if (user.email !== "aviationcapitalsim@gmail.com") {
    alert("⛔ Only admin can toggle the simulation state.");
    return;
  }

  if (ACS_CYCLE.status === "ON") {
    /* === FREEZE === */
    ACS_TIME.currentTime = computeSimTime();
    localStorage.setItem("acs_frozen_time", ACS_TIME.currentTime.toISOString());

    ACS_CYCLE.status = "OFF";
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

    stopACSTime();
    updateClockDisplay();
    notifyTimeListeners();

    alert("⏸️ Time frozen.");
  } else {
    /* === RESUME === */
    const frozen = new Date(localStorage.getItem("acs_frozen_time"));
    const now = new Date();

    const simMinutes = Math.floor((frozen - SIM_START) / 60000);
    const newRealStart = new Date(now - simMinutes * 1000);

    ACS_CYCLE.realStartDate = newRealStart.toISOString();
    ACS_CYCLE.status = "ON";
    localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

    startACSTime();

    alert("▶️ Time resumed.");
  }

  /* ======================================================
     📌 UPDATE VISUAL STATUS IN SETTINGS IMMEDIATELY
     ====================================================== */
  const simStatus = document.getElementById("simStatus");
  if (simStatus) {
    simStatus.textContent = ACS_CYCLE.status.toUpperCase();
    simStatus.style.color = ACS_CYCLE.status === "ON" ? "#00ff80" : "#ff4040";
  }

  // Actualizar también el Start Date sin refrescar la página
  if (typeof refreshSimPanel === "function") {
    setTimeout(refreshSimPanel, 50);
  }
}

/* ============================================================
   === RESET COMPLETE SIMULATION ==============================
   ============================================================ */

function resetSimulationData() {
  const users = localStorage.getItem("ACS_users");
  localStorage.clear();
  if (users) localStorage.setItem("ACS_users", users);

  ACS_CYCLE = {
    realStartDate: null,
    status: "OFF",
  };
  localStorage.setItem("ACS_Cycle", JSON.stringify(ACS_CYCLE));

  ACS_TIME.currentTime = new Date(SIM_START);
  localStorage.setItem("acs_frozen_time", ACS_TIME.currentTime.toISOString());

  localStorage.setItem("acs_reset", Date.now());

  stopACSTime();
  updateClockDisplay();
  notifyTimeListeners();

  alert("♻️ ACS reset to 1940 — Simulation OFF.");
}

function updateClockDisplay() {
  const el = document.getElementById("acs-clock");
  if (!el) return;

  const t = ACS_TIME.currentTime;

  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mm = String(t.getUTCMinutes()).padStart(2, "0");

  const weekday = t
    .toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })
    .toUpperCase();

  const dd = String(t.getUTCDate()).padStart(2, "0");
  const mon = t.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const yy = t.getUTCFullYear();

  el.textContent = `${hh}:${mm} — ${weekday} ${dd} ${mon} ${yy}`;
  el.style.color = "#00ff80";
}

/* ============================================================
   ⚙️ PASO 5-C — B-CHECK ENGINE (GAME TIME) — 17DEC25
   ============================================================ */

function ACS_evaluateBCheck(ac, now) {

  // ⛔ Aviones antiguos o mal inicializados
  if (!ac.enteredFleetAt || !ac.bCheckDueAt) return;

  const DAY_MIN = 24 * 60;
  const WEEK_MIN = 7 * DAY_MIN;

  // 1️⃣ Aún no vence
  if (now < ac.bCheckDueAt) {
    ac.bCheckStatus = "ok";
    ac.isGrounded = false;
    return;
  }

  // 2️⃣ Venció y NO está planificado
  if (now >= ac.bCheckDueAt && !ac.bCheckPlanned) {
    ac.bCheckStatus = "overdue";
    ac.isGrounded = true;
    return;
  }

  // 3️⃣ Ejecutando B-Check (24h de juego)
  const execEnd = ac.bCheckDueAt + DAY_MIN;

  if (now >= ac.bCheckDueAt && now < execEnd) {
    ac.bCheckStatus = "in_progress";
    ac.isGrounded = true;
    return;
  }

  // 4️⃣ Finalizó B-Check
  if (now >= execEnd) {
    ac.bCheckStatus = "ok";
    ac.isGrounded = false;
    ac.bCheckPlanned = false;

    // Próximo B-Check automático
    ac.bCheckDueAt = execEnd + WEEK_MIN;
  }
}

/* ============================================================
   🔁 PASO 5-D — B-CHECK ENGINE LISTENER — 17DEC25
   ============================================================ */

registerTimeListener((currentTime) => {

  // Convertir a timestamp del juego
  const nowTs = currentTime.getTime();

  let fleet = [];
  if (typeof getRealFleet === "function") {
  fleet = getRealFleet();
  } else {
  // 🔕 Evitar crash del Time Engine
  fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
}

  let changed = false;

  fleet.forEach(ac => {
    const prevStatus = ac.bCheckStatus;
    const prevGround = ac.isGrounded;

    ACS_evaluateBCheck(ac, nowTs);

    if (ac.bCheckStatus !== prevStatus || ac.isGrounded !== prevGround) {
      changed = true;
    }
  });

  /* ============================================================
   🔐 SAFE FLEET SAVE CALL — Prevent ReferenceError
   Only saves if Fleet module is loaded
   ============================================================ */

if (changed && typeof saveFleet === "function") {
  saveFleet(fleet);
}
});

/* ============================================================
   === LISTENER SYSTEM =========================================
   ============================================================ */

function notifyTimeListeners() {
  for (const cb of ACS_TIME.listeners) cb(ACS_TIME.currentTime);
}

function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* ============================================================
   === ECONOMIC WATCHER =======================================
   ============================================================ */

function updateEconomicVariables(year) {
  let ticketFee = 0.06;
  let fuelUSD = 3.2;

  if (year < 1960) { ticketFee = 0.12; fuelUSD = 1.1; }
  else if (year < 1980) { ticketFee = 0.09; fuelUSD = 1.9; }
  else if (year < 2000) { ticketFee = 0.07; fuelUSD = 2.5; }
  else if (year < 2020) { ticketFee = 0.05; fuelUSD = 4.3; }
  else { ticketFee = 0.04; fuelUSD = 5.8; }

  if (typeof WorldAirportsACS !== "undefined") {
    for (const continent in WorldAirportsACS) {
      WorldAirportsACS[continent].forEach(a => {
        a.ticket_fee_percent = ticketFee;
        a.fuel_usd_gal = fuelUSD;
      });
    }
  }

  localStorage.setItem("acs_ticket_fee", ticketFee);
  localStorage.setItem("acs_fuel_price", fuelUSD);
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
   === INITIALIZATION (EVERY PAGE) =============================
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  // 🌍 Load world from server
  loadWorldState();

  if (ACS_CYCLE.status === "ON") {
    ACS_TIME.currentTime = computeSimTime();
    startACSTime();
  } else {

    const frozen = localStorage.getItem("acs_frozen_time");

    ACS_TIME.currentTime = frozen
      ? new Date(frozen)
      : ACS_TIME.currentTime;

    stopACSTime();
    updateClockDisplay();
  }

  economicWatcher();

});

/* ============================================================
   🟦 A2 — ACS TIME SNAPSHOT WRITER (24/7 CORE)
   - Saves REAL + SIM time on background / exit
   - Safari / iOS safe
   ============================================================ */

function ACS_saveTimeSnapshot() {
  try {
    // 🔵 REAL TIME → siempre número
    localStorage.setItem("ACS_LAST_REAL_TIME", Date.now());

    // 🔵 SIM TIME → FORZAR número (timestamp)
    let simTime = ACS_TIME.currentTime instanceof Date
      ? ACS_TIME.currentTime.getTime()
      : Number(ACS_TIME.currentTime);

    localStorage.setItem("ACS_LAST_SIM_TIME", simTime);

    console.log("🕒 ACS TIME SNAPSHOT SAVED (REAL + SIM)", {
      REAL: Date.now(),
      SIM: simTime
    });

  } catch (e) {
    console.warn("⚠️ TIME SNAPSHOT FAILED", e);
  }
}


/* ============================================================
   === TAB SYNC ================================================
   ============================================================ */
window.addEventListener("storage", (e) => {

  if (e.key === "ACS_Cycle") {

    const updated = JSON.parse(e.newValue || "{}");
    ACS_CYCLE = updated;

    // 🚫 Si acaba de ocurrir un master reset → NO iniciar reloj
    if (localStorage.getItem("ACS_NewCycle") === "true") {
      stopACSTime();
      const frozen = localStorage.getItem("acs_frozen_time");
      if (frozen) ACS_TIME.currentTime = new Date(frozen);
      updateClockDisplay();
      notifyTimeListeners();
      return; // ⛔ NO continuar
    }

    // 🔄 Estado real del ciclo
    if (ACS_CYCLE.status === "ON") {
      startACSTime();
    } else {
      stopACSTime();
      const frozen = localStorage.getItem("acs_frozen_time");
      if (frozen) ACS_TIME.currentTime = new Date(frozen);
      updateClockDisplay();
      notifyTimeListeners();
    }
  }

  if (e.key === "acs_reset") {
    ACS_TIME.currentTime = new Date(SIM_START);
    localStorage.setItem("acs_frozen_time", SIM_START.toISOString());
    stopACSTime();
    updateClockDisplay();
    notifyTimeListeners();
  }

});

/* ============================================================
   === ACS - My Aircraft Module  =======================
   Version: 1.2 (Unified)
   Date: 2025-01-01
   ------------------------------------------------------------
   • Unificado con Buy New + Used Market
   • Usa la clave estándar ACS_MyAircraft
   • Sincronizado con Delivery Engine y Time Engine
   • Render FR24 / SkyOS style
   • Filtros completos
   • Modal funcional
   • 4 filas vacías cuando no hay flota
   ============================================================ */

// === STORAGE KEY ===

const ACS_FLEET_KEY = "ACS_MyAircraft";

/* ============================================================
   🟦 MA-1 — HYBRID MAINTENANCE RULES (AVIATION REAL)
   ------------------------------------------------------------
   - C & D trabajan bajo el mismo motor
   - Vence por el primero que ocurra:
       • Calendar
       • Flight Hours
       • Flight Cycles
   - D reinicia también el ciclo C
   - Escalable para 700+ jugadores
   ============================================================ */

const ACS_MAINTENANCE_RULES = {

  // ───────────── C-CHECK ─────────────
  C_MONTHS: 12,
  C_HOURS: 1200,
  C_CYCLES: 1000,

  // ───────────── D-CHECK ─────────────
  D_MONTHS: 96,          // 8 years
  D_HOURS: 24000,
  D_CYCLES: 20000,

  // ───────────── DOWNTIME ─────────────
  C_RECOVERY_DAYS: 20,
  D_RECOVERY_DAYS: 100
};

/* ============================================================
   🟦 MA-8.8.A — MAINTENANCE COST TABLE (ERA-BASED)
   ------------------------------------------------------------
   Cost unit: USD per seat
   ------------------------------------------------------------
   Version: v1.0 | Date: 06 FEB 2026
   ============================================================ */

const ACS_MAINTENANCE_COSTS_BY_ERA = [
  { from: 1940, to: 1959, C: 400,  D: 2000 },
  { from: 1960, to: 1979, C: 700,  D: 3500 },
  { from: 1980, to: 1999, C: 1000, D: 5000 },
  { from: 2000, to: 2015, C: 1200, D: 6000 },
  { from: 2016, to: 2026, C: 1500, D: 7500 }
];

/* ============================================================
   🟦 C.1 — Cargar flota ACTIVA (STORAGE) + Fleet View (UI)
   ------------------------------------------------------------
   Rule:
   - fleet      = SOLO flota real guardada en ACS_MyAircraft
   - fleetView  = SOLO vista UI (pending rows + fleet real)
   - saveFleet() JAMÁS guarda filas pending UI
   ============================================================ */

let fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");

// ✅ UI-only buffer (no se guarda en localStorage)
let fleetView = null;

/* Guardar cambios correctamente (SOLO STORAGE FLEET) */
function saveFleet() {
  localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleet));
}

/* ============================================================
   🟦 MA-STRUCT-LEGACY — STRUCTURAL FLEET MIGRATION LAYER
   ------------------------------------------------------------
   Purpose:
   - Normalizar cualquier aeronave legacy
   - Garantizar integridad estructural total
   - No modificar aeronaves ya correctas
   ------------------------------------------------------------
   Version: v1.0
   ============================================================ */

function ACS_structuralFleetMigration() {

  let fleetData = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  let changed = false;

  fleetData.forEach((ac, index) => {

    if (!ac || typeof ac !== "object") return;

    // 🟢 1 — ID obligatorio
    if (!ac.id || typeof ac.id !== "string") {
      ac.id = `AC-${Date.now()}-${index}`;
      changed = true;
    }

    // 🟢 2 — Status obligatorio
    if (!ac.status) {
      ac.status = "Active";
      changed = true;
    }

    // 🟢 3 — Registration obligatoria
    if (!ac.registration) {
      if (typeof ACS_generateRegistration === "function") {
        ac.registration = ACS_generateRegistration();
        changed = true;
      }
    }

    // 🟢 4 — Base obligatoria
    if (!ac.base && typeof getCurrentBaseICAO === "function") {
      ac.base = getCurrentBaseICAO();
      changed = true;
    }

    // 🟢 5 — Campos mínimos mantenimiento
    if (ac.hours === undefined) {
      ac.hours = 0;
      changed = true;
    }

    if (ac.cycles === undefined) {
      ac.cycles = 0;
      changed = true;
    }

    if (ac.conditionPercent === undefined) {
      ac.conditionPercent = 100;
      changed = true;
    }

  });

  if (changed) {
    localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleetData));
    console.log("🟢 Fleet structural migration applied.");
  }

  return fleetData;
}

/* ============================================================
   🟦 C.1.1 — UI Fleet Source (Active + Pending)
   ============================================================ */

function ACS_getFleetForUI() {
  return Array.isArray(fleetView) ? fleetView : fleet;
}

/* ============================================================
   🟥 MA-0 — SIM TIME ADAPTER (SINGLE SOURCE)
   ------------------------------------------------------------
   Fix:
   - Si ACS_getSimTime no existe, usamos el reloj visible #acs-clock
   - Garantiza que MODAL + PIPELINE usen el MISMO tiempo del juego
   ============================================================ */

function getSimTime() {

  // 1) Fuente oficial si existe
  if (window.ACS_getSimTime && typeof window.ACS_getSimTime === "function") {
    const t = window.ACS_getSimTime();
    return new Date(t);
  }

  // 2) Fallback: parsear el reloj visible del header (AUTORIDAD UI)
  // Ej: "20:16 — MON 10 FEB 1941"
  const el = document.getElementById("acs-clock");
  if (el && typeof el.textContent === "string") {
    const txt = el.textContent.trim();

    // Extraer "HH:MM" y "DD MON YYYY"
    // Permitimos variaciones leves
    const m = txt.match(/(\d{1,2}):(\d{2}).*?(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
    if (m) {
      const hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const dd = parseInt(m[3], 10);
      const monStr = String(m[4]).toUpperCase();
      const yyyy = parseInt(m[5], 10);

      const months = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
      };

      if (months[monStr] !== undefined) {
        return new Date(Date.UTC(yyyy, months[monStr], dd, hh, mm, 0));
      }
    }
  }

  // 3) Último fallback seguro
  return new Date("1940-01-01T00:00:00Z");
}


/* ============================================================
   🟦 MA-MON1 — TIME TICK MONITOR (ONCE PER SIM DAY)
   ------------------------------------------------------------
   Purpose:
   - Confirmar que el pipeline corre por día simulado
   - Evitar spam por ticks/minutos
   ============================================================ */

function ACS_logMaintenanceTickOncePerDay() {
  const now = getSimTime();
  const day = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const key = "ACS_MA_LAST_LOG_DAY";

  if (localStorage.getItem(key) === day) return;

  localStorage.setItem(key, day);
  console.log(`🕒 MA TICK OK — ${day} | fleet=${(fleet && fleet.length) || 0}`);
}

/* ============================================================
   🟧 MA-8.2 — MAINTENANCE DATE HELPERS
   ============================================================ */

function ACS_getNextCheckDate(lastDateISO, months) {
  if (!lastDateISO) return null;
  const d = new Date(lastDateISO);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function ACS_getRemainingMonths(targetDate) {
  if (!targetDate) return "—";

  const now = getSimTime();

  const diff =
    (targetDate.getUTCFullYear() - now.getUTCFullYear()) * 12 +
    (targetDate.getUTCMonth() - now.getUTCMonth());

  return diff >= 0 ? `${diff} months` : "OVERDUE";
}

/* ============================================================
   🟩 MA-1 — BASE RESOLVER (ACS SINGLE SOURCE OF TRUTH)
   ------------------------------------------------------------
   Rule:
   - MyAircraft NEVER invents base
   - Base MUST come from choose_base (ACS_activeUser)
   - No silent fallbacks
   ------------------------------------------------------------
   Version: v1.1 | Date: 05 FEB 2026
   ============================================================ */

function getCurrentBaseICAO() {

  let user;

  try {
    user = JSON.parse(localStorage.getItem("ACS_activeUser"));
  } catch (e) {
    throw new Error("❌ Invalid ACS_activeUser JSON");
  }

  if (
    !user ||
    !user.base ||
    !user.base.icao ||
    user.base.icao.length !== 4
  ) {
    throw new Error(
      "❌ COMPANY BASE NOT SET — choose_base.html must be completed first"
    );
  }

  return user.base.icao.toUpperCase();
}

/* ============================================================
   🟦 A8 — AIRCRAFT ENRICHMENT ENGINE (DB → FLEET)
   ------------------------------------------------------------
   • Copia specs técnicos desde ACS_AIRCRAFT_DB
   • Se ejecuta SOLO cuando el avión entra a la flota
   • No recalcula ni pisa datos existentes
   • Source of truth: ACS_MyAircraft
   ============================================================ */

function ACS_enrichAircraftFromDB(aircraft) {

  if (!aircraft || !aircraft.manufacturer || !aircraft.model) {
    console.warn("⚠️ Enrichment skipped: invalid aircraft object");
    return aircraft;
  }

  // 🔎 Buscar match primero
   
/* ============================================================
   🔎 DB ACCESS SAFE RESOLUTION
   Ensures DB is found regardless of scope mode
   ============================================================ */

let db = null;

if (typeof ACS_AIRCRAFT_DB !== "undefined") {
  db = ACS_AIRCRAFT_DB;
} else if (typeof window !== "undefined" && window.ACS_AIRCRAFT_DB) {
  db = window.ACS_AIRCRAFT_DB;
}

const match = Array.isArray(db)
  ? db.find(a =>
      a.manufacturer === aircraft.manufacturer &&
      a.model === aircraft.model
    )
  : null;

  if (!match) {
    console.error(
      `❌ CRITICAL: Aircraft DB match NOT FOUND for ${aircraft.manufacturer} ${aircraft.model}`
    );
    aircraft.__enrichError = true;
    return aircraft;
  }

  // ✅ Si ya coincide EXACTAMENTE con DB → no tocar
  if (
    aircraft.seats === match.seats &&
    aircraft.speed_kts === match.speed_kts &&
    aircraft.fuel_burn_kgph === match.fuel_burn_kgph
  ) {
    return aircraft;
  }

  // 🟢 Aplicar specs oficiales del DB
  aircraft.seats = match.seats;
  aircraft.range_nm = match.range_nm;
  aircraft.speed_kts = match.speed_kts;
  aircraft.fuel_burn_kgph = match.fuel_burn_kgph;
  aircraft.price_acs_usd = match.price_acs_usd;

  aircraft.year = aircraft.year ?? match.year;
  aircraft.mtow_kg = aircraft.mtow_kg ?? match.mtow_kg;
  aircraft.engines = aircraft.engines ?? match.engines;

  console.log(
    `🟢 Aircraft enriched (DB authority): ${aircraft.manufacturer} ${aircraft.model} — ${aircraft.seats} seats`
  );

  return aircraft;
}

/* ============================================================
   🟦 MA-STRUCT-4 — updatePendingDeliveries() (ACS TIME SAFE)
   ------------------------------------------------------------
   • Usa exclusivamente getSimTime()
   • Repara fechas corruptas (ej: 2026 en era 1940)
   • Nunca usa reloj real
   ============================================================ */

function updatePendingDeliveries() {

  const now = getSimTime();
  let fleetStorage = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");

  let updated = false;

  fleetStorage.forEach(ac => {

    if (!ac || typeof ac !== "object") return;

    if (ac.status === "Pending") {

      // 🔎 Validar fecha
      let releaseDate = ac.pendingReleaseDate
        ? new Date(ac.pendingReleaseDate)
        : null;

      const invalidDate =
        !releaseDate ||
        isNaN(releaseDate.getTime()) ||
        releaseDate.getUTCFullYear() > now.getUTCFullYear() + 5 ||
        releaseDate.getUTCFullYear() < 1940;

      // 🔧 Si fecha inválida → reconstruir desde reloj ACS
      if (invalidDate) {

        const DELIVERY_DAYS = 7; // usa aquí tu valor real si es dinámico

        releaseDate = new Date(
          now.getTime() + DELIVERY_DAYS * 86400000
        );

        ac.pendingReleaseDate = releaseDate.toISOString();
        updated = true;
      }

      // 🔵 Activar si llegó fecha
       
      if (releaseDate <= now) {

  ac.status = "Active";
  ac.deliveredDate = releaseDate.toISOString();
  delete ac.pendingReleaseDate;

  updated = true;
}
    }
  });

  if (updated) {
    localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleetStorage));
  }

  fleet = fleetStorage;
  fleetView = fleetStorage;
}
  
/* ============================================================
   🟦 HR SAFETY INIT — Garantizar estructura ACS_HR
   ------------------------------------------------------------
   • Evita errores cuando ACS_HR no existe
   • Crea todos los departamentos con default = 0
   ============================================================ */

(function ensureHRexists() {

  const templateHR = {
    pilots_small:       { required: 0, hired: 0 },
    pilots_medium:      { required: 0, hired: 0 },
    pilots_large:       { required: 0, hired: 0 },
    pilots_verylarge:   { required: 0, hired: 0 },

    cabin_crew:         { required: 0, hired: 0 },
    maintenance:        { required: 0, hired: 0 },
    ground:             { required: 0, hired: 0 },
    flight_ops:         { required: 0, hired: 0 },
    safety:             { required: 0, hired: 0 },
    customer:           { required: 0, hired: 0 },

    // administrativos
    ceo:                { required: 0, hired: 1 },
    vp:                 { required: 0, hired: 0 },
    middle:             { required: 0, hired: 0 },
    economics:          { required: 0, hired: 0 },
    comms:              { required: 0, hired: 0 },
    admin:              { required: 0, hired: 0 }
  };

  let HR = JSON.parse(localStorage.getItem("ACS_HR") || "null");

  // Si no existe → lo creamos
  if (!HR || typeof HR !== "object") {
    localStorage.setItem("ACS_HR", JSON.stringify(templateHR));
    console.log("🟢 HR INIT: ACS_HR creado desde cero.");
    return;
  }

  // Si existe pero está incompleto → agregar faltantes
  let changed = false;
  for (let dep in templateHR) {
    if (!HR[dep]) {
      HR[dep] = templateHR[dep];
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem("ACS_HR", JSON.stringify(HR));
    console.log("🟡 HR INIT: ACS_HR actualizado (faltantes agregados).");
  }

})();

/* ============================================================
   🟦 HR SYNC ENGINE — Requirements Based on Fleet
   ------------------------------------------------------------
   • Calcula requerimientos de personal por cada avión activo
   • Actualiza ACS_HR.required para TODOS los departamentos
   • Compatible con Active / Pending / Future categories
   ============================================================ */

function HR_updateRequirementsFromFleet() {

  // === Cargar HR actual ===
   
  let HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}") || {};

// === Reset required de todos los departamentos ===
   
for (let dep in HR) {
    if (!HR[dep] || typeof HR[dep] !== "object") continue;
    HR[dep].required = 0;
}

  // === Procesar flota activa real ===
   
  fleet.forEach(ac => {

    if (ac.status !== "Active") return; // solo activos

    const model = ac.model.toLowerCase();

    /* ======================================================
       ➤ RULESET — Pilots
       ====================================================== */

    let pilotDept = null;

    if (model.includes("atr") || model.includes("crj") || model.includes("erj") || model.includes("dh8")) {
      pilotDept = "pilots_small";
    }
    else if (model.includes("a320") || model.includes("a319") || model.includes("b737")) {
      pilotDept = "pilots_medium";
    }
    else if (model.includes("a330") || model.includes("b767") || model.includes("a310")) {
      pilotDept = "pilots_large";
    }
    else if (model.includes("a340") || model.includes("a350") || model.includes("b777") || model.includes("b787") || model.includes("a380") || model.includes("b747")) {
      pilotDept = "pilots_verylarge";
    }

    if (pilotDept && HR[pilotDept]) {
      HR[pilotDept].required += 4;  // 2 crew sets
    }

    /* ======================================================
       ➤ Cabin Crew
       ====================================================== */

    let crewNeeded = 0;

    if (model.includes("atr") || model.includes("dh8")) crewNeeded = 3;
    else if (model.includes("a320") || model.includes("b737")) crewNeeded = 4;
    else if (model.includes("a330") || model.includes("b767")) crewNeeded = 6;
    else if (model.includes("a340") || model.includes("b777") || model.includes("a350")) crewNeeded = 8;
    else if (model.includes("b747") || model.includes("a380")) crewNeeded = 12;

    if (HR["cabin_crew"]) HR["cabin_crew"].required += crewNeeded;

    /* ======================================================
       ➤ Maintenance
       ====================================================== */

    let maint = 2;

    if (model.includes("a330") || model.includes("b767")) maint = 3;
    if (model.includes("a350") || model.includes("b777") || model.includes("b787")) maint = 4;

    if (HR["maintenance"]) HR["maintenance"].required += maint;

    /* ======================================================
       ➤ Ground Handling
       ====================================================== */

    if (HR["ground"]) HR["ground"].required += 2;

    /* ======================================================
       ➤ Flight Ops
       ====================================================== */

    if (HR["flight_ops"]) HR["flight_ops"].required += 1;

    /* ======================================================
       ➤ Safety & Security
       ====================================================== */

    if (HR["safety"]) HR["safety"].required += 1;

    /* ======================================================
       ➤ Customer Service
       ====================================================== */

    if (HR["customer"]) HR["customer"].required += 1;

  });

  // === Guardar HR actualizado ===
  localStorage.setItem("ACS_HR", JSON.stringify(HR));

  // === Refrescar tabla HR si estás en hr.html ===
  if (typeof HR_renderTable === "function") {
    HR_renderTable();
  }
}

/* ============================================================
   🟧 MA-4 — CONDITION LETTER RESOLVER (UI ONLY)
   ------------------------------------------------------------
   Purpose:
   - Traducir conditionPercent a A / B / C / D
   - SOLO presentación (NO guarda datos)
   ------------------------------------------------------------
   Version: v1.0
   ============================================================ */

function ACS_getConditionLetter(percent) {
  if (typeof percent !== "number") return "—";

  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  return "D";
}

/* ============================================================
   🧩 MA-8.5.A.H1 — SEEDED RNG (DETERMINISTIC)
   ------------------------------------------------------------
   Purpose:
   - Generar valores “random” pero determinísticos por aeronave
   - Evita que cambie en cada refresh
   ============================================================ */

function ACS_xmur3(str){
  let h = 1779033703 ^ (str ? str.length : 0);
  for (let i = 0; i < (str ? str.length : 0); i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= (h >>> 16)) >>> 0;
  };
}

function ACS_mulberry32(a){
  return function(){
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   🟧 MA-8.5.A — MAINTENANCE BASELINE ENGINE (C & D) [FIXED]
   ------------------------------------------------------------
   Purpose:
   - Crear baseline técnico de mantenimiento para aviones usados
   - Si es USED y no trae historial, generar:
       • hours/cycles realistas (si vienen 0)
       • lastCCheckDate / lastDCheckDate en el pasado
     (determinístico por aeronave)
   - Si es NEW, asegurar lastC/lastD desde delivery
   ------------------------------------------------------------
   Version: v1.1 | Date: 23 FEB 2026
   ============================================================ */

function ACS_applyMaintenanceBaseline(ac) {
  if (!ac) return ac;

  // 🟢 NORMALIZACIÓN ESTRUCTURAL
   
  if (ac.hours !== undefined) {
  ac.hours = Number(ac.hours);
  }
  if (ac.cycles !== undefined) {
  ac.cycles = Number(ac.cycles);
  }   
   
  // Si ya existe cualquier referencia de C o D, NO tocar baseline
   
  if (
    ac.baselineCHours !== undefined ||
    ac.baselineDHours !== undefined ||
    ac.lastCCheckDate ||
    ac.lastDCheckDate
  ) {
    return ac;
  }

  const now = getSimTime();

  // Seed determinístico por aeronave
  const seedKey =
    String(ac.registration || ac.reg || ac.id || "") +
    "|" + String(ac.model || "") +
    "|" + String(ac.enteredFleetAt || ac.deliveredDate || "");

  const seed = ACS_xmur3(seedKey)();
  const rnd = ACS_mulberry32(seed);

  // Intervalos (legacy baseline en horas)
  const C_INTERVAL_HOURS = 1200;   // C-Check baseline por horas (legacy)
  const D_INTERVAL_HOURS = 6000;   // D-Check baseline por horas (legacy)

  // Intervalos calendario (para fechas lastC/lastD)
  const MS_PER_DAY = 86400000;
  const C_INTERVAL_DAYS = ACS_MAINTENANCE_RULES.C_MONTHS * 30.4375;
  const D_INTERVAL_DAYS = ACS_MAINTENANCE_RULES.D_MONTHS * 30.4375;

  /* ===============================
     ✅ USED AIRCRAFT: generar historial real
     =============================== */
  if (ac.isUsed === true) {

    // 1) Hours/Cycles realistas si vienen en 0 / undefined
    let ageYears = 0;

    if (typeof ac.year === "number") {
    const simYear = getSimTime().getUTCFullYear();
    ageYears = Math.max(0, simYear - ac.year);
    }
     
    // rangos realistas por año (aprox):
    // - horas: 1,800–4,000 / año (según rnd)
    // - ciclos: 500–1,200 / año
    if (!(typeof ac.hours === "number" && isFinite(ac.hours) && ac.hours > 0)) {
      const perYearHours = 1800 + Math.floor(rnd() * 2200);
      ac.hours = Math.max(50, Math.round(ageYears * perYearHours));
    }

    if (!(typeof ac.cycles === "number" && isFinite(ac.cycles) && ac.cycles > 0)) {
      const perYearCycles = 500 + Math.floor(rnd() * 700);
      ac.cycles = Math.max(20, Math.round(ageYears * perYearCycles));
    }

    // 2) Baseline por horas (legacy)
    const baselineC = Math.floor(ac.hours / C_INTERVAL_HOURS) * C_INTERVAL_HOURS;
    const baselineD = Math.floor(ac.hours / D_INTERVAL_HOURS) * D_INTERVAL_HOURS;

    ac.baselineCHours = baselineC;
    ac.baselineDHours = baselineD;
    ac.maintenanceBaselineApplied = true;

    // 3) Generar lastC/lastD en el pasado (determinístico)
    // Ajuste ligero por condición: peor condición => más “cerca de vencer”
    const cond = (typeof ac.conditionPercent === "number" && isFinite(ac.conditionPercent)) ? ac.conditionPercent : 100;
    let condBias = 0;
    if (cond < 90) condBias += 0.05;
    if (cond < 80) condBias += 0.08;
    if (cond < 70) condBias += 0.10;

    // Fracción usada del intervalo (0..1). Más alto = más tiempo desde el último check
    // Para USED queremos que NO llegue “full fresh” siempre.
    let fracC = 0.20 + rnd() * 0.70 + condBias;   // 0.20..0.90(+)
    fracC = Math.max(0.05, Math.min(0.95, fracC));

    let fracD = 0.25 + rnd() * 0.65 + (condBias * 0.6); // 0.25..0.90(+)
    fracD = Math.max(0.10, Math.min(0.95, fracD));

    const daysSinceC = Math.floor(fracC * C_INTERVAL_DAYS);
    let daysSinceD = Math.floor(fracD * D_INTERVAL_DAYS);

    // D debe ser más antiguo que C (mínimo 30 días más viejo)
    if (daysSinceD < (daysSinceC + 30)) {
      daysSinceD = Math.min(Math.floor(D_INTERVAL_DAYS * 0.95), daysSinceC + 30);
    }

    const lastC = new Date(now.getTime() - (daysSinceC * MS_PER_DAY));
    const lastD = new Date(now.getTime() - (daysSinceD * MS_PER_DAY));

    ac.lastCCheckDate = lastC.toISOString();
    ac.lastDCheckDate = lastD.toISOString();

    return ac;
  }

  /* ===============================
     ✅ NEW AIRCRAFT: lastC/lastD = delivered
     =============================== */

  // Seguridad: asegurar hours numérico
  if (!(typeof ac.hours === "number" && isFinite(ac.hours))) {
    ac.hours = 0;
  }

  const baselineC = Math.floor(ac.hours / C_INTERVAL_HOURS) * C_INTERVAL_HOURS;
  const baselineD = Math.floor(ac.hours / D_INTERVAL_HOURS) * D_INTERVAL_HOURS;

  ac.baselineCHours = baselineC;
  ac.baselineDHours = baselineD;
  ac.maintenanceBaselineApplied = true;

  const deliveredISO = (() => {
    if (typeof ac.deliveredDate === "string" && ac.deliveredDate) return ac.deliveredDate;
    if (typeof ac.delivered === "string" && ac.delivered) return ac.delivered;
    if (typeof ac.enteredFleetAt === "number" && isFinite(ac.enteredFleetAt)) {
      return new Date(ac.enteredFleetAt).toISOString();
    }
    return now.toISOString();
  })();

  if (!ac.lastCCheckDate) ac.lastCCheckDate = deliveredISO;
  if (!ac.lastDCheckDate) ac.lastDCheckDate = deliveredISO;

  return ac;
}

function ACS_getMaintenancePolicy() {
  return {
    autoC: localStorage.getItem("autoCcheck") === "true",
    autoD: localStorage.getItem("autoDcheck") === "true"
  };
}

/* ============================================================
   🟦 MA-8.6.B — AUTO-EXECUTION HOOK (DAY-0 DETECTOR)
   ------------------------------------------------------------
   Purpose:
   - Detectar llegada EXACTA a día 0 de C o D
   - Consultar Settings (policy)
   - Marcar evento pendiente de ejecución
   ------------------------------------------------------------
   Notes:
   - NO ejecuta mantenimiento
   - NO cambia baseline
   - NO desbloquea avión
   ------------------------------------------------------------
   Version: v1.0 | Date: 05 FEB 2026
   ============================================================ */

function ACS_checkMaintenanceAutoTrigger(ac) {
  if (!ac) return ac;

  const status = ACS_resolveMaintenanceStatus(ac);
  const policy = ACS_getMaintenancePolicy();

  // Inicializar flags si no existen
  if (!ac.pendingCCheck) ac.pendingCCheck = false;
  if (!ac.pendingDCheck) ac.pendingDCheck = false;

  // 🔧 C CHECK — llega EXACTO a día 0
  if (status.nextC_days === 0) {
    if (policy.autoC) {
      ac.pendingCCheck = true;
    }
  }

  // 🔧 D CHECK — llega EXACTO a día 0
  if (status.nextD_days === 0) {
    if (policy.autoD) {
      ac.pendingDCheck = true;
    }
  }

  return ac;
}

/* ============================================================
   🟦 MA-2 — HYBRID MAINTENANCE RESOLVER (REAL AVIATION)
   ------------------------------------------------------------
   - C & D vencen por:
       • Calendar
       • Hours
       • Cycles
   - Se toma el menor remanente
   - D reinicia C (baseline ya controlado en completion)
   ============================================================ */

function ACS_resolveMaintenanceStatus(ac) {

  if (!ac) {
    return {
      nextC_days: null,
      nextD_days: null,
      isCOverdue: false,
      isDOverdue: false
    };
  }

  const now = getSimTime();

  const MS_PER_DAY = 86400000;

  /* ===============================
     LAST CHECK DATES
     =============================== */

  const lastC = ac.lastCCheckDate
    ? new Date(ac.lastCCheckDate)
    : new Date(ac.deliveredDate || now);

  const lastD = ac.lastDCheckDate
    ? new Date(ac.lastDCheckDate)
    : new Date(ac.deliveredDate || now);

  /* ===============================
     CALENDAR INTERVALS (AVIATION REAL)
     =============================== */

  const C_INTERVAL_DAYS = ACS_MAINTENANCE_RULES.C_MONTHS * 30.4375;
  const D_INTERVAL_DAYS = ACS_MAINTENANCE_RULES.D_MONTHS * 30.4375;

  const daysSinceC = (now - lastC) / MS_PER_DAY;
  const daysSinceD = (now - lastD) / MS_PER_DAY;

  const remainingC = Math.floor(C_INTERVAL_DAYS - daysSinceC);
  const remainingD = Math.floor(D_INTERVAL_DAYS - daysSinceD);

  return {
    nextC_days: remainingC,
    nextD_days: remainingD,
    isCOverdue: remainingC <= 0,
    isDOverdue: remainingD <= 0
  };
}

/* ============================================================
   🟥 MA-8.5.C — AUTO-GROUNDING LOGIC (C & D OVERDUE)
   ------------------------------------------------------------
   Purpose:
   - Detener automáticamente el avión si C o D está overdue
   - Marcar Maintenance Hold
   - El wear sigue (jugable)
   ------------------------------------------------------------
   Version: v1.0 | Date: 05 FEB 2026
   ============================================================ */

function ACS_applyMaintenanceHold(ac) {
  if (!ac) return ac;

  const m = ACS_resolveMaintenanceStatus(ac);

  if (m.isCOverdue || m.isDOverdue) {
    ac.maintenanceHold = true;
    ac.status = "Maintenance Hold";
    ac.maintenanceOverdue = true;
  } else {
    ac.maintenanceHold = false;
    ac.maintenanceOverdue = false;
  }

  return ac;
}

/* ============================================================
   🟩 MA-8.6.D1 — MAINTENANCE EXECUTION ENGINE (START ONLY)
   ------------------------------------------------------------
   Fix:
   - NO resetea baseline/lastCheck al inicio
   - Solo inicia el servicio y fija maintenanceEndDate
   - El reset real ocurre al COMPLETAR (ver MA-8.6.D2)
   ------------------------------------------------------------
   Version: v1.2 | Date: 06 FEB 2026
   ============================================================ */

function ACS_executeMaintenance(ac, type = "C") {
  if (!ac || !type) return ac;

  const now = getSimTime();

  // ⚠️ PROTECCIÓN: si ya está en mantenimiento, NO volver a ejecutar ni cobrar
  if (ac.status === "Maintenance") {
    return ac;
  }

  // Duraciones (días de simulación)
  const C_DOWNTIME_DAYS = ACS_MAINTENANCE_RULES.C_CHECK_RECOVERY; // 20
  const D_DOWNTIME_DAYS = ACS_MAINTENANCE_RULES.D_CHECK_RECOVERY; // 100


/* ============================================================
   🟧 MA-LOG-2 — WRITE MAINTENANCE START EVENT
   ------------------------------------------------------------
   Trigger:
   - Called ONLY when a C / D check STARTS
   - Uses snapshot from MA-LOG-1
   - Writes immutable START event to log
   ------------------------------------------------------------
   Version: v1.0 | Date: 08 FEB 2026
   ============================================================ */

(function writeMaintenanceStartLog(){

  // Evitar duplicados si algo intenta re-entrar
  if (ac.__maintenanceLogStarted) return;

  const snapshot = ACS_createMaintenanceSnapshot(ac, type);
  if (!snapshot) return;

  const LOG_KEY = "ACS_MAINTENANCE_LOG";

  const logs = JSON.parse(localStorage.getItem(LOG_KEY) || "{}");

  if (!logs[ac.registration]) {
    logs[ac.registration] = [];
  }

  logs[ac.registration].push(snapshot);

  localStorage.setItem(LOG_KEY, JSON.stringify(logs));

  // Marcar para evitar doble escritura
  ac.__maintenanceLogStarted = true;

})();
   
  const cost = snapshot.totalCost;

  if (cost > 0) {
    if (typeof ACS_registerExpense === "function") {
      ACS_registerExpense({
        category: "Maintenance",
        subtype: `${type}-Check`,
        aircraftId: ac.id,
        registration: ac.registration,
        amount: cost,
        currency: "USD",
        date: now.toISOString()
      });
    }
    ac.lastMaintenanceCost = cost;
  }

  // ✅ INICIAR SERVICIO (sin reset aún)
   
  ac.status = "Maintenance";
  ac.maintenanceType = type;     // "C" | "D"
  ac.serviceType = type;         // ✅ NUEVO: "C" | "D"
  ac.maintenanceStartDate = now.toISOString();

  const days = (type === "D") ? D_DOWNTIME_DAYS : C_DOWNTIME_DAYS;

  ac.maintenanceEndDate = new Date(
    now.getTime() + days * 24 * 60 * 60 * 1000
  ).toISOString();

  // Limpieza flags (el hold se libera al iniciar servicio)
  ac.maintenanceHold = false;
  ac.maintenanceOverdue = false;

  // Reset pending flags
  if (type === "C") ac.pendingCCheck = false;
  if (type === "D") { ac.pendingDCheck = false; ac.pendingCCheck = false; }

  return ac;
}

/* ============================================================
   🟩 MA-8.8.B — MAINTENANCE COST RESOLVER
   ------------------------------------------------------------
   Purpose:
   - Calcular costo real de C / D por avión
   - Basado en época + número de asientos
   ------------------------------------------------------------
   Version: v1.0 | Date: 06 FEB 2026
   ============================================================ */

function ACS_calculateMaintenanceCost(ac, type = "C") {
  if (!ac || !type) return 0;

  const year = getSimTime().getUTCFullYear();
  const seats = ac.seats || 0;

  const era = ACS_MAINTENANCE_COSTS_BY_ERA.find(
    e => year >= e.from && year <= e.to
  );

  if (!era) return 0;

  const unitCost = era[type];
  if (!unitCost) return 0;

  return Math.round(unitCost * seats);
}

/* ============================================================
   🟦 MA-LOG-1 — MAINTENANCE SNAPSHOT & ERA RESOLVER (CANON)
   ------------------------------------------------------------
   Purpose:
   - Calcular y CONGELAR el costo real de C / D
   - Basado en ERA + SEATS
   - Ejecuta UNA SOLA VEZ (al START)
   - Devuelve objeto INMUTABLE para Log / Finance
   ------------------------------------------------------------
   Version: v1.0 | Date: 08 FEB 2026
   ============================================================ */

function ACS_createMaintenanceSnapshot(ac, type = "C") {
  if (!ac || !type) return null;

  const now = getSimTime();
  const year = now.getUTCFullYear();

  // Resolver ERA activa
  const eraObj = ACS_MAINTENANCE_COSTS_BY_ERA.find(
    e => year >= e.from && year <= e.to
  );

  if (!eraObj) {
    console.warn("⚠️ MA-LOG: Era not found for year", year);
    return null;
  }

  const seats = Number(ac.seats || 0);
  const unitCost = Number(eraObj[type] || 0);
  const totalCost = Math.round(seats * unitCost);

  const eraLabel = `${eraObj.from}–${eraObj.to}`;

  const eventId =
    "MA_" +
    year +
    "_" +
    Math.random().toString(36).substring(2, 8).toUpperCase();

  return {
    id: eventId,
    registration: ac.registration,
    aircraftId: ac.id || null,

    type: type,           // "C" | "D"
    phase: "START",

    year: year,
    era: eraLabel,

    seats: seats,
    unitCost: unitCost,
    totalCost: totalCost,
    currency: "USD",

    base: ac.base || "—",

    startDate: now.toISOString(),
    endDate: null,

    status: "IN_PROGRESS"
  };
}

/* ============================================================
   🟦 MA-8.7.A — DAILY GROUND AGING ENGINE (QUANTIZED)
   ------------------------------------------------------------
   Fix:
   - Evita decimales absurdos (95.86%)
   - Cuantiza conditionPercent a pasos de 0.5%
   - Mantiene desgaste realista y estable
   - NO toca lógica de Maintenance
   ============================================================ */

function ACS_applyDailyAging(ac) {
  if (!ac) return ac;

  // Estados que NO envejecen
  if (
    ac.status === "Maintenance" ||
    ac.status === "Pending Delivery"
  ) {
    return ac;
  }

  const now = getSimTime();
  const simDay = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Inicializar marcador diario
  if (!ac.lastAgingDay) {
    ac.lastAgingDay = simDay;
    return ac;
  }

  // ⛔ Mismo día → no repetir
  if (ac.lastAgingDay === simDay) {
    return ac;
  }

  /* ======================================================
     Aging PASIVO en tierra (NO horas)
     ====================================================== */

  if (ac.status === "Maintenance Hold" || !ac.isFlying) {

    ac.groundDays = (ac.groundDays || 0) + 1;

    // Desgaste leve diario
    const DAILY_CONDITION_LOSS = 0.05; // % real

    if (typeof ac.conditionPercent === "number") {

      let raw = ac.conditionPercent - DAILY_CONDITION_LOSS;

      // 🟨 CUANTIZACIÓN REALISTA (0.5%)
      const STEP = 0.5;
      raw = Math.round(raw / STEP) * STEP;

      // Clamp de seguridad
      ac.conditionPercent = Math.max(0, Math.min(100, raw));
    }
  }

  ac.lastAgingDay = simDay;
  return ac;
}

/* ============================================================
   🛫 MA-8.7.B — GROUND TIME ACCRUAL ENGINE (HYBRID)
   ------------------------------------------------------------
   Purpose:
   - Evitar congelamiento de mantenimiento sin vuelos
   - Simular pruebas en tierra, taxi, ferry, APU
   - Complementa SkyTrack (NO lo reemplaza)
   ------------------------------------------------------------
   Rules:
   - Solo aviones Active
   - NO Maintenance / NO Pending
   - NO en vuelo
   - Muy lento (realista)
   ============================================================ */

function ACS_applyGroundTimeAccrual(ac) {
  if (!ac) return ac;

  // Estados que NO acumulan horas
  if (
    ac.status !== "Active" ||
    ac.isFlying === true
  ) {
    return ac;
  }

  const now = getSimTime();
  const simDay = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Inicializar marcador diario
  if (!ac.lastGroundAccrualDay) {
    ac.lastGroundAccrualDay = simDay;
    return ac;
  }

  // ⛔ Mismo día → no repetir
  if (ac.lastGroundAccrualDay === simDay) {
    return ac;
  }

  /* ======================================================
     Ground Accrual (HYBRID MODE)
     ====================================================== */

  const GROUND_HOURS_PER_DAY = 0.25; // MUY lento
  const CYCLE_EVERY_DAYS = 4;        // 1 ciclo cada 4 días

  // Incrementar horas
  if (typeof ac.hours === "number") {
    ac.hours = Math.round((ac.hours + GROUND_HOURS_PER_DAY) * 100) / 100;
  }

  // Incrementar ciclos cada N días
  ac._groundCycleCounter = (ac._groundCycleCounter || 0) + 1;
  if (ac._groundCycleCounter >= CYCLE_EVERY_DAYS) {
    ac.cycles = (ac.cycles || 0) + 1;
    ac._groundCycleCounter = 0;
  }

  ac.lastGroundAccrualDay = simDay;

  return ac;
}

/* ============================================================
   🅿️ MA-8.7.C — IDLE CALENDAR DEGRADATION (REAL AVIATION)
   ------------------------------------------------------------
   Purpose:
   - Diferenciar turnaround vs avión realmente parado
   - Degradar por calendario SOLO si está idle real
   - Aplica a:
     • Idle sin rutas
     • Maintenance Hold
   - NO suma horas ni ciclos
   ------------------------------------------------------------
   Rules (CANON):
   - Idle = NO voló >= 48h  AND  NO tiene rutas
   - Turnaround corto NO degrada
   ============================================================ */

function ACS_applyIdleCalendarDegradation(ac) {
  if (!ac) return ac;

  const now = getSimTime();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Inicializar referencias
  if (!ac.lastCalendarCheckDay) {
    ac.lastCalendarCheckDay = today;
    return ac;
  }

  // ⛔ Mismo día → no repetir
  if (ac.lastCalendarCheckDay === today) {
    return ac;
  }

  /* ======================================================
     Determinar IDLE REAL
     ====================================================== */

  const HOURS_IDLE_THRESHOLD = 48;

  const lastFlight = ac.lastFlightAt
    ? new Date(ac.lastFlightAt)
    : null;

  const hoursSinceLastFlight = lastFlight
    ? (now - lastFlight) / 3600000
    : Infinity;

  const hasRoutesAssigned =
    typeof ac.hasRoutes === "boolean"
      ? ac.hasRoutes
      : false;

  const isIdleReal =
    hoursSinceLastFlight >= HOURS_IDLE_THRESHOLD &&
    hasRoutesAssigned === false;

  const isMaintenanceBlocked =
    ac.status === "Maintenance Hold" ||
    ac.status === "Maintenance";

  if (!isIdleReal && !isMaintenanceBlocked) {
    ac.lastCalendarCheckDay = today;
    return ac;
  }

  /* ======================================================
     Calendar Degradation (SLOW & REAL)
     ====================================================== */

  // 1) Condición por corrosión / inactividad
  const DAILY_IDLE_CONDITION_LOSS = 0.03; // % muy lento

  if (typeof ac.conditionPercent === "number") {
    let raw = ac.conditionPercent - DAILY_IDLE_CONDITION_LOSS;

    // Cuantizar a 0.5%
    const STEP = 0.5;
    raw = Math.round(raw / STEP) * STEP;

    ac.conditionPercent = Math.max(0, Math.min(100, raw));
  }

  // 2) Contadores calendario (para C/D por fecha)
  ac.calendarIdleDays = (ac.calendarIdleDays || 0) + 1;

  ac.lastCalendarCheckDay = today;
  return ac;
}

/* ============================================================
   🟧 MA-B1 — CALENDAR C/D PROGRESSION ENGINE (REAL AVIATION)
   ------------------------------------------------------------
   Purpose:
   - Hacer que C/D avancen por DÍAS cuando el avión está parado
   - NO usa horas
   - NO usa ciclos
   - NO depende del jugador
   ------------------------------------------------------------
   Rules:
   - Aplica si:
       • Maintenance Hold
       • Idle real (>=48h sin vuelo y sin rutas)
   - Se DETIENE solo cuando entra a Maintenance (C/D en curso)
   ============================================================ */

function ACS_applyCalendarMaintenanceProgress(ac) {
  if (!ac) return ac;

  const now = getSimTime();
  const today = now.toISOString().slice(0, 10);

  // Inicializar marcador diario
  if (!ac.lastCalendarMaintenanceDay) {
    ac.lastCalendarMaintenanceDay = today;
    return ac;
  }

  // ⛔ Mismo día → no repetir
  if (ac.lastCalendarMaintenanceDay === today) {
    return ac;
  }

  // ⛔ Si está en mantenimiento activo, el calendario SE PAUSA
  if (ac.status === "Maintenance") {
    ac.lastCalendarMaintenanceDay = today;
    return ac;
  }

  /* ===============================
     Determinar IDLE REAL
     =============================== */

  const lastFlight = ac.lastFlightAt
    ? new Date(ac.lastFlightAt)
    : null;

  const hoursSinceLastFlight = lastFlight
    ? (now - lastFlight) / 3600000
    : Infinity;

  const hasRoutesAssigned =
    typeof ac.hasRoutes === "boolean" ? ac.hasRoutes : false;

  const isIdleReal =
    hoursSinceLastFlight >= 48 &&
    hasRoutesAssigned === false;

  const isMaintenanceHold =
    ac.status === "Maintenance Hold";

  // ❌ No idle real ni hold → no corre calendario
  if (!isIdleReal && !isMaintenanceHold) {
    ac.lastCalendarMaintenanceDay = today;
    return ac;
  }

  /* ===============================
     Avanzar calendario técnico
     =============================== */

  ac.calendarMaintenanceDays =
    (ac.calendarMaintenanceDays || 0) + 1;

  // Aplicar impacto directo en C/D (por días)
  if (typeof ac.nextC_days === "number") {
    ac.nextC_days -= 1;
  }

  if (typeof ac.nextD_days === "number") {
    ac.nextD_days -= 1;
  }

  ac.lastCalendarMaintenanceDay = today;

  return ac;
}

/* ============================================================
   🟦 MA-8.5.2 — APPLY COMPUTED MAINTENANCE FIELDS (CALENDAR-SAFE)
   ------------------------------------------------------------
   FIX ESTRUCTURAL:
   - Elimina bloque duplicado fuera de función
   - Unifica formato decimal
   - Cierra correctamente la función
   ============================================================ */

function ACS_applyMaintenanceComputedFields(ac) {
  if (!ac) return ac;

  const m = ACS_resolveMaintenanceStatus(ac);

  const fmt = (days) => {
    if (days == null) return "—";
    if (days <= 0) return "OVERDUE";

    const months = days / 30.4375;
    if (months >= 12) {
      return `${(months / 12).toFixed(1)} years`;
    }
    return `${months.toFixed(1)} months`;
  };

  ac.nextC = fmt(m.nextC_days);
  ac.nextD = fmt(m.nextD_days);

  ac.nextC_days = m.nextC_days;
  ac.nextD_days = m.nextD_days;

  ac.nextC_overdue = m.isCOverdue;
  ac.nextD_overdue = m.isDOverdue;

  return ac;
}

/* ============================================================
   🟧 MA-8.7.D — IDLE STATUS VISUAL FEEDBACK (UI ONLY)
   ------------------------------------------------------------
   Purpose:
   - Mostrar feedback visual de avión parado
   - NO altera lógica, balance ni mantenimiento
   - Compatible con A & B Service (Schedule Table authority)
   ------------------------------------------------------------
   Version: v1.0 | Date: 07 FEB 2026
   ============================================================ */

function ACS_applyIdleVisualStatus(ac) {
  if (!ac) return ac;

  // Reset visual tag por defecto
  ac.idleTag = null;

  // Estados que NO deben mostrar idle
  if (
    ac.status === "Pending Delivery" ||
    ac.status === "Maintenance"
  ) {
    return ac;
  }

  const idleDays =
    typeof ac.calendarIdleDays === "number"
      ? ac.calendarIdleDays
      : (typeof ac.groundDays === "number" ? ac.groundDays : 0);

  // Mostrar solo si realmente relevante
  if (idleDays >= 7) {
    ac.idleTag = `IDLE ${idleDays}d`;
  }

  return ac;
}

/* ============================================================
   🟦 C.3 — Render Full Fleet Table (Active + Pending)
   FIXED STRUCTURE — 23 FEB 2026
   ============================================================ */

function renderFleetTable() {

  const list = ACS_getFleetForUI();
  fleetTableBody.innerHTML = "";

  if (!list || list.length === 0) {
    ensureEmptyRows();
    return;
  }

  list.forEach((ac, index) => {

  // 🔵 Aplicar pipeline
  ac = ACS_applyMaintenanceBaseline(ac);
  ac = ACS_applyMaintenanceHold(ac);
  ac = ACS_applyMaintenanceComputedFields(ac);

  // 🔴 FIX CRÍTICO — Persistir cambios en flota real
  const realIndex = fleet.findIndex(f => f.registration === ac.registration);
  if (realIndex !== -1) {
    fleet[realIndex] = ac;
  }

  if (!passesFilters(ac)) return;
     
    const row = document.createElement("tr");

   /* ============================================================
   🟦 ROW STATE CLASS — STRUCTURAL (Active / Pending)
   ============================================================ */

    if (ac.status === "Pending") {
    row.classList.add("pending-row");
    } else {
    row.classList.add("active-row");
    }

  row.innerHTML = `
  <td>${ac.registration}</td>

  <td class="aircraft-model-cell"
      style="
        cursor:pointer;
        color:#ffb300;
        font-weight:600;
        text-decoration:underline;
        transition:0.2s ease;
      "
      onmouseover="this.style.color='#ffd666'"
      onmouseout="this.style.color='#ffb300'"
      onclick="openAssetPanel('${ac.id}')">
    ${ac.model}
  </td>

  <td>
    ${
      (() => {
        let label = ac.status;
        return label;
      })()
    }
  </td>
`;
      if (ac.status === "Maintenance" && ac.maintenanceType) {
        label = ac.maintenanceType === "D"
          ? "D-Check"
          : "C-Check";
      }

      if (ac.status === "Maintenance Hold") {
        label = "Maintenance Hold";
      }

      if (ac.abServiceEndDate && ac.status === "Maintenance") {
        label = "A/B Service";
      }

      return `
        <span class="status-badge status-${String(label).replace(/\s+/g, "-").toLowerCase()}">
          ${label}
        </span>
      `;

    })()
  }
</td>

      <td>${ac.hours}</td>
      <td>${ac.cycles}</td>

      <td>
        ${typeof ac.conditionPercent === "number"
          ? ac.conditionPercent + "%"
          : "—"}
        ${ac.idleTag
          ? `<div class="idle-tag">${ac.idleTag}</div>`
          : ""}
      </td>

      <td class="${ac.nextC_overdue ? "overdue-text" : ""}">
        ${ac.nextC}
      </td>

      <td class="${ac.nextD_overdue ? "overdue-text" : ""}">
        ${ac.nextD}
      </td>

      <td>${ac.base}</td>

      <td>
        <button class="btn-action" onclick="openAircraftModal('${ac.isPending ? (ac.__pendingKey || "") : ac.registration}')">
          View
        </button>
      </td>
    `;

    fleetTableBody.appendChild(row);
  });
  saveFleet();   
}

/* ============================================================
   === FILTERS ================================================
   ============================================================ */

const fModel   = document.getElementById("filterModel");
const fFamily  = document.getElementById("filterFamily");
const fStatus  = document.getElementById("filterStatus");
const fCond    = document.getElementById("filterCondition");
const fAge     = document.getElementById("filterAge");
const fBase    = document.getElementById("filterBase");
const fSearch  = document.getElementById("searchInput");

function populateFilterOptions() {
   
  const models  = new Set();
  const families = new Set();
  const bases   = new Set();

  ACS_getFleetForUI().forEach(ac => {
    models.add(ac.model);
    families.add(ac.family || "");
    bases.add(ac.base || "");
  });

  const fill = (el, set) => {
    el.innerHTML = `<option value="">${el.id.replace("filter","")}</option>`;
    set.forEach(v => {
      if (typeof v === "string" && v.trim() !== "") {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        el.appendChild(opt);
      }
    });
  };

  fill(fModel, models);
  fill(fFamily, families);
  fill(fBase, bases);
}

function passesFilters(ac) {
   
  if (fModel.value && ac.model !== fModel.value) return false;
  if (fFamily.value && ac.family !== fFamily.value) return false;
  if (fStatus.value && ac.status !== fStatus.value) return false;

  if (fCond.value && ac.condition < Number(fCond.value)) return false;

  if (fAge.value) {
    const age = Number(ac.age || 0);
    if (fAge.value === "0-5"   && !(age <= 5)) return false;
    if (fAge.value === "5-10"  && !(age >= 5 && age <= 10)) return false;
    if (fAge.value === "10-20" && !(age >= 10 && age <= 20)) return false;
    if (fAge.value === "20+"   && !(age >= 20)) return false;
  }

  if (fBase.value && ac.base !== fBase.value) return false;

  const s = fSearch.value.toLowerCase();
  if (s && !(ac.registration + " " + ac.model).toLowerCase().includes(s)) return false;

  return true;
}

[fModel, fFamily, fStatus, fCond, fAge, fBase, fSearch].forEach(el => {
  el.addEventListener("input", () => renderFleetTable());
});

/* ============================================================
   === MODAL ===================================================
   ============================================================ */

const modal = document.getElementById("aircraftModal");

/* ============================================================
   🟩 MA-9.G — ACTIVE MODAL AIRCRAFT REG
   ============================================================ */
let ACS_ACTIVE_MODAL_REG = null;

/* ============================================================
   🟧 MA-8.5.1 — MODAL FRESH READ + C/D NORMALIZER
   ------------------------------------------------------------
   Fix:
   - El modal NO usa el objeto viejo en memoria.
   - Siempre re-lee ACS_MyAircraft desde localStorage.
   - Normaliza alias típicos de mantenimiento (por compatibilidad).
   ============================================================ */

function openAircraftModal(reg) {

 /* ============================================================
   🟢 FIX A1 — OPEN MODAL SUPPORT FOR ACTIVE + PENDING AIRCRAFT
   ------------------------------------------------------------
   Date: 21 FEB 2026
   Author: ACS Core Fix

   Purpose:
   - Permitir abrir modal para:
       • Active aircraft (ACS_MyAircraft)
       • Pending Delivery aircraft (ACS_PendingAircraft)
   ============================================================ */

const fleetLatest = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
const pendingLatest = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

// 1️⃣ Buscar primero en flota activa
let acRaw = fleetLatest.find(a => a.registration === reg);

// 2️⃣ Si no existe, buscar en Pending Delivery
if (!acRaw) {

  const pending = pendingLatest.find(a =>
  a.__pendingKey === reg ||   // ✅ NUEVO — identificador correcto
  a.registration === reg ||
  a.tempId === reg ||
  a.id === reg
);

if (pending) {

  /* ============================================================
     🟢 FIX FINAL — NORMALIZACIÓN COMPLETA PENDING AIRCRAFT
     Family ahora se resuelve desde la DATABASE (igual que Active)
     ============================================================ */

  // 🔎 Buscar en la base oficial
  const db = (typeof resolveAircraftDB === "function")
    ? resolveAircraftDB()
    : [];

  const dbMatch = db.find(m =>
    m.manufacturer === pending.manufacturer &&
    m.model === pending.model
  );

  acRaw = {

    // identidad
    registration: "—",

    manufacturer: pending.manufacturer || "",
    model: pending.model || "—",

    // ✅ FIX FAMILY (YA NO USA pending.type → "BUY")
    family:
      dbMatch?.family ||
      pending.manufacturer ||
      (pending.model ? pending.model.split(" ")[0] : "—"),

    // FIX BASE (igual que tenías)
    base:
      pending.base ||
      pending.baseIcao ||
      pending.deliveryBase ||
      pending.baseICAO ||
      (typeof getCurrentBaseICAO === "function"
        ? getCurrentBaseICAO()
        : "—"),

    status: "Pending Delivery",

    deliveryDate: pending.deliveryDate || null,
    deliveredDate: null,

    conditionPercent: pending.conditionPercent ?? 100,

    hours: pending.hours ?? 0,
    cycles: pending.cycles ?? 0,
    age: pending.age ?? 0,

    lastCCheckDate: null,
    lastDCheckDate: null,

    isPending: true
  };

}

}

// 3️⃣ Seguridad final
if (!acRaw) return;

  // ✅ 2) Copia segura (no mutar directo el objeto de storage aquí)
   
  let ac = { ...acRaw };

// 🟢 Ensure aircraft is enriched (seats, specs)
if (typeof ACS_enrichAircraftFromDB === "function") {
  ac = ACS_enrichAircraftFromDB(ac);
}

  /* ============================================================
   🟢 FIX CORE — MODAL IDENTITY RESOLVER (ACTIVE + PENDING SAFE)
   ------------------------------------------------------------
   Date: 21 FEB 2026
   Purpose:
   - El modal usa SIEMPRE el ID correcto
   - Pending aircraft usa __pendingKey
   - Active aircraft usa registration
   ============================================================ */

ACS_ACTIVE_MODAL_REG =
  ac.isPending === true
    ? (reg)   // ← CRÍTICO: usar el pendingKey original
    : ac.registration;

  // ✅ 3) Normalización de campos C/D
  if (!ac.lastCCheckDate) {
    ac.lastCCheckDate =
      ac.lastC ||
      (ac.maintenance && (ac.maintenance.lastCCheckDate || ac.maintenance.lastC)) ||
      null;
  }
  if (!ac.lastDCheckDate) {
    ac.lastDCheckDate =
      ac.lastD ||
      (ac.maintenance && (ac.maintenance.lastDCheckDate || ac.maintenance.lastD)) ||
      null;
  }

  // ✅ 4) Pintar modal
  document.getElementById("modalTitle").textContent = `${ac.model} — ${ac.registration}`;
  document.getElementById("mReg").textContent = ac.registration;
  document.getElementById("mModel").textContent = ac.model;
  document.getElementById("mFamily").textContent = ac.family || ac.manufacturer || (ac.model ? ac.model.split(" ")[0] : "—");
  document.getElementById("mBase").textContent = ac.base || ac.baseIcao || ac.deliveryBase || "—";
  
   /* ============================================================
   🟧 FIX B4 — STATUS COLOR RESOLVER (PENDING / ACTIVE)
   ============================================================ */

const mStatusEl = document.getElementById("mStatus");

mStatusEl.textContent = ac.status || "—";

if (ac.status === "Pending Delivery") {

  mStatusEl.style.color = "#f1b21a"; // amarillo ACS Pending
  mStatusEl.style.fontWeight = "600";

}
else {

  mStatusEl.style.color = "#3ddc97"; // verde ACS Active
  mStatusEl.style.fontWeight = "600";

}

/* ============================================================
   🟦 DELIVERY DATE RENDER — ACS TIME ENGINE AUTHORITY
   ------------------------------------------------------------
   • Usa exclusivamente getSimTime()
   • Ignora fechas corruptas (>= 2000)
   • Calcula fecha desde reloj ACS
   ============================================================ */

(function renderDeliveryCountdown(){

  const elDelivery = document.getElementById("mDeliveryDate");
  if (!elDelivery) return;

  if (ac.status !== "Pending" && ac.status !== "Pending Delivery") {
    elDelivery.textContent = "—";
    return;
  }

  const simNow = getSimTime();
  const DELIVERY_DAYS = 7; // usa aquí tu valor real si es dinámico

  let releaseDate = null;

  // Si existe fecha válida dentro del rango histórico ACS (1940–2030)
  if (ac.pendingReleaseDate) {

    const parsed = new Date(ac.pendingReleaseDate);
    const year = parsed.getUTCFullYear();

    if (year >= 1940 && year <= 2030) {
      releaseDate = parsed;
    }
  }

  // Si la fecha es inválida o corrupta (ej: 2026 cuando estás en 1940)
  if (!releaseDate) {
    releaseDate = new Date(
      simNow.getTime() + DELIVERY_DAYS * 86400000
    );
  }

  const DD  = String(releaseDate.getUTCDate()).padStart(2, "0");
  const MON = releaseDate.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const YY  = releaseDate.getUTCFullYear();

  elDelivery.textContent = `${DD} ${MON} ${YY}`;

})();
   
  if (ac.deliveredDate) {
    const dd = new Date(ac.deliveredDate);
    document.getElementById("mDeliveredDate").textContent = dd.toUTCString().substring(5, 16);
  } else {
    document.getElementById("mDeliveredDate").textContent = "—";
  }

  if (typeof ac.conditionPercent === "number") {
    const letter = ACS_getConditionLetter(ac.conditionPercent);
    document.getElementById("mCondition").textContent = `${ac.conditionPercent}% (${letter})`;
  } else {
    document.getElementById("mCondition").textContent = "—";
  }

  document.getElementById("mHours").textContent = ac.hours || 0;
  document.getElementById("mCycles").textContent = ac.cycles || 0;
  document.getElementById("mAge").textContent = ac.age || "—";
  
/* ============================================================
🟦 MODAL AGE RESOLVER — UNIFIED (ACTIVE + PENDING)
------------------------------------------------------------
• Edad calculada siempre desde ac.year
• Basado en reloj ACS
============================================================ */

(function resolveModalAge(){

  const elAge = document.getElementById("mAge");
  if (!elAge) return;

  if (typeof ac.year === "number") {

    const simYear = getSimTime().getUTCFullYear();
    const age = Math.max(0, simYear - ac.year);

    elAge.textContent = `${age} yrs`;

  } else {

    elAge.textContent = "—";

  }

})();

   
/* ============================================================
   🟧 MA-8.5.4 — MODAL LAST / NEXT C & D (UI RENDER)
   ------------------------------------------------------------
   Purpose:
   - Pintar Last / Next C & D en el modal
   - Basado en el pipeline real ACS (NO recalcula lógica)
   - Respeta Maintenance / Hold / Active
   ============================================================ */

(function renderModalLastNextCD() {

  const elLastC = document.getElementById("mLastC");
  const elNextC = document.getElementById("mNextC");
  const elLastD = document.getElementById("mLastD");
  const elNextD = document.getElementById("mNextD");

  if (!elLastC || !elNextC || !elLastD || !elNextD) return;

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toUTCString().substring(5, 16); // "10 FEB 1941"
  };

  // LAST CHECKS (fechas reales)
  elLastC.textContent = fmtDate(ac.lastCCheckDate);
  elLastD.textContent = fmtDate(ac.lastDCheckDate);

  // NEXT CHECKS (ya calculados por el pipeline)
  elNextC.textContent = ac.nextC ?? "—";
  elNextD.textContent = ac.nextD ?? "—";

})();
   
 /* ============================================================
   🟦 MA-8.5.3 — MODAL MAINTENANCE ADAPTER (AVIATION CORRECT)
   ------------------------------------------------------------
   Fix:
   - Maintenance Hold NO es Airworthy
   - Maintenance in-progress muestra IN C/D-CHECK + countdown LIVE
   - NO auto-complete desde el modal (eso es del pipeline oficial)
   - Lee SIEMPRE el avión real desde localStorage
   ============================================================ */

(function ACS_modalMaintenanceRender() {

  const elMaintStatus = document.getElementById("mMaintStatus");
  const box           = document.getElementById("maintenanceServiceBox");
  const elType        = document.getElementById("mServiceType");
  const elRemain      = document.getElementById("mServiceRemaining");
  const elRelease     = document.getElementById("mServiceRelease");

  if (!elMaintStatus || !box) return;

  const fmtRelease = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const DD  = String(d.getUTCDate()).padStart(2, "0");
    const MON = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    const YY  = d.getUTCFullYear();
    return `${DD} ${MON} ${YY}`;
  };

 function render() {

  if (!ACS_ACTIVE_MODAL_REG) return;

  /* ============================================================
   🟢 FIX CORE — LIVE MODAL RESOLVER (ACTIVE + PENDING SAFE)
   ============================================================ */

const fleetLatest   = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
const pendingLatest = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

let acNow =
  fleetLatest.find(a => a.registration === ACS_ACTIVE_MODAL_REG) ||
  pendingLatest.find(p => p.__pendingKey === ACS_ACTIVE_MODAL_REG);

if (!acNow) return;

// Normalizar Pending aircraft
if (acNow.__pendingKey) {
  acNow = {
    registration: "—",
    model: acNow.model,
    family: acNow.family || "—",
    base: acNow.base || "—",
    status: "Pending Delivery",
    isPending: true
  };
}

  // Limpieza visual previa
  elMaintStatus.classList.remove(
    "ql-status-airworthy",
    "ql-status-ccheck",
    "ql-status-dcheck",
    "ql-status-overdue"
  );

  // Resolver estado técnico (solo lectura)
  const mLocal = ACS_resolveMaintenanceStatus(acNow);

  // ─────────────────────────────────────────
  // 1️⃣ EN SERVICIO (Maintenance C / D)
  // ─────────────────────────────────────────
  if (acNow.status === "Maintenance" && acNow.maintenanceEndDate) {

    const now = getSimTime();
    const end = new Date(acNow.maintenanceEndDate);

    const remainingMs = Math.max(0, end - now);
    const days  = Math.floor(remainingMs / 86400000);
    const hours = Math.floor((remainingMs % 86400000) / 3600000);

    const type =
  (acNow.serviceType === "B") ? "B-CHECK" :
  (acNow.serviceType === "D") ? "D-CHECK" :
  (acNow.serviceType === "C") ? "C-CHECK" :
  (acNow.abServiceEndDate ? "A/B SERVICE" : "MAINTENANCE");

elMaintStatus.textContent = `IN ${type}`;

elMaintStatus.classList.add(
  acNow.serviceType === "D"
    ? "ql-status-dcheck"
    : "ql-status-ccheck"
);

    box.style.display = "block";

    if (elType)    elType.textContent    = type;
    if (elRemain)  elRemain.textContent  = `${days}d ${hours}h`;
    if (elRelease) elRelease.textContent = fmtRelease(acNow.maintenanceEndDate);

    return;
  }

  // ─────────────────────────────────────────
  // 2️⃣ MAINTENANCE HOLD / OVERDUE
  // ─────────────────────────────────────────
  if (acNow.status === "Maintenance Hold") {

    elMaintStatus.textContent = "OVERDUE";
    elMaintStatus.classList.add("ql-status-overdue");
    box.style.display = "none";

    return;
  }

// ─────────────────────────────────────────
// 3️⃣ PENDING DELIVERY (STRUCTURAL FIX)
// ─────────────────────────────────────────

if (acNow.status === "Pending" || acNow.status === "Pending Delivery") {

  elMaintStatus.textContent = "PENDING";
  
  elMaintStatus.classList.remove(
    "ql-status-airworthy",
    "ql-status-ccheck",
    "ql-status-dcheck",
    "ql-status-overdue"
  );

  elMaintStatus.classList.add("ql-status-pending");

  box.style.display = "none";

  return;
}
// ─────────────────────────────────────────
// 4️⃣ AIRWORTHY (REAL ACTIVE AIRCRAFT)
// ─────────────────────────────────────────

elMaintStatus.textContent = "AIRWORTHY";
elMaintStatus.classList.add("ql-status-airworthy");
box.style.display = "none";
}

// Pintar inmediato al abrir
render();

// LIVE: enganchar al reloj del juego (sin refresh)
// Nota: evitamos duplicar listeners usando un singleton global.
if (typeof registerTimeListener === "function") {

  if (!window.__ACS_MA_MODAL_LISTENER_INSTALLED) {
    window.__ACS_MA_MODAL_LISTENER_INSTALLED = true;

    registerTimeListener(() => {
      // Solo render si hay modal activo
      if (ACS_ACTIVE_MODAL_REG) render();
    });
  }
}

})();
   
/* ============================================================
   🟦 MA-8.5.3B — TECH SUMMARY ENGINE (REAL DATA)
   ------------------------------------------------------------
   Purpose:
   - Mostrar resumen técnico REAL (C & D)
   - Basado en horas y ciclos reales
   - READ-ONLY (no modifica estado)
   - Aviación real (no UI fake)
   ============================================================ */

(function ACS_renderTechSummary(ac) {

  if (!ac) return;

  /* ===============================
     INTERVALOS TÉCNICOS (CANON)
     =============================== */
  const C_INTERVAL_HOURS = 1200;
  const D_INTERVAL_HOURS = 6000;

  /* ===============================
     BASELINES (si no existen → N/A)
     =============================== */
  const lastC_hours = (typeof ac.baselineCHours === "number")
    ? ac.baselineCHours
    : null;

  const lastD_hours = (typeof ac.baselineDHours === "number")
    ? ac.baselineDHours
    : null;

  /* ===============================
     HORAS DESDE ÚLTIMO CHECK
     =============================== */
  const sinceC = (lastC_hours !== null)
    ? ac.hours - lastC_hours
    : null;

  const sinceD = (lastD_hours !== null)
    ? ac.hours - lastD_hours
    : null;

  /* ===============================
     REMANENTE
     =============================== */
  const remainingC = (sinceC !== null)
    ? C_INTERVAL_HOURS - sinceC
    : null;

  const remainingD = (sinceD !== null)
    ? D_INTERVAL_HOURS - sinceD
    : null;

  /* ===============================
     DOM TARGETS (YA EXISTEN EN HTML)
     =============================== */
  const elC = document.getElementById("techCsummary");
  const elD = document.getElementById("techDsummary");

  if (!elC || !elD) return;

  /* ===============================
     FORMAT HELPERS
     =============================== */
  const fmt = (v) => {
    if (v === null || isNaN(v)) return "—";
    return `${v.toLocaleString()} FH`;
  };

  const statusTag = (rem) => {
    if (rem === null) return "";
    if (rem < 0) return `<span class="tech-overdue">OVERDUE</span>`;
    return `<span class="tech-ok">OK</span>`;
  };

  /* ===============================
     RENDER C CHECK
     =============================== */
  elC.innerHTML = `
    <div class="tech-title">C-CHECK</div>
    <div class="tech-line">Interval: ${C_INTERVAL_HOURS.toLocaleString()} FH</div>
    <div class="tech-line">Since Last C: ${fmt(sinceC)}</div>
    <div class="tech-line">Remaining: ${fmt(remainingC)}</div>
    <div class="tech-line">Cycles: ${ac.cycles}</div>
    <div class="tech-line">${statusTag(remainingC)}</div>
  `;

  /* ===============================
     RENDER D CHECK
     =============================== */
  elD.innerHTML = `
    <div class="tech-title">D-CHECK</div>
    <div class="tech-line">Interval: ${D_INTERVAL_HOURS.toLocaleString()} FH</div>
    <div class="tech-line">Since Last D: ${fmt(sinceD)}</div>
    <div class="tech-line">Remaining: ${fmt(remainingD)}</div>
    <div class="tech-line">Cycles: ${ac.cycles}</div>
    <div class="tech-line">${statusTag(remainingD)}</div>
  `;

})(ac);
   
/* ============================================================
🟦 MA-11 — MANUAL SERVICE CHIP CONTROLLER
Ubicación: Dentro de openAircraftModal(reg)
Reemplaza completamente el bloque MA-9
============================================================ */

{
  const btnC = document.getElementById("btnCcheck");
  const btnD = document.getElementById("btnDcheck");
  const btnL = document.getElementById("btnLog");

  const chip      = document.getElementById("maintenanceConfirmChip");
  const chipTitle = document.getElementById("chipServiceTitle");
  const chipCost  = document.getElementById("chipServiceCost");
  const chipConfirm = document.getElementById("chipConfirmBtn");
  const chipCancel  = document.getElementById("chipCancelBtn");

  if (!btnC || !btnD || !chip) return;

  // 🔓 BOTONES SIEMPRE ACTIVOS (excepto si está en mantenimiento)
  const isInMaintenance = ac.status === "Maintenance";

  btnC.disabled = isInMaintenance;
  btnD.disabled = isInMaintenance;

  // 🧮 Helper formato moneda
  const formatMoney = (n) => {
    return "$ " + Number(n || 0).toLocaleString("en-US") + " USD";
  };

  // 🎯 Mostrar chip
  const showChip = (type) => {

    const cost = ACS_calculateMaintenanceCost(ac, type);

    chipTitle.textContent =
      type === "D" ? "D-CHECK SERVICE" : "C-CHECK SERVICE";

    chipCost.textContent =
      (type === "D" ? "D-Check Cost: " : "C-Check Cost: ") +
      formatMoney(cost);

    chip.style.display = "block";

    // Confirmar servicio
    chipConfirm.onclick = () => {

      chip.style.display = "none";

      ACS_confirmAndExecuteMaintenance(ac.registration, type);
    };

    // Cancelar
    chipCancel.onclick = () => {
      chip.style.display = "none";
    };
  };

  // 🟢 Eventos botones
  btnC.onclick = () => showChip("C");
  btnD.onclick = () => showChip("D");

  // 🟦 View Log intacto
  if (btnL) {
    btnL.onclick = () => openMaintenanceLog();
  }
}
   
  modal.style.display = "flex";
}

function closeModal() {
  ACS_ACTIVE_MODAL_REG = null;
  modal.style.display = "none";
}

/* ============================================================
   🅲3 — MAINTENANCE LOG MODAL HANDLERS
   ============================================================ */

function openMaintenanceLog() {

  if (!ACS_ACTIVE_MODAL_REG) return;

  const logModal = document.getElementById("maintenanceLogModal");
  const title    = document.getElementById("logAircraftTitle");
  const body     = document.getElementById("maintenanceLogBody");

  if (!logModal || !body) return;

  title.textContent = `Aircraft ${ACS_ACTIVE_MODAL_REG}`;

  // Cargar log (si existe)
  const logs = JSON.parse(
    localStorage.getItem("ACS_MAINTENANCE_LOG") || "{}"
  );

  const records = logs[ACS_ACTIVE_MODAL_REG] || [];

  body.innerHTML = "";

  if (records.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="ql-log-empty">
          No maintenance records available
        </td>
      </tr>`;
  } else {
    records.forEach(r => {
      body.innerHTML += `
        <tr>
          <td>${r.type}-CHECK</td>
          <td>${r.startDate || "—"}</td>
          <td>${r.endDate || "—"}</td>
          <td>${r.base || "—"}</td>
          <td>${r.era || "—"}</td>
          <td>${r.status || "COMPLETED"}</td>
        </tr>`;
    });
  }

  logModal.style.display = "flex";
}

function closeMaintenanceLog(){
  const logModal = document.getElementById("maintenanceLogModal");
  if (logModal) logModal.style.display = "none";
}

/* ============================================================
   🟩 MA-9.2 — MANUAL MAINTENANCE ACTION HANDLERS
   ============================================================ */

function ACS_confirmAndExecuteMaintenance(registration, type) {

  const fleetLatest = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  const idx = fleetLatest.findIndex(a => a.registration === registration);
  if (idx === -1) return;

  const ac = fleetLatest[idx];
  const label = type === "D" ? "D-Check" : "C-Check";

  const ok = window.confirm(
    `Confirm ${label} for aircraft ${ac.registration}?\n\n` +
    `This will ground the aircraft for maintenance.`
  );

  if (!ok) return;

  const updated = ACS_executeMaintenance(ac, type);

  fleetLatest[idx] = updated;
  localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleetLatest));

  fleet = fleetLatest;

  closeModal();
  renderFleetTable();
}

/* ============================================================
   === EMPTY ROWS (si no hay flota) ============================
   ============================================================ */

function ensureEmptyRows() {
  fleetTableBody.innerHTML = `
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
  `;
}

/* ============================================================
   🟧 MA-8.6 — AUTO ACTIVATE AFTER A/B SERVICE
   ============================================================ */

function ACS_processABCompletion() {

  const now = getSimTime();
  let fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  let changed = false;

  fleet.forEach(ac => {
    if (
      ac.status === "Maintenance" &&
      ac.abServiceEndDate &&
      new Date(ac.abServiceEndDate) <= now
    ) {
      ac.status = "Active";
      delete ac.abServiceEndDate;
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleet));
  }
}

/* ============================================================
   🟦 MA-8.6.D2 — MAINTENANCE COMPLETION ENGINE (FINISH)
   ------------------------------------------------------------
   Purpose:
   - Completar C/D cuando maintenanceEndDate <= simTime
   - AHÍ resetea baseline y last check dates
   - Libera avión a Active
   ------------------------------------------------------------
   Version: v1.0 | Date: 06 FEB 2026
   ============================================================ */

function ACS_processMaintenanceCompletion() {

  const now = getSimTime();
  let fleetLatest = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  let changed = false;

  fleetLatest = fleetLatest.map(ac => {

    if (!ac) return ac;

    if (
      ac.status === "Maintenance" &&
      ac.maintenanceEndDate &&
      new Date(ac.maintenanceEndDate) <= now
    ) {

      const t = ac.maintenanceType || "C";

      /* ============================================================
         🟧 MA-LOG-3 — WRITE MAINTENANCE END EVENT
         ------------------------------------------------------------
         Trigger:
         - Called ONLY when C / D maintenance COMPLETES
         - Closes the corresponding START event
         - Does NOT charge any cost
         ------------------------------------------------------------
         Version: v1.0 | Date: 08 FEB 2026
         ============================================================ */

      (function writeMaintenanceEndLog(){

        const LOG_KEY = "ACS_MAINTENANCE_LOG";
        const logs = JSON.parse(localStorage.getItem(LOG_KEY) || "{}");

        if (!logs[ac.registration]) return;

        // Buscar el último START IN_PROGRESS del mismo tipo
        const openEvent = [...logs[ac.registration]]
          .reverse()
          .find(e =>
            e.type === t &&
            e.phase === "START" &&
            e.status === "IN_PROGRESS"
          );

        if (!openEvent) return;

        const endEvent = {
          id: openEvent.id,
          registration: openEvent.registration,
          aircraftId: openEvent.aircraftId,

          type: openEvent.type,
          phase: "END",

          year: openEvent.year,
          era: openEvent.era,

          seats: openEvent.seats,
          unitCost: openEvent.unitCost,
          totalCost: openEvent.totalCost,
          currency: openEvent.currency,

          base: openEvent.base,

          startDate: openEvent.startDate,
          endDate: now.toISOString(),

          status: "COMPLETED"
        };

        logs[ac.registration].push(endEvent);
        localStorage.setItem(LOG_KEY, JSON.stringify(logs));

      })();

      // ✅ Reset REAL al finalizar (DESPUÉS del log)
       
      if (t === "C") {

  ac.baselineCHours   = ac.hours;
  ac.baselineCCycles  = ac.cycles;
  ac.lastCCheckDate   = now.toISOString();
}

if (t === "D") {

  // D reinicia TODO
  ac.baselineDHours   = ac.hours;
  ac.baselineDCycles  = ac.cycles;
  ac.lastDCheckDate   = now.toISOString();

  ac.baselineCHours   = ac.hours;
  ac.baselineCCycles  = ac.cycles;
  ac.lastCCheckDate   = now.toISOString();
}

      // Liberar
      ac.status = "Active";
      delete ac.serviceType;   // ✅ NUEVO: limpiar tipo de servicio
       
       // Limpiar service state
      delete ac.maintenanceType;
      delete ac.maintenanceStartDate;
      delete ac.maintenanceEndDate;

      changed = true;
    }

    return ac;
  });

  if (changed) {
    localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleetLatest));
    fleet = fleetLatest;
  }
}

/* ============================================================
   === INITIALIZATION =========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
   🟨 MA-8.6.C — MAINTENANCE PIPELINE (TIME TICK)
   ============================================================ */

fleet = ACS_structuralFleetMigration();
   
ACS_processMaintenanceCompletion();
   
// 1) Recargar flota + pipeline de mantenimiento
fleet = fleet.map(ac => {

  ac = ACS_applyMaintenanceBaseline(ac);
  ac = ACS_applyMaintenanceHold(ac);
  ac = ACS_checkMaintenanceAutoTrigger(ac);
  ac = ACS_applyMaintenanceComputedFields(ac);

  return ac;
});

fleet = fleet.map(ac => {
  if (
  !ac.seats ||
  !ac.range_nm ||
  !ac.speed_kts ||
  !ac.fuel_burn_kgph
) {
  return ACS_enrichAircraftFromDB(ac);
}
  return ac;
});
   
saveFleet();

  // Normalize aircraft data (registration + maintenance fields)
  if (typeof ACS_normalizeAircraft === "function") {
  fleet = fleet.map(ac => ACS_normalizeAircraft(ac));
}

/* ============================================================
   🟦 MYA-B1 — FORCE BASE SYNC (COMPANY BASE AUTHORITY)
   ------------------------------------------------------------
   • Garantiza que TODOS los aviones usen la base actual
   • Elimina bases fantasma (LIRN legacy, pruebas antiguas)
   • Source of truth: ACS_activeUser.base
   ============================================================ */

function ACS_forceFleetBaseSync() {

  const currentBase = getCurrentBaseICAO();
  if (!currentBase || currentBase === "—") return;

  let fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let changed = false;

  fleet.forEach(ac => {
    if (!ac.base || ac.base !== currentBase) {
      ac.base = currentBase;
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    console.log(`🟢 Fleet base synchronized to ${currentBase}`);
  }
}

/* ✅ ESTA LÍNEA ES LA QUE FALTABA */
ACS_forceFleetBaseSync();

   
  // 2) Procesar entregas pendientes
   
  updatePendingDeliveries();

  // ============================================================
// 🟦 MA-STRUCT-3 — HARD ID NORMALIZATION AFTER PENDING
// Forces ID creation directly on storage (no memory conflict)
// ============================================================

(function forceNormalizeAfterPending(){

  let fleetStorage = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let updated = false;

  fleetStorage.forEach((ac, index) => {
    if (!ac.id) {
      ac.id = `AC-${Date.now()}-${index}`;
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleetStorage));
    console.log("🟢 Post-pending ID repair applied.");
  }

})();

  ACS_processABCompletion();
   
  // 3) Filtros
  populateFilterOptions();

  // 4) Render tabla principal
  renderFleetTable();

  // 5) Si no hay flota → filas vacías
  if (fleet.length === 0) {
    ensureEmptyRows();
  }
});

// ============================================================
// 🟦 MA-STRUCT-1 — NORMALIZE AIRCRAFT IDS (Reusable)
// Ensures every aircraft has a stable technical ID
// ============================================================

function normalizeAircraftIds() {

  let fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let updated = false;

  fleet.forEach((ac, index) => {
    if (!ac.id) {
      ac.id = `AC-${Date.now()}-${index}`;
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    console.log("🟢 Aircraft IDs normalized.");
  }
}

/* ============================================================
   === TIME ENGINE SYNC =======================================
   ============================================================ */

if (typeof registerTimeListener === "function") {

  registerTimeListener(() => {

    /* ============================================================
       🟩 MA-8.6.D — MAINTENANCE PIPELINE (TIME TICK)
       ============================================================ */

    fleet = fleet.map(ac => {

 ac = ACS_applyDailyAging(ac);
 ac = ACS_applyGroundTimeAccrual(ac);
 ac = ACS_applyIdleCalendarDegradation(ac);
 ac = ACS_applyIdleVisualStatus(ac);   // ← AQUÍ
 ac = ACS_applyMaintenanceBaseline(ac);
 ac = ACS_applyMaintenanceHold(ac);
 ac = ACS_checkMaintenanceAutoTrigger(ac);
 ac = ACS_applyMaintenanceComputedFields(ac);
 ac = ACS_applyCalendarMaintenanceProgress(ac);

  if (ac.pendingDCheck) {
    ac = ACS_executeMaintenance(ac, "D");
  } else if (ac.pendingCCheck) {
    ac = ACS_executeMaintenance(ac, "C");
  }

  ac = ACS_applyMaintenanceComputedFields(ac);

  /* ============================================================
   🟢 MA-STRUCT-1 — ORPHAN MAINTENANCE FIX
   ------------------------------------------------------------
   Si un avión está en Maintenance pero
   NO tiene ningún servicio activo,
   se libera automáticamente.
   ============================================================ */

if (
  ac.status === "Maintenance" &&
  !ac.maintenanceType &&
  !ac.maintenanceEndDate &&
  !ac.abServiceEndDate
) {
  ac.status = "Active";
}
       
  return ac;
});

    saveFleet();
    ACS_logMaintenanceTickOncePerDay();
     
    // 2) Procesar entregas pendientes
    updatePendingDeliveries();

    // 3) Renderizar tabla
    renderFleetTable();

    // 4) Si no hay flota → filas vacías
    if (fleet.length === 0) {
      ensureEmptyRows();
    }

    // 5) Actualizar requerimientos HR
    if (typeof HR_updateRequirementsFromFleet === "function") {
      HR_updateRequirementsFromFleet();
    }

  });

}

/* ============================================================
   🟢 MYA-REG-1 — FORCE NUMERIC REGISTRATION FORMAT
   ------------------------------------------------------------
   • Elimina matrículas legacy tipo YV-ABC
   • Convierte TODO a YV-#### 
   • Source of truth: ACS_MyAircraft
   ============================================================ */

(function normalizeAircraftRegistrations(){

  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let changed = false;

  const existingNumeric = fleet
    .map(a => a.registration)
    .filter(r => /^YV-\d{4}$/.test(r));

  let nextNumber = 1000;

  fleet.forEach(ac => {

    if (!/^YV-\d{4}$/.test(ac.registration)) {

      while (existingNumeric.includes(`YV-${nextNumber}`)) {
        nextNumber++;
      }

      ac.registration = `YV-${nextNumber}`;
      existingNumeric.push(ac.registration);
      nextNumber++;
      changed = true;
    }

  });

  if (changed) {
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    console.warn("🛠 Registrations normalized to numeric format (YV-####)");
  }

})();

/* ============================================================
   🟢 FASE 2 — DYNAMIC TIME-BASED MAINTENANCE ENGINE
   ------------------------------------------------------------
   • C = 1.0 año
   • D = 8.0 años
   • Formato decimal
   • Basado en lastC / lastD
   ============================================================ */

function ACS_calculateMaintenanceStatus(ac) {

  if (!ac || !ac.lastC || !ac.lastD) {
    return {
      remainingC: 1.0,
      remainingD: 8.0
    };
  }

  const now = (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime)
    ? new Date(ACS_TIME.currentTime)
    : new Date();

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const lastCDate = new Date(ac.lastC);
  const lastDDate = new Date(ac.lastD);

  const daysSinceC = (now - lastCDate) / MS_PER_DAY;
  const daysSinceD = (now - lastDDate) / MS_PER_DAY;

  const remainingC = 1 - (daysSinceC / 365);
  const remainingD = 8 - (daysSinceD / (365 * 8));

  return {
    remainingC: Math.max(-5, remainingC),
    remainingD: Math.max(-5, remainingD)
  };
}

/* ============================================================
   🧠 MA-1 — TIME ENGINE HOOK (ACS OFFICIAL)
   ------------------------------------------------------------
   Purpose:
   - Conectar My Aircraft al reloj simulado ACS
   - Forzar actualización de mantenimiento (C / D)
   - Evitar estados congelados
   ------------------------------------------------------------
   SAFE:
   - No toca UI
   - No toca estilos
   - No crea timers paralelos
   ============================================================ */

(function hookMyAircraftToTimeEngine(){

  // Evitar doble hook
  if (window.__ACS_MY_AIRCRAFT_TIME_HOOKED__) return;
  window.__ACS_MY_AIRCRAFT_TIME_HOOKED__ = true;

  // Esperar a que el Time Engine exista
  function waitForTimeEngine(){
    if (window.ACS_TIME_ENGINE && typeof window.ACS_TIME_ENGINE.onTick === "function") {
      bindTimeEngine();
    } else {
      setTimeout(waitForTimeEngine, 300);
    }
  }

  function bindTimeEngine(){

    console.log("🧠 [MY AIRCRAFT] Time Engine linked");

    window.ACS_TIME_ENGINE.onTick(function(gameDate){

      // Guardar tiempo actual del juego (referencia global)
      window.ACS_GAME_DATE = gameDate;

      // 🔁 Recalcular mantenimiento basado en tiempo simulado
      if (typeof updateAircraftMaintenanceTimers === "function") {
        updateAircraftMaintenanceTimers(gameDate);
      }

      // 🔄 Refrescar tabla (si existe)
      if (typeof renderFleetTable === "function") {
        renderFleetTable();
      }

      // 🔄 Refrescar modal si está abierto
      if (
        window.__ACS_SELECTED_AIRCRAFT__ &&
        typeof renderAircraftModal === "function"
      ) {
        renderAircraftModal(window.__ACS_SELECTED_AIRCRAFT__);
      }

    });
  }

  waitForTimeEngine();

window.openAssetPanel = function(id){
  document.getElementById("aircraftAssetPanel").style.display = "flex";
}

window.closeAssetPanel = function(){
  document.getElementById("aircraftAssetPanel").style.display = "none";
}
      
})();

/* ============================================================
   === ACS - My Aircraft Module  =======================
   Version: 1.0 (Unified)
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
   🟧 MA-8.1 — MAINTENANCE CONSTANTS (CANONICAL)
   ============================================================ */

const ACS_MAINTENANCE_RULES = {
  C_CHECK_MONTHS: 12,
  D_CHECK_MONTHS: 96, // 8 años

  USED_AIRCRAFT_AB_SERVICE_DAYS: 7,

  C_CHECK_RECOVERY: 20,
  D_CHECK_RECOVERY: 100
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
   🟦 C.1 — Cargar flota ACTIVA
   ============================================================ */

let fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");

/* Guardar cambios correctamente */
function saveFleet() {
  localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleet));
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

  // Si ya fue enriquecido → NO tocar
  if (
    aircraft.seats !== undefined &&
    aircraft.speed_kts !== undefined &&
    aircraft.fuel_burn_kgph !== undefined
  ) {
    return aircraft;
  }

  // Buscar match exacto en el DB
  const match = Array.isArray(window.ACS_AIRCRAFT_DB)
    ? ACS_AIRCRAFT_DB.find(a =>
        a.manufacturer === aircraft.manufacturer &&
        a.model === aircraft.model
      )
    : null;

  if (!match) {
    console.warn(
      `⚠️ Aircraft DB match NOT FOUND for ${aircraft.manufacturer} ${aircraft.model}. Applying fallback values.`
    );

    // Fallback seguro (no rompe el juego)
    aircraft.seats = aircraft.seats ?? 50;
    aircraft.range_nm = aircraft.range_nm ?? 800;
    aircraft.speed_kts = aircraft.speed_kts ?? 250;
    aircraft.fuel_burn_kgph = aircraft.fuel_burn_kgph ?? 500;
    aircraft.price_acs_usd = aircraft.price_acs_usd ?? 1000000;

    return aircraft;
  }

  // Copiar SOLO specs técnicos
  aircraft.seats = aircraft.seats ?? match.seats;
  aircraft.range_nm = aircraft.range_nm ?? match.range_nm;
  aircraft.speed_kts = aircraft.speed_kts ?? match.speed_kts;
  aircraft.fuel_burn_kgph = aircraft.fuel_burn_kgph ?? match.fuel_burn_kgph;
  aircraft.price_acs_usd = aircraft.price_acs_usd ?? match.price_acs_usd;

  // Campos opcionales (informativos / futuro)
  aircraft.year = aircraft.year ?? match.year;
  aircraft.mtow_kg = aircraft.mtow_kg ?? match.mtow_kg;
  aircraft.engines = aircraft.engines ?? match.engines;

  console.log(
    `🟢 Aircraft enriched: ${aircraft.manufacturer} ${aircraft.model} — ${aircraft.seats} seats`
  );

  return aircraft;
}

/* ============================================================
   🟦 C.2 — Sync Pending Deliveries (Unified Table)
   ============================================================ */

function updatePendingDeliveries() {

  const now = getSimTime();

  let fleetActive  = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  let pendingRaw   = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

  const pendingForTable = [];
  const stillPending = [];
  let changed = false;

  pendingRaw.forEach(entry => {
    const d = new Date(entry.deliveryDate);

    if (now >= d) {

     // === Convertir a ACTIVO ===
       
  for (let i = 0; i < entry.qty; i++) {
     
 /* ============================================================
   🟧 MYA-A1 — ASSIGN REGISTRATION ON FLEET ENTRY
   Source: ACS Registration Manager
   ============================================================ */

let newAircraft = {
  registration: (typeof ACS_generateRegistration === "function")
    ? ACS_generateRegistration()
    : "—",

  manufacturer: entry.manufacturer,
  model: entry.model,
  family: entry.family || "",

  /* ======================================================
     🟧 MA-8.5 — DELIVERY & INITIAL MAINTENANCE STATE
     ------------------------------------------------------
     • Avión NUEVO  → Active inmediato, condición 100%
     • Avión USADO  → Maintenance (A & B), 7 días
     ====================================================== */
  status: entry.isUsed ? "Maintenance" : "Active",

  hours: entry.isUsed ? (entry.hours || 0) : 0,
  cycles: entry.isUsed ? (entry.cycles || 0) : 0,

  // Condición ya normalizada antes (A/B/C/D → %)
  conditionPercent: entry.conditionPercent ?? 100,

  nextC: "—",
  nextD: "—",

  // Base: prioridad = base guardada en la COMPRA (entry) > base actual (resolver)
  base: (entry.baseIcao || entry.base || getCurrentBaseICAO()),

  deliveredDate: d.toISOString(),
  deliveryDate: null,
  age: entry.age || 0,

  /* ======================================================
     🟧 MA-8.5 — REAL MAINTENANCE REFERENCES
     ====================================================== */
  lastCCheckDate: entry.lastCCheckDate || null,
  lastDCheckDate: entry.lastDCheckDate || null,

  // A & B service window for USED aircraft
  abServiceEndDate: entry.isUsed
    ? (() => {
        const ab = new Date(d);
        ab.setUTCDate(
          ab.getUTCDate() + ACS_MAINTENANCE_RULES.USED_AIRCRAFT_AB_SERVICE_DAYS
        );
        return ab.toISOString();
      })()
    : null,

  /* ======================================================
     🛠 P5-A — B-CHECK INITIALIZATION (ON FLEET ENTRY)
     ====================================================== */
  enteredFleetAt: now.getTime(),
  bCheckDueAt:    now.getTime() + (7 * 24 * 60 * 60 * 1000),
  bCheckStatus:   "ok",
  bCheckPlanned:  false
};

/* 🔗 A9 — ENRICH FROM AIRCRAFT DB (ONE-TIME) */
if (typeof ACS_enrichAircraftFromDB === "function") {
  newAircraft = ACS_enrichAircraftFromDB(newAircraft);
}

fleetActive.push(newAircraft);
}

changed = true;

    } else {
      // === Todavía Pendiente → va a la tabla ===
       
      pendingForTable.push({
        registration: "—",
        model: entry.model,
        manufacturer: entry.manufacturer,
        family: entry.family || "",
        status: "Pending Delivery",
        hours: "—",
        cycles: "—",
        condition: "—",
        nextC: "—",
        nextD: "—",
        base: "—",
        deliveryDate: entry.deliveryDate
      });

      stillPending.push(entry);
    }
  });

  if (changed) {
    localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleetActive));
  }

  localStorage.setItem("ACS_PendingAircraft", JSON.stringify(stillPending));

  // === UNIFICAR LISTAS ===
  fleet = [...pendingForTable, ...fleetActive];
}

// Actualizar requerimientos HR después de cambios en flota

if (typeof HR_updateRequirementsFromFleet === "function") {
  HR_updateRequirementsFromFleet();
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
   🟧 MA-8.5.A — MAINTENANCE BASELINE ENGINE (C & D)
   ------------------------------------------------------------
   Purpose:
   - Crear baseline técnico de mantenimiento para aviones usados
   - Basado en horas actuales (NO fechas reales)
   - Ejecuta SOLO si el avión no tiene baseline previo
   ------------------------------------------------------------
   Logic:
   - Interno en HORAS
   - UI lo convertirá luego a DÍAS
   ------------------------------------------------------------
   Version: v1.0 | Date: 05 FEB 2026
   ============================================================ */

function ACS_applyMaintenanceBaseline(ac) {
  if (!ac) return ac;

  // Si ya existe cualquier referencia de C o D, NO tocar
  if (
    ac.baselineCHours !== undefined ||
    ac.baselineDHours !== undefined ||
    ac.lastCCheckDate ||
    ac.lastDCheckDate
  ) {
    return ac;
  }

  // Seguridad
  if (typeof ac.hours !== "number") return ac;

  // 🔧 Intervalos estándar (pueden refinarse luego por tipo/era)
  const C_INTERVAL_HOURS = 1200;   // C-Check
  const D_INTERVAL_HOURS = 6000;   // D-Check

  // Calcular último múltiplo técnico
  const baselineC = Math.floor(ac.hours / C_INTERVAL_HOURS) * C_INTERVAL_HOURS;
  const baselineD = Math.floor(ac.hours / D_INTERVAL_HOURS) * D_INTERVAL_HOURS;

  // Guardar baseline
  ac.baselineCHours = baselineC;
  ac.baselineDHours = baselineD;

  // Flags informativos (opcional, útil para debug/UI)
  ac.maintenanceBaselineApplied = true;

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
   🟦 MA-8.5.B — MAINTENANCE RESOLVER (C & D) [READ-ONLY]
   ------------------------------------------------------------
   Fix:
   - NO muestra Next C/D si está en Maintenance
   - El recalculo ocurre SOLO tras finalizar el servicio
   ============================================================ */

function ACS_resolveMaintenanceStatus(ac) {
  if (!ac || typeof ac.hours !== "number") {
    return {
      nextC_days: "—",
      nextD_days: "—",
      isCOverdue: false,
      isDOverdue: false
    };
  }

  /* ⛔ EN SERVICIO → NO MOSTRAR NEXT */
  if (ac.status === "Maintenance") {
    return {
      nextC_days: "—",
      nextD_days: "—",
      isCOverdue: false,
      isDOverdue: false,
      inMaintenance: true
    };
  }

  if (
    typeof ac.baselineCHours !== "number" ||
    typeof ac.baselineDHours !== "number"
  ) {
    return {
      nextC_days: "—",
      nextD_days: "—",
      isCOverdue: false,
      isDOverdue: false
    };
  }

  const C_INTERVAL_HOURS = 1200;
  const D_INTERVAL_HOURS = 6000;
  const HOURS_PER_DAY = 8;

  const nextCHoursAt = ac.baselineCHours + C_INTERVAL_HOURS;
  const nextDHoursAt = ac.baselineDHours + D_INTERVAL_HOURS;

  const remainingCHours = nextCHoursAt - ac.hours;
  const remainingDHours = nextDHoursAt - ac.hours;

  const nextC_days = Math.round(remainingCHours / HOURS_PER_DAY);
  const nextD_days = Math.round(remainingDHours / HOURS_PER_DAY);

  return {
    nextC_days,
    nextD_days,
    isCOverdue: nextC_days < 0,
    isDOverdue: nextD_days < 0
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
     🟧 MA-8.8.C — MAINTENANCE COST CHARGE (ON START)
     ============================================================ */

  const cost = ACS_calculateMaintenanceCost(ac, type);

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
  ac.maintenanceType = type;
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
   Fix B1:
   - Maintenance Hold usa SOLO calendario
   - NO recalcula C/D desde horas cuando está HOLD
   - Días siguen corriendo aunque el jugador no entre
   ============================================================ */

function ACS_applyMaintenanceComputedFields(ac) {
  if (!ac) return ac;

  const now = getSimTime();

  const fmtDays = (v) => {
    if (v === "—" || v === null || v === undefined) return "—";
    if (typeof v !== "number") return "—";
    if (v < 0) return `${Math.abs(v)} days overdue`;
    return `${v} days`;
  };

  /* ======================================================
     🛑 MAINTENANCE HOLD → CALENDAR IS KING
     ====================================================== */
  if (ac.status === "Maintenance Hold") {

    // Inicializar si no existen
    if (typeof ac.nextC_days !== "number") ac.nextC_days = 0;
    if (typeof ac.nextD_days !== "number") ac.nextD_days = 0;

    // Decrementar SOLO una vez por día simulado
    const today = now.toISOString().slice(0, 10);

    if (ac._lastCalendarTick !== today) {
      ac.nextC_days -= 1;
      ac.nextD_days -= 1;
      ac._lastCalendarTick = today;
    }

    // Flags overdue
    ac.nextC_overdue = ac.nextC_days < 0;
    ac.nextD_overdue = ac.nextD_days < 0;

    // Texto UI
    ac.nextC = fmtDays(ac.nextC_days);
    ac.nextD = fmtDays(ac.nextD_days);

    return ac;
  }

  /* ======================================================
     🟢 NORMAL MODE → HOURS-BASED (ACTIVE)
     ====================================================== */

  const m = ACS_resolveMaintenanceStatus(ac);

  ac.nextC_days = m.nextC_days;
  ac.nextD_days = m.nextD_days;

  ac.nextC_overdue = m.isCOverdue;
  ac.nextD_overdue = m.isDOverdue;

  ac.nextC = fmtDays(m.nextC_days);
  ac.nextD = fmtDays(m.nextD_days);

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
   ============================================================ */

function renderFleetTable() {

  fleetTableBody.innerHTML = "";

  if (!fleet || fleet.length === 0) {
    ensureEmptyRows();
    return;
  }

  fleet.forEach(ac => {

    if (!passesFilters(ac)) return;

    const row = document.createElement("tr");

    if (ac.status === "Pending Delivery") {
      row.classList.add("pending-row");
    } else {
      row.classList.add("active-row");
    }

  row.innerHTML = `
  <td>${ac.registration}</td>
  <td>${ac.model}</td>

  <td>
    <span class="status-badge status-${ac.status.replace(/\s+/g, "-").toLowerCase()}">
      ${ac.status}
    </span>
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
    <button class="btn-action" onclick="openAircraftModal('${ac.registration}')">
      View
    </button>
  </td>
`;

    fleetTableBody.appendChild(row);
  });
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

  fleet.forEach(ac => {
    models.add(ac.model);
    families.add(ac.family || "");
    bases.add(ac.base || "");
  });

  const fill = (el, set) => {
    el.innerHTML = `<option value="">${el.id.replace("filter","")}</option>`;
    set.forEach(v => {
      if (v.trim() !== "") {
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

  // ✅ 1) SIEMPRE leer lo último desde localStorage
  const fleetLatest = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  const acRaw = fleetLatest.find(a => a.registration === reg);
  if (!acRaw) return;

  // ✅ 2) Copia segura (no mutar directo el objeto de storage aquí)
  const ac = { ...acRaw };

  // 🔗 Guardar avión activo del modal (CLAVE PARA BOTONES)
  ACS_ACTIVE_MODAL_REG = ac.registration;

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
  document.getElementById("mFamily").textContent = ac.family || "—";
  document.getElementById("mBase").textContent = ac.base || "—";
  document.getElementById("mStatus").textContent = ac.status;

  if (ac.status === "Pending Delivery" && ac.deliveryDate) {
    const d = new Date(ac.deliveryDate);
    document.getElementById("mDeliveryDate").textContent = d.toUTCString().substring(5, 16);
  } else {
    document.getElementById("mDeliveryDate").textContent = "—";
  }

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

  document.getElementById("mHours").textContent = ac.hours;
  document.getElementById("mCycles").textContent = ac.cycles;
  document.getElementById("mAge").textContent = ac.age || 0;

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

  const fleetLatest = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  const acNow = fleetLatest.find(a => a.registration === ACS_ACTIVE_MODAL_REG);
  if (!acNow) return;

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

    const type = (acNow.maintenanceType === "D") ? "D-CHECK" : "C-CHECK";

    elMaintStatus.textContent = `IN ${type}`;
    elMaintStatus.classList.add(
      acNow.maintenanceType === "D"
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
  // 3️⃣ AIRWORTHY
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
   🟩 MA-9 — MANUAL MAINTENANCE BUTTON LOGIC (LUX SAFE) [FIX]
   ------------------------------------------------------------
   Fix:
   - Nunca depende de variable externa "m"
   - Evita que un ReferenceError rompa el modal y bloquee los demás
   ============================================================ */

(function () {

  const btnC = document.getElementById("btnCcheck");
  const btnD = document.getElementById("btnDcheck");
  const btnL = document.getElementById("btnLog");

  // Recalcular SIEMPRE dentro del scope
  const mLocal = ACS_resolveMaintenanceStatus(ac);

  if (btnC) {
    btnC.onclick = null;
    btnC.disabled = true;
  }
  if (btnD) {
    btnD.onclick = null;
    btnD.disabled = true;
  }
  if (btnL) {
    btnL.onclick = null;
    btnL.disabled = true;
  }

  // Si está en mantenimiento activo -> no iniciar otro
  if (ac.status === "Maintenance") {
    // quedan disabled
  }
  // Prioridad D
  else if (mLocal.isDOverdue || mLocal.nextD_days === 0) {
    if (btnD) btnD.disabled = false;
  }
  // Luego C
  else if (mLocal.isCOverdue || mLocal.nextC_days === 0) {
    if (btnC) btnC.disabled = false;
  }

  // Bind acciones
  if (btnC) {
    btnC.onclick = () =>
      ACS_confirmAndExecuteMaintenance(ac.registration, "C");
  }

  if (btnD) {
    btnD.onclick = () =>
      ACS_confirmAndExecuteMaintenance(ac.registration, "D");
  }

  // ─────────────────────────────────────────
  // Log — abrir Maintenance Log real
  // ─────────────────────────────────────────
  if (btnL) {
    btnL.disabled = false;
    btnL.onclick = openMaintenanceLog;
  }

})();

modal.style.display = "flex";

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

      // ✅ Reset REAL al finalizar
      if (t === "C") {
        ac.baselineCHours = ac.hours;
        ac.lastCCheckDate = now.toISOString();
      }

      if (t === "D") {
        ac.baselineDHours = ac.hours;
        ac.baselineCHours = ac.hours;
        ac.lastDCheckDate = now.toISOString();
        ac.lastCCheckDate = now.toISOString();
      }

      // Liberar
      ac.status = "Active";

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

ACS_processMaintenanceCompletion();
   
// 1) Recargar flota + pipeline de mantenimiento
fleet = fleet.map(ac => {

  ac = ACS_applyMaintenanceBaseline(ac);
  ac = ACS_applyMaintenanceHold(ac);
  ac = ACS_checkMaintenanceAutoTrigger(ac);
  ac = ACS_applyMaintenanceComputedFields(ac);

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

/* ============================================================
   🟦 ACS — ENSURE AIRCRAFT ID (AC_xxx)
   Source of truth: ACS_MyAircraft
   ============================================================ */

(function normalizeAircraftIds() {

  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let changed = false;

  fleet.forEach((ac, index) => {
    if (!ac.id) {
      ac.id = `AC_${String(index + 1).padStart(4, "0")}`;
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    console.warn("🛠 Aircraft IDs normalized (AC_xxxx assigned)");
  }

})();

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

})();

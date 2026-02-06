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

/* Obtener tiempo sim actual */
function getSimTime() {
  if (window.ACS_getSimTime && typeof window.ACS_getSimTime === "function") {
    return new Date(window.ACS_getSimTime());
  }
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
   Purpose:
   - Resolver estado de mantenimiento usando baseline YA EXISTENTE
   - Convertir horas → días para UI
   - NO crea ni modifica baseline
   ------------------------------------------------------------
   Version: v1.1 | Date: 06 FEB 2026
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

  // ❌ NO crear baseline aquí
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
    isCOverdue: nextC_days <= 0,
    isDOverdue: nextD_days <= 0
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
   🟩 MA-8.6.D1 — MAINTENANCE EXECUTION ENGINE
   ------------------------------------------------------------
   Purpose:
   - Ejecutar C o D Check (manual / automático)
   - Resetear baseline
   - Aplicar downtime
   - Liberar avión al finalizar
   ------------------------------------------------------------
   Version: v1.1 | Date: 06 FEB 2026
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
    // Hook a Finance (ledger-ready)
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

    // Fallback visual / debug
    ac.lastMaintenanceCost = cost;
  }

  if (type === "C") {
    // Reset baseline C
    ac.baselineCHours = ac.hours;
    ac.lastCCheckDate = now.toISOString();

    ac.pendingCCheck = false;

    ac.status = "Maintenance";
    ac.maintenanceType = "C";
    ac.maintenanceEndDate = new Date(
      now.getTime() + C_DOWNTIME_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  if (type === "D") {
    // Reset baseline D (y C implícitamente)
    ac.baselineDHours = ac.hours;
    ac.baselineCHours = ac.hours;

    ac.lastDCheckDate = now.toISOString();
    ac.lastCCheckDate = now.toISOString();

    ac.pendingDCheck = false;
    ac.pendingCCheck = false;

    ac.status = "Maintenance";
    ac.maintenanceType = "D";
    ac.maintenanceEndDate = new Date(
      now.getTime() + D_DOWNTIME_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  // Limpieza flags
  ac.maintenanceHold = false;
  ac.maintenanceOverdue = false;

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
   🟦 MA-8.7.A — DAILY GROUND AGING ENGINE (NO HOURS)
   ------------------------------------------------------------
   Rule:
   - Aging SOLO cuando cambia el día simulado
   - NUNCA modifica hours ni cycles
   - Aplica desgaste pasivo en tierra (condición)
   ------------------------------------------------------------
   Version: v1.3 | Date: 06 FEB 2026
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

    // Inicializar contador si no existe
    ac.groundDays = (ac.groundDays || 0) + 1;

    // Desgaste suave por almacenamiento / clima / corrosión
    const DAILY_CONDITION_LOSS = 0.05; // % por día (muy leve)
    if (typeof ac.conditionPercent === "number") {
      ac.conditionPercent = Math.max(
        0,
        ac.conditionPercent - DAILY_CONDITION_LOSS
      );
    }
  }

  // Marcar día procesado
  ac.lastAgingDay = simDay;

  return ac;
}

/* ============================================================
   🟦 MA-8.5.2 — APPLY COMPUTED MAINTENANCE FIELDS (TABLE SYNC)
   ------------------------------------------------------------
   Fix:
   - Evita undefined: usa nextC_days / nextD_days del resolver
   - Convierte a strings jugables: "15 days" / "156 days overdue" / "—"
   ------------------------------------------------------------
   Version: v1.2 | Date: 06 FEB 2026
   ============================================================ */

function ACS_applyMaintenanceComputedFields(ac) {
  if (!ac) return ac;

  // Compat: normaliza alias mínimos (legacy)
  if (!ac.lastCCheckDate && ac.lastC) ac.lastCCheckDate = ac.lastC;
  if (!ac.lastDCheckDate && ac.lastD) ac.lastDCheckDate = ac.lastD;

  const m = ACS_resolveMaintenanceStatus(ac);

  // Guardar también numérico por si lo necesitas luego (UI / lógica)
  ac.nextC_days = m.nextC_days;
  ac.nextD_days = m.nextD_days;

  const fmt = (v) => {
    if (v === "—" || v === null || v === undefined) return "—";
    if (typeof v !== "number") return "—";
    if (v < 0) return `${Math.abs(v)} days overdue`;
    return `${v} days`;
  };

  // Strings para la tabla (lo que renderFleetTable imprime)
  ac.nextC = fmt(m.nextC_days);
  ac.nextD = fmt(m.nextD_days);

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

  <td class="${ac.status === "Pending Delivery" ? "pending-text" : "active-text"}">
    ${ac.status}
  </td>

  <td>${ac.hours}</td>
  <td>${ac.cycles}</td>

  <td>
  ${typeof ac.conditionPercent === "number"
    ? ac.conditionPercent + "%"
    : "—"}
</td>

  <td>${ac.nextC}</td>
  <td>${ac.nextD}</td>

  <td>${ac.base}</td>

  <td>
    <button class="btn-action" onclick="openAircraftModal('${ac.registration}')">View</button>
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

  // ✅ 3) Normalización de campos C/D (por si vienen con nombres distintos)
  // Soportados: lastCCheckDate / lastDCheckDate (canónico)
  // Compat: lastC / lastD / maintenance.lastCCheckDate / maintenance.lastDCheckDate, etc.
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

  // ✅ 4) Pintar modal (igual que tu UI actual)
  document.getElementById("modalTitle").textContent = `${ac.model} — ${ac.registration}`;
  document.getElementById("mReg").textContent = ac.registration;
  document.getElementById("mModel").textContent = ac.model;
  document.getElementById("mFamily").textContent = ac.family || "—";
  document.getElementById("mBase").textContent = ac.base || "—";
  document.getElementById("mStatus").textContent = ac.status;

  // Delivery Date (si está pendiente)
  if (ac.status === "Pending Delivery" && ac.deliveryDate) {
    const d = new Date(ac.deliveryDate);
    document.getElementById("mDeliveryDate").textContent = d.toUTCString().substring(5, 16);
  } else {
    document.getElementById("mDeliveryDate").textContent = "—";
  }

  // Delivered Date (si ya fue entregado)
  if (ac.deliveredDate) {
    const dd = new Date(ac.deliveredDate);
    document.getElementById("mDeliveredDate").textContent = dd.toUTCString().substring(5, 16);
  } else {
    document.getElementById("mDeliveredDate").textContent = "—";
  }

  // Condition (percent + letter)
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
   🟧 MA-8.5.3 — MODAL MAINTENANCE ADAPTER (DAYS)
   ============================================================ */

const m = ACS_resolveMaintenanceStatus(ac);

// C CHECK
if (m.nextC_days === "—") {
  document.getElementById("mLastC").textContent = "—";
  document.getElementById("mNextC").textContent = "—";
} else if (m.nextC_days < 0) {
  document.getElementById("mLastC").textContent = "OVERDUE";
  document.getElementById("mNextC").textContent = `${Math.abs(m.nextC_days)} days overdue`;
} else {
  document.getElementById("mLastC").textContent = "OK";
  document.getElementById("mNextC").textContent = `${m.nextC_days} days`;
}

// D CHECK
if (m.nextD_days === "—") {
  document.getElementById("mLastD").textContent = "—";
  document.getElementById("mNextD").textContent = "—";
} else if (m.nextD_days < 0) {
  document.getElementById("mLastD").textContent = "OVERDUE";
  document.getElementById("mNextD").textContent = `${Math.abs(m.nextD_days)} days overdue`;
} else {
  document.getElementById("mLastD").textContent = "OK";
  document.getElementById("mNextD").textContent = `${m.nextD_days} days`;
}

  // (por ahora, como estaba)
  document.getElementById("btnCcheck").disabled = true;
  document.getElementById("btnDcheck").disabled = true;
  document.getElementById("btnLog").disabled = true;

  modal.style.display = "flex";
}

function closeModal() { modal.style.display = "none"; }

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
   === INITIALIZATION =========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ============================================================
   🟨 MA-8.6.C — MAINTENANCE PIPELINE (TIME TICK)
   ============================================================ */

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

  ac = ACS_applyMaintenanceBaseline(ac);
  ac = ACS_applyMaintenanceHold(ac);
  ac = ACS_checkMaintenanceAutoTrigger(ac);

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

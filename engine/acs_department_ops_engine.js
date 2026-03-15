/* ============================================================
   🟦 ACS DEPARTMENT OPS ENGINE — PHASE B1 CORE
   ------------------------------------------------------------
   Module: engine/acs_department_ops_engine.js
   Purpose:
   • Listen to ACS_FLIGHT_ASSIGNED
   • Calculate crew & ops demand using:
       - Aircraft type
       - Route distance
       - Route frequency
   • Update HR.required per department
   • Register deficit timers (future phases)
   • Emit alerts (only missing staff)

   ⚠️ READ-ONLY CORE:
   - Does NOT touch UI
   - Does NOT touch Finance
   - Does NOT touch SkyTrack
   - Does NOT modify staff
   - Only updates HR.required

   Version: v1.0 — PHASE B1 (Demand Core Only)
   Date: 21 JAN 2026
   ============================================================ */


/* ============================================================
   🟦 A1 — DISTANCE CLASSIFICATION ENGINE
   ============================================================ */

function ACS_OPS_classifyDistance(nm) {
  if (!nm || isNaN(nm)) return "short";

  if (nm < 500) return "short";
  if (nm < 1500) return "medium";
  if (nm < 3000) return "long";
  return "ultra";
}

function ACS_OPS_getDistanceFactor(nm) {
  const cls = ACS_OPS_classifyDistance(nm);

  switch (cls) {
    case "short":  return 1.0;
    case "medium": return 1.1;
    case "long":   return 1.25;
    case "ultra":  return 1.4;
    default:        return 1.0;
  }
}


/* ============================================================
   🟦 A2 — FREQUENCY FACTOR ENGINE (SOFT REALISTIC) — 26JAN26
   ------------------------------------------------------------
   Frequency increases staff softly
   Real airlines scale minimally with frequency
   ============================================================ */

function ACS_OPS_getFrequencyFactor(flightsPerWeek) {

  if (!flightsPerWeek || isNaN(flightsPerWeek)) return 1.0;

  if (flightsPerWeek <= 3)   return 1.00;
  if (flightsPerWeek <= 7)   return 1.05;
  if (flightsPerWeek <= 14)  return 1.10;
  if (flightsPerWeek <= 30)  return 1.15;

  return 1.20;
}

/* ============================================================
   🟦 A3 — AIRCRAFT TYPE CLASSIFICATION (REUSE HR LOGIC)
   ============================================================ */

function ACS_OPS_classifyAircraft(model) {
  if (!model) return "medium";

  model = model.toLowerCase();

  const small = ["piper","cessna","dc-3","dc3","dc 3","beech","beechcraft",
                 "emb-110","emb110","emb 110","atr 42","atr42","dornier","do-228","do228"];
  if (small.some(m => model.includes(m))) return "small";

  const medium = ["a319","a320","a321","b737","737","e190","e195",
                  "crj","crj700","crj900","crj1000"];
  if (medium.some(m => model.includes(m))) return "medium";

  const large = ["a300","a310","a330","a340","b757","b767","b787","787"];
  if (large.some(m => model.includes(m))) return "large";

  const vlarge = ["b747","747","md-11","dc-10","a380","a350"];
  if (vlarge.some(m => model.includes(m))) return "vlarge";

  return "medium";
}


/* ============================================================
   🟦 A4 — BASE STAFF MATRIX (REALISTIC ACS v2) — 26JAN26
   ------------------------------------------------------------
   Base staff PER AIRCRAFT (weekly operation)
   Includes rotations + rest + reserve
   Frequency handled softly later
   ============================================================ */

const ACS_OPS_STAFF_BY_TYPE = {

  // Light / Regional / Vintage
  small:   {
    pilots:        4,
    cabin:         0,
    maintenance:   2,
    ground:        2,
    security:      1,
    flightops:     1,
    quality:       0
  },

  // A320 / B737 / E190 class
  medium:  {
    pilots:        6,
    cabin:         4,
    maintenance:   3,
    ground:        3,
    security:      1,
    flightops:     1,
    quality:       1
  },

  // A300 / B767 / B787 class
  large:   {
    pilots:        10,
    cabin:         8,
    maintenance:   5,
    ground:        5,
    security:      2,
    flightops:     2,
    quality:       1
  },

  // B747 / DC-10 / A380 class
  vlarge:  {
    pilots:        16,
    cabin:         14,
    maintenance:   8,
    ground:        8,
    security:      3,
    flightops:     3,
    quality:       2
  }
};

/* ============================================================
   🟧 A2-1 — AIRCRAFT CLASSIFIER (REAL OPS / HISTORICAL)
   ------------------------------------------------------------
   • Usa datos reales del avión (seats / year / mtow)
   • Define clase, era y Flight Engineer
   • NO calcula HR
   • Función pura (sin efectos secundarios)
   ============================================================ */

function ACS_OPS_classifyAircraftReal(ac) {

  if (!ac || !ac.data) {
    return {
      class: "UNKNOWN",
      era: "UNKNOWN",
      requiresFE: false
    };
  }

  const seats = Number(ac.data.seats || 0);
  const year  = Number(ac.data.year  || 9999);
  const mtow  = Number(ac.data.mtow_kg || 0);

  // ------------------------------------------------------------
  // 1️⃣ Clasificación por tamaño (PRIMARY = seats)
  // ------------------------------------------------------------
  let aircraftClass = "SMALL";

  if (seats <= 19) aircraftClass = "SMALL";
  else if (seats <= 70) aircraftClass = "MEDIUM";
  else if (seats <= 150) aircraftClass = "LARGE";
  else aircraftClass = "VERY_LARGE";

  // ------------------------------------------------------------
  // 2️⃣ Era operativa (histórica)
  // ------------------------------------------------------------
  let era = "MODERN";

  if (year <= 1955) era = "EARLY_PISTON";
  else if (year <= 1975) era = "TRANSITIONAL";
  else era = "MODERN";

  // ------------------------------------------------------------
  // 3️⃣ Flight Engineer (histórico real)
  // ------------------------------------------------------------
  let requiresFE = false;

  // Regla realista:
  // - Antes de ~1970
  // - Aviones medianos o grandes
  // - Sistemas no automatizados
  if (year <= 1970 && (aircraftClass === "MEDIUM" || aircraftClass === "LARGE" || aircraftClass === "VERY_LARGE")) {
    requiresFE = true;
  }

  // Algunos SMALL antiguos complejos (ej: DC-5)
  if (year <= 1945 && aircraftClass === "SMALL" && mtow >= 8000) {
    requiresFE = true;
  }

  return {
    class: aircraftClass,
    era: era,
    requiresFE: requiresFE
  };
}

// ============================================================
// 🟢 FASE 1.1 — OPS Aircraft Utilization Level (AUL)
// Calcula intensidad operativa por avión (LOW / MEDIUM / HIGH)
// ============================================================

function OPS_calculateAircraftUtilization(scheduleItems) {
  const aircraftStats = {};

  scheduleItems.forEach(item => {
    if (!item.aircraftId || !item.day) return;

    if (!aircraftStats[item.aircraftId]) {
      aircraftStats[item.aircraftId] = {
        legs: 0,
        days: new Set()
      };
    }

    aircraftStats[item.aircraftId].legs += 1;
    aircraftStats[item.aircraftId].days.add(item.day);
  });

  const utilization = {};

  Object.entries(aircraftStats).forEach(([aircraftId, data]) => {
    const daysOperated = data.days.size || 1;
    const legsPerDay = data.legs / daysOperated;

    let level = "LOW";
    if (legsPerDay >= 5) level = "HIGH";
    else if (legsPerDay >= 3) level = "MEDIUM";

    utilization[aircraftId] = {
      legsTotal: data.legs,
      daysOperated,
      legsPerDay: Number(legsPerDay.toFixed(2)),
      utilizationLevel: level
    };
  });

  return utilization;
}

// ============================================================
// 🧮 CALCULATE REQUIRED STAFF — CANONICAL AIRLINE MODEL (FASE 2)
// ============================================================
function calculateRequiredStaff() {

  const scheduleItems = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  const utilization = JSON.parse(localStorage.getItem("ACS_AIRCRAFT_UTILIZATION") || "{}");

  const aircraftSet = new Set(
    scheduleItems
      .filter(f => f && f.assigned === true && f.aircraftId)
      .map(f => f.aircraftId)
  );

  let totals = {
    pilotsSmall: 0,
    pilotsMedium: 0,
    pilotsLarge: 0,
    pilotsVeryLarge: 0,
    cabinCrew: 0,
    flightEngineers: 0,
    groundHandling: 0,
    technicalMaintenance: 0,
    flightOpsDivision: 0,
    routeStrategies: 0
  };

  aircraftSet.forEach(aircraftId => {

    const u = utilization[aircraftId];
    if (!u) return;

    let crews = 2;
    if (u.utilizationLevel === "MEDIUM") crews = 3;
    if (u.utilizationLevel === "HIGH") crews = 4;

    // ✈️ SMALL AIRCRAFT — 1940 MODEL
    totals.pilotsSmall += crews * 2;
    totals.cabinCrew += crews * 2;
    totals.flightEngineers += crews * 1;

    totals.groundHandling += crews * 0.5;
    totals.technicalMaintenance += crews * 0.25;
    totals.flightOpsDivision += crews * 0.25;
  });

  // Route strategy is company-wide, not per aircraft
  totals.routeStrategies = Math.max(1, Math.ceil(aircraftSet.size / 2));

  // 🔒 Round & normalize
  Object.keys(totals).forEach(k => {
    totals[k] = Math.max(0, Math.ceil(totals[k]));
  });

  console.log(
    "%c🟢 HR REQUIRED STAFF (CANONICAL):",
    "color:#00ffcc;font-weight:700",
    totals
  );

  return totals;
}

/* ============================================================
   🟦 A2-3 — AIRCRAFT CLASSIFIER (CANONICAL)
   ------------------------------------------------------------
   • Source of truth: ACS_AIRCRAFT_DB
   • Period correct: 1940–2026
   • NO HR logic here
   • NO schedule logic here
   • Returns PURE classification data
   ============================================================ */

function ACS_OPS_classifyAircraftFromDB(aircraft) {

  if (!aircraft || !aircraft.model) {
    console.warn("A2-3: Invalid aircraft input", aircraft);
    return null;
  }

  // 🔑 Buscar en DB canónica
  const db = Array.isArray(window.ACS_AIRCRAFT_DB)
    ? window.ACS_AIRCRAFT_DB
    : [];

  const entry = db.find(a =>
    a &&
    a.model &&
    String(a.model).toUpperCase() === String(aircraft.model).toUpperCase()
  );

  if (!entry) {
    console.warn("A2-3: Aircraft not found in DB", aircraft.model);
    return null;
  }

  const seats = Number(entry.seats || 0);
  const mtow  = Number(entry.mtow_kg || 0);
  const year  = Number(entry.year || 0);
  const enginesRaw = String(entry.engines || "").toUpperCase();

  // ============================================================
  // ✈️ SIZE CLASSIFICATION (REAL WORLD)
  // ============================================================

  let size = "small";

  if (seats >= 250) size = "vlarge";
  else if (seats >= 100) size = "large";
  else if (seats >= 20)  size = "medium";
  else size = "small";

  // ============================================================
  // 🧑‍✈️ BASE PILOTS PER FLIGHT
  // ============================================================

  let basePilots = 2;

  if (size === "vlarge") {
    basePilots = 3; // long-haul realism
  }

  // ============================================================
  // 🧠 FLIGHT ENGINEER (HISTORICAL LOGIC)
  // ============================================================

  let requiresFE = false;

  // Count engines (best effort)
  let engineCount = 0;
  if (enginesRaw.includes("4")) engineCount = 4;
  else if (enginesRaw.includes("3")) engineCount = 3;
  else if (enginesRaw.includes("2")) engineCount = 2;

  // Seen patterns like "JT3D x4", "RB211-22B x3"
  if (engineCount === 0) {
    const match = enginesRaw.match(/X\s*(\d)/);
    if (match) engineCount = parseInt(match[1], 10);
  }

  // Historical rule:
  // • Pre-1990 AND >=3 engines → Flight Engineer
  if (year < 1990 && engineCount >= 3) {
    requiresFE = true;
  }

  // ============================================================
  // 🧾 FINAL CLASSIFICATION OBJECT
  // ============================================================

  return {
    model: entry.model,
    manufacturer: entry.manufacturer || "—",
    year,
    seats,
    mtow_kg: mtow,

    size,              // small | medium | large | vlarge
    basePilots,        // 2 or 3
    requiresFE,        // true / false
    engineCount
  };
}

/* ============================================================
   🟢 PHASE B1 — OPS REQUIRED STAFF REBUILD (CANONICAL CORE)
   ------------------------------------------------------------
   Function: ACS_OPS_recalculateAllRequired()
   Purpose:
   • Rebuild REQUIRED staff for all departments
   • Source of truth:
       - scheduleItems (assigned flights)
       - ACS_MyAircraft
   • Applies:
       - Aircraft Utilization (AUL)
       - Historical staffing logic (1940–2026)
       - Startup operation caps
       - Management load
   • Does NOT:
       - Modify staff
       - Modify Finance
       - Modify SkyTrack
   • Output:
       - HR[dep].required (absolute)
   ============================================================ */

function ACS_OPS_recalculateAllRequired() {

  console.log("%c🧠 OPS REQUIRED REBUILD — START", "color:#00ffcc;font-weight:700");

  const HR = ACS_HR_load();
  if (!HR) return;

  let scheduleItems = [];
  try {
    scheduleItems = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch (e) {
    scheduleItems = [];
  }

  const activeFlights = Array.isArray(scheduleItems)
    ? scheduleItems.filter(f => f && f.assigned === true && f.aircraftId && f.day)
    : [];

  // 🟢 Si no hay vuelos → required = 0 en todo
  if (activeFlights.length === 0) {

    Object.keys(HR).forEach(id => {
      if (HR[id] && typeof HR[id].required === "number") {
        HR[id].required = 0;
      }
    });

    ACS_HR_save(HR);

    if (typeof loadDepartments === "function") loadDepartments();
    if (typeof HR_updateKPI === "function") HR_updateKPI();

    console.log("%c🟢 OPS REQUIRED REBUILD — NO FLIGHTS (ALL ZERO)", "color:#7CFFB2;font-weight:700");
    return;
  }

  // ============================================================
  // 🟢 FASE 1.2 — AIRCRAFT UTILIZATION (SAFE)
  // ============================================================
  const aircraftUtilization = OPS_calculateAircraftUtilization(scheduleItems);

  localStorage.setItem(
    "ACS_AIRCRAFT_UTILIZATION",
    JSON.stringify(aircraftUtilization)
  );

  console.log(
    "%c🟢 OPS AUL UPDATED",
    "color:#00ffcc;font-weight:700",
    aircraftUtilization
  );

  // ============================================================
  // ✅ IDEAL STAFF
  // ============================================================
  const ideal = calculateRequiredStaff();
  if (!ideal) {
    console.warn("❌ OPS REQUIRED REBUILD — calculateRequiredStaff returned null");
    return;
  }

  const MAP = [
    ["pilots_small",   ideal.pilotsSmall],
    ["pilots_medium",  ideal.pilotsMedium],
    ["pilots_large",   ideal.pilotsLarge],
    ["pilots_vlarge",  ideal.pilotsVeryLarge],
    ["cabin",          ideal.cabinCrew],
    ["maintenance",    ideal.technicalMaintenance],
    ["ground",         ideal.groundHandling],
    ["flightops",      ideal.flightOpsDivision],
    ["routes",         ideal.routeStrategies],
    ["flight_engineers", ideal.flightEngineers]
  ];

  MAP.forEach(([depId, value]) => {
    if (!HR[depId]) return;
    HR[depId].required = Math.max(0, Math.ceil(Number(value || 0)));
  });

// ============================================================
// 🟢 FASE 2 — OPS AUTO RECALC WATCHER (SCHEDULE → HR)
// ------------------------------------------------------------
// Purpose:
// • Detect changes in scheduleItems (routes added/removed)
// • Auto-trigger OPS → HR recalculation
// • NO dependency on Schedule UI
// • DOES NOT modify scheduleItems
// • DOES NOT touch Delete logic
// ============================================================

(function ACS_OPS_ScheduleWatcher() {

  let _lastScheduleHash = null;

  function hashSchedule(items) {
    try {
      return JSON.stringify(items.map(f => f.id)).length;
    } catch {
      return null;
    }
  }

  setInterval(() => {

    if (typeof ACS_OPS_recalculateAllRequired !== "function") return;

    const raw = localStorage.getItem("scheduleItems");
    if (!raw) return;

    let items;
    try {
      items = JSON.parse(raw);
    } catch {
      return;
    }

    if (!Array.isArray(items)) return;

    const currentHash = hashSchedule(items);

    if (_lastScheduleHash === null) {
      _lastScheduleHash = currentHash;
      return;
    }

    if (currentHash !== _lastScheduleHash) {
      _lastScheduleHash = currentHash;

      ACS_OPS_recalculateAllRequired();

      console.log(
        "%c🟢 OPS AUTO RECALC — scheduleItems changed",
        "color:#00ffcc;font-weight:700",
        { flights: items.length }
      );
    }

  }, 3000); // every 3s — light & safe

})();
   
  // ============================================================
  // 🟦 A5 — STARTUP OPERATION CAPS (MOVED INSIDE OPS)
  // ============================================================
  (function applyStartupCaps(){

    const totalFlights = activeFlights.length;

    if (totalFlights <= 3) {

      const STARTUP_CAPS = {
        pilots_small:   2,
        pilots_medium:  2,
        pilots_large:   3,
        pilots_vlarge:  4,
        cabin:          1,
        maintenance:    1,
        ground:         1,
        flightops:      1,
        quality:        0,
        security:       0,
        routes:         0
      };

      Object.keys(HR).forEach(depID => {
        const dep = HR[depID];
        if (!dep || typeof dep.required !== "number") return;

        const cap = STARTUP_CAPS[depID];
        if (typeof cap === "number" && dep.required > cap) {
          dep.required = cap;
        }
      });

      console.log(
        "%c🟢 STARTUP OPERATION MODE ACTIVE",
        "color:#7CFFB2;font-weight:700",
        "Flights:", totalFlights
      );
    }
  })();

  // ============================================================
  // 🧭 MANAGEMENT
  // ============================================================
  if (typeof ACS_HR_calculateManagementRequired === "function") {
    ACS_HR_calculateManagementRequired();
  }

  // ============================================================
  // 💾 SAVE + UI
  // ============================================================
  ACS_HR_save(HR);

  if (typeof loadDepartments === "function") loadDepartments();
  if (typeof HR_updateKPI === "function") HR_updateKPI();

  console.log("%c✅ OPS REQUIRED REBUILD — COMPLETED", "color:#00ffcc;font-weight:700");
}

/* ============================================================
   🟦 B2 — DEFICIT TIMERS + MORALE DEGRADATION ENGINE (PHASE A)
   Ubicación: FINAL DEL ARCHIVO acs_department_ops_engine.js
   ------------------------------------------------------------
   • Detecta déficit persistente por departamento
   • Escala alertas semanalmente
   • Inicia degradación de moral progresiva
   • NO aplica delays todavía (Phase B)
   ============================================================ */

// Storage: estado de déficit por departamento
function ACS_OPS_loadDeficitState() {
  return JSON.parse(localStorage.getItem("ACS_OPS_DEFICITS") || "{}");
}

function ACS_OPS_saveDeficitState(state) {
  localStorage.setItem("ACS_OPS_DEFICITS", JSON.stringify(state));
}

// Inicializar estructura si no existe
if (!localStorage.getItem("ACS_OPS_DEFICITS")) {
  ACS_OPS_saveDeficitState({});
}

/* ============================================================
   🔎 MONTHLY DEFICIT CHECK + MORALE DEGRADATION (ACS OFFICIAL)
   ------------------------------------------------------------
   • Se ejecuta 1 vez por mes de juego
   • Degradación suave y estratégica
   • Conecta con alertas + OPS impact
   ============================================================ */

function ACS_OPS_checkDepartmentDeficits_Monthly() {

// 💼 Salary alert monthly check
if (typeof ACS_HR_emitSalaryAlerts === "function") {
  ACS_HR_emitSalaryAlerts();
}
   
  const HR = ACS_HR_load();
  if (!HR) return;

  const state = ACS_OPS_loadDeficitState();

  Object.keys(HR).forEach(depID => {

    const dep = HR[depID];
    if (!dep || typeof dep.required !== "number") return;

    const staff    = dep.staff || 0;
    const required = dep.required || 0;

    const deficit = Math.max(0, required - staff);

    // === NO DEFICIT → limpiar estado
    if (deficit === 0) {
      if (state[depID]) {
        delete state[depID];
      }
      return;
    }

    // === DEFICIT ACTIVO
    if (!state[depID]) {
      state[depID] = {
        months: 0,
        lastAlertMonth: -1
      };
    }

    const entry = state[depID];
    entry.months++;

    // ========================================================
    // 🔔 ALERTA MENSUAL
    // ========================================================
    if (window.ACS_Alerts && typeof window.ACS_Alerts.push === "function") {

      if (entry.lastAlertMonth !== entry.months) {

        let level = "info";
        if (entry.months >= 2) level = "warning";
        if (entry.months >= 4) level = "danger";

        window.ACS_Alerts.push({
          title: "Staff Deficit Detected",
          message: `${dep.name} is missing ${deficit} staff for ${entry.months} months.`,
          level: level,
          source: "Department Ops"
        });

        entry.lastAlertMonth = entry.months;
      }
    }

    // ========================================================
    // 😟 MORALE DEGRADATION — MONTHLY REALISTIC MODEL
    // ========================================================

    // Fórmula suave proporcional
    let drop = 1;

    if (staff > 0) {
      drop = Math.round((deficit / staff) * 10);

      if (drop < 1) drop = 1;
      if (drop > 8) drop = 8;
    }

    const oldMorale = dep.morale || 100;
    dep.morale = Math.max(40, oldMorale - drop);

    console.log(
      `%c😟 MONTHLY MORALE DOWN — ${dep.name}`,
      "color:#ff5555;font-weight:600",
      "Deficit:", deficit,
      "Drop:", drop + "%",
      "New morale:", dep.morale
    );

  });

  ACS_HR_save(HR);
  ACS_OPS_saveDeficitState(state);

  // refrescar tabla + KPI
  if (typeof loadDepartments === "function") loadDepartments();
  if (typeof HR_updateKPI === "function") HR_updateKPI();
}

/* ============================================================
   ⏱️ MONTHLY DEFICIT MORALE TICK — ACS OFFICIAL
   ------------------------------------------------------------
   • Ejecuta degradación SOLO 1 vez por mes de juego
   • Moral baja lentamente y de forma estratégica
   • Mucho más jugable en simulación dinámica
   ============================================================ */

let __OPS_lastMonth = null;

registerTimeListener((time) => {

  const year  = time.getUTCFullYear();
  const month = time.getUTCMonth(); // 0–11

  const key = `${year}-${month}`;

  if (__OPS_lastMonth === null) __OPS_lastMonth = key;

  // Ejecutar solo cuando cambia el mes de juego
  if (key !== __OPS_lastMonth) {

    console.log(
      "%c🗓 OPS MONTH TICK — MORALE CHECK",
      "color:#00ffcc;font-weight:600",
      "Year:", year,
      "Month:", month + 1
    );

    ACS_OPS_checkDepartmentDeficits_Monthly();

    __OPS_lastMonth = key;
  }

});

/* ============================================================
   🟦 PHASE B — DELAY ENGINE + OPERATIONAL IMPACT CORE
   ------------------------------------------------------------
   • Activa delays si déficit persiste >= 4 semanas
   • Penaliza eficiencia y revenue (sin accidentes)
   • Integración pasiva con Observer / SkyTrack
   ============================================================ */

// Storage de impacto operacional
function ACS_OPS_loadImpactState() {
  return JSON.parse(localStorage.getItem("ACS_OPS_IMPACTS") || "{}");
}

function ACS_OPS_saveImpactState(state) {
  localStorage.setItem("ACS_OPS_IMPACTS", JSON.stringify(state));
}

if (!localStorage.getItem("ACS_OPS_IMPACTS")) {
  ACS_OPS_saveImpactState({});
}

/* ============================================================
   ✈️ OPERATIONAL PENALTY CHECK (semanal)
   ============================================================ */
function ACS_OPS_applyOperationalImpact() {

  const HR = ACS_HR_load();
  const deficits = ACS_OPS_loadDeficitState();
  const impacts  = ACS_OPS_loadImpactState();

  Object.keys(deficits).forEach(depID => {

    const entry = deficits[depID];
    if (!entry) return;

    const weeks = entry.weeks || 0;

    // Solo activar impacto después de 4 semanas
    if (weeks < 4) return;

    if (!impacts[depID]) {
      impacts[depID] = {
        delayFactor: 0,
        revenueLoss: 0
      };
    }

    const impact = impacts[depID];

    // Escalado progresivo
    if (weeks >= 4) impact.delayFactor = 0.05;   // 5% delays
    if (weeks >= 6) impact.delayFactor = 0.10;   // 10%
    if (weeks >= 8) impact.delayFactor = 0.20;   // 20%

    // Penalización económica
    impact.revenueLoss = Math.round(impact.delayFactor * 100);

    // 🔔 ALERTA OPERACIONAL
    if (window.ACS_Alerts && typeof window.ACS_Alerts.push === "function") {
      window.ACS_Alerts.push({
        title: "Operational Performance Degraded",
        message: `${HR[depID].name} staffing issues causing delays (${Math.round(impact.delayFactor*100)}%).`,
        level: "danger",
        source: "Department Ops"
      });
    }

    console.log(
      `%c⏱ OPS IMPACT — ${HR[depID].name}`,
      "color:#ffaa00;font-weight:600",
      "Delay factor:", impact.delayFactor,
      "Revenue loss %:", impact.revenueLoss
    );
  });

  ACS_OPS_saveImpactState(impacts);
}


/* ============================================================
   🟦 PHASE C — BONUS & RECOVERY ENGINE
   ------------------------------------------------------------
   • Máx 2 bonus por departamento
   • Cooldown 2 semanas
   • Subida proporcional real de moral
   ============================================================ */

function ACS_OPS_loadBonusState() {
  return JSON.parse(localStorage.getItem("ACS_OPS_BONUS") || "{}");
}

function ACS_OPS_saveBonusState(state) {
  localStorage.setItem("ACS_OPS_BONUS", JSON.stringify(state));
}

if (!localStorage.getItem("ACS_OPS_BONUS")) {
  ACS_OPS_saveBonusState({});
}

/* ============================================================
   🎁 APPLY BONUS (API PUBLICA PARA HR MODAL)
   ============================================================ */
function ACS_OPS_applyDepartmentBonus(depID, percent) {

  const HR = ACS_HR_load();
  const bonusState = ACS_OPS_loadBonusState();

  if (!HR[depID]) return false;

  if (!bonusState[depID]) {
    bonusState[depID] = {
      used: 0,
      lastWeek: -999
    };
  }

  const entry = bonusState[depID];

  // Máximo 2 bonus
  if (entry.used >= 2) {
    alert("⚠️ Bonus limit reached for this department.");
    return false;
  }

  // Cooldown 2 semanas
  const currentWeek = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  if (currentWeek - entry.lastWeek < 2) {
    alert("⏳ Bonus cooldown active. Wait 2 weeks.");
    return false;
  }

  const dep = HR[depID];

  // Cálculo subida moral realista
  const gain = Math.min(15, Math.round(percent / 2));
  dep.morale = Math.min(100, dep.morale + gain);

  // Coste económico real
  const cost = Math.round(dep.staff * dep.salary * (percent / 100));

  ACS_addExpense("bonuses", cost);

  entry.used++;
  entry.lastWeek = currentWeek;

  ACS_HR_save(HR);
  ACS_OPS_saveBonusState(bonusState);

  console.log(
    `%c🎁 BONUS APPLIED — ${dep.name}`,
    "color:#00ff88;font-weight:600",
    "Percent:", percent,
    "Morale gain:", gain,
    "New morale:", dep.morale,
    "Cost:", cost
  );

  return true;
}


/* ============================================================
   ⏱️ WEEKLY OPS MASTER TICK (ACS OFFICIAL FIXED)
   ------------------------------------------------------------
   • Recalcula DEMAND semanal consolidado
   • Luego aplica impactos
   • Elimina función fantasma rota
   ============================================================ */

let __OPS_masterWeek = null;

registerTimeListener((time) => {

  const year  = time.getUTCFullYear();
  const week  = Math.floor((time - new Date(year,0,1)) / (7 * 24 * 3600 * 1000));

  if (__OPS_masterWeek === null) __OPS_masterWeek = week;

  if (week !== __OPS_masterWeek) {

    console.log("%c🧭 OPS MASTER WEEK TICK", "color:#00ffcc;font-weight:600", "Week:", week);

    // 🟢 NUEVO: recalcular demand REAL semanal
    ACS_OPS_recalculateAllRequired();

    // Phase B — impactos operativos
    ACS_OPS_applyOperationalImpact();

    __OPS_masterWeek = week;
  }

});

/* ============================================================
   🟢 HR SALARY ENGINE SAFE START (TIME READY)
   ------------------------------------------------------------
   • Ejecuta Salary Engine solo cuando el Time Engine ya existe
   • Evita bootstrap temprano con year undefined
   ============================================================ */

let __HR_salaryInitialized = false;

registerTimeListener((time) => {

  if (__HR_salaryInitialized) return;
  if (!(time instanceof Date)) return;

  console.log(
    "%c💰 HR SALARY ENGINE START (TIME READY)",
    "color:#00ffcc;font-weight:700",
    "Year:", time.getUTCFullYear()
  );

  if (typeof ACS_HR_salaryEngineBootstrap === "function") {
    ACS_HR_salaryEngineBootstrap();
  }

  __HR_salaryInitialized = true;

});

/* ============================================================
   🟦 A3.1.1 — HISTORICAL SALARY MATRIX (ACS OFFICIAL)
   ------------------------------------------------------------
   • Define frecuencia de revisión histórica
   • Define ajuste automático por era
   ============================================================ */

function ACS_HR_getSalaryEraParams(year) {

  if (year < 1960) {
    return { reviewInterval: 4, autoRaise: 6 };   // 1940–1959
  }

  if (year < 1980) {
    return { reviewInterval: 3, autoRaise: 8 };   // 1960–1979
  }

  if (year < 2000) {
    return { reviewInterval: 4, autoRaise: 5 };   // 1980–1999
  }

  if (year < 2010) {
    return { reviewInterval: 3, autoRaise: 6 };   // 2000–2009
  }

  // 2010–2026
  return { reviewInterval: 2, autoRaise: 4 };
}

/* ============================================================
   🟦 A3B.4 — HISTORICAL MARKET SALARY BASE (ACS OFFICIAL)
   ------------------------------------------------------------
   • Define salario de mercado base por rol (REALISMO)
   • Ajusta dinámicamente por era (JUGABILIDAD)
   • Fuente ÚNICA de marketSalary
   ============================================================ */

function ACS_HR_getHistoricalMarketBase(depId, year) {

  // =========================
  // 🕒 ERA ADJUSTMENT
  // =========================
  const era = ACS_HR_getSalaryEraParams(year);
  const eraFactor = 1 + (era.autoRaise / 100);

  // =========================
  // 📜 HISTORICAL BASE (1940s)
  // Valores base mensuales
  // =========================
  const BASE_1940 = {

    // ✈️ PILOTS
    pilots_small:       600,
    pilots_medium:      750,
    pilots_large:       900,
    pilots_very_large:  1100,

    // 👩‍✈️ CABIN
    cabin_crew:         180,

    // 🛠️ OPS & TECH
    technical_maintenance: 260,
    ground_handling:       120,
    flight_ops:            240,

    // 🧠 MANAGEMENT
    route_strategies: 240,
    customer_services: 230,

    // 👔 EXEC / ADMIN
    human_resources: 210,
    quality_department: 130,
    safety_security: 130,
    economics_finance: 210,
    corporate_comms: 210,

    // 👑 CEO / VP
    ceo: 950,
    vp_management: 950
  };

  const base = BASE_1940[depId];

  if (!base) return null;

  return Math.round(base * eraFactor);
}


/* ============================================================
   🟦 A3A.1 — PILOT SALARY ORDER (CANONICAL)
   ------------------------------------------------------------
   Purpose:
   • Define hierarchy for salary coherence
   • Used ONLY for market reference clamp
   • Does NOT touch player salary
   ============================================================ */

const ACS_PILOT_SALARY_ORDER = [
  "pilots_small",
  "pilots_medium",
  "pilots_large",
  "pilots_very_large"
];

/* ============================================================
   🟦 A3A.2 — PILOT MARKET SALARY CLAMP (SOFT)
   ------------------------------------------------------------
   • Enforces Small < Medium < Large < Very Large
   • Adjusts ONLY market reference
   • Leaves player salary untouched
   • Silent & OPS-safe
   ============================================================ */

function ACS_HR_applyPilotSalaryCoherenceClamp(hr) {

  if (!hr || typeof hr !== "object") return;

  let lastMarket = 0;

  ACS_PILOT_SALARY_ORDER.forEach(id => {

    const dep = hr[id];
    if (!dep || typeof dep.marketSalary !== "number") return;

    // Si rompe jerarquía, ajustar suavemente
    if (dep.marketSalary <= lastMarket) {

      const corrected = Math.round(lastMarket * 1.15); // +15% escalón mínimo

      console.warn(
        "🧠 Pilot salary coherence clamp applied:",
        dep.name,
        "Market:",
        dep.marketSalary,
        "→",
        corrected
      );

      dep.marketSalary = corrected;
    }

    lastMarket = dep.marketSalary;
  });
}

/* ============================================================
   🟦 A3.1.2 — INIT SALARY METADATA CORE (FIX TIME ENGINE)
   ------------------------------------------------------------
   • Inicializa lastSalaryReviewYear si no existe
   • Inicializa salaryStatus = "ok"
   • Lee año REAL desde Time Engine ACS
   ============================================================ */

function ACS_HR_initSalaryMetadata() {

  const HR = ACS_HR_load();
  if (!HR) return;

  // 🕒 Año real desde Time Engine ACS (canon)
  let currentYear;

  if (window.ACS_TIME_CURRENT instanceof Date) {
    currentYear = window.ACS_TIME_CURRENT.getUTCFullYear();
  } else {
    currentYear = new Date().getUTCFullYear(); // fallback seguro
  }

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep || typeof dep !== "object") return;

    // Año base si no existe
    if (typeof dep.lastSalaryReviewYear !== "number") {
      dep.lastSalaryReviewYear = currentYear;
    }

    // Estado inicial
    if (!dep.salaryStatus) {
      dep.salaryStatus = "ok"; // ok | review | lagging
    }

  });

  ACS_HR_save(HR);
}

/* ============================================================
   🟦 A3.1.3 — SALARY STATUS DETECTOR CORE (FIX TIME ENGINE)
   ------------------------------------------------------------
   • Detecta estado salarial por departamento
   • Define color visual + base de alertas
   • Lee año REAL desde Time Engine ACS
   ============================================================ */

function ACS_HR_updateSalaryStatus() {

  // 🔔 Emitir alertas salariales si corresponde
  if (typeof ACS_HR_emitSalaryAlerts === "function") {
    ACS_HR_emitSalaryAlerts();
  }

  const HR = ACS_HR_load();
  if (!HR) return;

  // 🕒 Año real desde Time Engine ACS (canon)
  let currentYear;

  if (window.ACS_TIME_CURRENT instanceof Date) {
    currentYear = window.ACS_TIME_CURRENT.getUTCFullYear();
  } else {
    currentYear = new Date().getUTCFullYear(); // fallback seguro
  }

  const eraParams = ACS_HR_getSalaryEraParams(currentYear);

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep || typeof dep.lastSalaryReviewYear !== "number") return;

    const yearsSince = currentYear - dep.lastSalaryReviewYear;

    // Estado normal
    if (yearsSince < eraParams.reviewInterval) {
      dep.salaryStatus = "ok";
      return;
    }

    // Review disponible
    if (yearsSince < eraParams.reviewInterval + 2) {
      dep.salaryStatus = "review";
      return;
    }

    // Atraso crítico
    dep.salaryStatus = "lagging";

  });

  ACS_HR_save(HR);
}

/* ============================================================
   🟦 B3.1 — MARKET REFERENCE NORMALIZER (PURE)
   ------------------------------------------------------------
   Purpose:
   • Define qué significa "marketSalary"
   • Garantiza valor estable y usable por Finance
   • NO toca salary del jugador
   ============================================================ */

function ACS_HR_normalizeMarketReference(dep) {

  if (!dep || typeof dep !== "object") return null;

  const market = Number(dep.marketSalary || 0);
  const salary = Number(dep.salary || 0);

  if (market <= 0) {
    return {
      marketSalary: salary,   // fallback seguro
      ratio: 1,
      deviation: 0
    };
  }

  const ratio = salary / market;
  const deviation = salary - market;

  return {
    marketSalary: market,
    ratio: Number(ratio.toFixed(2)),
    deviation: Math.round(deviation)
  };
}

/* ============================================================
   🟦 B3.2 — HR → FINANCE METRICS BUILDER
   ------------------------------------------------------------
   Purpose:
   • Construye métricas limpias para Finance
   • No recalcula HR
   • No depende de UI
   ============================================================ */

function ACS_HR_buildFinanceMetrics() {

  const HR = ACS_HR_load();
  if (!HR) return null;

  let totalMarketPayroll = 0;
  let totalRealPayroll   = 0;
  let totalDeviation     = 0;

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep || typeof dep.staff !== "number") return;

    const norm = ACS_HR_normalizeMarketReference(dep);
    if (!norm) return;

    const staff = dep.staff;

    const marketPayroll = staff * norm.marketSalary;
    const realPayroll   = staff * dep.salary;

    dep.marketPayroll    = Math.round(marketPayroll);
    dep.payrollDeviation = Math.round(realPayroll - marketPayroll);
    dep.salaryDeviation  = norm.deviation;
    dep.salaryRatio      = norm.ratio;

    totalMarketPayroll += marketPayroll;
    totalRealPayroll   += realPayroll;
    totalDeviation     += (realPayroll - marketPayroll);
  });

  return {
    marketPayroll: Math.round(totalMarketPayroll),
    realPayroll:   Math.round(totalRealPayroll),
    deviation:     Math.round(totalDeviation)
  };
}

/* ============================================================
   🟦 A3.3.1 — SALARY ALERT STATE STORAGE
   ------------------------------------------------------------
   • Evita spam de alertas salariales
   • 1 alerta por departamento por año
   ============================================================ */

function ACS_HR_loadSalaryAlertState() {
  return JSON.parse(localStorage.getItem("ACS_HR_SALARY_ALERTS") || "{}");
}

function ACS_HR_saveSalaryAlertState(state) {
  localStorage.setItem("ACS_HR_SALARY_ALERTS", JSON.stringify(state));
}

if (!localStorage.getItem("ACS_HR_SALARY_ALERTS")) {
  ACS_HR_saveSalaryAlertState({});
}


/* ============================================================
   🟦 A3.3.2 — SALARY ALERT EMITTER CORE (ACS OFFICIAL)
   ------------------------------------------------------------
   • Emite alertas SOLO si Auto Salary está OFF
   • Review  → info
   • Lagging → warning
   • Sin spam (1 por año por dept)
   ============================================================ */

function ACS_HR_emitSalaryAlerts() {

  const HR = ACS_HR_load();
  if (!HR) return;

  // ============================================================
  // 🕒 AÑO CANÓNICO DESDE TIME ENGINE ACS MODERNO
  // ============================================================
  let currentYear;

  if (window.ACS_TIME_CURRENT instanceof Date) {
    currentYear = window.ACS_TIME_CURRENT.getUTCFullYear();
  } else {
    currentYear = new Date().getUTCFullYear(); // fallback seguro
  }

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep) return;

    const salary = Number(dep.salary || 0);
    const market = Number(dep.marketReference || dep.market || 0);

    if (!market || !salary) return;

    const ratio = Math.round((salary / market) * 100);

    // ============================================================
    // 🔒 NO ALERTAR DEPARTAMENTOS MANUALES
    // ============================================================
    if (dep.salaryOverride === true || dep.salaryPolicy === "MANUAL") {
      return;
    }

    // ============================================================
    // 🔔 GENERACIÓN DE ALERTAS
    // ============================================================
    if (ratio < 70) {

      ACS_alert(
        "HR",
        `⚠ ${dep.name} salaries critically below market (${ratio}%)`,
        "warning"
      );

      dep.salaryStatus = "critical";

    } else if (ratio < 85) {

      ACS_alert(
        "HR",
        `⚠ ${dep.name} salaries below market (${ratio}%)`,
        "warning"
      );

      dep.salaryStatus = "low";

    } else {

      dep.salaryStatus = "ok";
    }

    dep.lastAlertYear = currentYear;
  });

  ACS_HR_save(HR);
}

/* ============================================================
   🟧 S2 — AUTO SALARY NORMALIZATION (CANONICAL REBUILD)
   ------------------------------------------------------------
   • NO porcentajes sobre salario viejo
   • Recalcula desde base histórica por año + base/rol
   • Pilotos por tamaño usando motor HR
   • Respeta MANUAL OVERRIDE (no pisa)
   • Usa SOLO año del juego (Time Authority)
   ============================================================ */

function ACS_HR_applyAutoSalaryNormalization() {

  // ============================================================
  // 🔒 PROTECCIÓN GLOBAL — RESPETAR AUTO SALARY OFF
  // ============================================================
  const autoSalaryEnabled = ACS_HR_isAutoSalaryEnabled();
  if (!autoSalaryEnabled) {
    console.log("%c🔒 AUTO SALARY NORMALIZATION BLOCKED (GLOBAL OFF)","color:#ff5555;font-weight:800");
    return;
  }

  const HR = ACS_HR_load();
  if (!HR) return;

  // ============================================================
  // 🕒 AÑO DEL JUEGO (CANON) — sin año del sistema
  // ============================================================
  const currentYear = (typeof ACS_HR_getGameYear === "function")
    ? ACS_HR_getGameYear()
    : (window.ACS_TIME_CURRENT instanceof Date ? window.ACS_TIME_CURRENT.getUTCFullYear() : undefined);

  if (!currentYear || typeof currentYear !== "number") {
    console.log("%c⏳ AUTO SALARY WAITING — Game Year not ready (skip)","color:#ffcf66;font-weight:800");
    return;
  }

  console.log("%c💰 AUTO SALARY NORMALIZATION (REBUILD FROM HISTORICAL BASE)","color:#7CFFB2;font-weight:700","Year:",currentYear);

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep) return;

    // ============================================================
    // 🔒 SKIP MANUAL OVERRIDE
    // ============================================================
    if (dep.salaryOverride === true || dep.salaryPolicy === "MANUAL") return;

    let targetSalary = 0;
  
    // ✈️ PILOTS — RESOLUCIÓN POR TAMAÑO (CANON)
     
     if (dep.base && dep.base.startsWith("pilot_") && typeof ACS_HR_getPilotSalarySized === "function") {

     const size = dep.base.replace("pilot_", "");
     targetSalary = Math.round(
     ACS_HR_getPilotSalarySized(currentYear, size)
     );

     } else {

      // ============================================================
      // 👔 Todos los demás: por BASE canónica del departamento
      // ============================================================
      const base = dep.base || dep.role || id;

      if (typeof ACS_HR_getBaseSalary === "function") {
        targetSalary = Math.round(ACS_HR_getBaseSalary(currentYear, base));
      }
    }

    if (!targetSalary || !isFinite(targetSalary)) return;

    dep.salary = targetSalary;

    const staff = Number(dep.staff || 0);
    dep.payroll = Math.round(staff * targetSalary);

    dep.lastSalaryReviewYear = currentYear;
    dep.salaryStatus = "ok";
  });

  ACS_HR_save(HR);

  if (typeof ACS_HR_syncSalaryToView === "function") {
  ACS_HR_syncSalaryToView();
}
   
  if (typeof loadDepartments === "function") loadDepartments();
  if (typeof HR_updateKPI === "function") HR_updateKPI();

  console.log("%c✅ AUTO SALARY REBUILD COMPLETED","color:#00ffcc;font-weight:800");
}

/* ============================================================
   🟧 S3 — AUTO SALARY EXECUTION GUARD (CANONICAL)
   ------------------------------------------------------------
   • Usa SOLO año del juego
   • Corre si toca revisión por era
   • O si detecta DRIFT grande vs salario objetivo (fix estable)
   ============================================================ */

function ACS_HR_shouldRunAutoSalary() {

  const HR = ACS_HR_load();
  if (!HR) return false;

  const currentYear = (typeof ACS_HR_getGameYear === "function")
    ? ACS_HR_getGameYear()
    : undefined;

  if (!currentYear || typeof currentYear !== "number") return false;

  const era = ACS_HR_getSalaryEraParams(currentYear);
  const interval = Number(era.reviewInterval || 3);

  let needsRun = false;

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep) return;

    // No tocar manual
    if (dep.salaryOverride === true || dep.salaryPolicy === "MANUAL") return;

    const last = Number(dep.lastSalaryReviewYear || 0);

    // 1) Si nunca fue revisado, correr
    if (!last || !isFinite(last)) {
      needsRun = true;
      return;
    }

    // 2) Si ya pasó el intervalo histórico, correr
    if ((currentYear - last) >= interval) {
      needsRun = true;
      return;
    }

    // 3) DRIFT DETECTOR — si está muy fuera del objetivo, correr
    let target = 0;

    if (String(id).startsWith("pilots_") && typeof ACS_HR_getPilotSalarySized === "function") {

      let size = "medium";
      if (id === "pilots_small")  size = "small";
      if (id === "pilots_medium") size = "medium";
      if (id === "pilots_large")  size = "large";
      if (id === "pilots_vlarge") size = "vlarge";

      target = Math.round(ACS_HR_getPilotSalarySized(currentYear, size));

    } else {

      const roleBase = dep.base || dep.role || id;
      if (typeof ACS_HR_getBaseSalary === "function") {
        target = Math.round(ACS_HR_getBaseSalary(currentYear, roleBase));
      }
    }

    const current = Number(dep.salary || 0);

    if (target > 0 && current > 0) {
      const diffRatio = Math.abs(current - target) / target;
      if (diffRatio >= 0.20) { // 20% fuera del objetivo = drift real
        needsRun = true;
        return;
      }
    }
  });

  return needsRun;
}

/* ============================================================
   🟧 A3.7.2 — AUTO SALARY SETTINGS CORE (ACS OFFICIAL)
   ------------------------------------------------------------
   • Define estado oficial de Auto Salary
   • Default ON al crear jugador
   • Punto único de lectura del sistema
   ============================================================ */

function ACS_HR_isAutoSalaryEnabled() {

  let flag = localStorage.getItem("ACS_AutoSalary");

  // 🟢 DEFAULT: ON si no existe aún (jugador nuevo)
  if (!flag) {
    localStorage.setItem("ACS_AutoSalary", "ON");
    flag = "ON";

    console.log(
      "%c⚙ AUTO SALARY DEFAULT ENABLED",
      "color:#00ffcc;font-weight:700"
    );
  }

  return flag === "ON";
}

/* ============================================================
   🟦 A3.7.3 — HR SALARY ENGINE BOOTSTRAP (FINAL OFFICIAL)
   ------------------------------------------------------------
   • Inicializa metadata salarial
   • Lee Settings reales
   • Aplica normalización solo si Auto Salary ON
   • Activa disciplina si OFF
   ============================================================ */

function ACS_HR_salaryEngineBootstrap() {

  const HR = ACS_HR_load();
  if (!HR) return;

  // ============================================================
  // 🟢 INICIALIZAR METADATA SOLO SI NO EXISTE
  // (NUNCA RESETEAR SALARIOS EXISTENTES)
  // ============================================================
  let needsInit = false;

  Object.keys(HR).forEach(id => {
    const dep = HR[id];
    if (!dep) return;

    // Si no existe metadata salarial → inicializar
    if (!dep.hasOwnProperty("salaryPolicy") ||
        !dep.hasOwnProperty("salaryStatus")) {
      needsInit = true;
    }
  });

  if (needsInit) {

    console.log(
      "%c🟡 SALARY METADATA INITIALIZATION (FIRST TIME ONLY)",
      "color:#ffaa00;font-weight:700"
    );

    ACS_HR_initSalaryMetadata();

  } else {

    console.log(
      "%c🟢 SALARY METADATA ALREADY INITIALIZED — NO RESET",
      "color:#7CFFB2;font-weight:700"
    );
  }
   
/* ============================================================
   🟦 A3A.4 — APPLY PILOT SALARY COHERENCE CLAMP
   ------------------------------------------------------------
   • Ejecuta coherencia salarial SOLO pilotos
   • Ajusta marketSalary si rompe jerarquía
   • Salary del jugador permanece intacto
   ============================================================ */

ACS_HR_applyPilotSalaryCoherenceClamp(HR);

   
  // ============================================================
  // 🔄 ACTUALIZAR ESTADOS (SIN TOCAR SALARIOS)
  // ============================================================
  ACS_HR_updateSalaryStatus();

/* ============================================================
   🟦 B3.3 — BUILD FINANCE METRICS (HR SAFE HOOK)
   ------------------------------------------------------------
   • Prepara datos para Finance
   • No afecta HR ni OPS
   ============================================================ */

const HR_FINANCE_METRICS = ACS_HR_buildFinanceMetrics();

if (HR_FINANCE_METRICS) {
  console.log(
    "%c💰 HR → FINANCE METRICS READY",
    "color:#ffd35c;font-weight:700",
    HR_FINANCE_METRICS
  );
}
  
  // ============================================================
  // 🔍 LEER ESTADO REAL DESDE SETTINGS
  // ============================================================
   
  const autoSalaryEnabled = ACS_HR_isAutoSalaryEnabled();

  console.log(
    "%c⚙ HR SALARY ENGINE BOOTSTRAP",
    "color:#00ffcc;font-weight:700",
    "AutoSalary:", autoSalaryEnabled ? "ON" : "OFF"
  );

  // ============================================================
  // 🟢 AUTO SALARY ON → NORMALIZAR SOLO AUTOMÁTICOS
  // ============================================================
  if (autoSalaryEnabled) {

    console.log(
      "%c⚙ AUTO SALARY BOOTSTRAP ACTIVE",
      "color:#00ff88;font-weight:700"
    );

    ACS_HR_applyAutoSalaryNormalization();

  } else {

    console.log(
      "%c🔒 AUTO SALARY BOOTSTRAP SKIPPED (GLOBAL OFF)",
      "color:#ff5555;font-weight:800"
    );
  }
}

/* ============================================================
   🟦 OPS → HR MARKET SALARY SYNC (FIXED + GLOBAL SAFE)
   ============================================================ */

(function () {

  const HR = ACS_HR_load();
  if (!HR) return;

  const year = ACS_HR_getGameYear();
  if (!year) return;

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep || typeof dep !== "object") return;

    const market = ACS_HR_getHistoricalMarketBase(id, year);

    if (typeof market === "number") {
      dep.marketSalary = market;
    }
  });

  ACS_HR_save(HR);

})();

/* ============================================================
   🟦 SAL-JS-1 — SALARY POLICY MODAL (QATAR LUXURY) — v2
   ------------------------------------------------------------
   ✅ Slider centrado en 0 (UI -100..100)
   ✅ Mapeo REALISTA:
      - lado negativo:  -100 → -40%
      - lado positivo:  +100 → +200%
   ✅ Preview LIVE (New Salary / Payroll Delta / Morale Impact)
   ✅ Apply guarda en HR + refresca tabla/KPI
   ✅ Market Reference con fallback seguro (Opción A)
   ============================================================ */

let __SAL_currentDep = null;

function ACS_HR_getCurrentYear_SAFE() {
  if (window.ACS_TIME_CURRENT instanceof Date) return window.ACS_TIME_CURRENT.getUTCFullYear();
  return new Date().getUTCFullYear();
}

/* ============================================================
   🟦 SAL-JS-A — MARKET SALARY (OPTION A / SAFE FALLBACK)
   ------------------------------------------------------------
   • Si existe dep.marketSalary -> usa eso
   • Si no, estima con multiplicador estable (2.6x)
   ============================================================ */
function ACS_HR_getMarketSalary(depId) {
  const HR = ACS_HR_load();
  if (!HR || !HR[depId]) return 0;

  const dep = HR[depId];

  if (typeof dep.marketSalary === "number" && dep.marketSalary > 0) {
    return Math.round(dep.marketSalary);
  }

  const currentSalary = (typeof dep.salary === "number") ? dep.salary : 0;
  return Math.max(0, Math.round(currentSalary * 2.6));
}

function openSalaryInline(depId) {

  const HR = ACS_HR_load();
  if (!HR || !HR[depId]) {
    console.warn("❌ Salary modal failed — Department not found:", depId);
    return;
  }

  const dep = HR[depId];

  // ============================================================
  // 🟢 REGISTRO CANÓNICO DEL DEPARTAMENTO ACTIVO (CRÍTICO)
  // ============================================================
  window.__ACS_ACTIVE_SALARY_DEPT = depId;
  __SAL_currentDep = depId;

  const modal = document.getElementById("salaryModal");
  if (modal && modal.dataset) {
    modal.dataset.depId = depId;
  }

  const currentSalary = (typeof dep.salary === "number") ? dep.salary : 0;
  const staff = (typeof dep.staff === "number") ? dep.staff : 0;

  const market = ACS_HR_getMarketSalary(depId);

  const ratio = (market > 0)
    ? Math.round((currentSalary / market) * 100)
    : 100;

  // === UI fill ===
  document.getElementById("sal_depName").textContent  = dep.name || depId;
  document.getElementById("sal_staff").textContent   = staff.toLocaleString();
  document.getElementById("sal_current").textContent = "$" + currentSalary.toLocaleString();
  document.getElementById("sal_market").textContent  = "$" + market.toLocaleString();

  const ratioEl = document.getElementById("sal_ratio");
  ratioEl.textContent = ratio + "%";
  ratioEl.className = "";
  if (ratio >= 95 && ratio <= 110) ratioEl.classList.add("ok");
  else if (ratio >= 80)            ratioEl.classList.add("warning");
  else                              ratioEl.classList.add("danger");

  // === Slider: SIEMPRE centrado en 0 ===
  const slider = document.getElementById("sal_slider");
  const label  = document.getElementById("sal_percent_label");
  slider.value = 0;
  label.textContent = "0";

    // ============================================================
  // 🟢 REBIND SLIDER EVENTS (SAFARI / MODAL SAFE FIX)
  // ============================================================
  slider.oninput = updateSalaryPreview;
  slider.onchange = updateSalaryPreview;
   
  // Preview inicial
  modal.style.display = "flex";
  updateSalaryPreview();
}

/* ============================================================
   🟦 SAL-JS-2 — CLOSE MODAL
   ============================================================ */
function closeSalaryModal() {
  document.getElementById("salaryModal").style.display = "none";
}

/* ============================================================
   🟦 SAL-JS-3 — SLIDER MAPPING (UI -> REALISTIC PERCENT)
   ------------------------------------------------------------
   UI: -100..0..+100 (centered)
   REAL:
     negative side:  -100 => -40%
     positive side:  +100 => +200%
   ============================================================ */
function ACS_SAL_mapSliderToPercent(uiValue) {
  const v = Number(uiValue) || 0;
  if (v < 0) return Math.round((v / 100) * 40);    // -40..0
  return Math.round((v / 100) * 200);              // 0..200
}

/* ============================================================
   🟦 SAL-JS-4 — PREVIEW ENGINE
   ============================================================ */
function updateSalaryPreview() {

  const depId = __SAL_currentDep || window.__ACS_ACTIVE_SALARY_DEPT;
  const HR = ACS_HR_load();
  if (!HR || !HR[depId]) return;

  const dep = HR[depId];

  const currentSalary = (typeof dep.salary === "number") ? dep.salary : 0;
  const staff = (typeof dep.staff === "number") ? dep.staff : 0;

  const slider = document.getElementById("sal_slider");
  const label  = document.getElementById("sal_percent_label");

  const ui = Number(slider.value) || 0;
  const percent = ACS_SAL_mapSliderToPercent(ui);

  label.textContent = String(percent);

  const newSalary = Math.max(0, Math.round(currentSalary * (1 + percent / 100)));
  const payrollDelta = Math.round((newSalary - currentSalary) * staff);

  const newEl = document.getElementById("sal_new");
  const payEl = document.getElementById("sal_payroll_delta");
  const morEl = document.getElementById("sal_morale_effect");

  if (newEl) newEl.textContent = "$" + newSalary.toLocaleString();

  if (payEl) {
    const sign = payrollDelta >= 0 ? "+" : "−";
    payEl.textContent = sign + "$" + Math.abs(payrollDelta).toLocaleString();
  }

  // Morale impact (realista, simple)
  morEl.className = "";
  let impact = "Neutral";

  if (percent >= 20) { impact = "Good"; morEl.classList.add("good"); }
  else if (percent >= 5) { impact = "Slightly Good"; morEl.classList.add("good"); }
  else if (percent <= -15) { impact = "Bad"; morEl.classList.add("bad"); }
  else if (percent < 0) { impact = "Slightly Bad"; morEl.classList.add("bad"); }
  else { impact = "Neutral"; morEl.classList.add("neutral"); }

  morEl.textContent = impact;
}

/* ============================================================
   🟦 SAL-JS-APPLY-FIX — MANUAL SALARY POLICY CORE (FINAL)
   ------------------------------------------------------------
   • Aplica salario manual real
   • Actualiza salario base y referencia
   • Bloquea Auto Salary global
   • Sin recálculos destructivos
   ============================================================ */

function applySalaryPolicy() {

  // ============================================================
  // ⚠️ MANUAL POLICY CONFIRMATION
  // ============================================================
  const proceed = confirm(
    "⚠ Manual Salary Policy\n\n" +
    "This action will DISABLE Auto Salary automation for the company.\n" +
    "All future salary adjustments must be done manually.\n\n" +
    "Are you sure you want to proceed?"
  );

  if (!proceed) {
    console.log("%c🟡 SALARY APPLY CANCELLED BY USER", "color:#ffaa00;font-weight:700");
    return;
  }

  // ============================================================
  // 🟢 LECTURA CANÓNICA DEL DEPARTAMENTO ACTIVO
  // ============================================================
  const depId = window.__ACS_ACTIVE_SALARY_DEPT;

  if (!depId) {
    console.warn("❌ APPLY SALARY FAILED — No active department");
    return;
  }

  const HR = ACS_HR_load();
  if (!HR || !HR[depId]) {
    console.warn("❌ APPLY SALARY FAILED — Department not found:", depId);
    return;
  }

  const dep = HR[depId];

  const currentSalary = Number(dep.salary || 0);
  const staff = Number(dep.staff || 0);

  const slider = document.getElementById("sal_slider");
  const ui = Number(slider.value || 0);
  const percent = ACS_SAL_mapSliderToPercent(ui);

  const newSalary = Math.max(0, Math.round(currentSalary * (1 + percent / 100)));

  // ============================================================
  // 🟢 APLICAR SALARIO REAL (CANÓNICO)
  // ============================================================
  dep.salary = newSalary;
  dep.baseSalary = newSalary;            // 🔒 CLAVE PARA UI
  dep.marketReference = Math.round(newSalary * 2.6); // 🔒 CLAVE PARA RATIO

  dep.payroll = Math.round(staff * newSalary);

  // ============================================================
  // 🔒 MANUAL OVERRIDE MODE ACTIVATED
  // ============================================================
  dep.salaryPolicy   = "MANUAL";
  dep.salaryOverride = true;

  // ============================================================
  // 🔒 DESACTIVAR AUTO SALARY GLOBAL
  // ============================================================
  localStorage.setItem("ACS_AutoSalary", "OFF");

  console.log(
    "%c🔒 AUTO SALARY DISABLED — MANUAL OVERRIDE ACTIVE",
    "color:#ff5555;font-weight:800",
    dep.name
  );

  // ============================================================
  // 🕒 REGISTRO HISTÓRICO
  // ============================================================
  const currentYear =
    (window.ACS_TIME_CURRENT instanceof Date)
      ? window.ACS_TIME_CURRENT.getUTCFullYear()
      : new Date().getUTCFullYear();

  dep.lastSalaryReviewYear = currentYear;
  dep.salaryStatus = "manual";

  // ============================================================
  // 💾 GUARDADO DEFINITIVO
  // ============================================================
  ACS_HR_save(HR);

  // ============================================================
  // 🔄 REFRESH LIMPIO (SIN NORMALIZACIÓN)
  // ============================================================
  if (typeof loadDepartments === "function") loadDepartments();
  if (typeof HR_updateKPI === "function") HR_updateKPI();

  console.log(
    "%c✅ SALARY APPLIED (MANUAL POLICY — FINAL)",
    "color:#7CFFB2;font-weight:800",
    dep.name,
    "| %:", percent,
    "| Old:", currentSalary,
    "| New:", newSalary
  );

  closeSalaryModal();
}

/* ============================================================
   🟦 A3.8.3 — ROUTE INSTANT AUTO HIRE ENGINE (ACS OFFICIAL)
   ------------------------------------------------------------
   • Ejecuta auto contratación INSTANTÁNEA
   • Solo cuando OPS recalcula required
   • Evalúa TODOS los departamentos
   • Inyecta EXACTAMENTE el personal faltante
   • NO respeta budget
   • NO toca moral
   ============================================================ */

function ACS_HR_applyAutoHire_Instant() {

  // 🔒 Leer estado real desde Settings
  const autoHire = localStorage.getItem("autoHire") === "true";
  if (!autoHire) return;

  const HR = ACS_HR_load();
  if (!HR) return;

  let totalHired = 0;

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep) return;

    // Solo departamentos con estructura válida
    if (typeof dep.required !== "number") return;
    if (typeof dep.staff !== "number") return;

    const staff    = dep.staff;
    const required = dep.required;

    const deficit = Math.max(0, required - staff);
    if (deficit === 0) return;

    // ========================================================
    // ✅ INYECCIÓN INSTANTÁNEA EXACTA
    // ========================================================

    dep.staff += deficit;
    dep.payroll = dep.staff * dep.salary;

    totalHired += deficit;

    console.log(
      "%c👥 AUTO HIRE INSTANT",
      "color:#00ff88;font-weight:700",
      dep.name,
      "Hired:", deficit,
      "New staff:", dep.staff,
      "Required:", required
    );

  });

  if (totalHired > 0) {

    ACS_HR_save(HR);

    // Recalcular HR completo
    if (typeof ACS_HR_recalculateAll === "function") {
      ACS_HR_recalculateAll();
    }

    // Refrescar UI
    if (typeof loadDepartments === "function") loadDepartments();
    if (typeof HR_updateKPI === "function") HR_updateKPI();

    console.log(
      "%c🧭 AUTO HIRE INSTANT SUMMARY",
      "color:#00ffcc;font-weight:700",
      "Total hired:", totalHired
    );
  }
}

/* ============================================================
   🟦 A4.1 — MANAGEMENT LOAD CALCULATOR (ACS OFFICIAL)
   ------------------------------------------------------------
   • Calcula required dinámico de managers
   • Middle Level → por staff operativo
   • High Level   → por tamaño empresa
   • Integra con HR.required (no toca staff)
   ============================================================ */

function ACS_HR_calculateManagementRequired() {

  const HR = ACS_HR_load();
  if (!HR) return;

  // === CONTAR STAFF OPERATIVO REAL ===
  let operationalStaff = 0;
  let totalStaff = 0;

  Object.keys(HR).forEach(id => {
    const dep = HR[id];
    if (!dep) return;

    const staff = dep.staff || 0;
    totalStaff += staff;

    // Departamentos operativos reales
    if ([
      "pilots_small","pilots_medium","pilots_large","pilots_vlarge",
      "cabin",
      "maintenance",
      "ground",
      "security",
      "flightops",
      "quality"
    ].includes(id)) {
      operationalStaff += staff;
    }
  });

  // ============================================================
  // 🧭 MIDDLE LEVEL MANAGEMENT RULE
  // ------------------------------------------------------------
  // 1 middle manager cada 50 empleados operativos
  // ============================================================

  let middleRequired = Math.ceil(operationalStaff / 50);

  // mínimo 1 si hay operación real
  if (operationalStaff > 10 && middleRequired < 1) {
    middleRequired = 1;
  }

  // ============================================================
  // 🧭 HIGH LEVEL MANAGEMENT RULE
  // ------------------------------------------------------------
  // 1 VP cada 120 empleados totales
  // Solo empieza a exigir después de cierto tamaño
  // ============================================================

  let highRequired = 0;

  if (totalStaff >= 60) {
    highRequired = Math.ceil(totalStaff / 120);
  }

  // ============================================================
  // 🔧 APLICAR EN HR.required
  // ============================================================

  if (HR["middle_management"]) {
    HR["middle_management"].required = middleRequired;
  }

  if (HR["high_management"]) {
    HR["high_management"].required = highRequired;
  }

  ACS_HR_save(HR);

  console.log(
    "%c🧭 MANAGEMENT LOAD UPDATED",
    "color:#00ffcc;font-weight:700",
    "Operational:", operationalStaff,
    "Total:", totalStaff,
    "Middle req:", middleRequired,
    "High req:", highRequired
  );
}


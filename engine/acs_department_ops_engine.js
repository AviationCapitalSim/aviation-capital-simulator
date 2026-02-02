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
   🟧 A1 — HR REQUIRED STAFF ENGINE (REALISTIC / HISTORICAL)
   ------------------------------------------------------------
   • Fuente única: scheduleItems + ACS_MyAircraft
   • Sin duplicados
   • Con Flight Engineer (histórico)
   • Escala realista 1940–2026
   ============================================================ */

function calculateRequiredStaff() {

  const scheduleItems =
    JSON.parse(localStorage.getItem("scheduleItems") || "[]");

  const aircraftList =
    JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  // ------------------------------------------------------------
  // 1️⃣ Mapear aviones por ID
  // ------------------------------------------------------------
  const aircraftById = {};
  aircraftList.forEach(ac => {
    if (ac.id) aircraftById[ac.id] = ac;
  });

  // ------------------------------------------------------------
  // 2️⃣ Filtrar vuelos ACTIVOS reales
  // ------------------------------------------------------------
  const activeFlights = scheduleItems.filter(f =>
    f.assigned === true &&
    f.aircraftId &&
    f.day
  );

  // ------------------------------------------------------------
  // 3️⃣ Utilidades de clasificación
  // ------------------------------------------------------------
  function classifyAircraft(seats = 0) {
    if (seats <= 19) return "SMALL";
    if (seats <= 70) return "MEDIUM";
    if (seats <= 150) return "LARGE";
    return "VERY_LARGE";
  }

  function requiresFlightEngineer(ac) {
    if (!ac || !ac.data) return false;
    const year = ac.data.year || ac.year || 9999;
    // Histórico: FE hasta ~1970 en aviones complejos
    return year <= 1970;
  }

  // ------------------------------------------------------------
  // 4️⃣ Contadores base
  // ------------------------------------------------------------
  let pilots = {
    SMALL: 0,
    MEDIUM: 0,
    LARGE: 0,
    VERY_LARGE: 0
  };

  let flightEngineers = 0;
  let cabinCrew = 0;

  const activeAircraftIds = new Set();

  // ------------------------------------------------------------
  // 5️⃣ Calcular por vuelo activo
  // ------------------------------------------------------------
  activeFlights.forEach(f => {
    const ac = aircraftById[f.aircraftId];
    if (!ac || !ac.data) return;

    activeAircraftIds.add(ac.id);

    const seats = ac.data.seats || 0;
    const type = classifyAircraft(seats);

    // Pilotos por vuelo
    if (type === "SMALL") pilots.SMALL += 2;
    if (type === "MEDIUM") pilots.MEDIUM += 2;
    if (type === "LARGE") pilots.LARGE += 3;
    if (type === "VERY_LARGE") pilots.VERY_LARGE += 4;

    // Cabin Crew por vuelo
    if (type === "SMALL") cabinCrew += 1;
    if (type === "MEDIUM") cabinCrew += 2;
    if (type === "LARGE") cabinCrew += 4;
    if (type === "VERY_LARGE") cabinCrew += 8;

    // Flight Engineer (histórico)
    if (requiresFlightEngineer(ac)) {
      flightEngineers += 1;
    }
  });

  const totalFlights = activeFlights.length;
  const totalAircraft = activeAircraftIds.size;

  // ------------------------------------------------------------
  // 6️⃣ Personal NO lineal (operacional)
  // ------------------------------------------------------------
  const technicalMaintenance =
    Math.max(1, Math.ceil(totalAircraft / 2.5));

  const groundHandling =
    Math.max(1, Math.ceil(totalFlights / 2));

  const flightOps =
    Math.max(1, Math.ceil(totalFlights / 6));

  const routeStrategy =
    Math.max(1, Math.ceil(totalFlights / 10));

  // ------------------------------------------------------------
  // 7️⃣ Resultado final por departamento
  // ------------------------------------------------------------
  const requiredStaff = {
    pilotsSmall: pilots.SMALL,
    pilotsMedium: pilots.MEDIUM,
    pilotsLarge: pilots.LARGE,
    pilotsVeryLarge: pilots.VERY_LARGE,

    flightEngineers: flightEngineers,
    cabinCrew: cabinCrew,

    technicalMaintenance: technicalMaintenance,
    groundHandling: groundHandling,
    flightOpsDivision: flightOps,
    routeStrategies: routeStrategy
  };

  console.log("🟢 HR REQUIRED STAFF (FINAL):", requiredStaff);

  return requiredStaff;
}

/* ============================================================
   🟦 C2 — AUTO RECALC ON SCHEDULE CHANGE (ACS OFFICIAL)
   ------------------------------------------------------------
   • Detecta cambios en scheduleItems
   • Recalcula demand inmediatamente
   • Limpia HR.required cuando se borra la última ruta
   ============================================================ */

let __OPS_lastScheduleHash = null;

function ACS_OPS_watchScheduleChanges() {

  let flights = [];
  try {
    flights = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch (e) {
    flights = [];
  }

  const hash = JSON.stringify(flights.map(f => f.aircraftId + "|" + (f.id || f.routeId)));

  // Primera ejecución
  if (__OPS_lastScheduleHash === null) {
    __OPS_lastScheduleHash = hash;
    return;
  }

  // Cambio detectado
  if (hash !== __OPS_lastScheduleHash) {

    console.log(
      "%c🔄 OPS SCHEDULE CHANGED — RECALCULATING DEMAND",
      "color:#00ffcc;font-weight:700"
    );

    ACS_OPS_recalculateAllRequired();

    __OPS_lastScheduleHash = hash;
  }
}

// Ejecutar watcher cada 2 segundos (ligero, seguro)
setInterval(ACS_OPS_watchScheduleChanges, 2000);

/* ============================================================
   🟦 C1 — WEEKLY OPS DEMAND RECALCULATOR (ACS OFFICIAL)
   ------------------------------------------------------------
   • Agrupa scheduleItems por aircraftId + routeId
   • Calcula demanda UNA VEZ por operación semanal real
   • Resetea HR.required limpio
   • Aplica demand consolidado
   ============================================================ */

function ACS_OPS_recalculateAllRequired() {

  console.log("%c🧠 OPS WEEKLY REBUILD — START", "color:#00ffcc;font-weight:700");

  const HR = ACS_HR_load();
  if (!HR) return;

  let flights = [];
  try {
    flights = JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  } catch (e) {
    flights = [];
  }

  // ============================================================
  // 🔧 FILTRO CANÓNICO DE VUELOS REALES (ANTI VUELO 0 / NODO BASE)
  // ============================================================

  const activeFlights = Array.isArray(flights)
    ? flights.filter(f =>
        f.type === "flight" &&
        f.day !== undefined &&
        f.aircraft &&
        f.aircraftId
      )
    : [];

  // 🔹 Si no hay vuelos reales → todo perfecto
  if (!Array.isArray(activeFlights) || activeFlights.length === 0) {

    Object.keys(HR).forEach(id => {
      if (typeof HR[id].required === "number") {
        HR[id].required = 0;
      }
    });

    ACS_HR_save(HR);

    if (typeof loadDepartments === "function") loadDepartments();
    if (typeof HR_updateKPI === "function") HR_updateKPI();

    console.log("%c🟢 OPS WEEKLY REBUILD — NO FLIGHTS (ALL ZERO)", "color:#7CFFB2;font-weight:700");
    return;
  }

  // ============================================================
  // 🔧 AGRUPAR POR OPERACIÓN SEMANAL REAL
  // clave = aircraftId + routeId
  // ============================================================

  const operations = {};

  activeFlights.forEach(f => {

    const aircraftId = f.aircraftId;
    const routeId    = f.id || f.routeId || "ROUTE";

    const key = aircraftId + "|" + routeId;

    if (!operations[key]) {
      operations[key] = {
        aircraftId,
        routeId,
        acType: f.acType,
        model:  f.acType,
        count:  0
      };
    }

    operations[key].count++;
  });

  // ============================================================
  // 🔧 RESET HR.REQUIRED LIMPIO
  // ============================================================

  Object.keys(HR).forEach(id => {
    if (typeof HR[id].required === "number") {
      HR[id].required = 0;
    }
  });

  // ============================================================
  // 🧮 CALCULAR DEMANDA CONSOLIDADA
  // ============================================================

  Object.values(operations).forEach(op => {

    const fakeFlight = { distance: 0 };
    const fakeAircraft = { model: op.model };
    const fakeRoute = { flights_per_week: op.count };

    const result = ACS_OPS_calculateCrewDemand(fakeFlight, fakeAircraft, fakeRoute);
    if (!result) return;

    console.log("📊 WEEKLY OPS UNIT:", op.model, "freq:", op.count, result.demand);

    ACS_OPS_applyDemandToHR(result);
  });

  // 🔧 Managers required
  if (typeof ACS_HR_calculateManagementRequired === "function") {
    ACS_HR_calculateManagementRequired();
  }

  ACS_HR_save(HR);

  if (typeof loadDepartments === "function") loadDepartments();
  if (typeof HR_updateKPI === "function") HR_updateKPI();

  console.log("%c✅ OPS WEEKLY REBUILD — COMPLETED", "color:#00ffcc;font-weight:700");
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
   🟦 A3.1.4 — AUTO SALARY NORMALIZATION CORE (ACS OFFICIAL)
   ------------------------------------------------------------
   • Ajusta salarios instantáneamente a era actual
   • Resetea estados salariales
   • Borra atrasos históricos
   • Modo recuperación automática
   • 🔒 BLINDADO: solo corre si Auto Salary = ON
   ============================================================ */

function ACS_HR_applyAutoSalaryNormalization() {

  // ============================================================
  // 🔒 PROTECCIÓN GLOBAL — RESPETAR AUTO SALARY OFF
  // ============================================================
  const autoSalaryEnabled = ACS_HR_isAutoSalaryEnabled();

  if (!autoSalaryEnabled) {
    console.log(
      "%c🔒 AUTO SALARY NORMALIZATION BLOCKED (GLOBAL OFF)",
      "color:#ff5555;font-weight:800"
    );
    return;
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
  const raisePercent = eraParams.autoRaise;

  console.log(
    "%c💰 AUTO SALARY NORMALIZATION",
    "color:#7CFFB2;font-weight:700",
    "Year:", currentYear,
    "Raise:", raisePercent + "%"
  );

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep || typeof dep.salary !== "number") return;

    // ============================================================
    // 🔒 SKIP MANUAL OVERRIDE DEPARTMENTS
    // ============================================================
    if (dep.salaryOverride === true || dep.salaryPolicy === "MANUAL") {

      console.log(
        "%c⏭ AUTO SALARY SKIPPED (MANUAL OVERRIDE)",
        "color:#ffaa00;font-weight:700",
        dep.name
      );

      return; // NO tocar este departamento
    }

    // ============================================================
    // 🟢 APLICAR SUBIDA AUTOMÁTICA
    // ============================================================
    const oldSalary = dep.salary;
    const newSalary = Math.round(oldSalary * (1 + raisePercent / 100));

    dep.salary = newSalary;

    const staff = Number(dep.staff || 0);
    dep.payroll = Math.round(staff * dep.salary);

    // Reset histórico
    dep.lastSalaryReviewYear = currentYear;
    dep.salaryStatus = "ok";

    console.log(
      "🟢 Salary normalized:",
      dep.name,
      "Old:", oldSalary,
      "New:", newSalary
    );
  });

  // 🔄 Reset salary alert cooldown (recovery)
  ACS_HR_saveSalaryAlertState({});

  ACS_HR_save(HR);

  // ============================================================
  // 🔒 CRÍTICO: NUNCA LLAMAR RECALCULATE DESDE NORMALIZATION
  // (evita cascadas y destrucción de manual)
  // ============================================================

  console.log(
    "%c🔒 AUTO SALARY NORMALIZATION COMPLETED (NO RECALC CASCADE)",
    "color:#00ffcc;font-weight:700"
  );

  // Refrescar UI únicamente
  if (typeof loadDepartments === "function") loadDepartments();
  if (typeof HR_updateKPI === "function") HR_updateKPI();
}

/* ============================================================
   🟦 A3.1.6 — AUTO SALARY EXECUTION GUARD (ACS OFFICIAL)
   ------------------------------------------------------------
   • Evita normalización múltiple
   • Ejecuta solo cuando toca revisión histórica
   • Protege economía y Company Value
   ============================================================ */

function ACS_HR_shouldRunAutoSalary() {

  const HR = ACS_HR_load();
  if (!HR) return false;

  const currentYear = ACS_TIME_getYear ? ACS_TIME_getYear() : new Date().getUTCFullYear();

  let needsRun = false;

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep || typeof dep.lastSalaryReviewYear !== "number") return;

    // Si algún departamento está atrasado → hay que normalizar
    if (dep.lastSalaryReviewYear < currentYear) {
      needsRun = true;
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

  // ============================================================
  // 🔄 ACTUALIZAR ESTADOS (SIN TOCAR SALARIOS)
  // ============================================================
  ACS_HR_updateSalaryStatus();

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


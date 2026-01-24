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
   🟦 A2 — FREQUENCY FACTOR ENGINE
   ============================================================ */

function ACS_OPS_getFrequencyFactor(flightsPerWeek) {

  if (!flightsPerWeek || isNaN(flightsPerWeek)) return 1.0;

  if (flightsPerWeek <= 3)   return 1.0;
  if (flightsPerWeek <= 7)   return 1.15;
  if (flightsPerWeek <= 14)  return 1.35;
  if (flightsPerWeek <= 30)  return 1.60;
  return 2.00;
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
   🟦 A4 — BASE STAFF MATRIX (CANONICAL FROM HR)
   ============================================================ */

const ACS_OPS_STAFF_BY_TYPE = {
  small:   { pilots:4,  cabin:0,  maintenance:3,  ground:4,  security:1, flightops:1, quality:1 },
  medium:  { pilots:9,  cabin:4,  maintenance:5,  ground:6,  security:1, flightops:1, quality:1 },
  large:   { pilots:12, cabin:10, maintenance:8,  ground:10, security:2, flightops:2, quality:1.5 },
  vlarge:  { pilots:22, cabin:18, maintenance:12, ground:16, security:3, flightops:3, quality:2 }
};


/* ============================================================
   🟦 B1 — CREW DEMAND CALCULATOR (MASTER FORMULA)
   ============================================================ */

function ACS_OPS_calculateCrewDemand(flight, aircraft, route) {

  // 🛑 Protection layer
  if (!flight || !aircraft || !route) {
    console.warn("OPS: Missing flight / aircraft / route data", flight, aircraft, route);
    return null;
  }

  const model = aircraft.model || aircraft.name || "";
  const type  = ACS_OPS_classifyAircraft(model);

  const base = ACS_OPS_STAFF_BY_TYPE[type];
  if (!base) {
    console.warn("OPS: Unknown aircraft type", model);
    return null;
  }

  // 🔧 Distance
  const distanceNM = route.distance || flight.distance || 0;
  const distanceFactor = ACS_OPS_getDistanceFactor(distanceNM);

  // 🔧 Frequency
  const flightsPerWeek = route.flights_per_week || route.frequency || 1;
  const frequencyFactor = ACS_OPS_getFrequencyFactor(flightsPerWeek);

  // 🧮 Final demand
  const demand = {
    pilots:      Math.ceil(base.pilots      * distanceFactor * frequencyFactor),
    cabin:       Math.ceil(base.cabin       * distanceFactor * frequencyFactor),
    maintenance: Math.ceil(base.maintenance * distanceFactor * (1 + (frequencyFactor - 1) * 0.5)),
    ground:      Math.ceil(base.ground      * frequencyFactor),
    security:    Math.ceil(base.security    * (1 + (frequencyFactor - 1) * 0.3)),
    flightops:   Math.ceil(base.flightops   * distanceFactor * frequencyFactor),
    quality:     Math.ceil(base.quality     * (1 + (frequencyFactor - 1) * 0.3))
  };

  return {
    aircraftType: type,
    distanceNM,
    flightsPerWeek,
    distanceFactor,
    frequencyFactor,
    demand
  };
}


/* ============================================================
   🟦 C1 — APPLY DEMAND INTO HR.REQUIRED
   ============================================================ */

function ACS_OPS_applyDemandToHR(demandResult) {

  if (!demandResult || !demandResult.demand) return;

  const HR = ACS_HR_load();
  if (!HR) return;

  const d = demandResult.demand;

  // Mapping OPS → HR departments
  const MAP = {
    pilots:      ["pilots_small","pilots_medium","pilots_large","pilots_vlarge"],
    cabin:       ["cabin"],
    maintenance: ["maintenance"],
    ground:      ["ground"],
    security:    ["security"],
    flightops:   ["flightops"],
    quality:     ["quality"]
  };

  Object.keys(MAP).forEach(key => {

    const list = MAP[key];
    const value = d[key] || 0;

    list.forEach(depID => {
      if (!HR[depID]) return;

      // 🔧 Increment required only (never overwrite staff)
      HR[depID].required = (HR[depID].required || 0) + value;
    });
  });

  ACS_HR_save(HR);
}


/* ============================================================
   🟦 D1 — FLIGHT ASSIGNED LISTENER (ENTRY POINT)
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ASSIGNED", e => {

  try {

    const { flight, aircraft, route } = e.detail || {};

    if (!flight || !aircraft || !route) {
      console.warn("OPS: Flight assigned event incomplete", e.detail);
      return;
    }

    console.log(
      "%c🧠 OPS ENGINE — NEW FLIGHT RECEIVED",
      "color:#00ffcc;font-weight:700"
    );

    console.log("✈ Flight:", flight.origin, "→", flight.destination);
    console.log("🛩 Aircraft:", aircraft.model || aircraft.name);
    console.log("🗺 Distance:", route.distance, "nm");
    console.log("🔁 Frequency:", route.flights_per_week || route.frequency);

    // 🧮 Calculate demand
    const result = ACS_OPS_calculateCrewDemand(flight, aircraft, route);
    if (!result) return;

    console.log("📊 OPS Demand Result:", result);

    // 🔧 Apply into HR.required (OPS staff)
ACS_OPS_applyDemandToHR(result);

// 🔧 Recalcular estructura directiva (managers required)
if (typeof ACS_HR_calculateManagementRequired === "function") {
  ACS_HR_calculateManagementRequired();
}

// 🟦 AUTO HIRE INSTANT (cubre TODOS los déficits, incluidos managers)
if (typeof ACS_HR_applyAutoHire_Instant === "function") {
  ACS_HR_applyAutoHire_Instant();
}
     
    if (typeof loadDepartments === "function") {
      loadDepartments();
    }

    console.log("✅ OPS ENGINE applied crew demand successfully");

  } catch (err) {
    console.warn("OPS ENGINE failure on flight assigned", err);
  }

});


/* ============================================================
   🟦 END OF PHASE B1 — DEMAND CORE ONLY
   ------------------------------------------------------------
   NEXT PHASES (NOT YET IMPLEMENTED):
   • Deficit timers
   • Delay risk engine
   • Weekly morale degradation
   • Alert escalation logic
   • Recovery smoothing
   ============================================================ */

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
   ⏱️ WEEKLY OPS MASTER TICK (PHASE A+B+C)
   ============================================================ */
let __OPS_masterWeek = null;

registerTimeListener((time) => {

  const year  = time.getUTCFullYear();
  const week  = Math.floor((time - new Date(year,0,1)) / (7 * 24 * 3600 * 1000));

  if (__OPS_masterWeek === null) __OPS_masterWeek = week;

  if (week !== __OPS_masterWeek) {

    console.log("%c🧭 OPS MASTER WEEK TICK", "color:#00ffcc;font-weight:600", "Week:", week);

    // Phase A
    ACS_OPS_checkDepartmentDeficits();

    // Phase B
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

  // ⚙️ Por ahora Auto Salary está SIEMPRE ON → no emitir alertas
  // Cuando conectemos Settings, aquí leeremos ACS_SETTINGS.autoSalary
  const autoSalaryEnabled = (localStorage.getItem("ACS_AutoSalary") !== "OFF");

  if (autoSalaryEnabled) return;   // 🔒 NO alertas si auto está activo

  const currentYear = ACS_TIME_getYear ? ACS_TIME_getYear() : new Date().getUTCFullYear();
  const state = ACS_HR_loadSalaryAlertState();

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep || !dep.salaryStatus) return;

    // Solo alertar si hay problema
    if (dep.salaryStatus === "ok") return;

    const alertKey = `${id}_${currentYear}`;

    // 🔒 Cooldown anual por departamento
    if (state[alertKey]) return;

    let level   = "info";
    let message = "";

    if (dep.salaryStatus === "review") {
      level = "info";
      message = `${dep.name} salaries due for review. Consider adjusting wages.`;
    }

    if (dep.salaryStatus === "lagging") {

    const yearsLate = currentYear - dep.lastSalaryReviewYear;

    if (yearsLate >= 3) {
    level = "danger";
    message = `${dep.name} salaries extremely outdated for ${yearsLate} years. Severe morale and resignation risk.`;
    } else {
    level = "warning";
    message = `${dep.name} salaries critically outdated. Risk of morale loss and resignations.`;
  }
}

    // 🔔 EMITIR ALERTA CENTRAL
    if (window.ACS_Alerts && typeof window.ACS_Alerts.push === "function") {

      window.ACS_Alerts.push({
        title: "Salary Review Required",
        message: message,
        level: level,
        type: "hr",
        category: "hr",
        source: "HR Salary Engine"
      });

      console.log(
        "%c💼 SALARY ALERT EMITTED",
        "color:#ffb300;font-weight:700",
        dep.name,
        "Status:", dep.salaryStatus,
        "Level:", level
      );

      // Guardar cooldown
      state[alertKey] = true;
    }

  });

  ACS_HR_saveSalaryAlertState(state);
}

/* ============================================================
   🟦 A3.1.4 — AUTO SALARY NORMALIZATION CORE (ACS OFFICIAL)
   ------------------------------------------------------------
   • Ajusta salarios instantáneamente a era actual
   • Resetea estados salariales
   • Borra atrasos históricos
   • Modo recuperación automática
   ============================================================ */

function ACS_HR_applyAutoSalaryNormalization() {

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

    // Aplicar subida automática
    const oldSalary = dep.salary;
    const newSalary = Math.round(oldSalary * (1 + raisePercent / 100));

    dep.salary = newSalary;
    dep.payroll = dep.staff * dep.salary;

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

  // Recalcular HR completo
  if (typeof ACS_HR_recalculateAll === "function") {
    ACS_HR_recalculateAll();
  }

  // Refrescar tabla + KPI
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

  // Inicializar metadata base
  ACS_HR_initSalaryMetadata();

  // Actualizar estados salariales
  ACS_HR_updateSalaryStatus();

  // Leer estado real desde Settings
  const autoSalaryEnabled = ACS_HR_isAutoSalaryEnabled();

  console.log(
    "%c⚙ HR SALARY ENGINE BOOTSTRAP",
    "color:#00ffcc;font-weight:700",
    "AutoSalary:", autoSalaryEnabled ? "ON" : "OFF"
  );

  // 🟢 AUTO ON → normalizar instantáneo
  if (autoSalaryEnabled) {
    ACS_HR_applyAutoSalaryNormalization();
  }

  // 🔴 AUTO OFF → disciplina activa (alertas + moral ya conectadas)
}

/* ============================================================
   🟦 A6 — MARKET SALARY REFERENCE CORE (LOCAL FIX)
   ------------------------------------------------------------
   • Devuelve salario de referencia de mercado
   • Usa salario base histórico como baseline
   • Ajusta por era (1940–2026)
   • Función requerida por openSalaryInline()
   ============================================================ */

function ACS_HR_getMarketSalary(depID) {

  const HR = ACS_HR_load();
  const dep = HR[depID];
  if (!dep || typeof dep.salary !== "number") return dep?.salary || 0;

  const base = dep.salary;

  // 🕒 Año real desde Time Engine ACS (canon)
  let currentYear;
  if (window.ACS_TIME_CURRENT instanceof Date) {
    currentYear = window.ACS_TIME_CURRENT.getUTCFullYear();
  } else {
    currentYear = new Date().getUTCFullYear(); // fallback seguro
  }

  let factor = 1.0;

  if (currentYear < 1960) factor = 1.0;
  else if (currentYear < 1980) factor = 1.3;
  else if (currentYear < 2000) factor = 1.8;
  else if (currentYear < 2010) factor = 2.2;
  else factor = 2.6;

  return Math.round(base * factor);
}

/* ============================================================
   🟦 SAL-JS-1 — OPEN SALARY POLICY MODAL
   ============================================================ */

let __SAL_currentDep = null;

/* ============================================================
   🟦 A3.3.1 — OPEN SALARY MODAL (CANONICAL ZERO-CENTER CORE)
   ------------------------------------------------------------
   • Slider SIEMPRE inicia en 0%
   • Preview sincronizado al abrir
   • Ratio y mercado visibles
   • No activa auto-salary
   ============================================================ */

function openSalaryInline(depId) {

  const HR = ACS_HR_load();
  if (!HR || !HR[depId]) {
    console.warn("❌ Salary modal failed — Department not found:", depId);
    return;
  }

  const dep = HR[depId];

  // === Datos base ===
  const currentSalary = dep.salary || 0;
  const staff = dep.staff || 0;

  // 🔧 Market reference (canon)
  const market = (typeof ACS_HR_getMarketSalary === "function")
    ? ACS_HR_getMarketSalary(depId)
    : Math.round(currentSalary * 2.6);   // fallback seguro

  const ratio = market > 0
    ? Math.round((currentSalary / market) * 100)
    : 100;

  // === UI FILL ===
  document.getElementById("sal_depName").textContent   = dep.name;
  document.getElementById("sal_staff").textContent    = staff;
  document.getElementById("sal_current").textContent  = currentSalary.toLocaleString();
  document.getElementById("sal_market").textContent   = market.toLocaleString();

  // Ratio color
  const ratioEl = document.getElementById("sal_ratio");
  ratioEl.textContent = ratio + "%";

  ratioEl.className = "";
  if (ratio >= 95 && ratio <= 110) ratioEl.classList.add("ok");
  else if (ratio >= 80)           ratioEl.classList.add("warning");
  else                            ratioEl.classList.add("danger");

  // ============================================================
  // 🔥 CENTRADO ABSOLUTO EN 0% (LO QUE TÚ QUERÍAS)
  // ============================================================

  const slider = document.getElementById("sal_slider");
  const label  = document.getElementById("sal_percent_label");

  slider.value = 0;          // 🔥 CENTRO REAL
  label.textContent = "0";  // 🔥 0%

  // === Preview inicial limpio ===
  document.getElementById("sal_new").textContent = currentSalary.toLocaleString();
  document.getElementById("sal_payroll_delta").textContent = "$0";
  document.getElementById("sal_morale_effect").textContent = "Neutral";

  const warn = document.getElementById("sal_auto_warning");
  if (warn) warn.style.display = "none";

  // Guardar dept activo
  window.__ACS_ACTIVE_SALARY_DEPT = depId;

  // Mostrar modal
  document.getElementById("salaryModal").style.display = "flex";

  console.log(
    "%c💰 SALARY MODAL OPENED",
    "color:#8AB4FF;font-weight:700",
    dep.name,
    "Current:", currentSalary,
    "Market:", market,
    "Ratio:", ratio + "%"
  );
}

function closeSalaryModal() {
  document.getElementById("salaryModal").style.display = "none";
}

/* ============================================================
   🟦 A5 — SALARY APPLY ENGINE (MANUAL OVERRIDE CORE)
   ------------------------------------------------------------
   • Aplica política salarial manual
   • Apaga Auto Salary inmediatamente
   • Actualiza payroll, metadata y estados
   • Recalcula HR + refresca UI
   ============================================================ */

function applySalaryPolicy() {

  if (!__SAL_currentDep) {
    console.warn("SALARY: No department selected");
    return;
  }

  const HR = ACS_HR_load();
  const dep = HR[__SAL_currentDep];
  if (!dep) return;

  const percent = Number(document.getElementById("sal_slider").value);

  // Si no hay cambio → cerrar sin tocar nada
  if (percent === 0) {
    closeSalaryModal();
    return;
  }

  // 🕒 Año real desde Time Engine ACS
  let currentYear;
  if (window.ACS_TIME_CURRENT instanceof Date) {
    currentYear = window.ACS_TIME_CURRENT.getUTCFullYear();
  } else {
    currentYear = new Date().getUTCFullYear(); // fallback seguro
  }

  const oldSalary = dep.salary;
  const newSalary = Math.round(oldSalary * (1 + percent / 100));

  // ========================================================
  // 🔴 MANUAL OVERRIDE → APAGAR AUTO SALARY
  // ========================================================

  localStorage.setItem("ACS_AutoSalary", "OFF");

  console.log(
    "%c⚠ AUTO SALARY DISABLED — MANUAL SALARY OVERRIDE",
    "color:#ff4040;font-weight:700",
    dep.name
  );

  // ========================================================
  // 💰 APLICAR NUEVO SALARIO DEFINITIVO
  // ========================================================

  dep.salary  = newSalary;
  dep.payroll = dep.staff * dep.salary;

  // Metadata histórica
  dep.lastSalaryReviewYear = currentYear;
  dep.salaryStatus = "ok";

  ACS_HR_save(HR);

  console.log(
    "%c💰 SALARY POLICY APPLIED",
    "color:#00ffcc;font-weight:700",
    dep.name,
    "Old:", oldSalary,
    "New:", newSalary,
    "Percent:", percent + "%",
    "AutoSalary:", "OFF"
  );

  // ========================================================
  // 🔄 RECALCULAR SISTEMA COMPLETO HR
  // ========================================================

  if (typeof ACS_HR_recalculateAll === "function") {
    ACS_HR_recalculateAll();
  }

  if (typeof loadDepartments === "function") loadDepartments();
  if (typeof HR_updateKPI === "function") HR_updateKPI();

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


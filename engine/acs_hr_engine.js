/* ============================================================
   === ACS HUMAN RESOURCES ENGINE v2 08DEC25 — MULTI-DEPARTMENT ==
   ------------------------------------------------------------
   • Conserva TODA la arquitectura original
   • Corrige salarios históricos 1940–2026
   • Arregla salarios pilotos por tamaño
   • NO elimina funciones dinámicas existentes
   ============================================================ */

/* ============================================================
   🟦 HR — GAME YEAR AUTHORITY (TIME ENGINE LINK)
   ------------------------------------------------------------
   Fuente oficial del año del simulador
   Compatible con Railway + Time Engine v4.4
   ============================================================ */

function ACS_HR_getGameYear() {

  try {

    if (
      typeof ACS_TIME !== "undefined" &&
      ACS_TIME.currentTime instanceof Date
    ) {

      return ACS_TIME.currentTime.getUTCFullYear();

    }

  } catch (e) {
    console.warn("⚠️ HR YEAR READ FAILED", e);
  }

  return null;

}

/* ============================================================
   1) LISTADO OFICIAL DE LOS 18 DEPARTAMENTOS VISIBLES
   ============================================================ */
const ACS_HR_DEPARTMENTS = [
   
/* ============================================================
   HR HISTORICAL SALARY ENGINE (1940–2030)
============================================================ */

function ACS_HR_getBaseSalary(year, role){

const TABLE = {

1940:{pilot:380,cabin:140,tech:200,ground:120,admin:180,flight_ops:220,security:150,exec:650},
1950:{pilot:520,cabin:170,tech:240,ground:140,admin:210,flight_ops:260,security:170,exec:800},
1960:{pilot:900,cabin:240,tech:330,ground:190,admin:280,flight_ops:340,security:230,exec:1200},
1970:{pilot:1600,cabin:360,tech:500,ground:280,admin:420,flight_ops:520,security:340,exec:2200},
1980:{pilot:2600,cabin:600,tech:800,ground:420,admin:620,flight_ops:760,security:520,exec:3600},
1990:{pilot:3600,cabin:820,tech:1050,ground:520,admin:820,flight_ops:980,security:660,exec:5200},
2000:{pilot:4700,cabin:1100,tech:1400,ground:720,admin:1100,flight_ops:1300,security:850,exec:7200},
2010:{pilot:6200,cabin:1600,tech:2000,ground:1050,admin:1600,flight_ops:1850,security:1200,exec:9800},
2020:{pilot:8300,cabin:2400,tech:2800,ground:1450,admin:2300,flight_ops:2600,security:1700,exec:13500}
};

const decade = Math.max(...Object.keys(TABLE).map(Number).filter(d=>year>=d));
const S = TABLE[decade] || TABLE[1940];

switch(role){

case "pilot":
case "pilot_small":
case "pilot_medium":
case "pilot_large":
case "pilot_vlarge":
return S.pilot;

case "cabin":
return S.cabin;

case "maintenance":
return S.tech;

case "ground":
return S.ground;

case "flight_ops":
return S.flight_ops;

case "security":
return S.security;

case "admin":
case "economics":
case "comms":
case "hr":
case "quality":
case "middle":
return S.admin;

case "ceo":
case "vp":
return S.exec;

default:
return S.admin;

}

}

function ACS_HR_getPilotSalarySized(year,size){

const base = ACS_HR_getBaseSalary(year,"pilot");

const MULT={
small:0.55,
medium:0.75,
large:1.0,
vlarge:1.4
};

return Math.round(base*(MULT[size]||1));

}

/* ============================================================
   🛑 HR STATE AUTHORITY — SERVER FIRST
   ------------------------------------------------------------
   • HR deja de depender de localStorage como estado principal
   • Fuente oficial: window.ACS_HR_SERVER_STATE
   • localStorage ya NO es autoridad
   ============================================================ */

function ACS_HR_load() {
  return window.ACS_HR_SERVER_STATE || {};
}

function ACS_HR_save(data) {

  const HR = data || {};
  const year = (typeof ACS_getYear === "function") ? ACS_getYear() : 1940;

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    if (!dep) return;

    let salary = 0;

    // PILOTS
    if (id.startsWith("pilots_")) {

      let size = "medium";

      if (id === "pilots_small")  size = "small";
      if (id === "pilots_medium") size = "medium";
      if (id === "pilots_large")  size = "large";
      if (id === "pilots_vlarge") size = "vlarge";

      salary = ACS_HR_getPilotSalarySized(year, size);

    }
    else {

      salary = ACS_HR_getBaseSalary(year, dep.base);

    }

    dep.salary = salary;
    dep.payroll = dep.staff * salary;

  });

  window.ACS_HR_SERVER_STATE = HR;

  return window.ACS_HR_SERVER_STATE;
}

/* ============================================================
   🟦 HR AUTOMATION FLAGS — CANONICAL SYSTEM
   ------------------------------------------------------------
   • Unifica AutoHire + AutoSalary
   • Evita conflictos "true" vs "ON"
   • Fuente única para HR
   ============================================================ */

function ACS_HR_isAutoHireEnabled() {
  return localStorage.getItem("autoHire") === "true";
}

function ACS_HR_isAutoSalaryEnabled() {
  return localStorage.getItem("ACS_AutoSalary") === "ON";
}

function ACS_HR_disableAutoHire() {
  localStorage.setItem("autoHire", "false");
  console.warn("⚠ AUTO HIRE DISABLED BY MANUAL ACTION");
}

function ACS_HR_disableAutoSalary() {
  localStorage.setItem("ACS_AutoSalary", "OFF");
  console.warn("⚠ AUTO SALARY DISABLED BY MANUAL ACTION");
}

/* ============================================================
   CALCULAR PAYROLL TOTAL (Reparado)
   ============================================================ */

function ACS_HR_getTotalPayroll() {
    const hr = ACS_HR_load();
    return Object.values(hr).reduce((sum, d) => sum + (d.staff * d.salary), 0);
}


/* ============================================================
   API: CONTRATAR PERSONAL (Reparado)
   ============================================================ */

function ACS_HR_hire(deptID, amount) {
    const hr = ACS_HR_load();
    const d = hr[deptID];
    if (!d) return;

    d.staff += amount;
    d.payroll = d.staff * d.salary;

    ACS_HR_save(hr);

    ACS_HR_disableAutoHire();
   
    // Registrar gasto real en Finance
    ACS_addExpense("salaries", amount * d.salary);
}


/* ============================================================
   API: DESPEDIR PERSONAL (Reparado)
   ============================================================ */
   
function ACS_HR_fire(deptID, amount) {
    const hr = ACS_HR_load();
    const d = hr[deptID];
    if (!d) return;

    const removed = Math.min(amount, d.staff);
    d.staff -= removed;
    d.payroll = d.staff * d.salary;

    ACS_HR_save(hr);
    ACS_HR_disableAutoHire();
}


/* ============================================================
   🟧 API: AJUSTE SALARIAL MANUAL (CANONICAL)
   ------------------------------------------------------------
   • Mata Auto Salary automáticamente
   • Congela el salario resultante
   • NO recalcula por época
   ============================================================ */

function ACS_HR_adjustSalary(deptID, percentage) {

    const hr = ACS_HR_load();
    const d = hr[deptID];
    if (!d) return;

    // 🔴 Si Auto Salary estaba ON → apagarlo
    if (localStorage.getItem("ACS_AutoSalary") === "ON") {
        localStorage.setItem("ACS_AutoSalary", "OFF");
        localStorage.setItem("ACS_AutoSalary_Override", "true");
    }

    const year = (typeof ACS_getYear === "function") ? ACS_getYear() : 1940;

    let baseSalary = 0;

    // Pilotos → por tamaño
    if (deptID.startsWith("pilots_")) {

        let size = "medium";
        if (deptID === "pilots_small")  size = "small";
        if (deptID === "pilots_medium") size = "medium";
        if (deptID === "pilots_large")  size = "large";
        if (deptID === "pilots_vlarge") size = "vlarge";

        baseSalary = ACS_HR_getPilotSalarySized(year, size);

    } else {
        // Otros departamentos
        baseSalary = ACS_HR_getBaseSalary(year, d.base);
    }

    // Aplicar porcentaje manual
    d.salary = Math.round(baseSalary * (percentage / 100));

    // Guardar SIN recalcular payroll aquí
    ACS_HR_save(hr);
}

/* ============================================================
   API: BONUS DEPARTAMENTAL — Reparado
   ============================================================ */
   
function ACS_HR_applyBonus(deptID, percent) {
    const hr = ACS_HR_load();
    const d = hr[deptID];
    if (!d) return;

    const cost = d.staff * d.salary * (percent / 100);

    d.morale = Math.min(100, d.morale + percent / 5);

    ACS_HR_save(hr);

    ACS_addExpense("salaries", cost);
    return cost;
}

/* ============================================================
   🛑 HR DEPARTMENTS VIEW — SERVER STATE ONLY
   ------------------------------------------------------------
   • NO bootstrap automático
   • NO crea departamentos faltantes en local
   • SOLO renderiza lo que venga de Railway
   ============================================================ */

function ACS_HR_getDepartmentsView() {

  const hr = ACS_HR_load() || {};

  return ACS_HR_DEPARTMENTS.map(d => {

    const dep = hr[d.id] || {
      id: d.id,
      name: d.name,
      base: d.base,
      staff: 0,
      required: 0,
      morale: 100,
      salary: 0,
      payroll: 0
    };

    return {
      id: dep.id || d.id,
      name: dep.name || d.name,
      base: dep.base || d.base,
      staff: Number(dep.staff) || 0,
      required: Number(dep.required ?? 0) || 0,
      morale: Number(dep.morale) || 100,
      salary: Number(dep.salary) || 0,
      payroll: Number(dep.payroll) || 0
    };
  });

}

/* ============================================================
   === MOTOR DINÁMICO (SE MANTIENE, PERO REPARADO) ============
   ============================================================ */

const ACS_HR_MORALE_FACTOR = m => 1 + ((m - 50) / 1000);
const ACS_HR_BONUS_FACTOR  = b => 1 + (b || 0) / 100;

const ACS_HR_ANNUAL_RAISE = {
    pilot: 0.03,
    cabin: 0.01,
    maintenance: 0.02,
    ground: 0.015,
    admin: 0.015,
    default: 0.015
};

/* ============================================================
   CALCULAR SALARIO DINÁMICO — REPARADO
   ============================================================ */
   
function ACS_HR_calcDynamic(dep) {

    const base = ACS_HR_getBaseSalary(
        window.ACS_getYear ? ACS_getYear() : 1940,
        dep.base
    );

    const moraleFactor = ACS_HR_MORALE_FACTOR(dep.morale);
    const bonusFactor  = ACS_HR_BONUS_FACTOR(dep.bonus || 0);

    const raise = ACS_HR_ANNUAL_RAISE[dep.base] || ACS_HR_ANNUAL_RAISE.default;
    const years = dep.years || 0;
    const seniority = 1 + raise * years;

    return Math.round(base * moraleFactor * bonusFactor * seniority);
}

/* ============================================================
   🟧 HR RECALCULATE ALL — PAYROLL ONLY (FIXED)
   ------------------------------------------------------------
   • NO modifica salarios
   • SOLO calcula costos y payroll
   ============================================================ */

function ACS_HR_recalculateAll() {

  const HR = ACS_HR_load();
  if (!HR) return;

  let totalPayroll = 0;

  Object.values(HR).forEach(dep => {

    if (!dep || typeof dep.staff !== "number" || typeof dep.salary !== "number") return;

    dep.payroll = dep.staff * dep.salary;
    totalPayroll += dep.payroll;

  });

  totalPayroll = Math.round(totalPayroll);

  window.ACS_HR_TOTAL_PAYROLL = totalPayroll;

  window.dispatchEvent(new Event("ACS_HR_UPDATED"));
}

/* ============================================================
   5) CLASSIFY AIRCRAFT (Sin cambios)
   ============================================================ */

function ACS_classifyAircraft(model) {

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
   8) SELECTOR DEL MODAL — Reparado
   ============================================================ */

function HR_fillDepartmentSelector() {

    const hrData = ACS_HR_load();
    const selector = document.getElementById("hrDeptSelector");

    if (!selector) return;

    selector.innerHTML = "";

    Object.keys(hrData).forEach(id => {
        const dep = hrData[id];
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = dep.name;
        selector.appendChild(opt);
    });
}

/* ============================================================
   9) CAMBIO DE DEPARTAMENTO EN MODAL — Reparado
   ============================================================ */

document.addEventListener("change", (e) => {

    if (e.target && e.target.id === "hrDeptSelector") {
        const newID = e.target.value;
        if (typeof openHRFullModal === "function") {
            openHRFullModal(newID);
        }
    }
});

/* ============================================================
   🔵 B1 — INDUSTRY PILOT BASE SALARY TABLE (5-Year Blocks)
   ============================================================ */

const ACS_HR_PILOT_BASE_5Y = {
  1940: 350,
  1945: 420,
  1950: 520,
  1955: 650,
  1960: 850,
  1965: 1100,
  1970: 1500,
  1975: 2000,
  1980: 2600,
  1985: 3400,
  1990: 4500,
  1995: 5500,
  2000: 6500,
  2005: 7200,
  2010: 8200,
  2015: 9000,
  2020: 9600,
  2025: 10200
};

/* ============================================================
   🟧 AUTO SALARY — YEAR CHANGE HOOK
   ------------------------------------------------------------
   • Se ejecuta SOLO si Auto Salary = ON
   • Corre 1 vez por cambio de año
   ============================================================ */

registerTimeListener((time) => {

    if (!time || typeof time.getUTCFullYear !== "function") return;

    const year = time.getUTCFullYear();

    if (localStorage.getItem("ACS_AutoSalary") !== "ON") return;

    ACS_HR_runAutoSalaryEngine(year);
});

/* ============================================================
   🔵 B2 — Obtener bloque 5-year del año real
   ============================================================ */

function ACS_get5YearBlock(year) {
    return year - (year % 5);
}

/* ============================================================
   🔵 B3 — Salario base piloto según bloque 5-year
   ============================================================ */

function ACS_HR_getPilotBase5Y(year) {
  const block = ACS_get5YearBlock(year);
  return ACS_HR_PILOT_BASE_5Y[block] || ACS_HR_PILOT_BASE_5Y[2025];
}

/* ============================================================
   🔵 B4 — Comparar salario actual vs industria (5Y)
   ============================================================ */

function ACS_HR_compareToIndustryStandard() {

    const HR = ACS_HR_load();
    const year = window.ACS_getYear ? ACS_getYear() : 1940;

    let totalDiff = 0;
    let items = 0;

    Object.keys(HR).forEach(id => {
        const dep = HR[id];

        // Solo pilotos
        if (id.startsWith("pilots_")) {

            let size="medium";
            if(id==="pilots_small")  size="small";
            if(id==="pilots_medium") size="medium";
            if(id==="pilots_large")  size="large";
            if(id==="pilots_vlarge") size="vlarge";

            const base5Y = ACS_HR_getPilotBase5Y(year);
            const std = ACS_HR_getPilotSalarySized(year, size);

            const current = dep.salary;

            totalDiff += ((current - std) / std);
            items++;
        }
    });

    return (items > 0) ? (totalDiff / items) : 0;
}


/* ============================================================
   🟠 C2 — Enviar alerta automática al Alert Center
   ============================================================ */

function ACS_HR_triggerIndustryAlert() {

    const diff = ACS_HR_compareToIndustryStandard();

    // Si el salario está más de 5% por debajo del estándar → alerta
    if (diff <= -0.05) {

        ACS_addAlert({
          type: "HR",
          severity: "MEDIUM",
          title: "Crew Contract Update Required (5-Year Cycle)",
          message: "Industry salary cycle active. Crew morale may decrease unless payroll is updated.",
          action: "Open HR",
          link: "hr.html"
        });
    }
}


/* ============================================================
   🟨 D1 — AUTO-ADJUST SALARY (Aplicar estándar 5Y)
   ============================================================ */

function ACS_HR_autoAdjust5Y() {

  const HR = ACS_HR_load();
  const year = window.ACS_getYear ? ACS_getYear() : 1940;

  Object.keys(HR).forEach(id => {

      const dep = HR[id];
      let newSalary = dep.salary;

      // PILOTOS según tamaño
      if (id.startsWith("pilots_")) {

         let size="medium";
         if(id==="pilots_small")  size="small";
         if(id==="pilots_medium") size="medium";
         if(id==="pilots_large")  size="large";
         if(id==="pilots_vlarge") size="vlarge";

         const base5Y = ACS_HR_getPilotBase5Y(year);
         const baseSalary = ACS_HR_getPilotSalarySized(year, size);
         newSalary = baseSalary;

      } else {
         // Otros departamentos según motor histórico normal
         const role = dep.base || "admin";
         newSalary = ACS_HR_getBaseSalary(year, role);
      }

      dep.salary = newSalary;
      dep.payroll = dep.staff * newSalary;

      // Boost moral al actualizar correctamente
      dep.morale = Math.min(100, dep.morale + 10);
  });

  ACS_HR_save(HR);

  if (typeof HR_renderTable === "function") HR_renderTable();
}


/* ============================================================
   🟧 E1 — Conectar panel Salary Cycle del HTML
   ============================================================ */

function HR_updateIndustryPanel() {

    const year = window.ACS_getYear ? ACS_getYear() : 1940;
    const block = ACS_get5YearBlock(year);

    const info = document.getElementById("hrIndustryInfo");
    if (!info) return;

    info.textContent = `Current Industry Cycle: ${block}–${block+5}`;
}


/* ============================================================
   🟧 E2 — Conectar botón “Apply 5-Year Adjustment”
   ============================================================ */

const __btnAdjust = setTimeout(() => {
  const btn = document.getElementById("btnAutoAdjust5Y");
  if (btn) {
    btn.addEventListener("click", () => {
        ACS_HR_autoAdjust5Y();
        HR_updateIndustryPanel();
    });
  }
}, 600);


/* ============================================================
   🟧 E3 — Ejecutar panel + alerta al cargar HR
   ============================================================ */
setTimeout(() => {

    HR_updateIndustryPanel();
    ACS_HR_triggerIndustryAlert();

}, 800);

/* ============================================================
   🟧 HR-LINK-2 — FLIGHT ASSIGNED LISTENER (PHASE 1 DEBUG)
   ------------------------------------------------------------
   • Escucha vuelos creados desde Schedule Table
   • No modifica datos todavía
   • Solo confirma conexión HR ← Ops
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ASSIGNED", e => {

  try {

    const { flight, aircraft } = e.detail || {};

    if (!flight || !aircraft) {
      console.warn("HR: Flight assigned event received but incomplete", e.detail);
      return;
    }

    console.log(
      "%c🧭 HR DETECTED NEW FLIGHT ASSIGNMENT",
      "color:#00ffcc;font-weight:600"
    );

    console.log("✈ Flight:", flight.origin, "→", flight.destination, "ID:", flight.id);
    console.log("🛩 Aircraft:", aircraft.model || aircraft.name || aircraft.id);

    // FUTURE (next phase):
    // ACS_HR_processNewFlight(flight, aircraft);

  } catch (err) {
    console.warn("HR flight assigned listener failed", err);
  }

});

/* ============================================================
   🟧 A7 — AUTO HIRE ENGINE (CORE EXECUTOR)
   ------------------------------------------------------------
   • Lee required vs staff por departamento
   • Contrata exactamente el déficit
   • Respeta botón autoHire
   • Se ejecuta bajo demanda o por ciclo
   ============================================================ */

function ACS_HR_runAutoHire() {

 if (!ACS_HR_isAutoHireEnabled()) {
    
    console.log("🟡 AUTO HIRE OFF — skipped");
    return;
  }

  const HR = ACS_HR_load();
  let hiredTotal = 0;

  Object.entries(HR).forEach(([dept, obj]) => {

    if (!obj || typeof obj.required !== "number") return;

    const staff    = obj.staff || 0;
    const required = obj.required || 0;
    const deficit  = Math.max(0, required - staff);

    if (deficit > 0) {
      obj.staff += deficit;
      hiredTotal += deficit;

      console.log(
        `%c🧑‍✈️ AUTO HIRE — ${dept}: +${deficit} hired`,
        "color:#00ff88;font-weight:700"
      );
    }
  });

  ACS_HR_save(HR);

  if (hiredTotal > 0) {
    console.log(
      `%c✅ AUTO HIRE COMPLETED — TOTAL HIRED: ${hiredTotal}`,
      "color:#00ff80;font-weight:800"
    );
  } else {
    console.log("%c🟢 AUTO HIRE — No deficit found", "color:#00ff80");
  }

  // Refrescar HR UI si existe
  if (typeof loadDepartments === "function") {
    loadDepartments();
  }

  if (typeof HR_updateKPI === "function") {
    HR_updateKPI();
  }
}

/* ============================================================
   🟦 F4.2 — HR BOOTSTRAP WAITING FOR TIME ENGINE (CANONICAL)
   ------------------------------------------------------------
   • HR NO arranca sin tiempo válido del juego
   • Usa SOLO ACS_TIME_CURRENT
   • Se ejecuta UNA SOLA VEZ
   • Elimina definitivamente el fallback a año real
   ============================================================ */

let __HR_BOOTSTRAPPED = false;

registerTimeListener((time) => {

  // ⛔ Seguridad absoluta
  if (__HR_BOOTSTRAPPED) return;

  // ⛔ Tiempo inválido = no hacer nada
  if (!(time instanceof Date) || isNaN(time)) {
    console.warn("⛔ HR WAITING — Game time not ready", time);
    return;
  }

  const year = time.getUTCFullYear();

  console.log(
    "%c🧭 HR TIME AUTHORITY CONFIRMED",
    "color:#00ffcc;font-weight:800",
    "Year:", year
  );

  // ⛔ Prohibido continuar sin año válido
  if (typeof year !== "number") {
    console.error("⛔ HR ABORTED — Invalid game year", year);
    return;
  }

  // ============================================================
  // ✅ ARRANQUE OFICIAL DEL MOTOR HR (UNA SOLA VEZ)
  // ============================================================

  try {

    if (typeof ACS_HR_applyHistoricalSalaries === "function") {
      ACS_HR_applyHistoricalSalaries();
    }

    if (typeof ACS_HR_recalculateAll === "function") {
      ACS_HR_recalculateAll();
    }

    if (typeof HR_updateKPI === "function") {
      HR_updateKPI();
    }

    console.log(
      "%c✅ HR BOOTSTRAP COMPLETED",
      "color:#7CFFB2;font-weight:900"
    );

    __HR_BOOTSTRAPPED = true;

  } catch (err) {

    console.error("⛔ HR BOOTSTRAP FAILED", err);

  }

});

/* ============================================================
   🟧 HR → UI SALARY SYNC (CANONICAL FINAL FIX)
   ------------------------------------------------------------
   Purpose:
   - Sync recalculated HR salaries to UI snapshot
   - Fix frozen salary values in Department Control Center
   - Must be called AFTER any salary normalization
   ============================================================ */

function ACS_HR_syncSalaryToView() {

  const HR = ACS_HR_load();
  if (!HR) return;

  // Reconstruir vista desde HR real
  const view = Object.keys(HR).map(id => {
    const d = HR[id];
    return {
      ...d,
      salary: d.salary || 0,
      payroll: d.payroll || 0,
      morale: d.morale || 0
    };
  });

  window.__ACS_HR_VIEW = view;

  console.log(
    "%c🔄 HR → UI salary sync completed",
    "color:#7CFFB2;font-weight:800"
  );
}

/* ============================================================
   🛑 HR LOCAL AUTO-BOOTSTRAP DISABLED
   ------------------------------------------------------------
   • HR ya no debe autoconstruirse desde localStorage
   • Railway será la autoridad
   ============================================================ */

console.info("🛑 HR LOCAL AUTO-BOOTSTRAP DISABLED — WAITING FOR SERVER STATE");

/* ============================================================
   🟧 AUTO HIRE EXECUTION ON HR INIT
   ------------------------------------------------------------
   • Garantiza personal mínimo al iniciar compañía
   • Solo corre si AutoHire está activado
   ============================================================ */

if (typeof ACS_HR_runAutoHire === "function") {
  ACS_HR_runAutoHire();
}

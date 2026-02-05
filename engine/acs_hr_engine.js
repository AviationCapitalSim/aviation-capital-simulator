/* ============================================================
   === ACS HUMAN RESOURCES ENGINE v2 08DEC25 — MULTI-DEPARTMENT ==
   ------------------------------------------------------------
   • Conserva TODA la arquitectura original
   • Corrige salarios históricos 1940–2026
   • Arregla salarios pilotos por tamaño
   • NO elimina funciones dinámicas existentes
   ============================================================ */

/* ============================================================
   🟦 F4.1 — TIME AUTHORITY LOCK (ACS CANONICAL)
   ------------------------------------------------------------
   • ÚNICA fuente de tiempo para HR
   • NO grita error durante BOOT
   • SOLO válida cuando el Time Engine está listo
   ============================================================ */
function ACS_HR_getGameYear() {

  if (
    window.ACS_TIME_CURRENT instanceof Date &&
    !isNaN(window.ACS_TIME_CURRENT)
  ) {
    return window.ACS_TIME_CURRENT.getUTCFullYear();
  }

  // ⏸️ Boot phase → tiempo aún no publicado (estado NORMAL)
  return undefined;
}

/* ============================================================
   1) LISTADO OFICIAL DE LOS 18 DEPARTAMENTOS VISIBLES
   ============================================================ */
const ACS_HR_DEPARTMENTS = [
    { id: "ceo", name: "Airline CEO", base: "ceo", initial: 1 },
    { id: "vp", name: "High Level Management (VP)", base: "ceo", initial: 0 },
    { id: "middle", name: "Middle Level Management", base: "admin", initial: 1 },
    { id: "economics", name: "Economics & Finance", base: "admin", initial: 1 },
    { id: "comms", name: "Corporate Communications", base: "admin", initial: 0 },
    { id: "hr", name: "Human Resources", base: "admin", initial: 1 },
    { id: "quality", name: "Quality Department", base: "ground", initial: 1 },
    { id: "security", name: "Safety & Security", base: "ground", initial: 0 },
    { id: "customers", name: "Customer Services", base: "flight_ops", initial: 0 },
    { id: "flightops", name: "Flight Ops Division", base: "flight_ops", initial: 1 },
    { id: "maintenance", name: "Technical Maintenance", base: "maintenance", initial: 0 },
    { id: "ground", name: "Ground Handling", base: "ground", initial: 0 },
    { id: "routes", name: "Route Strategies Department", base: "flight_ops", initial: 1 },

    // Pilotos con clasificación
    { id: "pilots_small",  name: "Pilots (Small A/C)",  base: "pilot_small",  initial: 0 },
    { id: "pilots_medium", name: "Pilots (Medium A/C)", base: "pilot_medium", initial: 0 },
    { id: "pilots_large",  name: "Pilots (Large A/C)",  base: "pilot_large",  initial: 0 },
    { id: "pilots_vlarge", name: "Pilots (Very Large A/C)", base: "pilot_vlarge", initial: 0 },

    { id: "cabin", name: "Cabin Crew", base: "cabin", initial: 0 }
];


/* ============================================================
   2) INICIALIZAR HR — FIX SALARIO BASE (NUEVO MOTOR)
   ============================================================ */

const rawHR = localStorage.getItem("ACS_HR");
if (!rawHR || rawHR === "null" || rawHR === "{}") {


    /* ============================================================
       🟦 INITIAL HR SALARY SETUP (Runs Only Once)
       ============================================================ */
    const year = window.ACS_getYear ? ACS_getYear() : 1940;

    /* 🟦 FIX 4 — Scope seguro para __getBase() — FULL SAFARI SAFE */
    const __getBase = (role) => {

        // Safari recalcula año cada llamada
        const y = window.ACS_getYear ? ACS_getYear() : 1940;

        try {
            return ACS_HR_getBaseSalary5Y(y, role);   // Motor 5Y
        } catch (e) {
            return ACS_HR_getBaseSalary(y, role);     // Fallback motor viejo
        }
    };

    const PILOT_MULT = {
        small: 0.55,
        medium: 0.75,
        large: 1.00,
        vlarge: 1.40
    };

    let initialHR = {};

    ACS_HR_DEPARTMENTS.forEach(dep => {

        let salary = 0;

        if (dep.id.startsWith("pilots_")) {
            let size = "medium";
            if (dep.id === "pilots_small")  size = "small";
            if (dep.id === "pilots_medium") size = "medium";
            if (dep.id === "pilots_large")  size = "large";
            if (dep.id === "pilots_vlarge") size = "vlarge";

            const basePilot = __getBase("pilot");
            salary = Math.round(basePilot * PILOT_MULT[size]);

        } else {
            salary = __getBase(dep.base);
        }

        initialHR[dep.id] = {
            name: dep.name,
            base: dep.base,
            role: dep.base,
            staff: dep.initial,
            required: dep.initial,
            morale: 100,
            years: 0,
            bonus: 0,
            salary: salary,
            payroll: dep.initial * salary
        };
    });

    localStorage.setItem("ACS_HR", JSON.stringify(initialHR));
    localStorage.setItem("ACS_HR_InitialSetup", "DONE");

    console.log("✔ Initial HR Salary Setup Applied");
}

/* ============================================================
   3) TABLA SALARIOS HISTÓRICOS (REAL 1940–2026)
   ============================================================ */

function ACS_HR_getBaseSalary(year, role) {

  const DECADES = {
    1940:{pilot:380,cabin:70,tech:120,ground:45,admin:85,exec:250},
    1950:{pilot:520,cabin:110,tech:180,ground:75,admin:120,exec:350},
    1960:{pilot:900,cabin:185,tech:280,ground:120,admin:190,exec:500},
    1970:{pilot:1600,cabin:320,tech:450,ground:190,admin:320,exec:900},
    1980:{pilot:2600,cabin:550,tech:750,ground:350,admin:500,exec:1500},
    1990:{pilot:3600,cabin:750,tech:950,ground:450,admin:700,exec:2300},
    2000:{pilot:4700,cabin:1000,tech:1300,ground:650,admin:1000,exec:3100},
    2010:{pilot:6200,cabin:1500,tech:1850,ground:950,admin:1500,exec:4500},
    2020:{pilot:8300,cabin:2300,tech:2600,ground:1300,admin:2100,exec:6500},
    2030:{pilot:9000,cabin:2600,tech:2900,ground:1500,admin:2400,exec:7500}
  };

  const decade = Math.max(...Object.keys(DECADES).map(Number).filter(d => year >= d));
  const S = DECADES[decade];

  switch(role){
    case "pilot":
    case "pilot_small":
    case "pilot_medium":
    case "pilot_large":
    case "pilot_vlarge":
      return S.pilot;

    case "cabin":       return S.cabin;
    case "maintenance": return S.tech;
    case "ground":      return S.ground;

    case "admin":
    case "economics":
    case "comms":
    case "hr":
    case "quality":
    case "security":
      return S.admin;

    case "ceo":
    case "vp":
      return S.exec;

    default:
      return 100;
  }
}

/* ============================================================
   🔵 ACS SALARY TABLE (5-YEAR REALISTIC) — COMPLETO
   ============================================================ */
const ACS_HR_SALARY_5Y = {
  1940:{pilot:380, cabin:140, tech:200, ground:120, admin:180, flightops:220, security:150, exec:650},
  1945:{pilot:450, cabin:155, tech:220, ground:130, admin:195, flightops:240, security:160, exec:725},
  1950:{pilot:520, cabin:170, tech:240, ground:140, admin:210, flightops:260, security:170, exec:800},
  1955:{pilot:710, cabin:205, tech:285, ground:165, admin:245, flightops:300, security:200, exec:1000},
  1960:{pilot:900, cabin:240, tech:330, ground:190, admin:280, flightops:340, security:230, exec:1200},
  1965:{pilot:1250,cabin:300, tech:415, ground:235, admin:350, flightops:430, security:285, exec:1700},
  1970:{pilot:1600,cabin:360, tech:500, ground:280, admin:420, flightops:520, security:340, exec:2200},
  1975:{pilot:2100,cabin:480, tech:650, ground:350, admin:520, flightops:640, security:430, exec:2900},
  1980:{pilot:2600,cabin:600, tech:800, ground:420, admin:620, flightops:760, security:520, exec:3600},
  1985:{pilot:3100,cabin:710, tech:925, ground:470, admin:720, flightops:870, security:590, exec:4400},
  1990:{pilot:3600,cabin:820, tech:1050,ground:520, admin:820, flightops:980, security:660, exec:5200},
  1995:{pilot:4150,cabin:960, tech:1225,ground:620, admin:960, flightops:1140,security:755, exec:6200},
  2000:{pilot:4700,cabin:1100,tech:1400,ground:720, admin:1100,flightops:1300,security:850, exec:7200},
  2005:{pilot:5450,cabin:1350,tech:1700,ground:885, admin:1350,flightops:1575,security:1025,exec:8500},
  2010:{pilot:6200,cabin:1600,tech:2000,ground:1050,admin:1600,flightops:1850,security:1200,exec:9800},
  2015:{pilot:7250,cabin:2000,tech:2400,ground:1250,admin:2000,flightops:2225,security:1450,exec:11650},
  2020:{pilot:8300,cabin:2400,tech:2800,ground:1450,admin:2300,flightops:2600,security:1700,exec:13500},
  2025:{pilot:8800,cabin:2600,tech:3000,ground:1600,admin:2500,flightops:2800,security:1850,exec:15000},
  2030:{pilot:9300,cabin:2800,tech:3200,ground:1750,admin:2700,flightops:3000,security:2000,exec:16500}
};

function ACS_HR_get5YBlock(year){
    return year - (year % 5);
}

function ACS_HR_getBaseSalary5Y(year, role){
  const block = ACS_HR_get5YBlock(year);
  const S = ACS_HR_SALARY_5Y[block] || ACS_HR_SALARY_5Y[2025];

  switch(role){
    case "pilot":
    case "pilot_small":
    case "pilot_medium":
    case "pilot_large":
    case "pilot_vlarge":
      return S.pilot;

    case "cabin":       return S.cabin;
    case "maintenance": return S.tech;
    case "ground":      return S.ground;
    case "flight_ops":  return S.flightops;
    case "security":    return S.security;

    case "admin":
    case "economics":
    case "comms":
    case "hr":
    case "quality":
      return S.admin;

    case "ceo":
    case "vp":
      return S.exec;

    default:
      return S.admin;
  }
}

/* WRAPPER — usar 5Y sin romper el motor viejo */
const __oldBaseSalary = ACS_HR_getBaseSalary;

ACS_HR_getBaseSalary = function(year, role){
  try {
    return ACS_HR_getBaseSalary5Y(year, role);
  } catch(e){
    return __oldBaseSalary(year, role);
  }
};

/* ============================================================
   4) PILOTS — MULTIPLICADORES POR TAMAÑO (REPARADO)
   ============================================================ */
function ACS_HR_getPilotSalarySized(year, size){

  const base = ACS_HR_getBaseSalary(year, "pilot");

  const FACTOR = {
    small: 0.55,
    medium:0.75,
    large: 1.00,
    vlarge:1.40
  };

  return Math.round(base * (FACTOR[size] || 1));
}


/* ============================================================
   5) APPLY HISTORICAL SALARIES — FIXED
   ============================================================ */
function ACS_HR_applyHistoricalSalaries() {

    const HR = JSON.parse(localStorage.getItem("ACS_HR")||"{}");
    const year = window.ACS_getYear ? ACS_getYear() : 1940;

    Object.keys(HR).forEach(id => {
        const dep = HR[id];
        let finalSalary = 0;

        // ---- Pilotos (4 grupos) ----
        if (id.startsWith("pilots_")) {

            let size="medium";
            if(id==="pilots_small") size="small";
            if(id==="pilots_medium") size="medium";
            if(id==="pilots_large") size="large";
            if(id==="pilots_vlarge") size="vlarge";

            finalSalary = ACS_HR_getPilotSalarySized(year, size);

        } else {
            // ---- Demás roles ----
            finalSalary = ACS_HR_getBaseSalary(year, dep.base);
        }

        dep.salary = finalSalary;
        dep.payroll = dep.staff * finalSalary;
    });

    localStorage.setItem("ACS_HR", JSON.stringify(HR));
}
/* ============================================================
   === HELPERS ==================================================
   ============================================================ */

function ACS_HR_load() {
    return JSON.parse(localStorage.getItem("ACS_HR"));
}

function ACS_HR_save(data) {
    localStorage.setItem("ACS_HR", JSON.stringify(data));
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
   API: VISTA PARA TABLAS (department_control.html)
   ============================================================ */
function ACS_HR_getDepartmentsView() {

    const hr = ACS_HR_load();

    return ACS_HR_DEPARTMENTS.map(d => {

        const dep = hr[d.id];

        // 🔥 Protección total — si falta en localStorage, lo recrea
        if (!dep) {
            console.warn("⚠️ HR missing department:", d.id, "→ recreando…");

            hr[d.id] = {
                name: d.name,
                base: d.base,
                staff: d.initial || 0,
                required: d.initial || 0,
                morale: 100,
                salary: 0,
                payroll: 0,
                bonus: 0,
                years: 0
            };

            ACS_HR_save(hr);

            return {
                id: d.id,
                name: d.name,
                base: d.base,
                staff: hr[d.id].staff,
                required: hr[d.id].required,
                morale: hr[d.id].morale,
                salary: hr[d.id].salary,
                payroll: hr[d.id].payroll
            };
        }

        const required =
            (typeof dep.required === "number") ? dep.required : dep.staff;

        return {
            id: d.id,
            name: d.name,
            base: d.base,
            staff: dep.staff,
            required: required,
            morale: dep.morale,
            salary: dep.salary,
            payroll: dep.payroll
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

  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
  let totalPayroll = 0;

  Object.values(HR).forEach(dep => {
    if (!dep || typeof dep.staff !== "number" || typeof dep.salary !== "number") return;
    totalPayroll += dep.staff * dep.salary;
  });

  totalPayroll = Math.round(totalPayroll);

  // 🔴 FUENTE CANÓNICA PARA FINANCE
  localStorage.setItem("ACS_HR_PAYROLL", totalPayroll);

  // 🔔 Avisar a Finance / UI
  window.dispatchEvent(new Event("ACS_HR_UPDATED"));
}

/* ============================================================
   🟧 AUTO SALARY ENGINE — CANONICAL
   ------------------------------------------------------------
   • Corre SOLO si Auto Salary = ON
   • Ajusta por época / año
   • NO se ejecuta en loops
   ============================================================ */

function ACS_HR_runAutoSalaryEngine(year) {

  const auto = localStorage.getItem("ACS_AutoSalary");
  if (auto !== "ON") return;

  const HR = JSON.parse(localStorage.getItem("ACS_HR") || {});
  if (!HR) return;

  Object.entries(HR).forEach(([id, dep]) => {

    if (!dep || !dep.base || !dep.count) return;

    if (id.startsWith("pilots_")) {
      const size = dep.size || "small";
      dep.salary = ACS_HR_getPilotSalarySized(year, size);
    } else {
      dep.salary = ACS_HR_getBaseSalary(year, dep.base);
    }
  });

  localStorage.setItem("ACS_HR", JSON.stringify(HR));
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

  const flag = localStorage.getItem("autoHire");
  if (flag !== "true") {
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
   🟩 HR-A2 — HR BOOTSTRAP CORE (ACS OFFICIAL)
   ------------------------------------------------------------
   Purpose:
   - Garantizar que HR exista antes de ser usado
   - Crear estructura mínima si no existe
   - Ejecutarse SOLO una vez
   ------------------------------------------------------------
   Version: v1.0 | Date: 05 FEB 2026
   ============================================================ */

function ACS_HR_bootstrap() {

  let HR = null;

  try {
    HR = JSON.parse(localStorage.getItem("ACS_HR_STATE"));
  } catch (e) {
    HR = null;
  }

  // ================================
  // CASO 1: HR YA EXISTE → salir
  // ================================
  if (HR && typeof HR === "object" && Object.keys(HR).length > 0) {
    return;
  }

  console.log(
    "%c🧩 HR BOOTSTRAP — INITIALIZING HR STATE",
    "color:#ffb300;font-weight:700"
  );

  // ================================
  // ESTRUCTURA MÍNIMA DEPARTAMENTAL
  // ================================
  HR = {

    operations: {
      id: "operations",
      name: "Operations",
      staff: 0,
      salary: 120,
      morale: 100
    },

    finance: {
      id: "finance",
      name: "Finance",
      staff: 0,
      salary: 140,
      morale: 100
    },

    hr: {
      id: "hr",
      name: "Human Resources",
      staff: 0,
      salary: 110,
      morale: 100
    }

  };

  localStorage.setItem("ACS_HR_STATE", JSON.stringify(HR));

  console.log(
    "%c✅ HR BOOTSTRAP COMPLETE",
    "color:#00ff88;font-weight:700",
    HR
  );
}

/* ============================================================
   🟩 HR-A3 — AUTO BOOTSTRAP ON LOAD
   ============================================================ */

ACS_HR_bootstrap();

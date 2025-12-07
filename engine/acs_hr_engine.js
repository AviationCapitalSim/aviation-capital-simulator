/* ============================================================
   === ACS HUMAN RESOURCES ENGINE v2 07DEC25 — MULTI-DEPARTMENT ==
   ------------------------------------------------------------
   • Conserva TODA la arquitectura original
   • Corrige salarios históricos 1940–2026
   • Arregla salarios pilotos por tamaño
   • NO elimina funciones dinámicas existentes
   ============================================================ */


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
if (!localStorage.getItem("ACS_HR")) {

    const hr = {};

    ACS_HR_DEPARTMENTS.forEach(dep => {

        hr[dep.id] = {
            name: dep.name,
            base: dep.base,
            role: dep.base,
            staff: dep.initial,
            morale: 100,

            // ⚠️ YA NO SE USA ACS_HR_SALARY (NO EXISTE EN TU ENGINE)
            salary: 0,
            payroll: 0,

            required: dep.initial,
            years: 0,
            bonus: 0
        };
    });

    localStorage.setItem("ACS_HR", JSON.stringify(hr));
}

/* ============================================================
   3) TABLA SALARIOS HISTÓRICOS (REAL 1940–2026)
   ============================================================ */

function ACS_HR_getBaseSalary(year, role) {

/* ============================================================
   🔵 ACS HR — REALISTIC 5-YEAR SALARY SYSTEM
   Version: 07 DEC 2025 — Qatar Luxury Premium
   Ubicación: Sustituye el motor "DECADES" antiguo
   ============================================================ */

/* ============================================================
   1) TABLA SALARIAL COMPLETA (1940 → 2025)
   Valores reales aproximados, ajustados para ACS gameplay
   ============================================================ */
   
const ACS_HR_SALARY_5Y = {
  1940:{pilot:650, cabin:180, tech:260, ground:120, admin:200, flightops:230, security:170, exec:900},
  1945:{pilot:720, cabin:200, tech:300, ground:140, admin:220, flightops:250, security:190, exec:1000},
  1950:{pilot:820, cabin:230, tech:350, ground:160, admin:250, flightops:290, security:210, exec:1200},
  1955:{pilot:950, cabin:260, tech:420, ground:190, admin:290, flightops:330, security:240, exec:1500},
  1960:{pilot:1100,cabin:300, tech:500, ground:220, admin:340, flightops:380, security:280, exec:1800},
  1965:{pilot:1300,cabin:360, tech:580, ground:260, admin:400, flightops:450, security:330, exec:2100},
  1970:{pilot:1550,cabin:430, tech:700, ground:300, admin:470, flightops:530, security:390, exec:2500},
  1975:{pilot:1800,cabin:520, tech:850, ground:350, admin:550, flightops:620, security:450, exec:3000},
  1980:{pilot:2100,cabin:620, tech:1000,ground:420, admin:650, flightops:730, security:520, exec:3600},
  1985:{pilot:2400,cabin:730, tech:1150,ground:500, admin:750, flightops:850, security:600, exec:4200},
  1990:{pilot:2800,cabin:860, tech:1300,ground:580, admin:900, flightops:1000,security:700, exec:5000},
  1995:{pilot:3200,cabin:1000,tech:1500,ground:680, admin:1100,flightops:1200,security:800, exec:5800},
  2000:{pilot:3600,cabin:1150,tech:1700,ground:780, admin:1300,flightops:1400,security:900, exec:6500},
  2005:{pilot:4000,cabin:1300,tech:1900,ground:900, admin:1500,flightops:1600,security:1000,exec:7200},
  2010:{pilot:4500,cabin:1500,tech:2200,ground:1050,admin:1800,flightops:1900,security:1150,exec:8000},
  2015:{pilot:5000,cabin:1750,tech:2500,ground:1250,admin:2100,flightops:2200,security:1300,exec:9000},
  2020:{pilot:5500,cabin:2000,tech:2800,ground:1450,admin:2400,flightops:2500,security:1450,exec:10000},
  2025:{pilot:6000,cabin:2200,tech:3100,ground:1600,admin:2600,flightops:2700,security:1600,exec:11000}
};

/* ============================================================
   2) Obtener bloque 5-year real
   ============================================================ */
   
function ACS_HR_get5YBlock(year){
  return year - (year % 5);
}

/* ============================================================
   3) Salario BASE por rol según 5-year
   ============================================================ */
   
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

    case "cabin":
      return S.cabin;

    case "maintenance":
      return S.tech;

    case "ground":
      return S.ground;

    case "admin":
    case "finance_admin":
    case "comms":
    case "hr":
    case "quality":
      return S.admin;

    case "flight_ops":
      return S.flightops;

    case "security":
      return S.security;

    case "ceo":
    case "vp":
      return S.exec;

    default:
      return S.admin;
  }
}

/* ============================================================
   🔵 4) PILOTOS — SALARIO por TAMAÑO usando 5-YEAR TABLE
   ============================================================ */
function ACS_HR_getPilotSalarySized(year, size) {

  const base = ACS_HR_getBaseSalary5Y(year, "pilot");

  const MULT = {
    small: 0.55,
    medium:0.75,
    large: 1.00,
    vlarge:1.40
  };

  return Math.round(base * (MULT[size] || 1));
}

/* ============================================================
   🔵 5) APPLY 5-YEAR SALARIES (Reemplaza motor viejo)
   ============================================================ */
function ACS_HR_applyHistoricalSalaries(){

  const HR = ACS_HR_load();
  const year = window.ACS_getYear ? ACS_getYear() : 1940;

  Object.keys(HR).forEach(id => {

    const dep = HR[id];
    let salary = 0;

    if (id.startsWith("pilots_")) {

      let size="medium";
      if(id.includes("small")) size="small";
      if(id.includes("medium"))size="medium";
      if(id.includes("large")) size="large";
      if(id.includes("vlarge"))size="vlarge";

      salary = ACS_HR_getPilotSalarySized(year, size);

    } else {
      salary = ACS_HR_getBaseSalary5Y(year, dep.base);
    }

    dep.salary  = salary;
    dep.payroll = salary * dep.staff;
  });

  ACS_HR_save(HR);
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
   API: AJUSTE SALARIAL (por porcentaje) — Reparado
   ============================================================ */
function ACS_HR_adjustSalary(deptID, percentage) {
    const hr = ACS_HR_load();
    const d = hr[deptID];

    if (!d) return;

    const year = window.ACS_getYear ? ACS_getYear() : 1940;

    // Si es piloto, usar el motor del tamaño
    if (deptID.startsWith("pilots_")) {

        let size="medium";
        if(deptID==="pilots_small") size="small";
        if(deptID==="pilots_medium") size="medium";
        if(deptID==="pilots_large") size="large";
        if(deptID==="pilots_vlarge") size="vlarge";

        const base = ACS_HR_getPilotSalarySized(year, size);

        d.salary = Math.round(base * (percentage / 100));

    } else {
        // No pilotos
        const base = ACS_HR_getBaseSalary(year, d.base);
        d.salary = Math.round(base * (percentage / 100));
    }

    d.payroll = d.salary * d.staff;

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
   RECÁLCULO GENERAL (se mantiene intacto + FIX pilot)
   ============================================================ */
function ACS_HR_recalculateAll() {

    const hr = ACS_HR_load();
    const auto = localStorage.getItem("ACS_AutoSalary") === "ON";

    let payroll = 0;
    const year = window.ACS_getYear ? ACS_getYear() : 1940;

    Object.keys(hr).forEach(id => {

        const dep = hr[id];

        // Dinámico SIEMPRE se calcula
        dep.dynamic_salary = ACS_HR_calcDynamic(dep);

        if (auto) {

            // Re-interpretar dinámico para PILOTOS por tamaño
            if (id.startsWith("pilots_")) {

                let size="medium";
                if(id==="pilots_small") size="small";
                if(id==="pilots_medium") size="medium";
                if(id==="pilots_large") size="large";
                if(id==="pilots_vlarge") size="vlarge";

                const base = ACS_HR_getPilotSalarySized(year, size);

                dep.salary = Math.round(base * (dep.dynamic_salary / base));

            } else {
                dep.salary = dep.dynamic_salary;
            }

        } else {
            // AutoSalary OFF → mantener histórico
            if (id.startsWith("pilots_")) {

                let size="medium";
                if(id==="pilots_small") size="small";
                if(id==="pilots_medium") size="medium";
                if(id==="pilots_large") size="large";
                if(id==="pilots_vlarge") size="vlarge";

                dep.salary = ACS_HR_getPilotSalarySized(year, size);

            } else {
                dep.salary = ACS_HR_getBaseSalary(year, dep.base);
            }
        }

        dep.payroll = dep.salary * dep.staff;

        // years
        if (!dep.years) dep.years = 0;

        payroll += dep.payroll;
    });

    ACS_HR_save(hr);
    localStorage.setItem("ACS_Payroll_Monthly", payroll);

    return payroll;
}


/* ============================================================
   OVERRIDES — (Mantener pero reparado)
   ============================================================ */
const __hr_hire = ACS_HR_hire;
ACS_HR_hire = function(d, amount){
    __hr_hire(d, amount);
    ACS_HR_recalculateAll();
};

const __hr_fire = ACS_HR_fire;
ACS_HR_fire = function(d, amount){
    __hr_fire(d, amount);
    ACS_HR_recalculateAll();
};

const __hr_adj = ACS_HR_adjustSalary;
ACS_HR_adjustSalary = function(d, p){
    __hr_adj(d, p);
    ACS_HR_recalculateAll();
};


/* ============================================================
   LISTENER DE CAMBIO DE AÑO — Reparado
   ============================================================ */
let __HR_lastYear = null;

registerTimeListener((time) => {

    const year = time.getUTCFullYear();

    if (__HR_lastYear === null) __HR_lastYear = year;

    if (year !== __HR_lastYear) {

        const hr = ACS_HR_load();
        Object.values(hr).forEach(dep => dep.years = (dep.years || 0) + 1);
        ACS_HR_save(hr);

        // Ejecutar salarios históricos
        ACS_HR_applyHistoricalSalaries();

        // Recalcular payroll
        ACS_HR_recalculateAll();
    }

    __HR_lastYear = year;
});


/* ============================================================
   4) TABLA REALISTA DE STAFF POR TIPO DE AVIÓN
   (SIN MODIFICAR, SOLO ORDENADO)
   ============================================================ */
const ACS_HR_STAFF_BY_TYPE = {

  small:   { pilots:4,  cabin:0,  maintenance:3,  ground:4,  security:1, flightops:1, quality:1 },
  medium:  { pilots:9,  cabin:4,  maintenance:5,  ground:6,  security:1, flightops:1, quality:1 },
  large:   { pilots:12, cabin:10, maintenance:8,  ground:10, security:2, flightops:2, quality:1.5 },
  vlarge:  { pilots:22, cabin:18, maintenance:12, ground:16, security:3, flightops:3, quality:2 }
};


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
   6) CALCULAR REQUIREMENTS (FLOTA + RUTAS)
   (Solo ordenado, no tocado)
   ============================================================ */
function ACS_HR_calculateRequirements(fleet, totalRoutes, year) {

  const req = {
    ceo: 1,
    vp: 1 + Math.floor(fleet.length / 50),
    middle: 1 + Math.floor(fleet.length / 25),
    economics: Math.ceil(fleet.length / 20) + Math.floor(totalRoutes / 25),
    comms: Math.ceil(fleet.length / 30),
    hr: Math.ceil(totalRoutes / 25) + 1,
    quality: 0,
    security: 0,
    customers: Math.floor(totalRoutes / 10),
    flightops: Math.ceil(fleet.length / 12),
    routes: Math.ceil(totalRoutes / 8),

    pilots_small: 0,
    pilots_medium: 0,
    pilots_large: 0,
    pilots_vlarge: 0,

    cabin: 0,
    maintenance: 0,
    ground: 0,
  };

  fleet.forEach(ac => {
    const type = ACS_classifyAircraft(ac.model);
    const staff = ACS_HR_STAFF_BY_TYPE[type];

    req.pilots_small  += type==="small"  ? staff.pilots : 0;
    req.pilots_medium += type==="medium" ? staff.pilots : 0;
    req.pilots_large  += type==="large"  ? staff.pilots : 0;
    req.pilots_vlarge += type==="vlarge" ? staff.pilots : 0;

    req.maintenance += staff.maintenance;
    req.ground      += staff.ground;
    req.security    += staff.security;
    req.flightops   += Math.ceil(staff.flightops);
    req.quality     += Math.ceil(staff.quality);

    if (type !== "small") {
      req.cabin += staff.cabin;
    }
  });

  return req;
}


/* ============================================================
   7) UPDATE REQUIREMENTS — Reparado
   ============================================================ */
function HR_updateRequirementsFromFleet() {

    const HR = ACS_HR_load();
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const ROUTES = JSON.parse(localStorage.getItem("ACS_Routes") || "[]");

    const year = window.ACS_getYear ? ACS_getYear() : 1940;
    const totalRoutes = ROUTES.length;

    const req = ACS_HR_calculateRequirements(fleet, totalRoutes, year);

    Object.keys(HR).forEach(depID => {

        if (req[depID] !== undefined) {
            HR[depID].required = Math.ceil(req[depID]);
        } else {
            if (typeof HR[depID].required !== "number") {
                HR[depID].required = HR[depID].staff;
            }
        }

        // Recalcular salario histórico
        if (depID.startsWith("pilots_")) {

            let size="medium";
            if(depID==="pilots_small") size="small";
            if(depID==="pilots_medium") size="medium";
            if(depID==="pilots_large") size="large";
            if(depID==="pilots_vlarge") size="vlarge";

            HR[depID].salary = ACS_HR_getPilotSalarySized(year, size);

        } else {
            HR[depID].salary = ACS_HR_getBaseSalary(year, HR[depID].base);
        }

        HR[depID].payroll = HR[depID].salary * HR[depID].staff;
    });

    ACS_HR_save(HR);

    if (typeof HR_renderTable === "function") {
        HR_renderTable();
    }
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
   🔵 ACS HR — 5-Year Adjustment + Alert System (07 DEC 2025)
   Ubicación: Final del archivo acs_hr_engine.js
   ============================================================ */

/* ------------------------------------------------------------
   🟩 1) Comparar salarios contra estándar ACS
   ------------------------------------------------------------ */
function ACS_HR_checkSalaryGaps() {

    const HR = ACS_HR_load();
    const year = window.ACS_getYear ? ACS_getYear() : 1940;

    const block = ACS_HR_get5YBlock(year);
    const S = ACS_HR_SALARY_5Y[block];

    let issues = [];

    Object.keys(HR).forEach(id => {
        const dep = HR[id];
        let std = 0;

        // Pilotos por tamaño
        if (id.startsWith("pilots_")) {

            let size="medium";
            if(id.includes("small")) size="small";
            if(id.includes("medium"))size="medium";
            if(id.includes("large")) size="large";
            if(id.includes("vlarge"))size="vlarge";

            std = ACS_HR_getPilotSalarySized(year, size);

        } else {
            std = ACS_HR_getBaseSalary5Y(year, dep.base);
        }

        const diff = (dep.salary - std) / std;

        issues.push({ id, name: dep.name, diff });
    });

    return issues;
}

/* ------------------------------------------------------------
   🟧 2) Sistema de Alertas Moderno
   ------------------------------------------------------------ */
function ACS_HR_triggerSalaryAlerts() {

    const items = ACS_HR_checkSalaryGaps();

    items.forEach(x => {

        if (x.diff <= -0.40) {
            ACS_addAlert({
                type: "HR",
                severity: "CRITICAL",
                title: `Critical Salary Gap – ${x.name}`,
                message: `Salary for ${x.name} is 40% below ACS standard.`,
                action: "Open HR",
                link: "hr.html"
            });
        }
        else if (x.diff <= -0.25) {
            ACS_addAlert({
                type: "HR",
                severity: "HIGH",
                title: `Salary Below Standard – ${x.name}`,
                message: `${x.name} is 25% under industry levels.`,
                action: "Open HR",
                link: "hr.html"
            });
        }
        else if (x.diff <= -0.15) {
            ACS_addAlert({
                type: "HR",
                severity: "MEDIUM",
                title: `Salary Adjustment Recommended – ${x.name}`,
                message: `${x.name} is 15% under ACS standard.`,
                action: "Open HR",
                link: "hr.html"
            });
        }
    });
}

/* ------------------------------------------------------------
   🟨 3) Nuevo botón Apply 5-Year Adjustment
   ------------------------------------------------------------ */
function ACS_HR_applySalaryCycle() {

    const HR = ACS_HR_load();
    const year = window.ACS_getYear ? ACS_getYear() : 1940;

    Object.keys(HR).forEach(id => {

        const dep = HR[id];
        let salary = 0;

        if (id.startsWith("pilots_")) {

            let size="medium";
            if(id.includes("small")) size="small";
            if(id.includes("medium"))size="medium";
            if(id.includes("large")) size="large";
            if(id.includes("vlarge"))size="vlarge";

            salary = ACS_HR_getPilotSalarySized(year, size);

        } else {
            salary = ACS_HR_getBaseSalary5Y(year, dep.base);
        }

        dep.salary  = salary;
        dep.payroll = dep.staff * salary;

        dep.morale = Math.min(100, dep.morale + 8);
    });

    ACS_HR_save(HR);
    ACS_HR_recalculateAll();

    ACS_addAlert({
        type: "HR",
        severity: "INFO",
        title: "5-Year Salary Cycle Applied",
        message: "All departmental salaries updated to the ACS standard.",
        action: "Open HR",
        link: "hr.html"
    });

    if (typeof loadDepartments === "function") loadDepartments();
}

/* ------------------------------------------------------------
   🟪 4) Conectar el botón del Modal
   ------------------------------------------------------------ */
setTimeout(() => {
    const btn = document.getElementById("btnAutoAdjust5Y");
    if (btn) {
        btn.addEventListener("click", () => {
            ACS_HR_applySalaryCycle();
        });
    }
}, 800);

/* ------------------------------------------------------------
   🟦 5) Lanzar chequeo de alertas al cargar HR
   ------------------------------------------------------------ */
setTimeout(() => {
    ACS_HR_triggerSalaryAlerts();
}, 1000);
}

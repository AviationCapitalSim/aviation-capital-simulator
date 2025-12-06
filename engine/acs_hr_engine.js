/* ============================================================
   === ACS HUMAN RESOURCES ENGINE v1.2 — MULTI-DEPARTMENT ======
   ------------------------------------------------------------
   • 18 departamentos visibles → conectados a 8 departamentos base
   • Staff inicial: 7 empleados (1940)
   • Salarios base oficiales 1940
   • Bonus, contratar, despedir, ajuste salarial
   • Payroll mensual real (integrado con Finance)
   ============================================================ */

/* ============================================================
   1) DEFINICIÓN OFICIAL DE SALARIOS BASE — Año 1940
   ============================================================ */
const ACS_HR_SALARY = {
    ceo: 90,
    finance_admin: 55,
    flight_ops: 75,
    ground: 25,
    maintenance: 70,
    pilots: 120,
    copilots: 90,
    cabin: 45
};

/* ============================================================
   2) LISTADO OFICIAL DE LOS 18 DEPARTAMENTOS VISIBLES
   ============================================================ */
const ACS_HR_DEPARTMENTS = [
    { id: "ceo", name: "Airline CEO", base: "ceo", initial: 1 },
    { id: "vp", name: "High Level Management (VP)", base: "ceo", initial: 0 },
    { id: "middle", name: "Middle Level Management", base: "finance_admin", initial: 1 },
    { id: "economics", name: "Economics & Finance", base: "finance_admin", initial: 1 },
    { id: "comms", name: "Corporate Communications", base: "finance_admin", initial: 0 },
    { id: "hr", name: "Human Resources", base: "finance_admin", initial: 1 },
    { id: "quality", name: "Quality Department", base: "ground", initial: 1 },
    { id: "security", name: "Safety & Security", base: "ground", initial: 0 },
    { id: "customers", name: "Customer Services", base: "flight_ops", initial: 0 },
    { id: "flightops", name: "Flight Ops Division", base: "flight_ops", initial: 1 },
    { id: "maintenance", name: "Technical Maintenance", base: "maintenance", initial: 0 },
    { id: "ground", name: "Ground Handling", base: "ground", initial: 0 },
    { id: "routes", name: "Route Strategies Department", base: "flight_ops", initial: 1 },
    { id: "pilots_small", name: "Pilots (Small A/C)", base: "pilots", initial: 0 },
    { id: "pilots_medium", name: "Pilots (Medium A/C)", base: "pilots", initial: 0 },
    { id: "pilots_large", name: "Pilots (Large A/C)", base: "pilots", initial: 0 },
    { id: "pilots_vlarge", name: "Pilots (Very Large A/C)", base: "pilots", initial: 0 },
    { id: "cabin", name: "Cabin Crew", base: "cabin", initial: 0 }
];

/* ============================================================
   3) CREAR ESTRUCTURA HR SI NO EXISTE
   ============================================================ */
if (!localStorage.getItem("ACS_HR")) {
    const hr = {};

    ACS_HR_DEPARTMENTS.forEach(dep => {
        hr[dep.id] = {
            name: dep.name,
            base: dep.base,
            staff: dep.initial,
            morale: 100,
            salary: ACS_HR_SALARY[dep.base],
            payroll: dep.initial * ACS_HR_SALARY[dep.base]
        };
    });

    localStorage.setItem("ACS_HR", JSON.stringify(hr));
}

/* ============================================================
   Helpers
   ============================================================ */
function ACS_HR_load() {
    return JSON.parse(localStorage.getItem("ACS_HR"));
}

function ACS_HR_save(data) {
    localStorage.setItem("ACS_HR", JSON.stringify(data));
}

/* ============================================================
   CALCULAR PAYROLL TOTAL
   ============================================================ */
function ACS_HR_getTotalPayroll() {
    const hr = ACS_HR_load();
    return Object.values(hr)
        .reduce((sum, d) => sum + (d.staff * d.salary), 0);
}

/* ============================================================
   API: CONTRATAR PERSONAL
   ============================================================ */
function ACS_HR_hire(deptID, amount) {
    const hr = ACS_HR_load();
    const d = hr[deptID];
    if (!d) return;

    d.staff += amount;
    d.payroll = d.staff * d.salary;

    ACS_HR_save(hr);

    // Registrar en finance
    ACS_addExpense("salaries", amount * d.salary);
}

/* ============================================================
   API: DESPEDIR PERSONAL
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
   API: AJUSTE SALARIAL (por porcentaje)
   ============================================================ */
function ACS_HR_adjustSalary(deptID, percentage) {
    const hr = ACS_HR_load();
    const d = hr[deptID];
    if (!d) return;

    d.salary = Math.round(ACS_HR_SALARY[d.base] * (percentage / 100));
    d.payroll = d.salary * d.staff;

    ACS_HR_save(hr);
}

/* ============================================================
   API: BONUS DEPARTAMENTAL
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
   ------------------------------------------------------------
   • Ahora incluye "required" para poder mostrar staff actual / requerido
   • Por ahora, required = staff (placeholder), luego lo conectaremos a la flota
   ============================================================ */
function ACS_HR_getDepartmentsView() {
  const hr = ACS_HR_load();

  return ACS_HR_DEPARTMENTS.map(d => {
    const dep = hr[d.id];

    // ⚠️ Placeholder: required = staff, más adelante lo calcularemos con la flota
    const required = (typeof dep.required === "number")
      ? dep.required
      : dep.staff;

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
   === ACS HR AUTO-SALARY ENGINE v1.0 (DEPARTAMENTAL + SETTINGS)
   ------------------------------------------------------------
   • Dynamic salary depends on settings toggle (ON/OFF)
   • Automatic annual raises (per department)
   • Morale + Bonus + Seniority integrated
   • Auto-update after hire / fire / salary adjust
   • Linked to Global Time Engine (year listener)
   ============================================================ */

/* === CONFIG === */
const ACS_HR_DYNAMIC_KEY = "ACS_HR_DYNAMIC";

/* Coeficientes */
const ACS_HR_MORALE_FACTOR = m => 1 + ((m - 50) / 1000);
const ACS_HR_BONUS_FACTOR = b => 1 + (b || 0) / 100;

/* Incrementos anuales según tu tabla 1940 */
const ACS_HR_ANNUAL_RAISE = {
    pilots: 0.03,
    copilots: 0.02,
    cabin: 0.01,
    default: 0.015
};

/* ============================================================
   CÁLCULO SALARIO DINÁMICO (por departamento)
   ============================================================ */
function ACS_HR_calcDynamic(dep) {
    const base = ACS_HR_SALARY[dep.base];
    const moraleFactor = ACS_HR_MORALE_FACTOR(dep.morale);
    const bonusFactor = ACS_HR_BONUS_FACTOR(dep.bonus || 0);

    const years = dep.years || 0;
    const raise = ACS_HR_ANNUAL_RAISE[dep.base] || ACS_HR_ANNUAL_RAISE.default;
    const seniority = 1 + raise * years;

    return Math.round(base * moraleFactor * bonusFactor * seniority);
}

/* ============================================================
   RECÁLCULO GENERAL (según selector settings)
   ============================================================ */
function ACS_HR_recalculateAll() {

    const hr = ACS_HR_load();
    let payroll = 0;

    const auto = localStorage.getItem("ACS_AutoSalary") === "ON";

    Object.keys(hr).forEach(id => {
        const dep = hr[id];

        /* Dynamic salary siempre se recalcula */
        dep.dynamic_salary = ACS_HR_calcDynamic(dep);

        /* Salary mostrado depende del selector */
        dep.salary = auto 
            ? dep.dynamic_salary 
            : ACS_HR_SALARY[dep.base];

        dep.payroll = dep.salary * dep.staff;

        /* Guardar years si no existe */
        if (!dep.years) dep.years = 0;

        payroll += dep.payroll;
    });

    ACS_HR_save(hr);
    localStorage.setItem("ACS_Payroll_Monthly", payroll);

    return payroll;
}

/* ============================================================
   OVERRIDE acciones HR
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
   LISTENER DE CAMBIO DE AÑO (TIME ENGINE)
   ============================================================ */
let __HR_lastYear = null;

registerTimeListener((time) => {
    const year = time.getUTCFullYear();
    if (__HR_lastYear === null) __HR_lastYear = year;

    if (year !== __HR_lastYear) {
        const hr = ACS_HR_load();
        Object.values(hr).forEach(dep => dep.years = (dep.years || 0) + 1);
        ACS_HR_save(hr);
        ACS_HR_recalculateAll();
    }

    __HR_lastYear = year;
});

/* ============================================================
   AUTO-EJECUCIÓN INICIAL
   ============================================================ */
setTimeout(() => {
    ACS_HR_recalculateAll();
}, 300);

/* ============================================================
   🚀 A1 — ACS HISTORICAL HR ENGINE (1940–2026)
   ------------------------------------------------------------
   • Salarios dinámicos por año y rol
   • Requerimientos de personal por flota + rutas
   • Small aircraft → 0 Cabin Crew
   • Clasificación automática por modelo
   ============================================================ */


/* ============================================================
   1) MAPA DE CLASIFICACIÓN DE AVIONES (AUTO)
   ============================================================ */

function ACS_classifyAircraft(model) {

  model = model.toLowerCase();

  // === Small aircraft ===
  const small = [
    "piper", "cessna", "dc-3", "dc3", "dc 3",
    "beech", "beechcraft", "emb-110", "emb110", "emb 110",
    "atr 42", "atr42", "dornier", "do-228", "do228"
  ];
  if (small.some(m => model.includes(m))) return "small";

  // === Medium ===
  const medium = [
    "a319","a320","a321",
    "b737","737","e190","e195",
    "crj","crj700","crj900","crj1000"
  ];
  if (medium.some(m => model.includes(m))) return "medium";

  // === Large ===
  const large = [
    "a300","a310","a330","a340",
    "b757","b767","b787","787"
  ];
  if (large.some(m => model.includes(m))) return "large";

  // === Very Large ===
  const vlarge = [
    "b747","747","md-11","dc-10","a380","a350"
  ];
  if (vlarge.some(m => model.includes(m))) return "vlarge";

  return "medium";  // default seguro
}


/* ============================================================
   2) TABLA REALISTA DE STAFF POR TIPO DE AVIÓN
   ============================================================ */

const ACS_HR_STAFF_BY_TYPE = {

  small: {
    pilots: 4,
    cabin: 0,        // 🔥 Piper y aviones pequeños → 0 Flight Attendants
    maintenance: 3,
    ground: 4,
    security: 1,
    flightops: 1,
    quality: 1,
  },

  medium: {
    pilots: 9,
    cabin: 4,
    maintenance: 5,
    ground: 6,
    security: 1,
    flightops: 1,
    quality: 1,
  },

  large: {
    pilots: 12,
    cabin: 10,
    maintenance: 8,
    ground: 10,
    security: 2,
    flightops: 2,
    quality: 1.5,
  },

  vlarge: {
    pilots: 22,
    cabin: 18,
    maintenance: 12,
    ground: 16,
    security: 3,
    flightops: 3,
    quality: 2,
  }

};


/* ============================================================
   3) SALARIO DINÁMICO (1940–2026)
   ============================================================ */

function ACS_HR_getBaseSalary(year, role) {

  // === Salarios base por década (USD mensual) ===
  const DECADES = {
    1940: { pilot:400, cabin:80, tech:120, ground:60, admin:90, exec:250 },
    1950: { pilot:550, cabin:120, tech:180, ground:90, admin:140, exec:320 },
    1960: { pilot:900, cabin:200, tech:300, ground:150, admin:220, exec:500 },
    1970: { pilot:1500,cabin:350, tech:500, ground:220, admin:350, exec:900 },
    1980: { pilot:2500,cabin:600, tech:800, ground:380, admin:600, exec:1400 },
    1990: { pilot:3500,cabin:800, tech:1000,ground:500, admin:900, exec:2000 },
    2000: { pilot:4500,cabin:1100,tech:1500,ground:700, admin:1300,exec:2600 },
    2010: { pilot:6000,cabin:1500,tech:2200,ground:900, admin:1800,exec:3500 },
    2020: { pilot:8000,cabin:2000,tech:3000,ground:1250,admin:2600,exec:4500 },
  };

  // Elegir década base
  const keys = Object.keys(DECADES).map(Number);
  const decade = Math.max(...keys.filter(d => year >= d));

  const source = DECADES[decade];

  switch (role) {
    case "pilot": return source.pilot;
    case "cabin": return source.cabin;
    case "maintenance": return source.tech;
    case "ground": return source.ground;
    case "admin":
    case "finance_admin":
    case "economics":
    case "comms":
    case "hr":
    case "quality":
    case "security":
      return source.admin;
    case "exec":
    case "ceo":
    case "vp":
      return source.exec;

    default: return 100; // seguridad
  }
}


/* ============================================================
   4) CALCULAR REQUIREMENTS (FLOTA + RUTAS)
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

  // === Procesa cada avión ===
  fleet.forEach(ac => {
    const type = ACS_classifyAircraft(ac.model);
    const staff = ACS_HR_STAFF_BY_TYPE[type];

    req.pilots_small += type === "small" ? staff.pilots : 0;
    req.pilots_medium += type === "medium" ? staff.pilots : 0;
    req.pilots_large += type === "large" ? staff.pilots : 0;
    req.pilots_vlarge += type === "vlarge" ? staff.pilots : 0;

    req.maintenance += staff.maintenance;
    req.ground += staff.ground;
    req.security += staff.security;
    req.flightops += Math.ceil(staff.flightops);
    req.quality += Math.ceil(staff.quality);

    // === Cabin Crew (pero solo para medium, large, vlarge) ===
    if (type !== "small") {
      req.cabin += staff.cabin;
    }
  });

  return req;
}


/* ============================================================
   5) ACTUALIZAR HR (USADO POR My Aircraft + Routes)
   ============================================================ */

function HR_updateRequirementsFromFleet() {

  const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  const ROUTES = JSON.parse(localStorage.getItem("ACS_Routes") || "[]");

  const year = window.ACS_getYear ? ACS_getYear() : 1940;

  const totalRoutes = ROUTES.length;

  const req = ACS_HR_calculateRequirements(fleet, totalRoutes, year);

  // Actualizar HR.required
  Object.keys(req).forEach(k => {
    if (HR[k]) {
      HR[k].required = Math.ceil(req[k]);
      HR[k].salary = ACS_HR_getBaseSalary(year, HR[k].role);
    }
  });

  localStorage.setItem("ACS_HR", JSON.stringify(HR));

  if (typeof HR_renderTable === "function") {
    HR_renderTable();
  }
}
/* ============================================================
   🟦 B1 — HR UPDATE REQUIREMENTS FROM FLEET v2.0
   ------------------------------------------------------------
   • Lee flota (ACS_MyAircraft)
   • Lee rutas (ACS_Routes)
   • Calcula personal requerido exacto
   • Integra clasificación small/medium/large/vlarge
   • Actualiza HR.required para los 18 departamentos
   ============================================================ */

function HR_updateRequirementsFromFleet() {

    const HR = ACS_HR_load();
    const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
    const ROUTES = JSON.parse(localStorage.getItem("ACS_Routes") || "[]");

    const year = window.ACS_getYear ? ACS_getYear() : 1940;
    const totalRoutes = ROUTES.length;

    // --- Calcular requerimientos globales ---
    const req = ACS_HR_calculateRequirements(fleet, totalRoutes, year);

    // --- Actualizar cada departamento ---
    Object.keys(HR).forEach(depID => {

        // Si el req tiene ese departamento → asignar
        if (req[depID] !== undefined) {
            HR[depID].required = Math.ceil(req[depID]);
        } else {
            // Si el departamento no depende de flota/rutas (ej: CEO, VP)
            if (typeof HR[depID].required !== "number") {
                HR[depID].required = HR[depID].staff;
            }
        }

        // Actualizar salario base al año simulado
        const baseRole = HR[depID].base;
        HR[depID].salary = ACS_HR_getBaseSalary(year, baseRole);
        HR[depID].payroll = HR[depID].salary * HR[depID].staff;
    });

    ACS_HR_save(HR);

    // Refrescar tabla HR si estás en hr.html
    if (typeof HR_renderTable === "function") {
        HR_renderTable();
    }
}

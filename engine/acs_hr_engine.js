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
   1) LISTADO OFICIAL DE LOS 18 DEPARTAMENTOS VISIBLES
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
   2 — CREAR ESTRUCTURA HR INICIAL (AHORA CON ROLE)
   ============================================================ */

if (!localStorage.getItem("ACS_HR")) {

    const hr = {};

    ACS_HR_DEPARTMENTS.forEach(dep => {

        hr[dep.id] = {
            name: dep.name,
            base: dep.base,         // categoría del departamento
            role: dep.base,         // 🔥 NUEVO: define el tipo de rol real
            staff: dep.initial,
            morale: 100,

            salary: ACS_HR_SALARY[dep.base],   // salario base 1940
            payroll: dep.initial * ACS_HR_SALARY[dep.base],

            required: dep.initial,  // por ahora igual al inicial (luego HR_update lo cambia)
            years: 0,               // años de servicio
            bonus: 0                // placeholder
        };
    });

    localStorage.setItem("ACS_HR", JSON.stringify(hr));
}

// ⭐ Ejecutar sueldos históricos (primer arranque)

    ACS_HR_applyHistoricalSalaries();

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
// ⭐ Reaplicar sueldos históricos al cambiar de año

ACS_HR_applyHistoricalSalaries();
   
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
   4) TABLA REALISTA DE STAFF POR TIPO DE AVIÓN
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

  1940: { 
    pilot: 380, 
    cabin: 70, 
    tech: 120, 
    ground: 45, 
    admin: 85, 
    exec: 250 
  },

  1950: { 
    pilot: 520, 
    cabin: 110, 
    tech: 180, 
    ground: 75, 
    admin: 120, 
    exec: 350 
  },

  1960: { 
    pilot: 900, 
    cabin: 185, 
    tech: 280, 
    ground: 120, 
    admin: 190, 
    exec: 500 
  },

  1970: { 
    pilot: 1600, 
    cabin: 320, 
    tech: 450, 
    ground: 190, 
    admin: 320, 
    exec: 900 
  },

  1980: { 
    pilot: 2600, 
    cabin: 550, 
    tech: 750, 
    ground: 350, 
    admin: 500, 
    exec: 1500 
  },

  1990: { 
    pilot: 3600, 
    cabin: 750, 
    tech: 950, 
    ground: 450, 
    admin: 700, 
    exec: 2300 
  },

  2000: { 
    pilot: 4700, 
    cabin: 1000, 
    tech: 1300, 
    ground: 650, 
    admin: 1000, 
    exec: 3100 
  },

  2010: { 
    pilot: 6200, 
    cabin: 1500, 
    tech: 1850, 
    ground: 950, 
    admin: 1500, 
    exec: 4500 
  },

  2020: { 
    pilot: 8300, 
    cabin: 2300, 
    tech: 2600, 
    ground: 1300, 
    admin: 2100, 
    exec: 6500 
  },

  2030: { 
    pilot: 9000, 
    cabin: 2600, 
    tech: 2900, 
    ground: 1500, 
    admin: 2400, 
    exec: 7500 
  }
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
   🟩 PILOT SALARY BY YEAR + SIZE (1940–2026)
   ============================================================ */

function ACS_HR_getPilotSalaryForYear(size, year) {

  // 1) Salario base de PILOT según año (tu motor histórico)
  const base = ACS_HR_getBaseSalary(year, "pilot");

  // 2) Multiplicadores por tamaño
  const FACTOR = {
    small: 0.55,   // regional / avioneta
    medium: 0.75,  // turboprop / regional jet
    large: 1.00,   // 737 / A320 / narrowbody
    vlarge: 1.40   // widebody + ultra heavy (747 / A380, etc.)
  };

  return Math.round(base * (FACTOR[size] || 1));
}

/* ============================================================
   B1.1 — APLICAR SALARIO HISTÓRICO SEGÚN AÑO, ROL Y TAMAÑO
   — Ahora usa base histórica (1940–2026)
   — Diferencia pilotos por tamaño (small / medium / large / vlarge)
   ============================================================ */
function ACS_HR_applyHistoricalSalaries() {

    const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
    const year = window.ACS_getYear ? ACS_getYear() : 1940;

    Object.keys(HR).forEach(id => {

        const dep = HR[id];
        let newSalary = 0;

        /* ----------------------------------------------
           1) CASO ESPECIAL: PILOTOS
           (4 departamentos: small/medium/large/vlarge)
        ---------------------------------------------- */
        if (id === "pilots_small" ||
            id === "pilots_medium" ||
            id === "pilots_large" ||
            id === "pilots_vlarge") {

            // Determinar tamaño exacto
            let size = "medium";
            if (id === "pilots_small")  size = "small";
            if (id === "pilots_medium") size = "medium";
            if (id === "pilots_large")  size = "large";
            if (id === "pilots_vlarge") size = "vlarge";

            // Salario base histórico → función oficial
            const basePilot = ACS_HR_getBaseSalary(year, "pilot");

            // Aplicar multiplicador por tamaño
            newSalary = ACS_HR_getPilotSalary(size, basePilot);

        } else {

            /* ----------------------------------------------
               2) RESTO DE DEPARTAMENTOS (admin, cabin, tech…)
               Usan el motor histórico normal por rol
            ---------------------------------------------- */

            const role = dep.base || "admin";
            newSalary = ACS_HR_getBaseSalary(year, role);
        }

        // Aplicar salario final
        dep.salary = newSalary;
        dep.payroll = dep.staff * newSalary;
    });

    // Guardar cambios globales
    localStorage.setItem("ACS_HR", JSON.stringify(HR));

    // Refrescar tabla si estás en HR.html
    if (typeof HR_renderTable === "function") {
        HR_renderTable();
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


/* ============================================================
   ⭐ E1 — Llenar Selector Qatar Luxury del Modal HR
   ============================================================ */

function HR_fillDepartmentSelector() {

    const hrData = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
    const selector = document.getElementById("hrDeptSelector");

    if (!selector) return;

    selector.innerHTML = "";

    // Crear opciones dinámicamente
    Object.keys(hrData).forEach(id => {
        const dep = hrData[id];
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = dep.name;
        selector.appendChild(opt);
    });
}

/* ============================================================
   ⭐ E2 — Activar cambio de departamento dentro del modal
   ============================================================ */

document.addEventListener("change", (e) => {

    if (e.target && e.target.id === "hrDeptSelector") {

        const newID = e.target.value;

        if (typeof openHRFullModal === "function") {
            openHRFullModal(newID);  // recargar modal con el nuevo dept
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
   🔵 B2 — Obtener el bloque de 5 años 
   ============================================================ */
function ACS_get5YearBlock(year) {
    return year - (year % 5);
}

/* ============================================================
   🔵 B3 — Salario base piloto según bloque de 5 años
   ============================================================ */
function ACS_HR_getPilotBase5Y(year) {
  const block = ACS_get5YearBlock(year);
  return ACS_HR_PILOT_BASE_5Y[block] || ACS_HR_PILOT_BASE_5Y[2025];
}
/* ============================================================
   🔵 B4 — Comparar salario actual con estándar 5Y
   ============================================================ */
function ACS_HR_compareToIndustryStandard() {

    const HR = ACS_HR_load();
    const year = window.ACS_getYear ? ACS_getYear() : 1940;
    const block = ACS_get5YearBlock(year);

    let totalDiff = 0;
    let items = 0;

    Object.keys(HR).forEach(id => {
        const dep = HR[id];

        // Solo pilotos por ahora (es lo más crítico)
        if (id.includes("pilots")) {
            let size = "medium";
            if (id === "pilots_small") size = "small";
            else if (id === "pilots_large") size = "large";
            else if (id === "pilots_vlarge") size = "vlarge";

            const base5Y = ACS_HR_getPilotBase5Y(year);
            const std = ACS_HR_getPilotSalary(size, base5Y);

            const current = dep.salary;

            totalDiff += ((current - std) / std);
            items++;
        }
    });

    return (items > 0) ? (totalDiff / items) : 0;
}

/* ============================================================
   🟠 C2 — Alerta automática en el Alert Center
   ============================================================ */
function ACS_HR_triggerIndustryAlert() {

    const diff = ACS_HR_compareToIndustryStandard();

    if (diff >= -0.05) return; // No alert needed

    ACS_addAlert({
      type: "HR",
      severity: "MEDIUM",
      title: "Crew Contract Update Required (5-Year Cycle)",
      message: "Industry salary update active. Your payroll is outdated. Crew morale is decreasing.",
      action: "Open HR",
      link: "hr.html"
    });
}
/* ============================================================
   🟨 D1 — Auto-Adjust Salary (Aplicar estándar 5-Year)
   ============================================================ */
function ACS_HR_autoAdjust5Y() {

  const HR = ACS_HR_load();
  const year = window.ACS_getYear ? ACS_getYear() : 1940;

  Object.keys(HR).forEach(id => {

      const dep = HR[id];
      let newSalary = dep.salary;

      // PILOTOS por tamaño
      if (id.includes("pilots")) {

         let size = "medium";
         if (id === "pilots_small") size = "small";
         else if (id === "pilots_large") size = "large";
         else if (id === "pilots_vlarge") size = "vlarge";

         const base5Y = ACS_HR_getPilotBase5Y(year);
         newSalary = ACS_HR_getPilotSalary(size, base5Y);

      } else {
         // Otros departamentos usan tu motor base por rol
         const role = dep.base || "admin";
         newSalary = ACS_HR_getBaseSalary(year, role);
      }

      dep.salary = newSalary;
      dep.payroll = dep.staff * newSalary;
      dep.morale = Math.min(100, dep.morale + 8); // morale boost
  });

  ACS_HR_save(HR);

  if (typeof HR_renderTable === "function") HR_renderTable();
}

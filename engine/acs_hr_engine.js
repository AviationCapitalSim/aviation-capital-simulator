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
   ============================================================ */
function ACS_HR_getDepartmentsView() {
    const hr = ACS_HR_load();
    return ACS_HR_DEPARTMENTS.map(d => ({
        id: d.id,
        name: d.name,
        base: d.base,
        staff: hr[d.id].staff,
        morale: hr[d.id].morale,
        salary: hr[d.id].salary,
        payroll: hr[d.id].payroll
    }));
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

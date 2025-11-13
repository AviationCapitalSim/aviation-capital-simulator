/* ===============================================================
   ===  ACS HUMAN RESOURCES ENGINE — CORE MODULE (v1.0)        ===
   ===  Fecha: 13 NOV 2025                                     ===
   ===  Responsable: Aviation Capital Simulator (ACS)          ===
   ---------------------------------------------------------------
   ▪ Inicializa HR automáticamente al entrar al Dashboard
   ▪ Año de inicio: 1940
   ▪ Staff inicial mínimo (sin aviones)
   ▪ Salarios base por departamento
   ▪ Cálculo de payroll mensual real
   ▪ Funciones para contratar, despedir y ajustar salarios
   ▪ Finance leerá HR.payroll para reflejar gastos
   =============================================================== */

/* ========== Helpers básicos de LocalStorage para HR ========== */

function ACS_getHR() {
  return JSON.parse(localStorage.getItem("ACS_HR") || "null");
}

function ACS_saveHR(data) {
  localStorage.setItem("ACS_HR", JSON.stringify(data));
}

/* ========== 1. Configuración base de departamentos (1940) ========== */
/*
   Claves de staff / salarios / morale:

   ceo              → CEO de la aerolínea
   finance_admin    → Finanzas & Administración
   flight_ops       → Operaciones (Dispatch)
   ground           → Ground Handling (mínimo base)
   maintenance      → Mantenimiento
   pilots           → Pilotos
   copilots         → Copilotos
   cabin            → Cabin Crew
*/

const ACS_HR_BASE_SALARIES_1940 = {
  ceo: 70,
  finance_admin: 55,
  flight_ops: 85,
  ground: 25,
  maintenance: 70,
  pilots: 120,
  copilots: 90,
  cabin: 45
};

/* ========== 2. Inicialización HR (primera vez) ========== */

function ACS_HR_initialize_1940() {

  const HR = {
    year: 1940,

    staff: {
      ceo: 1,             // 1 CEO
      finance_admin: 2,   // 2 administrativos
      flight_ops: 1,      // 1 en Operaciones / Dispatch
      ground: 1,          // 1 de tierra mínimo
      maintenance: 0,
      pilots: 0,
      copilots: 0,
      cabin: 0
    },

    salaries: { ...ACS_HR_BASE_SALARIES_1940 },

    morale: {
      ceo: 100,
      finance_admin: 100,
      flight_ops: 100,
      ground: 100,
      maintenance: 100,
      pilots: 100,
      copilots: 100,
      cabin: 100
    },

    payroll: 0,        // se recalcula
    totalStaff: 0,     // se recalcula
    avgMorale: 100     // se recalcula
  };

  ACS_HR_recalculateTotals(HR);
  ACS_saveHR(HR);

  console.log(
    `✅ ACS_HR initialized (1940) — Staff: ${HR.totalStaff} | Payroll: $${HR.payroll}`
  );
}

/* ========== 3. Recalcular totales (staff, payroll, morale) ========== */

function ACS_HR_recalculateTotals(HR) {
  if (!HR) HR = ACS_getHR();
  if (!HR) return;

  const s = HR.staff;
  const sal = HR.salaries;
  const m = HR.morale;

  // Total de personal
  HR.totalStaff =
    s.ceo +
    s.finance_admin +
    s.flight_ops +
    s.ground +
    s.maintenance +
    s.pilots +
    s.copilots +
    s.cabin;

  // Payroll mensual
  HR.payroll =
    (s.ceo * sal.ceo) +
    (s.finance_admin * sal.finance_admin) +
    (s.flight_ops * sal.flight_ops) +
    (s.ground * sal.ground) +
    (s.maintenance * sal.maintenance) +
    (s.pilots * sal.pilots) +
    (s.copilots * sal.copilots) +
    (s.cabin * sal.cabin);

  // Morale promedio (solo departamentos con gente)
  const moraleList = [];
  Object.keys(s).forEach(role => {
    if (s[role] > 0) {
      moraleList.push(m[role] ?? 100);
    }
  });
  HR.avgMorale =
    moraleList.length === 0
      ? 100
      : Math.round(moraleList.reduce((a, b) => a + b, 0) / moraleList.length);

  ACS_saveHR(HR);
}

/* ========== 4. API de gestión de personal (llamable desde HTML/otros módulos) ========== */

/**
 * Contrata personal en un rol específico.
 * @param {string} role - uno de: "ceo","finance_admin","flight_ops","ground","maintenance","pilots","copilots","cabin"
 * @param {number} count - cantidad de personas a contratar
 */
function ACS_HR_hire(role, count = 1) {
  const HR = ACS_getHR();
  if (!HR || !HR.staff[role]) {
    if (!HR || HR.staff[role] === undefined) {
      console.warn("⚠️ ACS_HR_hire: rol desconocido:", role);
      return;
    }
  }
  count = Number(count) || 0;
  if (count <= 0) return;

  // CEO no crece automáticamente por seguridad
  if (role === "ceo") {
    console.warn("⚠️ CEO staff is fixed (1). Hire ignored.");
    return;
  }

  HR.staff[role] += count;
  ACS_HR_recalculateTotals(HR);
  console.log(`👥 Hired ${count} in ${role}. Total staff: ${HR.totalStaff}`);
}

/**
 * Despide personal en un rol específico.
 * @param {string} role
 * @param {number} count
 */
function ACS_HR_fire(role, count = 1) {
  const HR = ACS_getHR();
  if (!HR || HR.staff[role] === undefined) {
    console.warn("⚠️ ACS_HR_fire: rol desconocido:", role);
    return;
  }
  count = Number(count) || 0;
  if (count <= 0) return;

  // CEO no se despide desde aquí
  if (role === "ceo") {
    console.warn("⚠️ CEO cannot be fired via ACS_HR_fire.");
    return;
  }

  HR.staff[role] = Math.max(0, HR.staff[role] - count);
  ACS_HR_recalculateTotals(HR);
  console.log(`🗑️ Fired ${count} in ${role}. Total staff: ${HR.totalStaff}`);
}

/**
 * Ajusta salario de un rol en porcentaje.
 * @param {string} role
 * @param {number} percentage - 100 = igual, 120 = +20%, 80 = -20%
 */
function ACS_HR_adjustSalary(role, percentage) {
  const HR = ACS_getHR();
  if (!HR || HR.salaries[role] === undefined) {
    console.warn("⚠️ ACS_HR_adjustSalary: rol desconocido:", role);
    return;
  }
  percentage = Number(percentage) || 100;
  if (percentage <= 0) return;

  const base = ACS_HR_BASE_SALARIES_1940[role] || HR.salaries[role];
  const factor = percentage / 100;

  HR.salaries[role] = Math.round(base * factor);
  ACS_HR_recalculateTotals(HR);

  console.log(
    `💵 Salary adjusted for ${role}. New monthly salary: $${HR.salaries[role]}`
  );
}

/**
 * Aplica un bonus a un departamento (solo morale, el costo lo debe tratar Finance).
 * @param {string} role
 * @param {number} percentBonus - ej: 20, 40, 60...
 */
function ACS_HR_applyBonus(role, percentBonus) {
  const HR = ACS_getHR();
  if (!HR || HR.morale[role] === undefined) {
    console.warn("⚠️ ACS_HR_applyBonus: rol desconocido:", role);
    return;
  }
  percentBonus = Number(percentBonus) || 0;
  if (percentBonus <= 0) return;

  const moraleBoost = percentBonus / 5; // ejemplo: 20% bonus → +4 morale
  HR.morale[role] = Math.min(100, HR.morale[role] + moraleBoost);

  ACS_HR_recalculateTotals(HR);
  console.log(
    `🎖️ Bonus applied to ${role}. New morale: ${HR.morale[role]}%`
  );
}

/* ========== 5. Helper para obtener departamentos en formato amigable ========== */
/**
 * Devuelve un arreglo de objetos con:
 * { key, name, staff, salary, morale, monthlyCost }
 */
function ACS_HR_getDepartmentsView() {
  const HR = ACS_getHR();
  if (!HR) return [];

  const mapNames = {
    ceo: "High Level Management (CEO)",
    finance_admin: "Finance & Administration",
    flight_ops: "Flight Operations (Dispatch)",
    ground: "Ground Handling",
    maintenance: "Technical Services & Maintenance",
    pilots: "Pilots",
    copilots: "Co-Pilots",
    cabin: "Cabin Crew"
  };

  const result = [];

  Object.keys(HR.staff).forEach(role => {
    result.push({
      key: role,
      name: mapNames[role] || role,
      staff: HR.staff[role],
      salary: HR.salaries[role],
      morale: HR.morale[role],
      monthlyCost: HR.staff[role] * HR.salaries[role]
    });
  });

  return result;
}

/* ========== 6. Inicialización automática en Dashboard ==========
   Este bloque solo se ejecuta cuando la página actual es dashboard.html
   =============================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  const isDashboard =
    path.includes("dashboard.html") || window.location.href.includes("dashboard.html");

  if (!isDashboard) return;

  let HR = ACS_getHR();

  if (!HR) {
    console.log("🔄 No ACS_HR found → initializing HR (1940)...");
    ACS_HR_initialize_1940();
  } else {
    console.log("📂 ACS_HR loaded:", HR);
    ACS_HR_recalculateTotals(HR);
  }
});

/* ===============================================================
   ===  ACS HUMAN RESOURCES ENGINE — CORE MODULE (v1.0)         ===
   ===  Fecha: 13 NOV 2025                                       ===
   ===  Responsable: ACS Systems                                 ===
   ---------------------------------------------------------------
   ▪ Inicializa HR automáticamente al entrar a dashboard.html
   ▪ Sueldos históricos 1940
   ▪ Staff inicial mínimo (oficina)
   ▪ Payroll mensual real conectado con Finance
   ▪ Contratación automática según compra de avión o creación de ruta
   ▪ Compatible con AutoHire del Settings
   =============================================================== */

/* ===============================================================
   ===  UTILIDAD PRINCIPAL — CARGAR / GUARDAR LOCALSTORAGE     ===
   =============================================================== */
function getACS_HR() {
  return JSON.parse(localStorage.getItem("ACS_HR") || "null");
}

function saveACS_HR(data) {
  localStorage.setItem("ACS_HR", JSON.stringify(data));
}

/* ===============================================================
   ===  1. INICIALIZACIÓN HISTÓRICA (AÑO 1940)                 ===
   =============================================================== */
function HR_initialize_1940() {

  const HR = {
    year: 1940,

    staff: {
      admin: 3,            // oficina básica
      operations_basic: 1, // 1 persona en operaciones
      pilots: 0,
      copilots: 0,
      cabin: 0,
      mechanics: 0,
      ground: 0
    },

    salaries: {
      admin: 55,            // USD mensuales en 1940
      operations_basic: 85,
      pilot: 120,
      copilot: 90,
      cabin: 45,
      mechanic: 70,
      ground: 25
    },

    morale: {
      admin: 100,
      operations_basic: 100,
      pilots: 100,
      copilots: 100,
      cabin: 100,
      mechanics: 100,
      ground: 100
    },

    payroll: 0,       // se calcula
    totalStaff: 0,    // se calcula
    avgMorale: 0      // se calcula
  };

  HR_updateTotals(HR);
  saveACS_HR(HR);

  console.log("✅ ACS HR initialized (1940) → Staff: 4 | Payroll: $" + HR.payroll);
}

/* ===============================================================
   ===  2. CÁLCULO AUTOMÁTICO DE PAYROLL & TOTALES             ===
   =============================================================== */
function HR_updateTotals(HR) {

  const s = HR.staff;
  const sal = HR.salaries;

  HR.totalStaff =
      s.admin +
      s.operations_basic +
      s.pilots +
      s.copilots +
      s.cabin +
      s.mechanics +
      s.ground;

  HR.payroll =
      (s.admin * sal.admin) +
      (s.operations_basic * sal.operations_basic) +
      (s.pilots * sal.pilot) +
      (s.copilots * sal.copilot) +
      (s.cabin * sal.cabin) +
      (s.mechanics * sal.mechanic) +
      (s.ground * sal.ground);

  // morale promedio usando solo personas existentes
  const moraleList = [];
  Object.keys(s).forEach(role => {
    if (s[role] > 0) {
      moraleList.push(HR.morale[role]);
    }
  });

  HR.avgMorale = moraleList.length === 0
      ? 100
      : Math.round(moraleList.reduce((a,b) => a+b, 0) / moraleList.length);

  saveACS_HR(HR);
}

/* ===============================================================
   ===  3. CONTRATACIÓN SEGÚN ACTIVIDAD REAL                   ===
   =============================================================== */
/*
   Estas funciones serán llamadas por otros módulos:

   - Cuando el jugador compra o alquila un avión:
       HR_assignCrewForNewAircraft()

   - Cuando el jugador crea su primera ruta:
       HR_addGroundHandling()

   - AutoHire desde Settings:
       HR_autoHireRequiredStaff()
*/

function HR_assignCrewForNewAircraft(aircraftType = "generic") {
  const HR = getACS_HR(); if (!HR) return;

  // Cantidad realista por avión en 1940
  HR.staff.pilots += 2;
  HR.staff.copilots += 1;
  HR.staff.cabin += 2;
  HR.staff.mechanics += 2;

  HR_updateTotals(HR);
  console.log("👨‍✈️ Crew assigned for new aircraft → Total staff:", HR.totalStaff);
}

function HR_addGroundHandling() {
  const HR = getACS_HR(); if (!HR) return;

  // Primera ruta → equipo mínimo de tierra
  if (HR.staff.ground === 0) {
    HR.staff.ground = 5;  // mínimo de 5 personas
  }

  HR_updateTotals(HR);
  console.log("🛄 Ground Handling activated:", HR.staff.ground);
}

/*
   AutoHire: solo contrata lo necesario, NO despide.
*/
function HR_autoHireRequiredStaff(required) {
  const HR = getACS_HR(); if (!HR) return;

  Object.keys(required).forEach(role => {
    if (HR.staff[role] < required[role]) {
      HR.staff[role] = required[role];
    }
  });

  HR_updateTotals(HR);
}

/* ===============================================================
   ===  4. INICIALIZACIÓN AUTOMÁTICA EN DASHBOARD              ===
   =============================================================== */
document.addEventListener("DOMContentLoaded", () => {

  // Solo ejecuta al entrar por primera vez al MAIN
  const isDashboard =
      window.location.pathname.includes("dashboard.html") ||
      window.location.href.includes("dashboard.html");

  if (!isDashboard) return;

  const HR = getACS_HR();

  if (!HR) {
    console.log("🔄 No HR data found → Initializing 1940 HR package...");
    HR_initialize_1940();
  } else {
    console.log("HR data loaded:", HR);
  }
});

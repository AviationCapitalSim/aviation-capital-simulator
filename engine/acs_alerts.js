/* ============================================================
   === ACS ALERT ENGINE — BETA REAL v1 =========================
   === No inventa datos | Solo detecta | 100% seguro ===========
   ============================================================ */

console.log("✔ ACS Alert Engine (BETA REAL) loaded");

window.ACS_ALERTS = [];   // Donde se almacenan TODAS las alertas reales detectadas


/* ============================================================
   === HELPERS ================================================
   ============================================================ */

function addAlert(type, level, message) {
  // Bloquea datos inválidos o vacíos
  if (!message || !type || !level) return;

  window.ACS_ALERTS.push({
    type,
    level,
    message,
    timestamp: new Date().toISOString()
  });
}


/* ============================================================
   === 1) LOCALSTORAGE: ACS_activeUser =========================
   ============================================================ */

function scanLocalStorageForAlerts() {
  const activeUserRaw = localStorage.getItem("ACS_activeUser");
  if (!activeUserRaw) return;

  let userData = {};
  try {
    userData = JSON.parse(activeUserRaw);
  } catch (e) {
    return;
  }

  const airline = userData.airline || {};

  // Credits
  if (airline.credits !== undefined && airline.credits < 500) {
    addAlert("credits", "high", `Low credits balance: ${airline.credits} AC$`);
  }

  // Base not set
  if (!airline.base || !airline.base.icao) {
    addAlert("operations", "medium", "Your airline does not have an assigned base.");
  }
}


/* ============================================================
   === 2) FINANCE ENGINE (SAFE DETECTION) ======================
   ============================================================ */

function scanFinanceForAlerts() {
  if (!window.ACS_FINANCE) return;  // finance.js not loaded

  const fin = window.ACS_FINANCE;

  // Loans
  if (fin.loans && Array.isArray(fin.loans)) {
    fin.loans.forEach(loan => {
      if (loan.days_remaining !== undefined && loan.days_remaining <= 2) {
        addAlert("finance", "high", `Loan repayment due in ${loan.days_remaining} days.`);
      }
    });
  }

  // Negative weekly growth
  if (fin.weekly_growth !== undefined && fin.weekly_growth < 0) {
    addAlert("finance", "medium", `Negative weekly growth: ${fin.weekly_growth}%`);
  }
}


/* ============================================================
   === 3) HR ENGINE (SAFE DETECTION) ============================
   ============================================================ */

function scanHRForAlerts() {
  if (!window.ACS_HR) return;

  const hr = window.ACS_HR;

  if (hr.departments) {
    Object.values(hr.departments).forEach(dep => {
      if (dep.morale !== undefined && dep.morale < 40) {
        addAlert("hr", "high", `HR Alert: ${dep.name} morale is ${dep.morale}%.`);
      }
    });
  }
}


/* ============================================================
   === 4) AIRCRAFT ENGINE (SAFE DETECTION) =====================
   ============================================================ */

function scanAircraftForAlerts() {
  if (!window.ACS_AIRCRAFT) return;

  const fleet = window.ACS_AIRCRAFT;

  if (Array.isArray(fleet)) {
    fleet.forEach(ac => {
      if (ac.maintenance_due === true) {
        addAlert("maintenance", "critical",
          `Aircraft ${ac.registration || ac.id} requires maintenance.`);
      }
    });
  }
}


/* ============================================================
   === 5) ROUTES ENGINE (SAFE DETECTION) =======================
   ============================================================ */

function scanRoutesForAlerts() {
  if (!window.ACS_ROUTES) return;

  const routes = window.ACS_ROUTES;

  if (Array.isArray(routes)) {
    routes.forEach(r => {
      if (r.yield !== undefined && r.yield < -10) {
        addAlert("routes", "medium",
          `Route ${r.origin}-${r.dest} operating at ${r.yield}% yield.`);
      }
    });
  }
}


/* ============================================================
   === MASTER SCAN FUNCTION ===================================
   ============================================================ */

function ACS_runAlertScan() {
  window.ACS_ALERTS = []; // reset

  scanLocalStorageForAlerts();
  scanFinanceForAlerts();
  scanHRForAlerts();
  scanAircraftForAlerts();
  scanRoutesForAlerts();

  // Ordenar por prioridad
  window.ACS_ALERTS.sort((a, b) => {
    const priority = { critical:1, high:2, medium:3, low:4 };
    return priority[a.level] - priority[b.level];
  });

  console.log("🔍 ALERT SCAN COMPLETE:", window.ACS_ALERTS);
}


/* ============================================================
   === AUTO-LOAD ON PAGE START ================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  ACS_runAlertScan();
});

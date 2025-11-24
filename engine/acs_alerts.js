/* ============================================================
   === ACS ALERT ENGINE — BETA REAL v1.2 ======================
   === Aligned with ACS Time Engine (GAME TIME)
   === Author: ACS — 23 NOV 2025 ==============================
   ============================================================ */

console.log("✔ ACS Alert Engine (BETA REAL + GAME TIME) loaded");

// URL REAL DEL ENDPOINT
const ACS_API_URL =
  "https://script.google.com/macros/s/AKfycbzzhyG15J2nf-pGyXN0aF1jW4h7ip4xO-eyRxXOYmsNirl6UO4XaZTq8SM7ayzzEib1Zw/exec";

// Donde guardamos las alertas cargadas del servidor
window.ACS_ALERTS = [];

/* ============================================================
   === NORMALIZADOR DE TIMESTAMP A HORA DEL JUEGO =============
   ============================================================ */
function ACS_applyGameTimeToAlerts(alerts) {
  if (!Array.isArray(alerts)) return [];

  return alerts.map(alert => {
    const fixed = { ...alert };

    if (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime) {
      fixed.timestamp = ACS_TIME.currentTime.toISOString();
    } else {
      fixed.timestamp = new Date().toISOString();
    }

    return fixed;
  });
}

/* ============================================================
   === CARGAR ALERTAS desde Google Sheets ======================
   ============================================================ */
async function ACS_loadAlerts(airline_id) {
  try {
    const response = await fetch(
      ACS_API_URL + `?action=getAlerts&airline_id=${airline_id}`
    );

    const result = await response.json();

    if (Array.isArray(result)) {
      window.ACS_ALERTS = ACS_applyGameTimeToAlerts(result);
      console.log("📡 Alerts loaded (GAME-TIME applied):", window.ACS_ALERTS);
    } else {
      console.warn("⚠️ Invalid alert payload from server:", result);
      window.ACS_ALERTS = [];
    }
  } catch (err) {
    console.error("❌ Error loading alerts:", err);
    window.ACS_ALERTS = [];
  }
}

/* ============================================================
   === ACS LOCAL GAME ALERT STORAGE ===========================
   ============================================================ */

if (!localStorage.getItem("ACS_GameAlerts")) {
  localStorage.setItem("ACS_GameAlerts", JSON.stringify([]));
}

function ACS_saveLocalAlerts(list) {
  localStorage.setItem("ACS_GameAlerts", JSON.stringify(list));
}

function ACS_getLocalAlerts() {
  try {
    return JSON.parse(localStorage.getItem("ACS_GameAlerts")) || [];
  } catch {
    return [];
  }
}

/* ============================================================
   === HR SNAPSHOT ALERTS — SOLO PERSONAL FALTANTE ============
   ------------------------------------------------------------
   • NO CEO
   • Solo staff = 0 en departamentos críticos
   • Genera alertas en tiempo real
   ============================================================ */

function ACS_getHRAlertsSnapshot() {
  const raw = localStorage.getItem("ACS_HR");
  if (!raw) return [];

  let hr;
  try {
    hr = JSON.parse(raw);
  } catch (e) {
    console.warn("⚠️ Cannot parse ACS_HR:", e);
    return [];
  }

  if (!hr || typeof hr !== "object") return [];

  const CRITICAL_DEPARTMENTS = [
    "middle",
    "economics",
    "hr",
    "quality",
    "security",
    "customers",
    "flightops",
    "maintenance",
    "ground",
    "routes",
    "pilots_small",
    "pilots_medium",
    "pilots_large",
    "pilots_vlarge",
    "cabin"
  ];

  const simTimeObj =
    (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime)
      ? ACS_TIME.currentTime
      : new Date();

  const activeUser = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  const airlineId = activeUser?.airline_id || null;

  const alerts = [];

  CRITICAL_DEPARTMENTS.forEach(id => {
    const dep = hr[id];
    if (!dep) return;

    if (!dep.staff || dep.staff <= 0) {
      alerts.push({
        alert_id: `HR-${id}-${simTimeObj.getTime()}`,
        airline_id: airlineId,
        type: "hr",
        level: "critical",
        message: `HR CRITICAL — ${dep.name || id} has 0 staff assigned. Operations may be compromised.`,
        timestamp: simTimeObj.toISOString()
      });
    }
  });

  return alerts;
}

/* ============================================================
   === MASTER FUNCTION: ADD ALERT (GAME GENERATED) ============
   ============================================================ */

function ACS_addAlert(type, level, message) {
  const activeUser =
    JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  if (!activeUser || !activeUser.airline_id) {
    console.warn("⚠️ Cannot generate alert — no active airline.");
    return;
  }

  const alerts = ACS_getLocalAlerts();

  const simTime =
    (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime)
      ? ACS_TIME.currentTime.toISOString()
      : new Date().toISOString();

  const alertObj = {
    alert_id: "GA-" + Date.now(),
    airline_id: activeUser.airline_id,
    type,
    level,
    message,
    timestamp: simTime
  };

  alerts.unshift(alertObj);
  ACS_saveLocalAlerts(alerts);

  if (typeof ACS_pushToDashboard === "function") {
    ACS_pushToDashboard(alertObj);
  }

  console.log("⚡ Game Alert Generated:", alertObj);
}

/* ============================================================
   === MASTER SCAN — carga alertas del servidor ===============
   ============================================================ */

async function ACS_runAlertScan() {
  const activeUser =
    JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  if (!activeUser || !activeUser.airline_id) {
    console.warn("⚠️ No airline_id found for alerts.");
    return;
  }

  await ACS_loadAlerts(activeUser.airline_id);

  console.log("🎯 Alert Scan Completed (GAME TIME):", window.ACS_ALERTS);
}

/* ============================================================
   === MERGE REAL + LOCAL GAME + HR SNAPSHOT =================
   ============================================================ */

function ACS_getAllAlertsMerged() {
  const serverAlerts = window.ACS_ALERTS || [];
  const localAlerts = ACS_getLocalAlerts() || [];
  const hrAlerts = ACS_getHRAlertsSnapshot() || [];

  const merged = [...localAlerts, ...serverAlerts, ...hrAlerts];

  return merged.sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );
}

/* ============================================================
   === AUTO-INICIO =============================================
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  ACS_runAlertScan();
});

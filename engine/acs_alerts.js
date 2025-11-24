/* ============================================================
   === ACS ALERT ENGINE — BETA REAL v1.1 ======================
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
    // Garantizar estructura mínima
    const fixed = { ...alert };

    // Si ACS_TIME existe, usamos la hora del juego SIEMPRE
    if (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime) {
      fixed.timestamp = ACS_TIME.currentTime.toISOString();
    } else {
      // Backup (NO recomendado, solo seguridad)
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
      // 1) Aplicar hora del juego
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
   === MASTER SCAN — carga alertas del servidor ===============
   ============================================================ */

async function ACS_runAlertScan() {
  const activeUser =
    JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  if (!activeUser || !activeUser.airline_id) {
    console.warn("⚠️ No airline_id found for alerts.");
    return;
  }

  // Cargar alertas
  await ACS_loadAlerts(activeUser.airline_id);

  console.log("🎯 Alert Scan Completed (GAME TIME):", window.ACS_ALERTS);
}

/* ============================================================
   === AUTO-INICIO =============================================
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  ACS_runAlertScan();
});

/* ============================================================
   === ACS ALERT ENGINE — BETA REAL v1.0 ======================
   === Loads REAL alerts from Google Sheets (no inventa nada)
   === Author: ACS — 23 NOV 2025 ==============================
   ============================================================ */

console.log("✔ ACS Alert Engine (BETA REAL) loaded");

// URL REAL DEL ENDPOINT
const ACS_API_URL = "https://script.google.com/macros/s/AKfycbzzhyG15J2nf-pGyXN0aF1jW4h7ip4xO-eyRxXOYmsNirl6UO4XaZTq8SM7ayzzEib1Zw/exec";

// Donde guardamos las alertas cargadas del servidor
window.ACS_ALERTS = [];

/* ============================================================
   === CARGAR ALERTAS para airline_id ==========================
   ============================================================ */
async function ACS_loadAlerts(airline_id) {

  try {
    const response = await fetch(ACS_API_URL + `?action=getAlerts&airline_id=${airline_id}`);

    const result = await response.json();

    if (Array.isArray(result)) {
      // resultado directo del doGet[]
      window.ACS_ALERTS = result;
      console.log("📡 Alerts loaded:", window.ACS_ALERTS);
    } else {
      console.warn("⚠️ No alerts received from server", result);
      window.ACS_ALERTS = [];
    }

  } catch (err) {
    console.error("❌ Error loading alerts:", err);
    window.ACS_ALERTS = [];
  }
}

/* ============================================================
   === MASTER SCAN — usa GET para cargar alertas ===============
   ============================================================ */

async function ACS_runAlertScan() {

  const activeUser = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  if (!activeUser || !activeUser.airline_id) {
    console.warn("⚠️ No airline_id found for alerts.");
    return;
  }

  // Cargar alertas reales desde el servidor
  await ACS_loadAlerts(activeUser.airline_id);

  console.log("🎯 Alert Scan Completed:", window.ACS_ALERTS);
}

/* ============================================================
   === AUTO-INICIO =============================================
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  ACS_runAlertScan();
});

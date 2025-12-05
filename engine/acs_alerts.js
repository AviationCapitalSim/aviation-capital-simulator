/* ============================================================
   === ACS ALERT ENGINE — Qatar Luxury Edition v4.0 ============
   === Local-Only | Ultra Optimized | Game-Time Synced =========
   === Author: ACS — 05 DEC 2025 ===============================
   ============================================================ */

console.log("✔ ACS Alert Engine v4.0 (LOCAL-ONLY) loaded");

/* ============================================================
   === 🔵 LOCAL STORAGE SETUP =================================
   ============================================================ */

if (!localStorage.getItem("ACS_GameAlerts")) {
  localStorage.setItem("ACS_GameAlerts", JSON.stringify([]));
}

function ACS_getLocalAlerts() {
  try {
    return JSON.parse(localStorage.getItem("ACS_GameAlerts")) || [];
  } catch {
    return [];
  }
}

function ACS_saveLocalAlerts(list) {
  // 🔥 Limitar a 300 alertas máximo (rendimiento y limpieza)
  if (list.length > 300) list = list.slice(0, 300);
  localStorage.setItem("ACS_GameAlerts", JSON.stringify(list));
}

/* ============================================================
   === 🟣 GAME TIME HELPER =====================================
   ============================================================ */

function ACS_simTimestamp() {
  try {
    if (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime) {
      return ACS_TIME.currentTime.toISOString();
    }
  } catch {}
  return new Date().toISOString();
}

/* ============================================================
   === 🟥 CENTRAL ALERT FUNCTION — ACS_pushAlert() =============
   === (Usado por Bankruptcy, HR, Finance, Routes, Maintenance)
   ============================================================ */

function ACS_pushAlert({ type, level, title, message, timestamp }) {

  const activeUser =
    JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  if (!activeUser || !activeUser.airline_id) {
    console.warn("⚠️ Cannot generate alert — no active airline.");
    return;
  }

  let alerts = ACS_getLocalAlerts();

  const time = timestamp || ACS_simTimestamp();

  const alertObj = {
    alert_id: "AL-" + Date.now() + "-" + Math.floor(Math.random() * 9999),
    airline_id: activeUser.airline_id,
    type: type || "system",
    level: level || "info",
    title: title || "System Alert",
    message: message || "",
    timestamp: time
  };

  // 🔥 Anti-duplicado: evita spamming si mismo mensaje en menos de 30 segundos sim
  if (alerts[0] &&
      alerts[0].message === alertObj.message &&
      Math.abs(new Date(alerts[0].timestamp) - new Date(time)) < 30000) {
    return;
  }

  alerts.unshift(alertObj);
  ACS_saveLocalAlerts(alerts);

  console.log("🔔 ALERT ADDED:", alertObj);
}

/* ============================================================
   === 🟧 HR SNAPSHOT ALERTS (Local Only) ======================
   === Solo genera alertas en tiempo real por staff = 0
   ============================================================ */

function ACS_getHRAlertsSnapshot() {
  const raw = localStorage.getItem("ACS_HR");
  if (!raw) return [];

  let hr;
  try {
    hr = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!hr) return [];

  const CRITICAL_DEPARTMENTS = [
    "middle","economics","hr","quality","security","customers","flightops",
    "maintenance","ground","routes","pilots_small","pilots_medium",
    "pilots_large","pilots_vlarge","cabin"
  ];

  const simTime = ACS_simTimestamp();
  const activeUser = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");
  const airlineId = activeUser.airline_id || "-";

  const alerts = [];

  CRITICAL_DEPARTMENTS.forEach(id => {
    const dep = hr[id];
    if (!dep) return;

    if (!dep.staff || dep.staff <= 0) {
      alerts.push({
        alert_id: `HR-${id}-${Date.now()}`,
        airline_id: airlineId,
        type: "hr",
        level: "critical",
        title: "HR STAFF MISSING",
        message: `${dep.name || id} has 0 assigned staff.`,
        timestamp: simTime
      });
    }
  });

  return alerts;
}

/* ============================================================
   === 🟦 MERGE REAL-TIME ALERTS (Local + HR Snapshot) =========
   ============================================================ */

function ACS_getAllAlertsMerged() {
  const local = ACS_getLocalAlerts();
  const hr = ACS_getHRAlertsSnapshot();

  // HR snapshot NO se guarda en localStorage, solo se muestra en tiempo real
  const merged = [...local, ...hr];

  return merged.sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );
}

/* ============================================================
   === AUTO INIT — nothing to load (NO SERVER MODE) ===========
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 ALERT ENGINE READY — LOCAL ONLY");
});

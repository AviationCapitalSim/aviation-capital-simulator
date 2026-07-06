/* ============================================================
   ACS OCC ALERT ENGINE
   Backend runtime viewer | No localStorage authority
   ============================================================ */

(function () {
  "use strict";

  const ACS_OCC_ALERTS_ENDPOINT = "/api/occ/alerts";

  let ACS_occAlerts = [];
  let ACS_runtimeAlerts = [];
  let ACS_alertApiAvailable = true;

  console.log("ACS OCC Alert Engine loaded");

  function ACS_normalizeLevel(level) {
    const value = String(level || "info").trim().toLowerCase();

    if (value.includes("crit")) return "critical";
    if (value.includes("warn")) return "warning";
    if (value.includes("high")) return "warning";
    if (value.includes("med")) return "warning";
    if (value.includes("low")) return "info";

    return value || "info";
  }

  function ACS_normalizeType(type) {
    const value = String(type || "system").trim().toLowerCase();

    if (value === "slot") return "slots";
    if (value === "schedule") return "slots";
    if (value === "route") return "slots";

    return value || "system";
  }

  function ACS_simTimestamp() {
    try {
      if (window.ACS_TIME && window.ACS_TIME.currentTime) {
        return new Date(window.ACS_TIME.currentTime).toISOString();
      }
    } catch (_) {}

    return new Date().toISOString();
  }

  function ACS_makeAlertId(alert) {
    return String(
      alert.id ||
      alert.alert_id ||
      alert.alert_key ||
      alert.key ||
      [
        ACS_normalizeType(alert.type || alert.category),
        ACS_normalizeLevel(alert.level),
        alert.title || "Alert",
        alert.message || ""
      ].join(":")
    );
  }

  function ACS_normalizeAlert(alert) {
    const type = ACS_normalizeType(alert.type || alert.category);
    const level = ACS_normalizeLevel(alert.level || alert.severity);

    return {
      id: ACS_makeAlertId(alert),
      alert_id: alert.alert_id || alert.id || ACS_makeAlertId(alert),
      alert_key: alert.alert_key || alert.key || ACS_makeAlertId(alert),
      type,
      category: ACS_normalizeType(alert.category || type),
      level,
      title: alert.title || "Operational Alert",
      message: alert.message || "",
      timestamp: alert.timestamp || alert.created_at || alert.reported_at || ACS_simTimestamp(),
      source: alert.source || "occ"
    };
  }

  function ACS_sortAlerts(alerts) {
    const levelWeight = {
      critical: 4,
      warning: 3,
      medium: 2,
      low: 1,
      info: 0
    };

    return alerts.slice().sort((a, b) => {
      const levelDiff =
        (levelWeight[b.level] || 0) - (levelWeight[a.level] || 0);

      if (levelDiff !== 0) return levelDiff;

      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }

  function ACS_mergeAlerts(backendAlerts, runtimeAlerts) {
    const map = new Map();

    [...backendAlerts, ...runtimeAlerts].forEach(alert => {
      const normalized = ACS_normalizeAlert(alert);
      map.set(normalized.id, normalized);
    });

    return ACS_sortAlerts(Array.from(map.values()));
  }

  async function ACS_fetchOCCAlerts() {
    if (!ACS_alertApiAvailable) {
      return [];
    }

    try {
      const response = await fetch(ACS_OCC_ALERTS_ENDPOINT, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        ACS_alertApiAvailable = false;
        return [];
      }

      const data = await response.json();
      const alerts = Array.isArray(data) ? data : (data.alerts || []);

      return alerts.map(ACS_normalizeAlert);
    } catch (_) {
      ACS_alertApiAvailable = false;
      return [];
    }
  }

  async function ACS_runAlertScan() {
    const backendAlerts = await ACS_fetchOCCAlerts();

    ACS_occAlerts = ACS_mergeAlerts(backendAlerts, ACS_runtimeAlerts);

    return ACS_occAlerts;
  }

  function ACS_getOCCAlerts() {
    return ACS_occAlerts.slice();
  }

  function ACS_getAllAlertsMerged() {
    return ACS_getOCCAlerts();
  }

  function ACS_deleteAlert(id) {
    if (!id) return;

    const alertId = String(id);

    ACS_occAlerts = ACS_occAlerts.filter(alert => {
      return String(alert.id) !== alertId &&
             String(alert.alert_id) !== alertId &&
             String(alert.alert_key) !== alertId;
    });

    ACS_runtimeAlerts = ACS_runtimeAlerts.filter(alert => {
      return String(alert.id) !== alertId &&
             String(alert.alert_id) !== alertId &&
             String(alert.alert_key) !== alertId;
    });
  }

  function ACS_pushAlert(payload = {}) {
    const alert = ACS_normalizeAlert({
      ...payload,
      id: payload.id || payload.alert_id || payload.alert_key || `runtime:${Date.now()}`,
      timestamp: payload.timestamp || ACS_simTimestamp(),
      source: payload.source || "runtime"
    });

    const exists = ACS_runtimeAlerts.some(item => {
      return ACS_makeAlertId(item) === alert.id;
    });

    if (!exists) {
      ACS_runtimeAlerts.unshift(alert);
    }

    ACS_occAlerts = ACS_mergeAlerts(ACS_occAlerts, ACS_runtimeAlerts);

    return alert;
  }

  function ACS_addAlert(type, level, title, message) {
    return ACS_pushAlert({
      type: type || "system",
      level: level || "info",
      title: title || "Operational Alert",
      message: message || "",
      timestamp: ACS_simTimestamp(),
      source: "legacy"
    });
  }

  window.ACS_runAlertScan = ACS_runAlertScan;
  window.ACS_getOCCAlerts = ACS_getOCCAlerts;
  window.ACS_getAllAlertsMerged = ACS_getAllAlertsMerged;
  window.ACS_deleteAlert = ACS_deleteAlert;
  window.ACS_pushAlert = ACS_pushAlert;
  window.ACS_addAlert = ACS_addAlert;
  window.ACS_normalizeLevel = ACS_normalizeLevel;
  window.ACS_simTimestamp = ACS_simTimestamp;

})();

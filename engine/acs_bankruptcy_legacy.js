/* ============================================================
   === 🛑 ACS BANKRUPTCY ENGINE — v1.0 (Official) ===============
   ------------------------------------------------------------
   • Detecta capital negativo
   • Envía alertas semanales mientras siga negativo
   • Cierra la aerolínea tras 45 días consecutivos
   • Redirige a create_airline.html
   ============================================================ */

// Estado de quiebra en memoria temporal
let ACS_BankruptcyState = {
    negativeStart: null,   // Fecha (Date) cuando cayó en negativo
    lastWeeklyAlert: null, // Última fecha en que se envió alerta semanal
    bankrupt: false        // Se activa cuando se declara quiebra
};

/* ============================================================
   === 🔍 CHEQUEO PRINCIPAL — Ejecutado cada día del juego ====
   ============================================================ */
function ACS_checkBankruptcy(simDate) {

    // Convertir a Date real por seguridad
    const now = simDate instanceof Date ? simDate : new Date(simDate);

    let finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
    if (!finance || typeof finance.capital !== "number") return;

    /* ========================================================
       1) SI CAPITAL ES POSITIVO → RESETEAR ESTADO
       ======================================================== */
    if (finance.capital >= 0) {
        ACS_BankruptcyState.negativeStart = null;
        ACS_BankruptcyState.lastWeeklyAlert = null;
        return;
    }

    /* ========================================================
       2) CAPITAL ES NEGATIVO → INICIAR CONTADOR SI ES PRIMERA VEZ
       ======================================================== */
    if (!ACS_BankruptcyState.negativeStart) {
        ACS_BankruptcyState.negativeStart = new Date(now);
    }

    /* ========================================================
       3) ALERTA SEMANAL
       ======================================================== */
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceLastAlert =
        ACS_BankruptcyState.lastWeeklyAlert
            ? Math.floor((now - ACS_BankruptcyState.lastWeeklyAlert) / msPerDay)
            : 999;

    if (daysSinceLastAlert >= 7) {

        // Enviar alerta al Alerts Center
        ACS_pushAlert({
            type: "WARNING",
            title: "⚠️ Negative Capital",
            message: "Your airline is operating with negative capital. Fix your finances immediately.",
            time: now.toISOString()
        });

        ACS_BankruptcyState.lastWeeklyAlert = new Date(now);
    }

    /* ========================================================
       4) CÁLCULO DE DÍAS EN NEGATIVO PARA BANKRUPTCY
       ======================================================== */
    const daysNegative = Math.floor((now - ACS_BankruptcyState.negativeStart) / msPerDay);

    if (daysNegative >= 45 && !ACS_BankruptcyState.bankrupt) {
        ACS_triggerBankruptcy(now);
    }
}

/* ============================================================
   === ❌ ACTIVAR QUIEBRA — CIERRE COMPLETO DEL AIRLINE ========
   ============================================================ */
function ACS_triggerBankruptcy(simDate) {

    ACS_BankruptcyState.bankrupt = true;

    // Mensaje final al Alerts Center
    ACS_pushAlert({
        type: "ERROR",
        title: "❌ BANKRUPTCY",
        message: "Your airline has been closed after operating 45 days with negative capital. Start a new airline.",
        time: simDate.toISOString()
    });

    // Guardar marca de quiebra
    localStorage.setItem("ACS_Bankrupt", "true");

    // Borrar estructuras críticas
    localStorage.removeItem("ACS_MyAircraft");
    localStorage.removeItem("ACS_Routes");
    localStorage.removeItem("ACS_Finance");
    localStorage.removeItem("ACS_HR");
    localStorage.removeItem("ACS_Leasing");
    localStorage.removeItem("ACS_activeUser");

    // Redirigir al jugador EN 1.2s
    setTimeout(() => {
        window.location.href = "create_airline.html";
    }, 1200);
}

/* ============================================================
   === 📢 PUSH ALERT — se integra con alerts_center.js =========
   ============================================================ */
function ACS_pushAlert(alertObj) {
    let alerts = JSON.parse(localStorage.getItem("ACS_Alerts") || "[]");
    alerts.push(alertObj);

    if (alerts.length > 100) alerts.shift(); // evitar sobrecarga

    localStorage.setItem("ACS_Alerts", JSON.stringify(alerts));
}

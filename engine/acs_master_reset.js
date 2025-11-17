/* ============================================================
   === ACS MASTER RESET ENGINE — v1.0 ==========================
   ------------------------------------------------------------
   • Reinicia TODO el mundo ACS a 1940
   • BORRA:
       - Flota, leasing, finanzas, HR, settings, etc.
       - Cualquier ACS_* relacionado con la partida activa
   • CONSERVA:
       - ACS_users          → cuentas registradas
       - ACS_activeUser     → sesión actual
       - ACS_airlineRecords → récords históricos
   • REINICIA:
       - ACS_Cycle          → OFF + 1940
       - acs_frozen_time
       - acs_reset          → broadcast global
   • No toca ninguna otra página.
   ============================================================ */

console.log("🟦 ACS Master Reset Engine loaded");

function ACS_MasterReset() {

  const msg =
    "⚠️ MASTER RESET\n\n" +
    "Esto reiniciará TODO el mundo ACS a 1940.\n" +
    "Se borrarán flota, leasing, finanzas, HR, rutas, settings, etc.\n\n" +
    "Se mantienen:\n" +
    "• Cuentas registradas (ACS_users)\n" +
    "• Usuario activo (ACS_activeUser)\n" +
    "• Récords históricos (ACS_airlineRecords)\n\n" +
    "¿Confirmas continuar?";

  if (!confirm(msg)) return;

  /* ============================================================
     1) Guardar lo que NO debe borrarse
     ============================================================ */
  const users   = localStorage.getItem("ACS_users");
  const active  = localStorage.getItem("ACS_activeUser");
  const records = localStorage.getItem("ACS_airlineRecords");

  /* ============================================================
     2) Limpiar TODO lo demás
     ============================================================ */
  localStorage.clear();

  /* ============================================================
     3) Restaurar lo que sí debe quedar
     ============================================================ */
  if (users)   localStorage.setItem("ACS_users", users);
  if (active)  localStorage.setItem("ACS_activeUser", active);
  if (records) localStorage.setItem("ACS_airlineRecords", records);

  /* ============================================================
     4) Reiniciar el motor de tiempo
     ============================================================ */
  const newCycle = {
    realStartDate: null,
    status: "OFF"
  };
  localStorage.setItem("ACS_Cycle", JSON.stringify(newCycle));
  localStorage.setItem("acs_frozen_time", "1940-01-01T00:00:00Z");

  /* ============================================================
     5) Enviar señal global de RESET (todas las tabs oyen esto)
     ============================================================ */
  localStorage.setItem("acs_reset", Date.now().toString());

  alert("♻️ ACS reiniciado completamente a 1940. Cuentas y récords conservados.");

  /* ============================================================
     6) Volver al dashboard (o main)
     ============================================================ */
  try {
    window.location.href = "dashboard.html";
  } catch (err) {
    console.warn("ACS_MasterReset redirection error:", err);
  }
}

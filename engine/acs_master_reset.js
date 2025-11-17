/* ============================================================
   === ACS MASTER RESET ENGINE — v1.0 ==========================
   ------------------------------------------------------------
   • Ejecutado SOLO desde Settings → botón ♻ Reset
   • Restaura el juego completo a 1940
   • NO borra usuarios (ACS_users)
   • NO borra ACS_activeUser (usuario logueado)
   • Mantiene créditos del usuario
   • Limpia TODA la data de juego, aircraft, slots, HR, finance…
   • Reinicia ACS_Cycle (1940–2026, OFF)
   ============================================================ */

console.log("🟦 ACS MASTER RESET ENGINE — Loaded");

window.ACS_MasterReset = function () {

  /* ============================================================
     1. GUARDAR USUARIOS Y ACTIVO (se deben conservar)
     ============================================================ */
  const savedUsers = localStorage.getItem("ACS_users");
  const activeUser = localStorage.getItem("ACS_activeUser");

  /* ============================================================
     2. LISTA OFICIAL DE CLAVES A BORRAR (confirmada)
     ============================================================ */
  const keysToRemove = [
    "ACS_Airline",
    "ACS_Base",
    "ACS_Cycle",
    "ACS_Finance",
    "acs_finance_data",
    "acs_finance_ops",
    "ACS_FinanceBalance",
    "acs_flight_revenue",
    "ACS_HR",
    "ACS_Leasing",
    "ACS_MyAircraft",
    "ACS_PendingAircraft",
    "ACS_SLOTS",
    "ACS_UsedMarket",
    "ACS_UsedPool",
    "ACS_Used_LastPool",
    "ACS_Used_LastRotation",
    "fleet",
    "flightNumbers",
    "lastFlightNumber",
    "scheduleItems",
    "acs_fuel_price",
    "acs_ticket_fee",
    "autoCcheck",
    "autoDcheck",
    "autoHire",
    "regA320",
    "regB737",
    "regECRJ",
    "taA320",
    "taB737",
    "taE190",
    "taCRJ",
    "taATR",
    "acs_frozen_time"
  ];

  keysToRemove.forEach(k => localStorage.removeItem(k));

  /* ============================================================
     3. RESTAURAR SOLO USERS Y ACTIVE USER
     ============================================================ */
  localStorage.clear(); // Borra TODO lo demás

  if (savedUsers) localStorage.setItem("ACS_users", savedUsers);
  if (activeUser) localStorage.setItem("ACS_activeUser", activeUser);

  /* ============================================================
     4. RECREAR CICLO LIMPIO
     ============================================================ */
  const newCycle = {
    startYear: 1940,
    endYear: 2026,
    realStartDate: null,
    status: "OFF"
  };

  localStorage.setItem("ACS_Cycle", JSON.stringify(newCycle));

  /* ============================================================
     5. RESET DEL RELOJ GLOBAL
     ============================================================ */
  localStorage.setItem("acs_frozen_time", "1940-01-01T00:00:00.000Z");

  // avisar al time_engine para que sincronice tabs
  localStorage.setItem("acs_reset", Date.now());

  /* ============================================================
     6. RETORNAR CONFIRMACIÓN
     ============================================================ */
  return {
    ok: true,
    message: "Game cycle finalized and reset to 1940."
  };
};

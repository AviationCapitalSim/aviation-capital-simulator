/* ============================================================
   === ACS LEASING ENGINE v1.5 — FULL INTEGRATION ==============
   ------------------------------------------------------------
   ▪ Manejo de leasing para aviones nuevos (NEW)
   ▪ Preparado para aviones usados (USED)
   ▪ Integración total con:
        - ACS Finance Engine (ACS_addExpense / ACS_registerExpense)
        - ACS Time Engine (registerTimeListener)
        - My Aircraft / Fleet Engine
        - ACS_Log (transacciones)
   ▪ Pagos mensuales automáticos
   ▪ Contratos almacenados en localStorage
   ============================================================ */

console.log("📦 ACS Leasing Engine v1.5 loaded");

/* ============================================================
   === BASE STORAGE STRUCTURE ==================================
   ============================================================ */

// Crear estructura base si no existe
if (!localStorage.getItem("ACS_Leasing")) {
  const baseLeasing = {
    contracts: [] // lista completa de contratos
  };
  localStorage.setItem("ACS_Leasing", JSON.stringify(baseLeasing));
}

/* ============================================================
   === HELPERS LOAD / SAVE =====================================
   ============================================================ */

function ACS_Leasing_load() {
  return JSON.parse(localStorage.getItem("ACS_Leasing") || "{}");
}

function ACS_Leasing_save(data) {
  localStorage.setItem("ACS_Leasing", JSON.stringify(data));
}

/* ============================================================
   === GENERADOR DE IDs (contratos leasing) ====================
   ============================================================ */

function ACS_Leasing_generateID(model) {
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `LEASE-${model}-${rand}`;
}

/* ============================================================
   === CREAR CONTRATO DE LEASING ===============================
   ============================================================ */
/**
 * Crear contrato de leasing.
 * @param {string} model       - Ej: "A320-200"
 * @param {number} monthlyRate - costo mensual en USD
 * @param {number} months      - duración en meses
 * @param {string} type        - "NEW" o "USED"
 * @param {object} options     - { hours, cycles }
 */
function ACS_Leasing_createContract(
  model,
  monthlyRate,
  months,
  type = "NEW",
  options = {}
) {

  const leasing = ACS_Leasing_load();
  const id = ACS_Leasing_generateID(model);

  /* === Fecha de inicio usando Time Engine si está disponible === */
  let startDateStr = "01 JAN 1940";

  try {
    if (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime instanceof Date) {
      const t = ACS_TIME.currentTime;
      const day = String(t.getUTCDate()).padStart(2, "0");
      const monthsArr = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const mon = monthsArr[t.getUTCMonth()];
      const year = t.getUTCFullYear();
      startDateStr = `${day} ${mon} ${year}`;
    }
  } catch(e) {
    console.warn("⚠️ ACS_Leasing_createContract: fallo al leer ACS_TIME:", e);
  }

  const contract = {
    id,
    model,
    type,                        // NEW o USED
    monthlyRate,
    monthsTotal: months,
    monthsRemaining: months,
    status: "ACTIVE",

    // Inicio del contrato (lectura del Time Engine o fallback)
    startDate: startDateStr,

    // Para NEW siempre 0, para USED pueden venir del options
    hours: options.hours || 0,
    cycles: options.cycles || 0,

    // Etiqueta de fecha futura (visual)
    endDate: `+${months} months`
  };

  // Guardar contrato
  leasing.contracts.push(contract);
  ACS_Leasing_save(leasing);

  console.log(`📄 Nuevo contrato leasing creado: ${id}`);

  /* ============================================================
     === ADICIÓN A FLOTA (si existe Fleet Engine) ===============
     ============================================================ */
  if (typeof ACS_MyAircraft_addLeasedAircraft === "function") {
    try {
      ACS_MyAircraft_addLeasedAircraft(contract);
    } catch(e) {
      console.warn("⚠️ Error enviando contrato a Fleet Engine:", e);
    }
  }

  return contract;
}

/* ============================================================
   === OBTENER COSTE MENSUAL TOTAL (CONTRACTS) =================
   ============================================================ */
function ACS_Leasing_getMonthlyCost() {
  const leasing = ACS_Leasing_load();
  if (!leasing || !Array.isArray(leasing.contracts)) return 0;

  let total = 0;

  leasing.contracts.forEach(c => {
    if (c.status === "ACTIVE") {
      total += Number(c.monthlyRate) || 0;
    }
  });

  return total;
}

/* ============================================================
   === HELPER: REGISTRAR GASTO EN FINANCE + LOG ================
   ============================================================ */
/**
 * Aplica un gasto de leasing con integración máxima posible.
 * Si existe ACS_registerExpense → usa ese (Finance + Log)
 * Si no, usa ACS_addExpense (Finance simple)
 */
function ACS_Leasing_registerExpense(amount, sourceLabel) {
  const value = Number(amount) || 0;
  if (value <= 0) return;

  if (typeof ACS_registerExpense === "function") {
    // Nuevo helper del Finance Engine v1.5 (Finance + Log)
    ACS_registerExpense("leasing", value, sourceLabel || "Leasing");
    return;
  }

  if (typeof ACS_addExpense === "function") {
    // Compatibilidad con versiones previas
    ACS_addExpense("leasing", value);
  }

  // Log manual, si existe
  if (typeof ACS_logTransaction === "function") {
    ACS_logTransaction({
      type: "EXPENSE",
      source: sourceLabel || "Leasing",
      amount: value
    });
  }
}

/* ============================================================
   === PAGO MENSUAL DE LEASING (CONTRACTS) =====================
   ============================================================ */
function ACS_Leasing_applyMonthlyCosts() {

  const leasing = ACS_Leasing_load();
  if (!leasing || !Array.isArray(leasing.contracts)) return;

  let updated = false;

  leasing.contracts.forEach(c => {
    if (c.status !== "ACTIVE") return;

    const monthly = Number(c.monthlyRate) || 0;
    if (monthly <= 0) return;

    /* === Cobrar cuota mensual === */
    ACS_Leasing_registerExpense(
      monthly,
      `Monthly Lease Payment — ${c.model}`
    );

    // Reducir meses restantes
    c.monthsRemaining = (c.monthsRemaining || c.monthsTotal || 0) - 1;

    // Si llegó a 0 → contrato termina
    if (c.monthsRemaining <= 0) {
      c.status = "FINISHED";
      console.log(`📆 Contrato finalizado: ${c.id}`);

      // Registrar en log si está disponible
      if (typeof ACS_logTransaction === "function") {
        ACS_logTransaction({
          type: "INFO",
          source: `Lease Completed — ${c.model}`,
          amount: 0
        });
      }
    }

    updated = true;
  });

  if (updated) {
    ACS_Leasing_save(leasing);
    console.log("💸 Leasing mensual (contracts) cobrado.");
  }
}

/* ============================================================
   ===  INTEGRACIÓN CON TIME ENGINE — CAMBIO DE MES ============
   ============================================================ */
/*
   Cada vez que el motor de tiempo avance a un nuevo mes
   (según ACS_TIME.currentTime), disparamos el cobro mensual
   del leasing de contratos (NO de la flota used, esa la maneja
   ACS_runMonthlyLeasePayments en acs_finance.js).
*/

document.addEventListener("DOMContentLoaded", () => {

  if (typeof registerTimeListener === "function") {

    registerTimeListener((simTime) => {

      // simTime: Date proveniente del Time Engine
      if (!(simTime instanceof Date)) return;

      const month = simTime.getUTCMonth();   // 0–11
      const year  = simTime.getUTCFullYear();

      const currentKey = `${month}-${year}`;
      const lastKey = localStorage.getItem("ACS_Leasing_LastMonth");

      if (lastKey === currentKey) return;

      // Nuevo mes detectado
      localStorage.setItem("ACS_Leasing_LastMonth", currentKey);

      // Aplicar cobro mensual a contratos
      ACS_Leasing_applyMonthlyCosts();
    });
  }

});

/* ============================================================
   === UPFRONT PAYMENT (LLAMADO DESDE BUY_NEW / USED) ==========
   ============================================================ */
/**
 * Se usa cuando se crea un leasing y se paga un porcentaje inicial
 * desde Buy New o Used Market. Esto NO crea el contrato, solo
 * registra el gasto inicial en el Finance Engine / Log.
 */
function ACS_Leasing_applyUpfront(model, amount) {
  const value = Number(amount) || 0;
  if (value <= 0) return;

  const label = `Leasing Upfront Payment — ${model || "Aircraft"}`;

  ACS_Leasing_registerExpense(value, label);
}


/* ============================================================
   === ACS LEASING ENGINE v1.0 ================================
   ------------------------------------------------------------
   ▪ Manejo de leasing para aviones nuevos (NEW)
   ▪ Estructura lista para aviones usados (USED)
   ▪ Integración total con:
        - ACS Finance Engine
        - ACS Time Engine
        - My Aircraft Module
   ▪ Pagos mensuales automáticos
   ▪ Contratos almacenados en localStorage
   ============================================================ */

console.log("📦 ACS Leasing Engine v1.0 loaded");

// Crear estructura base si no existe
if (!localStorage.getItem("ACS_Leasing")) {
    const baseLeasing = {
        contracts: [] // lista completa de contratos
    };
    localStorage.setItem("ACS_Leasing", JSON.stringify(baseLeasing));
}

/* ============================================================
   === Helpers to Load / Save =================================
   ============================================================ */
function ACS_Leasing_load() {
    return JSON.parse(localStorage.getItem("ACS_Leasing"));
}

function ACS_Leasing_save(data) {
    localStorage.setItem("ACS_Leasing", JSON.stringify(data));
}

/* ============================================================
   === GENERADOR DE IDs (contratos leasing) ===================
   ============================================================ */
function ACS_Leasing_generateID(model) {
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `LEASE-${model}-${rand}`;
}

/* ============================================================
   === CREAR CONTRATO DE LEASING ==============================
   ============================================================ */
/**
 * Crear contrato de leasing.
 * @param {string} model - Ej: "A320"
 * @param {number} monthlyRate - costo mensual
 * @param {number} months - duración
 * @param {string} type - "NEW" o "USED"
 * @param {object} options - horas iniciales, ciclos para used
 */
function ACS_Leasing_createContract(model, monthlyRate, months, type = "NEW", options = {}) {

    const leasing = ACS_Leasing_load();
    const id = ACS_Leasing_generateID(model);

    const contract = {
        id,
        model,
        type,                        // NEW o USED
        monthlyRate,
        monthsTotal: months,
        monthsRemaining: months,
        status: "ACTIVE",

        // Inicio del contrato (lectura del Time Engine)
        startDate: localStorage.getItem("ACS_Sim_CurrentDate") || "01 JAN 1940",

        // Para NEW siempre 0, para USED pueden venir del options
        hours: options.hours || 0,
        cycles: options.cycles || 0,

        // Fecha futura (por si quieres mostrarla)
        endDate: null
    };

    // Calcular fecha final si Time Engine lo permite (futuro)
    contract.endDate = `+${months} months`;

    // Guardar contrato
    leasing.contracts.push(contract);
    ACS_Leasing_save(leasing);

    console.log(`📄 Nuevo contrato leasing creado: ${id}`);

    // Agregar avión a inventario My Aircraft (si existe módulo)
    if (typeof ACS_MyAircraft_addLeasedAircraft === "function") {
        ACS_MyAircraft_addLeasedAircraft(contract);
    }

    return contract;
}

/* ============================================================
   === OBTENER TODAS LAS CUOTAS MENSUALES =====================
   ============================================================ */
function ACS_Leasing_getMonthlyCost() {
    const leasing = ACS_Leasing_load();
    let total = 0;

    leasing.contracts.forEach(c => {
        if (c.status === "ACTIVE") {
            total += c.monthlyRate;
        }
    });

    return total;
}

/* ============================================================
   === PAGAR LEASING CADA MES AUTOMÁTICAMENTE ================
   ============================================================ */
function ACS_Leasing_applyMonthlyCosts() {

    const leasing = ACS_Leasing_load();
    let total = 0;

    leasing.contracts.forEach(c => {
        if (c.status !== "ACTIVE") return;

        // Cobrar cuota
        total += c.monthlyRate;

        // Reducir meses restantes
        c.monthsRemaining -= 1;

        // Si llegó a 0 → contrato termina
        if (c.monthsRemaining <= 0) {
            c.status = "FINISHED";
            console.log(`📆 Contrato finalizado: ${c.id}`);
        }
    });

    ACS_Leasing_save(leasing);

    // Cargar gasto en Finance Engine
    if (typeof ACS_addExpense === "function") {
        ACS_addExpense("leasing", total);
    }

    console.log(`💸 Leasing mensual cobrado: $${total.toLocaleString()}`);
}

/* ============================================================
   ===  INTEGRACIÓN CON TIME ENGINE — CADA VEZ QUE CAMBIA EL MES
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

    if (typeof registerTimeListener === "function") {
        registerTimeListener(() => {

            // Detectamos cambio de mes a través del Time Engine
            const currentDate = localStorage.getItem("ACS_Sim_CurrentDate");

            if (!currentDate) return;

            // Este listener se ejecuta cada tick, pero nosotros detectamos mes nuevo
            const lastMonth = localStorage.getItem("ACS_Leasing_LastMonth");
            const currentMonth = currentDate.split(" ")[1] + currentDate.split(" ")[2];

            if (lastMonth !== currentMonth) {
                // Guardar nuevo mes
                localStorage.setItem("ACS_Leasing_LastMonth", currentMonth);

                // Aplicar cobro del mes
                ACS_Leasing_applyMonthlyCosts();
            }
        });
    }

});

/* ============================================================
   === ACS LEASING ENGINE v2.0 (Monthly Auto Billing) ==========
   ------------------------------------------------------------
   • Opción C — Ultra Realista
   • Cada mes cobra cuota de cada avión leased
   • Sincronizado con ACS_TIME
   • Integrado con ACS_Finance Engine (v1.5)
   ============================================================ */

// HOOK PRINCIPAL DE LEASING MENSUAL
function ACS_applyMonthlyLeasing() {

    const finance = loadFinance();
    let myFleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

    let totalLeasingCost = 0;

    myFleet.forEach(ac => {

        // Solo aviones con leasing activo
        if (ac.leasing_monthly && ac.leasing_active === true) {

            totalLeasingCost += ac.leasing_monthly;

            // Registrar gasto REAL en ACS_Finance
            ACS_addExpense("leasing", ac.leasing_monthly);
        }
    });

    console.log(`💸 Leasing mensual aplicado → ${totalLeasingCost.toLocaleString()} USD`);
}


// ESCUCHA EL CAMBIO DE MES DESDE ACS_TIME
document.addEventListener("ACS_TIME_MONTH_CHANGE", () => {
    console.log("📅 Mes cambió → Cobro leasing mensual...");
    ACS_applyMonthlyLeasing();
});


/* ============================================================
   IMPORTANTE:
   Los módulos deben activar leasing en cada avión así:
   ac.leasing_active = true
   ac.leasing_monthly = (ac.price * 0.015)
   ============================================================ */

/* ============================================================
   === ACS FINANCE ENGINE - CORE v1.5 (Integración HR) ========
   ------------------------------------------------------------
   ▪ Capital inicial: 3,000,000 USD (Año 1940)
   ▪ Payroll inicial automático desde HR
   ▪ Manejo de ingresos, gastos y profit
   ▪ Historial mensual inicial (Month 1 - JAN 1940)
   ▪ API completa para todos los módulos
   ▪ Ahora sincronizado con ACS_HR
   ============================================================ */

// Crear estructura base si no existe
if (!localStorage.getItem("ACS_Finance")) {

    // Traer payroll del HR inicial
    const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");
    const payroll = HR && HR.payroll ? HR.payroll : 0;

    const baseFinance = {
        capital: 3000000,
        month: "JAN 1940",

        revenue: 0,
        expenses: payroll,
        profit: -payroll,

        income: {
            routes: 0,
            cargo: 0,
            leasing_income: 0,
            credits: 0
        },

        cost: {
            salaries: payroll,
            maintenance: 0,
            leasing: 0,
            fuel: 0,
            ground_handling: 0,
            virtual_handling: 0,
            slot_fees: 0,
            penalties: 0,
            loans: 0
        },

        history: [
            {
                month: "JAN 1940",
                revenue: 0,
                expenses: payroll,
                profit: -payroll
            }
        ]
    };

    localStorage.setItem("ACS_Finance", JSON.stringify(baseFinance));
}

// Helper para cargar/salvar
function loadFinance() {
    return JSON.parse(localStorage.getItem("ACS_Finance"));
}

function saveFinance(data) {
    localStorage.setItem("ACS_Finance", JSON.stringify(data));
}

/* ============================================================
   ===  INTEGRACIÓN HR — PAYROLL REAL                         ==
   ============================================================ */
function ACS_syncPayrollWithHR() {
    const f = loadFinance();
    const HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}");

    if (!f || !HR || !HR.payroll) return;

    f.cost.salaries = HR.payroll;
    f.expenses = HR.payroll; // por ahora solo salarios (resto vendrá luego)
    f.profit = f.revenue - f.expenses;

    saveFinance(f);
}

/* ============================================================
   === API PRINCIPAL (módulos pueden llamar estos métodos) ====
   ============================================================ */

// Agregar ingreso
function ACS_addIncome(type, amount) {
    const f = loadFinance();
    if (f.income[type] !== undefined) {
        f.income[type] += amount;
        f.revenue += amount;
        f.capital += amount;
        saveFinance(f);
    }
}

// Agregar gasto
function ACS_addExpense(type, amount) {
    const f = loadFinance();
    if (f.cost[type] !== undefined) {
        f.cost[type] += amount;
        f.expenses += amount;
        f.capital -= amount;
        saveFinance(f);
    }
}

// Calcular profit del mes
function ACS_updateProfit() {
    const f = loadFinance();
    f.profit = f.revenue - f.expenses;
    saveFinance(f);
}

// Guardar registro mensual en el historial
function ACS_closeMonth() {
    const f = loadFinance();

    // Sincronizar payroll antes de cerrar
    ACS_syncPayrollWithHR();

    // Calcular profit final
    ACS_updateProfit();

    f.history.push({
        month: f.month,
        revenue: f.revenue,
        expenses: f.expenses,
        profit: f.profit
    });

    // Reset para el siguiente mes
    f.revenue = 0;
    f.expenses = f.cost.salaries; // salaries siempre quedan activos
    f.profit = 0;

    saveFinance(f);
}

// API para obtener capital en vivo
function ACS_getCapital() {
    return loadFinance().capital;
}

// API para obtener historial
function ACS_getHistory() {
    return loadFinance().history;
}

/* ============================================================
   ===  AUTO-SYNC AL ENTRAR AL DASHBOARD ======================
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

    const isDashboard =
        window.location.pathname.includes("dashboard.html") ||
        window.location.href.includes("dashboard.html");

    if (!isDashboard) return;

    // Cada vez que se entra al Dashboard:
    // sincronizamos salarios de HR con Finance
    ACS_syncPayrollWithHR();

    console.log("💼 Finance synced with HR → payroll actualizado.");
});

/* ============================================================
   === ACS FINANCE ENGINE - CORE v1.0 ==========================
   ------------------------------------------------------------
   ▪ Capital inicial: 3,000,000 USD (Año 1940)
   ▪ Manejo básico de ingresos, gastos y profit
   ▪ Historial mensual
   ▪ API para que cualquier módulo agregue gastos/ingresos
   ============================================================ */

// Crear estructura base si no existe
if (!localStorage.getItem("ACS_Finance")) {
    const baseFinance = {
        capital: 3000000,
        month: "JAN 1940",

        revenue: 0,
        expenses: 0,
        profit: 0,

        income: {
            routes: 0,
            cargo: 0,
            leasing_income: 0,
            credits: 0
        },

        cost: {
            salaries: 0,
            maintenance: 0,
            leasing: 0,
            fuel: 0,
            ground_handling: 0,
            virtual_handling: 0,
            slot_fees: 0,
            penalties: 0,
            loans: 0
        },

        history: [] // Guardará el historial mensual completo
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

    // Calcular profit antes de cerrar
    ACS_updateProfit();

    f.history.push({
        month: f.month,
        revenue: f.revenue,
        expenses: f.expenses,
        profit: f.profit
    });

    // Resetear valores para el siguiente mes (pero capital se mantiene)
    f.revenue = 0;
    f.expenses = 0;
    f.profit = 0;

    // NO cambiamos el mes todavía (Time Engine lo hará más adelante)
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

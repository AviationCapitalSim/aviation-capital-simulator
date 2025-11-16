/* === ACS - FINANCE CORE (Base Pura) === */
/* Version: 1.0.0 | Date: 08 NOV 2025 */

/* 1) Estructura base */
const acsFinance = {
  revenue: 0,
  expenses: 0,
  net_profit: 0,
  profit_margin: 0,
  departments: {
    hr: 0,
    maintenance: 0,
    flight_ops: 0,
    routes: 0,
    finance: 0
  },
  updated_at: new Date().toISOString()
};

/* 2) Recolección desde los módulos del juego */
function collectFinanceData() {
  const hrCost          = Number(localStorage.getItem("acs_hr_expense")) || 0;
  const maintenanceCost = Number(localStorage.getItem("acs_maintenance_cost")) || 0;
  const flightRevenue   = Number(localStorage.getItem("acs_flight_revenue")) || 0;
  const financeOps      = Number(localStorage.getItem("acs_finance_ops")) || 0;
  const flightOpsCost   = Number(localStorage.getItem("acs_flightops_cost")) || 0;

  acsFinance.departments.hr          = hrCost;
  acsFinance.departments.maintenance = maintenanceCost;
  acsFinance.departments.routes      = flightRevenue;
  acsFinance.departments.finance     = financeOps;
  acsFinance.departments.flight_ops  = flightOpsCost;

  acsFinance.revenue      = flightRevenue + financeOps;
  acsFinance.expenses     = hrCost + maintenanceCost + flightOpsCost;
  acsFinance.net_profit   = acsFinance.revenue - acsFinance.expenses;
  acsFinance.profit_margin = acsFinance.revenue > 0
    ? ((acsFinance.net_profit / acsFinance.revenue) * 100).toFixed(2)
    : 0;

  acsFinance.updated_at = new Date().toISOString();
  localStorage.setItem("acs_finance_data", JSON.stringify(acsFinance));
  console.log("ACS Finance Updated:", acsFinance);
}

/* 3) Pintar en Monthly Growth si la página está abierta */
function updateFinanceDisplay() {
  const data = JSON.parse(localStorage.getItem("acs_finance_data")) || acsFinance;

  const revenueEl = document.querySelector("#finance-revenue");
  const expenseEl = document.querySelector("#finance-expenses");
  const profitEl  = document.querySelector("#finance-profit");
  const marginEl  = document.querySelector("#finance-margin");

  if (revenueEl && expenseEl && profitEl && marginEl) {
    revenueEl.textContent = `$${(data.revenue||0).toLocaleString()}`;
    expenseEl.textContent = `$${(data.expenses||0).toLocaleString()}`;
    profitEl.textContent  = `$${(data.net_profit||0).toLocaleString()}`;
    marginEl.textContent  = `${data.profit_margin || 0}%`;
  }
}

/* 4) Ciclo de actualización (cada 30s) */
collectFinanceData();
updateFinanceDisplay();
setInterval(() => {
  collectFinanceData();
  updateFinanceDisplay();
}, 30000);

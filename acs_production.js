/* ============================================================
   === ACS PRODUCTION SYSTEM v1.0 ===
   Global aircraft manufacturing slots for ACS
   Date: 09 NOV 2025
   ============================================================ */

/*
📦 Simulación de capacidad de producción:
  - Airbus: 50 aircraft / month
  - Boeing: 45 aircraft / month
  - Embraer: 15 aircraft / month
  - Bombardier: 6 aircraft / month
  - ATR: 8 aircraft / month
*/

window.acsProduction = {
  Airbus: { monthlyCapacity: 50, schedule: [] },
  Boeing: { monthlyCapacity: 45, schedule: [] },
  Embraer: { monthlyCapacity: 15, schedule: [] },
  Bombardier: { monthlyCapacity: 6, schedule: [] },
  ATR: { monthlyCapacity: 8, schedule: [] }
};

// === Inicializar capacidad hasta 2030 ===
function initProductionSchedule() {
  const startYear = 2025;
  const endYear = 2030;

  for (const manu in window.acsProduction) {
    const m = window.acsProduction[manu];
    m.schedule = [];
    for (let y = startYear; y <= endYear; y++) {
      for (let month = 1; month <= 12; month++) {
        m.schedule.push({
          year: y,
          month,
          reserved: 0,
          capacity: m.monthlyCapacity
        });
      }
    }
  }
}

// === Buscar el primer slot disponible ===
function getNextAvailableSlot(manufacturer, quantity = 1) {
  const sched = window.acsProduction[manufacturer].schedule;
  for (let s of sched) {
    if (s.reserved + quantity <= s.capacity) {
      const monthName = new Date(2025, s.month - 1).toLocaleString("en", { month: "short" }).toUpperCase();
      return { monthName, month: s.month, year: s.year, available: s.capacity - s.reserved };
    }
  }
  return { monthName: "N/A", year: "—", available: 0 };
}

// === Reservar un slot de producción ===
function reserveProductionSlot(manufacturer, quantity = 1) {
  const sched = window.acsProduction[manufacturer].schedule;
  for (let s of sched) {
    if (s.reserved + quantity <= s.capacity) {
      s.reserved += quantity;
      return { month: s.month, year: s.year };
    }
  }
  return { month: null, year: null }; // no disponible
}

// === Generar tabla visible para el jugador ===
function renderProductionTables(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = ""; // limpiar
  for (const manu in window.acsProduction) {
    const m = window.acsProduction[manu];
    const nextSlot = getNextAvailableSlot(manu);

    const table = document.createElement("div");
    table.classList.add("prod-table");
    table.innerHTML = `
      <h3>${manu}</h3>
      <p>Capacity per month: <b>${m.monthlyCapacity}</b></p>
      <p>Next available delivery: <b>${nextSlot.monthName} ${nextSlot.year}</b></p>
      <table>
        <tr><th>Month</th><th>Reserved</th><th>Available</th><th>Year</th></tr>
        ${m.schedule.slice(0, 12).map(slot => `
          <tr>
            <td>${new Date(2025, slot.month - 1).toLocaleString("en", { month: "short" }).toUpperCase()}</td>
            <td>${slot.reserved}</td>
            <td>${slot.capacity - slot.reserved}</td>
            <td>${slot.year}</td>
          </tr>`).join("")}
      </table>
    `;
    container.appendChild(table);
  }
}

// === Evento mensual: producción avanza ===
document.addEventListener("acsNewMonth", () => {
  for (const manu in window.acsProduction) {
    const sched = window.acsProduction[manu].schedule;
    sched.forEach(slot => {
      if (slot.reserved > 0 && slot.capacity === slot.reserved) {
        document.dispatchEvent(new CustomEvent("acsProductionComplete", {
          detail: { manufacturer: manu, month: slot.month, year: slot.year }
        }));
      }
    });
  }
});

// === Inicialización al cargar ===
initProductionSchedule();
console.log("%cACS PRODUCTION SYSTEM v1.0 initialized", "color:#ffb300;font-weight:bold;");

/* ============================================================
   === ACS BUY NEW AIRCRAFT ENGINE — OEM TABLE v3.0 ============
   ------------------------------------------------------------
   • Carga toda la DB desde acs_aircraft_master_db.js
   • Tabla profesional estilo Airbus/Boeing
   • Filtros por fabricante dinámicos
   • Info modal
   • Buy modal básico integrado con el balance
   ============================================================ */

console.log("🟦 ACS Buy Aircraft Engine Loaded");

/* ============================================================
   1) ELEMENTOS DEL DOM
   ============================================================ */
const filterBar = document.getElementById("filterBar");
const tableBody = document.getElementById("aircraftTableBody");
const infoModal = document.getElementById("infoModal");
const infoTitle = document.getElementById("infoTitle");
const infoList = document.getElementById("infoList");

/* ============================================================
   2) OBTENER LISTA DE FABRICANTES
   ============================================================ */
function getManufacturers() {
  const makers = new Set();

  ACS_AIRCRAFT_DB.forEach(a => {
    if (!a.manufacturer) return;
    makers.add(a.manufacturer);
  });

  return ["ALL", ...Array.from(makers).sort()];
}

/* ============================================================
   3) CREAR FILTROS DE FABRICANTE
   ============================================================ */
function createFilterChips() {
  const makers = getManufacturers();
  filterBar.innerHTML = "";

  makers.forEach(m => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = m;

    if (m === "ALL") chip.classList.add("active");

    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      loadAircraft(m);
    });

    filterBar.appendChild(chip);
  });
}

/* ============================================================
   4) CARGAR TABLA
   ============================================================ */
function loadAircraft(filter = "ALL") {
  tableBody.innerHTML = "";

  const currentYear = parseInt(localStorage.getItem("ACS_Game_Year") || "1940");

  const filtered = ACS_AIRCRAFT_DB.filter(ac => {
    if (filter !== "ALL" && ac.manufacturer !== filter) return false;
    if (ac.start_year > currentYear) return false;
    return true;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="color:#ccc; padding:1rem;">No aircraft available for this year.</td>
      </tr>
    `;
    return;
  }

  // Ordenamos por año (EIS)
  filtered.sort((a, b) => a.start_year - b.start_year);

  filtered.forEach(ac => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${ac.model}</td>
      <td>${ac.start_year}</td>
      <td>${ac.engines || "—"}</td>
      <td>${ac.seats || "—"}</td>
      <td>${ac.range || "—"}</td>
      <td>$${ac.price} M</td>
      <td><button class="btn-buy" onclick="openBuyModal('${ac.model}', ${ac.price})">Buy</button></td>
      <td><button class="btn-info" onclick="openInfo('${ac.model}')">Info</button></td>
    `;

    tableBody.appendChild(tr);
  });
}

/* ============================================================
   5) INFO MODAL
   ============================================================ */
function openInfo(model) {
  const ac = ACS_AIRCRAFT_DB.find(a => a.model === model);
  if (!ac) return;

  infoTitle.textContent = model;
  infoList.innerHTML = `
    <li><strong>Manufacturer:</strong> ${ac.manufacturer}</li>
    <li><strong>Entry Into Service:</strong> ${ac.start_year}</li>
    <li><strong>Engines:</strong> ${ac.engines || "N/A"}</li>
    <li><strong>Seats:</strong> ${ac.seats || "N/A"}</li>
    <li><strong>Range:</strong> ${ac.range || "N/A"}</li>
    <li><strong>MTOW:</strong> ${ac.mtow || "N/A"}</li>
    <li><strong>Price:</strong> $${ac.price} M</li>
  `;

  infoModal.style.display = "flex";
}

function closeInfoModal() {
  infoModal.style.display = "none";
}

window.addEventListener("click", e => {
  if (e.target === infoModal) closeInfoModal();
});

/* ============================================================
   6) BUY MODAL (BÁSICO)
   ============================================================ */
function openBuyModal(model, price) {
  if (!confirm(`Confirm purchase?\n\nModel: ${model}\nPrice: $${price} M`)) return;

  let balance = parseFloat(localStorage.getItem("acsBalance") || "200");

  if (balance < price) {
    alert("❌ Insufficient funds.");
    return;
  }

  balance -= price;
  localStorage.setItem("acsBalance", balance.toFixed(1));

  alert(`✅ Purchase Completed!\n\n${model} added to Pending Deliveries.`);

  const pending = JSON.parse(localStorage.getItem("acsPendingDeliveries") || "[]");

  pending.push({
    model,
    unitPrice: price,
    paidNow: price,
    status: "On Order (production slot)",
    createdAt: new Date().toISOString()
  });

  localStorage.setItem("acsPendingDeliveries", JSON.stringify(pending));
}

/* ============================================================
   7) INICIALIZAR
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  createFilterChips();
  loadAircraft("ALL");
});

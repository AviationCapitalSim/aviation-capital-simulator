/* ============================================================
   === ACS - My Aircraft Module  =======================
   Version: 1.0 (Unified)
   Date: 2025-01-01
   ------------------------------------------------------------
   • Unificado con Buy New + Used Market
   • Usa la clave estándar ACS_MyAircraft
   • Sincronizado con Delivery Engine y Time Engine
   • Render FR24 / SkyOS style
   • Filtros completos
   • Modal funcional
   • 4 filas vacías cuando no hay flota
   ============================================================ */

// === STORAGE KEY ===

const ACS_FLEET_KEY = "ACS_MyAircraft";

/* ============================================================
   🟦 C.1 — Cargar flota ACTIVA
   ============================================================ */

let fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");

/* Guardar cambios correctamente */
function saveFleet() {
  localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleet));
}

/* Obtener tiempo sim actual */
function getSimTime() {
  if (window.ACS_getSimTime && typeof window.ACS_getSimTime === "function") {
    return new Date(window.ACS_getSimTime());
  }
  return new Date("1940-01-01T00:00:00Z");
}

/* ============================================================
   🟦 C.2 — Pending Deliveries (sync with Pending DB)
   ============================================================ */

function updatePendingDeliveries() {

  const now = getSimTime();

  let changed = false;
  let activeFleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  let pendings = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

  const stillPending = [];

  pendings.forEach(entry => {
    const d = new Date(entry.deliveryDate);

    if (now >= d) {
      /* convertir a activo */
      for (let i = 0; i < entry.qty; i++) {
        activeFleet.push({
          registration: "UNASSIGNED",
          manufacturer: entry.manufacturer,
          model: entry.model,
          family: "",
          status: "Active",
          hours: 0,
          cycles: 0,
          condition: 100,
          base: "—",
          delivered: d.toISOString(),
          age: 0
        });
      }
      changed = true;
    } else {
      stillPending.push(entry);
    }
  });

  /* Guardar */
  if (changed) {
    localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(activeFleet));
  }
  localStorage.setItem("ACS_PendingAircraft", JSON.stringify(stillPending));

  /* Actualizar flota fusionada */
  fleetActive = activeFleet;
  fleetPending = stillPending;
  fleet = [...fleetActive, ...fleetPending];
}


/* ============================================================
   🟦 C.3 — Render FULL TABLE (Active + Pending)
   ============================================================ */

function renderFleetTable() {

  fleetTableBody.innerHTML = "";

  if (fleet.length === 0) {
    ensureEmptyRows();
    return;
  }

  fleet.forEach(ac => {

    if (!passesFilters(ac)) return;

    const isPending = ac.status === "Pending Delivery";

    const row = document.createElement("tr");

    if (isPending) row.classList.add("pending-row");

    const deliveryDate = ac.deliveryDate
      ? new Date(ac.deliveryDate).toUTCString().substring(5, 16)
      : "—";

    row.innerHTML = `
      <td>${isPending ? "—" : (ac.registration || "UNASSIGNED")}</td>
      <td>${ac.model}</td>
      <td class="${isPending ? "pending-text" : ""}">
        ${isPending ? "Pending Delivery" : ac.status}
      </td>
      <td>${isPending ? "—" : ac.hours}</td>
      <td>${isPending ? "—" : ac.cycles}</td>
      <td>${isPending ? "—" : ac.condition + "%"}</td>
      <td>${isPending ? "—" : (ac.nextC || "—")}</td>
      <td>${isPending ? "—" : (ac.nextD || "—")}</td>
      <td>${isPending ? deliveryDate : (ac.base || "—")}</td>
      <td>${isPending ? "—" : `<button class="btn-action" onclick="openAircraftModal('${ac.registration}')">View</button>`}</td>
    `;

    fleetTableBody.appendChild(row);
  });
}

/* ============================================================
   🟦 C.2 — Render Pending Deliveries (Clean ACS version)
   ============================================================ */

function renderPendingDeliveriesTable() {

  const container = document.getElementById("pendingList");
  if (!container) return;

  const pending = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

  container.innerHTML = "";

  if (pending.length === 0) {
    container.innerHTML = `<div class="emptyBox">No pending deliveries</div>`;
    return;
  }

  pending.forEach(entry => {
    const d = new Date(entry.deliveryDate).toUTCString().substring(5, 16);

    const card = document.createElement("div");
    card.classList.add("pending-card");

    card.innerHTML = `
      <div class="p-model">${entry.manufacturer} ${entry.model}</div>
      <div class="p-qty">Qty: ${entry.qty}</div>
      <div class="p-date">Delivery: <b>${d}</b></div>
    `;

    container.appendChild(card);
  });
}

// ============================================================
// === FILTERS ================================================
// ============================================================

const fModel   = document.getElementById("filterModel");
const fFamily  = document.getElementById("filterFamily");
const fStatus  = document.getElementById("filterStatus");
const fCond    = document.getElementById("filterCondition");
const fAge     = document.getElementById("filterAge");
const fBase    = document.getElementById("filterBase");
const fSearch  = document.getElementById("searchInput");

function populateFilterOptions() {
  const models  = new Set();
  const families = new Set();
  const bases   = new Set();

  fleet.forEach(ac => {
    models.add(ac.model);
    families.add(ac.family || "");
    bases.add(ac.base || "");
  });

  const fill = (el, set) => {
    el.innerHTML = `<option value="">${el.id.replace("filter","")}</option>`;
    set.forEach(v => {
      if (v.trim() !== "") {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        el.appendChild(opt);
      }
    });
  };

  fill(fModel, models);
  fill(fFamily, families);
  fill(fBase, bases);
}

function passesFilters(ac) {
  if (fModel.value && ac.model !== fModel.value) return false;
  if (fFamily.value && ac.family !== fFamily.value) return false;
  if (fStatus.value && ac.status !== fStatus.value) return false;

  if (fCond.value && ac.condition < Number(fCond.value)) return false;

  if (fAge.value) {
    const age = Number(ac.age || 0);
    if (fAge.value === "0-5"   && !(age <= 5)) return false;
    if (fAge.value === "5-10"  && !(age >= 5 && age <= 10)) return false;
    if (fAge.value === "10-20" && !(age >= 10 && age <= 20)) return false;
    if (fAge.value === "20+"   && !(age >= 20)) return false;
  }

  if (fBase.value && ac.base !== fBase.value) return false;

  const s = fSearch.value.toLowerCase();
  if (s && !(ac.registration + " " + ac.model).toLowerCase().includes(s)) return false;

  return true;
}

[fModel, fFamily, fStatus, fCond, fAge, fBase, fSearch].forEach(el => {
  el.addEventListener("input", () => renderFleetTable());
});

// ============================================================
// === MODAL ===================================================
// ============================================================

const modal = document.getElementById("aircraftModal");

function openAircraftModal(reg) {
  const ac = fleet.find(a => a.registration === reg);
  if (!ac) return;

  document.getElementById("modalTitle").textContent = `${ac.model} — ${ac.registration}`;
  document.getElementById("mReg").textContent = ac.registration;
  document.getElementById("mModel").textContent = ac.model;
  document.getElementById("mFamily").textContent = ac.family || "—";
  document.getElementById("mBase").textContent = ac.base || "—";
  document.getElementById("mStatus").textContent = ac.status;
  document.getElementById("mCondition").textContent = ac.condition;
  document.getElementById("mHours").textContent = ac.hours;
  document.getElementById("mCycles").textContent = ac.cycles;
  document.getElementById("mAge").textContent = ac.age || 0;

  document.getElementById("mLastC").textContent = ac.lastC || "—";
  document.getElementById("mNextC").textContent = ac.nextC || "—";
  document.getElementById("mLastD").textContent = ac.lastD || "—";
  document.getElementById("mNextD").textContent = ac.nextD || "—";

  // Los botones los dejamos desactivados (activarán en parte 2)
  document.getElementById("btnCcheck").disabled = true;
  document.getElementById("btnDcheck").disabled = true;
  document.getElementById("btnLog").disabled = true;

  modal.style.display = "flex";
}

function closeModal() { modal.style.display = "none"; }

// ============================================================
// === EMPTY ROWS (si no hay flota) ============================
// ============================================================

function ensureEmptyRows() {
  fleetTableBody.innerHTML = `
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
  `;
}

// ============================================================
// === INITIALIZATION =========================================
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  updatePendingDeliveries();
  populateFilterOptions();
  renderFleetTable();
  renderPendingDeliveriesTable();
   
  // 🟦 Solo filas vacías cuando NO hay flota
   
  if (fleet.length === 0) {
    ensureEmptyRows();
  }
});

// ============================================================
// === TIME ENGINE SYNC =======================================
// ============================================================

if (typeof registerTimeListener === "function") {
  registerTimeListener(() => {
    fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
    updatePendingDeliveries();
    renderFleetTable();

    // 🟦 Solo si no hay aviones
    if (fleet.length === 0) {
      ensureEmptyRows();
    }
  });
}

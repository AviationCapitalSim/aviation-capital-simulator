/* ============================================================
   === ACS - My Aircraft Module (Part 1) =======================
   Version: 1.0
   Date: 2025-11-14
   ------------------------------------------------------------
   • Flota inicial vacía (año 1940)
   • Lectura segura desde localStorage
   • Pending Delivery sincronizado con el motor de tiempo ACS
   • Render tabla tipo FR24 / SkyOS
   • Barra de filtros completa
   • Modal de detalle
   ============================================================ */

// === STORAGE KEY ===
const ACS_FLEET_KEY = "ACS_MyFleet";

// === Cargar flota o comenzar con lista vacía ===
let fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");

// === Guardar cambios ===
function saveFleet() {
  localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleet));
}

// === Obtener tiempo sim actual desde time_engine ===
function getSimTime() {
  if (window.getSimTime && typeof window.getSimTime === "function") {
    return new Date(window.getSimTime());
  }
  return new Date("1940-01-01T00:00:00Z");
}

// ============================================================
// === PENDING DELIVERY HANDLER (REAL SIM-TIME BASED) =========
// ============================================================

function updatePendingDeliveries() {
  const now = getSimTime();

  let changed = false;

  fleet.forEach(ac => {
    if (ac.status === "Pending Delivery" && ac.deliveryDate) {
      const delivery = new Date(ac.deliveryDate);
      if (now >= delivery) {
        ac.status = "Active";
        ac.deliveryDate = null;
        changed = true;
      }
    }
  });

  if (changed) {
    saveFleet();
    renderFleetTable();
    populateFilterOptions();
  }
}

// ============================================================
// === RENDERING SYSTEM ========================================
// ============================================================

const fleetTableBody = document.getElementById("fleetTableBody");

// === Render fila por avión ===
function renderFleetTable() {
  fleetTableBody.innerHTML = "";

  if (fleet.length === 0) {
    fleetTableBody.innerHTML =
      `<tr><td colspan="10" style="text-align:center;color:#ccc;padding:1.4rem;">
          No aircraft in fleet. Purchase or lease one to get started.
       </td></tr>`;
    return;
  }

  fleet.forEach(ac => {
    // FILTROS
    if (!passesFilters(ac)) return;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td><span class="icon">✈️</span>${ac.registration || "UNASSIGNED"}</td>
      <td>${ac.model}</td>
      <td>${ac.status}</td>
      <td>${ac.hours}</td>
      <td>${ac.cycles}</td>
      <td>${ac.condition}%</td>
      <td>${ac.nextC || "—"}</td>
      <td>${ac.nextD || "—"}</td>
      <td>${ac.base || "—"}</td>
      <td>
        <button class="btn-action" onclick="openAircraftModal('${ac.registration}')">
          View
        </button>
      </td>
    `;

    fleetTableBody.appendChild(row);
  });
}

// ============================================================
// === FILTERS =================================================
// ============================================================

const fModel   = document.getElementById("filterModel");
const fFamily  = document.getElementById("filterFamily");
const fStatus  = document.getElementById("filterStatus");
const fCond    = document.getElementById("filterCondition");
const fAge     = document.getElementById("filterAge");
const fBase    = document.getElementById("filterBase");
const fSearch  = document.getElementById("searchInput");

// === Poblado dinámico de modelos, familias y bases ===
function populateFilterOptions() {
  const models  = new Set();
  const families = new Set();
  const bases   = new Set();

  fleet.forEach(ac => {
    models.add(ac.model);
    families.add(ac.family || "");
    bases.add(ac.base || "");
  });

  // helper
  const fillSelect = (el, list) => {
    el.innerHTML = `<option value="">${el.id.replace("filter","")}</option>`;
    list.forEach(v => {
      if (v && v.trim() !== "") {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        el.appendChild(opt);
      }
    });
  };

  fillSelect(fModel, models);
  fillSelect(fFamily, families);
  fillSelect(fBase, bases);
}

// === Validación de filtros ===
function passesFilters(ac) {
  if (fModel.value && ac.model !== fModel.value) return false;
  if (fFamily.value && ac.family !== fFamily.value) return false;
  if (fStatus.value && ac.status !== fStatus.value) return false;

  if (fCond.value) {
    if (ac.condition < Number(fCond.value)) return false;
  }

  if (fAge.value) {
    const age = Number(ac.age || 0);
    if (fAge.value === "0-5"   && !(age >= 0 && age <= 5)) return false;
    if (fAge.value === "5-10"  && !(age >= 5 && age <= 10)) return false;
    if (fAge.value === "10-20" && !(age >= 10 && age <= 20)) return false;
    if (fAge.value === "20+"   && !(age >= 20)) return false;
  }

  if (fBase.value && ac.base !== fBase.value) return false;

  const search = fSearch.value.toLowerCase();
  if (search) {
    const text = (ac.registration + " " + ac.model).toLowerCase();
    if (!text.includes(search)) return false;
  }

  return true;
}

// === Evento de filtros ===
[fModel, fFamily, fStatus, fCond, fAge, fBase, fSearch].forEach(el => {
  el.addEventListener("input", () => renderFleetTable());
});

// ============================================================
// === MODAL SYSTEM ============================================
// ============================================================

const modal = document.getElementById("aircraftModal");

function openAircraftModal(reg) {
  const ac = fleet.find(a => a.registration === reg);
  if (!ac) return;

  // Fill modal
  document.getElementById("modalTitle").textContent = `${ac.model} — ${ac.registration}`;
  document.getElementById("mReg").textContent = ac.registration || "UNASSIGNED";
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

  // Los botones se activarán en Parte 2
  document.getElementById("btnCcheck").disabled = true;
  document.getElementById("btnDcheck").disabled = true;
  document.getElementById("btnLog").disabled = true;

  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

// ============================================================
// === INICIALIZACIÓN ==========================================
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  updatePendingDeliveries();  // sincroniza con el reloj
  populateFilterOptions();
  renderFleetTable();

  // Reloj sincronizado
  if (typeof registerTimeListener === "function") {
    registerTimeListener(() => {
      updatePendingDeliveries();
      renderFleetTable();
    });
  }
});
/* ============================================================
   === ACS My Aircraft Module — PART 2 =========================
   === Maintenance C & D + Finance + Schedule Integration ======
   ============================================================ */

/*  
  NOTA:
  - Part 1 ya tiene fleet[], saveFleet(), getSimTime(), renderTable(), modal, etc.
  - Aquí ampliamos C-Check y D-Check.
  - Ambos usan tiempo real del motor ACS (sin setTimeout).
  - A/B Checks vienen del Schedule: status = "A-Check" o "B-Check".
*/

// ============================================================
// === UTIL: GENERAR FECHA FUTURA SEGÚN EL MOTOR DE TIEMPO =====
// ============================================================

function addSimMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

// ============================================================
// === COSTOS DE MANTENIMIENTO ================================
// ============================================================

function calculateCcheckCost(ac) {
  // C-Check realista: aprox 4–6% del valor
  return Math.max(0.02, ac.value || 0) * 0.05;  
}

function calculateDcheckCost(ac) {
  // D-Check realista: renovación completa, ~50–60% del valor
  return Math.max(0.02, ac.value || 0) * 0.55;
}

// ============================================================
// === INICIAR C-CHECK ========================================
// ============================================================

function startCcheck(reg) {
  const ac = fleet.find(a => a.registration === reg);
  if (!ac) return alert("Aircraft not found.");

  // Bloqueo si está en A/B o ya en C/D
  if (ac.status.includes("Check")) {
    return alert("Aircraft already in maintenance.");
  }
  if (ac.status === "A-Check" || ac.status === "B-Check") {
    return alert("Aircraft currently in A/B check via Schedule.");
  }

  const now = getSimTime();
  const completion = addSimMonths(now, 1); // 1 mes sim

  ac.status = "In C-Check";
  ac.lastC = now.toISOString();
  ac.nextC = completion;
  ac.deliveryDate = completion; // Se reutiliza para saber cuándo termina
  ac.maintenanceType = "C";

  // Costos (FINANCE)
  const cost = calculateCcheckCost(ac);
  applyMaintenanceCost(cost, "C-Check", reg);

  saveFleet();
  renderFleetTable();
  closeModal();

  alert(`C-Check iniciado: finaliza el ${new Date(completion).toDateString()}`);
}

// ============================================================
// === INICIAR D-CHECK ========================================
// ============================================================

function startDcheck(reg) {
  const ac = fleet.find(a => a.registration === reg);
  if (!ac) return alert("Aircraft not found.");

  if (ac.status.includes("Check")) {
    return alert("Aircraft already in maintenance.");
  }
  if (ac.status === "A-Check" || ac.status === "B-Check") {
    return alert("Aircraft currently in A/B check via Schedule.");
  }

  const now = getSimTime();
  const completion = addSimMonths(now, 6); // D-Check = 6 meses sim

  ac.status = "In D-Check";
  ac.lastD = now.toISOString();
  ac.nextD = completion;
  ac.deliveryDate = completion;
  ac.maintenanceType = "D";

  const cost = calculateDcheckCost(ac);
  applyMaintenanceCost(cost, "D-Check", reg);

  saveFleet();
  renderFleetTable();
  closeModal();

  alert(`D-Check iniciado: finaliza el ${new Date(completion).toDateString()}`);
}

// ============================================================
// === COMPLETAR MANTENIMIENTOS AUTOMÁTICAMENTE ===============
// ============================================================

function checkMaintenanceCompletion() {
  const now = getSimTime();
  let changed = false;

  fleet.forEach(ac => {
    if ((ac.status === "In C-Check" || ac.status === "In D-Check") &&
        ac.deliveryDate) {

      const finish = new Date(ac.deliveryDate);

      if (now >= finish) {
        ac.status = "Active";
        ac.deliveryDate = null;

        // Restauración de condición
        if (ac.maintenanceType === "C") {
          ac.condition = Math.min(100, ac.condition + 12);
        }
        if (ac.maintenanceType === "D") {
          ac.condition = Math.min(100, ac.condition + 30);
        }
      /* === ALERTA: Mantenimiento completado === */
       ACS_addAlert(
      "maintenance",
      "low",
      `Maintenance completed: ${ac.registration || ac.model}`
     );
        
         ac.maintenanceType = null;
        changed = true;
      }
    }
  });

  if (changed) {
    saveFleet();
    renderFleetTable();
  }
}
/* ============================================================
   === AUTOMATIC MAINTENANCE ALERT GENERATOR ==================
   ============================================================ */

function checkMaintenanceAlerts() {
  let now = getSimTime();

  fleet.forEach(ac => {

    // --- ALERTA C-CHECK PRÓXIMO ---
    if (ac.nextC) {
      const nextC = new Date(ac.nextC);

      const diff = nextC - now;
      const days = diff / (1000 * 60 * 60 * 24);

      if (days <= 30 && !ac.alertCsent) {
        ACS_addAlert(
          "maintenance",
          "medium",
          `C-Check approaching for ${ac.registration} (${Math.round(days)} days left)`
        );
        ac.alertCsent = true;
        saveFleet();
      }
    }

    // --- ALERTA D-CHECK PRÓXIMO ---
    if (ac.nextD) {
      const nextD = new Date(ac.nextD);

      const diff = nextD - now;
      const days = diff / (1000 * 60 * 60 * 24);

      if (days <= 180 && !ac.alertDsent) {
        ACS_addAlert(
          "maintenance",
          "high",
          `D-Check approaching for ${ac.registration} (${Math.round(days)} days left)`
        );
        ac.alertDsent = true;
        saveFleet();
      }
    }

  });
}
// ============================================================
// === INTEGRACIÓN FINANCE =====================================
// ============================================================

function applyMaintenanceCost(cost, type, reg) {
  let bal = Number(localStorage.getItem("ACS_Finance_Balance") || "0");
  bal -= cost;
  localStorage.setItem("ACS_Finance_Balance", bal.toFixed(2));

  // LOG financiero
  const log = JSON.parse(localStorage.getItem("ACS_Finance_Log") || "[]");
  log.unshift({
    time: getSimTime().toISOString(),
    type: type,
    reg: reg,
    amount: -cost,
    note: `${type} applied to ${reg}`
  });
  localStorage.setItem("ACS_Finance_Log", JSON.stringify(log));
}

// ============================================================
// === LOG DE MANTENIMIENTO ====================================
// ============================================================

function openLog(reg) {
  const log = JSON.parse(localStorage.getItem("ACS_MaintLog") || "[]");
  const entries = log.filter(e => e.reg === reg);

  let msg = `Maintenance Log - ${reg}\n\n`;
  if (entries.length === 0) msg += "No entries found.";
  else {
    entries.forEach(e => {
      msg += `[${new Date(e.time).toDateString()}] ${e.text}\n`;
    });
  }

  alert(msg);
}

function logMaintenance(reg, text) {
  let log = JSON.parse(localStorage.getItem("ACS_MaintLog") || "[]");
  log.unshift({
    reg: reg,
    time: getSimTime().toISOString(),
    text: text
  });
  localStorage.setItem("ACS_MaintLog", JSON.stringify(log));
}

// ============================================================
// === ENLAZAR BOTONES DEL MODAL ===============================
// ============================================================

document.getElementById("btnCcheck").onclick = () => {
  const reg = document.getElementById("mReg").textContent;
  startCcheck(reg);
};
document.getElementById("btnDcheck").onclick = () => {
  const reg = document.getElementById("mReg").textContent;
  startDcheck(reg);
};
document.getElementById("btnLog").onclick = () => {
  const reg = document.getElementById("mReg").textContent;
  openLog(reg);
};

// ============================================================
// === ACTUALIZACIÓN AUTOMÁTICA CON EL RELOJ ACS ===============
// ============================================================

if (typeof registerTimeListener === "function") {
  registerTimeListener(() => {
    updatePendingDeliveries();
    checkMaintenanceCompletion();
    renderFleetTable();
    checkMaintenanceAlerts();  });
}
/* ============================================================
   === ACS TIME ENGINE INTEGRATION — v1.0 ======================
   === Automatic refresh on every game-time tick ===============
   ============================================================ */

if (typeof registerTimeListener === "function") {
  registerTimeListener(() => {

    // 1) Actualizar entregas pendientes
    if (typeof checkDeliveries === "function") {
      checkDeliveries();
    }

    // 2) Revisar si terminó un C-Check o D-Check
    updatePendingDeliveries();
    checkMaintenanceCompletion();

    // 3) Generar alertas (C & D approaching)
    checkMaintenanceAlerts();

    // 4) Refrescar tabla de flota (sin recargar HTML)
    if (typeof renderFleetTable === "function") {
      renderFleetTable();
    }

    console.log("⏱️ Fleet updated via ACS_TIME tick.");
  });
}

/* ============================================================
   === EMPTY ROW FALLBACK — ACS Qatar Luxury ===================
   === Muestra 4 filas vacías si no existe aún la flota ========
   ============================================================ */

function ensureEmptyRows() {
  const tbody = document.getElementById("fleetTableBody");

  // Leer flota real desde el KEY correcto del sistema
  const fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");

  // Si NO hay aviones, mostramos 4 filas placeholder
  if (fleet.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
      <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
      <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
      <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    `;
  }
}

/* === Integración con inicialización del módulo === */

document.addEventListener("DOMContentLoaded", () => {
  updatePendingDeliveries();
  populateFilterOptions();
  renderFleetTable();
  ensureEmptyRows();  // ← ADDED SAFELY
});

/* === Integración con el motor de tiempo ACS_TIME === */

if (typeof registerTimeListener === "function") {
  registerTimeListener(() => {
    updatePendingDeliveries();
    checkMaintenanceCompletion();
    renderFleetTable();
    ensureEmptyRows(); // ← ADDED SAFELY
    checkMaintenanceAlerts();
  });
}

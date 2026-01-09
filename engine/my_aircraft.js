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
   🟩 MYA-1 — BASE RESOLVER (Robusto)
   ------------------------------------------------------------
   Objetivo:
   - Evitar “bases fantasma” (ej. LIRN) por claves viejas
   - Tomar primero base guardada en la compra (pending entry)
   - Fallback a varias posibles claves de base
   ============================================================ */

function getCurrentBaseICAO() {
  // 1) Clave estándar esperada
  const b1 = JSON.parse(localStorage.getItem("ACS_Base") || "null");
  if (b1 && typeof b1 === "object" && b1.icao) return String(b1.icao).trim();

  // 2) Fallbacks comunes (por si otro módulo guarda distinto)
  const b2 = JSON.parse(localStorage.getItem("ACS_SelectedBase") || "null");
  if (b2 && typeof b2 === "object" && b2.icao) return String(b2.icao).trim();

  const b3 = JSON.parse(localStorage.getItem("ACS_BaseAirport") || "null");
  if (b3 && typeof b3 === "object" && b3.icao) return String(b3.icao).trim();

  const b4 = localStorage.getItem("ACS_BaseICAO");
  if (b4 && String(b4).trim()) return String(b4).trim();

  return "—";
}

/* ============================================================
   🟦 A8 — AIRCRAFT ENRICHMENT ENGINE (DB → FLEET)
   ------------------------------------------------------------
   • Copia specs técnicos desde ACS_AIRCRAFT_DB
   • Se ejecuta SOLO cuando el avión entra a la flota
   • No recalcula ni pisa datos existentes
   • Source of truth: ACS_MyAircraft
   ============================================================ */

function ACS_enrichAircraftFromDB(aircraft) {

  if (!aircraft || !aircraft.manufacturer || !aircraft.model) {
    console.warn("⚠️ Enrichment skipped: invalid aircraft object");
    return aircraft;
  }

  // Si ya fue enriquecido → NO tocar
  if (
    aircraft.seats !== undefined &&
    aircraft.speed_kts !== undefined &&
    aircraft.fuel_burn_kgph !== undefined
  ) {
    return aircraft;
  }

  // Buscar match exacto en el DB
  const match = Array.isArray(window.ACS_AIRCRAFT_DB)
    ? ACS_AIRCRAFT_DB.find(a =>
        a.manufacturer === aircraft.manufacturer &&
        a.model === aircraft.model
      )
    : null;

  if (!match) {
    console.warn(
      `⚠️ Aircraft DB match NOT FOUND for ${aircraft.manufacturer} ${aircraft.model}. Applying fallback values.`
    );

    // Fallback seguro (no rompe el juego)
    aircraft.seats = aircraft.seats ?? 50;
    aircraft.range_nm = aircraft.range_nm ?? 800;
    aircraft.speed_kts = aircraft.speed_kts ?? 250;
    aircraft.fuel_burn_kgph = aircraft.fuel_burn_kgph ?? 500;
    aircraft.price_acs_usd = aircraft.price_acs_usd ?? 1000000;

    return aircraft;
  }

  // Copiar SOLO specs técnicos
  aircraft.seats = aircraft.seats ?? match.seats;
  aircraft.range_nm = aircraft.range_nm ?? match.range_nm;
  aircraft.speed_kts = aircraft.speed_kts ?? match.speed_kts;
  aircraft.fuel_burn_kgph = aircraft.fuel_burn_kgph ?? match.fuel_burn_kgph;
  aircraft.price_acs_usd = aircraft.price_acs_usd ?? match.price_acs_usd;

  // Campos opcionales (informativos / futuro)
  aircraft.year = aircraft.year ?? match.year;
  aircraft.mtow_kg = aircraft.mtow_kg ?? match.mtow_kg;
  aircraft.engines = aircraft.engines ?? match.engines;

  console.log(
    `🟢 Aircraft enriched: ${aircraft.manufacturer} ${aircraft.model} — ${aircraft.seats} seats`
  );

  return aircraft;
}

/* ============================================================
   🟦 C.2 — Sync Pending Deliveries (Unified Table)
   ============================================================ */

function updatePendingDeliveries() {

  const now = getSimTime();

  let fleetActive  = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");
  let pendingRaw   = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

  const pendingForTable = [];
  const stillPending = [];
  let changed = false;

  pendingRaw.forEach(entry => {
    const d = new Date(entry.deliveryDate);

    if (now >= d) {

     // === Convertir a ACTIVO ===
       
  for (let i = 0; i < entry.qty; i++) {
     
  /* ============================================================
   🟧 MYA-A1 — ASSIGN REGISTRATION ON FLEET ENTRY
   Source: ACS Registration Manager
   ============================================================ */

let newAircraft = {
  registration: (typeof ACS_generateRegistration === "function")
    ? ACS_generateRegistration()
    : "—",

  manufacturer: entry.manufacturer,
  model: entry.model,
  family: entry.family || "",
  status: "Active",
  hours: 0,
  cycles: 0,
  condition: 100,
  nextC: "—",
  nextD: "—",
 // Base: prioridad = base guardada en la COMPRA (entry) > base actual (resolver)
  base: (entry.baseIcao || entry.base || getCurrentBaseICAO()),
  deliveredDate: d.toISOString(),
  deliveryDate: null,
  age: 0,

  /* ======================================================
     🛠 P5-A — B-CHECK INITIALIZATION (ON FLEET ENTRY)
     ====================================================== */
  enteredFleetAt: now.getTime(),
  bCheckDueAt:    now.getTime() + (7 * 24 * 60 * 60 * 1000),
  bCheckStatus:   "ok",
  bCheckPlanned:  false
};

/* 🔗 A9 — ENRICH FROM AIRCRAFT DB (ONE-TIME) */
if (typeof ACS_enrichAircraftFromDB === "function") {
  newAircraft = ACS_enrichAircraftFromDB(newAircraft);
}

fleetActive.push(newAircraft);
}

changed = true;

    } else {
      // === Todavía Pendiente → va a la tabla ===
       
      pendingForTable.push({
        registration: "—",
        model: entry.model,
        manufacturer: entry.manufacturer,
        family: entry.family || "",
        status: "Pending Delivery",
        hours: "—",
        cycles: "—",
        condition: "—",
        nextC: "—",
        nextD: "—",
        base: "—",
        deliveryDate: entry.deliveryDate
      });

      stillPending.push(entry);
    }
  });

  if (changed) {
    localStorage.setItem(ACS_FLEET_KEY, JSON.stringify(fleetActive));
  }

  localStorage.setItem("ACS_PendingAircraft", JSON.stringify(stillPending));

  // === UNIFICAR LISTAS ===
  fleet = [...pendingForTable, ...fleetActive];
}

// Actualizar requerimientos HR después de cambios en flota

if (typeof HR_updateRequirementsFromFleet === "function") {
  HR_updateRequirementsFromFleet();
}

/* ============================================================
   🟦 HR SAFETY INIT — Garantizar estructura ACS_HR
   ------------------------------------------------------------
   • Evita errores cuando ACS_HR no existe
   • Crea todos los departamentos con default = 0
   ============================================================ */

(function ensureHRexists() {

  const templateHR = {
    pilots_small:       { required: 0, hired: 0 },
    pilots_medium:      { required: 0, hired: 0 },
    pilots_large:       { required: 0, hired: 0 },
    pilots_verylarge:   { required: 0, hired: 0 },

    cabin_crew:         { required: 0, hired: 0 },
    maintenance:        { required: 0, hired: 0 },
    ground:             { required: 0, hired: 0 },
    flight_ops:         { required: 0, hired: 0 },
    safety:             { required: 0, hired: 0 },
    customer:           { required: 0, hired: 0 },

    // administrativos
    ceo:                { required: 0, hired: 1 },
    vp:                 { required: 0, hired: 0 },
    middle:             { required: 0, hired: 0 },
    economics:          { required: 0, hired: 0 },
    comms:              { required: 0, hired: 0 },
    admin:              { required: 0, hired: 0 }
  };

  let HR = JSON.parse(localStorage.getItem("ACS_HR") || "null");

  // Si no existe → lo creamos
  if (!HR || typeof HR !== "object") {
    localStorage.setItem("ACS_HR", JSON.stringify(templateHR));
    console.log("🟢 HR INIT: ACS_HR creado desde cero.");
    return;
  }

  // Si existe pero está incompleto → agregar faltantes
  let changed = false;
  for (let dep in templateHR) {
    if (!HR[dep]) {
      HR[dep] = templateHR[dep];
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem("ACS_HR", JSON.stringify(HR));
    console.log("🟡 HR INIT: ACS_HR actualizado (faltantes agregados).");
  }

})();

/* ============================================================
   🟦 HR SYNC ENGINE — Requirements Based on Fleet
   ------------------------------------------------------------
   • Calcula requerimientos de personal por cada avión activo
   • Actualiza ACS_HR.required para TODOS los departamentos
   • Compatible con Active / Pending / Future categories
   ============================================================ */

function HR_updateRequirementsFromFleet() {

  // === Cargar HR actual ===
   
  let HR = JSON.parse(localStorage.getItem("ACS_HR") || "{}") || {};

// === Reset required de todos los departamentos ===
   
for (let dep in HR) {
    if (!HR[dep] || typeof HR[dep] !== "object") continue;
    HR[dep].required = 0;
}

  // === Procesar flota activa real ===
   
  fleet.forEach(ac => {

    if (ac.status !== "Active") return; // solo activos

    const model = ac.model.toLowerCase();

    /* ======================================================
       ➤ RULESET — Pilots
       ====================================================== */

    let pilotDept = null;

    if (model.includes("atr") || model.includes("crj") || model.includes("erj") || model.includes("dh8")) {
      pilotDept = "pilots_small";
    }
    else if (model.includes("a320") || model.includes("a319") || model.includes("b737")) {
      pilotDept = "pilots_medium";
    }
    else if (model.includes("a330") || model.includes("b767") || model.includes("a310")) {
      pilotDept = "pilots_large";
    }
    else if (model.includes("a340") || model.includes("a350") || model.includes("b777") || model.includes("b787") || model.includes("a380") || model.includes("b747")) {
      pilotDept = "pilots_verylarge";
    }

    if (pilotDept && HR[pilotDept]) {
      HR[pilotDept].required += 4;  // 2 crew sets
    }

    /* ======================================================
       ➤ Cabin Crew
       ====================================================== */

    let crewNeeded = 0;

    if (model.includes("atr") || model.includes("dh8")) crewNeeded = 3;
    else if (model.includes("a320") || model.includes("b737")) crewNeeded = 4;
    else if (model.includes("a330") || model.includes("b767")) crewNeeded = 6;
    else if (model.includes("a340") || model.includes("b777") || model.includes("a350")) crewNeeded = 8;
    else if (model.includes("b747") || model.includes("a380")) crewNeeded = 12;

    if (HR["cabin_crew"]) HR["cabin_crew"].required += crewNeeded;

    /* ======================================================
       ➤ Maintenance
       ====================================================== */

    let maint = 2;

    if (model.includes("a330") || model.includes("b767")) maint = 3;
    if (model.includes("a350") || model.includes("b777") || model.includes("b787")) maint = 4;

    if (HR["maintenance"]) HR["maintenance"].required += maint;

    /* ======================================================
       ➤ Ground Handling
       ====================================================== */

    if (HR["ground"]) HR["ground"].required += 2;

    /* ======================================================
       ➤ Flight Ops
       ====================================================== */

    if (HR["flight_ops"]) HR["flight_ops"].required += 1;

    /* ======================================================
       ➤ Safety & Security
       ====================================================== */

    if (HR["safety"]) HR["safety"].required += 1;

    /* ======================================================
       ➤ Customer Service
       ====================================================== */

    if (HR["customer"]) HR["customer"].required += 1;

  });

  // === Guardar HR actualizado ===
  localStorage.setItem("ACS_HR", JSON.stringify(HR));

  // === Refrescar tabla HR si estás en hr.html ===
  if (typeof HR_renderTable === "function") {
    HR_renderTable();
  }
}

/* ============================================================
   🟦 C.3 — Render Full Fleet Table (Active + Pending)
   ============================================================ */

function renderFleetTable() {

  fleetTableBody.innerHTML = "";

  if (!fleet || fleet.length === 0) {
    ensureEmptyRows();
    return;
  }

  fleet.forEach(ac => {

    if (!passesFilters(ac)) return;

    const row = document.createElement("tr");

    if (ac.status === "Pending Delivery") {
      row.classList.add("pending-row");
    } else {
      row.classList.add("active-row");
    }

    row.innerHTML = `
      <td>${ac.registration}</td>
      <td>${ac.model}</td>

      <td class="${ac.status === "Pending Delivery" ? "pending-text" : "active-text"}">
        ${ac.status}
      </td>

      <td>${ac.hours}</td>
      <td>${ac.cycles}</td>

      <td>${ac.condition}${ac.condition !== "—" ? "%" : ""}</td>

      <td>${ac.nextC}</td>
      <td>${ac.nextD}</td>

      <td>${ac.base}</td>

      <td>
        <button class="btn-action" onclick="openAircraftModal('${ac.registration}')">View</button>
      </td>
    `;

    fleetTableBody.appendChild(row);
  });
}

/* ============================================================
   === FILTERS ================================================
   ============================================================ */

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

/* ============================================================
   === MODAL ===================================================
   ============================================================ */

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
  
  // Delivery Date (si está pendiente)
  if (ac.status === "Pending Delivery" && ac.deliveryDate) {
    const d = new Date(ac.deliveryDate);
    document.getElementById("mDeliveryDate").textContent =
      d.toUTCString().substring(5, 16);
  } else {
    document.getElementById("mDeliveryDate").textContent = "—";
  }

  // Delivered Date (si ya fue entregado)
  if (ac.deliveredDate) {
    const dd = new Date(ac.deliveredDate);
    document.getElementById("mDeliveredDate").textContent =
      dd.toUTCString().substring(5, 16);
  } else {
    document.getElementById("mDeliveredDate").textContent = "—";
  }

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

/* ============================================================
   === EMPTY ROWS (si no hay flota) ============================
   ============================================================ */

function ensureEmptyRows() {
  fleetTableBody.innerHTML = `
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr class="empty-row"><td>(empty)</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
  `;
}

/* ============================================================
   === INITIALIZATION =========================================
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // 1) Recargar flota activa
  fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");

  // Normalize aircraft data (registration + maintenance fields)
  if (typeof ACS_normalizeAircraft === "function") {
  fleet = fleet.map(ac => ACS_normalizeAircraft(ac));
}
   
  // 2) Procesar entregas pendientes
  updatePendingDeliveries();

  // 3) Filtros
  populateFilterOptions();

  // 4) Render tabla principal
  renderFleetTable();

  // 5) Si no hay flota → filas vacías
  if (fleet.length === 0) {
    ensureEmptyRows();
  }
});

/* ============================================================
   🟦 ACS — ENSURE AIRCRAFT ID (AC_xxx)
   Source of truth: ACS_MyAircraft
   ============================================================ */

(function normalizeAircraftIds() {

  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let changed = false;

  fleet.forEach((ac, index) => {
    if (!ac.id) {
      ac.id = `AC_${String(index + 1).padStart(4, "0")}`;
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    console.warn("🛠 Aircraft IDs normalized (AC_xxxx assigned)");
  }

})();

/* ============================================================
   === TIME ENGINE SYNC =======================================
   ============================================================ */

if (typeof registerTimeListener === "function") {

  registerTimeListener(() => {

    // 1) Recargar flota
    fleet = JSON.parse(localStorage.getItem(ACS_FLEET_KEY) || "[]");

    // 2) Procesar entregas pendientes
    updatePendingDeliveries();

    // 3) Renderizar tabla
    renderFleetTable();

    // 4) Si no hay flota → filas vacías
    if (fleet.length === 0) {
      ensureEmptyRows();
    }

    // 5) Actualizar requerimientos HR
    if (typeof HR_updateRequirementsFromFleet === "function") {
      HR_updateRequirementsFromFleet();
    }

  });

}

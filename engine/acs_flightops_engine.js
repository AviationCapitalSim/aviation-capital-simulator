/* ============================================================
   === ACS FLIGHT OPS ENGINE — Qatar Luxury Edition ============
   === Histórico 1940–2026 | Turnaround Real | Multi-Block =====
   === engine/acs_flightops_engine.js — 30 NOV 2025 ============
   ============================================================ */

console.log("🟦 ACS FlightOps Engine Loaded — Core v1.0");

/* ============================================================
   === NAMESPACE DEL MOTOR ====================================
   ============================================================ */

const ACS_FlightOps = {
  initialized: false,

  // Tiempo global
  simYear: 1940,

  // Flight Blocks en memoria
  blocks: [],

  // Índice por matrícula para schedule
  byTail: {},

  // Persistencia
  saveKey: "ACS_FlightBlocks"
};

/* ============================================================
   === INICIALIZADOR PRINCIPAL ================================
   ============================================================ */

ACS_FlightOps.initialize = function () {
  if (this.initialized) return;

  // Cargar bloques previos
  const saved = localStorage.getItem(this.saveKey);
  this.blocks = saved ? JSON.parse(saved) : [];

  this.refreshSimYear();
  this.initialized = true;

  console.log("🟩 FlightOps Engine: Initialization complete.");
};

/* ============================================================
   === SINCRONIZACIÓN CON EL MOTOR DE TIEMPO ==================
   ============================================================ */

ACS_FlightOps.refreshSimYear = function () {
  try {
    if (window.ACS_TIME?.currentTime instanceof Date) {
      this.simYear = window.ACS_TIME.currentTime.getUTCFullYear();
    }
  } catch (e) {
    console.warn("❗No fue posible sincronizar el año del Time Engine.");
  }
};

/* Listener directo del motor de tiempo */
if (typeof registerTimeListener === "function") {
  registerTimeListener(() => ACS_FlightOps.refreshSimYear());
}

/* ============================================================
   === GUARDADO GLOBAL ========================================
   ============================================================ */

ACS_FlightOps.save = function () {
  localStorage.setItem(this.saveKey, JSON.stringify(this.blocks));
};

/* ============================================================
   === OBTENER FLOTA REAL (My Aircraft) ========================
   ============================================================ */

ACS_FlightOps.getFleet = function () {
  return JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
};

/* ============================================================
   === OBTENER RUTAS CONFIRMADAS ===============================
   ============================================================ */

ACS_FlightOps.getConfirmedRoute = function () {
  return JSON.parse(localStorage.getItem("confirmedRoute") || "null");
};
/* ============================================================
   === TURNAROUND ENGINE — Real 1940–2026 ======================
   === Qatar Luxury Edition | Parte 2/5 ========================
   ============================================================ */

/*
  Este motor genera turnarounds reales usando:
  • Año histórico del simulador (1940–2026)
  • Categoría del avión (hélice, early-jet, jet clásico, widebody…)
  • Tecnología (pistón, turbohélice, turbojet, turbofan)
  • Caso especial: aviones gigantes (747 / A380)
*/

ACS_FlightOps.getRealTurnaround = function (aircraft) {

  if (!aircraft) return 60; // fallback seguro

  // 1) Determinar año global
  const year = this.simYear || new Date().getUTCFullYear();

  // 2) Detectar categorías según DB
  const seats = aircraft.seats || 50;
  const speed = aircraft.speed_kts || aircraft.speed || 300;

  const model = (aircraft.model || "").toUpperCase();
  const mfg = (aircraft.manufacturer || "").toUpperCase();

  // Clasificación rápida
  const isProp     = speed < 250;     // 1920–1960
  const isEarlyJet = speed >= 250 && speed < 420 && year < 1965;  // Comet, 707 primerísimas
  const isJet      = speed >= 420 && seats <= 200;                // A320, 737, DC-9
  const isWidebody = seats > 200 && seats <= 400;                 // 767, A330, A340
  const isHeavyWB  = seats > 400;                                 // 747, 777, A350
  const isUltraWB  = seats > 500;                                 // 747-8, A380

  let baseTA = 45; // base general moderna

  /* =============================================================
     ETAPA 1 — Años 1940–1959 (Hélice)
     ============================================================= */
  if (year <= 1959) {
    if (isProp) baseTA = 65;
    if (seats > 24) baseTA = 75;
    if (seats > 40) baseTA = 90;
  }

  /* =============================================================
     ETAPA 2 — 1960–1969 (Transition Jets)
     ============================================================= */
  else if (year <= 1969) {
    if (isProp) baseTA = 55;
    if (isEarlyJet) baseTA = 70;
    if (isJet) baseTA = 65;
  }

  /* =============================================================
     ETAPA 3 — 1970–1989 (Jet clásico)
     ============================================================= */
  else if (year <= 1989) {
    if (isJet) baseTA = 50;
    if (isWidebody) baseTA = 70;
    if (isHeavyWB) baseTA = 85;
  }

  /* =============================================================
     ETAPA 4 — 1990–2010 (Era moderna)
     ============================================================= */
  else if (year <= 2010) {
    if (isJet) baseTA = 45;
    if (isWidebody) baseTA = 60;
    if (isHeavyWB) baseTA = 75;
    if (isUltraWB) baseTA = 90;
  }

  /* =============================================================
     ETAPA 5 — 2011–2026 (ULR / A350-1000 / 787)
     ============================================================= */
  else {
    if (isJet) baseTA = 40;
    if (isWidebody) baseTA = 55;
    if (isHeavyWB) baseTA = 70;
    if (isUltraWB) baseTA = 85;
  }

  // Asegurarse que nunca sea menor de 30 min
  if (baseTA < 30) baseTA = 30;

  return baseTA;
};
/* ============================================================
   === FLIGHT BLOCK ENGINE — Qatar Luxury Edition ============
   === Parte 3/5 — Multi-Day Flight Blocks ====================
   ============================================================ */

ACS_FlightOps.buildFlightBlock = function(route, aircraftObj) {

  if (!route) return null;
  if (!aircraftObj) return null;

  const {
    origin,
    destination,
    departure,
    days,
    acType,
    flightNumberOut,
    flightNumberIn,
    optimized
  } = route;

  const turnMin = optimized
    ?  ACS_FlightOps.getRealTurnaround(aircraftObj) * 0.8   // Optimized rotation
    :  ACS_FlightOps.getRealTurnaround(aircraftObj);        // Normal rotation

  const depMin = ACS_FlightOps.toMin(departure);
  const distanceNM = ACS_FlightOps.calcDistanceNM(origin, destination);
  const speed = aircraftObj.speed_kts || 430;
  const blockTimeMin = Math.round((distanceNM / speed) * 60);

  // ID único para toda la semana
  const blockId = "FLB-" + Math.random().toString(36).substr(2, 9);

  // Arreglo final de vuelos
  const flights = [];

  days.forEach(day => {

    const arrMin = depMin + blockTimeMin;
    const rtrMin = arrMin + turnMin;

    flights.push({
      id: blockId + "-" + day,
      blockId,
      type: "flight",
      day,
      acType,
      tail: null,                 // se asigna en Schedule
      origin,
      destination,
      departure,
      arrival: ACS_FlightOps.toHHMM(arrMin),
      nextSlot: ACS_FlightOps.toHHMM(rtrMin),
      flightNumberOut,
      flightNumberIn,
      optimized,
      blockTimeMin,
      turnMin,
      distanceNM
    });
  });

  return flights;
};
/* ============================================================
   === FLIGHT BLOCK INJECTOR — Qatar Luxury Edition ============
   === Parte 4/5 — Insertar Bloques al Schedule ================
   ============================================================ */

ACS_FlightOps.pushBlockToSchedule = function(flights, tail) {

  if (!Array.isArray(flights) || flights.length === 0) {
    console.warn("⛔ No flight block received.");
    return false;
  }

  // Cargar schedule existente
  let schedule = JSON.parse(localStorage.getItem("scheduleItems") || "[]");

  // Validar solapamientos por día
  for (const f of flights) {
    f.tail = tail;

    const sameDay = schedule.filter(s => s.tail === tail && s.day === f.day);

    const dep = ACS_FlightOps.toMin(f.departure);
    const arr = ACS_FlightOps.toMin(f.arrival);
    const rtr = ACS_FlightOps.toMin(f.nextSlot);

    for (const ex of sameDay) {
      const exDep = ACS_FlightOps.toMin(ex.departure);
      const exArr = ACS_FlightOps.toMin(ex.arrival);
      const exRtr = ACS_FlightOps.toMin(ex.nextSlot);

      const overlap =
        (dep >= exDep && dep < exRtr) ||
        (arr > exDep && arr <= exRtr) ||
        (exDep >= dep && exDep < rtr);

      if (overlap) {
        alert(`⛔ Conflicto en ${f.day.toUpperCase()} con vuelo existente (${ex.flightNumberOut}).`);
        return false;
      }
    }
  }

  // Si no hay conflictos → insertar bloque entero
  flights.forEach(f => schedule.push(f));

  localStorage.setItem("scheduleItems", JSON.stringify(schedule));

  console.log("🟩 Block inserted:", flights);

  return true;
};
/* ============================================================
   === ACS SCHEDULE UI ENGINE — Qatar Luxury Edition ===========
   === Parte 5/5 — Dibujar Óvalos en la Tabla ==================
   ============================================================ */

console.log("🟦 ACS Schedule UI Engine Loaded");

/* ============================================================
   === CONFIG: DÍAS DE LA SEMANA ===============================
   ============================================================ */

const ACS_DAYS = ["mon","tue","wed","thu","fri","sat","sun"];
const ACS_DAY_INDEX = { mon:0, tue:1, wed:2, thu:3, fri:4, sat:5, sun:6 };

/* ============================================================
   === UTILIDADES ==============================================
   ============================================================ */

function ACS_minutesToHHMM(min) {
  const h = Math.floor(min/60);
  const m = min % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function ACS_toMin(hhmm) {
  const [h,m] = hhmm.split(":").map(Number);
  return h*60 + m;
}

/* ============================================================
   === ESTILO DEL ÓVALO — QATAR LUXURY =========================
   ============================================================ */

const OVAL_STYLE = `
  background: rgba(0,120,255,0.28);
  border: 2px solid #4ea7ff;
  color: #cfe9ff;
  padding: 6px 12px;
  border-radius: 18px;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  backdrop-filter: blur(3px);
  box-shadow: 0 0 12px rgba(0,120,255,0.35);
  position: absolute;
  z-index: 10;
  transition: transform .15s ease;
`;

const OVAL_STYLE_HOVER = `
  transform: scale(1.045);
  box-shadow: 0 0 18px rgba(0,150,255,0.55);
`;

/* ============================================================
   === DIBUJAR FILA COMPLETA DE UN AVIÓN =======================
   ============================================================ */

ACS_FlightOps.renderAircraftRow = function(tbody, ac, flights) {

  const tr = document.createElement("tr");
  tr.classList.add("acs-schedule-row");

  tr.innerHTML = `
    <td class="tail-cell">
      <strong>${ac.tail}</strong><br>
      <span style="font-size:0.8rem; opacity:0.75;">${ac.model}</span>
    </td>
    ${ACS_DAYS.map(() => `<td class="day-cell" style="position:relative;"></td>`).join("")}
    <td class="action-cell" style="text-align:center;">
      <button class="acs-btn" onclick="assignNewRoute('${ac.tail}')">Assign Route</button>
      <button class="acs-btn-info" onclick="openMaintenance('${ac.tail}')">Maintenance</button>
    </td>
  `;

  tbody.appendChild(tr);

  // Añadir los óvalos
  flights.forEach(f => {
    ACS_FlightOps.drawOval(tr, f);
  });
};

/* ============================================================
   === DIBUJAR ÓVALO SOBRE LA CELDA (Y UNIR DÍAS) ==============
   ============================================================ */

ACS_FlightOps.drawOval = function(tr, flight) {

  const startDay = flight.day; // mon, tue, wed, etc.
  const dayIndex = ACS_DAY_INDEX[startDay];

  const dep = ACS_toMin(flight.departure);
  const nxt = ACS_toMin(flight.nextSlot);

  const duration = nxt - dep;
  const cell = tr.children[1 + dayIndex]; // 0=tail, 1=lunes

  if (!cell) return;

  // Crear óvalo
  const oval = document.createElement("div");
  oval.className = "acs-schedule-oval";

  // Texto del número de vuelo (solo ida → vuelta)
  const label = `${flight.flightNumberOut} ⇄ ${flight.flightNumberIn}`;

  oval.innerHTML = label;
  oval.setAttribute("data-id", flight.id);
  oval.style.cssText = OVAL_STYLE;

  // Tiempo relativo dentro del día
  const topPos = (dep / 1440) * 100;    // porcentaje
  const height = (duration / 1440) * 100;

  oval.style.top = `${topPos}%`;
  oval.style.height = `${height}%`;
  oval.style.left = "4px";
  oval.style.right = "4px";

  // Hover
  oval.addEventListener("mouseenter", () => {
    oval.style.cssText = OVAL_STYLE + OVAL_STYLE_HOVER;
  });

  oval.addEventListener("mouseleave", () => {
    oval.style.cssText = OVAL_STYLE;
  });

  // Click → abrir modal con toda la información
  oval.addEventListener("click", () => {
    ACS_FlightOps.openFlightModal(flight);
  });

  // Insertar
  cell.appendChild(oval);
};

/* ============================================================
   === MODAL DE INFORMACIÓN DE VUELO ============================
   ============================================================ */

ACS_FlightOps.openFlightModal = function(flight) {

  const modal = document.getElementById("flightModal");
  const content = document.getElementById("flightModalContent");

  if (!modal || !content) {
    alert("⚠ Modal missing in HTML.");
    return;
  }

  // Informacion detallada real
  const dep = flight.departure;
  const arr = flight.arrival;
  const nxt = flight.nextSlot;

  content.innerHTML = `
    <div style="font-size:1.2rem; font-weight:600; color:#4ea7ff;">
      ${flight.flightNumberOut} ⇄ ${flight.flightNumberIn}
    </div>

    <div style="margin-top:6px; font-size:0.9rem;">
      <strong>Route:</strong> ${flight.origin} → ${flight.destination} → ${flight.origin}
    </div>

    <div><strong>Departure:</strong> ${dep}</div>
    <div><strong>Arrival:</strong> ${arr}</div>
    <div><strong>Next Slot:</strong> ${nxt}</div>

    <hr style="border-color:rgba(255,255,255,0.15); margin:10px 0;">

    <div><strong>Block Time:</strong> ${flight.blockTime} h</div>
    <div><strong>Turnaround:</strong> ${flight.turnaround} h</div>
    <div><strong>Total Rotation:</strong> ${flight.rotation} h</div>

    <hr style="border-color:rgba(255,255,255,0.15); margin:10px 0;">
    <div><strong>Status:</strong> ${flight.optimized ? "Optimized" : "Standard"}</div>
  `;

  modal.style.display = "flex";
};


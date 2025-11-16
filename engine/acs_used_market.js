/* ============================================================
   === ACS USED MARKET — v2.0 (Starter + Finance + Limits) ====
   ------------------------------------------------------------
   • 300 aviones usados iniciales (SOLO al inicio del juego)
   • Los 3 primeros aviones usados del jugador → ACTIVE inmediato
   • Luego: máx 3 operaciones (BUY/LEASE) por día sim
   • Integrado con:
        - ACS_Finance (ACS_addExpense)
        - ACS_Leasing (contratos USED)
        - MyAircraft (ACS_MyAircraft)
   • Sin más generación automática del sistema después del inicio
   ============================================================ */

/* ============ 1) CONSTANTES & STORAGE KEYS ================= */

const USED_POOL_KEY        = "ACS_UsedPool";          // pool inicial fijo
const USED_DAILY_KEY       = "ACS_UsedDaily";         // límite diario
const STARTER_COUNT_KEY    = "ACS_StarterUsedCount";  // 3 primeros aviones
let USED_YEAR              = 1940;
let USED_POOL              = [];
let usedGrid               = null;
let makerSelect            = null;

const USED_DAILY_LIMIT     = 3;   // máx operaciones usadas por día (después de los 3 iniciales)
const STARTER_MAX_AIRCRAFT = 3;   // primeros 3 aviones → ACTIVE inmediato

/* ============ 2) CATÁLOGO HISTÓRICO BASE =================== */
const HISTORICAL_CATALOG = [
  /* 1930–1950 */
  { name:"Douglas DC-3",             maker:"Douglas",          year:1936, img:"dc3.png",      price:  900000, lease:  18000 },
  { name:"Lockheed L-10 Electra",    maker:"Lockheed",         year:1935, img:"l10.png",      price:  750000, lease:  15000 },
  { name:"Junkers Ju-52",            maker:"Junkers",          year:1932, img:"ju52.png",     price:  650000, lease:  12000 },

  /* 1950–1965 */
  { name:"Douglas DC-6",             maker:"Douglas",          year:1956, img:"dc6.png",      price: 2400000, lease:  45000 },
  { name:"Sud Caravelle",            maker:"Sud Aviation",     year:1959, img:"caravelle.png",price: 6400000, lease: 125000 },

  /* 1958–1975 */
  { name:"Boeing 707-120",           maker:"Boeing",           year:1958, img:"b707.png",     price: 8000000, lease: 160000 },

  /* 1965–1985 */
  { name:"Boeing 727-200",           maker:"Boeing",           year:1967, img:"b727.png",     price:11000000, lease: 200000 },
  { name:"McDonnell Douglas DC-9-30",maker:"McDonnell Douglas",year:1967, img:"dc9.png",      price: 9500000, lease: 180000 },
  { name:"Boeing 737-200",           maker:"Boeing",           year:1968, img:"b732.png",     price: 8700000, lease: 160000 },

  /* 1970–1990 */
  { name:"Airbus A300B4",            maker:"Airbus",           year:1974, img:"a300.png",     price:24000000, lease: 300000 },

  /* 1985–2000 */
  { name:"Airbus A320-200",          maker:"Airbus",           year:1988, img:"a320.png",     price:32000000, lease: 350000 },
  { name:"Boeing 737-300",           maker:"Boeing",           year:1984, img:"b733.png",     price:19000000, lease: 240000 },
  { name:"MD-80",                    maker:"McDonnell Douglas",year:1980, img:"md80.png",     price:15500000, lease: 210000 },

  /* 1995–2025 */
  { name:"Boeing 737-800",           maker:"Boeing",           year:1998, img:"b738.png",     price:46000000, lease: 480000 },
  { name:"Airbus A321",              maker:"Airbus",           year:1994, img:"a321.png",     price:49000000, lease: 520000 },
  { name:"Embraer 190",              maker:"Embraer",          year:2004, img:"e190.png",     price:30000000, lease: 290000 },
  { name:"Bombardier CRJ-700",       maker:"Bombardier",       year:1999, img:"crj700.png",   price:24000000, lease: 220000 },
  { name:"ATR 72-500",               maker:"ATR",              year:1997, img:"atr72.png",    price:18000000, lease: 160000 }
];

/* ============ 3) HELPERS DE ALEATORIEDAD =================== */

function randomCondition() {
  const arr = ["A","B","C","D"];
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPriceFactor(cond) {
  switch (cond) {
    case "A": return 1.00 + Math.random()*0.05;
    case "B": return 0.90 + Math.random()*0.05;
    case "C": return 0.75 + Math.random()*0.07;
    case "D": return 0.60 + Math.random()*0.10;
  }
}

/* ============ 4) FINANCE / SIM DATE HELPERS ================ */

function getSimDateKey() {
  // Usamos la fecha del motor de tiempo si existe (ej: "01 JAN 1940")
  const simDate = localStorage.getItem("ACS_Sim_CurrentDate");
  if (simDate) return simDate;

  // Fallback: fecha real (YYYY-MM-DD)
  const d = new Date();
  return d.toISOString().substring(0, 10);
}

function isStarterPhase() {
  try {
    let capital = null;

    if (typeof ACS_getCapital === "function") {
      capital = ACS_getCapital();
    } else {
      const f = JSON.parse(localStorage.getItem("ACS_Finance") || "null");
      capital = f ? f.capital : null;
    }

    if (capital === null) return false;

    // Primer inicio: capital exactamente 3,000,000
    if (Math.round(capital) !== 3000000) return false;

    const count = parseInt(localStorage.getItem(STARTER_COUNT_KEY) || "0", 10);
    return count < STARTER_MAX_AIRCRAFT;
  } catch (e) {
    console.warn("Starter phase check error:", e);
    return false;
  }
}

function registerStarterAircraft() {
  const count = parseInt(localStorage.getItem(STARTER_COUNT_KEY) || "0", 10);
  localStorage.setItem(STARTER_COUNT_KEY, String(count + 1));
}

function canOperateUsedToday() {
  const key = getSimDateKey();
  const info = JSON.parse(localStorage.getItem(USED_DAILY_KEY) || "{}");
  const day  = info.day;
  let count  = info.count || 0;

  if (day !== key) {
    // Nuevo día → reseteamos contador
    count = 0;
  }

  return count < USED_DAILY_LIMIT;
}

function registerUsedOperation() {
  const key = getSimDateKey();
  let info = JSON.parse(localStorage.getItem(USED_DAILY_KEY) || "{}");

  if (info.day !== key) {
    info = { day: key, count: 0 };
  }

  info.count += 1;
  localStorage.setItem(USED_DAILY_KEY, JSON.stringify(info));
}

function addFinanceExpenseForUsed(type, amount) {
  // type sugerido: "slot_fees" para compras, "leasing" para leased
  if (typeof ACS_addExpense === "function" && amount > 0) {
    ACS_addExpense(type, amount);
  } else {
    // Fallback: tocamos capital directo si no está ACS_addExpense
    try {
      const f = JSON.parse(localStorage.getItem("ACS_Finance") || "null");
      if (!f) return;
      f.capital -= amount;
      if (!f.cost[type]) f.cost[type] = 0;
      f.cost[type] += amount;
      f.expenses += amount;
      localStorage.setItem("ACS_Finance", JSON.stringify(f));
    } catch (e) {
      console.warn("Finance fallback error:", e);
    }
  }
}

/* ============ 5) GENERAR INVENTARIO INICIAL (300) ========= */

function generateUsedInventoryForYear(year, count = 300) {
  const eligible = HISTORICAL_CATALOG.filter(a => a.year <= year);
  if (eligible.length === 0) return [];

  const list = [];
  for (let i = 0; i < count; i++) {
    const base  = eligible[Math.floor(Math.random() * eligible.length)];
    const age   = Math.max(1, year - base.year - Math.floor(Math.random()*3));
    const cond  = randomCondition();
    const hours = age * (700 + Math.random()*400);
    const cycles= age * (480 + Math.random()*220);
    const factor= randomPriceFactor(cond);

    list.push({
      id: "U" + (i+1),
      name: base.name,
      maker: base.maker,
      img: base.img,
      yearBuilt: year - age,
      age: age,
      condition: cond,
      hours: hours,
      cycles: cycles,
      price: Math.floor(base.price  * factor),
      lease: Math.floor(base.lease * factor)
    });
  }
  return list;
}

function loadOrCreateUsedPool() {
  const saved = localStorage.getItem(USED_POOL_KEY);
  if (saved) {
    USED_POOL = JSON.parse(saved);
    return;
  }

  // Solo la PRIMER vez que se entra al Used Market: creamos 300 aviones 1940
  USED_YEAR = 1940;
  USED_POOL = generateUsedInventoryForYear(USED_YEAR, 300);
  localStorage.setItem(USED_POOL_KEY, JSON.stringify(USED_POOL));
}

/* ============ 6) RENDER DE TARJETAS ======================= */

function renderUsed(filterMaker = "all") {
  if (!usedGrid) return;
  usedGrid.innerHTML = "";

  USED_POOL
    .filter(ac => filterMaker === "all" || ac.maker === filterMaker)
    .forEach(ac => {
      const card = document.createElement("div");
      card.className = "used-card";

      card.innerHTML = `
        <img src="img/${ac.img}" alt="${ac.name}">
        <h3>${ac.name}</h3>
        <p><b>Manufacturer:</b> ${ac.maker}</p>
        <p><b>Year Built:</b> ${ac.yearBuilt}</p>
        <p><b>Age:</b> ${ac.age} years</p>
        <p><b>Condition:</b> ${ac.condition}</p>
        <p><b>Hours:</b> ${Math.floor(ac.hours).toLocaleString()}</p>
        <p><b>Cycles:</b> ${Math.floor(ac.cycles).toLocaleString()}</p>
        <p><b>Price:</b> $${ac.price.toLocaleString()}</p>
        <p><b>Lease:</b> $${ac.lease.toLocaleString()}/mo</p>

        <button class="ac-btn ac-buy"   onclick="buyUsed('${ac.id}')">Buy Used</button>
        <button class="ac-btn ac-lease" onclick="leaseUsed('${ac.id}')">Lease Used</button>
        <button class="ac-btn ac-info"  onclick="openInfo('${ac.id}')">Info</button>
      `;
      usedGrid.appendChild(card);
    });
}

/* ============ 7) INIT DEL MERCADO ========================= */

function initUsedMarket() {
  usedGrid    = document.getElementById("usedGrid");
  makerSelect = document.getElementById("filterMaker");

  loadOrCreateUsedPool();
  renderUsed("all");

  // Llenar filtro de fabricantes
  if (makerSelect) {
    const makers = Array.from(new Set(USED_POOL.map(a => a.maker))).sort();
    makerSelect.innerHTML = `<option value="all">All</option>`;
    makers.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      makerSelect.appendChild(opt);
    });

    makerSelect.addEventListener("change", () => {
      renderUsed(makerSelect.value);
    });
  }
}

document.addEventListener("DOMContentLoaded", initUsedMarket);

/* ============ 8) MyAircraft STORAGE ======================= */

function loadMyAircraft() {
  return JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
}
function saveMyAircraft(arr) {
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(arr));
}

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/* ============ 9) BUY / LEASE USED ========================= */

function buyUsed(id) {
  const idx = USED_POOL.findIndex(a => a.id === id);
  if (idx === -1) return;

  const ac = USED_POOL[idx];

  const starter = isStarterPhase();
  if (!starter && !canOperateUsedToday()) {
    alert(`⚠️ Used market limit reached.\nOnly ${USED_DAILY_LIMIT} used operations per simulated day.`);
    return;
  }

  // FINANZAS: costo completo de compra
  addFinanceExpenseForUsed("slot_fees", ac.price);

  const arr = loadMyAircraft();

  const entry = {
    id: "MY_" + ac.id,
    name: ac.name,
    maker: ac.maker,
    type: "Used Purchase",
    status: starter ? "Active" : "Pending Delivery",
    acquired: new Date().toISOString(),
    deliveryDate: starter ? null : addDaysISO(15),
    price: ac.price,
    lease: null,
    img: ac.img,
    hours: ac.hours,
    cycles: ac.cycles,
    condition: ac.condition,
    yearBuilt: ac.yearBuilt
  };

  arr.push(entry);
  saveMyAircraft(arr);

  if (starter) {
    registerStarterAircraft();
    alert(`✔️ Starter aircraft acquired ACTIVE:\n${ac.name}`);
  } else {
    registerUsedOperation();
    alert(`✔️ Purchased ${ac.name}\nDelivery in 15 days`);
  }

  // Eliminamos el avión del pool
  USED_POOL.splice(idx, 1);
  localStorage.setItem(USED_POOL_KEY, JSON.stringify(USED_POOL));
  renderUsed(makerSelect ? makerSelect.value : "all");
}

function leaseUsed(id) {
  const idx = USED_POOL.findIndex(a => a.id === id);
  if (idx === -1) return;

  const ac = USED_POOL[idx];

  const starter = isStarterPhase();
  if (!starter && !canOperateUsedToday()) {
    alert(`⚠️ Used market limit reached.\nOnly ${USED_DAILY_LIMIT} used operations per simulated day.`);
    return;
  }

  // Integrar con sistema de contratos de leasing (si existe)
  // Ejemplo: 10 años = 120 meses
  if (typeof ACS_Leasing_createContract === "function") {
    ACS_Leasing_createContract(ac.name, ac.lease, 120, "USED", {
      hours: ac.hours,
      cycles: ac.cycles
    });
  }

  // No hay pago inicial por defecto, pero podrías añadirlo si quieres:
  // addFinanceExpenseForUsed("leasing", initialPayment);

  const arr = loadMyAircraft();

  const entry = {
    id: "MY_" + ac.id,
    name: ac.name,
    maker: ac.maker,
    type: "Used Lease",
    status: starter ? "Active" : "Pending Delivery",
    acquired: new Date().toISOString(),
    deliveryDate: starter ? null : addDaysISO(7),
    price: null,
    lease: ac.lease,
    img: ac.img,
    hours: ac.hours,
    cycles: ac.cycles,
    condition: ac.condition,
    yearBuilt: ac.yearBuilt
  };

  arr.push(entry);
  saveMyAircraft(arr);

  if (starter) {
    registerStarterAircraft();
    alert(`✔️ Starter leased aircraft ACTIVE:\n${ac.name}`);
  } else {
    registerUsedOperation();
    alert(`✔️ Leased ${ac.name}\nDelivery in 7 days`);
  }

  // Sacamos unidad del pool
  USED_POOL.splice(idx, 1);
  localStorage.setItem(USED_POOL_KEY, JSON.stringify(USED_POOL));
  renderUsed(makerSelect ? makerSelect.value : "all");
}

/* ============ 10) MODAL INFO ============================== */

function openInfo(id) {
  const ac = USED_POOL.find(a => a.id === id);
  if (!ac) return;

  const nameEl   = document.getElementById("modalName");
  const detailEl = document.getElementById("modalDetails");
  const modal    = document.getElementById("infoModal");

  if (!nameEl || !detailEl || !modal) return;

  nameEl.textContent = ac.name;
  detailEl.innerHTML = `
    <b>Manufacturer:</b> ${ac.maker}<br>
    <b>Year Built:</b> ${ac.yearBuilt}<br>
    <b>Age:</b> ${ac.age} years<br>
    <b>Condition:</b> ${ac.condition}<br>
    <b>Hours:</b> ${Math.floor(ac.hours).toLocaleString()}<br>
    <b>Cycles:</b> ${Math.floor(ac.cycles).toLocaleString()}<br>
    <b>Price:</b> $${ac.price.toLocaleString()}<br>
    <b>Lease:</b> $${ac.lease.toLocaleString()}/mo
  `;
  modal.style.display = "flex";
}

function closeInfoModal() {
  const modal = document.getElementById("infoModal");
  if (modal) modal.style.display = "none";
}

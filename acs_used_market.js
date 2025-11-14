/* ============================================================
   === ACS USED MARKET — VERSIÓN SIMPLE Y ESTABLE ==============
   ------------------------------------------------------------
   • Sin badges (no player / bank / system)
   • Filtro por fabricante en tiempo real
   • Año inicial = año del simulador (o 1940 si no hay motor)
   • SOLO cambia el mercado cuando cambia el AÑO
   • Compatible con MyAircraft (ACS_MyAircraft)
   ============================================================ */

/* ============ 1) VARIABLES GLOBALES ========================= */
let USED_YEAR = 1940;
let USED_POOL = [];
let usedGrid = null;
let makerSelect = null;

/* ============ 2) CATÁLOGO HISTÓRICO ========================= */
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

/* ============ 3) PEQUEÑOS HELPERS =========================== */
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

/* ============ 4) GENERAR INVENTARIO POR AÑO ================= */
function generateUsedInventoryForYear(year) {
  const eligible = HISTORICAL_CATALOG.filter(a => a.year <= year);
  if (eligible.length === 0) return [];

  const list = [];
  for (let i = 0; i < 20; i++) {
    const base = eligible[Math.floor(Math.random() * eligible.length)];
    const age  = Math.max(1, year - base.year - Math.floor(Math.random()*3));
    const cond = randomCondition();
    const hours  = age * (700 + Math.random()*400);
    const cycles = age * (480 + Math.random()*220);
    const factor = randomPriceFactor(cond);

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

/* ============ 5) RENDER ===================================== */
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

/* ============ 6) INICIALIZACIÓN ============================= */

// Llamado una sola vez al cargar la página
function initUsedMarket() {
  usedGrid    = document.getElementById("usedGrid");
  makerSelect = document.getElementById("filterMaker");

  // determinar año inicial a partir del motor de tiempo, si existe
  try {
    if (window.ACS_CYCLE && ACS_CYCLE.currentTime) {
      const now = new Date(ACS_CYCLE.currentTime);
      USED_YEAR = now.getUTCFullYear();
    } else {
      USED_YEAR = 1940; // fallback
    }
  } catch(e) {
    USED_YEAR = 1940;
  }

  USED_POOL = generateUsedInventoryForYear(USED_YEAR);
  renderUsed("all");

  if (makerSelect) {
    makerSelect.addEventListener("change", () => {
      renderUsed(makerSelect.value);
    });
  }

  // escuchar cambios de tiempo global (pero solo reaccionar si cambia el AÑO)
  if (typeof registerTimeListener === "function") {
    let lastYear = USED_YEAR;
    registerTimeListener((simTime) => {
      const d = simTime instanceof Date ? simTime : new Date(simTime);
      const y = d.getUTCFullYear();
      if (y !== lastYear) {
        lastYear = y;
        USED_YEAR = y;
        USED_POOL = generateUsedInventoryForYear(USED_YEAR);
        renderUsed(makerSelect ? makerSelect.value : "all");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initUsedMarket);

/* ============ 7) MyAircraft STORAGE ========================= */
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

/* ============ 8) BUY / LEASE ================================ */
function buyUsed(id) {
  const ac = USED_POOL.find(a => a.id === id);
  if (!ac) return;

  const arr = loadMyAircraft();
  arr.push({
    id: "MY_" + id,
    name: ac.name,
    maker: ac.maker,
    type: "Used Purchase",
    status: "Pending Delivery",
    acquired: new Date().toISOString(),
    deliveryDate: addDaysISO(15),
    price: ac.price,
    lease: null,
    img: ac.img,
    hours: ac.hours,
    cycles: ac.cycles,
    condition: ac.condition,
    yearBuilt: ac.yearBuilt
  });
  saveMyAircraft(arr);
  alert(`✔️ Purchased ${ac.name}\nDelivery in 15 days`);
}

function leaseUsed(id) {
  const ac = USED_POOL.find(a => a.id === id);
  if (!ac) return;

  const arr = loadMyAircraft();
  arr.push({
    id: "MY_" + id,
    name: ac.name,
    maker: ac.maker,
    type: "Used Lease",
    status: "Pending Delivery",
    acquired: new Date().toISOString(),
    deliveryDate: addDaysISO(7),
    price: null,
    lease: ac.lease,
    img: ac.img,
    hours: ac.hours,
    cycles: ac.cycles,
    condition: ac.condition,
    yearBuilt: ac.yearBuilt
  });
  saveMyAircraft(arr);
  alert(`✔️ Leased ${ac.name}\nDelivery in 7 days`);
}

/* ============ 9) MODAL INFO ================================ */
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

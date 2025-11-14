/* ============================================================
   === ACS USED MARKET — SYNC W/ GLOBAL TIME (LIFE REAL) =======
   Version: 14 NOV 2025 - Captain Francisco Edition
   ============================================================ */

/* ============================================================
   === SYNC — ONLY UPDATE IF YEAR CHANGES ======================
   ============================================================ */
let USED_YEAR = 1940;
let LAST_YEAR = 1940;

function updateUsedMarketYear(simTime) {
  if (!simTime) simTime = new Date();

  USED_YEAR = simTime.getUTCFullYear();

  // SOLO ACTUALIZAR SI EL AÑO CAMBIÓ
  if (USED_YEAR !== LAST_YEAR) {
    LAST_YEAR = USED_YEAR;

    console.log("📆 Used Market updated for new year:", USED_YEAR);

    rotateMarket();                 // Nuevo inventario SOLO cuando cambia el año
    renderUsed(makerSelect.value);  // Mantener filtro actual
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof registerTimeListener === "function") {
    registerTimeListener(updateUsedMarketYear);
  } else {
    updateUsedMarketYear(new Date());
  }
});

/* ============================================================
   2) HISTORICAL CATALOG (1930–2025)
   ============================================================ */
const HISTORICAL_CATALOG = [
  /* === 1930–1950 === */
  { name:"Douglas DC-3", maker:"Douglas", year:1936, img:"dc3.png", price:900000, lease:18000 },
  { name:"Lockheed L-10 Electra", maker:"Lockheed", year:1935, img:"l10.png", price:750000, lease:15000 },
  { name:"Junkers Ju-52", maker:"Junkers", year:1932, img:"ju52.png", price:650000, lease:12000 },

  /* === 1950–1965 === */
  { name:"Douglas DC-6", maker:"Douglas", year:1956, img:"dc6.png", price:2400000, lease:45000 },
  { name:"Sud Caravelle", maker:"Sud Aviation", year:1959, img:"caravelle.png", price:6400000, lease:125000 },

  /* === 1958–1975 === */
  { name:"Boeing 707-120", maker:"Boeing", year:1958, img:"b707.png", price:8000000, lease:160000 },

  /* === 1965–1985 === */
  { name:"Boeing 727-200", maker:"Boeing", year:1967, img:"b727.png", price:11000000, lease:200000 },
  { name:"McDonnell Douglas DC-9-30", maker:"McDonnell Douglas", year:1967, img:"dc9.png", price:9500000, lease:180000 },
  { name:"Boeing 737-200", maker:"Boeing", year:1968, img:"b732.png", price:8700000, lease:160000 },

  /* === 1970–1990 === */
  { name:"Airbus A300B4", maker:"Airbus", year:1974, img:"a300.png", price:24000000, lease:300000 },

  /* === 1985–2000 === */
  { name:"Airbus A320-200", maker:"Airbus", year:1988, img:"a320.png", price:32000000, lease:350000 },
  { name:"Boeing 737-300", maker:"Boeing", year:1984, img:"b733.png", price:19000000, lease:240000 },
  { name:"MD-80", maker:"McDonnell Douglas", year:1980, img:"md80.png", price:15500000, lease:210000 },

  /* === 1995–2025 === */
  { name:"Boeing 737-800", maker:"Boeing", year:1998, img:"b738.png", price:46000000, lease:480000 },
  { name:"Airbus A321", maker:"Airbus", year:1994, img:"a321.png", price:49000000, lease:520000 },
  { name:"Embraer 190", maker:"Embraer", year:2004, img:"e190.png", price:30000000, lease:290000 },
  { name:"Bombardier CRJ-700", maker:"Bombardier", year:1999, img:"crj700.png", price:24000000, lease:220000 },
  { name:"ATR 72-500", maker:"ATR", year:1997, img:"atr72.png", price:18000000, lease:160000 }
];

/* ============================================================
   3) RANDOM HELPERS
   ============================================================ */
function randomCondition() {
  return ["A","B","C","D"][Math.floor(Math.random()*4)];
}

function randomPriceFactor(c) {
  if (c==="A") return 1.00 + Math.random()*0.05;
  if (c==="B") return 0.90 + Math.random()*0.05;
  if (c==="C") return 0.75 + Math.random()*0.07;
  return 0.60 + Math.random()*0.10;
}

/* ============================================================
   4) GENERATE INVENTORY ACCORDING TO YEAR
   ============================================================ */
function generateUsedInventory() {
  const eligible = HISTORICAL_CATALOG.filter(a => a.year <= USED_YEAR);
  let list = [];

  for (let i = 0; i < 20; i++) {
    let base = eligible[Math.floor(Math.random() * eligible.length)];
    let age = Math.max(1, USED_YEAR - base.year - Math.floor(Math.random()*3));
    let cond = randomCondition();
    let hours = age * (700 + Math.random()*400);
    let cycles = age * (480 + Math.random()*220);

    list.push({
      id: "U" + (i+1),
      name: base.name,
      maker: base.maker,
      img: base.img,
      yearBuilt: USED_YEAR - age,
      age: age,
      condition: cond,
      hours: hours,
      cycles: cycles,
      price: Math.floor(base.price * randomPriceFactor(cond)),
      lease: Math.floor(base.lease * randomPriceFactor(cond))
    });
  }

  return list;
}

/* ============================================================
   5) MARKET ROTATION = EVERY YEAR CHANGE
   ============================================================ */
let USED_POOL = [];

function rotateMarket() {
  USED_POOL = generateUsedInventory();
  renderUsed(makerSelect.value);
}

/* ============================================================
   6) FILTER + RENDER
   ============================================================ */
const usedGrid = document.getElementById("usedGrid");
const makerSelect = document.getElementById("filterMaker");

function renderUsed(filter = "all") {
  if (!usedGrid) return;

  usedGrid.innerHTML = "";

  USED_POOL
    .filter(ac => filter==="all" || ac.maker===filter)
    .forEach(ac => {

      let card = document.createElement("div");
      card.className = "used-card";

      card.innerHTML = `
        <img src="img/${ac.img}">
        <h3>${ac.name}</h3>
        <p><b>Manufacturer:</b> ${ac.maker}</p>
        <p><b>Year Built:</b> ${ac.yearBuilt}</p>
        <p><b>Age:</b> ${ac.age} years</p>
        <p><b>Condition:</b> ${ac.condition}</p>
        <p><b>Hours:</b> ${Math.floor(ac.hours).toLocaleString()}</p>
        <p><b>Cycles:</b> ${Math.floor(ac.cycles).toLocaleString()}</p>
        <p><b>Price:</b> $${ac.price.toLocaleString()}</p>
        <p><b>Lease:</b> $${ac.lease.toLocaleString()}/mo</p>

        <button class="ac-btn ac-buy" onclick="buyUsed('${ac.id}')">Buy Used</button>
        <button class="ac-btn ac-lease" onclick="leaseUsed('${ac.id}')">Lease Used</button>
        <button class="ac-btn ac-info" onclick="openInfo('${ac.id}')">Info</button>
      `;

      usedGrid.appendChild(card);
    });
}

makerSelect.addEventListener("change", () => {
  renderUsed(makerSelect.value);
});

/* ============================================================
   7) BUY & LEASE → MyAircraft
   ============================================================ */
function loadMyAircraft() {
  return JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
}
function saveMyAircraft(arr) {
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(arr));
}

function deliveryDate(days) {
  let t = new Date();
  t.setDate(t.getDate() + days);
  return t.toISOString();
}

function buyUsed(id){
  let ac = USED_POOL.find(x=>x.id===id);
  if (!ac) return;

  let arr = loadMyAircraft();
  arr.push({
    id: "MY_"+id,
    name: ac.name,
    maker: ac.maker,
    type: "Used Purchase",
    status: "Pending Delivery",
    acquired: new Date().toISOString(),
    deliveryDate: deliveryDate(15),
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

function leaseUsed(id){
  let ac = USED_POOL.find(x=>x.id===id);
  if (!ac) return;

  let arr = loadMyAircraft();
  arr.push({
    id: "MY_"+id,
    name: ac.name,
    maker: ac.maker,
    type: "Used Lease",
    status: "Pending Delivery",
    acquired: new Date().toISOString(),
    deliveryDate: deliveryDate(7),
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

/* ============================================================
   8) INFO MODAL
   ============================================================ */
function openInfo(id){
  let ac = USED_POOL.find(x=>x.id===id);
  if (!ac) return;

  document.getElementById("modalName").textContent = ac.name;
  document.getElementById("modalDetails").innerHTML = `
    <b>Manufacturer:</b> ${ac.maker}<br>
    <b>Year Built:</b> ${ac.yearBuilt}<br>
    <b>Age:</b> ${ac.age}<br>
    <b>Condition:</b> ${ac.condition}<br>
    <b>Hours:</b> ${Math.floor(ac.hours).toLocaleString()}<br>
    <b>Cycles:</b> ${Math.floor(ac.cycles).toLocaleString()}<br>
    <b>Price:</b> $${ac.price.toLocaleString()}<br>
    <b>Lease:</b> $${ac.lease.toLocaleString()}/mo
  `;
  document.getElementById("infoModal").style.display = "flex";
}

function closeInfoModal(){
  document.getElementById("infoModal").style.display = "none";
}

/* ============================================================
   === ACS USED MARKET — FULL EDITION ==========================
   Version: FINAL | Date: 14 NOV 2025
   ------------------------------------------------------------
   • Dynamic aircraft availability per in-game year
   • Full historical catalog (1930–2025)
   • Condition: A/B/C/D
   • Hours + Cycles realistic
   • Market rotation every 48 sim hours
   • Buy Used → 15 days delivery
   • Lease Used → 7 days delivery
   • Integrated with MyAircraft
   • Modal + Filters + Rendering
   ============================================================ */

/* ============================================================
   1) SIMULATION TIME HANDLING (SAFE)
   ============================================================ */
function getSimTime() {
  try {
    if (window.ACS_CYCLE && ACS_CYCLE.currentTime) {
      return new Date(ACS_CYCLE.currentTime);
    }
  } catch (e) {}
  return new Date();
}
function getSimYear() {
  return getSimTime().getUTCFullYear();
}

/* ============================================================
   2) HISTORICAL CATALOG (1930–2025)
   ============================================================ */
const HISTORICAL_CATALOG = [
  /* === 1930–1950 === */
  { name:"Douglas DC-3", maker:"Douglas", year:1936, img:"dc3.png", price:900000, lease:18000 },
  { name:"Lockheed L-10 Electra", maker:"Lockheed", year:1935, img:"l10.png", price:750000, lease:15000 },
  { name:"Junkers Ju-52", maker:"Junkers", year:1932, img:"ju52.png", price:650000, lease:12000 },

  /* === 1950–1970 === */
  { name:"Douglas DC-6", maker:"Douglas", year:1956, img:"dc6.png", price:2400000, lease:45000 },
  { name:"Boeing 707-120", maker:"Boeing", year:1958, img:"b707.png", price:8000000, lease:160000 },
  { name:"Sud Caravelle", maker:"Sud Aviation", year:1959, img:"caravelle.png", price:6400000, lease:125000 },

  /* === 1970–1985 === */
  { name:"Boeing 727-200", maker:"Boeing", year:1967, img:"b727.png", price:11000000, lease:200000 },
  { name:"McDonnell Douglas DC-9-30", maker:"McDonnell Douglas", year:1967, img:"dc9.png", price:9500000, lease:180000 },
  { name:"Boeing 737-200", maker:"Boeing", year:1968, img:"b732.png", price:8700000, lease:160000 },

  /* === 1985–2000 === */
  { name:"Airbus A300B4", maker:"Airbus", year:1974, img:"a300.png", price:24000000, lease:300000 },
  { name:"Airbus A320-200", maker:"Airbus", year:1988, img:"a320.png", price:32000000, lease:350000 },
  { name:"Boeing 737-300", maker:"Boeing", year:1984, img:"b733.png", price:19000000, lease:240000 },
  { name:"MD-80", maker:"McDonnell Douglas", year:1980, img:"md80.png", price:15500000, lease:210000 },

  /* === 2000–2025 === */
  { name:"Boeing 737-800", maker:"Boeing", year:1998, img:"b738.png", price:46000000, lease:480000 },
  { name:"Airbus A321", maker:"Airbus", year:1994, img:"a321.png", price:49000000, lease:520000 },
  { name:"Embraer 190", maker:"Embraer", year:2004, img:"e190.png", price:30000000, lease:290000 },
  { name:"Bombardier CRJ-700", maker:"Bombardier", year:1999, img:"crj700.png", price:24000000, lease:220000 },
  { name:"ATR 72-500", maker:"ATR", year:1997, img:"atr72.png", price:18000000, lease:160000 }
];

/* ============================================================
   3) RANDOM HELPERS
   ============================================================ */
function pickOrigin() {
  const list = ["system", "bank", "player", "return"];
  return list[Math.floor(Math.random() * list.length)];
}

function randomPriceFactor(condition) {
  switch (condition) {
    case "A": return 1.00 + Math.random() * 0.05;
    case "B": return 0.90 + Math.random() * 0.05;
    case "C": return 0.75 + Math.random() * 0.07;
    case "D": return 0.60 + Math.random() * 0.10;
  }
}

/* ============================================================
   4) GENERATE USED INVENTORY BASED ON YEAR
   ============================================================ */
function generateUsedInventory() {
  const year = getSimYear();
  const eligible = HISTORICAL_CATALOG.filter(ac => ac.year <= year);
  let list = [];

  for (let i = 0; i < 20; i++) {
    let base = eligible[Math.floor(Math.random() * eligible.length)];
    let simYear = getSimYear();
    let age = Math.max(1, simYear - base.year - Math.floor(Math.random() * 4));

    let conditionList = ["A", "B", "C", "D"];
    let cond = conditionList[Math.floor(Math.random() * 4)];

    let hours = age * (700 + Math.random() * 400);
    let cycles = age * (480 + Math.random() * 220);
    let factor = randomPriceFactor(cond);

    list.push({
      id: "U" + (i + 1),
      name: base.name,
      maker: base.maker,
      yearBuilt: simYear - age,
      age: age,
      condition: cond,
      hours: hours,
      cycles: cycles,
      origin: pickOrigin(),
      img: base.img,
      price: Math.floor(base.price * factor),
      lease: Math.floor(base.lease * factor)
    });
  }

  return list;
}

/* ============================================================
   5) MARKET ROTATION (every 48 sim hours)
   ============================================================ */
function shouldRotateMarket() {
  let last = localStorage.getItem("ACS_Used_LastRotation");
  if (!last) {
    localStorage.setItem("ACS_Used_LastRotation", getSimTime().toISOString());
    return true;
  }
  let lastDate = new Date(last);
  let now = getSimTime();
  let diff = (now - lastDate) / 36e5;
  return diff >= 48;
}

function rotateMarket() {
  USED_POOL = generateUsedInventory();
  localStorage.setItem("ACS_Used_LastPool", JSON.stringify(USED_POOL));
  localStorage.setItem("ACS_Used_LastRotation", getSimTime().toISOString());
}

/* ============================================================
   6) INITIALIZE USED POOL
   ============================================================ */
let USED_POOL = [];
if (shouldRotateMarket()) {
  rotateMarket();
} else {
  USED_POOL = JSON.parse(localStorage.getItem("ACS_Used_LastPool") || "[]");
  if (USED_POOL.length === 0) rotateMarket();
}

/* ============================================================
   7) RENDER ENGINE
   ============================================================ */
const usedGrid = document.getElementById("usedGrid");
const tabs = document.querySelectorAll(".used-tab");

function renderUsed(filter = "all") {
  usedGrid.innerHTML = "";

  USED_POOL.filter(ac => filter === "all" || ac.origin === filter)
           .forEach(ac => {
    const card = document.createElement("div");
    card.className = "used-card";

    card.innerHTML = `
      <span class="badge">${ac.origin.toUpperCase()}</span>
      <img src="img/${ac.img}">
      <h3>${ac.name}</h3>
      <p>Age: ${ac.age} yrs</p>
      <p>Condition: ${ac.condition}</p>
      <p>Hours: ${Math.floor(ac.hours).toLocaleString()}</p>
      <p>Cycles: ${Math.floor(ac.cycles).toLocaleString()}</p>
      <p>Price: $${ac.price.toLocaleString()}</p>
      <p>Lease: $${ac.lease.toLocaleString()}/mo</p>

      <button class="ac-btn ac-buy" onclick="buyUsed('${ac.id}')">Buy Used</button>
      <button class="ac-btn ac-lease" onclick="leaseUsed('${ac.id}')">Lease Used</button>
      <button class="ac-btn" style="background:#ffb300;color:#000;"
              onclick="openInfo('${ac.id}')">Info</button>
    `;

    usedGrid.appendChild(card);
  });
}

renderUsed();

/* === Tab Behavior === */
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderUsed(tab.dataset.filter);
  });
});

/* ============================================================
   8) STORAGE HELPERS
   ============================================================ */
function loadMyAircraft() {
  return JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
}
function saveMyAircraft(arr) {
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(arr));
}
function createDeliveryDate(days) {
  let now = getSimTime();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

/* ============================================================
   9) BUY / LEASE ACTIONS
   ============================================================ */
function buyUsed(id) {
  const ac = USED_POOL.find(a => a.id === id);
  const arr = loadMyAircraft();

  arr.push({
    id: "MY-" + id,
    name: ac.name,
    maker: ac.maker,
    type: "Used Purchase",
    acquired: getSimTime().toISOString(),
    deliveryDate: createDeliveryDate(15),
    deliveryDays: 15,
    status: "Pending Delivery",
    price: ac.price,
    lease: null,
    img: ac.img,
    hours: ac.hours,
    cycles: ac.cycles,
    condition: ac.condition
  });

  saveMyAircraft(arr);
  alert(`✔️ Purchased ${ac.name}\nDelivery in 15 days`);
}

function leaseUsed(id) {
  const ac = USED_POOL.find(a => a.id === id);
  const arr = loadMyAircraft();

  arr.push({
    id: "MY-" + id,
    name: ac.name,
    maker: ac.maker,
    type: "Used Lease",
    acquired: getSimTime().toISOString(),
    deliveryDate: createDeliveryDate(7),
    deliveryDays: 7,
    status: "Pending Delivery",
    price: null,
    lease: ac.lease,
    img: ac.img,
    hours: ac.hours,
    cycles: ac.cycles,
    condition: ac.condition
  });

  saveMyAircraft(arr);
  alert(`✔️ Leased ${ac.name}\nDelivery in 7 days`);
}

/* ============================================================
   10) MODAL INFO
   ============================================================ */
function openInfo(id) {
  const ac = USED_POOL.find(a => a.id === id);
  document.getElementById("modalName").textContent = ac.name;

  document.getElementById("modalDetails").innerHTML = `
    Maker: ${ac.maker}<br>
    Year Built: ${ac.yearBuilt}<br>
    Condition: ${ac.condition}<br>
    Hours: ${Math.floor(ac.hours).toLocaleString()}<br>
    Cycles: ${Math.floor(ac.cycles).toLocaleString()}<br>
    Price: $${ac.price.toLocaleString()}<br>
    Lease: $${ac.lease.toLocaleString()}/month
  `;

  document.getElementById("infoModal").style.display = "flex";
}

function closeInfoModal() {
  document.getElementById("infoModal").style.display = "none";
}

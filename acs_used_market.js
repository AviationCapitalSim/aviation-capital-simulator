/* ============================================================
   === ACS USED MARKET - PHASE 2 ENGINE =======================
   Version: 2.0 | Date: 14 NOV 2025
   ------------------------------------------------------------
   ▪ Integration with MyAircraft (localStorage)
   ▪ Pending Delivery System (7–15 days)
   ▪ Reads ACS current simulation time (safe fallback)
   ============================================================ */

/* ===== SAFE TIME HANDLER =================================== */
function getSimTime() {
  try {
    if (window.ACS_CYCLE && ACS_CYCLE.currentTime) {
      return new Date(ACS_CYCLE.currentTime);
    }
  } catch (e) {}
  return new Date(); // fallback real time
}

/* ===== LOAD MY AIRCRAFT STORAGE ============================ */
function loadMyAircraft() {
  return JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
}
function saveMyAircraft(arr) {
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(arr));
}

/* ===== USED MARKET POOL ==================================== */
const usedGrid = document.getElementById("usedGrid");
const tabs = document.querySelectorAll(".used-tab");

/* SAMPLE POOL: 20 aircraft (same as Phase 1) */
const USED_POOL = [
  { id:"u1", name:"Airbus A320-200", maker:"Airbus", origin:"system", age:8,  price:29800000, lease:178000, img:"a320.png" },
  { id:"u2", name:"Boeing 737-300",  maker:"Boeing", origin:"bank",   age:15, price:18500000, lease:120000, img:"b733.png" },
  { id:"u3", name:"Embraer 190",     maker:"Embraer",origin:"player", age:6,  price:22500000, lease:150000, img:"e190.png" },
  { id:"u4", name:"CRJ-700",         maker:"Bombardier",origin:"return", age:11,price:15000000, lease:110000, img:"crj700.png" },
  { id:"u5", name:"ATR 72-500",      maker:"ATR",     origin:"system", age:9,  price:14000000, lease:95000, img:"atr72.png" }
];

/* Duplicate to reach 20 items */
while (USED_POOL.length < 20) {
  let base = USED_POOL[USED_POOL.length % 5];
  let clone = JSON.parse(JSON.stringify(base));
  clone.id = "u" + (USED_POOL.length + 1);
  USED_POOL.push(clone);
}

/* ============================================================
   === DELIVERY SYSTEM =========================================
   ============================================================ */
function createDeliveryDate(days) {
  let now = getSimTime();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

/* ============================================================
   === BUY USED ================================================
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
    hours: 0,
    cycles: 0
  });

  saveMyAircraft(arr);
  alert(`✔️ Purchased ${ac.name}\nDelivery in 15 days`);
}

/* ============================================================
   === LEASE USED ==============================================
   ============================================================ */
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
    hours: 0,
    cycles: 0
  });

  saveMyAircraft(arr);
  alert(`✔️ Leased ${ac.name}\nDelivery in 7 days`);
}

/* ============================================================
   === MODAL ====================================================
   ============================================================ */
function openInfo(id) {
  const ac = USED_POOL.find(a => a.id === id);
  document.getElementById("modalName").textContent = ac.name;
  document.getElementById("modalDetails").innerHTML = `
    Maker: ${ac.maker}<br>
    Age: ${ac.age} years<br>
    Price: $${ac.price.toLocaleString()}<br>
    Lease: $${ac.lease.toLocaleString()}/month
  `;
  document.getElementById("infoModal").style.display = "flex";
}

function closeInfoModal() {
  document.getElementById("infoModal").style.display = "none";
}

/* ============================================================
   === RENDER CARDS ============================================
   ============================================================ */
function renderUsed(filter = "all") {
  usedGrid.innerHTML = "";

  USED_POOL.filter(ac => filter === "all" || ac.origin === filter)
           .forEach(ac => {
    let div = document.createElement("div");
    div.className = "used-card";

    div.innerHTML = `
      <span class="badge">${ac.origin.toUpperCase()}</span>
      <img src="img/${ac.img}">
      <h3>${ac.name}</h3>
      <p>Age: ${ac.age} yrs</p>
      <p>Price: $${ac.price.toLocaleString()}</p>
      <p>Lease: $${ac.lease.toLocaleString()}/mo</p>

      <button class="ac-btn ac-buy" onclick="buyUsed('${ac.id}')">Buy Used</button>
      <button class="ac-btn ac-lease" onclick="leaseUsed('${ac.id}')">Lease Used</button>
      <button class="ac-btn" style="background:#ffb300;color:#000;" onclick="openInfo('${ac.id}')">Info</button>
    `;
    usedGrid.appendChild(div);
  });
}

renderUsed();

/* ============================================================
   === TABS / FILTER HANDLER ===================================
   ============================================================ */
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderUsed(tab.dataset.filter);
  });
});

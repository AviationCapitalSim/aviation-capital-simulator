/* ============================================================
   === ACS USED MARKET - PHASE 1 ENGINE =======================
   Version: 1.0 | Date: 14 NOV 2025
   ============================================================ */

const usedGrid = document.getElementById("usedGrid");
const tabs = document.querySelectorAll(".used-tab");

/* ===== SAMPLE USED INVENTORY (20 aircraft) ===== */
const USED_POOL = [
  {
    id: "u1",
    name: "Airbus A320-200",
    maker: "Airbus",
    origin: "system",
    age: 8,
    price: 29800000,
    lease: 178000,
    img: "a320.png"
  },
  {
    id: "u2",
    name: "Boeing 737-300",
    maker: "Boeing",
    origin: "bank",
    age: 15,
    price: 18500000,
    lease: 120000,
    img: "b733.png"
  },
  {
    id: "u3",
    name: "Embraer 190",
    maker: "Embraer",
    origin: "player",
    age: 6,
    price: 22500000,
    lease: 150000,
    img: "e190.png"
  },
  {
    id: "u4",
    name: "Bombardier CRJ-700",
    maker: "Bombardier",
    origin: "return",
    age: 11,
    price: 15000000,
    lease: 110000,
    img: "crj700.png"
  },
  {
    id: "u5",
    name: "ATR 72-500",
    maker: "ATR",
    origin: "system",
    age: 9,
    price: 14000000,
    lease: 95000,
    img: "atr72.png"
  }
];

/* ===== Duplicate to create 20 items ===== */
while (USED_POOL.length < 20) {
  let clone = JSON.parse(JSON.stringify(USED_POOL[USED_POOL.length % 5]));
  clone.id = "u" + (USED_POOL.length + 1);
  USED_POOL.push(clone);
}

/* ============================================================
   === RENDER CARDS ===========================================
   ============================================================ */
function renderUsed(filter = "all") {
  usedGrid.innerHTML = "";

  USED_POOL.filter(ac => filter === "all" || ac.origin === filter)
           .forEach(ac => {
    let card = document.createElement("div");
    card.className = "used-card";

    card.innerHTML = `
      <span class="badge">${ac.origin.toUpperCase()}</span>
      <img src="img/${ac.img}" alt="${ac.name}">
      <h3>${ac.name}</h3>
      <p>Age: ${ac.age} yrs</p>
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

/* ============================================================
   === TABS / FILTER LOGIC ====================================
   ============================================================ */
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderUsed(tab.dataset.filter);
  });
});

/* ============================================================
   === MODAL: VIEW INFO =======================================
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
   === BUY & LEASE ACTIONS ====================================
   ============================================================ */

function buyUsed(id) {
  const ac = USED_POOL.find(a => a.id === id);
  alert(`✔️ Purchased ${ac.name}\nDelivery: 15 days`);
}

function leaseUsed(id) {
  const ac = USED_POOL.find(a => a.id === id);
  alert(`✔️ Leased ${ac.name}\nDelivery: 7 days`);
}

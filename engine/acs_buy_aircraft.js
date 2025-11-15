/* ============================================================
   === ACS BUY NEW AIRCRAFT ENGINE — CARDS VERSION (v2.1) =====
   ============================================================ 
   ✈ Mejoras v2.1:
   • Motores compactos integrados en tarjetas (EngineLine)
   • Compatible con DB original (no se modifica)
   • Filtros por época y fabricante
   • Modal profesional "View Options"
   • BUY / LEASE con backlog y slots reales
   • Auto-delivery en Time Engine
   ============================================================ */

console.log("🟦 ACS Buy Aircraft Engine (Cards) — Loaded");

/* ============================================================
   0) ENGINE SPECS (Compact Version for Cards)
   ============================================================ */
const ACS_ENGINE_SPECS = {
  "Lockheed L-10 Electra": { code:"PW R-985", n:2, power:"450 hp" },
  "Douglas DC-2": { code:"PW R-1830", n:2, power:"850 hp" },
  "Douglas DC-3": { code:"PW R-1830", n:2, power:"1200 hp" },
  "Douglas DC-4": { code:"PW R-2000", n:4, power:"1350 hp" },
  "Douglas DC-6": { code:"PW R-2800", n:4, power:"2400 hp" },
  "Douglas DC-7": { code:"Wright R-3350", n:4, power:"3250 hp" },
  "Lockheed Constellation": { code:"Wright R-3350", n:4, power:"2200 hp" },
  "Boeing 737-200": { code:"JT8D-9A", n:2, power:"14.5k" },
  "Boeing 737-800": { code:"CFM56-7B", n:2, power:"27k" },
  "Airbus A300B4": { code:"GE CF6-50", n:2, power:"51k" },
  "Airbus A320-200": { code:"CFM56-5B", n:2, power:"27k" },
  "Airbus A330-300": { code:"Trent 700", n:2, power:"68k" },
  "Boeing 787-9": { code:"GEnx-1B", n:2, power:"70k" }
};

/* ============================================================
   1) CONFIGURACIÓN DE SLOTS POR FABRICANTE
   ============================================================ */

const ACS_MANUFACTURER_SLOTS = {
  Douglas: 30,
  "McDonnell Douglas": 30,
  Boeing: 60,
  Airbus: 55,
  Embraer: 40,
  Bombardier: 20,
  ATR: 18,
  Tupolev: 25,
  Ilyushin: 22,
  Lockheed: 28
};

let ACS_SLOTS = JSON.parse(localStorage.getItem("ACS_SLOTS") || "{}");
function saveSlots() { localStorage.setItem("ACS_SLOTS", JSON.stringify(ACS_SLOTS)); }

/* ============================================================
   2) AÑO DE SIMULACIÓN
   ============================================================ */
function getCurrentSimYear() {
  try {
    if (typeof getSimYear === "function") return getSimYear();
    if (window.ACS_TIME?.currentTime) {
      return new Date(ACS_TIME.currentTime).getUTCFullYear();
    }
  } catch (e) {
    console.warn("⚠️ Error leyendo año sim:", e);
  }
  return 2025; // fallback
}

/* ============================================================
   3) BASE DB FILTRADA POR ÉPOCA
   ============================================================ */

function getAircraftBase() {
  if (!window.ACS_AIRCRAFT_DB) return [];

  const simYear = getCurrentSimYear();

  const list = window.ACS_AIRCRAFT_DB.filter(a => {
    if (typeof a.year !== "number") return true;
    return a.year <= simYear;
  });

  return list.sort((a, b) => (a.year || 0) - (b.year || 0));
}

/* ============================================================
   *** FIX #1 — FABRICANTES DISPONIBLES SEGÚN AÑO ***
   ============================================================ */

function getAvailableManufacturers() {
  const base = getAircraftBase();
  const simYear = getCurrentSimYear();

  const manufacturers = new Set();

  base.forEach(a => {
    if (!a.manufacturer) return;

    const firstYear = a.year ?? 1900;
    if (firstYear <= simYear) {
      manufacturers.add(a.manufacturer);
    }
  });

  return Array.from(manufacturers).sort();
}

/* ============================================================
   4) CHIPS DE FABRICANTE (YA CON FIX APLICADO)
   ============================================================ */

function buildFilterChips() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;

  const list = getAvailableManufacturers();

  bar.innerHTML = "";

  const allChip = document.createElement("div");
  allChip.className = "chip active";
  allChip.dataset.manufacturer = "All";
  allChip.textContent = "All";
  bar.appendChild(allChip);

  list.forEach(m => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.manufacturer = m;
    chip.textContent = m;
    bar.appendChild(chip);
  });

  bar.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    Array.from(bar.querySelectorAll(".chip")).forEach(c => c.classList.remove("active"));
    chip.classList.add("active");

    renderCards(chip.dataset.manufacturer);
  });
}

/* ============================================================
   5) IMAGEN AUTOMÁTICA
   ============================================================ */

function getAircraftImage(ac) {
  const base = ac.model.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const manu = (ac.manufacturer || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");

  const guesses = [
    `img/${base}.png`,
    `img/${manu}_${base}.png`,
    `img/${manu}.png`,
    `img/${base}.jpg`,
    `img/${manu}_${base}.jpg`
  ];

  for (const g of guesses) return g;
  return "img/no_preview.png";
}

/* ============================================================
   6) RENDER DE TARJETAS
   ============================================================ */

function renderCards(filterManufacturer = "All") {
  const grid = document.getElementById("cardsGrid");
  if (!grid) return;

  const base = getAircraftBase();
  const list = (filterManufacturer === "All")
    ? base
    : base.filter(a => a.manufacturer === filterManufacturer);

  grid.innerHTML = "";

  list.forEach((ac, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    const img = getAircraftImage(ac);
    const eng = ACS_ENGINE_SPECS[ac.model];
    const engineLine = eng ? `${eng.code} (${eng.n}×${eng.power})` : "—";

    card.innerHTML = `
      <img src="${img}" alt="${ac.model}" />
      <h3>${ac.manufacturer} ${ac.model}</h3>
      <div class="spec-line">Year: ${ac.year}</div>
      <div class="spec-line">Seats: ${ac.seats ?? "—"}</div>
      <div class="spec-line">Range: ${ac.range_nm?.toLocaleString()} nm</div>
      <div class="spec-line">Engines: ${engineLine}</div>
      <div class="spec-line">Price: $${(ac.price_acs_usd / 1_000_000).toFixed(1)}M</div>
      <button data-index="${idx}" class="view-options-btn">VIEW OPTIONS</button>
    `;

    card.dataset.idx = idx;
    grid.appendChild(card);
  });
}

/* ============================================================
   7) MODAL LOGIC
   ============================================================ */

let selectedAircraft = null;
let selectedAircraftImage = "";

function openBuyModal(ac) {
  selectedAircraft = ac;
  selectedAircraftImage = getAircraftImage(ac);

  document.getElementById("modalImage").src = selectedAircraftImage;
  document.getElementById("modalTitle").textContent = `${ac.manufacturer} ${ac.model}`;

  updateModalSummary();

  document.getElementById("buyModal").style.display = "flex";
}

function closeBuyModal() {
  document.getElementById("buyModal").style.display = "none";
}

/* ============================================================
   8) DELIVERY CALCULATION
   ============================================================ */

function calculateDeliveryDate(ac, qty) {
  const year = getCurrentSimYear();

  const manu = ac.manufacturer;
  const capacity = ACS_MANUFACTURER_SLOTS[manu] || 20;

  if (!ACS_SLOTS[manu]) ACS_SLOTS[manu] = 0;

  const backlog = ACS_SLOTS[manu];
  const total = backlog + qty;

  const yearsNeeded = total / capacity;

  const deliveryYear = year + Math.floor(yearsNeeded);
  const monthsFraction = (yearsNeeded % 1) * 12;
  const deliveryMonth = Math.floor(monthsFraction) + 1;

  return new Date(Date.UTC(deliveryYear, deliveryMonth, 15));
}

/* ============================================================
   9) MODAL SUMMARY
   ============================================================ */

function updateModalSummary() {
  if (!selectedAircraft) return;

  const op = document.getElementById("modalOperation").value;
  const qty = Math.max(1, parseInt(document.getElementById("modalQty").value) || 1);

  const manu = selectedAircraft.manufacturer;
  const price = selectedAircraft.price_acs_usd;

  let summary = "";

  const deliveryDate = calculateDeliveryDate(selectedAircraft, qty);
  const d = deliveryDate.toUTCString().substring(5, 17);
  summary += `Estimated delivery: <b>${d}</b><br>`;

  if (op === "BUY") {
    const total = price * qty;
    summary += `Total: <b>$${(total / 1_000_000).toFixed(2)}M</b>`;
    document.getElementById("leaseOptions").style.display = "none";
  } else {
    document.getElementById("leaseOptions").style.display = "block";

    const years = parseInt(document.getElementById("modalLeaseYears").value);
    const pct = parseInt(document.getElementById("modalInitialPct").value);

    const total = price * qty;
    const initial = total * (pct / 100);

    const months = years * 12;
    const remaining = total - initial;
    const monthly = (remaining / months) * 1.12;

    summary += `
      Initial payment: <b>$${(initial/1_000_000).toFixed(2)}M</b><br>
      Monthly: <b>$${(monthly/1_000_000).toFixed(2)}M</b> for ${years} years
    `;
  }

  document.getElementById("modalSummary").innerHTML = summary;
}

/* ============================================================
   10) CONFIRM BUY / LEASE
   ============================================================ */

document.getElementById("modalOperation").addEventListener("change", updateModalSummary);
document.getElementById("modalQty").addEventListener("input", updateModalSummary);
document.getElementById("modalLeaseYears").addEventListener("change", updateModalSummary);
document.getElementById("modalInitialPct").addEventListener("change", updateModalSummary);

document.getElementById("modalConfirm").addEventListener("click", () => {
  const ac = selectedAircraft;
  if (!ac) return;

  const op = document.getElementById("modalOperation").value;
  const qty = Math.max(1, parseInt(document.getElementById("modalQty").value));

  const deliveryDate = calculateDeliveryDate(ac, qty);

  const manu = ac.manufacturer;
  if (!ACS_SLOTS[manu]) ACS_SLOTS[manu] = 0;
  ACS_SLOTS[manu] += qty;
  saveSlots();

  let pending = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

  const entry = {
    id: "order-" + Date.now(),
    manufacturer: ac.manufacturer,
    model: ac.model,
    qty,
    type: op,
    price: ac.price_acs_usd,
    image: selectedAircraftImage,
    deliveryDate: deliveryDate.toISOString(),
    created: new Date().toISOString()
  };

  if (op === "BUY") {
    entry.total = ac.price_acs_usd * qty;

    let balance = parseFloat(localStorage.getItem("ACS_FinanceBalance") || "0");
    balance -= entry.total;
    localStorage.setItem("ACS_FinanceBalance", balance.toString());
  }

  if (op === "LEASE") {
    const years = parseInt(document.getElementById("modalLeaseYears").value);
    const pct = parseInt(document.getElementById("modalInitialPct").value);

    entry.years = years;
    entry.initialPct = pct;

    const total = ac.price_acs_usd * qty;
    entry.initialPayment = total * (pct / 100);

    let balance = parseFloat(localStorage.getItem("ACS_FinanceBalance") || "0");
    balance -= entry.initialPayment;
    localStorage.setItem("ACS_FinanceBalance", balance.toString());
  }

  pending.push(entry);
  localStorage.setItem("ACS_PendingAircraft", JSON.stringify(pending));

  alert("✅ Order successfully created!");

  closeBuyModal();
});

/* ============================================================
   11) CLICK ON CARD
   ============================================================ */

document.addEventListener("click", e => {
  const btn = e.target.closest(".view-options-btn");
  if (!btn) return;

  const idx = parseInt(btn.dataset.index);
  const base = getAircraftBase();
  const ac = base[idx];
  if (!ac) return;

  openBuyModal(ac);
});

/* ============================================================
   12) AUTO-DELIVERY ENGINE
   ============================================================ */

function checkDeliveries() {
  let myFleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let pending = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

  const now = window.ACS_TIME?.currentTime
    ? new Date(ACS_TIME.currentTime)
    : new Date();

  const remaining = [];

  pending.forEach(entry => {
    const d = new Date(entry.deliveryDate);
    if (now >= d) {
      for (let i = 0; i < entry.qty; i++) {
        myFleet.push({
          id: "AC-" + Date.now() + "-" + i,
          model: entry.model,
          manufacturer: entry.manufacturer,
          year: new Date().getUTCFullYear(),
          delivered: d.toISOString(),
          image: entry.image
        });
      }
      ACS_SLOTS[entry.manufacturer] -= entry.qty;
    } else {
      remaining.push(entry);
    }
  });

  localStorage.setItem("ACS_PendingAircraft", JSON.stringify(remaining));
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(myFleet));
  saveSlots();
}

/* ============================================================
   13) INICIALIZACIÓN
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  buildFilterChips();
  renderCards("All");
  checkDeliveries();

  console.log("🟩 Buy Aircraft Cards System — Ready");
});

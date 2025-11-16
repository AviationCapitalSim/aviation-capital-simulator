/* ============================================================
   === ACS USED AIRCRAFT MARKET — FINAL SYNC (v2.0) ==========
   ------------------------------------------------------------
   • Integrado con ACS_AIRCRAFT_DB y Buy Aircraft Engine
   • Función de imágenes EXACTA a buy_aircraft.js
   • Filtrado por fabricante
   • Compra / Leasing de usados
   • Auto-delivery inmediato para 1ª flota inicial
   ============================================================ */

console.log("🟦 ACS Used Aircraft Market — Loaded");

/* ============================================================
   === FILTER BAR (BUY-NEW STYLE) — CHIP BUILDER ===============
   ============================================================ */
function buildFilterChips() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;

  const list = generateUsedMarket();

  const manufacturers = Array.from(
    new Set(list.map(ac => ac.manufacturer))
  ).sort();

  bar.innerHTML = "";

  // === CHIP "ALL" ===
  const allChip = document.createElement("div");
  allChip.className = "chip active";
  allChip.dataset.manufacturer = "All";
  allChip.textContent = "All";
  bar.appendChild(allChip);

  // === CHIPS POR FABRICANTE ===
  manufacturers.forEach(m => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.manufacturer = m;
    chip.textContent = m;
    bar.appendChild(chip);
  });

  // === CLICK HANDLER ===
  bar.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    bar.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");

    const filter = chip.dataset.manufacturer;
    renderUsedMarket(filter === "All" ? "all" : filter);
  });
}

/* ============================================================
   1) DB Resolver
   ============================================================ */
function resolveUsedDB() {
  if (typeof ACS_AIRCRAFT_DB !== "undefined") return ACS_AIRCRAFT_DB;
  console.error("❌ ACS_AIRCRAFT_DB not found");
  return [];
}

/* ============================================================
   2) YEAR Resolver
   ============================================================ */
function getCurrentSimYear() {
  try {
    if (typeof getSimYear === "function") return getSimYear();
    if (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime) {
      return new Date(ACS_TIME.currentTime).getUTCFullYear();
    }
  } catch (e) {
    console.warn("⚠️ Error leyendo año sim:", e);
  }
  return 1940;
}

/* ============================================================
   3) FUNCIÓN DE IMÁGENES — COPIADA 1:1 DE BUY AIRCRAFT
   ============================================================ */
function getAircraftImage(ac) {
  if (!ac || !ac.model || !ac.manufacturer) {
    return "img/placeholder_aircraft.png";
  }

  let manuFolder = ac.manufacturer
    .trim()
    .replace(/\s+/g, " ");

  // 🔧 Carpeta especial para De Havilland
  if (ac.manufacturer.toLowerCase() === "de havilland") {
    manuFolder = "de_havilland";
  }

  const rawModel = ac.model.toLowerCase().trim();
  let base = rawModel.replace(/[^a-z0-9]+/g, "_");

  const variants = new Set();
  variants.add(base);
  variants.add(base.replace(/^l_([0-9]+)/, "l$1"));    
  variants.add(base.replace(/_/g, ""));               
  variants.add(rawModel.replace(/[^a-z0-9]+/g, ""));  

  const candidates = [];

  for (const v of variants) {
    candidates.push(`img/${manuFolder}/${v}.png`);
    candidates.push(`img/${manuFolder}/${v}.jpg`);
  }

  const manuSlug = ac.manufacturer.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  candidates.push(`img/${base}.png`);
  candidates.push(`img/${manuSlug}_${base}.png`);

  return candidates[0] || "img/placeholder_aircraft.png";
}

/* ============================================================
   4) GENERACIÓN BASE — 300 AVIONES
   ============================================================ */
function generateUsedMarket() {
  let used = JSON.parse(localStorage.getItem("ACS_UsedMarket") || "[]");
  if (used.length >= 100) return used;  // ya generado

  const db = resolveUsedDB();
  const simYear = getCurrentSimYear();

  const pool = db.filter(a => a.year <= simYear);

  const result = [];
  let count = 0;

  while (count < 300) {
    const ac = pool[Math.floor(Math.random() * pool.length)];
    if (!ac) break;

    result.push({
      id: "USED-" + Date.now() + "-" + count,
      model: ac.model,
      manufacturer: ac.manufacturer,
      year: ac.year,
      seats: ac.seats,
      range_nm: ac.range_nm,
      price_acs_usd: Math.floor(ac.price_acs_usd * 0.35),
      hours: Math.floor(Math.random() * 15000) + 2000,
      cycles: Math.floor(Math.random() * 9000) + 1000,
      condition: ["A", "B", "C"][Math.floor(Math.random() * 3)],
      image: getAircraftImage(ac),
      source: ["System", "Bank", "Liquidation"][Math.floor(Math.random() * 3)]
    });

    count++;
  }

  localStorage.setItem("ACS_UsedMarket", JSON.stringify(result));
  return result;
}

/* ============================================================
   5) RENDER DE TARJETAS
   ============================================================ */
function renderUsedMarket(filter = "all") {
  const grid = document.getElementById("usedGrid");
  if (!grid) return;

  grid.innerHTML = "";
  const list = generateUsedMarket();

  const filtered = filter === "all"
    ? list
    : list.filter(ac => ac.manufacturer === filter);

  filtered.forEach(ac => {
    const card = document.createElement("div");
    card.className = "used-card";

    card.innerHTML = `
      <img src="${ac.image}" 
           onerror="this.src='img/placeholder_aircraft.png'" />

      <h3>${ac.manufacturer} ${ac.model}</h3>

      <p>Year: ${ac.year}</p>
      <p>Seats: ${ac.seats}</p>
      <p>Range: ${ac.range_nm} nm</p>
      <p>Hours: ${ac.hours.toLocaleString()}</p>
      <p>Cycles: ${ac.cycles.toLocaleString()}</p>
      <p>Condition: ${ac.condition}</p>
      <p><b>Price: $${(ac.price_acs_usd/1_000_000).toFixed(2)}M</b></p>
      <p style="color:#FFB300">Origin: ${ac.source}</p>

      <button class="ac-buy" onclick="buyUsed('${ac.id}')">BUY</button>
      <button class="ac-lease" onclick="leaseUsed('${ac.id}')">LEASE</button>
      <button class="ac-info" onclick="openInfo('${ac.id}')">INFO</button>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   6) COMPRAR USADO
   ============================================================ */
function buyUsed(id) {
  const list = generateUsedMarket();
  const ac = list.find(x => x.id === id);
  if (!ac) return alert("❌ Aircraft not found.");

  let myFleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  myFleet.push({
    id: "AC-" + Date.now(),
    model: ac.model,
    manufacturer: ac.manufacturer,
    delivered: new Date().toISOString(),
    image: ac.image,
    status: "Active",
    hours: ac.hours,
    cycles: ac.cycles,
    condition: ac.condition
  });

  localStorage.setItem("ACS_MyAircraft", JSON.stringify(myFleet));

  // FINANZAS
  const finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  if (finance.capital !== undefined) {
    finance.capital -= ac.price_acs_usd;
    localStorage.setItem("ACS_Finance", JSON.stringify(finance));
  }

  alert("✅ Purchased successfully!");
}

/* ============================================================
   7) LEASE USADO
   ============================================================ */
function leaseUsed(id) {
  alert("📘 Leasing engine coming next (step B).");
}

/* ============================================================
   8) MODAL
   ============================================================ */
function openInfo(id) {
  const list = generateUsedMarket();
  const ac = list.find(x => x.id === id);
  if (!ac) return;

  document.getElementById("modalName").textContent =
    `${ac.manufacturer} ${ac.model}`;

  document.getElementById("modalDetails").innerHTML = `
    Seats: ${ac.seats}<br>
    Range: ${ac.range_nm} nm<br>
    Hours: ${ac.hours}<br>
    Cycles: ${ac.cycles}<br>
    Condition: ${ac.condition}<br>
    Price: $${(ac.price_acs_usd/1_000_000).toFixed(2)}M<br>
    Source: ${ac.source}<br>
  `;

  document.getElementById("infoModal").style.display = "flex";
}

function closeInfoModal() {
  document.getElementById("infoModal").style.display = "none";
}

/* ============================================================
   9) INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  buildFilterChips();
  renderUsedMarket("all");
});

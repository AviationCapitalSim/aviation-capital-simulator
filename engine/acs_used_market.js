/* ============================================================
   === ACS USED AIRCRAFT MARKET — PRO EDITION (v3.0) ==========
   ------------------------------------------------------------
   • Integrado con ACS_AIRCRAFT_DB y Leasing Engine
   • Qatar Luxury optimized
   • FILTRO por fabricante
   • Compra + Leasing de usados
   • MATRÍCULA automática
   • Image Resolver PRO (sin 404, Safari Safe)
   • Caché local de imágenes
   ============================================================ */

console.log("🟦 ACS Used Aircraft Market — Loaded");

/* ============================================================
   === FILTER BAR BUILDER ======================================
   ============================================================ */
function buildFilterChips() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;

  const list = generateUsedMarket();
  const manufacturers = Array.from(
    new Set(list.map(ac => ac.manufacturer))
  ).sort();

  bar.innerHTML = "";

  // === ALL ===
  const allChip = document.createElement("div");
  allChip.className = "chip active";
  allChip.dataset.manufacturer = "All";
  allChip.textContent = "All";
  bar.appendChild(allChip);

  // === BY MANUFACTURER ===
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
   === RESOLVE MAIN DB =========================================
   ============================================================ */
function resolveUsedDB() {
  if (typeof ACS_AIRCRAFT_DB !== "undefined") return ACS_AIRCRAFT_DB;
  console.error("❌ ACS_AIRCRAFT_DB not found");
  return [];
}

/* ============================================================
   === READ CURRENT SIM YEAR ===================================
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
   === IMAGE RESOLVER PRO v3.0 — NO 404, SAFARI SAFE ============
   ============================================================ */

async function ACS_imageExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch (e) {
    return false;
  }
}

const ACS_ImageCache = JSON.parse(localStorage.getItem("ACS_ImageCache") || "{}");

async function getAircraftImage(ac) {

  if (!ac || !ac.model || !ac.manufacturer) {
    return "img/placeholder_aircraft.png";
  }

  const manuFolder = ac.manufacturer.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const raw = ac.model.toLowerCase();
  const base = raw.replace(/[^a-z0-9]+/g, "_");

  const candidates = [
    `img/${manuFolder}/${base}.png`,
    `img/${manuFolder}/${base}.jpg`,
    `img/${manuFolder}/${base.replace(/_/g,"")}.png`,
    `img/${manuFolder}/${base.replace(/_/g,"")}.jpg`,
    `img/${base}.png`,
    `img/${base}.jpg`,
    `img/${manuFolder}_${base}.png`,
    `img/${manuFolder}_${base}.jpg`
  ];

  // === CACHE ===
  for (const c of candidates) {
    if (ACS_ImageCache[c] === true) return c;
  }

  // === TEST SECUENCIAL (HEAD REQUEST) ===
  for (const url of candidates) {
    const exists = await ACS_imageExists(url);
    if (exists) {
      ACS_ImageCache[url] = true;
      localStorage.setItem("ACS_ImageCache", JSON.stringify(ACS_ImageCache));
      return url;
    }
  }

  return "img/placeholder_aircraft.png";
}

/* ============================================================
   === GENERATE USED MARKET ====================================
   ============================================================ */
function generateUsedMarket() {
  let used = JSON.parse(localStorage.getItem("ACS_UsedMarket") || "[]");

  if (used.length >= 100) return used;

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
      source: ["System", "Bank", "Liquidation"][Math.floor(Math.random() * 3)]
    });

    count++;
  }

  localStorage.setItem("ACS_UsedMarket", JSON.stringify(result));
  return result;
}

/* ============================================================
   === RENDER CARDS ============================================
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
    card.className = "used-panel";

    card.innerHTML = `
      <img src="img/placeholder_aircraft.png" data-id="${ac.id}" class="ac-img">

      <h3>${ac.manufacturer} ${ac.model}</h3>

      <p>Year: ${ac.year}</p>
      <p>Seats: ${ac.seats}</p>
      <p>Range: ${ac.range_nm} nm</p>
      <p>Hours: ${ac.hours.toLocaleString()}</p>
      <p>Cycles: ${ac.cycles.toLocaleString()}</p>
      <p>Condition: ${ac.condition}</p>
      <p><b>Price: $${(ac.price_acs_usd/1_000_000).toFixed(2)}M</b></p>
      <p style="color:#FFB300">Origin: ${ac.source}</p>

      <button class="acs-btn" onclick="buyUsed('${ac.id}')">BUY</button>
      <button class="acs-btn" onclick="leaseUsed('${ac.id}')">LEASE</button>
      <button class="acs-btn acs-btn-info" onclick="openInfo('${ac.id}')">INFO</button>
    `;

    grid.appendChild(card);
  });

  // Load dynamic images without 404
  loadUsedImages();
}

/* ============================================================
   === IMAGE POST-LOADER — PREVENT 404 =========================
   ============================================================ */
async function loadUsedImages() {
  const list = generateUsedMarket();

  document.querySelectorAll(".ac-img").forEach(async img => {
    const id = img.dataset.id;
    const ac = list.find(x => x.id === id);
    if (!ac) return;

    const real = await getAircraftImage(ac);
    img.src = real;
  });
}

/* ============================================================
   === BUY USED =================================================
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
    condition: ac.condition,
    registration: ACS_generateRegistration()
  });

  localStorage.setItem("ACS_MyAircraft", JSON.stringify(myFleet));

  // Finanzas
  const finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  if (finance.capital !== undefined) {
    finance.capital -= ac.price_acs_usd;
    localStorage.setItem("ACS_Finance", JSON.stringify(finance));
  }

  alert("✅ Purchased successfully!");
}

/* ============================================================
   === LEASE USED ==============================================
   ============================================================ */
function leaseUsed(id) {
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
    condition: ac.condition,

    registration: ACS_generateRegistration(),

    lastC: null,
    nextC: null,
    lastD: null,
    nextD: null
  });

  // Calcular C y D
  (() => {
    const idx = myFleet.length - 1;
    const baseDate = new Date(myFleet[idx].delivered);

    const C = new Date(baseDate);
    C.setUTCFullYear(C.getUTCFullYear() + 1);

    const D = new Date(baseDate);
    D.setUTCFullYear(D.getUTCFullYear() + 8);

    myFleet[idx].nextC = C.toISOString();
    myFleet[idx].nextD = D.toISOString();
  })();

  localStorage.setItem("ACS_MyAircraft", JSON.stringify(myFleet));

  alert("📘 Aircraft leased successfully!");
}

/* ============================================================
   === MODAL INFO ==============================================
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
   === INIT =====================================================
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  buildFilterChips();
  renderUsedMarket("all");
});

/* ============================================================
   === ACS USED AIRCRAFT MARKET — FINAL SYNC (v2.1) ============
   ------------------------------------------------------------
   • Integrado con ACS_AIRCRAFT_DB y Buy Aircraft Engine
   • Función de imágenes EXACTA a buy_aircraft.js
   • Filtrado por fabricante
   • Compra de usados conectada a:
       - ACS_MyAircraft
       - ACS_Finance (capital/expenses/log)
       - Eliminación del avión del Used Market
   • Auto-delivery inmediato para flota inicial
   • Source estándar: BANK
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

  // Por ahora NO probamos existencia real, usamos placeholder si falla
  return "img/placeholder_aircraft.png";
}

/* ============================================================
   Helper — leer y guardar Used Market crudo
   ============================================================ */
function loadUsedMarketRaw() {
  return JSON.parse(localStorage.getItem("ACS_UsedMarket") || "[]");
}

function saveUsedMarketRaw(list) {
  localStorage.setItem("ACS_UsedMarket", JSON.stringify(list));
}

/* ============================================================
   4) GENERACIÓN BASE — 300 AVIONES (UNA SOLA VEZ)
   ============================================================ */
function generateUsedMarket() {
  let used = loadUsedMarketRaw();

  // ❗ Una vez generado, nunca se regenera automáticamente
  if (used.length > 0) return used;

  const db = resolveUsedDB();
  const simYear = getCurrentSimYear();

  const pool = db.filter(a => a.year <= simYear);
  if (!pool.length) {
    console.warn("⚠️ Used Market: pool vacío, revisar ACS_AIRCRAFT_DB.");
    saveUsedMarketRaw([]);
    return [];
  }

  const result = [];
  let count = 0;

  while (count < 300) { // 300 aviones iniciales
    const ac = pool[Math.floor(Math.random() * pool.length)];
    if (!ac) break;

    result.push({
      id: "USED-" + Date.now() + "-" + count,
      model: ac.model,
      manufacturer: ac.manufacturer,
      year: ac.year,
      seats: ac.seats,
      range_nm: ac.range_nm,
      price_acs_usd: Math.floor(ac.price_acs_usd * 0.35), // 35% del valor nuevo
      hours: Math.floor(Math.random() * 15000) + 2000,
      cycles: Math.floor(Math.random() * 9000) + 1000,
      condition: ["A", "B", "C"][Math.floor(Math.random() * 3)],
      image: getAircraftImage(ac),
      source: "BANK"  // estándar por ahora
    });

    count++;
  }

  saveUsedMarketRaw(result);
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
      <p style="color:#FFB300">Source: ${ac.source}</p>

      <button class="ac-buy" onclick="buyUsed('${ac.id}')">BUY</button>
      <button class="ac-lease" onclick="leaseUsed('${ac.id}')">LEASE</button>
      <button class="ac-info" onclick="openInfo('${ac.id}')">INFO</button>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   6) COMPRAR USADO — CONECTADO A MY AIRCRAFT + FINANCE
   ============================================================ */
function buyUsed(id) {
  // 1) Leer mercado actual
  let usedList = loadUsedMarketRaw();
  const ac = usedList.find(x => x.id === id);
  if (!ac) {
    alert("❌ Aircraft not found in market.");
    return;
  }

  // 2) Verificar capital por seguridad (ya se revisa en el modal, pero doble check)
  const finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  const capital = finance && typeof finance.capital === "number"
    ? finance.capital
    : 0;

  if (capital < ac.price_acs_usd) {
    alert("❌ Not enough capital to purchase this aircraft.");
    return;
  }

  // 3) Añadir a MY AIRCRAFT
  let myFleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  const modelData = (resolveUsedDB().find(m =>
    m.manufacturer === ac.manufacturer && m.model === ac.model
  ) || {});

  const registration = (typeof ACS_generateRegistration === "function")
    ? ACS_generateRegistration()
    : "UNREG-" + Math.floor(Math.random() * 99999);

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
    registration: registration,

    data: modelData,

    // Campos de mantenimiento (se rellenarán mejor en la fase C/D-Check)
    lastC: null,
    lastD: null,
    nextC: null,
    nextD: null
  });

  localStorage.setItem("ACS_MyAircraft", JSON.stringify(myFleet));

  // 4) FINANZAS — DESCUESTO REAL con helper si existe
  if (typeof ACS_registerExpense === "function") {
    // costType "aircraft_purchase" (añadido en acs_finance.js)
    ACS_registerExpense(
      "aircraft_purchase",
      ac.price_acs_usd,
      `Used Market Purchase — ${ac.manufacturer} ${ac.model}`
    );
  } else {
    // Fallback manual por si acaso
    if (finance && typeof finance.capital === "number") {
      finance.capital -= ac.price_acs_usd;
      finance.expenses = (finance.expenses || 0) + ac.price_acs_usd;
      finance.profit = (finance.revenue || 0) - (finance.expenses || 0);
      localStorage.setItem("ACS_Finance", JSON.stringify(finance));
    }
  }

  // 5) Eliminar avión del Used Market
  usedList = usedList.filter(x => x.id !== id);
  saveUsedMarketRaw(usedList);

  // 6) Feedback
  alert("✅ Aircraft purchased successfully from Used Market.");
}

/* ============================================================
   === 7) LEASE USADO — (SE MANTIENE POR COMPATIBILIDAD) =======
   ============================================================ */

function getLeasingUpfront(year){
  if (year < 1960) return 0;          // No leasing
  if (year < 1970) return 0.35;       // 1960s
  if (year < 1980) return 0.30;       // 1970s
  if (year < 1990) return 0.22;       // 1980s
  if (year < 2000) return 0.18;       // 1990s
  if (year < 2010) return 0.12;       // 2000s
  return 0.10;                        // 2010–2026
}

function getLeasingMonthlyRate(year){
  if (year < 1960) return 0;          // No leasing
  if (year < 1970) return 0.022;      // 2.2%
  if (year < 1980) return 0.018;      // 1.8%
  if (year < 1990) return 0.015;      // 1.5%
  if (year < 2000) return 0.013;      // 1.3%
  if (year < 2010) return 0.011;      // 1.1%
  return 0.009;                       // 0.9%
}

function leaseUsed(id) {
  // 🔴 Por ahora mantenemos la lógica existente para no romper nada,
  // pero en esta fase tú no la usarás (solo BUY). Más adelante afinamos LEASE.

  let usedList = loadUsedMarketRaw();
  const ac = usedList.find(x => x.id === id);
  if (!ac) return alert("❌ Aircraft not found.");

  let year = 1940;
  try {
    if (typeof ACS_TIME !== "undefined") {
      year = ACS_TIME.year || 1940;
    }
  } catch(e){}

  const upfrontRate = getLeasingUpfront(year);
  const monthlyRate = getLeasingMonthlyRate(year);

  if (upfrontRate === 0 || monthlyRate === 0) {
    return alert("❌ Leasing was not available in this historical period. You must BUY the aircraft.");
  }

  const upfront = Math.round(ac.price_acs_usd * upfrontRate);
  const monthly = Math.round(ac.price_acs_usd * monthlyRate);

  const nextPayment = new Date();
  nextPayment.setUTCMonth(nextPayment.getUTCMonth() + 1);

  let myFleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  const modelData = (resolveUsedDB().find(m =>
    m.manufacturer === ac.manufacturer && m.model === ac.model
  ) || {});

  const registration = (typeof ACS_generateRegistration === "function")
    ? ACS_generateRegistration()
    : "UNREG-" + Math.floor(Math.random() * 99999);

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
    registration: registration,

    data: modelData,

    leasing: {
      upfront,
      monthly,
      rate: monthlyRate,
      nextPayment: nextPayment.toISOString(),
      frequency: "monthly",
      started: new Date().toISOString()
    },

    lastC: null,
    lastD: null,
    nextC: null,
    nextD: null
  });

  localStorage.setItem("ACS_MyAircraft", JSON.stringify(myFleet));

  // === FINANZAS DE LA EMPRESA (upfront) ===
  const finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  if (finance && typeof finance.capital === "number") {
    finance.capital -= upfront;
    finance.expenses = (finance.expenses || 0) + upfront;
    finance.profit = (finance.revenue || 0) - (finance.expenses || 0);
    localStorage.setItem("ACS_Finance", JSON.stringify(finance));
  }

  // === REGISTRO CONTABLE BÁSICO ===
  let log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");
  log.push({
    time: new Date().toLocaleString(),
    type: "Expense",
    source: `Used Aircraft Lease: ${ac.manufacturer} ${ac.model}`,
    amount: upfront
  });
  localStorage.setItem("ACS_Log", JSON.stringify(log));

  // Eliminar del Used Market también
  usedList = usedList.filter(x => x.id !== id);
  saveUsedMarketRaw(usedList);

  alert("📘 Aircraft leased successfully (Historical Real Leasing Applied)");
}

/* ============================================================
   8) MODAL INFO (USADO POR used_market.html)
   ============================================================ */
function openInfo(id) {
  const list = generateUsedMarket();
  const ac = list.find(x => x.id === id);
  if (!ac) return;

  const nameEl = document.getElementById("modalName");
  const detailsEl = document.getElementById("modalDetails");
  const modalEl = document.getElementById("infoModal");

  if (!nameEl || !detailsEl || !modalEl) return;

  nameEl.textContent = `${ac.manufacturer} ${ac.model}`;
  detailsEl.innerHTML = `
    Seats: ${ac.seats}<br>
    Range: ${ac.range_nm} nm<br>
    Hours: ${ac.hours.toLocaleString()}<br>
    Cycles: ${ac.cycles.toLocaleString()}<br>
    Condition: ${ac.condition}<br>
    Price: $${(ac.price_acs_usd/1_000_000).toFixed(2)}M<br>
    Source: ${ac.source}<br>
  `;

  modalEl.style.display = "flex";
}

/* ============================================================
   9) INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  buildFilterChips();
  renderUsedMarket("all");
});

// === EXPOSE FUNCTIONS TO GLOBAL (Safari fix) ===
window.buyUsed = buyUsed;
window.leaseUsed = leaseUsed;
window.openInfo = openInfo;
// closeInfoModal se define en used_market.html

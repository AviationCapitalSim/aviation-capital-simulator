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
   GLOBAL AIRCRAFT IMAGE RESOLVER — v4 (PNG + JPG SAFE)
   ============================================================ */

function getAircraftImage(ac) {

  if (!ac || !ac.model || !ac.manufacturer) {
    return "img/placeholder_aircraft.png";
  }

  let manuFolder = ac.manufacturer.trim().replace(/\s+/g, " ");

  if (ac.manufacturer.toLowerCase() === "de havilland") {
    manuFolder = "de_havilland";
  }

  const rawModel = ac.model.toLowerCase().trim();
  const base = rawModel.replace(/[^a-z0-9]+/g, "_");

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
  candidates.push(`img/${base}.jpg`);
  candidates.push(`img/${manuSlug}_${base}.png`);
  candidates.push(`img/${manuSlug}_${base}.jpg`);

  // Devuelve el primer candidato (la verificación real
  // la hace el navegador si falla la carga)
  return candidates[0] || "img/placeholder_aircraft.png";
}

/* ============================================================
   🖼️ ACS IMAGE FALLBACK SYSTEM — GLOBAL (SYNC WITH BUY NEW)
   ============================================================ */

function ACS_handleImageFallback(img) {

  if (img.dataset.fallback === "1") {
    img.onerror = null;
    img.src = "img/placeholder_aircraft.png";
    return;
  }

  img.dataset.fallback = "1";

  if (img.src.endsWith(".png")) {
    img.src = img.src.replace(".png", ".jpg");
  } else if (img.src.endsWith(".jpg")) {
    img.src = img.src.replace(".jpg", ".png");
  } else {
    img.src = "img/placeholder_aircraft.png";
  }
}

/* ============================================================
   🟦 ACS USED MARKET — BACKEND DATA BRIDGE v1.0
   ------------------------------------------------------------
   Purpose:
   - Keep the old Used Market UI stable
   - Remove localStorage authority
   - Read real market listings from PostgreSQL backend
   - Normalize backend rows into the old card format
   - No frontend generation
   - No frontend finance mutation
   - No frontend fleet creation
   ============================================================ */

const ACS_USED_MARKET_ENDPOINT =
  "https://api.aviationcapitalsim.com/v1/aircraft/used-market";

let ACS_USED_MARKET_BACKEND_LIST = [];
let ACS_USED_MARKET_BACKEND_LOADED = false;
let ACS_USED_MARKET_BACKEND_LOADING = false;
let ACS_USED_MARKET_BACKEND_ERROR = null;

/* ============================================================
   NORMALIZE BACKEND ROW → OLD USED CARD FORMAT
   ------------------------------------------------------------
   This preserves the old UI fields:
   model, manufacturer, year, hours, cycles, condition, price_acs_usd
   ============================================================ */

function ACS_normalizeUsedMarketRow(row) {
  const manufacturer = row.manufacturer || "Unknown";

  const model =
    row.model ||
    String(row.aircraft_name || "")
      .replace(new RegExp("^" + manufacturer + "\\s+", "i"), "")
      .trim() ||
    row.model_key ||
    "Unknown Model";

  const conditionPct = Number(row.condition_pct || 0);

  return {
    ...row,

    /* Old UI compatibility */
    id: String(row.id),
    model,
    manufacturer,
    year: Number(row.year_built || row.generated_for_sim_year || 1940),
    seats: Number(row.seats || 0),
    range_nm: Number(row.range_nm || 0),
    price_acs_usd: Number(row.market_price || 0),
    hours: Number(row.total_hours || 0),
    cycles: Number(row.total_cycles || 0),
    condition: `${Math.round(conditionPct)}%`,
    source: row.market_source || "SYSTEM_GENERATED",

    /* Backend fields preserved */
    model_key: row.model_key,
    aircraft_name: row.aircraft_name,
    image_filename: row.image_filename || row.image_file_name || null,
    serial_number: row.serial_number,
    previous_registration: row.previous_registration,
    previous_operator: row.previous_operator_name || row.previous_operator,
    maintenance_status: row.maintenance_status,
    listing_status: row.listing_status,
    remarketing_agent: row.remarketing_agent
  };
}

/* ============================================================
   LOAD USED MARKET FROM BACKEND
   ============================================================ */

async function ACS_loadUsedMarketFromBackend() {
  if (ACS_USED_MARKET_BACKEND_LOADING) {
    return ACS_USED_MARKET_BACKEND_LIST;
  }

  ACS_USED_MARKET_BACKEND_LOADING = true;
  ACS_USED_MARKET_BACKEND_ERROR = null;

  try {
    const response = await fetch(ACS_USED_MARKET_ENDPOINT, {
      method: "GET",
      credentials: "include",
      headers: {
        "Accept": "application/json"
      }
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.ok !== true) {
      throw new Error(data?.error || `USED_MARKET_HTTP_${response.status}`);
    }

    const rows = Array.isArray(data.used_market)
      ? data.used_market
      : [];

    ACS_USED_MARKET_BACKEND_LIST =
      rows.map(ACS_normalizeUsedMarketRow);

    ACS_USED_MARKET_BACKEND_LOADED = true;
    ACS_USED_MARKET_BACKEND_LOADING = false;

    console.log("✅ ACS Used Market loaded from backend:", {
      count: ACS_USED_MARKET_BACKEND_LIST.length,
      seed_status: data.seed_status || null,
      policy: data.policy || null
    });

    return ACS_USED_MARKET_BACKEND_LIST;

  } catch (error) {
    ACS_USED_MARKET_BACKEND_LOADING = false;
    ACS_USED_MARKET_BACKEND_ERROR = error.message;

    console.error("❌ ACS Used Market backend load failed:", error);

    ACS_USED_MARKET_BACKEND_LIST = [];
    return [];
  }
}

/* ============================================================
   LEGACY FUNCTION NAMES — NOW BACKEND ONLY
   ------------------------------------------------------------
   These names stay so the old UI does not break.
   ============================================================ */

function loadUsedMarketRaw() {
  return ACS_USED_MARKET_BACKEND_LIST;
}

function saveUsedMarketRaw() {
  console.warn("⛔ saveUsedMarketRaw disabled — backend authority only.");
}

function generateUsedMarket() {
  return ACS_USED_MARKET_BACKEND_LIST;
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
      <img src="${getAircraftImage(ac)}"
       onerror="ACS_handleImageFallback(this)" />

      <h3>${ac.manufacturer} ${ac.model}</h3>

      <p>Year: ${ac.year}</p>
      <p>Seats: ${ac.seats}</p>
      <p>Range: ${ac.range_nm} nm</p>
      <p>Hours: ${ac.hours.toLocaleString()}</p>
      <p>Cycles: ${ac.cycles.toLocaleString()}</p>
      <p>Condition: ${ac.condition}</p>
      <p><b>Price: ${ACS_formatUSD(ac.price_acs_usd)}</b></p>

      <button class="ac-buy" onclick="buyUsed('${ac.id}')">BUY</button>
      <button class="ac-lease" onclick="leaseUsed('${ac.id}')">LEASE</button>
      <button class="ac-info" onclick="openInfo('${ac.id}')">INFO</button>
    `;
    grid.appendChild(card);
  });
}

/* ============================================================
   === AUTO-REGISTRATION FOR USED MARKET — v1.0 (MODEL A) ======
   ------------------------------------------------------------
   • Usa getRegistrationPrefix() del Registration Manager
   • Formato automático 100% realista
   • USA = N123AB
   • Otros = EC-ABC / EX-XYZ / G-PLM / etc.
   ============================================================ */
function ACS_assignUsedRegistration() {

  const prefix = (typeof getRegistrationPrefix === "function")
    ? getRegistrationPrefix()        // EC-, EX-, N-, G-, JA-, etc.
    : "XX-";

  // 🇺🇸 USA — formato especial FAA
  if (prefix === "N-") {
    const num = Math.floor(100 + Math.random() * 900);  // N123
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const L1 = letters[Math.floor(Math.random() * 26)];
    const L2 = letters[Math.floor(Math.random() * 26)];
    return `N${num}${L1}${L2}`; 
  }

  // 🌍 RESTO DEL MUNDO
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const s1 = alphabet[Math.floor(Math.random() * 26)];
  const s2 = alphabet[Math.floor(Math.random() * 26)];
  const s3 = alphabet[Math.floor(Math.random() * 26)];
  return `${prefix}${s1}${s2}${s3}`;
}


/* ============================================================
   🟦 BUY USED AIRCRAFT — BACKEND AUTHORITY LOCK v1.0
   ------------------------------------------------------------
   Purpose:
   - Prevent legacy localStorage purchase flow
   - Prevent frontend finance mutation
   - Prevent frontend fleet creation
   - Prepare for backend endpoint:
     POST /v1/aircraft/used-market/:id/buy
   ============================================================ */

function buyUsed(id) {
  const list = generateUsedMarket();
  const ac = list.find(x => String(x.id) === String(id));

  if (!ac) {
    alert("❌ Aircraft not found in Used Market.");
    return;
  }

  console.log("🟦 BUY USED REQUEST BLOCKED — BACKEND ENDPOINT REQUIRED:", {
    listing_id: id,
    aircraft: ac
  });

  alert(
    "🟦 ACS Used Market\n\n" +
    "Used aircraft purchase is now backend-controlled.\n\n" +
    "Next step:\n" +
    "POST /v1/aircraft/used-market/:id/buy\n\n" +
    "No localStorage finance, fleet, or market mutation was executed."
  );
}

/* ============================================================
   🟦 LEASE USED AIRCRAFT — BACKEND AUTHORITY LOCK v1.0
   ------------------------------------------------------------
   Purpose:
   - Prevent legacy localStorage lease flow
   - Prevent frontend finance mutation
   - Prevent frontend fleet creation
   - Prepare for future backend endpoint:
     POST /v1/aircraft/used-market/:id/lease
   ============================================================ */

function leaseUsed(id) {
  const list = generateUsedMarket();
  const ac = list.find(x => String(x.id) === String(id));

  if (!ac) {
    alert("❌ Aircraft not found in Used Market.");
    return;
  }

  console.log("🟦 LEASE USED REQUEST BLOCKED — BACKEND ENDPOINT REQUIRED:", {
    listing_id: id,
    aircraft: ac
  });

  alert(
    "🟦 ACS Used Market\n\n" +
    "Used aircraft leasing is now backend-controlled.\n\n" +
    "Future step:\n" +
    "POST /v1/aircraft/used-market/:id/lease\n\n" +
    "No localStorage leasing, finance, fleet, or market mutation was executed."
  );
}

/* ============================================================
   8) MODAL INFO — ACTUALIZADO (Maintenance Patch v1.0)
   ============================================================ */
function openInfo(id) {
  const list = generateUsedMarket();
  const ac = list.find(x => x.id === id);
  if (!ac) return;

  const nameEl = document.getElementById("modalName");
  const detailsEl = document.getElementById("modalDetails");
  const modalEl = document.getElementById("infoModal");

  if (!nameEl || !detailsEl || !modalEl) return;

  /* =======================
     CALCULAR EDAD REAL
     ======================= */
  const simDate =
    (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime)
      ? new Date(ACS_TIME.currentTime)
      : new Date();

  const simYear = simDate.getUTCFullYear();
  const fabYear = ac.year;
  const ageYears = Math.max(0, simYear - fabYear);
  const ageMonths = ageYears * 12;
  const ageDays = ageMonths * 30;

  /* =======================
     FRECUENCIAS
     ======================= */
  const A_FREQ = 7;
  const B_FREQ = 30;
  const C_FREQ = 12;
  const D_FREQ = 96;

  /* =======================
     A / B Checks (días)
     ======================= */
  const nextA = A_FREQ - (ageDays % A_FREQ);
  const nextB = B_FREQ - (ageDays % B_FREQ);

  const A_status =
    (nextA <= 0 || nextA === A_FREQ)
      ? "Expired"
      : `${nextA.toFixed(1)} days`;

  const B_status =
    (nextB <= 0 || nextB === B_FREQ)
      ? "Expired"
      : `${nextB.toFixed(1)} days`;

  /* =======================
     C / D Checks (meses / años)
     ======================= */
  const nextC = C_FREQ - (ageMonths % C_FREQ);
  const nextD = D_FREQ - (ageMonths % D_FREQ);

  const C_status =
    (nextC <= 0 || nextC === C_FREQ)
      ? "Expired"
      : `${nextC.toFixed(1)} months`;

  const D_status =
    (nextD <= 0 || nextD === D_FREQ)
      ? "Expired"
      : `${(nextD / 12).toFixed(1)} years`;

  nameEl.textContent = `${ac.manufacturer} ${ac.model}`;

  detailsEl.innerHTML = `
    Seats: ${ac.seats}<br>
    Range: ${ac.range_nm} nm<br>
    Hours: ${ac.hours.toLocaleString()}<br>
    Cycles: ${ac.cycles.toLocaleString()}<br>
    Condition: ${ac.condition}<br>
    <hr style="border-color:#444;">
    <b>Maintenance Status</b><br>
    A-Check: ${A_status}<br>
    B-Check: ${B_status}<br>
    C-Check: ${C_status}<br>
    D-Check: ${D_status}<br>
    <hr style="border-color:#444;">
    Price: ${ACS_formatUSD(ac.price_acs_usd)}<br>
    Source: ${ac.source}<br>
  `;

  modalEl.style.display = "flex";
}

/* ============================================================
   9) INIT — BACKEND AUTHORITY
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("usedGrid");

  if (grid) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; padding:2rem; color:#ffb300;">
        Loading Used Aircraft Market...
      </div>
    `;
  }

  await ACS_loadUsedMarketFromBackend();

  buildFilterChips();
  renderUsedMarket("all");
});

window.buyUsed = buyUsed;
window.leaseUsed = leaseUsed;
window.openInfo = openInfo;

// =====================================================
// 🔥 UNIVERSAL — Generar matrícula real por país base
// =====================================================

function ACS_assignRegistration() {
    if (typeof ACS_generateRegistration === "function") {
        return ACS_generateRegistration();
    }
    return "UNASSIGNED";
}

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
  return window.ACS_getAircraftImage(ac);
}

/* ============================================================
   🖼️ ACS IMAGE FALLBACK SYSTEM — GLOBAL (SYNC WITH BUY NEW)
   ============================================================ */

function ACS_handleImageFallback(img) {
  window.ACS_handleAircraftImageFallback(img);
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

/* ============================================================
   🕒 ACS USED MARKET SIM QUERY — FRONTEND TIME AUTHORITY v1.0
   ------------------------------------------------------------
   Purpose:
   - Send ACS simulated date to backend Used Market endpoint.
   - Backend must not invent simulation date.
   ============================================================ */

function ACS_getUsedMarketSimQueryString() {
  if (
    typeof ACS_TIME === "undefined" ||
    !ACS_TIME ||
    !ACS_TIME.currentTime
  ) {
    throw new Error("ACS_TIME_NOT_AVAILABLE");
  }

  const simDate = new Date(ACS_TIME.currentTime);

  if (Number.isNaN(simDate.getTime())) {
    throw new Error("INVALID_ACS_TIME");
  }

  const params = new URLSearchParams({
    sim_year: String(simDate.getUTCFullYear()),
    sim_month: String(simDate.getUTCMonth() + 1),
    sim_day: String(simDate.getUTCDate())
  });

  return params.toString();
}

/* ============================================================
   🕒 ACS USED MARKET — TIME AUTHORITY WAIT v1.2
   ------------------------------------------------------------
   Purpose:
   - Wait for live ACS simulated time.
   - Reject bootstrap 01 JAN 1940.
   - No console spam.
   - Backend receives ACS time authority only.
   ============================================================ */

function ACS_waitForUsedMarketTimeReady(maxAttempts = 80, delayMs = 250) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts += 1;

      try {
        if (
          typeof ACS_TIME !== "undefined" &&
          ACS_TIME &&
          ACS_TIME.currentTime
        ) {
          const simDate = new Date(ACS_TIME.currentTime);

          const isValidDate =
            !Number.isNaN(simDate.getTime());

          const isLiveACSDate =
            isValidDate &&
            simDate.getUTCFullYear() > 1940;

          if (isLiveACSDate) {
            return resolve(simDate);
          }
        }
      } catch (error) {
        /* Silent wait — no console spam */
      }

      if (attempts >= maxAttempts) {
        return reject(new Error("ACS_TIME_READY_TIMEOUT"));
      }

      setTimeout(check, delayMs);
    };

    check();
  });
}

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
    source:
    row.remarketing_agent && (row.previous_operator_name || row.previous_operator)
    ? `${row.remarketing_agent} / ${row.previous_operator_name || row.previous_operator}`
    : row.remarketing_agent
      ? row.remarketing_agent
      : row.previous_operator_name || row.previous_operator || "Eagle Broker",

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
       const simQuery = ACS_getUsedMarketSimQueryString();

    const response = await fetch(`${ACS_USED_MARKET_ENDPOINT}?${simQuery}`, {
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
      <img alt="${ac.manufacturer} ${ac.model}" />
      
      <h3>${ac.manufacturer} ${ac.model}</h3>

      <p>Year: ${ac.year}</p>
      <p>Seats: ${ac.seats}</p>
      <p>Range: ${Number(ac.range_nm || 0).toLocaleString("en-US")} nm</p>
      <p>Hours: ${Number(ac.hours || 0).toLocaleString("en-US")}</p>
      <p>Condition: ${ac.condition || "—"}</p>
      <p><b>Price: ${ACS_formatUSD(ac.price_acs_usd)}</b></p>

      <button
        class="ac-options"
        type="button"
        onclick="openUsedOptions('${ac.id}')"
      >
        BUY / LEASE
      </button>

      <button
        class="ac-info"
        type="button"
        onclick="openInfo('${ac.id}')"
      >
        AIRCRAFT INFO
      </button>
    `;
    grid.appendChild(card);

     window.ACS_setAircraftImage(
     card.querySelector("img"),
     ac
     );
     
  });
}

/* ============================================================
   5A) USED MARKET — ACQUISITION OPTIONS
   ------------------------------------------------------------
   • Single production entry point from each aircraft card
   • BUY USED opens the existing purchase modal
   • LEASE USED opens the existing lease modal
   • No localStorage, Finance or Fleet mutation
   ============================================================ */

let ACS_selectedUsedOptionID = null;

function ACS_getUsedOptionsModal() {
  let modal = document.getElementById("usedOptionsModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "usedOptionsModal";
  modal.className = "acs-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("aria-labelledby", "usedOptionsTitle");
  modal.style.display = "none";

  modal.innerHTML = `
    <div class="acs-modal-content" style="max-width:560px;">
      <button
        id="closeUsedOptionsBtn"
        class="acs-close"
        type="button"
        aria-label="Close acquisition options"
      >
        &times;
      </button>

      <div style="padding-right:2.2rem; margin-bottom:1.25rem;">
        <div style="
          margin-bottom:0.45rem;
          color:#91cfff;
          font-size:0.72rem;
          font-weight:700;
          letter-spacing:0.16em;
        ">
          USED AIRCRAFT MARKET
        </div>

        <h2
          id="usedOptionsTitle"
          style="margin:0; color:#ffb300; font-size:1.35rem;"
        >
          ACQUISITION OPTIONS
        </h2>

        <h3
          id="usedOptionsAircraftName"
          style="margin:0.75rem 0 0.3rem; color:#fff; font-size:1.05rem;"
        >
          Used Aircraft
        </h3>

        <p
          id="usedOptionsAircraftSummary"
          style="margin:0; color:#aebbd3; font-size:0.88rem;"
        ></p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <button
          id="usedOptionsBuyBtn"
          class="acs-btn-primary"
          type="button"
          style="min-height:82px;"
        >
          BUY USED
        </button>

        <button
          id="usedOptionsLeaseBtn"
          class="acs-btn-secondary"
          type="button"
          style="min-height:82px;"
        >
          LEASE USED
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector("#closeUsedOptionsBtn")
    .addEventListener("click", closeUsedOptions);

  modal
    .querySelector("#usedOptionsBuyBtn")
    .addEventListener("click", selectUsedPurchase);

  modal
    .querySelector("#usedOptionsLeaseBtn")
    .addEventListener("click", selectUsedLease);

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeUsedOptions();
    }
  });

  return modal;
}

function openUsedOptions(id) {
  const aircraft = generateUsedMarket().find(
    item => String(item.id) === String(id)
  );

  if (!aircraft) {
    console.error("Used Market aircraft not found:", id);
    return;
  }

  const modal = ACS_getUsedOptionsModal();

  ACS_selectedUsedOptionID = aircraft.id;

  modal.querySelector("#usedOptionsAircraftName").textContent =
    `${aircraft.manufacturer} ${aircraft.model}`;

  modal.querySelector("#usedOptionsAircraftSummary").textContent =
    `${aircraft.year} · ` +
    `${Number(aircraft.hours || 0).toLocaleString("en-US")} hours · ` +
    `${aircraft.condition || "—"} condition`;

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  modal.querySelector("#usedOptionsBuyBtn").focus();
}

function closeUsedOptions() {
  const modal = document.getElementById("usedOptionsModal");
  if (!modal) return;

  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  ACS_selectedUsedOptionID = null;
  document.body.style.overflow = "";
}

function selectUsedPurchase() {
  if (ACS_selectedUsedOptionID === null) return;

  const aircraftID = ACS_selectedUsedOptionID;
  closeUsedOptions();
  window.openBuyModal(aircraftID);
}

function selectUsedLease() {
  if (ACS_selectedUsedOptionID === null) return;

  const aircraftID = ACS_selectedUsedOptionID;
  closeUsedOptions();
  window.openLeaseModal(aircraftID);
}

document.addEventListener("keydown", event => {
  const modal = document.getElementById("usedOptionsModal");

  if (
    event.key === "Escape" &&
    modal &&
    modal.style.display === "flex"
  ) {
    closeUsedOptions();
  }
});

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
   9) INIT — BACKEND AUTHORITY + ACS TIME READY v1.1
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("usedGrid");

  if (grid) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; padding:2rem; color:#ffb300;">
        Synchronizing ACS Time Engine...
      </div>
    `;
  }

  try {
    const simDate = await ACS_waitForUsedMarketTimeReady();

    console.log("🕒 ACS Used Market Time Authority Ready:", {
      sim_year: simDate.getUTCFullYear(),
      sim_month: simDate.getUTCMonth() + 1,
      sim_day: simDate.getUTCDate(),
      iso: simDate.toISOString()
    });

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

  } catch (error) {
    console.error("❌ Used Market could not load — ACS Time unavailable:", error);

    if (grid) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; padding:2rem; color:#ff4d4d;">
          ACS Time Engine unavailable. Used Market cannot be loaded safely.
        </div>
      `;
    }
  }
});

window.buyUsed = buyUsed;
window.leaseUsed = leaseUsed;
window.openInfo = openInfo;
window.openUsedOptions = openUsedOptions;
window.closeUsedOptions = closeUsedOptions;

// =====================================================
// 🔥 UNIVERSAL — Generar matrícula real por país base
// =====================================================

function ACS_assignRegistration() {
    if (typeof ACS_generateRegistration === "function") {
        return ACS_generateRegistration();
    }
    return "UNASSIGNED";
}

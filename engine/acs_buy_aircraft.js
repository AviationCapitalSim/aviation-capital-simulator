/* ============================================================
   === ACS BUY NEW 021225 AIRCRAFT ENGINE — CARDS VERSION (v2.3) =
   ------------------------------------------------------------
   • Usa ACS_AIRCRAFT_DB como base principal
   • Tarjetas con motores añadidos
   • Chips por fabricante
   • Modal BUY / LEASE con delivery realista
   • Sistema de backlog por fabricante
   • Auto-delivery hacia ACS_MyAircraft
   ============================================================ */

console.log("🟦 ACS Buy Aircraft Engine (Cards) — v2.3 Loaded");

/* ============================================================
   0) ENGINE SPECS
   ============================================================ */
const ACS_ENGINE_SPECS = {
  "L-10 Electra": { code:"PW R-985", n:2, power:"450 hp" },
  "L-12 Electra Junior": { code:"PW R-985", n:2, power:"450 hp" },
  "L-14 Super Electra": { code:"PW R-1690", n:2, power:"850 hp" },
  "L-18 Lodestar": { code:"PW R-1820", n:2, power:"1200 hp" },

  "DC-2": { code:"PW R-1690", n:2, power:"750 hp" },
  "DC-3": { code:"PW R-1830", n:2, power:"1200 hp" },
  "DC-4": { code:"PW R-2000", n:4, power:"1350 hp" },
  "DC-6": { code:"PW R-2800", n:4, power:"2400 hp" },

  "L-049 Constellation": { code:"Wright R-3350", n:4, power:"2200 hp" },
  "L-649 Constellation": { code:"Wright R-3350", n:4, power:"2500 hp" },
  "L-749 Constellation": { code:"Wright R-3350", n:4, power:"2600 hp" },

  "707-120": { code:"JT3C", n:4, power:"12k" },
  "707-320": { code:"JT4A", n:4, power:"15k" },
  "727-100": { code:"JT8D-1", n:3, power:"14k" },
  "727-200": { code:"JT8D-7", n:3, power:"14.5k" },

  "737-200": { code:"JT8D-9A", n:2, power:"14.5k" },
  "737-200 Advanced": { code:"JT8D-15", n:2, power:"15.5k" },
  "737-300": { code:"CFM56-3B1", n:2, power:"20k" },
  "737-400": { code:"CFM56-3C1", n:2, power:"23k" },
  "737-500": { code:"CFM56-3B1", n:2, power:"20k" },

  "737-600": { code:"CFM56-7B20", n:2, power:"22k" },
  "737-700": { code:"CFM56-7B22", n:2, power:"24k" },
  "737-800": { code:"CFM56-7B26", n:2, power:"27k" },
  "737-900": { code:"CFM56-7B27", n:2, power:"27k" },

  "747-100": { code:"JT9D-3A", n:4, power:"46k" },
  "747-200": { code:"JT9D-7A", n:4, power:"50k" },
  "747-300": { code:"JT9D-7R4G2", n:4, power:"53k" },
  "747-400": { code:"CF6-80C2", n:4, power:"59k" },
  "747-8 Intercontinental": { code:"GEnx-2B67", n:4, power:"66k" },

  "DC-10-10": { code:"CF6-6D", n:3, power:"40k" },
  "DC-10-30": { code:"CF6-50C", n:3, power:"51k" },

  "L-1011-100 TriStar": { code:"RB211-22B", n:3, power:"42k" },
  "L-1011-500 TriStar": { code:"RB211-524B", n:3, power:"50k" },

  "A300B2": { code:"CF6-50A", n:2, power:"47k" },
  "A300B4": { code:"CF6-50C2", n:2, power:"51k" },
  "A300-600": { code:"CF6-80C2", n:2, power:"59k" },

  "A310-200": { code:"CF6-80A", n:2, power:"51k" },
  "A310-300": { code:"CF6-80C2", n:2, power:"59k" },

  "A320-100": { code:"CFM56-5A1", n:2, power:"25k" },
  "A320-200": { code:"CFM56-5A3", n:2, power:"27k" },
  "A319-100": { code:"CFM56-5B6", n:2, power:"23k" },
  "A321-100": { code:"CFM56-5B1", n:2, power:"30k" },
  "A321-200": { code:"CFM56-5B3", n:2, power:"33k" },
  "A321-200 (Sharklets)": { code:"CFM56-5B3", n:2, power:"33k" },

  "A320neo": { code:"PW1127G-JM", n:2, power:"27k" },
  "A321neo": { code:"PW1130G-JM", n:2, power:"30k" },
  "A321LR": { code:"LEAP-1A32", n:2, power:"32k" },
  "A321XLR": { code:"LEAP-1A35", n:2, power:"35k" },

  "A330-200": { code:"CF6-80E1", n:2, power:"68k" },
  "A330-300": { code:"CF6-80E1", n:2, power:"68k" },
  "A330-800neo": { code:"Trent 7000", n:2, power:"72k" },
  "A330-900neo": { code:"Trent 7000", n:2, power:"72k" },

  "A340-500": { code:"Trent 553", n:4, power:"53k" },
  "A340-600": { code:"Trent 556", n:4, power:"56k" },

  "A350-900": { code:"Trent XWB-84", n:2, power:"84k" },
  "A350-900 (ULR)": { code:"Trent XWB-84", n:2, power:"84k" },
  "A350-1000": { code:"Trent XWB-97", n:2, power:"97k" },

  "A380-800": { code:"Trent 970", n:4, power:"70k" },
  "A380F (Freighter)": { code:"Trent 970", n:4, power:"70k" },

  "A220-100": { code:"PW1500G", n:2, power:"19k" },
  "A220-300": { code:"PW1500G", n:2, power:"23k" },
  "A220-500": { code:"PW1500G", n:2, power:"23k" },

  "777-200": { code:"GE90-75B", n:2, power:"75k" },
  "777-200ER": { code:"GE90-94B", n:2, power:"94k" },
  "777-300ER": { code:"GE90-115B", n:2, power:"115k" },
  "777-8": { code:"GE9X", n:2, power:"105k" },
  "777-9": { code:"GE9X", n:2, power:"105k" },

  "787-8 Dreamliner": { code:"GEnx-1B", n:2, power:"70k" },
  "787-9 Dreamliner": { code:"GEnx-1B", n:2, power:"70k" },
  "787-10 Dreamliner": { code:"GEnx-1B", n:2, power:"70k" },
  "787-9 (2025 Update)": { code:"GEnx-1B PIP", n:2, power:"70k" }
};

/* ============================================================
   🟧 MA-2 — CONDITION NORMALIZER (GLOBAL)
   ------------------------------------------------------------
   Purpose:
   - Convertir condición de mercado (A/B/C/D) a porcentaje
   - Usado SOLO al momento de BUY / LEASE
   - Fuente canónica de conditionPercent
   ------------------------------------------------------------
   Version: v1.0 | Mode: SIMULATION CORE
   ============================================================ */

function ACS_normalizeConditionPercent(input) {

  // ✔️ Si ya viene como porcentaje válido, se respeta
  if (typeof input === "number" && input >= 0 && input <= 100) {
    return Math.round(input);
  }

  // ✔️ Conversión desde condición de mercado
  switch (String(input).toUpperCase()) {
    case "A":
      return Math.floor(92 + Math.random() * 7); // 92–98
    case "B":
      return Math.floor(82 + Math.random() * 7); // 82–89
    case "C":
      return Math.floor(72 + Math.random() * 7); // 72–79
    case "D":
      return Math.floor(60 + Math.random() * 9); // 60–69
    default:
      console.warn("Unknown condition input:", input, "→ fallback 85%");
      return 85;
  }
}

/* ============================================================
   1) SLOTS POR FABRICANTE
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
  Lockheed: 28,
  "de Havilland": 18,
  "Sud Aviation": 10,
  Convair: 12,
  BAC: 10,
  Fokker: 15,
  COMAC: 20,
  Sukhoi: 18
};

/* ============================================================
   2) RESOLVER AÑO DE SIMULACIÓN
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
   3) FACTORY CATALOG — BACKEND AUTHORITY
   ------------------------------------------------------------
   Source of truth:
   GET /v1/aircraft/factory/catalog?year=<ACS_YEAR>

   Purpose:
   - Remove ACS_AIRCRAFT_DB dependency from Buy New
   - Consume PostgreSQL factory catalog
   - Keep historical OEM availability in backend
   - Normalize backend rows for existing Buy New UI
   ============================================================ */

const ACS_FACTORY_CATALOG_ENDPOINT =
  "https://api.aviationcapitalsim.com/v1/aircraft/factory/catalog";

let ACS_FACTORY_CATALOG_CACHE = {
  year: null,
  aircraft: []
};

function ACS_normalizeFactoryAircraft(row) {

  const manufacturer =
    row.manufacturer ||
    row.oem ||
    row.make ||
    "Unknown";

  const model =
    row.model ||
    row.aircraft_model ||
    row.aircraft_name ||
    row.model_key ||
    "Unknown Model";

  const year = Number(
    row.year ??
    row.production_year ??
    row.available_from ??
    row.start_year ??
    1940
  );

  const seats = Number(
    row.seats ??
    row.passenger_capacity ??
    row.capacity ??
    0
  );

  const range_nm = Number(
    row.range_nm ??
    row.range ??
    row.max_range_nm ??
    0
  );

  const speed_kts = Number(
    row.speed_kts ??
    row.cruise_speed_kts ??
    row.speed ??
    0
  );

  const price_acs_usd = Number(
    row.price_acs_usd ??
    row.price ??
    row.factory_price ??
    row.catalog_price ??
    0
  );

    const engines =
    String(
      row.engines ??
      row.powerplant ??
      row.engine_model ??
      ""
    ).trim();

  return {
    ...row,

    manufacturer,
    model,

    aircraft_name:
      row.aircraft_name ||
      `${manufacturer} ${model}`,

    model_key:
      row.model_key ||
      `${manufacturer}_${model}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, ""),

    family:
      row.family ||
      manufacturer ||
      model.split(" ")[0],

    year,
    seats,
    range_nm,
    speed_kts,
    price_acs_usd,
    engines
  };
}

async function ACS_fetchFactoryCatalog(year) {

  const simYear = Number(year || getCurrentSimYear() || 1940);

  if (
    ACS_FACTORY_CATALOG_CACHE.year === simYear &&
    Array.isArray(ACS_FACTORY_CATALOG_CACHE.aircraft) &&
    ACS_FACTORY_CATALOG_CACHE.aircraft.length > 0
  ) {
    return ACS_FACTORY_CATALOG_CACHE.aircraft;
  }

  const url =
    `${ACS_FACTORY_CATALOG_ENDPOINT}?year=${encodeURIComponent(simYear)}`;

  try {

    const response = await fetch(url, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Factory Catalog HTTP ${response.status}`);
    }

    const data = await response.json();

    const rawList =
      data.aircraft ||
      data.factory_catalog ||
      data.catalog ||
      data.items ||
      [];

    if (!data.ok && !Array.isArray(rawList)) {
      throw new Error("Factory Catalog returned invalid payload");
    }

    const normalized = rawList
      .map(ACS_normalizeFactoryAircraft)
      .filter(ac => ac.year <= simYear)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.manufacturer !== b.manufacturer) {
          return a.manufacturer.localeCompare(b.manufacturer);
        }
        return a.model.localeCompare(b.model);
      });

    ACS_FACTORY_CATALOG_CACHE = {
      year: simYear,
      aircraft: normalized
    };

    console.log(
      "🟩 ACS Factory Catalog loaded:",
      simYear,
      "COUNT:",
      normalized.length
    );

    return normalized;

  } catch (error) {

    console.error("❌ ACS Factory Catalog load failed:", error);

    ACS_FACTORY_CATALOG_CACHE = {
      year: simYear,
      aircraft: []
    };

    return [];
  }
}

async function getAircraftBase() {
  const simYear = getCurrentSimYear();
  return await ACS_fetchFactoryCatalog(simYear);
}

/* ============================================================
   4) CHIPS DE FABRICANTE
   ============================================================ */

async function buildFilterChips() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;

  const base = await getAircraftBase();

  const set = new Set(
    base
      .map(a => a.manufacturer)
      .filter(Boolean)
  );

  const list = Array.from(set).sort();

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

  bar.onclick = async e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    bar.querySelectorAll(".chip").forEach(c => {
      c.classList.remove("active");
    });

    chip.classList.add("active");

    await renderCards(chip.dataset.manufacturer);
  };
}

/* ============================================================
   5) IMAGEN AUTOMÁTICA — FACTORY CATALOG NORMALIZER
   ------------------------------------------------------------
   Purpose:
   - Adapt backend PostgreSQL aircraft names to ACS image filenames
   - Remove duplicated manufacturer prefix from model names
   - Support JPG first because ACS aircraft images are mostly JPG
   - Keep fallback to PNG
   - Preserve existing folder structure
   ============================================================ */

function ACS_slugAircraftName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function ACS_cleanImageModelName(ac) {
  if (!ac) return "";

  const manufacturer = String(ac.manufacturer || "").trim();
  let model = String(ac.model || ac.aircraft_name || "").trim();

  /* Remove manufacturer prefix if backend already includes it */
  if (manufacturer) {
    const re = new RegExp("^" + manufacturer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+", "i");
    model = model.replace(re, "").trim();
  }

  /* Remove common duplicated manufacturer names */
  model = model
    .replace(/^boeing\s+/i, "")
    .replace(/^douglas\s+/i, "")
    .replace(/^lockheed\s+/i, "")
    .replace(/^airbus\s+/i, "")
    .replace(/^avro\s+/i, "")
    .replace(/^convair\s+/i, "")
    .replace(/^de\s+havilland\s+/i, "")
    .replace(/^vickers\s+/i, "")
    .trim();

  return model;
}

/* ============================================================
   IMAGE ALIASES — ACS CANONICAL FILE NAMES
   ------------------------------------------------------------
   Add aliases here only when PostgreSQL model names differ from
   existing ACS image filenames.
   ============================================================ */

const ACS_IMAGE_MODEL_ALIASES = {

  /* Avro */
  "lancastrian": "lancastrian",

  /* Boeing */
  "247": "boeing_247",
  "307_stratoliner": "boeing_307_stratoliner",
  "377_stratocruiser": "b_377_stratocruiser",
  "c_97_stratofreighter": "c_97_stratofreighter",

  /* Douglas */
  "dc_2": "dc_2",
  "dc_3": "dc_3",
  "dc_4": "dc_4",
  "dc_5": "dc_5",
  "dc_6": "dc_6",

  /* Lockheed */
  "l_10_electra": "l_10_electra",
  "l_12_electra_junior": "l_12_electra_junior",
  "l_14_super_electra": "l_14_super_electra",
  "l_18_lodestar": "l_18_lodestar",
  "l_049_constellation": "l_049_constellation",
  "l_649_constellation": "l_649_constellation",
  "l_749_constellation": "l_749_constellation",

  /* Convair */
  "cv_240": "cv_240",
  "convair_cv_240": "cv_240",

  /* de Havilland */
  "dh_84_dragon": "dh_84_dragon",
  "dh_86_express": "dh_86_express",
  "dh_104_dove": "dh_104_dove",
  "dh_114_heron": "dh_114_heron"
};

function getAircraftImage(ac) {
  if (!ac || !ac.model || !ac.manufacturer) {
    return "img/placeholder_aircraft.jpg";
  }

  const manufacturer = String(ac.manufacturer || "").trim();

  let manuFolder = manufacturer;

  if (manufacturer.toLowerCase() === "de havilland") {
    manuFolder = "de_havilland";
  }

  const cleanModel = ACS_cleanImageModelName(ac);
  const baseSlug = ACS_slugAircraftName(cleanModel);
  const manufacturerSlug = ACS_slugAircraftName(manufacturer);

  const aliasSlug =
    ACS_IMAGE_MODEL_ALIASES[baseSlug] ||
    ACS_IMAGE_MODEL_ALIASES[`${manufacturerSlug}_${baseSlug}`] ||
    baseSlug;

  const candidates = [];

  /* JPG first — ACS aircraft library priority */
  candidates.push(`img/${manuFolder}/${aliasSlug}.jpg`);
  candidates.push(`img/${manuFolder}/${aliasSlug}.png`);

  /* fallback variants */
  candidates.push(`img/${manuFolder}/${baseSlug}.jpg`);
  candidates.push(`img/${manuFolder}/${baseSlug}.png`);

  candidates.push(`img/${manuFolder}/${manufacturerSlug}_${baseSlug}.jpg`);
  candidates.push(`img/${manuFolder}/${manufacturerSlug}_${baseSlug}.png`);

  /* root fallback */
  candidates.push(`img/${aliasSlug}.jpg`);
  candidates.push(`img/${aliasSlug}.png`);

  return candidates[0];
}

/* ============================================================
   6) RENDER DE TARJETAS
   ============================================================ */

let ACS_currentRenderedList = [];

async function renderCards(filterManufacturer = "All") {
  const grid = document.getElementById("cardsGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="card">
      <h3>Loading Factory Catalog...</h3>
      <div class="spec-line">Reading PostgreSQL OEM availability.</div>
    </div>
  `;

  const base = await getAircraftBase();

  const list =
    filterManufacturer === "All"
      ? base
      : base.filter(a => a.manufacturer === filterManufacturer);

  ACS_currentRenderedList = list;

  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = `
      <div class="card">
        <h3>No Aircraft Available</h3>
        <div class="spec-line">
          No factory aircraft are available for the current simulation year.
        </div>
      </div>
    `;
    return;
  }

  list.forEach((ac, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    const img = getAircraftImage(ac);

      const engineLine =
      String(ac.engines || "").trim() || "Not specified";
     

    const rangeLine = Number(ac.range_nm || 0).toLocaleString("en-US");
    const priceLine = Number(ac.price_acs_usd || 0).toLocaleString("en-US");

    card.innerHTML = `
      <img src="${img}" alt="${ac.model}"
       onerror="ACS_handleImageFallback(this)" />

      <h3>${ac.manufacturer} ${ac.model}</h3>
      <div class="spec-line">Year: ${ac.year}</div>
      <div class="spec-line">Seats: ${ac.seats}</div>
      <div class="spec-line">Range: ${rangeLine} nm</div>
      <div class="spec-line">Engines: ${engineLine}</div>
      <div class="spec-line">
        Price: $${priceLine}
      </div>

      <button data-index="${idx}" class="view-options-btn">VIEW OPTIONS</button>
    `;

    card.dataset.idx = idx;
    grid.appendChild(card);
  });
}

/* ============================================================
   🖼️ ACS IMAGE FALLBACK SYSTEM — FACTORY CATALOG SAFE
   ------------------------------------------------------------
   Purpose:
   - Try JPG / PNG variants
   - Avoid infinite 404 loops
   - Use JPG placeholder first
   ============================================================ */

function ACS_handleImageFallback(img) {

  if (!img) return;

  const currentSrc = img.getAttribute("src") || "";

  if (!img.dataset.fallbackStep) {
    img.dataset.fallbackStep = "0";
  }

  let step = Number(img.dataset.fallbackStep);
  step += 1;
  img.dataset.fallbackStep = String(step);

  if (step === 1 && currentSrc.endsWith(".jpg")) {
    img.src = currentSrc.replace(".jpg", ".png");
    return;
  }

  if (step === 2 && currentSrc.endsWith(".png")) {
    img.src = currentSrc.replace(".png", ".jpg");
    return;
  }

  img.onerror = null;
  img.src = "img/placeholder_aircraft.jpg";
}

/* ============================================================
   7) MODAL — OPEN / CLOSE
   ============================================================ */

let selectedAircraft = null;
let selectedAircraftImage = "";

function openBuyModal(ac) {
  selectedAircraft = ac;
  selectedAircraftImage = getAircraftImage(ac);

  document.getElementById("modalImage").src = selectedAircraftImage;
  document.getElementById("modalTitle").textContent =
    `${ac.manufacturer} ${ac.model}`;

  // BUY como default
  const opSel = document.getElementById("modalOperation");
  opSel.value = "BUY";

  document.getElementById("buyInitialPayment").style.display = "block";
  document.getElementById("leaseOptions").style.display = "none";

  updateModalSummary();

  document.getElementById("buyModal").style.display = "flex";
}

function closeBuyModal() {
  document.getElementById("buyModal").style.display = "none";
}

/* ============================================================
   🟦 FACTORY SLOTS MODAL — OEM SLOT BOARD
   ------------------------------------------------------------
   Purpose:
   - Open secondary Factory Slots modal from Buy New modal
   - Read PostgreSQL factory slot availability endpoint
   - Display operational OEM capacity only
   - Does NOT reserve slots
   - Does NOT touch POST /v1/aircraft/orders
   - Does NOT touch Finance
   - Does NOT touch Time Engine
   - Does NOT use localStorage
   ============================================================ */

const ACS_FACTORY_SLOTS_AVAILABILITY_ENDPOINT =
  "https://api.aviationcapitalsim.com/v1/aircraft/factory/slots/availability";

let ACS_factorySlotsState = {
  model_key: null,
  year: null,
  month: null
};

function ACS_getCurrentSimDateParts() {
  try {
    if (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime) {
      const d = new Date(ACS_TIME.currentTime);

      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        absoluteMonth: (d.getUTCFullYear() * 12) + (d.getUTCMonth() + 1)
      };
    }
  } catch (error) {
    console.warn("⚠️ Factory Slots could not read ACS_TIME:", error);
  }

  const fallbackYear = Number(getCurrentSimYear() || 1940);

  return {
    year: fallbackYear,
    month: 1,
    day: 1,
    absoluteMonth: (fallbackYear * 12) + 1
  };
}

function ACS_getMonthLabel(year, month) {
   
  const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const monthName = d.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC"
  }).toUpperCase();

  return `${monthName} ${d.getUTCFullYear()}`;
}

function ACS_getDaysInMonthUTC(year, month) {
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
}

function ACS_getOperationalDateLabel(year, month, day = 15) {
  const d = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day)
  ));

  const dd = String(d.getUTCDate()).padStart(2, "0");

  const monthName = d.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC"
  }).toUpperCase();

  return `${dd} ${monthName} ${d.getUTCFullYear()}`;
}

function ACS_getProjectedFactorySlotDateLabel(year, month, capacity, reserved) {
  const y = Number(year);
  const m = Number(month);
  const cap = Math.max(1, Number(capacity || 1));
  const res = Math.max(0, Number(reserved || 0));

  const nextSlotIndex = Math.min(res + 1, cap);
  const daysInMonth = ACS_getDaysInMonthUTC(y, m);

  /*
    Spread production releases across the month.
    Example:
    capacity 4  → day 6, 12, 18, 24 approx.
    capacity 8  → day 3/4, 7/8, 11/12, etc.
    capacity 1  → middle of month.
  */
  const projectedDay = Math.max(
    1,
    Math.min(
      daysInMonth,
      Math.round((nextSlotIndex / (cap + 1)) * daysInMonth)
    )
  );

  return ACS_getOperationalDateLabel(y, m, projectedDay);
}

function ACS_shiftFactorySlotsMonth(delta) {
  const currentSim = ACS_getCurrentSimDateParts();

  const y = Number(ACS_factorySlotsState.year);
  const m = Number(ACS_factorySlotsState.month);

  const d = new Date(Date.UTC(y, m - 1 + Number(delta || 0), 1));

  const targetYear = d.getUTCFullYear();
  const targetMonth = d.getUTCMonth() + 1;
  const targetAbsoluteMonth = (targetYear * 12) + targetMonth;

  if (targetAbsoluteMonth < currentSim.absoluteMonth) {
    console.warn("⛔ Factory Slots cannot navigate to past production months.");
    return;
  }

  ACS_factorySlotsState.year = targetYear;
  ACS_factorySlotsState.month = targetMonth;

  ACS_loadFactorySlotsAvailability();
}

function openFactorySlotsModal() {
  if (!selectedAircraft) {
    alert("❌ No aircraft selected.");
    return;
  }

  if (!selectedAircraft.model_key) {
    alert("❌ Aircraft model_key missing. Factory Slots cannot be loaded.");
    return;
  }

  const modal = document.getElementById("factorySlotsModal");

  if (!modal) {
    alert("❌ Factory Slots modal HTML not found.");
    return;
  }

  const simDate = ACS_getCurrentSimDateParts();

  ACS_factorySlotsState = {
    model_key: selectedAircraft.model_key,
    year: simDate.year,
    month: simDate.month
  };

  const manufacturer = String(selectedAircraft.manufacturer || "OEM").toUpperCase();
  const model = String(selectedAircraft.model || selectedAircraft.aircraft_name || "Aircraft");

  const title = document.getElementById("factorySlotsTitle");
  const subtitle = document.getElementById("factorySlotsSubtitle");

  if (title) {
    title.textContent = `${manufacturer} OEM SLOT BOARD`;
  }

  if (subtitle) {
    subtitle.textContent = `${model} · ${ACS_factorySlotsState.year}`;
  }

  modal.style.display = "flex";

  ACS_loadFactorySlotsAvailability();
}

function closeFactorySlotsModal() {
  const modal = document.getElementById("factorySlotsModal");
  if (modal) {
    modal.style.display = "none";
  }
}

async function ACS_loadFactorySlotsAvailability() {
  const state = ACS_factorySlotsState;

  if (!state.model_key || !state.year || !state.month) {
    console.warn("⚠️ Factory Slots state incomplete:", state);
    return;
  }
  const currentSim = ACS_getCurrentSimDateParts();

  const currentAbsoluteMonth =
    (Number(state.year) * 12) + Number(state.month);

  const prevDate = new Date(Date.UTC(state.year, state.month - 2, 1));
  const nextDate = new Date(Date.UTC(state.year, state.month, 1));

  const prevAbsoluteMonth =
    (prevDate.getUTCFullYear() * 12) + (prevDate.getUTCMonth() + 1);

  const prevLabel = document.getElementById("factorySlotsPrevLabel");
  const currentLabel = document.getElementById("factorySlotsCurrentLabel");
  const nextLabel = document.getElementById("factorySlotsNextLabel");
  const prevBtn = document.getElementById("factorySlotsPrevMonth");

  if (prevLabel) {
    prevLabel.textContent =
      prevAbsoluteMonth < currentSim.absoluteMonth
        ? "—"
        : ACS_getMonthLabel(
            prevDate.getUTCFullYear(),
            prevDate.getUTCMonth() + 1
          );
  }

  if (currentLabel) {
    currentLabel.textContent = ACS_getMonthLabel(state.year, state.month);
  }

  if (nextLabel) {
    nextLabel.textContent = ACS_getMonthLabel(
      nextDate.getUTCFullYear(),
      nextDate.getUTCMonth() + 1
    );
  }

  if (prevBtn) {
    prevBtn.disabled = currentAbsoluteMonth <= currentSim.absoluteMonth;
    prevBtn.style.opacity = prevBtn.disabled ? "0.35" : "1";
    prevBtn.style.cursor = prevBtn.disabled ? "not-allowed" : "pointer";
  }

  const capacityEl = document.getElementById("factorySlotsCapacity");
  const reservedEl = document.getElementById("factorySlotsReserved");
  const availableEl = document.getElementById("factorySlotsAvailable");
  const utilizationEl = document.getElementById("factorySlotsUtilization");
  const nextWindowEl = document.getElementById("factorySlotsNextWindow");

  if (capacityEl) capacityEl.textContent = "Loading...";
  if (reservedEl) reservedEl.textContent = "—";
  if (availableEl) availableEl.textContent = "—";
  if (utilizationEl) utilizationEl.textContent = "—";
  if (nextWindowEl) nextWindowEl.textContent = "—";

  const url =
    `${ACS_FACTORY_SLOTS_AVAILABILITY_ENDPOINT}` +
    `?model_key=${encodeURIComponent(state.model_key)}` +
    `&year=${encodeURIComponent(state.year)}` +
    `&month=${encodeURIComponent(state.month)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `Factory Slots HTTP ${response.status}`);
    }

    const slot =
      data.slot ||
      data.availability ||
      data.factory_slot ||
      data;

    const capacity = Number(
      data.capacity ??
      slot.capacity ??
      slot.max_quantity ??
      slot.available_quantity ??
      0
    );

    const reserved = Number(
      data.reserved ??
      slot.reserved ??
      slot.reserved_quantity ??
      0
    );

    const available = Number(
      data.available ??
      slot.available ??
      slot.available_quantity ??
      Math.max(0, capacity - reserved)
    );

    const utilization = Number(
      data.utilization ??
      data.utilization_pct ??
      slot.utilization ??
      slot.utilization_pct ??
      (capacity > 0 ? Math.round((reserved / capacity) * 100) : 0)
    );

      const rawNextWindow =
      data.next_available_delivery_window ||
      slot.next_available_delivery_window ||
      data.next_window ||
      null;

    let nextWindow = "—";

    if (
      rawNextWindow &&
      typeof rawNextWindow === "object" &&
      rawNextWindow.estimated_delivery_preview
    ) {
      const deliveryDate = new Date(rawNextWindow.estimated_delivery_preview);

      if (!Number.isNaN(deliveryDate.getTime())) {
        nextWindow = ACS_getOperationalDateLabel(
          deliveryDate.getUTCFullYear(),
          deliveryDate.getUTCMonth() + 1,
          deliveryDate.getUTCDate()
        );
      }
    } else if (rawNextWindow && typeof rawNextWindow === "object") {
      const nwYear =
        rawNextWindow.year ||
        rawNextWindow.slot_year ||
        rawNextWindow.delivery_year;

      const nwMonth =
        rawNextWindow.month ||
        rawNextWindow.slot_month ||
        rawNextWindow.delivery_month;

      if (nwYear && nwMonth) {
        nextWindow = ACS_getProjectedFactorySlotDateLabel(
          Number(nwYear),
          Number(nwMonth),
          capacity,
          reserved
        );
      }
    } else if (typeof rawNextWindow === "string") {
      nextWindow = rawNextWindow;
    } else {
      nextWindow = ACS_getProjectedFactorySlotDateLabel(
        state.year,
        state.month,
        capacity,
        reserved
      );
    }

    if (capacityEl) capacityEl.textContent = `${capacity}/month`;
    if (reservedEl) reservedEl.textContent = String(reserved);
    if (availableEl) availableEl.textContent = String(available);
    if (utilizationEl) utilizationEl.textContent = `${utilization}%`;
    if (nextWindowEl) nextWindowEl.textContent = nextWindow;

    console.log("🟩 ACS Factory Slots Availability:", data);

  } catch (error) {
    console.error("❌ ACS Factory Slots load failed:", error);

    if (capacityEl) capacityEl.textContent = "Unavailable";
    if (reservedEl) reservedEl.textContent = "—";
    if (availableEl) availableEl.textContent = "—";
    if (utilizationEl) utilizationEl.textContent = "—";
    if (nextWindowEl) nextWindowEl.textContent = "Unavailable";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const factorySlotsBtn = document.getElementById("factorySlotsBtn");
  const prevBtn = document.getElementById("factorySlotsPrevMonth");
  const nextBtn = document.getElementById("factorySlotsNextMonth");

  if (factorySlotsBtn) {
    factorySlotsBtn.addEventListener("click", openFactorySlotsModal);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      ACS_shiftFactorySlotsMonth(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      ACS_shiftFactorySlotsMonth(1);
    });
  }
});

/* ============================================================
   🟦 ACS DELIVERY PREVIEW — NO LOCALSTORAGE
   ------------------------------------------------------------
   Purpose:
   - Estimate modal delivery date without reserving slots
   - Does NOT write ACS_SLOT_CALENDAR
   - Does NOT mutate localStorage
   - Final delivery authority will be backend order endpoint
   ============================================================ */

function ACS_calculateDeliveryPreviewDate(qty) {
   
  const now = (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime)
    ? new Date(ACS_TIME.currentTime)
    : new Date();

  const quantity = Math.max(1, Number(qty || 1));

  const baseDays = 60;
  const bufferDays = Math.max(0, quantity - 1) * 15;

  return new Date(
    now.getTime() + ((baseDays + bufferDays) * 24 * 60 * 60 * 1000)
  );
}

/* ============================================================
   9) MODAL SUMMARY — BUY + LEASE
   ============================================================ */

function updateModalSummary() {
  if (!selectedAircraft) return;

  const op = document.getElementById("modalOperation").value;
  const qty = Math.max(
    1,
    parseInt(document.getElementById("modalQty").value, 10) || 1
  );

  const price = Number(selectedAircraft.price_acs_usd || 0);
  const total = price * qty;

  let summary = "";

  /* ============================================================
     🟦 DELIVERY PREVIEW — VIEW ONLY
     ------------------------------------------------------------
     Real delivery authority remains backend factory slot resolver.
     This preview does NOT reserve slots.
     ============================================================ */

  const deliveryDate = ACS_calculateDeliveryPreviewDate(qty);
  const d = deliveryDate.toUTCString().substring(5, 16);

  summary += `Estimated delivery: <b>${d}</b><br>`;

  /* ============================================================
     🟩 BUY NEW — PURCHASE / FINANCED PURCHASE
     ============================================================ */

  if (op === "BUY") {
    const pct =
      parseInt(document.getElementById("modalBuyInitialPct").value, 10) || 100;

    const initial = Math.round(total * (pct / 100));
    const final = Math.max(total - initial, 0);

    summary += `
      Initial Payment: <b>${ACS_formatUSD(initial)}</b><br>
      Delivery Payment: <b>${ACS_formatUSD(final)}</b>
    `;

    document.getElementById("leaseOptions").style.display = "none";
  }

  /* ============================================================
     🟦 LEASE NEW — AIRBUS OCC CONTRACT RULE v1.0
     ------------------------------------------------------------
     Lease New is NOT financed purchase.
     Lease New is a controlled operational lease contract.

     Rules:
     - Initial Lease Commitment: 15%
     - Monthly payment based on aircraft catalog value
     - No final purchase balance
     - No free return before contract end
     - End options handled later in My Aircraft:
       Extend / Buyout / Return at Contract End
     ============================================================ */

  if (op === "LEASE") {
    const years =
      parseInt(document.getElementById("modalLeaseYears").value, 10) || 10;

    const leaseInitialPct = 15;
    const leaseInitialCommitment = Math.round(total * (leaseInitialPct / 100));

    let monthlyRatePct = 0.0095;

    if (years === 5) {
      monthlyRatePct = 0.0125;
    } else if (years === 10) {
      monthlyRatePct = 0.0095;
    } else if (years === 15) {
      monthlyRatePct = 0.0075;
    }

    const termMonths = years * 12;
    const monthlyLeasePayment = Math.round(total * monthlyRatePct);

    const monthlyRateDisplay = (monthlyRatePct * 100).toFixed(2);

    summary += `
      Lease Duration: <b>${years} years / ${termMonths} months</b><br>
      Initial Lease Commitment (15%): <b>${ACS_formatUSD(leaseInitialCommitment)}</b><br>
      Monthly Lease Payment: <b>${ACS_formatUSD(monthlyLeasePayment)}</b><br>
      Monthly Lease Rate: <b>${monthlyRateDisplay}% of aircraft value</b><br>
      Total Aircraft Value: <b>${ACS_formatUSD(total)}</b><br><br>

      <span style="color:#ffca3a;">
        OCC Contract Lock:
      </span>
      <b>No free return before contract end.</b><br>

      <span style="color:#8ab4ff;">
        End-of-Lease options will be managed in My Aircraft:
      </span>
      <b>Extend / Buyout / Return at Contract End</b>
    `;

    document.getElementById("leaseOptions").style.display = "block";
  }

  document.getElementById("modalSummary").innerHTML = summary;
}

/* ============================================================
   10) CONFIRM BUY / LEASE
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  const opSel = document.getElementById("modalOperation");

  /* Mostrar/ocultar opciones BUY vs LEASE */
  opSel.addEventListener("change", () => {
    const isBuy = (opSel.value === "BUY");

    document.getElementById("buyInitialPayment").style.display =
      isBuy ? "block" : "none";

    document.getElementById("leaseOptions").style.display =
      isBuy ? "none" : "block";

    updateModalSummary();
  });

  /* Listener del BUY % inicial */
  const buyPctSel = document.getElementById("modalBuyInitialPct");
  if (buyPctSel) {
    buyPctSel.addEventListener("change", updateModalSummary);
  }

  /* Listener cantidad / años lease */
  const qtyInp = document.getElementById("modalQty");
  const leaseYears = document.getElementById("modalLeaseYears");

  if (qtyInp) qtyInp.addEventListener("input", updateModalSummary);
  if (leaseYears) leaseYears.addEventListener("change", updateModalSummary);

  const confirmBtn = document.getElementById("modalConfirm");

  /* ============================================================
     CONFIRMAR ORDEN
     ============================================================ */
   
    if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {

      if (!selectedAircraft) return;

      const ac = selectedAircraft;

      const op = document.getElementById("modalOperation").value;
      const qty = Math.max(
        1,
        parseInt(document.getElementById("modalQty").value, 10) || 1
      );

      /* ============================================================
   🟦 ACS LEASE NEW OCC PAYLOAD RULE v1.0
   ------------------------------------------------------------
   BUY:
   - Uses selected initial payment percentage.

   LEASE:
   - Initial Lease Commitment = 15%
   - Monthly lease rate based on selected contract duration.
   - Lease is NOT financed purchase.
   - Aircraft cannot be freely returned before contract end.
   ============================================================ */

const ownershipType =
  op === "LEASE"
    ? "LEASE"
    : "BUY";

const leaseYears =
  ownershipType === "LEASE"
    ? (parseInt(document.getElementById("modalLeaseYears").value, 10) || 10)
    : null;

const leaseTermMonths =
  ownershipType === "LEASE"
    ? leaseYears * 12
    : null;

let leaseRatePctMonthly = null;

if (ownershipType === "LEASE") {
  if (leaseYears === 5) {
    leaseRatePctMonthly = 0.0125;
  } else if (leaseYears === 10) {
    leaseRatePctMonthly = 0.0095;
  } else if (leaseYears === 15) {
    leaseRatePctMonthly = 0.0075;
  } else {
    leaseRatePctMonthly = 0.0095;
  }
}

const aircraftTotalValue =
  Number(ac.price_acs_usd || 0) * qty;

const monthlyLeasePayment =
  ownershipType === "LEASE"
    ? Math.round(aircraftTotalValue * leaseRatePctMonthly)
    : null;

const initialPaymentPct =
  ownershipType === "LEASE"
    ? 15
    : (parseInt(document.getElementById("modalBuyInitialPct").value, 10) || 100);

const leaseInitialCommitmentAmount =
  ownershipType === "LEASE"
    ? Math.round(aircraftTotalValue * 0.15)
    : null;

const lessorName =
  ownershipType === "LEASE"
    ? "Eagle Aviation Capital"
    : null;

const remarketingAgent =
  ownershipType === "LEASE"
    ? "Eagle Broker"
    : null;

const leasePolicyVersion =
  ownershipType === "LEASE"
    ? "ACS_LEASE_NEW_OCC_V1"
    : null;

            const simDateSource =
        (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime)
          ? new Date(ACS_TIME.currentTime)
          : new Date(Date.UTC(Number(getCurrentSimYear() || ac.year || 1940), 0, 1));

      const simYear = simDateSource.getUTCFullYear();
      const simMonth = simDateSource.getUTCMonth() + 1;
      const simDay = simDateSource.getUTCDate();
       
      if (!ac.model_key) {
        alert("❌ Aircraft model_key missing. Order cannot be created.");
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = "Processing...";

      try {

        const response = await fetch(
          "https://api.aviationcapitalsim.com/v1/aircraft/orders",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json"
            },
          body: JSON.stringify({
  model_key: ac.model_key,
  quantity: qty,
  ownership_type: ownershipType,
  initial_payment_pct: initialPaymentPct,
  sim_year: simYear,
  sim_month: simMonth,
  sim_day: simDay,

  /* Lease New OCC metadata */
  lease_years: leaseYears,
  lease_term_months: leaseTermMonths,
  monthly_lease_payment: monthlyLeasePayment,
  lease_initial_commitment_pct: ownershipType === "LEASE" ? 15 : null,
  lease_initial_commitment_amount: leaseInitialCommitmentAmount,
  lease_rate_pct_monthly: leaseRatePctMonthly,
  lessor_name: lessorName,
  remarketing_agent: remarketingAgent,
  lease_policy_version: leasePolicyVersion
})
          }
        );

        const result = await response.json();

        if (!response.ok || !result.ok) {

          if (result.error === "INSUFFICIENT_CAPITAL") {
            alert(
              "❌ Not enough capital to place this order.\n\n" +
              "Available capital: " + ACS_formatUSD(Number(result.capital || 0)) + "\n" +
              "Required payment: " + ACS_formatUSD(Number(result.required || 0))
            );
            return;
          }

          alert(
            "❌ Order rejected by backend.\n\n" +
            (result.error || result.details || "Unknown error")
          );
          return;
        }

        console.log("🟩 ACS OEM ORDER CREATED:", result);

        alert("✅ Order placed successfully!");

        closeBuyModal();

        setTimeout(() => {
          window.location.href = "my_aircraft.html";
        }, 300);

      } catch (error) {

        console.error("❌ ACS ORDER CREATE FAILED:", error);

        alert(
          "❌ Could not create aircraft order.\n\n" +
          "Please check connection and try again."
        );

      } finally {

        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm Order";

      }

    }); // ← Cierra confirmBtn.addEventListener
  }     // ← Cierra if(confirmBtn)

});    // ← Cierra DOMContentLoaded (ÚNICA Y CORRECTA)

/* ---- Card click → open modal ---- */

document.addEventListener("click", e => {
  const btn = e.target.closest(".view-options-btn");
  if (!btn) return;

  const idx = parseInt(btn.dataset.index);
  const ac = ACS_currentRenderedList[idx];   // LISTA FILTRADA REAL

  if (!ac) return;

  openBuyModal(ac);
});

/* ============================================================
   🚀 INIT SEQUENCE — FACTORY CATALOG READY
   ------------------------------------------------------------
   Purpose:
   - Wait for ACS Time Engine when available
   - Allow 1940 as valid simulation year
   - Load Factory Catalog from backend
   - Render Buy New cards from PostgreSQL authority
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  async function initBuyNewWhenTimeReady() {

    const simYear = Number(getCurrentSimYear() || 1940);

    if (!simYear || simYear < 1940) {
      return setTimeout(initBuyNewWhenTimeReady, 200);
    }

 await buildFilterChips();
await renderCards("All");

console.log(
  "🟩 Buy New Aircraft — Factory Catalog Initialized:",
  simYear
);
  }

  initBuyNewWhenTimeReady();

});

/* ============================================================
   FIX — REGISTRATION GENERATOR
   ============================================================ */
if (typeof ACS_generateRegistration !== "function") {
  function ACS_generateRegistration() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const a = letters[Math.floor(Math.random() * 26)];
    const b = letters[Math.floor(Math.random() * 26)];
    const n = Math.floor(100 + Math.random() * 900);
    return `N${a}${b}-${n}`;
  }
}

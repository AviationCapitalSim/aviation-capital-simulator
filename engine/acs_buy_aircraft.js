/* ============================================================
   === ACS BUY NEW AIRCRAFT ENGINE — TABLE VERSION (v1.0) =====
   ------------------------------------------------------------
   • Lee la base global window.ACS_AIRCRAFT_DB
   • Genera chips de fabricante (All + OEMs únicos)
   • Renderiza tabla con modelos disponibles
   • Aplica filtro por fabricante
   • Modal de información básica (especificaciones)
   • Botón Buy → placeholder (luego se integra con Finance/MyAircraft)
   ============================================================ */

console.log("✅ ACS Buy New Aircraft Engine loaded");

/* ============================================================
   1) HELPERS BÁSICOS
   ============================================================ */

/**
 * Devuelve el año actual de simulación si existe algún motor de tiempo.
 * Si no, usa 2025 para que se vean todos los aviones.
 */
function getCurrentSimYear() {
  try {
    if (typeof getSimYear === "function") {
      return getSimYear();
    }
    if (window.ACS_TIME && ACS_TIME.currentTime) {
      return new Date(ACS_TIME.currentTime).getUTCFullYear();
    }
    // Intento adicional: leer de ACS_Cycle si existe
    const cycle = JSON.parse(localStorage.getItem("ACS_Cycle") || "{}");
    if (cycle.currentSimDate) {
      return new Date(cycle.currentSimDate).getUTCFullYear();
    }
  } catch (e) {
    console.warn("⚠️ No se pudo leer el año de simulación:", e);
  }
  // Fallback: año moderno para que se vea todo
  return 2025;
}

/**
 * Formatea rango (nm).
 */
function formatRangeNm(rangeNm) {
  if (!rangeNm || isNaN(rangeNm)) return "—";
  return rangeNm.toLocaleString("en-US") + " nm";
}

/**
 * Formatea precio ACS en USD como millones (ej: $72.0M).
 */
function formatPriceUsd(num) {
  if (!num || isNaN(num)) return "—";
  const millions = num / 1_000_000;
  return "$" + millions.toFixed(1) + "M";
}

/* ============================================================
   2) OBTENER BASE DE DATOS
   ============================================================ */

function getAircraftBase() {
  if (!window.ACS_AIRCRAFT_DB || !Array.isArray(window.ACS_AIRCRAFT_DB)) {
    console.error("❌ ACS_AIRCRAFT_DB no está definido o no es un array.");
    return [];
  }

  const simYear = getCurrentSimYear();

  // Por ahora: mostramos todos los que tengan año <= simYear
  // y estado activo/cancelled/future (pero no filtramos por estado aún).
  const list = window.ACS_AIRCRAFT_DB.filter(a => {
    if (!a || typeof a !== "object") return false;
    if (typeof a.year !== "number") return true; // si no tiene año, no bloqueamos
    return a.year <= simYear;
  });

  // Orden por año y después por modelo
  list.sort((a, b) => {
    const ya = a.year || 0;
    const yb = b.year || 0;
    if (ya !== yb) return ya - yb;
    const ma = a.model || "";
    const mb = b.model || "";
    return ma.localeCompare(mb);
  });

  return list;
}

/* ============================================================
   3) GENERAR CHIPS DE FABRICANTE
   ============================================================ */

function buildFilterChips() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;

  const base = getAircraftBase();
  const manufacturersSet = new Set();

  base.forEach(a => {
    if (a.manufacturer) manufacturersSet.add(a.manufacturer);
  });

  const manufacturers = Array.from(manufacturersSet).sort((a, b) =>
    a.localeCompare(b)
  );

  bar.innerHTML = "";

  // Chip ALL
  const allChip = document.createElement("div");
  allChip.className = "chip active";
  allChip.dataset.manufacturer = "All";
  allChip.textContent = "All";
  bar.appendChild(allChip);

  // Chips por fabricante
  manufacturers.forEach(m => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.manufacturer = m;
    chip.textContent = m;
    bar.appendChild(chip);
  });

  // Listener de chips
  bar.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    // activar/desactivar visual
    Array.from(bar.querySelectorAll(".chip")).forEach(c =>
      c.classList.remove("active")
    );
    chip.classList.add("active");

    const manu = chip.dataset.manufacturer || "All";
    renderAircraftTable(manu);
  });
}

/* ============================================================
   4) RENDER TABLA DE MODELOS
   ============================================================ */

function renderAircraftTable(filterManufacturer = "All") {
  const tbody = document.getElementById("aircraftTableBody");
  if (!tbody) return;

  const base = getAircraftBase();

  let filtered = base;
  if (filterManufacturer && filterManufacturer !== "All") {
    filtered = base.filter(a => a.manufacturer === filterManufacturer);
  }

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:0.8rem;">
          No aircraft available for this selection.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = "";

  filtered.forEach((ac, idx) => {
    const tr = document.createElement("tr");

    const engines = ac.engines || (ac.fuel_burn_kgph && ac.seats ? "—" : "—");
    const seats = typeof ac.seats === "number" ? ac.seats.toString() : "—";
    const range = formatRangeNm(ac.range_nm);
    const price = formatPriceUsd(ac.price_acs_usd);

    tr.innerHTML = `
      <td>${ac.model || "—"}</td>
      <td>${ac.year || "—"}</td>
      <td>${engines}</td>
      <td>${seats}</td>
      <td>${range}</td>
      <td>${price}</td>
      <td>
        <button class="btn-buy" data-index="${idx}" data-manu="${ac.manufacturer || ""}">
          Buy
        </button>
      </td>
      <td>
        <button class="btn-info" data-index="${idx}" data-manu="${ac.manufacturer || ""}">
          Info
        </button>
      </td>
    `;

    // Guardamos una referencia interna al objeto
    tr.dataset.manufacturer = ac.manufacturer || "";
    tr.dataset.model = ac.model || "";
    tbody.appendChild(tr);
  });
}

/* ============================================================
   5) MODAL DE INFO
   ============================================================ */

function openInfoModal(aircraft) {
  const modal = document.getElementById("infoModal");
  const titleEl = document.getElementById("infoTitle");
  const listEl = document.getElementById("infoList");
  if (!modal || !titleEl || !listEl) return;

  titleEl.textContent = `${aircraft.manufacturer || ""} ${aircraft.model || ""}`.trim();

  const lines = [];

  if (aircraft.year) lines.push(`Year: ${aircraft.year}`);
  if (aircraft.seats) lines.push(`Seats: ${aircraft.seats}`);
  if (aircraft.range_nm) lines.push(`Range: ${formatRangeNm(aircraft.range_nm)}`);
  if (aircraft.speed_kts) lines.push(`Cruise speed: ${aircraft.speed_kts} kts`);
  if (aircraft.mtow_kg) lines.push(`MTOW: ${aircraft.mtow_kg.toLocaleString("en-US")} kg`);
  if (aircraft.fuel_burn_kgph)
    lines.push(`Fuel burn: ${aircraft.fuel_burn_kgph.toLocaleString("en-US")} kg/h`);
  if (aircraft.price_acs_usd)
    lines.push(`ACS price: ${formatPriceUsd(aircraft.price_acs_usd)}`);
  if (aircraft.status)
    lines.push(`Status: ${aircraft.status}`);

  listEl.innerHTML = "";
  lines.forEach(txt => {
    const li = document.createElement("li");
    li.textContent = txt;
    listEl.appendChild(li);
  });

  modal.style.display = "flex";
}

function closeInfoModal() {
  const modal = document.getElementById("infoModal");
  if (modal) modal.style.display = "none";
}

// cierre por click fuera
document.addEventListener("click", (e) => {
  const modal = document.getElementById("infoModal");
  if (!modal || modal.style.display !== "flex") return;

  if (e.target === modal) {
    closeInfoModal();
  }
});

// cierre por ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeInfoModal();
  }
});

/* ============================================================
   6) GESTIÓN DEL BOTÓN BUY (placeholder)
   ============================================================ */

function handleBuyAircraft(aircraft) {
  // Más adelante: integrar con Finance + MyAircraft (delivery delay, slots, leasing, etc.)
  const price = formatPriceUsd(aircraft.price_acs_usd);
  alert(
    `✅ Pending integration\n` +
    `You selected: ${aircraft.manufacturer || ""} ${aircraft.model || ""}\n` +
    `ACS price: ${price}\n\n` +
    `In the next phase, this will create a purchase order and send the aircraft to My Aircraft with delivery time.`
  );
}

/* ============================================================
   7) INICIALIZACIÓN
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // 1) Construir filtros
  buildFilterChips();

  // 2) Render inicial (All)
  renderAircraftTable("All");

  // 3) Delegar clicks en la tabla (Buy / Info)
  const tbody = document.getElementById("aircraftTableBody");
  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const infoBtn = e.target.closest(".btn-info");
      const buyBtn = e.target.closest(".btn-buy");
      const base = getAircraftBase();

      if (infoBtn) {
        const manu = infoBtn.dataset.manu;
        const idx = parseInt(infoBtn.dataset.index, 10);
        const filtered = base.filter(a => !manu || a.manufacturer === manu);
        const aircraft = filtered[idx];
        if (aircraft) openInfoModal(aircraft);
        return;
      }

      if (buyBtn) {
        const manu = buyBtn.dataset.manu;
        const idx = parseInt(buyBtn.dataset.index, 10);
        const filtered = base.filter(a => !manu || a.manufacturer === manu);
        const aircraft = filtered[idx];
        if (aircraft) handleBuyAircraft(aircraft);
        return;
      }
    });
  }

  console.log("✈️ Buy New Aircraft table initialized.");
});

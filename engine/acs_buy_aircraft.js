/* ============================================================
   === ACS BUY NEW AIRCRAFT ENGINE — CARDS VERSION (v2.2) =====
   ------------------------------------------------------------
   • Usa ACS_AIRCRAFT_DB como base principal
   • Tarjetas con motores añadidos
   • Chips por fabricante
   • Modal BUY / LEASE con delivery realista
   • Sistema de backlog por fabricante
   • Auto-delivery hacia ACS_MyAircraft
   ============================================================ */

console.log("🟦 ACS Buy Aircraft Engine (Cards) — v2.2 Loaded");

/* ============================================================
   0) ENGINE SPECS (Compact Version for Cards)
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

let ACS_SLOTS = JSON.parse(localStorage.getItem("ACS_SLOTS") || "{}");
function saveSlots() {
  localStorage.setItem("ACS_SLOTS", JSON.stringify(ACS_SLOTS));
}

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
   3) RESOLVER BASE DE DATOS
   ============================================================ */
function resolveAircraftDB() {
  if (typeof ACS_AIRCRAFT_DB !== "undefined") return ACS_AIRCRAFT_DB;
  if (typeof ACS_AIRCRAFT_MASTER_DB !== "undefined") return ACS_AIRCRAFT_MASTER_DB;

  console.error("❌ No se encontró base de datos ACS_AIRCRAFT_DB");
  return [];
}

function getAircraftBase() {
  const db = resolveAircraftDB();
  const simYear = getCurrentSimYear();

  return db
    .filter(a => a.year <= simYear)
    .sort((a, b) => a.year - b.year);
}

/* ============================================================
   4) CHIPS DE FABRICANTE
   ============================================================ */
function buildFilterChips() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;

  const base = getAircraftBase();
  const set = new Set(base.map(a => a.manufacturer));
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

  bar.addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    bar.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");

    renderCards(chip.dataset.manufacturer);
  });
}

/* ============================================================
   5) IMAGEN AUTOMÁTICA — CARPETAS POR FABRICANTE
   ============================================================ */
function getAircraftImage(ac) {
  if (!ac || !ac.model || !ac.manufacturer) {
    return "img/placeholder_aircraft.png";
  }

  let manuFolder = ac.manufacturer
    .trim()
    .replace(/\s+/g, " ");

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
   6) RENDER DE TARJETAS
   ============================================================ */
function renderCards(filterManufacturer = "All") {
  const grid = document.getElementById("cardsGrid");
  if (!grid) return;

  const base = getAircraftBase();
  const list = filterManufacturer === "All"
    ? base
    : base.filter(a => a.manufacturer === filterManufacturer);

  grid.innerHTML = "";

  list.forEach((ac, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    const img = getAircraftImage(ac);

    const eng = ACS_ENGINE_SPECS[ac.model] ||
      ACS_ENGINE_SPECS[ac.model.replace(/^Airbus |Boeing |McDonnell Douglas |Douglas |Lockheed /, "")];

    const engineLine = eng ? `${eng.code} (${eng.n}×${eng.power})` : ac.engines;

    card.innerHTML = `
  <img src="${img}" alt="${ac.model}"
       onerror="this.onerror=null; this.src='img/placeholder_aircraft.png';" />
  <h3>${ac.manufacturer} ${ac.model}</h3>
  <div class="spec-line">Year: ${ac.year}</div>
  <div class="spec-line">Seats: ${ac.seats}</div>
  <div class="spec-line">Range: ${ac.range_nm.toLocaleString()} nm</div>
  <div class="spec-line">Engines: ${engineLine}</div>
  <div class="spec-line">Price: $${(ac.price_acs_usd / 1_000_000).toFixed(1)}M</div>
  <button data-index="${idx}" class="view-options-btn">VIEW OPTIONS</button>
`;

    card.dataset.idx = idx;
    grid.appendChild(card);
  });
}

/* ============================================================
   7) MODAL
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
  const deliveryMonth = Math.floor(monthsFraction);

  return new Date(Date.UTC(deliveryYear, deliveryMonth, 15));
}

/* ============================================================
   9) MODAL SUMMARY
   ============================================================ */
function updateModalSummary() {
  if (!selectedAircraft) return;

  const op = document.getElementById("modalOperation").value;
  const qty = Math.max(1, parseInt(document.getElementById("modalQty").value) || 1);

  const price = selectedAircraft.price_acs_usd || 0;

  let summary = "";

  const deliveryDate = calculateDeliveryDate(selectedAircraft, qty);
  const d = deliveryDate.toUTCString().substring(5, 16);
  summary += `Estimated delivery: <b>${d}</b><br>`;

  // ===============================================================
  // 4️⃣ BUY NEW — RESUMEN COMPLETO CON PAGO INICIAL Y PAGO FINAL
  // ===============================================================
  if (op === "BUY") {

    const pct = parseInt(document.getElementById("modalBuyInitialPct").value) || 100;
    const total = price * qty;

    const initial = total * (pct / 100);
    const final = total - initial;

    summary += `
        Initial Payment: <b>$${(initial/1_000_000).toFixed(2)}M</b><br>
        Delivery Payment: <b>$${(final/1_000_000).toFixed(2)}M</b>
    `;

    document.getElementById("leaseOptions").style.display = "none";
  }

  // 🟩 CIERRE FINAL QUE FALTABA
  document.getElementById("modalSummary").innerHTML = summary;
}
/* ============================================================
   10) CONFIRM BUY / LEASE
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  const opSel = document.getElementById("modalOperation");

  // ===============================================================
  // 2️⃣ BUY NEW — SHOW/HIDE INITIAL PAYMENT (%) + UPDATE SUMMARY
  // ===============================================================
  opSel.addEventListener("change", () => {

    const isBuy = (opSel.value === "BUY");

    // Mostrar u ocultar bloques según el tipo de operación
    document.getElementById("buyInitialPayment").style.display = isBuy ? "block" : "none";
    document.getElementById("leaseOptions").style.display = isBuy ? "none" : "block";

    updateModalSummary();
  });

  // ===============================================================
  // 3️⃣ BUY NEW — Listener del porcentaje inicial (50 / 75 / 100)
  // ===============================================================
  const buyPctSel = document.getElementById("modalBuyInitialPct");
  if (buyPctSel) {
    buyPctSel.addEventListener("change", updateModalSummary);
  }

  const qtyInp = document.getElementById("modalQty");
  const leaseYears = document.getElementById("modalLeaseYears");

  // ❌ Eliminado leasePct porque ya NO existe modalInitialPct

  if (qtyInp) qtyInp.addEventListener("input", updateModalSummary);
  if (leaseYears) leaseYears.addEventListener("change", updateModalSummary);

  const confirmBtn = document.getElementById("modalConfirm");

  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {

      const ac = selectedAircraft;
      if (!ac) return;

      const op = document.getElementById("modalOperation").value;
      const qty = Math.max(1, parseInt(document.getElementById("modalQty").value) || 1);

      // Cálculo de entrega
      const deliveryDate = calculateDeliveryDate(ac, qty);

      const manu = ac.manufacturer;

      // Actualizar backlog del fabricante
      if (!ACS_SLOTS[manu]) ACS_SLOTS[manu] = 0;
      ACS_SLOTS[manu] += qty;
      saveSlots();

      // Cargar pendientes
      let pending = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

      // Entrada general de orden
      const entry = {
        id: "order-" + Date.now(),
        manufacturer: ac.manufacturer,
        model: ac.model,
        qty,
        type: op,
        price: ac.price_acs_usd || 0,
        image: selectedAircraftImage,
        deliveryDate: deliveryDate.toISOString(),
        created: new Date().toISOString()
      };

      /* ============================================================
         BUY NEW — APLICAR DESCUENTOS Y PAGOS (INICIAL / FINAL)
         ============================================================ */
      if (op === "BUY") {

        const pct = parseInt(document.getElementById("modalBuyInitialPct").value) || 100;
        const total = (ac.price_acs_usd || 0) * qty;

        entry.total = total;
        entry.initialPct = pct;

        const initialPayment = total * (pct / 100);
        entry.initialPayment = initialPayment;

        // Descontar SOLO el pago inicial ahora
        let balance = parseFloat(localStorage.getItem("ACS_FinanceBalance") || "0");
        balance -= initialPayment;
        localStorage.setItem("ACS_FinanceBalance", balance.toString());
      }

      /* ============================================================
         LEASE NEW — APLICAR PAGO INICIAL
         ============================================================ */
      if (op === "LEASE") {

        const years = parseInt(document.getElementById("modalLeaseYears").value) || 10;
        entry.years = years;

        const total = (ac.price_acs_usd || 0) * qty;

        // Pago inicial — default leasing (50%)
        const upfront = total * 0.50;
        entry.initialPayment = upfront;

        // Descuento financiero
        let balance = parseFloat(localStorage.getItem("ACS_FinanceBalance") || "0");
        balance -= upfront;
        localStorage.setItem("ACS_FinanceBalance", balance.toString());

        // Crear contrato de leasing si existe el engine
        if (typeof ACS_Leasing_createContract === "function") {

          const months = years * 12;
          const remaining = total - upfront;
          const monthlyRate = (remaining / months) * 1.11;

          const contract = ACS_Leasing_createContract(
            ac.model,
            Math.round(monthlyRate),
            months,
            "NEW",
            { hours: 0, cycles: 0 }
          );

          // Calendarios de C y D
          if (typeof ACS_MyAircraft_addLeasedAircraft === "function") {
            const deliveryDate = new Date();
            const nextC = new Date(deliveryDate);
            nextC.setUTCFullYear(nextC.getUTCFullYear() + 1);

            const nextD = new Date(deliveryDate);
            nextD.setUTCFullYear(nextD.getUTCFullYear() + 8);

            contract.nextC = nextC.toISOString();
            contract.nextD = nextD.toISOString();
          }

          console.log("📦 NEW Leasing contract created:", contract);
        }

      } // END LEASE

      // Guardar en pendientes
      pending.push(entry);

      // Alerta opcional
      if (typeof ACS_addAlert === "function") {
        ACS_addAlert(
          "order",
          "low",
          `New aircraft order created: ${entry.model} x${entry.qty}`
        );
      }

      localStorage.setItem("ACS_PendingAircraft", JSON.stringify(pending));

      alert("✅ Order successfully created!");
      closeBuyModal();
    });
  }

  /* ---- Card click → open modal ---- */
  document.addEventListener("click", e => {
    const btn = e.target.closest(".view-options-btn");
    if (!btn) return;

    const idx = parseInt(btn.dataset.index);
    const base = getAircraftBase();
    const ac = base[idx];
    if (!ac) return;

    openBuyModal(ac);
  });

  /* ---- Initialize ---- */
  buildFilterChips();
  renderCards("All");
  checkDeliveries();

  console.log("🟩 Buy Aircraft Cards System — Ready");
});
/* ============================================================
   11) AUTO-DELIVERY ENGINE
   ============================================================ */
function checkDeliveries() {

  let myFleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let pending = JSON.parse(localStorage.getItem("ACS_PendingAircraft") || "[]");

  let now = new Date();
  if (typeof ACS_TIME !== "undefined" && ACS_TIME.currentTime) {
    now = new Date(ACS_TIME.currentTime);
  }

  const remaining = [];

  pending.forEach(entry => {
    const d = new Date(entry.deliveryDate);

    if (now >= d) {

      // Por cada unidad del pedido → añadir un avión nuevo al fleet
      for (let i = 0; i < entry.qty; i++) {
        myFleet.push({
          id: "AC-" + Date.now() + "-" + i,
          model: entry.model,
          manufacturer: entry.manufacturer,
          year: now.getUTCFullYear(),
          delivered: d.toISOString(),
          image: entry.image,

          status: "Active",
          hours: 0,
          cycles: 0,
          condition: 100,
          registration: ACS_generateRegistration(),

          data: (
            resolveAircraftDB().find(m =>
              m.manufacturer === entry.manufacturer && m.model === entry.model
            ) || {}
          ),

          lastC: null,
          lastD: null,
          nextC: null,
          nextD: null
        });

        // Calendario inicial de mantenimientos
        const baseDeliveryDate = new Date(d);

        const nextCdate = new Date(baseDeliveryDate);
        nextCdate.setUTCFullYear(nextCdate.getUTCFullYear() + 1);

        const yearsToD = 6 + Math.floor(Math.random() * 3);
        const nextDdate = new Date(baseDeliveryDate);
        nextDdate.setUTCFullYear(nextDdate.getUTCFullYear() + yearsToD);

        // Aplicarlo al último avión añadido
        myFleet[myFleet.length - 1].nextC = nextCdate.toISOString();
        myFleet[myFleet.length - 1].nextD = nextDdate.toISOString();
      }

      // Reducir backlog del fabricante
      if (!ACS_SLOTS[entry.manufacturer]) ACS_SLOTS[entry.manufacturer] = 0;
      ACS_SLOTS[entry.manufacturer] =
        Math.max(0, ACS_SLOTS[entry.manufacturer] - entry.qty);

    } else {

      // Todavía no está listo → mantenerlo pendiente
      remaining.push(entry);
    }
  });

  // Guardar flota y pendientes
  localStorage.setItem("ACS_PendingAircraft", JSON.stringify(remaining));
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(myFleet));

  // Guardar backlog actualizado
  saveSlots();
}

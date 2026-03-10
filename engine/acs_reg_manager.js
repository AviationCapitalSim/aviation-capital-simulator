/* ============================================================
   === ACS REGISTRATION MANAGER — v1.1 =========================
   ------------------------------------------------------------
   • Manejador universal de matrículas
   • Lee prefijo desde ACS_Airline / ACS_Base
   • Modal para asignar / editar matrícula
   • Permite eliminar matrícula
   • Totalmente compatible con MyAircraft
   ============================================================ */

console.log("✅ ACS Registration Manager loaded");

/* ========= PERSISTENCIA LOCAL ============================== */
function loadMyAircraft() {
  return JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
}
function saveMyAircraft(arr) {
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(arr));
}

/* ============================================================
   🟧 MA-2.2 — REG PREFIX RESOLVER (GLOBAL REAL AVIATION)
   ------------------------------------------------------------
   • Fuente principal: ICAO prefix (primeras 2 letras)
   • Basado en asignaciones reales de registro mundial
   • Compatible con estructura actual
   • Sin archivo nuevo
   • Sin romper legacy
   ============================================================ */

function getRegistrationPrefix(){

  const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

  const baseICAO = user?.base?.icao;

  if(!baseICAO){
    console.warn("⚠ No base ICAO found");
    return "XX-";
  }

  const k2 = baseICAO.substring(0,2).toUpperCase();

  const ICAO_REG_DB = {

    // Americas
    "K":  "N",
    "C":  "C-",
    "SV": "YV-",
    "SK": "HK-",
    "SB": "PR-",
    "MM": "XA-",
    "SA": "LV-",
    "SC": "CC-",
    "SP": "OB-",

    // Europe
    "LE": "EC-",
    "LI": "I-",
    "LF": "F-",
    "ED": "D-",
    "EG": "G-",
    "EH": "PH-",
    "EB": "OO-",
    "LS": "HB-",

    // Asia
    "RJ": "JA-",
    "ZB": "B-",
    "OM": "A6-",
    "OE": "VT-",
    "RK": "HL-",
    "OJ": "JY-",
    "HS": "HS-",

    // Africa
    "FA": "ZS-",
    "HE": "SU-",
    "DN": "5N-",

    // Oceania
    "Y":  "VH-",
    "NZ": "ZK-",
    "AY": "P2-",
    "NF": "DQ-"
  };

  if(ICAO_REG_DB[k2]) return ICAO_REG_DB[k2];

  const k1 = baseICAO.substring(0,1).toUpperCase();

  if(ICAO_REG_DB[k1]) return ICAO_REG_DB[k1];

  console.warn("⚠ Unknown ICAO prefix:",baseICAO);

  return "XX-";
}

/* ========= VARIABLES DEL MODAL ============================== */

let REG_SELECTED_ID = null;

function openRegModal(acId) {
  REG_SELECTED_ID = acId;

  const modal = document.getElementById("regModal");
  const prefixEl = document.getElementById("regPrefix");
  const previewEl = document.getElementById("regFullPreview");
  const serialInput = document.getElementById("regSerialInput");

  if (!modal || !prefixEl || !previewEl) return;

  const prefix = getRegistrationPrefix();
  prefixEl.textContent = prefix;
  serialInput.value = "";
  previewEl.textContent = prefix + "00000";

  modal.style.display = "flex";
}

function closeRegModal() {
  const modal = document.getElementById("regModal");
  if (modal) modal.style.display = "none";
}

/* ========= PREVIEW DINÁMICO ================================ */
document.addEventListener("input", (ev) => {
  if (ev.target.id === "regSerialInput") {
    const prefix = document.getElementById("regPrefix").textContent;
    const preview = document.getElementById("regFullPreview");
    preview.textContent = prefix + ev.target.value.toUpperCase();
  }
});

/* ========= GUARDAR MATRÍCULA ================================ */
function saveRegistration() {
  if (!REG_SELECTED_ID) return;

  const serial = document.getElementById("regSerialInput").value.trim().toUpperCase();
  const prefix = document.getElementById("regPrefix").textContent;
  const fullReg = prefix + serial;

  if (serial.length < 2) {
    alert("⚠️ Serial too short.");
    return;
  }

  let fleet = loadMyAircraft();
  const idx = fleet.findIndex(ac => ac.id === REG_SELECTED_ID);
  if (idx === -1) {
    alert("❌ Aircraft not found.");
    return;
  }

  fleet[idx].registration = fullReg;
  saveMyAircraft(fleet);

  alert(`✔️ Registration saved:\n${fullReg}`);
  closeRegModal();

  if (typeof refreshFleetTable === "function") refreshFleetTable();
}

/* ============================================================
   🟦 ACS BASE RESOLVER — STRUCTURAL
   ------------------------------------------------------------
   ✔ Sin fallback país fijo
   ✔ Compatible con multi-continente
   ✔ Fuente única de verdad
   ============================================================ */

function getCurrentBaseICAO() {

  try {

    const user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}");

    const icao = user?.base?.icao || null;

    if (!icao) {
      console.warn("⚠️ No base ICAO defined in ACS_activeUser");
      return null;
    }

    return icao;

  } catch(err) {
    console.warn("⚠️ Base ICAO read error:", err);
    return null;
  }
}

/* ========= ELIMINAR MATRÍCULA =============================== */

function removeRegistration(acId) {
  let fleet = loadMyAircraft();
  const idx = fleet.findIndex(ac => ac.id === acId);
  if (idx === -1) return;

  delete fleet[idx].registration;
  saveMyAircraft(fleet);

  alert("✔️ Registration removed");

  if (typeof refreshFleetTable === "function") refreshFleetTable();
}
/* ============================================================
   === ACS FLEET NORMALIZER — ensures minimal structure ========
   ============================================================ */

function ACS_normalizeAircraft(ac) {
  if (!ac) return ac;

  // Campos obligatorios para mantenimiento
  ac.hours = ac.hours || 0;
  ac.cycles = ac.cycles || 0;
  ac.condition = ac.condition || 100;

  ac.lastC = ac.lastC || null;
  ac.nextC = ac.nextC || null;

  ac.lastD = ac.lastD || null;
  ac.nextD = ac.nextD || null;

  ac.base = ac.base || null;

  ac.maintenanceType = ac.maintenanceType || null;
  ac.alertCsent = ac.alertCsent || false;
  ac.alertDsent = ac.alertDsent || false;

  return ac;
}

/* ============================================================
   🟦 REGISTRATION RULES — MODERN REAL SYSTEM (STRUCTURAL)
   ------------------------------------------------------------
   ✔ Sin random
   ✔ Secuencial desde 1000
   ✔ Patrón real moderno por país
   ✔ Escalable
   ============================================================ */

const REG_RULES = {

  "YV-": { type: "numeric", length: 4 },   // Venezuela
  "N":   { type: "numeric", length: 5 },   // USA (sin guion)
  "HK-": { type: "numeric", length: 4 },   // Colombia
  "EC-": { type: "letters", length: 3 },   // Spain
  "D-":  { type: "letters", length: 4 },   // Germany
  "G-":  { type: "letters", length: 4 },   // UK
  "F-":  { type: "letters", length: 4 },   // France
  "I-":  { type: "letters", length: 4 },   // Italy
  "PR-": { type: "letters", length: 3 },   // Brazil
  "XA-": { type: "letters", length: 3 },   // Mexico
  "C-":  { type: "letters", length: 4 }    // Canada simplified

};
/* ============================================================
   🟦 ACS REGISTRATION GENERATOR — v5.0 (STRUCTURAL UNIVERSAL)
   ------------------------------------------------------------
   ✔ Usa REG_RULES
   ✔ Secuencial desde 1000
   ✔ Sin random
   ✔ Compatible con todo el sistema actual
   ============================================================ */

function ACS_generateRegistration() {

  const prefix = getRegistrationPrefix();
  const rule = REG_RULES[prefix];

  // Si no existe regla definida, fallback controlado
  if (!rule) {
    console.warn("⚠️ No REG_RULE defined for prefix:", prefix);
    return prefix + "1000";
  }

  const counterKey = "ACS_REG_COUNTER_" + prefix;
  let counter = parseInt(localStorage.getItem(counterKey) || "999");

  counter++;
  localStorage.setItem(counterKey, counter);

  /* ================================
     NUMERIC PATTERN
     ================================ */
  if (rule.type === "numeric") {

    let numberPart = counter.toString().padStart(rule.length, "0");

    // USA sin guion
    if (prefix === "N") {
      return "N" + numberPart;
    }

    return prefix + numberPart;
  }

  /* ================================
     LETTER PATTERN (Base26)
     ================================ */
  if (rule.type === "letters") {

    const letters = numberToLetters(counter - 1000, rule.length);
    return prefix + letters;
  }

  // Fallback seguro
  return prefix + "1000";
}

/* ============================================================
   🟦 ACS FLEET FACTORY — createFleetAircraft()
   ------------------------------------------------------------
   Purpose:
   - Único punto oficial de creación de aeronaves
   - Compatible con Buy New + Used
   - Arquitectura limpia y escalable
   ------------------------------------------------------------
   Version: v2.0 (Used-compatible)
   ============================================================ */

function createFleetAircraft(data = {}) {

  if (!data.manufacturer || !data.model) {
    console.error("❌ createFleetAircraft: Missing manufacturer/model");
    return null;
  }

  let fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  // 🔹 1 — ID técnico
  const newId = `AC-${Date.now()}-${fleet.length}`;

  // 🔹 2 — Matrícula oficial
  const registration = ACS_generateRegistration();

  // 🔹 3 — Determinar status según regla 3 primeros
  let status = fleet.length < 3 ? "Active" : "Pending";

  // 🔹 4 — Base actual
  let base = null;
  if (typeof getCurrentBaseICAO === "function") {
    base = getCurrentBaseICAO();
  }

  // 🔹 5 — Construcción del objeto (REAL AVIATION FINANCIAL STRUCTURE)

let aircraft = {
  id: newId,
  registration,
  manufacturer: data.manufacturer,
  model: data.model,
  family: data.family || "",
  base: base,
  status: status,

  // ================================
  // OPERACIONAL
  // ================================
  hours: typeof data.hours === "number" ? data.hours : 0,
  cycles: typeof data.cycles === "number" ? data.cycles : 0,
  conditionPercent: typeof data.conditionPercent === "number"
    ? data.conditionPercent
    : 100,

  isUsed: data.isUsed === true,

 // ================================
// FINANCIAL CORE (CANONICAL FIX)
// ================================

// Tipo real enviado desde Used / Buy
acquisitionType: typeof data.acquisitionType === "string"
  ? data.acquisitionType
  : (data.isUsed === true ? "Used Market" : "Factory"),

// Precio OEM histórico (desde DB)
originalCost: typeof data.oemPrice === "number"
  ? data.oemPrice
  : (typeof data.originalCost === "number" ? data.originalCost : 0),

// Precio realmente pagado
acquisitionCost: typeof data.acquisitionPrice === "number"
  ? data.acquisitionPrice
  : (typeof data.acquisitionCost === "number" ? data.acquisitionCost : 0),
};

  // 🔹 6 — Si Pending → asignar fecha liberación
  if (status === "Pending") {

    const now = (typeof ACS_getSimTime === "function")
      ? new Date(ACS_getSimTime())
      : new Date();

    const release = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    aircraft.pendingReleaseDate = release.toISOString();
  }

  // 🔹 7 — Enrichment desde DB si existe
  if (typeof ACS_enrichAircraftFromDB === "function") {
    aircraft = ACS_enrichAircraftFromDB(aircraft);
  }

  // 🔹 8 — Aplicar baseline SOLO a aviones nuevos
  if (!aircraft.isUsed && typeof ACS_applyMaintenanceBaseline === "function") {
    aircraft = ACS_applyMaintenanceBaseline(aircraft);
  }

  // 🔹 9 — Insertar en flota
  fleet.push(aircraft);
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));

  console.log(`🟢 Aircraft created: ${registration} (${status})`);

  return aircraft;
}

/* ============================================================
   Helper — Random Letters (A–Z)
   ============================================================ */

function randomLetters(n) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < n; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

function numberToLetters(num, length) {

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";

  for (let i = 0; i < length; i++) {
    result = alphabet[num % 26] + result;
    num = Math.floor(num / 26);
  }

  return result;
}

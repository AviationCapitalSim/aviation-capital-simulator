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

function getRegistrationPrefix() {

  let user = {};
  let baseObj = {};
  let airline = {};

  try { user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}"); } catch(e) {}
  try { baseObj = JSON.parse(localStorage.getItem("ACS_Base") || "{}"); } catch(e) {}
  try { airline = JSON.parse(localStorage.getItem("ACS_Airline") || "{}"); } catch(e) {}

  // 🔵 Resolver ICAO base (fuente más fuerte)
   
  const baseICAO =
  (user?.base?.icao) ||
  localStorage.getItem("ACS_baseICAO") ||
  baseObj?.icao ||
  airline?.baseICAO ||
  "";

  if (!baseICAO || baseICAO.length !== 4) {
    console.warn("⚠️ Invalid base ICAO — fallback to country.");
  }

  const k2 = baseICAO.substring(0,2).toUpperCase();

  /* ============================================================
     🌍 GLOBAL ICAO → REGISTRATION PREFIX TABLE
     (Real Aviation Core Mapping)
     ============================================================ */

  const ICAO_REG_DB = {

    // 🇺🇸 Americas
    "K":  "N-",   // USA
    "C":  "C-",   // Canada
    "SV": "YV-",  // Venezuela
    "SK": "HK-",  // Colombia
    "SB": "PR-",  // Brazil
    "MM": "XA-",  // Mexico
    "SA": "LV-",  // Argentina
    "SC": "CC-",  // Chile
    "SP": "OB-",  // Peru

    // 🇪🇺 Europe
    "LE": "EC-",  // Spain
    "LI": "I-",   // Italy
    "LF": "F-",   // France
    "ED": "D-",   // Germany
    "EG": "G-",   // UK
    "EH": "PH-",  // Netherlands
    "EB": "OO-",  // Belgium
    "LS": "HB-",  // Switzerland

    // 🇯🇵 Asia
    "RJ": "JA-",  // Japan
    "ZB": "B-",   // China
    "ZL": "ZK-",  // New Zealand
    "Y":  "VH-",  // Australia
    "OM": "A6-",  // UAE
    "OE": "VT-",  // India
    "RK": "HL-",  // South Korea
    "OJ": "JY-",  // Jordan
    "HS": "HS-",  // Thailand

    // 🌍 Africa
    "FA": "ZS-",  // South Africa
    "HE": "SU-",  // Egypt
    "DN": "5N-",  // Nigeria

    // 🌊 Oceania
    "NZ": "ZK-",  // New Zealand alt
    "AY": "P2-",  // Papua New Guinea
    "NF": "DQ-"   // Fiji
  };

  // 🔵 PRIORIDAD 1: Coincidencia 2 letras ICAO
  if (ICAO_REG_DB[k2]) return ICAO_REG_DB[k2];

  // 🔵 PRIORIDAD 2: Coincidencia 1 letra ICAO
  const k1 = baseICAO.substring(0,1).toUpperCase();
  if (ICAO_REG_DB[k1]) return ICAO_REG_DB[k1];

  // 🔵 PRIORIDAD 3: Fallback country (legacy)
  const country =
    user?.base?.country ||
    localStorage.getItem("ACS_baseCountry") ||
    baseObj?.country ||
    airline?.country ||
    "Unknown";

  const COUNTRY_FALLBACK = {
    "United States": "N-",
    "Spain": "EC-",
    "Italy": "I-",
    "France": "F-",
    "Germany": "D-",
    "United Kingdom": "G-",
    "Venezuela": "YV-",
    "Brazil": "PR-",
    "Japan": "JA-",
    "Australia": "VH-"
  };

  if (COUNTRY_FALLBACK[country]) return COUNTRY_FALLBACK[country];

  console.warn("⚠️ Registration prefix not mapped:", baseICAO, country);

  return "XX-"; // último fallback controlado
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

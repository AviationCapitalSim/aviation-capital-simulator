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
   🟧 MA-2.0 — REG PREFIX RESOLVER (BASE-AWARE, SINGLE TRUTH)
   ------------------------------------------------------------
   Purpose:
   - Derivar prefijo de matrícula desde la base REAL del usuario
   - Prioridad:
     1) ACS_activeUser.base (nuevo)
     2) Legacy keys (ACS_baseCountry / ACS_baseICAO)
     3) Legacy objects (ACS_Base / ACS_Airline)
   ------------------------------------------------------------
   Version: v2.1 | Date: 05 FEB 2026
   ============================================================ */

function getRegistrationPrefix() {

  // 0) Load legacy objects (safe)
  let airline = {};
  let baseObj = {};
  try { airline = JSON.parse(localStorage.getItem("ACS_Airline") || "{}"); } catch(e) {}
  try { baseObj = JSON.parse(localStorage.getItem("ACS_Base") || "{}"); } catch(e) {}

  // 1) Load activeUser (official new source)
  let user = {};
  try { user = JSON.parse(localStorage.getItem("ACS_activeUser") || "{}"); } catch(e) {}

  // 2) Resolve base ICAO (strong signal)
  const baseICAO =
    (user && user.base && user.base.icao) ? String(user.base.icao).toUpperCase() :
    (localStorage.getItem("ACS_baseICAO") ? String(localStorage.getItem("ACS_baseICAO")).toUpperCase() : "") ||
    (baseObj && baseObj.icao ? String(baseObj.icao).toUpperCase() : "");

  // 3) Resolve country name (fallback signal)
  const country =
    (user && user.base && (user.base.country || user.base.countryName)) ? (user.base.country || user.base.countryName) :
    (localStorage.getItem("ACS_baseCountry") || "") ||
    (baseObj.country || airline.country || "Unknown");

  // 4) Prefix table by country name (your existing logic, preserved)
  const PREFIX_TABLE = {
    "United States": "N-",
    "Spain": "EC-",
    "Kyrgyzstan": "EX-",
    "Russia": "RA-",
    "China": "B-",
    "Japan": "JA-",
    "France": "F-",
    "Germany": "D-",
    "Italy": "I-",
    "United Kingdom": "G-",
    "Canada": "C-",
    "Brazil": "PR-",
    "Mexico": "XA-",
    "Argentina": "LV-",
    "Chile": "CC-",
    "Peru": "OB-",
    "Australia": "VH-",
    "India": "VT-",
    "United Arab Emirates": "A6-",
    "Saudi Arabia": "HZ-",
    "South Korea": "HL-",
    "South Africa": "ZS-",
    "Unknown": "XX-"
  };

  // 5) ICAO-based override (more reliable than legacy country strings)
  //    Use first 2 letters when possible, else first 1 letter.
  const ICAO_TO_PREFIX_2 = {
    "LE": "EC-", // Spain
    "LI": "I-",  // Italy
    "LF": "F-",  // France
    "ED": "D-",  // Germany
    "EG": "G-",  // UK
    "RJ": "JA-", // Japan (your format)
    "FA": "ZS-", // South Africa
    "SB": "PR-", // Brazil (simplified in your model)
    "MM": "XA-", // Mexico
    "SA": "LV-", // Argentina
    "CC": "CC-", // Chile (not ICAO, kept only if you later use it)
  };

  const ICAO_TO_PREFIX_1 = {
    "K": "N-",   // USA
    "C": "C-",   // Canada
    "Y": "VH-",  // Australia
    "Z": "B-"    // China (simplified)
  };

  if (baseICAO && baseICAO.length === 4) {
    const k2 = baseICAO.substring(0, 2);
    const k1 = baseICAO.substring(0, 1);
    if (ICAO_TO_PREFIX_2[k2]) return ICAO_TO_PREFIX_2[k2];
    if (ICAO_TO_PREFIX_1[k1]) return ICAO_TO_PREFIX_1[k1];
  }

  // 6) Country-name fallback
  return PREFIX_TABLE[country] || PREFIX_TABLE["Unknown"];
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
   ACS REGISTRATION GENERATOR — v2.0
   ✔ Usa getRegistrationPrefix()
   ✔ Genera matrícula según país de base
   ✔ Compatible con Italia (I-ABC), USA, Brasil, etc.
   ============================================================ */

function ACS_generateRegistration() {

  const prefix = getRegistrationPrefix();  // ejemplo: "I-"

  // === Formatos especiales por país ===
  if (prefix === "N-") {
    // USA: N123AB
    const num = Math.floor(100 + Math.random() * 900);
    const letters = randomLetters(2);
    return `N${num}${letters}`;
  }

  if (prefix === "I-") {
    // Italia: I-ABC
    return `I-${randomLetters(3)}`;
  }

  if (prefix === "PR-") {
    // Brasil: PR-ABC
    return `PR-${randomLetters(3)}`;
  }

  // === Default global ===
  return prefix + randomLetters(3);
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

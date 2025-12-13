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

/* ========= OBTENER PREFIJO POR PAÍS BASE ==================== */
function getRegistrationPrefix() {
  const airline = JSON.parse(localStorage.getItem("ACS_Airline") || "{}");
  const base    = JSON.parse(localStorage.getItem("ACS_Base") || "{}");

  const country = base.country || airline.country || "Unknown";

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

  return PREFIX_TABLE[country] || "XX-";
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

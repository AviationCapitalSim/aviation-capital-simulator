/* ============================================================
   === ACS REGISTRATION MANAGER — v1.0 =========================
   ------------------------------------------------------------
   • Manejador global de matrículas
   • Lee prefijo desde ACS_Airline.country / ACS_Base.country
   • Abre modal, actualiza preview y guarda matrícula
   • No modifica nada más del juego
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
  previewEl.textContent = prefix + "00000";
  serialInput.value = "";

  modal.style.display = "flex";
}

function closeRegModal() {
  const modal = document.getElementById("regModal");
  if (modal) modal.style.display = "none";
}

/* ========= ACTUALIZAR PREVIEW DINÁMICAMENTE ================= */
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
    alert("❌ Aircraft not found in MyFleet.");
    return;
  }

  fleet[idx].registration = fullReg;
  saveMyAircraft(fleet);

  alert(`✔️ Registration assigned:\n${fullReg}`);

  closeRegModal();
}

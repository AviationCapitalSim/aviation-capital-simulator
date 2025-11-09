/* ============================================================
   === ACS CORE TIME SYSTEM v1.1 ===
   Central simulation clock for Aviation Capital Simulator
   Author: Capt. Francisco Pérez Barrera
   Date: 09 NOV 2025
   ============================================================ */

/*
🕐 Escala de tiempo del simulador:
  • 1 hora de juego = 60 segundos reales
  • 1 día = 24 minutos reales
  • 1 mes ≈ 12 horas reales
  • 1 año ≈ 6 días reales
*/

window.acsTime = {
  simTime: new Date(),      // tiempo simulado global
  hoursPassed: 0,           // total de horas simuladas
  monthCounter: 0,          // control de meses
  dayCounter: 0,            // control de días
  listeners: {}             // (futuro) sistema extendido de callbacks
};

// === ACTUALIZAR RELOJ COCKPIT ===
function acsUpdateClockDisplay() {
  const clockEl = document.getElementById("acs-clock");
  if (!clockEl) return;

  const hh = String(window.acsTime.simTime.getHours()).padStart(2, "0");
  const mm = String(window.acsTime.simTime.getMinutes()).padStart(2, "0");
  const date = window.acsTime.simTime.toDateString().toUpperCase();

  clockEl.textContent = `${hh}:${mm} — ${date}`;
}

// === AVANZAR TIEMPO GLOBAL ACS ===
function acsAdvanceTime() {
  // ✅ 1 segundo real = 1 minuto simulado (reloj más estable visualmente)
  window.acsTime.simTime.setMinutes(window.acsTime.simTime.getMinutes() + 1);

  // Cada 60 minutos simulados = 1 hora real de juego
  if (window.acsTime.simTime.getMinutes() === 0) {
    window.acsTime.hoursPassed++;
    document.dispatchEvent(new Event("acsTick"));
  }

  // --- EVENTO GLOBAL: cada 24 horas simuladas = 1 día ---
  if (window.acsTime.hoursPassed % 24 === 0 && window.acsTime.hoursPassed !== 0) {
    window.acsTime.dayCounter++;
    document.dispatchEvent(new Event("acsNewDay"));
  }

  // --- EVENTO GLOBAL: cada 720 horas simuladas = 1 mes ---
  if (window.acsTime.hoursPassed % 720 === 0 && window.acsTime.hoursPassed !== 0) {
    window.acsTime.monthCounter++;
    document.dispatchEvent(new Event("acsNewMonth"));
  }

  // --- EVENTO GLOBAL: cada 8640 horas simuladas = 1 año (12 meses) ---
  if (window.acsTime.hoursPassed % 8640 === 0 && window.acsTime.hoursPassed !== 0) {
    document.dispatchEvent(new Event("acsNewYear"));
  }

  // Actualiza el reloj cockpit sin mover el header
  acsUpdateClockDisplay();
}

// === INICIAR RELOJ CENTRAL ===
setInterval(acsAdvanceTime, 1000); // 1 seg real = 1 min simulado
acsUpdateClockDisplay();

// === API Opcional: sincronización manual ===
window.acsTime.syncNow = function() {
  acsUpdateClockDisplay();
};

// === Mensaje de consola al iniciar ===
console.log("%cACS CORE TIME SYSTEM v1.1 (Cockpit Stable) initialized", "color:#00ff80;font-weight:bold;");

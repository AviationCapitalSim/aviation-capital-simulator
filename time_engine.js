/* =====================================================
   === AVIATION CAPITAL SIMULATOR - TIME ENGINE v1.2 ===
   Date: 2025-11-08
   Description: Minute-based accelerated clock (1 sec = 1 min)
   ===================================================== */

const ACS_TIME = {
  currentTime: new Date("2025-01-01T00:00:00Z"), // inicio del tiempo del simulador
  tickInterval: null,
  listeners: [],
};

/* === Inicia el reloj virtual (1 seg real = +1 min juego) === */
function startACSTime() {
  ACS_TIME.tickInterval = setInterval(() => {
    ACS_TIME.currentTime = new Date(ACS_TIME.currentTime.getTime() + 60000); // +1 minuto virtual
    localStorage.setItem("acs_current_time", ACS_TIME.currentTime.toISOString());
    updateClockDisplay();
    notifyTimeListeners();
  }, 1000); // 1 segundo real
}

/* === Actualiza el reloj visual (solo formato HH:MM) === */
function updateClockDisplay() {
  const clockEl = document.getElementById("acs-clock");
  if (clockEl) {
    const t = ACS_TIME.currentTime;
    const hours = String(t.getUTCHours()).padStart(2, "0");
    const minutes = String(t.getUTCMinutes()).padStart(2, "0");
    const day = String(t.getUTCDate()).padStart(2, "0");
    const month = t.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = t.getUTCFullYear();
    cclockEl.textContent = `${hours}:${minutes}  —  ${day} ${month} ${year}`;
  }
}

/* === Permite que otros módulos (Finance, HR, etc.) escuchen el tiempo === */
function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* === Envía actualización a los módulos conectados === */
function notifyTimeListeners() {
  ACS_TIME.listeners.forEach((cb) => cb(ACS_TIME.currentTime));
}

/* === Detiene el reloj (por mantenimiento o pausa) === */
function stopACSTime() {
  clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* === Inicializa automáticamente === */
document.addEventListener("DOMContentLoaded", () => {
  const savedTime = localStorage.getItem("acs_current_time");
  ACS_TIME.currentTime = savedTime
    ? new Date(savedTime)
    : new Date("2025-01-01T00:00:00Z");
  startACSTime();
});

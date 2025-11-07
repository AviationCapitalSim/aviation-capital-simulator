/* =====================================================
   === AVIATION CAPITAL SIMULATOR - TIME ENGINE v1.2 ===
   Date: 2025-11-08
   Description: Minute-based accelerated clock (1 sec = 1 min)
   ===================================================== */

const ACS_TIME = {
  currentTime: new Date("2025-01-01T00:00:00Z"), // inicio del tiempo virtual
  tickInterval: null,
  listeners: [],
};

/* === Inicia el reloj virtual === */
function startACSTime() {
  // cada segundo real = 1 minuto de juego
  ACS_TIME.tickInterval = setInterval(() => {
    ACS_TIME.currentTime = new Date(ACS_TIME.currentTime.getTime() + 60000); // +1 minuto
    localStorage.setItem("acs_current_time", ACS_TIME.currentTime.toISOString());
    updateClockDisplay();
    notifyTimeListeners();
  }, 1000); // cada 1 segundo real
}

/* === Muestra hora y minuto del juego === */
function updateClockDisplay() {
  const clockEl = document.getElementById("acs-clock");
  if (clockEl) {
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    };
    clockEl.textContent =
      "🕒 " + ACS_TIME.currentTime.toLocaleString("en-US", options);
  }
}

/* === Permite que otros módulos reaccionen al tiempo === */
function registerTimeListener(callback) {
  if (typeof callback === "function") ACS_TIME.listeners.push(callback);
}

/* === Notifica los cambios a los módulos (HR, Finance, etc.) === */
function notifyTimeListeners() {
  ACS_TIME.listeners.forEach((cb) => cb(ACS_TIME.currentTime));
}

/* === Detiene el reloj === */
function stopACSTime() {
  clearInterval(ACS_TIME.tickInterval);
  ACS_TIME.tickInterval = null;
}

/* === Inicializa al cargar === */
document.addEventListener("DOMContentLoaded", () => {
  const savedTime = localStorage.getItem("acs_current_time");
  ACS_TIME.currentTime = savedTime
    ? new Date(savedTime)
    : new Date("2025-01-01T00:00:00Z");
  startACSTime();
});

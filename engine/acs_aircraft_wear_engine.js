/* ============================================================
   🟧 MA-6A — AIRCRAFT WEAR ENGINE (POST-FLIGHT)
   ------------------------------------------------------------
   Purpose:
   - Degradar conditionPercent por uso real
   - Ejecutar SOLO al cerrar vuelos
   - NO depende del runtime interno
   ------------------------------------------------------------
   Version: v1.0 | Era: 1940 (Piston)
   ============================================================ */

function ACS_applyWearAfterFlight({ registration, hours = 0, cycles = 0 }) {
  if (!registration) return;

  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  const idx = fleet.findIndex(a => a.registration === registration);
  if (idx === -1) return;

  const ac = fleet[idx];
  if (typeof ac.conditionPercent !== "number") return;

  // Coeficientes base (1940 pistón)
  const HOUR_WEAR   = 0.01;  // % por hora
  const CYCLE_WEAR  = 0.06;  // % por ciclo

  let wear = (hours * HOUR_WEAR) + (cycles * CYCLE_WEAR);

  // Modificador por estado
  if (ac.conditionPercent < 70) wear *= 1.25;
  else if (ac.conditionPercent < 80) wear *= 1.10;

  // Aplicar con piso
  ac.conditionPercent = Math.max(25, +(ac.conditionPercent - wear).toFixed(2));

  fleet[idx] = ac;
  localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
}

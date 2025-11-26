/* ============================================================
   === FLEET ENGINE v1.0 — Unificador Global ==================
   ------------------------------------------------------------
   • Normaliza la flota (estructura uniforme)
   • Asegura mantenimientos C y D
   • Compatible con Buy New + Used + Leasing
   • Se ejecuta automáticamente cada tick del Time Engine
   ============================================================ */

console.log("🛠️ Fleet Engine v1.0 Loaded");

/* ============================================================
   === NORMALIZADOR DE FLOTA ==================================
   ============================================================ */
function ACS_normalizeFleet() {
  let fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  let updated = false;

  fleet = fleet.map(ac => {
    if (!ac.status) ac.status = "Active";

    ac.hours = ac.hours ?? 0;
    ac.cycles = ac.cycles ?? 0;
    ac.condition = ac.condition ?? 100;

    if (!ac.lastC) ac.lastC = null;
    if (!ac.lastD) ac.lastD = null;

    if (!ac.nextC) {
      const base = new Date(ac.delivered || new Date());
      const d = new Date(base);
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      ac.nextC = d.toISOString();
      updated = true;
    }

    if (!ac.nextD) {
      const base = new Date(ac.delivered || new Date());
      const d = new Date(base);
      d.setUTCFullYear(d.getUTCFullYear() + 8);
      ac.nextD = d.toISOString();
      updated = true;
    }

    return ac;
  });

  if (updated) {
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    console.log("🟩 Fleet normalized.");
  }
}

/* ============================================================
   === AUTO-CONNECT TO TIME ENGINE ============================
   ============================================================ */

if (typeof registerTimeListener === "function") {
  registerTimeListener(() => {
    ACS_normalizeFleet();
  });
}

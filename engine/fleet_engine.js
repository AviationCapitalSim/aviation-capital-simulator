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
/* ============================================================
   === AUTO-MAINTENANCE (C/D Checks) Listener =================
   ============================================================ */

function ACS_checkMaintenance(simTime) {
  let fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  if (!fleet.length) return;

  let finance = JSON.parse(localStorage.getItem("ACS_Finance") || "{}");
  let log = JSON.parse(localStorage.getItem("ACS_Log") || "[]");

  let updated = false;

  fleet.forEach(ac => {
    const now = simTime instanceof Date ? simTime : new Date(simTime);

    /* === C-CHECK (Cada 12 meses) === */
    if (ac.nextC && now >= new Date(ac.nextC)) {
      const cost = ACS_getMaintenanceCost(ac, "C") || 150000;

      finance.capital -= cost;
      finance.expenses += cost;

      log.push({
        time: now.toISOString(),
        type: "Expense",
        source: `C-Check — ${ac.manufacturer} ${ac.model}`,
        amount: cost
      });

      const next = new Date(ac.nextC);
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      ac.lastC = now.toISOString();
      ac.nextC = next.toISOString();

      updated = true;
    }

    /* === D-CHECK (Cada 8 años) === */
    if (ac.nextD && now >= new Date(ac.nextD)) {
      const cost = ACS_getMaintenanceCost(ac, "D") || 4200000;

      finance.capital -= cost;
      finance.expenses += cost;

      log.push({
        time: now.toISOString(),
        type: "Expense",
        source: `D-Check — ${ac.manufacturer} ${ac.model}`,
        amount: cost
      });

      const next = new Date(ac.nextD);
      next.setUTCFullYear(next.getUTCFullYear() + 8);
      ac.lastD = now.toISOString();
      ac.nextD = next.toISOString();

      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem("ACS_MyAircraft", JSON.stringify(fleet));
    localStorage.setItem("ACS_Finance", JSON.stringify(finance));
    localStorage.setItem("ACS_Log", JSON.stringify(log));
    console.log("🔧 Maintenance cycle executed.");
  }
}

if (typeof registerTimeListener === "function") {
  registerTimeListener(ACS_checkMaintenance);
}
/* ============================================================
   === AUTO-LEASING MONTHLY PAYMENT ENGINE ====================
   ============================================================ */

function ACS_applyLeasing(simTime) {
  if (typeof ACS_Leasing_applyMonthlyCosts !== "function") return;

  const t = new Date(simTime);
  const ym = t.getUTCFullYear() + "-" + t.getUTCMonth();

  const last = localStorage.getItem("ACS_Leasing_LastTick");

  if (last !== ym) {
    localStorage.setItem("ACS_Leasing_LastTick", ym);
    console.log("💳 Leasing monthly cycle executed.");
    ACS_Leasing_applyMonthlyCosts();
  }
}

if (typeof registerTimeListener === "function") {
  registerTimeListener(ACS_applyLeasing);
}
/* ============================================================
   === ALERT SYSTEM — Maintenance / Leasing / Fleet Alerts ====
   ============================================================ */

function ACS_alertWatcher(simTime) {
  let fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");
  const now = new Date(simTime);

  fleet.forEach(ac => {
    if (new Date(ac.nextC) - now < 72*3600*1000) {
      ACS_addAlert("maintenance", "medium", `C-Check soon: ${ac.model}`);
    }

    if (new Date(ac.nextD) - now < 30*24*3600*1000) {
      ACS_addAlert("maintenance", "high", `D-Check approaching: ${ac.model}`);
    }

    if (ac.leasing && new Date(ac.leasing.nextPayment) <= now) {
      ACS_addAlert("leasing", "high", `Leasing payment due: ${ac.model}`);
    }
  });
}

if (typeof registerTimeListener === "function") {
  registerTimeListener(ACS_alertWatcher);
}

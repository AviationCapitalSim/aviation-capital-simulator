/* ============================================================
   🛫 ACS SLOT ENGINE — BASE MODEL v1.0
   ------------------------------------------------------------
   • Define slot capacity por aeropuerto
   • Define slots usados por día y hora
   • Guarda en localStorage
   ============================================================ */

if (!localStorage.getItem("ACS_SLOTS")) {
    localStorage.setItem("ACS_SLOTS", JSON.stringify({}));
}

const ACS_SLOTS = JSON.parse(localStorage.getItem("ACS_SLOTS") || "{}");

/* ============================================================
   🟦 A1.1 — Max Slots por Categoría
   ------------------------------------------------------------
   Primary Hub ........ 36/hr
   Major International . 24/hr
   Regional Airport .....12/hr
   Small Airport ........ 6/hr
   ============================================================ */

function ACS_getMaxSlotsByCategory(category = "") {
    const C = category.toUpperCase();

    if (C.includes("PRIMARY")) return 36;
    if (C.includes("HUB"))     return 36;

    if (C.includes("MAJOR"))   return 24;
    if (C.includes("INTERN"))  return 24;

    if (C.includes("REGIONAL")) return 12;

    return 6;  // Small/default
}

/* ============================================================
   🟦 A1.2 — Inicializar slots por aeropuerto
   ------------------------------------------------------------
   - Crea estructura:
     ACS_SLOTS[ICAO][DAY][HH:MM] = { used, max }
   ============================================================ */

function ACS_initAirportSlots(icao, category) {

    const max = ACS_getMaxSlotsByCategory(category);

    if (!ACS_SLOTS[icao]) ACS_SLOTS[icao] = {};

    const DAYS = ["mon","tue","wed","thu","fri","sat","sun"];

    DAYS.forEach(day => {
        if (!ACS_SLOTS[icao][day]) ACS_SLOTS[icao][day] = {};

        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 5) {

                const hh = String(h).padStart(2, "0");
                const mm = String(m).padStart(2, "0");
                const key = `${hh}:${mm}`;

                if (!ACS_SLOTS[icao][day][key]) {
                    ACS_SLOTS[icao][day][key] = {
                        used: 0,
                        max: max
                    };
                }
            }
        }
    });

    ACS_saveSlots();
}

function ACS_saveSlots() {
    localStorage.setItem("ACS_SLOTS", JSON.stringify(ACS_SLOTS));
}

/* ============================================================
   🟦 A1.3 — Obtener disponibilidad real
   ============================================================ */

function ACS_getSlotAvailability(icao, day, time) {
    if (!ACS_SLOTS[icao] || !ACS_SLOTS[icao][day]) {
        return { used: 0, max: 0 };
    }

    const slot = ACS_SLOTS[icao][day][time];

    if (!slot) return { used: 0, max: 0 };

    return {
        used: slot.used,
        max: slot.max,
        free: Math.max(0, slot.max - slot.used)
    };
}

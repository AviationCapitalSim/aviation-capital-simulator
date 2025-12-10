/* ============================================================
   🛫 ACS SLOT ENGINE — BASE MODEL v2.0 (FULL CONSOLIDATED)
   ------------------------------------------------------------
   • Motor oficial de Slots ACS
   • B1/B2/B3/B4 integrados
   • Compatible con Alert Engine Qatar Luxury
   ============================================================ */

/* ============================================================
   === STORAGE BASE ============================================
   ============================================================ */

if (!localStorage.getItem("ACS_SLOTS")) {
    localStorage.setItem("ACS_SLOTS", JSON.stringify({}));
}

let ACS_SLOTS = JSON.parse(localStorage.getItem("ACS_SLOTS") || "{}");

function ACS_saveSlots() {
    localStorage.setItem("ACS_SLOTS", JSON.stringify(ACS_SLOTS));
}

/* ============================================================
   🟦 A1.1 — Max Slots por Categoría
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
   🟦 A1.1B — Inicializar Slots ON-DEMAND (NO masivo)
   ------------------------------------------------------------
   • Solo crea la estructura básica por aeropuerto
   • NO crea 288 slots por día → Safari no colapsa
   • Los minutos exactos se crean solo al reservar un vuelo
   ============================================================ */
function ACS_initAirportSlots_onDemand(icao, category) {

    // Si ya existe → no recrear
    if (ACS_SLOTS[icao]) return;

    const max = ACS_getMaxSlotsByCategory(category);

    ACS_SLOTS[icao] = {};

    const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    DAYS.forEach(day => {
        ACS_SLOTS[icao][day] = {
            // Se inicia vacío, los slots se generarán dinámicamente
            // cuando se reserven rutas (ACS_bookRoute).
            __meta: {
                maxSlots: max
            }
        };
    });

    ACS_saveSlots();
}

/* ============================================================
   🟦 A1.2 — Inicializar slots por aeropuerto (LIGERO)
   ------------------------------------------------------------
   • Solo guarda la categoría y crea los días vacíos
   • NO crea 288 slots por día
   • Los horarios se crean luego, al reservar rutas
   ============================================================ */
function ACS_initAirportSlots(icao, category) {

    // Si ya existe, no hacemos nada
    if (ACS_SLOTS[icao]) return;

    const max = ACS_getMaxSlotsByCategory(category);

    // Nodo principal del aeropuerto
    ACS_SLOTS[icao] = {
        __meta: {
            maxSlots: max    // capacidad máxima por hora para este aeropuerto
        }
    };

    const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    // Creamos los días vacíos; los horarios se generarán más tarde
    DAYS.forEach(day => {
        ACS_SLOTS[icao][day] = {};
    });

    ACS_saveSlots();
}

/* ============================================================
   🟦 A1.3 — Obtener disponibilidad real (con meta)
   ------------------------------------------------------------
   • Si no existe el horario -> se considera FULL libre
   • Usa maxSlots guardado en __meta
   ============================================================ */

function ACS_getSlotAvailability(icao, day, time) {

    const airportSlots = ACS_SLOTS[icao];
    if (!airportSlots) {
        return { used: 0, max: 0, free: 0 };
    }

    const meta = airportSlots.__meta || {};
    const defaultMax =
        typeof meta.maxSlots === "number" && meta.maxSlots > 0
            ? meta.maxSlots
            : 6; // fallback

    const daySlots = airportSlots[day];
    if (!daySlots) {
        return { used: 0, max: defaultMax, free: defaultMax };
    }

    const slot = daySlots[time];
    if (!slot) {
        return { used: 0, max: defaultMax, free: defaultMax };
    }

    return {
        used: slot.used,
        max: slot.max,
        free: Math.max(0, slot.max - slot.used)
    };
}


/* ============================================================
   🟦 B1 — RELEASE SLOTS FOR ROUTE — v1.0
   ============================================================ */

function ACS_releaseSlotsForRoute(route) {

    if (!route || !Array.isArray(route.slotsBooked) || route.slotsBooked.length === 0) {
        return;
    }

    const slotsData = JSON.parse(localStorage.getItem("ACS_SLOTS") || "{}");
    let changed = false;

    route.slotsBooked.forEach(entry => {
        if (!entry) return;

        const ap   = entry.airport;
        const day  = entry.day;
        const time = entry.time;

        if (
            slotsData[ap] &&
            slotsData[ap][day] &&
            slotsData[ap][day][time]
        ) {
            const slot = slotsData[ap][day][time];
            slot.used = Math.max(0, (slot.used || 0) - 1);
            changed = true;
        }
    });

    if (changed) {
        localStorage.setItem("ACS_SLOTS", JSON.stringify(slotsData));
    }
}

/* ============================================================
   🟦 B2 — SIMPLE ALERT LOGGER FOR SLOT SYSTEM — v1.0
   ============================================================ */

function ACS_pushAlert(message, type = "info") {
    const now = new Date().toISOString();

    const raw = localStorage.getItem("ACS_Alerts") || "[]";
    const list = JSON.parse(raw);

    list.push({
        id: `ALRT_${Date.now()}_${Math.floor(Math.random()*9999)}`,
        type,
        message,
        createdAt: now
    });

    localStorage.setItem("ACS_Alerts", JSON.stringify(list));
}

/* ============================================================
   🟥 B3 — SLOT RETENTION SYSTEM (3-WEEK RULE) — v1.0
   ============================================================ */

function ACS_checkUnusedSlotsWeekly() {

    const raw = localStorage.getItem("scheduleItems") || "[]";
    const routes = JSON.parse(raw);

    if (!Array.isArray(routes) || routes.length === 0) {
        return;
    }

    const keptRoutes = [];

    routes.forEach(route => {

        const status = route.status || "active";

        const isSuspended =
            status === "suspended" ||
            status === "no_aircraft" ||
            status === "paused";

        if (!isSuspended) {
            route.unusedWeeks = 0;
            keptRoutes.push(route);
            return;
        }

        if (typeof route.unusedWeeks !== "number") {
            route.unusedWeeks = 0;
        }

        route.unusedWeeks += 1;

        const fnOut = route.flightNumberOut || "";
        const fnIn  = route.flightNumberIn  || "";
        const label = fnOut && fnIn
            ? `${fnOut} / ${fnIn}`
            : `${route.origin || "XXX"} → ${route.destination || "YYY"}`;

        if (route.unusedWeeks === 1) {
            ACS_pushAlert(
                `⚠️ Ruta ${label}: 1ª semana sin operar. Slot reservado pero sin aeronave asignada.`,
                "warning"
            );
            keptRoutes.push(route);
            return;
        }

        if (route.unusedWeeks === 2) {
            ACS_pushAlert(
                `⚠️⚠️ Ruta ${label}: 2ª semana sin operar. Riesgo de perder el slot si no se asigna un avión.`,
                "critical"
            );
            keptRoutes.push(route);
            return;
        }

        if (route.unusedWeeks >= 3) {

            try {
                ACS_releaseSlotsForRoute(route);
            } catch (e) {
                console.warn("Error releasing slots for route:", label, e);
            }

            ACS_pushAlert(
                `❌ Ruta ${label}: slots eliminados automáticamente tras 3 semanas sin operar.`,
                "critical"
            );

            return;
        }

    });

    localStorage.setItem("scheduleItems", JSON.stringify(keptRoutes));
}

/* ============================================================
   🅱️1 — BUILD SLOTS FOR ROUTE — v1.0
   ============================================================ */

function ACS_buildSlotsForRoute(route) {

    if (!route) return [];

    const origin = route.origin;
    const dest   = route.destination;

    const days = Array.isArray(route.weekdays) ? route.weekdays : [];
    const dep  = route.departureUTC;
    const arr  = route.arrivalUTC;

    if (!origin || !dest || days.length === 0 || !dep || !arr) {
        console.warn("⚠️ buildSlotsForRoute: Missing required route fields");
        return [];
    }

    const booked = [];

    days.forEach(day => {

        booked.push({
            airport : origin,
            day     : day.toLowerCase(),
            time    : dep
        });

        booked.push({
            airport : dest,
            day     : day.toLowerCase(),
            time    : arr
        });

    });

    route.slotsBooked = booked;

    return booked;
}

/* ============================================================
   🅱️2 — BOOK ROUTE — v1.1 (CREA HORARIOS ON-DEMAND)
   ------------------------------------------------------------
   • Si el slot (hora) no existe → se crea con maxSlots del aeropuerto
   • Evita fallar por slots inexistentes
   ============================================================ */

function ACS_bookRoute(route) {

    if (!route || !Array.isArray(route.slotsBooked) || route.slotsBooked.length === 0) {
        console.warn("⚠️ bookRoute: route.slotsBooked está vacío.");
        return false;
    }

    let slotsData = JSON.parse(localStorage.getItem("ACS_SLOTS") || "{}");
    if (!slotsData || typeof slotsData !== "object") {
        console.error("❌ bookRoute: No ACS_SLOTS found.");
        return false;
    }

    let success = true;

    // 1️⃣ PRIMER PASO — verificar capacidad, creando slots si faltan
    for (const s of route.slotsBooked) {

        const ap   = s.airport;
        const day  = s.day;
        const time = s.time;

        if (!slotsData[ap]) {
            console.warn(`⚠️ bookRoute: aeropuerto sin slots inicializados: ${ap}`);
            continue; // en teoría no debería ocurrir si ACS_initAirportSlots ya corrió
        }

        const meta = slotsData[ap].__meta || {};
        const capDefault =
            typeof meta.maxSlots === "number" && meta.maxSlots > 0
                ? meta.maxSlots
                : 6;

        if (!slotsData[ap][day]) {
            slotsData[ap][day] = {};
        }

        if (!slotsData[ap][day][time]) {
            // Creamos el slot en este momento
            slotsData[ap][day][time] = {
                used: 0,
                max: capDefault
            };
        }

        const slot = slotsData[ap][day][time];
        const cap  = slot.max;
        const used = slot.used;

        if (used >= cap) {

            ACS_slotAlert({
                level: "warning",
                airport: ap,
                day: day,
                time: time,
                message: `❌ No hay slots disponibles en ${ap} — ${day.toUpperCase()} ${time}.`
            });

            console.error(`❌ Slot lleno — ${ap} ${day} ${time}`);
            success = false;
            break;
        }
    }

    if (!success) {
        console.warn("❌ bookRoute: Cancelado por falta de slots.");
        return false;
    }

    // 2️⃣ SEGUNDO PASO — reservar realmente (used++)
    let changed = false;

    for (const s of route.slotsBooked) {

        const ap   = s.airport;
        const day  = s.day;
        const time = s.time;

        if (!slotsData[ap] || !slotsData[ap][day] || !slotsData[ap][day][time]) {
            continue; // por seguridad, aunque ya lo creamos arriba
        }

        const slot = slotsData[ap][day][time];
        slot.used = (slot.used || 0) + 1;
        changed = true;
    }

    if (changed) {
        localStorage.setItem("ACS_SLOTS", JSON.stringify(slotsData));
    }

    console.log("🟩 Slots reservados para la ruta:", route.slotsBooked);
    return true;
}


/* ============================================================
   🅱️3 — RELEASE ROUTE (LIBERAR SLOTS) — v1.2
   ============================================================ */

function ACS_releaseRoute(route) {

    if (!route || !Array.isArray(route.slotsBooked) || route.slotsBooked.length === 0) {
        console.warn("⚠️ releaseRoute: nada que liberar.");
        return false;
    }

    let slotsData = JSON.parse(localStorage.getItem("ACS_SLOTS") || "{}");
    if (!slotsData || typeof slotsData !== "object") {
        console.error("❌ releaseRoute: ACS_SLOTS inexistente.");
        return false;
    }

    let changed = false;

    route.slotsBooked.forEach(entry => {
        if (!entry) return;

        const ap   = entry.airport;
        const day  = entry.day;
        const time = entry.time;

        if (
            slotsData[ap] &&
            slotsData[ap][day] &&
            slotsData[ap][day][time]
        ) {
            const slot = slotsData[ap][day][time];
            slot.used = Math.max(0, (slot.used || 0) - 1);
            changed = true;
        }
    });

    if (changed) {
        localStorage.setItem("ACS_SLOTS", JSON.stringify(slotsData));
        console.log("🟩 Slots liberados:", route.slotsBooked);
        return true;
    }

    return false;
}

/* ============================================================
   🅱️4 — SLOT ALERT INTEGRATION — Qatar Luxury Edition v2.0
   ============================================================ */

function ACS_slotAlert({ level = "info", airport, day, time, message }) {

    ACS_pushAlert({
        type: "slots",
        level: level,
        title: "Airport Slot Notification",
        message: message || 
            `Slot event at ${airport} — ${day.toUpperCase()} ${time}.`,
        timestamp: ACS_simTimestamp()
    });
}
/* ============================================================
   🟦 B5 — WEEKLY SLOT WATCHER — Qatar Luxury v1.0
   ------------------------------------------------------------
   • Se ejecuta UNA VEZ por semana simulada
   • Usa ACS_TIME + registerTimeListener
   • Llama ACS_checkUnusedSlotsWeekly()
   ============================================================ */

(function(){

    let lastSimWeek = null;

    // Función para obtener número de semana (ISO week)
    function getSimWeek(date) {
        const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const start = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - start) / 86400000) + 1)/7);
    }

    // Listener oficial del motor ACS_TIME
    registerTimeListener((simTime) => {

        if (!simTime) return;

        const currentWeek = getSimWeek(simTime);

        // Primera vez → inicializar
        if (lastSimWeek === null) {
            lastSimWeek = currentWeek;
            return;
        }

        // Si no ha cambiado la semana → nada que hacer
        if (currentWeek === lastSimWeek) return;

        // Semana cambió → registrar nueva semana
        lastSimWeek = currentWeek;

        console.log(`🟦 Weekly Slot Watcher: Week ${currentWeek} started — checking unused slots…`);

        try {
            ACS_checkUnusedSlotsWeekly();
        } catch (e) {
            console.warn("⚠️ Weekly Slot Watcher error:", e);
        }
    });

})();

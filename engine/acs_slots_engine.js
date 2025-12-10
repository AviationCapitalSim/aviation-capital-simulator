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

/* ============================================================
   🟦 B1 — RELEASE SLOTS FOR ROUTE — v1.0
   ------------------------------------------------------------
   - Usa route.slotsBooked = [ { airport, day, time }, ... ]
   - Resta 1 en "used" por cada slot reservado
   - No baja de 0
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
        const day  = entry.day;   // "mon","tue","wed"...
        const time = entry.time;  // "06:00"

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
   ------------------------------------------------------------
   - Guarda mensajes en localStorage.ACS_Alerts
   - Luego se puede leer desde alerts_center.html
   ============================================================ */

function ACS_pushAlert(message, type = "info") {
    const now = new Date().toISOString();

    const raw = localStorage.getItem("ACS_Alerts") || "[]";
    const list = JSON.parse(raw);

    list.push({
        id: `ALRT_${Date.now()}_${Math.floor(Math.random()*9999)}`,
        type,             // "info" | "warning" | "critical"
        message,
        createdAt: now
    });

    localStorage.setItem("ACS_Alerts", JSON.stringify(list));
}
/* ============================================================
   🟥 B3 — SLOT RETENTION SYSTEM (3-WEEK RULE) — v1.0
   ------------------------------------------------------------
   - Se ejecuta 1 vez por SEMANA de juego
   - Busca rutas "suspendidas" / sin operar
   - Suma unusedWeeks
   - Semana 1 → aviso
   - Semana 2 → aviso crítico
   - Semana 3 → libera slots + elimina ruta
   ============================================================ */

function ACS_checkUnusedSlotsWeekly() {

    const raw = localStorage.getItem("scheduleItems") || "[]";
    const routes = JSON.parse(raw);

    if (!Array.isArray(routes) || routes.length === 0) {
        return;
    }

    const keptRoutes = [];

    routes.forEach(route => {

        // Estado base / fallback
        const status = route.status || "active";

        // Solo aplicamos la regla a rutas SUSPENDIDAS / NO OPERANDO
        const isSuspended =
            status === "suspended" ||
            status === "no_aircraft" ||
            status === "paused";

        if (!isSuspended) {
            // Ruta activa: reseteamos contador y la mantenemos
            route.unusedWeeks = 0;
            keptRoutes.push(route);
            return;
        }

        // Inicializar contador si no existe
        if (typeof route.unusedWeeks !== "number") {
            route.unusedWeeks = 0;
        }

        route.unusedWeeks += 1;

        const fnOut = route.flightNumberOut || "";
        const fnIn  = route.flightNumberIn  || "";
        const label = fnOut && fnIn
            ? `${fnOut} / ${fnIn}`
            : `${route.origin || "XXX"} → ${route.destination || "YYY"}`;

        // Semana 1 — aviso normal
        if (route.unusedWeeks === 1) {
            ACS_pushAlert(
                `⚠️ Ruta ${label}: 1ª semana sin operar. Slot reservado pero sin aeronave asignada.`,
                "warning"
            );
            keptRoutes.push(route);
            return;
        }

        // Semana 2 — aviso crítico
        if (route.unusedWeeks === 2) {
            ACS_pushAlert(
                `⚠️⚠️ Ruta ${label}: 2ª semana sin operar. Riesgo de perder el slot si no se asigna un avión.`,
                "critical"
            );
            keptRoutes.push(route);
            return;
        }

        // Semana 3 — eliminar ruta + liberar slots
        if (route.unusedWeeks >= 3) {

            // 1) Liberar slots
            try {
                ACS_releaseSlotsForRoute(route);
            } catch (e) {
                console.warn("Error releasing slots for route:", label, e);
            }

            // 2) Alerta de eliminación
            ACS_pushAlert(
                `❌ Ruta ${label}: slots eliminados automáticamente tras 3 semanas sin operar.`,
                "critical"
            );

            // 3) NO la añadimos a keptRoutes → queda eliminada
            return;
        }

    });

    // Guardar solo rutas que se mantienen vivas
    localStorage.setItem("scheduleItems", JSON.stringify(keptRoutes));
}
/* ============================================================
   🅱️1 — BUILD SLOTS FOR ROUTE — v1.0 (ORIGIN + DEST ONLY)
   ------------------------------------------------------------
   • Genera estructura route.slotsBooked
   • Por cada día seleccionado
   • ORIGIN → horario de salida
   • DEST   → horario de llegada
   • NO modifica slots aún (solo genera la lista)
   ============================================================ */

function ACS_buildSlotsForRoute(route) {

    if (!route) return [];

    const origin = route.origin;
    const dest   = route.destination;

    const days   = Array.isArray(route.weekdays) ? route.weekdays : [];
    const dep    = route.departureUTC;  // "06:15"
    const arr    = route.arrivalUTC;    // "09:42"

    if (!origin || !dest || days.length === 0 || !dep || !arr) {
        console.warn("⚠️ buildSlotsForRoute: Missing required route fields");
        return [];
    }

    const booked = [];

    days.forEach(day => {

        // ORIGIN slot → SALIDA
        booked.push({
            airport : origin,
            day     : day.toLowerCase(),
            time    : dep
        });

        // DESTINATION slot → LLEGADA
        booked.push({
            airport : dest,
            day     : day.toLowerCase(),
            time    : arr
        });

    });

    // Guardar lista en la propia ruta
    route.slotsBooked = booked;

    return booked;
}
/* ============================================================
   🅱️2 — BOOK ROUTE (RESERVAR SLOTS) — v1.0
   ------------------------------------------------------------
   • Usa route.slotsBooked generado en B1
   • Revisa disponibilidad
   • used++ en cada slot
   • Si algún slot está lleno → alerta Qatar Luxury + cancelar
   • Retorna true/false según éxito
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

    // Primero verificar TODOS los slots antes de reservar
    for (const s of route.slotsBooked) {

        const ap   = s.airport;
        const day  = s.day;
        const time = s.time;

        if (!slotsData[ap] || !slotsData[ap][day] || !slotsData[ap][day][time]) {
            console.warn(`⚠️ Slot inexistente: ${ap} ${day} ${time}`);
            success = false;
            continue;
        }

        const slot = slotsData[ap][day][time];
        const cap  = slot.capacity || 1;
        const used = slot.used || 0;

        // Si NO hay capacidad → alerta y cancelar toda la reserva
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

    // Si encontramos un slot lleno → cancelamos
    if (!success) {
        console.warn("❌ bookRoute: Cancelado por falta de slots.");
        return false;
    }

    // Ahora sí, reservar (used++)
    let changed = false;

    for (const s of route.slotsBooked) {

        const ap   = s.airport;
        const day  = s.day;
        const time = s.time;

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
   ------------------------------------------------------------
   • Recorre route.slotsBooked
   • used-- en cada slot
   • No baja de 0
   • Devuelve true si libera algo
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

            // Asegurar que no baja de 0
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
   ------------------------------------------------------------
   • Formatea alertas de slots con ACS_pushAlert()
   • Estándar corporativo ACS (title, level, type)
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

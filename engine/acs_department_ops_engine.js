/* ============================================================
   🟦 ACS DEPARTMENT OPS ENGINE — PHASE B1 CORE
   ------------------------------------------------------------
   Module: engine/acs_department_ops_engine.js
   Purpose:
   • Listen to ACS_FLIGHT_ASSIGNED
   • Calculate crew & ops demand using:
       - Aircraft type
       - Route distance
       - Route frequency
   • Update HR.required per department
   • Register deficit timers (future phases)
   • Emit alerts (only missing staff)

   ⚠️ READ-ONLY CORE:
   - Does NOT touch UI
   - Does NOT touch Finance
   - Does NOT touch SkyTrack
   - Does NOT modify staff
   - Only updates HR.required

   Version: v1.0 — PHASE B1 (Demand Core Only)
   Date: 21 JAN 2026
   ============================================================ */


/* ============================================================
   🟦 A1 — DISTANCE CLASSIFICATION ENGINE
   ============================================================ */

function ACS_OPS_classifyDistance(nm) {
  if (!nm || isNaN(nm)) return "short";

  if (nm < 500) return "short";
  if (nm < 1500) return "medium";
  if (nm < 3000) return "long";
  return "ultra";
}

function ACS_OPS_getDistanceFactor(nm) {
  const cls = ACS_OPS_classifyDistance(nm);

  switch (cls) {
    case "short":  return 1.0;
    case "medium": return 1.1;
    case "long":   return 1.25;
    case "ultra":  return 1.4;
    default:        return 1.0;
  }
}


/* ============================================================
   🟦 A2 — FREQUENCY FACTOR ENGINE
   ============================================================ */

function ACS_OPS_getFrequencyFactor(flightsPerWeek) {

  if (!flightsPerWeek || isNaN(flightsPerWeek)) return 1.0;

  if (flightsPerWeek <= 3)   return 1.0;
  if (flightsPerWeek <= 7)   return 1.15;
  if (flightsPerWeek <= 14)  return 1.35;
  if (flightsPerWeek <= 30)  return 1.60;
  return 2.00;
}


/* ============================================================
   🟦 A3 — AIRCRAFT TYPE CLASSIFICATION (REUSE HR LOGIC)
   ============================================================ */

function ACS_OPS_classifyAircraft(model) {
  if (!model) return "medium";

  model = model.toLowerCase();

  const small = ["piper","cessna","dc-3","dc3","dc 3","beech","beechcraft",
                 "emb-110","emb110","emb 110","atr 42","atr42","dornier","do-228","do228"];
  if (small.some(m => model.includes(m))) return "small";

  const medium = ["a319","a320","a321","b737","737","e190","e195",
                  "crj","crj700","crj900","crj1000"];
  if (medium.some(m => model.includes(m))) return "medium";

  const large = ["a300","a310","a330","a340","b757","b767","b787","787"];
  if (large.some(m => model.includes(m))) return "large";

  const vlarge = ["b747","747","md-11","dc-10","a380","a350"];
  if (vlarge.some(m => model.includes(m))) return "vlarge";

  return "medium";
}


/* ============================================================
   🟦 A4 — BASE STAFF MATRIX (CANONICAL FROM HR)
   ============================================================ */

const ACS_OPS_STAFF_BY_TYPE = {
  small:   { pilots:4,  cabin:0,  maintenance:3,  ground:4,  security:1, flightops:1, quality:1 },
  medium:  { pilots:9,  cabin:4,  maintenance:5,  ground:6,  security:1, flightops:1, quality:1 },
  large:   { pilots:12, cabin:10, maintenance:8,  ground:10, security:2, flightops:2, quality:1.5 },
  vlarge:  { pilots:22, cabin:18, maintenance:12, ground:16, security:3, flightops:3, quality:2 }
};


/* ============================================================
   🟦 B1 — CREW DEMAND CALCULATOR (MASTER FORMULA)
   ============================================================ */

function ACS_OPS_calculateCrewDemand(flight, aircraft, route) {

  // 🛑 Protection layer
  if (!flight || !aircraft || !route) {
    console.warn("OPS: Missing flight / aircraft / route data", flight, aircraft, route);
    return null;
  }

  const model = aircraft.model || aircraft.name || "";
  const type  = ACS_OPS_classifyAircraft(model);

  const base = ACS_OPS_STAFF_BY_TYPE[type];
  if (!base) {
    console.warn("OPS: Unknown aircraft type", model);
    return null;
  }

  // 🔧 Distance
  const distanceNM = route.distance || flight.distance || 0;
  const distanceFactor = ACS_OPS_getDistanceFactor(distanceNM);

  // 🔧 Frequency
  const flightsPerWeek = route.flights_per_week || route.frequency || 1;
  const frequencyFactor = ACS_OPS_getFrequencyFactor(flightsPerWeek);

  // 🧮 Final demand
  const demand = {
    pilots:      Math.ceil(base.pilots      * distanceFactor * frequencyFactor),
    cabin:       Math.ceil(base.cabin       * distanceFactor * frequencyFactor),
    maintenance: Math.ceil(base.maintenance * distanceFactor * (1 + (frequencyFactor - 1) * 0.5)),
    ground:      Math.ceil(base.ground      * frequencyFactor),
    security:    Math.ceil(base.security    * (1 + (frequencyFactor - 1) * 0.3)),
    flightops:   Math.ceil(base.flightops   * distanceFactor * frequencyFactor),
    quality:     Math.ceil(base.quality     * (1 + (frequencyFactor - 1) * 0.3))
  };

  return {
    aircraftType: type,
    distanceNM,
    flightsPerWeek,
    distanceFactor,
    frequencyFactor,
    demand
  };
}


/* ============================================================
   🟦 C1 — APPLY DEMAND INTO HR.REQUIRED
   ============================================================ */

function ACS_OPS_applyDemandToHR(demandResult) {

  if (!demandResult || !demandResult.demand) return;

  const HR = ACS_HR_load();
  if (!HR) return;

  const d = demandResult.demand;

  // Mapping OPS → HR departments
  const MAP = {
    pilots:      ["pilots_small","pilots_medium","pilots_large","pilots_vlarge"],
    cabin:       ["cabin"],
    maintenance: ["maintenance"],
    ground:      ["ground"],
    security:    ["security"],
    flightops:   ["flightops"],
    quality:     ["quality"]
  };

  Object.keys(MAP).forEach(key => {

    const list = MAP[key];
    const value = d[key] || 0;

    list.forEach(depID => {
      if (!HR[depID]) return;

      // 🔧 Increment required only (never overwrite staff)
      HR[depID].required = (HR[depID].required || 0) + value;
    });
  });

  ACS_HR_save(HR);
}


/* ============================================================
   🟦 D1 — FLIGHT ASSIGNED LISTENER (ENTRY POINT)
   ============================================================ */

window.addEventListener("ACS_FLIGHT_ASSIGNED", e => {

  try {

    const { flight, aircraft, route } = e.detail || {};

    if (!flight || !aircraft || !route) {
      console.warn("OPS: Flight assigned event incomplete", e.detail);
      return;
    }

    console.log(
      "%c🧠 OPS ENGINE — NEW FLIGHT RECEIVED",
      "color:#00ffcc;font-weight:700"
    );

    console.log("✈ Flight:", flight.origin, "→", flight.destination);
    console.log("🛩 Aircraft:", aircraft.model || aircraft.name);
    console.log("🗺 Distance:", route.distance, "nm");
    console.log("🔁 Frequency:", route.flights_per_week || route.frequency);

    // 🧮 Calculate demand
    const result = ACS_OPS_calculateCrewDemand(flight, aircraft, route);
    if (!result) return;

    console.log("📊 OPS Demand Result:", result);

    // 🔧 Apply into HR.required
    ACS_OPS_applyDemandToHR(result);

    // 🔄 Recalculate HR + refresh table if present
    if (typeof ACS_HR_recalculateAll === "function") {
      ACS_HR_recalculateAll();
    }

    if (typeof loadDepartments === "function") {
      loadDepartments();
    }

    console.log("✅ OPS ENGINE applied crew demand successfully");

  } catch (err) {
    console.warn("OPS ENGINE failure on flight assigned", err);
  }

});


/* ============================================================
   🟦 END OF PHASE B1 — DEMAND CORE ONLY
   ------------------------------------------------------------
   NEXT PHASES (NOT YET IMPLEMENTED):
   • Deficit timers
   • Delay risk engine
   • Weekly morale degradation
   • Alert escalation logic
   • Recovery smoothing
   ============================================================ */

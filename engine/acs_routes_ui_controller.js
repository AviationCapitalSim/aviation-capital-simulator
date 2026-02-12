/* ============================================================
   🟦 A2 — ACS ROUTE CANONICAL STRUCTURE (CONTRACT)
   ------------------------------------------------------------
   Ubicación:
   - engine/acs_routes_ui_controller.js
   - Debajo del header del archivo
   - Antes de cualquier lógica (funciones / listeners / init)
   ------------------------------------------------------------
   Nota:
   - No ejecuta nada
   - No toca UI
   - Solo define el contrato oficial de una ruta
   ============================================================ */

const ROUTES_KEY = "ACS_ROUTES";
const SELECTED_ROUTE_KEY = "ACS_SELECTED_ROUTE";

const ACS_ROUTE_SCHEMA = {

  /* === IDENTITY === */
  id: "",                       // unique route id
  airlineId: "",                // owning airline

  /* === GEOGRAPHY === */
  origin: "",                   // ICAO
  destination: "",              // ICAO
  distanceNM: 0,                // nautical miles

  /* === AIRCRAFT & OPS === */
  aircraftType: "",             // DC-3, B707, A320...
  frequencyPerWeek: 0,          // integer
  seatsPerFlight: 0,            // aircraft dependent

  /* === TIME === */
  openedDate: 0,                // timestamp (ms)
  lastUpdate: 0,                // timestamp (ms)

  /* === ROUTE STATE === */
  state: "active",              // active | suspended | closed

  /* === MATURITY & IMAGE === */
  maturity: 0.0,                // 0.00 → 1.00 (engine driven)
  routeImage: 0.0,              // 0.00 → 1.00 (engine driven)

  /* === PRICING === */
  currentTicketPrice: 0,        // USD
  lastPriceReset: 0,            // timestamp (ms)

  /* === ERA CONTEXT === */
  era: "1941",                  // display/readability
  serviceClass: ["Y"],          // Y only in early eras

  /* === META === */
  createdBy: "player",          // system | player
};

Object.freeze(ACS_ROUTE_SCHEMA);

  function saveRoutes(routes) {
    localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
  }

/* ============================================================
   🟦 A8 — ROUTE BUILDER FROM SCHEDULE (CANONICAL BRIDGE)
   ------------------------------------------------------------
   Source of truth: scheduleItems
   Purpose:
   - Build ACS_ROUTES from real scheduled flights
   - NO economy
   - NO finance
   - NO runtime interference
   ============================================================ */

function ACS_buildRoutesFromSchedule(){

  const ROUTES_KEY = "ACS_ROUTES";

  let routes = [];
  try{
    routes = JSON.parse(localStorage.getItem(ROUTES_KEY)) || [];
  }catch{
    routes = [];
  }

  let items = [];
  try{
    items = JSON.parse(localStorage.getItem("scheduleItems")) || [];
  }catch{
    items = [];
  }

  if (!Array.isArray(items) || items.length === 0) return;

  const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

  const routeMap = {};

  items.forEach(it => {

    if (!it) return;
    if (it.type !== "flight") return;
    if (it.assigned !== true) return;

    const origin = it.origin;
    const destination = it.destination;

    if (!origin || !destination) return;

    const key = `${origin}_${destination}_${it.aircraftId}`;

    if (routeMap[key]) {
      routeMap[key].frequencyPerWeek++;
      return;
    }

    const aircraft = fleet.find(ac => ac.id === it.aircraftId);

    routeMap[key] = {

      id: key,

      airlineId: "PLAYER",

      origin: origin,
      destination: destination,

      distanceNM: it.distanceNM || it.distance || 0,

      aircraftType:
        it.modelKey ||
        aircraft?.model ||
        aircraft?.type ||
        "—",

      frequencyPerWeek: 1,

      seatsPerFlight:
        aircraft?.seats ||
        aircraft?.capacity ||
        0,

      openedDate: Date.now(),
      lastUpdate: Date.now(),

      state: "active",

      maturity: 0,
      routeImage: 0,

      currentTicketPrice: 0,
      lastPriceReset: 0,

      era: "1941",
      serviceClass: ["Y"],

      createdBy: "schedule"
    };

  });

  const newRoutes = Object.values(routeMap);

  if (newRoutes.length === 0) return;

  saveRoutes(newRoutes);

  console.log("🟦 ACS ROUTES BUILT FROM SCHEDULE:", newRoutes.length);

}

/* ============================================================
   🟦 A3 — ROUTE MATURITY ENGINE (FOUNDATION)
   ------------------------------------------------------------
   Purpose:
   - Initialize and update route maturity over time
   - NO pricing
   - NO demand
   - NO economy
   ------------------------------------------------------------
   Rules:
   - New routes start immature
   - Growth depends on time + frequency
   - Caps at 1.0
   ============================================================ */

const ACS_ROUTE_MATURITY = {

  /* === CONFIG (SAFE DEFAULTS) === */
  MIN_START: 0.15,        // brand new route
  MAX_VALUE: 1.0,

  /* growth per in-game day at freq = 7 */
  BASE_DAILY_GROWTH: 0.0008,

  /* ============================================================
     INIT MATURITY (ON ROUTE CREATION / LOAD)
     ============================================================ */
  init(route) {
    if (typeof route.maturity !== "number") {
      route.maturity = this.MIN_START;
    }
    return route;
  },

  /* ============================================================
     UPDATE MATURITY (CALLED BY TIME ENGINE LATER)
     ============================================================ */
   
  update(route, daysElapsed = 1) {
    if (route.state !== "active") return route;

    const freqFactor = Math.max(0.5, route.frequencyPerWeek / 7);
    const growth =
      this.BASE_DAILY_GROWTH *
      freqFactor *
      daysElapsed;

    route.maturity = Math.min(
      this.MAX_VALUE,
      route.maturity + growth
    );

    route.lastUpdate = Date.now();
    return route;
  }
};

Object.freeze(ACS_ROUTE_MATURITY);

/* ============================================================
   🟦 A4 — PRICE RESET ENGINE (HISTORICAL BASE)
   ------------------------------------------------------------
   Purpose:
   - Reset ticket price to historical baseline
   - Y class only (early eras)
   - NO preview
   - NO hints
   - NO economy coupling
   ------------------------------------------------------------
   Inputs:
   - route.distanceNM
   - route.era
   ------------------------------------------------------------
   Output:
   - route.currentTicketPrice (USD)
   - route.lastPriceReset (timestamp)
   ============================================================ */

const ACS_PRICE_RESET_ENGINE = {

  /* ============================================================
     HISTORICAL BASE PRICE PER NM (USD)
     ------------------------------------------------------------
     Internal table — NOT exposed to player
     Conservative, aviation-realistic values
     ============================================================ */
  PRICE_PER_NM_BY_ERA: {
    "1940": 0.30,
    "1941": 0.30,
    "1942": 0.31,
    "1943": 0.32,
    "1944": 0.33,
    "1945": 0.34,
    "1946": 0.36,
    "1947": 0.38,
    "1948": 0.40,
    "1949": 0.42,
    "1950": 0.44
  },

  /* ============================================================
     RESOLVE ERA KEY
     ============================================================ */
  resolveEra(route) {
    if (!route || !route.era) return "1940";
    const y = String(route.era).substring(0, 4);
    return this.PRICE_PER_NM_BY_ERA[y] ? y : "1940";
  },

  /* ============================================================
     RESET PRICE (CANONICAL)
     ============================================================ */
  reset(route) {
    if (!route || !route.distanceNM) return route;

    const eraKey = this.resolveEra(route);
    const pricePerNM = this.PRICE_PER_NM_BY_ERA[eraKey];

    const basePrice = Math.round(route.distanceNM * pricePerNM);

    route.currentTicketPrice = basePrice;
    route.lastPriceReset = Date.now();

    return route;
  }
};

Object.freeze(ACS_PRICE_RESET_ENGINE);

/* ============================================================
   🟦 A5 — ROUTE MATURITY & DEMAND RAMP ENGINE (REALISTIC)
   ------------------------------------------------------------
   Purpose:
   - Route does NOT fill on day 1
   - Maturity grows with time + airline image + marketing effects (later)
   - Demand is computed invisibly (player only sees results in revenue)
   - NO UI here
   ------------------------------------------------------------
   Notes:
   - Uses timestamps in ms (openedDate/lastUpdate)
   - Produces a "loadFactor" target (0..1)
   - Competition hooks are placeholders (future multiplayer 700)
   ============================================================ */

const ACS_ROUTE_MATURITY_ENGINE = {

  /* ============================================================
     CONFIG (tune later)
     ============================================================ */
  CFG: {
    // How fast routes mature (realistic ramp)
    // Example: 12–18 months to become strong if airline image is good
    MATURITY_MONTHS_TO_PEAK: 18,

    // Initial adoption: route starts low even with good airline
    INITIAL_LF_FLOOR: 0.18, // 18% on day 1 typical (new route)

    // Ceiling base before modifiers (never guaranteed 100%)
    BASE_LF_CAP: 0.88, // 88% typical cap; can go higher with strong conditions later

    // How much airline image matters (0..1)
    AIRLINE_IMAGE_WEIGHT: 0.22, // adds up to +22% LF when image=1

    // Airport demand weight (from airport engine later)
    AIRPORT_DEMAND_WEIGHT: 0.20, // adds up to +20% LF when demand=1

    // Distance penalty for early eras / long haul adoption lag
    LONG_HAUL_PENALTY_START_NM: 900,
    LONG_HAUL_PENALTY_MAX: 0.12, // up to -12% LF

    // Randomness band (kept small, realism)
    NOISE_BAND: 0.04 // ±4%
  },

  /* ============================================================
     HELPERS
     ============================================================ */
  clamp01(x){
    return Math.max(0, Math.min(1, Number(x) || 0));
  },

  monthsBetween(tsA, tsB){
    const a = Number(tsA) || 0;
    const b = Number(tsB) || 0;
    if (!a || !b || b <= a) return 0;
    // 30-day month approx (good enough for sim)
    return (b - a) / (1000 * 60 * 60 * 24 * 30);
  },

  // Smoothstep (nice curve): 0→1 with soft start/end
  smooth01(t){
    t = this.clamp01(t);
    return t * t * (3 - 2 * t);
  },

  // Hidden tiny noise (deterministic-ish by route id + day)
  noise(routeId, seedTs){
    const s = `${routeId || "R"}_${Math.floor((seedTs||0)/86400000)}`;
    let h = 2166136261;
    for (let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const n = (h >>> 0) / 4294967295; // 0..1
    return (n - 0.5) * 2; // -1..+1
  },

  /* ============================================================
     EXTERNAL HOOKS (future engines)
     ============================================================ */
  getAirlineImage01(route){
    // Future: from airline profile + marketing dashboard
    // For now: use route.routeImage if present, else 0.35 default
    if (route && Number.isFinite(route.routeImage)) return this.clamp01(route.routeImage);
    return 0.35;
  },

  getAirportDemand01(icao){
    // Future: from airport engine (demand, GDP, tourism, war, etc.)
    // For now: if engine exists, use it; else neutral 0.50
    try{
      if (typeof window.ACS_AIRPORT_DEMAND_ENGINE === "object" &&
          typeof window.ACS_AIRPORT_DEMAND_ENGINE.getDemand01 === "function") {
        return this.clamp01(window.ACS_AIRPORT_DEMAND_ENGINE.getDemand01(icao));
      }
    }catch(e){}
    return 0.50;
  },

  getCompetitionPenalty01(route){
    // Future: multiplayer + rival airlines on same city-pair
    // Return 0..1 penalty scale
    return 0.0;
  },

  /* ============================================================
     MAIN: update maturity + compute target load factor
     ============================================================ */
  evaluate(route, nowTs){

    if (!route) return { maturity: 0, loadFactor: 0 };

    const now = Number(nowTs) || Date.now();

    // Ensure timestamps exist
    if (!route.openedDate) route.openedDate = now;
    if (!route.lastUpdate) route.lastUpdate = route.openedDate;

    // ---- 1) Maturity growth by time (0..1) ----
    const months = this.monthsBetween(route.openedDate, now);
    const t = months / this.CFG.MATURITY_MONTHS_TO_PEAK; // 0..~1
    const maturity = this.smooth01(t); // smooth curve

    // Persist maturity (engine-driven)
    route.maturity = this.clamp01(maturity);
    route.lastUpdate = now;

    // ---- 2) Build LF components ----
    const img = this.getAirlineImage01(route);
    const oDem = this.getAirportDemand01(route.origin);
    const dDem = this.getAirportDemand01(route.destination);
    const airportDemand = this.clamp01((oDem + dDem) / 2);

    // Long-haul adoption penalty (early ramp)
    const dist = Number(route.distanceNM) || 0;
    let longPenalty = 0;
    if (dist > this.CFG.LONG_HAUL_PENALTY_START_NM) {
      const over = Math.min(1, (dist - this.CFG.LONG_HAUL_PENALTY_START_NM) / 2500);
      longPenalty = over * this.CFG.LONG_HAUL_PENALTY_MAX;
    }

    const competitionPenalty = this.clamp01(this.getCompetitionPenalty01(route)); // 0 for now

    // ---- 3) Core LF curve ----
    // Start at floor, then ramp toward cap by maturity
    const floor = this.CFG.INITIAL_LF_FLOOR;
    const capBase = this.CFG.BASE_LF_CAP;

    // Modifiers
    const cap =
      capBase +
      (img * this.CFG.AIRLINE_IMAGE_WEIGHT) +
      (airportDemand * this.CFG.AIRPORT_DEMAND_WEIGHT) -
      longPenalty -
      (competitionPenalty * 0.18); // future

    const capClamped = Math.max(0.25, Math.min(0.98, cap));

    // Ramp
    let lf = floor + (capClamped - floor) * route.maturity;

    // Noise (small)
    const n = this.noise(route.id, now) * this.CFG.NOISE_BAND;
    lf += n;

    // Final clamp
    lf = Math.max(0.05, Math.min(0.99, lf));

    return {
      maturity: route.maturity,
      loadFactor: lf,
      airlineImage: img,
      airportDemand
    };
  }
};

Object.freeze(ACS_ROUTE_MATURITY_ENGINE);

/* ============================================================
   🟦 A6 — HISTORICAL ROUTE PRICE ENGINE (EVENT-READY)
   ------------------------------------------------------------
   Purpose:
   - Compute REAL ticket price by era & distance
   - Support future world events (oil, war, crisis)
   - No preview, no hints, no UI
   ------------------------------------------------------------
   Output:
   - USD ticket price (rounded)
   ============================================================ */

const ACS_ROUTE_PRICE_ENGINE = {

  /* ============================================================
     BASE PRICE PER NM (USD) — HISTORICAL
     ============================================================ */
  BASE_PRICE_PER_NM: {
    // Piston era
    1940: 0.28,
    1941: 0.30,
    1942: 0.31,
    1943: 0.32,
    1944: 0.33,
    1945: 0.34,

    // Post-war normalization
    1946: 0.36,
    1947: 0.38,
    1948: 0.40,
    1949: 0.42,
    1950: 0.44
  },

  /* ============================================================
     CLASS MULTIPLIERS (ERA-AWARE)
     ============================================================ */
  CLASS_MULTIPLIER: {
    Y: 1.0,
    C: 1.6,   // activated later by era
    F: 2.4
  },

  /* ============================================================
     ERA FEATURES
     ============================================================ */
  ERA_RULES: {
    // only Y allowed
    pre1955: {
      allowC: false,
      allowF: false
    },
    jetAge: {
      allowC: true,
      allowF: true
    }
  },

  /* ============================================================
     HELPERS
     ============================================================ */
  getYear(route){
    const y = parseInt(route?.era, 10);
    return Number.isFinite(y) ? y : 1940;
  },

  getBasePricePerNM(year){
    return this.BASE_PRICE_PER_NM[year] || this.BASE_PRICE_PER_NM[1940];
  },

  isClassAllowed(route, cls){
    const y = this.getYear(route);
    if (y < 1955) return cls === "Y";
    return true;
  },

  /* ============================================================
     WORLD EVENT MODIFIER (HOOK)
     ============================================================ */
  getWorldModifier(route){
    // Future:
    // - oil crisis
    // - wars
    // - pandemics
    // - booms
    // For now: neutral
    return 1.0;
  },

  /* ============================================================
     MAIN COMPUTE
     ============================================================ */
  compute(route){
    if (!route || !route.distanceNM) return null;

    const year = this.getYear(route);
    const basePerNM = this.getBasePricePerNM(year);

    // Determine service class
    const cls = Array.isArray(route.serviceClass)
      ? route.serviceClass[0]
      : "Y";

    if (!this.isClassAllowed(route, cls)) {
      // fallback safety
      route.serviceClass = ["Y"];
    }

    const classMult = this.CLASS_MULTIPLIER[cls] || 1.0;
    const worldMult = this.getWorldModifier(route);

    const raw =
      route.distanceNM *
      basePerNM *
      classMult *
      worldMult;

    return Math.round(raw);
  }
};

Object.freeze(ACS_ROUTE_PRICE_ENGINE);

/* ============================================================
   🟧 A7 — ROUTE REVENUE & COST ENGINE (DISABLED)
   ------------------------------------------------------------
   Purpose:
   - Financial calculations are NOT allowed in Routes UI.
   - All revenue/cost/profit must be generated exclusively
     by acs_flight_economics.js → acs_finance.js.
   - This engine is now neutralized to prevent duplicates.
   ------------------------------------------------------------
   NOTE:
   - Structure preserved
   - No UI logic
   - No storage
   - No financial output
   ============================================================ */

const ACS_ROUTE_FINANCIAL_ENGINE = {

  /* ============================================================
     AIRCRAFT COST PER NM (DISABLED)
     ============================================================ */
  COST_PER_NM: {},

  /* ============================================================
     FIXED COST PER FLIGHT (DISABLED)
     ============================================================ */
  FIXED_COST_PER_FLIGHT: {},

  /* ============================================================
     AIRPORT COST (DISABLED)
     ============================================================ */
  AIRPORT_COST: {},

  /* ============================================================
     HELPERS (DISABLED)
     ============================================================ */

  getAircraftCostNM(){
    return 0;
  },

  getFixedFlightCost(){
    return 0;
  },

  getAirportCost(){
    return 0;
  },

  /* ============================================================
     MAIN COMPUTE (DISABLED)
     ============================================================ */
  compute(){
    return {
      loadFactor: null,
      weeklyPax: 0,
      weeklyRevenue: 0,
      weeklyCost: 0,
      weeklyResult: 0
    };
  }
};

Object.freeze(ACS_ROUTE_FINANCIAL_ENGINE);

/* ============================================================
   🟧 ACS ROUTES UI CONTROLLER
   ------------------------------------------------------------
   Purpose:
   - Render routes table (NO fake data)
   - Handle route selection
   - Handle RESET PRICE action (hook only)
   - ZERO economy logic here
   ------------------------------------------------------------
   File: acs_routes_ui_controller.js
   Version: v1.0
   Date: 09 FEB 2026
   ============================================================ */

(function () {

  /* ============================================================
     🔹 SOURCE OF TRUTH
     ============================================================ */

  const ROUTES_KEY = "ACS_ROUTES"; // canonical routes storage
  const SELECTED_ROUTE_KEY = "ACS_SELECTED_ROUTE";

  function getRoutes() {
    try {
      return JSON.parse(localStorage.getItem(ROUTES_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveRoutes(routes) {
    localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
  }

  function ACS_evalRouteLive(route){
    try{
      return ACS_ROUTE_MATURITY_ENGINE.evaluate(route, Date.now());
    }catch(e){
      return { maturity: route?.maturity || 0, loadFactor: 0.25, airlineImage: 0.35, airportDemand: 0.5 };
    }
  }
   
  /* ============================================================
     🔹 UI REFERENCES
     ============================================================ */

  const tableBody = document.getElementById("routes-table-body");

  const priceRoute = document.getElementById("p-route");
  const priceValue = document.getElementById("p-price");
  const priceEra   = document.getElementById("p-era");

  const btnReset  = document.getElementById("btn-reset-price");
  const btnManual = document.getElementById("btn-manual-price");

/* ============================================================
   🟧 1 — RENDER ROUTES TABLE (NO ECONOMY / NO FAKE PROFIT)
   ------------------------------------------------------------
   Rule:
   - This table MUST NOT compute revenue/cost/profit.
   - It only displays stored route parameters (pricing inputs).
   - Financial results will be sourced later from Company Finance.
   ============================================================ */

function renderRoutesTable() {
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const routes = getRoutes();

  if (routes.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="opacity:.5;padding:1.2rem">
          No active routes
        </td>
      </tr>
    `;
    return;
  }

  routes.forEach(route => {

    // IMPORTANT:
    // NO financial compute here. Only show what the route already has stored.
    const loadFactorText =
      (typeof route.loadFactor === "number")
        ? `${Math.round(route.loadFactor * 100)}%`
        : (typeof route.loadFactorPct === "number")
          ? `${Math.round(route.loadFactorPct)}%`
          : "—";

    const ticketText =
      (typeof route.currentTicketPrice === "number")
        ? `$${route.currentTicketPrice}`
        : (typeof route.currentTicket === "number")
          ? `$${route.currentTicket}`
          : "—";

    const resultText = "—";
    const resultColor = "#999";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${route.origin} → ${route.destination}</td>
      <td>${route.aircraftType || "—"}</td>
      <td>${route.frequencyPerWeek ?? "—"}</td>
      <td>${loadFactorText}</td>
      <td>${ticketText}</td>
      <td style="color:${resultColor}">${resultText}</td>
      <td>
        <button class="route-btn" data-id="${route.id}">
          Select
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

  /* ============================================================
     🔹 ROUTE SELECTION
     ============================================================ */

  function selectRoute(routeId) {
    const routes = getRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    localStorage.setItem(SELECTED_ROUTE_KEY, routeId);

    // Update pricing panel (NO calculations)
    priceRoute.textContent = `${route.origin} → ${route.destination}`;
    priceValue.textContent = route.currentTicket
      ? `$${route.currentTicket}`
      : "—";
    priceEra.textContent = route.era || "—";
  }

  /* ============================================================
     🔹 RESET PRICE (HOOK ONLY)
     ============================================================ */

    function resetPrice() {
    const routeId = localStorage.getItem(SELECTED_ROUTE_KEY);
    if (!routeId) return;

    const routes = getRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    const newPrice = ACS_ROUTE_PRICE_ENGINE.compute(route);
    if (!newPrice) return;

    route.currentTicketPrice = newPrice;
    route.lastPriceReset = Date.now();

    saveRoutes(routes);

    // Update UI (no hint)
    priceValue.textContent = `$${newPrice}`;
  }

  /* ============================================================
     🔹 EVENT BINDINGS
     ============================================================ */

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("route-btn")) {
      selectRoute(e.target.dataset.id);
    }
  });

  if (btnReset) {
    btnReset.addEventListener("click", resetPrice);
  }

  if (btnManual) {
    btnManual.addEventListener("click", () => {
      alert("Manual pricing will be enabled in a later phase.");
    });
  }

  /* ============================================================
     🔹 INIT
     ============================================================ */

  document.addEventListener("DOMContentLoaded", renderRoutesTable);

/* ============================================================
   🟦 A9 — AUTO SYNC ROUTES WITH SCHEDULE
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  ACS_buildRoutesFromSchedule();

  renderRoutesTable();

});


   
})();

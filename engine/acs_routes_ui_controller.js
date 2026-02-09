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
     🔹 RENDER ROUTES TABLE
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
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${route.origin} → ${route.destination}</td>
        <td>${route.aircraft || "—"}</td>
        <td>${route.frequency ?? "—"}</td>
        <td>—</td>
        <td>${route.currentTicket ? `$${route.currentTicket}` : "—"}</td>
        <td>—</td>
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

    // 🔒 Historical reset (NO preview, NO hints)
    ACS_PRICE_RESET_ENGINE.reset(route);

    saveRoutes(routes);

    // Update pricing panel only
    priceValue.textContent = `$${route.currentTicketPrice}`;
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

})();

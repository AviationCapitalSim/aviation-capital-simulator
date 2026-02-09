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

    // IMPORTANT:
    // No calculation here.
    // We only mark reset request and timestamp.
    route.lastPriceReset = Date.now();

    saveRoutes(routes);

    console.info(
      `[ACS] Price reset requested for route ${route.origin} → ${route.destination}`
    );
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

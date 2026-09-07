/* ============================================================
   ACS OCC — AIRPORT INTELLIGENCE FRONTEND ENGINE v1.2
   ------------------------------------------------------------

   ============================================================ */

(function () {
  "use strict";

  const API_BASE = "https://api.aviationcapitalsim.com";
  const CATALOG_URL = `${API_BASE}/v1/airport-intelligence/catalog`;
  const SNAPSHOT_URL = icao =>
    `${API_BASE}/v1/airport-intelligence/${encodeURIComponent(icao)}`;

  const state = {
    airports: [],
    selectedIcao: "",
    snapshot: null,
    controller: null
  };

  const get = id => document.getElementById(id);
  const text = value => String(value ?? "").trim();
  const upper = value => text(value).toUpperCase();
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const integer = value => Math.trunc(number(value));
  const formatInteger = value =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
      .format(integer(value));
  const formatMoney = value =>
    Number.isFinite(Number(value))
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0
        }).format(Number(value))
      : "—";
  const formatPercent = value => {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return "—";
    const pct = Math.abs(raw) <= 1 ? raw * 100 : raw;
    return `${pct.toFixed(Number.isInteger(pct) ? 0 : 1)}%`;
  };
  const escapeHtml = value =>
    text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function setText(id, value) {
    const node = get(id);
    if (node) node.textContent = text(value) || "—";
  }

  function setStatus(message, kind = "ready") {
    const node = get("airportStatus");
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      ...options
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok !== true) {
      const error = new Error(data?.error || `HTTP_${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function populateCatalog(airports) {
    const select = get("airportSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Select airport</option>';

    const fragment = document.createDocumentFragment();
    airports.forEach(airport => {
      const option = document.createElement("option");
      option.value = upper(airport.icao);
      option.textContent =
        `${upper(airport.iata) || upper(airport.icao)} · ` +
        `${text(airport.city) || "Unknown city"} — ` +
        `${text(airport.country) || text(airport.country_code)}`;
      fragment.appendChild(option);
    });
    select.appendChild(fragment);
    select.disabled = false;
  }

  async function loadCatalog() {
    setStatus("Loading available airports…", "loading");
    const data = await fetchJson(CATALOG_URL);
    if (!Array.isArray(data.airports)) {
      throw new Error("AIRPORT_CATALOG_INVALID");
    }
    state.airports = data.airports;
    populateCatalog(state.airports);
    setText("simulationClock", formatSimulationTime(data.current_sim_time));
    setText("airportCount", `${formatInteger(data.count)} airports available`);
    setStatus("Select an airport to load the complete picture");
  }

  function formatSimulationTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Simulation time unavailable";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC"
    }).format(date).toUpperCase();
  }

  async function selectAirport(icao) {
    const normalized = upper(icao);
    if (!normalized) {
      state.selectedIcao = "";
      state.snapshot = null;
      resetView();
      return;
    }

    state.controller?.abort();
    state.controller = new AbortController();
    state.selectedIcao = normalized;
    setLoading(true);
    setStatus(`Loading ${normalized}…`, "loading");

    try {
      const snapshot = await fetchJson(
        SNAPSHOT_URL(normalized),
        { signal: state.controller.signal }
      );
      if (state.selectedIcao !== normalized) return;
      state.snapshot = snapshot;
      renderSnapshot(snapshot);
      setStatus(`${normalized} intelligence loaded`);
    } catch (error) {
      if (error?.name === "AbortError") return;
      state.snapshot = null;
      resetView();
      setStatus(
        error?.message === "AIRPORT_NOT_AVAILABLE_IN_CURRENT_SIM_PERIOD"
          ? "This airport is not available on the current simulation date"
          : "Airport intelligence is unavailable",
        "error"
      );
    } finally {
      if (state.selectedIcao === normalized) setLoading(false);
    }
  }

  function setLoading(loading) {
    document.body.classList.toggle("is-loading", Boolean(loading));
    const select = get("airportSelect");
    if (select) select.disabled = Boolean(loading);
  }

  function renderSnapshot(snapshot) {
    const airport = snapshot.airport || {};
    const activity = snapshot.activity || {};
    const movement = activity.passenger_movement || {};
    const slots = activity.slots || {};
    const network = activity.scheduled_network || {};
    const operations = activity.current_operations || {};
    const costs = snapshot.costs || {};

    setText("airportIata", airport.iata || airport.icao);
    setText("airportIcao", airport.icao);
    setText("airportName", airport.display_label || airport.city);
    setText("airportLocation", [airport.continent, airport.country].filter(Boolean).join(" · "));
    setText("simulationClock", formatSimulationTime(snapshot.current_sim_time));

    setText("runwayValue", `${formatInteger(airport.runway_m)} m`);
    setText("elevationValue", `${formatInteger(airport.elevation_ft)} ft`);
    setText("hoursValue", airport.open_hrs);
    setText("aircraftLimitValue", airport.aircraft_limit);

    setText("passengersValue", formatInteger(movement.passengers));
    setText("movementsValue", formatInteger(movement.airport_movements));
    setText("weeklyFlightsValue", formatInteger(network.weekly_flights));
    setText("destinationsValue", formatInteger(network.destinations));
    setText("activeFlightsValue", formatInteger(operations.active_flights));
    setText("activeAirlinesValue", formatInteger(operations.active_airlines));
    setText("currentActiveAirlinesValue", formatInteger(operations.active_airlines));
    setText("networkDestinationsValue", formatInteger(network.destinations));
    setText("networkWeeklyFlightsValue", formatInteger(network.weekly_flights));

    setText("slotsUsedValue", formatInteger(slots.used));
    setText("slotsAvailableValue", formatInteger(slots.available));
    setText("slotsCapacityValue", formatInteger(slots.capacity));
    setText("slotUtilizationValue", `${number(slots.utilization_pct).toFixed(1)}%`);
    const slotBar = get("slotUtilizationBar");
    if (slotBar) slotBar.style.width = `${Math.max(0, Math.min(100, number(slots.utilization_pct)))}%`;
    const slotGauge = get("slotGauge");
    if (slotGauge) slotGauge.style.setProperty("--slot", `${Math.max(0, Math.min(100, number(slots.utilization_pct)))}%`);

    setText("landingFeeValue", formatMoney(costs.landing_fee_usd));
    setText("slotCostValue", formatMoney(costs.slot_cost_usd));
    setText("ticketFeeValue", formatPercent(costs.ticket_fee_percent));
    setText("growthValue", formatPercent(costs.pax_growth_factor));

    renderOperators(snapshot.network?.airlines || [], upper(airport.icao));
    renderDestinations(snapshot.network?.destinations || [], upper(airport.iata || airport.icao));

    const routeButton = get("createRouteButton");
    if (routeButton) {
      routeButton.disabled = false;
      routeButton.dataset.icao = upper(airport.icao);
    }
  }

  function renderOperators(airlines, selectedIcao) {
    const host = get("operatorList");
    if (!host) return;
    if (!airlines.length) {
      host.innerHTML = '<div class="empty-state">No scheduled operators</div>';
      return;
    }

    const sorted = [...airlines].sort((a, b) =>
      integer(b.weekly_flights) - integer(a.weekly_flights)
    );
    const total = sorted.reduce((sum, airline) => sum + integer(airline.weekly_flights), 0) || 1;

    host.innerHTML = sorted.map((airline, index) => {
      const share = Math.round((integer(airline.weekly_flights) / total) * 100);
      const isBase = upper(airline.base_icao) === selectedIcao;
      const aircraft = Array.isArray(airline.aircraft_types)
        ? airline.aircraft_types.slice(0, 3).map(type => `<i>${escapeHtml(type)}</i>`).join("")
        : "";
      return `
        <article class="operator-row">
          <span class="operator-rank">${String(index + 1).padStart(2, "0")}</span>
          <div class="operator-name">
            <strong>${escapeHtml(airline.airline_name || airline.icao || "Airline")}</strong>
            <small>${escapeHtml([airline.iata, airline.icao].filter(Boolean).join(" / "))}${isBase ? " · BASE" : ""}</small>
          </div>
          <div class="operator-bar"><i style="width:${share}%"></i></div>
          <strong>${share}%</strong>
          <span>${formatInteger(airline.weekly_flights)} flights</span>
          <div class="aircraft-chips">${aircraft || "—"}</div>
        </article>`;
    }).join("");
  }

  function renderDestinations(destinations, origin) {
    const host = get("destinationList");
    if (!host) return;
    if (!destinations.length) {
      host.innerHTML = '<div class="empty-state">No active destinations</div>';
      return;
    }

    host.innerHTML = destinations.map((destination, index) => `
      <article class="destination-row">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(origin)} <i></i> ${escapeHtml(destination.iata || destination.icao)}</strong>
          <small>${escapeHtml(destination.city || destination.label)}</small>
        </div>
        <span>${formatInteger(destination.airlines)} airlines</span>
        <span>${formatInteger(destination.routes)} routes</span>
        <strong>${formatInteger(destination.weekly_flights)}</strong>
      </article>`).join("");
  }

  function resetView() {
    ["airportIata", "airportIcao", "airportName", "airportLocation", "runwayValue",
      "elevationValue", "hoursValue", "aircraftLimitValue", "passengersValue",
      "movementsValue", "weeklyFlightsValue", "destinationsValue", "activeFlightsValue",
      "activeAirlinesValue", "slotsUsedValue", "slotsAvailableValue", "slotsCapacityValue",
      "currentActiveAirlinesValue", "networkDestinationsValue", "networkWeeklyFlightsValue",
      "slotUtilizationValue", "landingFeeValue", "slotCostValue", "ticketFeeValue",
      "growthValue"].forEach(id => setText(id, "—"));
    const slotBar = get("slotUtilizationBar");
    if (slotBar) slotBar.style.width = "0%";
    const slotGauge = get("slotGauge");
    if (slotGauge) slotGauge.style.setProperty("--slot", "0%");
    const operatorList = get("operatorList");
    const destinationList = get("destinationList");
    if (operatorList) operatorList.innerHTML = '<div class="empty-state">Select an airport</div>';
    if (destinationList) destinationList.innerHTML = '<div class="empty-state">Select an airport</div>';
    const routeButton = get("createRouteButton");
    if (routeButton) routeButton.disabled = true;
  }

  function bindEvents() {
    get("airportSelect")?.addEventListener("change", event =>
      selectAirport(event.target.value)
    );
    get("createRouteButton")?.addEventListener("click", event => {
      const icao = upper(event.currentTarget.dataset.icao);
      if (!icao) return;
      window.location.href = `routes.html?origin=${encodeURIComponent(icao)}`;
    });
  }

  async function init() {
    if (document.body.dataset.airportIntelligenceReady === "true") return;
    document.body.dataset.airportIntelligenceReady = "true";
    bindEvents();
    resetView();
    try {
      await loadCatalog();
    } catch (error) {
      setStatus("Airport database is unavailable", "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

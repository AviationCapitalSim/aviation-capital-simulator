"use strict";

/* ============================================================
   ACS OCC - FUEL CENTER v3.0
   ------------------------------------------------------------
   Read-only market intelligence.
   No embedded prices, interpolation, modelling or local fallback.
   PostgreSQL / Railway will be the only market-data authority.
   ============================================================ */

(function ACSFuelCenter(global) {
  const API_BASE =
    global.ACS_API_BASE ||
    "https://api.aviationcapitalsim.com";

  const MARKET_ENDPOINT = `${API_BASE}/v1/fuel/market`;

  /*
   * Technical preview only. This catalogue contains no price,
   * availability date or market-status assertion. Railway will
   * replace it with the verified fuel catalogue.
   */
  const TECHNICAL_PREVIEW = [
    {
      id: "avgas-100ll",
      name: "AVGAS 100LL",
      family: "Aviation Gasoline",
      engine_type: "Piston",
      grade: "100LL",
      identification: "Blue",
      specification: "ASTM D910"
    },
    {
      id: "jet-a",
      name: "JET A",
      family: "Kerosene Jet Fuel",
      engine_type: "Turbine",
      grade: "JET A",
      identification: "Clear / Straw",
      specification: "ASTM D1655"
    },
    {
      id: "jet-a1",
      name: "JET A-1",
      family: "Kerosene Jet Fuel",
      engine_type: "Turbine",
      grade: "JET A-1",
      identification: "Clear / Straw",
      specification: "DEF STAN 91-091"
    },
    {
      id: "saf",
      name: "SAF",
      family: "Sustainable Aviation Fuel",
      engine_type: "Turbine",
      grade: "Approved Blend",
      identification: "Specification dependent",
      specification: "ASTM D7566 / D1655"
    }
  ];

  const state = {
    payload: null,
    fuels: [],
    selectedFuelId: null,
    requestController: null
  };

  const elements = {};

  const REQUIRED_ELEMENT_IDS = [
    "fuelCardGrid",
    "marketDataStatus",
    "selectedFuelName",
    "selectedFuelPrice",
    "selectedFuelChange",
    "informationFuelName",
    "fuelFamily",
    "fuelEngineType",
    "fuelGrade",
    "fuelIdentification",
    "fuelIntroduced",
    "fuelMarketStatus",
    "fuelMarketUnit",
    "fuelSpecification",
    "chartYAxis",
    "chartXAxis",
    "barList",
    "chartEmpty",
    "fuelTooltip"
   ];

  function cacheElements() {
    REQUIRED_ELEMENT_IDS.forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function hasRequiredLayout() {
    return REQUIRED_ELEMENT_IDS.every((id) => elements[id]);
  }

  function text(element, value) {
    if (element) {
      element.textContent = value == null || value === "" ? "--" : String(value);
    }
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatPrice(value, unit = "USD / US GAL") {
    const numericValue = numberOrNull(value);
    if (numericValue === null) return "--";
    return `$${numericValue.toFixed(3)} · ${unit}`;
  }

  function formatPercent(value) {
    const numericValue = numberOrNull(value);
    if (numericValue === null) return "--";
    const sign = numericValue > 0 ? "+" : "";
    return `${sign}${numericValue.toFixed(1)}%`;
  }

  function movementClass(percent) {
    const value = numberOrNull(percent);
    if (value === null || (value >= -3 && value <= 3)) return "neutral";
    if (value < -3) return "decrease";
    if (value > 10) return "critical";
    return "attention";
  }

  function normalizeRecord(record) {
    const period = record?.period || record?.effective_date || record?.year;

    return {
      period: period == null ? null : String(period),
      price: numberOrNull(record?.price ?? record?.usd_per_us_gal),
      annual_change_percent: numberOrNull(
        record?.annual_change_percent ?? record?.change_percent
      ),
      quality_grade: record?.quality_grade || "UNAVAILABLE",
      source_method: record?.source_method || "UNAVAILABLE",
      is_projection: Boolean(record?.is_projection),
      source_name: record?.source_name || null
    };
  }

  function normalizeFuel(fuel) {
    const series = Array.isArray(fuel?.series)
      ? fuel.series.map(normalizeRecord).filter((record) => {
          return record.period && record.price !== null;
        })
      : [];

    series.sort((a, b) => a.period.localeCompare(b.period));

    return {
      id: String(fuel?.id || fuel?.code || ""),
      code: fuel?.code || null,
      name: fuel?.name || fuel?.code || "Unnamed fuel",
      family: fuel?.family || "Unverified",
      engine_type: fuel?.engine_type || "Unverified",
      grade: fuel?.grade || "Unverified",
      identification: fuel?.identification || "Unverified",
      introduced_on: fuel?.introduced_on || null,
      retired_on: fuel?.retired_on || null,
      market_status: fuel?.market_status || "Unverified",
      unit: fuel?.unit || "USD / US GAL",
      specification: fuel?.specification || "Unverified",
      source: fuel?.source || null,
      series
    };
  }

  function validatePayload(payload) {
    if (!payload || payload.ok !== true || !Array.isArray(payload.fuels)) {
      throw new Error("ACS_FUEL_INVALID_RESPONSE");
    }

    return {
      ok: true,
      world_year: numberOrNull(payload.world_year),       
      as_of: payload.as_of || null,
      dataset_revision: payload.dataset_revision || null,
      fuels: payload.fuels.map(normalizeFuel).filter((fuel) => fuel.id)
    };
  }

  async function fetchMarketData() {
    state.requestController?.abort();
    state.requestController = new AbortController();

    const response = await fetch(MARKET_ENDPOINT, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: state.requestController.signal
    });

    if (response.status === 401) {
      throw new Error("ACS_FUEL_SESSION_REQUIRED");
    }

    if (!response.ok) {
      throw new Error(`ACS_FUEL_FETCH_FAILED_${response.status}`);
    }

    return validatePayload(await response.json());
  }

  function setStatus(label, tone = "pending") {
    text(elements.marketDataStatus, label);

    const colorMap = {
      ready: "var(--fuel-green)",
      pending: "var(--fuel-amber)",
      error: "var(--fuel-red)"
    };

    elements.marketDataStatus.style.color = colorMap[tone] || colorMap.pending;
  }

  function latestRecord(fuel) {
    return fuel.series.length ? fuel.series[fuel.series.length - 1] : null;
  }

  function createFuelCard(fuel) {
    const latest = latestRecord(fuel);
    const card = document.createElement("button");
    const name = document.createElement("span");
    const family = document.createElement("span");
    const price = document.createElement("strong");
    const period = document.createElement("span");

    card.type = "button";
    card.className = "fuel-card";
    card.dataset.fuelId = fuel.id;
    card.setAttribute("aria-pressed", String(fuel.id === state.selectedFuelId));

    name.className = "fuel-card-name";
    family.className = "fuel-card-family";
    price.className = "fuel-card-price";
    period.className = "fuel-card-period";

    text(name, fuel.name);
    text(family, fuel.family);
    text(price, latest ? formatPrice(latest.price, fuel.unit) : "DATA PENDING");
    text(
  period,
  latest
    ? latest.period
    : "NO VERIFIED MARKET RECORD"
);

    card.append(name, family, price, period);
    card.addEventListener("click", () => selectFuel(fuel.id));
    return card;
  }

  function renderCards() {
    elements.fuelCardGrid.replaceChildren();

    state.fuels.forEach((fuel) => {
      const card = createFuelCard(fuel);
      card.classList.toggle("is-selected", fuel.id === state.selectedFuelId);
      elements.fuelCardGrid.appendChild(card);
    });
  }

  function updateCardSelection() {
    elements.fuelCardGrid.querySelectorAll(".fuel-card").forEach((card) => {
      const selected = card.dataset.fuelId === state.selectedFuelId;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderFuelInformation(fuel) {
    const latest = latestRecord(fuel);

    text(elements.selectedFuelName, fuel.name);
    text(elements.informationFuelName, fuel.name);
    text(elements.selectedFuelPrice, latest ? formatPrice(latest.price, fuel.unit) : "--");
    text(
      elements.selectedFuelChange,
      latest
        ? `${formatPercent(latest.annual_change_percent)} ANNUAL MOVEMENT`
        : "NO VERIFIED READING"
    );

    text(elements.fuelFamily, fuel.family);
    text(elements.fuelEngineType, fuel.engine_type);
    text(elements.fuelGrade, fuel.grade);
    text(elements.fuelIdentification, fuel.identification);
    text(elements.fuelIntroduced, fuel.introduced_on || "PENDING REVIEW");
    text(elements.fuelMarketStatus, fuel.market_status);
    text(elements.fuelMarketUnit, fuel.unit);
    text(elements.fuelSpecification, fuel.specification);

  }

  function renderEmptyChart(message) {
    elements.barList.replaceChildren();
    elements.chartYAxis.replaceChildren();
    elements.chartXAxis.replaceChildren();
    elements.chartEmpty.hidden = false;

    const detail = elements.chartEmpty.querySelector("span");
    if (detail && message) detail.textContent = message;
  }

  function createAxisLabel(container, label, position) {
    const element = document.createElement("span");
    element.textContent = label;
    element.style[position.axis] = `${position.value}%`;
    container.appendChild(element);
  }

  function showTooltip(event, fuel, record) {
  const tooltip = elements.fuelTooltip;
  tooltip.replaceChildren();

  const title = document.createElement("strong");
  const price = document.createElement("div");
  const movement = document.createElement("div");

  title.textContent = record.period;
  price.textContent = formatPrice(record.price, fuel.unit);
  movement.textContent = `Annual movement: ${formatPercent(record.annual_change_percent)}`;
  tooltip.append(title, price, movement);

  tooltip.hidden = false;
  tooltip.style.left = `${Math.min(global.innerWidth - 265, event.clientX + 14)}px`;
  tooltip.style.top = `${Math.max(8, event.clientY - 90)}px`;
}

  function hideTooltip() {
    elements.fuelTooltip.hidden = true;
  }

  function renderBars(fuel) {
    const series = fuel.series;
    if (!series.length) {
      renderEmptyChart(
        "The visual structure is ready. Bars will appear only after Railway returns traceable records from PostgreSQL."
      );
      return;
    }

    const prices = series.map((record) => record.price);
    const maximum = Math.max(...prices);
    const axisMaximum = maximum > 0 ? maximum * 1.12 : 1;

    elements.barList.replaceChildren();
    elements.chartYAxis.replaceChildren();
    elements.chartXAxis.replaceChildren();
    elements.chartEmpty.hidden = true;

    [100, 75, 50, 25, 0].forEach((percentage) => {
      const value = axisMaximum * (percentage / 100);
      createAxisLabel(elements.chartYAxis, `$${value.toFixed(2)}`, {
        axis: "bottom",
        value: percentage
      });
    });

    const labelEvery = Math.max(1, Math.ceil(series.length / 9));

    series.forEach((record, index) => {
      const bar = document.createElement("button");
      const height = Math.max(1.5, (record.price / axisMaximum) * 100);

      bar.type = "button";
      bar.className = `market-bar is-${movementClass(record.annual_change_percent)}`;
      if (record.is_projection) bar.classList.add("is-projection");
      bar.style.setProperty("--bar-height", `${height}%`);
      bar.setAttribute(
        "aria-label",
        `${record.period}, ${formatPrice(record.price, fuel.unit)}, ${formatPercent(record.annual_change_percent)}`
      );

      bar.addEventListener("pointermove", (event) => showTooltip(event, fuel, record));
      bar.addEventListener("pointerleave", hideTooltip);
      bar.addEventListener("focus", (event) => {
        const rectangle = event.currentTarget.getBoundingClientRect();
        showTooltip(
          { clientX: rectangle.left, clientY: rectangle.top },
          fuel,
          record
        );
      });
      bar.addEventListener("blur", hideTooltip);
      elements.barList.appendChild(bar);

      if (index % labelEvery === 0 || index === series.length - 1) {
        const label = document.createElement("span");
        label.textContent = record.period.slice(0, 4);
        label.style.position = "absolute";
        label.style.left = `${series.length === 1 ? 50 : (index / (series.length - 1)) * 100}%`;
        label.style.transform = "translateX(-50%)";
        label.style.top = "9px";
        elements.chartXAxis.appendChild(label);
      }
    });
  }

  function selectFuel(fuelId) {
    const fuel = state.fuels.find((item) => item.id === fuelId);
    if (!fuel) return;

    state.selectedFuelId = fuel.id;
    updateCardSelection();
    renderFuelInformation(fuel);
    renderBars(fuel);
  }

  function technicalPreviewFuels() {
    return TECHNICAL_PREVIEW.map((fuel) => normalizeFuel({
      ...fuel,
      market_status: "UNVERIFIED",
      unit: "USD / US GAL",
      series: []
    }));
  }

  function renderPendingState() {
    state.payload = null;
    state.fuels = technicalPreviewFuels();
    state.selectedFuelId = state.fuels[0]?.id || null;
    setStatus("DATASET PENDING", "pending");
    renderCards();

    if (state.selectedFuelId) selectFuel(state.selectedFuelId);
  }

  function renderMarketPayload(payload) {
    state.payload = payload;
    state.fuels = payload.fuels;

    if (!state.fuels.length) {
      renderPendingState();
      setStatus("NO DATA FOR ACS DATE", "pending");
      return;
    }

    const selectionStillExists = state.fuels.some((fuel) => {
      return fuel.id === state.selectedFuelId;
    });

    state.selectedFuelId = selectionStillExists
      ? state.selectedFuelId
      : state.fuels[0].id;

    setStatus(
  payload.world_year
    ? `AVAILABLE THROUGH ${payload.world_year}`
    : "MARKET DATA ONLINE",
  "ready"
);
    renderCards();
    selectFuel(state.selectedFuelId);
  }

  function handleLoadError(error) {
    if (error?.name === "AbortError") return;

    renderPendingState();

    if (error?.message === "ACS_FUEL_SESSION_REQUIRED") {
      setStatus("SESSION REQUIRED", "error");
      return;
    }

    setStatus("MARKET DATA UNAVAILABLE", "error");
    console.warn("ACS FUEL CENTER LOAD FAILED:", error?.message || error);
  }

  async function loadMarket() {
    setStatus("CONNECTING TO MARKET DATA", "pending");

    try {
      renderMarketPayload(await fetchMarketData());
    } catch (error) {
      handleLoadError(error);
    }
  }

  function observeACSClock() {
    const clock = document.getElementById("acs-clock");
    if (!clock || typeof MutationObserver !== "function") return;

    let previousYear = null;
    const observer = new MutationObserver(() => {
      const years = clock.textContent.match(/\b(19|20)\d{2}\b/g);
      const year = years?.at(-1) || null;

      if (year && previousYear && year !== previousYear) {
        loadMarket();
      }

      if (year) previousYear = year;
    });

    observer.observe(clock, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async function initialize() {
    cacheElements();

    if (!hasRequiredLayout()) {
      console.error("ACS FUEL CENTER: required HTML elements are missing.");
      return;
    }

    renderPendingState();
    observeACSClock();
    await loadMarket();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);

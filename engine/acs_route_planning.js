/* ============================================================
   🟦 ACS OCC — ROUTE PLANNING FRONTEND AUTHORITY v1.0
   ------------------------------------------------------------
   File: acs_route_planning.js
   Date: 20 AUG 2026

   PURPOSE
   - Independent frontend controller for Route Planning.
   - Read ACS authorities.
   - Populate planning parameters.
   - Never create operational records.

   RULES
   - PostgreSQL/backend authority.
   - No localStorage authority.
   - Company Base is the mandatory origin.
   - Destination is selected by the player.
   - Aircraft catalog contains every model already existing
     by the current ACS simulation year.
   - No future aircraft.
   - Aircraft ownership is irrelevant.
   - Production end is irrelevant to Route Planning.
   - No strategic recommendations.
   - No automatic aircraft selection.
   - No route creation.
   - No slots.
   - No assignment.
   - No finance.
   ============================================================ */

(() => {
  "use strict";


  /* ============================================================
     ACS ROUTE PLANNING — RAILWAY API AUTHORITY
     ------------------------------------------------------------
     Frontend:
       https://aviationcapitalsim.com

     Backend / PostgreSQL authority:
       https://api.aviationcapitalsim.com
     ============================================================ */

  const RP_API_BASE =
    "https://api.aviationcapitalsim.com";


  /* ============================================================
     ROUTE PLANNING STATE
     ------------------------------------------------------------
     Frontend working state only.
     This is NOT an ACS authority.
     ============================================================ */

  const RP_STATE = {
    simTime: null,
    simYear: null,

    company: null,

    origin: null,
    destination: null,

    continents: [],
    countries: [],
    airports: [],

    aircraftCatalog: [],
    selectedAircraft: null
  };


  /* ============================================================
     DOM HELPERS
     ============================================================ */

  function RP_get(id) {
    return document.getElementById(id);
  }


  function RP_setText(id, value) {
    const element = RP_get(id);

    if (!element) {
      return;
    }

    element.textContent =
      value === null ||
      value === undefined ||
      value === ""
        ? "--"
        : String(value);
  }


  function RP_setStatus(message) {
    RP_setText(
      "rpStudyStatus",
      message || "Planning workspace ready"
    );
  }


  function RP_setMapStatus(message) {
    RP_setText(
      "rpMapStatus",
      message || "Awaiting study parameters"
    );
  }


  /* ============================================================
     FETCH AUTHORITY
     ============================================================ */

  async function RP_fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      ...options
    });

    let data = null;

    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(
        data?.error ||
        data?.message ||
        `HTTP_${response.status}`
      );

      error.status = response.status;
      error.payload = data;

      throw error;
    }

    return data;
  }


  /* ============================================================
     SELECT HELPERS
     ============================================================ */

  function RP_resetSelect(
    select,
    placeholder,
    disabled = false
  ) {
    if (!select) {
      return;
    }

    select.innerHTML = "";

    const option = document.createElement("option");

    option.value = "";
    option.textContent = placeholder;

    select.appendChild(option);
    select.disabled = disabled;
  }


  function RP_appendOption(
    select,
    value,
    label,
    dataset = {}
  ) {
    if (!select) {
      return;
    }

    const option = document.createElement("option");

    option.value = String(value ?? "");
    option.textContent = String(label ?? "");

    Object.entries(dataset).forEach(
      ([key, datasetValue]) => {
        if (
          datasetValue !== null &&
          datasetValue !== undefined
        ) {
          option.dataset[key] =
            String(datasetValue);
        }
      }
    );

    select.appendChild(option);
  }


  /* ============================================================
     ACS SIMULATION TIME
     ------------------------------------------------------------
     We first use the ACS clock authority already loaded by the
     page. This function intentionally does not derive aircraft
     availability from the browser's real date.
     ============================================================ */

  function RP_readSimulationYearFromClock() {
    const clock = RP_get("acs-clock");

    if (!clock) {
      return null;
    }

    const text =
      String(clock.textContent || "").trim();

    const match =
      text.match(/\b(19|20)\d{2}\b/);

    if (!match) {
      return null;
    }

    const year = Number(match[0]);

    return Number.isInteger(year)
      ? year
      : null;
  }


  async function RP_resolveSimulationYear() {
    /*
     * The visible ACS clock is populated by the existing
     * ACS time authority loaded before this controller.
     *
     * We wait briefly for that authority to initialize.
     */

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const year =
        RP_readSimulationYearFromClock();

      if (Number.isInteger(year)) {
        RP_STATE.simYear = year;

        return year;
      }

      await new Promise(resolve =>
        setTimeout(resolve, 100)
      );
    }

    throw new Error(
      "ACS_SIMULATION_YEAR_UNAVAILABLE"
    );
  }


  /* ============================================================
     COMPANY BASE AUTHORITY
     ------------------------------------------------------------
     GET https://api.aviationcapitalsim.com/v1/company/context

     Canonical authority:
       data.user.base_icao
     ============================================================ */

  async function RP_loadCompanyBase() {
  const data =
    await RP_fetchJson(
      `${RP_API_BASE}/v1/company/context`
    );

    if (!data || data.ok !== true) {
      throw new Error(
        "COMPANY_CONTEXT_UNAVAILABLE"
      );
    }

    /*
     * Canonical company context authority:
     * data.user.base_icao
     */

    const user =
      data.user || null;

    const airline =
      data.airline || null;

    const baseIcao =
      String(
        user?.base_icao || ""
      )
        .trim()
        .toUpperCase();

    if (!baseIcao) {
      throw new Error(
        "COMPANY_BASE_UNAVAILABLE"
      );
    }

    /*
     * Do not invent airport metadata here.
     *
     * Company Context supplies the authoritative ICAO.
     * Airport name/city will later come from the
     * historical airport authority.
     */

    RP_STATE.company = {
      user,
      airline,
      authority:
        data.authority || null
    };

    RP_STATE.origin = {
      icao: baseIcao,
      name: null
    };

    RP_setText(
      "rpOriginIcao",
      baseIcao
    );

    RP_setText(
      "rpOriginName",
      "Company Base"
    );

    RP_setText(
      "rpRouteOrigin",
      baseIcao
    );

    return RP_STATE.origin;
  }


  /* ============================================================
     AIRCRAFT PLANNING CATALOG
     ------------------------------------------------------------
     Historical rule:
       introduction year <= current ACS year

     No production-end filter.
     No ownership filter.
     No operational-status filter.
     ============================================================ */

  async function RP_loadAircraftCatalog() {
    const select =
      RP_get("rpAircraftSelect");

    RP_resetSelect(
      select,
      "Loading aircraft...",
      true
    );

    const year =
      RP_STATE.simYear;

    if (!Number.isInteger(year)) {
      throw new Error(
        "ACS_SIMULATION_YEAR_UNAVAILABLE"
      );
    }

    const data =
      await RP_fetchJson(
        `${RP_API_BASE}/v1/route-planning/aircraft?year=${encodeURIComponent(year)}`
      );

    const aircraft =
      Array.isArray(data?.aircraft)
        ? data.aircraft
        : [];

    RP_STATE.aircraftCatalog =
      aircraft;

    RP_resetSelect(
      select,
      "Select aircraft",
      aircraft.length === 0
    );

    aircraft.forEach(ac => {
      const modelKey =
        String(
          ac.model_key ||
          ""
        ).trim();

      if (!modelKey) {
        return;
      }

      const manufacturer =
        String(
          ac.manufacturer ||
          ""
        ).trim();

      const model =
        String(
          ac.model ||
          ac.aircraft_name ||
          modelKey
        ).trim();

      const label =
        manufacturer &&
        !model
          .toUpperCase()
          .startsWith(
            manufacturer.toUpperCase()
          )
          ? `${manufacturer} ${model}`
          : model;

      RP_appendOption(
        select,
        modelKey,
        label,
        {
          catalogId: ac.id,
          modelKey,
          manufacturer,
          model,
          aircraftName:
            ac.aircraft_name || "",
          seats:
            ac.seats ?? "",
          rangeNm:
            ac.range_nm ?? "",
          speedKts:
            ac.speed_kts ?? "",
          mtowKg:
            ac.mtow_kg ?? "",
          fuelBurnKgph:
            ac.fuel_burn_kgph ?? "",
          engines:
            ac.engines ?? "",
          category:
            ac.aircraft_category ?? "",
          productionStartYear:
            ac.production_start_year ?? "",
          firstDeliveryYear:
            ac.first_delivery_year ?? ""
        }
      );
    });

    return aircraft;
  }


  /* ============================================================
     AIRCRAFT SELECTION
     ------------------------------------------------------------
     Selection only.
     No calculations yet.
     ============================================================ */

  function RP_handleAircraftChange() {
    const select =
      RP_get("rpAircraftSelect");

    if (!select) {
      return;
    }

    const modelKey =
      String(select.value || "").trim();

    if (!modelKey) {
      RP_STATE.selectedAircraft = null;

      RP_setText(
        "rpRouteAircraft",
        "--"
      );

      RP_setText(
        "rpCalculatedRange",
        "-- NM"
      );

      RP_setText(
        "rpRangeDifference",
        "-- NM"
      );

      RP_setText(
        "rpPassengersValue",
        "--"
      );

      RP_setText(
        "rpCargoValue",
        "-- KG"
      );

      RP_setText(
        "rpFuelValue",
        "-- KG"
      );

      RP_setText(
        "rpTowValue",
        "-- % MTOW"
      );

      const meter =
        RP_get("rpTowMeter");

      if (meter) {
        meter.style.width = "0%";
      }

      RP_updatePlanningStatus();

      return;
    }

    const aircraft =
      RP_STATE.aircraftCatalog.find(
        ac =>
          String(ac.model_key || "").trim() ===
          modelKey
      );

    RP_STATE.selectedAircraft =
      aircraft || null;

    if (!aircraft) {
      RP_setText(
        "rpRouteAircraft",
        "--"
      );

      RP_updatePlanningStatus();

      return;
    }

    const manufacturer =
      String(
        aircraft.manufacturer ||
        ""
      ).trim();

    const model =
      String(
        aircraft.model ||
        aircraft.aircraft_name ||
        aircraft.model_key ||
        ""
      ).trim();

    const label =
      manufacturer &&
      !model
        .toUpperCase()
        .startsWith(
          manufacturer.toUpperCase()
        )
        ? `${manufacturer} ${model}`
        : model;

    RP_setText(
      "rpRouteAircraft",
      label
    );

    /*
     * Technical calculations are deliberately NOT
     * activated in this stage.
     *
     * We have selected the real aircraft record,
     * but Route Planning will not display invented
     * passenger, fuel, range or TOW scenarios.
     */

    RP_setText(
      "rpCalculatedRange",
      "-- NM"
    );

    RP_setText(
      "rpRangeDifference",
      "-- NM"
    );

    RP_setText(
      "rpPassengersValue",
      "--"
    );

    RP_setText(
      "rpCargoValue",
      "-- KG"
    );

    RP_setText(
      "rpFuelValue",
      "-- KG"
    );

    RP_setText(
      "rpTowValue",
      "-- % MTOW"
    );

    RP_updatePlanningStatus();
  }


  /* ============================================================
     DESTINATION CASCADE — STAGE 1
     ------------------------------------------------------------
     Destination authority will be connected to the existing
     ACS historical airport authority.

     No hardcoded continents, countries or airports are used.
     ============================================================ */

  function RP_prepareDestinationSelectors() {
    RP_resetSelect(
      RP_get("rpContinentSelect"),
      "Select continent",
      true
    );

    RP_resetSelect(
      RP_get("rpCountrySelect"),
      "Select country",
      true
    );

    RP_resetSelect(
      RP_get("rpAirportSelect"),
      "Select airport",
      true
    );
  }


  /* ============================================================
     STUDY STATUS
     ============================================================ */

  function RP_updatePlanningStatus() {
    const hasOrigin =
      Boolean(RP_STATE.origin?.icao);

    const hasDestination =
      Boolean(RP_STATE.destination?.icao);

    const hasAircraft =
      Boolean(
        RP_STATE.selectedAircraft?.model_key
      );

    if (!hasOrigin) {
      RP_setStatus(
        "Awaiting company base authority"
      );

      RP_setMapStatus(
        "Awaiting company base"
      );

      return;
    }

    if (!hasDestination) {
      RP_setStatus(
        "Company base ready — select destination"
      );

      RP_setMapStatus(
        "Awaiting destination"
      );

      return;
    }

    if (!hasAircraft) {
      RP_setStatus(
        "Destination ready — select aircraft"
      );

      RP_setMapStatus(
        "Awaiting aircraft"
      );

      return;
    }

    RP_setStatus(
      "Study parameters ready"
    );

    RP_setMapStatus(
      "Ready for technical calculation"
    );
  }


  /* ============================================================
     EVENTS
     ============================================================ */

  function RP_bindEvents() {
    const aircraftSelect =
      RP_get("rpAircraftSelect");

    if (aircraftSelect) {
      aircraftSelect.addEventListener(
        "change",
        RP_handleAircraftChange
      );
    }
  }


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  async function RP_initialize() {
    try {
      console.log(
        "🟦 ACS OCC ROUTE PLANNING INITIALIZING"
      );

      RP_setStatus(
        "Loading ACS planning authorities..."
      );

      RP_setMapStatus(
        "Initializing"
      );

      RP_prepareDestinationSelectors();
      RP_bindEvents();

      /*
       * Company Context and ACS simulation time
       * are independent read authorities.
       */

      await Promise.all([
        RP_loadCompanyBase(),
        RP_resolveSimulationYear()
      ]);

      console.log(
        "🟦 ROUTE PLANNING ACS YEAR:",
        RP_STATE.simYear
      );

      console.log(
        "🟦 ROUTE PLANNING COMPANY BASE:",
        RP_STATE.origin
      );

      await RP_loadAircraftCatalog();

      console.log(
        "🟦 ROUTE PLANNING AIRCRAFT CATALOG:",
        {
          year: RP_STATE.simYear,
          count:
            RP_STATE.aircraftCatalog.length
        }
      );

      RP_updatePlanningStatus();

      console.log(
        "🟢 ACS OCC ROUTE PLANNING READY"
      );

    } catch (error) {
      console.error(
        "🔴 ACS ROUTE PLANNING INITIALIZATION ERROR:",
        error
      );

      RP_setStatus(
        `Route Planning authority error: ${
          error?.message ||
          "UNKNOWN_ERROR"
        }`
      );

      RP_setMapStatus(
        "Authority unavailable"
      );
    }
  }


  /* ============================================================
     BOOT
     ============================================================ */

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      RP_initialize,
      { once: true }
    );
  } else {
    RP_initialize();
  }

})();

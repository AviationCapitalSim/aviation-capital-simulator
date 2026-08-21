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
  window.ACS_API_BASE ||
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
  selectedAircraft: null,

  passengers: 0
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
oewKg:
  ac.oew_kg ?? "",
fuelBurnKgph:
  ac.fuel_burn_kgph ?? "",
requiredRunwayM:
  ac.required_runway_m ?? "",
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
   AIRCRAFT SELECTION + LOAD SCENARIO
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
    RP_STATE.passengers = 0;

    RP_setText("rpRouteAircraft", "--");
    RP_setText("rpCalculatedRange", "-- NM");
    RP_setText("rpRangeDifference", "-- NM");
    RP_setText("rpPassengersValue", "--");
    RP_setText("rpBaggageValue", "-- KG");
    RP_setText("rpFuelValue", "-- KG");
    RP_setText("rpTowValue", "-- KG");

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
    RP_STATE.passengers = 0;

    RP_setText("rpRouteAircraft", "--");
    RP_setText("rpPassengersValue", "--");
    RP_setText("rpBaggageValue", "-- KG");
    RP_setText("rpFuelValue", "-- KG");
    RP_setText("rpTowValue", "-- KG");

    RP_updatePlanningStatus();
    return;
  }

  const manufacturer =
    String(
      aircraft.manufacturer || ""
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

  const seats =
    Number(aircraft.seats);

  RP_STATE.passengers =
    Number.isFinite(seats) && seats > 0
      ? Math.round(seats)
      : 0;

  RP_calculateRouteStudy();
}


/* ============================================================
   AIRCRAFT LOAD SCENARIO
   ============================================================ */

function RP_updateLoadScenario(
  distanceNm = null
) {
  const aircraft =
    RP_STATE.selectedAircraft;

  if (!aircraft) {
    RP_setText("rpPassengersValue", "--");
    RP_setText("rpBaggageValue", "-- KG");
    RP_setText("rpFuelValue", "-- KG");
    RP_setText("rpTowValue", "-- KG");
    return;
  }

  const seats =
    Number(aircraft.seats);

  const maxPassengers =
    Number.isFinite(seats) && seats > 0
      ? Math.round(seats)
      : 0;

  RP_STATE.passengers =
    Math.max(
      0,
      Math.min(
        Number(RP_STATE.passengers) || 0,
        maxPassengers
      )
    );

  RP_setText(
    "rpPassengersValue",
    `${RP_STATE.passengers} / ${maxPassengers}`
  );


  /* BAGGAGE
     2 bags per passenger
     25 KG per bag
  */

  const bags =
    RP_STATE.passengers * 2;

  const baggageKg =
    bags * 25;

  RP_setText(
    "rpBaggageValue",
    `${Math.round(
      baggageKg
    ).toLocaleString()} KG`
  );


    /* FLIGHT TIME + ROUTE FUEL */

  const speedKts =
    Number(aircraft.speed_kts);

  const fuelBurnKgph =
    Number(aircraft.fuel_burn_kgph);

  let routeFuelKg = 0;

  if (
    Number.isFinite(distanceNm) &&
    distanceNm > 0 &&
    Number.isFinite(speedKts) &&
    speedKts > 0
  ) {

    const ROUTE_TIME_ADDITIVE_MINUTES = 30;

    const cruiseMinutes =
      (distanceNm / speedKts) * 60;

    const totalMinutes =
      Math.round(
        cruiseMinutes +
        ROUTE_TIME_ADDITIVE_MINUTES
      );

    const flightHours =
      totalMinutes / 60;

    const hours =
      Math.floor(totalMinutes / 60);

    const minutes =
      totalMinutes % 60;

    RP_STATE.flightTimeMinutes =
      totalMinutes;

    RP_setText(
      "rpTimeValue",
      `${hours}H ${String(minutes).padStart(2, "0")}M`
    );

    if (
      Number.isFinite(fuelBurnKgph) &&
      fuelBurnKgph > 0
    ) {

      routeFuelKg =
        flightHours * fuelBurnKgph;

      RP_setText(
        "rpFuelValue",
        `${Math.round(
          routeFuelKg
        ).toLocaleString()} KG`
      );

    } else {

      RP_setText(
        "rpFuelValue",
        "-- KG"
      );
    }

  } else {

    RP_STATE.flightTimeMinutes = null;

    RP_setText(
      "rpTimeValue",
      "--"
    );

    RP_setText(
      "rpFuelValue",
      "-- KG"
    );
  }


  /* ESTIMATED TAKEOFF WEIGHT */

  const ACS_STANDARD_PAX_WEIGHT_KG = 84;

  const oewKg =
    Number(aircraft.oew_kg);

  const mtowKg =
    Number(aircraft.mtow_kg);

  const passengerWeightKg =
    RP_STATE.passengers *
    ACS_STANDARD_PAX_WEIGHT_KG;

  const estimatedTowKg =
    oewKg +
    passengerWeightKg +
    baggageKg +
    routeFuelKg;

  if (
    Number.isFinite(oewKg) &&
    oewKg > 0 &&
    Number.isFinite(mtowKg) &&
    mtowKg > 0
  ) {

    RP_setText(
      "rpTowValue",
      `${Math.round(
        estimatedTowKg
      ).toLocaleString()} / ${Math.round(
        mtowKg
      ).toLocaleString()} KG`
    );

  } else {

    RP_setText(
      "rpTowValue",
      "-- KG"
    );
  }
}

function RP_changePassengers(delta) {
  const aircraft =
    RP_STATE.selectedAircraft;

  if (!aircraft) {
    return;
  }

  const maxPassengers =
    Number(aircraft.seats);

  if (
    !Number.isFinite(maxPassengers) ||
    maxPassengers <= 0
  ) {
    return;
  }

  RP_STATE.passengers =
    Math.max(
      0,
      Math.min(
        RP_STATE.passengers + delta,
        maxPassengers
      )
    );

  RP_calculateRouteStudy();
}


/* ============================================================
   WORLD ROUTE STUDY — TECHNICAL CALCULATION
   ============================================================ */

function RP_toRadians(value) {
  return Number(value) * Math.PI / 180;
}


function RP_calculateGreatCircleNm(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const φ1 = RP_toRadians(lat1);
  const φ2 = RP_toRadians(lat2);

  const Δφ =
    RP_toRadians(
      Number(lat2) - Number(lat1)
    );

  const Δλ =
    RP_toRadians(
      Number(lon2) - Number(lon1)
    );

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) *
    Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  const EARTH_RADIUS_NM =
    3440.065;

  return EARTH_RADIUS_NM * c;
}

/* ============================================================
   AIRPORT DATA
   ============================================================ */

function RP_updateAirportData() {
  const airport =
    RP_STATE.destination;

  const aircraft =
    RP_STATE.selectedAircraft;

  if (!airport) {
    RP_setText(
      "rpAirportRunwayValue",
      "-- M"
    );

    RP_setText(
      "rpAircraftRunwayValue",
      "-- M"
    );

    RP_setText(
      "rpAirportElevationValue",
      "-- FT"
    );

    return;
  }


  const runwayM =
    Number(airport.runway_m);

  const elevationFt =
    Number(airport.elevation_ft);

  const baseRequiredRunwayM =
    aircraft
      ? Number(aircraft.required_runway_m)
      : null;


  /* ============================================================
     ACS OCC — ESTIMATED TAKEOFF WEIGHT
     ============================================================ */

  let estimatedTowKg = null;
  let mtowKg = null;

  if (aircraft) {
    const oewKg =
      Number(aircraft.oew_kg);

    mtowKg =
      Number(aircraft.mtow_kg);

    const speedKts =
      Number(aircraft.speed_kts);

    const fuelBurnKgph =
      Number(aircraft.fuel_burn_kgph);

    const passengers =
      Number(RP_STATE.passengers) || 0;

    const passengerWeightKg =
      passengers * 84;

    const baggageKg =
      passengers * 2 * 25;

    let routeFuelKg = 0;

    const originIcao =
      String(
        RP_STATE.origin?.icao || ""
      )
        .trim()
        .toUpperCase();

    const originAirport =
      RP_STATE.airports.find(
        item =>
          String(
            item.icao || ""
          )
            .trim()
            .toUpperCase() ===
          originIcao
      ) || null;

    if (
      originAirport &&
      Number.isFinite(speedKts) &&
      speedKts > 0 &&
      Number.isFinite(fuelBurnKgph) &&
      fuelBurnKgph > 0
    ) {
      const distanceNm =
        RP_calculateGreatCircleNm(
          Number(originAirport.latitude),
          Number(originAirport.longitude),
          Number(airport.latitude),
          Number(airport.longitude)
        );

      if (
        Number.isFinite(distanceNm) &&
        distanceNm > 0
      ) {
        const cruiseMinutes =
          (distanceNm / speedKts) * 60;

        const totalMinutes =
          cruiseMinutes + 30;

        routeFuelKg =
          (totalMinutes / 60) *
          fuelBurnKgph;
      }
    }

    if (
      Number.isFinite(oewKg) &&
      oewKg > 0
    ) {
      estimatedTowKg =
        oewKg +
        passengerWeightKg +
        baggageKg +
        routeFuelKg;
    }
  }


  /* ============================================================
     ACS OCC — RUNWAY PERFORMANCE
     ============================================================ */

  let adjustedRequiredRunwayM =
    baseRequiredRunwayM;

  if (
    Number.isFinite(baseRequiredRunwayM) &&
    baseRequiredRunwayM > 0
  ) {

    /*
      ALTITUDE

      +7% runway requirement
      per 1,000 FT above sea level.
    */

    const altitudeFactor =
      Number.isFinite(elevationFt) &&
      elevationFt > 0
        ? 1 +
          (
            elevationFt /
            1000
          ) * 0.07
        : 1;


    /*
      WEIGHT

      required_runway_m is treated as
      the aircraft reference requirement.

      At MTOW:
      factor = 1.00

      Below MTOW the runway requirement
      progressively decreases.

      Minimum factor is limited to 0.70
      so an unusually light scenario
      cannot produce unrealistic values.
    */

    let weightFactor = 1;

    if (
      Number.isFinite(estimatedTowKg) &&
      estimatedTowKg > 0 &&
      Number.isFinite(mtowKg) &&
      mtowKg > 0
    ) {
      const weightRatio =
        estimatedTowKg / mtowKg;

      weightFactor =
        Math.max(
          0.70,
          weightRatio
        );
    }


    adjustedRequiredRunwayM =
      baseRequiredRunwayM *
      altitudeFactor *
      weightFactor;
  }


  RP_setText(
    "rpAirportRunwayValue",
    Number.isFinite(runwayM) &&
    runwayM > 0
      ? `${Math.round(
          runwayM
        ).toLocaleString()} M`
      : "-- M"
  );


  RP_setText(
    "rpAircraftRunwayValue",
    Number.isFinite(adjustedRequiredRunwayM) &&
    adjustedRequiredRunwayM > 0
      ? `${Math.round(
          adjustedRequiredRunwayM
        ).toLocaleString()} M`
      : "-- M"
  );


  RP_setText(
    "rpAirportElevationValue",
    Number.isFinite(elevationFt)
      ? `${Math.round(
          elevationFt
        ).toLocaleString()} FT`
      : "-- FT"
  );


  /* ELEVATION VISUAL WARNING */

  const elevationElement =
    RP_get(
      "rpAirportElevationValue"
    );

  if (elevationElement) {
    elevationElement.style.color =
      Number.isFinite(elevationFt) &&
      elevationFt > 4000
        ? "#ff5f5f"
        : "#7fe6a2";
  }


  /* RUNWAY VISUAL WARNING */

  const requiredElement =
    RP_get(
      "rpAircraftRunwayValue"
    );

  if (requiredElement) {
    requiredElement.classList.remove(
      "rp-runway-warning"
    );

    if (
      Number.isFinite(runwayM) &&
      runwayM > 0 &&
      Number.isFinite(
        adjustedRequiredRunwayM
      ) &&
      adjustedRequiredRunwayM >
        runwayM
    ) {
      requiredElement.classList.add(
        "rp-runway-warning"
      );
    }
  }
}
   
function RP_calculateRouteStudy() {
  const originIcao =
    String(
      RP_STATE.origin?.icao || ""
    )
      .trim()
      .toUpperCase();

  const destination =
    RP_STATE.destination;

  const aircraft =
  RP_STATE.selectedAircraft;

  RP_updateAirportData();

  const originAirport =
    RP_STATE.airports.find(
      airport =>
        String(
          airport.icao || ""
        )
          .trim()
          .toUpperCase() ===
        originIcao
    ) || null;


  if (
    !originAirport ||
    !destination
  ) {
    RP_setText(
      "rpGreatCircleDistance",
      "-- NM"
    );

    RP_setText(
      "rpRangeDifference",
      "-- NM"
    );

    if (!aircraft) {
      RP_setText(
        "rpCalculatedRange",
        "-- NM"
      );
    }

    RP_updateLoadScenario(null);
    RP_updatePlanningStatus();
    return;
  }


  const originLat =
    Number(originAirport.latitude);

  const originLon =
    Number(originAirport.longitude);

  const destinationLat =
    Number(destination.latitude);

  const destinationLon =
    Number(destination.longitude);


  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLon) ||
    !Number.isFinite(destinationLat) ||
    !Number.isFinite(destinationLon)
  ) {
    RP_setText(
      "rpGreatCircleDistance",
      "-- NM"
    );

    RP_updateLoadScenario(null);

    RP_setMapStatus(
      "Airport coordinates unavailable"
    );

    return;
  }


  const distanceNm =
    RP_calculateGreatCircleNm(
      originLat,
      originLon,
      destinationLat,
      destinationLon
    );


  RP_setText(
    "rpGreatCircleDistance",
    `${Math.round(
      distanceNm
    ).toLocaleString()} NM`
  );


  RP_updateLoadScenario(
    distanceNm
  );


  if (!aircraft) {
    RP_setText(
      "rpCalculatedRange",
      "-- NM"
    );

    RP_setText(
      "rpRangeDifference",
      "-- NM"
    );

    RP_updatePlanningStatus();
    return;
  }


  const rangeNm =
    Number(aircraft.range_nm);


  if (
    !Number.isFinite(rangeNm) ||
    rangeNm <= 0
  ) {
    RP_setText(
      "rpCalculatedRange",
      "-- NM"
    );

    RP_setText(
      "rpRangeDifference",
      "-- NM"
    );

    RP_setMapStatus(
      "Aircraft range data unavailable"
    );

    return;
  }


  const differenceNm =
    rangeNm - distanceNm;


  RP_setText(
    "rpCalculatedRange",
    `${Math.round(
      rangeNm
    ).toLocaleString()} NM`
  );


  RP_setText(
    "rpRangeDifference",
    `${differenceNm >= 0 ? "+" : ""}${Math.round(
      differenceNm
    ).toLocaleString()} NM`
  );


  RP_setMapStatus(
    differenceNm >= 0
      ? "WITHIN RANGE"
      : "OUT OF RANGE"
  );


  console.log(
    "🟦 ROUTE PLANNING TECHNICAL STUDY:",
    {
      origin:
        originAirport.icao,

      destination:
        destination.icao,

      aircraft:
        aircraft.aircraft_name ||
        aircraft.model,

      distance_nm:
        Math.round(distanceNm),

      aircraft_range_nm:
        Math.round(rangeNm),

      range_difference_nm:
        Math.round(differenceNm),

      passengers:
        RP_STATE.passengers,

      baggage_kg:
        RP_STATE.passengers * 2 * 25,

      flight_hours:
        Number(aircraft.speed_kts) > 0
          ? distanceNm /
            Number(aircraft.speed_kts)
          : null,

      estimated_route_fuel_kg:
        Number(aircraft.speed_kts) > 0 &&
        Number(aircraft.fuel_burn_kgph) > 0
          ? Math.round(
              (
                distanceNm /
                Number(aircraft.speed_kts)
              ) *
              Number(
                aircraft.fuel_burn_kgph
              )
            )
          : null,

      mtow_kg:
        Number(aircraft.mtow_kg) || null
    }
  );
}
   
    /* ============================================================
     DESTINATION CASCADE — ACS AIRPORT AUTHORITY
     ------------------------------------------------------------
     Authority:
     GET /v1/airports/catalog

     Flow:
     CONTINENT → COUNTRY → AIRPORT

     READ ONLY.
     ============================================================ */

  async function RP_loadAirportCatalog() {
    const data =
      await RP_fetchJson(
        `${RP_API_BASE}/v1/airports/catalog?limit=5000`
      );

    if (!Array.isArray(data.airports)) {
      throw new Error(
        "ROUTE_PLANNING_AIRPORT_CATALOG_INVALID"
      );
    }

    RP_STATE.airports =
      data.airports;

    /*
     * Airport authority also returns the official
     * PostgreSQL ACS simulation time.
     */
    if (data.current_sim_time) {
      RP_STATE.simTime =
        data.current_sim_time;
    }

    if (Number.isInteger(Number(data.sim_year))) {
      RP_STATE.simYear =
        Number(data.sim_year);
    }

    RP_STATE.continents =
      [
        ...new Set(
          RP_STATE.airports
            .map(airport =>
              String(
                airport.continent ||
                airport.geographic_continent ||
                ""
              ).trim()
            )
            .filter(Boolean)
        )
      ].sort((a, b) =>
        a.localeCompare(b)
      );

    const continentSelect =
      RP_get("rpContinentSelect");

    RP_resetSelect(
      continentSelect,
      "Select continent",
      false
    );

    RP_STATE.continents.forEach(
      continent => {
        const option =
          document.createElement("option");

        option.value =
          continent;

        option.textContent =
          continent;

        continentSelect.appendChild(
          option
        );
      }
    );

    console.log(
      "🟦 ROUTE PLANNING AIRPORT CATALOG:",
      {
        year: RP_STATE.simYear,
        count: RP_STATE.airports.length,
        continents:
          RP_STATE.continents.length
      }
    );
  }


  function RP_handleContinentChange() {
    const continentSelect =
      RP_get("rpContinentSelect");

    const continent =
      String(
        continentSelect?.value || ""
      ).trim();

    RP_STATE.destination = null;

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

    if (!continent) {
      RP_STATE.countries = [];
      RP_updatePlanningStatus();
      return;
    }

    RP_STATE.countries =
      [
        ...new Set(
          RP_STATE.airports
            .filter(airport =>
              String(
                airport.continent ||
                airport.geographic_continent ||
                ""
              ).trim() === continent
            )
            .map(airport =>
              String(
                airport.country || ""
              ).trim()
            )
            .filter(Boolean)
        )
      ].sort((a, b) =>
        a.localeCompare(b)
      );

    const countrySelect =
      RP_get("rpCountrySelect");

    RP_resetSelect(
      countrySelect,
      "Select country",
      false
    );

        RP_STATE.countries.forEach(
      country => {
        const option =
          document.createElement("option");

        option.value =
          country;

        const countryAirport =
          RP_STATE.airports.find(
            airport =>
              String(
                airport.country || ""
              ).trim() === country
          );

        const countryName =
          String(
            countryAirport?.region ||
            country
          ).trim();

        option.textContent =
          countryName;

        countrySelect.appendChild(
          option
        );
      }
    );

    RP_updatePlanningStatus();
  }


  function RP_handleCountryChange() {
    const continent =
      String(
        RP_get("rpContinentSelect")
          ?.value || ""
      ).trim();

    const country =
      String(
        RP_get("rpCountrySelect")
          ?.value || ""
      ).trim();

    RP_STATE.destination = null;

    RP_resetSelect(
      RP_get("rpAirportSelect"),
      "Select airport",
      true
    );

    if (!continent || !country) {
      RP_updatePlanningStatus();
      return;
    }

    const airports =
      RP_STATE.airports
        .filter(airport => {
          const airportContinent =
            String(
              airport.continent ||
              airport.geographic_continent ||
              ""
            ).trim();

          const airportCountry =
            String(
              airport.country || ""
            ).trim();

          return (
            airportContinent === continent &&
            airportCountry === country
          );
        })
        .sort((a, b) =>
          String(a.city || "")
            .localeCompare(
              String(b.city || "")
            )
        );

    const airportSelect =
      RP_get("rpAirportSelect");

    RP_resetSelect(
      airportSelect,
      "Select airport",
      false
    );

    airports.forEach(airport => {
      const option =
        document.createElement("option");

      const icao =
        String(airport.icao || "")
          .trim()
          .toUpperCase();

      const iata =
        String(airport.iata || "")
          .trim()
          .toUpperCase();

      const city =
        String(airport.city || "")
          .trim();

      option.value = icao;

      option.textContent =
        `${icao}` +
        (iata ? ` / ${iata}` : "") +
        (city ? ` — ${city}` : "");

      airportSelect.appendChild(
        option
      );
    });

    RP_updatePlanningStatus();
  }


  function RP_handleAirportChange() {
    const icao =
      String(
        RP_get("rpAirportSelect")
          ?.value || ""
      )
        .trim()
        .toUpperCase();

    if (!icao) {
      RP_STATE.destination = null;

      RP_setText(
        "rpRouteDestination",
        "--"
      );

      RP_calculateRouteStudy();
      return;
    }

    RP_STATE.destination =
      RP_STATE.airports.find(
        airport =>
          String(
            airport.icao || ""
          )
            .trim()
            .toUpperCase() === icao
      ) || null;

    RP_setText(
      "rpRouteDestination",
      RP_STATE.destination?.icao || "--"
    );

    RP_calculateRouteStudy();
  }


  function RP_prepareDestinationSelectors() {
    RP_resetSelect(
      RP_get("rpContinentSelect"),
      "Loading continents...",
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

  const continentSelect =
    RP_get("rpContinentSelect");

  const countrySelect =
    RP_get("rpCountrySelect");

  const airportSelect =
    RP_get("rpAirportSelect");

  const passengersMinus =
    RP_get("rpPassengersMinus");

  const passengersPlus =
    RP_get("rpPassengersPlus");


  if (aircraftSelect) {
    aircraftSelect.addEventListener(
      "change",
      RP_handleAircraftChange
    );
  }


  if (continentSelect) {
    continentSelect.addEventListener(
      "change",
      RP_handleContinentChange
    );
  }


  if (countrySelect) {
    countrySelect.addEventListener(
      "change",
      RP_handleCountryChange
    );
  }


  if (airportSelect) {
    airportSelect.addEventListener(
      "change",
      RP_handleAirportChange
    );
  }


  if (passengersMinus) {
    passengersMinus.addEventListener(
      "click",
      () => RP_changePassengers(-1)
    );
  }


  if (passengersPlus) {
    passengersPlus.addEventListener(
      "click",
      () => RP_changePassengers(1)
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

      await RP_loadAirportCatalog();

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

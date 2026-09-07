/* ============================================================
   ACS OCC — AIRPORT INTELLIGENCE FRONTEND ENGINE v1.1
   ------------------------------------------------------------
   File:
     engine/acs_airport_intelligence.js

   AUTHORITIES
   - Airport selector / airport catalog:
       GET /v1/airports/catalog
   - Airport Intelligence snapshot:
       GET /v1/airport-intelligence/:icao

   RULES
   - READ ONLY
   - No localStorage
   - No frontend simulation-year authority
   - No strategic score
   - No route recommendation
   - No operational writes
   - PostgreSQL / Railway remain authoritative
   ============================================================ */

(function () {

  "use strict";


  /* ============================================================
     CONFIG
     ============================================================ */

  const AI_API_BASE =
    "https://api.aviationcapitalsim.com";

  const AI_CATALOG_URL =
    `${AI_API_BASE}/v1/airports/catalog?limit=5000`;

  const AI_INTELLIGENCE_URL =
    icao =>
      `${AI_API_BASE}/v1/airport-intelligence/${encodeURIComponent(icao)}`;


  /* ============================================================
     STATE
     ============================================================ */

  const AI_STATE = {
    catalog: [],
    selectedContinent: "",
    selectedCountry: "",
    selectedIcao: "",
    snapshot: null,
    activeSection: "airport",
    snapshotController: null,
    initialized: false
  };


  /* ============================================================
     DOM HELPERS
     ============================================================ */

  function AI_get(id) {
    return document.getElementById(id);
  }


  function AI_setText(id, value) {

    const el = AI_get(id);

    if (!el) return;

    el.textContent =
      value === null ||
      value === undefined ||
      value === ""
        ? "—"
        : String(value);
  }


  function AI_setStatus(message) {

    AI_setText(
      "aiStatusLine",
      message
    );
  }


  function AI_setBar(id, percent) {

    const el = AI_get(id);

    if (!el) return;

    const numeric =
      Number(percent);

    const safe =
      Number.isFinite(numeric)
        ? Math.max(
            0,
            Math.min(
              100,
              numeric
            )
          )
        : 0;

    el.style.width =
      `${safe}%`;
  }


  function AI_resetSelect(
    select,
    placeholder,
    disabled
  ) {

    if (!select) return;

    select.innerHTML = "";

    const option =
      document.createElement("option");

    option.value = "";
    option.textContent = placeholder;

    select.appendChild(option);

    select.disabled =
      Boolean(disabled);
  }


  function AI_appendOption(
    select,
    value,
    label
  ) {

    if (!select) return;

    const option =
      document.createElement("option");

    option.value =
      String(value ?? "");

    option.textContent =
      String(label ?? value ?? "");

    select.appendChild(option);
  }


  /* ============================================================
     FORMATTERS
     ============================================================ */

  function AI_text(value) {

    return String(
      value ?? ""
    ).trim();
  }


  function AI_upper(value) {

    return AI_text(value)
      .toUpperCase();
  }


  function AI_number(value) {

    const numeric =
      Number(value);

    return Number.isFinite(numeric)
      ? numeric
      : 0;
  }


  function AI_integer(value) {

    return Math.trunc(
      AI_number(value)
    );
  }


  function AI_formatInteger(value) {

    return new Intl.NumberFormat(
      "en-US",
      {
        maximumFractionDigits: 0
      }
    ).format(
      AI_integer(value)
    );
  }


  function AI_formatMoney(value) {

    const numeric =
      Number(value);

    if (!Number.isFinite(numeric)) {
      return "$—";
    }

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }
    ).format(
      numeric
    );
  }


  function AI_formatPercent(value) {

    const numeric =
      Number(value);

    if (!Number.isFinite(numeric)) {
      return "—";
    }

    /*
     * Airport catalog stores ticket_fee_percent
     * as a decimal fraction (example: 0.06 = 6%).
     */
    const pct =
      Math.abs(numeric) <= 1
        ? numeric * 100
        : numeric;

    return `${pct.toFixed(
      Number.isInteger(pct)
        ? 0
        : 2
    )}%`;
  }



  function AI_countryDisplayName(
    countryCode,
    region
  ) {

    const regionText =
      AI_text(region);

    /*
     * ACS airport catalog already carries a readable region,
     * which for the current world-airport dataset is normally
     * the country name used by the continental airport lists.
     */
    if (regionText) {
      return regionText;
    }

    const code =
      AI_upper(countryCode);

    if (/^[A-Z]{2}$/.test(code)) {

      try {

        const names =
          new Intl.DisplayNames(
            ["en"],
            {
              type: "region"
            }
          );

        const resolved =
          names.of(code);

        if (
          resolved &&
          resolved !== code
        ) {
          return resolved;
        }

      } catch (err) {
        /* display fallback only */
      }
    }

    return code || "—";
  }


  function AI_airportLabel(airport) {

    const icao =
      AI_upper(
        airport?.icao
      );

    const city =
      AI_text(
        airport?.city
      );

    const country =
      AI_countryDisplayName(
        airport?.country,
        airport?.region
      );

    const location =
      [
        city,
        country
      ]
        .filter(Boolean)
        .join(", ");

    return location
      ? `${icao} — ${location}`
      : icao;
  }

/* ============================================================
   AIRLINE BASE — GLOBAL DISPLAY
   ============================================================ */

function AI_airlineBaseInfo(
  airline,
  selectedIcao
) {

  const baseIcao =
    AI_upper(
      airline?.base_icao
    );

  if (!baseIcao) {

    return {
      isBase: false,
      label: "BASE —"
    };
  }


  if (
    baseIcao ===
    AI_upper(
      selectedIcao
    )
  ) {

    return {
      isBase: true,
      label: "BASE AIRLINE"
    };
  }


  const baseCity =
    AI_text(
      airline?.base_city
    );


  return {
    isBase: false,

    label:
      baseCity
        ? `BASE ${baseIcao} · ${baseCity}`
        : `BASE ${baseIcao}`
  };
}

  /* ============================================================
     NETWORK / AIRPORT NORMALIZATION
     ============================================================ */

  function AI_getAirportContinent(
    airport
  ) {

    return AI_text(
      airport?.continent ||
      airport?.geographic_continent
    );
  }


  function AI_getAirportCountryCode(
    airport
  ) {

    return AI_upper(
      airport?.country
    );
  }


  function AI_getAirportCountryName(
    airport
  ) {

    return AI_countryDisplayName(
      airport?.country,
      airport?.region
    );
  }


  function AI_findCatalogAirport(
    icao
  ) {

    const target =
      AI_upper(icao);

    return (
      AI_STATE.catalog.find(
        airport =>
          AI_upper(
            airport?.icao
          ) === target
      )
      ||
      null
    );
  }


  /* ============================================================
     FETCH
     ============================================================ */

  async function AI_fetchJson(
    url,
    options = {}
  ) {

    const response =
      await fetch(
        url,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Accept":
              "application/json"
          },
          ...options
        }
      );

    let data = null;

    try {

      data =
        await response.json();

    } catch (err) {

      throw new Error(
        `INVALID_JSON_RESPONSE_${response.status}`
      );
    }

    if (
      !response.ok ||
      data?.ok !== true
    ) {

      const error =
        new Error(
          data?.error ||
          data?.details ||
          `HTTP_${response.status}`
        );

      error.status =
        response.status;

      error.payload =
        data;

      throw error;
    }

    return data;
  }


  /* ============================================================
     CATALOG LOAD
     ============================================================ */

  async function AI_loadCatalog() {

    AI_setStatus(
      "Loading airport database..."
    );

    const data =
      await AI_fetchJson(
        AI_CATALOG_URL
      );

    if (
      !Array.isArray(
        data?.airports
      )
    ) {
      throw new Error(
        "AIRPORT_CATALOG_INVALID"
      );
    }

    AI_STATE.catalog =
      data.airports;

    AI_populateContinents();

    AI_setStatus(
      `Airport database ready — ${AI_formatInteger(
        AI_STATE.catalog.length
      )} airports available`
    );
  }


  /* ============================================================
     CONTINENT
     ============================================================ */

  function AI_populateContinents() {

    const select =
      AI_get(
        "aiContinentSelect"
      );

    AI_resetSelect(
      select,
      "Select continent",
      false
    );

    const continents =
      Array.from(
        new Set(
          AI_STATE.catalog
            .map(
              AI_getAirportContinent
            )
            .filter(Boolean)
        )
      )
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            "en",
            {
              sensitivity: "base"
            }
          )
      );

    continents.forEach(
      continent =>
        AI_appendOption(
          select,
          continent,
          continent
        )
    );
  }


  function AI_handleContinentChange() {

    const continent =
      AI_text(
        AI_get(
          "aiContinentSelect"
        )?.value
      );

    AI_STATE.selectedContinent =
      continent;

    AI_STATE.selectedCountry = "";
    AI_STATE.selectedIcao = "";
    AI_STATE.snapshot = null;

    AI_resetSelect(
      AI_get(
        "aiCountrySelect"
      ),
      "Select country",
      !continent
    );

    AI_resetSelect(
      AI_get(
        "aiAirportSelect"
      ),
      "Select airport",
      true
    );

    AI_resetAirportView();

    if (!continent) {

      AI_setStatus(
        "Select a continent to begin Airport Intelligence"
      );

      return;
    }

    AI_populateCountries(
      continent
    );

    AI_setStatus(
      `${continent} selected — choose a country`
    );
  }


  /* ============================================================
     COUNTRY
     ============================================================ */

  function AI_populateCountries(
    continent
  ) {

    const select =
      AI_get(
        "aiCountrySelect"
      );

    const countryMap =
      new Map();

    AI_STATE.catalog
      .filter(
        airport =>
          AI_getAirportContinent(
            airport
          ) === continent
      )
      .forEach(
        airport => {

          const code =
            AI_getAirportCountryCode(
              airport
            );

          if (!code) return;

          const name =
            AI_getAirportCountryName(
              airport
            );

          if (!countryMap.has(code)) {
            countryMap.set(
              code,
              name
            );
          }
        }
      );

    const countries =
      Array.from(
        countryMap.entries()
      )
      .sort(
        (a, b) =>
          a[1].localeCompare(
            b[1],
            "en",
            {
              sensitivity: "base"
            }
          )
      );

    AI_resetSelect(
      select,
      "Select country",
      false
    );

    countries.forEach(
      ([code, name]) =>
        AI_appendOption(
          select,
          code,
          name
        )
    );
  }


  function AI_handleCountryChange() {

    const country =
      AI_upper(
        AI_get(
          "aiCountrySelect"
        )?.value
      );

    AI_STATE.selectedCountry =
      country;

    AI_STATE.selectedIcao = "";
    AI_STATE.snapshot = null;

    AI_resetSelect(
      AI_get(
        "aiAirportSelect"
      ),
      "Select airport",
      !country
    );

    AI_resetAirportView();

    if (!country) {

      AI_setStatus(
        `${AI_STATE.selectedContinent || "Continent"} selected — choose a country`
      );

      return;
    }

    AI_populateAirports(
      AI_STATE.selectedContinent,
      country
    );

    const countryName =
      AI_get(
        "aiCountrySelect"
      )
        ?.selectedOptions?.[0]
        ?.textContent
        ?.trim()
      || country;

    AI_setStatus(
      `${countryName} selected — choose an airport`
    );
  }


  /* ============================================================
     AIRPORT
     ============================================================ */

  function AI_populateAirports(
    continent,
    country
  ) {

    const select =
      AI_get(
        "aiAirportSelect"
      );

    const airports =
      AI_STATE.catalog
        .filter(
          airport =>
            AI_getAirportContinent(
              airport
            ) === continent
            &&
            AI_getAirportCountryCode(
              airport
            ) === country
        )
        .sort(
          (a, b) => {

            const cityCompare =
              AI_text(
                a?.city
              )
                .localeCompare(
                  AI_text(
                    b?.city
                  ),
                  "en",
                  {
                    sensitivity: "base"
                  }
                );

            if (cityCompare !== 0) {
              return cityCompare;
            }

            return AI_upper(
              a?.icao
            ).localeCompare(
              AI_upper(
                b?.icao
              )
            );
          }
        );

    AI_resetSelect(
      select,
      "Select airport",
      false
    );

    airports.forEach(
      airport =>
        AI_appendOption(
          select,
          AI_upper(
            airport?.icao
          ),
          AI_airportLabel(
            airport
          )
        )
    );
  }


  async function AI_handleAirportChange() {

    const icao =
      AI_upper(
        AI_get(
          "aiAirportSelect"
        )?.value
      );

    AI_STATE.selectedIcao =
      icao;

    AI_STATE.snapshot = null;

    if (!icao) {

      AI_resetAirportView();

      AI_setStatus(
        "Choose an airport to load Airport Intelligence"
      );

      return;
    }

    const catalogAirport =
      AI_findCatalogAirport(
        icao
      );

    if (catalogAirport) {
      AI_renderCatalogIdentity(
        catalogAirport
      );
    }

    await AI_loadSnapshot(
      icao
    );
  }


  /* ============================================================
     SNAPSHOT
     ============================================================ */

  async function AI_loadSnapshot(
    icao
  ) {

    if (
      AI_STATE.snapshotController
    ) {
      AI_STATE.snapshotController.abort();
    }

    const controller =
      new AbortController();

    AI_STATE.snapshotController =
      controller;

    AI_setStatus(
      `Loading ${icao} Airport Intelligence...`
    );

    try {

      const data =
        await AI_fetchJson(
          AI_INTELLIGENCE_URL(
            icao
          ),
          {
            signal:
              controller.signal
          }
        );

      if (
        AI_upper(
          data?.airport?.icao
        ) !== icao
      ) {
        throw new Error(
          "AIRPORT_INTELLIGENCE_ICAO_MISMATCH"
        );
      }

      /*
       * Ignore an older response when the user changed airport
       * while the network request was still in progress.
       */
      if (
        AI_STATE.selectedIcao !== icao
      ) {
        return;
      }

      AI_STATE.snapshot =
        data;

      AI_renderSnapshot(
        data
      );

      AI_setStatus(
        `${AI_airportLabel(
          AI_findCatalogAirport(
            icao
          )
          ||
          data?.airport
        )} — Airport Intelligence loaded`
      );

    } catch (err) {

      if (
        err?.name ===
        "AbortError"
      ) {
        return;
      }

      console.error(
        "ACS AIRPORT INTELLIGENCE LOAD ERROR:",
        err
      );

      AI_STATE.snapshot =
        null;

      AI_renderSnapshotError();

      AI_setStatus(
        `Airport Intelligence unavailable — ${err?.message || "UNKNOWN_ERROR"}`
      );
    }
  }


  /* ============================================================
     IDENTITY
     ============================================================ */

  function AI_renderCatalogIdentity(
    airport
  ) {

    const country =
      AI_getAirportCountryName(
        airport
      );

    AI_setText(
      "aiAirportIcao",
      AI_upper(
        airport?.icao
      ) || "----"
    );

    AI_setText(
      "aiAirportIata",
      AI_upper(
        airport?.iata
      ) || "---"
    );

    AI_setText(
      "aiAirportName",
      AI_text(
        airport?.city
      ) || "Airport"
    );

    AI_setText(
      "aiAirportLocation",
      [
        AI_text(
          airport?.city
        ),
        country
      ]
        .filter(Boolean)
        .join(", ")
    );

    AI_setText(
      "aiEraChip",
      AI_upper(airport?.airport_status) || "ACTIVE"
    );
  }


  function AI_renderSnapshotIdentity(
    snapshot
  ) {

    const airport =
      snapshot?.airport || {};

    const catalogAirport =
      AI_findCatalogAirport(
        airport?.icao
      );

    const country =
      catalogAirport
        ? AI_getAirportCountryName(
            catalogAirport
          )
        : AI_text(
            airport?.country
          );

    AI_setText(
      "aiAirportIcao",
      AI_upper(
        airport?.icao
      ) || "----"
    );

    AI_setText(
      "aiAirportIata",
      AI_upper(
        airport?.iata
      ) || "---"
    );

    AI_setText(
      "aiAirportName",
      AI_text(
        airport?.city
      ) || "Airport"
    );

    AI_setText(
      "aiAirportLocation",
      [
        AI_text(
          airport?.city
        ),
        country
      ]
        .filter(Boolean)
        .join(", ")
    );

    AI_setText(
      "aiEraChip",
      AI_upper(airport?.airport_status) || "ACTIVE"
    );
  }


  /* ============================================================
     QUICK DATA
     ============================================================ */

  function AI_renderQuickData(
    snapshot
  ) {

    const airport =
      snapshot?.airport || {};

    const network =
      snapshot?.activity
        ?.scheduled_network || {};

    const runway =
      AI_integer(
        airport?.runway_m
      );

    const elevation =
      AI_integer(
        airport?.elevation_ft
      );

    const airlines =
      AI_integer(
        network?.airlines
      );

    const routes =
      AI_integer(
        network?.active_routes
      );

    AI_setText(
      "aiQuickRunway",
      runway > 0
        ? `${AI_formatInteger(runway)} M`
        : "—"
    );

    AI_setText(
      "aiQuickElevation",
      `${AI_formatInteger(elevation)} FT`
    );

    AI_setText(
      "aiQuickAirlines",
      AI_formatInteger(
        airlines
      )
    );

    AI_setText(
      "aiQuickRoutes",
      AI_formatInteger(
        routes
      )
    );
  }


  /* ============================================================
     VISUAL PROFILE
     ------------------------------------------------------------
     Text values are authoritative.

     Bars are only compact visual references:
     - Runway: fixed 5,000 m display scale.
     - Traffic: slot utilization percentage, a factual 0–100 ratio.
     - Operators / Destinations: no synthetic score is invented,
       therefore no arbitrary percentage bar is calculated.
     ============================================================ */

  function AI_renderProfile(
    snapshot
  ) {

    const airport =
      snapshot?.airport || {};

    const slots =
      snapshot?.activity
        ?.slots || {};

    const network =
      snapshot?.activity
        ?.scheduled_network || {};

    const runway =
      AI_integer(
        airport?.runway_m
      );

    const weeklyFlights =
      AI_integer(
        network?.weekly_flights
      );

    const airlines =
      AI_integer(
        network?.airlines
      );

    const destinations =
      AI_integer(
        network?.destinations
      );

    AI_setText(
      "aiRunwayValue",
      runway > 0
        ? `${AI_formatInteger(runway)} M`
        : "—"
    );

    AI_setText(
      "aiTrafficValue",
      `${AI_formatInteger(
        weeklyFlights
      )} FLIGHTS / WEEK`
    );

    AI_setText(
      "aiOperatorsValue",
      `${AI_formatInteger(
        airlines
      )} AIRLINES`
    );

    AI_setText(
      "aiDestinationsValue",
      AI_formatInteger(
        destinations
      )
    );

    AI_setBar(
      "aiRunwayBar",
      runway > 0
        ? (
            runway /
            5000
          ) * 100
        : 0
    );

    AI_setBar(
      "aiTrafficBar",
      AI_number(
        slots?.utilization_pct
      )
    );

    /*
     * Do not invent strategic scales for number of airlines
     * or destinations.
     */
    AI_setBar(
      "aiOperatorsBar",
      0
    );

    AI_setBar(
      "aiDestinationsBar",
      0
    );
  }


  /* ============================================================
     ACTIVE SECTION
     ============================================================ */

  function AI_contentItem(
    label,
    value,
    extra = ""
  ) {

    return `
      <div class="ai-content-item">
        <span>${AI_escapeHtml(label)}</span>
        <strong>${AI_escapeHtml(value)}</strong>
        ${
          extra
            ? `<small>${AI_escapeHtml(extra)}</small>`
            : ""
        }
      </div>
    `;
  }


  function AI_escapeHtml(
    value
  ) {

    return AI_text(value)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  function AI_renderSection(
    sectionKey
  ) {

    AI_STATE.activeSection =
      sectionKey || "airport";

    const body =
      AI_get(
        "aiContentBody"
      );

    const title =
      AI_get(
        "aiContentTitle"
      );

    const meta =
      AI_get(
        "aiContentMeta"
      );

    if (
  !body ||
  !title ||
  !meta
) {
  return;
}

body.classList.remove(
  "ai-airlines-grid"
);

const snapshot =
  AI_STATE.snapshot;

    if (!snapshot) {

      title.textContent =
        AI_sectionTitle(
          AI_STATE.activeSection
        );

      meta.textContent =
        "Awaiting Airport Selection";

      body.innerHTML =
        AI_defaultSectionHtml(
          AI_STATE.activeSection
        );

      return;
    }


    switch (
      AI_STATE.activeSection
    ) {

      case "operations":
        AI_renderOperationsSection(
          snapshot,
          title,
          meta,
          body
        );
        break;

      case "airlines":
        AI_renderAirlinesSection(
          snapshot,
          title,
          meta,
          body
        );
        break;

      case "costs":
        AI_renderCostsSection(
          snapshot,
          title,
          meta,
          body
        );
        break;

      case "airport":
      default:
        AI_renderAirportActivitySection(
          snapshot,
          title,
          meta,
          body
        );
        break;
    }
  }


  function AI_sectionTitle(
    sectionKey
  ) {

    const titles = {
      airport:
        "Airport Activity",
      operations:
        "Operations",
      airlines:
        "Airlines",
      costs:
        "Costs"
    };

    return (
      titles[
        sectionKey
      ]
      ||
      "Airport Activity"
    );
  }


  function AI_defaultSectionHtml(
    sectionKey
  ) {

    const defaults = {

      airport: [
        [
          "Passenger Movement",
          "—"
        ],
        [
          "Available Slots",
          "—"
        ],
        [
          "Used Slots",
          "—"
        ],
        [
          "Slot Capacity",
          "—"
        ]
      ],

      operations: [
        [
          "Weekly Flights",
          "—"
        ],
        [
          "Destinations",
          "—"
        ],
        [
          "Active Routes",
          "—"
        ],
        [
          "Current Flights",
          "—"
        ]
      ],

      airlines: [
        [
          "Operators",
          "—"
        ],
        [
          "Routes",
          "—"
        ],
        [
          "Weekly Flights",
          "—"
        ],
        [
          "Aircraft Types",
          "—"
        ]
      ],

      costs: [
        [
          "Landing Fee",
          "$—"
        ],
        [
          "Slot Fee",
          "$—"
        ],
        [
          "Passenger Charges",
          "—"
        ],
        [
          "Cost Authority",
          "—"
        ]
      ]
    };

    return (
      defaults[
        sectionKey
      ]
      ||
      defaults.airport
    )
      .map(
        ([label, value]) =>
          AI_contentItem(
            label,
            value
          )
      )
      .join("");
  }


  function AI_renderAirportActivitySection(
    snapshot,
    title,
    meta,
    body
  ) {

    const pax =
      snapshot?.activity
        ?.passenger_movement || {};

    const slots =
      snapshot?.activity
        ?.slots || {};

    title.textContent =
      "Airport Activity";

    meta.textContent =
      "CURRENT MONTH";

    body.innerHTML =
      [
        AI_contentItem(
          "Passenger Movement",
          `${AI_formatInteger(
            pax?.passengers
          )} PAX`,
          "Month to date"
        ),

        AI_contentItem(
          "Available Slots",
          AI_formatInteger(
            slots?.available
          )
        ),

        AI_contentItem(
          "Used Slots",
          AI_formatInteger(
            slots?.used
          )
        ),

        AI_contentItem(
          "Slot Capacity",
          `${AI_formatInteger(
            slots?.capacity
          )} SLOTS`
        )
      ]
      .join("");
  }


  function AI_renderOperationsSection(
    snapshot,
    title,
    meta,
    body
  ) {

    const network =
      snapshot?.activity
        ?.scheduled_network || {};

    const current =
      snapshot?.activity
        ?.current_operations || {};

    title.textContent =
      "Operations";

    meta.textContent =
      "CURRENT OPERATIONS";

    body.innerHTML =
      [
        AI_contentItem(
          "Weekly Flights",
          AI_formatInteger(
            network?.weekly_flights
          )
        ),

        AI_contentItem(
          "Destinations",
          AI_formatInteger(
            network?.destinations
          )
        ),

        AI_contentItem(
          "Active Routes",
          AI_formatInteger(
            network?.active_routes
          )
        ),

        AI_contentItem(
          "Current Flights",
          AI_formatInteger(
            current?.active_flights
          ),
          `${AI_formatInteger(
            current?.active_airlines
          )} active airline(s)`
        )
      ]
      .join("");
  }


  function AI_renderAirlinesSection(
  snapshot,
  title,
  meta,
  body
) {

  const airlines =
    Array.isArray(
      snapshot?.network?.airlines
    )
      ? [
          ...snapshot.network.airlines
        ]
      : [];


  const selectedIcao =
    AI_upper(
      snapshot?.airport?.icao
    );


  title.textContent =
    "Airlines";

  meta.textContent =
    "AIRPORT OPERATORS";


  body.classList.add(
    "ai-airlines-grid"
  );


  if (!airlines.length) {

    body.innerHTML =
      AI_contentItem(
        "Operators",
        "0",
        "No airlines currently operating at this airport"
      );

    return;
  }


  /*
   * Airport base airline first.
   * Remaining operators ordered by weekly activity.
   */

  airlines.sort(
    (a, b) => {

      const aBase =
        AI_upper(
          a?.base_icao
        ) === selectedIcao;

      const bBase =
        AI_upper(
          b?.base_icao
        ) === selectedIcao;


      if (
        aBase !== bBase
      ) {

        return aBase
          ? -1
          : 1;
      }


      const flightDifference =
        AI_integer(
          b?.weekly_flights
        )
        -
        AI_integer(
          a?.weekly_flights
        );


      if (
        flightDifference !== 0
      ) {

        return flightDifference;
      }


      return AI_text(
        a?.airline_name
      ).localeCompare(
        AI_text(
          b?.airline_name
        ),
        "en",
        {
          sensitivity: "base"
        }
      );
    }
  );


  body.innerHTML =
    airlines
      .map(
        airline => {

          const carrier =
            AI_text(
              airline?.airline_name
            )
            ||
            AI_upper(
              airline?.icao
            )
            ||
            `AIRLINE ${AI_integer(
              airline?.airline_id
            )}`;


          const codes =
            [
              AI_upper(
                airline?.iata
              ),

              AI_upper(
                airline?.icao
              )
            ]
              .filter(Boolean)
              .join(" / ");


          const base =
            AI_airlineBaseInfo(
              airline,
              selectedIcao
            );


          /*
           * IMPORTANT:
           * Aircraft names arrive from the backend authority.
           * Airport Intelligence does NOT classify,
           * translate or maintain aircraft-specific rules.
           */

          const aircraft =
            Array.isArray(
              airline?.aircraft_types
            )
              ? Array.from(
                  new Set(
                    airline.aircraft_types
                      .map(
                        model =>
                          AI_text(model)
                      )
                      .filter(Boolean)
                  )
                )
              : [];


          const aircraftHtml =
            aircraft.length

              ? aircraft
                  .map(
                    model => `
                      <span class="ai-aircraft-chip">
                        ${AI_escapeHtml(model)}
                      </span>
                    `
                  )
                  .join("")

              : `
                  <span class="ai-aircraft-chip">
                    —
                  </span>
                `;


          return `
            <article
              class="ai-airline-card${base.isBase ? " is-base" : ""}"
            >

              <div class="ai-airline-top">

                <div class="ai-airline-identity">

                  <strong class="ai-airline-name">
                    ${AI_escapeHtml(
                      carrier
                    )}
                  </strong>

                  <span class="ai-airline-codes">
                    ${AI_escapeHtml(
                      codes || "—"
                    )}
                  </span>

                </div>


                <span
                  class="ai-airline-base${base.isBase ? " is-base" : ""}"
                >
                  ${AI_escapeHtml(
                    base.label
                  )}
                </span>

              </div>


              <div class="ai-airline-primary">

                <strong>
                  ${AI_formatInteger(
                    airline?.weekly_flights
                  )}
                </strong>

                <span>
                  WEEKLY FLIGHTS
                </span>

              </div>


              <div class="ai-airline-stats">

                <div>

                  <strong>
                    ${AI_formatInteger(
                      airline?.routes
                    )}
                  </strong>

                  <span>
                    ROUTES
                  </span>

                </div>


                <div>

                  <strong>
                    ${AI_formatInteger(
                      airline?.destinations
                    )}
                  </strong>

                  <span>
                    DESTINATIONS
                  </span>

                </div>

              </div>


              <div class="ai-airline-aircraft">

                <span class="ai-airline-aircraft-label">
                  AIRCRAFT
                </span>

                <div class="ai-aircraft-list">
                  ${aircraftHtml}
                </div>

              </div>

            </article>
          `;
        }
      )
      .join("");
}


  function AI_renderCostsSection(
    snapshot,
    title,
    meta,
    body
  ) {

    const costs =
      snapshot?.costs || {};

    title.textContent =
      "Costs";

    meta.textContent =
      "AIRPORT CHARGES";

    body.innerHTML =
      [
        AI_contentItem(
          "Landing Fee",
          AI_formatMoney(
            costs?.landing_fee_usd
          )
        ),

        AI_contentItem(
          "Slot Fee",
          AI_formatMoney(
            costs?.slot_cost_usd
          )
        ),

        AI_contentItem(
          "Passenger Charges",
          AI_formatPercent(
            costs?.ticket_fee_percent
          )
        ),

        AI_contentItem(
          "Open Hours",
          AI_text(
            snapshot?.airport?.open_hrs
          ) || "—"
        )
      ]
      .join("");
  }

  /* ============================================================
     COMPLETE SNAPSHOT RENDER
     ============================================================ */

  function AI_renderSnapshot(
    snapshot
  ) {

    AI_renderSnapshotIdentity(
      snapshot
    );

    AI_renderQuickData(
      snapshot
    );

    AI_renderProfile(
      snapshot
    );

    AI_renderSection(
      AI_STATE.activeSection
    );
  }


  /* ============================================================
     RESET / ERROR
     ============================================================ */

  function AI_resetAirportView() {

    AI_setText(
      "aiAirportIcao",
      "----"
    );

    AI_setText(
      "aiAirportIata",
      "---"
    );

    AI_setText(
      "aiAirportName",
      "Select an airport"
    );

    AI_setText(
      "aiAirportLocation",
      "Airport profile awaiting selection"
    );

    AI_setText(
      "aiEraChip",
      "ACTIVE"
    );

    AI_setText(
      "aiQuickRunway",
      "-- M"
    );

    AI_setText(
      "aiQuickElevation",
      "-- FT"
    );

    AI_setText(
      "aiQuickAirlines",
      "--"
    );

    AI_setText(
      "aiQuickRoutes",
      "--"
    );

    AI_setText(
      "aiRunwayValue",
      "-- M"
    );

    AI_setText(
      "aiTrafficValue",
      "-- FLIGHTS / WEEK"
    );

    AI_setText(
      "aiOperatorsValue",
      "-- AIRLINES"
    );

    AI_setText(
      "aiDestinationsValue",
      "--"
    );

    AI_setBar(
      "aiRunwayBar",
      0
    );

    AI_setBar(
      "aiTrafficBar",
      0
    );

    AI_setBar(
      "aiOperatorsBar",
      0
    );

    AI_setBar(
      "aiDestinationsBar",
      0
    );

    AI_renderSection(
      AI_STATE.activeSection
    );
  }

  function AI_renderSnapshotError() {

  AI_setText(
    "aiQuickAirlines",
    "—"
  );

  AI_setText(
    "aiQuickRoutes",
    "—"
  );

  AI_renderSection(
    AI_STATE.activeSection
  );
}


  /* ============================================================
     SECTION CARD BINDING
     ------------------------------------------------------------
     airport_intelligence.html already has visual preview handlers.
     This engine deliberately renders AFTER those handlers and
     replaces preview values with canonical backend data.
     ============================================================ */

  function AI_bindSectionCards() {

    document
      .querySelectorAll(
        ".ai-main-card"
      )
      .forEach(
        card => {

          card.addEventListener(
            "click",
            () => {

              AI_STATE.activeSection =
                AI_text(
                  card.dataset
                    ?.aiSection
                )
                ||
                "airport";

              /*
               * The existing inline visual handler executes on the
               * same click. Queue the canonical render immediately
               * after that preview render.
               */
              queueMicrotask(
                () =>
                  AI_renderSection(
                    AI_STATE.activeSection
                  )
              );
            }
          );
        }
      );
  }


  /* ============================================================
     SELECTOR BINDING
     ============================================================ */

  function AI_bindSelectors() {

    AI_get(
      "aiContinentSelect"
    )
      ?.addEventListener(
        "change",
        AI_handleContinentChange
      );

    AI_get(
      "aiCountrySelect"
    )
      ?.addEventListener(
        "change",
        AI_handleCountryChange
      );

    AI_get(
      "aiAirportSelect"
    )
      ?.addEventListener(
        "change",
        AI_handleAirportChange
      );
  }


  /* ============================================================
     INIT
     ============================================================ */

  async function AI_init() {

    if (
      AI_STATE.initialized
    ) {
      return;
    }

    AI_STATE.initialized =
      true;

    AI_bindSelectors();
    AI_bindSectionCards();

    AI_resetSelect(
      AI_get(
        "aiContinentSelect"
      ),
      "Loading continents...",
      true
    );

    AI_resetSelect(
      AI_get(
        "aiCountrySelect"
      ),
      "Select country",
      true
    );

    AI_resetSelect(
      AI_get(
        "aiAirportSelect"
      ),
      "Select airport",
      true
    );

    AI_resetAirportView();

    try {

      await AI_loadCatalog();

    } catch (err) {

      console.error(
        "ACS AIRPORT INTELLIGENCE CATALOG ERROR:",
        err
      );

      AI_resetSelect(
        AI_get(
          "aiContinentSelect"
        ),
        "Airport authority unavailable",
        true
      );

      AI_setStatus(
        `Airport database unavailable — ${err?.message || "UNKNOWN_ERROR"}`
      );
    }
  }


  /* ============================================================
     PUBLIC DEBUG SURFACE — READ ONLY
     ============================================================ */

  window.ACS_AirportIntelligence = {
    init:
      AI_init,

    state:
      AI_STATE,

    reloadSelectedAirport:
      async function () {

        if (
          !AI_STATE.selectedIcao
        ) {
          return null;
        }

        await AI_loadSnapshot(
          AI_STATE.selectedIcao
        );

        return AI_STATE.snapshot;
      }
  };


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      AI_init,
      {
        once: true
      }
    );

  } else {

    AI_init();
  }

})();

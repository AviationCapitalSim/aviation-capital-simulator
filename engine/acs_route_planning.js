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

  passengers: 0,

  airportIntelligence: {
    target: "destination",
    selectedIcao: "",
    snapshot: null,
    controller: null
  }
};

    let RP_MAP = null;
  let RP_ORIGIN_MARKER = null;
  let RP_DESTINATION_MARKER = null;

  let RP_REACHABLE_TRACE = null;
  let RP_REMAINING_TRACE = null;
  let RP_RANGE_LIMIT_MARKER = null;
   
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
     WORLD ROUTE STUDY MAP
     ------------------------------------------------------------
     Visual authority only.

     Route calculations remain under the existing ACS
     Route Planning engine.
     ============================================================ */

  function RP_initializeMap() {
    const mapContainer =
      RP_get("routePlanningMap");

    if (
      !mapContainer ||
      typeof window.L === "undefined"
    ) {
      RP_setMapStatus(
        "Map authority unavailable"
      );

      return null;
    }

    if (RP_MAP) {
      return RP_MAP;
    }

    RP_MAP =
      window.L.map(
        mapContainer,
        {
          center: [20, 0],
          zoom: 2,
          minZoom: 2,
          maxZoom: 19,
          zoomControl: true,
          attributionControl: true,
          worldCopyJump: true
        }
      );

    window.L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          "&copy; " +
          '<a href="https://www.openstreetmap.org/copyright" ' +
          'target="_blank" rel="noopener noreferrer">' +
          "OpenStreetMap contributors" +
          "</a>"
      }
    ).addTo(RP_MAP);

    mapContainer.classList.add(
      "rp-map-active"
    );

    window.setTimeout(
      () => {
        RP_MAP?.invalidateSize();
      },
      200
    );

    RP_setMapStatus(
      "Map ready — awaiting destination"
    );

    return RP_MAP;
  }

     function RP_centerMapOnOrigin() {
    if (!RP_MAP) {
      return false;
    }

    const originIcao =
      String(
        RP_STATE.origin?.icao || ""
      )
        .trim()
        .toUpperCase();

    if (!originIcao) {
      return false;
    }

    const originAirport =
      RP_STATE.airports.find(
        airport =>
          String(
            airport.icao || ""
          )
            .trim()
            .toUpperCase() === originIcao
      ) || null;

    if (!originAirport) {
      RP_setMapStatus(
        "Company base coordinates unavailable"
      );

      return false;
    }

    const latitude =
      Number(originAirport.latitude);

    const longitude =
      Number(originAirport.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      RP_setMapStatus(
        "Company base coordinates unavailable"
      );

      return false;
    }

    const originPosition =
      [latitude, longitude];

    RP_MAP.setView(
      originPosition,
      6,
      {
        animate: false
      }
    );

    if (!RP_ORIGIN_MARKER) {
      RP_ORIGIN_MARKER =
        window.L.circleMarker(
          originPosition,
          {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillColor: "#ff3b3b",
            fillOpacity: 1,
            interactive: false
          }
        )
          .addTo(RP_MAP)
          .bindTooltip(
            originIcao,
            {
              permanent: true,
              direction: "right",
              offset: [10, 0],
              className:
                "rp-map-icao-label"
            }
          );
    } else {
      RP_ORIGIN_MARKER.setLatLng(
        originPosition
      );

      RP_ORIGIN_MARKER.setTooltipContent(
        originIcao
      );
    }

    RP_MAP.invalidateSize();

    RP_setMapStatus(
      "Company base ready — awaiting destination"
    );

    return true;
  }

    function RP_updateDestinationMarker() {
    if (!RP_MAP) {
      return false;
    }

    const destination =
      RP_STATE.destination;

        if (!destination) {
      RP_clearRouteTrace();

      if (RP_DESTINATION_MARKER) {
        RP_MAP.removeLayer(
          RP_DESTINATION_MARKER
        );

        RP_DESTINATION_MARKER = null;
      }

      if (RP_ORIGIN_MARKER) {
        RP_MAP.setView(
          RP_ORIGIN_MARKER.getLatLng(),
          6,
          {
            animate: false
          }
        );
      }

      return false;
    }

    const destinationIcao =
      String(
        destination.icao || ""
      )
        .trim()
        .toUpperCase();

    const latitude =
      Number(destination.latitude);

    const longitude =
      Number(destination.longitude);

    if (
      !destinationIcao ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      if (RP_DESTINATION_MARKER) {
        RP_MAP.removeLayer(
          RP_DESTINATION_MARKER
        );

        RP_DESTINATION_MARKER = null;
      }

      RP_setMapStatus(
        "Destination coordinates unavailable"
      );

      return false;
    }

    const destinationPosition =
      [latitude, longitude];

    if (!RP_DESTINATION_MARKER) {
      RP_DESTINATION_MARKER =
        window.L.circleMarker(
          destinationPosition,
          {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillColor: "#238cff",
            fillOpacity: 1,
            interactive: false
          }
        )
          .addTo(RP_MAP)
          .bindTooltip(
            destinationIcao,
            {
              permanent: true,
              direction: "right",
              offset: [10, 0],
              className:
                "rp-map-icao-label"
            }
          );
    } else {
      RP_DESTINATION_MARKER.setLatLng(
        destinationPosition
      );

      RP_DESTINATION_MARKER.setTooltipContent(
        destinationIcao
      );
    }

    if (RP_ORIGIN_MARKER) {
      RP_MAP.fitBounds(
        window.L.latLngBounds(
          [
            RP_ORIGIN_MARKER.getLatLng(),
            RP_DESTINATION_MARKER.getLatLng()
          ]
        ),
        {
          paddingTopLeft: [70, 90],
          paddingBottomRight: [70, 55],
          maxZoom: 6,
          animate: true
        }
      );
    } else {
      RP_MAP.setView(
        destinationPosition,
        6,
        {
          animate: true
        }
      );
    }

      return true;
  }


  function RP_clearRouteTrace() {
    if (!RP_MAP) {
      return;
    }

    if (RP_REACHABLE_TRACE) {
      RP_MAP.removeLayer(
        RP_REACHABLE_TRACE
      );

      RP_REACHABLE_TRACE = null;
    }

    if (RP_REMAINING_TRACE) {
      RP_MAP.removeLayer(
        RP_REMAINING_TRACE
      );

      RP_REMAINING_TRACE = null;
    }

    if (RP_RANGE_LIMIT_MARKER) {
      RP_MAP.removeLayer(
        RP_RANGE_LIMIT_MARKER
      );

      RP_RANGE_LIMIT_MARKER = null;
    }
  }


  function RP_getAircraftModelLabel(
    aircraft
  ) {
    return String(
      aircraft?.model ||
      aircraft?.aircraft_name ||
      aircraft?.model_key ||
      ""
    )
      .trim()
      .toUpperCase();
  }


  function RP_renderLinearRouteTrace(
    originAirport,
    destination,
    distanceNm,
    aircraft,
    rangeNm
  ) {
    RP_clearRouteTrace();

    if (
      !RP_MAP ||
      !originAirport ||
      !destination ||
      !aircraft
    ) {
      return false;
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
      !Number.isFinite(destinationLon) ||
      !Number.isFinite(distanceNm) ||
      distanceNm <= 0 ||
      !Number.isFinite(rangeNm) ||
      rangeNm <= 0
    ) {
      return false;
    }

    const originPosition =
      [originLat, originLon];

    const destinationPosition =
      [destinationLat, destinationLon];

    /*
     * Visual route geometry is intentionally linear.
     *
     * Great Circle Distance remains the numerical ACS
     * authority for distance and range evaluation.
     */

    if (rangeNm >= distanceNm) {
      RP_REACHABLE_TRACE =
        window.L.polyline(
          [
            originPosition,
            destinationPosition
          ],
          {
            color: "#3f4b5a",
            weight: 5,
            opacity: 0.96,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
          }
        ).addTo(RP_MAP);

      RP_ORIGIN_MARKER?.bringToFront();
      RP_DESTINATION_MARKER?.bringToFront();

      return true;
    }

    const reachableRatio =
      Math.max(
        0,
        Math.min(
          1,
          rangeNm / distanceNm
        )
      );

    const limitPosition =
      [
        originLat +
          (
            destinationLat -
            originLat
          ) * reachableRatio,

        originLon +
          (
            destinationLon -
            originLon
          ) * reachableRatio
      ];

    RP_REACHABLE_TRACE =
      window.L.polyline(
        [
          originPosition,
          limitPosition
        ],
        {
          color: "#3f4b5a",
          weight: 5,
          opacity: 0.96,
          lineCap: "round",
          lineJoin: "round",
          interactive: false
        }
      ).addTo(RP_MAP);

    RP_REMAINING_TRACE =
      window.L.polyline(
        [
          limitPosition,
          destinationPosition
        ],
        {
          color: "#ff3b3b",
          weight: 5,
          opacity: 0.96,
          dashArray: "12 10",
          lineCap: "round",
          lineJoin: "round",
          interactive: false
        }
      ).addTo(RP_MAP);

    const modelLabel =
      RP_getAircraftModelLabel(
        aircraft
      );

    RP_RANGE_LIMIT_MARKER =
      window.L.circleMarker(
        limitPosition,
        {
          radius: 7,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillColor: "#ff3b3b",
          fillOpacity: 1,
          interactive: false
        }
      ).addTo(RP_MAP);

    if (modelLabel) {
      RP_RANGE_LIMIT_MARKER.bindTooltip(
        modelLabel,
        {
          permanent: true,
          direction: "right",
          offset: [10, 0],
          className:
            "rp-map-icao-label"
        }
      );
    }

    RP_ORIGIN_MARKER?.bringToFront();
    RP_DESTINATION_MARKER?.bringToFront();
    RP_RANGE_LIMIT_MARKER.bringToFront();

    return true;
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
   AIRPORT INTELLIGENCE — INTEGRATED ENGINE
   ------------------------------------------------------------
   Existing backend authority:
   /v1/airport-intelligence/:icao
   ============================================================ */

function RP_AI_text(value) {
  return String(value ?? "").trim();
}

function RP_AI_upper(value) {
  return RP_AI_text(value).toUpperCase();
}

function RP_AI_number(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function RP_AI_integer(value) {
  return Math.trunc(
    RP_AI_number(value)
  );
}

function RP_AI_formatInteger(value) {
  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 0
    }
  ).format(
    RP_AI_integer(value)
  );
}

function RP_AI_formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }
  ).format(number);
}

function RP_AI_formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const percent =
    Math.abs(number) <= 1
      ? number * 100
      : number;

  return `${percent.toFixed(
    Number.isInteger(percent)
      ? 0
      : 1
  )}%`;
}

function RP_AI_escapeHtml(value) {
  return RP_AI_text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function RP_AI_setStatus(
  message,
  kind = "ready"
) {
  const node =
    RP_get("rpAiStatus");

  if (!node) {
    return;
  }

  node.textContent =
    message ||
    "Airport intelligence ready";

  node.dataset.kind =
    kind;
}


/* ============================================================
   AIRPORT INTELLIGENCE — RESET
   ============================================================ */

function RP_AI_resetView() {

  [
    "rpAiAirportIata",
    "rpAiAirportIcao",
    "rpAiAirportLocation",
    "rpAiRunwayValue",
    "rpAiElevationValue",
    "rpAiHoursValue",
    "rpAiAircraftLimitValue",

    "rpAiPassengersValue",
    "rpAiWeeklyFlightsValue",
    "rpAiDestinationsValue",
    "rpAiActiveAirlinesValue",

    "rpAiPaxTotalValue",
    "rpAiPaxCenterValue",
    "rpAiPaxYValue",
    "rpAiPaxYPct",
    "rpAiPaxCValue",
    "rpAiPaxCPct",
    "rpAiPaxFValue",
    "rpAiPaxFPct",

    "rpAiActiveFlightsValue",
    "rpAiCurrentActiveAirlinesValue",
    "rpAiNetworkDestinationsValue",
    "rpAiNetworkWeeklyFlightsValue",

    "rpAiLandingFeeValue",
    "rpAiSlotCostValue",
    "rpAiTicketFeeValue",
    "rpAiGrowthValue",

    "rpAiSlotsCapacityValue",
    "rpAiSlotsUsedValue",
    "rpAiSlotsAvailableValue",
    "rpAiSlotUtilizationValue"
  ].forEach(id =>
    RP_setText(id, "—")
  );

  RP_setText(
    "rpAiAirportName",
    "Select a destination"
  );

  RP_setText(
    "rpAiAirportDescription",
    "Airport intelligence will load from the selected route."
  );

  const gauge =
    RP_get("rpAiPaxGauge");

  if (gauge) {
    gauge.style.setProperty(
      "--rp-ai-pax-gradient",
      "conic-gradient(rgba(74,167,255,0.12) 0 100%)"
    );
  }

  const operators =
    RP_get("rpAiOperatorList");

  if (operators) {
    operators.innerHTML = `
      <div class="rp-ai-empty">
        Select a destination to load airport activity.
      </div>
    `;
  }

  const destinations =
    RP_get("rpAiDestinationList");

  if (destinations) {
    destinations.innerHTML = `
      <div class="rp-ai-empty">
        Select a destination to load airport network.
      </div>
    `;
  }

  RP_STATE.airportIntelligence.selectedIcao = "";
  RP_STATE.airportIntelligence.snapshot = null;

  RP_AI_setStatus(
    "Airport intelligence awaiting route selection"
  );
}


/* ============================================================
   AIRPORT INTELLIGENCE — PASSENGER PROFILE
   ============================================================ */

function RP_AI_renderPassengerProfile(
  profile = {}
) {

  const economy =
    RP_AI_integer(
      profile.economy_y
    );

  const business =
    RP_AI_integer(
      profile.business_c
    );

  const first =
    RP_AI_integer(
      profile.first_f
    );

  const reportedTotal =
    RP_AI_integer(
      profile.total
    );

  const calculatedTotal =
    economy +
    business +
    first;

  const total =
    reportedTotal > 0
      ? reportedTotal
      : calculatedTotal;

  const economyPct =
    total > 0
      ? economy / total * 100
      : 0;

  const businessPct =
    total > 0
      ? business / total * 100
      : 0;

  const firstPct =
    total > 0
      ? first / total * 100
      : 0;

  RP_setText(
    "rpAiPaxTotalValue",
    RP_AI_formatInteger(total)
  );

  RP_setText(
    "rpAiPaxCenterValue",
    `${economyPct.toFixed(0)}%`
  );

  RP_setText(
    "rpAiPaxYValue",
    RP_AI_formatInteger(economy)
  );

  RP_setText(
    "rpAiPaxYPct",
    `${economyPct.toFixed(1)}%`
  );

  RP_setText(
    "rpAiPaxCValue",
    RP_AI_formatInteger(business)
  );

  RP_setText(
    "rpAiPaxCPct",
    `${businessPct.toFixed(1)}%`
  );

  RP_setText(
    "rpAiPaxFValue",
    RP_AI_formatInteger(first)
  );

  RP_setText(
    "rpAiPaxFPct",
    `${firstPct.toFixed(1)}%`
  );

  const gauge =
    RP_get("rpAiPaxGauge");

  if (gauge) {

    const yEnd =
      economyPct;

    const cEnd =
      economyPct +
      businessPct;

    gauge.style.setProperty(
      "--rp-ai-pax-gradient",
      `
        conic-gradient(
          #ffb300 0 ${yEnd}%,
          #4aa7ff ${yEnd}% ${cEnd}%,
          #55e39a ${cEnd}% 100%
        )
      `
    );
  }
}


/* ============================================================
   AIRPORT INTELLIGENCE — OPERATORS
   ============================================================ */

function RP_AI_renderOperators(
  airlines,
  selectedIcao
) {

  const host =
    RP_get("rpAiOperatorList");

  if (!host) {
    return;
  }

  if (
    !Array.isArray(airlines) ||
    !airlines.length
  ) {

    host.innerHTML = `
      <div class="rp-ai-empty">
        No scheduled operators
      </div>
    `;

    return;
  }

  const sorted =
    [...airlines].sort(
      (a, b) =>
        RP_AI_integer(
          b.weekly_flights
        ) -
        RP_AI_integer(
          a.weekly_flights
        )
    );

  const totalFlights =
    sorted.reduce(
      (sum, airline) =>
        sum +
        RP_AI_integer(
          airline.weekly_flights
        ),
      0
    ) || 1;

  host.innerHTML =
    sorted.map(
      (airline, index) => {

        const weeklyFlights =
          RP_AI_integer(
            airline.weekly_flights
          );

        const share =
          Math.round(
            weeklyFlights /
            totalFlights *
            100
          );

        const isBase =
          RP_AI_upper(
            airline.base_icao
          ) ===
          RP_AI_upper(
            selectedIcao
          );

        const aircraft =
          Array.isArray(
            airline.aircraft_types
          )
            ? airline.aircraft_types
                .slice(0, 3)
                .map(
                  type =>
                    `<i>${RP_AI_escapeHtml(type)}</i>`
                )
                .join("")
            : "";

        return `
          <article class="rp-ai-operator-row">

            <span class="rp-ai-operator-rank">
              ${String(index + 1).padStart(2, "0")}
            </span>

            <div class="rp-ai-operator-name">

              <strong>
                ${RP_AI_escapeHtml(
                  airline.airline_name ||
                  airline.icao ||
                  "Airline"
                )}
              </strong>

              <small>
                ${RP_AI_escapeHtml(
                  [
                    airline.iata,
                    airline.icao
                  ]
                    .filter(Boolean)
                    .join(" / ")
                )}
                ${isBase ? " · BASE" : ""}
              </small>

            </div>

            <div class="rp-ai-operator-bar">
              <i style="width:${share}%"></i>
            </div>

            <strong>
              ${share}%
            </strong>

            <span>
              ${RP_AI_formatInteger(
                weeklyFlights
              )} flights
            </span>

            <div class="rp-ai-aircraft-chips">
              ${aircraft || "—"}
            </div>

          </article>
        `;
      }
    ).join("");
}


/* ============================================================
   AIRPORT INTELLIGENCE — DESTINATIONS
   ============================================================ */

function RP_AI_renderDestinations(
  destinations,
  origin
) {

  const host =
    RP_get("rpAiDestinationList");

  if (!host) {
    return;
  }

  if (
    !Array.isArray(destinations) ||
    !destinations.length
  ) {

    host.innerHTML = `
      <div class="rp-ai-empty">
        No active destinations
      </div>
    `;

    return;
  }

  host.innerHTML =
    destinations.map(
      (destination, index) => `
        <article class="rp-ai-destination-row">

          <span>
            ${String(index + 1).padStart(2, "0")}
          </span>

          <div>

            <strong>
              ${RP_AI_escapeHtml(origin)}
              →
              ${RP_AI_escapeHtml(
                destination.iata ||
                destination.icao
              )}
            </strong>

            <small>
              ${RP_AI_escapeHtml(
                destination.city ||
                destination.label ||
                ""
              )}
            </small>

          </div>

          <span>
            ${RP_AI_formatInteger(
              destination.airlines
            )} airlines
          </span>

          <span>
            ${RP_AI_formatInteger(
              destination.routes
            )} routes
          </span>

          <strong>
            ${RP_AI_formatInteger(
              destination.weekly_flights
            )}
          </strong>

        </article>
      `
    ).join("");
}


/* ============================================================
   AIRPORT INTELLIGENCE — SNAPSHOT
   ============================================================ */

function RP_AI_renderSnapshot(snapshot) {

  const airport =
    snapshot?.airport || {};

  const activity =
    snapshot?.activity || {};

  const movement =
    activity.passenger_movement || {};

  const passengerProfile =
    activity.passenger_profile || {};

  const slots =
    activity.slots || {};

  const network =
    activity.scheduled_network || {};

  const operations =
    activity.current_operations || {};

  const costs =
    snapshot?.costs || {};

  RP_setText(
    "rpAiAirportIata",
    airport.iata ||
    airport.icao ||
    "—"
  );

  RP_setText(
    "rpAiAirportIcao",
    airport.icao
  );

  RP_setText(
    "rpAiAirportName",
    airport.display_label ||
    airport.city ||
    airport.icao
  );

  RP_setText(
    "rpAiAirportLocation",
    [
      airport.continent,
      airport.country
    ]
      .filter(Boolean)
      .join(" · ")
  );

  RP_setText(
    "rpAiAirportDescription",
    "Complete airport and network information"
  );

  RP_setText(
    "rpAiRunwayValue",
    `${RP_AI_formatInteger(
      airport.runway_m
    )} m`
  );

  RP_setText(
    "rpAiElevationValue",
    `${RP_AI_formatInteger(
      airport.elevation_ft
    )} ft`
  );

  RP_setText(
    "rpAiHoursValue",
    airport.open_hrs
  );

  RP_setText(
    "rpAiAircraftLimitValue",
    airport.aircraft_limit
  );

  RP_setText(
    "rpAiPassengersValue",
    RP_AI_formatInteger(
      movement.passengers
    )
  );

  RP_setText(
    "rpAiWeeklyFlightsValue",
    RP_AI_formatInteger(
      network.weekly_flights
    )
  );

  RP_setText(
    "rpAiDestinationsValue",
    RP_AI_formatInteger(
      network.destinations
    )
  );

  RP_setText(
    "rpAiActiveAirlinesValue",
    RP_AI_formatInteger(
      operations.active_airlines
    )
  );

  RP_setText(
    "rpAiActiveFlightsValue",
    RP_AI_formatInteger(
      operations.active_flights
    )
  );

  RP_setText(
    "rpAiCurrentActiveAirlinesValue",
    RP_AI_formatInteger(
      operations.active_airlines
    )
  );

  RP_setText(
    "rpAiNetworkDestinationsValue",
    RP_AI_formatInteger(
      network.destinations
    )
  );

  RP_setText(
    "rpAiNetworkWeeklyFlightsValue",
    RP_AI_formatInteger(
      network.weekly_flights
    )
  );

  RP_setText(
    "rpAiLandingFeeValue",
    RP_AI_formatMoney(
      costs.landing_fee_usd
    )
  );

  RP_setText(
    "rpAiSlotCostValue",
    RP_AI_formatMoney(
      costs.slot_cost_usd
    )
  );

  RP_setText(
    "rpAiTicketFeeValue",
    RP_AI_formatPercent(
      costs.ticket_fee_percent
    )
  );

  RP_setText(
    "rpAiGrowthValue",
    RP_AI_formatPercent(
      costs.pax_growth_factor
    )
  );

  RP_setText(
    "rpAiSlotsCapacityValue",
    RP_AI_formatInteger(
      slots.capacity
    )
  );

  RP_setText(
    "rpAiSlotsUsedValue",
    RP_AI_formatInteger(
      slots.used
    )
  );

  RP_setText(
    "rpAiSlotsAvailableValue",
    RP_AI_formatInteger(
      slots.available
    )
  );

  RP_setText(
    "rpAiSlotUtilizationValue",
    `${RP_AI_number(
      slots.utilization_pct
    ).toFixed(1)}%`
  );

  RP_AI_renderPassengerProfile(
    passengerProfile
  );

  RP_AI_renderOperators(
    snapshot?.network?.airlines || [],
    airport.icao
  );

  RP_AI_renderDestinations(
    snapshot?.network?.destinations || [],
    airport.iata ||
    airport.icao ||
    ""
  );
}


/* ============================================================
   AIRPORT INTELLIGENCE — LOAD
   ============================================================ */

async function RP_AI_loadAirport(icao) {

  const normalized =
    RP_AI_upper(icao);

  if (!normalized) {

    RP_STATE.airportIntelligence.controller
      ?.abort();

    RP_AI_resetView();

    return;
  }

  RP_STATE.airportIntelligence.controller
    ?.abort();

  const controller =
    new AbortController();

  RP_STATE.airportIntelligence.controller =
    controller;

  RP_STATE.airportIntelligence.selectedIcao =
    normalized;

  RP_AI_setStatus(
    `Loading ${normalized} airport intelligence`,
    "loading"
  );

  try {

    const snapshot =
      await RP_fetchJson(
        `${RP_API_BASE}/v1/airport-intelligence/${encodeURIComponent(normalized)}`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json"
          }
        }
      );

    if (
      RP_STATE.airportIntelligence
        .selectedIcao !== normalized
    ) {
      return;
    }

    if (
      !snapshot ||
      snapshot.ok !== true
    ) {
      throw new Error(
        snapshot?.error ||
        "AIRPORT_INTELLIGENCE_INVALID"
      );
    }

    RP_STATE.airportIntelligence.snapshot =
      snapshot;

    RP_AI_renderSnapshot(
      snapshot
    );

    RP_AI_setStatus(
      `${normalized} airport intelligence loaded`
    );

  } catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }

    RP_STATE.airportIntelligence.snapshot =
      null;

    RP_AI_resetView();

    if (
      error?.message ===
      "AIRPORT_NOT_AVAILABLE_IN_CURRENT_SIM_PERIOD"
    ) {

      RP_AI_setStatus(
        "Airport unavailable in current simulation period",
        "error"
      );

    } else {

      RP_AI_setStatus(
        "Airport intelligence unavailable",
        "error"
      );
    }
  }
}


/* ============================================================
   AIRPORT INTELLIGENCE — TARGET
   ============================================================ */

function RP_AI_setTarget(target) {

  const normalized =
    target === "origin"
      ? "origin"
      : "destination";

  RP_STATE.airportIntelligence.target =
    normalized;

  const originButton =
    RP_get("rpAiOriginButton");

  const destinationButton =
    RP_get("rpAiDestinationButton");

  originButton?.classList.toggle(
    "active",
    normalized === "origin"
  );

  destinationButton?.classList.toggle(
    "active",
    normalized === "destination"
  );

  const airport =
    normalized === "origin"
      ? RP_STATE.origin
      : RP_STATE.destination;

  RP_AI_loadAirport(
    airport?.icao || ""
  );
}


function RP_AI_updateControls() {

  const originButton =
    RP_get("rpAiOriginButton");

  const destinationButton =
    RP_get("rpAiDestinationButton");

  if (originButton) {
    originButton.disabled =
      !Boolean(
        RP_STATE.origin?.icao
      );
  }

  if (destinationButton) {
    destinationButton.disabled =
      !Boolean(
        RP_STATE.destination?.icao
      );
  }
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

  const manufacturerSelect =
    RP_get("rpAircraftManufacturer");

  const searchInput =
    RP_get("rpAircraftSearch");


  RP_resetSelect(
    select,
    "Loading aircraft...",
    true
  );


  RP_resetSelect(
    manufacturerSelect,
    "Loading manufacturers...",
    true
  );


  if (searchInput) {
    searchInput.value = "";
    searchInput.disabled = true;
  }


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


  RP_populateAircraftManufacturers();


  if (searchInput) {
    searchInput.disabled =
      aircraft.length === 0;
  }


  RP_renderAircraftCatalog();


  return aircraft;
}


/* ============================================================
   AIRCRAFT MANUFACTURER FILTER
   ============================================================ */

function RP_populateAircraftManufacturers() {

  const select =
    RP_get("rpAircraftManufacturer");


  if (!select) {
    return;
  }


  const manufacturers =
    [
      ...new Set(
        RP_STATE.aircraftCatalog
          .map(aircraft =>
            String(
              aircraft.manufacturer ||
              ""
            ).trim()
          )
          .filter(Boolean)
      )
    ]
      .sort((a, b) =>
        a.localeCompare(b)
      );


  RP_resetSelect(
    select,
    "All manufacturers",
    manufacturers.length === 0
  );


  manufacturers.forEach(
    manufacturer => {

      RP_appendOption(
        select,
        manufacturer,
        manufacturer
      );

    }
  );
}


/* ============================================================
   AIRCRAFT CATALOG FILTER + RENDER
   ============================================================ */

function RP_renderAircraftCatalog() {

  const select =
    RP_get("rpAircraftSelect");

  const searchInput =
    RP_get("rpAircraftSearch");

  const manufacturerSelect =
    RP_get("rpAircraftManufacturer");


  if (!select) {
    return;
  }


  const search =
    String(
      searchInput?.value || ""
    )
      .trim()
      .toUpperCase();


  const manufacturerFilter =
    String(
      manufacturerSelect?.value || ""
    )
      .trim()
      .toUpperCase();


  const filteredAircraft =
    RP_STATE.aircraftCatalog.filter(
      aircraft => {

        const manufacturer =
          String(
            aircraft.manufacturer ||
            ""
          )
            .trim();


        const model =
          String(
            aircraft.model ||
            aircraft.aircraft_name ||
            aircraft.model_key ||
            ""
          )
            .trim();


        const aircraftName =
          String(
            aircraft.aircraft_name ||
            ""
          )
            .trim();


        const modelKey =
          String(
            aircraft.model_key ||
            ""
          )
            .trim();


        const matchesManufacturer =
          !manufacturerFilter ||
          manufacturer
            .toUpperCase() ===
            manufacturerFilter;


        const searchableText =
          [
            manufacturer,
            model,
            aircraftName,
            modelKey
          ]
            .join(" ")
            .toUpperCase();


        const matchesSearch =
          !search ||
          searchableText.includes(search);


        return (
          matchesManufacturer &&
          matchesSearch
        );
      }
    );


  const selectedModelKey =
    String(
      RP_STATE.selectedAircraft
        ?.model_key ||
      ""
    ).trim();


  RP_resetSelect(
    select,
    filteredAircraft.length
      ? "Select aircraft"
      : "No aircraft found",
    filteredAircraft.length === 0
  );


  filteredAircraft.forEach(ac => {

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
        catalogId:
          ac.id,

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


  if (
    selectedModelKey &&
    filteredAircraft.some(
      aircraft =>
        String(
          aircraft.model_key ||
          ""
        ).trim() ===
        selectedModelKey
    )
  ) {

    select.value =
      selectedModelKey;

  }
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

    RP_clearRouteTrace();

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

    RP_clearRouteTrace();

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
    RP_setText("rpFuelInstrumentValue", "-- KG");
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


  /* ============================================================
     ACS OCC — OPERATIONAL FUEL CALCULATION
     ------------------------------------------------------------
     Global Route Planning fuel model.

     Operational time:
     - Great-circle cruise time
     - +30 minutes operational additive

     Estimated fuel:
     - Total operational time × aircraft fuel burn KG/H

     No additional reserve is added.
     ============================================================ */

  const speedKts =
    Number(aircraft.speed_kts);

  const fuelBurnKgph =
    Number(aircraft.fuel_burn_kgph);

  const ROUTE_TIME_ADDITIVE_MINUTES = 30;

  let routeFuelKg = 0;

  if (
    Number.isFinite(distanceNm) &&
    distanceNm > 0 &&
    Number.isFinite(speedKts) &&
    speedKts > 0
  ) {

    const cruiseMinutes =
      (distanceNm / speedKts) * 60;

    const operationalMinutes =
      Math.round(
        cruiseMinutes +
        ROUTE_TIME_ADDITIVE_MINUTES
      );

    const operationalHours =
      operationalMinutes / 60;

    const hours =
      Math.floor(
        operationalMinutes / 60
      );

    const minutes =
      operationalMinutes % 60;

    RP_STATE.flightTimeMinutes =
      operationalMinutes;

    RP_setText(
      "rpTimeValue",
      `${hours}H ${String(
        minutes
      ).padStart(2, "0")}M`
    );


    /* ESTIMATED OPERATIONAL FUEL */

    if (
      Number.isFinite(fuelBurnKgph) &&
      fuelBurnKgph > 0
    ) {

      routeFuelKg =
        operationalHours *
        fuelBurnKgph;

      const formattedRouteFuel =
        `${Math.round(
          routeFuelKg
        ).toLocaleString()} KG`;

      RP_setText(
        "rpFuelValue",
        formattedRouteFuel
      );

      RP_setText(
        "rpFuelInstrumentValue",
        formattedRouteFuel
      );

    } else {

      routeFuelKg = 0;

      RP_setText(
        "rpFuelValue",
        "-- KG"
      );

      RP_setText(
        "rpFuelInstrumentValue",
        "-- KG"
      );
    }

  } else {

    routeFuelKg = 0;

    RP_STATE.flightTimeMinutes =
      null;

    RP_setText(
      "rpTimeValue",
      "--"
    );

    RP_setText(
      "rpFuelValue",
      "-- KG"
    );

    RP_setText(
      "rpFuelInstrumentValue",
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

    const towElement =
      RP_get("rpTowValue");

    if (towElement) {
      towElement.style.color =
        estimatedTowKg > mtowKg
          ? "#ff5f5f"
          : "#7fe6a2";
    }

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
     ACS OCC — GLOBAL RUNWAY PERFORMANCE MODEL
     ------------------------------------------------------------
     Applies to every aircraft in Route Planning.

     Inputs:
     - Aircraft base required runway
     - Estimated TOW
     - MTOW
     - Airport elevation

     Model:
     - ISA standard-atmosphere density correction
     - Weight-squared takeoff performance correction
     ============================================================ */

  let adjustedRequiredRunwayM =
    baseRequiredRunwayM;

  if (
    Number.isFinite(baseRequiredRunwayM) &&
    baseRequiredRunwayM > 0
  ) {

    /* ----------------------------------------------------------
       AIR DENSITY — ISA
       ---------------------------------------------------------- */

    const safeElevationFt =
      Number.isFinite(elevationFt)
        ? Math.max(0, elevationFt)
        : 0;

    const isaBase =
      1 -
      (
        6.87535e-6 *
        safeElevationFt
      );

    const densityRatio =
      isaBase > 0
        ? Math.pow(
            isaBase,
            4.2561
          )
        : 1;


    /* ----------------------------------------------------------
       ALTITUDE / DENSITY PERFORMANCE FACTOR
       ---------------------------------------------------------- */

    const altitudeFactor =
      densityRatio > 0
        ? Math.pow(
            1 / densityRatio,
            1.7
          )
        : 1;


    /* ----------------------------------------------------------
       AIRCRAFT WEIGHT PERFORMANCE FACTOR

       Takeoff distance varies strongly with aircraft weight.
       Reference point = MTOW.
       ---------------------------------------------------------- */

    let weightFactor = 1;

    if (
      Number.isFinite(estimatedTowKg) &&
      estimatedTowKg > 0 &&
      Number.isFinite(mtowKg) &&
      mtowKg > 0
    ) {

      const weightRatio =
        estimatedTowKg /
        mtowKg;

      weightFactor =
        Math.pow(
          weightRatio,
          2
        );
    }


    /* ----------------------------------------------------------
       GLOBAL ACS REQUIRED RUNWAY
       ---------------------------------------------------------- */

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
  RP_updateDestinationMarker();

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
    RP_clearRouteTrace();

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
    RP_clearRouteTrace();

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
    RP_clearRouteTrace();

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
    RP_clearRouteTrace();

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


  RP_renderLinearRouteTrace(
    originAirport,
    destination,
    distanceNm,
    aircraft,
    rangeNm
  );


  RP_setText(
    "rpCalculatedRange",
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

  const rangeDifferenceElement =
    RP_get("rpRangeDifference");

  if (rangeDifferenceElement) {
    rangeDifferenceElement.style.color =
      differenceNm < 0
        ? "#ff5f5f"
        : "#7fe6a2";
  }


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
    RP_updateDestinationMarker();

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
    RP_updateDestinationMarker();

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

    RP_AI_updateControls();
    RP_AI_resetView();

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

  RP_AI_updateControls();

  RP_AI_setTarget(
    "destination"
  );
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

const aircraftSearch =
  RP_get("rpAircraftSearch");

const aircraftManufacturer =
  RP_get("rpAircraftManufacturer");

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

  const airportIntelligenceOrigin =
  RP_get("rpAiOriginButton");

  const airportIntelligenceDestination =
  RP_get("rpAiDestinationButton");   

 if (aircraftSelect) {
  aircraftSelect.addEventListener(
    "change",
    RP_handleAircraftChange
  );
}


if (aircraftSearch) {
  aircraftSearch.addEventListener(
    "input",
    RP_renderAircraftCatalog
  );
}


if (aircraftManufacturer) {
  aircraftManufacturer.addEventListener(
    "change",
    RP_renderAircraftCatalog
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


if (airportIntelligenceOrigin) {
  airportIntelligenceOrigin.addEventListener(
    "click",
    () =>
      RP_AI_setTarget(
        "origin"
      )
  );
}


if (airportIntelligenceDestination) {
  airportIntelligenceDestination.addEventListener(
    "click",
    () =>
      RP_AI_setTarget(
        "destination"
      )
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

      RP_initializeMap();

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

      RP_centerMapOnOrigin();

      await RP_loadAircraftCatalog();

console.log(
  "🟦 ROUTE PLANNING AIRCRAFT CATALOG:",
  {
    year: RP_STATE.simYear,
    count:
      RP_STATE.aircraftCatalog.length
  }
);

RP_AI_resetView();
RP_AI_updateControls();

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

/* ============================================================
   ACS GLOBAL PASSENGER MARKETS — CLIENT v1.0.2
   ------------------------------------------------------------
   File: engine/acs_passenger_markets.js

   Canonical authority:
   - PostgreSQL / Railway
   - GET /v1/routes/passenger-demand/markets

   Guarantees:
   - One batch request per origin + continent
   - No localStorage authority
   - No browser-time authority
   - No aircraft or seat dependency
   - Zero-demand markets remain valid
   - Does not read or modify airport/slot authority
   ============================================================ */

(function ACS_installPassengerMarkets(global) {
  "use strict";

  const API_BASE =
    "https://api.aviationcapitalsim.com/v1";

  const ENDPOINT =
    "/routes/passenger-demand/markets";

  const EXPECTED_AUTHORITY =
    "POSTGRESQL_PASSENGER_MARKET_AUTHORITY";

  const memoryCache = new Map();
  const pendingRequests = new Map();

  const MIDDLE_EAST_COUNTRY_ISO2 = new Set([
    "BH", "IR", "IQ", "IL", "JO", "KW", "LB",
    "OM", "QA", "SA", "SY", "AE", "YE"
  ]);

  function text(value) {
    return String(value ?? "").trim();
  }

  function icao(value) {
    return text(value).toUpperCase();
  }

  function finiteNumber(value, fieldName) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new Error(
        `ACS_PASSENGER_MARKETS_INVALID_${fieldName}`
      );
    }

    return number;
  }

  function nonNegativeInteger(value, fieldName) {
    const number = finiteNumber(value, fieldName);

    if (number < 0 || !Number.isInteger(number)) {
      throw new Error(
        `ACS_PASSENGER_MARKETS_INVALID_${fieldName}`
      );
    }

    return number;
  }

  function validateOrigin(value) {
    const code = icao(value);

    if (!/^[A-Z0-9]{4}$/.test(code)) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_ORIGIN"
      );
    }

    return code;
  }

  function validateContinent(value) {
    const continent = text(value);

    if (!continent) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_CONTINENT"
      );
    }

    return continent;
  }

  function cacheKey(origin, continent) {
    return `${origin}|${continent.toUpperCase()}`;
  }

  function normalizeMarket(row, expectedOrigin) {
    const originIcao = icao(row?.origin_icao);
    const destinationIcao = icao(
      row?.destination_icao
    );

    if (originIcao !== expectedOrigin) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_ORIGIN_MISMATCH"
      );
    }

    if (!/^[A-Z0-9]{4}$/.test(destinationIcao)) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_DESTINATION"
      );
    }

    const dailyY = nonNegativeInteger(
      row.daily_y,
      "DAILY_Y"
    );
    const dailyC = nonNegativeInteger(
      row.daily_c,
      "DAILY_C"
    );
    const dailyF = nonNegativeInteger(
      row.daily_f,
      "DAILY_F"
    );
    const dailyTotal = nonNegativeInteger(
      row.daily_total,
      "DAILY_TOTAL"
    );

    const weeklyY = nonNegativeInteger(
      row.weekly_y,
      "WEEKLY_Y"
    );
    const weeklyC = nonNegativeInteger(
      row.weekly_c,
      "WEEKLY_C"
    );
    const weeklyF = nonNegativeInteger(
      row.weekly_f,
      "WEEKLY_F"
    );
    const weeklyTotal = nonNegativeInteger(
      row.weekly_total,
      "WEEKLY_TOTAL"
    );

    if (dailyY + dailyC + dailyF !== dailyTotal) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_DAILY_TOTAL_MISMATCH"
      );
    }

    if (weeklyY + weeklyC + weeklyF !== weeklyTotal) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_WEEKLY_TOTAL_MISMATCH"
      );
    }

    return Object.freeze({
      origin_icao: originIcao,
      destination_icao: destinationIcao,

      destination_iata: text(row.destination_iata),
      destination_city: text(row.destination_city),
      destination_country: text(
        row.destination_country
      ),
      destination_continent: text(
        row.destination_continent
      ),
      destination_region: text(
        row.destination_region
      ),
      destination_category: text(
        row.destination_category
      ),

      model_id: nonNegativeInteger(
        row.model_id,
        "MODEL_ID"
      ),
      model_version: text(row.model_version),
      current_sim_time: text(row.current_sim_time),
      sim_date: text(row.sim_date),
      sim_year: nonNegativeInteger(
        row.sim_year,
        "SIM_YEAR"
      ),
      period_code: text(row.period_code),
      market_scope: text(row.market_scope),
      distance_nm: nonNegativeInteger(
        row.distance_nm,
        "DISTANCE_NM"
      ),
      weekday_iso: nonNegativeInteger(
        row.weekday_iso,
        "WEEKDAY_ISO"
      ),
      day_weight: finiteNumber(
        row.day_weight,
        "DAY_WEIGHT"
      ),

      daily_y: dailyY,
      daily_c: dailyC,
      daily_f: dailyF,
      daily_total: dailyTotal,

      weekly_y: weeklyY,
      weekly_c: weeklyC,
      weekly_f: weeklyF,
      weekly_total: weeklyTotal,
      average_daily: finiteNumber(
        row.average_daily,
        "AVERAGE_DAILY"
      )
    });
  }

  function normalizeResponse(data, origin, continent) {
    if (!data || data.ok !== true) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_BACKEND_REJECTED"
      );
    }

    if (
      data.endpoint !== "ACS_GLOBAL_PASSENGER_MARKETS"
    ) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_ENDPOINT"
      );
    }

    if (data.authority !== EXPECTED_AUTHORITY) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_AUTHORITY"
      );
    }

    if (!/^ACS_GLOBAL_PAX_V\d+$/.test(text(data.version))) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_VERSION"
      );
    }

    if (icao(data.origin) !== origin) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_RESPONSE_ORIGIN_MISMATCH"
      );
    }

    if (!Array.isArray(data.markets)) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_COLLECTION"
      );
    }

    const markets = data.markets.map(row =>
      normalizeMarket(row, origin)
    );

    const byDestination = new Map();

    for (const market of markets) {
      if (byDestination.has(market.destination_icao)) {
        throw new Error(
          "ACS_PASSENGER_MARKETS_DUPLICATE_DESTINATION"
        );
      }

      byDestination.set(
        market.destination_icao,
        market
      );
    }

    const summary = Object.freeze({
      evaluated_markets: nonNegativeInteger(
        data.summary?.evaluated_markets,
        "EVALUATED_MARKETS"
      ),
      markets_with_demand: nonNegativeInteger(
        data.summary?.markets_with_demand,
        "MARKETS_WITH_DEMAND"
      ),
      zero_demand_markets: nonNegativeInteger(
        data.summary?.zero_demand_markets,
        "ZERO_DEMAND_MARKETS"
      )
    });

    if (summary.evaluated_markets !== markets.length) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_SUMMARY_MISMATCH"
      );
    }

    const snapshot = {
      endpoint: data.endpoint,
      version: text(data.version),
      authority: data.authority,
      current_sim_time: text(data.current_sim_time),
      origin,
      continent,
      summary,
      markets: Object.freeze(markets),
      byDestination
    };

    return Object.freeze(snapshot);
  }

  async function requestMarkets(origin, continent) {
    const url =
      `${API_BASE}${ENDPOINT}` +
      `?origin=${encodeURIComponent(origin)}` +
      `&continent=${encodeURIComponent(continent)}`;

    const response = await global.fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_JSON"
      );
    }

    if (!response.ok) {
      throw new Error(
        text(data?.error) ||
        `ACS_PASSENGER_MARKETS_HTTP_${response.status}`
      );
    }

    return normalizeResponse(
      data,
      origin,
      continent
    );
  }

  async function load(options = {}) {
    const origin = validateOrigin(options.origin);
    const continent = validateContinent(
      options.continent
    );
    const key = cacheKey(origin, continent);
    const force = options.force === true;

    if (!force && memoryCache.has(key)) {
      return memoryCache.get(key);
    }

    if (pendingRequests.has(key)) {
      return pendingRequests.get(key);
    }

    const request = requestMarkets(origin, continent)
      .then(snapshot => {
        memoryCache.set(key, snapshot);

        global.dispatchEvent(
          new CustomEvent(
            "ACS_PASSENGER_MARKETS_READY",
            { detail: snapshot }
          )
        );

        return snapshot;
      })
      .finally(() => {
        pendingRequests.delete(key);
      });

    pendingRequests.set(key, request);
    return request;
  }

  function find(snapshot, destination) {
    if (!snapshot?.byDestination) {
      return null;
    }

    return snapshot.byDestination.get(
      icao(destination)
    ) || null;
  }

  function mergeCatalogRows(rows, snapshot) {
    if (!Array.isArray(rows)) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_AIRPORT_ROWS"
      );
    }

    if (!snapshot?.byDestination) {
      throw new Error(
        "ACS_PASSENGER_MARKETS_INVALID_SNAPSHOT"
      );
    }

    const isMiddleEastPage =
      String(global.location?.pathname || "")
        .toLowerCase()
        .endsWith("/airport_list_middleeast.html");

    const scopedRows = isMiddleEastPage
      ? rows.filter(row =>
          MIDDLE_EAST_COUNTRY_ISO2.has(
            text(row?.country).toUpperCase()
          )
        )
      : rows;

    return scopedRows.map(row => {
      const destination = icao(row?.icao);
      const market = find(snapshot, destination);

      if (!market) {
        return {
          ...row,
          demand_y: 0,
          demand_c: 0,
          demand_f: 0,
          passenger_market: null,
          passenger_market_authority:
            snapshot.authority,
          passenger_market_version:
            snapshot.version
        };
      }

      return {
        ...row,
        demand_y: market.weekly_y,
        demand_c: market.weekly_c,
        demand_f: market.weekly_f,
        passenger_market: market,
        passenger_market_authority:
          snapshot.authority,
        passenger_market_version:
          snapshot.version
      };
    });
  }


  function normalizeWeekDay(row) {
    const weekdayIso = nonNegativeInteger(
      row?.weekday_iso,
      "WEEK_DAY_ISO"
    );

    if (weekdayIso < 1 || weekdayIso > 7) {
      throw new Error(
        "ACS_PASSENGER_WEEK_INVALID_WEEKDAY"
      );
    }

    const dailyY = nonNegativeInteger(
      row?.daily_y,
      "WEEK_DAILY_Y"
    );
    const dailyC = nonNegativeInteger(
      row?.daily_c,
      "WEEK_DAILY_C"
    );
    const dailyF = nonNegativeInteger(
      row?.daily_f,
      "WEEK_DAILY_F"
    );
    const dailyTotal = nonNegativeInteger(
      row?.daily_total,
      "WEEK_DAILY_TOTAL"
    );
    const weeklyTotal = nonNegativeInteger(
      row?.weekly_total,
      "WEEKLY_TOTAL"
    );

    if (dailyY + dailyC + dailyF !== dailyTotal) {
      throw new Error(
        "ACS_PASSENGER_WEEK_DAILY_TOTAL_MISMATCH"
      );
    }

    return Object.freeze({
      origin_icao: icao(row?.origin_icao),
      destination_icao: icao(
        row?.destination_icao
      ),
      sim_date: text(row?.sim_date),
      sim_year: nonNegativeInteger(
        row?.sim_year,
        "WEEK_SIM_YEAR"
      ),
      period_code: text(row?.period_code),
      market_scope: text(row?.market_scope),
      distance_nm: nonNegativeInteger(
        row?.distance_nm,
        "WEEK_DISTANCE_NM"
      ),
      weekday_iso: weekdayIso,
      day_weight: finiteNumber(
        row?.day_weight,
        "WEEK_DAY_WEIGHT"
      ),
      daily_y: dailyY,
      daily_c: dailyC,
      daily_f: dailyF,
      daily_total: dailyTotal,
      weekly_total: weeklyTotal
    });
  }

  async function loadWeek(options = {}) {
    const origin = validateOrigin(options.origin);
    const destination = validateOrigin(
      options.destination
    );

    if (origin === destination) {
      throw new Error(
        "ACS_PASSENGER_WEEK_ORIGIN_DESTINATION_MATCH"
      );
    }

    const url =
      API_BASE +
      "/routes/passenger-demand" +
      "?origin=" +
      encodeURIComponent(origin) +
      "&destination=" +
      encodeURIComponent(destination);

    const response = await global.fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "ACS_PASSENGER_WEEK_INVALID_JSON"
      );
    }

    if (!response.ok || data?.ok !== true) {
      throw new Error(
        text(data?.error) ||
        "ACS_PASSENGER_WEEK_REQUEST_FAILED"
      );
    }

    if (
      data.endpoint !==
      "ACS_GLOBAL_PASSENGER_DEMAND"
    ) {
      throw new Error(
        "ACS_PASSENGER_WEEK_INVALID_ENDPOINT"
      );
    }

    if (data.authority !== EXPECTED_AUTHORITY) {
      throw new Error(
        "ACS_PASSENGER_WEEK_INVALID_AUTHORITY"
      );
    }

    if (
      icao(data.origin) !== origin ||
      icao(data.destination) !== destination
    ) {
      throw new Error(
        "ACS_PASSENGER_WEEK_MARKET_MISMATCH"
      );
    }

    if (!Array.isArray(data.outbound_week)) {
      throw new Error(
        "ACS_PASSENGER_WEEK_INVALID_COLLECTION"
      );
    }

    const days = data.outbound_week
      .map(normalizeWeekDay)
      .sort(
        (left, right) =>
          left.weekday_iso - right.weekday_iso
      );

    if (
      days.length !== 7 ||
      days.some(
        (day, index) =>
          day.weekday_iso !== index + 1
      )
    ) {
      throw new Error(
        "ACS_PASSENGER_WEEK_INCOMPLETE"
      );
    }

    const weeklyY = nonNegativeInteger(
      data.outbound?.weekly_y,
      "OUTBOUND_WEEKLY_Y"
    );
    const weeklyC = nonNegativeInteger(
      data.outbound?.weekly_c,
      "OUTBOUND_WEEKLY_C"
    );
    const weeklyF = nonNegativeInteger(
      data.outbound?.weekly_f,
      "OUTBOUND_WEEKLY_F"
    );
    const weeklyTotal = nonNegativeInteger(
      data.outbound?.weekly_total,
      "OUTBOUND_WEEKLY_TOTAL"
    );

    const sums = days.reduce(
      (total, day) => {
        total.y += day.daily_y;
        total.c += day.daily_c;
        total.f += day.daily_f;
        total.all += day.daily_total;
        return total;
      },
      { y: 0, c: 0, f: 0, all: 0 }
    );

    if (
      sums.y !== weeklyY ||
      sums.c !== weeklyC ||
      sums.f !== weeklyF ||
      sums.all !== weeklyTotal ||
      weeklyY + weeklyC + weeklyF !== weeklyTotal
    ) {
      throw new Error(
        "ACS_PASSENGER_WEEK_TOTAL_MISMATCH"
      );
    }

    return Object.freeze({
      origin,
      destination,
      current_sim_time: text(
        data.current_sim_time
      ),
      weekly_y: weeklyY,
      weekly_c: weeklyC,
      weekly_f: weeklyF,
      weekly_total: weeklyTotal,
      days: Object.freeze(days)
    });
  }

  function demandTitle(airport) {
    const city = text(
      airport?.city || airport?.icao
    ).toUpperCase();
    const code = icao(airport?.icao);

    return (
      '<div style="text-align:center;line-height:1.25">' +
        '<div style="' +
          'font-family:Orbitron;' +
          'font-size:12px;' +
          'color:#ffb300;' +
          'letter-spacing:2px;' +
          'margin-bottom:4px' +
        '">' +
          'PASSENGER DEMAND' +
        '</div>' +
        '<div style="' +
          'font-family:Orbitron;' +
          'font-size:22px;' +
          'color:#00ff9c;' +
          'letter-spacing:2px;' +
          'font-weight:600;' +
          'text-shadow:0 0 8px rgba(0,255,156,.35)' +
        '">' +
          city + " — " + code +
        '</div>' +
      '</div>'
    );
  }

  function renderOfficialWeek(week) {
    const dayNames = [
      "MON", "TUE", "WED", "THU",
      "FRI", "SAT", "SUN"
    ];

    const maximum = Math.max(
      ...week.days.map(day => day.daily_total),
      1
    );

    let html =
      '<div style="' +
        'display:grid;' +
        'grid-template-columns:1fr 1fr;' +
        'gap:18px 12px;' +
        'justify-items:center;' +
        'margin-top:10px' +
      '">';

    week.days.forEach(day => {
      const percentage = Math.max(
        12,
        Math.min(
          100,
          (day.daily_total / maximum) * 100
        )
      );

      html +=
        '<div style="' +
          'text-align:center;' +
          'width:100%;' +
          'max-width:180px' +
        '">' +
          '<div style="' +
            'font-family:Orbitron;' +
            'font-size:13px;' +
            'color:#fff;' +
            'letter-spacing:2px;' +
            'margin-bottom:4px' +
          '">' +
            dayNames[day.weekday_iso - 1] +
          '</div>' +
          '<div style="' +
            'width:100%;' +
            'height:8px;' +
            'background:rgba(255,255,255,.06);' +
            'border-radius:4px;' +
            'position:relative;' +
            'border:1px solid rgba(255,179,0,.25);' +
            'overflow:hidden' +
          '">' +
            '<div style="' +
              'position:absolute;' +
              'left:33.33%;top:0;bottom:0;' +
              'width:1px;' +
              'background:rgba(255,179,0,.4)' +
            '"></div>' +
            '<div style="' +
              'position:absolute;' +
              'left:66.66%;top:0;bottom:0;' +
              'width:1px;' +
              'background:rgba(255,179,0,.4)' +
            '"></div>' +
            '<div style="' +
              'width:' + percentage + '%;' +
              'height:100%;' +
              'background:linear-gradient(' +
                '90deg,#003a7a,#0066cc,#00AEEF,#33d6ff' +
              ');' +
              'box-shadow:0 0 6px rgba(0,174,239,.6)' +
            '"></div>' +
          '</div>' +
          '<div style="' +
            'display:grid;' +
            'grid-template-columns:1fr 1fr 1fr;' +
            'font-family:Orbitron;' +
            'font-size:11px;' +
            'color:#ffb300;' +
            'margin-top:4px' +
          '">' +
            '<div>Y ' + day.daily_y + '</div>' +
            '<div>C ' + day.daily_c + '</div>' +
            '<div>F ' + day.daily_f + '</div>' +
          '</div>' +
        '</div>';
    });

    html += '</div>';

    return html;
  }

  async function openOfficialDemandModal(
    destination
  ) {
    const code = icao(destination);
    const findAirport = global.ACS_findAirport;

    if (
      !code ||
      typeof findAirport !== "function"
    ) {
      return;
    }

    const airport = findAirport(code);

    if (!airport) {
      return;
    }

    const modal =
      global.document.getElementById(
        "acsDemandModal"
      );
    const title =
      global.document.getElementById(
        "acsDemandTitle"
      );
    const content =
      global.document.getElementById(
        "acsDemandContent"
      );

    if (!modal || !title || !content) {
      return;
    }

    const origin =
      icao(
        airport?.passenger_market?.origin_icao
      ) ||
      icao(
        global.document.getElementById(
          "originIcao"
        )?.textContent
      );

    title.innerHTML = demandTitle(airport);
    content.innerHTML =
      '<div style="' +
        'font-family:Orbitron;' +
        'color:#ffb300;' +
        'text-align:center;' +
        'padding:30px 10px' +
      '">' +
        'LOADING OFFICIAL DEMAND...' +
      '</div>';

    modal.classList.add("is-open");

    const requestKey =
      origin + "|" + code + "|" + Date.now();

    modal.dataset.passengerRequest =
      requestKey;

    try {
      const week = await loadWeek({
        origin,
        destination: code
      });

      if (
        modal.dataset.passengerRequest !==
        requestKey
      ) {
        return;
      }

      content.innerHTML =
        renderOfficialWeek(week);

    } catch (error) {
      console.error(
        "ACS OFFICIAL PASSENGER WEEK FAILED:",
        error
      );

      if (
        modal.dataset.passengerRequest ===
        requestKey
      ) {
        content.innerHTML =
          '<div style="' +
            'font-family:Orbitron;' +
            'color:#ff4d5e;' +
            'text-align:center;' +
            'padding:30px 10px' +
          '">' +
            'OFFICIAL DEMAND UNAVAILABLE' +
          '</div>';
      }
    }
  }

  function installOfficialDemandModal() {
    global.ACS_openDemandModal =
      openOfficialDemandModal;

    console.log(
      "ACS OFFICIAL WEEKLY DEMAND MODAL READY"
    );
  }

  if (
    global.document.readyState === "complete"
  ) {
    global.setTimeout(
      installOfficialDemandModal,
      0
    );
  } else {
    global.addEventListener(
      "load",
      installOfficialDemandModal,
      { once: true }
    );
  }

  function clear(options = {}) {
    if (!options.origin && !options.continent) {
      memoryCache.clear();
      return;
    }

    const origin = validateOrigin(options.origin);
    const continent = validateContinent(
      options.continent
    );

    memoryCache.delete(cacheKey(origin, continent));
  }

  global.ACS_PASSENGER_MARKETS = Object.freeze({
    version: "1.0.2",
    loadWeek,
    authority: EXPECTED_AUTHORITY,
    load,
    find,
    mergeCatalogRows,
    clear
  });

  console.log(
    "ACS PASSENGER MARKETS CLIENT v1.0.2 READY"
  );

})(window);

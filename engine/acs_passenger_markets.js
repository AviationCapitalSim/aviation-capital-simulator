/* ============================================================
   ACS GLOBAL PASSENGER MARKETS — CLIENT v1.0
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

    return rows.map(row => {
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
    version: "1.0.0",
    authority: EXPECTED_AUTHORITY,
    load,
    find,
    mergeCatalogRows,
    clear
  });

  console.log(
    "ACS PASSENGER MARKETS CLIENT v1.0 READY"
  );

})(window);

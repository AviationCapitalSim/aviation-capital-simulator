/* ============================================================
   ACS GLOBAL PASSENGER DEMAND CLIENT — v1.0
   ------------------------------------------------------------
   Frontend client only.

   Authority:
   - PostgreSQL passenger market
   - ACS canonical simulation time
   - Active backend demand model

   Rules:
   - No local demand formulas
   - No localStorage authority
   - No aircraft-capacity allocation
   - No airline market-share allocation
   - Memory cache is transport optimization only
   ============================================================ */

(function ACS_installPassengerDemandClient(global) {
  "use strict";

  const DEFAULT_API_BASE =
    "https://api.aviationcapitalsim.com/v1";

  const DEFAULT_CACHE_TTL_MS = 30000;

  const memoryCache = new Map();

  let configuration = {
    apiBase: DEFAULT_API_BASE,
    cacheTtlMs: DEFAULT_CACHE_TTL_MS
  };

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function normalizeIcao(value) {
    return normalizeText(value).toUpperCase();
  }

  function normalizeApiBase(value) {
    return normalizeText(value).replace(/\/+$/, "");
  }

  function getMonotonicTime() {
    if (
      global.performance &&
      typeof global.performance.now === "function"
    ) {
      return global.performance.now();
    }

    return 0;
  }

  function buildCacheKey(type, values) {
    return [
      type,
      ...values.map(value => normalizeText(value))
    ].join("|");
  }

  function readMemoryCache(key) {
    const entry = memoryCache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.promise) {
      return entry.promise;
    }

    const cacheAge =
      getMonotonicTime() - entry.storedAt;

    if (
      configuration.cacheTtlMs > 0 &&
      cacheAge <= configuration.cacheTtlMs
    ) {
      return Promise.resolve(entry.data);
    }

    memoryCache.delete(key);
    return null;
  }

  function storePendingRequest(key, promise) {
    memoryCache.set(key, { promise });

    promise
      .then(data => {
        memoryCache.set(key, {
          data,
          storedAt: getMonotonicTime()
        });
      })
      .catch(() => {
        memoryCache.delete(key);
      });

    return promise;
  }

  async function fetchCanonicalJson(path) {
    const response = await fetch(
      `${configuration.apiBase}${path}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      const error = new Error(
        "ACS_PASSENGER_DEMAND_INVALID_RESPONSE"
      );

      error.code =
        "ACS_PASSENGER_DEMAND_INVALID_RESPONSE";

      error.httpStatus = response.status;
      throw error;
    }

    if (
      !response.ok ||
      !data ||
      data.ok !== true
    ) {
      const error = new Error(
        data?.details ||
        data?.error ||
        "ACS_PASSENGER_DEMAND_REQUEST_FAILED"
      );

      error.code =
        data?.error ||
        "ACS_PASSENGER_DEMAND_REQUEST_FAILED";

      error.httpStatus = response.status;
      error.response = data;

      throw error;
    }

    return data;
  }

  function requestWithMemoryCache(
    key,
    path,
    forceRefresh
  ) {
    if (!forceRefresh) {
      const cached = readMemoryCache(key);

      if (cached) {
        return cached;
      }
    }

    const request = fetchCanonicalJson(path);

    return storePendingRequest(key, request);
  }

  async function getMarket(
    originValue,
    destinationValue,
    options = {}
  ) {
    const origin = normalizeIcao(originValue);
    const destination =
      normalizeIcao(destinationValue);

    if (!origin || !destination) {
      throw new Error(
        "ACS_PASSENGER_DEMAND_ORIGIN_DESTINATION_REQUIRED"
      );
    }

    if (origin === destination) {
      throw new Error(
        "ACS_PASSENGER_DEMAND_AIRPORTS_CANNOT_MATCH"
      );
    }

    const key = buildCacheKey(
      "MARKET",
      [origin, destination]
    );

    const path =
      "/routes/passenger-demand" +
      `?origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}`;

    return requestWithMemoryCache(
      key,
      path,
      options.forceRefresh === true
    );
  }

  async function getMarkets(
    originValue,
    continentValue,
    options = {}
  ) {
    const origin = normalizeIcao(originValue);
    const continent = normalizeText(continentValue);

    if (!origin) {
      throw new Error(
        "ACS_PASSENGER_DEMAND_ORIGIN_REQUIRED"
      );
    }

    if (!continent) {
      throw new Error(
        "ACS_PASSENGER_DEMAND_CONTINENT_REQUIRED"
      );
    }

    const key = buildCacheKey(
      "MARKETS",
      [origin, continent.toLowerCase()]
    );

    const path =
      "/routes/passenger-demand/markets" +
      `?origin=${encodeURIComponent(origin)}` +
      `&continent=${encodeURIComponent(continent)}`;

    return requestWithMemoryCache(
      key,
      path,
      options.forceRefresh === true
    );
  }

  async function getBaseAnalysis(
    icaoValue,
    options = {}
  ) {
    const icao = normalizeIcao(icaoValue);

    if (!icao) {
      throw new Error(
        "ACS_PASSENGER_DEMAND_BASE_ICAO_REQUIRED"
      );
    }

    const key = buildCacheKey(
      "BASE_ANALYSIS",
      [icao]
    );

    const path =
      `/airports/base-market/${encodeURIComponent(icao)}`;

    return requestWithMemoryCache(
      key,
      path,
      options.forceRefresh === true
    );
  }

  function clearMemoryCache() {
    memoryCache.clear();
  }

  function configure(options = {}) {
    if (options.apiBase !== undefined) {
      const apiBase =
        normalizeApiBase(options.apiBase);

      if (!apiBase) {
        throw new Error(
          "ACS_PASSENGER_DEMAND_API_BASE_REQUIRED"
        );
      }

      configuration.apiBase = apiBase;
    }

    if (options.cacheTtlMs !== undefined) {
      const cacheTtlMs =
        Number(options.cacheTtlMs);

      if (
        !Number.isFinite(cacheTtlMs) ||
        cacheTtlMs < 0
      ) {
        throw new Error(
          "ACS_PASSENGER_DEMAND_CACHE_TTL_INVALID"
        );
      }

      configuration.cacheTtlMs =
        cacheTtlMs;
    }

    clearMemoryCache();

    return {
      ...configuration
    };
  }

  global.ACS_PASSENGER_DEMAND = Object.freeze({
    clientVersion: "1.0",
    authority:
      "POSTGRESQL_PASSENGER_MARKET_AUTHORITY",
    configure,
    getMarket,
    getMarkets,
    getBaseAnalysis,
    clearMemoryCache
  });

  global.dispatchEvent(
    new CustomEvent(
      "ACS_PASSENGER_DEMAND_CLIENT_READY",
      {
        detail: {
          clientVersion: "1.0",
          authority:
            "POSTGRESQL_PASSENGER_MARKET_AUTHORITY"
        }
      }
    )
  );

  console.log(
    "ACS GLOBAL PASSENGER DEMAND CLIENT v1.0 READY"
  );

})(window);

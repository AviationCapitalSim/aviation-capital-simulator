/* ============================================================
   ACS GLOBAL PASSENGER MARKETS — CLIENT v1.1.1
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
   - Exact seven-day allocation by airport and cabin
   - Central Middle East scope resolution
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

  const MIDDLE_EAST_REGIONS = new Set([
    "middle east",
    "near east",
    "west asia",
    "western asia",
    "arabian peninsula",
    "persian gulf",
    "gulf"
  ]);

  const MIDDLE_EAST_COUNTRIES = new Set([
    "bahrain",
    "cyprus",
    "egypt",
    "iran",
    "iraq",
    "israel",
    "jordan",
    "kuwait",
    "lebanon",
    "oman",
    "palestine",
    "palestinian territories",
    "qatar",
    "saudi arabia",
    "syria",
    "turkey",
    "turkiye",
    "uae",
    "united arab emirates",
    "yemen"
  ]);

  const WEEKDAY_LABELS = Object.freeze([
    "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"
  ]);

  const PROFILE_WEIGHTS = Object.freeze({
    business: Object.freeze({
      Y: [0.17, 0.16, 0.16, 0.17, 0.17, 0.08, 0.09],
      C: [0.20, 0.19, 0.18, 0.18, 0.17, 0.04, 0.04],
      F: [0.19, 0.18, 0.17, 0.17, 0.16, 0.06, 0.07]
    }),
    tourism: Object.freeze({
      Y: [0.10, 0.09, 0.10, 0.12, 0.18, 0.23, 0.18],
      C: [0.10, 0.09, 0.10, 0.13, 0.19, 0.23, 0.16],
      F: [0.11, 0.10, 0.11, 0.14, 0.19, 0.21, 0.14]
    }),
    hub: Object.freeze({
      Y: [0.14, 0.13, 0.14, 0.14, 0.16, 0.16, 0.13],
      C: [0.17, 0.17, 0.16, 0.17, 0.16, 0.08, 0.09],
      F: [0.17, 0.16, 0.15, 0.16, 0.17, 0.10, 0.09]
    }),
    regional: Object.freeze({
      Y: [0.13, 0.12, 0.14, 0.15, 0.17, 0.16, 0.13],
      C: [0.18, 0.17, 0.17, 0.18, 0.17, 0.06, 0.07],
      F: [0.17, 0.16, 0.16, 0.17, 0.17, 0.08, 0.09]
    }),
    mixed: Object.freeze({
      Y: [0.13, 0.12, 0.13, 0.14, 0.17, 0.18, 0.13],
      C: [0.17, 0.16, 0.16, 0.17, 0.17, 0.08, 0.09],
      F: [0.16, 0.15, 0.15, 0.16, 0.18, 0.11, 0.09]
    })
  });

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

  function normalizedKey(value) {
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function isMiddleEastPage() {
    return normalizedKey(
      global.location?.pathname
    ).endsWith("/airport_list_middleeast.html");
  }

  function resolveMarketScope(continent) {
    const requestedContinent = validateContinent(
      continent
    );

    if (isMiddleEastPage()) {
      return Object.freeze({
        requestedContinent,
        canonicalContinent: "Middle East",
        isMiddleEast: true
      });
    }

    return Object.freeze({
      requestedContinent,
      canonicalContinent: requestedContinent,
      isMiddleEast: false
    });
  }

  function isMiddleEastMarket(market) {
    const region = normalizedKey(
      market?.destination_region
    );
    const country = normalizedKey(
      market?.destination_country
    );

    return (
      MIDDLE_EAST_REGIONS.has(region) ||
      MIDDLE_EAST_COUNTRIES.has(country)
    );
  }

  function isMiddleEastCatalogRow(row) {
    const region = normalizedKey(
      row?.region ||
      row?.destination_region
    );
    const country = normalizedKey(
      row?.country ||
      row?.country_name ||
      row?.destination_country
    );

    return (
      MIDDLE_EAST_REGIONS.has(region) ||
      MIDDLE_EAST_COUNTRIES.has(country)
    );
  }

  function hashString(value) {
    let hash = 2166136261;

    for (const character of text(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function seededUnit(seed) {
    let value = seed >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
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

  function createScopedSnapshot(
    snapshot,
    markets,
    options = {}
  ) {
    const scopedMarkets = Object.freeze([
      ...markets
    ]);
    const byDestination = new Map();

    for (const market of scopedMarkets) {
      byDestination.set(
        market.destination_icao,
        market
      );
    }

    const marketsWithDemand = scopedMarkets.filter(
      market => market.weekly_total > 0
    ).length;

    return Object.freeze({
      endpoint: snapshot.endpoint,
      version: snapshot.version,
      authority: snapshot.authority,
      current_sim_time: snapshot.current_sim_time,
      origin: snapshot.origin,
      continent:
        options.continent || snapshot.continent,
      source_continent:
        options.sourceContinent || snapshot.continent,
      isMiddleEast:
        options.isMiddleEast === true,
      summary: Object.freeze({
        evaluated_markets: scopedMarkets.length,
        markets_with_demand: marketsWithDemand,
        zero_demand_markets:
          scopedMarkets.length - marketsWithDemand
      }),
      markets: scopedMarkets,
      byDestination
    });
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

  async function requestMiddleEastMarkets(origin) {
    const asiaSnapshot = await requestMarkets(
      origin,
      "Asia"
    );

    return createScopedSnapshot(
      asiaSnapshot,
      asiaSnapshot.markets,
      {
        continent: "Middle East",
        sourceContinent: "Asia",
        isMiddleEast: true
      }
    );
  }

  async function load(options = {}) {
    const origin = validateOrigin(options.origin);
    const scope = resolveMarketScope(
      options.continent
    );
    const continent = scope.canonicalContinent;
    const key = cacheKey(origin, continent);
    const force = options.force === true;

    if (!force && memoryCache.has(key)) {
      return memoryCache.get(key);
    }

    if (pendingRequests.has(key)) {
      return pendingRequests.get(key);
    }

    const request = (
      scope.isMiddleEast
        ? requestMiddleEastMarkets(origin)
        : requestMarkets(origin, continent)
    )
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

    const scopedRows = snapshot.isMiddleEast
      ? rows.filter(
          isMiddleEastCatalogRow
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

  function classifyAirportProfile(airport = {}) {
    const explicitProfile = normalizedKey(
      airport.market_profile ||
      airport.passenger_profile
    );

    if (PROFILE_WEIGHTS[explicitProfile]) {
      return explicitProfile;
    }

    const identity = normalizedKey([
      airport.icao,
      airport.city,
      airport.name,
      airport.country,
      airport.category,
      airport.destination_category
    ].join(" "));

    const tourismSignals = [
      "resort", "holiday", "tourism", "tourist",
      "punta cana", "cancun", "ibiza", "maldives",
      "bali", "phuket", "honolulu", "orlando",
      "las vegas", "porto seguro", "tenerife",
      "mallorca", "faro", "nassau", "seychelles",
      "mauritius", "cabo", "riviera"
    ];
    const businessSignals = [
      "financial", "business", "capital",
      "london", "frankfurt", "zurich", "geneva",
      "new york", "tokyo", "singapore", "hong kong",
      "dubai", "doha", "riyadh", "chicago",
      "paris", "milan", "seoul", "shanghai",
      "beijing", "brussels"
    ];

    if (tourismSignals.some(signal =>
      identity.includes(signal)
    )) {
      return "tourism";
    }

    if (businessSignals.some(signal =>
      identity.includes(signal)
    )) {
      return "business";
    }

    const category = normalizedKey(
      airport.category ||
      airport.destination_category
    );

    if (category.includes("primary hub")) {
      return "hub";
    }

    if (category.includes("regional")) {
      return "regional";
    }

    const selector = hashString(
      `${icao(airport.icao)}|PROFILE`
    ) % 10;

    if (selector <= 1) return "business";
    if (selector <= 3) return "tourism";
    return "mixed";
  }

  function normalizedCabinWeights(
    profile,
    cabin,
    seedText
  ) {
    const template =
      PROFILE_WEIGHTS[profile]?.[cabin] ||
      PROFILE_WEIGHTS.mixed[cabin];
    const baseSeed = hashString(seedText);
    const varied = template.map((weight, index) => {
      const unit = seededUnit(
        baseSeed + Math.imul(index + 1, 2654435761)
      );
      const variation = 0.94 + (unit * 0.12);
      return Math.max(0.001, weight * variation);
    });
    const sum = varied.reduce(
      (total, value) => total + value,
      0
    );

    return varied.map(value => value / sum);
  }

  function allocateExactWeekly(
    weeklyTotal,
    weights,
    seedText
  ) {
    const total = nonNegativeInteger(
      weeklyTotal,
      "WEEKLY_ALLOCATION"
    );

    if (total === 0) {
      return Object.freeze([0, 0, 0, 0, 0, 0, 0]);
    }

    const raw = weights.map(
      weight => total * weight
    );
    const allocated = raw.map(
      value => Math.floor(value)
    );
    let remaining = total - allocated.reduce(
      (sum, value) => sum + value,
      0
    );
    const tieSeed = hashString(seedText);
    const order = raw.map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
      tie: seededUnit(
        tieSeed + Math.imul(index + 1, 2246822519)
      )
    })).sort((a, b) =>
      (b.fraction - a.fraction) ||
      (b.tie - a.tie)
    );

    for (let index = 0; index < remaining; index += 1) {
      allocated[order[index].index] += 1;
    }

    return Object.freeze(allocated);
  }

  function distributeWeeklyDemand(options = {}) {
    const airportCode = icao(options.icao);
    const periodCode = text(
      options.periodCode || "CURRENT"
    );
    const profile = classifyAirportProfile(options);
    const totals = {
      Y: nonNegativeInteger(options.Y ?? 0, "WEEKLY_Y"),
      C: nonNegativeInteger(options.C ?? 0, "WEEKLY_C"),
      F: nonNegativeInteger(options.F ?? 0, "WEEKLY_F")
    };
    const allocations = {};
    const weights = {};

    for (const cabin of ["Y", "C", "F"]) {
      const seed = [
        airportCode,
        periodCode,
        profile,
        cabin
      ].join("|");

      weights[cabin] = Object.freeze(
        normalizedCabinWeights(
          profile,
          cabin,
          seed
        )
      );
      allocations[cabin] = allocateExactWeekly(
        totals[cabin],
        weights[cabin],
        seed
      );
    }

    const days = Object.freeze(
      WEEKDAY_LABELS.map((day, index) =>
        Object.freeze({
          day,
          Y: allocations.Y[index],
          C: allocations.C[index],
          F: allocations.F[index]
        })
      )
    );

    return Object.freeze({
      icao: airportCode,
      periodCode,
      profile,
      weekly: Object.freeze(totals),
      weights: Object.freeze(weights),
      days
    });
  }

  function installDemandModalOverride() {
    if (
      typeof global.ACS_findAirport !== "function" ||
      !global.document?.getElementById("acsDemandModal")
    ) {
      return;
    }

    global.ACS_openDemandModal = function ACS_openDemandModalGlobal(airportIcao) {
      const airport = global.ACS_findAirport(
        airportIcao
      );
      if (!airport) return;

      const modal = global.document.getElementById(
        "acsDemandModal"
      );
      const title = global.document.getElementById(
        "acsDemandTitle"
      );
      const content = global.document.getElementById(
        "acsDemandContent"
      );
      if (!modal || !title || !content) return;

      const weekly = {
        Y: Math.max(0, Math.round(Number(airport.demand?.Y) || 0)),
        C: Math.max(0, Math.round(Number(airport.demand?.C) || 0)),
        F: Math.max(0, Math.round(Number(airport.demand?.F) || 0))
      };
      const distribution = distributeWeeklyDemand({
        icao: airport.icao,
        city: airport.city,
        name: airport.name,
        country: airport.country,
        category: airport.category,
        destination_category:
          airport.passenger_market?.destination_category,
        periodCode:
          airport.passenger_market?.period_code ||
          airport.passenger_market?.sim_date ||
          "CURRENT",
        Y: weekly.Y,
        C: weekly.C,
        F: weekly.F
      });

      title.innerHTML = `
        <div style="font-family:Orbitron;letter-spacing:2px;color:#ffb300;">
          PASSENGER DEMAND
        </div>
        <div style="margin-top:4px;font-size:13px;color:#ffffff;">
          ${text(airport.city).toUpperCase()} — ${icao(airport.icao)}
        </div>
      `;

      let structuralMax = 300;
      if (airport.category === "Primary Hub") {
        structuralMax = 1200;
      } else if (airport.category === "Major Regional") {
        structuralMax = 700;
      } else if (airport.category === "Regional") {
        structuralMax = 350;
      } else {
        structuralMax = 180;
      }

      const peak = {
        Y: Math.max(...distribution.days.map(day => day.Y), 1),
        C: Math.max(...distribution.days.map(day => day.C), 1),
        F: Math.max(...distribution.days.map(day => day.F), 1)
      };

      function indicator(value, cabinPeak, capacity) {
        if (value <= 0) return 0;
        const structuralPct = capacity > 0
          ? (value / capacity) * 100
          : 0;
        const relativePct = cabinPeak > 0
          ? (value / cabinPeak) * 100
          : 0;
        return Math.max(
          8,
          Math.min(
            100,
            (structuralPct * 0.65) +
            (relativePct * 0.35)
          )
        );
      }

      let html = `
        <div style="
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:14px;
          align-items:stretch;
        ">
      `;

      for (const day of distribution.days) {
        const yPct = indicator(day.Y, peak.Y, structuralMax * 0.80);
        const cPct = indicator(day.C, peak.C, structuralMax * 0.15);
        const fPct = indicator(day.F, peak.F, structuralMax * 0.05);

        html += `
          <div style="text-align:center;width:100%;">
            <div style="font-family:Orbitron;font-size:12px;color:#ffffff;margin-bottom:6px;">
              ${day.day}
            </div>
            <div style="
              width:100%;height:8px;display:grid;
              grid-template-columns:1fr 1fr 1fr;
              background:rgba(255,255,255,0.06);
              border:1px solid rgba(255,179,0,0.25);
              border-radius:4px;overflow:hidden;
            ">
              <div style="position:relative;overflow:hidden;border-right:1px solid rgba(255,179,0,0.4);">
                <div class="acs-demand-segY" style="width:${yPct}%;height:100%;"></div>
              </div>
              <div style="position:relative;overflow:hidden;border-right:1px solid rgba(255,179,0,0.4);">
                <div class="acs-demand-segC" style="width:${cPct}%;height:100%;"></div>
              </div>
              <div style="position:relative;overflow:hidden;">
                <div class="acs-demand-segF" style="width:${fPct}%;height:100%;"></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;font-family:Orbitron;font-size:11px;margin-top:4px;">
              <div style="color:#74b8d8;font-weight:500;">Y ${day.Y}</div>
              <div style="color:#c99a70;font-weight:500;">C ${day.C}</div>
              <div style="color:#d0bc7a;font-weight:500;">F ${day.F}</div>
            </div>
          </div>
        `;
      }

      html += `</div>`;
      content.innerHTML = html;
      modal.classList.add("is-open");
    };

    console.log(
      "ACS EXACT WEEKLY DEMAND DISTRIBUTOR INSTALLED"
    );
  }

  function clear(options = {}) {
    if (!options.origin && !options.continent) {
      memoryCache.clear();
      return;
    }

    const origin = validateOrigin(options.origin);
    const scope = resolveMarketScope(
      options.continent
    );

    memoryCache.delete(
      cacheKey(origin, scope.canonicalContinent)
    );
  }

  global.ACS_PASSENGER_MARKETS = Object.freeze({
    version: "1.1.1",
    authority: EXPECTED_AUTHORITY,
    load,
    find,
    mergeCatalogRows,
    resolveMarketScope,
    classifyAirportProfile,
    distributeWeeklyDemand,
    clear
  });

  if (global.document?.readyState === "loading") {
    global.addEventListener(
      "DOMContentLoaded",
      installDemandModalOverride,
      { once: true }
    );
  } else {
    global.queueMicrotask(
      installDemandModalOverride
    );
  }

  console.log(
    "ACS PASSENGER MARKETS CLIENT v1.1.1 READY"
  );

})(window);

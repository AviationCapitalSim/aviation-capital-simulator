/* ============================================================
   🟦 ACS PASSENGER ENGINE — v2.0 (CANONICAL)
   ------------------------------------------------------------
   ✔ Pure demand engine
   ✔ Deterministic + bounded
   ✔ No Finance / No Storage / No UI
   ✔ Scales to 500+ players
   ------------------------------------------------------------
   Author: ACS System
   Date: 2026-01-11
   ============================================================ */

window.ACS_PAX = {};

/* ============================================================
   🟦 1. SAFE HELPERS
   ============================================================ */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function safeNum(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}

/* ============================================================
   🟦 2. WORLD DEMAND (BASE)
   ============================================================ */

ACS_PAX.getBaseDailyDemand = function ({
  distanceNM,
  year,
  continentA,
  continentB
}) {

  distanceNM = safeNum(distanceNM);
  year = safeNum(year, 1970);

  /* -------- distance factor -------- */
  let distFactor = 1.0;
  if (distanceNM > 3000) distFactor = 0.45;
  else if (distanceNM > 1500) distFactor = 0.65;
  else if (distanceNM > 500)  distFactor = 0.85;

  /* -------- historical factor -------- */
  let yearFactor = 1.0;
  if (year < 1950) yearFactor = 0.35;
  else if (year < 1970) yearFactor = 0.55;
  else if (year < 1990) yearFactor = 0.75;

  /* -------- continental factor -------- */
  let contFactor = 0.6;
  if (continentA && continentA === continentB) contFactor = 1.0;

  /* -------- base global demand -------- */
  const BASE = 220; // world baseline (per route/day)

  const demand =
    BASE *
    distFactor *
    yearFactor *
    contFactor;

  return Math.max(0, Math.floor(demand));
};

/* ============================================================
   🟦 3. HOURLY DISTRIBUTION
   ============================================================ */

ACS_PAX.getHourlyDemand = function (dailyDemand, hour) {

  dailyDemand = safeNum(dailyDemand);
  hour = clamp(safeNum(hour), 0, 23);

  const hourlyCurve = [
    0.02, 0.02, 0.03, 0.04,  // 00–03
    0.05, 0.07, 0.10, 0.12,  // 04–07
    0.12, 0.11, 0.10, 0.09,  // 08–11
    0.08, 0.07, 0.06, 0.06,  // 12–15
    0.07, 0.08, 0.09, 0.10,  // 16–19
    0.07, 0.05, 0.03, 0.02   // 20–23
  ];

  const ratio = hourlyCurve[hour] || 0;
  return Math.floor(dailyDemand * ratio);
};

/* ============================================================
   🟦 4. MARKET SHARE MODEL
   ============================================================ */

ACS_PAX.getMarketShare = function ({
  priceFactor = 1.0,
  comfortFactor = 1.0,
  marketingFactor = 1.0,
  reputationFactor = 1.0,
  frequencyFactor = 1.0,
  competitors = 1
}) {

  priceFactor       = safeNum(priceFactor, 1.0);
  comfortFactor     = safeNum(comfortFactor, 1.0);
  marketingFactor   = safeNum(marketingFactor, 1.0);
  reputationFactor  = safeNum(reputationFactor, 1.0);
  frequencyFactor   = safeNum(frequencyFactor, 1.0);
  competitors       = Math.max(1, safeNum(competitors, 1));

  const raw =
    priceFactor *
    comfortFactor *
    marketingFactor *
    reputationFactor *
    frequencyFactor;

  const share = raw / competitors;

  return clamp(share, 0.05, 1.0);
};

/* ============================================================
   🟦 5. MAIN ENTRY — CALCULATE PASSENGERS
   ============================================================ */

ACS_PAX.calculate = function (input = {}) {

  try {

    /* -------- destructure safely -------- */
    const route   = input.route   || {};
    const time    = input.time    || {};
    const aircraft= input.aircraft|| {};
    const pricing = input.pricing || {};
    const airline = input.airline || {};
    const market  = input.market  || {};

    const seats = Math.max(0, safeNum(aircraft.seats));

    if (seats === 0) {
      return { pax: 0, loadFactor: 0, demandUsed: 0 };
    }

    /* -------- demand -------- */
    const dailyDemand = this.getBaseDailyDemand({
      distanceNM: route.distanceNM,
      year: time.year,
      continentA: route.continentA,
      continentB: route.continentB
    });

    const hourlyDemand =
      this.getHourlyDemand(dailyDemand, time.hour);

    if (hourlyDemand <= 0) {
      return { pax: 0, loadFactor: 0, demandUsed: 0 };
    }

    /* -------- market share -------- */
    const priceFactor =
      pricing.baseFare && pricing.effectiveFare
        ? clamp(pricing.baseFare / pricing.effectiveFare, 0.6, 1.4)
        : 1.0;

    const share = this.getMarketShare({
      priceFactor,
      comfortFactor: aircraft.comfortIndex || 1.0,
      marketingFactor: airline.marketingLevel || 1.0,
      reputationFactor: airline.reputation || 1.0,
      frequencyFactor: market.frequencyFactor || 1.0,
      competitors: market.competitors || 1
    });

    /* -------- final pax -------- */
    const pax = Math.floor(
      Math.min(seats, hourlyDemand * share)
    );

    return {
      pax,
      loadFactor: pax / seats,
      demandUsed: pax / hourlyDemand
    };

  } catch (err) {
    console.error("❌ ACS_PAX.calculate error:", err);
    return { pax: 0, loadFactor: 0, demandUsed: 0 };
  }
};

console.log("🧍 ACS PASSENGER ENGINE v2.0 — READY");

/* ============================================================
   === ACS HISTORICAL AIRPORT ECONOMICS & MARKET ENGINE v2.0 ==
   ------------------------------------------------------------
   FULL REALISM MODEL — 1940–2030
   ------------------------------------------------------------
   Combina:

   • Historical fuel pricing
   • Historical airport fees
   • Historical passenger market growth
   • Historical airport throughput capacity
   • Real-time market consumption from scheduleItems
   • Realistic aviation growth curve (non-linear)

   Uses REAL SEATS from scheduleItems ledger.

   Compatible with:
   Finance Engine
   Schedule Engine
   Routes Engine
   Airport Info UI
   Market Visualization

   Author: ACS Core System
   ============================================================ */



// ============================================================
// 1) HISTORICAL GLOBAL AVIATION MARKET MULTIPLIER
// Based on real ICAO + IATA global passenger growth curves
// ============================================================

const ACS_HIST_MARKET = [

    { year: 1940, factor: 0.06 },
    { year: 1945, factor: 0.08 },
    { year: 1950, factor: 0.14 },
    { year: 1955, factor: 0.22 },
    { year: 1960, factor: 0.32 },
    { year: 1965, factor: 0.45 },
    { year: 1970, factor: 0.60 },
    { year: 1975, factor: 0.72 },
    { year: 1980, factor: 0.82 },
    { year: 1985, factor: 0.90 },
    { year: 1990, factor: 0.96 },
    { year: 1995, factor: 1.00 },
    { year: 2000, factor: 1.05 },
    { year: 2005, factor: 1.10 },
    { year: 2010, factor: 1.15 },
    { year: 2015, factor: 1.20 },
    { year: 2020, factor: 1.25 },
    { year: 2026, factor: 1.30 }

];



// ============================================================
// 2) HISTORICAL FUEL PRICE FACTOR
// ============================================================

const ACS_HIST_FUEL = [

    { year: 1940, factor: 0.08 },
    { year: 1950, factor: 0.12 },
    { year: 1960, factor: 0.20 },
    { year: 1970, factor: 0.32 },
    { year: 1980, factor: 0.45 },
    { year: 1990, factor: 0.60 },
    { year: 2000, factor: 0.80 },
    { year: 2010, factor: 0.95 },
    { year: 2020, factor: 1.10 },
    { year: 2026, factor: 1.20 }

];



// ============================================================
// 3) HISTORICAL AIRPORT FEES FACTOR
// ============================================================

const ACS_HIST_FEES = [

    { year: 1940, factor: 0.10 },
    { year: 1950, factor: 0.18 },
    { year: 1960, factor: 0.25 },
    { year: 1970, factor: 0.40 },
    { year: 1980, factor: 0.55 },
    { year: 1990, factor: 0.70 },
    { year: 2000, factor: 0.85 },
    { year: 2010, factor: 0.95 },
    { year: 2020, factor: 1.05 },
    { year: 2026, factor: 1.15 }

];



// ============================================================
// 4) HISTORICAL TICKET TAX FACTOR
// ============================================================

const ACS_HIST_TICKET = [

    { year: 1940, factor: 0.30 },
    { year: 1950, factor: 0.40 },
    { year: 1960, factor: 0.50 },
    { year: 1970, factor: 0.65 },
    { year: 1980, factor: 0.75 },
    { year: 1990, factor: 0.85 },
    { year: 2000, factor: 0.95 },
    { year: 2010, factor: 1.05 },
    { year: 2020, factor: 1.10 },
    { year: 2026, factor: 1.15 }

];



// ============================================================
// 5) HISTORICAL CLASS DISTRIBUTION
// Critical for realism (1940 had almost no Business / First)
// ============================================================

function ACS_getHistoricalClassDistribution(year){

    if(year <= 1955)
        return { Y: 0.97, C: 0.03, F: 0.00 };

    if(year <= 1975)
        return { Y: 0.92, C: 0.07, F: 0.01 };

    if(year <= 1995)
        return { Y: 0.87, C: 0.10, F: 0.03 };

    if(year <= 2015)
        return { Y: 0.84, C: 0.12, F: 0.04 };

    return { Y: 0.82, C: 0.14, F: 0.04 };

}



// ============================================================
// 6) GENERIC FACTOR LOOKUP
// ============================================================

function ACS_getFactorForYear(table, year){

    for(let i = table.length - 1; i >= 0; i--)
        if(year >= table[i].year)
            return table[i].factor;

    return table[0].factor;

}



// ============================================================
// 7) LOAD REAL MARKET DATA FROM scheduleItems
// ============================================================

function ACS_getScheduleItems(){

    try{
        return JSON.parse(localStorage.getItem("scheduleItems") || "[]");
    }
    catch(e){
        return [];
    }

}



// ============================================================
// 8) REAL AIRPORT SEATS USED (LIVE MARKET)
// ============================================================

function ACS_getAirportSeatsUsed(icao){

    const items = ACS_getScheduleItems();

    let seats = 0;

    items.forEach(it => {

        if(it.type !== "flight") return;

        if(it.origin === icao || it.destination === icao)
            seats += Number(it.seats || 0);

    });

    return seats;

}



// ============================================================
// 9) REALISTIC AIRPORT CAPACITY MODEL
// Based on real throughput ranges by airport class
// ============================================================

function ACS_getAirportSeatCapacity(airport){

  if(!airport) return 0;

  const baseModern = {

    "Primary Hub": 160000,
    "Major Regional": 60000,
    "Regional": 18000,
    "Minor": 5000

  };

  const modern = baseModern[airport.category] || 20000;

  let year = 1940;

  try{
    year = ACS_TIME.currentTime.getFullYear();
  }catch(e){}

  let factor = 0.03;

  if(year >= 1950) factor = 0.06;
  if(year >= 1960) factor = 0.12;
  if(year >= 1970) factor = 0.25;
  if(year >= 1980) factor = 0.45;
  if(year >= 1990) factor = 0.65;
  if(year >= 2000) factor = 0.85;
  if(year >= 2010) factor = 1.00;
  if(year >= 2025) factor = 1.15;

  return Math.round(modern * factor);

}

/* ============================================================
   ACS HISTORICAL AIRPORT STRUCTURAL CAPACITY ENGINE
   Realistic throughput adjusted by infrastructure era
   ============================================================ */

function ACS_getAirportMarketCapacity(ap){

  if(!ap) return { throughput: 0 };

  let year = 1940;

  try{
    year = ACS_TIME.currentTime.getFullYear();
  }catch(e){}

  let modernCapacity = 0;

  switch(ap.category){

    case "Primary Hub":
      modernCapacity = 4800;
      break;

    case "Major Regional":
      modernCapacity = 2200;
      break;

    case "Regional":
      modernCapacity = 900;
      break;

    default:
      modernCapacity = 400;
  }

  let multiplier = 1.0;

  if(year <= 1950)
    multiplier = 0.11;

  else if(year <= 1970)
    multiplier = 0.26;

  else if(year <= 1990)
    multiplier = 0.48;

  else if(year <= 2010)
    multiplier = 0.72;

  else
    multiplier = 1.0;

  const throughput =
    Math.round(modernCapacity * multiplier);

  return {
    throughput: throughput,
    modernCapacity: modernCapacity,
    multiplier: multiplier,
    year: year
  };

}

// ============================================================
// 11) ROUTE MARKET CONSUMPTION
// ============================================================

function ACS_getRouteSeatsUsed(origin, destination){

    const items = ACS_getScheduleItems();

    let seats = 0;

    items.forEach(it => {

        if(it.type !== "flight") return;

        if(it.origin === origin && it.destination === destination)
            seats += Number(it.seats || 0);

    });

    return seats;

}



// ============================================================
// 12) FULL AIRPORT ECONOMICS (COST + MARKET)
// ============================================================

function ACS_adjustAirportFees(ap, year){

    const fuelFactor   = ACS_getFactorForYear(ACS_HIST_FUEL, year);
    const feesFactor   = ACS_getFactorForYear(ACS_HIST_FEES, year);
    const ticketFactor = ACS_getFactorForYear(ACS_HIST_TICKET, year);

    const market = ACS_getAirportMarketCapacity(ap);

    return {

        slot_cost   : Math.round(ap.slot_cost_usd   * feesFactor),
        landing_fee : Math.round(ap.landing_fee_usd * feesFactor),

        fuel_price  : (ap.fuel_usd_gal * fuelFactor).toFixed(2),

        ticket_fee  : (ap.ticket_fee_percent * ticketFactor).toFixed(2),

        market_total     : market.total,
        market_used      : market.used,
        market_available : market.available,
        market_saturation: market.saturation,

        congestion       : market.congestionLevel

    };

}

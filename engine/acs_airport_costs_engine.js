/* ============================================================
   === ACS HISTORICAL AIRPORT COST ENGINE — v1.0 (1940–2026) ==
   ------------------------------------------------------------
   • Ajusta costos según el año de simulación.
   • No modifica datasets originales.
   • Compatible con Finance, Schedule, Routes, Modal Info.
   • Basado en datos reales de precio del petróleo y evolución
     aeroportuaria global.
   ============================================================ */


// ============================================================
// 1) TABLA HISTÓRICA — FACTOR DE COMBUSTIBLE (USD/gal)
// ============================================================

const ACS_HIST_FUEL = [
    { year: 1940, factor: 0.08 },   // 0.25 USD/gal aprox.
    { year: 1950, factor: 0.12 },   // 0.40 USD/gal
    { year: 1960, factor: 0.20 },   // 0.60 USD/gal
    { year: 1970, factor: 0.32 },   // Crisis petrolera
    { year: 1980, factor: 0.45 },   // Crisis petrolera 2
    { year: 1990, factor: 0.60 },
    { year: 2000, factor: 0.80 },
    { year: 2010, factor: 0.95 },
    { year: 2020, factor: 1.10 },
    { year: 2026, factor: 1.20 }
];


// ============================================================
// 2) FACTOR HISTÓRICO PARA LANDING FEES & SLOT COST
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
// 3) FACTOR HISTÓRICO PARA TICKET FEE (tarifa de aeropuerto)
// ============================================================

const ACS_HIST_TICKET = [
    { year: 1940, factor: 0.30 },  // tasas más bajas
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
// 4) FACTOR HISTÓRICO PARA "Growth" (mercado regional)
// ============================================================

const ACS_HIST_GROWTH = [
    { year: 1940, factor: 0.20 }, 
    { year: 1950, factor: 0.35 },
    { year: 1960, factor: 0.50 },
    { year: 1970, factor: 0.70 },
    { year: 1980, factor: 0.85 },
    { year: 1990, factor: 0.95 },
    { year: 2000, factor: 1.00 },
    { year: 2010, factor: 1.05 },
    { year: 2020, factor: 1.10 },
    { year: 2026, factor: 1.15 }
];


// ============================================================
// 5) FUNCIONES — Obtener factor por año
// ============================================================

function ACS_getFactorForYear(table, year) {
    for (let i = table.length - 1; i >= 0; i--) {
        if (year >= table[i].year) return table[i].factor;
    }
    return table[0].factor;
}


// ============================================================
// 6) MOTOR PRINCIPAL — Ajuste de costos por año
// ============================================================

function ACS_adjustAirportFees(ap, year) {

    const fuelFactor   = ACS_getFactorForYear(ACS_HIST_FUEL,   year);
    const feesFactor   = ACS_getFactorForYear(ACS_HIST_FEES,   year);
    const ticketFactor = ACS_getFactorForYear(ACS_HIST_TICKET, year);
    const growthFactor = ACS_getFactorForYear(ACS_HIST_GROWTH, year);

    return {
        slot_cost    : Math.round(ap.slot_cost_usd    * feesFactor),
        landing_fee  : Math.round(ap.landing_fee_usd  * feesFactor),
        fuel_price   : (ap.fuel_usd_gal * fuelFactor).toFixed(2),
        ticket_fee   : (ap.ticket_fee_percent * ticketFactor).toFixed(2),
        growth       : (ap.pax_growth_factor * growthFactor).toFixed(2)
    };
}

/* ============================================================
   ✈️ ACS AIRPORT MARKET ENGINE — GLOBAL DEMAND & CONGESTION
   Uses scheduleItems as real market ledger
   ============================================================ */

function ACS_getScheduleItems(){

  try{
    return JSON.parse(localStorage.getItem("scheduleItems") || "[]");
  }catch(e){
    return [];
  }

}


/* ============================================================
   Calculate total seats using an airport (origin + destination)
   ============================================================ */

function ACS_getAirportSeatsUsed(icao){

  const items = ACS_getScheduleItems();

  let totalSeats = 0;

  items.forEach(it => {

    if(it.type !== "flight") return;

    if(it.origin === icao || it.destination === icao){

      const seats = Number(it.seats || 0);

      totalSeats += seats;

    }

  });

  return totalSeats;

}


/* ============================================================
   Calculate airport theoretical capacity (based on category)
   ============================================================ */

function ACS_getAirportSeatCapacity(airport){

  if(!airport) return 0;

  const baseByCategory = {

    "Primary Hub": 60000,
    "Major Regional": 24000,
    "Regional": 12000,
    "Minor": 4000

  };

  const base = baseByCategory[airport.category] || 10000;

  // historical multiplier
  const year = (window.ACS_TIME && ACS_TIME.year) || 2025;

  let factor = 1;

  if(year < 1960) factor = 0.35;
  else if(year < 1980) factor = 0.55;
  else if(year < 2000) factor = 0.75;
  else if(year < 2010) factor = 0.90;
  else factor = 1;

  return Math.round(base * factor);

}


/* ============================================================
   Main Market Capacity Object
   ============================================================ */

function ACS_getAirportMarketCapacity(airport){

  if(!airport) return null;

  const used = ACS_getAirportSeatsUsed(airport.icao);

  const total = ACS_getAirportSeatCapacity(airport);

  const available = Math.max(0, total - used);

  const saturation = total > 0 ? used / total : 0;

  return {

    total,
    used,
    available,
    saturation

  };

}


/* ============================================================
   Route Demand Consumption (Origin → Destination)
   ============================================================ */

function ACS_getRouteSeatsUsed(origin, destination){

  const items = ACS_getScheduleItems();

  let totalSeats = 0;

  items.forEach(it => {

    if(it.type !== "flight") return;

    if(it.origin === origin && it.destination === destination){

      totalSeats += Number(it.seats || 0);

    }

  });

  return totalSeats;

}

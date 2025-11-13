/* ============================================================
   === ACS FINANCE ENGINE - ADVANCED v1.0 ======================
   ------------------------------------------------------------
   ▪ Extiende el motor económico principal
   ▪ Costos por década (1940 → 2026)
   ▪ Fuel Market
   ▪ Handling
   ▪ Penalidades
   ▪ Slots y operatividad
   ▪ Preparado para Time Engine
   ============================================================ */

console.log("ACS Advanced Finance Engine Loaded");

// Precio histórico del combustible (USD por litro)
const ACS_FUEL_MARKET = {
    "1940": 0.02,
    "1950": 0.03,
    "1960": 0.05,
    "1970": 0.10,
    "1980": 0.25,
    "1990": 0.30,
    "2000": 0.40,
    "2010": 0.50,
    "2020": 0.60
};

// Obtener precio según año
function ACS_getFuelPrice(year) {
    year = parseInt(year);
    if (year <= 1945) return ACS_FUEL_MARKET["1940"];
    if (year <= 1955) return ACS_FUEL_MARKET["1950"];
    if (year <= 1965) return ACS_FUEL_MARKET["1960"];
    if (year <= 1975) return ACS_FUEL_MARKET["1970"];
    if (year <= 1985) return ACS_FUEL_MARKET["1980"];
    if (year <= 1995) return ACS_FUEL_MARKET["1990"];
    if (year <= 2005) return ACS_FUEL_MARKET["2000"];
    if (year <= 2015) return ACS_FUEL_MARKET["2010"];
    return ACS_FUEL_MARKET["2020"];
}

// Costos de handling por aeropuerto
function ACS_calcHandling(flightsPerDay) {
    return flightsPerDay * 35; // Handling base por vuelo
}

// Penalidad por no operar slots
function ACS_applySlotPenalty() {
    const penalty = 500; // base, ajustable por época y aeropuerto
    ACS_addExpense("penalties", penalty);
}

// Mantenimiento variable según horas voladas
function ACS_calcMaintenance(hours) {
    const base = 50;  // USD por hora en 1940
    return hours * base;
}

// Leasing dinámico para eras futuras
function ACS_calcLeasingDynamic(value, year) {
    let rate = 0.02; // base

    if (year >= 1960) rate = 0.03;
    if (year >= 1980) rate = 0.04;
    if (year >= 2000) rate = 0.05;

    return value * rate;
}

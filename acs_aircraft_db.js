/* ============================================================
   === ACS AIRCRAFT MASTER DATABASE v1.0 — PARTE 1 (Douglas) ==
   ============================================================ */

const ACS_AIRCRAFT_DB = [

/* ------------------------------------------------------------
   DOUGLAS — Era dorada y transición al jet (1934 → 1972)
   ------------------------------------------------------------ */

/* === Douglas DC-2 (1934) === */
{
    manufacturer: "Douglas",
    model: "DC-2",
    year: 1934,
    range_nm: 1075,
    speed_kts: 190,
    seats: 14,
    mtow_kg: 8598,
    fuel_burn_kgph: 360,
    price_original_usd: 65000,
    price_2025_usd: 1500000,
    price_acs_usd: 1200000,
    status: "active"
},

/* === Douglas DC-3 (1936) === */
{
    manufacturer: "Douglas",
    model: "DC-3",
    year: 1936,
    range_nm: 1500,
    speed_kts: 180,
    seats: 21,
    mtow_kg: 11790,
    fuel_burn_kgph: 450,
    price_original_usd: 79500,
    price_2025_usd: 1770000,
    price_acs_usd: 900000,
    status: "active"
},

/* === Douglas DC-4 (1942) === */
{
    manufacturer: "Douglas",
    model: "DC-4",
    year: 1942,
    range_nm: 2000,
    speed_kts: 227,
    seats: 44,
    mtow_kg: 29735,
    fuel_burn_kgph: 1200,
    price_original_usd: 750000,
    price_2025_usd: 13200000,
    price_acs_usd: 6200000,
    status: "active"
},

/* === Douglas DC-5 (1939) — raro pero real === */
{
    manufacturer: "Douglas",
    model: "DC-5",
    year: 1939,
    range_nm: 1200,
    speed_kts: 190,
    seats: 22,
    mtow_kg: 8165,
    fuel_burn_kgph: 420,
    price_original_usd: 125000,
    price_2025_usd: 2600000,
    price_acs_usd: 1500000,
    status: "active"
},

/* === Douglas DC-6 (1947) === */
{
    manufacturer: "Douglas",
    model: "DC-6",
    year: 1947,
    range_nm: 2550,
    speed_kts: 270,
    seats: 52,
    mtow_kg: 40823,
    fuel_burn_kgph: 1600,
    price_original_usd: 1150000,
    price_2025_usd: 15000000,
    price_acs_usd: 8000000,
    status: "active"
},

/* === Douglas DC-7 (1953) === */
{
    manufacturer: "Douglas",
    model: "DC-7",
    year: 1953,
    range_nm: 3600,
    speed_kts: 308,
    seats: 69,
    mtow_kg: 63500,
    fuel_burn_kgph: 2200,
    price_original_usd: 2200000,
    price_2025_usd: 25000000,
    price_acs_usd: 13000000,
    status: "active"
},

/* ============================================================
   TRANSICIÓN A LA ERA JET
   DC-8: primera familia jet de Douglas
   ============================================================ */

/* === Douglas DC-8 Series === */
/* DC-8-10 (1959) */
{
    manufacturer: "Douglas",
    model: "DC-8-10",
    year: 1959,
    range_nm: 2950,
    speed_kts: 483,
    seats: 125,
    mtow_kg: 120200,
    fuel_burn_kgph: 5200,
    price_original_usd: 5750000,
    price_2025_usd: 55000000,
    price_acs_usd: 30000000,
    status: "active"
},

/* DC-8-20 (1960) */
{
    manufacturer: "Douglas",
    model: "DC-8-20",
    year: 1960,
    range_nm: 3250,
    speed_kts: 500,
    seats: 130,
    mtow_kg: 124700,
    fuel_burn_kgph: 5000,
    price_original_usd: 6600000,
    price_2025_usd: 62500000,
    price_acs_usd: 33000000,
    status: "active"
},

/* DC-8-30 (1961) */
{
    manufacturer: "Douglas",
    model: "DC-8-30",
    year: 1961,
    range_nm: 3950,
    speed_kts: 540,
    seats: 146,
    mtow_kg: 147400,
    fuel_burn_kgph: 5200,
    price_original_usd: 7000000,
    price_2025_usd: 66000000,
    price_acs_usd: 34500000,
    status: "active"
},

/* DC-8-40 (1962) */
{
    manufacturer: "Douglas",
    model: "DC-8-40",
    year: 1962,
    range_nm: 4200,
    speed_kts: 550,
    seats: 152,
    mtow_kg: 151000,
    fuel_burn_kgph: 5200,
    price_original_usd: 7200000,
    price_2025_usd: 68000000,
    price_acs_usd: 35000000,
    status: "active"
},

/* DC-8-50 (1963) */
{
    manufacturer: "Douglas",
    model: "DC-8-50",
    year: 1963,
    range_nm: 4400,
    speed_kts: 560,
    seats: 162,
    mtow_kg: 158800,
    fuel_burn_kgph: 5100,
    price_original_usd: 7800000,
    price_2025_usd: 72000000,
    price_acs_usd: 38000000,
    status: "active"
},

/* DC-8-60 Series (Stretch) — 1965 */
{
    manufacturer: "Douglas",
    model: "DC-8-61",
    year: 1965,
    range_nm: 3250,
    speed_kts: 560,
    seats: 259,
    mtow_kg: 153300,
    fuel_burn_kgph: 5800,
    price_original_usd: 8500000,
    price_2025_usd: 78000000,
    price_acs_usd: 40000000,
    status: "active"
},
{
    manufacturer: "Douglas",
    model: "DC-8-62",
    year: 1967,
    range_nm: 5300,
    speed_kts: 560,
    seats: 189,
    mtow_kg: 158800,
    fuel_burn_kgph: 5400,
    price_original_usd: 9000000,
    price_2025_usd: 82000000,
    price_acs_usd: 42000000,
    status: "active"
},
{
    manufacturer: "Douglas",
    model: "DC-8-63",
    year: 1968,
    range_nm: 4900,
    speed_kts: 560,
    seats: 259,
    mtow_kg: 161000,
    fuel_burn_kgph: 5900,
    price_original_usd: 9500000,
    price_2025_usd: 86000000,
    price_acs_usd: 44500000,
    status: "active"
},

/* ============================================================
   DC-9 FAMILY (1965 → 1982)
   ============================================================ */

/* DC-9-10 (1965) */
{
    manufacturer: "Douglas",
    model: "DC-9-10",
    year: 1965,
    range_nm: 1150,
    speed_kts: 485,
    seats: 90,
    mtow_kg: 39500,
    fuel_burn_kgph: 3200,
    price_original_usd: 2400000,
    price_2025_usd: 21500000,
    price_acs_usd: 11000000,
    status: "active"
},

/* DC-9-20 (1968) */
{
    manufacturer: "Douglas",
    model: "DC-9-20",
    year: 1968,
    range_nm: 1500,
    speed_kts: 490,
    seats: 95,
    mtow_kg: 44452,
    fuel_burn_kgph: 3300,
    price_original_usd: 2600000,
    price_2025_usd: 23500000,
    price_acs_usd: 12000000,
    status: "active"
},

/* DC-9-30 (1967) */
{
    manufacturer: "Douglas",
    model: "DC-9-30",
    year: 1967,
    range_nm: 1500,
    speed_kts: 500,
    seats: 115,
    mtow_kg: 49895,
    fuel_burn_kgph: 3600,
    price_original_usd: 3100000,
    price_2025_usd: 26500000,
    price_acs_usd: 13500000,
    status: "active"
},

/* DC-9-40 (1968) */
{
    manufacturer: "Douglas",
    model: "DC-9-40",
    year: 1968,
    range_nm: 1500,
    speed_kts: 505,
    seats: 125,
    mtow_kg: 50299,
    fuel_burn_kgph: 3800,
    price_original_usd: 3300000,
    price_2025_usd: 28500000,
    price_acs_usd: 14500000,
    status: "active"
},

/* DC-9-50 (1975) */
{
    manufacturer: "Douglas",
    model: "DC-9-50",
    year: 1975,
    range_nm: 1500,
    speed_kts: 510,
    seats: 139,
    mtow_kg: 54500,
    fuel_burn_kgph: 4000,
    price_original_usd: 3600000,
    price_2025_usd: 30000000,
    price_acs_usd: 16000000,
    status: "active"
},

/* ============================================================
   DC-10 (1970) — última gran familia Douglas
   ============================================================ */

/* DC-10-10 (1970) */
{
    manufacturer: "Douglas",
    model: "DC-10-10",
    year: 1970,
    range_nm: 3150,
    speed_kts: 490,
    seats: 250,
    mtow_kg: 238000,
    fuel_burn_kgph: 9500,
    price_original_usd: 20000000,
    price_2025_usd: 125000000,
    price_acs_usd: 68000000,
    status: "active"
},

/* DC-10-30 (1972) */
{
    manufacturer: "Douglas",
    model: "DC-10-30",
    year: 1972,
    range_nm: 5200,
    speed_kts: 510,
    seats: 270,
    mtow_kg: 263000,
    fuel_burn_kgph: 10200,
    price_original_usd: 24500000,
    price_2025_usd: 150000000,
    price_acs_usd: 72000000,
    status: "active"
}

]; // FIN PARTE 1

/* Exportar base */
window.ACS_AIRCRAFT_DB = ACS_AIRCRAFT_DB;
/* ------------------------------------------------------------
   LOCKHEED — Innovación clásica hasta la era widebody (1934→1984)
   ------------------------------------------------------------ */

/* === Lockheed L-10 Electra (1934) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-10 Electra",
    year: 1934,
    range_nm: 713,
    speed_kts: 190,
    seats: 10,
    mtow_kg: 4760,
    fuel_burn_kgph: 300,
    price_original_usd: 60000,
    price_2025_usd: 1400000,
    price_acs_usd: 1000000,
    status: "active"
});

/* === Lockheed L-14 Super Electra (1937) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-14 Super Electra",
    year: 1937,
    range_nm: 1570,
    speed_kts: 230,
    seats: 14,
    mtow_kg: 7938,
    fuel_burn_kgph: 500,
    price_original_usd: 115000,
    price_2025_usd: 2500000,
    price_acs_usd: 1600000,
    status: "active"
});

/* === Lockheed L-18 Lodestar (1940) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-18 Lodestar",
    year: 1940,
    range_nm: 1800,
    speed_kts: 245,
    seats: 18,
    mtow_kg: 7257,
    fuel_burn_kgph: 550,
    price_original_usd: 135000,
    price_2025_usd: 2600000,
    price_acs_usd: 1800000,
    status: "active"
});

/* === Lockheed L-049 Constellation (1943) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-049 Constellation",
    year: 1943,
    range_nm: 2500,
    speed_kts: 300,
    seats: 44,
    mtow_kg: 40100,
    fuel_burn_kgph: 1500,
    price_original_usd: 650000,
    price_2025_usd: 10200000,
    price_acs_usd: 5500000,
    status: "active"
});

/* === Lockheed L-649 (1946) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-649 Constellation",
    year: 1946,
    range_nm: 2650,
    speed_kts: 300,
    seats: 52,
    mtow_kg: 39700,
    fuel_burn_kgph: 1600,
    price_original_usd: 850000,
    price_2025_usd: 12000000,
    price_acs_usd: 6500000,
    status: "active"
});

/* === Lockheed L-749 Constellation (1947) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-749 Constellation",
    year: 1947,
    range_nm: 4050,
    speed_kts: 315,
    seats: 60,
    mtow_kg: 43100,
    fuel_burn_kgph: 1650,
    price_original_usd: 975000,
    price_2025_usd: 13500000,
    price_acs_usd: 7200000,
    status: "active"
});

/* === Lockheed L-1049 Super Constellation (1951) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-1049 Super Constellation",
    year: 1951,
    range_nm: 5200,
    speed_kts: 330,
    seats: 86,
    mtow_kg: 66000,
    fuel_burn_kgph: 2400,
    price_original_usd: 2250000,
    price_2025_usd: 25000000,
    price_acs_usd: 13500000,
    status: "active"
});

/* === Lockheed L-1649 Starliner (1957) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-1649 Starliner",
    year: 1957,
    range_nm: 6100,
    speed_kts: 345,
    seats: 99,
    mtow_kg: 73000,
    fuel_burn_kgph: 2600,
    price_original_usd: 2950000,
    price_2025_usd: 30000000,
    price_acs_usd: 15500000,
    status: "active"
});

/* === Lockheed L-188 Electra (1959) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-188 Electra",
    year: 1959,
    range_nm: 2200,
    speed_kts: 355,
    seats: 98,
    mtow_kg: 47400,
    fuel_burn_kgph: 2200,
    price_original_usd: 1750000,
    price_2025_usd: 15500000,
    price_acs_usd: 9000000,
    status: "active"
});

/* ============================================================
   LOCKHEED L-1011 — TRISTAR (1972 → 1984)
   ============================================================ */

/* === L-1011-1 (1972) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-1011-1 Tristar",
    year: 1972,
    range_nm: 2700,
    speed_kts: 520,
    seats: 256,
    mtow_kg: 195000,
    fuel_burn_kgph: 9300,
    price_original_usd: 24000000,
    price_2025_usd: 150000000,
    price_acs_usd: 78000000,
    status: "active"
});

/* === L-1011-100 (1973) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-1011-100",
    year: 1973,
    range_nm: 3100,
    speed_kts: 520,
    seats: 256,
    mtow_kg: 195000,
    fuel_burn_kgph: 9400,
    price_original_usd: 25500000,
    price_2025_usd: 155000000,
    price_acs_usd: 81000000,
    status: "active"
});

/* === L-1011-200 (1975) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-1011-200",
    year: 1975,
    range_nm: 3800,
    speed_kts: 520,
    seats: 256,
    mtow_kg: 215000,
    fuel_burn_kgph: 9650,
    price_original_usd: 26500000,
    price_2025_usd: 162000000,
    price_acs_usd: 85000000,
    status: "active"
});

/* === L-1011-500 (1979) — Long Range === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lockheed",
    model: "L-1011-500",
    year: 1979,
    range_nm: 5100,
    speed_kts: 520,
    seats: 246,
    mtow_kg: 230000,
    fuel_burn_kgph: 9800,
    price_original_usd: 28000000,
    price_2025_usd: 171000000,
    price_acs_usd: 90000000,
    status: "active"
});
/* ------------------------------------------------------------
   CONVAIR — Pistón, Turbohélice y Jet de Alta Velocidad (1948→1963)
   ------------------------------------------------------------ */

/* === Convair CV-240 (1948) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Convair",
    model: "CV-240",
    year: 1948,
    range_nm: 1300,
    speed_kts: 255,
    seats: 40,
    mtow_kg: 17900,
    fuel_burn_kgph: 950,
    price_original_usd: 275000,
    price_2025_usd: 3100000,
    price_acs_usd: 1900000,
    status: "active"
});

/* === Convair CV-340 (1951) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Convair",
    model: "CV-340",
    year: 1951,
    range_nm: 1550,
    speed_kts: 260,
    seats: 44,
    mtow_kg: 21300,
    fuel_burn_kgph: 1100,
    price_original_usd: 325000,
    price_2025_usd: 3500000,
    price_acs_usd: 2100000,
    status: "active"
});

/* === Convair CV-440 Metropolitan (1956) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Convair",
    model: "CV-440 Metropolitan",
    year: 1956,
    range_nm: 1700,
    speed_kts: 265,
    seats: 52,
    mtow_kg: 22800,
    fuel_burn_kgph: 1200,
    price_original_usd: 375000,
    price_2025_usd: 4100000,
    price_acs_usd: 2400000,
    status: "active"
});

/* ============================================================
   JET ERA — Convair 880 & 990 (1960–1963)
   ============================================================ */

/* === Convair 880 (1960) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Convair",
    model: "Convair 880",
    year: 1960,
    range_nm: 3300,
    speed_kts: 525,
    seats: 88,
    mtow_kg: 72500,
    fuel_burn_kgph: 5400,
    price_original_usd: 5500000,
    price_2025_usd: 52000000,
    price_acs_usd: 30000000,
    status: "active"
});

/* === Convair 990 Coronado (1963) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Convair",
    model: "Convair 990 Coronado",
    year: 1963,
    range_nm: 3400,
    speed_kts: 540,
    seats: 96,
    mtow_kg: 77000,
    fuel_burn_kgph: 5800,
    price_original_usd: 6700000,
    price_2025_usd: 62000000,
    price_acs_usd: 34000000,
    status: "active"
});
/* ------------------------------------------------------------
   McDONNELL DOUGLAS — Era Jet Moderna (1980 → 1998)
   ------------------------------------------------------------ */

/* === MD-81 (1980) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "McDonnell Douglas",
    model: "MD-81",
    year: 1980,
    range_nm: 1500,
    speed_kts: 485,
    seats: 155,
    mtow_kg: 63500,
    fuel_burn_kgph: 3850,
    price_original_usd: 23000000,
    price_2025_usd: 74000000,
    price_acs_usd: 40000000,
    status: "active"
});

/* === MD-82 (1981) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "McDonnell Douglas",
    model: "MD-82",
    year: 1981,
    range_nm: 1850,
    speed_kts: 485,
    seats: 155,
    mtow_kg: 67700,
    fuel_burn_kgph: 4000,
    price_original_usd: 24500000,
    price_2025_usd: 78000000,
    price_acs_usd: 42000000,
    status: "active"
});

/* === MD-83 (1985) — extended range === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "McDonnell Douglas",
    model: "MD-83",
    year: 1985,
    range_nm: 2500,
    speed_kts: 485,
    seats: 155,
    mtow_kg: 72500,
    fuel_burn_kgph: 4150,
    price_original_usd: 26500000,
    price_2025_usd: 82000000,
    price_acs_usd: 44000000,
    status: "active"
});

/* === MD-87 (1987) — shorter fuselage === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "McDonnell Douglas",
    model: "MD-87",
    year: 1987,
    range_nm: 2650,
    speed_kts: 485,
    seats: 130,
    mtow_kg: 69000,
    fuel_burn_kgph: 3950,
    price_original_usd: 28500000,
    price_2025_usd: 86000000,
    price_acs_usd: 45000000,
    status: "active"
});

/* === MD-88 (1988) — advanced avionics === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "McDonnell Douglas",
    model: "MD-88",
    year: 1988,
    range_nm: 2200,
    speed_kts: 485,
    seats: 155,
    mtow_kg: 71000,
    fuel_burn_kgph: 4100,
    price_original_usd: 30000000,
    price_2025_usd: 90000000,
    price_acs_usd: 48000000,
    status: "active"
});

/* ============================================================
   MD-90 SERIES (1995)
   ============================================================ */

/* === MD-90-30 (1995) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "McDonnell Douglas",
    model: "MD-90-30",
    year: 1995,
    range_nm: 2400,
    speed_kts: 485,
    seats: 158,
    mtow_kg: 75000,
    fuel_burn_kgph: 3600,
    price_original_usd: 36000000,
    price_2025_usd: 110000000,
    price_acs_usd: 58000000,
    status: "active"
});

/* ============================================================
   MD-11 (1990) — versión de pasajeros
   ============================================================ */

/* === MD-11 (1990) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "McDonnell Douglas",
    model: "MD-11",
    year: 1990,
    range_nm: 6750,
    speed_kts: 485,
    seats: 285,
    mtow_kg: 285990,
    fuel_burn_kgph: 11000,
    price_original_usd: 90000000,
    price_2025_usd: 190000000,
    price_acs_usd: 98000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOEING — 737 NEXT GENERATION (1997 → 2010)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "737-600",
    year: 1997,
    range_nm: 3050,
    speed_kts: 485,
    seats: 110,
    mtow_kg: 65800,
    fuel_burn_kgph: 2900,
    price_original_usd: 38000000,
    price_2025_usd: 112000000,
    price_acs_usd: 60000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "737-700",
    year: 1997,
    range_nm: 3200,
    speed_kts: 485,
    seats: 140,
    mtow_kg: 70300,
    fuel_burn_kgph: 3000,
    price_original_usd: 42000000,
    price_2025_usd: 120000000,
    price_acs_usd: 64000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "737-800",
    year: 1998,
    range_nm: 2900,
    speed_kts: 485,
    seats: 162,
    mtow_kg: 79000,
    fuel_burn_kgph: 3200,
    price_original_usd: 48000000,
    price_2025_usd: 142000000,
    price_acs_usd: 72000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "737-900",
    year: 2001,
    range_nm: 2950,
    speed_kts: 485,
    seats: 180,
    mtow_kg: 85000,
    fuel_burn_kgph: 3300,
    price_original_usd: 51500000,
    price_2025_usd: 150000000,
    price_acs_usd: 76000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOEING — 737 MAX SERIES (2017 → 2024)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "737 MAX 7",
    year: 2017,
    range_nm: 3850,
    speed_kts: 485,
    seats: 153,
    mtow_kg: 82600,
    fuel_burn_kgph: 2700,
    price_original_usd: 82000000,
    price_2025_usd: 102000000,
    price_acs_usd: 76000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "737 MAX 8",
    year: 2017,
    range_nm: 3550,
    speed_kts: 485,
    seats: 178,
    mtow_kg: 82000,
    fuel_burn_kgph: 2800,
    price_original_usd: 97500000,
    price_2025_usd: 124000000,
    price_acs_usd: 86000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "737 MAX 9",
    year: 2018,
    range_nm: 3600,
    speed_kts: 485,
    seats: 193,
    mtow_kg: 88200,
    fuel_burn_kgph: 2850,
    price_original_usd: 110000000,
    price_2025_usd: 135000000,
    price_acs_usd: 91000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "737 MAX 10",
    year: 2024,
    range_nm: 3300,
    speed_kts: 485,
    seats: 230,
    mtow_kg: 89800,
    fuel_burn_kgph: 2900,
    price_original_usd: 120000000,
    price_2025_usd: 148000000,
    price_acs_usd: 98000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOEING — 747 FAMILY (1970 → 2012)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "747-100",
    year: 1970,
    range_nm: 4500,
    speed_kts: 490,
    seats: 366,
    mtow_kg: 333000,
    fuel_burn_kgph: 20000,
    price_original_usd: 24000000,
    price_2025_usd: 150000000,
    price_acs_usd: 80000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOEING — 747 FAMILY (1970 → 2012)
   ------------------------------------------------------------ */

/* === 747-100 (1970) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "747-100",
    year: 1970,
    range_nm: 4500,
    speed_kts: 490,
    seats: 366,
    mtow_kg: 333000,
    fuel_burn_kgph: 20000,
    price_original_usd: 24000000,
    price_2025_usd: 150000000,
    price_acs_usd: 80000000,
    status: "active"
});

/* === 747-200 (1971) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "747-200",
    year: 1971,
    range_nm: 6050,
    speed_kts: 500,
    seats: 380,
    mtow_kg: 377000,
    fuel_burn_kgph: 21000,
    price_original_usd: 28000000,
    price_2025_usd: 165000000,
    price_acs_usd: 88000000,
    status: "active"
});

/* === 747-300 (1983) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "747-300",
    year: 1983,
    range_nm: 6550,
    speed_kts: 500,
    seats: 412,
    mtow_kg: 377840,
    fuel_burn_kgph: 21500,
    price_original_usd: 90000000,
    price_2025_usd: 260000000,
    price_acs_usd: 130000000,
    status: "active"
});

/* === 747-400 (1989) — Iconic Long Range === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "747-400",
    year: 1989,
    range_nm: 7260,
    speed_kts: 510,
    seats: 416,
    mtow_kg: 396900,
    fuel_burn_kgph: 23000,
    price_original_usd: 150000000,
    price_2025_usd: 310000000,
    price_acs_usd: 160000000,
    status: "active"
});

/* === 747-8 Intercontinental (2012) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "747-8 Intercontinental",
    year: 2012,
    range_nm: 7730,
    speed_kts: 516,
    seats: 467,
    mtow_kg: 447700,
    fuel_burn_kgph: 25000,
    price_original_usd: 387000000,
    price_2025_usd: 420000000,
    price_acs_usd: 240000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOEING — 757 FAMILY (1982 → 1999)
   ------------------------------------------------------------ */

/* === 757-200 (1982) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "757-200",
    year: 1982,
    range_nm: 3900,
    speed_kts: 450,
    seats: 200,
    mtow_kg: 115680,
    fuel_burn_kgph: 5400,
    price_original_usd: 50000000,
    price_2025_usd: 155000000,
    price_acs_usd: 80000000,
    status: "active"
});

/* === 757-300 (1999) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "757-300",
    year: 1999,
    range_nm: 3300,
    speed_kts: 450,
    seats: 243,
    mtow_kg: 124000,
    fuel_burn_kgph: 6000,
    price_original_usd: 65000000,
    price_2025_usd: 170000000,
    price_acs_usd: 90000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOEING — 767 FAMILY (1982 → 2000)
   ------------------------------------------------------------ */

/* === 767-200 (1982) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "767-200",
    year: 1982,
    range_nm: 3850,
    speed_kts: 480,
    seats: 216,
    mtow_kg: 142880,
    fuel_burn_kgph: 7800,
    price_original_usd: 55000000,
    price_2025_usd: 155000000,
    price_acs_usd: 82000000,
    status: "active"
});

/* === 767-300ER (1988) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "767-300ER",
    year: 1988,
    range_nm: 5985,
    speed_kts: 480,
    seats: 269,
    mtow_kg: 186880,
    fuel_burn_kgph: 8200,
    price_original_usd: 90000000,
    price_2025_usd: 200000000,
    price_acs_usd: 110000000,
    status: "active"
});

/* === 767-400ER (2000) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "767-400ER",
    year: 2000,
    range_nm: 5610,
    speed_kts: 480,
    seats: 304,
    mtow_kg: 204000,
    fuel_burn_kgph: 8500,
    price_original_usd: 145000000,
    price_2025_usd: 235000000,
    price_acs_usd: 130000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOEING — 777 FAMILY (1995 → 2015)
   ------------------------------------------------------------ */

/* === 777-200 (1995) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "777-200",
    year: 1995,
    range_nm: 5235,
    speed_kts: 495,
    seats: 305,
    mtow_kg: 247200,
    fuel_burn_kgph: 9500,
    price_original_usd: 165000000,
    price_2025_usd: 260000000,
    price_acs_usd: 140000000,
    status: "active"
});

/* === 777-200ER (1997) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "777-200ER",
    year: 1997,
    range_nm: 7700,
    speed_kts: 495,
    seats: 314,
    mtow_kg: 297500,
    fuel_burn_kgph: 9800,
    price_original_usd: 185000000,
    price_2025_usd: 290000000,
    price_acs_usd: 155000000,
    status: "active"
});

/* === 777-200LR (2006) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "777-200LR",
    year: 2006,
    range_nm: 9395,
    speed_kts: 495,
    seats: 317,
    mtow_kg: 347450,
    fuel_burn_kgph: 10000,
    price_original_usd: 240000000,
    price_2025_usd: 320000000,
    price_acs_usd: 175000000,
    status: "active"
});

/* === 777-300 (1998) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "777-300",
    year: 1998,
    range_nm: 6005,
    speed_kts: 495,
    seats: 368,
    mtow_kg: 299370,
    fuel_burn_kgph: 10050,
    price_original_usd: 200000000,
    price_2025_usd: 300000000,
    price_acs_usd: 160000000,
    status: "active"
});

/* === 777-300ER (2004) — KING OF LONG RANGE === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "777-300ER",
    year: 2004,
    range_nm: 7370,
    speed_kts: 495,
    seats: 396,
    mtow_kg: 351534,
    fuel_burn_kgph: 10200,
    price_original_usd: 320000000,
    price_2025_usd: 380000000,
    price_acs_usd: 210000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOEING — 787 DREAMLINER FAMILY (2011 → 2019)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "787-8",
    year: 2011,
    range_nm: 7635,
    speed_kts: 488,
    seats: 248,
    mtow_kg: 227930,
    fuel_burn_kgph: 5200,
    price_original_usd: 248000000,
    price_2025_usd: 260000000,
    price_acs_usd: 180000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "787-9",
    year: 2014,
    range_nm: 7600,
    speed_kts: 488,
    seats: 296,
    mtow_kg: 254011,
    fuel_burn_kgph: 5500,
    price_original_usd: 292000000,
    price_2025_usd: 315000000,
    price_acs_usd: 210000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Boeing",
    model: "787-10",
    year: 2019,
    range_nm: 6430,
    speed_kts: 488,
    seats: 336,
    mtow_kg: 254000,
    fuel_burn_kgph: 5800,
    price_original_usd: 338000000,
    price_2025_usd: 350000000,
    price_acs_usd: 240000000,
    status: "active"
});
/* ------------------------------------------------------------
   AIRBUS — COMPLETE FAMILY (1972 → 2024)
   ------------------------------------------------------------ */

/* ============================================================
   A300 FAMILY (1972 → 1985)
   ============================================================ */

/* === Airbus A300B2 (1972) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A300B2",
    year: 1972,
    range_nm: 2000,
    speed_kts: 470,
    seats: 266,
    mtow_kg: 137000,
    fuel_burn_kgph: 7500,
    price_original_usd: 35000000,
    price_2025_usd: 90000000,
    price_acs_usd: 50000000,
    status: "active"
});

/* === Airbus A300B4 (1974) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A300B4",
    year: 1974,
    range_nm: 2600,
    speed_kts: 470,
    seats: 266,
    mtow_kg: 157000,
    fuel_burn_kgph: 7800,
    price_original_usd: 45000000,
    price_2025_usd: 105000000,
    price_acs_usd: 58000000,
    status: "active"
});

/* === Airbus A310-200 (1983) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A310-200",
    year: 1983,
    range_nm: 3900,
    speed_kts: 470,
    seats: 247,
    mtow_kg: 150000,
    fuel_burn_kgph: 6500,
    price_original_usd: 55000000,
    price_2025_usd: 125000000,
    price_acs_usd: 65000000,
    status: "active"
});

/* === Airbus A310-300 (1985) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A310-300",
    year: 1985,
    range_nm: 5200,
    speed_kts: 470,
    seats: 247,
    mtow_kg: 164000,
    fuel_burn_kgph: 6900,
    price_original_usd: 60000000,
    price_2025_usd: 135000000,
    price_acs_usd: 70000000,
    status: "active"
});
/* ------------------------------------------------------------
   AIRBUS — A320 CLASSIC (CEO) (1987 → 2005)
   ------------------------------------------------------------ */

/* === A318-100 (2003) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A318-100",
    year: 2003,
    range_nm: 3100,
    speed_kts: 470,
    seats: 107,
    mtow_kg: 68000,
    fuel_burn_kgph: 2500,
    price_original_usd: 60000000,
    price_2025_usd: 90000000,
    price_acs_usd: 50000000,
    status: "active"
});

/* === A319-100 (1996) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A319-100",
    year: 1996,
    range_nm: 3700,
    speed_kts: 470,
    seats: 134,
    mtow_kg: 75500,
    fuel_burn_kgph: 2600,
    price_original_usd: 62000000,
    price_2025_usd: 95000000,
    price_acs_usd: 52000000,
    status: "active"
});

/* === A320-200 (1988) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A320-200",
    year: 1988,
    range_nm: 3300,
    speed_kts: 470,
    seats: 150,
    mtow_kg: 77000,
    fuel_burn_kgph: 2700,
    price_original_usd: 65000000,
    price_2025_usd: 100000000,
    price_acs_usd: 55000000,
    status: "active"
});

/* === A321-100 (1994) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A321-100",
    year: 1994,
    range_nm: 2300,
    speed_kts: 470,
    seats: 185,
    mtow_kg: 83000,
    fuel_burn_kgph: 3000,
    price_original_usd: 75000000,
    price_2025_usd: 115000000,
    price_acs_usd: 62000000,
    status: "active"
});

/* === A321-200 (1996) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A321-200",
    year: 1996,
    range_nm: 3000,
    speed_kts: 470,
    seats: 185,
    mtow_kg: 93500,
    fuel_burn_kgph: 3200,
    price_original_usd: 80000000,
    price_2025_usd: 125000000,
    price_acs_usd: 66000000,
    status: "active"
});
/* ------------------------------------------------------------
   AIRBUS — A320 NEO FAMILY (2016 → 2024)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A319neo",
    year: 2018,
    range_nm: 3900,
    speed_kts: 470,
    seats: 140,
    mtow_kg: 75500,
    fuel_burn_kgph: 2200,
    price_original_usd: 99000000,
    price_2025_usd: 115000000,
    price_acs_usd: 72000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A320neo",
    year: 2016,
    range_nm: 3500,
    speed_kts: 470,
    seats: 150,
    mtow_kg: 79000,
    fuel_burn_kgph: 2250,
    price_original_usd: 110000000,
    price_2025_usd: 130000000,
    price_acs_usd: 78000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A321neo",
    year: 2017,
    range_nm: 4000,
    speed_kts: 470,
    seats: 185,
    mtow_kg: 94000,
    fuel_burn_kgph: 2400,
    price_original_usd: 125000000,
    price_2025_usd: 150000000,
    price_acs_usd: 90000000,
    status: "active"
});

/* === A321LR (2018) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A321LR",
    year: 2018,
    range_nm: 4200,
    speed_kts: 470,
    seats: 185,
    mtow_kg: 97100,
    fuel_burn_kgph: 2450,
    price_original_usd: 130000000,
    price_2025_usd: 160000000,
    price_acs_usd: 95000000,
    status: "active"
});

/* === A321XLR (2024) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A321XLR",
    year: 2024,
    range_nm: 4700,
    speed_kts: 470,
    seats: 199,
    mtow_kg: 101000,
    fuel_burn_kgph: 2500,
    price_original_usd: 150000000,
    price_2025_usd: 180000000,
    price_acs_usd: 110000000,
    status: "active"
});
/* ------------------------------------------------------------
   AIRBUS — A330 FAMILY (1994 → 2020)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A330-200",
    year: 1998,
    range_nm: 7200,
    speed_kts: 470,
    seats: 247,
    mtow_kg: 242000,
    fuel_burn_kgph: 6000,
    price_original_usd: 120000000,
    price_2025_usd: 220000000,
    price_acs_usd: 120000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A330-300",
    year: 1994,
    range_nm: 6350,
    speed_kts: 470,
    seats: 300,
    mtow_kg: 242000,
    fuel_burn_kgph: 6200,
    price_original_usd: 130000000,
    price_2025_usd: 230000000,
    price_acs_usd: 130000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A330-800neo",
    year: 2020,
    range_nm: 7500,
    speed_kts: 470,
    seats: 260,
    mtow_kg: 251000,
    fuel_burn_kgph: 5600,
    price_original_usd: 260000000,
    price_2025_usd: 280000000,
    price_acs_usd: 155000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A330-900neo",
    year: 2018,
    range_nm: 6550,
    speed_kts: 470,
    seats: 310,
    mtow_kg: 251000,
    fuel_burn_kgph: 5800,
    price_original_usd: 296000000,
    price_2025_usd: 315000000,
    price_acs_usd: 170000000,
    status: "active"
});
/* ------------------------------------------------------------
   AIRBUS — A340 FAMILY (1993 → 2005)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A340-200",
    year: 1993,
    range_nm: 7100,
    speed_kts: 470,
    seats: 261,
    mtow_kg: 253500,
    fuel_burn_kgph: 11500,
    price_original_usd: 125000000,
    price_2025_usd: 210000000,
    price_acs_usd: 115000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A340-300",
    year: 1993,
    range_nm: 7600,
    speed_kts: 470,
    seats: 295,
    mtow_kg: 275000,
    fuel_burn_kgph: 12000,
    price_original_usd: 140000000,
    price_2025_usd: 230000000,
    price_acs_usd: 130000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A340-500",
    year: 2002,
    range_nm: 9000,
    speed_kts: 470,
    seats: 313,
    mtow_kg: 372000,
    fuel_burn_kgph: 13000,
    price_original_usd: 190000000,
    price_2025_usd: 290000000,
    price_acs_usd: 160000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A340-600",
    year: 2001,
    range_nm: 7600,
    speed_kts: 470,
    seats: 380,
    mtow_kg: 380000,
    fuel_burn_kgph: 13800,
    price_original_usd: 215000000,
    price_2025_usd: 320000000,
    price_acs_usd: 170000000,
    status: "active"
});
/* ------------------------------------------------------------
   AIRBUS — A350 FAMILY (2015 → 2024)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A350-900",
    year: 2015,
    range_nm: 8100,
    speed_kts: 488,
    seats: 325,
    mtow_kg: 280000,
    fuel_burn_kgph: 5600,
    price_original_usd: 317000000,
    price_2025_usd: 330000000,
    price_acs_usd: 220000000,
    status: "active"
});

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A350-1000",
    year: 2018,
    range_nm: 8400,
    speed_kts: 488,
    seats: 366,
    mtow_kg: 316000,
    fuel_burn_kgph: 6000,
    price_original_usd: 366000000,
    price_2025_usd: 380000000,
    price_acs_usd: 250000000,
    status: "active"
});
/* ------------------------------------------------------------
   AIRBUS — A380 (2007 → 2021)
   ------------------------------------------------------------ */

ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus",
    model: "A380-800",
    year: 2007,
    range_nm: 8000,
    speed_kts: 490,
    seats: 575,
    mtow_kg: 575000,
    fuel_burn_kgph: 23000,
    price_original_usd: 445000000,
    price_2025_usd: 480000000,
    price_acs_usd: 300000000,
    status: "active"
});
/* ------------------------------------------------------------
   EMBRAER — COMPLETE REGIONAL FAMILY (1996 → 2024)
   ------------------------------------------------------------ */

/* ============================================================
   ERJ FAMILY (1996 → 2002)
   ============================================================ */

/* === ERJ-135LR (1996) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "ERJ-135LR",
    year: 1996,
    range_nm: 1750,
    speed_kts: 430,
    seats: 37,
    mtow_kg: 20000,
    fuel_burn_kgph: 1150,
    price_original_usd: 13000000,
    price_2025_usd: 26000000,
    price_acs_usd: 16000000,
    status: "active"
});

/* === ERJ-140LR (2001) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "ERJ-140LR",
    year: 2001,
    range_nm: 1700,
    speed_kts: 430,
    seats: 44,
    mtow_kg: 20700,
    fuel_burn_kgph: 1180,
    price_original_usd: 14500000,
    price_2025_usd: 28000000,
    price_acs_usd: 17000000,
    status: "active"
});

/* === ERJ-145LR (1997) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "ERJ-145LR",
    year: 1997,
    range_nm: 1550,
    speed_kts: 430,
    seats: 50,
    mtow_kg: 22000,
    fuel_burn_kgph: 1250,
    price_original_usd: 16000000,
    price_2025_usd: 30000000,
    price_acs_usd: 18500000,
    status: "active"
});


/* ============================================================
   E-JETS GENERATION 1 (2004 → 2014)
   ============================================================ */

/* === Embraer 170 (E170-100) (2004) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "E170-100",
    year: 2004,
    range_nm: 2050,
    speed_kts: 445,
    seats: 70,
    mtow_kg: 37000,
    fuel_burn_kgph: 1700,
    price_original_usd: 25000000,
    price_2025_usd: 50000000,
    price_acs_usd: 30000000,
    status: "active"
});

/* === Embraer 175 (E175-100) (2005) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "E175-100",
    year: 2005,
    range_nm: 2150,
    speed_kts: 445,
    seats: 78,
    mtow_kg: 38500,
    fuel_burn_kgph: 1750,
    price_original_usd: 28500000,
    price_2025_usd: 55000000,
    price_acs_usd: 33000000,
    status: "active"
});

/* === Embraer 190 (E190-100) (2005) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "E190-100",
    year: 2005,
    range_nm: 2450,
    speed_kts: 450,
    seats: 100,
    mtow_kg: 51000,
    fuel_burn_kgph: 2100,
    price_original_usd: 36000000,
    price_2025_usd: 62000000,
    price_acs_usd: 38000000,
    status: "active"
});

/* === Embraer 195 (E195-100) (2006) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "E195-100",
    year: 2006,
    range_nm: 2200,
    speed_kts: 450,
    seats: 118,
    mtow_kg: 52000,
    fuel_burn_kgph: 2200,
    price_original_usd: 40000000,
    price_2025_usd: 66000000,
    price_acs_usd: 42000000,
    status: "active"
});


/* ============================================================
   E-JETS GENERATION 2 — E2 FAMILY (2018 → 2024)
   ============================================================ */

/* === Embraer E190-E2 (2018) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "E190-E2",
    year: 2018,
    range_nm: 2850,
    speed_kts: 450,
    seats: 114,
    mtow_kg: 56200,
    fuel_burn_kgph: 1800,
    price_original_usd: 58000000,
    price_2025_usd: 65000000,
    price_acs_usd: 45000000,
    status: "active"
});

/* === Embraer E195-E2 (2019) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "E195-E2",
    year: 2019,
    range_nm: 2600,
    speed_kts: 450,
    seats: 146,
    mtow_kg: 61700,
    fuel_burn_kgph: 1900,
    price_original_usd: 63000000,
    price_2025_usd: 72000000,
    price_acs_usd: 50000000,
    status: "active"
});
/* ------------------------------------------------------------
   BOMBARDIER / CANADAIR — CRJ + DASH 8 (1984 → 2019)
   ------------------------------------------------------------ */

/* ============================================================
   CRJ SERIES (1992 → 2010)
   ============================================================ */

/* === CRJ-100 (1992) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "CRJ-100",
    year: 1992,
    range_nm: 1600,
    speed_kts: 430,
    seats: 50,
    mtow_kg: 21500,
    fuel_burn_kgph: 1200,
    price_original_usd: 21500000,
    price_2025_usd: 42000000,
    price_acs_usd: 26000000,
    status: "active"
});

/* === CRJ-200 (1996) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "CRJ-200",
    year: 1996,
    range_nm: 1700,
    speed_kts: 430,
    seats: 50,
    mtow_kg: 24000,
    fuel_burn_kgph: 1250,
    price_original_usd: 23500000,
    price_2025_usd: 46000000,
    price_acs_usd: 28000000,
    status: "active"
});

/* === CRJ-700 (2001) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "CRJ-700",
    year: 2001,
    range_nm: 1700,
    speed_kts: 450,
    seats: 66,
    mtow_kg: 34000,
    fuel_burn_kgph: 1450,
    price_original_usd: 31500000,
    price_2025_usd: 60000000,
    price_acs_usd: 36000000,
    status: "active"
});

/* === CRJ-900 (2003) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "CRJ-900",
    year: 2003,
    range_nm: 1800,
    speed_kts: 450,
    seats: 76,
    mtow_kg: 38000,
    fuel_burn_kgph: 1600,
    price_original_usd: 37500000,
    price_2025_usd: 70000000,
    price_acs_usd: 40000000,
    status: "active"
});

/* === CRJ-1000 (2010) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "CRJ-1000",
    year: 2010,
    range_nm: 1800,
    speed_kts: 450,
    seats: 100,
    mtow_kg: 41200,
    fuel_burn_kgph: 1850,
    price_original_usd: 47000000,
    price_2025_usd: 78000000,
    price_acs_usd: 45000000,
    status: "active"
});


/* ============================================================
   DASH-8 / Q-SERIES (1984 → 2019)
   ============================================================ */

/* === Dash-8-100 (1984) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "De Havilland / Bombardier",
    model: "Dash-8-100",
    year: 1984,
    range_nm: 1100,
    speed_kts: 240,
    seats: 37,
    mtow_kg: 15600,
    fuel_burn_kgph: 750,
    price_original_usd: 11000000,
    price_2025_usd: 23000000,
    price_acs_usd: 14000000,
    status: "active"
});

/* === Dash-8-200 (1995) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "De Havilland / Bombardier",
    model: "Dash-8-200",
    year: 1995,
    range_nm: 1200,
    speed_kts: 250,
    seats: 39,
    mtow_kg: 16000,
    fuel_burn_kgph: 800,
    price_original_usd: 12500000,
    price_2025_usd: 26000000,
    price_acs_usd: 15000000,
    status: "active"
});

/* === Dash-8-300 (1989) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "De Havilland / Bombardier",
    model: "Dash-8-300",
    year: 1989,
    range_nm: 1350,
    speed_kts: 265,
    seats: 56,
    mtow_kg: 19000,
    fuel_burn_kgph: 1000,
    price_original_usd: 14000000,
    price_2025_usd: 30000000,
    price_acs_usd: 17000000,
    status: "active"
});

/* === Dash-8 Q400 (1999) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "De Havilland / Bombardier",
    model: "Dash-8 Q400",
    year: 1999,
    range_nm: 1350,
    speed_kts: 360,
    seats: 78,
    mtow_kg: 29000,
    fuel_burn_kgph: 1400,
    price_original_usd: 21500000,
    price_2025_usd: 42000000,
    price_acs_usd: 24000000,
    status: "active"
});
/* ------------------------------------------------------------
   ATR — TURBOPROP SERIES (1985 → 2024)
   ------------------------------------------------------------ */

/* ============================================================
   ATR 42 FAMILY
   ============================================================ */

/* === ATR 42-300 (1985) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "ATR",
    model: "ATR 42-300",
    year: 1985,
    range_nm: 800,
    speed_kts: 275,
    seats: 48,
    mtow_kg: 15500,
    fuel_burn_kgph: 750,
    price_original_usd: 8500000,
    price_2025_usd: 18000000,
    price_acs_usd: 11000000,
    status: "active"
});

/* === ATR 42-500 (1995) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "ATR",
    model: "ATR 42-500",
    year: 1995,
    range_nm: 900,
    speed_kts: 295,
    seats: 50,
    mtow_kg: 18200,
    fuel_burn_kgph: 800,
    price_original_usd: 11000000,
    price_2025_usd: 25000000,
    price_acs_usd: 14000000,
    status: "active"
});

/* === ATR 42-600 (2012) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "ATR",
    model: "ATR 42-600",
    year: 2012,
    range_nm: 950,
    speed_kts: 300,
    seats: 50,
    mtow_kg: 18600,
    fuel_burn_kgph: 760,
    price_original_usd: 15500000,
    price_2025_usd: 28000000,
    price_acs_usd: 16000000,
    status: "active"
});


/* ============================================================
   ATR 72 FAMILY
   ============================================================ */

/* === ATR 72-200 (1989) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "ATR",
    model: "ATR 72-200",
    year: 1989,
    range_nm: 825,
    speed_kts: 275,
    seats: 70,
    mtow_kg: 21000,
    fuel_burn_kgph: 950,
    price_original_usd: 13500000,
    price_2025_usd: 26000000,
    price_acs_usd: 15000000,
    status: "active"
});

/* === ATR 72-500 (1997) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "ATR",
    model: "ATR 72-500",
    year: 1997,
    range_nm: 900,
    speed_kts: 290,
    seats: 74,
    mtow_kg: 22500,
    fuel_burn_kgph: 1000,
    price_original_usd: 15000000,
    price_2025_usd: 29000000,
    price_acs_usd: 17000000,
    status: "active"
});

/* === ATR 72-600 (2010) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "ATR",
    model: "ATR 72-600",
    year: 2010,
    range_nm: 950,
    speed_kts: 295,
    seats: 78,
    mtow_kg: 23000,
    fuel_burn_kgph: 1050,
    price_original_usd: 25500000,
    price_2025_usd: 36000000,
    price_acs_usd: 21000000,
    status: "active"
});
/* ------------------------------------------------------------
   USSR / RUSSIA AIRCRAFT — Tupolev, Ilyushin, Antonov
   ------------------------------------------------------------ */

/* ============================================================
   TUPoLEV SERIES (1956 → 2015)
   ============================================================ */

/* === Tu-104 (1956) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-104",
    year: 1956,
    range_nm: 1600,
    speed_kts: 450,
    seats: 70,
    mtow_kg: 71500,
    fuel_burn_kgph: 7500,
    price_original_usd: 9000000,
    price_2025_usd: 36000000,
    price_acs_usd: 16000000,
    status: "retired"
});

/* === Tu-114 (1957) — turboprop gigante === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-114",
    year: 1957,
    range_nm: 5400,
    speed_kts: 400,
    seats: 170,
    mtow_kg: 164000,
    fuel_burn_kgph: 5200,
    price_original_usd: 14000000,
    price_2025_usd: 60000000,
    price_acs_usd: 26000000,
    status: "retired"
});

/* === Tu-124 (1962) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-124",
    year: 1962,
    range_nm: 1100,
    speed_kts: 420,
    seats: 56,
    mtow_kg: 38000,
    fuel_burn_kgph: 3000,
    price_original_usd: 5500000,
    price_2025_usd: 25000000,
    price_acs_usd: 13000000,
    status: "retired"
});

/* === Tu-134A/B (1967) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-134A/B",
    year: 1967,
    range_nm: 1250,
    speed_kts: 450,
    seats: 76,
    mtow_kg: 47000,
    fuel_burn_kgph: 4200,
    price_original_usd: 7800000,
    price_2025_usd: 32000000,
    price_acs_usd: 15000000,
    status: "active"
});

/* === Tu-154B (1975) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-154B",
    year: 1975,
    range_nm: 2200,
    speed_kts: 460,
    seats: 164,
    mtow_kg: 90000,
    fuel_burn_kgph: 6800,
    price_original_usd: 14000000,
    price_2025_usd: 50000000,
    price_acs_usd: 24000000,
    status: "active"
});

/* === Tu-154M (1984) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-154M",
    year: 1984,
    range_nm: 2600,
    speed_kts: 460,
    seats: 180,
    mtow_kg: 104000,
    fuel_burn_kgph: 6200,
    price_original_usd: 18000000,
    price_2025_usd: 58000000,
    price_acs_usd: 27000000,
    status: "active"
});

/* === Tu-204-100 (1990) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-204-100",
    year: 1990,
    range_nm: 2500,
    speed_kts: 455,
    seats: 164,
    mtow_kg: 103000,
    fuel_burn_kgph: 5200,
    price_original_usd: 42000000,
    price_2025_usd: 90000000,
    price_acs_usd: 50000000,
    status: "active"
});

/* === Tu-204-200 (1996) — long range === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-204-200",
    year: 1996,
    range_nm: 3600,
    speed_kts: 455,
    seats: 164,
    mtow_kg: 107000,
    fuel_burn_kgph: 5400,
    price_original_usd: 46000000,
    price_2025_usd: 98000000,
    price_acs_usd: 55000000,
    status: "active"
});

/* === Tu-214 (2001) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Tupolev",
    model: "Tu-214",
    year: 2001,
    range_nm: 4100,
    speed_kts: 455,
    seats: 164,
    mtow_kg: 110500,
    fuel_burn_kgph: 5300,
    price_original_usd: 52000000,
    price_2025_usd: 105000000,
    price_acs_usd: 58000000,
    status: "active"
});


/* ============================================================
   ILYUSHIN SERIES (1959 → 2010)
   ============================================================ */

/* === Il-18 (1959) — turboprop soviético === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Ilyushin",
    model: "Il-18",
    year: 1959,
    range_nm: 2500,
    speed_kts: 365,
    seats: 100,
    mtow_kg: 64000,
    fuel_burn_kgph: 3500,
    price_original_usd: 9000000,
    price_2025_usd: 28000000,
    price_acs_usd: 15000000,
    status: "retired"
});

/* === Il-62M (1971) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Ilyushin",
    model: "Il-62M",
    year: 1971,
    range_nm: 5200,
    speed_kts: 460,
    seats: 186,
    mtow_kg: 165000,
    fuel_burn_kgph: 8500,
    price_original_usd: 28000000,
    price_2025_usd: 88000000,
    price_acs_usd: 38000000,
    status: "active"
});

/* === Il-86 (1980) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Ilyushin",
    model: "Il-86",
    year: 1980,
    range_nm: 2600,
    speed_kts: 460,
    seats: 350,
    mtow_kg: 208000,
    fuel_burn_kgph: 11500,
    price_original_usd: 48000000,
    price_2025_usd: 120000000,
    price_acs_usd: 62000000,
    status: "active"
});

/* === Il-96-300 (1993) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Ilyushin",
    model: "Il-96-300",
    year: 1993,
    range_nm: 5100,
    speed_kts: 460,
    seats: 300,
    mtow_kg: 250000,
    fuel_burn_kgph: 9800,
    price_original_usd: 95000000,
    price_2025_usd: 170000000,
    price_acs_usd: 90000000,
    status: "active"
});


/* ============================================================
   ANTONOV SERIES (1960 → 2013)
   ============================================================ */

/* === An-24 (1960) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Antonov",
    model: "An-24",
    year: 1960,
    range_nm: 1000,
    speed_kts: 220,
    seats: 48,
    mtow_kg: 21000,
    fuel_burn_kgph: 1200,
    price_original_usd: 4500000,
    price_2025_usd: 18000000,
    price_acs_usd: 10000000,
    status: "active"
});

/* === An-26-100 Pax (1970) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Antonov",
    model: "An-26-100",
    year: 1970,
    range_nm: 1100,
    speed_kts: 230,
    seats: 40,
    mtow_kg: 24000,
    fuel_burn_kgph: 1400,
    price_original_usd: 5500000,
    price_2025_usd: 22000000,
    price_acs_usd: 12000000,
    status: "active"
});

/* === An-148 (2009) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Antonov",
    model: "An-148",
    year: 2009,
    range_nm: 1350,
    speed_kts: 430,
    seats: 80,
    mtow_kg: 43000,
    fuel_burn_kgph: 2200,
    price_original_usd: 25000000,
    price_2025_usd: 52000000,
    price_acs_usd: 30000000,
    status: "active"
});

/* === An-158 (2013) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Antonov",
    model: "An-158",
    year: 2013,
    range_nm: 1400,
    speed_kts: 430,
    seats: 99,
    mtow_kg: 43000,
    fuel_burn_kgph: 2250,
    price_original_usd: 32000000,
    price_2025_usd: 65000000,
    price_acs_usd: 35000000,
    status: "active"
});
/* ------------------------------------------------------------
   MODERN REGIONAL + NARROWBODY — SSJ, ARJ21, C919, MC-21
   ------------------------------------------------------------ */

/* ============================================================
   SUKHOI SUPERJET FAMILY (2011 → 2025)
   ============================================================ */

/* === SSJ100-75 (2012) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Sukhoi",
    model: "SSJ100-75",
    year: 2012,
    range_nm: 1300,
    speed_kts: 430,
    seats: 75,
    mtow_kg: 46000,
    fuel_burn_kgph: 2300,
    price_original_usd: 29000000,
    price_2025_usd: 45000000,
    price_acs_usd: 28000000,
    status: "active"
});

/* === SSJ100-95 (2011) — versión estándar === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Sukhoi",
    model: "SSJ100-95",
    year: 2011,
    range_nm: 1600,
    speed_kts: 435,
    seats: 98,
    mtow_kg: 48500,
    fuel_burn_kgph: 2400,
    price_original_usd: 35000000,
    price_2025_usd: 52000000,
    price_acs_usd: 31000000,
    status: "active"
});

/* === SSJ100-95LR (2013) — long range === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Sukhoi",
    model: "SSJ100-95LR",
    year: 2013,
    range_nm: 2450,
    speed_kts: 435,
    seats: 98,
    mtow_kg: 49500,
    fuel_burn_kgph: 2400,
    price_original_usd: 39000000,
    price_2025_usd: 58000000,
    price_acs_usd: 35000000,
    status: "active"
});



/* ============================================================
   COMAC — ARJ21 REGIONAL JET (2016 → 2025)
   ============================================================ */

/* === ARJ21-700 (2016) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "COMAC",
    model: "ARJ21-700",
    year: 2016,
    range_nm: 1200,
    speed_kts: 420,
    seats: 78,
    mtow_kg: 40500,
    fuel_burn_kgph: 2150,
    price_original_usd: 32000000,
    price_2025_usd: 45000000,
    price_acs_usd: 26000000,
    status: "active"
});

/* === ARJ21-900 (2020) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "COMAC",
    model: "ARJ21-900",
    year: 2020,
    range_nm: 1500,
    speed_kts: 420,
    seats: 90,
    mtow_kg: 42000,
    fuel_burn_kgph: 2250,
    price_original_usd: 35000000,
    price_2025_usd: 48000000,
    price_acs_usd: 28000000,
    status: "active"
});



/* ============================================================
   COMAC — C919 NARROWBODY (2021 → 2035)
   ============================================================ */

/* === C919-100 (2021) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "COMAC",
    model: "C919-100",
    year: 2021,
    range_nm: 3000,
    speed_kts: 450,
    seats: 168,
    mtow_kg: 72500,
    fuel_burn_kgph: 2600,
    price_original_usd: 65000000,
    price_2025_usd: 90000000,
    price_acs_usd: 52000000,
    status: "active"
});

/* === C919-200 (2028) — stretch version (future) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "COMAC",
    model: "C919-200",
    year: 2028,
    range_nm: 3000,
    speed_kts: 450,
    seats: 190,
    mtow_kg: 76000,
    fuel_burn_kgph: 2800,
    price_original_usd: 72000000,
    price_2025_usd: 98000000,
    price_acs_usd: 56000000,
    status: "active"
});



/* ============================================================
   IRKUT — MC-21 (2025 → FUTURE)
   ============================================================ */

/* === MC-21-200 (2025) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Irkut",
    model: "MC-21-200",
    year: 2025,
    range_nm: 2600,
    speed_kts: 450,
    seats: 148,
    mtow_kg: 72500,
    fuel_burn_kgph: 2500,
    price_original_usd: 70000000,
    price_2025_usd: 92000000,
    price_acs_usd: 55000000,
    status: "active"
});

/* === MC-21-300 (2025) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Irkut",
    model: "MC-21-300",
    year: 2025,
    range_nm: 3000,
    speed_kts: 450,
    seats: 165,
    mtow_kg: 79000,
    fuel_burn_kgph: 2600,
    price_original_usd: 78000000,
    price_2025_usd: 98000000,
    price_acs_usd: 60000000,
    status: "active"
});

/* === MC-21-400 (2030 est.) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Irkut",
    model: "MC-21-400",
    year: 2030,
    range_nm: 3000,
    speed_kts: 450,
    seats: 190,
    mtow_kg: 83000,
    fuel_burn_kgph: 2800,
    price_original_usd: 85000000,
    price_2025_usd: 104000000,
    price_acs_usd: 65000000,
    status: "active"
});
/* ------------------------------------------------------------
   REGIONAL & SPECIAL AIRCRAFT — BAe, Fokker, Saab, Dornier,
   Mitsubishi, Let, Yakovlev, Fairchild, CASA
   ------------------------------------------------------------ */


/* ============================================================
   BRITISH AEROSPACE (BAe / AVRO RJ)
   ============================================================ */

/* === BAe 146-100 (1983) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "British Aerospace",
    model: "BAe 146-100",
    year: 1983,
    range_nm: 1300,
    speed_kts: 430,
    seats: 82,
    mtow_kg: 39000,
    fuel_burn_kgph: 3000,
    price_original_usd: 20000000,
    price_2025_usd: 50000000,
    price_acs_usd: 25000000,
    status: "active"
});

/* === BAe 146-200 (1983) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "British Aerospace",
    model: "BAe 146-200",
    year: 1983,
    range_nm: 1500,
    speed_kts: 430,
    seats: 100,
    mtow_kg: 44000,
    fuel_burn_kgph: 3200,
    price_original_usd: 24000000,
    price_2025_usd: 55000000,
    price_acs_usd: 28000000,
    status: "active"
});

/* === BAe 146-300 (1988) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "British Aerospace",
    model: "BAe 146-300",
    year: 1988,
    range_nm: 1600,
    speed_kts: 430,
    seats: 116,
    mtow_kg: 46800,
    fuel_burn_kgph: 3400,
    price_original_usd: 26000000,
    price_2025_usd: 58000000,
    price_acs_usd: 30000000,
    status: "active"
});

/* === Avro RJ70 (1993) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Avro",
    model: "RJ70",
    year: 1993,
    range_nm: 1450,
    speed_kts: 430,
    seats: 70,
    mtow_kg: 39500,
    fuel_burn_kgph: 3000,
    price_original_usd: 28000000,
    price_2025_usd: 52000000,
    price_acs_usd: 26000000,
    status: "active"
});

/* === Avro RJ85 (1993) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Avro",
    model: "RJ85",
    year: 1993,
    range_nm: 1600,
    speed_kts: 430,
    seats: 85,
    mtow_kg: 42000,
    fuel_burn_kgph: 3100,
    price_original_usd: 30000000,
    price_2025_usd: 58000000,
    price_acs_usd: 30000000,
    status: "active"
});

/* === Avro RJ100 (1993) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Avro",
    model: "RJ100",
    year: 1993,
    range_nm: 1700,
    speed_kts: 430,
    seats: 100,
    mtow_kg: 44000,
    fuel_burn_kgph: 3300,
    price_original_usd: 32000000,
    price_2025_usd: 60000000,
    price_acs_usd: 32000000,
    status: "active"
});



/* ============================================================
   FOKKER AIRCRAFT
   ============================================================ */

/* === Fokker F27 Friendship (1958) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Fokker",
    model: "F27 Friendship",
    year: 1958,
    range_nm: 900,
    speed_kts: 235,
    seats: 48,
    mtow_kg: 19000,
    fuel_burn_kgph: 950,
    price_original_usd: 5500000,
    price_2025_usd: 24000000,
    price_acs_usd: 13000000,
    status: "retired"
});

/* === Fokker 50 (1985) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Fokker",
    model: "Fokker 50",
    year: 1985,
    range_nm: 1100,
    speed_kts: 245,
    seats: 56,
    mtow_kg: 20500,
    fuel_burn_kgph: 1000,
    price_original_usd: 12000000,
    price_2025_usd: 26000000,
    price_acs_usd: 14000000,
    status: "active"
});

/* === Fokker 70 (1993) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Fokker",
    model: "Fokker 70",
    year: 1993,
    range_nm: 1650,
    speed_kts: 440,
    seats: 80,
    mtow_kg: 41000,
    fuel_burn_kgph: 2800,
    price_original_usd: 26000000,
    price_2025_usd: 52000000,
    price_acs_usd: 30000000,
    status: "active"
});

/* === Fokker 100 (1986) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Fokker",
    model: "Fokker 100",
    year: 1986,
    range_nm: 1500,
    speed_kts: 440,
    seats: 109,
    mtow_kg: 45000,
    fuel_burn_kgph: 3000,
    price_original_usd: 28500000,
    price_2025_usd: 60000000,
    price_acs_usd: 33000000,
    status: "active"
});



/* ============================================================
   SAAB AIRCRAFT
   ============================================================ */

/* === Saab 340B (1983) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Saab",
    model: "Saab 340B",
    year: 1983,
    range_nm: 1030,
    speed_kts: 270,
    seats: 34,
    mtow_kg: 12900,
    fuel_burn_kgph: 700,
    price_original_usd: 8000000,
    price_2025_usd: 21000000,
    price_acs_usd: 12000000,
    status: "active"
});

/* === Saab 2000 (1994) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Saab",
    model: "Saab 2000",
    year: 1994,
    range_nm: 1350,
    speed_kts: 370,
    seats: 50,
    mtow_kg: 22000,
    fuel_burn_kgph: 1150,
    price_original_usd: 18000000,
    price_2025_usd: 38000000,
    price_acs_usd: 20000000,
    status: "active"
});



/* ============================================================
   DORNIER AIRCRAFT
   ============================================================ */

/* === Dornier 328-100 (1993) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Dornier",
    model: "Dornier 328-100",
    year: 1993,
    range_nm: 1000,
    speed_kts: 300,
    seats: 33,
    mtow_kg: 14500,
    fuel_burn_kgph: 850,
    price_original_usd: 12500000,
    price_2025_usd: 26000000,
    price_acs_usd: 15000000,
    status: "active"
});

/* === Dornier 328JET (1998) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Dornier",
    model: "Dornier 328JET",
    year: 1998,
    range_nm: 1000,
    speed_kts: 400,
    seats: 33,
    mtow_kg: 16000,
    fuel_burn_kgph: 1750,
    price_original_usd: 17500000,
    price_2025_usd: 36000000,
    price_acs_usd: 20000000,
    status: "active"
});



/* ============================================================
   MITSUBISHI SPACEJET (MRJ)
   ============================================================ */

/* === MRJ70 (2016, cancelled) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Mitsubishi",
    model: "MRJ70",
    year: 2016,
    range_nm: 1850,
    speed_kts: 440,
    seats: 70,
    mtow_kg: 38500,
    fuel_burn_kgph: 2100,
    price_original_usd: 35000000,
    price_2025_usd: 48000000,
    price_acs_usd: 28000000,
    status: "cancelled"
});

/* === MRJ90 (2020) — SpaceJet M90 === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Mitsubishi",
    model: "MRJ90",
    year: 2020,
    range_nm: 2050,
    speed_kts: 440,
    seats: 88,
    mtow_kg: 42000,
    fuel_burn_kgph: 2200,
    price_original_usd: 42000000,
    price_2025_usd: 60000000,
    price_acs_usd: 34000000,
    status: "active"
});



/* ============================================================
   LET AIRCRAFT (Czech Republic)
   ============================================================ */

/* === Let L-410 (1973) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Let",
    model: "L-410",
    year: 1973,
    range_nm: 750,
    speed_kts: 185,
    seats: 19,
    mtow_kg: 6400,
    fuel_burn_kgph: 450,
    price_original_usd: 2800000,
    price_2025_usd: 8000000,
    price_acs_usd: 5000000,
    status: "active"
});

/* === Let L-610 (1990) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Let",
    model: "L-610",
    year: 1990,
    range_nm: 1080,
    speed_kts: 250,
    seats: 40,
    mtow_kg: 13700,
    fuel_burn_kgph: 850,
    price_original_usd: 6500000,
    price_2025_usd: 18000000,
    price_acs_usd: 10000000,
    status: "active"
});



/* ============================================================
   YAKOVLEV
   ============================================================ */

/* === Yak-40 (1968) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Yakovlev",
    model: "Yak-40",
    year: 1968,
    range_nm: 810,
    speed_kts: 350,
    seats: 32,
    mtow_kg: 16000,
    fuel_burn_kgph: 3100,
    price_original_usd: 6000000,
    price_2025_usd: 22000000,
    price_acs_usd: 12000000,
    status: "active"
});

/* === Yak-42D (1980) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Yakovlev",
    model: "Yak-42D",
    year: 1980,
    range_nm: 1800,
    speed_kts: 430,
    seats: 120,
    mtow_kg: 57000,
    fuel_burn_kgph: 5200,
    price_original_usd: 15000000,
    price_2025_usd: 48000000,
    price_acs_usd: 25000000,
    status: "active"
});



/* ============================================================
   FAIRCHILD / SWEARINGEN
   ============================================================ */

/* === Metro III (SA226, 1972) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Fairchild",
    model: "Metro III",
    year: 1972,
    range_nm: 900,
    speed_kts: 240,
    seats: 19,
    mtow_kg: 6300,
    fuel_burn_kgph: 430,
    price_original_usd: 3500000,
    price_2025_usd: 10000000,
    price_acs_usd: 6000000,
    status: "active"
});

/* === Metro 23 (SA227, 1990) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Fairchild",
    model: "Metro 23",
    year: 1990,
    range_nm: 1200,
    speed_kts: 250,
    seats: 19,
    mtow_kg: 6600,
    fuel_burn_kgph: 450,
    price_original_usd: 4200000,
    price_2025_usd: 12000000,
    price_acs_usd: 7000000,
    status: "active"
});



/* ============================================================
   CASA (España)
   ============================================================ */

/* === CASA CN-235 Pax (1988) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "CASA",
    model: "CN-235 Pax",
    year: 1988,
    range_nm: 1300,
    speed_kts: 240,
    seats: 35,
    mtow_kg: 16000,
    fuel_burn_kgph: 950,
    price_original_usd: 15000000,
    price_2025_usd: 36000000,
    price_acs_usd: 21000000,
    status: "active"
});
/* ------------------------------------------------------------
   HELICOPTERS + TILTROTOR + eVTOL (Passenger Transport)
   ------------------------------------------------------------ */

/* ============================================================
   HELICOPTERS — COMMERCIAL PASSENGER OPS
   ============================================================ */

/* === Bell 206 JetRanger (1967) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bell",
    model: "206 JetRanger",
    year: 1967,
    range_nm: 370,
    speed_kts: 110,
    seats: 5,
    mtow_kg: 1450,
    fuel_burn_kgph: 140,
    price_original_usd: 1000000,
    price_2025_usd: 1500000,
    price_acs_usd: 800000,
    status: "active"
});

/* === Bell 407 (1996) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bell",
    model: "407",
    year: 1996,
    range_nm: 360,
    speed_kts: 130,
    seats: 7,
    mtow_kg: 2260,
    fuel_burn_kgph: 180,
    price_original_usd: 2600000,
    price_2025_usd: 4200000,
    price_acs_usd: 2500000,
    status: "active"
});

/* === Bell 412 (1981) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bell",
    model: "412",
    year: 1981,
    range_nm: 400,
    speed_kts: 140,
    seats: 13,
    mtow_kg: 5400,
    fuel_burn_kgph: 290,
    price_original_usd: 3200000,
    price_2025_usd: 5200000,
    price_acs_usd: 3000000,
    status: "active"
});

/* === Bell 429 (2009) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bell",
    model: "429",
    year: 2009,
    range_nm: 380,
    speed_kts: 150,
    seats: 7,
    mtow_kg: 3400,
    fuel_burn_kgph: 260,
    price_original_usd: 5400000,
    price_2025_usd: 7600000,
    price_acs_usd: 3800000,
    status: "active"
});

/* === Airbus H125 (AS350, 1975) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus Helicopters",
    model: "H125 (AS350)",
    year: 1975,
    range_nm: 340,
    speed_kts: 125,
    seats: 6,
    mtow_kg: 2250,
    fuel_burn_kgph: 160,
    price_original_usd: 2200000,
    price_2025_usd: 4200000,
    price_acs_usd: 2200000,
    status: "active"
});

/* === Airbus H130 (EC130, 2001) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus Helicopters",
    model: "H130 (EC130)",
    year: 2001,
    range_nm: 330,
    speed_kts: 130,
    seats: 7,
    mtow_kg: 2427,
    fuel_burn_kgph: 175,
    price_original_usd: 3000000,
    price_2025_usd: 4800000,
    price_acs_usd: 2600000,
    status: "active"
});

/* === Airbus H155 (1999) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Airbus Helicopters",
    model: "H155",
    year: 1999,
    range_nm: 430,
    speed_kts: 150,
    seats: 13,
    mtow_kg: 4950,
    fuel_burn_kgph: 300,
    price_original_usd: 9000000,
    price_2025_usd: 15000000,
    price_acs_usd: 7500000,
    status: "active"
});

/* === Sikorsky S-76C++ (2005) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Sikorsky",
    model: "S-76C++",
    year: 2005,
    range_nm: 410,
    speed_kts: 155,
    seats: 12,
    mtow_kg: 5300,
    fuel_burn_kgph: 320,
    price_original_usd: 7000000,
    price_2025_usd: 12000000,
    price_acs_usd: 6000000,
    status: "active"
});

/* === Sikorsky S-92 (2004) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Sikorsky",
    model: "S-92",
    year: 2004,
    range_nm: 480,
    speed_kts: 165,
    seats: 19,
    mtow_kg: 12000,
    fuel_burn_kgph: 540,
    price_original_usd: 27000000,
    price_2025_usd: 42000000,
    price_acs_usd: 20000000,
    status: "active"
});


/* ============================================================
   TILTROTOR — PASSENGER OPS
   ============================================================ */

/* === AW609 (Leonardo, 2024) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Leonardo",
    model: "AW609",
    year: 2024,
    range_nm: 750,
    speed_kts: 275,
    seats: 9,
    mtow_kg: 7600,
    fuel_burn_kgph: 350,
    price_original_usd: 25000000,
    price_2025_usd: 30000000,
    price_acs_usd: 18000000,
    status: "active"
});

/* === V-22 Civil (Concept, 2025) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bell-Boeing",
    model: "V-22 Civil",
    year: 2025,
    range_nm: 880,
    speed_kts: 270,
    seats: 24,
    mtow_kg: 24800,
    fuel_burn_kgph: 900,
    price_original_usd: 60000000,
    price_2025_usd: 90000000,
    price_acs_usd: 45000000,
    status: "active"
});


/* ============================================================
   eVTOL — ADVANCED AIR MOBILITY (AAM)
   ============================================================ */

/* === Joby S4 (2024 certification) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Joby Aviation",
    model: "Joby S4",
    year: 2024,
    range_nm: 110,
    speed_kts: 110,
    seats: 4,
    mtow_kg: 2200,
    fuel_burn_kgph: 0, // electric
    price_original_usd: 3000000,
    price_2025_usd: 3500000,
    price_acs_usd: 1800000,
    status: "active"
});

/* === Archer Midnight (2025) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Archer",
    model: "Midnight",
    year: 2025,
    range_nm: 110,
    speed_kts: 110,
    seats: 4,
    mtow_kg: 2200,
    fuel_burn_kgph: 0,
    price_original_usd: 3200000,
    price_2025_usd: 3600000,
    price_acs_usd: 1900000,
    status: "active"
});

/* === EHang 216 (Autonomous) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "EHang",
    model: "EH216",
    year: 2021,
    range_nm: 20,
    speed_kts: 63,
    seats: 2,
    mtow_kg: 650,
    fuel_burn_kgph: 0,
    price_original_usd: 340000,
    price_2025_usd: 420000,
    price_acs_usd: 250000,
    status: "active"
});

/* === Lilium Jet (2026) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Lilium",
    model: "Lilium Jet",
    year: 2026,
    range_nm: 135,
    speed_kts: 140,
    seats: 6,
    mtow_kg: 3200,
    fuel_burn_kgph: 0,
    price_original_usd: 7500000,
    price_2025_usd: 8000000,
    price_acs_usd: 4200000,
    status: "active"
});
/* ------------------------------------------------------------
   BUSINESS JETS — Cessna | Gulfstream | Bombardier | Embraer | Falcon
   ------------------------------------------------------------ */


/* ============================================================
   CESSNA CITATION FAMILY
   ============================================================ */

/* === Citation I (1972) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Cessna",
    model: "Citation I",
    year: 1972,
    range_nm: 1200,
    speed_kts: 350,
    seats: 6,
    mtow_kg: 5400,
    fuel_burn_kgph: 750,
    price_original_usd: 800000,
    price_2025_usd: 3500000,
    price_acs_usd: 1800000,
    status: "active"
});

/* === Citation II (1978) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Cessna",
    model: "Citation II",
    year: 1978,
    range_nm: 1450,
    speed_kts: 380,
    seats: 8,
    mtow_kg: 6800,
    fuel_burn_kgph: 900,
    price_original_usd: 1200000,
    price_2025_usd: 4500000,
    price_acs_usd: 2200000,
    status: "active"
});

/* === Citation V / Ultra (1994) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Cessna",
    model: "Citation V Ultra",
    year: 1994,
    range_nm: 1850,
    speed_kts: 410,
    seats: 8,
    mtow_kg: 7400,
    fuel_burn_kgph: 1000,
    price_original_usd: 6500000,
    price_2025_usd: 11000000,
    price_acs_usd: 6000000,
    status: "active"
});

/* === Citation XLS+ (2008) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Cessna",
    model: "Citation XLS+",
    year: 2008,
    range_nm: 2100,
    speed_kts: 430,
    seats: 9,
    mtow_kg: 9100,
    fuel_burn_kgph: 1050,
    price_original_usd: 13000000,
    price_2025_usd: 18000000,
    price_acs_usd: 9000000,
    status: "active"
});

/* === Citation Latitude (2015) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Cessna",
    model: "Citation Latitude",
    year: 2015,
    range_nm: 2850,
    speed_kts: 440,
    seats: 9,
    mtow_kg: 13700,
    fuel_burn_kgph: 1150,
    price_original_usd: 17000000,
    price_2025_usd: 23000000,
    price_acs_usd: 12000000,
    status: "active"
});

/* === Citation Longitude (2019) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Cessna",
    model: "Citation Longitude",
    year: 2019,
    range_nm: 3500,
    speed_kts: 470,
    seats: 12,
    mtow_kg: 17700,
    fuel_burn_kgph: 1250,
    price_original_usd: 28000000,
    price_2025_usd: 34000000,
    price_acs_usd: 18000000,
    status: "active"
});



/* ============================================================
   BOMBARDIER EXECUTIVE — LEARJET / CHALLENGER / GLOBAL
   ============================================================ */

/* === Learjet 35A (1976) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "Learjet 35A",
    year: 1976,
    range_nm: 1900,
    speed_kts: 420,
    seats: 8,
    mtow_kg: 8300,
    fuel_burn_kgph: 1100,
    price_original_usd: 2000000,
    price_2025_usd: 6000000,
    price_acs_usd: 3000000,
    status: "active"
});

/* === Learjet 60XR (2007) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "Learjet 60XR",
    year: 2007,
    range_nm: 2400,
    speed_kts: 455,
    seats: 7,
    mtow_kg: 10600,
    fuel_burn_kgph: 1300,
    price_original_usd: 13000000,
    price_2025_usd: 16000000,
    price_acs_usd: 9000000,
    status: "active"
});

/* === Challenger 300 (2004) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "Challenger 300",
    year: 2004,
    range_nm: 3100,
    speed_kts: 460,
    seats: 9,
    mtow_kg: 17500,
    fuel_burn_kgph: 1200,
    price_original_usd: 20500000,
    price_2025_usd: 32000000,
    price_acs_usd: 16000000,
    status: "active"
});

/* === Challenger 650 (2015) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "Challenger 650",
    year: 2015,
    range_nm: 4000,
    speed_kts: 465,
    seats: 12,
    mtow_kg: 21800,
    fuel_burn_kgph: 1300,
    price_original_usd: 32000000,
    price_2025_usd: 44000000,
    price_acs_usd: 24000000,
    status: "active"
});

/* === Global 5000 (2005) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "Global 5000",
    year: 2005,
    range_nm: 5200,
    speed_kts: 480,
    seats: 17,
    mtow_kg: 41200,
    fuel_burn_kgph: 1800,
    price_original_usd: 40000000,
    price_2025_usd: 55000000,
    price_acs_usd: 30000000,
    status: "active"
});

/* === Global 7500 (2018) — flagship === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Bombardier",
    model: "Global 7500",
    year: 2018,
    range_nm: 7700,
    speed_kts: 488,
    seats: 19,
    mtow_kg: 52000,
    fuel_burn_kgph: 2100,
    price_original_usd: 73000000,
    price_2025_usd: 88000000,
    price_acs_usd: 48000000,
    status: "active"
});



/* ============================================================
   GULFSTREAM — BUSINESS JET LEADER
   ============================================================ */

/* === Gulfstream II (1967) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Gulfstream",
    model: "G-II",
    year: 1967,
    range_nm: 2800,
    speed_kts: 460,
    seats: 14,
    mtow_kg: 29200,
    fuel_burn_kgph: 1800,
    price_original_usd: 7000000,
    price_2025_usd: 25000000,
    price_acs_usd: 12000000,
    status: "active"
});

/* === Gulfstream III (1979) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Gulfstream",
    model: "G-III",
    year: 1979,
    range_nm: 3400,
    speed_kts: 470,
    seats: 14,
    mtow_kg: 31700,
    fuel_burn_kgph: 1900,
    price_original_usd: 11500000,
    price_2025_usd: 38000000,
    price_acs_usd: 18000000,
    status: "active"
});

/* === Gulfstream GIVSP (1987) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Gulfstream",
    model: "GIVSP",
    year: 1987,
    range_nm: 4100,
    speed_kts: 480,
    seats: 16,
    mtow_kg: 33500,
    fuel_burn_kgph: 2000,
    price_original_usd: 17000000,
    price_2025_usd: 42000000,
    price_acs_usd: 22000000,
    status: "active"
});

/* === Gulfstream G450 (2004) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Gulfstream",
    model: "G450",
    year: 2004,
    range_nm: 4200,
    speed_kts: 480,
    seats: 16,
    mtow_kg: 34700,
    fuel_burn_kgph: 2000,
    price_original_usd: 33000000,
    price_2025_usd: 48000000,
    price_acs_usd: 26000000,
    status: "active"
});

/* === Gulfstream G550 (2003) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Gulfstream",
    model: "G550",
    year: 2003,
    range_nm: 6750,
    speed_kts: 488,
    seats: 18,
    mtow_kg: 41000,
    fuel_burn_kgph: 2100,
    price_original_usd: 42000000,
    price_2025_usd: 60000000,
    price_acs_usd: 33000000,
    status: "active"
});

/* === Gulfstream G650ER (2014) — flagship === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Gulfstream",
    model: "G650ER",
    year: 2014,
    range_nm: 7500,
    speed_kts: 488,
    seats: 19,
    mtow_kg: 45000,
    fuel_burn_kgph: 2200,
    price_original_usd: 66000000,
    price_2025_usd: 85000000,
    price_acs_usd: 45000000,
    status: "active"
});



/* ============================================================
   EMBRAER EXECUTIVE (PHENOM / LEGACY)
   ============================================================ */

/* === Phenom 100 (2008) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "Phenom 100",
    year: 2008,
    range_nm: 1170,
    speed_kts: 390,
    seats: 5,
    mtow_kg: 4750,
    fuel_burn_kgph: 550,
    price_original_usd: 3500000,
    price_2025_usd: 4500000,
    price_acs_usd: 2400000,
    status: "active"
});

/* === Phenom 300 (2009) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "Phenom 300",
    year: 2009,
    range_nm: 1970,
    speed_kts: 450,
    seats: 7,
    mtow_kg: 8500,
    fuel_burn_kgph: 800,
    price_original_usd: 6900000,
    price_2025_usd: 9000000,
    price_acs_usd: 5000000,
    status: "active"
});

/* === Legacy 600 (2000) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "Legacy 600",
    year: 2000,
    range_nm: 3200,
    speed_kts: 470,
    seats: 13,
    mtow_kg: 22500,
    fuel_burn_kgph: 1400,
    price_original_usd: 26000000,
    price_2025_usd: 32000000,
    price_acs_usd: 18000000,
    status: "active"
});

/* === Praetor 600 (2019) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Embraer",
    model: "Praetor 600",
    year: 2019,
    range_nm: 4000,
    speed_kts: 470,
    seats: 12,
    mtow_kg: 19800,
    fuel_burn_kgph: 1300,
    price_original_usd: 21000000,
    price_2025_usd: 30000000,
    price_acs_usd: 16000000,
    status: "active"
});



/* ============================================================
   DASSAULT FALCON — FRENCH BUSINESS JETS
   ============================================================ */

/* === Falcon 20 (1965) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Dassault",
    model: "Falcon 20",
    year: 1965,
    range_nm: 1500,
    speed_kts: 430,
    seats: 10,
    mtow_kg: 12800,
    fuel_burn_kgph: 1500,
    price_original_usd: 4500000,
    price_2025_usd: 15000000,
    price_acs_usd: 8000000,
    status: "active"
});

/* === Falcon 50EX (1997) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Dassault",
    model: "Falcon 50EX",
    year: 1997,
    range_nm: 3400,
    speed_kts: 470,
    seats: 9,
    mtow_kg: 18500,
    fuel_burn_kgph: 1300,
    price_original_usd: 21000000,
    price_2025_usd: 34000000,
    price_acs_usd: 18000000,
    status: "active"
});

/* === Falcon 900EX (1996) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Dassault",
    model: "Falcon 900EX",
    year: 1996,
    range_nm: 4500,
    speed_kts: 475,
    seats: 14,
    mtow_kg: 21200,
    fuel_burn_kgph: 1500,
    price_original_usd: 28000000,
    price_2025_usd: 42000000,
    price_acs_usd: 24000000,
    status: "active"
});

/* === Falcon 7X (2007) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Dassault",
    model: "Falcon 7X",
    year: 2007,
    range_nm: 5950,
    speed_kts: 488,
    seats: 16,
    mtow_kg: 32500,
    fuel_burn_kgph: 1500,
    price_original_usd: 50000000,
    price_2025_usd: 70000000,
    price_acs_usd: 35000000,
    status: "active"
});

/* === Falcon 8X (2016) === */
ACS_AIRCRAFT_DB.push({
    manufacturer: "Dassault",
    model: "Falcon 8X",
    year: 2016,
    range_nm: 6450,
    speed_kts: 488,
    seats: 16,
    mtow_kg: 33900,
    fuel_burn_kgph: 1550,
    price_original_usd: 58000000,
    price_2025_usd: 80000000,
    price_acs_usd: 42000000,
    status: "active"
});

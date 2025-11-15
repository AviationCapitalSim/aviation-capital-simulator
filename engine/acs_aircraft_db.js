/* ============================================================
   === ACS AIRCRAFT DATABASE — FULL EDITION ====================
   === Clean, Valid JS — Ready for ACS Buy/Lease Engine ========
   ============================================================ */

const ACS_AIRCRAFT_DB = [

  // ============================================================
  // 1935 — 1949  (Propeller Golden Era)
  // ============================================================

  {
    manufacturer: "Lockheed",
    model: "L-10 Electra",
    year: 1935,
    seats: 10,
    range_nm: 750,
    speed_kts: 165,
    mtow_kg: 4500,
    fuel_burn_kgph: 320,
    price_acs_usd: 350000,
    engines: "PW R-985"
  },

  {
    manufacturer: "Lockheed",
    model: "L-12 Electra Junior",
    year: 1936,
    seats: 6,
    range_nm: 700,
    speed_kts: 175,
    mtow_kg: 3500,
    fuel_burn_kgph: 280,
    price_acs_usd: 300000,
    engines: "PW R-985"
  },

  {
    manufacturer: "Lockheed",
    model: "L-14 Super Electra",
    year: 1937,
    seats: 14,
    range_nm: 1625,
    speed_kts: 230,
    mtow_kg: 8250,
    fuel_burn_kgph: 520,
    price_acs_usd: 520000,
    engines: "PW R-1690"
  },

  {
    manufacturer: "Lockheed",
    model: "L-18 Lodestar",
    year: 1940,
    seats: 18,
    range_nm: 1500,
    speed_kts: 250,
    mtow_kg: 8350,
    fuel_burn_kgph: 580,
    price_acs_usd: 650000,
    engines: "PW R-1820"
  },

  {
    manufacturer: "Douglas",
    model: "DC-2",
    year: 1934,
    seats: 14,
    range_nm: 1000,
    speed_kts: 200,
    mtow_kg: 8100,
    fuel_burn_kgph: 480,
    price_acs_usd: 600000,
    engines: "PW R-1690"
  },

  {
    manufacturer: "Douglas",
    model: "DC-3",
    year: 1935,
    seats: 21,
    range_nm: 1500,
    speed_kts: 180,
    mtow_kg: 11793,
    fuel_burn_kgph: 450,
    price_acs_usd: 700000,
    engines: "PW R-1830"
  },

  {
    manufacturer: "Douglas",
    model: "DC-4",
    year: 1942,
    seats: 44,
    range_nm: 2500,
    speed_kts: 215,
    mtow_kg: 29700,
    fuel_burn_kgph: 1350,
    price_acs_usd: 2200000,
    engines: "PW R-2000"
  },

  {
    manufacturer: "Douglas",
    model: "DC-5",
    year: 1939,
    seats: 16,
    range_nm: 1200,
    speed_kts: 190,
    mtow_kg: 7600,
    fuel_burn_kgph: 420,
    price_acs_usd: 550000,
    engines: "PW R-1820"
  },

  {
    manufacturer: "Douglas",
    model: "DC-6",
    year: 1946,
    seats: 52,
    range_nm: 4000,
    speed_kts: 245,
    mtow_kg: 48800,
    fuel_burn_kgph: 2200,
    price_acs_usd: 3200000,
    engines: "PW R-2800"
  },

  {
    manufacturer: "Lockheed",
    model: "L-049 Constellation",
    year: 1943,
    seats: 44,
    range_nm: 2600,
    speed_kts: 280,
    mtow_kg: 43700,
    fuel_burn_kgph: 2000,
    price_acs_usd: 3500000,
    engines: "Wright R-3350"
  },

  {
    manufacturer: "Lockheed",
    model: "L-649 Constellation",
    year: 1946,
    seats: 52,
    range_nm: 3200,
    speed_kts: 300,
    mtow_kg: 49300,
    fuel_burn_kgph: 2400,
    price_acs_usd: 3800000,
    engines: "Wright R-3350"
  },

  {
    manufacturer: "Lockheed",
    model: "L-749 Constellation",
    year: 1947,
    seats: 60,
    range_nm: 4000,
    speed_kts: 305,
    mtow_kg: 51300,
    fuel_burn_kgph: 2550,
    price_acs_usd: 4200000,
    engines: "Wright R-3350"
  },

  {
    manufacturer: "Boeing",
    model: "307 Stratoliner",
    year: 1938,
    seats: 33,
    range_nm: 1300,
    speed_kts: 200,
    mtow_kg: 15500,
    fuel_burn_kgph: 900,
    price_acs_usd: 900000,
    engines: "Wright R-1820"
  },
  // ============================================================
  // 1950 — 1969 (Early Jet Age & Late Pistons)
  // ============================================================

  {
    manufacturer: "Douglas",
    model: "DC-7",
    year: 1953,
    seats: 69,
    range_nm: 4000,
    speed_kts: 315,
    mtow_kg: 63200,
    fuel_burn_kgph: 3000,
    price_acs_usd: 4800000,
    engines: "Wright R-3350"
  },

  {
    manufacturer: "Lockheed",
    model: "L-1049 Super Constellation",
    year: 1951,
    seats: 95,
    range_nm: 3400,
    speed_kts: 310,
    mtow_kg: 70000,
    fuel_burn_kgph: 3200,
    price_acs_usd: 5200000,
    engines: "Wright R-3350"
  },

  {
    manufacturer: "Lockheed",
    model: "L-1649 Starliner",
    year: 1956,
    seats: 99,
    range_nm: 4500,
    speed_kts: 335,
    mtow_kg: 74000,
    fuel_burn_kgph: 3400,
    price_acs_usd: 5800000,
    engines: "Wright R-3350"
  },

  {
    manufacturer: "Boeing",
    model: "707-120",
    year: 1958,
    seats: 110,
    range_nm: 3200,
    speed_kts: 540,
    mtow_kg: 123000,
    fuel_burn_kgph: 6500,
    price_acs_usd: 16000000,
    engines: "JT3C"
  },

  {
    manufacturer: "Boeing",
    model: "707-320",
    year: 1959,
    seats: 147,
    range_nm: 3900,
    speed_kts: 560,
    mtow_kg: 151000,
    fuel_burn_kgph: 7200,
    price_acs_usd: 18500000,
    engines: "JT4A"
  },

  {
    manufacturer: "Douglas",
    model: "DC-8-10",
    year: 1959,
    seats: 125,
    range_nm: 3500,
    speed_kts: 545,
    mtow_kg: 120000,
    fuel_burn_kgph: 6800,
    price_acs_usd: 15500000,
    engines: "JT3C"
  },

  {
    manufacturer: "Douglas",
    model: "DC-8-50",
    year: 1961,
    seats: 146,
    range_nm: 4150,
    speed_kts: 565,
    mtow_kg: 147000,
    fuel_burn_kgph: 6900,
    price_acs_usd: 17500000,
    engines: "JT3D"
  },

  {
    manufacturer: "Sud Aviation",
    model: "Caravelle",
    year: 1959,
    seats: 90,
    range_nm: 1500,
    speed_kts: 510,
    mtow_kg: 51000,
    fuel_burn_kgph: 4700,
    price_acs_usd: 11000000,
    engines: "RR Avon"
  },

  {
    manufacturer: "BAC",
    model: "One-Eleven",
    year: 1963,
    seats: 89,
    range_nm: 1300,
    speed_kts: 470,
    mtow_kg: 37500,
    fuel_burn_kgph: 3200,
    price_acs_usd: 9000000,
    engines: "RR Spey"
  },

  {
    manufacturer: "Fokker",
    model: "F27",
    year: 1958,
    seats: 48,
    range_nm: 1350,
    speed_kts: 250,
    mtow_kg: 20000,
    fuel_burn_kgph: 900,
    price_acs_usd: 3500000,
    engines: "RR Dart"
  },

  {
    manufacturer: "Hawker Siddeley",
    model: "HS-748",
    year: 1960,
    seats: 52,
    range_nm: 1550,
    speed_kts: 265,
    mtow_kg: 23000,
    fuel_burn_kgph: 1050,
    price_acs_usd: 3800000,
    engines: "RR Dart"
  },

  {
    manufacturer: "Boeing",
    model: "727-100",
    year: 1963,
    seats: 106,
    range_nm: 1850,
    speed_kts: 540,
    mtow_kg: 77000,
    fuel_burn_kgph: 5100,
    price_acs_usd: 14500000,
    engines: "JT8D"
  },

  {
    manufacturer: "Boeing",
    model: "737-100",
    year: 1967,
    seats: 85,
    range_nm: 1200,
    speed_kts: 515,
    mtow_kg: 50000,
    fuel_burn_kgph: 3800,
    price_acs_usd: 11000000,
    engines: "JT8D"
  },

  {
    manufacturer: "Boeing",
    model: "737-200",
    year: 1968,
    seats: 98,
    range_nm: 1500,
    speed_kts: 520,
    mtow_kg: 52000,
    fuel_burn_kgph: 4000,
    price_acs_usd: 12500000,
    engines: "JT8D"
  },
  // ============================================================
  // 1970 — 1989 (Widebody Boom & Jet Maturity)
  // ============================================================

  {
    manufacturer: "Boeing",
    model: "747-100",
    year: 1970,
    seats: 366,
    range_nm: 4800,
    speed_kts: 555,
    mtow_kg: 333000,
    fuel_burn_kgph: 22000,
    price_acs_usd: 35000000,
    engines: "JT9D"
  },

  {
    manufacturer: "Boeing",
    model: "747-200",
    year: 1971,
    seats: 370,
    range_nm: 5200,
    speed_kts: 560,
    mtow_kg: 378000,
    fuel_burn_kgph: 23000,
    price_acs_usd: 38000000,
    engines: "JT9D"
  },

  {
    manufacturer: "Douglas",
    model: "DC-10-10",
    year: 1971,
    seats: 250,
    range_nm: 3200,
    speed_kts: 540,
    mtow_kg: 240000,
    fuel_burn_kgph: 15500,
    price_acs_usd: 29000000,
    engines: "GE CF6-6"
  },

  {
    manufacturer: "Lockheed",
    model: "L-1011 TriStar",
    year: 1972,
    seats: 256,
    range_nm: 3200,
    speed_kts: 540,
    mtow_kg: 231000,
    fuel_burn_kgph: 15000,
    price_acs_usd: 30000000,
    engines: "RR RB211"
  },

  {
    manufacturer: "Airbus",
    model: "A300B2",
    year: 1974,
    seats: 266,
    range_nm: 2250,
    speed_kts: 510,
    mtow_kg: 142000,
    fuel_burn_kgph: 9000,
    price_acs_usd: 25000000,
    engines: "GE CF6-50"
  },

  {
    manufacturer: "Airbus",
    model: "A300B4",
    year: 1979,
    seats: 266,
    range_nm: 2600,
    speed_kts: 510,
    mtow_kg: 165000,
    fuel_burn_kgph: 9200,
    price_acs_usd: 28000000,
    engines: "GE CF6-50"
  },

  {
    manufacturer: "Airbus",
    model: "A310-300",
    year: 1985,
    seats: 247,
    range_nm: 4250,
    speed_kts: 500,
    mtow_kg: 164000,
    fuel_burn_kgph: 8800,
    price_acs_usd: 32000000,
    engines: "GE CF6-80C2"
  },

  {
    manufacturer: "McDonnell Douglas",
    model: "MD-80",
    year: 1980,
    seats: 140,
    range_nm: 1800,
    speed_kts: 480,
    mtow_kg: 63000,
    fuel_burn_kgph: 3500,
    price_acs_usd: 21000000,
    engines: "JT8D-200"
  },

  {
    manufacturer: "McDonnell Douglas",
    model: "MD-82",
    year: 1981,
    seats: 155,
    range_nm: 1850,
    speed_kts: 485,
    mtow_kg: 68000,
    fuel_burn_kgph: 3600,
    price_acs_usd: 22500000,
    engines: "JT8D-217"
  },

  {
    manufacturer: "Boeing",
    model: "737-300",
    year: 1984,
    seats: 149,
    range_nm: 1950,
    speed_kts: 490,
    mtow_kg: 62000,
    fuel_burn_kgph: 3400,
    price_acs_usd: 23000000,
    engines: "CFM56-3"
  },

  {
    manufacturer: "Boeing",
    model: "737-400",
    year: 1988,
    seats: 168,
    range_nm: 1850,
    speed_kts: 490,
    mtow_kg: 68000,
    fuel_burn_kgph: 3550,
    price_acs_usd: 24000000,
    engines: "CFM56-3"
  },

  {
    manufacturer: "Boeing",
    model: "757-200",
    year: 1983,
    seats: 200,
    range_nm: 3900,
    speed_kts: 495,
    mtow_kg: 115000,
    fuel_burn_kgph: 5200,
    price_acs_usd: 35000000,
    engines: "RB211-535"
  },

  {
    manufacturer: "Boeing",
    model: "767-200",
    year: 1982,
    seats: 216,
    range_nm: 3300,
    speed_kts: 510,
    mtow_kg: 135000,
    fuel_burn_kgph: 7000,
    price_acs_usd: 42000000,
    engines: "JT9D-7R4"
  },

  {
    manufacturer: "Boeing",
    model: "767-300",
    year: 1986,
    seats: 269,
    range_nm: 3600,
    speed_kts: 510,
    mtow_kg: 158000,
    fuel_burn_kgph: 7600,
    price_acs_usd: 51000000,
    engines: "CF6-80C2"
  },

  {
    manufacturer: "Tupolev",
    model: "Tu-154",
    year: 1972,
    seats: 158,
    range_nm: 1300,
    speed_kts: 520,
    mtow_kg: 98000,
    fuel_burn_kgph: 8600,
    price_acs_usd: 15000000,
    engines: "NK-8"
  },

  {
    manufacturer: "Fokker",
    model: "F28 Fellowship",
    year: 1969,
    seats: 65,
    range_nm: 1100,
    speed_kts: 465,
    mtow_kg: 28500,
    fuel_burn_kgph: 2800,
    price_acs_usd: 8500000,
    engines: "RR Spey"
  },

  {
    manufacturer: "Fokker",
    model: "F70",
    year: 1987,
    seats: 80,
    range_nm: 1500,
    speed_kts: 470,
    mtow_kg: 38000,
    fuel_burn_kgph: 3000,
    price_acs_usd: 12000000,
    engines: "RR Tay"
  },

  {
    manufacturer: "Fokker",
    model: "F100",
    year: 1988,
    seats: 107,
    range_nm: 1400,
    speed_kts: 475,
    mtow_kg: 45000,
    fuel_burn_kgph: 3200,
    price_acs_usd: 14000000,
    engines: "RR Tay"
  },
  // ============================================================
  // 1990 — 2009 (Glass Cockpit & Modern Jet Era)
  // ============================================================

  {
    manufacturer: "Boeing",
    model: "737-600",
    year: 1998,
    seats: 110,
    range_nm: 3050,
    speed_kts: 515,
    mtow_kg: 65000,
    fuel_burn_kgph: 2600,
    price_acs_usd: 48000000,
    engines: "CFM56-7B"
  },

  {
    manufacturer: "Boeing",
    model: "737-700",
    year: 1998,
    seats: 132,
    range_nm: 3200,
    speed_kts: 515,
    mtow_kg: 70000,
    fuel_burn_kgph: 2700,
    price_acs_usd: 56000000,
    engines: "CFM56-7B"
  },

  {
    manufacturer: "Boeing",
    model: "737-800",
    year: 1998,
    seats: 162,
    range_nm: 2935,
    speed_kts: 515,
    mtow_kg: 79000,
    fuel_burn_kgph: 2900,
    price_acs_usd: 68000000,
    engines: "CFM56-7B"
  },

  {
    manufacturer: "Boeing",
    model: "737-900ER",
    year: 2007,
    seats: 180,
    range_nm: 2950,
    speed_kts: 515,
    mtow_kg: 85000,
    fuel_burn_kgph: 3050,
    price_acs_usd: 75000000,
    engines: "CFM56-7B"
  },

  {
    manufacturer: "Boeing",
    model: "747-400",
    year: 1989,
    seats: 416,
    range_nm: 7250,
    speed_kts: 567,
    mtow_kg: 396900,
    fuel_burn_kgph: 25000,
    price_acs_usd: 180000000,
    engines: "PW4062 / RB211 / CF6-80"
  },

  {
    manufacturer: "Boeing",
    model: "757-300",
    year: 1999,
    seats: 243,
    range_nm: 3400,
    speed_kts: 470,
    mtow_kg: 123000,
    fuel_burn_kgph: 5600,
    price_acs_usd: 80000000,
    engines: "RB211-535E4"
  },

  {
    manufacturer: "Boeing",
    model: "767-400ER",
    year: 2000,
    seats: 304,
    range_nm: 5625,
    speed_kts: 530,
    mtow_kg: 204000,
    fuel_burn_kgph: 8200,
    price_acs_usd: 145000000,
    engines: "CF6-80C2"
  },

  {
    manufacturer: "Boeing",
    model: "777-200",
    year: 1995,
    seats: 314,
    range_nm: 5100,
    speed_kts: 560,
    mtow_kg: 247000,
    fuel_burn_kgph: 9000,
    price_acs_usd: 150000000,
    engines: "PW4077 / GE90-77"
  },

  {
    manufacturer: "Boeing",
    model: "777-300",
    year: 1998,
    seats: 396,
    range_nm: 5000,
    speed_kts: 560,
    mtow_kg: 263000,
    fuel_burn_kgph: 11000,
    price_acs_usd: 180000000,
    engines: "GE90-92B"
  },

  {
    manufacturer: "Airbus",
    model: "A318",
    year: 2003,
    seats: 110,
    range_nm: 3100,
    speed_kts: 480,
    mtow_kg: 68000,
    fuel_burn_kgph: 2600,
    price_acs_usd: 59000000,
    engines: "CFM56-5B"
  },

  {
    manufacturer: "Airbus",
    model: "A319",
    year: 1996,
    seats: 124,
    range_nm: 3750,
    speed_kts: 480,
    mtow_kg: 75500,
    fuel_burn_kgph: 2700,
    price_acs_usd: 72000000,
    engines: "CFM56-5B"
  },

  {
    manufacturer: "Airbus",
    model: "A320",
    year: 1988,
    seats: 150,
    range_nm: 3300,
    speed_kts: 480,
    mtow_kg: 77000,
    fuel_burn_kgph: 2900,
    price_acs_usd: 80000000,
    engines: "CFM56-5B"
  },

  {
    manufacturer: "Airbus",
    model: "A321",
    year: 1994,
    seats: 185,
    range_nm: 3200,
    speed_kts: 480,
    mtow_kg: 89000,
    fuel_burn_kgph: 3100,
    price_acs_usd: 95000000,
    engines: "CFM56-5B"
  },

  {
    manufacturer: "Airbus",
    model: "A330-200",
    year: 1998,
    seats: 246,
    range_nm: 6750,
    speed_kts: 517,
    mtow_kg: 230000,
    fuel_burn_kgph: 8600,
    price_acs_usd: 185000000,
    engines: "Trent 700"
  },

  {
    manufacturer: "Airbus",
    model: "A330-300",
    year: 1993,
    seats: 295,
    range_nm: 6350,
    speed_kts: 517,
    mtow_kg: 242000,
    fuel_burn_kgph: 9000,
    price_acs_usd: 200000000,
    engines: "Trent 700"
  },

  {
    manufacturer: "Airbus",
    model: "A340-200",
    year: 1993,
    seats: 261,
    range_nm: 7200,
    speed_kts: 480,
    mtow_kg: 257000,
    fuel_burn_kgph: 10800,
    price_acs_usd: 210000000,
    engines: "CFM56-5C"
  },

  {
    manufacturer: "Airbus",
    model: "A340-300",
    year: 1993,
    seats: 295,
    range_nm: 7400,
    speed_kts: 480,
    mtow_kg: 275000,
    fuel_burn_kgph: 11200,
    price_acs_usd: 230000000,
    engines: "CFM56-5C"
  },

  {
    manufacturer: "McDonnell Douglas",
    model: "MD-11",
    year: 1990,
    seats: 285,
    range_nm: 6400,
    speed_kts: 520,
    mtow_kg: 285000,
    fuel_burn_kgph: 10200,
    price_acs_usd: 135000000,
    engines: "GE CF6-80C2"
  },

  {
    manufacturer: "Bombardier",
    model: "CRJ100",
    year: 1992,
    seats: 50,
    range_nm: 1500,
    speed_kts: 450,
    mtow_kg: 21500,
    fuel_burn_kgph: 1600,
    price_acs_usd: 24000000,
    engines: "GE CF34-3A1"
  },

  {
    manufacturer: "Bombardier",
    model: "CRJ200",
    year: 1996,
    seats: 50,
    range_nm: 1600,
    speed_kts: 450,
    mtow_kg: 24000,
    fuel_burn_kgph: 1650,
    price_acs_usd: 27000000,
    engines: "GE CF34-3B1"
  },

  {
    manufacturer: "Bombardier",
    model: "CRJ700",
    year: 1999,
    seats: 70,
    range_nm: 1700,
    speed_kts: 470,
    mtow_kg: 35000,
    fuel_burn_kgph: 2100,
    price_acs_usd: 32000000,
    engines: "GE CF34-8C1"
  },

  {
    manufacturer: "Bombardier",
    model: "CRJ900",
    year: 2001,
    seats: 90,
    range_nm: 1550,
    speed_kts: 470,
    mtow_kg: 38500,
    fuel_burn_kgph: 2300,
    price_acs_usd: 38000000,
    engines: "GE CF34-8C5"
  },

  {
    manufacturer: "Bombardier",
    model: "Dash 8 Q400",
    year: 2000,
    seats: 78,
    range_nm: 1100,
    speed_kts: 360,
    mtow_kg: 29000,
    fuel_burn_kgph: 1500,
    price_acs_usd: 34000000,
    engines: "PW150A"
  },

  {
    manufacturer: "ATR",
    model: "ATR 42-500",
    year: 1995,
    seats: 48,
    range_nm: 800,
    speed_kts: 300,
    mtow_kg: 18500,
    fuel_burn_kgph: 1200,
    price_acs_usd: 18000000,
    engines: "PW120"
  },

  {
    manufacturer: "ATR",
    model: "ATR 72-500",
    year: 1997,
    seats: 70,
    range_nm: 900,
    speed_kts: 300,
    mtow_kg: 22500,
    fuel_burn_kgph: 1300,
    price_acs_usd: 24000000,
    engines: "PW127"
  },

  {
    manufacturer: "Embraer",
    model: "ERJ-135",
    year: 1999,
    seats: 37,
    range_nm: 1550,
    speed_kts: 430,
    mtow_kg: 20500,
    fuel_burn_kgph: 1500,
    price_acs_usd: 21000000,
    engines: "RR AE3007"
  },

  {
    manufacturer: "Embraer",
    model: "ERJ-145",
    year: 1996,
    seats: 50,
    range_nm: 1550,
    speed_kts: 430,
    mtow_kg: 22500,
    fuel_burn_kgph: 1600,
    price_acs_usd: 24000000,
    engines: "RR AE3007"
  },

  {
    manufacturer: "Embraer",
    model: "E170",
    year: 2004,
    seats: 78,
    range_nm: 2100,
    speed_kts: 470,
    mtow_kg: 39000,
    fuel_burn_kgph: 2400,
    price_acs_usd: 38000000,
    engines: "GE CF34-8E"
  },

  {
    manufacturer: "Embraer",
    model: "E190",
    year: 2005,
    seats: 98,
    range_nm: 2400,
    speed_kts: 470,
    mtow_kg: 51800,
    fuel_burn_kgph: 2600,
    price_acs_usd: 45000000,
    engines: "GE CF34-10E"
  },

  {
    manufacturer: "Tupolev",
    model: "Tu-204",
    year: 1989,
    seats: 164,
    range_nm: 2100,
    speed_kts: 470,
    mtow_kg: 103000,
    fuel_burn_kgph: 5200,
    price_acs_usd: 35000000,
    engines: "PS-90A"
  },

  {
    manufacturer: "Ilyushin",
    model: "Il-96-300",
    year: 1993,
    seats: 262,
    range_nm: 5100,
    speed_kts: 480,
    mtow_kg: 250000,
    fuel_burn_kgph: 10500,
    price_acs_usd: 85000000,
    engines: "PS-90A"
  },
  // ============================================================
  // 2010 — 2025 (Next-Gen Efficiency Era)
  // ============================================================

  {
    manufacturer: "Airbus",
    model: "A320neo",
    year: 2016,
    seats: 150,
    range_nm: 3500,
    speed_kts: 450,
    mtow_kg: 79000,
    fuel_burn_kgph: 2100,
    price_acs_usd: 49500000,
    engines: "PW1127G-JM / LEAP-1A"
  },

  {
    manufacturer: "Airbus",
    model: "A321neo",
    year: 2017,
    seats: 185,
    range_nm: 3500,
    speed_kts: 450,
    mtow_kg: 89000,
    fuel_burn_kgph: 2300,
    price_acs_usd: 56500000,
    engines: "PW1130G-JM / LEAP-1A"
  },

  {
    manufacturer: "Airbus",
    model: "A321LR",
    year: 2018,
    seats: 180,
    range_nm: 4000,
    speed_kts: 450,
    mtow_kg: 97000,
    fuel_burn_kgph: 2400,
    price_acs_usd: 61000000,
    engines: "LEAP-1A32"
  },

  {
    manufacturer: "Airbus",
    model: "A321XLR",
    year: 2023,
    seats: 180,
    range_nm: 4700,
    speed_kts: 450,
    mtow_kg: 101000,
    fuel_burn_kgph: 2350,
    price_acs_usd: 68500000,
    engines: "LEAP-1A35"
  },

  {
    manufacturer: "Airbus",
    model: "A350-900",
    year: 2015,
    seats: 325,
    range_nm: 8100,
    speed_kts: 488,
    mtow_kg: 280000,
    fuel_burn_kgph: 8400,
    price_acs_usd: 317000000,
    engines: "RR Trent XWB-84"
  },

  {
    manufacturer: "Airbus",
    model: "A350-900 ULR",
    year: 2018,
    seats: 170,
    range_nm: 9700,
    speed_kts: 488,
    mtow_kg: 280000,
    fuel_burn_kgph: 8400,
    price_acs_usd: 340000000,
    engines: "RR Trent XWB-84"
  },

  {
    manufacturer: "Airbus",
    model: "A350-1000",
    year: 2018,
    seats: 366,
    range_nm: 8000,
    speed_kts: 488,
    mtow_kg: 308000,
    fuel_burn_kgph: 8950,
    price_acs_usd: 366000000,
    engines: "RR Trent XWB-97"
  },

  {
    manufacturer: "Airbus",
    model: "A330-800neo",
    year: 2020,
    seats: 257,
    range_nm: 7500,
    speed_kts: 475,
    mtow_kg: 251000,
    fuel_burn_kgph: 6600,
    price_acs_usd: 131000000,
    engines: "RR Trent 7000"
  },

  {
    manufacturer: "Airbus",
    model: "A330-900neo",
    year: 2018,
    seats: 287,
    range_nm: 6550,
    speed_kts: 475,
    mtow_kg: 251000,
    fuel_burn_kgph: 6800,
    price_acs_usd: 131000000,
    engines: "RR Trent 7000"
  },

  {
    manufacturer: "Airbus",
    model: "A220-100",
    year: 2016,
    seats: 110,
    range_nm: 3100,
    speed_kts: 450,
    mtow_kg: 60000,
    fuel_burn_kgph: 1600,
    price_acs_usd: 82000000,
    engines: "PW1500G"
  },

  {
    manufacturer: "Airbus",
    model: "A220-300",
    year: 2017,
    seats: 145,
    range_nm: 3300,
    speed_kts: 450,
    mtow_kg: 69000,
    fuel_burn_kgph: 1700,
    price_acs_usd: 89000000,
    engines: "PW1500G"
  },

  {
    manufacturer: "Airbus",
    model: "A220-500",
    year: 2026,
    seats: 175,
    range_nm: 3100,
    speed_kts: 450,
    mtow_kg: 72000,
    fuel_burn_kgph: 1800,
    price_acs_usd: 98000000,
    engines: "PW1500G"
  },

  {
    manufacturer: "Boeing",
    model: "737 MAX 7",
    year: 2017,
    seats: 138,
    range_nm: 3850,
    speed_kts: 470,
    mtow_kg: 80100,
    fuel_burn_kgph: 2050,
    price_acs_usd: 61500000,
    engines: "LEAP-1B"
  },

  {
    manufacturer: "Boeing",
    model: "737 MAX 8",
    year: 2017,
    seats: 162,
    range_nm: 3550,
    speed_kts: 470,
    mtow_kg: 82000,
    fuel_burn_kgph: 2150,
    price_acs_usd: 65500000,
    engines: "LEAP-1B"
  },

  {
    manufacturer: "Boeing",
    model: "737 MAX 9",
    year: 2018,
    seats: 180,
    range_nm: 3500,
    speed_kts: 470,
    mtow_kg: 88000,
    fuel_burn_kgph: 2200,
    price_acs_usd: 70000000,
    engines: "LEAP-1B"
  },

  {
    manufacturer: "Boeing",
    model: "737 MAX 10",
    year: 2023,
    seats: 204,
    range_nm: 3300,
    speed_kts: 470,
    mtow_kg: 89200,
    fuel_burn_kgph: 2250,
    price_acs_usd: 75000000,
    engines: "LEAP-1B"
  },

  {
    manufacturer: "Boeing",
    model: "787-8 Dreamliner",
    year: 2012,
    seats: 248,
    range_nm: 7635,
    speed_kts: 488,
    mtow_kg: 228000,
    fuel_burn_kgph: 6200,
    price_acs_usd: 227000000,
    engines: "GEnx-1B"
  },

  {
    manufacturer: "Boeing",
    model: "787-9 Dreamliner",
    year: 2014,
    seats: 296,
    range_nm: 7635,
    speed_kts: 488,
    mtow_kg: 254000,
    fuel_burn_kgph: 6800,
    price_acs_usd: 264000000,
    engines: "GEnx-1B"
  },

  {
    manufacturer: "Boeing",
    model: "787-10 Dreamliner",
    year: 2018,
    seats: 336,
    range_nm: 6430,
    speed_kts: 488,
    mtow_kg: 254000,
    fuel_burn_kgph: 7100,
    price_acs_usd: 306000000,
    engines: "GEnx-1B"
  },

  {
    manufacturer: "Boeing",
    model: "787-9 (2025 Update)",
    year: 2025,
    seats: 296,
    range_nm: 7635,
    speed_kts: 488,
    mtow_kg: 254000,
    fuel_burn_kgph: 6500,
    price_acs_usd: 278000000,
    engines: "GEnx-1B (PIP)"
  },

  {
    manufacturer: "Embraer",
    model: "E190-E2",
    year: 2018,
    seats: 110,
    range_nm: 2850,
    speed_kts: 455,
    mtow_kg: 56500,
    fuel_burn_kgph: 1550,
    price_acs_usd: 60000000,
    engines: "PW1900G"
  },

  {
    manufacturer: "Embraer",
    model: "E195-E2",
    year: 2019,
    seats: 132,
    range_nm: 2600,
    speed_kts: 455,
    mtow_kg: 62000,
    fuel_burn_kgph: 1650,
    price_acs_usd: 67000000,
    engines: "PW1900G"
  },

  {
    manufacturer: "Embraer",
    model: "E175-E2",
    year: 2020,
    seats: 88,
    range_nm: 2200,
    speed_kts: 455,
    mtow_kg: 41700,
    fuel_burn_kgph: 1350,
    price_acs_usd: 48000000,
    engines: "PW1715G"
  },

  {
    manufacturer: "Bombardier",
    model: "Q400 (Dash 8-400)",
    year: 2000,
    seats: 78,
    range_nm: 1100,
    speed_kts: 360,
    mtow_kg: 29000,
    fuel_burn_kgph: 900,
    price_acs_usd: 33500000,
    engines: "PW150A"
  },

  {
    manufacturer: "ATR",
    model: "ATR 72-600",
    year: 2010,
    seats: 72,
    range_nm: 825,
    speed_kts: 276,
    mtow_kg: 23000,
    fuel_burn_kgph: 780,
    price_acs_usd: 21500000,
    engines: "PW127M"
  },

  {
    manufacturer: "ATR",
    model: "ATR 72-600 EVO",
    year: 2024,
    seats: 74,
    range_nm: 850,
    speed_kts: 276,
    mtow_kg: 23500,
    fuel_burn_kgph: 720,
    price_acs_usd: 24500000,
    engines: "PW127XT-L"
  },

  {
    manufacturer: "ATR",
    model: "ATR 42-600S (STOL)",
    year: 2025,
    seats: 48,
    range_nm: 750,
    speed_kts: 265,
    mtow_kg: 19500,
    fuel_burn_kgph: 690,
    price_acs_usd: 22500000,
    engines: "PW127XT-S"
  },

  {
    manufacturer: "Sukhoi",
    model: "SSJ100-NEW",
    year: 2021,
    seats: 98,
    range_nm: 2100,
    speed_kts: 450,
    mtow_kg: 48500,
    fuel_burn_kgph: 1650,
    price_acs_usd: 38000000,
    engines: "PD-8"
  },

  {
    manufacturer: "Yakovlev",
    model: "MC-21-300",
    year: 2024,
    seats: 163,
    range_nm: 3000,
    speed_kts: 450,
    mtow_kg: 79000,
    fuel_burn_kgph: 2100,
    price_acs_usd: 65000000,
    engines: "PD-14 / PW1400G"
  },

  {
    manufacturer: "Yakovlev",
    model: "MC-21-200",
    year: 2025,
    seats: 132,
    range_nm: 3300,
    speed_kts: 450,
    mtow_kg: 72000,
    fuel_burn_kgph: 1800,
    price_acs_usd: 60000000,
    engines: "PD-14"
  },

  {
    manufacturer: "Mitsubishi",
    model: "SpaceJet M90",
    year: 2020,
    seats: 88,
    range_nm: 2000,
    speed_kts: 450,
    mtow_kg: 39000,
    fuel_burn_kgph: 1500,
    price_acs_usd: 52000000,
    engines: "PW1200G",
    status: "cancelled"
  },

  {
    manufacturer: "COMAC",
    model: "ARJ21-700",
    year: 2016,
    seats: 95,
    range_nm: 1200,
    speed_kts: 450,
    mtow_kg: 40500,
    fuel_burn_kgph: 2000,
    price_acs_usd: 38000000,
    engines: "GE CF34-10A"
  },

  {
    manufacturer: "COMAC",
    model: "C919",
    year: 2021,
    seats: 158,
    range_nm: 2550,
    speed_kts: 450,
    mtow_kg: 72500,
    fuel_burn_kgph: 2300,
    price_acs_usd: 65000000,
    engines: "LEAP-1C"
    },
  // ============================================================
  // FUTURE / PROTOTYPES / ACS FUTURE LAB (2026 — 2035+)
  // ============================================================

  {
    manufacturer: "Boeing",
    model: "787-3",
    year: 2026,
    seats: 290,
    range_nm: 3050,
    speed_kts: 488,
    mtow_kg: 165000,
    fuel_burn_kgph: 6000,
    price_acs_usd: 198000000,
    engines: "GEnx-1B",
    status: "future"
  },

  {
    manufacturer: "Boeing",
    model: "797 (NMA-6X)",
    year: 2029,
    seats: 265,
    range_nm: 4800,
    speed_kts: 475,
    mtow_kg: 162000,
    fuel_burn_kgph: 5500,
    price_acs_usd: 175000000,
    engines: "GE9Lite (Projected)",
    status: "future"
  },

  {
    manufacturer: "Boeing",
    model: "Sonic Cruiser",
    year: 2028,
    seats: 250,
    range_nm: 9000,
    speed_kts: 530,     // Mach ~0.98
    mtow_kg: 225000,
    fuel_burn_kgph: 9000,
    price_acs_usd: 290000000,
    engines: "GE Affinity (Concept)",
    status: "concept"
  },

  {
    manufacturer: "Boeing",
    model: "777-10X (Concept)",
    year: 2030,
    seats: 450,
    range_nm: 8200,
    speed_kts: 495,
    mtow_kg: 360000,
    fuel_burn_kgph: 10000,
    price_acs_usd: 460000000,
    engines: "GE9X",
    status: "prototype"
  },

  {
    manufacturer: "Airbus",
    model: "A380F (Freighter)",
    year: 2027,
    seats: 0,
    range_nm: 5200,
    speed_kts: 490,
    mtow_kg: 590000,
    fuel_burn_kgph: 16000,
    price_acs_usd: 420000000,
    engines: "RR Trent 970",
    status: "future"
  },

  {
    manufacturer: "Airbus",
    model: "ZEROe Turbofan",
    year: 2035,
    seats: 120,
    range_nm: 2000,
    speed_kts: 430,
    mtow_kg: 68000,
    fuel_burn_kgph: 0,  // hydrogen-electric
    price_acs_usd: 112000000,
    engines: "Hydrogen Hybrid",
    status: "future"
  },

  {
    manufacturer: "Airbus",
    model: "A360X (Concept)",
    year: 2032,
    seats: 300,
    range_nm: 6000,
    speed_kts: 480,
    mtow_kg: 210000,
    fuel_burn_kgph: 7500,
    price_acs_usd: 240000000,
    engines: "RR UltraFan",
    status: "concept"
  },

  {
    manufacturer: "COMAC",
    model: "CR929",
    year: 2030,
    seats: 280,
    range_nm: 6300,
    speed_kts: 475,
    mtow_kg: 245000,
    fuel_burn_kgph: 7600,
    price_acs_usd: 210000000,
    engines: "PD-35 / RR UltraFan (Projected)",
    status: "future"
  },

  {
    manufacturer: "COMAC",
    model: "C939 (Concept)",
    year: 2033,
    seats: 350,
    range_nm: 7100,
    speed_kts: 480,
    mtow_kg: 290000,
    fuel_burn_kgph: 8900,
    price_acs_usd: 260000000,
    engines: "PD-38 (Projected)",
    status: "concept"
  },

  {
    manufacturer: "McDonnell Douglas",
    model: "MD-12X",
    year: 2028,
    seats: 500,
    range_nm: 7500,
    speed_kts: 480,
    mtow_kg: 500000,
    fuel_burn_kgph: 15500,
    price_acs_usd: 335000000,
    engines: "PW4000 (Concept)",
    status: "concept"
  },

  {
    manufacturer: "Sukhoi",
    model: "KR-860",
    year: 2030,
    seats: 860,
    range_nm: 9600,
    speed_kts: 485,
    mtow_kg: 650000,
    fuel_burn_kgph: 18500,
    price_acs_usd: 500000000,
    engines: "NK-44 (Projected)",
    status: "future"
  },

  {
    manufacturer: "Tupolev",
    model: "Tu-444",
    year: 2029,
    seats: 30,
    range_nm: 4300,
    speed_kts: 620,     // Mach 1.8
    mtow_kg: 60000,
    fuel_burn_kgph: 3500,
    price_acs_usd: 95000000,
    engines: "NK-321 (Supersonic)",
    status: "prototype"
  },

  {
    manufacturer: "Tupolev",
    model: "Tu-304 (Projected)",
    year: 2031,
    seats: 270,
    range_nm: 5500,
    speed_kts: 480,
    mtow_kg: 210000,
    fuel_burn_kgph: 8200,
    price_acs_usd: 200000000,
    engines: "PS-30",
    status: "future"
  },

  {
    manufacturer: "Irkut",
    model: "IL-106 PAK TA (Cargo)",
    year: 2030,
    seats: 0,
    range_nm: 4500,
    speed_kts: 450,
    mtow_kg: 210000,
    fuel_burn_kgph: 7500,
    price_acs_usd: 250000000,
    engines: "PD-35",
    status: "future"
  },

  {
    manufacturer: "Embraer",
    model: "E3 TurboProp 2028",
    year: 2028,
    seats: 90,
    range_nm: 1500,
    speed_kts: 330,
    mtow_kg: 33000,
    fuel_burn_kgph: 650,
    price_acs_usd: 39000000,
    engines: "PW Hybrid-XT",
    status: "future"
  },

  {
  manufacturer: "ATR",
  model: "ATR 72-700 EVO Max",
  year: 2029,
  seats: 78,
  range_nm: 950,
  speed_kts: 280,
  mtow_kg: 24500,
  fuel_burn_kgph: 680,
  price_acs_usd: 25500000,
  engines: "PW127XT-EVO",
  status: "future"
}   <-- ESTE CIERRE DEBE SER SIN COMA
];  <-- Y LUEGO ESTO

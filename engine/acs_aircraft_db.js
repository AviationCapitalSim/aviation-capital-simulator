/* ============================================================
   === ACS AIRCRAFT DATABASE — FULL EDITION ====================
   === Clean, Valid JS — Ready for ACS Buy/Lease Engine ========
   ============================================================ */

const ACS_AIRCRAFT_DB = [

  // ============================================================
  // 1920 — 1934  (Early Commercial Pioneers)
  // ============================================================

  {
    manufacturer: "Junkers",
    model: "F.13",
    year: 1920,
    seats: 4,
    range_nm: 430,
    speed_kts: 95,
    mtow_kg: 1950,
    fuel_burn_kgph: 90,
    price_acs_usd: 60000,
    engines: "BMW IIIa"
  },

  {
    manufacturer: "Fokker",
    model: "F.VIIb-3m",
    year: 1924,
    seats: 8,
    range_nm: 750,
    speed_kts: 105,
    mtow_kg: 5200,
    fuel_burn_kgph: 220,
    price_acs_usd: 120000,
    engines: "Wright J-4 / J-5"
  },

  {
    manufacturer: "Ford",
    model: "5-AT Trimotor",
    year: 1926,
    seats: 10,
    range_nm: 510,
    speed_kts: 105,
    mtow_kg: 6350,
    fuel_burn_kgph: 260,
    price_acs_usd: 150000,
    engines: "PW Wasp"
  },

  {
    manufacturer: "Lockheed",
    model: "Vega 5",
    year: 1927,
    seats: 6,
    range_nm: 725,
    speed_kts: 140,
    mtow_kg: 2500,
    fuel_burn_kgph: 200,
    price_acs_usd: 95000,
    engines: "PW Wasp"
  },

  {
    manufacturer: "Sikorsky",
    model: "S-38",
    year: 1928,
    seats: 8,
    range_nm: 600,
    speed_kts: 105,
    mtow_kg: 4080,
    fuel_burn_kgph: 260,
    price_acs_usd: 130000,
    engines: "PW R-985"
  },

  {
    manufacturer: "Lockheed",
    model: "Model 9 Orion",
    year: 1931,
    seats: 6,
    range_nm: 750,
    speed_kts: 160,
    mtow_kg: 3800,
    fuel_burn_kgph: 230,
    price_acs_usd: 140000,
    engines: "PW Wasp"
  },

  {
    manufacturer: "de Havilland",
    model: "DH.84 Dragon",
    year: 1932,
    seats: 6,
    range_nm: 500,
    speed_kts: 105,
    mtow_kg: 2000,
    fuel_burn_kgph: 150,
    price_acs_usd: 80000,
    engines: "DH Gipsy Major"
  },

  {
    manufacturer: "Boeing",
    model: "247",
    year: 1933,
    seats: 10,
    range_nm: 745,
    speed_kts: 160,
    mtow_kg: 8800,
    fuel_burn_kgph: 360,
    price_acs_usd: 280000,
    engines: "PW R-1340"
  },

  {
    manufacturer: "de Havilland",
    model: "DH.89 Dragon Rapide",
    year: 1934,
    seats: 8,
    range_nm: 500,
    speed_kts: 115,
    mtow_kg: 2700,
    fuel_burn_kgph: 160,
    price_acs_usd: 90000,
    engines: "DH Gipsy Six"
  },

     // ============================================================
  // 1940 — 1949 (Advanced Pistons & Early Postwar)
  // ============================================================

  {
    manufacturer: "Convair",
    model: "CV-240",
    year: 1947,
    seats: 40,
    range_nm: 1150,
    speed_kts: 255,
    mtow_kg: 16500,
    fuel_burn_kgph: 750,
    price_acs_usd: 1200000,
    engines: "PW R-2800"
  },

  {
    manufacturer: "Convair",
    model: "CV-340",
    year: 1951,
    seats: 44,
    range_nm: 1600,
    speed_kts: 270,
    mtow_kg: 20000,
    fuel_burn_kgph: 850,
    price_acs_usd: 1500000,
    engines: "PW R-2800"
  },

  {
    manufacturer: "Convair",
    model: "CV-440 Metropolitan",
    year: 1956,
    seats: 52,
    range_nm: 2100,
    speed_kts: 280,
    mtow_kg: 20700,
    fuel_burn_kgph: 900,
    price_acs_usd: 1800000,
    engines: "PW R-2800"
  },

  {
    manufacturer: "Vickers",
    model: "VC.1 Viking",
    year: 1946,
    seats: 27,
    range_nm: 1000,
    speed_kts: 220,
    mtow_kg: 18500,
    fuel_burn_kgph: 650,
    price_acs_usd: 950000,
    engines: "Bristol Hercules"
  },

  {
    manufacturer: "de Havilland",
    model: "DH.95 Flamingo",
    year: 1938,
    seats: 12,
    range_nm: 850,
    speed_kts: 190,
    mtow_kg: 6400,
    fuel_burn_kgph: 380,
    price_acs_usd: 600000,
    engines: "Bristol Perseus"
  },

  {
    manufacturer: "Douglas",
    model: "Super DC-3 (R4D-8)",
    year: 1949,
    seats: 30,
    range_nm: 1800,
    speed_kts: 210,
    mtow_kg: 13500,
    fuel_burn_kgph: 500,
    price_acs_usd: 900000,
    engines: "PW R-1830"
  },

  {
    manufacturer: "Avro",
    model: "Lancastrian",
    year: 1943,
    seats: 13,
    range_nm: 4300,
    speed_kts: 280,
    mtow_kg: 33000,
    fuel_burn_kgph: 1600,
    price_acs_usd: 1800000,
    engines: "RR Merlin"
  },

  {
    manufacturer: "Boeing",
    model: "C-97 Stratofreighter",
    year: 1944,
    seats: 80,  // mixed cargo/pax
    range_nm: 3500,
    speed_kts: 310,
    mtow_kg: 66000,
    fuel_burn_kgph: 2600,
    price_acs_usd: 3500000,
    engines: "PW R-4360"
  },

  {
    manufacturer: "Lockheed",
    model: "Model 18-56 Lodestar (Military C-60)",
    year: 1942,
    seats: 18,
    range_nm: 1500,
    speed_kts: 245,
    mtow_kg: 8200,
    fuel_burn_kgph: 580,
    price_acs_usd: 700000,
    engines: "PW R-1830"
  },

  {
    manufacturer: "Handley Page",
    model: "HP.70 Halton",
    year: 1946,
    seats: 34,
    range_nm: 1540,
    speed_kts: 240,
    mtow_kg: 31000,
    fuel_burn_kgph: 1400,
    price_acs_usd: 1300000,
    engines: "Bristol Hercules"
  },
// ============================================================
// 1940 — 1974 (de Havilland Complete + Comet Family + Trident)
// ============================================================

{
  manufacturer: "de Havilland",
  model: "DH.86 Express",
  year: 1934,
  seats: 10,
  range_nm: 640,
  speed_kts: 140,
  mtow_kg: 3900,
  fuel_burn_kgph: 240,
  price_acs_usd: 110000,
  engines: "DH Gipsy Six (x4)"
},

{
  manufacturer: "de Havilland",
  model: "DH.91 Albatross",
  year: 1938,
  seats: 22,
  range_nm: 1900,
  speed_kts: 210,
  mtow_kg: 15500,
  fuel_burn_kgph: 850,
  price_acs_usd: 600000,
  engines: "RR Gipsy Twelve"
},

{
  manufacturer: "de Havilland",
  model: "DH.104 Dove",
  year: 1946,
  seats: 8,
  range_nm: 850,
  speed_kts: 210,
  mtow_kg: 3650,
  fuel_burn_kgph: 300,
  price_acs_usd: 450000,
  engines: "Gipsy Queen 70-3"
},

{
  manufacturer: "de Havilland",
  model: "DH.114 Heron",
  year: 1950,
  seats: 17,
  range_nm: 870,
  speed_kts: 175,
  mtow_kg: 6350,
  fuel_burn_kgph: 360,
  price_acs_usd: 850000,
  engines: "Gipsy Queen 30 (x4)"
},

// ======================== COMET FAMILY ========================

{
  manufacturer: "de Havilland",
  model: "Comet 1",
  year: 1952,
  seats: 36,
  range_nm: 1500,
  speed_kts: 430,
  mtow_kg: 48000,
  fuel_burn_kgph: 5000,
  price_acs_usd: 5000000,
  engines: "Ghost 50 Mk1"
},

{
  manufacturer: "de Havilland",
  model: "Comet 2",
  year: 1953,
  seats: 44,
  range_nm: 2100,
  speed_kts: 440,
  mtow_kg: 54000,
  fuel_burn_kgph: 5200,
  price_acs_usd: 6200000,
  engines: "Ghost 50 Mk2"
},

{
  manufacturer: "de Havilland",
  model: "Comet 3",
  year: 1954,
  seats: 58,
  range_nm: 2600,
  speed_kts: 455,
  mtow_kg: 72000,
  fuel_burn_kgph: 5600,
  price_acs_usd: 7000000,
  engines: "Ghost 50 Mk4"
},

{
  manufacturer: "de Havilland",
  model: "Comet 4",
  year: 1958,
  seats: 81,
  range_nm: 3100,
  speed_kts: 455,
  mtow_kg: 73000,
  fuel_burn_kgph: 5800,
  price_acs_usd: 9500000,
  engines: "Ghost 50 Mk4B"
},

// ======================== TRIDENT FAMILY ========================

{
  manufacturer: "Hawker Siddeley",
  model: "Trident 1C",
  year: 1964,
  seats: 117,
  range_nm: 2000,
  speed_kts: 530,
  mtow_kg: 60000,
  fuel_burn_kgph: 5900,
  price_acs_usd: 12000000,
  engines: "RR Spey 505"
},

{
  manufacturer: "Hawker Siddeley",
  model: "Trident 2E",
  year: 1968,
  seats: 128,
  range_nm: 2500,
  speed_kts: 530,
  mtow_kg: 66000,
  fuel_burn_kgph: 6200,
  price_acs_usd: 13500000,
  engines: "RR Spey 512"
},

{
  manufacturer: "Hawker Siddeley",
  model: "Trident 3B",
  year: 1971,
  seats: 180,
  range_nm: 1750,
  speed_kts: 530,
  mtow_kg: 70000,
  fuel_burn_kgph: 6500,
  price_acs_usd: 15000000,
  engines: "RR Spey 555-15"
},

// ============================================================
// 1950 — 1970 (British Turboprops & Early Europeans)
// Viscount • Vanguard • Britannia • Others
// ============================================================

{
  manufacturer: "Vickers",
  model: "Viscount 700",
  year: 1953,
  seats: 48,
  range_nm: 1400,
  speed_kts: 280,
  mtow_kg: 31000,
  fuel_burn_kgph: 1450,
  price_acs_usd: 4200000,
  engines: "RR Dart"
},

{
  manufacturer: "Vickers",
  model: "Viscount 800",
  year: 1957,
  seats: 65,
  range_nm: 1550,
  speed_kts: 295,
  mtow_kg: 35000,
  fuel_burn_kgph: 1550,
  price_acs_usd: 5400000,
  engines: "RR Dart"
},

{
  manufacturer: "Vickers",
  model: "Viscount 810",
  year: 1959,
  seats: 78,
  range_nm: 1650,
  speed_kts: 300,
  mtow_kg: 39000,
  fuel_burn_kgph: 1650,
  price_acs_usd: 6800000,
  engines: "RR Dart"
},

{
  manufacturer: "Vickers",
  model: "Vanguard V.953",
  year: 1959,
  seats: 132,
  range_nm: 1800,
  speed_kts: 330,
  mtow_kg: 60000,
  fuel_burn_kgph: 3000,
  price_acs_usd: 15000000,
  engines: "RR Tyne"
},

{
  manufacturer: "Vickers",
  model: "Vanguard V.952 (Cargo Merchantman)",
  year: 1963,
  seats: 0,
  range_nm: 1800,
  speed_kts: 330,
  mtow_kg: 60000,
  fuel_burn_kgph: 3100,
  price_acs_usd: 17000000,
  engines: "RR Tyne",
  status: "cargo"
},

{
  manufacturer: "Bristol",
  model: "Britannia 100",
  year: 1952,
  seats: 90,
  range_nm: 3950,
  speed_kts: 330,
  mtow_kg: 57000,
  fuel_burn_kgph: 3000,
  price_acs_usd: 16000000,
  engines: "Proteus 625"
},

{
  manufacturer: "Bristol",
  model: "Britannia 300",
  year: 1958,
  seats: 139,
  range_nm: 4300,
  speed_kts: 350,
  mtow_kg: 74000,
  fuel_burn_kgph: 3400,
  price_acs_usd: 21000000,
  engines: "Proteus 755"
},

{
  manufacturer: "Handley Page",
  model: "HP.81 Hermes",
  year: 1950,
  seats: 40,
  range_nm: 2300,
  speed_kts: 240,
  mtow_kg: 30000,
  fuel_burn_kgph: 1600,
  price_acs_usd: 5500000,
  engines: "Bristol Hercules"
},

{
  manufacturer: "Handley Page",
  model: "HP.137 Jetstream",
  year: 1967,
  seats: 18,
  range_nm: 950,
  speed_kts: 265,
  mtow_kg: 5700,
  fuel_burn_kgph: 450,
  price_acs_usd: 3000000,
  engines: "Astazou XIV"
},

{
  manufacturer: "Fokker",
  model: "Fokker F27-500",
  year: 1968,
  seats: 56,
  range_nm: 1400,
  speed_kts: 265,
  mtow_kg: 20000,
  fuel_burn_kgph: 950,
  price_acs_usd: 4900000,
  engines: "RR Dart"
},

{
  manufacturer: "Ilyushin",
  model: "Il-18A",
  year: 1958,
  seats: 75,
  range_nm: 2200,
  speed_kts: 335,
  mtow_kg: 64000,
  fuel_burn_kgph: 3200,
  price_acs_usd: 12000000,
  engines: "Ivchenko AI-20"
},

{
  manufacturer: "Ilyushin",
  model: "Il-18D",
  year: 1965,
  seats: 120,
  range_nm: 3900,
  speed_kts: 350,
  mtow_kg: 64000,
  fuel_burn_kgph: 3400,
  price_acs_usd: 14500000,
  engines: "Ivchenko AI-20M"
},

// ============================================================
// 1945 — 1980 (Soviet Aircraft Expansion)
// Ilyushin • Tupolev • Antonov • Yakovlev
// ============================================================

// ======================= ILYUSHIN =======================

{
  manufacturer: "Ilyushin",
  model: "Il-12",
  year: 1946,
  seats: 32,
  range_nm: 930,
  speed_kts: 190,
  mtow_kg: 18000,
  fuel_burn_kgph: 900,
  price_acs_usd: 1400000,
  engines: "Shvetsov ASh-82"
},

{
  manufacturer: "Ilyushin",
  model: "Il-14",
  year: 1950,
  seats: 36,
  range_nm: 1350,
  speed_kts: 215,
  mtow_kg: 21000,
  fuel_burn_kgph: 1000,
  price_acs_usd: 1800000,
  engines: "Shvetsov ASh-82T"
},

// Il-18 A y D ya añadidos en PARTE 4. Aquí agrego B y V:

{
  manufacturer: "Ilyushin",
  model: "Il-18B",
  year: 1960,
  seats: 84,
  range_nm: 2500,
  speed_kts: 345,
  mtow_kg: 64000,
  fuel_burn_kgph: 3300,
  price_acs_usd: 13500000,
  engines: "Ivchenko AI-20"
},

{
  manufacturer: "Ilyushin",
  model: "Il-18V",
  year: 1961,
  seats: 100,
  range_nm: 3100,
  speed_kts: 350,
  mtow_kg: 64000,
  fuel_burn_kgph: 3400,
  price_acs_usd: 15000000,
  engines: "Ivchenko AI-20M"
},

// ======================= TUPOLEV =======================

{
  manufacturer: "Tupolev",
  model: "Tu-70",
  year: 1946,
  seats: 48,
  range_nm: 2000,
  speed_kts: 265,
  mtow_kg: 34000,
  fuel_burn_kgph: 1700,
  price_acs_usd: 3500000,
  engines: "Shvetsov ASh-73"
},

{
  manufacturer: "Tupolev",
  model: "Tu-104",
  year: 1956,
  seats: 70,
  range_nm: 1450,
  speed_kts: 480,
  mtow_kg: 62000,
  fuel_burn_kgph: 6200,
  price_acs_usd: 12000000,
  engines: "Mikulin AM-3"
},

{
  manufacturer: "Tupolev",
  model: "Tu-114",
  year: 1957,
  seats: 170,
  range_nm: 4350,
  speed_kts: 400,
  mtow_kg: 164000,
  fuel_burn_kgph: 6800,
  price_acs_usd: 30000000,
  engines: "NK-12 (turboprop)"
},

{
  manufacturer: "Tupolev",
  model: "Tu-134",
  year: 1967,
  seats: 80,
  range_nm: 1200,
  speed_kts: 510,
  mtow_kg: 47500,
  fuel_burn_kgph: 5200,
  price_acs_usd: 16000000,
  engines: "Soloviev D-30"
},

{
  manufacturer: "Tupolev",
  model: "Tu-154",
  year: 1972,
  seats: 164,
  range_nm: 2600,
  speed_kts: 530,
  mtow_kg: 98000,
  fuel_burn_kgph: 9200,
  price_acs_usd: 28000000,
  engines: "Soloviev D-30KU-154"
},

// ======================= ANTONOV =======================

{
  manufacturer: "Antonov",
  model: "An-10",
  year: 1957,
  seats: 100,
  range_nm: 1100,
  speed_kts: 345,
  mtow_kg: 56000,
  fuel_burn_kgph: 3400,
  price_acs_usd: 12000000,
  engines: "Ivchenko AI-20"
},

{
  manufacturer: "Antonov",
  model: "An-12",
  year: 1959,
  seats: 0,
  range_nm: 2000,
  speed_kts: 330,
  mtow_kg: 61000,
  fuel_burn_kgph: 3500,
  price_acs_usd: 16000000,
  engines: "Ivchenko AI-20M",
  status: "cargo"
},

{
  manufacturer: "Antonov",
  model: "An-24",
  year: 1959,
  seats: 44,
  range_nm: 1300,
  speed_kts: 240,
  mtow_kg: 21000,
  fuel_burn_kgph: 850,
  price_acs_usd: 6000000,
  engines: "Ivchenko AI-24"
},

{
  manufacturer: "Antonov",
  model: "An-26",
  year: 1969,
  seats: 40,
  range_nm: 1000,
  speed_kts: 230,
  mtow_kg: 24000,
  fuel_burn_kgph: 900,
  price_acs_usd: 7000000,
  engines: "Ivchenko AI-24VT",
  status: "cargo/passenger"
},

{
  manufacturer: "Antonov",
  model: "An-72",
  year: 1977,
  seats: 52,
  range_nm: 2100,
  speed_kts: 360,
  mtow_kg: 34000,
  fuel_burn_kgph: 3200,
  price_acs_usd: 17000000,
  engines: "Lotarev D-36"
},

{
  manufacturer: "Antonov",
  model: "An-74",
  year: 1983,
  seats: 52,
  range_nm: 2300,
  speed_kts: 370,
  mtow_kg: 36000,
  fuel_burn_kgph: 3300,
  price_acs_usd: 19000000,
  engines: "Lotarev D-36"
},

// ======================= YAKOVLEV =======================

{
  manufacturer: "Yakovlev",
  model: "Yak-40",
  year: 1968,
  seats: 32,
  range_nm: 810,
  speed_kts: 245,
  mtow_kg: 16500,
  fuel_burn_kgph: 1100,
  price_acs_usd: 9000000,
  engines: "Ivchenko AI-25"
},

{
  manufacturer: "Yakovlev",
  model: "Yak-42",
  year: 1980,
  seats: 120,
  range_nm: 1400,
  speed_kts: 405,
  mtow_kg: 57000,
  fuel_burn_kgph: 6800,
  price_acs_usd: 24000000,
  engines: "Lotarev D-36"
},

// ============================================================
// 1950 — 1975 (Convair / Martin / Sud Aviation / USA Rare)
// ============================================================

// ======================= CONVAIR =======================

{
  manufacturer: "Convair",
  model: "CV-240",
  year: 1948,
  seats: 40,
  range_nm: 1000,
  speed_kts: 245,
  mtow_kg: 16500,
  fuel_burn_kgph: 850,
  price_acs_usd: 3200000,
  engines: "PW R-2800"
},

{
  manufacturer: "Convair",
  model: "CV-340",
  year: 1952,
  seats: 44,
  range_nm: 1280,
  speed_kts: 255,
  mtow_kg: 18500,
  fuel_burn_kgph: 900,
  price_acs_usd: 3500000,
  engines: "PW R-2800"
},

{
  manufacturer: "Convair",
  model: "CV-440 Metropolitan",
  year: 1956,
  seats: 52,
  range_nm: 1300,
  speed_kts: 265,
  mtow_kg: 19500,
  fuel_burn_kgph: 950,
  price_acs_usd: 3800000,
  engines: "PW R-2800"
},

// Turboprops

{
  manufacturer: "Convair",
  model: "CV-540",
  year: 1955,
  seats: 48,
  range_nm: 1300,
  speed_kts: 285,
  mtow_kg: 20000,
  fuel_burn_kgph: 1100,
  price_acs_usd: 4500000,
  engines: "Napier Eland"
},

{
  manufacturer: "Convair",
  model: "CV-580",
  year: 1965,
  seats: 50,
  range_nm: 1300,
  speed_kts: 300,
  mtow_kg: 20500,
  fuel_burn_kgph: 1200,
  price_acs_usd: 5200000,
  engines: "Allison 501-D13"
},

{
  manufacturer: "Convair",
  model: "CV-600",
  year: 1965,
  seats: 48,
  range_nm: 1100,
  speed_kts: 275,
  mtow_kg: 19000,
  fuel_burn_kgph: 1000,
  price_acs_usd: 4800000,
  engines: "RR Dart 510"
},

{
  manufacturer: "Convair",
  model: "CV-640",
  year: 1968,
  seats: 52,
  range_nm: 1150,
  speed_kts: 285,
  mtow_kg: 20000,
  fuel_burn_kgph: 1100,
  price_acs_usd: 5000000,
  engines: "RR Dart 510"
},

// ======================= MARTIN =======================

{
  manufacturer: "Martin",
  model: "2-0-2",
  year: 1946,
  seats: 40,
  range_nm: 1010,
  speed_kts: 235,
  mtow_kg: 15500,
  fuel_burn_kgph: 780,
  price_acs_usd: 2900000,
  engines: "PW R-2800"
},

{
  manufacturer: "Martin",
  model: "4-0-4",
  year: 1951,
  seats: 44,
  range_nm: 1350,
  speed_kts: 250,
  mtow_kg: 19000,
  fuel_burn_kgph: 900,
  price_acs_usd: 3400000,
  engines: "PW R-2800"
},

// ======================= SUD AVIATION CARAVELLE (EXPANDED) =======================
// Caravelle ya existe la básica → agregamos variantes importantes

{
  manufacturer: "Sud Aviation",
  model: "Caravelle III",
  year: 1959,
  seats: 96,
  range_nm: 1450,
  speed_kts: 505,
  mtow_kg: 52000,
  fuel_burn_kgph: 4600,
  price_acs_usd: 11500000,
  engines: "RR Avon"
},

{
  manufacturer: "Sud Aviation",
  model: "Caravelle 6R",
  year: 1960,
  seats: 98,
  range_nm: 1750,
  speed_kts: 510,
  mtow_kg: 53500,
  fuel_burn_kgph: 4900,
  price_acs_usd: 12500000,
  engines: "RR Avon RA.29"
},

{
  manufacturer: "Sud Aviation",
  model: "Caravelle 10B",
  year: 1964,
  seats: 109,
  range_nm: 2000,
  speed_kts: 515,
  mtow_kg: 55000,
  fuel_burn_kgph: 5100,
  price_acs_usd: 14500000,
  engines: "GE CJ805-23"
},

{
  manufacturer: "Sud Aviation",
  model: "Caravelle 12R",
  year: 1970,
  seats: 131,
  range_nm: 2050,
  speed_kts: 520,
  mtow_kg: 57500,
  fuel_burn_kgph: 5200,
  price_acs_usd: 16500000,
  engines: "GE CJ805-23"
},

// ======================= RARE USA / SPECIAL AIRCRAFT =======================

{
  manufacturer: "Howard",
  model: "500",
  year: 1959,
  seats: 12,
  range_nm: 2450,
  speed_kts: 350,
  mtow_kg: 6800,
  fuel_burn_kgph: 640,
  price_acs_usd: 4500000,
  engines: "PW R-2800"
},

{
  manufacturer: "Aero Commander",
  model: "500B",
  year: 1954,
  seats: 6,
  range_nm: 950,
  speed_kts: 210,
  mtow_kg: 4100,
  fuel_burn_kgph: 300,
  price_acs_usd: 1200000,
  engines: "Lycoming GO-480"
},

{
  manufacturer: "Aero Commander",
  model: "680 Super",
  year: 1956,
  seats: 8,
  range_nm: 1500,
  speed_kts: 245,
  mtow_kg: 5200,
  fuel_burn_kgph: 350,
  price_acs_usd: 1800000,
  engines: "Continental GTSIO-520"
},

{
  manufacturer: "Fairchild",
  model: "F-27",
  year: 1958,
  seats: 44,
  range_nm: 1210,
  speed_kts: 260,
  mtow_kg: 20000,
  fuel_burn_kgph: 900,
  price_acs_usd: 3800000,
  engines: "RR Dart 6"
},

{
  manufacturer: "Beechcraft",
  model: "1900D",
  year: 1991,
  seats: 19,
  range_nm: 700,
  speed_kts: 280,
  mtow_kg: 7700,
  fuel_burn_kgph: 370,
  price_acs_usd: 4200000,
  engines: "PT6A-67D"
},

// ============================================================
// 1970 — 2020 (European Regionals)
// ============================================================

// ======================= SAAB =======================

{
  manufacturer: "Saab",
  model: "Saab 340B",
  year: 1989,
  seats: 34,
  range_nm: 1050,
  speed_kts: 280,
  mtow_kg: 12900,
  fuel_burn_kgph: 650,
  price_acs_usd: 9500000,
  engines: "GE CT7-9B"
},

{
  manufacturer: "Saab",
  model: "Saab 2000",
  year: 1994,
  seats: 50,
  range_nm: 1230,
  speed_kts: 360,
  mtow_kg: 22800,
  fuel_burn_kgph: 900,
  price_acs_usd: 17000000,
  engines: "RR AE2100A"
},

// ======================= DORNIER =======================

{
  manufacturer: "Dornier",
  model: "Do 228-200",
  year: 1981,
  seats: 19,
  range_nm: 550,
  speed_kts: 210,
  mtow_kg: 6400,
  fuel_burn_kgph: 300,
  price_acs_usd: 5200000,
  engines: "Garrett TPE331"
},

{
  manufacturer: "Dornier",
  model: "Do 328-100",
  year: 1993,
  seats: 33,
  range_nm: 1000,
  speed_kts: 335,
  mtow_kg: 13000,
  fuel_burn_kgph: 620,
  price_acs_usd: 12500000,
  engines: "PW119B"
},

{
  manufacturer: "Dornier",
  model: "Do 328JET",
  year: 1999,
  seats: 32,
  range_nm: 1050,
  speed_kts: 375,
  mtow_kg: 14500,
  fuel_burn_kgph: 950,
  price_acs_usd: 16500000,
  engines: "PW306B"
},

// ======================= BAe / BRITISH AEROSPACE =======================

{
  manufacturer: "British Aerospace",
  model: "ATP",
  year: 1988,
  seats: 64,
  range_nm: 1150,
  speed_kts: 285,
  mtow_kg: 22700,
  fuel_burn_kgph: 950,
  price_acs_usd: 14000000,
  engines: "PW126"
},

{
  manufacturer: "British Aerospace",
  model: "Jetstream 31",
  year: 1982,
  seats: 19,
  range_nm: 630,
  speed_kts: 240,
  mtow_kg: 6400,
  fuel_burn_kgph: 330,
  price_acs_usd: 3500000,
  engines: "Garrett TPE331"
},

{
  manufacturer: "British Aerospace",
  model: "Jetstream 32EP",
  year: 1988,
  seats: 19,
  range_nm: 690,
  speed_kts: 250,
  mtow_kg: 6800,
  fuel_burn_kgph: 360,
  price_acs_usd: 3900000,
  engines: "Garrett TPE331-12UHR"
},

{
  manufacturer: "British Aerospace",
  model: "Jetstream 41",
  year: 1992,
  seats: 29,
  range_nm: 800,
  speed_kts: 265,
  mtow_kg: 10900,
  fuel_burn_kgph: 520,
  price_acs_usd: 8500000,
  engines: "Allison 501-D22"
},

// ======================= LET AIRCRAFT (Czech) =======================

{
  manufacturer: "LET",
  model: "L-410 UVP-E20",
  year: 1986,
  seats: 19,
  range_nm: 780,
  speed_kts: 195,
  mtow_kg: 6600,
  fuel_burn_kgph: 340,
  price_acs_usd: 4800000,
  engines: "Walter M601F"
},

{
  manufacturer: "LET",
  model: "L-610",
  year: 1988,
  seats: 44,
  range_nm: 1100,
  speed_kts: 260,
  mtow_kg: 16500,
  fuel_burn_kgph: 900,
  price_acs_usd: 12000000,
  engines: "Walter M602"
},

// ======================= SHORTS =======================

{
  manufacturer: "Shorts",
  model: "Shorts 330",
  year: 1976,
  seats: 30,
  range_nm: 700,
  speed_kts: 180,
  mtow_kg: 10000,
  fuel_burn_kgph: 420,
  price_acs_usd: 4500000,
  engines: "PT6A-45"
},

{
  manufacturer: "Shorts",
  model: "Shorts 360",
  year: 1981,
  seats: 36,
  range_nm: 900,
  speed_kts: 185,
  mtow_kg: 12000,
  fuel_burn_kgph: 460,
  price_acs_usd: 5200000,
  engines: "PT6A-65"
},

// ======================= CASA / NURTANIO =======================

{
  manufacturer: "CASA",
  model: "CN-235",
  year: 1986,
  seats: 48,
  range_nm: 1250,
  speed_kts: 235,
  mtow_kg: 15500,
  fuel_burn_kgph: 800,
  price_acs_usd: 18000000,
  engines: "GE CT7-9C"
},

{
  manufacturer: "CASA",
  model: "C-295 (Civil)",
  year: 1999,
  seats: 70,
  range_nm: 1300,
  speed_kts: 260,
  mtow_kg: 23000,
  fuel_burn_kgph: 900,
  price_acs_usd: 28000000,
  engines: "PW127G"
},

// ======================= FOKKER (Missing Regionals) =======================

{
  manufacturer: "Fokker",
  model: "F50",
  year: 1987,
  seats: 50,
  range_nm: 980,
  speed_kts: 270,
  mtow_kg: 20500,
  fuel_burn_kgph: 820,
  price_acs_usd: 15000000,
  engines: "PW125B"
},

{
  manufacturer: "Fokker",
  model: "F60",
  year: 1994,
  seats: 52,
  range_nm: 1300,
  speed_kts: 275,
  mtow_kg: 23000,
  fuel_burn_kgph: 850,
  price_acs_usd: 17500000,
  engines: "PW127B"
},

// ============================================================
// 1970 — 2020 (American Regionals — Turboprops & Light Commuters)
// ============================================================

// ======================= EMBRAER =======================

{
  manufacturer: "Embraer",
  model: "EMB 110 Bandeirante",
  year: 1973,
  seats: 15,
  range_nm: 1000,
  speed_kts: 235,
  mtow_kg: 5700,
  fuel_burn_kgph: 350,
  price_acs_usd: 3800000,
  engines: "PT6A-34"
},

{
  manufacturer: "Embraer",
  model: "EMB 120 Brasilia",
  year: 1985,
  seats: 30,
  range_nm: 1050,
  speed_kts: 295,
  mtow_kg: 11900,
  fuel_burn_kgph: 700,
  price_acs_usd: 7800000,
  engines: "PW118"
},

// ======================= FAIRCHILD SWEARINGEN =======================

{
  manufacturer: "Fairchild Swearingen",
  model: "Metro III",
  year: 1981,
  seats: 19,
  range_nm: 900,
  speed_kts: 285,
  mtow_kg: 6400,
  fuel_burn_kgph: 380,
  price_acs_usd: 4200000,
  engines: "Garrett TPE331-11U"
},

{
  manufacturer: "Fairchild Swearingen",
  model: "Metro 23",
  year: 1992,
  seats: 19,
  range_nm: 1050,
  speed_kts: 300,
  mtow_kg: 6650,
  fuel_burn_kgph: 400,
  price_acs_usd: 4900000,
  engines: "Garrett TPE331-12UHR"
},

// ======================= CESSNA =======================

{
  manufacturer: "Cessna",
  model: "208 Caravan",
  year: 1984,
  seats: 9,
  range_nm: 920,
  speed_kts: 185,
  mtow_kg: 3629,
  fuel_burn_kgph: 240,
  price_acs_usd: 2900000,
  engines: "PT6A-114A"
},

{
  manufacturer: "Cessna",
  model: "208B Grand Caravan",
  year: 1990,
  seats: 14,
  range_nm: 915,
  speed_kts: 186,
  mtow_kg: 3970,
  fuel_burn_kgph: 250,
  price_acs_usd: 3400000,
  engines: "PT6A-114A"
},

{
  manufacturer: "Cessna",
  model: "208EX Grand Caravan EX",
  year: 2013,
  seats: 14,
  range_nm: 940,
  speed_kts: 195,
  mtow_kg: 3970,
  fuel_burn_kgph: 260,
  price_acs_usd: 3800000,
  engines: "PT6A-140"
},

// ======================= PIPER =======================

{
  manufacturer: "Piper",
  model: "PA-31 Navajo",
  year: 1967,
  seats: 6,
  range_nm: 880,
  speed_kts: 220,
  mtow_kg: 2948,
  fuel_burn_kgph: 220,
  price_acs_usd: 1500000,
  engines: "Lycoming TIO-540"
},

{
  manufacturer: "Piper",
  model: "PA-31-350 Chieftain",
  year: 1973,
  seats: 8,
  range_nm: 930,
  speed_kts: 225,
  mtow_kg: 3175,
  fuel_burn_kgph: 240,
  price_acs_usd: 1750000,
  engines: "Lycoming TIO-540-J2BD"
},

// ======================= BEECHCRAFT =======================

{
  manufacturer: "Beechcraft",
  model: "1900C",
  year: 1982,
  seats: 19,
  range_nm: 1300,
  speed_kts: 270,
  mtow_kg: 7170,
  fuel_burn_kgph: 500,
  price_acs_usd: 5800000,
  engines: "PT6A-65B"
},

{
  manufacturer: "Beechcraft",
  model: "1900D",
  year: 1991,
  seats: 19,
  range_nm: 1350,
  speed_kts: 285,
  mtow_kg: 7550,
  fuel_burn_kgph: 520,
  price_acs_usd: 7200000,
  engines: "PT6A-67D"
},

// ======================= DE HAVILLAND CANADA — TWIN OTTER =======================

{
  manufacturer: "De Havilland Canada",
  model: "DHC-6 Twin Otter Series 300",
  year: 1972,
  seats: 19,
  range_nm: 775,
  speed_kts: 180,
  mtow_kg: 5700,
  fuel_burn_kgph: 300,
  price_acs_usd: 5500000,
  engines: "PT6A-27"
},

{
  manufacturer: "De Havilland Canada",
  model: "DHC-6 Twin Otter Series 400",
  year: 2010,
  seats: 19,
  range_nm: 770,
  speed_kts: 183,
  mtow_kg: 6300,
  fuel_burn_kgph: 320,
  price_acs_usd: 7400000,
  engines: "PT6A-34"
},

// ======================= JAPAN — MITSUBISHI =======================

{
  manufacturer: "Mitsubishi",
  model: "MU-2B-60 Marquise",
  year: 1971,
  seats: 8,
  range_nm: 1100,
  speed_kts: 290,
  mtow_kg: 4800,
  fuel_burn_kgph: 350,
  price_acs_usd: 1900000,
  engines: "Garrett TPE331-10"
},

// ======================= GULFSTREAM — G-I =======================

{
  manufacturer: "Gulfstream",
  model: "G-159 (Gulfstream I)",
  year: 1959,
  seats: 24,
  range_nm: 2100,
  speed_kts: 300,
  mtow_kg: 14000,
  fuel_burn_kgph: 900,
  price_acs_usd: 11500000,
  engines: "RR Dart"
},

// ============================================================
// PARTE 9 — HEAVY CARGO & MILITARY → CIVIL (1940–2025)
// ============================================================

// ======================= DOUGLAS / MILITAR CIVIL =======================

{
  manufacturer: "Douglas",
  model: "C-47 Skytrain (DC-3C Cargo)",
  year: 1941,
  seats: 0,
  range_nm: 1500,
  speed_kts: 180,
  mtow_kg: 11800,
  fuel_burn_kgph: 480,
  price_acs_usd: 850000,
  engines: "PW R-1830"
},

{
  manufacturer: "Douglas",
  model: "C-54 Skymaster (DC-4 Cargo)",
  year: 1942,
  seats: 0,
  range_nm: 2500,
  speed_kts: 215,
  mtow_kg: 29700,
  fuel_burn_kgph: 1350,
  price_acs_usd: 1900000,
  engines: "PW R-2000"
},

{
  manufacturer: "Basler",
  model: "BT-67 (DC-3 Modernized)",
  year: 1990,
  seats: 0,
  range_nm: 2100,
  speed_kts: 215,
  mtow_kg: 14000,
  fuel_burn_kgph: 700,
  price_acs_usd: 6200000,
  engines: "PT6A-67R"
},

{
  manufacturer: "Curtiss",
  model: "C-46 Commando",
  year: 1941,
  seats: 0,
  range_nm: 2300,
  speed_kts: 215,
  mtow_kg: 22365,
  fuel_burn_kgph: 1400,
  price_acs_usd: 1700000,
  engines: "Wright R-2800"
},

// ======================= LOCKHEED HERCULES =======================

{
  manufacturer: "Lockheed",
  model: "L-100 (Civil C-130)",
  year: 1965,
  seats: 0,
  range_nm: 1950,
  speed_kts: 320,
  mtow_kg: 70300,
  fuel_burn_kgph: 1900,
  price_acs_usd: 38000000,
  engines: "T56-A-15"
},

{
  manufacturer: "Lockheed",
  model: "L-100-20",
  year: 1970,
  seats: 0,
  range_nm: 2100,
  speed_kts: 320,
  mtow_kg: 70300,
  fuel_burn_kgph: 1950,
  price_acs_usd: 42000000,
  engines: "T56-A-15"
},

{
  manufacturer: "Lockheed",
  model: "L-100-30",
  year: 1971,
  seats: 0,
  range_nm: 2300,
  speed_kts: 320,
  mtow_kg: 70300,
  fuel_burn_kgph: 2000,
  price_acs_usd: 45000000,
  engines: "T56-A-15"
},

// ======================= DHC CARGO / STOL =======================

{
  manufacturer: "De Havilland Canada",
  model: "DHC-4 Caribou",
  year: 1958,
  seats: 0,
  range_nm: 950,
  speed_kts: 195,
  mtow_kg: 12700,
  fuel_burn_kgph: 600,
  price_acs_usd: 6500000,
  engines: "PW R-2000"
},

{
  manufacturer: "De Havilland Canada",
  model: "DHC-5 Buffalo",
  year: 1965,
  seats: 0,
  range_nm: 1200,
  speed_kts: 215,
  mtow_kg: 21000,
  fuel_burn_kgph: 900,
  price_acs_usd: 9700000,
  engines: "General Electric CT64"
},

// ======================= CASA / AIRBUS DEFENCE =======================

{
  manufacturer: "CASA",
  model: "C-212 Aviocar",
  year: 1971,
  seats: 0,
  range_nm: 890,
  speed_kts: 195,
  mtow_kg: 7700,
  fuel_burn_kgph: 350,
  price_acs_usd: 6000000,
  engines: "Garrett TPE331"
},

{
  manufacturer: "Airbus (CASA)",
  model: "CN-235",
  year: 1988,
  seats: 0,
  range_nm: 1300,
  speed_kts: 240,
  mtow_kg: 16000,
  fuel_burn_kgph: 600,
  price_acs_usd: 21000000,
  engines: "GE CT7-9C"
},

{
  manufacturer: "Airbus (CASA)",
  model: "C-295",
  year: 1999,
  seats: 0,
  range_nm: 2600,
  speed_kts: 250,
  mtow_kg: 23000,
  fuel_burn_kgph: 850,
  price_acs_usd: 30000000,
  engines: "PW127G"
},

// ======================= ANTONOV LIGHT/MEDIUM =======================

{
  manufacturer: "Antonov",
  model: "An-24",
  year: 1959,
  seats: 0,
  range_nm: 1200,
  speed_kts: 240,
  mtow_kg: 21200,
  fuel_burn_kgph: 950,
  price_acs_usd: 4500000,
  engines: "AI-24"
},

{
  manufacturer: "Antonov",
  model: "An-26",
  year: 1969,
  seats: 0,
  range_nm: 1100,
  speed_kts: 250,
  mtow_kg: 24000,
  fuel_burn_kgph: 1100,
  price_acs_usd: 6000000,
  engines: "AI-24VT"
},

{
  manufacturer: "Antonov",
  model: "An-30 (Recon → Civil Cargo)",
  year: 1974,
  seats: 0,
  range_nm: 1400,
  speed_kts: 255,
  mtow_kg: 24000,
  fuel_burn_kgph: 1150,
  price_acs_usd: 7000000,
  engines: "AI-24VT"
},

// ======================= ANTONOV TURBOFAN CARGO =======================

{
  manufacturer: "Antonov",
  model: "An-72",
  year: 1977,
  seats: 0,
  range_nm: 1800,
  speed_kts: 380,
  mtow_kg: 34000,
  fuel_burn_kgph: 2600,
  price_acs_usd: 22000000,
  engines: "D-36"
},

{
  manufacturer: "Antonov",
  model: "An-74",
  year: 1983,
  seats: 0,
  range_nm: 2000,
  speed_kts: 390,
  mtow_kg: 36000,
  fuel_burn_kgph: 2700,
  price_acs_usd: 27000000,
  engines: "D-36"
},

{
  manufacturer: "Antonov",
  model: "An-32",
  year: 1983,
  seats: 0,
  range_nm: 1550,
  speed_kts: 260,
  mtow_kg: 27000,
  fuel_burn_kgph: 1200,
  price_acs_usd: 15000000,
  engines: "AI-20DM"
},

// ======================= ANTONOV HEAVY =======================

{
  manufacturer: "Antonov",
  model: "An-12",
  year: 1959,
  seats: 0,
  range_nm: 2200,
  speed_kts: 410,
  mtow_kg: 61000,
  fuel_burn_kgph: 2600,
  price_acs_usd: 18000000,
  engines: "AI-20M"
},

{
  manufacturer: "Antonov",
  model: "An-22",
  year: 1965,
  seats: 0,
  range_nm: 3100,
  speed_kts: 430,
  mtow_kg: 250000,
  fuel_burn_kgph: 5500,
  price_acs_usd: 75000000,
  engines: "NK-12MA"
},

{
  manufacturer: "Antonov",
  model: "An-124 Ruslan",
  year: 1986,
  seats: 0,
  range_nm: 2600,
  speed_kts: 440,
  mtow_kg: 405000,
  fuel_burn_kgph: 9000,
  price_acs_usd: 180000000,
  engines: "D-18T"
},

// ======================= ILYUSHIN HEAVY =======================

{
  manufacturer: "Ilyushin",
  model: "Il-76TD",
  year: 1974,
  seats: 0,
  range_nm: 2600,
  speed_kts: 440,
  mtow_kg: 170000,
  fuel_burn_kgph: 7500,
  price_acs_usd: 52000000,
  engines: "D-30KP"
},

{
  manufacturer: "Ilyushin",
  model: "Il-76MD-90A",
  year: 2015,
  seats: 0,
  range_nm: 2700,
  speed_kts: 450,
  mtow_kg: 210000,
  fuel_burn_kgph: 6900,
  price_acs_usd: 78000000,
  engines: "PS-90A-76"
},

// ======================= HEAVY WESTERN CARGO =======================

{
  manufacturer: "Boeing",
  model: "727-200F",
  year: 1968,
  seats: 0,
  range_nm: 1600,
  speed_kts: 520,
  mtow_kg: 95000,
  fuel_burn_kgph: 6100,
  price_acs_usd: 18000000,
  engines: "JT8D"
},

{
  manufacturer: "Boeing",
  model: "737-300F",
  year: 1984,
  seats: 0,
  range_nm: 2950,
  speed_kts: 480,
  mtow_kg: 63000,
  fuel_burn_kgph: 3200,
  price_acs_usd: 24000000,
  engines: "CFM56-3"
},

{
  manufacturer: "Boeing",
  model: "737-400F",
  year: 1988,
  seats: 0,
  range_nm: 2300,
  speed_kts: 480,
  mtow_kg: 68000,
  fuel_burn_kgph: 3500,
  price_acs_usd: 26000000,
  engines: "CFM56-3"
},

{
  manufacturer: "Boeing",
  model: "737-800BCF",
  year: 2018,
  seats: 0,
  range_nm: 2300,
  speed_kts: 470,
  mtow_kg: 79000,
  fuel_burn_kgph: 3000,
  price_acs_usd: 42000000,
  engines: "CFM56-7B"
},

{
  manufacturer: "Boeing",
  model: "747-200F",
  year: 1972,
  seats: 0,
  range_nm: 4500,
  speed_kts: 555,
  mtow_kg: 360000,
  fuel_burn_kgph: 23000,
  price_acs_usd: 65000000,
  engines: "JT9D"
},

{
  manufacturer: "Boeing",
  model: "747-400F",
  year: 1993,
  seats: 0,
  range_nm: 4400,
  speed_kts: 570,
  mtow_kg: 396000,
  fuel_burn_kgph: 25000,
  price_acs_usd: 150000000,
  engines: "CF6-80C2 / PW4056 / RB211"
},

{
  manufacturer: "Boeing",
  model: "747-8F",
  year: 2011,
  seats: 0,
  range_nm: 4390,
  speed_kts: 570,
  mtow_kg: 447700,
  fuel_burn_kgph: 26000,
  price_acs_usd: 200000000,
  engines: "GEnx-2B67"
},

{
  manufacturer: "Boeing",
  model: "777F",
  year: 2009,
  seats: 0,
  range_nm: 4900,
  speed_kts: 560,
  mtow_kg: 347000,
  fuel_burn_kgph: 9700,
  price_acs_usd: 320000000,
  engines: "GE90-110B1"
},

{
  manufacturer: "Airbus",
  model: "A300B4F",
  year: 1981,
  seats: 0,
  range_nm: 2650,
  speed_kts: 510,
  mtow_kg: 165000,
  fuel_burn_kgph: 9000,
  price_acs_usd: 35000000,
  engines: "CF6-50"
},

{
  manufacturer: "Airbus",
  model: "A310-300F",
  year: 1985,
  seats: 0,
  range_nm: 4500,
  speed_kts: 500,
  mtow_kg: 164000,
  fuel_burn_kgph: 8800,
  price_acs_usd: 60000000,
  engines: "CF6-80C2"
},

{
  manufacturer: "Airbus",
  model: "A330-200F",
  year: 2010,
  seats: 0,
  range_nm: 4200,
  speed_kts: 490,
  mtow_kg: 233000,
  fuel_burn_kgph: 7600,
  price_acs_usd: 235000000,
  engines: "CF6-80E1"
},

{
  manufacturer: "Airbus",
  model: "A330-300P2F",
  year: 2017,
  seats: 0,
  range_nm: 3600,
  speed_kts: 490,
  mtow_kg: 233000,
  fuel_burn_kgph: 7800,
  price_acs_usd: 180000000,
  engines: "CF6-80E1"
},

{
  manufacturer: "MD",
  model: "MD-11F",
  year: 1991,
  seats: 0,
  range_nm: 3600,
  speed_kts: 515,
  mtow_kg: 286000,
  fuel_burn_kgph: 10800,
  price_acs_usd: 90000000,
  engines: "CF6-80C2"
},

// ============================================================
// PARTE 10 — BUSINESS JETS (1960–2035)
// ============================================================

// ======================= LEARJET SERIES =======================

{
  manufacturer: "Learjet",
  model: "Learjet 23",
  year: 1964,
  seats: 6,
  range_nm: 1700,
  speed_kts: 440,
  mtow_kg: 5900,
  fuel_burn_kgph: 600,
  price_acs_usd: 5500000,
  engines: "GE CJ610"
},

{
  manufacturer: "Learjet",
  model: "Learjet 35A",
  year: 1976,
  seats: 8,
  range_nm: 2060,
  speed_kts: 430,
  mtow_kg: 8165,
  fuel_burn_kgph: 650,
  price_acs_usd: 6500000,
  engines: "Honeywell TFE731"
},

{
  manufacturer: "Learjet",
  model: "Learjet 60",
  year: 1993,
  seats: 8,
  range_nm: 2400,
  speed_kts: 455,
  mtow_kg: 10700,
  fuel_burn_kgph: 700,
  price_acs_usd: 12000000,
  engines: "PW305A"
},

{
  manufacturer: "Learjet",
  model: "Learjet 70",
  year: 2013,
  seats: 8,
  range_nm: 2300,
  speed_kts: 465,
  mtow_kg: 10675,
  fuel_burn_kgph: 720,
  price_acs_usd: 13500000,
  engines: "PW305D"
},

// ======================= CESSNA CITATION SERIES =======================

{
  manufacturer: "Cessna",
  model: "Citation I",
  year: 1972,
  seats: 6,
  range_nm: 1100,
  speed_kts: 350,
  mtow_kg: 4800,
  fuel_burn_kgph: 500,
  price_acs_usd: 4000000,
  engines: "PW JT15D"
},

{
  manufacturer: "Cessna",
  model: "Citation II",
  year: 1978,
  seats: 8,
  range_nm: 1300,
  speed_kts: 380,
  mtow_kg: 6900,
  fuel_burn_kgph: 580,
  price_acs_usd: 5500000,
  engines: "PW JT15D-4"
},

{
  manufacturer: "Cessna",
  model: "Citation V",
  year: 1987,
  seats: 8,
  range_nm: 1900,
  speed_kts: 420,
  mtow_kg: 7400,
  fuel_burn_kgph: 650,
  price_acs_usd: 7500000,
  engines: "PW JT15D-5A"
},

{
  manufacturer: "Cessna",
  model: "Citation X+",
  year: 2012,
  seats: 12,
  range_nm: 3600,
  speed_kts: 525,  // Mach 0.935
  mtow_kg: 16400,
  fuel_burn_kgph: 1200,
  price_acs_usd: 23000000,
  engines: "RR AE3007C2"
},

{
  manufacturer: "Cessna",
  model: "Citation Latitude",
  year: 2015,
  seats: 9,
  range_nm: 2700,
  speed_kts: 446,
  mtow_kg: 13900,
  fuel_burn_kgph: 1000,
  price_acs_usd: 17500000,
  engines: "PW306D1"
},

{
  manufacturer: "Cessna",
  model: "Citation Longitude",
  year: 2019,
  seats: 12,
  range_nm: 3500,
  speed_kts: 480,
  mtow_kg: 18600,
  fuel_burn_kgph: 1100,
  price_acs_usd: 28500000,
  engines: "Honeywell HTF7700L"
},

// ======================= GULFSTREAM SERIES =======================

{
  manufacturer: "Gulfstream",
  model: "GII",
  year: 1967,
  seats: 12,
  range_nm: 3000,
  speed_kts: 480,
  mtow_kg: 29500,
  fuel_burn_kgph: 1800,
  price_acs_usd: 15000000,
  engines: "RR Spey"
},

{
  manufacturer: "Gulfstream",
  model: "GIV",
  year: 1985,
  seats: 14,
  range_nm: 4200,
  speed_kts: 480,
  mtow_kg: 33400,
  fuel_burn_kgph: 1400,
  price_acs_usd: 28000000,
  engines: "RR Tay 611-8"
},

{
  manufacturer: "Gulfstream",
  model: "G550",
  year: 2003,
  seats: 19,
  range_nm: 6750,
  speed_kts: 488,
  mtow_kg: 41900,
  fuel_burn_kgph: 1500,
  price_acs_usd: 55000000,
  engines: "RR BR710"
},

{
  manufacturer: "Gulfstream",
  model: "G650",
  year: 2012,
  seats: 19,
  range_nm: 7000,
  speed_kts: 488,
  mtow_kg: 45500,
  fuel_burn_kgph: 1600,
  price_acs_usd: 70000000,
  engines: "RR BR725"
},

{
  manufacturer: "Gulfstream",
  model: "G700",
  year: 2022,
  seats: 19,
  range_nm: 7500,
  speed_kts: 490,
  mtow_kg: 47000,
  fuel_burn_kgph: 1700,
  price_acs_usd: 78000000,
  engines: "RR Pearl 700"
},

{
  manufacturer: "Gulfstream",
  model: "G800",
  year: 2023,
  seats: 19,
  range_nm: 8000,
  speed_kts: 490,
  mtow_kg: 47000,
  fuel_burn_kgph: 1750,
  price_acs_usd: 82000000,
  engines: "RR Pearl 700"
},

// ======================= DASSAULT FALCON SERIES =======================

{
  manufacturer: "Dassault",
  model: "Falcon 20",
  year: 1965,
  seats: 8,
  range_nm: 1800,
  speed_kts: 430,
  mtow_kg: 12000,
  fuel_burn_kgph: 900,
  price_acs_usd: 9500000,
  engines: "GE CF700"
},

{
  manufacturer: "Dassault",
  model: "Falcon 50",
  year: 1976,
  seats: 9,
  range_nm: 3400,
  speed_kts: 470,
  mtow_kg: 18000,
  fuel_burn_kgph: 1200,
  price_acs_usd: 18500000,
  engines: "ATF3-6A"
},

{
  manufacturer: "Dassault",
  model: "Falcon 900EX",
  year: 1996,
  seats: 14,
  range_nm: 4500,
  speed_kts: 475,
  mtow_kg: 22500,
  fuel_burn_kgph: 1300,
  price_acs_usd: 36500000,
  engines: "Honeywell TFE731-60"
},

{
  manufacturer: "Dassault",
  model: "Falcon 7X",
  year: 2007,
  seats: 16,
  range_nm: 5950,
  speed_kts: 488,
  mtow_kg: 31800,
  fuel_burn_kgph: 1500,
  price_acs_usd: 52000000,
  engines: "PW307A"
},

{
  manufacturer: "Dassault",
  model: "Falcon 10X",
  year: 2025,
  seats: 19,
  range_nm: 7500,
  speed_kts: 495,
  mtow_kg: 52000,
  fuel_burn_kgph: 1750,
  price_acs_usd: 78000000,
  engines: "RR Pearl 10X"
},

// ======================= BOMBARDIER — CHALLENGER / GLOBAL =======================

{
  manufacturer: "Bombardier",
  model: "Challenger 300",
  year: 2003,
  seats: 9,
  range_nm: 3100,
  speed_kts: 470,
  mtow_kg: 17600,
  fuel_burn_kgph: 1100,
  price_acs_usd: 21000000,
  engines: "HTF7000"
},

{
  manufacturer: "Bombardier",
  model: "Challenger 650",
  year: 2015,
  seats: 12,
  range_nm: 4000,
  speed_kts: 470,
  mtow_kg: 21800,
  fuel_burn_kgph: 1350,
  price_acs_usd: 32000000,
  engines: "CF34-3B"
},

{
  manufacturer: "Bombardier",
  model: "Global 6000",
  year: 2012,
  seats: 19,
  range_nm: 6000,
  speed_kts: 488,
  mtow_kg: 45000,
  fuel_burn_kgph: 1750,
  price_acs_usd: 62000000,
  engines: "BR710A2-20"
},

{
  manufacturer: "Bombardier",
  model: "Global 7500",
  year: 2018,
  seats: 19,
  range_nm: 7700,
  speed_kts: 488,
  mtow_kg: 52100,
  fuel_burn_kgph: 1800,
  price_acs_usd: 75000000,
  engines: "GE Passport"
},

// ======================= EMBRAER EXECUTIVE =======================

{
  manufacturer: "Embraer",
  model: "Phenom 100EV",
  year: 2017,
  seats: 6,
  range_nm: 1178,
  speed_kts: 390,
  mtow_kg: 4800,
  fuel_burn_kgph: 400,
  price_acs_usd: 4800000,
  engines: "PW617F1-E"
},

{
  manufacturer: "Embraer",
  model: "Phenom 300E",
  year: 2018,
  seats: 9,
  range_nm: 2000,
  speed_kts: 453,
  mtow_kg: 8000,
  fuel_burn_kgph: 650,
  price_acs_usd: 9500000,
  engines: "PW535E1"
},

{
  manufacturer: "Embraer",
  model: "Legacy 500",
  year: 2015,
  seats: 12,
  range_nm: 3125,
  speed_kts: 470,
  mtow_kg: 17600,
  fuel_burn_kgph: 1050,
  price_acs_usd: 21000000,
  engines: "HTF7500E"
},

{
  manufacturer: "Embraer",
  model: "Praetor 600",
  year: 2018,
  seats: 12,
  range_nm: 4000,
  speed_kts: 465,
  mtow_kg: 19800,
  fuel_burn_kgph: 1100,
  price_acs_usd: 22000000,
  engines: "HTF7500E"
},

// ======================= OTROS EJECUTIVOS =======================

{
  manufacturer: "Honda",
  model: "HondaJet HA-420",
  year: 2015,
  seats: 6,
  range_nm: 1200,
  speed_kts: 367,
  mtow_kg: 4800,
  fuel_burn_kgph: 420,
  price_acs_usd: 5200000,
  engines: "GE Honda HF120"
},

{
  manufacturer: "Pilatus",
  model: "PC-24",
  year: 2017,
  seats: 11,
  range_nm: 2000,
  speed_kts: 425,
  mtow_kg: 8500,
  fuel_burn_kgph: 620,
  price_acs_usd: 11500000,
  engines: "Williams FJ44-4A"
},

// ======================= FUTURE / SUPERSÓNICOS EJECUTIVOS =======================

{
  manufacturer: "Aerion",
  model: "AS2 Supersonic",
  year: 2030,
  seats: 10,
  range_nm: 4700,
  speed_kts: 760,   // Mach 1.4
  mtow_kg: 32000,
  fuel_burn_kgph: 2800,
  price_acs_usd: 120000000,
  engines: "GE Affinity",
  status: "cancelled"
},

// ============================================================
// PARTE 11 — HELICÓPTEROS (1950–2025)
// ============================================================


// ======================= BELL HELICOPTERS =======================

{
  manufacturer: "Bell",
  model: "Bell 206B JetRanger",
  year: 1967,
  seats: 5,
  range_nm: 374,
  speed_kts: 110,
  mtow_kg: 1450,
  fuel_burn_kgph: 105,
  price_acs_usd: 900000,
  engines: "Allison 250-C20"
},

{
  manufacturer: "Bell",
  model: "Bell 212",
  year: 1968,
  seats: 14,
  range_nm: 230,
  speed_kts: 120,
  mtow_kg: 5080,
  fuel_burn_kgph: 380,
  price_acs_usd: 5500000,
  engines: "PT6T-3 Twin-Pac"
},

{
  manufacturer: "Bell",
  model: "Bell 412EP",
  year: 1981,
  seats: 15,
  range_nm: 350,
  speed_kts: 122,
  mtow_kg: 5400,
  fuel_burn_kgph: 440,
  price_acs_usd: 9000000,
  engines: "PT6T-9 Twin-Pac"
},


// ======================= AIRBUS / EUROCOPTER =======================

{
  manufacturer: "Airbus Helicopters",
  model: "H120 (EC120 Colibri)",
  year: 1997,
  seats: 5,
  range_nm: 383,
  speed_kts: 122,
  mtow_kg: 1715,
  fuel_burn_kgph: 115,
  price_acs_usd: 2300000,
  engines: "Turbomeca Arrius 2F"
},

{
  manufacturer: "Airbus Helicopters",
  model: "H125 (AS350 Écureuil)",
  year: 1975,
  seats: 6,
  range_nm: 345,
  speed_kts: 133,
  mtow_kg: 2250,
  fuel_burn_kgph: 165,
  price_acs_usd: 3100000,
  engines: "Safran Arriel 2D"
},

{
  manufacturer: "Airbus Helicopters",
  model: "H135 (EC135)",
  year: 1996,
  seats: 7,
  range_nm: 330,
  speed_kts: 137,
  mtow_kg: 2980,
  fuel_burn_kgph: 280,
  price_acs_usd: 6500000,
  engines: "PW206B"
},

{
  manufacturer: "Airbus Helicopters",
  model: "H145",
  year: 2014,
  seats: 10,
  range_nm: 351,
  speed_kts: 137,
  mtow_kg: 3800,
  fuel_burn_kgph: 320,
  price_acs_usd: 9500000,
  engines: "Arriel 2E"
},

{
  manufacturer: "Airbus Helicopters",
  model: "H155 (EC155)",
  year: 1999,
  seats: 13,
  range_nm: 423,
  speed_kts: 150,
  mtow_kg: 4800,
  fuel_burn_kgph: 520,
  price_acs_usd: 11000000,
  engines: "Arriel 2C2"
},

{
  manufacturer: "Airbus Helicopters",
  model: "H225 Super Puma",
  year: 2004,
  seats: 24,
  range_nm: 452,
  speed_kts: 150,
  mtow_kg: 11100,
  fuel_burn_kgph: 900,
  price_acs_usd: 27000000,
  engines: "Makila 2A1"
},


// ======================= LEONARDO (AGUSTAWESTLAND) =======================

{
  manufacturer: "Leonardo",
  model: "AW109 GrandNew",
  year: 1996,
  seats: 7,
  range_nm: 432,
  speed_kts: 154,
  mtow_kg: 3175,
  fuel_burn_kgph: 260,
  price_acs_usd: 6500000,
  engines: "PW207C"
},

{
  manufacturer: "Leonardo",
  model: "AW139",
  year: 2003,
  seats: 15,
  range_nm: 573,
  speed_kts: 165,
  mtow_kg: 6800,
  fuel_burn_kgph: 520,
  price_acs_usd: 16500000,
  engines: "PT6C-67C"
},

{
  manufacturer: "Leonardo",
  model: "AW169",
  year: 2015,
  seats: 10,
  range_nm: 410,
  speed_kts: 150,
  mtow_kg: 4600,
  fuel_burn_kgph: 400,
  price_acs_usd: 12000000,
  engines: "PW210A"
},

{
  manufacturer: "Leonardo",
  model: "AW189",
  year: 2013,
  seats: 19,
  range_nm: 520,
  speed_kts: 150,
  mtow_kg: 8600,
  fuel_burn_kgph: 720,
  price_acs_usd: 21000000,
  engines: "CT7-2E1"
},


// ======================= SIKORSKY =======================

{
  manufacturer: "Sikorsky",
  model: "S-76C++",
  year: 2005,
  seats: 12,
  range_nm: 411,
  speed_kts: 155,
  mtow_kg: 5300,
  fuel_burn_kgph: 460,
  price_acs_usd: 12500000,
  engines: "Arriel 2S2"
},

{
  manufacturer: "Sikorsky",
  model: "S-92",
  year: 2004,
  seats: 19,
  range_nm: 480,
  speed_kts: 165,
  mtow_kg: 12000,
  fuel_burn_kgph: 780,
  price_acs_usd: 27000000,
  engines: "CT7-8A"
},

// Heavy Lift civil-usable
{
  manufacturer: "Sikorsky",
  model: "S-64 Skycrane",
  year: 1962,
  seats: 2,
  range_nm: 200,
  speed_kts: 100,
  mtow_kg: 19000,
  fuel_burn_kgph: 1100,
  price_acs_usd: 24000000,
  engines: "Pratt & Whitney JFTD12A"
},


// ======================= RUSOS / CIS =======================

{
  manufacturer: "Mil",
  model: "Mi-2",
  year: 1965,
  seats: 8,
  range_nm: 200,
  speed_kts: 105,
  mtow_kg: 3550,
  fuel_burn_kgph: 420,
  price_acs_usd: 1500000,
  engines: "GTXD-350"
},

{
  manufacturer: "Mil",
  model: "Mi-8/17 Hip",
  year: 1967,
  seats: 24,
  range_nm: 280,
  speed_kts: 135,
  mtow_kg: 13000,
  fuel_burn_kgph: 900,
  price_acs_usd: 8000000,
  engines: "TV2-117"
},

{
  manufacturer: "Mil",
  model: "Mi-171A2",
  year: 2015,
  seats: 24,
  range_nm: 400,
  speed_kts: 135,
  mtow_kg: 13000,
  fuel_burn_kgph: 920,
  price_acs_usd: 15000000,
  engines: "VK-2500PS-03"
},

// Largest civil-capable helicopter
{
  manufacturer: "Mil",
  model: "Mi-26 Halo",
  year: 1983,
  seats: 80,
  range_nm: 500,
  speed_kts: 159,
  mtow_kg: 56000,
  fuel_burn_kgph: 3500,
  price_acs_usd: 36000000,
  engines: "D-136"
},


// ======================= ROBINSON (AVIACIÓN LIGERA) =======================

{
  manufacturer: "Robinson",
  model: "R22 Beta II",
  year: 1979,
  seats: 2,
  range_nm: 240,
  speed_kts: 96,
  mtow_kg: 622,
  fuel_burn_kgph: 55,
  price_acs_usd: 350000,
  engines: "Lycoming O-360"
},

{
  manufacturer: "Robinson",
  model: "R44 Raven II",
  year: 1997,
  seats: 4,
  range_nm: 300,
  speed_kts: 110,
  mtow_kg: 1130,
  fuel_burn_kgph: 75,
  price_acs_usd: 550000,
  engines: "Lycoming IO-540"
},

{
  manufacturer: "Robinson",
  model: "R66 Turbine",
  year: 2010,
  seats: 5,
  range_nm: 350,
  speed_kts: 120,
  mtow_kg: 1220,
  fuel_burn_kgph: 110,
  price_acs_usd: 950000,
  engines: "RR300"
},

// ============================================================
// PARTE 12 — AVIACIÓN GENERAL (GA) — 1935–2025
// ============================================================


// ======================= CLÁSICOS Y ENTRENADORES (1935–1970) =======================

{
  manufacturer: "Beechcraft",
  model: "Model 18",
  year: 1937,
  seats: 9,
  range_nm: 1200,
  speed_kts: 200,
  mtow_kg: 3800,
  fuel_burn_kgph: 240,
  price_acs_usd: 650000,
  engines: "PW R-985"
},

{
  manufacturer: "Piper",
  model: "J-3 Cub",
  year: 1938,
  seats: 2,
  range_nm: 190,
  speed_kts: 65,
  mtow_kg: 550,
  fuel_burn_kgph: 25,
  price_acs_usd: 120000,
  engines: "Continental A-65"
},

{
  manufacturer: "Cessna",
  model: "Cessna 120",
  year: 1946,
  seats: 2,
  range_nm: 350,
  speed_kts: 95,
  mtow_kg: 680,
  fuel_burn_kgph: 30,
  price_acs_usd: 140000,
  engines: "Continental C-85"
},

{
  manufacturer: "Piper",
  model: "PA-18 Super Cub",
  year: 1949,
  seats: 2,
  range_nm: 400,
  speed_kts: 90,
  mtow_kg: 900,
  fuel_burn_kgph: 35,
  price_acs_usd: 180000,
  engines: "Lycoming O-320"
},


// ======================= GENERAL AVIATION MASIVA (1970–1990) =======================

{
  manufacturer: "Cessna",
  model: "Cessna 150",
  year: 1958,
  seats: 2,
  range_nm: 350,
  speed_kts: 95,
  mtow_kg: 725,
  fuel_burn_kgph: 22,
  price_acs_usd: 130000,
  engines: "Continental O-200"
},

{
  manufacturer: "Cessna",
  model: "Cessna 152",
  year: 1977,
  seats: 2,
  range_nm: 415,
  speed_kts: 107,
  mtow_kg: 760,
  fuel_burn_kgph: 23,
  price_acs_usd: 160000,
  engines: "Lycoming O-235"
},

{
  manufacturer: "Cessna",
  model: "Cessna 172 Skyhawk",
  year: 1956,
  seats: 4,
  range_nm: 640,
  speed_kts: 122,
  mtow_kg: 1110,
  fuel_burn_kgph: 35,
  price_acs_usd: 420000,
  engines: "Lycoming IO-360"
},

{
  manufacturer: "Piper",
  model: "PA-28 Cherokee",
  year: 1961,
  seats: 4,
  range_nm: 520,
  speed_kts: 118,
  mtow_kg: 1110,
  fuel_burn_kgph: 33,
  price_acs_usd: 380000,
  engines: "Lycoming O-320"
},

{
  manufacturer: "Piper",
  model: "PA-32 Cherokee Six",
  year: 1965,
  seats: 6,
  range_nm: 600,
  speed_kts: 140,
  mtow_kg: 1580,
  fuel_burn_kgph: 55,
  price_acs_usd: 650000,
  engines: "Lycoming IO-540"
},

{
  manufacturer: "Beechcraft",
  model: "Bonanza V35",
  year: 1965,
  seats: 4,
  range_nm: 725,
  speed_kts: 165,
  mtow_kg: 1540,
  fuel_burn_kgph: 60,
  price_acs_usd: 850000,
  engines: "Continental IO-520"
},

{
  manufacturer: "Mooney",
  model: "M20J 201",
  year: 1977,
  seats: 4,
  range_nm: 700,
  speed_kts: 160,
  mtow_kg: 1335,
  fuel_burn_kgph: 42,
  price_acs_usd: 600000,
  engines: "Lycoming IO-360"
},


// ======================= TWIN PISTON (BIMOTORES) =======================

{
  manufacturer: "Piper",
  model: "PA-34 Seneca II",
  year: 1975,
  seats: 6,
  range_nm: 820,
  speed_kts: 180,
  mtow_kg: 2150,
  fuel_burn_kgph: 95,
  price_acs_usd: 1100000,
  engines: "Continental TSIO-360"
},

{
  manufacturer: "Beechcraft",
  model: "Baron 58",
  year: 1969,
  seats: 6,
  range_nm: 900,
  speed_kts: 200,
  mtow_kg: 2490,
  fuel_burn_kgph: 110,
  price_acs_usd: 1600000,
  engines: "Continental IO-550"
},

{
  manufacturer: "Cessna",
  model: "Cessna 310R",
  year: 1954,
  seats: 6,
  range_nm: 650,
  speed_kts: 190,
  mtow_kg: 2490,
  fuel_burn_kgph: 105,
  price_acs_usd: 900000,
  engines: "Continental IO-470"
},

{
  manufacturer: "Piper",
  model: "PA-44 Seminole",
  year: 1978,
  seats: 4,
  range_nm: 700,
  speed_kts: 162,
  mtow_kg: 1715,
  fuel_burn_kgph: 75,
  price_acs_usd: 800000,
  engines: "Lycoming O-360"
},


// ======================= HIGH PERFORMANCE PISTON TOURING =======================

{
  manufacturer: "Cirrus",
  model: "SR20",
  year: 1999,
  seats: 4,
  range_nm: 600,
  speed_kts: 155,
  mtow_kg: 1400,
  fuel_burn_kgph: 45,
  price_acs_usd: 500000,
  engines: "Continental IO-360"
},

{
  manufacturer: "Cirrus",
  model: "SR22",
  year: 2001,
  seats: 4,
  range_nm: 1000,
  speed_kts: 180,
  mtow_kg: 1600,
  fuel_burn_kgph: 65,
  price_acs_usd: 900000,
  engines: "Continental IO-550"
},

{
  manufacturer: "Diamond",
  model: "DA40 NG",
  year: 2001,
  seats: 4,
  range_nm: 940,
  speed_kts: 140,
  mtow_kg: 1310,
  fuel_burn_kgph: 21,
  price_acs_usd: 500000,
  engines: "Austro AE300 (Diesel)"
},

{
  manufacturer: "Diamond",
  model: "DA62",
  year: 2015,
  seats: 7,
  range_nm: 1300,
  speed_kts: 190,
  mtow_kg: 2300,
  fuel_burn_kgph: 85,
  price_acs_usd: 1350000,
  engines: "Austro AE330"
},


// ======================= TURBOPROP LIGERO Y EJECUTIVO =======================

{
  manufacturer: "Pilatus",
  model: "PC-12 NG",
  year: 1994,
  seats: 9,
  range_nm: 1800,
  speed_kts: 270,
  mtow_kg: 4740,
  fuel_burn_kgph: 270,
  price_acs_usd: 5200000,
  engines: "PT6A-67P"
},

{
  manufacturer: "Pilatus",
  model: "PC-12 NGX",
  year: 2020,
  seats: 9,
  range_nm: 1840,
  speed_kts: 290,
  mtow_kg: 4800,
  fuel_burn_kgph: 260,
  price_acs_usd: 6300000,
  engines: "PT6E-67XP"
},

{
  manufacturer: "Daher",
  model: "TBM 910",
  year: 2017,
  seats: 6,
  range_nm: 1730,
  speed_kts: 285,
  mtow_kg: 3350,
  fuel_burn_kgph: 225,
  price_acs_usd: 4500000,
  engines: "PT6A-66D"
},

{
  manufacturer: "Daher",
  model: "TBM 960",
  year: 2022,
  seats: 6,
  range_nm: 1700,
  speed_kts: 285,
  mtow_kg: 3380,
  fuel_burn_kgph: 215,
  price_acs_usd: 5200000,
  engines: "PT6E-66XT"
},

{
  manufacturer: "Beechcraft",
  model: "King Air C90GTx",
  year: 2009,
  seats: 7,
  range_nm: 1200,
  speed_kts: 260,
  mtow_kg: 4580,
  fuel_burn_kgph: 300,
  price_acs_usd: 3500000,
  engines: "PT6A-135A"
},

{
  manufacturer: "Beechcraft",
  model: "King Air 350i",
  year: 2010,
  seats: 11,
  range_nm: 1800,
  speed_kts: 310,
  mtow_kg: 6800,
  fuel_burn_kgph: 360,
  price_acs_usd: 7800000,
  engines: "PT6A-60A"
},

// ============================================================
// PARTE 13 — COMMUTER / REGIONAL SPECIAL OPS (1950–2025)
// ============================================================


// ======================= TWIN OTTER FAMILY =======================

{
  manufacturer: "De Havilland Canada",
  model: "DHC-6 Twin Otter Series 100",
  year: 1966,
  seats: 19,
  range_nm: 770,
  speed_kts: 155,
  mtow_kg: 5670,
  fuel_burn_kgph: 320,
  price_acs_usd: 2100000,
  engines: "PT6A-20"
},

{
  manufacturer: "De Havilland Canada",
  model: "DHC-6 Twin Otter Series 300",
  year: 1972,
  seats: 19,
  range_nm: 770,
  speed_kts: 170,
  mtow_kg: 5670,
  fuel_burn_kgph: 340,
  price_acs_usd: 2500000,
  engines: "PT6A-27"
},

{
  manufacturer: "Viking Air",
  model: "Twin Otter Series 400",
  year: 2010,
  seats: 19,
  range_nm: 940,
  speed_kts: 180,
  mtow_kg: 6354,
  fuel_burn_kgph: 360,
  price_acs_usd: 6500000,
  engines: "PT6A-34"
},


// ======================= ISLANDER / TRISLANDER =======================

{
  manufacturer: "Britten-Norman",
  model: "BN-2A Islander",
  year: 1967,
  seats: 9,
  range_nm: 740,
  speed_kts: 135,
  mtow_kg: 2990,
  fuel_burn_kgph: 115,
  price_acs_usd: 850000,
  engines: "Lycoming O-540"
},

{
  manufacturer: "Britten-Norman",
  model: "BN-2B Islander Turbo",
  year: 1978,
  seats: 9,
  range_nm: 700,
  speed_kts: 155,
  mtow_kg: 3100,
  fuel_burn_kgph: 160,
  price_acs_usd: 1800000,
  engines: "Allison 250-B17C"
},

{
  manufacturer: "Britten-Norman",
  model: "BN-2A Trislander",
  year: 1970,
  seats: 17,
  range_nm: 620,
  speed_kts: 150,
  mtow_kg: 4800,
  fuel_burn_kgph: 210,
  price_acs_usd: 2200000,
  engines: "Lycoming IO-540 (x3)"
},


// ======================= LET AIRCRAFT =======================

{
  manufacturer: "LET Aircraft",
  model: "L-410 UVP-E20",
  year: 1977,
  seats: 19,
  range_nm: 820,
  speed_kts: 165,
  mtow_kg: 6400,
  fuel_burn_kgph: 350,
  price_acs_usd: 4900000,
  engines: "Walter M601"
},

{
  manufacturer: "LET Aircraft",
  model: "L-610",
  year: 1988,
  seats: 40,
  range_nm: 900,
  speed_kts: 210,
  mtow_kg: 14000,
  fuel_burn_kgph: 700,
  price_acs_usd: 11000000,
  engines: "Walter M602"
},


// ======================= DORNIER 228 / DO-328 =======================

{
  manufacturer: "Dornier",
  model: "Do 228-200",
  year: 1981,
  seats: 19,
  range_nm: 620,
  speed_kts: 210,
  mtow_kg: 6400,
  fuel_burn_kgph: 360,
  price_acs_usd: 5500000,
  engines: "Garrett TPE331-5"
},

{
  manufacturer: "Dornier",
  model: "Do 328-100",
  year: 1991,
  seats: 33,
  range_nm: 1000,
  speed_kts: 335,
  mtow_kg: 14500,
  fuel_burn_kgph: 750,
  price_acs_usd: 14000000,
  engines: "PW119B"
},

{
  manufacturer: "Dornier",
  model: "Do 328JET",
  year: 1998,
  seats: 33,
  range_nm: 1100,
  speed_kts: 375,
  mtow_kg: 16000,
  fuel_burn_kgph: 900,
  price_acs_usd: 16000000,
  engines: "PW306B"
},


// ======================= SAAB REGIONAL =======================

{
  manufacturer: "Saab",
  model: "Saab 340B",
  year: 1989,
  seats: 34,
  range_nm: 1030,
  speed_kts: 280,
  mtow_kg: 13550,
  fuel_burn_kgph: 600,
  price_acs_usd: 9000000,
  engines: "GE CT7-9B"
},

{
  manufacturer: "Saab",
  model: "Saab 2000",
  year: 1992,
  seats: 50,
  range_nm: 1230,
  speed_kts: 360,
  mtow_kg: 22800,
  fuel_burn_kgph: 950,
  price_acs_usd: 18000000,
  engines: "RR AE2100A"
},


// ======================= CASA / AIRBUS MILITARY =======================

{
  manufacturer: "CASA",
  model: "C-212 Aviocar",
  year: 1971,
  seats: 26,
  range_nm: 540,
  speed_kts: 180,
  mtow_kg: 7800,
  fuel_burn_kgph: 330,
  price_acs_usd: 3500000,
  engines: "Garrett TPE331"
},

{
  manufacturer: "CASA",
  model: "CN-235",
  year: 1983,
  seats: 48,
  range_nm: 1600,
  speed_kts: 235,
  mtow_kg: 15500,
  fuel_burn_kgph: 680,
  price_acs_usd: 25000000,
  engines: "GE CT7-9"
},

{
  manufacturer: "Airbus Military",
  model: "C-295",
  year: 1999,
  seats: 71,
  range_nm: 2300,
  speed_kts: 260,
  mtow_kg: 23000,
  fuel_burn_kgph: 840,
  price_acs_usd: 38000000,
  engines: "PW127G"
},


// ======================= ANTONOV REGIONAL =======================

{
  manufacturer: "Antonov",
  model: "An-24",
  year: 1959,
  seats: 44,
  range_nm: 1050,
  speed_kts: 215,
  mtow_kg: 21000,
  fuel_burn_kgph: 900,
  price_acs_usd: 9000000,
  engines: "AI-24"
},

{
  manufacturer: "Antonov",
  model: "An-26",
  year: 1969,
  seats: 40,
  range_nm: 700,
  speed_kts: 210,
  mtow_kg: 24000,
  fuel_burn_kgph: 950,
  price_acs_usd: 12000000,
  engines: "AI-24VT"
},

{
  manufacturer: "Antonov",
  model: "An-140",
  year: 2002,
  seats: 52,
  range_nm: 1300,
  speed_kts: 280,
  mtow_kg: 21500,
  fuel_burn_kgph: 820,
  price_acs_usd: 18000000,
  engines: "TV3-117VMA-SBM1"
},


// ======================= METRO / JETSTREAM / MISC =======================

{
  manufacturer: "Fairchild",
  model: "Swearingen Metro III",
  year: 1981,
  seats: 19,
  range_nm: 600,
  speed_kts: 265,
  mtow_kg: 6400,
  fuel_burn_kgph: 420,
  price_acs_usd: 3500000,
  engines: "Garrett TPE331-11U"
},

{
  manufacturer: "BAe",
  model: "Jetstream 31",
  year: 1982,
  seats: 19,
  range_nm: 600,
  speed_kts: 235,
  mtow_kg: 7100,
  fuel_burn_kgph: 400,
  price_acs_usd: 4200000,
  engines: "Garrett TPE331-10"
},

{
  manufacturer: "BAe",
  model: "Jetstream 41",
  year: 1991,
  seats: 29,
  range_nm: 775,
  speed_kts: 310,
  mtow_kg: 10400,
  fuel_burn_kgph: 650,
  price_acs_usd: 9000000,
  engines: "Allison 2500"
},


// ======================= CHINA REGIONAL =======================

{
  manufacturer: "Harbin",
  model: "Y-12 IV",
  year: 1990,
  seats: 17,
  range_nm: 650,
  speed_kts: 180,
  mtow_kg: 5700,
  fuel_burn_kgph: 350,
  price_acs_usd: 3500000,
  engines: "PT6A-34"
},

{
  manufacturer: "Harbin",
  model: "Y-12F",
  year: 2012,
  seats: 19,
  range_nm: 820,
  speed_kts: 210,
  mtow_kg: 8000,
  fuel_burn_kgph: 430,
  price_acs_usd: 6900000,
  engines: "PW127"
},

{
  manufacturer: "AVIC",
  model: "MA60",
  year: 2000,
  seats: 60,
  range_nm: 1000,
  speed_kts: 265,
  mtow_kg: 21000,
  fuel_burn_kgph: 950,
  price_acs_usd: 22000000,
  engines: "PW127J"
},

{
  manufacturer: "AVIC",
  model: "MA600",
  year: 2008,
  seats: 60,
  range_nm: 1150,
  speed_kts: 275,
  mtow_kg: 21500,
  fuel_burn_kgph: 920,
  price_acs_usd: 26000000,
  engines: "PW127J"
},

{
  manufacturer: "AVIC",
  model: "MA700",
  year: 2023,
  seats: 78,
  range_nm: 1250,
  speed_kts: 300,
  mtow_kg: 27500,
  fuel_burn_kgph: 880,
  price_acs_usd: 34000000,
  engines: "PW150D"
},

// ============================================================
// PARTE 14 — BUSINESS JETS (1960–2025)
// ============================================================


// ======================= CESSNA CITATION SERIES =======================

{
  manufacturer: "Cessna",
  model: "Citation I (C500)",
  year: 1972,
  seats: 7,
  range_nm: 1100,
  speed_kts: 350,
  mtow_kg: 4800,
  fuel_burn_kgph: 600,
  price_acs_usd: 3000000,
  engines: "JT15D-1"
},

{
  manufacturer: "Cessna",
  model: "Citation II (C550)",
  year: 1978,
  seats: 8,
  range_nm: 1500,
  speed_kts: 390,
  mtow_kg: 6800,
  fuel_burn_kgph: 700,
  price_acs_usd: 4200000,
  engines: "JT15D-4"
},

{
  manufacturer: "Cessna",
  model: "Citation V (C560)",
  year: 1987,
  seats: 9,
  range_nm: 1800,
  speed_kts: 405,
  mtow_kg: 7400,
  fuel_burn_kgph: 780,
  price_acs_usd: 6200000,
  engines: "JT15D-5A"
},

{
  manufacturer: "Cessna",
  model: "Citation VII",
  year: 1992,
  seats: 10,
  range_nm: 1800,
  speed_kts: 460,
  mtow_kg: 10300,
  fuel_burn_kgph: 950,
  price_acs_usd: 7800000,
  engines: "TFE731-4R"
},

{
  manufacturer: "Cessna",
  model: "Citation X",
  year: 1996,
  seats: 12,
  range_nm: 3100,
  speed_kts: 525, // Mach .92
  mtow_kg: 16000,
  fuel_burn_kgph: 1400,
  price_acs_usd: 26000000,
  engines: "RR AE3007C"
},

{
  manufacturer: "Cessna",
  model: "Citation Excel (560XL)",
  year: 1998,
  seats: 9,
  range_nm: 1850,
  speed_kts: 430,
  mtow_kg: 9100,
  fuel_burn_kgph: 900,
  price_acs_usd: 12700000,
  engines: "PW545A"
},

{
  manufacturer: "Cessna",
  model: "Citation Latitude",
  year: 2015,
  seats: 9,
  range_nm: 2850,
  speed_kts: 440,
  mtow_kg: 13600,
  fuel_burn_kgph: 1100,
  price_acs_usd: 18000000,
  engines: "PW306D1"
},

{
  manufacturer: "Cessna",
  model: "Citation Longitude",
  year: 2019,
  seats: 12,
  range_nm: 3500,
  speed_kts: 470,
  mtow_kg: 17800,
  fuel_burn_kgph: 1300,
  price_acs_usd: 28000000,
  engines: "Honeywell HTF7700L"
},


// ======================= LEARJET SERIES =======================

{
  manufacturer: "Learjet",
  model: "Learjet 24",
  year: 1966,
  seats: 6,
  range_nm: 1200,
  speed_kts: 420,
  mtow_kg: 6100,
  fuel_burn_kgph: 850,
  price_acs_usd: 2800000,
  engines: "GE CJ610"
},

{
  manufacturer: "Learjet",
  model: "Learjet 35A",
  year: 1974,
  seats: 8,
  range_nm: 1900,
  speed_kts: 465,
  mtow_kg: 8300,
  fuel_burn_kgph: 1000,
  price_acs_usd: 4200000,
  engines: "TFE731-2"
},

{
  manufacturer: "Learjet",
  model: "Learjet 55",
  year: 1981,
  seats: 10,
  range_nm: 2200,
  speed_kts: 455,
  mtow_kg: 10500,
  fuel_burn_kgph: 1100,
  price_acs_usd: 6300000,
  engines: "TFE731-3A"
},

{
  manufacturer: "Learjet",
  model: "Learjet 60",
  year: 1993,
  seats: 8,
  range_nm: 2400,
  speed_kts: 455,
  mtow_kg: 10600,
  fuel_burn_kgph: 1150,
  price_acs_usd: 12000000,
  engines: "PW305A"
},

{
  manufacturer: "Learjet",
  model: "Learjet 75",
  year: 2013,
  seats: 8,
  range_nm: 2040,
  speed_kts: 464,
  mtow_kg: 9750,
  fuel_burn_kgph: 950,
  price_acs_usd: 13500000,
  engines: "TFE731-40BR"
},


// ======================= GULFSTREAM =======================

{
  manufacturer: "Gulfstream",
  model: "GII",
  year: 1967,
  seats: 14,
  range_nm: 2500,
  speed_kts: 480,
  mtow_kg: 29300,
  fuel_burn_kgph: 2300,
  price_acs_usd: 15000000,
  engines: "RR Spey 511"
},

{
  manufacturer: "Gulfstream",
  model: "GIII",
  year: 1979,
  seats: 14,
  range_nm: 3400,
  speed_kts: 500,
  mtow_kg: 30300,
  fuel_burn_kgph: 2600,
  price_acs_usd: 19000000,
  engines: "RR Spey 511-8"
},

{
  manufacturer: "Gulfstream",
  model: "GIV",
  year: 1985,
  seats: 14,
  range_nm: 4200,
  speed_kts: 500,
  mtow_kg: 33500,
  fuel_burn_kgph: 2600,
  price_acs_usd: 24000000,
  engines: "RR Tay 611-8"
},

{
  manufacturer: "Gulfstream",
  model: "GV",
  year: 1997,
  seats: 14,
  range_nm: 6200,
  speed_kts: 510,
  mtow_kg: 41600,
  fuel_burn_kgph: 2900,
  price_acs_usd: 45000000,
  engines: "RR BR710"
},

{
  manufacturer: "Gulfstream",
  model: "G550",
  year: 2003,
  seats: 16,
  range_nm: 6750,
  speed_kts: 488,
  mtow_kg: 41900,
  fuel_burn_kgph: 2700,
  price_acs_usd: 62000000,
  engines: "RR BR710"
},

{
  manufacturer: "Gulfstream",
  model: "G650",
  year: 2012,
  seats: 18,
  range_nm: 7000,
  speed_kts: 488,
  mtow_kg: 45700,
  fuel_burn_kgph: 3100,
  price_acs_usd: 70000000,
  engines: "RR BR725"
},

{
  manufacturer: "Gulfstream",
  model: "G700",
  year: 2022,
  seats: 19,
  range_nm: 7500,
  speed_kts: 488,
  mtow_kg: 48500,
  fuel_burn_kgph: 3300,
  price_acs_usd: 78000000,
  engines: "RR Pearl 700"
},


// ======================= FALCON (Dassault) =======================

{
  manufacturer: "Dassault",
  model: "Falcon 10",
  year: 1973,
  seats: 7,
  range_nm: 1600,
  speed_kts: 480,
  mtow_kg: 6000,
  fuel_burn_kgph: 900,
  price_acs_usd: 3500000,
  engines: "GE CF700"
},

{
  manufacturer: "Dassault",
  model: "Falcon 20",
  year: 1965,
  seats: 10,
  range_nm: 1900,
  speed_kts: 470,
  mtow_kg: 12700,
  fuel_burn_kgph: 1200,
  price_acs_usd: 6000000,
  engines: "GE CF700"
},

{
  manufacturer: "Dassault",
  model: "Falcon 50",
  year: 1976,
  seats: 9,
  range_nm: 3100,
  speed_kts: 475,
  mtow_kg: 18000,
  fuel_burn_kgph: 1300,
  price_acs_usd: 12500000,
  engines: "TFE731-3"
},

{
  manufacturer: "Dassault",
  model: "Falcon 2000LXS",
  year: 2014,
  seats: 10,
  range_nm: 4000,
  speed_kts: 470,
  mtow_kg: 19400,
  fuel_burn_kgph: 1150,
  price_acs_usd: 35000000,
  engines: "PW308C"
},

{
  manufacturer: "Dassault",
  model: "Falcon 900LX",
  year: 2010,
  seats: 12,
  range_nm: 4750,
  speed_kts: 480,
  mtow_kg: 22000,
  fuel_burn_kgph: 1400,
  price_acs_usd: 46000000,
  engines: "TFE731-60"
},

{
  manufacturer: "Dassault",
  model: "Falcon 7X",
  year: 2007,
  seats: 14,
  range_nm: 5950,
  speed_kts: 488,
  mtow_kg: 31800,
  fuel_burn_kgph: 2200,
  price_acs_usd: 52000000,
  engines: "PW307A"
},

{
  manufacturer: "Dassault",
  model: "Falcon 8X",
  year: 2016,
  seats: 16,
  range_nm: 6450,
  speed_kts: 488,
  mtow_kg: 33000,
  fuel_burn_kgph: 2400,
  price_acs_usd: 59000000,
  engines: "PW307D"
},

{
  manufacturer: "Dassault",
  model: "Falcon 10X",
  year: 2025,
  seats: 19,
  range_nm: 7500,
  speed_kts: 488,
  mtow_kg: 52000,
  fuel_burn_kgph: 3500,
  price_acs_usd: 78000000,
  engines: "RR UltraFan"
},


// ======================= BOMBADIER BUSINESS =======================

{
  manufacturer: "Bombardier",
  model: "Challenger 350",
  year: 2014,
  seats: 10,
  range_nm: 3200,
  speed_kts: 460,
  mtow_kg: 18700,
  fuel_burn_kgph: 1100,
  price_acs_usd: 26500000,
  engines: "Honeywell HTF7350"
},

{
  manufacturer: "Bombardier",
  model: "Global 5000",
  year: 2005,
  seats: 16,
  range_nm: 5200,
  speed_kts: 488,
  mtow_kg: 41400,
  fuel_burn_kgph: 2800,
  price_acs_usd: 50000000,
  engines: "RR BR710"
},

{
  manufacturer: "Bombardier",
  model: "Global 7500",
  year: 2018,
  seats: 19,
  range_nm: 7700,
  speed_kts: 488,
  mtow_kg: 52000,
  fuel_burn_kgph: 3600,
  price_acs_usd: 75000000,
  engines: "GE Passport"
},


// ======================= EMBRAER EXECUTIVE =======================

{
  manufacturer: "Embraer",
  model: "Phenom 100",
  year: 2008,
  seats: 6,
  range_nm: 1100,
  speed_kts: 380,
  mtow_kg: 4800,
  fuel_burn_kgph: 500,
  price_acs_usd: 4500000,
  engines: "PW617F1-E"
},

{
  manufacturer: "Embraer",
  model: "Phenom 300E",
  year: 2018,
  seats: 7,
  range_nm: 1970,
  speed_kts: 450,
  mtow_kg: 8150,
  fuel_burn_kgph: 600,
  price_acs_usd: 9500000,
  engines: "PW535E1"
},

{
  manufacturer: "Embraer",
  model: "Legacy 650",
  year: 2010,
  seats: 14,
  range_nm: 3900,
  speed_kts: 455,
  mtow_kg: 24500,
  fuel_burn_kgph: 1400,
  price_acs_usd: 31000000,
  engines: "RR AE3007A2"
},

{
  manufacturer: "Embraer",
  model: "Praetor 500",
  year: 2019,
  seats: 9,
  range_nm: 3250,
  speed_kts: 460,
  mtow_kg: 17700,
  fuel_burn_kgph: 980,
  price_acs_usd: 21000000,
  engines: "Honeywell HTF7500E"
},

{
  manufacturer: "Embraer",
  model: "Praetor 600",
  year: 2019,
  seats: 12,
  range_nm: 4000,
  speed_kts: 466,
  mtow_kg: 21700,
  fuel_burn_kgph: 1100,
  price_acs_usd: 25000000,
  engines: "Honeywell HTF7500E"
},


// ======================= HONDAJET & PILATUS =======================

{
  manufacturer: "Honda",
  model: "HondaJet HA-420",
  year: 2015,
  seats: 6,
  range_nm: 1220,
  speed_kts: 420,
  mtow_kg: 4800,
  fuel_burn_kgph: 450,
  price_acs_usd: 5200000,
  engines: "GE HF120"
},

{
  manufacturer: "Pilatus",
  model: "PC-24",
  year: 2018,
  seats: 11,
  range_nm: 2000,
  speed_kts: 440,
  mtow_kg: 8500,
  fuel_burn_kgph: 700,
  price_acs_usd: 10500000,
  engines: "Williams FJ44-4A"
},

   
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
  }
];

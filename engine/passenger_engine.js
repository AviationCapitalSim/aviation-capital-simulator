/* ============================================================
   === ACS PASSENGER REALITY ENGINE — v1.0 =====================
   ============================================================ */

const ACS_PAX = {};

/* -----------------------------
   1. Tier Calculation
--------------------------------*/
ACS_PAX.getTier = function(ap){
    let score = 0;

    if (ap.runway_m > 2600) score++;
    if (ap.population && ap.population > 1_000_000) score++;
    if (ap.iata) score++;
    if (ap.traffic && ap.traffic > 1_000_000) score++;
    if (ap.internationalRoutes && ap.internationalRoutes > 5) score++;

    return Math.max(0, Math.min(score, 5));
};

/* Tier caps */
ACS_PAX.tierCaps = {
    0: { maxDaily: 8, maxHour: 4 },
    1: { maxDaily: 60, maxHour: 20 },
    2: { maxDaily: 180, maxHour: 60 },
    3: { maxDaily: 300, maxHour: 120 },
    4: { maxDaily: 500, maxHour: 250 },
    5: { maxDaily: 1200, maxHour: 1000 }
};

/* -----------------------------
   2. Long-Haul Detection
--------------------------------*/
ACS_PAX.isLongHaul = function(dist, tierA, tierB){
    return (dist > 1800 || tierA >= 4 || tierB >= 4);
};

/* -----------------------------
   3. Ratios
--------------------------------*/
ACS_PAX.continentalRatio = function(c1, c2){
    // tabla real
    // Europa base
    if (c1 === "Europe" && c2 === "Europe") return 1.0;
    if (c1 === "Europe" && c2 === "NorthAmerica") return 0.4;
    if (c1 === "Europe" && c2 === "SouthAmerica") return 0.15;
    if (c1 === "Europe" && c2 === "AfricaNorth") return 0.25;
    if (c1 === "Europe" && c2 === "AfricaSouth") return 0.15;
    if (c1 === "Europe" && c2 === "Asia") return 0.20;
    if (c1 === "Europe" && c2 === "Oceania") return 0.05;

    // fallback
    return 0.2;
};

ACS_PAX.distanceRatio = function(nm){
    if (nm <= 500) return 1.0;
    if (nm <= 1500) return 0.7;
    if (nm <= 3000) return 0.4;
    if (nm <= 7000) return 0.2;
    return 0.1;
};

ACS_PAX.yearRatio = function(year){
    if (year < 1960) return 0.3;
    if (year < 1990) return 0.7;
    return 1.0;
};

/* -----------------------------
   4. Daily demand
--------------------------------*/
ACS_PAX.getDailyDemand = function(A, B, dist, year){
    
    const tierA = this.getTier(A);
    const tierB = this.getTier(B);

    if (tierA === 0 || tierB === 0){
        return Math.floor(Math.random() * 8);
    }

    const base = tierA * tierB;
    const ratioC = this.continentalRatio(A.continent, B.continent);
    const ratioD = this.distanceRatio(dist);
    const ratioY = this.yearRatio(year);
    const variation = 0.8 + Math.random() * 0.4;

    let demand = base * ratioC * ratioD * ratioY * variation;

    demand = Math.min(demand, 
        this.tierCaps[tierA].maxDaily, 
        this.tierCaps[tierB].maxDaily
    );

    return Math.floor(demand);
};

/* -----------------------------
   5. Hourly demand
--------------------------------*/
ACS_PAX.getHourlyDemand = function(daily, hour, isLongHaul, tier){

    // Tier 0 airport
    if (tier === 0){
        return this.tier0Hourly(hour);
    }

    let minP, maxP;

    if (isLongHaul){
        [minP, maxP] = this.longHaulPercent(hour);
    } else {
        [minP, maxP] = this.domesticPercent(hour);
    }

    let ratio = minP + Math.random() * (maxP - minP);
    let hourly = daily * ratio;

    hourly = Math.min(hourly, this.tierCaps[tier].maxHour);

    return Math.floor(hourly);
};

/* Hour tables */
ACS_PAX.tier0Hourly = function(hour){
    if (hour < 6) return 0;
    if (hour < 9) return Math.floor(Math.random() * 3);
    if (hour < 14) return Math.floor(Math.random() * 4);
    if (hour < 19) return 1 + Math.floor(Math.random() * 4);
    if (hour < 22) return Math.floor(Math.random() * 3);
    return 0;
};

ACS_PAX.longHaulPercent = function(hour){
    if (hour < 2) return [0.15, 0.25];
    if (hour < 5) return [0.10, 0.20];
    if (hour < 8) return [0.20, 0.30];
    if (hour < 11) return [0.15, 0.20];
    if (hour < 14) return [0.10, 0.15];
    if (hour < 17) return [0.15, 0.20];
    if (hour < 20) return [0.20, 0.30];
    return [0.25, 0.35];
};

/* Needs continent mapping internally */
ACS_PAX.domesticPercent = function(hour){
    // aquí se inserta la tabla normal de continentes
    // (usamos la versión de Europa como placeholder)
    if (hour < 5) return [0.00, 0.05];
    if (hour < 9) return [0.20, 0.25];
    if (hour < 14) return [0.20, 0.20];
    if (hour < 18) return [0.25, 0.30];
    if (hour < 22) return [0.15, 0.20];
    return [0.02, 0.05];
};

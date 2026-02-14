/* ============================================================
🏦 ACS BANK ENGINE — HISTORICAL LOAN SYSTEM
Version: 1.0
Date: 14 FEB 2026
Scope: 1940–2030 historical aviation banking system
Depends:
- engine/acs_finance.js
- time_engine.js
- ACS_MyAircraft (localStorage)
============================================================ */

(function(){

/* ============================================================
🕰️ ERA CONFIGURATION TABLE
============================================================ */

const ACS_BANK_ERA_TABLE = [

{ year: 1940, maxLTV: 0.35, baseRate: 12.5 },
{ year: 1950, maxLTV: 0.40, baseRate: 11.0 },

{ year: 1960, maxLTV: 0.45, baseRate: 10.0 },
{ year: 1970, maxLTV: 0.50, baseRate: 9.0 },

{ year: 1980, maxLTV: 0.55, baseRate: 8.0 },
{ year: 1990, maxLTV: 0.60, baseRate: 7.0 },

{ year: 2000, maxLTV: 0.65, baseRate: 6.0 },
{ year: 2010, maxLTV: 0.70, baseRate: 5.0 },

{ year: 2020, maxLTV: 0.75, baseRate: 4.5 },
{ year: 2030, maxLTV: 0.72, baseRate: 5.5 }

];

/* ============================================================
📅 GET CURRENT SIM YEAR
============================================================ */

function ACS_BANK_getCurrentYear(){

if (typeof ACS_getCurrentDate === "function"){
return ACS_getCurrentDate().year;
}

if (typeof ACS_TIME !== "undefined"){
return ACS_TIME.year;
}

return 1940;

}

/* ============================================================
✈️ GET FLEET VALUE
============================================================ */

function ACS_BANK_getFleetValue(){

const fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft") || "[]");

let total = 0;

fleet.forEach(ac => {

```
const value =
  ac.marketValue ||
  ac.value ||
  ac.price ||
  0;

total += value;
```

});

return total;

}

/* ============================================================
🏦 GET ERA CONFIG
============================================================ */

function ACS_BANK_getEraConfig(year){

let config = ACS_BANK_ERA_TABLE[0];

ACS_BANK_ERA_TABLE.forEach(row => {
if (year >= row.year){
config = row;
}
});

return config;

}

/* ============================================================
📊 LOAD FINANCE SAFE
============================================================ */

function ACS_BANK_getFinance(){

if (typeof loadFinance === "function"){
return loadFinance();
}

return JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

}

/* ============================================================
💾 SAVE FINANCE SAFE
============================================================ */

function ACS_BANK_saveFinance(fin){

if (typeof saveFinance === "function"){
saveFinance(fin);
return;
}

localStorage.setItem("ACS_Finance", JSON.stringify(fin));

}

/* ============================================================
💰 CALCULATE LOAN CAPACITY
============================================================ */

function ACS_BANK_calculateLoanCapacity(){

const fin = ACS_BANK_getFinance();

if (!fin.bank){
fin.bank = { loans: [] };
}

const year = ACS_BANK_getCurrentYear();

const era = ACS_BANK_getEraConfig(year);

const fleetValue = ACS_BANK_getFleetValue();

const maxLoan = fleetValue * era.maxLTV;

let existing = 0;

fin.bank.loans.forEach(loan=>{
existing += loan.remaining;
});

return Math.max(0, maxLoan - existing);

}

/* ============================================================
📈 CALCULATE INTEREST RATE
============================================================ */

function ACS_BANK_calculateInterestRate(){

const year = ACS_BANK_getCurrentYear();

const era = ACS_BANK_getEraConfig(year);

const fin = ACS_BANK_getFinance();

const debtRatio =
(fin.bank?.loans || []).reduce((s,l)=>s+l.remaining,0)
/
Math.max(ACS_BANK_getFleetValue(),1);

let riskPenalty = 0;

if (debtRatio > 0.6) riskPenalty = 2.5;
else if (debtRatio > 0.4) riskPenalty = 1.5;
else if (debtRatio > 0.2) riskPenalty = 0.5;

return era.baseRate + riskPenalty;

}

/* ============================================================
🧮 MONTHLY PAYMENT CALC
============================================================ */

function ACS_BANK_calculateMonthlyPayment(amount, rate, months){

const r = rate / 100 / 12;

return amount * r / (1 - Math.pow(1+r, -months));

}

/* ============================================================
🏦 CREATE LOAN
============================================================ */

window.ACS_BANK_createLoan = function(amount, months){

const capacity = ACS_BANK_calculateLoanCapacity();

if (amount > capacity){
throw new Error("Loan exceeds capacity");
}

const fin = ACS_BANK_getFinance();

if (!fin.bank){
fin.bank = { loans: [] };
}

const rate = ACS_BANK_calculateInterestRate();

const monthly =
ACS_BANK_calculateMonthlyPayment(amount, rate, months);

const loan = {

```
id: "LOAN_" + Date.now(),

amount,
remaining: amount,

rate,

monthlyPayment: monthly,

termMonths: months,

startYear: ACS_BANK_getCurrentYear()
```

};

fin.bank.loans.push(loan);

fin.balance = (fin.balance || 0) + amount;

ACS_BANK_saveFinance(fin);

return loan;

};

/* ============================================================
🔄 MONTHLY PROCESSING
============================================================ */

window.ACS_BANK_processMonthlyPayments = function(){

const fin = ACS_BANK_getFinance();

if (!fin.bank?.loans) return;

fin.bank.loans.forEach(loan=>{

```
if (loan.remaining <= 0) return;

fin.balance -= loan.monthlyPayment;

loan.remaining -= loan.monthlyPayment;
```

});

ACS_BANK_saveFinance(fin);

};

/* ============================================================
📊 SUMMARY
============================================================ */

window.ACS_BANK_getSummary = function(){

const year = ACS_BANK_getCurrentYear();

const fleetValue = ACS_BANK_getFleetValue();

const capacity = ACS_BANK_calculateLoanCapacity();

const rate = ACS_BANK_calculateInterestRate();

const fin = ACS_BANK_getFinance();

return {

```
year,
fleetValue,
loanCapacity: capacity,
interestRate: rate,
loans: fin.bank?.loans || []
```

};

};

})();

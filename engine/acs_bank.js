/* ============================================================
   🏦 ACS BANK ENGINE — STABLE VERSION
   Historical Aviation Loan Engine (1940–2030)
   ============================================================ */

(function(){

"use strict";

/* ============================================================
   ERA TABLE
   ============================================================ */

const ERA_TABLE = [

  { year:1940, maxLTV:0.35, baseRate:12.5 },
  { year:1950, maxLTV:0.40, baseRate:11.0 },

  { year:1960, maxLTV:0.45, baseRate:10.0 },
  { year:1970, maxLTV:0.50, baseRate:9.0 },

  { year:1980, maxLTV:0.55, baseRate:8.0 },
  { year:1990, maxLTV:0.60, baseRate:7.0 },

  { year:2000, maxLTV:0.65, baseRate:6.0 },
  { year:2010, maxLTV:0.70, baseRate:5.0 },

  { year:2020, maxLTV:0.75, baseRate:4.5 },
  { year:2030, maxLTV:0.72, baseRate:5.5 }

];

/* ============================================================
   AIRCRAFT BASE VALUES (HISTORICAL COLLATERAL VALUES)
   ============================================================ */

const AIRCRAFT_VALUES = {

  "307 Stratoliner": 315000,

  "DC-3": 185000,

  "Constellation": 850000,

  "Boeing 707": 5200000,

  "Boeing 727": 4200000,

  "Boeing 737-200": 3100000,

  "Boeing 747-200": 32000000,

  "A300-B4": 22000000

};
   
/* ============================================================
   CURRENT YEAR FROM TIME ENGINE
   ============================================================ */

function getCurrentYear(){

  if(window.ACS_TIME && ACS_TIME.year)
    return ACS_TIME.year;

  return 1940;
}


/* ============================================================
   LOAD FINANCE SAFE
   ============================================================ */

function getFinance(){

  try{
    return JSON.parse(localStorage.getItem("ACS_Finance")) || {};
  }
  catch{
    return {};
  }

}


/* ============================================================
   SAVE FINANCE SAFE
   ============================================================ */

function saveFinance(fin){

  localStorage.setItem("ACS_Finance", JSON.stringify(fin));

}


/* ============================================================
   GET FLEET VALUE
   ============================================================ */

function getFleetValue(){

  let fleet;

  try{
    fleet = JSON.parse(localStorage.getItem("ACS_MyAircraft")) || [];
  }
  catch{
    fleet = [];
  }

  let total = 0;

  fleet.forEach(ac => {

    let v =
      Number(ac.marketValue) ||
      Number(ac.value) ||
      Number(ac.price) ||
      0;

    if(!v){

      const type =
        ac.type ||
        ac.name ||
        ac.model ||
        "";

      v = AIRCRAFT_VALUES[type] || 0;

    }

    total += v;

  });

  return total;

}

/* ============================================================
   GET ERA CONFIG
   ============================================================ */

function getEra(){

  const year = getCurrentYear();

  let result = ERA_TABLE[0];

  ERA_TABLE.forEach(e => {

    if(year >= e.year)
      result = e;

  });

  return result;

}


/* ============================================================
   CALCULATE LOAN CAPACITY
   ============================================================ */

function calculateLoanCapacity(){

  const fin = getFinance();

  if(!fin.bank)
    fin.bank = { loans:[] };

  const fleetValue = getFleetValue();

  const era = getEra();

  const maxLoan = fleetValue * era.maxLTV;

  let existing = 0;

  fin.bank.loans.forEach(l => {

    existing += Number(l.remaining) || 0;

  });

  return Math.max(0, maxLoan - existing);

}


/* ============================================================
   CALCULATE INTEREST RATE
   ============================================================ */

function calculateInterestRate(){

  const era = getEra();

  const fin = getFinance();

  const fleetValue = getFleetValue();

  let debt = 0;

  if(fin.bank && fin.bank.loans){

    fin.bank.loans.forEach(l => {

      debt += Number(l.remaining) || 0;

    });

  }

  const ratio = fleetValue > 0 ? debt / fleetValue : 0;

  let penalty = 0;

  if(ratio > 0.6) penalty = 2.5;
  else if(ratio > 0.4) penalty = 1.5;
  else if(ratio > 0.2) penalty = 0.5;

  return era.baseRate + penalty;

}


/* ============================================================
   MONTHLY PAYMENT FORMULA
   ============================================================ */

function calculateMonthlyPayment(amount, rate, months){

  const r = rate / 100 / 12;

  if(r === 0)
    return amount / months;

  return amount * r / (1 - Math.pow(1+r, -months));

}


/* ============================================================
   🟩 B7 — ACS BANK CREATE LOAN (CANONICAL FINANCE INTEGRATION)
   Replaces direct balance manipulation
   Uses Finance Ledger v3.0
   ============================================================ */

ACS_BANK_createLoan = function(amount, months){

  const capacity = calculateLoanCapacity();

  if(amount > capacity)
    throw new Error("Loan exceeds capacity");

  const fin = getFinance();

  if(!fin.bank)
    fin.bank = { loans:[] };

  const rate = calculateInterestRate();

  const monthly = calculateMonthlyPayment(amount, rate, months);

  const loan = {

    id: "LOAN_" + Date.now(),

    originalAmount: amount,

    remaining: amount,

    rate: rate,

    monthlyPayment: monthly,

    termMonths: months,

    startYear: getCurrentYear(),

    type: "BANK_LOAN"

  };

  /* ============================================================
     REGISTER LOAN IN BANK STRUCTURE
     ============================================================ */

  fin.bank.loans.push(loan);

  saveFinance(fin);

  /* ============================================================
     REGISTER MONEY IN FINANCE LEDGER (CANONICAL)
     ============================================================ */

  if(typeof window.ACS_registerIncome === "function"){

    window.ACS_registerIncome({

      revenue: amount,

      source: "BANK_LOAN",

      meta: {

        loanId: loan.id,

        rate: rate,

        termMonths: months

      }

    });

  }

  /* ============================================================
     REGISTER LEDGER ENTRY (VISIBLE IN COMPANY FINANCE)
     ============================================================ */

  if(window.ACS_FINANCE_ENGINE &&
     typeof window.ACS_FINANCE_ENGINE.commit === "function"){

    window.ACS_FINANCE_ENGINE.commit({

      type: "LOAN_IN",

      amount: amount,

      source: "BANK",

      ref: loan.id,

      ts: Date.now()

    });

  }

  console.log("🏦 Loan created and registered in Finance:", loan.id);

  return loan;

}

/* ============================================================
   SUMMARY
   ============================================================ */

window.ACS_BANK_getSummary = function(){

  const fin = getFinance();

  if(!fin.bank)
    fin.bank = { loans:[] };

  return {

    year: getCurrentYear(),

    fleetValue: getFleetValue(),

    loanCapacity: calculateLoanCapacity(),

    interestRate: calculateInterestRate(),

    loans: fin.bank.loans

  };

};


/* ============================================================
   EXPOSE PAYMENT FUNCTION
   ============================================================ */

window.ACS_BANK_calculateMonthlyPayment = calculateMonthlyPayment;

})();

/* ============================================================
   🟧 B10 — EXPORT BANK ENGINE GLOBAL (CRITICAL FIX)
   Ensures Loan Request and Finance can access Bank engine
   ============================================================ */

if(typeof window !== "undefined"){

  window.ACS_BANK_createLoan = ACS_BANK_createLoan;

  window.ACS_BANK_getSummary = ACS_BANK_getSummary;

  window.ACS_BANK_amortizeLoan = ACS_BANK_amortizeLoan;

  console.log("🏦 ACS_BANK_ENGINE exposed globally");

}

/* ============================================================
   🟧 B11 — BANK SUMMARY PROVIDER
   ============================================================ */

function ACS_BANK_getSummary(){

  const fin =
    JSON.parse(localStorage.getItem("ACS_Finance") || "{}");

  const loans =
    fin.bank?.loans || [];

  const fleetValue =
    Number(fin.fleetValue || 0);

  const loanCapacity =
    fleetValue * 0.5;

  const interestRate =
    13;

  return {

    loans: loans,

    fleetValue: fleetValue,

    loanCapacity: loanCapacity,

    interestRate: interestRate

  };

}

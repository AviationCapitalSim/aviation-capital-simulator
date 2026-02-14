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

    const v =
      Number(ac.marketValue) ||
      Number(ac.value) ||
      Number(ac.price) ||
      0;

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
   CREATE LOAN
   ============================================================ */

window.ACS_BANK_createLoan = function(amount, months){

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

    amount: amount,

    remaining: amount,

    rate: rate,

    monthlyPayment: monthly,

    termMonths: months,

    startYear: getCurrentYear()

  };

  fin.bank.loans.push(loan);

  fin.balance = (fin.balance || 0) + amount;

  saveFinance(fin);

  return loan;

};


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

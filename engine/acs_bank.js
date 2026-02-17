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
   FIXED — FULL DATE + MATURITY + TIMESTAMPS
   Professional Banking Grade
   ============================================================ */

function ACS_BANK_createLoan(amount, months){

  const capacity = calculateLoanCapacity();

  if(amount > capacity)
    throw new Error("Loan exceeds capacity");

  const fin = getFinance();

  if(!fin.bank)
    fin.bank = { loans:[] };

  const rate =
    calculateInterestRate();

  const monthly =
    calculateMonthlyPayment(
      amount,
      rate,
      months
    );

  /* ============================================================
     🟩 REAL SIMULATION DATE (CRITICAL FIX)
     ============================================================ */

  const now =
    window.ACS_CurrentSimDate
    ? new Date(window.ACS_CurrentSimDate)
    : new Date();

  const maturity =
    new Date(now);

  maturity.setMonth(
    maturity.getMonth() + months
  );

  /* ============================================================
     🟩 CREATE LOAN OBJECT (FULL BANK DATA)
     ============================================================ */

  const loan = {

    id:
      "LOAN_" + Date.now(),

    originalAmount:
      amount,

    remaining:
      amount,

    rate:
      rate,

    monthlyPayment:
      monthly,

    termMonths:
      months,

    startYear:
      now.getUTCFullYear(),

    /* NEW — REAL DATE SYSTEM */

    startDate:
      now.toISOString(),

    maturityDate:
      maturity.toISOString(),

    startTS:
      now.getTime(),

    maturityTS:
      maturity.getTime(),

    type:
      "BANK_LOAN"

  };

  /* ============================================================
     REGISTER LOAN IN BANK STRUCTURE
     ============================================================ */

  fin.bank.loans.push(loan);

  saveFinance(fin);

  /* ============================================================
     REGISTER MONEY IN FINANCE LEDGER
     ============================================================ */

  if(typeof window.ACS_registerIncome === "function"){

    window.ACS_registerIncome({

      revenue: amount,

      source: "BANK_LOAN",

      meta:{

        loanId:
          loan.id,

        rate:
          rate,

        termMonths:
          months

      }

    });

  }

  /* ============================================================
     REGISTER LEDGER ENTRY
     ============================================================ */

  if(window.ACS_FINANCE_ENGINE &&
     typeof window.ACS_FINANCE_ENGINE.commit === "function"){

    window.ACS_FINANCE_ENGINE.commit({

      type:
        "LOAN_IN",

      amount:
        amount,

      source:
        "BANK",

      ref:
        loan.id,

      ts:
        now.getTime()

    });

  }

  console.log(
    "🏦 Loan created:",
    loan.id,
    loan
  );

  return loan;

}

/* ============================================================
   🟩 CF-B14 — ACS BANK MONTHLY LOAN PROCESSOR
   Registers loan payments into Finance Engine
   Runs once per financial month
   ============================================================ */

function ACS_BANK_processMonthlyPayments(){

  const fin = getFinance();

  if(!fin.bank || !Array.isArray(fin.bank.loans))
    return;

  let totalPayment = 0;

  fin.bank.loans.forEach(loan => {

    if(loan.remaining <= 0)
      return;

    const payment =
      Number(loan.monthlyPayment || 0);

    if(payment <= 0)
      return;

    loan.remaining =
      Math.max(0, loan.remaining - payment);

    totalPayment += payment;

  });

  saveFinance(fin);

  /* REGISTER EXPENSE IN FINANCE ENGINE */

  if(typeof window.ACS_registerExpense === "function"){

    window.ACS_registerExpense({

      cost: totalPayment,

      source: "BANK_LOAN_PAYMENT"

    });

  }

  /* LEDGER ENTRY */

  if(window.ACS_FINANCE_ENGINE &&
     typeof window.ACS_FINANCE_ENGINE.commit === "function"){

    window.ACS_FINANCE_ENGINE.commit({

      type: "LOAN_PAYMENT",

      amount: totalPayment,

      source: "BANK",

      ts: Date.now()

    });

  }

  console.log("🏦 Monthly loan payments processed:", totalPayment);

}

/* ============================================================
   🟩 B-AMORTIZE — BANK LOAN AMORTIZATION ENGINE
   Compatible with stable version
============================================================ */

function ACS_BANK_amortizeLoan(loanId, amount){

  if(!loanId)
    throw new Error("Missing loanId");

  amount =
    Number(String(amount).replace(/[^0-9]/g,""));

  if(!amount || amount <= 0)
    throw new Error("Invalid amount");

  const fin =
    getFinance();

  if(!fin.bank || !Array.isArray(fin.bank.loans))
    throw new Error("No bank data");

  const loan =
    fin.bank.loans.find(l => l.id === loanId);

  if(!loan)
    throw new Error("Loan not found");

  if(Number(loan.remaining) <= 0)
    throw new Error("Loan already paid");


  /* APPLY PAYMENT */

  const payment =
    Math.min(amount, Number(loan.remaining));

  loan.remaining =
    Math.max(0, Number(loan.remaining) - payment);


  /* REGISTER EXPENSE IN FINANCE ENGINE */

  const now =
    window.ACS_CurrentSimDate
    ? new Date(window.ACS_CurrentSimDate)
    : new Date();

  if(window.ACS_FINANCE_ENGINE &&
     typeof window.ACS_FINANCE_ENGINE.commit === "function"){

    window.ACS_FINANCE_ENGINE.commit({

      type: "LOAN_AMORTIZATION",

      amount: payment,

      source: "BANK",

      ref: loan.id,

      ts: now.getTime()

    });

  }


  saveFinance(fin);


  console.log(
    "🏦 Loan amortized:",
    loan.id,
    "Payment:",
    payment,
    "Remaining:",
    loan.remaining
  );


  return loan.remaining;

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


/* ============================================================
   🟩 CF-B15 — EXPORT MONTHLY PROCESSOR GLOBAL
   ============================================================ */

window.ACS_BANK_processMonthlyPayments =
  ACS_BANK_processMonthlyPayments;


/* ============================================================
   🟩 B-EXPORT-FINAL — GLOBAL EXPORT FIX (CRITICAL)
   Guarantees amortization and all core functions are visible globally
============================================================ */

/* CRITICAL — EXPORT DIRECTLY FIRST (NO TRY) */

window.ACS_BANK_amortizeLoan =
  ACS_BANK_amortizeLoan;

window.ACS_BANK_createLoan =
  ACS_BANK_createLoan;

window.ACS_BANK_getSummary =
  ACS_BANK_getSummary;

window.ACS_BANK_processMonthlyPayments =
  ACS_BANK_processMonthlyPayments;


/* SAFE VALIDATION LOG */

try{

  if(typeof window.ACS_BANK_amortizeLoan === "function"){
    console.log("✅ EXPORT OK: ACS_BANK_amortizeLoan");
  }else{
    console.error("❌ EXPORT FAILED: ACS_BANK_amortizeLoan");
  }

  if(typeof window.ACS_BANK_createLoan === "function"){
    console.log("✅ EXPORT OK: ACS_BANK_createLoan");
  }

  if(typeof window.ACS_BANK_getSummary === "function"){
    console.log("✅ EXPORT OK: ACS_BANK_getSummary");
  }

  console.log("🏦 ACS_BANK_ENGINE READY (EXPORT OK)");

}
catch(e){

  console.error("BANK ENGINE EXPORT FAILED:", e);

}


/* CLOSE ENGINE IIFE */
})();

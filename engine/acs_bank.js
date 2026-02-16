/* ============================================================
   🏦 ACS BANK ENGINE — STABLE VERSION
   Historical Aviation Loan Engine (1940–2030)
   ============================================================ */

/* ============================================================
   🟧 B-60 — SIM NOW HELPER (BANK)
   Uses ACS simulation date when available
   ============================================================ */

function ACS_BANK_now(){

  // Prefer simulation date (ACS)
  if(window.ACS_CurrentSimDate){
    const d = new Date(window.ACS_CurrentSimDate);
    if(!isNaN(d.getTime())) return d;
  }

  // Optional: if your time engine exposes a getter
  if(typeof window.ACS_getSimDate === "function"){
    const d = new Date(window.ACS_getSimDate());
    if(!isNaN(d.getTime())) return d;
  }

  // Fallback: real time
  return new Date();

}

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
   🟦 C1 — ACS BANK CREATE LOAN (SIM TIME AUTHORITATIVE FIX)
   ------------------------------------------------------------
   FIXES:
   ✔ Uses simulation time (NOT browser time)
   ✔ Fixes maturity date corruption (2026 / 2032 bug)
   ✔ Fixes closed date reference base
   ✔ Fully compatible with Time Engine
   ✔ Canonical banking timestamp authority
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
   🟦 AUTHORITATIVE SIMULATION DATE (PRIMARY SOURCE)
   FIXED — uses ACS_TIME.currentTime (official sim clock)
   ============================================================ */

let simDate = null;

/* ============================================================
   PRIORITY 1 — OFFICIAL ACS TIME ENGINE (CORRECT SOURCE)
   ============================================================ */

if(window.ACS_TIME && ACS_TIME.currentTime){

  const d =
    new Date(ACS_TIME.currentTime);

  if(!isNaN(d.getTime()))
    simDate = d;

}

/* ============================================================
   PRIORITY 2 — legacy variable support (optional)
   ============================================================ */

if(!simDate && window.ACS_CurrentSimDate){

  const d =
    new Date(window.ACS_CurrentSimDate);

  if(!isNaN(d.getTime()))
    simDate = d;

}

/* ============================================================
   PRIORITY 3 — cockpit clock fallback (SAFE)
   ============================================================ */

if(!simDate){

  try{

    const el =
      document.querySelector(".clock-text");

    if(el){

      const txt =
        (el.textContent || "").trim();

      const parts =
        txt.split("—");

      if(parts.length >= 2){

        const datePart =
          parts[1].trim();

        const tokens =
          datePart.split(/\s+/).filter(Boolean);

        if(tokens.length >= 4){

          const day =
            Number(tokens[1]);

          const monStr =
            String(tokens[2]).toUpperCase();

          const year =
            Number(tokens[3]);

          const map = {
            JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5,
            JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11
          };

          const month =
            map[monStr];

          if(day && month !== undefined && year){

            simDate =
              new Date(Date.UTC(year, month, day, 12, 0, 0));

          }

        }

      }

    }

  }
  catch(e){}

}

/* ============================================================
   FINAL FALLBACK — NEVER USE REAL TIME IF SIM EXISTS
   ============================================================ */

if(!simDate){

  console.warn(
    "ACS BANK WARNING: simDate fallback to real time"
  );

  simDate = new Date();

}

/* ============================================================
   CREATE START AND MATURITY DATES
   ============================================================ */

const startDate =
  new Date(simDate);

const maturityDate =
  new Date(startDate);

maturityDate.setMonth(
  maturityDate.getMonth() + months
);

  /* ============================================================
     🟦 CREATE LOAN OBJECT (SIM SAFE)
     ============================================================ */

  const loan = {

    id:
      "LOAN_" + startDate.getTime(),

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
      startDate.getUTCFullYear(),

    startDate:
      startDate.toISOString(),

    maturityDate:
      maturityDate.toISOString(),

    startTS:
      startDate.getTime(),

    maturityTS:
      maturityDate.getTime(),

    createdAt:
      startDate.getTime(),

    type:
      "BANK_LOAN"

  };

  /* ============================================================
     REGISTER LOAN
     ============================================================ */

  fin.bank.loans.push(loan);

  saveFinance(fin);

  /* ============================================================
     REGISTER FINANCE INCOME
     ============================================================ */

  if(typeof window.ACS_registerIncome === "function"){

    window.ACS_registerIncome({

      revenue: amount,

      source: "BANK_LOAN",

      meta:{
        loanId: loan.id,
        rate: rate,
        termMonths: months
      },

      ts: startDate.getTime()

    });

  }

  /* ============================================================
     REGISTER LEDGER ENTRY
     ============================================================ */

  if(window.ACS_FINANCE_ENGINE &&
     typeof window.ACS_FINANCE_ENGINE.commit === "function"){

    window.ACS_FINANCE_ENGINE.commit({

      type: "LOAN_IN",
      amount: amount,
      source: "BANK",
      ref: loan.id,
      ts: startDate.getTime()

    });

  }

  console.log(
    "🏦 Loan created (SIM TIME):",
    loan.id,
    startDate,
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
   Required for Finance Engine integration
   ============================================================ */

window.ACS_BANK_processMonthlyPayments =
  ACS_BANK_processMonthlyPayments;

/* ============================================================
   🟩 B16 — EXPORT GLOBAL FROM INSIDE CLOSURE (CORRECT FIX)
   ============================================================ */

window.ACS_BANK_createLoan = ACS_BANK_createLoan;

/* ============================================================
🟩 CF-B20 — BANK LOAN AMORTIZATION ENGINE
Real principal reduction + finance integration
============================================================ */

function ACS_BANK_amortizeLoan(loanId, amount){

if(!loanId)
throw new Error("Missing loanId");

amount = Number(amount);

if(!amount || amount <= 0)
throw new Error("Invalid amortization amount");

const fin = getFinance();

if(!fin.bank || !Array.isArray(fin.bank.loans))
throw new Error("No loans found");

const loan =
fin.bank.loans.find(l => l.id === loanId);

if(!loan)
throw new Error("Loan not found");

if(loan.remaining <= 0)
throw new Error("Loan already fully paid");

/* ============================================
APPLY AMORTIZATION
============================================ */

const actualPayment =
Math.min(amount, loan.remaining);

loan.remaining =
Math.max(0, loan.remaining - actualPayment);

/* ============================================================
   🟩 B-62 — PAYMENT TIMESTAMPS (SIM DATE)
   Stores last payment + closed date when fully paid
   ============================================================ */

const payNow = ACS_BANK_now();

// always track last payment date
loan.lastPaymentDate = payNow.toISOString();
loan.lastPaymentTS   = payNow.getTime();

// if fully paid, close the loan
if(Number(loan.remaining || 0) <= 0){

  loan.remaining = 0;

  loan.closedDate = payNow.toISOString();
  loan.closedTS   = payNow.getTime();

}
   
/* ============================================================
   🟩 B-35 — AUTO RELEASE COLLATERAL WHEN LOAN PAID
   ============================================================ */

if(loan.remaining === 0){

  try{

    const fleet =
    JSON.parse(
      localStorage.getItem("ACS_MyAircraft") || "[]"
    );

    let released = false;

    fleet.forEach(ac => {

      if(ac.collateralLoanId === loan.id){

        ac.collateralActive = false;

        delete ac.collateralLoanId;

        released = true;

      }

    });

    if(released){

      localStorage.setItem(
        "ACS_MyAircraft",
        JSON.stringify(fleet)
      );

      console.log(
        "✈️ Collateral released:",
        loan.id
      );

    }

  }
  catch(e){

    console.warn(
      "Collateral release error:",
      e
    );

  }

}

saveFinance(fin);

/* ============================================
REGISTER EXPENSE IN FINANCE ENGINE
============================================ */

if(window.ACS_FINANCE_ENGINE &&
   typeof window.ACS_FINANCE_ENGINE.commit === "function"){

  window.ACS_FINANCE_ENGINE.commit({

    type: "LOAN_AMORTIZATION",
    amount: actualPayment,
    source: "BANK",
    ref: loan.id,
    ts: Date.now()

  });

}

/* ============================================
CONFIRMATION LOG
============================================ */

console.log(
  "🏦 Loan amortized:",
  loan.id,
  "Amount:",
  actualPayment
);

return loan.remaining;

}

/* ============================================================
   🟩 B-34 — EXPORT GLOBAL FUNCTIONS (FINAL SAFE EXPORT)
   Prevents SyntaxError and ensures engine loads correctly
   ============================================================ */

window.ACS_BANK_amortizeLoan =
ACS_BANK_amortizeLoan;

window.ACS_BANK_getSummary =
ACS_BANK_getSummary;

window.ACS_BANK_createLoan =
ACS_BANK_createLoan;

console.log("🏦 ACS_BANK_ENGINE READY");

/* CLOSE ENGINE IIFE */
})();

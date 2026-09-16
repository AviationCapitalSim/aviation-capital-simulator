/* ============================================================
   MY AIRCRAFT — CABIN CONFIGURATION
   Global aircraft cabin controller
   ------------------------------------------------------------
   Scope:
   - Uses the selected My Aircraft fleet record.
   - Uses catalog passenger capacity as cabin-space authority.
   - Supports current and future aircraft through global categories.
   - SMALL:       2-2
   - MEDIUM:      2-2
   - LARGE:       2-2, 3-3
   - EXTRA LARGE: 3-3, 3-4-3
   - Keeps preview state isolated by aircraft during the page session.
   - Does not mutate Finance, maintenance, fleet or delivery systems.
   ============================================================ */

(() => {
  "use strict";

  const CABIN_CLASSES = Object.freeze(["Y", "C", "F"]);

  const cabinStateByAircraft = new Map();

  const PRODUCTS = Object.freeze({
    Y: Object.freeze([
      Object.freeze({ code: "Y_SMART", name: "Economy Smart", factor: 1 }),
      Object.freeze({ code: "Y_CLASSIC", name: "Economy Classic", factor: 1.25 }),
      Object.freeze({ code: "Y_COMFORT", name: "Economy Comfort", factor: 1.5 }),
      Object.freeze({ code: "Y_PLUS", name: "Economy Plus", factor: 1.75 })
    ]),
    C: Object.freeze([
      Object.freeze({ code: "C_SMART", name: "Business Smart", factor: 2 }),
      Object.freeze({ code: "C_EXECUTIVE", name: "Business Executive", factor: 2.5 }),
      Object.freeze({ code: "C_PREMIER", name: "Business Premier", factor: 3 }),
      Object.freeze({ code: "C_SUPERIOR", name: "Business Superior", factor: 3.5 })
    ]),
    F: Object.freeze([
      Object.freeze({ code: "F_SILVER", name: "First Silver", factor: 4 }),
      Object.freeze({ code: "F_GOLD", name: "First Gold", factor: 4.5 }),
      Object.freeze({ code: "F_PLATINUM", name: "First Platinum", factor: 5 }),
      Object.freeze({ code: "F_DIAMOND", name: "First Diamond", factor: 6 })
    ])
  });

  /* ============================================================
   ACS CABIN RECONFIGURATION — QUOTE AUTHORITY v1.0
   ------------------------------------------------------------
   • Reference installation prices = 2026 USD
   • Historical factor follows ACS simulation year
   • Quote only — no charge and no maintenance order yet
   ============================================================ */

const CABIN_INSTALLATION_PRICES = Object.freeze({
  Y_SMART: 1500,
  Y_CLASSIC: 2000,
  Y_COMFORT: 2750,
  Y_PLUS: 3500,

  C_SMART: 6000,
  C_EXECUTIVE: 8000,
  C_PREMIER: 10500,
  C_SUPERIOR: 13000,

  F_SILVER: 16000,
  F_GOLD: 20000,
  F_PLATINUM: 25000,
  F_DIAMOND: 32000
});

const CABIN_HISTORICAL_FACTORS = Object.freeze([
  Object.freeze({ from: 1940, to: 1945, factor: 0.08 }),
  Object.freeze({ from: 1946, to: 1955, factor: 0.12 }),
  Object.freeze({ from: 1956, to: 1961, factor: 0.18 }),
  Object.freeze({ from: 1962, to: 1969, factor: 0.24 }),
  Object.freeze({ from: 1970, to: 1979, factor: 0.30 }),
  Object.freeze({ from: 1980, to: 1989, factor: 0.42 }),
  Object.freeze({ from: 1990, to: 1999, factor: 0.58 }),
  Object.freeze({ from: 2000, to: 2005, factor: 0.70 }),
  Object.freeze({ from: 2006, to: 2015, factor: 0.82 }),
  Object.freeze({ from: 2016, to: 2020, factor: 0.92 }),
  Object.freeze({ from: 2021, to: 2026, factor: 1.00 })
]);
   
  const LAYOUTS_BY_CATEGORY = Object.freeze({
    SMALL: Object.freeze([
      Object.freeze([2, 2])
    ]),
    MEDIUM: Object.freeze([
      Object.freeze([2, 2])
    ]),
    LARGE: Object.freeze([
      Object.freeze([2, 2]),
      Object.freeze([3, 3])
    ]),
    EXTRA_LARGE: Object.freeze([
      Object.freeze([3, 3]),
      Object.freeze([3, 4, 3])
    ])
  });

  let activeAircraft = null;
  let draft = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function installVisualCorrections() {
    if (byId("macCabinRuntimeStyles")) return;

    const style = document.createElement("style");
    style.id = "macCabinRuntimeStyles";
    style.textContent = `
      #myAircraftCabinModal #macCabinTitle {
        color: #ffb300;
        text-transform: none;
        text-shadow:
          0 0 8px rgba(255, 179, 0, 0.55),
          0 0 18px rgba(255, 179, 0, 0.22);
      }

      #myAircraftCabinModal .mac-cabin-direction {
        display: none;
      }

      #myAircraftCabinModal .mac-cabin-workspace {
        align-items: stretch;
      }

      #myAircraftCabinModal .mac-cabin-layout-panel,
      #myAircraftCabinModal .mac-cabin-control-panel {
        min-height: 0;
      }

      #myAircraftCabinModal .mac-cabin-map {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        min-height: 0;
        height: 100%;
        max-height: 58vh;
        padding: 22px 18px;
        overflow: auto;
      }

      #myAircraftCabinModal .mac-airframe {
        width: min(100%, 280px);
        min-width: 0;
        margin: 0 auto;
        padding: 18px 20px;
        box-sizing: border-box;
        border-radius: 120px 120px 36px 36px;
      }

      #myAircraftCabinModal .mac-airframe-layout-6 {
        width: min(100%, 330px);
        padding-inline: 24px;
      }

      #myAircraftCabinModal .mac-airframe-layout-10 {
        width: min(100%, 440px);
        padding-inline: 26px;
      }

      #myAircraftCabinModal .mac-airframe-position {
        color: #63cfff;
        text-align: center;
        font-family: "Orbitron", sans-serif;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1px;
      }

      #myAircraftCabinModal .mac-airframe-position-nose {
        margin-bottom: 14px;
      }

      #myAircraftCabinModal .mac-airframe-position-tail {
        margin-top: 14px;
      }

      #myAircraftCabinModal .mac-seat-input {
        appearance: textfield;
        -moz-appearance: textfield;
      }

      #myAircraftCabinModal .mac-seat-input::-webkit-inner-spin-button,
      #myAircraftCabinModal .mac-seat-input::-webkit-outer-spin-button {
        margin: 0;
        appearance: none;
        -webkit-appearance: none;
      }

      #myAircraftCabinModal .mac-seat-stepper button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        box-shadow: none;
      }

      #myAircraftCabinModal .mac-cabin-footer {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        width: calc(50% - 29px);
        margin: 0 20px 0 auto;
        padding: 16px 0 20px;
        box-sizing: border-box;
        border-top: 0;
      }

      #myAircraftCabinModal .mac-cabin-footer button {
        width: 100%;
        min-width: 0;
      }

      @media (max-width: 900px) {
        #myAircraftCabinModal .mac-cabin-map {
          height: auto;
          max-height: 50vh;
        }

        #myAircraftCabinModal .mac-cabin-footer {
          width: auto;
          margin: 0 12px;
          padding-bottom: 14px;
        }
      }

      @media (max-width: 600px) {
        #myAircraftCabinModal .mac-cabin-footer {
          grid-template-columns: 1fr;
          gap: 8px;
          margin: 0 10px;
        }

        #myAircraftCabinModal .mac-airframe,
        #myAircraftCabinModal .mac-airframe-layout-6,
        #myAircraftCabinModal .mac-airframe-layout-10 {
          width: min(100%, 280px);
          padding-inline: 14px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function safeInteger(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) return fallback;

    return Math.max(0, Math.trunc(number));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeToken(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function aircraftCapacity(aircraft) {
    return safeInteger(
      aircraft?.seats ??
      aircraft?.passenger_capacity ??
      aircraft?.capacity ??
      aircraft?.catalog_seats,
      0
    );
  }

  function aircraftName(aircraft) {
    return String(
      aircraft?.catalog_aircraft_name ||
      aircraft?.aircraft_name ||
      aircraft?.catalog_model ||
      aircraft?.model ||
      "Aircraft"
    );
  }

  function aircraftStateKey(aircraft) {
    return String(
      aircraft?.id ||
      aircraft?.aircraft_id ||
      aircraft?.registration ||
      aircraftName(aircraft)
    );
  }

  function categorySource(aircraft) {
    return [
      aircraft?.cabin_size_category,
      aircraft?.aircraft_size,
      aircraft?.size_category,
      aircraft?.production_category,
      aircraft?.catalog_category,
      aircraft?.aircraft_category,
      aircraft?.category
    ]
      .map(normalizeToken)
      .filter(Boolean)
      .join(" ");
  }

  function normalizeCategory(aircraft) {
    const source = categorySource(aircraft);

    if (
      source.includes("EXTRA_LARGE") ||
      source.includes("EXTRALARGE") ||
      source.includes("WIDE_BODY") ||
      source.includes("WIDEBODY") ||
      source.includes("VERY_LARGE")
    ) {
      return "EXTRA_LARGE";
    }

    if (
      source.includes("NARROW_BODY") ||
      source.includes("NARROWBODY") ||
      /(^|\s)LARGE($|\s)/.test(source)
    ) {
      return "LARGE";
    }

    if (
      source.includes("REGIONAL") ||
      /(^|\s)MEDIUM($|\s)/.test(source)
    ) {
      return "MEDIUM";
    }

    if (
      source.includes("COMMUTER") ||
      source.includes("LIGHT") ||
      /(^|\s)SMALL($|\s)/.test(source)
    ) {
      return "SMALL";
    }

    const capacity = aircraftCapacity(aircraft);

    if (capacity >= 250) return "EXTRA_LARGE";
    if (capacity >= 100) return "LARGE";
    if (capacity >= 40) return "MEDIUM";

    return "SMALL";
  }

  function categoryLabel(category) {
    return category.replaceAll("_", " ");
  }

  function allowedLayouts(aircraft) {
    const category = normalizeCategory(aircraft);
    return LAYOUTS_BY_CATEGORY[category] || LAYOUTS_BY_CATEGORY.SMALL;
  }

  function layoutsEqual(firstLayout, secondLayout) {
    return (
      Array.isArray(firstLayout) &&
      Array.isArray(secondLayout) &&
      firstLayout.length === secondLayout.length &&
      firstLayout.every(
        (seatCount, index) => seatCount === secondLayout[index]
      )
    );
  }

  function ensureAllowedLayout(aircraft, candidateLayout) {
    const layouts = allowedLayouts(aircraft);
    const allowed = layouts.find(layout => layoutsEqual(layout, candidateLayout));

    return [...(allowed || layouts[0])];
  }

  function getProduct(cabinClass, productCode) {
    return PRODUCTS[cabinClass]?.find(
      product => product.code === productCode
    ) || null;
  }

  function productFactor(cabinClass, productCode) {
    return Number(getProduct(cabinClass, productCode)?.factor || 1);
  }

  function makeFactoryDefault(aircraft) {
    return {
      seatLayout: [...allowedLayouts(aircraft)[0]],
      Y: { product: "Y_SMART", seats: aircraftCapacity(aircraft) },
      C: { product: "C_SMART", seats: 0 },
      F: { product: "F_SILVER", seats: 0 },
      configurationType: "FACTORY_DEFAULT"
    };
  }

  function normalizeDraftShape(aircraft, value) {
    const factoryDefault = makeFactoryDefault(aircraft);
    const normalized = value && typeof value === "object"
      ? clone(value)
      : factoryDefault;

    normalized.seatLayout = ensureAllowedLayout(
      aircraft,
      normalized.seatLayout
    );

    for (const cabinClass of CABIN_CLASSES) {
      const fallback = factoryDefault[cabinClass];
      const selection = normalized[cabinClass] || {};
      const product = getProduct(cabinClass, selection.product);

      normalized[cabinClass] = {
        product: product ? product.code : fallback.product,
        seats: safeInteger(selection.seats, fallback.seats)
      };
    }

    normalized.configurationType =
      normalized.configurationType === "FACTORY_DEFAULT"
        ? "FACTORY_DEFAULT"
        : "CUSTOM";

    return normalized;
  }

  /* ============================================================
   ACS CABIN RECONFIGURATION — LIVE QUOTE
   ============================================================ */

function currentSimulationYear() {
  const clock = byId("acs-clock");

  const match =
    String(clock?.textContent || "")
      .match(/\b(19|20)\d{2}\b/);

  if (!match) return null;

  const year = Number(match[0]);

  return Number.isInteger(year)
    ? year
    : null;
}

function historicalCostFactor(year) {
  const record =
    CABIN_HISTORICAL_FACTORS.find(
      item =>
        year >= item.from &&
        year <= item.to
    );

  return record
    ? Number(record.factor)
    : null;
}

function activeCabinConfiguration(aircraft) {
  const factoryDefault =
    makeFactoryDefault(aircraft);

  return {
    Y: {
      product:
        aircraft?.y_product ||
        factoryDefault.Y.product,

      seats:
        safeInteger(
          aircraft?.y_seats,
          factoryDefault.Y.seats
        )
    },

    C: {
      product:
        aircraft?.c_product ||
        factoryDefault.C.product,

      seats:
        safeInteger(
          aircraft?.c_seats,
          factoryDefault.C.seats
        )
    },

    F: {
      product:
        aircraft?.f_product ||
        factoryDefault.F.product,

      seats:
        safeInteger(
          aircraft?.f_seats,
          factoryDefault.F.seats
        )
    }
  };
}

function durationHoursFromCWU(cwu) {
  if (cwu <= 0) return 0;
  if (cwu <= 10) return 12;
  if (cwu <= 25) return 24;
  if (cwu <= 50) return 48;
  if (cwu <= 100) return 72;
  if (cwu <= 180) return 96;
  if (cwu <= 280) return 120;
  if (cwu <= 400) return 144;

  return 168;
}

function categoryDurationFactor(aircraft) {
  const category =
    normalizeCategory(aircraft);

  if (category === "SMALL") return 0.80;
  if (category === "MEDIUM") return 0.90;
  if (category === "EXTRA_LARGE") return 1.20;

  return 1.00;
}

function calculateCabinReconfigurationQuote() {
  if (!activeAircraft || !draft) {
    return null;
  }

  const current =
    activeCabinConfiguration(
      activeAircraft
    );

  const simYear =
    currentSimulationYear();

  const historicalFactor =
    historicalCostFactor(simYear);

  let referenceCost = 0;
  let workloadCWU = 0;
  let seatsInstalled = 0;

  for (const cabinClass of CABIN_CLASSES) {
    const oldCabin =
      current[cabinClass];

    const newCabin =
      draft[cabinClass];

    const oldSeats =
      safeInteger(oldCabin.seats);

    const newSeats =
      safeInteger(newCabin.seats);

    const productChanged =
      oldCabin.product !==
      newCabin.product;

    let installedSeats = 0;
    let removedSeats = 0;

    if (productChanged) {
      installedSeats = newSeats;
      removedSeats = oldSeats;
    } else {
      installedSeats =
        Math.max(
          0,
          newSeats - oldSeats
        );

      removedSeats =
        Math.max(
          0,
          oldSeats - newSeats
        );
    }

    seatsInstalled += installedSeats;

    referenceCost +=
      installedSeats *
      Number(
        CABIN_INSTALLATION_PRICES[
          newCabin.product
        ] || 0
      );

    workloadCWU +=
      (
        removedSeats *
        productFactor(
          cabinClass,
          oldCabin.product
        ) *
        0.50
      );

    workloadCWU +=
      (
        installedSeats *
        productFactor(
          cabinClass,
          newCabin.product
        )
      );
  }

  const baseDurationHours =
    durationHoursFromCWU(
      workloadCWU
    );

  const durationHours =
    workloadCWU > 0
      ? Math.ceil(
          baseDurationHours *
          categoryDurationFactor(
            activeAircraft
          )
        )
      : 0;

  const historicalCost =
    historicalFactor === null
      ? null
      : Math.round(
          referenceCost *
          historicalFactor
        );

  return {
    simYear,
    historicalFactor,
    referenceCost,
    historicalCost,
    workloadCWU:
      Math.round(workloadCWU * 100) / 100,
    durationHours,
    seatsInstalled
  };
}

function formatCabinMoney(value) {
  if (!Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value)
    .toLocaleString(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }
    );
}

function formatCabinDuration(hours) {
  const totalHours =
    safeInteger(hours);

  if (totalHours <= 0) {
    return "0 h";
  }

  const days =
    Math.floor(totalHours / 24);

  const remainingHours =
    totalHours % 24;

  if (days <= 0) {
    return `${remainingHours} h`;
  }

  if (remainingHours <= 0) {
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  return `${days}d ${remainingHours}h`;
}
   
  function spaceUsedByClass(cabinClass) {
    const selection = draft[cabinClass];

    return (
      safeInteger(selection.seats) *
      productFactor(cabinClass, selection.product)
    );
  }

  function spaceUsedExcluding(excludedClass) {
    return CABIN_CLASSES.reduce((total, cabinClass) => {
      if (cabinClass === excludedClass) return total;
      return total + spaceUsedByClass(cabinClass);
    }, 0);
  }

 function maximumSeatsForClass(cabinClass) {
  const capacity = aircraftCapacity(activeAircraft);

  const factor = productFactor(
    cabinClass,
    draft[cabinClass].product
  );

  if (capacity <= 0 || factor <= 0) {
    return 0;
  }

  /*
    Y is the automatic balancing class.

    For Business / First:
    Economy does NOT block adding premium seats.
    Only the OTHER premium class consumes protected space.

    For Economy:
    C + F consume space first and Y receives the remainder.
  */

  let protectedSpace = 0;

  if (cabinClass === "Y") {
    protectedSpace =
      spaceUsedByClass("C") +
      spaceUsedByClass("F");
  } else if (cabinClass === "C") {
    protectedSpace =
      spaceUsedByClass("F");
  } else if (cabinClass === "F") {
    protectedSpace =
      spaceUsedByClass("C");
  }

  const availableSpace =
    Math.max(0, capacity - protectedSpace);

  return Math.max(
    0,
    Math.floor(availableSpace / factor)
  );
}

function clampSeats(cabinClass, requestedSeats) {
  return Math.min(
    maximumSeatsForClass(cabinClass),
    Math.max(0, safeInteger(requestedSeats))
  );
}

function fitEconomyToCabin(previousDraft) {
  const capacity = aircraftCapacity(activeAircraft);

  if (!activeAircraft || !draft || capacity <= 0) {
    return false;
  }

  const economyFactor = productFactor(
    "Y",
    draft.Y.product
  );

  if (economyFactor <= 0) {
    draft = previousDraft;
    return false;
  }

  const premiumSpaceUsed =
    spaceUsedByClass("C") +
    spaceUsedByClass("F");

  const availableEconomySpace =
    capacity - premiumSpaceUsed;

  /*
    C + F alone may never exceed aircraft capacity.
    Restore previous valid configuration if they do.
  */

  if (availableEconomySpace < 0) {
    draft = previousDraft;
    return false;
  }

  draft.Y.seats = Math.max(
    0,
    Math.floor(
      availableEconomySpace /
      economyFactor
    )
  );

  return true;
}

function normalizeDraftCapacity() {
  for (const cabinClass of ["F", "C"]) {
    draft[cabinClass].seats = clampSeats(
      cabinClass,
      draft[cabinClass].seats
    );
  }

  const previousDraft = clone(draft);

  if (!fitEconomyToCabin(previousDraft)) {
    draft = previousDraft;
  }
}

  function isFactoryDefault() {
    if (!activeAircraft || !draft) return false;

    const factoryDefault = makeFactoryDefault(activeAircraft);

    return (
      layoutsEqual(draft.seatLayout, factoryDefault.seatLayout) &&
      CABIN_CLASSES.every(cabinClass => (
        draft[cabinClass].product === factoryDefault[cabinClass].product &&
        draft[cabinClass].seats === factoryDefault[cabinClass].seats
      ))
    );
  }

  function validateDraft() {
    const capacity = aircraftCapacity(activeAircraft);
    let installedSeats = 0;
    let usedSpace = 0;

    if (capacity <= 0) {
      return {
        valid: false,
        installedSeats: 0,
        usedSpace: 0,
        message: "Aircraft passenger capacity is unavailable."
      };
    }

    for (const cabinClass of CABIN_CLASSES) {
      const selection = draft[cabinClass];
      const product = getProduct(cabinClass, selection.product);
      const seats = safeInteger(selection.seats);

      if (!product) {
        return {
          valid: false,
          installedSeats,
          usedSpace,
          message: `Select a valid ${cabinClass} seat product.`
        };
      }

      installedSeats += seats;
      usedSpace += seats * product.factor;
    }

    if (installedSeats <= 0) {
      return {
        valid: false,
        installedSeats: 0,
        usedSpace,
        message: "Configure at least one passenger seat."
      };
    }

    if (usedSpace > capacity + Number.EPSILON) {
      return {
        valid: false,
        installedSeats,
        usedSpace,
        message: "This cabin configuration exceeds aircraft capacity."
      };
    }

    return {
      valid: true,
      installedSeats,
      usedSpace,
      message: `${installedSeats} passenger seats configured.`
    };
  }

  function renderLayoutSelector() {
    const category = normalizeCategory(activeAircraft);
    const layouts = allowedLayouts(activeAircraft);

    return `
      <section class="mac-layout-selector">
        <div class="mac-layout-heading">
          <span class="mac-layout-title">SEAT LAYOUT</span>
          <small class="mac-layout-category">
            ${categoryLabel(category)}
          </small>
        </div>

        <div class="mac-layout-options">
          ${layouts.map(layout => {
            const value = layout.join("-");
            const selected = layoutsEqual(layout, draft.seatLayout);

            return `
              <button
                type="button"
                class="mac-layout-option ${selected ? "is-selected" : ""}"
                data-mac-layout="${value}"
                aria-pressed="${selected}"
              >
                <strong>${value}</strong>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderClassControl(cabinClass, title) {
    const selection = draft[cabinClass];
    const currentSeats = safeInteger(selection.seats);
    const maximumSeats = maximumSeatsForClass(cabinClass);

    return `
      <section class="mac-cabin-class">
        <div class="mac-cabin-class-heading">
          <span class="mac-cabin-class-title">${title}</span>
          <span class="mac-seat-total">${currentSeats} seats</span>
        </div>

        <select data-mac-product="${cabinClass}">
          ${PRODUCTS[cabinClass].map(product => `
            <option
              value="${product.code}"
              ${selection.product === product.code ? "selected" : ""}
            >
              ${product.name}
            </option>
          `).join("")}
        </select>

        <div class="mac-seat-stepper">
          <button
            type="button"
            data-mac-step="${cabinClass}"
            data-mac-delta="-1"
            ${currentSeats <= 0 ? "disabled" : ""}
            aria-label="Remove one ${title.toLowerCase()} seat"
          >
            −
          </button>

          <input
            class="mac-seat-input"
            type="number"
            inputmode="numeric"
            min="0"
            max="${maximumSeats}"
            step="1"
            value="${currentSeats}"
            data-mac-seats="${cabinClass}"
            aria-label="${title} seats"
          >

          <button
            type="button"
            data-mac-step="${cabinClass}"
            data-mac-delta="1"
            ${currentSeats >= maximumSeats ? "disabled" : ""}
            aria-label="Add one ${title.toLowerCase()} seat"
          >
            +
          </button>
        </div>
      </section>
    `;
  }

  function renderControls() {
    const container = byId("macCabinControls");
    if (!container) return;

    container.innerHTML = `
      ${renderLayoutSelector()}
      ${renderClassControl("Y", "ECONOMY")}
      ${renderClassControl("C", "BUSINESS")}
      ${renderClassControl("F", "FIRST")}
    `;
  }

  function renderSeat(cabinClass, occupied) {
    return `
      <span
        class="mac-seat ${occupied ? `mac-seat-${cabinClass}` : "mac-seat-empty"}"
        aria-hidden="true"
      ></span>
    `;
  }

  function renderCabinSection(cabinClass) {
    const seatCount = safeInteger(draft[cabinClass].seats);
    if (seatCount <= 0) return "";

    const layout = draft.seatLayout;
    const seatsPerRow = layout.reduce(
      (total, groupSize) => total + groupSize,
      0
    );
    const rowCount = Math.ceil(seatCount / seatsPerRow);
    let renderedSeats = 0;
    let rows = "";

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      let rowHtml = "";

      layout.forEach((groupSize, groupIndex) => {
        for (let seatIndex = 0; seatIndex < groupSize; seatIndex += 1) {
          const occupied = renderedSeats < seatCount;
          rowHtml += renderSeat(cabinClass, occupied);
          renderedSeats += 1;
        }

        if (groupIndex < layout.length - 1) {
          rowHtml += '<span class="mac-aisle" aria-hidden="true"></span>';
        }
      });

      rows += `<div class="mac-seat-row">${rowHtml}</div>`;
    }

    return `
      <section class="mac-seat-section">
        <div class="mac-seat-section-label">${cabinClass}</div>
        ${rows}
      </section>
    `;
  }

  function renderMap() {
    const map = byId("macCabinMap");
    if (!map) return;

    const seatsPerRow = draft.seatLayout.reduce(
      (total, groupSize) => total + groupSize,
      0
    );

    map.innerHTML = `
      <div
        class="mac-airframe mac-airframe-layout-${seatsPerRow}"
      >
        <div class="mac-airframe-position mac-airframe-position-nose">
          NOSE
        </div>

        ${renderCabinSection("F")}
        ${renderCabinSection("C")}
        ${renderCabinSection("Y")}

        <div class="mac-airframe-position mac-airframe-position-tail">
          TAIL
        </div>
      </div>
    `;
  }

  function renderStatus() {
  const status = byId("macCabinStatus");
  const applyButton = byId("macCabinApply");

  if (!status || !applyButton) return;

  const validation =
    validateDraft();

  const factoryDefault =
    isFactoryDefault();

  const quote =
    validation.valid
      ? calculateCabinReconfigurationQuote()
      : null;

  status.classList.toggle(
    "is-invalid",
    !validation.valid
  );

  status.classList.toggle(
    "is-factory-default",
    factoryDefault
  );

  status.innerHTML = `
    <div>
      ${validation.message}
    </div>

    ${validation.valid ? `
      <small>
        ${
          factoryDefault
            ? "FACTORY DEFAULT CABIN CONFIGURATION"
            : "CUSTOM CABIN CONFIGURATION"
        }
      </small>

      <div
        style="
          margin-top:14px;
          padding:12px 14px;
          border:1px solid rgba(99,207,255,.28);
          border-radius:8px;
          background:rgba(8,35,55,.55);
        "
      >
        <div
          style="
            margin-bottom:9px;
            color:#63cfff;
            font-weight:800;
            letter-spacing:.08em;
          "
        >
          CABIN RECONFIGURATION
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:16px;
            margin:5px 0;
          "
        >
          <span>Estimated Downtime</span>
          <strong>
            ${formatCabinDuration(
              quote?.durationHours || 0
            )}
          </strong>
        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:16px;
            margin:5px 0;
          "
        >
          <span>
            Estimated Cost
            ${
              quote?.simYear
                ? ` (${quote.simYear})`
                : ""
            }
          </span>

          <strong
            style="color:#ffb300;"
          >
            ${formatCabinMoney(
              quote?.historicalCost
            )}
          </strong>
        </div>
      </div>
    ` : ""}
  `;

  applyButton.disabled =
    !validation.valid;
}
   
  function render() {
    if (!activeAircraft || !draft) return;

    renderControls();
    renderMap();
    renderStatus();
  }

  function close() {
    const modal = byId("myAircraftCabinModal");
    if (!modal) return;

    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  function open(aircraft) {
    if (!aircraft) return;

    activeAircraft = aircraft;

    const key = aircraftStateKey(aircraft);
const savedState = cabinStateByAircraft.get(key);

const railwayState =
  aircraft?.y_product ||
  aircraft?.c_product ||
  aircraft?.f_product
    ? {
        seatLayout:
          Array.isArray(aircraft?.seat_layout)
            ? aircraft.seat_layout
            : [...allowedLayouts(aircraft)[0]],

        Y: {
          product:
            aircraft?.y_product ||
            "Y_SMART",

          seats:
            safeInteger(
              aircraft?.y_seats,
              aircraftCapacity(aircraft)
            )
        },

        C: {
          product:
            aircraft?.c_product ||
            "C_SMART",

          seats:
            safeInteger(
              aircraft?.c_seats,
              0
            )
        },

        F: {
          product:
            aircraft?.f_product ||
            "F_SILVER",

          seats:
            safeInteger(
              aircraft?.f_seats,
              0
            )
        },

        configurationType:
          String(
            aircraft?.cabin_configuration_source || ""
          )
            .toUpperCase()
            .includes("FACTORY")
              ? "FACTORY_DEFAULT"
              : "CUSTOM"
      }
    : null;

draft = normalizeDraftShape(
  aircraft,
  savedState ||
  railwayState ||
  makeFactoryDefault(aircraft)
);

    normalizeDraftCapacity();

    const title = byId("macCabinTitle");
    const subtitle = byId("macCabinSubtitle");
    const modal = byId("myAircraftCabinModal");

    if (title) title.textContent = aircraftName(aircraft);

    if (subtitle) {
      subtitle.textContent = "Factory Default or Custom Configuration";
    }

    render();

    if (modal) {
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
    }
  }

  async function applyConfiguration() {
  if (!activeAircraft || !draft) return;

  const validation =
    validateDraft();

  if (!validation.valid) return;

  const aircraftId =
    Number(
      activeAircraft?.id ||
      activeAircraft?.aircraft_id
    );

  if (
    !Number.isInteger(aircraftId) ||
    aircraftId <= 0
  ) {
    console.error(
      "MY AIRCRAFT CABIN: invalid aircraft id",
      activeAircraft
    );

    return;
  }

  draft.configurationType =
    isFactoryDefault()
      ? "FACTORY_DEFAULT"
      : "CUSTOM";

  const applyButton =
    byId("macCabinApply");

  if (applyButton) {
    applyButton.disabled = true;
    applyButton.textContent =
      "STARTING...";
  }

  try {
    const response =
      await fetch(
        `https://api.aviationcapitalsim.com/v1/aircraft/fleet/${aircraftId}/cabin-maintenance/start`,
        {
          method: "POST",

          credentials:
            "include",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              Y: {
                product:
                  draft.Y.product,

                seats:
                  draft.Y.seats
              },

              C: {
                product:
                  draft.C.product,

                seats:
                  draft.C.seats
              },

              F: {
                product:
                  draft.F.product,

                seats:
                  draft.F.seats
              }
            })
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data?.ok
    ) {
      const error =
        new Error(
          data?.error ||
          "CABIN_MAINTENANCE_START_FAILED"
        );

      error.details =
        data?.details ||
        null;

      error.capital =
        data?.capital;

      error.required =
        data?.required;

      throw error;
    }

    /*
      IMPORTANT:

      Do NOT write draft Y/C/F into activeAircraft here.

      The requested configuration lives in
      aircraft_cabin_maintenance while work is active.

      aircraft_fleet keeps the CURRENT installed cabin
      until acs_complete_due_cabin_maintenance()
      completes the work.
    */

    if (data?.aircraft) {
      activeAircraft.status =
        data.aircraft.status ??
        activeAircraft.status;

      activeAircraft.operational_status =
        data.aircraft.operational_status ??
        activeAircraft.operational_status;

      activeAircraft.maintenance_status =
        data.aircraft.maintenance_status ??
        activeAircraft.maintenance_status;
    }

    /*
      Remove any page-session preview authority.

      Reopening Cabin Configuration must continue
      showing the actually installed Railway cabin,
      not the future requested configuration.
    */

    const key =
      aircraftStateKey(
        activeAircraft
      );

    cabinStateByAircraft.delete(
  key
);

close();

if (
  typeof window.ACS_refreshMyAircraftFleet ===
  "function"
) {
  await window.ACS_refreshMyAircraftFleet();
}

  } catch (error) {
    console.error(
      "MY AIRCRAFT CABIN MAINTENANCE START FAILED:",
      error
    );

    const status =
      byId("macCabinStatus");

    if (status) {
      status.classList.add(
        "is-invalid"
      );

      let message =
        String(
          error?.message ||
          "CABIN_MAINTENANCE_START_FAILED"
        );

      if (
        message ===
        "INSUFFICIENT_CAPITAL_FOR_CABIN_MAINTENANCE"
      ) {
        const capital =
          Number(
            error?.capital || 0
          );

        const required =
          Number(
            error?.required || 0
          );

        message =
          `Insufficient capital. Available ${formatCabinMoney(
            capital
          )} — Required ${formatCabinMoney(
            required
          )}.`;
      }

      status.innerHTML = `
        <div>
          Cabin reconfiguration could not be started.
        </div>

        <small>
          ${message}
        </small>
      `;
    }

  } finally {
    if (applyButton) {
      applyButton.disabled =
        false;

      applyButton.textContent =
        "APPLY CONFIGURATION";
    }
  }
}
   
  function resetFactoryDefault() {
    if (!activeAircraft) return;

    draft = makeFactoryDefault(activeAircraft);
    render();
  }

  function selectLayout(layoutValue) {
    const requestedLayout = String(layoutValue || "")
      .split("-")
      .map(value => safeInteger(value))
      .filter(value => value > 0);

    draft.seatLayout = ensureAllowedLayout(
      activeAircraft,
      requestedLayout
    );

    render();
  }
function changeSeatCount(cabinClass, requestedSeats) {
  if (!CABIN_CLASSES.includes(cabinClass)) return;

  const previousDraft = clone(draft);

  draft[cabinClass].seats = clampSeats(
    cabinClass,
    requestedSeats
  );

  /*
    C / F automatically consume or release Economy space.

    Manual Economy changes remain player-controlled.
  */

  if (cabinClass !== "Y") {
    if (!fitEconomyToCabin(previousDraft)) {
      draft = previousDraft;
      render();
      return;
    }
  }

  draft.configurationType = "CUSTOM";
  render();
}

function changeProduct(cabinClass, productCode) {
  if (!CABIN_CLASSES.includes(cabinClass)) return;

  const product = getProduct(
    cabinClass,
    productCode
  );

  if (!product) return;

  const previousDraft = clone(draft);

  draft[cabinClass].product =
    product.code;

  /*
    Any product change may alter the cabin-space factor.

    Preserve the selected C/F seat count and rebalance Economy,
    exactly as Buy New does.
  */

  if (!fitEconomyToCabin(previousDraft)) {
    draft = previousDraft;
    render();
    return;
  }

  draft.configurationType = "CUSTOM";
  render();
}

  document.addEventListener("click", event => {
    const layoutButton = event.target.closest("[data-mac-layout]");

    if (layoutButton && draft) {
      selectLayout(layoutButton.dataset.macLayout);
      return;
    }

    const stepButton = event.target.closest("[data-mac-step]");

    if (stepButton && draft) {
      const cabinClass = stepButton.dataset.macStep;
      const delta = Number(stepButton.dataset.macDelta || 0);

      changeSeatCount(
        cabinClass,
        safeInteger(draft[cabinClass]?.seats) + delta
      );
    }
  });

  document.addEventListener("change", event => {
    const productClass = event.target.dataset.macProduct;

    if (productClass && draft) {
      changeProduct(productClass, event.target.value);
      return;
    }

    const seatsClass = event.target.dataset.macSeats;

    if (seatsClass && draft) {
      changeSeatCount(seatsClass, event.target.value);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    const modal = byId("myAircraftCabinModal");

    if (modal?.getAttribute("aria-hidden") === "false") {
      close();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    installVisualCorrections();

    byId("macCabinCloseX")?.addEventListener("click", close);
    byId("macCabinClose")?.addEventListener("click", close);
    byId("macCabinFactoryDefault")?.addEventListener(
      "click",
      resetFactoryDefault
    );
    byId("macCabinApply")?.addEventListener(
      "click",
      applyConfiguration
    );

    byId("myAircraftCabinModal")?.addEventListener("click", event => {
      if (event.target.id === "myAircraftCabinModal") close();
    });
  });

  window.ACS_MY_AIRCRAFT_CABIN = Object.freeze({
    version: "MY_AIRCRAFT_CABIN_GLOBAL_V1",
    open,
    close
  });
})();

/* ============================================================
   MY AIRCRAFT —  CABIN CONFIGURATION
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
    const availableSpace = Math.max(
      0,
      capacity - spaceUsedExcluding(cabinClass)
    );
    const factor = productFactor(
      cabinClass,
      draft[cabinClass].product
    );

    return Math.max(0, Math.floor(availableSpace / factor));
  }

  function clampSeats(cabinClass, requestedSeats) {
    return Math.min(
      maximumSeatsForClass(cabinClass),
      Math.max(0, safeInteger(requestedSeats))
    );
  }

  function normalizeDraftCapacity() {
    for (const cabinClass of ["F", "C", "Y"]) {
      draft[cabinClass].seats = clampSeats(
        cabinClass,
        draft[cabinClass].seats
      );
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

    map.innerHTML = `
      <div class="mac-airframe">
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

    const validation = validateDraft();
    const factoryDefault = isFactoryDefault();

    status.classList.toggle("is-invalid", !validation.valid);
    status.classList.toggle("is-factory-default", factoryDefault);

    status.innerHTML = `
      <div>${validation.message}</div>
      ${validation.valid ? `
        <small>
          ${factoryDefault
            ? "FACTORY DEFAULT CABIN CONFIGURATION"
            : "CUSTOM CABIN CONFIGURATION"}
        </small>
      ` : ""}
    `;

    applyButton.disabled = !validation.valid;
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

    draft = normalizeDraftShape(
      aircraft,
      savedState || makeFactoryDefault(aircraft)
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

  function applyConfiguration() {
    if (!activeAircraft || !draft) return;

    const validation = validateDraft();
    if (!validation.valid) return;

    const key = aircraftStateKey(activeAircraft);

    draft.configurationType = isFactoryDefault()
      ? "FACTORY_DEFAULT"
      : "CUSTOM";

    cabinStateByAircraft.set(key, clone(draft));
    close();
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

    draft[cabinClass].seats = clampSeats(
      cabinClass,
      requestedSeats
    );

    draft.configurationType = "CUSTOM";
    render();
  }

  function changeProduct(cabinClass, productCode) {
    if (!CABIN_CLASSES.includes(cabinClass)) return;

    const product = getProduct(cabinClass, productCode);
    if (!product) return;

    draft[cabinClass].product = product.code;

    /*
      Recalculate against the complete space available to this class.
      This makes product changes reversible:
      Smart -> Classic reduces seats;
      Classic -> Smart restores all seats that fit again.
    */
    draft[cabinClass].seats = maximumSeatsForClass(cabinClass);
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

/* ============================================================
   MY AIRCRAFT — CABIN CONFIGURATION
   Frontend preview state only
   ============================================================ */

(() => {
  "use strict";

  const cabinStateByAircraft = new Map();

  const PRODUCTS = Object.freeze({
    Y: Object.freeze([
      ["Y_SMART", "Economy Smart", 1],
      ["Y_CLASSIC", "Economy Classic", 1.25],
      ["Y_COMFORT", "Economy Comfort", 1.5],
      ["Y_PLUS", "Economy Plus", 1.75]
    ]),
    C: Object.freeze([
      ["C_SMART", "Business Smart", 2],
      ["C_EXECUTIVE", "Business Executive", 2.5],
      ["C_PREMIER", "Business Premier", 3],
      ["C_SUPERIOR", "Business Superior", 3.5]
    ]),
    F: Object.freeze([
      ["F_SILVER", "First Silver", 4],
      ["F_GOLD", "First Gold", 4.5],
      ["F_PLATINUM", "First Platinum", 5],
      ["F_DIAMOND", "First Diamond", 6]
    ])
  });

  let activeAircraft = null;
  let draft = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function safeInteger(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) return fallback;

    return Math.max(0, Math.trunc(number));
  }

  function aircraftCapacity(aircraft) {
    return safeInteger(
      aircraft?.seats ??
      aircraft?.capacity ??
      aircraft?.passenger_capacity,
      0
    );
  }

  function aircraftName(aircraft) {
    return String(
      aircraft?.catalog_aircraft_name ||
      aircraft?.aircraft_name ||
      aircraft?.model ||
      "Aircraft"
    );
  }

  function normalizeCategory(aircraft) {
    const raw = String(
      aircraft?.aircraft_size ||
      aircraft?.size_category ||
      aircraft?.aircraft_category ||
      aircraft?.category ||
      ""
    )
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

    if (
      raw.includes("EXTRA_LARGE") ||
      raw.includes("WIDEBODY") ||
      raw.includes("WIDE_BODY")
    ) {
      return "EXTRA LARGE";
    }

    if (raw.includes("LARGE")) return "LARGE";
    if (raw.includes("MEDIUM")) return "MEDIUM";
    if (raw.includes("SMALL")) return "SMALL";

    const capacity = aircraftCapacity(aircraft);

    if (capacity > 250) return "EXTRA LARGE";
    if (capacity > 100) return "LARGE";
    if (capacity > 40) return "MEDIUM";

    return "SMALL";
  }

  function allowedLayouts(aircraft) {
    const category = normalizeCategory(aircraft);

    if (category === "EXTRA LARGE") {
      return [[3, 3], [3, 4, 3]];
    }

    if (category === "LARGE") {
      return [[2, 2], [3, 3]];
    }

    return [[2, 2]];
  }

  function cloneDraft(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeFactoryDefault(aircraft) {
    return {
      seatLayout: [...allowedLayouts(aircraft)[0]],
      Y: {
        product: "Y_SMART",
        seats: aircraftCapacity(aircraft)
      },
      C: {
        product: "C_SMART",
        seats: 0
      },
      F: {
        product: "F_SILVER",
        seats: 0
      }
    };
  }

  function getProduct(cabinClass, productCode) {
    return PRODUCTS[cabinClass].find(
      product => product[0] === productCode
    );
  }

  function validateDraft() {
    const capacity = aircraftCapacity(activeAircraft);
    let installedSeats = 0;
    let usedSpace = 0;

    for (const cabinClass of ["Y", "C", "F"]) {
      const selection = draft[cabinClass];
      const seats = safeInteger(selection.seats);
      const product = getProduct(
        cabinClass,
        selection.product
      );

      installedSeats += seats;
      usedSpace += seats * (product?.[2] || 0);
    }

    if (capacity <= 0) {
      return {
        valid: false,
        installedSeats,
        message: "Aircraft passenger capacity is unavailable."
      };
    }

    if (installedSeats <= 0) {
      return {
        valid: false,
        installedSeats,
        message: "Configure at least one passenger seat."
      };
    }

    if (usedSpace > capacity) {
      return {
        valid: false,
        installedSeats,
        message: "This cabin configuration exceeds aircraft capacity."
      };
    }

    return {
      valid: true,
      installedSeats,
      message: `${installedSeats} passenger seats configured.`
    };
  }

  function renderLayoutSelector() {
    const layouts = allowedLayouts(activeAircraft);
    const category = normalizeCategory(activeAircraft);

    return `
      <section class="mac-layout-selector">
        <div class="mac-layout-heading">
          <span class="mac-layout-title">SEAT LAYOUT</span>
          <small class="mac-layout-category">${category}</small>
        </div>

        <div class="mac-layout-options">
          ${layouts.map(layout => {
            const value = layout.join("-");
            const selected =
              value === draft.seatLayout.join("-");

            return `
              <button
                type="button"
                class="mac-layout-option ${
                  selected ? "is-selected" : ""
                }"
                data-mac-layout="${value}"
                aria-pressed="${selected}"
              >
                ${value}
              </button>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function getMaximumSeatsForClass(cabinClass) {
  const capacity = aircraftCapacity(activeAircraft);
  const currentProduct = getProduct(
    cabinClass,
    draft[cabinClass].product
  );

  const currentFactor = Number(currentProduct?.[2] || 1);

  let spaceUsedByOtherClasses = 0;

  for (const otherClass of ["Y", "C", "F"]) {
    if (otherClass === cabinClass) continue;

    const selection = draft[otherClass];
    const product = getProduct(
      otherClass,
      selection.product
    );

    const factor = Number(product?.[2] || 1);

    spaceUsedByOtherClasses +=
      safeInteger(selection.seats) * factor;
  }

  const availableSpace = Math.max(
    0,
    capacity - spaceUsedByOtherClasses
  );

  return Math.max(
    0,
    Math.floor(availableSpace / currentFactor)
  );
}

function clampClassSeats(cabinClass, requestedSeats) {
  const maximumSeats =
    getMaximumSeatsForClass(cabinClass);

  return Math.min(
    maximumSeats,
    Math.max(0, safeInteger(requestedSeats))
  );
}

function normalizeDraftCapacity() {
  for (const cabinClass of ["F", "C", "Y"]) {
    draft[cabinClass].seats =
      clampClassSeats(
        cabinClass,
        draft[cabinClass].seats
      );
  }
}
   
  function renderClassControl(cabinClass, title) {
  const selection = draft[cabinClass];
  const currentSeats = safeInteger(selection.seats);
  const maximumSeats =
    getMaximumSeatsForClass(cabinClass);

  return `
    <section class="mac-cabin-class">
      <div class="mac-cabin-class-heading">
        <span class="mac-cabin-class-title">${title}</span>

        <span class="mac-seat-total">
          ${currentSeats} seats
        </span>
      </div>

      <select data-mac-product="${cabinClass}">
        ${PRODUCTS[cabinClass].map(product => `
          <option
            value="${product[0]}"
            ${selection.product === product[0] ? "selected" : ""}
          >
            ${product[1]}
          </option>
        `).join("")}
      </select>

      <div class="mac-seat-stepper">
        <button
          type="button"
          data-mac-step="${cabinClass}"
          data-mac-delta="-1"
          ${currentSeats <= 0 ? "disabled" : ""}
        >
          −
        </button>

        <input
          class="mac-seat-input"
          type="number"
          min="0"
          max="${maximumSeats}"
          step="1"
          value="${currentSeats}"
          data-mac-seats="${cabinClass}"
        >

        <button
          type="button"
          data-mac-step="${cabinClass}"
          data-mac-delta="1"
          ${
            currentSeats >= maximumSeats
              ? "disabled"
              : ""
          }
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
      <span class="mac-seat ${
        occupied
          ? `mac-seat-${cabinClass}`
          : "mac-seat-empty"
      }"></span>
    `;
  }

  function renderCabinSection(cabinClass) {
    const seatCount = safeInteger(
      draft[cabinClass].seats
    );

    if (seatCount <= 0) return "";

    const layout = draft.seatLayout;
    const seatsPerRow = layout.reduce(
      (total, group) => total + group,
      0
    );

    const rowCount = Math.ceil(
      seatCount / seatsPerRow
    );

    let renderedSeats = 0;
    let rows = "";

    for (let row = 0; row < rowCount; row += 1) {
      let rowHtml = "";

      layout.forEach((groupSize, groupIndex) => {
        for (
          let seatIndex = 0;
          seatIndex < groupSize;
          seatIndex += 1
        ) {
          const occupied = renderedSeats < seatCount;

          rowHtml += renderSeat(
            cabinClass,
            occupied
          );

          renderedSeats += 1;
        }

        if (groupIndex < layout.length - 1) {
          rowHtml += `<span class="mac-aisle"></span>`;
        }
      });

      rows += `<div class="mac-seat-row">${rowHtml}</div>`;
    }

    return `
      <section class="mac-seat-section">
        <div class="mac-seat-section-label">
          ${cabinClass}
        </div>
        ${rows}
      </section>
    `;
  }

  function renderMap() {
    const map = byId("macCabinMap");
    if (!map) return;

    map.innerHTML = `
      <div class="mac-airframe">
        ${renderCabinSection("F")}
        ${renderCabinSection("C")}
        ${renderCabinSection("Y")}
      </div>
    `;
  }

  function renderStatus() {
    const status = byId("macCabinStatus");
    const applyButton = byId("macCabinApply");

    if (!status || !applyButton) return;

    const validation = validateDraft();

    status.textContent = validation.message;
    status.classList.toggle(
      "is-invalid",
      !validation.valid
    );

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

    const key = String(
      aircraft.id ||
      aircraft.registration ||
      aircraftName(aircraft)
    );

    draft = cloneDraft(
      cabinStateByAircraft.get(key) ||
      makeFactoryDefault(aircraft)
    );

    normalizeDraftCapacity();
     
    const title = byId("macCabinTitle");
    const subtitle = byId("macCabinSubtitle");
    const modal = byId("myAircraftCabinModal");

    if (title) {
      title.textContent = aircraftName(aircraft);
    }

    if (subtitle) {
      subtitle.textContent =
        `${aircraft.registration || "—"} · ` +
        `${aircraftCapacity(aircraft)} passenger seats`;
    }

    render();

    if (modal) {
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function applyPreview() {
    if (!activeAircraft || !draft) return;

    const validation = validateDraft();
    if (!validation.valid) return;

    const key = String(
      activeAircraft.id ||
      activeAircraft.registration ||
      aircraftName(activeAircraft)
    );

    cabinStateByAircraft.set(
      key,
      cloneDraft(draft)
    );

    close();
  }

  document.addEventListener("click", event => {
    const layoutButton =
      event.target.closest("[data-mac-layout]");

    if (layoutButton) {
      draft.seatLayout =
        layoutButton.dataset.macLayout
          .split("-")
          .map(Number);

      render();
      return;
    }

    const stepButton =
      event.target.closest("[data-mac-step]");

    if (stepButton) {
      const cabinClass =
        stepButton.dataset.macStep;

      const delta = Number(
        stepButton.dataset.macDelta
      );

      draft[cabinClass].seats =
      clampClassSeats(
      cabinClass,
      safeInteger(draft[cabinClass].seats) +
      delta
  );

      render();
    }
  });

  document.addEventListener("change", event => {
    const productClass =
      event.target.dataset.macProduct;

    if (productClass) {
  draft[productClass].product =
    event.target.value;

  draft[productClass].seats =
    clampClassSeats(
      productClass,
      draft[productClass].seats
    );

  render();
  return;
}

    const seatsClass =
      event.target.dataset.macSeats;

    if (seatsClass) {
  draft[seatsClass].seats =
    clampClassSeats(
      seatsClass,
      event.target.value
    );

  render();
}
  });

  document.addEventListener("DOMContentLoaded", () => {
    byId("macCabinCloseX")?.addEventListener(
      "click",
      close
    );

    byId("macCabinClose")?.addEventListener(
      "click",
      close
    );

    byId("macCabinFactoryDefault")?.addEventListener(
      "click",
      () => {
        if (!activeAircraft) return;

        draft = makeFactoryDefault(
          activeAircraft
        );

        render();
      }
    );

    byId("macCabinApply")?.addEventListener(
      "click",
      applyPreview
    );

    byId("myAircraftCabinModal")?.addEventListener(
      "click",
      event => {
        if (
          event.target.id ===
          "myAircraftCabinModal"
        ) {
          close();
        }
      }
    );
  });

  window.ACS_MY_AIRCRAFT_CABIN = Object.freeze({
    open,
    close
  });
})();

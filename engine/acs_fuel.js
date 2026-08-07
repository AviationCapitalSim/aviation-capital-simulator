"use strict";

/* ============================================================
   ACS OCC — FUEL CENTER v2.0

   No future prices.
   Everything stops at the current ACS year.
   Railway connection will be added later.
   ============================================================ */

(function fuelCenterModule() {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const FIRST_YEAR = 1940;

  const elements = {};
  const state = {
    currentYear: FIRST_YEAR,
    selectedFuelId: null,
    fuels: []
  };

  /*
   * ACS historical market base.
   * This internal series allows Fuel Center to work now.
   * Railway will later return the final official dataset.
   */
  const MARKET_ANCHORS = [
    [1940, 0.18],
    [1942, 0.19],
    [1945, 0.21],
    [1948, 0.24],
    [1950, 0.27],
    [1954, 0.29],
    [1958, 0.30],
    [1963, 0.31],
    [1968, 0.34],
    [1972, 0.36],
    [1974, 0.53],
    [1976, 0.59],
    [1979, 0.86],
    [1981, 1.35],
    [1985, 1.20],
    [1986, 0.93],
    [1990, 1.22],
    [1994, 1.18],
    [1998, 1.07],
    [2000, 1.51],
    [2004, 1.88],
    [2008, 3.30],
    [2009, 2.40],
    [2012, 3.62],
    [2016, 2.14],
    [2019, 2.69],
    [2020, 2.17],
    [2021, 3.01],
    [2022, 4.90],
    [2023, 3.78],
    [2024, 3.45],
    [2025, 3.38],
    [2026, 3.42]
  ];

  const FUEL_DEFINITIONS = [
    {
      id: "avgas-80-87",
      name: "AVGAS 80/87",
      family: "Aviation Gasoline",
      engineType: "Piston",
      grade: "80/87",
      identification: "Red",
      introduced: 1940,
      marketStatus: "Active",
      unit: "USD / US GAL",
      specification: "Historical AVGAS Grade",
      factor: 0.96,
      offset: 0.010
    },
    {
      id: "avgas-91-96",
      name: "AVGAS 91/96",
      family: "Aviation Gasoline",
      engineType: "Piston",
      grade: "91/96",
      identification: "Blue",
      introduced: 1940,
      marketStatus: "Active",
      unit: "USD / US GAL",
      specification: "Historical AVGAS Grade",
      factor: 1.00,
      offset: 0.015
    },
    {
      id: "avgas-100-130",
      name: "AVGAS 100/130",
      family: "Aviation Gasoline",
      engineType: "Piston",
      grade: "100/130",
      identification: "Green",
      introduced: 1940,
      marketStatus: "Active",
      unit: "USD / US GAL",
      specification: "ASTM D910 Family",
      factor: 1.06,
      offset: 0.020
    },
    {
      id: "avgas-115-145",
      name: "AVGAS 115/145",
      family: "Aviation Gasoline",
      engineType: "High-output Piston",
      grade: "115/145",
      identification: "Purple",
      introduced: 1940,
      marketStatus: "Active",
      unit: "USD / US GAL",
      specification: "Historical Military Grade",
      factor: 1.16,
      offset: 0.025
    },
    {
      id: "jet-a1",
      name: "JET A-1",
      family: "Kerosene Jet Fuel",
      engineType: "Turbine",
      grade: "JET A-1",
      identification: "Straw / Clear",
      introduced: 1951,
      marketStatus: "Active",
      unit: "USD / US GAL",
      specification: "DEF STAN 91-091",
      factor: 0.89,
      offset: 0.008
    },
    {
      id: "jet-a",
      name: "JET A",
      family: "Kerosene Jet Fuel",
      engineType: "Turbine",
      grade: "JET A",
      identification: "Straw / Clear",
      introduced: 1956,
      marketStatus: "Active",
      unit: "USD / US GAL",
      specification: "ASTM D1655",
      factor: 0.91,
      offset: 0.008
    }
  ];

  function cacheElements() {
    const elementIds = [
      "fuelCardGrid",
      "fuelEmptyMessage",
      "fuelWorkspace",
      "selectedFuelName",
      "selectedFuelPrice",
      "selectedFuelChange",
      "informationFuelName",
      "fuelFamily",
      "fuelEngineType",
      "fuelGrade",
      "fuelIdentification",
      "fuelIntroduced",
      "fuelMarketStatus",
      "fuelMarketUnit",
      "fuelSpecification",
      "fuelPriceRecordList",
      "fuelChartShell",
      "fuelChartTooltip",
      "fuelPriceGrid",
      "fuelPriceArea",
      "fuelPriceLine",
      "fuelMovementBars",
      "fuelChartAxes",
      "fuelChartPoints",
      "logoutButton",
      "acs-clock"
    ];

    elementIds.forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function clampYear(year) {
    const lastAvailableYear =
      MARKET_ANCHORS[MARKET_ANCHORS.length - 1][0];

    return Math.max(
      FIRST_YEAR,
      Math.min(
        Number(year) || FIRST_YEAR,
        lastAvailableYear
      )
    );
  }

  function getYearFromClock() {
    const clock = elements["acs-clock"];

    if (!clock) {
      return FIRST_YEAR;
    }

    const years = clock.textContent.match(
      /\b(19\d{2}|20\d{2})\b/g
    );

    if (!years || !years.length) {
      return FIRST_YEAR;
    }

    return clampYear(
      years[years.length - 1]
    );
  }

  function interpolateMarketPrice(year) {
    if (year <= MARKET_ANCHORS[0][0]) {
      return MARKET_ANCHORS[0][1];
    }

    for (
      let index = 1;
      index < MARKET_ANCHORS.length;
      index += 1
    ) {
      const previous = MARKET_ANCHORS[index - 1];
      const next = MARKET_ANCHORS[index];

      if (year <= next[0]) {
        const progress =
          (year - previous[0]) /
          (next[0] - previous[0]);

        return previous[1] +
          ((next[1] - previous[1]) * progress);
      }
    }

    return MARKET_ANCHORS[
      MARKET_ANCHORS.length - 1
    ][1];
  }

  function deterministicTexture(
    year,
    fuelIndex
  ) {
    const wave = Math.sin(
      (year * 1.73) +
      (fuelIndex * 2.4)
    );

    return wave * 0.012;
  }

  function buildFuelSeries(
    fuel,
    fuelIndex,
    throughYear
  ) {
    const records = [];

    const firstYear = Math.max(
      FIRST_YEAR,
      fuel.introduced
    );

    for (
      let year = firstYear;
      year <= throughYear;
      year += 1
    ) {
      const basePrice =
        interpolateMarketPrice(year);

      const price =
        (basePrice * fuel.factor) +
        fuel.offset +
        deterministicTexture(
          year,
          fuelIndex
        );

      records.push({
        year,
        price: Math.max(
          0.01,
          Number(price.toFixed(3))
        )
      });
    }

    return records;
  }

  function createVisibleFuels(year) {
    return FUEL_DEFINITIONS
      .filter((fuel) => {
        return fuel.introduced <= year;
      })
      .map((fuel, index) => {
        return {
          ...fuel,
          series: buildFuelSeries(
            fuel,
            index,
            year
          )
        };
      });
  }

  function getMovement(
    series,
    index
  ) {
    if (
      index <= 0 ||
      !series[index - 1] ||
      series[index - 1].price === 0
    ) {
      return {
        amount: 0,
        percent: 0
      };
    }

    const amount =
      series[index].price -
      series[index - 1].price;

    return {
      amount,
      percent:
        (amount /
          series[index - 1].price) *
        100
    };
  }

  function movementClass(percent) {
    if (percent < -3) {
      return "decrease";
    }

    if (percent > 10) {
      return "critical";
    }

    if (percent > 3) {
      return "attention";
    }

    return "neutral";
  }

  function formatPrice(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  function formatPercent(value) {
    const sign = value > 0 ? "+" : "";

    return `${sign}${Number(value).toFixed(1)}%`;
  }

  function createSVGElement(
    name,
    attributes = {},
    text = ""
  ) {
    const element =
      document.createElementNS(
        SVG_NS,
        name
      );

    Object.entries(attributes).forEach(
      ([attribute, value]) => {
        element.setAttribute(
          attribute,
          String(value)
        );
      }
    );

    if (text) {
      element.textContent = text;
    }

    return element;
  }

  function createFuelCard(fuel) {
    const latestIndex =
      fuel.series.length - 1;

    const latest =
      fuel.series[latestIndex];

    const movement =
      getMovement(
        fuel.series,
        latestIndex
      );

    const category =
      movementClass(
        movement.percent
      );

    const card =
      document.createElement("button");

    card.type = "button";
    card.className = "fuel-card";
    card.dataset.fuelId = fuel.id;
    card.setAttribute(
      "aria-pressed",
      "false"
    );

    card.innerHTML = `
      <span class="fuel-card-name"></span>

      <strong class="fuel-card-price"></strong>

      <span class="fuel-card-meta">
        <span class="fuel-change-${category}"></span>
        <span class="fuel-family-label"></span>
      </span>
    `;

    card.querySelector(
      ".fuel-card-name"
    ).textContent = fuel.name;

    card.querySelector(
      ".fuel-card-price"
    ).textContent =
      `${formatPrice(latest.price)} / GAL`;

    card.querySelector(
      `.fuel-change-${category}`
    ).textContent =
      formatPercent(
        movement.percent
      );

    card.querySelector(
      ".fuel-family-label"
    ).textContent =
      fuel.family.toUpperCase();

    card.addEventListener(
      "click",
      () => selectFuel(fuel.id)
    );

    return card;
  }

  function renderCards() {
    elements.fuelCardGrid.replaceChildren();

    state.fuels.forEach((fuel) => {
      elements.fuelCardGrid.appendChild(
        createFuelCard(fuel)
      );
    });

    elements.fuelEmptyMessage.hidden =
      state.fuels.length > 0;

    elements.fuelWorkspace.hidden =
      state.fuels.length === 0;
  }

  function selectFuel(fuelId) {
    const fuel = state.fuels.find(
      (item) => item.id === fuelId
    );

    if (!fuel) {
      return;
    }

    state.selectedFuelId = fuel.id;

    elements.fuelCardGrid
      .querySelectorAll(".fuel-card")
      .forEach((card) => {
        const selected =
          card.dataset.fuelId === fuel.id;

        card.classList.toggle(
          "is-selected",
          selected
        );

        card.setAttribute(
          "aria-pressed",
          String(selected)
        );
      });

    renderInformation(fuel);
    renderPriceRecord(fuel);
    renderChart(fuel);
  }

  function renderInformation(fuel) {
    const latestIndex =
      fuel.series.length - 1;

    const latest =
      fuel.series[latestIndex];

    const movement =
      getMovement(
        fuel.series,
        latestIndex
      );

    const category =
      movementClass(
        movement.percent
      );

    elements.selectedFuelName.textContent =
      `${fuel.name} · THROUGH ${state.currentYear}`;

    elements.informationFuelName.textContent =
      fuel.name;

    elements.selectedFuelPrice.textContent =
      `${formatPrice(latest.price)} / GAL`;

    elements.selectedFuelChange.className =
      `fuel-change-${category}`;

    elements.selectedFuelChange.textContent =
      `${formatPercent(movement.percent)} ANNUAL MOVEMENT`;

    elements.fuelFamily.textContent =
      fuel.family;

    elements.fuelEngineType.textContent =
      fuel.engineType;

    elements.fuelGrade.textContent =
      fuel.grade;

    elements.fuelIdentification.textContent =
      fuel.identification;

    elements.fuelIntroduced.textContent =
      String(fuel.introduced);

    elements.fuelMarketStatus.textContent =
      fuel.marketStatus;

    elements.fuelMarketUnit.textContent =
      fuel.unit;

    elements.fuelSpecification.textContent =
      fuel.specification;
  }

  function renderPriceRecord(fuel) {
    elements.fuelPriceRecordList
      .replaceChildren();

    [...fuel.series]
      .reverse()
      .forEach(
        (record, reverseIndex) => {
          const originalIndex =
            fuel.series.length -
            1 -
            reverseIndex;

          const movement =
            getMovement(
              fuel.series,
              originalIndex
            );

          const row =
            document.createElement("div");

          row.className =
            "fuel-price-record-row";

          row.innerHTML = `
            <span>${record.year}</span>

            <strong>
              ${formatPrice(record.price)}
            </strong>

            <strong
              class="fuel-change-${movementClass(
                movement.percent
              )}"
            >
              ${formatPercent(
                movement.percent
              )}
            </strong>
          `;

          elements.fuelPriceRecordList
            .appendChild(row);
        }
      );
  }

  function showTooltip(
    event,
    record,
    movement
  ) {
    const shellRectangle =
      elements.fuelChartShell
        .getBoundingClientRect();

    elements.fuelChartTooltip.innerHTML = `
      <strong>${record.year}</strong>
      Market Price:
      ${formatPrice(record.price)} / GAL
      <br>
      Market Movement:
      ${formatPercent(movement.percent)}
    `;

    elements.fuelChartTooltip.hidden =
      false;

    const left = Math.min(
      event.clientX -
        shellRectangle.left +
        12,
      shellRectangle.width - 205
    );

    const top = Math.max(
      8,
      event.clientY -
        shellRectangle.top -
        78
    );

    elements.fuelChartTooltip.style.left =
      `${Math.max(8, left)}px`;

    elements.fuelChartTooltip.style.top =
      `${top}px`;
  }

  function hideTooltip() {
    elements.fuelChartTooltip.hidden =
      true;
  }

  function bindChartHover(
    element,
    record,
    movement
  ) {
    element.addEventListener(
      "pointermove",
      (event) => {
        showTooltip(
          event,
          record,
          movement
        );
      }
    );

    element.addEventListener(
      "pointerleave",
      hideTooltip
    );
  }

  function renderChart(fuel) {
    const series = fuel.series;

    const width = 980;
    const left = 70;
    const right = 28;
    const top = 42;
    const priceBottom = 318;
    const movementTop = 382;
    const movementBottom = 478;

    const plotWidth =
      width - left - right;

    const priceValues =
      series.map(
        (record) => record.price
      );

    const minimum =
      Math.min(...priceValues);

    const maximum =
      Math.max(...priceValues);

    const pricePadding =
      Math.max(
        (maximum - minimum) * 0.16,
        0.025
      );

    const minimumPrice =
      Math.max(
        0,
        minimum - pricePadding
      );

    const maximumPrice =
      maximum + pricePadding;

    const priceRange =
      Math.max(
        0.01,
        maximumPrice - minimumPrice
      );

    const movements =
      series.map(
        (record, index) => {
          return getMovement(
            series,
            index
          ).percent;
        }
      );

    const movementLimit =
      Math.max(
        12,
        ...movements.map(
          (value) =>
            Math.abs(value)
        )
      );

    const zeroY =
      (movementTop + movementBottom) / 2;

    function xFor(index) {
      if (series.length === 1) {
        return left + (plotWidth / 2);
      }

      return left +
        (
          index /
          (series.length - 1)
        ) *
        plotWidth;
    }

    function yForPrice(price) {
      return priceBottom -
        (
          (
            price - minimumPrice
          ) /
          priceRange
        ) *
        (
          priceBottom - top
        );
    }

    function yForMovement(percent) {
      return zeroY -
        (
          percent /
          movementLimit
        ) *
        (
          (
            movementBottom -
            movementTop
          ) /
          2
        );
    }

    elements.fuelPriceGrid
      .replaceChildren();

    elements.fuelChartAxes
      .replaceChildren();

    elements.fuelChartPoints
      .replaceChildren();

    elements.fuelMovementBars
      .replaceChildren();

    elements.fuelPriceLine
      .setAttribute("d", "");

    elements.fuelPriceArea
      .setAttribute("d", "");

    elements.fuelChartAxes.appendChild(
      createSVGElement(
        "text",
        {
          x: left,
          y: 20,
          class:
            "fuel-chart-section-label"
        },
        "MARKET PRICE · USD / US GAL"
      )
    );

    elements.fuelChartAxes.appendChild(
      createSVGElement(
        "text",
        {
          x: left,
          y: movementTop - 15,
          class:
            "fuel-chart-section-label"
        },
        "MARKET MOVEMENT · ANNUAL %"
      )
    );

    for (
      let line = 0;
      line <= 4;
      line += 1
    ) {
      const ratio = line / 4;

      const y =
        top +
        ratio *
        (
          priceBottom - top
        );

      const price =
        maximumPrice -
        ratio *
        priceRange;

      elements.fuelPriceGrid.appendChild(
        createSVGElement(
          "line",
          {
            x1: left,
            y1: y,
            x2: width - right,
            y2: y,
            class:
              "fuel-chart-grid-line"
          }
        )
      );

      elements.fuelChartAxes.appendChild(
        createSVGElement(
          "text",
          {
            x: left - 12,
            y: y + 4,
            "text-anchor": "end",
            class:
              "fuel-chart-axis-text"
          },
          `$${price.toFixed(2)}`
        )
      );
    }

    elements.fuelPriceGrid.appendChild(
      createSVGElement(
        "line",
        {
          x1: left,
          y1: zeroY,
          x2: width - right,
          y2: zeroY,
          class:
            "fuel-chart-zero-line"
        }
      )
    );

    elements.fuelChartAxes.appendChild(
      createSVGElement(
        "text",
        {
          x: left - 12,
          y: zeroY + 4,
          "text-anchor": "end",
          class:
            "fuel-chart-axis-text"
        },
        "0%"
      )
    );

    const points =
      series.map(
        (record, index) => {
          return [
            xFor(index),
            yForPrice(record.price)
          ];
        }
      );

    if (points.length) {
      const linePath =
        points
          .map(
            ([x, y], index) => {
              const command =
                index === 0
                  ? "M"
                  : "L";

              return `${command}${x.toFixed(
                2
              )},${y.toFixed(2)}`;
            }
          )
          .join(" ");

      const firstX = points[0][0];

      const lastX =
        points[
          points.length - 1
        ][0];

      elements.fuelPriceLine
        .setAttribute(
          "d",
          linePath
        );

      elements.fuelPriceArea
        .setAttribute(
          "d",
          `${linePath} L${lastX},${priceBottom} L${firstX},${priceBottom} Z`
        );
    }

    const barSlot =
      plotWidth /
      Math.max(
        1,
        series.length
      );

    const barWidth =
      Math.max(
        3,
        Math.min(
          18,
          barSlot * 0.58
        )
      );

    const pointInterval =
      Math.max(
        1,
        Math.ceil(
          series.length / 22
        )
      );

    const labelInterval =
      Math.max(
        1,
        Math.ceil(
          series.length / 8
        )
      );

    series.forEach(
      (record, index) => {
        const movement =
          getMovement(
            series,
            index
          );

        const x =
          xFor(index);

        const movementY =
          yForMovement(
            movement.percent
          );

        const barY =
          Math.min(
            zeroY,
            movementY
          );

        const barHeight =
          Math.max(
            1.5,
            Math.abs(
              movementY - zeroY
            )
          );

        const bar =
          createSVGElement(
            "rect",
            {
              x:
                x -
                (barWidth / 2),
              y: barY,
              width: barWidth,
              height: barHeight,
              rx: 2,
              class:
                `fuel-movement-bar is-${movementClass(
                  movement.percent
                )}`
            }
          );

        bindChartHover(
          bar,
          record,
          movement
        );

        elements.fuelMovementBars
          .appendChild(bar);

        if (
          index % pointInterval === 0 ||
          index === series.length - 1
        ) {
          const point =
            createSVGElement(
              "circle",
              {
                cx: x,
                cy:
                  yForPrice(
                    record.price
                  ),
                r: 4,
                class:
                  "fuel-chart-point"
              }
            );

          bindChartHover(
            point,
            record,
            movement
          );

          elements.fuelChartPoints
            .appendChild(point);
        }

        if (
          index % labelInterval === 0 ||
          index === series.length - 1
        ) {
          elements.fuelChartAxes
            .appendChild(
              createSVGElement(
                "text",
                {
                  x,
                  y: 506,
                  "text-anchor":
                    "middle",
                  class:
                    "fuel-chart-axis-text"
                },
                String(record.year)
              )
            );
        }
      }
    );
  }

  function renderForYear(year) {
    const previousSelection =
      state.selectedFuelId;

    state.currentYear =
      clampYear(year);

    state.fuels =
      createVisibleFuels(
        state.currentYear
      );

    renderCards();

    const selectedStillExists =
      state.fuels.some(
        (fuel) =>
          fuel.id ===
          previousSelection
      );

    const nextFuelId =
      selectedStillExists
        ? previousSelection
        : state.fuels[0]?.id;

    if (nextFuelId) {
      selectFuel(nextFuelId);
    }
  }

  function watchACSClock() {
    const clock =
      elements["acs-clock"];

    if (
      !clock ||
      typeof MutationObserver !==
        "function"
    ) {
      return;
    }

    let lastYear =
      state.currentYear;

    const observer =
      new MutationObserver(
        () => {
          const nextYear =
            getYearFromClock();

          if (
            nextYear !== lastYear
          ) {
            lastYear = nextYear;
            renderForYear(nextYear);
          }
        }
      );

    observer.observe(
      clock,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );
  }

  function handleLogout() {
    alert(
      "👋 Session closed. Your fleet awaits your command!"
    );

    window.location.href =
      "login.html";
  }

  function initializeFuelCenter() {
    cacheElements();

    if (
      !elements.fuelCardGrid ||
      !elements.fuelWorkspace
    ) {
      console.error(
        "ACS FUEL CENTER — Required HTML elements are missing."
      );

      return;
    }

    if (elements.logoutButton) {
      elements.logoutButton
        .addEventListener(
          "click",
          handleLogout
        );
    }

    if (
      typeof window.registerTimeListener ===
        "function" &&
      typeof window.updateClockDisplay ===
        "function"
    ) {
      window.registerTimeListener(
        window.updateClockDisplay
      );

      window.updateClockDisplay();
    }

    renderForYear(
      getYearFromClock()
    );

    watchACSClock();

    window.setTimeout(
      () => {
        renderForYear(
          getYearFromClock()
        );
      },
      800
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeFuelCenter,
      {
        once: true
      }
    );
  } else {
    initializeFuelCenter();
  }
}());

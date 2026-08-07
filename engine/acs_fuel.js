"use strict";

/* ============================================================
   ACS OCC — FUEL CENTER
   ============================================================ */

(function fuelCenterModule() {
  const API_ENDPOINT = "/v1/fuel/market";
  const SVG_NS = "http://www.w3.org/2000/svg";

  const elements = {
    cardGrid: document.getElementById("fuelCardGrid"),
    emptyMessage: document.getElementById("fuelEmptyMessage"),
    workspace: document.getElementById("fuelWorkspace"),

    selectedFuelName:
      document.getElementById("selectedFuelName"),

    informationFuelName:
      document.getElementById("informationFuelName"),

    selectedFuelPrice:
      document.getElementById("selectedFuelPrice"),

    selectedFuelChange:
      document.getElementById("selectedFuelChange"),

    fuelFamily:
      document.getElementById("fuelFamily"),

    fuelEngineType:
      document.getElementById("fuelEngineType"),

    fuelGrade:
      document.getElementById("fuelGrade"),

    fuelIdentification:
      document.getElementById("fuelIdentification"),

    fuelMarketStatus:
      document.getElementById("fuelMarketStatus"),

    fuelMarketUnit:
      document.getElementById("fuelMarketUnit"),

    fuelSpecification:
      document.getElementById("fuelSpecification"),

    priceRecordList:
      document.getElementById("fuelPriceRecordList"),

    chart:
      document.getElementById("fuelChart"),

    chartGrid:
      document.getElementById("fuelPriceGrid"),

    chartAxes:
      document.getElementById("fuelChartAxes"),

    chartPoints:
      document.getElementById("fuelChartPoints"),

    priceArea:
      document.getElementById("fuelPriceArea"),

    priceLine:
      document.getElementById("fuelPriceLine"),

    movementBars:
      document.getElementById("fuelMovementBars"),

    tooltip:
      document.getElementById("fuelChartTooltip"),

    chartShell:
      document.getElementById("fuelChartShell"),

    logoutButton:
      document.getElementById("logoutButton")
  };

  const state = {
    asOf: null,
    fuels: [],
    selectedFuelId: null
  };

  /*
   * Datos iniciales para construir y visualizar Fuel Center.
   * Cuando conectemos Railway, la estructura de la página
   * y de la gráfica no tendrá que cambiar.
   */

  const localFuelMarket = {
    asOf: "1963-07-22",

    fuels: [
      createLocalFuel(
        "avgas-80-87",
        "AVGAS 80/87",
        "80/87",
        "Red",
        [
          0.18,
          0.19,
          0.20,
          0.22,
          0.21,
          0.23,
          0.24,
          0.23,
          0.25,
          0.26,
          0.27,
          0.27
        ]
      ),

      createLocalFuel(
        "avgas-91-96",
        "AVGAS 91/96",
        "91/96",
        "Blue",
        [
          0.20,
          0.21,
          0.22,
          0.24,
          0.23,
          0.25,
          0.26,
          0.25,
          0.27,
          0.29,
          0.30,
          0.29
        ]
      ),

      createLocalFuel(
        "avgas-100-130",
        "AVGAS 100/130",
        "100/130",
        "Green",
        [
          0.22,
          0.23,
          0.24,
          0.25,
          0.24,
          0.26,
          0.27,
          0.29,
          0.28,
          0.30,
          0.30,
          0.31
        ]
      ),

      createLocalFuel(
        "avgas-115-145",
        "AVGAS 115/145",
        "115/145",
        "Purple",
        [
          0.26,
          0.27,
          0.28,
          0.30,
          0.29,
          0.31,
          0.32,
          0.33,
          0.32,
          0.34,
          0.35,
          0.36
        ]
      )
    ]
  };

  function createLocalFuel(
    id,
    name,
    grade,
    identification,
    values
  ) {
    const dates = [
      "1940-01-01",
      "1942-01-01",
      "1944-01-01",
      "1946-01-01",
      "1948-01-01",
      "1950-01-01",
      "1952-01-01",
      "1954-01-01",
      "1956-01-01",
      "1958-01-01",
      "1960-01-01",
      "1963-07-01"
    ];

    return {
      id,
      name,
      family: "Aviation Gasoline",
      engineType: "Piston",
      grade,
      identification,
      marketStatus: "Active",
      unit: "USD / US GAL",
      unitLabel: "USD/GAL",
      specification: "Historical Grade",

      series: dates.map((date, index) => ({
        date,
        price: values[index]
      }))
    };
  }

  /*
   * En Railway este método consultará:
   *
   * GET /v1/fuel/market
   *
   * Mientras el endpoint no exista, Fuel Center utilizará
   * los datos locales definidos arriba.
   */

  async function loadFuelMarket() {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(
          `Fuel market request failed: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.info(
        "ACS Fuel Center is using local market data."
      );

      return localFuelMarket;
    }
  }

  function validateAndNormalizeMarket(payload) {
    if (
      !payload ||
      typeof payload.asOf !== "string" ||
      !Array.isArray(payload.fuels)
    ) {
      throw new Error(
        "Fuel market response has an invalid structure."
      );
    }

    const asOfDate = new Date(
      `${payload.asOf}T23:59:59Z`
    );

    if (Number.isNaN(asOfDate.getTime())) {
      throw new Error(
        "Fuel market response has an invalid date."
      );
    }

    const fuels = payload.fuels
      .filter((fuel) => {
        return (
          fuel &&
          typeof fuel.id === "string" &&
          typeof fuel.name === "string"
        );
      })
      .map((fuel) => {
        return normalizeFuel(fuel, asOfDate);
      })
      .filter((fuel) => {
        return fuel.series.length > 0;
      });

    return {
      asOf: payload.asOf,
      fuels
    };
  }

  function normalizeFuel(fuel, asOfDate) {
    const series = Array.isArray(fuel.series)
      ? fuel.series
          .map((record) => {
            return {
              date: new Date(
                `${record.date}T00:00:00Z`
              ),

              price: Number(record.price)
            };
          })
          .filter((record) => {
            return (
              !Number.isNaN(record.date.getTime()) &&
              Number.isFinite(record.price) &&
              record.price >= 0 &&
              record.date <= asOfDate
            );
          })
          .sort((a, b) => {
            return a.date - b.date;
          })
      : [];

    return {
      id: fuel.id,
      name: fuel.name,

      family:
        fuel.family || "—",

      engineType:
        fuel.engineType || "—",

      grade:
        fuel.grade || "—",

      identification:
        fuel.identification || "—",

      marketStatus:
        fuel.marketStatus || "Active",

      unit:
        fuel.unit || "USD / US GAL",

      unitLabel:
        fuel.unitLabel || "USD/GAL",

      specification:
        fuel.specification || "—",

      series
    };
  }

  function calculateChange(series, index) {
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

    const currentPrice = series[index].price;
    const previousPrice = series[index - 1].price;

    const amount =
      currentPrice - previousPrice;

    const percent =
      (amount / previousPrice) * 100;

    return {
      amount,
      percent
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
    return `$${value.toFixed(2)}`;
  }

  function formatMoneyChange(value) {
    const absoluteValue = Math.abs(value).toFixed(2);

    if (value > 0) {
      return `+$${absoluteValue}`;
    }

    if (value < 0) {
      return `-$${absoluteValue}`;
    }

    return "$0.00";
  }

  function formatPercent(value) {
    const sign = value > 0 ? "+" : "";

    return `${sign}${value.toFixed(1)}%`;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "UTC",
        month: "short",
        year: "numeric"
      }
    )
      .format(date)
      .toUpperCase();
  }

  function createFuelCard(fuel) {
    const latestIndex =
      fuel.series.length - 1;

    const latest =
      fuel.series[latestIndex];

    const change =
      calculateChange(
        fuel.series,
        latestIndex
      );

    const category =
      movementClass(change.percent);

    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "fuel-card";
    button.dataset.fuelId = fuel.id;

    button.setAttribute(
      "aria-pressed",
      "false"
    );

    const name =
      document.createElement("span");

    name.className = "fuel-card-name";
    name.textContent = fuel.name;

    const price =
      document.createElement("strong");

    price.className = "fuel-card-price";

    price.textContent =
      `${formatPrice(latest.price)} / GAL`;

    const meta =
      document.createElement("span");

    meta.className = "fuel-card-meta";

    const changeText =
      document.createElement("span");

    changeText.className =
      `fuel-change-${category}`;

    changeText.textContent =
      formatPercent(change.percent);

    const family =
      document.createElement("span");

    family.textContent =
      fuel.family.toUpperCase();

    meta.append(
      changeText,
      family
    );

    button.append(
      name,
      price,
      meta
    );

    button.addEventListener(
      "click",
      () => {
        selectFuel(fuel.id);
      }
    );

    return button;
  }

  function renderFuelCards() {
    elements.cardGrid.replaceChildren();

    state.fuels.forEach((fuel) => {
      elements.cardGrid.appendChild(
        createFuelCard(fuel)
      );
    });
  }

  function selectFuel(fuelId) {
    const fuel = state.fuels.find(
      (item) => item.id === fuelId
    );

    if (!fuel) {
      return;
    }

    state.selectedFuelId = fuel.id;

    elements.cardGrid
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

    renderFuelInformation(fuel);
    renderPriceRecord(fuel);
    renderChart(fuel);
  }

  function renderFuelInformation(fuel) {
    const latestIndex =
      fuel.series.length - 1;

    const latest =
      fuel.series[latestIndex];

    const change =
      calculateChange(
        fuel.series,
        latestIndex
      );

    const category =
      movementClass(change.percent);

    elements.selectedFuelName.textContent =
      fuel.name;

    elements.informationFuelName.textContent =
      fuel.name;

    elements.selectedFuelPrice.textContent =
      `${formatPrice(latest.price)} / GAL`;

    elements.selectedFuelChange.textContent =
      formatPercent(change.percent);

    elements.selectedFuelChange.className =
      `fuel-change-${category}`;

    elements.fuelFamily.textContent =
      fuel.family;

    elements.fuelEngineType.textContent =
      fuel.engineType;

    elements.fuelGrade.textContent =
      fuel.grade;

    elements.fuelIdentification.textContent =
      fuel.identification;

    elements.fuelMarketStatus.textContent =
      fuel.marketStatus;

    elements.fuelMarketUnit.textContent =
      fuel.unit;

    elements.fuelSpecification.textContent =
      fuel.specification;
  }

  function renderPriceRecord(fuel) {
    const fragment =
      document.createDocumentFragment();

    [...fuel.series]
      .reverse()
      .forEach((record, reversedIndex) => {
        const originalIndex =
          fuel.series.length -
          1 -
          reversedIndex;

        const change =
          calculateChange(
            fuel.series,
            originalIndex
          );

        const row =
          document.createElement("div");

        row.className =
          "fuel-price-record-row";

        const date =
          document.createElement("span");

        date.textContent =
          formatDate(record.date);

        const price =
          document.createElement("strong");

        price.textContent =
          formatPrice(record.price);

        const percent =
          document.createElement("strong");

        percent.className =
          `fuel-change-${movementClass(
            change.percent
          )}`;

        percent.textContent =
          originalIndex === 0
            ? "—"
            : formatPercent(change.percent);

        row.append(
          date,
          price,
          percent
        );

        fragment.appendChild(row);
      });

    elements.priceRecordList.replaceChildren(
      fragment
    );
  }

  function createSvgElement(
    tagName,
    attributes = {}
  ) {
    const element =
      document.createElementNS(
        SVG_NS,
        tagName
      );

    Object.entries(attributes)
      .forEach(([name, value]) => {
        element.setAttribute(
          name,
          String(value)
        );
      });

    return element;
  }

  function renderChart(fuel) {
    const series = fuel.series;

    if (!series.length) {
      return;
    }

    const layout = {
      left: 78,
      right: 950,

      priceTop: 38,
      priceBottom: 294,

      movementTop: 352,
      movementZero: 416,
      movementBottom: 474
    };

    const timestamps =
      series.map((record) => {
        return record.date.getTime();
      });

    const prices =
      series.map((record) => {
        return record.price;
      });

    const changes =
      series.map((record, index) => {
        return calculateChange(
          series,
          index
        ).percent;
      });

    const minTime =
      Math.min(...timestamps);

    const maxTime =
      Math.max(...timestamps);

    const rawMinPrice =
      Math.min(...prices);

    const rawMaxPrice =
      Math.max(...prices);

    const pricePadding = Math.max(
      (rawMaxPrice - rawMinPrice) * 0.18,
      0.02
    );

    const minPrice = Math.max(
      0,
      rawMinPrice - pricePadding
    );

    const maxPrice =
      rawMaxPrice + pricePadding;

    const maxMovement = Math.max(
      10,
      ...changes.map((value) => {
        return Math.abs(value);
      })
    );

    const scaleX = (timestamp) => {
      if (maxTime === minTime) {
        return (
          layout.left +
          layout.right
        ) / 2;
      }

      return (
        layout.left +
        (
          (timestamp - minTime) /
          (maxTime - minTime)
        ) *
        (
          layout.right -
          layout.left
        )
      );
    };

    const scalePriceY = (price) => {
      if (maxPrice === minPrice) {
        return (
          layout.priceTop +
          layout.priceBottom
        ) / 2;
      }

      return (
        layout.priceBottom -
        (
          (price - minPrice) /
          (maxPrice - minPrice)
        ) *
        (
          layout.priceBottom -
          layout.priceTop
        )
      );
    };

    const scaleMovementY = (percent) => {
      if (percent >= 0) {
        return (
          layout.movementZero -
          (percent / maxMovement) *
          (
            layout.movementZero -
            layout.movementTop
          )
        );
      }

      return (
        layout.movementZero +
        (
          Math.abs(percent) /
          maxMovement
        ) *
        (
          layout.movementBottom -
          layout.movementZero
        )
      );
    };

    renderGridAndAxes(
      series,
      layout,
      minPrice,
      maxPrice,
      maxMovement,
      scaleX,
      scalePriceY
    );

    const points =
      series.map((record) => {
        return {
          x: scaleX(
            record.date.getTime()
          ),

          y: scalePriceY(
            record.price
          )
        };
      });

    const linePath = points
      .map((point, index) => {
        const command =
          index === 0 ? "M" : "L";

        return (
          `${command}` +
          `${point.x.toFixed(2)} ` +
          `${point.y.toFixed(2)}`
        );
      })
      .join(" ");

    const finalPoint =
      points[points.length - 1];

    const firstPoint =
      points[0];

    const areaPath =
      `${linePath} ` +
      `L${finalPoint.x.toFixed(2)} ` +
      `${layout.priceBottom} ` +
      `L${firstPoint.x.toFixed(2)} ` +
      `${layout.priceBottom} Z`;

    elements.priceLine.setAttribute(
      "d",
      linePath
    );

    elements.priceArea.setAttribute(
      "d",
      areaPath
    );

    renderMovementBars(
      fuel,
      changes,
      layout,
      scaleX,
      scaleMovementY
    );

    renderChartPoints(
      fuel,
      points
    );
  }

  function renderGridAndAxes(
    series,
    layout,
    minPrice,
    maxPrice,
    maxMovement,
    scaleX,
    scalePriceY
  ) {
    const gridFragment =
      document.createDocumentFragment();

    const axesFragment =
      document.createDocumentFragment();

    const priceTicks = 4;

    for (
      let index = 0;
      index <= priceTicks;
      index += 1
    ) {
      const value =
        minPrice +
        (
          (maxPrice - minPrice) /
          priceTicks
        ) *
        index;

      const y =
        scalePriceY(value);

      gridFragment.appendChild(
        createSvgElement(
          "line",
          {
            class:
              "fuel-chart-grid-line",

            x1:
              layout.left,

            y1:
              y,

            x2:
              layout.right,

            y2:
              y
          }
        )
      );

      const label =
        createSvgElement(
          "text",
          {
            class:
              "fuel-chart-axis-text",

            x:
              layout.left - 12,

            y:
              y + 4,

            "text-anchor":
              "end"
          }
        );

      label.textContent =
        formatPrice(value);

      axesFragment.appendChild(label);
    }

    const movementLabel =
      createSvgElement(
        "text",
        {
          class:
            "fuel-chart-section-label",

          x:
            layout.left,

          y:
            layout.movementTop - 15
        }
      );

    movementLabel.textContent =
      "MARKET MOVEMENT";

    axesFragment.appendChild(
      movementLabel
    );

    gridFragment.appendChild(
      createSvgElement(
        "line",
        {
          class:
            "fuel-chart-zero-line",

          x1:
            layout.left,

          y1:
            layout.movementZero,

          x2:
            layout.right,

          y2:
            layout.movementZero
        }
      )
    );

    const positiveLabel =
      createSvgElement(
        "text",
        {
          class:
            "fuel-chart-axis-text",

          x:
            layout.left - 12,

          y:
            layout.movementTop + 4,

          "text-anchor":
            "end"
        }
      );

    positiveLabel.textContent =
      `+${maxMovement.toFixed(0)}%`;

    const zeroLabel =
      createSvgElement(
        "text",
        {
          class:
            "fuel-chart-axis-text",

          x:
            layout.left - 12,

          y:
            layout.movementZero + 4,

          "text-anchor":
            "end"
        }
      );

    zeroLabel.textContent = "0%";

    const negativeLabel =
      createSvgElement(
        "text",
        {
          class:
            "fuel-chart-axis-text",

          x:
            layout.left - 12,

          y:
            layout.movementBottom + 4,

          "text-anchor":
            "end"
        }
      );

    negativeLabel.textContent =
      `-${maxMovement.toFixed(0)}%`;

    axesFragment.append(
      positiveLabel,
      zeroLabel,
      negativeLabel
    );

    const desiredLabels =
      Math.min(
        6,
        series.length
      );

    const usedIndices =
      new Set();

    for (
      let labelIndex = 0;
      labelIndex < desiredLabels;
      labelIndex += 1
    ) {
      const seriesIndex =
        Math.round(
          (series.length - 1) *
          (
            labelIndex /
            Math.max(
              1,
              desiredLabels - 1
            )
          )
        );

      if (
        usedIndices.has(seriesIndex)
      ) {
        continue;
      }

      usedIndices.add(seriesIndex);

      const record =
        series[seriesIndex];

      const x =
        scaleX(
          record.date.getTime()
        );

      const label =
        createSvgElement(
          "text",
          {
            class:
              "fuel-chart-axis-text",

            x,

            y:
              496,

            "text-anchor":
              seriesIndex === 0
                ? "start"
                : seriesIndex ===
                  series.length - 1
                  ? "end"
                  : "middle"
          }
        );

      label.textContent =
        String(
          record.date.getUTCFullYear()
        );

      axesFragment.appendChild(label);
    }

    elements.chartGrid.replaceChildren(
      gridFragment
    );

    elements.chartAxes.replaceChildren(
      axesFragment
    );
  }

  function renderMovementBars(
    fuel,
    changes,
    layout,
    scaleX,
    scaleMovementY
  ) {
    const fragment =
      document.createDocumentFragment();

    const series =
      fuel.series;

    const availableWidth =
      layout.right -
      layout.left;

    const barWidth = Math.max(
      3,
      Math.min(
        18,
        (
          availableWidth /
          Math.max(
            series.length,
            1
          )
        ) *
        0.58
      )
    );

    series.forEach(
      (record, index) => {
        if (index === 0) {
          return;
        }

        const percent =
          changes[index];

        const category =
          movementClass(percent);

        const x =
          scaleX(
            record.date.getTime()
          ) -
          barWidth / 2;

        const scaledY =
          scaleMovementY(percent);

        const y =
          percent >= 0
            ? scaledY
            : layout.movementZero;

        const height =
          Math.max(
            2,
            Math.abs(
              layout.movementZero -
              scaledY
            )
          );

        const bar =
          createSvgElement(
            "rect",
            {
              class:
                `fuel-movement-bar ` +
                `is-${category}`,

              x,

              y,

              width:
                barWidth,

              height,

              rx:
                1.5,

              tabindex:
                0,

              role:
                "button",

              "aria-label":
                `${formatDate(record.date)} ` +
                `${formatPercent(percent)}`
            }
          );

        attachChartInteraction(
          bar,
          fuel,
          index,
          x + barWidth / 2,
          y
        );

        fragment.appendChild(bar);
      }
    );

    elements.movementBars.replaceChildren(
      fragment
    );
  }

  function renderChartPoints(
    fuel,
    points
  ) {
    const fragment =
      document.createDocumentFragment();

    points.forEach(
      (point, index) => {
        const record =
          fuel.series[index];

        const circle =
          createSvgElement(
            "circle",
            {
              class:
                "fuel-chart-point",

              cx:
                point.x,

              cy:
                point.y,

              r:
                index ===
                points.length - 1
                  ? 5.5
                  : 3.5,

              tabindex:
                0,

              role:
                "button",

              "aria-label":
                `${formatDate(record.date)} ` +
                `${formatPrice(record.price)}`
            }
          );

        attachChartInteraction(
          circle,
          fuel,
          index,
          point.x,
          point.y
        );

        fragment.appendChild(circle);
      }
    );

    elements.chartPoints.replaceChildren(
      fragment
    );
  }

  function attachChartInteraction(
    target,
    fuel,
    index,
    svgX,
    svgY
  ) {
    const show = () => {
      showTooltip(
        fuel,
        index,
        svgX,
        svgY
      );
    };

    target.addEventListener(
      "mouseenter",
      show
    );

    target.addEventListener(
      "focus",
      show
    );

    target.addEventListener(
      "mouseleave",
      hideTooltip
    );

    target.addEventListener(
      "blur",
      hideTooltip
    );
  }

  function showTooltip(
    fuel,
    index,
    svgX,
    svgY
  ) {
    const record =
      fuel.series[index];

    const previous =
      index > 0
        ? fuel.series[index - 1]
        : null;

    const change =
      calculateChange(
        fuel.series,
        index
      );

    const svgRect =
      elements.chart
        .getBoundingClientRect();

    const shellRect =
      elements.chartShell
        .getBoundingClientRect();

    const horizontalScale =
      svgRect.width / 980;

    const verticalScale =
      svgRect.height / 500;

    elements.tooltip.innerHTML = "";

    const title =
      document.createElement("strong");

    title.textContent =
      `${fuel.name} · ` +
      `${formatDate(record.date)}`;

    const details =
      document.createElement("span");

    const previousText =
      previous
        ? formatPrice(previous.price)
        : "—";

    const amountText =
      index > 0
        ? formatMoneyChange(
            change.amount
          )
        : "—";

    const percentText =
      index > 0
        ? formatPercent(
            change.percent
          )
        : "—";

    details.innerHTML =
      `PRICE&nbsp;&nbsp;` +
      `${formatPrice(record.price)}` +
      `<br>` +
      `PREVIOUS&nbsp;&nbsp;` +
      `${previousText}` +
      `<br>` +
      `CHANGE&nbsp;&nbsp;` +
      `${amountText}` +
      `<br>` +
      `VARIATION&nbsp;&nbsp;` +
      `${percentText}`;

    elements.tooltip.append(
      title,
      details
    );

    elements.tooltip.hidden = false;

    const tooltipWidth =
      elements.tooltip.offsetWidth;

    const tooltipHeight =
      elements.tooltip.offsetHeight;

    const rawLeft =
      svgRect.left -
      shellRect.left +
      svgX *
      horizontalScale -
      tooltipWidth / 2;

    const rawTop =
      svgRect.top -
      shellRect.top +
      svgY *
      verticalScale -
      tooltipHeight -
      12;

    const maxLeft =
      Math.max(
        0,
        shellRect.width -
        tooltipWidth
      );

    elements.tooltip.style.left =
      `${Math.min(
        Math.max(rawLeft, 0),
        maxLeft
      )}px`;

    elements.tooltip.style.top =
      `${Math.max(rawTop, 0)}px`;
  }

  function hideTooltip() {
    elements.tooltip.hidden = true;
  }

  function handleLogout() {
    window.location.href =
      "login.html";
  }

  function initializeClock() {
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
  }

  async function initializeFuelCenter() {
    elements.logoutButton.addEventListener(
      "click",
      handleLogout
    );

    initializeClock();

    try {
      const payload =
        await loadFuelMarket();

      const market =
        validateAndNormalizeMarket(
          payload
        );

      state.asOf =
        market.asOf;

      state.fuels =
        market.fuels;

      if (!state.fuels.length) {
        elements.emptyMessage.hidden =
          false;

        return;
      }

      renderFuelCards();

      elements.workspace.hidden =
        false;

      selectFuel(
        state.fuels[0].id
      );
    } catch (error) {
      console.error(
        "ACS Fuel Center initialization failed:",
        error
      );

      elements.emptyMessage.hidden =
        false;
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    initializeFuelCenter
  );
}());
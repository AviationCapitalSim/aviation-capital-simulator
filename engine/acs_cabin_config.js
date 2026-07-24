/* ============================================================
   ACS OCC — CABIN CONFIGURATION PROTOTYPE v0.1
   ------------------------------------------------------------
   Scope:
   - Buy New visual prototype only.
   - de Havilland DH.104 Dove and Douglas DC-8-50 only.
   - No database persistence.
   - No aircraft-order payload mutation.
   - No Finance, range, weight, demand or maintenance effects.
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     INTERNAL SPACE CALIBRATION
     ------------------------------------------------------------
     These factors are provisional prototype values.
     They must never be presented to the player as cabin units.
     ============================================================ */

  const ACS_CABIN_PRODUCTS = Object.freeze({
    Y_SMART: Object.freeze({
      code: "Y_SMART",
      cabinClass: "Y",
      name: "Economy Smart",
      spaceFactor: 1
    }),
    Y_CLASSIC: Object.freeze({
      code: "Y_CLASSIC",
      cabinClass: "Y",
      name: "Economy Classic",
      spaceFactor: 1.25
    }),
    Y_COMFORT: Object.freeze({
      code: "Y_COMFORT",
      cabinClass: "Y",
      name: "Economy Comfort",
      spaceFactor: 1.5
    }),
    Y_PLUS: Object.freeze({
      code: "Y_PLUS",
      cabinClass: "Y",
      name: "Economy Plus",
      spaceFactor: 1.75
    }),
    C_SMART: Object.freeze({
      code: "C_SMART",
      cabinClass: "C",
      name: "Business Smart",
      spaceFactor: 2
    }),
    C_EXECUTIVE: Object.freeze({
      code: "C_EXECUTIVE",
      cabinClass: "C",
      name: "Business Executive",
      spaceFactor: 2.5
    }),
    C_PREMIER: Object.freeze({
      code: "C_PREMIER",
      cabinClass: "C",
      name: "Business Premier",
      spaceFactor: 3
    }),
    C_SUPERIOR: Object.freeze({
      code: "C_SUPERIOR",
      cabinClass: "C",
      name: "Business Superior",
      spaceFactor: 3.5
    }),
    F_SILVER: Object.freeze({
      code: "F_SILVER",
      cabinClass: "F",
      name: "First Silver",
      spaceFactor: 4
    }),
    F_GOLD: Object.freeze({
      code: "F_GOLD",
      cabinClass: "F",
      name: "First Gold",
      spaceFactor: 4.5
    }),
    F_PLATINUM: Object.freeze({
      code: "F_PLATINUM",
      cabinClass: "F",
      name: "First Platinum",
      spaceFactor: 5
    }),
    F_DIAMOND: Object.freeze({
      code: "F_DIAMOND",
      cabinClass: "F",
      name: "First Diamond",
      spaceFactor: 6
    })
  });

  const ACS_CABIN_CONFIG = Object.freeze({
    "de Havilland|DH.104 Dove": Object.freeze({
      manufacturer: "de Havilland",
      model: "DH.104 Dove",
      referenceCapacity: 8,
      layout: Object.freeze({
        orientation: "NOSE_LEFT",
        economyGeometry: "2+2",
        rows: 2
      }),
      mode: "READ_ONLY",
      customConfigurationAllowed: false,
      allowedProducts: Object.freeze({
        Y: Object.freeze(["Y_SMART"]),
        C: Object.freeze([]),
        F: Object.freeze([])
      }),
      factoryDefault: Object.freeze({
        Y: Object.freeze({ product: "Y_SMART", seats: 8 }),
        C: Object.freeze({ product: null, seats: 0 }),
        F: Object.freeze({ product: null, seats: 0 })
      })
    }),

    "Douglas|DC-8-50": Object.freeze({
      manufacturer: "Douglas",
      model: "DC-8-50",
      referenceCapacity: 146,
      layout: Object.freeze({
        orientation: "NOSE_LEFT",
        economyGeometry: "3+3"
      }),
      mode: "EDITABLE",
      customConfigurationAllowed: true,
      allowedProducts: Object.freeze({
        Y: Object.freeze([
          "Y_SMART",
          "Y_CLASSIC",
          "Y_COMFORT",
          "Y_PLUS"
        ]),
        C: Object.freeze([
          "C_SMART",
          "C_EXECUTIVE",
          "C_PREMIER",
          "C_SUPERIOR"
        ]),
        F: Object.freeze([
          "F_SILVER",
          "F_GOLD",
          "F_PLATINUM",
          "F_DIAMOND"
        ])
      }),
      factoryDefault: Object.freeze({
        Y: Object.freeze({ product: "Y_SMART", seats: 146 }),
        C: Object.freeze({ product: "C_SMART", seats: 0 }),
        F: Object.freeze({ product: "F_SILVER", seats: 0 })
      })
    })
  });

  function makeAircraftKey(aircraft) {
    if (!aircraft) return "";

    const manufacturer = String(
      aircraft.manufacturer || aircraft.oem || aircraft.make || ""
    ).trim();

    const model = String(
      aircraft.model ||
      aircraft.aircraft_model ||
      aircraft.aircraft_name ||
      ""
    ).trim();

    return `${manufacturer}|${model}`;
  }

    function getAircraftConfig(aircraft) {
    if (!aircraft) return null;

    const aircraftKey =
      makeAircraftKey(aircraft);

    /*
      Preserve any explicitly configured aircraft.
    */

    const configuredAircraft =
      ACS_CABIN_CONFIG[aircraftKey];

    if (configuredAircraft) {
      return configuredAircraft;
    }

    /*
      Global ACS OCC passenger-cabin capacity.
      Buy New already receives seats from PostgreSQL.
    */

    const referenceCapacity = Number(
      aircraft.seats ??
      aircraft.passenger_capacity ??
      aircraft.capacity ??
      0
    );

    /*
      Cargo aircraft with seats: 0 do not receive
      passenger Seat Configuration.
    */

    if (
      !Number.isInteger(referenceCapacity) ||
      referenceCapacity <= 0
    ) {
      return null;
    }

    const [
      manufacturer = "Unknown",
      model = "Unknown Model"
    ] = aircraftKey.split("|");

    /*
      Global ACS OCC configuration.
      Generated dynamically for every passenger aircraft.
    */

    return Object.freeze({
      manufacturer,
      model,
      referenceCapacity,

      layout: Object.freeze({
        economyGeometry: "3+3"
      }),

      mode: "EDITABLE",
      customConfigurationAllowed: true,

      allowedProducts: Object.freeze({
        Y: Object.freeze([
          "Y_SMART",
          "Y_CLASSIC",
          "Y_COMFORT",
          "Y_PLUS"
        ]),

        C: Object.freeze([
          "C_SMART",
          "C_EXECUTIVE",
          "C_PREMIER",
          "C_SUPERIOR"
        ]),

        F: Object.freeze([
          "F_SILVER",
          "F_GOLD",
          "F_PLATINUM",
          "F_DIAMOND"
        ])
      }),

      factoryDefault: Object.freeze({
        Y: Object.freeze({
          product: "Y_SMART",
          seats: referenceCapacity
        }),

        C: Object.freeze({
          product: "C_SMART",
          seats: 0
        }),

        F: Object.freeze({
          product: "F_SILVER",
          seats: 0
        })
      })
    });
  }

  function cloneConfiguration(configuration) {
    return {
      Y: { ...configuration.Y },
      C: { ...configuration.C },
      F: { ...configuration.F }
    };
  }

  function getFactoryDefault(aircraft) {
    const aircraftConfig = getAircraftConfig(aircraft);
    if (!aircraftConfig) return null;
    return cloneConfiguration(aircraftConfig.factoryDefault);
  }

  function normalizeSeatCount(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) return null;
    return number;
  }

  function validateConfiguration(aircraft, configuration) {
    const aircraftConfig = getAircraftConfig(aircraft);

    if (!aircraftConfig) {
      return {
        valid: false,
        installedSeats: 0,
        message: "Seat Configuration is not available for this aircraft."
      };
    }

    if (!configuration || typeof configuration !== "object") {
      return {
        valid: false,
        installedSeats: 0,
        message: "Cabin configuration is missing."
      };
    }

    let internalSpaceUsed = 0;
    let installedSeats = 0;

    for (const cabinClass of ["Y", "C", "F"]) {
      const selection = configuration[cabinClass] || {};
      const seats = normalizeSeatCount(selection.seats);

      if (seats === null) {
        return {
          valid: false,
          installedSeats,
          message: `${cabinClass} seats must be a whole number.`
        };
      }

      if (seats === 0) continue;

      const productCode = String(selection.product || "").trim();
      const product = ACS_CABIN_PRODUCTS[productCode];
      const allowed = aircraftConfig.allowedProducts[cabinClass];

      if (
        !product ||
        product.cabinClass !== cabinClass ||
        !allowed.includes(productCode)
      ) {
        return {
          valid: false,
          installedSeats,
          message: `Select a valid ${cabinClass} seat product.`
        };
      }

      installedSeats += seats;
      internalSpaceUsed += seats * product.spaceFactor;
    }

    if (internalSpaceUsed > aircraftConfig.referenceCapacity) {
      return {
        valid: false,
        installedSeats,
        message: "This cabin layout does not fit inside the aircraft."
      };
    }

    if (installedSeats === 0) {
      return {
        valid: false,
        installedSeats: 0,
        message: "Configure at least one passenger seat."
      };
    }

    return {
      valid: true,
      installedSeats,
      message: `${installedSeats} passenger seats configured.`
    };
  }

  window.ACS_CABIN = Object.freeze({
    version: "ACS_CABIN_PROTOTYPE_V0_1",
    products: ACS_CABIN_PRODUCTS,
    aircraft: ACS_CABIN_CONFIG,
    makeAircraftKey,
    getAircraftConfig,
    getFactoryDefault,
    validateConfiguration
  });
})();

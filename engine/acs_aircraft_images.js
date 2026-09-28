/* ============================================================
   ACS OCC — GLOBAL AIRCRAFT IMAGE RESOLVER v2.0
   ------------------------------------------------------------
   ONE canonical naming rule for ALL aircraft.

   Canonical path:
   img/{manufacturer_folder}/{normalized_model}.jpg

   Examples:
   Airbus / A300B1
   -> img/Airbus/a300b1.jpg

   De Havilland Canada / DHC-6 Twin Otter Series 300
   -> img/de_havilland/dhc_6_twin_otter_series_300.jpg

   Legacy aliases are fallback only.
   ============================================================ */

(() => {
  "use strict";

  const PLACEHOLDER = "img/placeholder_aircraft.jpg";


  /* ============================================================
     LEGACY MODEL NAMES
     ------------------------------------------------------------
     These exist ONLY so old ACS images continue working.
     New aircraft MUST use the canonical slug generated from model.
     ============================================================ */

  const MODEL_ALIASES = Object.freeze({

    /* Boeing */
    "247": [
      "boeing_247"
    ],

    "307_stratoliner": [
      "boeing_307_stratoliner"
    ],

    "377_stratocruiser": [
      "b_377_stratocruiser"
    ],

    "c_97_stratofreighter": [
      "c_97_stratofreighter"
    ],


    /* De Havilland Canada — legacy filenames */
    "dhc_6_twin_otter_series_100": [
      "dhc6_100"
    ],

    "dhc_6_twin_otter_series_300": [
      "dhc_6_300",
      "dhc6_300"
    ],

    "dhc_6_twin_otter_series_400": [
      "dhc_6_400",
      "dhc6_400"
    ],


    /* Britten-Norman */
    "bn_2a_islander": [
      "bn_2a_islander"
    ],


    /* Airbus — old experimental filenames */
    "a300b1": [
      "a_300_b1",
      "a300_b1"
    ]

  });


  /* ============================================================
     MANUFACTURER FOLDER ALIASES
     ============================================================ */

  const FOLDER_ALIASES = Object.freeze({

    "de havilland": "de_havilland",

    "de havilland canada": "de_havilland",

    "britten-norman": "britten norman",

    "britten norman": "britten norman",

    "mcdonnell douglas": "mcdonnell_douglas",

    "hawker siddeley": "hawker_siddeley",

    "handley page": "handley_page"

  });


  /* ============================================================
     NORMALIZATION
     ============================================================ */

  function slug(value) {

    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  }


  function escapeRegex(value) {

    return String(value || "")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  }


  /* ============================================================
     AIRCRAFT DATA EXTRACTION
     ============================================================ */

  function manufacturerOf(aircraft) {

    return String(

      aircraft?.manufacturer ||
      aircraft?.catalog_manufacturer ||
      aircraft?.oem ||
      aircraft?.make ||
      aircraft?.manufacturer_name ||
      ""

    )
      .replace(/\s+/g, " ")
      .trim();

  }


  function modelOf(aircraft, manufacturer) {

    let model = String(

      aircraft?.model ||
      aircraft?.aircraft_model ||
      aircraft?.aircraft_name ||
      aircraft?.model_key ||
      ""

    )
      .replace(/\s+/g, " ")
      .trim();


    /*
     Remove manufacturer prefix if backend returns things like:

     "Boeing 737-200"
     "Airbus A300B1"
     "McDonnell Douglas DC-9-40"

     instead of simply the model.
    */

    if (manufacturer) {

      model = model.replace(

        new RegExp(
          "^" + escapeRegex(manufacturer) + "\\s+",
          "i"
        ),

        ""

      ).trim();

    }


    return model;

  }


  function unique(values) {

    return [
      ...new Set(
        values.filter(Boolean)
      )
    ];

  }


  /* ============================================================
     OPTIONAL EXPLICIT IMAGE FROM DATABASE
     ------------------------------------------------------------
     Future-proof.

     If backend eventually provides:

     image_file
     image_filename
     image_path
     image_url

     ACS will use it FIRST.
     ============================================================ */

  function explicitImageOf(aircraft) {

    const value = String(

      aircraft?.image_file ||
      aircraft?.image_filename ||
      aircraft?.image_path ||
      aircraft?.image_url ||
      ""

    ).trim();


    if (!value) {
      return "";
    }


    /*
     Full URL
    */

    if (/^https?:\/\//i.test(value)) {
      return value;
    }


    /*
     Already contains img/
    */

    if (/^img\//i.test(value)) {
      return value;
    }


    return value;

  }


  /* ============================================================
     MANUFACTURER FOLDER CANDIDATES
     ============================================================ */

  function manufacturerFolders(manufacturer) {

    const raw = String(manufacturer || "")
      .replace(/\s+/g, " ")
      .trim();

    const lower = raw.toLowerCase();

    const alias = FOLDER_ALIASES[lower] || "";

    const normalized = slug(raw);


    return unique([

      /*
       Current ACS folder format
      */
      alias,

      /*
       Raw manufacturer folder
       Example:
       img/Airbus/
      */
      raw,

      /*
       Fully normalized future format
       Example:
       img/mcdonnell_douglas/
      */
      normalized

    ]);

  }


  /* ============================================================
     MODEL NAME CANDIDATES
     ============================================================ */

  function modelNames(model) {

    const canonical = slug(model);

    const legacy =
      MODEL_ALIASES[canonical] || [];


    return unique([

      /*
       ALWAYS FIRST.

       This is the definitive ACS filename.
      */
      canonical,

      /*
       Older ACS filenames.
      */
      ...legacy

    ]);

  }


  /* ============================================================
     BUILD IMAGE CANDIDATES
     ============================================================ */

  function candidates(aircraft) {

    const manufacturer =
      manufacturerOf(aircraft);

    const model =
      modelOf(
        aircraft,
        manufacturer
      );


    if (!manufacturer || !model) {

      return [
        PLACEHOLDER
      ];

    }


    const folders =
      manufacturerFolders(
        manufacturer
      );

    const names =
      modelNames(
        model
      );

    const result = [];


    /*
     ------------------------------------------------------------
     1. EXPLICIT DATABASE IMAGE
     ------------------------------------------------------------
    */

    const explicit =
      explicitImageOf(
        aircraft
      );


    if (explicit) {

      /*
       If explicit field already contains path/URL.
      */

      if (
        explicit.includes("/") ||
        /^https?:\/\//i.test(explicit)
      ) {

        result.push(explicit);

      }

      else {

        /*
         Filename only.
        */

        for (
          const folder of folders
        ) {

          result.push(
            `img/${folder}/${explicit}`
          );

        }

      }

    }


    /*
     ------------------------------------------------------------
     2. CANONICAL + LEGACY NAMES
     ------------------------------------------------------------
    */

    for (
      const folder of folders
    ) {

      for (
        const name of names
      ) {

        /*
         JPG is canonical ACS format.
        */

        result.push(
          `img/${folder}/${name}.jpg`
        );


        /*
         PNG only for legacy compatibility.
        */

        result.push(
          `img/${folder}/${name}.png`
        );

      }

    }


    /*
     ------------------------------------------------------------
     FINAL FALLBACK
     ------------------------------------------------------------
    */

    result.push(
      PLACEHOLDER
    );


    return unique(
      result
    );

  }


  /* ============================================================
     IMAGE LOADER
     ============================================================ */

  function setImage(
    img,
    aircraft
  ) {

    if (!img) {
      return;
    }


    const list =
      candidates(
        aircraft
      );


    img.dataset.acsImageCandidates =
      JSON.stringify(
        list
      );


    img.dataset.acsImageIndex =
      "0";


    img.onerror =
      handleFallback;


    img.src =
      list[0];

  }


  /* ============================================================
     FALLBACK HANDLER
     ============================================================ */

  function handleFallback(
    eventOrImage
  ) {

    const img =
      eventOrImage?.currentTarget ||
      eventOrImage;


    if (!img) {
      return;
    }


    let list;


    try {

      list =
        JSON.parse(
          img.dataset.acsImageCandidates ||
          "[]"
        );

    }

    catch (_) {

      list = [];

    }


    let index =

      Number(
        img.dataset.acsImageIndex ||
        0
      ) + 1;


    if (
      !list.length ||
      index >= list.length
    ) {

      img.onerror = null;

      img.src =
        PLACEHOLDER;

      return;

    }


    img.dataset.acsImageIndex =
      String(index);


    img.src =
      list[index];

  }


  /* ============================================================
     FIRST IMAGE
     ============================================================ */

  function firstImage(
    aircraft
  ) {

    return (
      candidates(
        aircraft
      )[0] ||
      PLACEHOLDER
    );

  }


  /* ============================================================
     CANONICAL FILE NAME
     ------------------------------------------------------------
     Useful for admin/debugging.

     Example:

     ACS_getCanonicalAircraftImageName({
       model: "DHC-6 Twin Otter Series 300"
     })

     returns:

     dhc_6_twin_otter_series_300.jpg
     ============================================================ */

  function canonicalFilename(
    aircraft
  ) {

    const manufacturer =
      manufacturerOf(
        aircraft
      );

    const model =
      modelOf(
        aircraft,
        manufacturer
      );


    if (!model) {
      return "";
    }


    return (
      `${slug(model)}.jpg`
    );

  }


  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.ACS_AIRCRAFT_IMAGES =
    Object.freeze({

      version: "2.0",

      placeholder:
        PLACEHOLDER,

      slug,

      candidates,

      firstImage,

      setImage,

      handleFallback,

      canonicalFilename

    });


  window.ACS_getAircraftImageCandidates =
    candidates;


  window.ACS_getAircraftImage =
    firstImage;


  window.ACS_setAircraftImage =
    setImage;


  window.ACS_handleAircraftImageFallback =
    handleFallback;


  window.ACS_getCanonicalAircraftImageName =
    canonicalFilename;

})();

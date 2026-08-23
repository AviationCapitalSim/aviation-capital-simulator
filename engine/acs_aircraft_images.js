/* ============================================================
   ACS OCC — GLOBAL AIRCRAFT IMAGE RESOLVER v1.0
   ------------------------------------------------------------
   Shared by Buy New, My Aircraft, Used Market and future pages.
   Folder convention: img/{manufacturer}/{normalized_model}.jpg
   ============================================================ */

(() => {
  "use strict";

  const PLACEHOLDER = "img/placeholder_aircraft.jpg";

  const MODEL_ALIASES = Object.freeze({
  "247": "boeing_247",
  "307_stratoliner": "boeing_307_stratoliner",
  "377_stratocruiser": "b_377_stratocruiser",
  "c_97_stratofreighter": "c_97_stratofreighter",

  /* De Havilland Canada */
  "dhc_6_twin_otter_series_100": "dhc6_100"
});

const FOLDER_ALIASES = Object.freeze({
  "de havilland": "de_havilland",
  "de havilland canada": "de_havilland"
});

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function escapeRegex(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function manufacturerOf(aircraft) {
    return String(
      aircraft?.manufacturer ||
      aircraft?.catalog_manufacturer ||
      aircraft?.oem ||
      aircraft?.make ||
      aircraft?.manufacturer_name ||
      ""
    ).replace(/\s+/g, " ").trim();
  }

  function modelOf(aircraft, manufacturer) {
    let model = String(
      aircraft?.model ||
      aircraft?.aircraft_model ||
      aircraft?.aircraft_name ||
      aircraft?.model_key ||
      ""
    ).replace(/\s+/g, " ").trim();

    if (manufacturer) {
      model = model.replace(
        new RegExp("^" + escapeRegex(manufacturer) + "\\s+", "i"),
        ""
      ).trim();
    }

    return model;
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function candidates(aircraft) {
    const manufacturer = manufacturerOf(aircraft);
    const model = modelOf(aircraft, manufacturer);

    if (!manufacturer || !model) return [PLACEHOLDER];

    const folder =
      FOLDER_ALIASES[manufacturer.toLowerCase()] || manufacturer;

    const base = slug(model);
    const alias = MODEL_ALIASES[base] || base;

    return unique([
      `img/${folder}/${alias}.jpg`,
      `img/${folder}/${alias}.png`,
      alias !== base ? `img/${folder}/${base}.jpg` : "",
      alias !== base ? `img/${folder}/${base}.png` : "",
      PLACEHOLDER
    ]);
  }

  function setImage(img, aircraft) {
    if (!img) return;

    const list = candidates(aircraft);
    img.dataset.acsImageCandidates = JSON.stringify(list);
    img.dataset.acsImageIndex = "0";
    img.onerror = handleFallback;
    img.src = list[0];
  }

  function handleFallback(eventOrImage) {
    const img = eventOrImage?.currentTarget || eventOrImage;
    if (!img) return;

    let list;
    try {
      list = JSON.parse(img.dataset.acsImageCandidates || "[]");
    } catch (_) {
      list = [];
    }

    let index = Number(img.dataset.acsImageIndex || 0) + 1;

    if (!list.length || index >= list.length) {
      img.onerror = null;
      img.src = PLACEHOLDER;
      return;
    }

    img.dataset.acsImageIndex = String(index);
    img.src = list[index];
  }

  function firstImage(aircraft) {
    return candidates(aircraft)[0] || PLACEHOLDER;
  }

  window.ACS_AIRCRAFT_IMAGES = Object.freeze({
    version: "1.0",
    placeholder: PLACEHOLDER,
    slug,
    candidates,
    firstImage,
    setImage,
    handleFallback
  });

  window.ACS_getAircraftImageCandidates = candidates;
  window.ACS_getAircraftImage = firstImage;
  window.ACS_setAircraftImage = setImage;
  window.ACS_handleAircraftImageFallback = handleFallback;
})();

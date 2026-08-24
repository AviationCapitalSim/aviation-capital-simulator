"use strict";

/* ============================================================
   ACS OCC - GLOBAL EVENTS v2.0
   ------------------------------------------------------------
   Read-only global-event intelligence.

   PostgreSQL / Railway is the only event authority.
   No embedded events, local fallback or browser-side
   simulation-time calculations.
   ============================================================ */

(function ACSGlobalEvents(global) {
  const API_BASE =
    global.ACS_API_BASE ||
    "https://api.aviationcapitalsim.com";

  const GLOBAL_EVENTS_ENDPOINT =
    `${API_BASE}/v1/global-events`;

  const CATEGORY_LABELS = {
    aviation: "Aviation",
    airports: "Airports",
    operational: "Disruptions",
    geopolitical: "World",
    economic: "Economy"
  };

  const MONTHS = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const MONTH_NUMBER = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12"
  };

  const state = {
    filter: "all",
    selectedId: null,
    events: [],
    requestController: null,
    lastClockDate: null
  };

  const elements = {};

  const REQUIRED_ELEMENT_IDS = [
    "eventFeed",
    "eventDetail",
    "eventsWorkspace",
    "eventCount",
    "activeCount",
    "regionCount",
    "operationsReadiness"
  ];

  function cacheElements() {
    REQUIRED_ELEMENT_IDS.forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function hasRequiredLayout() {
    return REQUIRED_ELEMENT_IDS.every((id) => elements[id]);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function isoDate(value) {
    if (!value) return "";

    const text = String(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

    return match
      ? `${match[1]}-${match[2]}-${match[3]}`
      : "";
  }

  function displayDate(value) {
    const date = isoDate(value);
    if (!date) return "--";

    const [year, month, day] = date.split("-");
    const monthLabel = MONTHS[Number(month) - 1];

    if (!monthLabel) return "--";

    return `${day} ${monthLabel} ${year}`;
  }

  function imagePath(filename) {
    if (!filename) return "";

    const cleanFilename = String(filename)
      .trim()
      .split(/[\\/]/)
      .pop();

    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(cleanFilename)) {
      return "";
    }

    return `img_global/${cleanFilename}`;
  }

  function normalizeEvent(record) {
    const category = String(record?.category || "")
      .trim()
      .toLowerCase();

    const publicationDate = isoDate(record?.publication_date);

    return {
      id: String(record?.event_key || "").trim(),
      origin: String(record?.origin || "historical").trim(),
      category,
      categoryLabel:
        CATEGORY_LABELS[category] || "Global Event",
      title: String(record?.headline || "").trim(),
      summary: String(record?.summary || "").trim(),
      description: String(record?.article || "").trim(),
      aviationEffect: String(
        record?.aviation_effect || ""
      ).trim(),
      region: String(record?.location || "").trim(),
      publishedAt: publicationDate,
      date: displayDate(publicationDate),
      eventStartDate: isoDate(record?.event_start_date),
      image: imagePath(record?.image_filename)
    };
  }

  function validatePayload(payload) {
    if (
      !payload ||
      payload.ok !== true ||
      !Array.isArray(payload.events)
    ) {
      throw new Error("ACS_GLOBAL_EVENTS_INVALID_RESPONSE");
    }

    const events = payload.events
      .map(normalizeEvent)
      .filter((event) => {
        return Boolean(
          event.id &&
          event.category &&
          event.title &&
          event.publishedAt
        );
      });

    events.sort((a, b) => {
      const dateOrder =
        b.publishedAt.localeCompare(a.publishedAt);

      return dateOrder || a.id.localeCompare(b.id);
    });

    return {
      ok: true,
      currentSimTime: payload.current_sim_time || null,
      timeSource: payload.time_source || null,
      total: Number(payload.total) || events.length,
      events
    };
  }

  async function fetchGlobalEvents() {
    state.requestController?.abort();
    state.requestController = new AbortController();

    const response = await fetch(GLOBAL_EVENTS_ENDPOINT, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      },
      signal: state.requestController.signal
    });

    if (response.status === 401) {
      throw new Error(
        "ACS_GLOBAL_EVENTS_SESSION_REQUIRED"
      );
    }

    if (!response.ok) {
      throw new Error(
        `ACS_GLOBAL_EVENTS_FETCH_FAILED_${response.status}`
      );
    }

    return validatePayload(await response.json());
  }

  function visibleEvents() {
    if (state.filter === "all") {
      return state.events;
    }

    return state.events.filter((event) => {
      return event.category === state.filter;
    });
  }

  function eventImageMarkup(event, className) {
    if (!event.image) {
      return `<div class="${className}" aria-hidden="true"></div>`;
    }

    return `
      <div class="${className}">
        <img
          src="${escapeHTML(event.image)}"
          alt=""
          loading="eager"
        >
      </div>
    `;
  }

  function cardTemplate(event) {
    const selected = event.id === state.selectedId;

    return `
      <button
        class="event-card${selected ? " is-selected" : ""}"
        type="button"
        data-event-id="${escapeHTML(event.id)}"
        aria-pressed="${selected}"
      >
        ${eventImageMarkup(event, "event-image")}

        <span class="event-card-body">
          <span class="event-eyebrow">
            <span class="event-category">
              ${escapeHTML(event.categoryLabel)}
            </span>
          </span>

          <span class="event-title">
            ${escapeHTML(event.title)}
          </span>

          <span class="event-summary">
            ${escapeHTML(event.summary)}
          </span>

          <span class="event-meta">
            <span>
              Date
              <b>${escapeHTML(event.date)}</b>
            </span>

            <span>
              Region
              <b>${escapeHTML(event.region || "--")}</b>
            </span>
          </span>
        </span>
      </button>
    `;
  }

  function renderStatistics() {
    elements.activeCount.textContent =
      String(state.events.length).padStart(2, "0");

    const regions = new Set(
      state.events
        .map((event) => event.region)
        .filter(Boolean)
    );

    elements.regionCount.textContent =
      String(regions.size).padStart(2, "0");
  }

  function renderFeed() {
    const visible = visibleEvents();

    if (visible.length) {
      elements.eventFeed.innerHTML =
        visible.map(cardTemplate).join("");
    } else {
      const message = state.events.length
        ? "NO EVENTS IN THIS CATEGORY"
        : "NO PUBLISHED EVENTS FOR CURRENT ACS DATE";

      elements.eventFeed.innerHTML = `
        <div class="empty-state">
          ${message}
        </div>
      `;
    }

    elements.eventCount.textContent =
      `${String(visible.length).padStart(2, "0")} ` +
      `EVENT${visible.length === 1 ? "" : "S"} DISPLAYED`;

    renderStatistics();

    elements.eventFeed
      .querySelectorAll("[data-event-id]")
      .forEach((card) => {
        card.addEventListener("click", () => {
          selectEvent(card.dataset.eventId);
        });
      });
  }

  function renderDetail() {
    const visible = visibleEvents();

    const event = visible.find((item) => {
      return item.id === state.selectedId;
    });

    if (!event) {
      elements.eventDetail.replaceChildren();
      elements.eventDetail.hidden = true;
      elements.eventsWorkspace.classList.add("is-empty");
      return;
    }

    const effectSection = event.aviationEffect
      ? `
        <section class="detail-section">
          <h3>Aviation Effect</h3>
          <p class="detail-description">
            ${escapeHTML(event.aviationEffect)}
          </p>
        </section>
      `
      : "";

    elements.eventDetail.hidden = false;
    elements.eventsWorkspace.classList.remove("is-empty");

    elements.eventDetail.innerHTML = `
      ${eventImageMarkup(event, "detail-image")}

      <div class="detail-body">
        <div class="detail-category">
          ${escapeHTML(event.categoryLabel)}
        </div>

        <h2 class="detail-title">
          ${escapeHTML(event.title)}
        </h2>

        <p class="detail-description">
          ${escapeHTML(event.description || event.summary)}
        </p>

        <dl class="detail-grid">
          <div>
            <dt>Published</dt>
            <dd>${escapeHTML(event.date)}</dd>
          </div>

          <div>
            <dt>Location</dt>
            <dd>${escapeHTML(event.region || "--")}</dd>
          </div>
        </dl>

        ${effectSection}
      </div>
    `;
  }

  function selectEvent(id) {
    const eventExists = visibleEvents().some((event) => {
      return event.id === id;
    });

    if (!eventExists) return;

    state.selectedId = id;
    renderFeed();
    renderDetail();
  }

  function applySelection() {
    const visible = visibleEvents();

    const selectionStillVisible = visible.some((event) => {
      return event.id === state.selectedId;
    });

    if (!selectionStillVisible) {
      state.selectedId = visible[0]?.id || null;
    }
  }

  function setOperationsStatus(label) {
    elements.operationsReadiness.textContent = label;
  }

  function clearEvents() {
    state.events = [];
    state.selectedId = null;
    renderFeed();
    renderDetail();
  }

  function renderPayload(payload) {
    state.events = payload.events;
    applySelection();
    renderFeed();
    renderDetail();

    setOperationsStatus(
      state.events.length ? "MONITORING" : "STANDBY"
    );
  }

  function handleLoadError(error) {
    if (error?.name === "AbortError") return;

    clearEvents();

    if (
      error?.message ===
      "ACS_GLOBAL_EVENTS_SESSION_REQUIRED"
    ) {
      setOperationsStatus("SESSION REQUIRED");
      return;
    }

    setOperationsStatus("UNAVAILABLE");

    console.warn(
      "ACS GLOBAL EVENTS LOAD FAILED:",
      error?.message || error
    );
  }

  async function loadGlobalEvents() {
    setOperationsStatus("CONNECTING");

    try {
      const payload = await fetchGlobalEvents();
      renderPayload(payload);
    } catch (error) {
      handleLoadError(error);
    }
  }

  function readClockDateKey() {
    const clock = document.getElementById("acs-clock");
    const clockText = clock?.textContent || "";

    const match = clockText.match(
      /\b(\d{2})\s+([A-Z]{3})\s+(\d{4})\b/i
    );

    if (!match) return null;

    const month = MONTH_NUMBER[
      match[2].toUpperCase()
    ];

    if (!month) return null;

    return `${match[3]}-${month}-${match[1]}`;
  }

  function observeACSClock() {
    const clock = document.getElementById("acs-clock");

    if (
      !clock ||
      typeof MutationObserver !== "function"
    ) {
      return;
    }

    state.lastClockDate = readClockDateKey();

    const observer = new MutationObserver(() => {
      const currentClockDate = readClockDateKey();

      if (!currentClockDate) return;

      const dateChanged =
        state.lastClockDate &&
        currentClockDate !== state.lastClockDate;

      state.lastClockDate = currentClockDate;

      if (dateChanged) {
        loadGlobalEvents();
      }
    });

    observer.observe(clock, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function bindFilters() {
    document
      .querySelectorAll("[data-filter]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          state.filter = button.dataset.filter || "all";

          document
            .querySelectorAll("[data-filter]")
            .forEach((item) => {
              item.classList.toggle(
                "is-active",
                item === button
              );
            });

          applySelection();
          renderFeed();
          renderDetail();
        });
      });
  }

  async function initialize() {
    cacheElements();

    if (!hasRequiredLayout()) {
      console.error(
        "ACS GLOBAL EVENTS: required HTML elements are missing."
      );
      return;
    }

    clearEvents();
    bindFilters();
    observeACSClock();
    await loadGlobalEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})(window);
